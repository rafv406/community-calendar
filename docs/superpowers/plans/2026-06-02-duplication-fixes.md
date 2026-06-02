# Duplication Prevention & Fingerprint Stabilization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate duplicate events in external calendars by stabilizing fingerprints and prioritizing raw UIDs.

**Architecture:** 
1. Update `ical-generator.ts` to prioritize `raw_uid`.
2. Update `ical.ts` and `rss.ts` to generate fingerprints before title mutations.
3. Create a migration script to fix legacy fingerprints in the database.

**Tech Stack:** TypeScript, Cloudflare Workers, Supabase

---

### Task 1: Update iCal Generator

**Files:**
- Modify: `worker/src/ical-generator.ts`

- [ ] **Step 1: Prioritize raw_uid in UID generation**
  Update the `UID` line to use `ev.raw_uid || ev.fingerprint`.

- [ ] **Step 2: Commit changes**
  ```bash
  git add worker/src/ical-generator.ts
  git commit -m "fix(ical): prioritize raw_uid in VEVENT UID"
  ```

---

### Task 2: Stabilize Parser Fingerprints

**Files:**
- Modify: `worker/src/parsers/ical.ts`
- Modify: `worker/src/parsers/rss.ts`

- [ ] **Step 1: Move fingerprint generation in ical.ts**
  Move the `generateFingerprint` call to occur before the `[FREE]` prefix mutation.

- [ ] **Step 2: Move fingerprint generation in rss.ts**
  Ensure fingerprint generation is consistent and happens on raw title.

- [ ] **Step 3: Commit changes**
  ```bash
  git add worker/src/parsers/ical.ts worker/src/parsers/rss.ts
  git commit -m "fix(sync): generate fingerprints before title mutations"
  ```

---

### Task 3: Implementation Migration Script

**Files:**
- Create: `scripts/fix-free-fingerprints.ts`

- [ ] **Step 1: Write the migration script**
  Implement logic to fetch `[FREE]` events, re-calculate fingerprints, and handle collisions (delete duplicates).
  *Note: Need to replicate `generateFingerprint` logic or import it (if possible from scripts).*

- [ ] **Step 2: Commit changes**
  ```bash
  git add scripts/fix-free-fingerprints.ts
  git commit -m "feat(migration): add script to fix legacy fingerprints"
  ```

---

### Task 4: Verification

- [ ] **Step 1: Run migration script in dry-run mode**
  Verify it identifies the correct events.

- [ ] **Step 2: Run migration script for real**
  Verify DB updates.

- [ ] **Step 3: Verify iCal feed output**
  Run `wrangler dev` (if possible) or check local generator output.
