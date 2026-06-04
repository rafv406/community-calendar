# OpenAI Integration & Endpoint Security Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate chatbot and event search ingestion to OpenAI, secure the OpenAI API key, and configure CORS and Cloudflare Turnstile token verification for bot protection.

**Architecture:** Route all chat and embedding requests from the frontend to our Cloudflare Worker backend. Store the OpenAI API key and Turnstile secrets in Cloudflare Secrets, verify CORS headers against our allowed live origin, and require a valid Turnstile token to execute `/chat`.

**Tech Stack:** Cloudflare Workers, TypeScript, OpenAI API (GPT-4o-mini and text-embedding-3-small), Cloudflare Turnstile.

---

### Task 1: Environment & Secret Configuration

**Files:**
- Modify: `worker/src/db.ts`

- [ ] **Step 1: Update Env interface in worker**
  Add `OPENAI_API_KEY` and `TURNSTILE_SECRET_KEY` variables to the `Env` interface in `worker/src/db.ts`.

---

### Task 2: OpenAI Utility Helper

**Files:**
- Create: `worker/src/openai.ts`

- [ ] **Step 1: Write mock test or local checks for OpenAI connectivity**
  Ensure we can construct standard HTTP requests to OpenAI without external dependencies.
- [ ] **Step 2: Create OpenAI Helper Module**
  Write the core logic to communicate with OpenAI's Chat Completions and Embeddings endpoints (requesting `dimensions: 384` for `text-embedding-3-small`).

---

### Task 3: Worker Security (CORS & Turnstile Validation)

**Files:**
- Modify: `worker/src/index.ts`

- [ ] **Step 1: Implement strict CORS validation**
  Replace standard `*` CORS header with dynamic origin matching.
- [ ] **Step 2: Implement Turnstile secret validation**
  Add helper method inside `worker/src/index.ts` that requests verification from `https://challenges.cloudflare.com/turnstile/v0/siteverify`.

---

### Task 4: Ingest & Endpoint Refactoring

**Files:**
- Modify: `worker/src/index.ts`
- Modify: `worker/src/normalize.ts`

- [ ] **Step 1: Update Ingestion Embeddings & Classification**
  Update functions `aiCategorizeAndEmbed` and `aiEnrichEventsBatch` to invoke OpenAI chat and embeddings.
- [ ] **Step 2: Refactor `/chat` and `/search` routes**
  Update the `/chat` route to use OpenAI completions streaming and intent analysis, and `/search` to use OpenAI embeddings.

---

### Task 5: Frontend Integration

**Files:**
- Modify: `Inspiration Folder/src/components/CalendarChatbot.tsx`

- [ ] **Step 1: Load Turnstile script and initialize widget**
  Integrate the Turnstile widget into the chat window structure.
- [ ] **Step 2: Include Turnstile token in payload**
  Modify submit handler to send Turnstile token to `/chat`.
