import { createHmac, randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";

export type AIMetricFeature = "visit_summary" | "early_warning" | "weekly_trend";
export type AIMetricOutcome = "ok" | "error" | "blocked";

export interface AIReportMetric {
  feature: AIMetricFeature;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  generationCalls: number;
  outcome: AIMetricOutcome;
  safetyBlocked: boolean;
}

export interface StoredAIReportMetric extends AIReportMetric {
  costMicroUsd: number;
  day: string;
}

export interface AIUsageStore {
  reserve(args: { globalKey: string; userKey: string; reservationKey: string; amount: number; globalLimit: number; userLimit: number; ttlSeconds: number }): Promise<"reserved" | "user_limit" | "global_limit">;
  settle(args: { globalKey: string; userKey: string; reservationKey: string; metricsKey: string; costMicroUsd: number; metric: Omit<StoredAIReportMetric, "costMicroUsd" | "day">; ttlSeconds: number }): Promise<boolean>;
}

export interface AIUsageReservation {
  id: string;
  day: string;
  globalKey: string;
  userKey: string;
  reservationKey: string;
  metricsPrefix: string;
  reservedMicroUsd: number;
}

export interface AIBudget {
  reserve(actorId: string): Promise<AIUsageReservation>;
  settle(reservation: AIUsageReservation, metric: AIReportMetric): Promise<void>;
}

export interface AIBudgetConfig {
  store: AIUsageStore;
  hashSecret: string;
  globalDailyMicroUsd: number;
  userDailyMicroUsd: number;
  reservationMicroUsd: number;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  now?: () => Date;
}

export class AIBudgetExceededError extends Error {
  constructor(readonly scope: "user" | "global") {
    super(scope === "user" ? "AI_USER_DAILY_BUDGET_EXCEEDED" : "AI_GLOBAL_DAILY_BUDGET_EXCEEDED");
  }
}

export function calculateCostMicroUsd(input: { inputTokens: number; outputTokens: number; inputUsdPerMillion: number; outputUsdPerMillion: number }) {
  return Math.ceil(input.inputTokens * input.inputUsdPerMillion + input.outputTokens * input.outputUsdPerMillion);
}

function positiveSafeInteger(name: string, value: number) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
}

export class AIDailyBudget implements AIBudget {
  private readonly now: () => Date;

  constructor(private readonly config: AIBudgetConfig) {
    if (config.hashSecret.length < 32) throw new Error("AI_RATE_LIMIT_HASH_SECRET must contain at least 32 characters");
    positiveSafeInteger("AI_DAILY_GLOBAL_BUDGET_MICRO_USD", config.globalDailyMicroUsd);
    positiveSafeInteger("AI_DAILY_USER_BUDGET_MICRO_USD", config.userDailyMicroUsd);
    positiveSafeInteger("AI_MAX_REQUEST_RESERVATION_MICRO_USD", config.reservationMicroUsd);
    if (![config.inputUsdPerMillion, config.outputUsdPerMillion].every((v) => Number.isFinite(v) && v > 0)) throw new Error("AI token prices must be positive numbers");
    this.now = config.now ?? (() => new Date());
  }

  async reserve(actorId: string): Promise<AIUsageReservation> {
    const today = this.now().toISOString().slice(0, 10);
    const digest = createHmac("sha256", this.config.hashSecret).update(actorId).digest("hex");
    const id = randomUUID();
    const prefix = `nha-gan:ai:usage:${today}`;
    const reservation: AIUsageReservation = {
      id,
      day: today,
      globalKey: `${prefix}:global`,
      userKey: `${prefix}:user:${digest}`,
      reservationKey: `${prefix}:reservation:${id}`,
      metricsPrefix: `${prefix}:metrics`,
      reservedMicroUsd: this.config.reservationMicroUsd,
    };
    const tomorrow = new Date(`${today}T00:00:00.000Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const ttlSeconds = Math.ceil((tomorrow.getTime() - this.now().getTime()) / 1_000) + 86_400;
    const result = await this.config.store.reserve({
      globalKey: reservation.globalKey,
      userKey: reservation.userKey,
      reservationKey: reservation.reservationKey,
      amount: reservation.reservedMicroUsd,
      globalLimit: this.config.globalDailyMicroUsd,
      userLimit: this.config.userDailyMicroUsd,
      ttlSeconds,
    });
    if (result !== "reserved") throw new AIBudgetExceededError(result === "user_limit" ? "user" : "global");
    return reservation;
  }

  async settle(reservation: AIUsageReservation, metric: AIReportMetric): Promise<void> {
    const safeModel = /^[a-zA-Z0-9._-]{1,80}$/.test(metric.model) ? metric.model : "configured-model";
    const clean: AIReportMetric = {
      feature: metric.feature,
      model: safeModel,
      inputTokens: Math.max(0, Math.trunc(metric.inputTokens)),
      outputTokens: Math.max(0, Math.trunc(metric.outputTokens)),
      durationMs: Math.max(0, Math.trunc(metric.durationMs)),
      generationCalls: Math.max(0, Math.trunc(metric.generationCalls)),
      outcome: metric.outcome,
      safetyBlocked: metric.safetyBlocked,
    };
    const costMicroUsd = calculateCostMicroUsd({ ...clean, inputUsdPerMillion: this.config.inputUsdPerMillion, outputUsdPerMillion: this.config.outputUsdPerMillion });
    const tomorrow = new Date(`${reservation.day}T00:00:00.000Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const ttlSeconds = Math.ceil((tomorrow.getTime() - this.now().getTime()) / 1_000) + 86_400;
    await this.config.store.settle({
      globalKey: reservation.globalKey,
      userKey: reservation.userKey,
      reservationKey: reservation.reservationKey,
      metricsKey: `${reservation.metricsPrefix}:${clean.feature}:${safeModel}`,
      costMicroUsd,
      metric: clean,
      ttlSeconds,
    });
  }
}

/** Per-request collector. It only accepts provider token counts and timings. */
export class AIRequestMeter {
  private inputTokens = 0;
  private outputTokens = 0;
  private durationMs = 0;
  private generations = 0;
  private model = "unknown";
  private safetyBlocked = false;
  private finished = false;

  constructor(private readonly budget: AIBudget, private readonly reservation: AIUsageReservation, private readonly feature: AIMetricFeature) {}

  recordGeneration(input: { model: string; inputTokens?: number; outputTokens?: number; durationMs: number }) {
    this.generations += 1;
    this.model = input.model;
    this.inputTokens += Math.max(0, input.inputTokens ?? 0);
    this.outputTokens += Math.max(0, input.outputTokens ?? 0);
    this.durationMs += Math.max(0, input.durationMs);
  }

  markSafetyBlocked() { this.safetyBlocked = true; }
  isSafetyBlocked() { return this.safetyBlocked; }

  async finish(outcome: AIMetricOutcome) {
    if (this.finished) return;
    this.finished = true;
    await this.budget.settle(this.reservation, {
      feature: this.feature,
      model: this.model,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      durationMs: this.durationMs,
      generationCalls: this.generations,
      outcome: this.safetyBlocked ? "blocked" : outcome,
      safetyBlocked: this.safetyBlocked,
    });
  }
}

const reserveScript = `
local amount = tonumber(ARGV[1]);
local globalLimit = tonumber(ARGV[2]);
local userLimit = tonumber(ARGV[3]);
local ttl = tonumber(ARGV[4]);
if redis.call('EXISTS', KEYS[3]) == 1 then return -1 end
local globalValue = tonumber(redis.call('GET', KEYS[1]) or '0');
local userValue = tonumber(redis.call('GET', KEYS[2]) or '0');
if userValue + amount > userLimit then return -1 end
if globalValue + amount > globalLimit then return 0 end
redis.call('INCRBY', KEYS[1], amount); redis.call('EXPIRE', KEYS[1], ttl);
redis.call('INCRBY', KEYS[2], amount); redis.call('EXPIRE', KEYS[2], ttl);
redis.call('SET', KEYS[3], amount, 'EX', ttl);
return 1;
`;

const settleScript = `
local reserved = tonumber(redis.call('GET', KEYS[3]));
if not reserved then return 0 end
local actual = tonumber(ARGV[1]); local ttl = tonumber(ARGV[2]);
redis.call('DEL', KEYS[3]);
redis.call('DECRBY', KEYS[1], reserved); redis.call('INCRBY', KEYS[1], actual); redis.call('EXPIRE', KEYS[1], ttl);
redis.call('DECRBY', KEYS[2], reserved); redis.call('INCRBY', KEYS[2], actual); redis.call('EXPIRE', KEYS[2], ttl);
local fields = {'requests',1,'generations',ARGV[3],'input_tokens',ARGV[4],'output_tokens',ARGV[5],'latency_ms',ARGV[6],'cost_micro_usd',actual,'errors',ARGV[7],'safety_blocks',ARGV[8]};
for i=1,#fields,2 do redis.call('HINCRBY', KEYS[4], fields[i], tonumber(fields[i+1])) end
redis.call('EXPIRE', KEYS[4], ttl);
return 1;
`;

export class UpstashAIUsageStore implements AIUsageStore {
  constructor(private readonly redis: Redis = Redis.fromEnv()) {}

  async reserve(args: Parameters<AIUsageStore["reserve"]>[0]) {
    const result = Number(await this.redis.eval(reserveScript, [args.globalKey, args.userKey, args.reservationKey], [String(args.amount), String(args.globalLimit), String(args.userLimit), String(args.ttlSeconds)]));
    if (result === -1) return "user_limit";
    if (result === 0) return "global_limit";
    return "reserved";
  }

  async settle(args: Parameters<AIUsageStore["settle"]>[0]) {
    const m = args.metric;
    const result = await this.redis.eval(settleScript,
      [args.globalKey, args.userKey, args.reservationKey, args.metricsKey],
      [String(args.costMicroUsd), String(args.ttlSeconds), String(m.generationCalls), String(m.inputTokens), String(m.outputTokens), String(m.durationMs), String(m.outcome === "ok" ? 0 : 1), String(m.safetyBlocked ? 1 : 0)],
    );
    return Number(result) === 1;
  }
}

export class MemoryAIUsageStore implements AIUsageStore {
  private readonly amounts = new Map<string, number>();
  private readonly reservations = new Map<string, { globalKey: string; userKey: string; amount: number }>();
  readonly metrics: StoredAIReportMetric[] = [];
  spent(scope: "global" | "user", day: string) {
    const key = scope === "global" ? `nha-gan:ai:usage:${day}:global` : [...this.amounts.keys()].find((candidate) => candidate.startsWith(`nha-gan:ai:usage:${day}:user:`)) ?? "";
    return this.amounts.get(key) ?? 0;
  }

  async reserve(args: Parameters<AIUsageStore["reserve"]>[0]) {
    if ((this.amounts.get(args.userKey) ?? 0) + args.amount > args.userLimit) return "user_limit";
    if ((this.amounts.get(args.globalKey) ?? 0) + args.amount > args.globalLimit) return "global_limit";
    this.amounts.set(args.globalKey, (this.amounts.get(args.globalKey) ?? 0) + args.amount);
    this.amounts.set(args.userKey, (this.amounts.get(args.userKey) ?? 0) + args.amount);
    this.reservations.set(args.reservationKey, { globalKey: args.globalKey, userKey: args.userKey, amount: args.amount });
    return "reserved";
  }

  async settle(args: Parameters<AIUsageStore["settle"]>[0]) {
    const reservation = this.reservations.get(args.reservationKey);
    if (!reservation) return false;
    this.reservations.delete(args.reservationKey);
    this.amounts.set(reservation.globalKey, (this.amounts.get(reservation.globalKey) ?? 0) - reservation.amount + args.costMicroUsd);
    this.amounts.set(reservation.userKey, (this.amounts.get(reservation.userKey) ?? 0) - reservation.amount + args.costMicroUsd);
    this.metrics.push({ ...args.metric, costMicroUsd: args.costMicroUsd, day: args.metricsKey.split(":")[3] ?? "" });
    return true;
  }
}

export function createAIDailyBudgetFromEnv() {
  const positive = (name: string): number => {
    const value = Number(process.env[name]);
    positiveSafeInteger(name, value);
    return value;
  };
  const price = (name: string): number => {
    const value = Number(process.env[name]);
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number`);
    return value;
  };
  const hashSecret = process.env.AI_RATE_LIMIT_HASH_SECRET;
  if (!hashSecret) throw new Error("AI_RATE_LIMIT_HASH_SECRET is required");
  return new AIDailyBudget({
    store: new UpstashAIUsageStore(),
    hashSecret,
    globalDailyMicroUsd: positive("AI_DAILY_GLOBAL_BUDGET_MICRO_USD"),
    userDailyMicroUsd: positive("AI_DAILY_USER_BUDGET_MICRO_USD"),
    reservationMicroUsd: positive("AI_MAX_REQUEST_RESERVATION_MICRO_USD"),
    inputUsdPerMillion: price("AI_INPUT_USD_PER_MILLION_TOKENS"),
    outputUsdPerMillion: price("AI_OUTPUT_USD_PER_MILLION_TOKENS"),
  });
}
