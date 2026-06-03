import { NormalizedEvent } from './types';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  AI: any;
}

export async function upsertEvents(events: NormalizedEvent[], env: Env) {
  if (events.length === 0) return 0;
  
  const now = new Date().toISOString();
  const eventsWithTimestamp = events.map(ev => ({
    ...ev,
    updated_at: now,
    expired: false
  }));

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
    body: JSON.stringify(eventsWithTimestamp)
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Supabase Upsert failed for ${events.length} events:`, errorText);
    throw new Error(`Supabase Upsert failed: ${errorText}`);
  }
  return events.length;
}

export async function updateSourceStatus(
  sourceId: string, 
  status: { last_synced_at?: string, consecutive_failures: number, last_error: string | null }, 
  env: Env
) {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/sources`);
  url.searchParams.set('id', `eq.${sourceId}`);

  const updateBody: any = {
    consecutive_failures: status.consecutive_failures,
    last_error: status.last_error
  };
  
  if (status.last_synced_at) {
    updateBody.last_synced_at = status.last_synced_at;
  }

  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(updateBody)
  });

  if (!res.ok) {
    console.error(`Failed to update source status for ${sourceId}:`, await res.text());
  }
}

export async function expireStaleEvents(sourceId: string, before: string, env: Env) {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/events`);
  url.searchParams.set('source_id', `eq.${sourceId}`);
  url.searchParams.set('expired', `eq.false`);
  url.searchParams.set('updated_at', `lt.${before}`);

  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ expired: true })
  });

  if (!res.ok) {
    console.error(`Failed to expire stale events for source ${sourceId}:`, await res.text());
  }
}
