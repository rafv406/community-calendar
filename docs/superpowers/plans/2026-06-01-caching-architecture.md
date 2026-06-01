# Multi-Layered Caching Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement browser sessionStorage caching and Cloudflare Workers Edge Cache proxy to shield Supabase from query overhead.

**Architecture:** Create a `GET /events` route in Cloudflare Worker (`worker/src/index.ts`) caching using the Cache API. Update `useSupabaseEvents.ts` to check `sessionStorage` first, fetch from Worker if configured, and fall back to querying Supabase directly.

**Tech Stack:** Cloudflare Workers, TypeScript, React

---

### Task 1: Create Edge Caching Endpoint in Cloudflare Worker

**Files:**
- Modify: `worker/src/index.ts`

- [ ] **Step 1: Implement `/events` router and cache logic**

Modify `worker/src/index.ts` to check if `url.pathname === '/events'`. If it is, perform Cache Lookup. If missed, fetch events and sources from Supabase in parallel using native `fetch` and cache the combined JSON response.

Here is the exact code block to add:
```typescript
    if (url.pathname === '/events') {
      const cache = caches.default;
      const cacheKey = new Request(request.url, {
        method: 'GET',
        headers: {
          'Origin': request.headers.get('Origin') || '*'
        }
      });
      
      let response = await cache.match(cacheKey);
      if (response) {
        // Return cached response with CORS headers
        const newHeaders = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
        return new Response(response.body, {
          status: 200,
          headers: newHeaders
        });
      }

      console.log('Cache miss: Fetching events and sources from Supabase...');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [eventsRes, sourcesRes] = await Promise.all([
        fetch(`${env.SUPABASE_URL}/rest/v1/events?expired=eq.false&start_datetime=gte.${today.toISOString()}&order=start_datetime.asc&limit=500`, {
          headers: {
            'apikey': env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
          }
        }),
        fetch(`${env.SUPABASE_URL}/rest/v1/sources?active=eq.true`, {
          headers: {
            'apikey': env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
          }
        })
      ]);

      if (!eventsRes.ok) throw new Error(`Events fetch failed: ${eventsRes.status}`);
      if (!sourcesRes.ok) throw new Error(`Sources fetch failed: ${sourcesRes.status}`);

      const [events, sources] = await Promise.all([eventsRes.json(), sourcesRes.json()]);
      
      const payload = JSON.stringify({ events, sources });
      response = new Response(payload, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600'
        }
      });

      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }
```

- [ ] **Step 2: Verify compiler in worker**
Run: `npm run build` or `npx tsc --noEmit` inside `worker` directory.
Expected: Build passes with zero errors.

- [ ] **Step 3: Commit**
```bash
git add "worker/src/index.ts"
git commit -m "feat: implement /events cached edge route in Cloudflare Worker"
```

---

### Task 2: Implement Browser SessionStorage and Worker Fetching in React App

**Files:**
- Modify: `Inspiration Folder/src/hooks/useSupabaseEvents.ts`

- [ ] **Step 1: Update useSupabaseEvents.ts to check sessionStorage and Worker API**

Modify `fetchData` inside `useSupabaseEvents.ts` to implement cache check and fetching from `import.meta.env.VITE_WORKER_API_URL` if defined.

Here is the exact code block to modify:
```typescript
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // 1. Check SessionStorage Cache
        const cacheKey = 'calendar_events_cache';
        const cacheExpiryKey = 'calendar_events_cache_expiry';
        const cachedData = sessionStorage.getItem(cacheKey);
        const cachedExpiry = sessionStorage.getItem(cacheExpiryKey);
        
        if (cachedData && cachedExpiry && Date.now() < Number(cachedExpiry)) {
          const parsed = JSON.parse(cachedData);
          setEvents(parsed.events);
          setSources(parsed.sources);
          setLoading(false);
          return;
        }

        // 2. Fetch Data (either from Worker proxy or direct from Supabase client)
        const workerApiUrl = import.meta.env.VITE_WORKER_API_URL;
        let eventsData: EventRecord[] = [];
        let sourcesData: SourceRecord[] = [];

        if (workerApiUrl) {
          const res = await fetch(`${workerApiUrl}/events`);
          if (!res.ok) throw new Error(`Worker API request failed: ${res.status}`);
          const parsed = await res.json();
          eventsData = parsed.events;
          sourcesData = parsed.sources;
        } else {
          // Direct Supabase Fallback
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const [eventsRes, sourcesRes] = await Promise.all([
            supabase
              .from('events')
              .select('*')
              .eq('expired', false)
              .gte('start_datetime', today.toISOString())
              .order('start_datetime', { ascending: true })
              .limit(500),
            supabase.from('sources').select('*').eq('active', true),
          ]);

          if (eventsRes.error) throw eventsRes.error;
          if (sourcesRes.error) throw sourcesRes.error;
          
          eventsData = eventsRes.data as EventRecord[];
          sourcesData = sourcesRes.data as SourceRecord[];
        }

        // 3. Update states and store to SessionStorage (10 minutes expiration)
        setEvents(eventsData);
        setSources(sourcesData);
        
        sessionStorage.setItem(cacheKey, JSON.stringify({ events: eventsData, sources: sourcesData }));
        sessionStorage.setItem(cacheExpiryKey, String(Date.now() + 10 * 60 * 1000));
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);
```

- [ ] **Step 2: Verify compiler in React app**
Run production build check `npm run build` inside `Inspiration Folder`.
Expected: Pass.

- [ ] **Step 3: Commit**
```bash
git add "Inspiration Folder/src/hooks/useSupabaseEvents.ts"
git commit -m "feat: implement client sessionStorage cache and worker api support in useSupabaseEvents"
```
