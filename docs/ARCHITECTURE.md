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
