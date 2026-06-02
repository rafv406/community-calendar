# Design: Duplication Prevention & Fingerprint Stabilization

**Goal:** Eliminate duplicate events in external calendars (Google Calendar) by stabilizing event UIDs and fingerprints.

## Problem Statement
1.  **Unstable Fingerprints**: The `fingerprint` used for deduplication is generated from a mutated title (e.g., adding `[FREE]`). If the description changes and the "free" detection toggles, the title changes, a new fingerprint is generated, and a duplicate event row is created in the database.
2.  **Weak iCal UIDs**: The iCal feed currently uses `fingerprint` as the `UID`. If the fingerprint changes, Google Calendar sees it as a new event while keeping the old one (which it has cached), resulting in duplicates.

## Proposed Solution

### 1. Parser Identity Stabilization
We will ensure that the identity of an event (`fingerprint`) is determined by the source data, not our modifications.

*   **Location**: `worker/src/parsers/ical.ts` (and `rss.ts` for consistency).
*   **Change**: Move the `generateFingerprint` call to occur BEFORE any title mutations.
*   **Effect**: Even if we add prefixes like `[FREE]`, the event's fingerprint remains the same as long as the original title, date, and source stay the same.

### 2. iCal UID Prioritization
We will use the source-provided UID (`raw_uid`) when available, as it is the most stable identifier.

*   **Location**: `worker/src/ical-generator.ts`.
*   **Change**: Update the `UID` field to: `ev.raw_uid || ev.fingerprint`.
*   **Effect**: For sources that provide stable UIDs (like most iCal feeds), Google Calendar will track the event perfectly even if our internal fingerprint changes.

### 3. Data Migration
We need to fix existing events in the database that were generated with mutated titles to prevent a one-time duplication spike when the new code deploys.

*   **Script**: `scripts/fix-free-fingerprints.ts`.
*   **Logic**:
    1. Fetch all upcoming events where `title` starts with `[FREE] `.
    2. Re-calculate the fingerprint using the title *without* the `[FREE] ` prefix.
    3. Update the `fingerprint` column in the database.
*   **Collision Handling**: Since `fingerprint` is unique, the script must check if the "new" (corrected) fingerprint already exists in the database. If it does, the redundant `[FREE] ` row should be deleted to allow the correct row to persist.

## Considerations
*   **Initial Duplication Spike**: Changing the iCal `UID` logic from `fingerprint` to `raw_uid || fingerprint` will cause Google Calendar to see existing events as "new" one last time. This is a necessary trade-off for long-term stability.
*   **UID Uniqueness**: The iCal `UID` should remain globally unique. Our format `${id}@community-calendar.rafv.realtor` is sufficient as `fingerprint` includes `source_id`, and `raw_uid` is source-specific.

## Verification
*   **Manual**: Run the migration script and verify fingerprints are updated correctly.
*   **Integration**: Sync an iCal feed and verify that "FREE" events no longer duplicate when the description changes.
