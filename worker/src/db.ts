import { NormalizedEvent } from './types';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

export async function upsertEvents(events: NormalizedEvent[], env: Env) {
  if (events.length === 0) return 0;
  
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/events`, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(events)
  });
  
  if (!res.ok) {
    throw new Error(`Supabase Upsert failed: ${await res.text()}`);
  }
  return events.length;
}
