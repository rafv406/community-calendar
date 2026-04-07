# NSBAR Sync Debugging Log

## 🔴 The Error
**Problem:** NSBAR iCal link failing to populate events despite successful connection.
**Technical Trace:** `TypeError: Cannot read properties of null (reading 'val')`

### 🔍 Root Cause Analysis: The "Null Trap"
The iCal parser was incorrectly assuming that if a field (like `location` or `url`) reported itself as an `object`, it must have a sub-property called `.val`.
- In JavaScript, `typeof null` is bizarrely returned as `"object"`. 
- When the NSBAR feed provided a null/blank location, the check `typeof location === 'object'` evaluated to **TRUE**.
- The code then tried to read `null.val`, triggering an immediate crash of the sync process.

---

## 🛠️ The Fix
We implemented "Defensive Parsing" across all event fields in `worker/src/parsers/ical.ts`. 

### Logic Change:
Instead of blindly checking `typeof === 'object'`, we added a truthiness check (`if (field && typeof ...)`). This ensures that if a field is `null`, we skip the property access entirely and treat it as a blank string.

**Affected Fields:**
- `title`
- `description`
- `location`
- `url`

### Additional Improvements:
1. **Deduplication:** Added a Map-based deduplication step in `worker/src/index.ts` to ensure that even if an iCal feed contains duplicate UIDs, only one unique event is sent to the database.
2. **Identity Masking:** Added a standard Browser `User-Agent` to requests to bypass strict servers that block "unknown" bots.

---

## ✅ Current Status
- **Supabase Credentials:** Live in Cloudflare Secrets.
- **Worker Code:** Patched with safety checks.
- **Next Sync:** Scheduled to populate 232 identified NSBAR events.
