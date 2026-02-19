-- ─── Integrations table ───────────────────────────────────────────────────────
-- Stores OAuth tokens for third-party platforms (Pinterest, Are.na, etc.).
-- access_token is stored as plaintext here; add Supabase Vault encryption
-- (supabase.vault.create_secret) before going to production with real user data.

create table if not exists integrations (
  id            uuid        primary key default uuid_generate_v4(),
  user_id       uuid        not null references profiles(id) on delete cascade,
  platform      text        not null check (platform in ('pinterest','arena','dribbble','savee','cosmosso')),
  access_token  text        not null,
  refresh_token text,
  expires_at    timestamptz,
  scope         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, platform)
);

alter table integrations enable row level security;

create policy "integrations: owner select" on integrations
  for select using (auth.uid() = user_id);

create policy "integrations: owner insert" on integrations
  for insert with check (auth.uid() = user_id);

create policy "integrations: owner update" on integrations
  for update using (auth.uid() = user_id);

create policy "integrations: owner delete" on integrations
  for delete using (auth.uid() = user_id);

create trigger integrations_updated_at
  before update on integrations
  for each row execute function update_updated_at();
