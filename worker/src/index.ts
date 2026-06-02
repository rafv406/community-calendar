import { Source, NormalizedEvent, SyncResult } from './types';
import { parseICalFeed } from './parsers/ical';
import { parseRssFeed } from './parsers/rss';
import { upsertEvents, updateSourceStatus, expireStaleEvents, Env } from './db';
import { generateIcalFeed } from './ical-generator';

async function fetchSources(env: Env): Promise<Source[]> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/sources?active=eq.true`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
    }
  });
  if (!res.ok) throw new Error('Failed to fetch sources');
  return res.json();
}

async function syncSource(source: Source, env: Env): Promise<SyncResult> {
  let events: NormalizedEvent[] = [];
  let error: string | null = null;
  const syncStartTime = new Date().toISOString();

  try {
    if (source.source_type === 'ical') {
      events = await parseICalFeed(source);
    } else if (source.source_type === 'rss') {
      events = await parseRssFeed(source);
    }

    if (events.length > 0) {
      // Deduplicate within the same batch by fingerprint
      const uniqueEvents = Array.from(
        new Map(events.map(ev => [ev.fingerprint, ev])).values()
      );
      await upsertEvents(uniqueEvents, env);
      
      // Expire events that were NOT in this sync (using updated_at < syncStartTime)
      // We only do this if we actually found events in the feed to avoid 
      // accidentally wiping a source if the feed is temporarily empty.
      await expireStaleEvents(source.id, syncStartTime, env);
      
      events = uniqueEvents;
    }

    // Success: report success to source record
    await updateSourceStatus(source.id, {
      last_synced_at: new Date().toISOString(),
      consecutive_failures: 0,
      last_error: null
    }, env);
  } catch (err: any) {
    error = err.message || 'Unknown error during sync';

    // Failure: bump consecutive_failures and log error
    await updateSourceStatus(source.id, {
      consecutive_failures: (source.consecutive_failures || 0) + 1,
      last_error: error
    }, env);
  }

  return {
    source_id: source.id,
    source_name: source.name,
    events_found: events.length,
    events_upserted: events.length, // assuming all succeeded if no error in upsertEvents
    error
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil((async () => {
      console.log('Starting scheduled cron run...');
      try {
        const sources = await fetchSources(env);
        const promises = sources.map(source => syncSource(source, env));
        const results = await Promise.allSettled(promises);

        results.forEach(res => {
          if (res.status === 'fulfilled') {
            console.log(`Synced ${res.value.source_name}: ${res.value.events_upserted} events`);
            if (res.value.error) {
              console.error(`Error syncing ${res.value.source_name}: ${res.value.error}`);
            }
          } else {
            console.error('Promise rejected during sync', res.reason);
          }
        });
      } catch (err) {
        console.error('Core sync failure', err);
      }
    })());
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const sourceId = url.searchParams.get('source_id');

    ctx.waitUntil((async () => {
      // Just keep the background processing logic here for standard triggers
    })());

    try {
      if (url.pathname === '/feed.ics') {
        const cache = caches.default;
        const cacheKey = new Request(request.url, {
          method: 'GET',
          headers: {
            'Origin': request.headers.get('Origin') || '*'
          }
        });

        let response = await cache.match(cacheKey);
        if (response) {
          const newHeaders = new Headers(response.headers);
          Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
          return new Response(response.body, {
            status: 200,
            headers: newHeaders
          });
        }

        console.log('Cache miss: Fetching events for iCal feed from Supabase...');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);

        const eventsRes = await fetch(`${env.SUPABASE_URL}/rest/v1/events?expired=eq.false&start_datetime=gte.${startDate.toISOString()}&order=start_datetime.asc&limit=500`, {
          headers: {
            'apikey': env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
          }
        });

        if (!eventsRes.ok) throw new Error(`Events fetch failed for iCal: ${eventsRes.status}`);

        const events = (await eventsRes.json()) as any;
        console.log(`Generating iCal feed with ${events.length} events.`);
        const icalContent = generateIcalFeed(events);

        response = new Response(icalContent, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'inline; filename="community-calendar.ics"',
            'Cache-Control': 'public, max-age=1800'
          }
        });

        // Only cache if we actually have events, to avoid caching a broken/empty state
        if (events.length > 0) {
          ctx.waitUntil(cache.put(cacheKey, response.clone()));
        }
        return response;
      }

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

      if (sourceId) {
        console.log(`Starting targeted sync for source ${sourceId}...`);

        let debugLogs: string[] = [];
        const originalLog = console.log;
        const originalError = console.error;
        console.log = (...args) => { debugLogs.push(args.join(' ')); originalLog(...args); };
        console.error = (...args) => { debugLogs.push(`ERROR: ${args.join(' ')}`); originalError(...args); };

        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/sources?id=eq.${sourceId}`, {
          headers: {
            'apikey': env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
          }
        });
        if (!res.ok) throw new Error(`Supabase source fetch failed: ${res.status}`);
        const sources: any[] = await res.json();

        if (sources && sources.length > 0) {
          const result = await syncSource(sources[0] as Source, env);
          // Restore console
          console.log = originalLog;
          console.error = originalError;

          return new Response(JSON.stringify({ ...result, debug: debugLogs }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return new Response('Source not found', { status: 404, headers: corsHeaders });
      } else {
        // Trigger global sync
        const sources = await fetchSources(env);
        const results = await Promise.all(sources.map(source => syncSource(source, env)));
        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } catch (err: any) {
      console.error('Manual fetch sync failed:', err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
