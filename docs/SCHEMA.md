## 3. Database Schema

All data lives in two tables in Supabase. The schema is the single contract between every component. Column names are locked — the Worker, the Pages Functions, and the frontend all reference them directly. **Do not change column names without updating all consumers.**

The key addition over the v1 schema is the `image_url` column on the `events` table, which powers Google Carousel eligibility and OpenGraph social sharing previews.

### 3.1 SQL — Run This Exactly in Supabase SQL Editor

```sql
-- Sources table: one row per partner organization
CREATE TABLE sources (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  feed_url             TEXT NOT NULL,
  source_type          TEXT NOT NULL CHECK (source_type IN ('ical', 'rss')),
  color                TEXT NOT NULL DEFAULT '#003399',
  logo_url             TEXT,
  poll_interval        INTEGER NOT NULL DEFAULT 30,
  active               BOOLEAN NOT NULL DEFAULT true,
  last_synced_at       TIMESTAMPTZ,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events table: normalized events from all sources
CREATE TABLE events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  start_datetime    TIMESTAMPTZ NOT NULL,
  end_datetime      TIMESTAMPTZ,
  all_day           BOOLEAN NOT NULL DEFAULT false,
  location          TEXT,
  description       TEXT,
  image_url         TEXT,  -- Extracted from feed. Powers Google Carousel & og:image.
  url               TEXT,
  source_id         UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  source_name       TEXT NOT NULL,
  categories        TEXT[] NOT NULL DEFAULT '{}',
  raw_uid           TEXT,
  fingerprint       TEXT NOT NULL,
  expired           BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fingerprint)
);

-- Indexes for frontend query performance
CREATE INDEX events_start_datetime_idx ON events(start_datetime);
CREATE INDEX events_source_id_idx ON events(source_id);
CREATE INDEX events_expired_idx ON events(expired);

-- Row Level Security: public read, no public write
ALTER TABLE events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read events"  ON events  FOR SELECT USING (true);
CREATE POLICY "Public can read sources" ON sources FOR SELECT USING (true);
-- Worker and Pages Functions use service role key, which bypasses RLS
```

### 3.2 Sources Table — Column Reference

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID (PK) | Primary key, auto-generated. |
| `name` | TEXT NOT NULL | Display name shown on calendar (e.g., "Riverdale Garden Club"). |
| `feed_url` | TEXT NOT NULL | The URL to poll. Paste the partner's calendar link here. |
| `source_type` | TEXT CHECK ('ical','rss') | Routes to the correct parser. `ical` for `.ics` URLs, `rss` for everything else. |
| `color` | TEXT DEFAULT #003399 | Hex color for calendar display. Each partner gets a unique color. |
| `logo_url` | TEXT (nullable) | Org logo. Also used as `image_url` fallback when no image is found in the feed. |
| `poll_interval` | INTEGER DEFAULT 30 | Minutes between syncs. 30 is the standard value. |
| `active` | BOOLEAN DEFAULT true | Set `false` to instantly hide an org from the calendar without deleting data. |
| `last_synced_at` | TIMESTAMPTZ (nullable) | Timestamp of last successful ingest. Used for monitoring. |
| `consecutive_failures` | INTEGER DEFAULT 0 | Increments on each failed fetch. Triggers coordinator alert at 3+. |

### 3.3 Events Table — Column Reference

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID (PK) | Auto-generated primary key. Used in the event URL: `/event/{id}`. |
| `title` | TEXT NOT NULL | Event name. Plain text — all HTML stripped at ingest. |
| `start_datetime` | TIMESTAMPTZ NOT NULL | Always stored in UTC. Displayed in `America/Chicago` on frontend. |
| `end_datetime` | TIMESTAMPTZ (nullable) | Null for all-day or unknown-end events. Defaults to start + 1 hr. |
| `all_day` | BOOLEAN DEFAULT false | True when iCal DTSTART is DATE type (no time component). |
| `location` | TEXT (nullable) | Venue name and address if available in source feed. |
| `description` | TEXT (nullable) | Plain text, max 1000 characters. HTML stripped at ingest. |
| `image_url` | TEXT (nullable) | **New.** Extracted from feed before HTML stripping. Powers Google Carousel and `og:image`. Falls back to `sources.logo_url`. |
| `url` | TEXT (nullable) | Link back to original event page on partner or GrowthZone website. |
| `source_id` | UUID FK → sources | Foreign key. CASCADE delete: removing a source removes its events. |
| `source_name` | TEXT NOT NULL | Denormalized org name for fast frontend queries without a JOIN. |
| `categories` | TEXT[] DEFAULT {} | Auto-tagged from keyword map: fundraiser, meeting, arts, sports, etc. |
| `raw_uid` | TEXT (nullable) | Original UID from iCal feed. Used for within-source deduplication. |
| `fingerprint` | TEXT UNIQUE NOT NULL | SHA-256 of `title+date+source_id`. The deduplication key. |
| `expired` | BOOLEAN DEFAULT false | Set `true` when event not seen in 2+ sync cycles. Hidden from frontend. |
| `created_at` | TIMESTAMPTZ DEFAULT now() | When first ingested. |
| `updated_at` | TIMESTAMPTZ DEFAULT now() | Updated every sync cycle. Used to detect stale events. |

### 3.4 Row Level Security Summary

| Role | Operation | Result |
|---|---|---|
| Public (anon key) | SELECT on events | ✅ Allowed |
| Public (anon key) | SELECT on sources | ✅ Allowed |
| Public (anon key) | INSERT / UPDATE / DELETE | ❌ Blocked (403) |
| Worker / Pages Function (service key) | All operations | ✅ Allowed — bypasses RLS |

---
