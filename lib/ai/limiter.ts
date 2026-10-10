import { createHmac } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimiter {
  consume(key: string): Promise<{ allowed: boolean; retryAfterSeconds: number; unavailable?: boolean }>;
}

export class UpstashSlidingWindowLimiter implements RateLimiter {
  private readonly limiter: Ratelimit;
  private readonly hashSecret: string;

  constructor(
    feature: "visit_summary" | "early_warning" | "weekly_trend",
    limit = readPositiveInteger("AI_RATE_LIMIT_MAX_REQUESTS", 10),
    windowSeconds = readPositiveInteger("AI_RATE_LIMIT_WINDOW_SECONDS", 60),
  ) {
    const hashSecret = process.env.AI_RATE_LIMIT_HASH_SECRET;
    if (!hashSecret) throw new Error("AI_RATE_LIMIT_HASH_SECRET is required");
    this.hashSecret = hashSecret;
    this.limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `nha-gan:ai:${feature}`,
      analytics: false,
      timeout: 1_500,
    });
  }

  async consume(key: string) {
    const identifier = createHmac("sha256", this.hashSecret).update(key).digest("hex");
    const result = await this.limiter.limit(identifier);
    const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    // Upstash's timeout mode defaults to allowing requests. Fail closed here to
    // avoid an outage bypassing cost and abuse controls on AI endpoints.
    if (result.reason === "timeout") return { allowed: false, retryAfterSeconds: 5, unavailable: true };
    return { allowed: result.success, retryAfterSeconds: result.success ? 0 : retryAfterSeconds };
  }
}

function readPositiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

const sharedLimiters = new Map<string, UpstashSlidingWindowLimiter>();
export function getUpstashRateLimiter(feature: "visit_summary" | "early_warning" | "weekly_trend") {
  let limiter = sharedLimiters.get(feature);
  if (!limiter) {
    limiter = new UpstashSlidingWindowLimiter(feature);
    sharedLimiters.set(feature, limiter);
  }
  return limiter;
}

// For unit tests and local single-process development only. Vercel production
// must inject an atomic shared store (e.g. Supabase RPC or Redis).
export class LocalSlidingWindowLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();
  constructor(private readonly limit: number, private readonly windowMs: number, private readonly now = () => Date.now()) {}
  async consume(key: string) {
    const cutoff = this.now() - this.windowMs;
    const active = (this.hits.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
    if (active.length >= this.limit) {
      this.hits.set(key, active);
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((active[0]! + this.windowMs - this.now()) / 1000)) };
    }
    active.push(this.now());
    this.hits.set(key, active);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
