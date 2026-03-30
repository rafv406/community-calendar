import { NormalizedEvent } from './types';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

export async function upsertEvents(events: NormalizedEvent[], env: Env) {
  if (events.length === 0) return 0;
  
  // Use 'on_conflict' parameter to specify which column to check for duplicates.
  // This ensures that when a fingerprint exists, it updates the record instead of throwing a 23505 error.
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/events`);
  url.searchParams.set('on_conflict', 'fingerprint');

  const res = await fetch(url.toString(), {
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
    const errorText = await res.text();
    console.error(`Supabase Upsert failed for ${events.length} events:`, errorText);
    throw new Error(`Supabase Upsert failed: ${errorText}`);
  }
  return events.length;
}
