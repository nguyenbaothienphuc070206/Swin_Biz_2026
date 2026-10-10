import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createAIEndpoint } from "../lib/ai/route-handler";
import type { RateLimiter } from "../lib/ai/limiter";
import { AIBudgetExceededError, AIDailyBudget, MemoryAIUsageStore } from "../lib/ai/metering";

const bodySchema = z.object({ visitId: z.string().uuid() }).strict();
const actor = { id: "user-123" };
const allow = (): RateLimiter => ({ consume: vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 }) });
const budget = () => new AIDailyBudget({ store: new MemoryAIUsageStore(), hashSecret: "unit-test-secret-that-is-at-least-32-chars", globalDailyMicroUsd: 1_000_000, userDailyMicroUsd: 1_000_000, reservationMicroUsd: 100_000, inputUsdPerMillion: 3, outputUsdPerMillion: 15 });
const request = (body: unknown) => new Request("https://example.test/api/ai/summary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("AI endpoint boundary", () => {
  it("authenticates, limits, and loads canonical data before executing", async () => {
    const calls: string[] = [];
    const aiBudget = budget();
    const reserve = vi.spyOn(aiBudget, "reserve").mockImplementation(async (id) => { calls.push("budget"); return AIDailyBudget.prototype.reserve.call(aiBudget, id); });
    const handler = createAIEndpoint({
      feature: "visit_summary", requestSchema: bodySchema,
      authenticate: async () => { calls.push("auth"); return actor; },
      rateLimiter: allow(),
      budget: aiBudget,
      loadAuthorizedInput: async (who, params) => { calls.push(`load:${who.id}:${params.visitId}`); return { canonical: true }; },
      execute: async (input) => { calls.push("execute"); return input; },
    });
    const response = await handler(request({ visitId: "00000000-0000-4000-8000-000000000002" }));
    expect(response.status).toBe(200);
    expect(calls.map((x) => x.split(":")[0])).toEqual(["auth", "budget", "load", "execute"]);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects unauthenticated calls before rate limiting or model execution", async () => {
    const rateLimiter = allow();
    const execute = vi.fn();
    const handler = createAIEndpoint({ feature: "visit_summary", requestSchema: bodySchema, authenticate: async () => null, rateLimiter, budget: budget(), loadAuthorizedInput: async () => ({}), execute });
    const response = await handler(request({ visitId: "00000000-0000-4000-8000-000000000002" }));
    expect(response.status).toBe(401);
    expect(rateLimiter.consume).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("returns 429 before reading private records or calling Claude", async () => {
    const rateLimiter: RateLimiter = { consume: vi.fn().mockResolvedValue({ allowed: false, retryAfterSeconds: 20 }) };
    const loadAuthorizedInput = vi.fn();
    const execute = vi.fn();
    const handler = createAIEndpoint({ feature: "visit_summary", requestSchema: bodySchema, authenticate: async () => actor, rateLimiter, budget: budget(), loadAuthorizedInput, execute });
    const response = await handler(request({ visitId: "00000000-0000-4000-8000-000000000002" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("20");
    expect(loadAuthorizedInput).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("fails closed if the shared limiter is unavailable", async () => {
    const rateLimiter: RateLimiter = { consume: vi.fn().mockRejectedValue(new Error("redis unavailable")) };
    const execute = vi.fn();
    const handler = createAIEndpoint({ feature: "visit_summary", requestSchema: bodySchema, authenticate: async () => actor, rateLimiter, budget: budget(), loadAuthorizedInput: async () => ({}), execute });
    const response = await handler(request({ visitId: "00000000-0000-4000-8000-000000000002" }));
    expect(response.status).toBe(503);
    expect(execute).not.toHaveBeenCalled();
  });

  it("blocks model work when the daily spend budget is exhausted", async () => {
    const loadAuthorizedInput = vi.fn();
    const execute = vi.fn();
    const spentBudget = { reserve: vi.fn().mockRejectedValue(new AIBudgetExceededError("global")), settle: vi.fn() };
    const handler = createAIEndpoint({ feature: "visit_summary", requestSchema: bodySchema, authenticate: async () => actor, rateLimiter: allow(), budget: spentBudget, loadAuthorizedInput, execute });
    const response = await handler(request({ visitId: "00000000-0000-4000-8000-000000000002" }));
    expect(response.status).toBe(429);
    expect(execute).not.toHaveBeenCalled();
    expect(loadAuthorizedInput).not.toHaveBeenCalled();
  });
});
