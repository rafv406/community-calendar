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
