create schema if not exists "__AGENT_SCHEMA__";

create table if not exists "__AGENT_SCHEMA__"."agent_session_owners" (
  session_id text primary key,
  tenant_id text not null,
  principal_id text not null,
  principal_type text not null,
  issuer text,
  created_at timestamptz not null default now()
);

create index if not exists agent_session_owners_tenant_principal_idx
  on "__AGENT_SCHEMA__"."agent_session_owners" (tenant_id, principal_id, created_at desc);

create table if not exists "__AGENT_SCHEMA__"."agent_sandbox_deletions" (
  session_id text primary key,
  tenant_id text not null,
  principal_id text not null,
  requested_by text not null,
  reason text not null,
  not_before timestamptz not null default now(),
  status text not null default 'authorized',
  attempt_count integer not null default 0,
  claim_token text,
  claim_expires_at timestamptz,
  container_id text,
  container_name text,
  last_error text,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint agent_sandbox_deletion_status check (status in (
    'authorized',
    'claimed',
    'completed',
    'failed'
  )),
  constraint agent_sandbox_deletion_claim check (
    (status = 'claimed' and claim_token is not null and claim_expires_at is not null)
    or status <> 'claimed'
  )
);

create index if not exists agent_sandbox_deletions_ready_idx
  on "__AGENT_SCHEMA__"."agent_sandbox_deletions" (status, not_before, claim_expires_at);

create index if not exists agent_sandbox_deletions_owner_idx
  on "__AGENT_SCHEMA__"."agent_sandbox_deletions" (tenant_id, principal_id, requested_at desc);

create table if not exists "__AGENT_SCHEMA__"."agent_thread_collections" (
  tenant_id text not null,
  principal_id text not null,
  storage_key text not null,
  revision bigint not null,
  collection jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, principal_id, storage_key),
  constraint agent_thread_collection_object check (jsonb_typeof(collection) = 'object')
);

create table if not exists "__AGENT_SCHEMA__"."agent_runs" (
  run_id text primary key,
  tenant_id text not null,
  principal_id text not null,
  idempotency_key text not null,
  request_fingerprint text not null,
  correlation_id text not null,
  profile jsonb not null,
  policy jsonb not null default '{}'::jsonb,
  parent jsonb,
  metadata jsonb not null default '{}'::jsonb,
  status text not null,
  eve_session_id text unique,
  eve_continuation_token text,
  event_count integer not null default 0,
  usage jsonb not null default '{"cacheReadTokens":0,"cacheWriteTokens":0,"costUsd":0,"inputTokens":0,"outputTokens":0,"steps":0}'::jsonb,
  result jsonb,
  failure jsonb,
  revision bigint not null default 1,
  cancellation_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_run_status check (status in (
    'submitting',
    'running',
    'waiting-input',
    'waiting-authorization',
    'completed',
    'failed',
    'cancelled',
    'submission-ambiguous'
  )),
  constraint agent_run_profile_object check (jsonb_typeof(profile) = 'object'),
  constraint agent_run_policy_object check (jsonb_typeof(policy) = 'object'),
  constraint agent_run_parent_object check (parent is null or jsonb_typeof(parent) = 'object'),
  constraint agent_run_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists agent_runs_owner_idempotency_idx
  on "__AGENT_SCHEMA__"."agent_runs" (tenant_id, principal_id, idempotency_key);

create index if not exists agent_runs_owner_updated_idx
  on "__AGENT_SCHEMA__"."agent_runs" (tenant_id, principal_id, updated_at desc);

alter table "__AGENT_SCHEMA__"."agent_runs"
  alter column usage set default '{"cacheReadTokens":0,"cacheWriteTokens":0,"costUsd":0,"inputTokens":0,"outputTokens":0,"steps":0}'::jsonb;

alter table "__AGENT_SCHEMA__"."agent_runs"
  add column if not exists policy jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agent_run_policy_object'
      and conrelid = '"__AGENT_SCHEMA__"."agent_runs"'::regclass
  ) then
    alter table "__AGENT_SCHEMA__"."agent_runs"
      add constraint agent_run_policy_object
      check (jsonb_typeof(policy) = 'object') not valid;
    alter table "__AGENT_SCHEMA__"."agent_runs"
      validate constraint agent_run_policy_object;
  end if;
end $$;

update "__AGENT_SCHEMA__"."agent_runs"
  set usage = usage || '{"costUsd":0}'::jsonb
  where not usage ? 'costUsd';

create table if not exists "__AGENT_SCHEMA__"."agent_extension_installations" (
  tenant_id text not null,
  extension_id text not null,
  extension_version text not null,
  kind text not null,
  status text not null,
  credential_ref text,
  configured_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, extension_id, extension_version),
  constraint agent_extension_installation_kind check (kind in ('skill', 'mcp')),
  constraint agent_extension_installation_status check (status in ('enabled', 'revoked')),
  constraint agent_extension_credential_reference check (
    credential_ref is null
    or credential_ref ~ '^(vault|vercel-connect)://[A-Za-z0-9][A-Za-z0-9._~:/-]*$'
  )
);

create index if not exists agent_extension_installations_tenant_idx
  on "__AGENT_SCHEMA__"."agent_extension_installations" (tenant_id, updated_at desc);

create table if not exists "__AGENT_SCHEMA__"."agent_extension_audit_events" (
  event_id text primary key,
  tenant_id text not null,
  extension_id text not null,
  extension_version text not null,
  kind text not null,
  action text not null,
  actor_id text not null,
  before_state jsonb,
  after_state jsonb not null,
  created_at timestamptz not null default now(),
  constraint agent_extension_audit_kind check (kind in ('skill', 'mcp')),
  constraint agent_extension_audit_action check (action in ('enabled', 'revoked')),
  constraint agent_extension_audit_before_object check (
    before_state is null or jsonb_typeof(before_state) = 'object'
  ),
  constraint agent_extension_audit_after_object check (jsonb_typeof(after_state) = 'object')
);

create index if not exists agent_extension_audit_tenant_idx
  on "__AGENT_SCHEMA__"."agent_extension_audit_events" (tenant_id, created_at desc);
