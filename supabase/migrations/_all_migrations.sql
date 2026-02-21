-- Studio OS — Consolidated migrations
-- Run this in Supabase Dashboard → SQL Editor if CLI is not available
-- Order: 001 → 002 → 003 → shares

-- ═══════════════════════════════════════════════════════════════════════════════
-- 001_initial_schema.sql
-- ═══════════════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";
create extension if not exists vector;

create table if not exists profiles (
  id              uuid        primary key references auth.users on delete cascade,
  name            text,
  email           text,
  avatar_url      text,
  onboarding_complete boolean  not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists projects (
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

create table if not exists boards (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references profiles(id) on delete cascade,
  project_id  uuid        references projects(id) on delete set null,
  name        text        not null,
  type        text        not null check (type in ('all','brand','typography','color','layout','custom')),
  created_at  timestamptz not null default now()
);

create table if not exists "references" (
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

alter table profiles   enable row level security;
alter table projects   enable row level security;
alter table boards     enable row level security;
alter table "references" enable row level security;

drop policy if exists "profiles: owner select" on profiles;
drop policy if exists "profiles: owner insert" on profiles;
drop policy if exists "profiles: owner update" on profiles;
create policy "profiles: owner select" on profiles for select using (auth.uid() = id);
create policy "profiles: owner insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles: owner update" on profiles for update using (auth.uid() = id);

drop policy if exists "projects: owner select" on projects;
drop policy if exists "projects: owner insert" on projects;
drop policy if exists "projects: owner update" on projects;
drop policy if exists "projects: owner delete" on projects;
create policy "projects: owner select" on projects for select using (auth.uid() = user_id);
create policy "projects: owner insert" on projects for insert with check (auth.uid() = user_id);
create policy "projects: owner update" on projects for update using (auth.uid() = user_id);
create policy "projects: owner delete" on projects for delete using (auth.uid() = user_id);

drop policy if exists "boards: owner select" on boards;
drop policy if exists "boards: owner insert" on boards;
drop policy if exists "boards: owner update" on boards;
drop policy if exists "boards: owner delete" on boards;
create policy "boards: owner select" on boards for select using (auth.uid() = user_id);
create policy "boards: owner insert" on boards for insert with check (auth.uid() = user_id);
create policy "boards: owner update" on boards for update using (auth.uid() = user_id);
create policy "boards: owner delete" on boards for delete using (auth.uid() = user_id);

drop policy if exists "references: owner select" on "references";
drop policy if exists "references: owner insert" on "references";
drop policy if exists "references: owner update" on "references";
drop policy if exists "references: owner delete" on "references";
create policy "references: owner select" on "references" for select using (auth.uid() = user_id);
create policy "references: owner insert" on "references" for insert with check (auth.uid() = user_id);
create policy "references: owner update" on "references" for update using (auth.uid() = user_id);
create policy "references: owner delete" on "references" for delete using (auth.uid() = user_id);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create or replace function update_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at before update on projects for each row execute function update_updated_at();

drop trigger if exists references_updated_at on "references";
create trigger references_updated_at before update on "references" for each row execute function update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 002_match_references.sql
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function match_references(
  query_embedding   vector(1536),
  match_threshold   float   default 0.5,
  match_count       int     default 20,
  filter_project_id uuid    default null
)
returns table (
  id uuid, image_url text, thumbnail_url text, title text, board_id text,
  tags text[], mood text, style text, content_type text, similarity float
)
language sql stable as $$
  select r.id, r.image_url, r.thumbnail_url, r.title, r.board_id, r.tags, r.mood, r.style, r.content_type,
    1 - (r.embedding <=> query_embedding) as similarity
  from "references" r
  where r.user_id = auth.uid() and r.embedding is not null
    and 1 - (r.embedding <=> query_embedding) > match_threshold
    and (filter_project_id is null or r.project_id = filter_project_id)
  order by r.embedding <=> query_embedding limit match_count;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 003_integrations.sql
-- ═══════════════════════════════════════════════════════════════════════════════

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

drop policy if exists "integrations: owner select" on integrations;
drop policy if exists "integrations: owner insert" on integrations;
drop policy if exists "integrations: owner update" on integrations;
drop policy if exists "integrations: owner delete" on integrations;
create policy "integrations: owner select" on integrations for select using (auth.uid() = user_id);
create policy "integrations: owner insert" on integrations for insert with check (auth.uid() = user_id);
create policy "integrations: owner update" on integrations for update using (auth.uid() = user_id);
create policy "integrations: owner delete" on integrations for delete using (auth.uid() = user_id);

drop trigger if exists integrations_updated_at on integrations;
create trigger integrations_updated_at before update on integrations for each row execute function update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- shares.sql
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shares (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id    TEXT        UNIQUE NOT NULL,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  UUID        REFERENCES projects(id) ON DELETE CASCADE,
  project_name TEXT       NOT NULL DEFAULT 'Studio Moodboard',
  snapshot    JSONB       NOT NULL DEFAULT '[]',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shares_share_id_idx ON shares (share_id);
CREATE INDEX IF NOT EXISTS shares_user_id_idx ON shares (user_id);

ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active shares" ON shares;
CREATE POLICY "Anyone can view active shares" ON shares FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS "Authenticated users can create shares" ON shares;
CREATE POLICY "Authenticated users can create shares" ON shares FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can update their shares" ON shares;
CREATE POLICY "Owners can update their shares" ON shares FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can delete their shares" ON shares;
CREATE POLICY "Owners can delete their shares" ON shares FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
