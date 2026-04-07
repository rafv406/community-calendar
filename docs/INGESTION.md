# Feed Ingestion System

## Overview
The Ingestion System is a standalone Cloudflare Worker responsible for aggregating event data from remote partner URLs and reconciling it with the central Supabase database. The worker executes autonomously based on scheduled cron triggers and can also be invoked manually via HTTP requests from the Administrative Dashboard.

## Architecture and Execution Flow
1.  **Trigger:** The worker initiates via a scheduled cron event or a manual GET request to the worker URL.
2.  **Configuration Fetch:** The worker executes a secure query using the Supabase Service Role key to retrieve all partner configurations where `active=true` from the `sources` table.
3.  **Parallel Processing:** The worker dispatches asynchronous fetch requests to all active source feed URLs.
4.  **Specialized Parsing:** Responses are routed to either the `ical.ts` or `rss.ts` parser logic based on the documented `source_type`.
5.  **Normalization & Deduplication:** Raw event strings are stripped of HTML formatting, sanitized, and fingerprinted. The batch is deduplicated locally in memory.
6.  **Database Upsert:** The final array of normalized, unique events is upserted into the Supabase database.

## Fallback Mechanisms and Defensive Parsing
The core engineering philosophy of the ingestion layer is resilience. External partner calendar feeds exhibit strict inconsistencies, which necessitated the implementation of heavy defensive logic within `/worker/src/parsers/`:

### 1. The "Null Trap" Immunity
Certain JavaScript libraries (e.g., `node-ical`) incorrectly evaluate empty string fields from external calendars as objects containing null prototype structures. Utilizing naive assignment logic results in unhandled type exceptions that crash the synchronization process. 
**Solution:** The parser implements strict conditional checks (e.g., `if (title && typeof title === 'object')`) to ensure empty properties degrade gracefully without execution failure.

### 2. Protocol Normalization
Several third-party applications provide calendar ingestion URLs utilizing the non-standard `webcal://` application protocol.
**Solution:** The worker intercepts and performs string replacement across all feed URLs, forcefully upgrading `webcal://` structures to the definitive `https://` protocol format before network execution.

### 3. Identity Masking (User-Agent Enforcement)
Certain municipal or high-security domain infrastructure actively filters and terminates HTTP connections initiated by automated Cloudflare Worker IP ranges if they identify as headless agents.
**Solution:** The worker defines explicit `Headers` payloads, injecting a standard Google Chrome `User-Agent` to successfully traverse strict network firewalls during the polling request.

### 4. Deterministic Deduplication
Due to feed providers routinely mismanaging universal Unique Identifiers (`uid`), standard SQL deduplication can occasionally fail to map overlapping recurrence patterns.
**Solution:** The worker generates a proprietary `SHA-256` hash matrix of the `title + start_datetime + source_id` for every parsed item. This hash serves as the definitive conflict constraint during the database upsert process.
