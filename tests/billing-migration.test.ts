import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20261010230000_billing_and_notification_outbox.sql", import.meta.url),
  "utf8",
);

describe("billing migration security invariants", () => {
  it("defines family scoped billing data and unique provider idempotency keys", () => {
    expect(migration).toMatch(/create table if not exists public\.families/i);
    expect(migration).toMatch(/create table if not exists public\.family_members/i);
    expect(migration).toMatch(/create table if not exists public\.family_invoices/i);
    expect(migration).toMatch(/unique \(provider, external_event_key\)/i);
    expect(migration).toMatch(/provider_order_id text not null unique/i);
  });

  it("keeps payment credentials and backend queues unavailable to household clients", () => {
    expect(migration).toMatch(/create table if not exists public\.provider_credentials/i);
    expect(migration).toMatch(/revoke all on public\.provider_credentials[\s\S]*?from anon, authenticated/i);
    expect(migration).toMatch(/revoke all on public\.provider_credentials,[\s\S]*?public\.notification_outbox/i);
    expect(migration).toMatch(/grant all on public\.billing_plans[\s\S]*?to service_role/i);
  });

  it("restricts household reads through active family membership and does not seed unapproved prices", () => {
    expect(migration).toMatch(/status = 'active'/i);
    expect(migration).toMatch(/public\.is_family_member\(family_id\)/i);
    expect(migration).toMatch(/create policy subscriptions_read_family/i);
    expect(migration).not.toMatch(/insert into public\.billing_plans/i);
  });

  it("provides a bounded retry outbox while separating its stored text from health data", () => {
    expect(migration).toMatch(/attempts between 0 and 12/i);
    expect(migration).toMatch(/status in \('queued', 'sending', 'sent', 'retry', 'dead'\)/i);
    expect(migration).toMatch(/safe_variables jsonb/i);
    expect(migration).toMatch(/last_error_code text/i);
  });
});
