import { createHash, randomBytes } from "node:crypto";

// Hash full values; never write free text, names, IDs, or raw vitals to logs.
// The event log is useful for correlation/quality counts, not reconstruction.
export function anonymizedAuditRecord(event: string, input: unknown, output: unknown, outcome: "ok" | "error") {
  const digest = (value: unknown) => createHash("sha256").update(randomBytes(16)).update(JSON.stringify(value)).digest("hex");
  return {
    event,
    inputDigest: digest(input),
    outputDigest: digest(output),
    outcome,
    loggedAt: new Date().toISOString(),
  };
}

export function writeAuditRecord(record: ReturnType<typeof anonymizedAuditRecord>): void {
  console.info(JSON.stringify({ type: "ai_audit", ...record }));
}
