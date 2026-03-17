# REALTOR® Association of Fox Valley
# Community Event Calendar — Full Application Build Plan
### Unified Event Aggregation System · Architecture, Implementation & Deployment

---

| | |
|---|---|
| **Scope** | RAFV GrowthZone CRM + 6–15 Partner Organizations — Fox Valley Region, Illinois |
| **Budget** | $0/month — Free tiers only (Cloudflare + Supabase) |
| **Timeline** | 8 weeks to full production (4 phases × 2 weeks) |
| **Maintainer** | One vibe-code-proficient developer — no senior engineer required |
| **Prepared** | March 2026 |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Database Schema](#3-database-schema)
4. [Feed Ingestion](#4-feed-ingestion)
5. [Frontend Calendar & SEO](#5-frontend-calendar--seo)
6. [Hosting, DNS & Deployment](#6-hosting-dns--deployment)
7. [Repository Structure](#7-repository-structure)
8. [Implementation Phases](#8-implementation-phases)
9. [Partner Onboarding Workflow](#9-partner-onboarding-workflow)
10. [Known Edge Cases & Handling](#10-known-edge-cases--handling)
11. [Ongoing Maintenance](#11-ongoing-maintenance)
12. [Future Scalability & Migration](#12-future-scalability--migration)
13. [Acceptance Criteria](#13-acceptance-criteria)

---

## 1. Executive Summary

The RAFV Community Event Calendar is a lightweight, serverless web application that transforms `rafv.realtor` into the premier local search hub for Fox Valley events. It acts as a unified command center, automatically syncing internal RAFV events from the GrowthZone CRM alongside external events from 6–15 local community partner organizations — garden clubs, arts councils, civic groups, and more.

### The Core Value Loop

The entire system operates automatically. The Cloudflare Worker cron polls the RAFV GrowthZone iCal anchor feed and all partner feeds every 30 minutes. It extracts titles, dates, and **images**, normalizes the data, and stores it in Supabase. The public frontend displays a lightning-fast, fully branded calendar at `rafv.realtor/community-calendar`. Every event links back to the originating organization. Updates and cancellations sync automatically. No staff time required after setup.

### The SEO & Infrastructure Strategy — The WordPress Escape Plan

To achieve maximum SEO impact without being constrained by RAFV's legacy WordPress site, the application uses **Cloudflare as a Reverse Proxy** — referred to internally as the "Smart Concierge."

The calendar is deployed to Cloudflare Pages but served seamlessly at `rafv.realtor/community-calendar`:

- **To Google:** It looks like a high-performance subfolder of the main RAFV domain, sending 100% of SEO authority to `rafv.realtor`.
- **To the Developer:** It operates in a completely isolated "blank canvas" environment. Legacy WordPress CSS and plugins cannot touch or break the calendar's design.
- **To the Future:** This architecture is the foundation for a room-by-room migration off WordPress entirely — the Strangler Fig pattern.

> **Locked Decisions — Do Not Revisit**
> - **Ingestion:** Cloudflare Workers + Cron Triggers (TypeScript)
> - **Database:** Supabase (Postgres) with auto-generated REST API
> - **Frontend:** FullCalendar.js v6 with dedicated Event URLs for SEO
> - **SEO Injection:** Cloudflare Pages Functions (`HTMLRewriter`) for JSON-LD & OpenGraph
> - **Hosting:** Cloudflare Reverse Proxy routing on the `rafv.realtor` domain
> - **Anchor Feed:** RAFV GrowthZone CRM `CalendarFeed` integration
> - **Feeds:** RSS and iCal only — no scraping, no manual entry pipeline
> - **Cost:** $0/month on free tiers for this scale

---

## 2. System Architecture

The system uses a modern "Edge" architecture. Cloudflare sits in front of the RAFV domain, routing traffic intelligently — requests to `/community-calendar/*` go to the new app; everything else passes through to the legacy WordPress server. The two systems coexist on the same domain with zero interference.

### 2.1 Architecture Overview

| Layer | Description |
|---|---|
| **The Edge Proxy ("Traffic Cop")** | Cloudflare DNS intercepts all requests to `rafv.realtor`. Requests to `/community-calendar/*` are routed to the new Cloudflare Pages app. All other requests pass through unmodified to the legacy WordPress server. |
| **Ingestion Layer** | Cloudflare Worker cron runs every 30 minutes. Fetches the GrowthZone anchor feed + all partner feeds. Extracts images, normalizes data, generates deduplication fingerprints, and upserts to Supabase. |
| **Data Layer** | Supabase (hosted Postgres) stores all events and sources. Free 500MB tier. Auto-generates a REST API. Row Level Security enforces public read, no public write. |
| **Presentation & SEO Layer** | Cloudflare Pages hosts the UI. When a user or Google's crawler navigates to a specific event (`/community-calendar/event/{id}`), a **Cloudflare Pages Function** intercepts the request server-side, fetches event data from Supabase, and injects `<title>`, `<meta>` OpenGraph tags, and Schema.org `Event` JSON-LD before the page is delivered. |
| **Admin Interface** | Supabase Studio (free, web-based). The coordinator can view, edit, or delete events, add new partner sources, and toggle organizations on or off — without writing any code. |

### 2.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│           USER REQUEST: rafv.realtor                     │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│       THE "CONCIERGE" — Cloudflare DNS Proxy             │
│                                                          │
│  If path = /*                  ──► Legacy WordPress      │
│  If path = /community-calendar ──► New Pages App         │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│     PRESENTATION & SEO LAYER — Cloudflare Pages          │
│                                                          │
│  Pages Function: Injects <title>, og:image, JSON-LD      │
│  Frontend UI: FullCalendar.js v6 · Vanilla JS            │
│  Branding: Garamond · #003399 · #36C2FF · #F4F8FF        │
└──────────────────────────▲──────────────────────────────┘
                           │  read via Supabase REST API
┌──────────────────────────▼──────────────────────────────┐
│              DATA LAYER — Supabase (Postgres)            │
│                                                          │
│  events table (with image_url) · sources table           │
│  RLS policies · 500MB free · Supabase Studio admin       │
└──────────────────────────▲──────────────────────────────┘
                           │  writes via Cloudflare Worker
┌──────────────────────────▼──────────────────────────────┐
│           INGESTION LAYER — Cloudflare Worker            │
│                                                          │
│  Cron: */30 * * * *                                      │
│  GrowthZone Anchor Feed + Partner Feeds                  │
│  Parse → Extract Images → Normalize → Upsert             │
│  node-ical (iCal) · rss-parser (RSS)                     │
└──────────────────────────▲──────────────────────────────┘
                           │  polled every 30 min
┌──────────────────────────▼──────────────────────────────┐
│                    EVENT SOURCES                          │
│                                                          │
│  GrowthZone CRM (anchor) · iCal/ICS · RSS/Atom           │
│  Google Calendar · Outlook · WordPress · Squarespace     │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Data Flow

The complete lifecycle of an event, from publication to public display:

1. RAFV staff create an event in GrowthZone CRM as normal. Partner orgs publish events in their own calendar tools.
2. GrowthZone and partner tools update their public iCal/RSS feeds at their respective URLs.
3. The Cloudflare Worker cron fires every 30 minutes and fetches all active feed URLs.
4. Each event is parsed. Before stripping HTML, the Worker extracts the first `<img>` URL from the description or `ATTACH` property as `image_url`. Then title and description are cleaned (HTML stripped, entities decoded).
5. A SHA-256 fingerprint is generated from `title + date + source_id`. Events are upserted into Supabase using the fingerprint as the conflict key.
6. Events not seen in two consecutive sync cycles are marked `expired = true` and hidden from the frontend.
7. Users visiting `rafv.realtor/community-calendar` see the FullCalendar.js grid, color-coded by organization.
8. When a user or Google's bot requests `/community-calendar/event/{id}`, a Cloudflare Pages Function injects server-side `<title>`, OpenGraph `og:image`, and Schema.org JSON-LD — enabling Google Events Carousel indexing.

### 2.4 Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| DNS & Proxy | Cloudflare DNS (Proxy mode) | Routes `/community-calendar/*` to Pages app; all else to WordPress. |
| Worker runtime | Cloudflare Workers | Free: 100k req/day. Cron triggers built-in. TypeScript native. |
| Scheduler | Cloudflare Cron Triggers | Fires Worker every 30 minutes. `*/30 * * * *` |
| iCal parser | `node-ical` (npm) | Handles VEVENT, RRULE recurrence, ATTACH property, timezone conversion. |
| RSS parser | `rss-parser` (npm) | Handles RSS 2.0, Atom, `<enclosure>` image tags, malformed feeds. |
| Database | Supabase (Postgres) | Free: 500MB, auto REST API, web admin UI, Row Level Security. |
| DB client | Supabase REST API via `fetch` | No SDK in worker — raw `fetch()` only for Workers compatibility. |
| SEO injection | Cloudflare Pages Functions | Server-side TypeScript. `HTMLRewriter` injects meta tags per event URL. |
| Frontend calendar | FullCalendar.js v6 | Open source (MIT). Month/week/list views, filtering, mobile responsive. |
| Frontend hosting | Cloudflare Pages | Free. Serves the app at the `rafv.realtor/community-calendar` route. |
| Local dev | Wrangler CLI v3+ | Cloudflare's official local dev and deploy tool. |
| Language | TypeScript (strict) | All Worker and Pages Function code. Strict mode enforced. |
| Date handling | `luxon` (npm) | Timezone conversion for iCal DTSTART with TZID. UTC normalization. |
| Hashing | Web Crypto API | SHA-256 fingerprints via `crypto.subtle`. Native in Workers. |

---

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

## 4. Feed Ingestion

### 4.1 The Anchor Feed — GrowthZone CRM

**Source #1 in the database is permanently the RAFV GrowthZone integration.** This is seeded first via `scripts/seed-sources.ts` and is never removed.

```
Feed URL:    https://realtorassociationofthefoxvalleyrafv.growthzoneapp.com/ap/CalendarFeed/1309
source_type: ical
color:       #003399
name:        RAFV Events
```

This allows RAFV staff to continue their existing CRM workflow without any changes. Events created in GrowthZone automatically appear on the public calendar within 30 minutes, complete with any images attached in GrowthZone.

### 4.2 Polling Schedule

| Feed Type | Schedule & Rationale |
|---|---|
| GrowthZone Anchor (iCal) | Every 30 minutes. The primary feed. Treated as standard iCal — no special handling required beyond standard error handling. |
| Partner iCal / ICS feeds | Every 30 minutes. Lightweight HTTP GET + parse. Handles Google Calendar, Apple Calendar, Outlook ICS exports, and most event platforms. |
| Partner RSS / Atom feeds | Every 30 minutes. Handles WordPress event plugins and most CMS event feeds. |
| Manual entry (Google Form) | Every 15 minutes. Near-real-time fallback for partners without a public feed. Optional, Phase 2+. |

### 4.3 TypeScript Interfaces

Defined in `worker/src/types.ts`. Import from here everywhere — never redefine inline.

```typescript
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
```

### 4.4 Normalization & Image Extraction Rules

**Critical order of operations:** Image extraction must happen on the raw HTML content *before* the HTML stripping step. Once HTML is stripped, `<img>` tags are gone.

| Field | Rule |
|---|---|
| `image_url` | **Step 1 — iCal `ATTACH`:** Check the VEVENT `ATTACH` property for an image URL. **Step 2 — HTML `<img>` tag:** Run a regex over the raw HTML description to find the first `<img src="...">`. Extract the `src` value. **Step 3 — RSS `<enclosure>`:** For RSS feeds, check for `<enclosure type="image/*" url="...">`. **Fallback:** If all three are empty, set `image_url = source.logo_url`. If that is also null, set `null`. |
| `title` | Strip HTML, decode entities (`&amp;` → `&`), trim whitespace. If empty after cleaning — **skip the event entirely**. |
| `description` | Strip HTML. Decode entities. Collapse multiple newlines to single. Truncate to 1000 characters. |
| `start_datetime` | Convert to UTC ISO 8601. iCal DTSTART with TZID: convert via `luxon`. If no timezone: assume `America/Chicago`. RSS pubDate: parse RFC 2822, `.toISOString()`. |
| `end_datetime` | If missing: set to `start_datetime + 1 hour`. If all-day event: set `null`. |
| `all_day` | `true` when iCal DTSTART is DATE type (no time component). `false` otherwise. |
| `location` | Trim whitespace. If empty string after trim: set `null`. |
| `url` | Validate with `URL` constructor. If invalid or missing: set `null`. |
| `categories` | Lowercase. Auto-tag from keyword map. Empty array if no keywords match. |

**Category keyword map:**

```typescript
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  fundraiser:  ['gala', 'auction', 'fundraiser', 'fundraising', 'charity', 'benefit'],
  meeting:     ['meeting', 'board', 'agenda', 'minutes', 'committee'],
  workshop:    ['workshop', 'class', 'training', 'seminar', 'learn'],
  family:      ['family', 'kids', 'children', 'youth', 'all ages'],
  arts:        ['concert', 'performance', 'exhibit', 'gallery', 'theatre', 'music'],
  sports:      ['tournament', 'race', 'game', 'match', 'sport', 'run', 'walk'],
  community:   ['festival', 'fair', 'parade', 'celebration', 'community'],
  environment: ['garden', 'plant', 'nature', 'cleanup', 'environment', 'park'],
}
```

### 4.5 Deduplication Strategy

#### Layer 1 — UID-Based (Same Source)

iCal events carry a `UID` field. Store as `raw_uid`. If a feed re-publishes the same event with the same UID, the upsert updates it without creating a duplicate.

#### Layer 2 — Fingerprint-Based (Within Source)

```typescript
// worker/src/dedupe.ts
async function generateFingerprint(
  title: string,
  start_datetime: string,
  source_id: string
): Promise<string> {
  const dateOnly = start_datetime.slice(0, 10) // 'YYYY-MM-DD'
  const raw = `${title.toLowerCase().trim()}|${dateOnly}|${source_id}`
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}
```

#### Layer 3 — Cross-Source Fuzzy Matching (Phase 4)

Same date + title similarity > 85% (Levenshtein) + same or nearby location → flagged for coordinator review in Supabase Studio. **Never auto-merge.**

### 4.6 Error Handling Rules

> A broken feed must never crash the Worker or stop other feeds from syncing. Apply these rules globally — no exceptions.

```typescript
async function fetchFeedSafe(source: Source): Promise<NormalizedEvent[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000) // 10s hard timeout
    const response = await fetch(source.feed_url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return events
  } catch (err) {
    console.error(`[SYNC ERROR] ${source.name}: ${err}`)
    await incrementFailureCount(source.id)
    return []  // never throw — always return empty array
  }
}
```

**Non-negotiable rules:**
1. Wrap every feed fetch in `try/catch` — return `[]` on any error, never throw
2. Set a 10-second `AbortController` timeout on every fetch request
3. Process all sources concurrently with `Promise.allSettled()` (not `Promise.all`)
4. Increment `consecutive_failures` on each failed fetch; reset to `0` on success
5. After 3 consecutive failures: send alert email to coordinator
6. Log `SyncResult` for every source on every cycle
7. Feed returns 0 events: log a warning, do **NOT** increment failures

---

## 5. Frontend Calendar & SEO

Because a core goal is to make `rafv.realtor` a dominant local search hub, we cannot rely solely on a JavaScript-rendered app — Google struggles to index JS-only content for the Events Carousel. The solution is a hybrid: a fast JS calendar for the browsing experience, with server-side SEO injection for individual event URLs.

### 5.1 The "Event Hub" Routing Model

| URL | What Happens |
|---|---|
| `rafv.realtor/community-calendar` | Loads the FullCalendar.js grid — the main browsing view. |
| `rafv.realtor/community-calendar/event/{id}` | A Cloudflare Pages Function intercepts server-side, injects SEO tags, then delivers the same frontend JS. The URL is shareable and indexable by Google. |

**The key interaction:** Clicking an event on the calendar changes the browser URL to `/community-calendar/event/{id}`. A visual modal or panel can display the details, but the URL *must* update so the page is shareable and Google can crawl it.

### 5.2 SEO Tag Injection — Cloudflare Pages Functions

File: `frontend/functions/community-calendar/event/[id].ts`

When Google's crawler or a user requests `/community-calendar/event/{id}`, this function:

1. Extracts `{id}` from the URL.
2. Fetches the event record from Supabase server-side (service key is never exposed to the browser).
3. Uses `HTMLRewriter` to inject into the `<head>` of `index.html` before delivery:

```typescript
// frontend/functions/community-calendar/event/[id].ts
export async function onRequest(context) {
  const { params, env } = context
  const eventId = params.id

  // Fetch event from Supabase server-side
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/events?id=eq.${eventId}&select=*`,
    { headers: { apikey: env.SUPABASE_SERVICE_KEY } }
  )
  const [event] = await res.json()
  if (!event) return context.next() // fall through to 404

  const title = `${event.title} | RAFV Community Calendar`
  const description = event.description ?? 'A community event in the Fox Valley.'
  const image = event.image_url ?? 'https://rafv.realtor/default-og-image.jpg'
  const canonicalUrl = `https://rafv.realtor/community-calendar/event/${eventId}`

  return new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(title) } })
    .on('head', { element(el) {
      el.append(`
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${image}">
        <meta property="og:url" content="${canonicalUrl}">
        <link rel="canonical" href="${canonicalUrl}">
        <script type="application/ld+json">
        ${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Event",
          "name": event.title,
          "startDate": event.start_datetime,
          "endDate": event.end_datetime,
          "location": { "@type": "Place", "name": event.location ?? 'Fox Valley, IL' },
          "description": description,
          "image": image,
          "url": event.url ?? canonicalUrl,
          "organizer": { "@type": "Organization", "name": event.source_name }
        })}
        </script>
      `, { html: true })
    }})
    .transform(await context.next())
}
```

### 5.3 FullCalendar.js Configuration

| Feature | Implementation |
|---|---|
| Library | FullCalendar v6 vanilla JS bundle loaded from CDN (jsDelivr or cdnjs). No framework required. |
| Default view | `dayGridMonth` on desktop (≥ 768px). `listMonth` on mobile (< 768px). |
| Event source | JSON feed from Supabase REST API. Fetches events for the visible date range. |
| Color coding | Each organization uses the hex color stored in the `sources` table. |
| Event click | Updates browser URL to `/community-calendar/event/{id}`. Displays event details in a panel or modal. |
| Navigation | FullCalendar's built-in prev/next/today buttons. Triggers a new API fetch for the new date range. |
| Mobile | List view activates at < 768px. Works in 375px viewport. |

### 5.4 Supabase API Query Contract

```
GET {SUPABASE_URL}/rest/v1/events
  ?select=id,title,start_datetime,end_datetime,all_day,location,description,image_url,url,source_id,source_name,categories
  &expired=eq.false
  &start_datetime=gte.{ISO_DATE}
  &order=start_datetime.asc
  &limit=500

Headers:
  apikey: {SUPABASE_ANON_KEY}
  Authorization: Bearer {SUPABASE_ANON_KEY}
```

**FullCalendar event shape:**

```javascript
{
  id:              event.id,
  title:           event.title,
  start:           event.start_datetime,
  end:             event.end_datetime,
  allDay:          event.all_day,
  url:             `/community-calendar/event/${event.id}`,  // internal route
  backgroundColor: sourceColorMap[event.source_id],
  borderColor:     sourceColorMap[event.source_id],
  extendedProps: {
    location:     event.location,
    description:  event.description,
    image_url:    event.image_url,
    source_name:  event.source_name,
    categories:   event.categories,
    external_url: event.url,  // link back to the partner's original event page
  }
}
```

### 5.5 Filtering UI

- **Organization row:** One checkbox/button per partner with their color dot. All on by default.
- **Category row:** Pill buttons for `Community | Arts | Sports | Environment | Family | Fundraiser | Meeting`.
- **URL persistence:** Active filters written to `?orgs=id1,id2&cats=arts,sports`. Page load restores filter state.
- **Search box (Phase 4):** Client-side keyword filter on already-loaded events. No additional API call.

### 5.6 Branding Specification

| Element | Specification |
|---|---|
| Primary color | `#003399` — RAFV Blue (PMS 293 C). Header, buttons, default org color, active states. |
| Secondary color | `#36C2FF` — Vibrant Blue (PMS 311 C). Accents, highlights, hover states. |
| Background | `#F4F8FF` — light blue-tinted white. Calendar background. |
| Border color | `#C8D8F8` — muted blue-gray. Card borders, dividers. |
| Text primary | `#001A4D` — dark navy. All primary text. |
| Text muted | `#4A5A7A` — secondary information, dates, locations. |
| Typography | Garamond — all text. Load via Google Fonts (EB Garamond). Georgia as final fallback. |
| CSS isolation | **Zero WordPress styles load on this page.** The Cloudflare Proxy delivers this as a completely standalone app, isolated from the legacy theme. |

---

## 6. Hosting, DNS & Deployment

This application operates completely outside the legacy WordPress server while living on the same `rafv.realtor` domain without interfering with it.

### 6.1 How the "Smart Concierge" Works

```
Current state:  get.realtor (registrar) → WordPress server IP
Target state:   get.realtor (registrar) → Cloudflare Nameservers → routes traffic:
                  rafv.realtor/*                     → WordPress server (unchanged)
                  rafv.realtor/community-calendar/*  → Cloudflare Pages app
```

**Step-by-step setup:**

1. **Keep the registrar:** `get.realtor` remains the domain owner. No domain transfer needed.
2. **Swap nameservers:** In the `get.realtor` dashboard, change nameservers to Cloudflare's assigned pair (e.g., `ns1.cloudflare.com`, `ns2.cloudflare.com`). DNS propagation takes 0–48 hours.
3. **Add origin record:** In Cloudflare DNS, add an `A` record pointing `rafv.realtor` to the existing WordPress server IP with **Proxy status: Proxied** (orange cloud). This preserves all existing traffic.
4. **Deploy Pages app:** Deploy the frontend to Cloudflare Pages. Note the `.pages.dev` URL.
5. **Add the proxy route:** In Cloudflare, create a Route or use Pages Custom Domain to map `rafv.realtor/community-calendar/*` to the Pages deployment.

### 6.2 The "Burner Domain" Testing Strategy

**Execute this before touching the live `rafv.realtor` nameservers.** This is the low-risk proof of concept for leadership.

1. Register a cheap test domain (e.g., `rafv-calendar-test.com`) directly via Cloudflare (~$10/year).
2. Set up the **identical** proxy routing on the test domain: `/` → WordPress IP, `/community-calendar` → Pages app.
3. Verify that the WordPress homepage loads normally at the root, and the new calendar loads correctly at `/community-calendar` — on the same domain, with zero CSS bleed between them.
4. Demo to leadership and get sign-off.
5. Once approved, execute the nameserver swap on `rafv.realtor`.

### 6.3 Environment Variables & Secrets

| Variable | Where Stored | Purpose |
|---|---|---|
| `SUPABASE_URL` | Cloudflare secret (Worker + Pages) | Supabase project URL. Used by both Worker and Pages Functions. |
| `SUPABASE_SERVICE_KEY` | Cloudflare secret (Worker + Pages) | Service role key with write access. **Never** expose in frontend HTML. |
| `SUPABASE_ANON_KEY` | Frontend HTML (public) | Read-only. RLS enforced. Safe to hardcode in `index.html`. |
| `ALERT_EMAIL_API_KEY` | Cloudflare secret (Worker) | Mailgun or similar API key for failure alert emails. |
| `ALERT_EMAIL_TO` | `wrangler.toml` var | Coordinator email address for failure notifications. |
| `SYNC_INTERVAL_MINUTES` | `wrangler.toml` var | `30`. Controls polling frequency. |
| `MAX_EVENTS_LOOKAHEAD_DAYS` | `wrangler.toml` var | `365`. Cap for recurring event expansion. |

```toml
# wrangler.toml — non-secret config only
[vars]
SYNC_INTERVAL_MINUTES = "30"
MAX_EVENTS_LOOKAHEAD_DAYS = "365"
DEDUP_EXPIRY_DAYS = "7"
ALERT_EMAIL_TO = "coordinator@rafv.org"
```

```bash
# .dev.vars — local secrets, NEVER committed to source control
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
ALERT_EMAIL_API_KEY=your-mailgun-api-key
```

---

## 7. Repository Structure

```
community-calendar/
├── worker/                          # Cloudflare Worker — ingestion + cron
│   ├── src/
│   │   ├── index.ts                 # Worker entry point + cron handler
│   │   ├── parsers/
│   │   │   ├── ical.ts              # iCal/ICS parser → NormalizedEvent[] (incl. image extraction)
│   │   │   └── rss.ts               # RSS/Atom parser → NormalizedEvent[] (incl. enclosure images)
│   │   ├── normalize.ts             # Raw event → NormalizedEvent (image extraction + HTML strip)
│   │   ├── dedupe.ts                # SHA-256 fingerprint generation
│   │   ├── db.ts                    # Supabase upsert helpers
│   │   └── types.ts                 # Shared TypeScript interfaces (incl. image_url)
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── index.html                   # Main calendar view — FullCalendar + inline CSS/JS
│   ├── functions/                   # Cloudflare Pages Functions (server-side SEO)
│   │   └── community-calendar/
│   │       └── event/
│   │           └── [id].ts          # Intercepts /event/{id} — injects title, og:image, JSON-LD
│   └── _redirects                   # Cloudflare Pages routing rules
├── scripts/
│   └── seed-sources.ts              # Seeds GrowthZone as Source #1, then partner orgs
├── .dev.vars                        # Local secrets — NEVER commit
├── .dev.vars.example                # Committed template — no real values
├── BRIEF.md                         # AI coding context primer (paste into each session)
└── README.md                        # Setup, DNS configuration, and maintenance guide
```

---

## 8. Implementation Phases

Each phase ends with a working, deployable system. Phases build on each other but are self-contained.

---

### Phase 1 — Foundation & Burner Domain Test (Weeks 1–2)

**Goal:** Full ingestion pipeline working and Cloudflare proxy architecture proven on a test domain before touching the live site.

- [ ] Create Supabase project. Run the `CREATE TABLE` SQL including the `image_url` column.
- [ ] Apply Row Level Security policies. Verify: anon `SELECT` works; anon `INSERT` returns 403.
- [ ] Initialize repository with folder structure from Section 7. Create `wrangler.toml` and `.dev.vars.example`.
- [ ] Seed the GrowthZone anchor feed as Source #1 via `scripts/seed-sources.ts`.
- [ ] Build the iCal parser with image extraction: check `ATTACH` property → HTML `<img>` regex → `logo_url` fallback.
- [ ] Build the RSS parser with image extraction: check `<enclosure type="image/*">` → HTML `<img>` regex → `logo_url` fallback.
- [ ] Build the cron worker: fetch active sources, route to parsers, upsert to Supabase with `Promise.allSettled()`.
- [ ] Verify GrowthZone events appear in Supabase within 30 minutes, with `image_url` populated where available.
- [ ] Register the burner test domain. Configure proxy routing: `/` → WordPress IP, `/community-calendar` → Pages app.
- [ ] Verify WordPress homepage loads at the root and the calendar page loads at `/community-calendar` with **zero WordPress CSS bleed**.

**Deliverable:** Full ingestion loop running. Proxy architecture proven on test domain. Leadership demo-ready.

---

### Phase 2 — Partner Expansion (Weeks 3–4)

**Goal:** All partner feeds syncing with full deduplication and failure alerting.

- [ ] Add 5–10 community partner organizations to the `sources` table via `seed-sources.ts`.
- [ ] Configure and test iCal/RSS parser for each partner's specific feed. Fix edge cases per feed.
- [ ] Implement full deduplication: `UNIQUE(fingerprint)` constraint, `raw_uid` storage, upsert conflict resolution.
- [ ] Implement `markExpiredEvents()`: events not seen in 2+ cycles get `expired = true`.
- [ ] Add failure alerting: after `consecutive_failures ≥ 3`, send email alert via Mailgun.
- [ ] Implement category auto-tagging using the keyword map.

**Deliverable:** All partner feeds syncing. Near-real-time updates. Failure alerting active. Zero duplicate events.

---

### Phase 3 — Frontend UI, SEO Engine & The Big Switch (Weeks 5–6)

**Goal:** Production-ready calendar live at `rafv.realtor/community-calendar`.

- [ ] Build `frontend/index.html`: FullCalendar.js v6, events from Supabase REST API, org color coding.
- [ ] Implement event click → URL change to `/community-calendar/event/{id}` + modal/panel display.
- [ ] Build the Cloudflare Pages Function (`functions/community-calendar/event/[id].ts`): inject `<title>`, `og:image`, `og:description`, `canonical`, and Schema.org `Event` JSON-LD.
- [ ] Apply RAFV branding: `#003399` primary, `#36C2FF` secondary, EB Garamond via Google Fonts.
- [ ] Build org filter row and category filter pills with URL param persistence.
- [ ] Test mobile responsive at 375px. Verify list view activates on mobile.
- [ ] Deploy frontend to Cloudflare Pages.
- [ ] **The Big Switch:** Change nameservers in `get.realtor` to Cloudflare. Apply the `/community-calendar` proxy route. Verify WordPress still loads at the root.
- [ ] Validate event URLs in the [Google Rich Results Test](https://search.google.com/test/rich-results). Confirm valid `Event` schema with no critical errors.

**Deliverable:** Calendar live at `rafv.realtor/community-calendar`. Google Events Carousel eligible. WordPress unaffected.

---

### Phase 4 — Hardening & Documentation (Weeks 7–8)

**Goal:** Fully hardened, documented, self-maintaining system.

- [ ] Add cross-source duplicate flagging for coordinator review in Supabase Studio.
- [ ] Add "Report a problem" button on event modal: sends email to coordinator with event details.
- [ ] Implement client-side keyword search on already-loaded events.
- [ ] Add Cloudflare KV caching for Supabase API responses (5-minute cache) to reduce DB load.
- [ ] Add iCal export endpoint: `/community-calendar/calendar.ics` so members can subscribe in their own calendar app.
- [ ] Write coordinator maintenance guide: adding new partners, Supabase Studio procedures, responding to failure alerts.
- [ ] Write partner onboarding guide: finding a public calendar link in Google Calendar, Outlook, WordPress, Squarespace.
- [ ] Document the DNS/proxy setup for future maintainers.

**Deliverable:** Hardened, documented, fully maintainable system with self-service coordinator tools.

---

## 9. Partner Onboarding Workflow

**RAFV internal events sync automatically** via the GrowthZone anchor feed. No staff double-entry required.

Adding a community partner takes approximately five minutes and requires no code changes.

### 9.1 Pre-Onboarding Checklist

- [ ] Paste the feed URL in a browser. Confirm it returns XML (not a 404 or HTML page).
- [ ] For RSS: check for `<rss>` or `<feed>` as the root XML element.
- [ ] For iCal: check for `BEGIN:VCALENDAR` at the top of the response.
- [ ] Confirm at least one event is visible in the raw feed.
- [ ] Check whether the feed includes images (look for `ATTACH:` in iCal or `<enclosure>` in RSS). If not, set `logo_url` in Supabase as the image fallback.
- [ ] Set `source_type` correctly: `ical` for `.ics` URLs, `rss` for everything else.
- [ ] Assign a unique hex color distinct from all existing partner colors.

### 9.2 Supported Feed Sources

| Platform | Feed Type & Instructions |
|---|---|
| **GrowthZone CRM** | iCal. Pre-seeded as Source #1. URL: `growthzoneapp.com/ap/CalendarFeed/1309`. |
| **Google Calendar** | iCal. Calendar Settings → Integrate calendar → Public address in iCal format. URL ends in `.ics`. |
| **Outlook / Office 365** | iCal. Share calendar → Publish calendar → Copy ICS link. |
| **Apple Calendar / iCloud** | iCal. Share Calendar → Public Calendar → Copy URL. Requires calendar set to Public. |
| **WordPress (The Events Calendar)** | iCal or RSS. URL pattern: `yoursite.com/events/feed/` (RSS) or `?ical=1` (iCal). |
| **Squarespace / Wix** | iCal via connected Google Calendar. Ask org for their Google Calendar ICS link. |
| **Eventbrite** | iCal. Organizer profile → Subscribe to calendar. URL contains `eventbrite.com/...ics`. |
| **Facebook Events** | ❌ NOT SUPPORTED. No public feed available. Org must use manual Google Form fallback. |
| **Most event platforms** | Look for Subscribe, Export, or Add to Calendar option. Any `.ics` URL will work. |

### 9.3 Adding a New Partner — 5-Minute Procedure

```typescript
// scripts/seed-sources.ts
const newSource = {
  name: 'St. Charles Garden Club',
  feed_url: 'https://example.com/events/feed/',
  source_type: 'rss',    // or 'ical'
  color: '#006688',      // unique hex — different from all existing partners
  logo_url: 'https://example.com/logo.png',  // used as image_url fallback
  poll_interval: 30,
  active: true,
}
```

1. Verify the feed URL using the pre-onboarding checklist.
2. Open Supabase Studio → Table Editor → `sources` table → Insert row.
3. Fill in: `name`, `feed_url`, `source_type`, `color` (unique hex), `logo_url` (for image fallback), `active = true`.
4. The next cron cycle (within 30 minutes) automatically picks up the new source and syncs its events.
5. Verify in the `events` table: filter by `source_name` = new org name and confirm events appear with `image_url` populated.

> **To remove a partner:** Set `active = false` in their `sources` row. Events hidden within 30 minutes. No data deleted.

---

## 10. Known Edge Cases & Handling

| Scenario | Impact | Handling |
|---|---|---|
| iCal event with no `DTEND` | End time unknown | Set `end_datetime = start_datetime + 1 hour` as display default. |
| iCal all-day event (DATE not DATETIME) | No time component | Set `all_day = true`, `end_datetime = null`. FullCalendar renders as all-day. |
| RSS item with no `pubDate` | Cannot normalize | Skip event entirely. Log a warning. Do not fail the whole feed. |
| Feed returns HTTP 404 | Source offline | Increment `consecutive_failures`. Return `[]`. Alert after 3 failures. |
| Feed returns valid XML, 0 events | Empty calendar period | Log warning. Do **NOT** increment failures — this is normal behavior. |
| Event title empty after HTML strip | Unusable event | Skip event entirely. Title is required. |
| No image in feed and no `logo_url` | `image_url = null` | Pages Function falls back to `rafv.realtor/default-og-image.jpg` for OpenGraph. Schema.org `image` field omitted. |
| Duplicate fingerprint on upsert | Would create duplicate | Update `updated_at` only. Supabase `merge-duplicates` header handles this. |
| `RRULE` with no `COUNT` or `UNTIL` | Infinite recurrence | Cap expansion at `MAX_EVENTS_LOOKAHEAD_DAYS` (365). Do not expand further. |
| GrowthZone feed changes structure | Anchor feed breaks | Worker catch block prevents crash. `consecutive_failures` increments. Alert fires after 3 failures. |
| Partner changes their feed URL | Sync breaks | Coordinator updates `feed_url` in Supabase Studio. No code change. Auto-recovers next cycle. |
| Partner requests removal | Hide org from calendar | Set `active = false` in sources row. Events hidden within 30 minutes. |
| Partner uses Facebook Events or PDF flyers | No feed available | Manual Google Form fallback (Phase 2+). |
| Two orgs list the same event | Duplicate displayed | Phase 4 cross-source fuzzy matching flags for coordinator review. No auto-merge. |
| WordPress loads at `/community-calendar` after DNS switch | Proxy misconfigured | Verify Cloudflare route points to the correct Pages deployment URL, not the WordPress origin IP. |

---

## 11. Ongoing Maintenance

Once deployed, the system requires minimal ongoing maintenance.

### 11.1 Routine Tasks

| Task | Frequency |
|---|---|
| **Monitor failure alerts** | As needed. Automatic email fires when a feed fails 3+ consecutive times. Usually means a partner changed their URL. |
| **Add new partner orgs** | As needed. Five-minute procedure in Supabase Studio. See Section 9. |
| **Remove or pause an org** | As needed. Set `active = false` in `sources` row. Takes effect within 30 minutes. |
| **Review duplicate flags** (Phase 4) | Weekly. View flagged events in Supabase Studio and merge or dismiss. |
| **Check Cloudflare dashboard** | Monthly. Verify Worker cron is running and Pages Function error rate is near zero. |
| **Validate Rich Results** | Quarterly. Paste a sample event URL into the [Google Rich Results Test](https://search.google.com/test/rich-results) to confirm JSON-LD is still valid. |
| **Check Supabase storage** | Monthly. Confirm well under 500MB. The 30-minute cron prevents free-tier project pausing automatically. |

### 11.2 Supabase Free Tier Note

Supabase pauses free-tier projects after 7 days of inactivity. The 30-minute Worker cron prevents this during normal operation. If the Worker is disabled for an extended period, reactivate the Supabase project via the dashboard before re-enabling the Worker.

### 11.3 Adding a New Maintainer

The only credentials a new maintainer needs:
1. Access to the Cloudflare account (Worker deploys, Pages deploys, DNS management, secret management).
2. Access to the Supabase project (database management via Supabase Studio).

Both platforms support team member invitations. The `BRIEF.md` file in the repository root serves as the AI coding context primer — paste it at the start of every new coding session.

---

## 12. Future Scalability & Migration

### 12.1 Scaling to 15–50 Organizations

- Add a self-service onboarding form: new orgs fill in their name and feed URL. Coordinator approves and adds one row to `sources` — no code change.
- Process feeds in parallel with `Promise.allSettled()` and a concurrency limit of 10 simultaneous fetches.
- Upgrade Supabase to Pro ($25/month) for 8GB storage, daily backups, and guaranteed no-pause behavior.

### 12.2 Enhanced Features

| Feature | Description |
|---|---|
| **iCal export** | Generate `/community-calendar/calendar.ics` so members can subscribe in Google Calendar, Outlook, or Apple Calendar. |
| **Weekly email digest** | Worker cron fires Monday mornings. Sends the week's upcoming events via Mailgun/Resend free tier. |
| **Map view** | Leaflet.js integrated into the event detail panel, geocoding the `location` field. |
| **RSS output** | Expose the unified feed as RSS so other sites can aggregate the RAFV calendar. |
| **AI category tagging** | Run event title/description through a small LLM call for higher-accuracy categorization. |
| **Self-service admin UI** | React app on Cloudflare Pages replacing direct Supabase Studio access for non-technical coordinators. |

### 12.3 The Strangler Fig Migration — Phasing Out WordPress

This Community Calendar is explicitly designed as **Step 1** of migrating RAFV off the legacy WordPress platform. The Cloudflare Reverse Proxy architecture makes this safe and incremental.

**The pattern:** Instead of replacing WordPress all at once (high risk, high downtime), we rebuild RAFV's digital presence "room by room." Each new section is built as a fast, modern Cloudflare Pages app and plugged in via a new Cloudflare Route — with zero downtime and zero disruption to existing SEO rankings.

```
Phase 1 (Now):   rafv.realtor/community-calendar  → New App ✅
Phase 2 (Later): rafv.realtor/member-directory    → New App
Phase 3 (Later): rafv.realtor/about               → New App
Phase 4 (Later): rafv.realtor/                    → New Homepage (WordPress fully retired)
```

At each step, WordPress continues handling all non-migrated routes. The calendar's domain authority accumulates entirely in the new stack. By the time the homepage is replaced, the SEO foundation is already established and battle-tested.

---

## 13. Acceptance Criteria

All criteria must pass before the system is considered production-ready.

### 13.1 Infrastructure & Proxy Isolation

- [ ] Calendar loads correctly at `rafv.realtor/community-calendar`.
- [ ] WordPress homepage loads correctly at `rafv.realtor` — the nameserver swap has not broken the existing site.
- [ ] **CSS isolation:** Zero WordPress stylesheets, headers, footers, or plugins load on the calendar page. Verified via browser DevTools → Network tab.
- [ ] Navigating directly to `rafv.realtor/community-calendar/event/{id}` delivers a page with a populated `<title>` tag and `og:image` meta tag — visible in View Source.

### 13.2 SEO & Google Events Carousel Eligibility

- [ ] Clicking an event on the calendar updates the browser URL to a unique, shareable path (`/community-calendar/event/{id}`).
- [ ] The dynamic `<title>` tag matches the event name — visible in the browser tab and in View Source.
- [ ] `<meta property="og:image">` is populated with the event's `image_url`, enabling rich link previews when shared on Slack, Teams, iMessage, etc.
- [ ] Pasting an event URL into the [Google Rich Results Test](https://search.google.com/test/rich-results) returns a valid `Event` schema with **no critical errors**. This is the direct validation for Google Events Carousel eligibility.

### 13.3 Data Ingestion

- [ ] GrowthZone anchor feed: events created in GrowthZone CRM appear on the calendar within 30 minutes, with `image_url` populated where an image exists in GrowthZone.
- [ ] Partner feeds: events from all active sources appear in Supabase within 30 minutes of publication.
- [ ] Duplicate prevention: `SELECT fingerprint, COUNT(*) FROM events GROUP BY fingerprint HAVING COUNT(*) > 1;` returns 0 rows.
- [ ] Broken feed isolation: a broken feed URL increments `consecutive_failures` for that source only. All other sources sync normally in the same cycle.
- [ ] Failure alerting: after 3 consecutive failures on any feed, an alert email is delivered to the coordinator.

### 13.4 Frontend

- [ ] Calendar opens in browser and displays events with correct organization colors.
- [ ] Clicking an event displays all populated fields: title, date/time in `America/Chicago` timezone, location, description, image (where available), organization name, and a working link back to the original event page.
- [ ] Organization filter correctly hides and shows each org's events. Filter state survives page reload via URL params.
- [ ] Calendar renders correctly at 375px viewport width (mobile). List view activates on mobile.

### 13.5 Security

- [ ] Anonymous (anon key) `SELECT` on `events` returns results: ✅ pass.
- [ ] Anonymous `INSERT` into `events` returns HTTP 403: ✅ pass.
- [ ] The `SUPABASE_SERVICE_KEY` is **never** present in any frontend HTML, JavaScript, or public repository file. It is only used server-side in the Cloudflare Pages Function and the Worker.

---

*REALTOR® Association of Fox Valley · Community Calendar Build Plan · Prepared March 2026*
*$0/month · Cloudflare Reverse Proxy + Supabase + FullCalendar.js · GrowthZone CRM Integration*
