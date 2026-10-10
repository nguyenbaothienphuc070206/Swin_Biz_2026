import { describe, expect, it } from "vitest";
import {
  AIDailyBudget,
  MemoryAIUsageStore,
  calculateCostMicroUsd,
  type AIReportMetric,
} from "../lib/ai/metering";

describe("AI cost metering", () => {
  it("calculates cost from actual provider token usage", () => {
    expect(calculateCostMicroUsd({ inputTokens: 1_000, outputTokens: 200, inputUsdPerMillion: 3, outputUsdPerMillion: 15 })).toBe(6_000);
  });

  it("enforces per-user and global UTC daily budgets before execution", async () => {
    const store = new MemoryAIUsageStore();
    const budget = new AIDailyBudget({ store, hashSecret: "unit-test-secret-that-is-at-least-32-chars", globalDailyMicroUsd: 1_000, userDailyMicroUsd: 600, reservationMicroUsd: 400, inputUsdPerMillion: 3, outputUsdPerMillion: 15, now: () => new Date("2026-10-10T12:00:00Z") });
    const first = await budget.reserve("user-a");
    expect(first).toBeTruthy();
    await expect(budget.reserve("user-a")).rejects.toThrow("AI_USER_DAILY_BUDGET_EXCEEDED");
    const second = await budget.reserve("user-b");
    expect(second).toBeTruthy();
    await expect(budget.reserve("user-c")).rejects.toThrow("AI_GLOBAL_DAILY_BUDGET_EXCEEDED");
  });

  it("releases unused reservation and charges measured spend once", async () => {
    const store = new MemoryAIUsageStore();
    const budget = new AIDailyBudget({ store, hashSecret: "unit-test-secret-that-is-at-least-32-chars", globalDailyMicroUsd: 1_000, userDailyMicroUsd: 1_000, reservationMicroUsd: 500, inputUsdPerMillion: 3, outputUsdPerMillion: 15, now: () => new Date("2026-10-10T12:00:00Z") });
    const reservation = await budget.reserve("user-a");
    await budget.settle(reservation, { feature: "visit_summary", model: "test-model", inputTokens: 100, outputTokens: 10, durationMs: 325, generationCalls: 1, outcome: "ok", safetyBlocked: false });
    await budget.settle(reservation, { feature: "visit_summary", model: "test-model", inputTokens: 100, outputTokens: 10, durationMs: 325, generationCalls: 1, outcome: "ok", safetyBlocked: false });
    expect(store.spent("global", reservation.day)).toBe(450);
    expect(store.metrics).toHaveLength(1);
    expect(store.metrics[0]).toMatchObject({ inputTokens: 100, outputTokens: 10, durationMs: 325, costMicroUsd: 450 });
  });

  it("records safe metric dimensions only, including safety filter outcomes", async () => {
    const store = new MemoryAIUsageStore();
    const budget = new AIDailyBudget({ store, hashSecret: "unit-test-secret-that-is-at-least-32-chars", globalDailyMicroUsd: 100_000, userDailyMicroUsd: 100_000, reservationMicroUsd: 50_000, inputUsdPerMillion: 3, outputUsdPerMillion: 15, now: () => new Date("2026-10-10T12:00:00Z") });
    const reservation = await budget.reserve("private-user-id");
    const metric: AIReportMetric = { feature: "visit_summary", model: "claude-sonnet-4-5", inputTokens: 20, outputTokens: 10, durationMs: 120, generationCalls: 1, outcome: "blocked", safetyBlocked: true };
    await budget.settle(reservation, metric);
    expect(JSON.stringify(store.metrics[0])).not.toContain("private-user-id");
    expect(store.metrics[0]).toMatchObject({ outcome: "blocked", safetyBlocked: true, feature: "visit_summary" });
  });
});
