# System Architecture

## Overview

The RAFV Community Event Calendar employs a decoupled, serverless architecture that separates the presentation layer from the data ingestion and storage layers. This approach ensures high performance, maintainability, and scalability.

## Architecture Layers

### 1. Presentation Layer (Frontend)
*   **Technology Stack:** React, Vite, TypeScript.
*   **Location:** `/Inspiration Folder`
*   **Description:** A modern Single Page Application (SPA) that provides the public calendar view and secure administrative dashboard. It interacts directly with the data layer via Supabase's generated REST API from the client side. The interface leverages custom CSS for styling rather than relying on external component libraries, adhering strictly to RAFV brand guidelines.

### 2. Ingestion Layer (Cloudflare Worker)
*   **Technology Stack:** Cloudflare Workers, TypeScript (`node-ical`, `rss-parser`).
*   **Location:** `/worker`
*   **Description:** A serverless function triggered by a scheduled cron event. It acts as the aggregation engine, performing the following tasks:
    *   Retrieving calendar data from the RAFV GrowthZone CRM and partner URLs.
    *   Parsing and normalizing various formats (iCal and RSS).
    *   Implementing defensive measures (null checks, protocol correction, identity masking) against malformed feeds.
    *   Generating SHA-256 fingerprints to deduplicate records in-memory before database interaction.
    *   Upserting normalized data into the database.

### 3. Data Layer (Supabase)
*   **Technology Stack:** PostgreSQL (via Supabase), REST API.
*   **Description:** The persistent data store consisting of two primary tables:
    *   `sources`: Contains configuration, status, and URL definitions for each partner organization.
    *   `events`: Stores the normalized event records continuously synchronized by the Ingestion Layer.
*   **Security:** Row Level Security (RLS) is configured to permit read-only access for anonymous users via the frontend, while restricting write operations exclusively to the authenticated Cloudflare Worker via service role keys.

## Data Flow Lifecycle

1.  **Event Generation:** A partner organization or RAFV staff creates an event within their respective system (e.g., GrowthZone CRM or Google Calendar).
2.  **Worker Synchronization:** The Cloudflare Worker cron ticket executes, fetching the calendar configuration from the `sources` table and requesting the latest data from each active feed URL.
3.  **Parsing and Deduplication:** The Worker normalizes the incoming data and evaluates event uniqueness using SHA-256 fingerprinting.
4.  **Database Upsert:** New or modified events are committed to the `events` table via the Supabase client.
5.  **Frontend Delivery:** Visitors accessing the calendar page trigger a client-side API request to Supabase, which returns the latest synchronized events for rendering within the React application.
