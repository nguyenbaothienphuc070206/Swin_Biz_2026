import "server-only";
import {
  alertRequestSchema,
  visitSummaryRequestSchema,
  weeklyTrendRequestSchema,
  type AlertInput,
  type AlertPolicy,
  type VisitSummaryInput,
  type WeeklyTrendInput,
} from "./contracts";
import type { RateLimiter } from "./limiter";
import { createAIEndpoint, type AIActor } from "./route-handler";
import type { JsonGenerator } from "./service";
import { createAlertExplanation, createVisitSummary, createWeeklyTrend } from "./service";
import { defaultAlertPolicy } from "./rules";
import type { AIBudget } from "./metering";

export interface AIRepository {
  authenticate(request: Request): Promise<AIActor | null>;
  // Every loader must use the caller's Supabase Auth context so RLS applies.
  loadVisitSummary(actor: AIActor, request: { visitId: string }): Promise<VisitSummaryInput>;
  loadAlert(actor: AIActor, request: { elderId: string }): Promise<AlertInput>;
  loadWeeklyTrend(actor: AIActor, request: { elderId: string; weekStarting: string }): Promise<WeeklyTrendInput>;
}

export interface AIEndpointRuntime {
  repository: AIRepository;
  generator: JsonGenerator;
  limiterFor(feature: "visit_summary" | "early_warning" | "weekly_trend"): RateLimiter;
  budget: AIBudget;
  alertPolicy?: AlertPolicy;
}

export function createAIEntrypoints(runtime: AIEndpointRuntime) {
  return {
    visitSummary: createAIEndpoint({
      feature: "visit_summary",
      requestSchema: visitSummaryRequestSchema,
      authenticate: (request) => runtime.repository.authenticate(request),
      rateLimiter: runtime.limiterFor("visit_summary"),
      budget: runtime.budget,
      loadAuthorizedInput: (actor, params) => runtime.repository.loadVisitSummary(actor, params),
      execute: (input, meter) => createVisitSummary(runtime.generator, input, meter),
    }),
    earlyWarning: createAIEndpoint({
      feature: "early_warning",
      requestSchema: alertRequestSchema,
      authenticate: (request) => runtime.repository.authenticate(request),
      rateLimiter: runtime.limiterFor("early_warning"),
      budget: runtime.budget,
      loadAuthorizedInput: (actor, params) => runtime.repository.loadAlert(actor, params),
      execute: (input, meter) => createAlertExplanation(runtime.generator, input, runtime.alertPolicy ?? defaultAlertPolicy, meter),
    }),
    weeklyTrend: createAIEndpoint({
      feature: "weekly_trend",
      requestSchema: weeklyTrendRequestSchema,
      authenticate: (request) => runtime.repository.authenticate(request),
      rateLimiter: runtime.limiterFor("weekly_trend"),
      budget: runtime.budget,
      loadAuthorizedInput: (actor, params) => runtime.repository.loadWeeklyTrend(actor, params),
      execute: (input, meter) => createWeeklyTrend(runtime.generator, input, meter),
    }),
  };
}
