# Design Document: Search & Categorization Strategy
## Project: RAFV Community Calendar Landing Page
**Date:** 2026-03-31
**Status:** Draft / For Review

---

## 1. Executive Summary
As the RAFV Community Calendar scales to include 50+ events from 15+ partner organizations, users face "event fatigue." To maintain a fast, high-conversion landing page, we need a way for anonymous users to quickly filter and find events. 

This strategy proposes a dual approach: **Smart Pill Categorization** (browsing) and **Fuzzy Full-Text Search** (intent), leveraging the existing Supabase (Postgres) and Cloudflare Worker stack with $0 additional cost.

---

## 2. Strategy 1: Smart Pill Categorization (Browsing)
Instead of relying on perfect data from partner feeds, we will use a **Rule-Based Heuristic Engine** inside the Cloudflare Worker to "guess" event categories during the sync process.

### How it Works:
1.  **Source-Level Defaults:** Each partner organization is assigned a "Home Category" (e.g., St. Charles Garden Club → *Environment*).
2.  **Weighted Keyword Dictionary:** We maintain a list of keywords mapped to categories.
    *   **Category: Social** → *mixer, happy hour, coffee, networking, social, gathering.*
    *   **Category: Education** → *workshop, class, training, seminar, learn, CE, course.*
3.  **Heuristic Scoring:**
    *   Keywords in the **Title** get a weight of 3x.
    *   Keywords in the **Description** get a weight of 1x.
    *   If an event's score for a category exceeds a threshold (e.g., 5 points), it is tagged with that category.
4.  **Metadata Logic:** 
    *   If an event is on a Saturday/Sunday and contains "all ages" or "kids," tag as **Family**.
    *   If an event starts after 6:00 PM and has "drinks" or "refreshments," tag as **Social**.

### Benefits:
*   **Speed:** Runs instantly during ingestion.
*   **Cost:** $0 (no external AI calls needed).
*   **Consistency:** Every event from every partner feels unified under the same 6-8 pill buttons.

---

## 3. Strategy 2: Fuzzy Full-Text Search (Intent)
To provide a "Google-like" search experience, we will move away from simple keyword matching and utilize Postgres-native **Full-Text Search (FTS)** and **Trigram Similarity**.

### How it Works:
1.  **Full-Text Stemming:** We use Postgres `tsvector` to handle word variations. A search for "Selling" will match "Sell," "Sale," or "Sold."
2.  **Typo Tolerance (Fuzzy):** We enable the `pg_trgm` extension in Supabase. This allows the search to return "Networking" results even if the user types "Netorking" or "Netwroking."
3.  **Weighted Ranking:** 
    *   Search results are ranked by relevance.
    *   Matches in the **Event Title** appear higher than matches in the **Description**.
4.  **Relational Context:** By indexing the `source_name` along with the `title`, users can search for an organization (e.g., "Garden Club") and find all their events immediately.

### Benefits:
*   **Professional Feel:** Users are less frustrated by "No results found" pages caused by minor typos.
*   **Intelligence:** It understands the "meaning" of word stems, making the search feel more capable than a basic browser "Ctrl+F" search.

---

## 4. Technical Architecture
No new services are required. We leverage existing tools within our current stack:

| Component | Responsibility | Technology |
|---|---|---|
| **Ingestion (Worker)** | Runs the Rule-Based Engine and tags events before saving. | TypeScript Logic |
| **Data Layer (Supabase)** | Stores `tsvector` columns for search and `categories` array for pills. | Postgres (FTS + `pg_trgm`) |
| **API Layer** | Exposes the fuzzy search functionality via a simple RPC or query param. | Supabase REST / PostgREST |
| **Frontend UI** | Renders pill buttons and a live-filtering search bar. | FullCalendar.js + Vanilla JS |

---

## 5. Implementation Path (Proposed)
1.  **Phase 1 (Database):** Enable the `pg_trgm` extension in Supabase and create a "Search Vector" column on the `events` table.
2.  **Phase 2 (Worker):** Expand the `extractCategories` function in `normalize.ts` with the weighted keyword logic and source-level defaults.
3.  **Phase 3 (Frontend):** Add the Pill Button row and the Search Bar. Connect them to the Supabase API to update the calendar view in real-time.

---

## 6. Recommendation
We recommend proceeding with **Option 1 (Rule-Based)** and **Option 2 (Fuzzy Full-Text)**. This provides 90% of the benefit of a "high-end AI" solution with 0% of the cost and complexity, perfectly suited for a high-performance landing page.
