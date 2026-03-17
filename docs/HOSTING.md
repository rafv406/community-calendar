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
