-- Track 10 Phase B: one-click publish — store static HTML for public /published/:id

create table if not exists published_exports (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  html text not null,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  constraint published_exports_html_len check (char_length(html) <= 2097152)
);

create index if not exists idx_published_exports_user on published_exports (user_id);
create index if not exists idx_published_exports_created on published_exports (created_at desc);

alter table published_exports enable row level security;

-- Insert: authenticated user only, own row
create policy "published_exports_insert_own"
  on published_exports
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Public read for active shares (anon + authenticated)
create policy "published_exports_select_active"
  on published_exports
  for select
  using (is_active = true);

-- Owner can soft-delete / update
create policy "published_exports_update_own"
  on published_exports
  for update
  to authenticated
  using (auth.uid() = user_id);
