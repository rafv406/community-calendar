# RAFV Community Calendar — Session Brief

Paste this at the start of every coding session.

## Stack (locked)
Cloudflare Workers (TypeScript) · Supabase (Postgres) 
· FullCalendar.js v6 · Cloudflare Pages · $0/month

## Data flow (one line)
Worker cron → fetch feeds → normalize + extract image 
→ upsert Supabase → frontend reads REST API → Pages 
Function injects SEO tags

## Schema field names (locked — do not rename)
events: id, title, start_datetime, end_datetime, all_day,
location, description, image_url, url, source_id, 
source_name, categories, raw_uid, fingerprint, expired

sources: id, name, feed_url, source_type, color, 
logo_url, poll_interval, active, consecutive_failures

## Fingerprint formula (locked)
SHA-256( lowercase(title) | YYYY-MM-DD | source_id )

## Error rule (non-negotiable)
Every feed fetch: try/catch, 10s timeout, return [] 
on failure, never throw, Promise.allSettled() always

## Go deeper
- Architecture & data flow → docs/ARCHITECTURE.md
- Database schema & SQL → docs/SCHEMA.md
- Parsers & normalization → docs/INGESTION.md
- Frontend & SEO → docs/FRONTEND.md
- Hosting & DNS → docs/HOSTING.md
- Phase checklists → docs/PHASES.md
- Brand & design → docs/BRAND.md
- Partner onboarding → docs/PARTNERS.md
