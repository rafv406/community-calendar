import { Source, NormalizedEvent, SyncResult } from './types';
import { parseICalFeed } from './parsers/ical';
import { parseRssFeed } from './parsers/rss';
import { upsertEvents, Env } from './db';

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
      await upsertEvents(events, env);
    }
  } catch (err: any) {
    error = err.message;
  }
  
  return {
    source_id: source.id,
    source_name: source.name,
    events_found: events.length,
    events_upserted: events.length, // assuming all succeeded if no error in upsertEvents
    error
  };
}

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
    await this.scheduled({} as ScheduledEvent, env, ctx);
    return new Response('Sync triggered manually via fetch wrapper.', { status: 200 });
  }
};
