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
