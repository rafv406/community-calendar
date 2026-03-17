// worker/src/types.ts

export interface Source {
  id: string
  name: string
  feed_url: string
  source_type: 'ical' | 'rss'
  color: string
  logo_url: string | null
  poll_interval: number
  active: boolean
  last_synced_at: string | null
  consecutive_failures: number
}

// The contract between parsers and the database.
// Every parser must return NormalizedEvent[]. No exceptions.
export interface NormalizedEvent {
  title: string                  // Required. Plain text — no HTML.
  start_datetime: string         // Required. ISO 8601 UTC.
  end_datetime: string | null    // ISO 8601 UTC or null.
  all_day: boolean
  location: string | null        // Plain text or null.
  description: string | null     // Plain text, max 1000 chars, or null.
  image_url: string | null       // Extracted BEFORE HTML strip. Required for SEO carousel.
  url: string | null             // Original event URL or null.
  source_id: string              // UUID — foreign key to sources.
  source_name: string            // Denormalized for frontend query speed.
  categories: string[]           // Lowercase strings. Empty array if none.
  raw_uid: string | null         // Original UID from feed or null.
  fingerprint: string            // SHA-256 — see dedupe.ts.
}

export interface SyncResult {
  source_id: string
  source_name: string
  events_found: number
  events_upserted: number
  error: string | null
}
