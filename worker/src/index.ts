import { Source, NormalizedEvent, SyncResult } from './types';
import { parseICalFeed } from './parsers/ical';
import { parseRssFeed } from './parsers/rss';
import { upsertEvents, updateSourceStatus, Env } from './db';

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
