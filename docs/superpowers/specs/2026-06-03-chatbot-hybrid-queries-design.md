# Design Spec: Chatbot Intent Classification and Hybrid Queries

**Author:** AI Coding Assistant
**Date:** 2026-06-03
**Status:** Draft

---

## 1. Overview & Goals

The Realtors Association of the Fox Valley (RAFV) community calendar chatbot currently uses a basic query planner that struggles to reliably determine user intent and route queries. 

This spec introduces a robust, three-category query routing architecture:
1. **Category 1 (Structured Queries)**: Queries with explicit filters (dates, times, categories) but no semantic topic (e.g. "What events are coming up this weekend?"). These bypass embeddings and query the database directly using SQL constraints.
2. **Category 2 (Semantic Queries)**: Queries seeking semantic topics (e.g. "ethics", "contracts") without date filters. These generate embeddings and query the database via vector similarity.
3. **Category 3 (Hybrid Queries)**: Queries combining both structured constraints and semantic topics (e.g. "Show networking events this month"). These generate embeddings and apply SQL filters inside the database.

---

## 2. Technical Architecture

### 2.1 LLM Query Planner & JSON Schema

We will use Cloudflare Workers AI with the model `@cf/meta/llama-3.1-8b-instruct`. The system prompt instructs the model to classify the user's intent and output a strict JSON payload.

#### Schema Definition:
```json
{
  "query_type": "structured" | "semantic" | "hybrid",
  "time_filter": {
    "type": "relative" | "absolute" | "none",
    "start": "YYYY-MM-DDT00:00:00.000Z" or null,
    "end": "YYYY-MM-DDT23:59:59.999Z" or null
  },
  "constraints": {
    "category": "fundraiser" | "meeting" | "workshop" | "family" | "arts" | "sports" | "community" | "environment" | "professional" | "social" | null,
    "after_time": "HH:MM" or null
  },
  "semantic_query": string or null
}
```

To resolve relative dates like "this weekend" or "next Thursday", the worker will calculate the current local date/time and dynamically inject it into the prompt:
*"Today is Wednesday, June 3, 2026 (Day of week: Wednesday)"*.

---

### 2.2 Database Layer: Advanced RPC Search Function

Rather than writing fragmented query logic in JavaScript/TypeScript, we will define a single, optimized SQL function in PostgreSQL to handle all query types.

#### SQL Migration (`docs/add_advanced_search_rpc.sql`):
```sql
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
    -- Date Range Filter
    AND (filter_start IS NULL OR e.start_datetime >= filter_start)
    AND (filter_end IS NULL OR e.start_datetime <= filter_end)
    -- Category Filter (matching inside categories array)
    AND (filter_category IS NULL OR filter_category = ANY(e.categories))
    -- Time of Day Filter
    AND (filter_after_time IS NULL OR (e.start_datetime::time) >= filter_after_time)
    -- Embedding Match Filter
    AND (query_embedding IS NULL OR (e.embedding <=> query_embedding < 1 - match_threshold))
  ORDER BY 
    CASE WHEN query_embedding IS NOT NULL THEN (e.embedding <=> query_embedding) ELSE 0 END,
    e.start_datetime ASC
  LIMIT match_count;
END;
$$;
```

---

### 2.3 Routing Logic in Cloudflare Worker (`worker/src/index.ts`)

1. **Calculate Context**: Get today's local date and day-of-week. Inject into the system prompt.
2. **Execute LLM Planner**: Parse output JSON structure.
3. **Execute Search**:
   * If `query_type` is `structured` (Category 1):
     Call `/rpc/search_calendar_events` passing `filter_start`, `filter_end`, `filter_category`, and `filter_after_time`. Pass `query_embedding` as `null`.
   * If `query_type` is `semantic` (Category 2):
     Generate query embedding. Call `/rpc/search_calendar_events` passing `query_embedding`.
   * If `query_type` is `hybrid` (Category 3):
     Generate query embedding. Call `/rpc/search_calendar_events` passing both `query_embedding` and the structured filters (`filter_start`, `filter_end`, etc.).
4. **LLM Response Generation**: Run the standard streaming response generator using the retrieved events context.

---

## 3. Verification Plan

### Automated Tests
- Test cases validating the LLM's classification logic across various inputs:
  - `"What events are happening tomorrow?"` -> `structured` with correct date start/end.
  - `"Ethics and contract rules"` -> `semantic` with correct keyword.
  - `"Networking sessions after 5pm next week"` -> `hybrid` with correct date ranges and `after_time = 17:00`.
- SQL tests to verify the `search_calendar_events` function returns correct results under multiple filters.

### Manual Verification
- Querying the chatbot directly via the UI frontend chat interface with Category 1, 2, and 3 example queries and verifying accurate, filtered results.
