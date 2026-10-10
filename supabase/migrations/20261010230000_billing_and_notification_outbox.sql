-- Billing foundation for Nhà Gần. Apply only after Supabase Auth is configured.
-- Product prices are intentionally not seeded; they require an approved price list.
begin;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member', 'caregiver')),
  status text not null default 'active' check (status in ('invited', 'active', 'removed')),
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code in ('basic', 'standard', 'comprehensive')),
  version integer not null check (version > 0),
  amount_vnd bigint not null check (amount_vnd > 0),
  period_months smallint not null check (period_months between 1 and 12),
  active boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  unique (code, version),
  check (effective_to is null or effective_to > effective_from)
);

create table if not exists public.family_subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete restrict,
  plan_id uuid not null references public.billing_plans(id) on delete restrict,
  primary_payer_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null check (status in ('pending', 'active', 'past_due', 'expired', 'cancelled')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  renewal_enabled boolean not null default false,
  provider_order_id text unique,
  provider_client_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((current_period_start is null and current_period_end is null) or current_period_end > current_period_start)
);
create unique index if not exists family_one_current_subscription_idx
  on public.family_subscriptions (family_id)
  where status in ('pending', 'active', 'past_due');

-- The payment token is isolated so household read policies can never expose it.
create table if not exists public.provider_credentials (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null unique references public.family_subscriptions(id) on delete cascade,
  provider text not null check (provider = 'momo'),
  token_ciphertext bytea not null,
  key_version text not null,
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

create table if not exists public.family_invoices (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete restrict,
  subscription_id uuid not null references public.family_subscriptions(id) on delete restrict,
  plan_code text not null check (plan_code in ('basic', 'standard', 'comprehensive')),
  plan_version integer not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  amount_due_vnd bigint not null check (amount_due_vnd > 0),
  amount_paid_vnd bigint not null default 0 check (amount_paid_vnd >= 0 and amount_paid_vnd <= amount_due_vnd),
  status text not null check (status in ('open', 'partially_paid', 'paid', 'past_due', 'void')),
  due_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (subscription_id, period_start),
  check (period_end > period_start)
);

create table if not exists public.invoice_contributions (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.family_invoices(id) on delete restrict,
  payer_user_id uuid not null references auth.users(id) on delete restrict,
  amount_vnd bigint not null check (amount_vnd > 0),
  provider text not null check (provider = 'momo'),
  provider_order_id text not null unique,
  provider_transaction_id text unique,
  status text not null check (status in ('pending', 'paid', 'failed', 'refunded')),
  kind text not null check (kind in ('primary_recurring', 'family_one_time')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists invoice_contributions_invoice_idx on public.invoice_contributions(invoice_id, status);

create table if not exists public.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('momo', 'zalo')),
  external_event_key text not null,
  order_id text,
  payload_hash text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  result_code text,
  unique (provider, external_event_key)
);

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('visit_report_ready', 'care_alert')),
  template_code text not null,
  safe_variables jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_variables) = 'object'),
  idempotency_key text not null unique,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'retry', 'dead')),
  attempts smallint not null default 0 check (attempts between 0 and 12),
  next_attempt_at timestamptz not null default now(),
  provider_message_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists notification_outbox_ready_idx on public.notification_outbox(next_attempt_at)
  where status in ('queued', 'retry');

create table if not exists public.reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'completed', 'failed')),
  mismatch_count integer not null default 0 check (mismatch_count >= 0)
);
create table if not exists public.reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.reconciliation_runs(id) on delete cascade,
  contribution_id uuid references public.invoice_contributions(id) on delete set null,
  provider_order_hash text not null,
  mismatch_code text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);

create or replace function public.is_family_member(target_family uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = target_family and fm.user_id = (select auth.uid()) and fm.status = 'active'
  );
$$;
revoke all on function public.is_family_member(uuid) from public, anon;
grant execute on function public.is_family_member(uuid) to authenticated, service_role;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.billing_plans enable row level security;
alter table public.family_subscriptions enable row level security;
alter table public.provider_credentials enable row level security;
alter table public.family_invoices enable row level security;
alter table public.invoice_contributions enable row level security;
alter table public.provider_events enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.reconciliation_runs enable row level security;
alter table public.reconciliation_items enable row level security;

drop policy if exists family_members_read_self_family on public.families;
create policy family_members_read_self_family on public.families for select to authenticated
  using (public.is_family_member(id) or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists family_members_read_members on public.family_members;
create policy family_members_read_members on public.family_members for select to authenticated
  using (public.is_family_member(family_id) or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists plans_read_active on public.billing_plans;
create policy plans_read_active on public.billing_plans for select to authenticated using (active and now() >= effective_from and (effective_to is null or now() < effective_to));
drop policy if exists subscriptions_read_family on public.family_subscriptions;
create policy subscriptions_read_family on public.family_subscriptions for select to authenticated
  using (public.is_family_member(family_id) or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists invoices_read_family on public.family_invoices;
create policy invoices_read_family on public.family_invoices for select to authenticated
  using (public.is_family_member(family_id) or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists contributions_read_family on public.invoice_contributions;
create policy contributions_read_family on public.invoice_contributions for select to authenticated
  using (exists (select 1 from public.family_invoices i where i.id = invoice_id and public.is_family_member(i.family_id))
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- No authenticated/anon write policy exists for billing ledgers, provider events,
-- credentials, notifications or reconciliation. Server mutations must use
-- authenticated server routes and service-role transactions/RPCs.
revoke all on public.provider_credentials, public.provider_events, public.notification_outbox,
  public.reconciliation_runs, public.reconciliation_items from anon, authenticated;
revoke insert, update, delete on public.billing_plans, public.family_subscriptions,
  public.family_invoices, public.invoice_contributions from anon, authenticated;
grant select on public.families, public.family_members, public.billing_plans,
  public.family_subscriptions, public.family_invoices, public.invoice_contributions to authenticated;
grant all on public.billing_plans, public.family_subscriptions, public.provider_credentials,
  public.family_invoices, public.invoice_contributions, public.provider_events,
  public.notification_outbox, public.reconciliation_runs, public.reconciliation_items to service_role;

commit;
