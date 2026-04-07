# RAFV Community Event Calendar

## Overview
The RAFV Community Event Calendar is an editorial-grade event aggregation system developed for the REALTOR® Association of Fox Valley (RAFV). The application serves as a centralized hub, synchronizing events from internal RAFV GrowthZone CRM data with public iCal and RSS feeds provided by regional community partner organizations. The normalized data is presented through a world-class web interface featuring high-end animations, sophisticated categorization, and professional-grade discovery tools.

---

## System Architecture

The application utilizes a robust, decoupled architecture designed for scalability and performance:

*   **Frontend (UI & Administration):** A contemporary Single Page Application (SPA) developed using React, Vite, and TypeScript. It features a premium design system with custom Framer Motion animations and Intersection Observer-driven UI states.
*   **Ingestion Engine:** A serverless Cloudflare Worker located in the `/worker` directory. This engine operates on a scheduled cron trigger to fetch, normalize, and store event data.
*   **Database:** A Supabase (PostgreSQL) instance manages the `sources` and `events` tables. The frontend interacts directly with the data layer via an automatically generated REST API.

---

## Features and Capabilities

### 1. Administrative Dashboard and Validation
The system includes a custom-built React Administrative Dashboard to streamline management processes:
*   Configure and toggle active status for community partner organizations.
*   Incorporate new event sources with automatic protocol detection (iCal/RSS).
*   Execute manual synchronization triggers with real-time status indicators and detailed transaction logs.

### 2. High-End Editorial Interface
*   **Scroll-Triggered Month Dividers:** Cinematic "high-tech light" animations that materialize as the user scrolls. Features rising radial blooms, sweeping accent lines, and de-blurring text reveals.
*   **Sophisticated Typography:** Precise grid layouts using specialized fonts (Inter, DM Sans) consistent with premium editorial standards.
*   **Fluid Layouts:** Advanced CSS techniques ensure responsive performance across all devices without external utility overhead.

### 3. Intelligent Discovery & Categorization
*   **Category Tile Grid:** An interactive, icon-based discovery section for rapid filtering (Fundraiser, Workshop, Technology, AI, etc.).
*   **Visual Identity:** Each category and organization is assigned unique color tokens and glows, maintained throughout the event card and list views.
*   **Event Horizon Hero:** A dynamic, high-tech background at the top of the page set the tone for a premium digital experience.

### 4. Advanced Search & Filtering Architecture
*   **Real-time Global Search:** Instantly filters events by title, description, location, or source.
*   **Multi-Dimensional Filtering:** Deep-dive into events using the advanced filter tray for specific sources (organizations) and date ranges (This Week, Next 30 Days, etc.).
*   **URL State Synchronization:** All search queries and category selections are synced to the URL, allowing for deep-linking and easy sharing of specific event views.

### 5. Robust Ingestion Engine (Cloudflare Worker)
*   **Defensive Parsing:** Comprehensive safety checks for inconsistent third-party data.
*   **Data Integrity:** SHA-256 fingerprinting for high-reliability event de-duplication.
*   **Browser Compatibility:** Standard browser `User-Agent` headers to bypass server-side restrictions on automated requests.

---

## Repository Structure

```text
├── Inspiration Folder/        # React/Vite Frontend Application
│   ├── src/
│   │   ├── components/        # UI components and layout elements
│   │   ├── pages/             # Calendar and Administrative views
│   │   ├── App.tsx            # Main application routing and entry
│   │   └── index.css          # Core design system and global styles
│   └── .env.local             # Local environment configuration
├── worker/                    # Cloudflare Worker Source Files
│   ├── src/
│   │   ├── parsers/           # specialized iCal and RSS parsing logic
│   │   ├── index.ts           # Cron handlers and synchronization endpoints
│   │   └── dedupe.ts          # Fingerprint generation logic
│   └── wrangler.toml          # Worker deployment configuration
├── scripts/                   # System diagnostic and initialization scripts
└── README.md                  # System documentation
```

---

## Local Development Setup

### 1. Frontend Development (React/Vite)
Navigate to the frontend project directory and initiate the development environment:
```bash
cd "Inspiration Folder"
npm install
npm run dev
```

**Required Environment Variables (`Inspiration Folder/.env.local`):**
```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### 2. Ingestion Worker (Cloudflare)
Navigate to the worker project directory:
```bash
cd worker
npm install
```

**Testing the Worker locally:**
```bash
npx wrangler dev
```
*Note: Local worker execution requires `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` secrets to be configured within the Cloudflare dashboard or a local `.dev.vars` file.*

---

## Deployment Procedures

### Deploying the Cloudflare Worker
Deploy the ingestion logic to the Cloudflare global network:
```bash
cd worker
npx wrangler deploy
```

**Secret Management:**
The worker requires secure access to database credentials. These can be configured or updated using the following commands:
```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_KEY
```

### Deploying the Frontend
Build the production-ready frontend bundle for hosting on Cloudflare Pages:
```bash
cd "Inspiration Folder"
npm run build
```
The resulting `dist/` directory contains the static assets for deployment.
