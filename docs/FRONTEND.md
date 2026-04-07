# Frontend Implementation

## Overview

The frontend layer of the RAFV Community Event Calendar is a modern Single Page Application (SPA) responsible for presenting aggregated event data to the end-user and providing a secure management dashboard for association personnel.

## Technology Stack

*   **Framework:** React 18
*   **Build Tool:** Vite
*   **Language:** TypeScript
*   **Styling:** Custom CSS methodologies utilizing modern layout modules (Grid and Flexbox) without reliance on external utility frameworks (e.g., Tailwind CSS).

## Core Components

The application code is segmented into structured directories within `/Inspiration Folder/src/`:

### 1. Presentation Interface
*   **Calendar View:** The primary interface designed for optimal public consumption. Events retrieved from the Supabase REST API are rendered chronologically. The interface utilizes a responsive, edge-to-edge layout design that maintains visual consistency with standard RAFV digital properties.
*   **Event Cards:** Modular components responsible for displaying normalized event data, including formatted dates, locations, descriptive text, and organization attribution.

### 2. Administrator Dashboard
Located at `/AdminDashboard.tsx`, this protected route provides staff with granular control over the data ingestion system:
*   **Source Management:** Authorized users can view all configured partner organizations, toggle their active status, and provision new data sources.
*   **Intelligent Validation:** When configuring a new partner, the system automatically parses the provided URL to determine if the payload is an iCal or RSS format, reducing administrative error.
*   **Diagnostic Operations:** Includes a "Sync Active" function that directly invokes the Cloudflare Worker URL. This feature provides real-time HTTP polling with corresponding success or failure statuses visualized in the interface, facilitating immediate troubleshooting.

## State Management and Data Fetching
*   The frontend operates securely using Row Level Security (RLS) defined within Supabase. Public endpoints utilize the `anon` key, ensuring that unauthenticated users cannot modify database entries.
*   Hooks and component lifecycles handle automated fetching of event arrays based on active filtering criteria.
