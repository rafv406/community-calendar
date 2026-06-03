-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to events table
-- BGE-small uses 384 dimensions
ALTER TABLE events ADD COLUMN IF NOT EXISTS embedding vector(384);

-- 3. Create the match_events function for semantic search
CREATE OR REPLACE FUNCTION match_events (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS SETOF events
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM events
  WHERE expired = false
    AND COALESCE(end_datetime, start_datetime) >= NOW()
    AND embedding <=> query_embedding < 1 - match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
