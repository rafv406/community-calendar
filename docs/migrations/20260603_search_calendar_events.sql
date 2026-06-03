CREATE OR REPLACE FUNCTION search_calendar_events (
  query_embedding vector(384) DEFAULT NULL,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20,
  filter_start timestamptz DEFAULT NULL,
  filter_end timestamptz DEFAULT NULL,
  filter_category text DEFAULT NULL,
  filter_after_time time DEFAULT NULL
)
RETURNS SETOF events
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT e.*
  FROM events e
  WHERE e.expired = false
    -- Ensure event is in the future
    AND COALESCE(e.end_datetime, e.start_datetime) >= NOW()
    -- Date Range Filter
    AND (filter_start IS NULL OR e.start_datetime >= filter_start)
    AND (filter_end IS NULL OR e.start_datetime <= filter_end)
    -- Category Filter
    AND (filter_category IS NULL OR filter_category = ANY(e.categories))
    -- Time of Day Filter
    AND (filter_after_time IS NULL OR (e.start_datetime::time) >= filter_after_time)
    -- Embedding Match Filter (only if embedding is provided)
    AND (query_embedding IS NULL OR (e.embedding <=> query_embedding < 1 - match_threshold))
  ORDER BY e.start_datetime ASC
  LIMIT match_count;
END;
$$;
