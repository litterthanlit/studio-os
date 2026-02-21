-- ─── Extensions ──────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";
create extension if not exists vector;           -- for reference embeddings

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table profiles (
  id              uuid        primary key references auth.users on delete cascade,
  name            text,
  email           text,
  avatar_url      text,
  onboarding_complete boolean  not null default false,
  created_at      timestamptz not null default now()
);

create table projects (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references profiles(id) on delete cascade,
  name        text        not null,
  slug        text        not null,
  brief       text,
  color       text        not null default '#0070F3',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, slug)
);

create table boards (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references profiles(id) on delete cascade,
  project_id  uuid        references projects(id) on delete set null,
  name        text        not null,
  type        text        not null check (type in ('all','brand','typography','color','layout','custom')),
  created_at  timestamptz not null default now()
);

create table "references" (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         uuid        not null references profiles(id) on delete cascade,
  project_id      uuid        references projects(id) on delete set null,
  board_id        text,
  image_url       text        not null,
  thumbnail_url   text,
  title           text,
  source          text        not null check (source in ('arena','pinterest','cosmosso','savee','dribbble','upload','extension')),
  tags            text[]      not null default '{}',
  colors          text[]      not null default '{}',
  mood            text,
  style           text,
  content_type    text,
  curation_status text        check (curation_status in ('flag','reject')),
  embedding       vector(1536),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table profiles   enable row level security;
alter table projects   enable row level security;
alter table boards     enable row level security;
alter table "references" enable row level security;

-- profiles
create policy "profiles: owner select" on profiles
  for select using (auth.uid() = id);

create policy "profiles: owner insert" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles: owner update" on profiles
  for update using (auth.uid() = id);

-- projects
create policy "projects: owner select" on projects
  for select using (auth.uid() = user_id);

create policy "projects: owner insert" on projects
  for insert with check (auth.uid() = user_id);

create policy "projects: owner update" on projects
  for update using (auth.uid() = user_id);

create policy "projects: owner delete" on projects
  for delete using (auth.uid() = user_id);

-- boards
create policy "boards: owner select" on boards
  for select using (auth.uid() = user_id);

create policy "boards: owner insert" on boards
  for insert with check (auth.uid() = user_id);

create policy "boards: owner update" on boards
  for update using (auth.uid() = user_id);

create policy "boards: owner delete" on boards
  for delete using (auth.uid() = user_id);

-- references
create policy "references: owner select" on "references"
  for select using (auth.uid() = user_id);

create policy "references: owner insert" on "references"
  for insert with check (auth.uid() = user_id);

create policy "references: owner update" on "references"
  for update using (auth.uid() = user_id);

create policy "references: owner delete" on "references"
  for delete using (auth.uid() = user_id);

-- ─── Functions & Triggers ─────────────────────────────────────────────────────

-- Auto-create a profile row when a new auth user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

create trigger references_updated_at
  before update on "references"
  for each row execute function update_updated_at();
