# Project Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the project structure for the RAFV Community Event Calendar with a functional Cloudflare Worker and Pages skeleton.

**Architecture:** Functional scaffolding as per Build Plan. Uses `wrangler` for worker initialization and manual structure creation for frontend/scripts.

**Tech Stack:** Cloudflare Workers, Cloudflare Pages, TypeScript, node-ical, rss-parser.

---

### Task 1: Initialize Project Structure

**Files:**
- Create: `worker/` (via wrangler)
- Create: `frontend/index.html`
- Create: `scripts/seed-sources.ts`
- Create: `BRIEF.md`
- Create: `README.md`

- [ ] **Step 1: Initialize Cloudflare Worker**
Run: `npx wrangler init worker --git --type ts --no-deploy --no-interactive` in the root.
Expected: `worker/` directory created with `src/index.ts`, `wrangler.toml`, `package.json`, and `tsconfig.json`.

- [ ] **Step 2: Create frontend directory and index.html**
Run: `mkdir frontend`
Create: `frontend/index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RAFV Community Calendar</title>
    <!-- Placeholder for FullCalendar.js implementation in Phase 3 -->
</head>
<body>
    <div id="calendar"></div>
</body>
</html>
```

- [ ] **Step 3: Create scripts directory and seed-sources.ts boilerplate**
Run: `mkdir scripts`
Create: `scripts/seed-sources.ts`
```typescript
/**
 * Seeds GrowthZone as Source #1 and partner organizations into Supabase.
 * To be implemented in Phase 1.
 */
console.log('Seed sources script initialized.');
```

- [ ] **Step 4: Create BRIEF.md with project context**
Create: `BRIEF.md`
(Content extracted from Executive Summary of Build Plan)
```markdown
# RAFV Community Event Calendar — Project Brief

The RAFV Community Event Calendar is a lightweight, serverless web application that transforms `rafv.realtor` into the premier local search hub for Fox Valley events.

## Core Value Loop
Automatically syncs internal RAFV events from GrowthZone CRM alongside external events from local partner organizations.

## Infrastructure Strategy
- **Cloudflare as a Reverse Proxy:** Served at `rafv.realtor/community-calendar`.
- **Ingestion:** Cloudflare Workers + Cron Triggers.
- **Database:** Supabase (Postgres).
- **Frontend:** FullCalendar.js v6.
- **SEO:** Cloudflare Pages Functions (`HTMLRewriter`) for JSON-LD & meta tags.

## Technology Stack
- **DNS:** Cloudflare
- **Runtime:** Cloudflare Workers
- **Database:** Supabase
- **Frontend:** Cloudflare Pages
```

- [ ] **Step 5: Create README.md with setup instructions**
Create: `README.md`
```markdown
# RAFV Community Event Calendar

## Setup Instructions
1. **Worker:** 
   - `cd worker`
   - `npm install`
   - `npx wrangler dev` to start local development
2. **Frontend:**
   - Hosted on Cloudflare Pages.
3. **Database:**
   - Supabase project required.

## Project Structure
- `worker/`: Cloudflare Worker for ingestion.
- `frontend/`: Cloudflare Pages app.
- `scripts/`: Maintenance and seeding scripts.
```

- [ ] **Step 6: Commit changes**
Run: `git add .` (if git is initialized) and commit.
Expected: Project structure locked in.
