import { z } from "zod";
import type { RateLimiter } from "./limiter";
import { AIBudgetExceededError, AIRequestMeter, type AIBudget } from "./metering";

export type AIActor = { id: string };

export class AIHttpError extends Error {
  constructor(readonly status: 400 | 403 | 404, readonly code: "invalid_request" | "forbidden" | "not_found") {
    super(code);
  }
}

export interface AIEndpointDependencies<P extends z.ZodType, Input, Output> {
  feature: "visit_summary" | "early_warning" | "weekly_trend";
  requestSchema: P;
  authenticate(request: Request): Promise<AIActor | null>;
  rateLimiter: RateLimiter;
  budget: AIBudget;
  // Must load through the signed-in user's RLS-scoped database client. Never
  // implement this with the Supabase service-role key.
  loadAuthorizedInput(actor: AIActor, request: z.infer<P>): Promise<Input>;
  execute(input: Input, meter: AIRequestMeter): Promise<Output>;
}

const json = (body: unknown, status: number, headers?: HeadersInit) => Response.json(body, {
  status,
  headers: { "Cache-Control": "no-store", ...headers },
});

export function createAIEndpoint<P extends z.ZodType, Input, Output>(deps: AIEndpointDependencies<P, Input, Output>) {
  return async function POST(request: Request): Promise<Response> {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { Allow: "POST" });
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== new URL(request.url).host) return json({ error: "forbidden" }, 403);
      } catch {
        return json({ error: "forbidden" }, 403);
      }
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ error: "unsupported_media_type" }, 415);

    let actor: AIActor | null;
    try {
      actor = await deps.authenticate(request);
    } catch {
      return json({ error: "authentication_unavailable" }, 503);
    }
    if (!actor) return json({ error: "unauthorized" }, 401);

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > 16_384) return json({ error: "invalid_request" }, 400);
    let raw: unknown;
    try {
      const text = await request.text();
      if (new TextEncoder().encode(text).byteLength > 16_384) return json({ error: "invalid_request" }, 400);
      raw = JSON.parse(text);
    } catch {
      return json({ error: "invalid_request" }, 400);
    }
    const parsed = deps.requestSchema.safeParse(raw);
    if (!parsed.success) return json({ error: "invalid_request" }, 400);

    let limit: Awaited<ReturnType<RateLimiter["consume"]>>;
    try {
      limit = await deps.rateLimiter.consume(`${actor.id}:${deps.feature}`);
    } catch {
      // Fail closed if Upstash is unavailable; do not permit unmetered model use.
      return json({ error: "temporarily_unavailable" }, 503);
    }
    if (limit.unavailable) return json({ error: "temporarily_unavailable" }, 503);
    if (!limit.allowed) {
      return json({ error: "rate_limited", retryAfterSeconds: limit.retryAfterSeconds }, 429, { "Retry-After": String(limit.retryAfterSeconds) });
    }

    try {
      let reservation;
      try { reservation = await deps.budget.reserve(actor.id); }
      catch (error) {
        if (error instanceof AIBudgetExceededError) return json({ error: "ai_budget_exceeded" }, 429);
        return json({ error: "temporarily_unavailable" }, 503);
      }
      const meter = new AIRequestMeter(deps.budget, reservation, deps.feature);
      try {
        const input = await deps.loadAuthorizedInput(actor, parsed.data);
        const output = await deps.execute(input, meter);
        try { await meter.finish("ok"); }
        catch { console.error(JSON.stringify({ type: "ai_meter_settlement_error", feature: deps.feature })); }
        return json(output, 200);
      } catch (error) {
        try { await meter.finish(meter.isSafetyBlocked() ? "blocked" : "error"); }
        catch { console.error(JSON.stringify({ type: "ai_meter_settlement_error", feature: deps.feature })); }
        if (error instanceof AIHttpError) return json({ error: error.code }, error.status);
        // Do not disclose database/provider errors; details may carry private data.
        return json({ error: "temporarily_unavailable" }, 503);
      }
    } catch (error) {
      if (error instanceof AIHttpError) return json({ error: error.code }, error.status);
      // Do not disclose database/provider errors; details may carry private data.
      return json({ error: "temporarily_unavailable" }, 503);
    }
  };
}
