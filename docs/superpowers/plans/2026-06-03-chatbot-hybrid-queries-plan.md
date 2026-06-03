# Chatbot Hybrid Queries Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a robust three-category query routing architecture (Structured, Semantic, Hybrid) for the RAFV community calendar chatbot.

**Architecture:** REDESIGN the Cloudflare Worker's AI query planner to output structured intent JSON containing dates and categories. Implement a unified database RPC function `search_calendar_events` in Supabase to handle the actual SQL filtering and vector similarity matching in a single database execution.

**Tech Stack:** TypeScript, Cloudflare Workers, PostgreSQL, Supabase (pgvector), Cloudflare Workers AI

---

### Task 1: Database Migration for Advanced Search RPC

**Files:**
- Create: `docs/migrations/20260603_search_calendar_events.sql`

- [ ] **Step 1: Create the SQL migration file**
  Create the database migration file containing the declaration for the SQL function `search_calendar_events`.

  Code content for `docs/migrations/20260603_search_calendar_events.sql`:
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
      -- Category Filter
      AND (filter_category IS NULL OR filter_category = ANY(e.categories))
      -- Time of Day Filter
      AND (filter_after_time IS NULL OR (e.start_datetime::time) >= filter_after_time)
      -- Embedding Match Filter (only if embedding is provided)
      AND (query_embedding IS NULL OR (e.embedding <=> query_embedding < 1 - match_threshold))
    ORDER BY 
      CASE WHEN query_embedding IS NOT NULL THEN (e.embedding <=> query_embedding) ELSE 0 END,
      e.start_datetime ASC
    LIMIT match_count;
  END;
  $$;
  ```

- [ ] **Step 2: Commit Task 1**
  ```bash
  git add docs/migrations/20260603_search_calendar_events.sql
  git commit -m "db: add search_calendar_events migration file"
  ```

---

### Task 2: Worker Query Planner & Routing Update

**Files:**
- Modify: `worker/src/index.ts`

- [ ] **Step 1: Update type definitions and query planner logic**
  Update the `SearchPlan` interface and LLM prompt logic inside `worker/src/index.ts` starting from line 190.
  
  Replace the interface `SearchPlan` and LLM prompt block with:
  ```typescript
  interface SearchPlan {
    query_type: 'structured' | 'semantic' | 'hybrid';
    time_filter: {
      type: 'relative' | 'absolute' | 'none';
      start: string | null;
      end: string | null;
    };
    constraints: {
      category: string | null;
      after_time: string | null;
    };
    semantic_query: string | null;
  }
  ```

  Inject the local date computation and write the system prompt to instruct `@cf/meta/llama-3.1-8b-instruct`. Compute local ISO date context:
  ```typescript
  const now = new Date();
  // Format local date context for Chicago timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const localDateStr = formatter.format(now);
  ```

- [ ] **Step 2: Implement search routing using the search_calendar_events RPC**
  Modify the event context fetching inside `worker/src/index.ts` (lines 280-370) to invoke `search_calendar_events` RPC.
  
  Implementation details:
  - If `query_type` is `semantic` or `hybrid`, call the AI embeddings model `@cf/baai/bge-small-en-v1.5` to generate the query embedding.
  - Call the RPC `/rest/v1/rpc/search_calendar_events` with the calculated query parameters:
    ```json
    {
      "query_embedding": queryEmbedding,
      "match_threshold": 0.5,
      "match_count": 10,
      "filter_start": plan.time_filter.start,
      "filter_end": plan.time_filter.end,
      "filter_category": plan.constraints.category,
      "filter_after_time": plan.constraints.after_time ? `${plan.constraints.after_time}:00` : null
    }
    ```

- [ ] **Step 3: Commit Task 2**
  ```bash
  git add worker/src/index.ts
  git commit -m "feat: implement chatbot hybrid query planner and RPC routing"
  ```

---

### Task 3: Verification & Integration Testing

- [ ] **Step 1: Test Category 1 (Structured Query)**
  Verify "What events are coming up this weekend?" yields structured query planning and accurate chronological SQL results.

- [ ] **Step 2: Test Category 2 (Semantic Query)**
  Verify "ethics and contract rules" returns semantic-only matching results using the vector search.

- [ ] **Step 3: Test Category 3 (Hybrid Query)**
  Verify "networking events this month" successfully generates an embedding and returns events filtered by date range.
