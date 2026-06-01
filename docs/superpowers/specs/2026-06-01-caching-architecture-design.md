# Multi-Layered Caching Architecture Design

This specification details the technical plan to implement multi-layered caching (Client SessionStorage + Cloudflare Edge Cache Proxy) to maximize page speed and drastically protect the Supabase PostgreSQL database from concurrent queries.

## Proposed Changes

### Cloudflare Worker API Proxy

#### [MODIFY] [index.ts](file:///c:/Users/JacobBranscom/OneDrive%20-%20Realtors%20Association%20of%20the%20Fox%20Valley/Documents/Community%20Calendar/worker/src/index.ts)
- Add a new route `GET /events` (by parsing `url.pathname === '/events'`).
- The handler will check Cloudflare's Cache API (`caches.default.match(request)`).
- On Cache Miss:
  - Fetch active `sources` and upcoming non-expired `events` from Supabase REST API in parallel using native `fetch`.
  - Combine both data arrays into a single JSON object: `{ events: EventRecord[], sources: SourceRecord[] }`.
  - Save the consolidated response to the cache via `ctx.waitUntil(cache.put(cacheKey, response.clone()))` with a `Cache-Control: public, max-age=600` (10 minutes) header.
  - Return the response.

### React Application

#### [MODIFY] [useSupabaseEvents.ts](file:///c:/Users/JacobBranscom/OneDrive%20-%20Realtors%20Association%20of%20the%20Fox%20Valley/Documents/Community%20Calendar/Inspiration%20Folder/src/hooks/useSupabaseEvents.ts)
- On component mount, check `sessionStorage` for `calendar_events_cache` and `calendar_events_cache_timestamp`.
- If the cache is present and less than 10 minutes old, load the `events` and `sources` state from the cache instantly (0 network requests).
- If the cache is stale or missing:
  - Check if `import.meta.env.VITE_WORKER_API_URL` is configured.
  - If **Yes**, fetch from `${VITE_WORKER_API_URL}/events`.
  - If **No (or fallback fails)**, query the Supabase client directly.
  - Save the fetched result to `sessionStorage` with a fresh timestamp.

## Verification Plan

### Automated / Manual Tests
- Verify direct Worker endpoint access at `http://localhost:8787/events` (returns sources and events combined).
- Check the `Cache-Control` headers and cache performance.
- Verify page load time in the React app when reloading (subsequent page loads should be instantaneous with 0 server hits).
- Verify database query limits on Supabase are fully protected.
