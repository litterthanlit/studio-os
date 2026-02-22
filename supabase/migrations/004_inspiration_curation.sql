-- ─── Curated Inspiration Feature ───────────────────────────────────────────────
-- Image analysis pipeline with GPT-4 Vision scoring and user curation

-- ─── Tables ────────────────────────────────────────────────────────────────────

-- Image scores from GPT-4 Vision API analysis
create table inspiration_images (
  id              uuid        primary key default uuid_generate_v4(),
  source          text        not null check (source in ('lummi','arena','upload')),
  source_id       text        not null, -- original ID from source
  image_url       text        not null,
  thumbnail_url   text,
  title           text,
  
  -- GPT-4 Vision scores (0-100)
  score_composition   integer not null check (score_composition between 0 and 100),
  score_color         integer not null check (score_color between 0 and 100),
  score_mood          integer not null check (score_mood between 0 and 100),
  score_uniqueness    integer not null check (score_uniqueness between 0 and 100),
  score_overall       integer not null check (score_overall between 0 and 100),
  
  -- Analysis metadata
  gpt_analysis      jsonb, -- full GPT-4 Vision response
  tags              text[]  not null default '{}',
  colors            text[]  not null default '{}',
  mood              text,
  style             text,
  
  -- Curation status
  curation_status   text    default 'pending' check (curation_status in ('pending','approved','rejected','featured')),
  reviewed_at       timestamptz,
  reviewed_by       uuid    references profiles(id),
  
  -- Display metadata
  display_count     integer not null default 0,
  last_displayed_at timestamptz,
  
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  
  unique(source, source_id)
);

-- User likes for inspiration images (improves future curation)
create table inspiration_likes (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         uuid        not null references profiles(id) on delete cascade,
  image_id        uuid        not null references inspiration_images(id) on delete cascade,
  liked_at        timestamptz not null default now(),
  
  -- Optional feedback
  feedback_tags   text[]      default '{}', -- why they liked it
  
  unique(user_id, image_id)
);

-- Daily inspiration cache (what was shown to users)
create table inspiration_daily (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         uuid        not null references profiles(id) on delete cascade,
  date            date        not null default current_date,
  image_ids       uuid[]      not null, -- array of inspiration_images.id
  collection      text, -- e.g., "Editorial", "Architecture"
  
  created_at      timestamptz not null default now(),
  
  unique(user_id, date)
);

-- ─── Indexes ───────────────────────────────────────────────────────────────────

create index idx_inspiration_images_score on inspiration_images(score_overall desc);
create index idx_inspiration_images_status on inspiration_images(curation_status);
create index idx_inspiration_images_source on inspiration_images(source, source_id);
create index idx_inspiration_images_tags on inspiration_images using gin(tags);
create index idx_inspiration_images_colors on inspiration_images using gin(colors);

create index idx_inspiration_likes_user on inspiration_likes(user_id);
create index idx_inspiration_likes_image on inspiration_likes(image_id);

create index idx_inspiration_daily_user_date on inspiration_daily(user_id, date);

-- ─── Row Level Security ────────────────────────────────────────────────────────

alter table inspiration_images  enable row level security;
alter table inspiration_likes   enable row level security;
alter table inspiration_daily   enable row level security;

-- inspiration_images: readable by all authenticated users, writable by system only
-- We'll use a service role key for writes, but allow reads

create policy "inspiration_images: authenticated read" on inspiration_images
  for select to authenticated using (true);

create policy "inspiration_images: admin insert" on inspiration_images
  for insert with check (true); -- service role bypasses RLS

create policy "inspiration_images: admin update" on inspiration_images
  for update using (true);

-- inspiration_likes: users can only see/modify their own likes
create policy "inspiration_likes: owner select" on inspiration_likes
  for select using (auth.uid() = user_id);

create policy "inspiration_likes: owner insert" on inspiration_likes
  for insert with check (auth.uid() = user_id);

create policy "inspiration_likes: owner delete" on inspiration_likes
  for delete using (auth.uid() = user_id);

-- inspiration_daily: users can only see their own daily curation
create policy "inspiration_daily: owner select" on inspiration_daily
  for select using (auth.uid() = user_id);

create policy "inspiration_daily: owner insert" on inspiration_daily
  for insert with check (auth.uid() = user_id);

-- ─── Functions ─────────────────────────────────────────────────────────────────

-- Get curated images for a user (score >= 75, approved or pending)
create or replace function get_curated_inspiration(
  p_user_id uuid,
  p_limit integer default 9,
  p_min_score integer default 75
)
returns setof inspiration_images
language sql
stable
security definer
as $$
  select i.*
  from inspiration_images i
  where i.score_overall >= p_min_score
    and i.curation_status in ('approved', 'pending')
    -- Exclude recently shown images
    and not exists (
      select 1 from inspiration_daily d
      where d.user_id = p_user_id
        and d.date >= current_date - interval '7 days'
        and i.id = any(d.image_ids)
    )
  order by 
    -- Boost images similar to ones the user liked
    case when exists (
      select 1 from inspiration_likes l
      where l.user_id = p_user_id
        and l.image_id in (
          select id from inspiration_images 
          where tags && i.tags or colors && i.colors
        )
    ) then 1 else 0 end desc,
    i.score_overall desc,
    random()
  limit p_limit;
$$;

-- Record daily inspiration shown to user
create or replace function record_daily_inspiration(
  p_user_id uuid,
  p_image_ids uuid[],
  p_collection text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into inspiration_daily (user_id, date, image_ids, collection)
  values (p_user_id, current_date, p_image_ids, p_collection)
  on conflict (user_id, date) do update
    set image_ids = p_image_ids,
        collection = p_collection,
        updated_at = now()
  returning id into v_id;
  
  -- Update display counts
  update inspiration_images
  set display_count = display_count + 1,
      last_displayed_at = now()
  where id = any(p_image_ids);
  
  return v_id;
end;
$$;

-- Auto-update updated_at timestamp
create trigger inspiration_images_updated_at
  before update on inspiration_images
  for each row execute function update_updated_at();

-- ─── Comments ──────────────────────────────────────────────────────────────────

comment on table inspiration_images is 'Images scored by GPT-4 Vision API for curation';
comment on table inspiration_likes is 'User likes to improve future curation recommendations';
comment on table inspiration_daily is 'Daily inspiration cache per user';
