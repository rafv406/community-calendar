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
