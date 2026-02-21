-- ─── Semantic similarity search ───────────────────────────────────────────────
-- Called via supabase.rpc('match_references', { ... })
-- Filters by the calling user's auth.uid() automatically.
-- filter_project_id: when provided, scopes results to that project room.

create or replace function match_references(
  query_embedding   vector(1536),
  match_threshold   float   default 0.5,
  match_count       int     default 20,
  filter_project_id uuid    default null
)
returns table (
  id            uuid,
  image_url     text,
  thumbnail_url text,
  title         text,
  board_id      text,
  tags          text[],
  mood          text,
  style         text,
  content_type  text,
  similarity    float
)
language sql stable
as $$
  select
    r.id,
    r.image_url,
    r.thumbnail_url,
    r.title,
    r.board_id,
    r.tags,
    r.mood,
    r.style,
    r.content_type,
    1 - (r.embedding <=> query_embedding) as similarity
  from   "references" r
  where  r.user_id   = auth.uid()
    and  r.embedding is not null
    and  1 - (r.embedding <=> query_embedding) > match_threshold
    and  (filter_project_id is null or r.project_id = filter_project_id)
  order  by r.embedding <=> query_embedding
  limit  match_count;
$$;

-- ─── IVFFLAT index for fast ANN search once the table grows ───────────────────
-- Only create after you have >1000 rows; remove the IF NOT EXISTS guard and
-- run manually once you reach that threshold.
-- create index if not exists references_embedding_idx
--   on references using ivfflat (embedding vector_cosine_ops)
--   with (lists = 100);
