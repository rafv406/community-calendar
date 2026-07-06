# Design Spec: Chatbot Event Dropdowns & UI Accordion Card

## Overview
The RAFV Assistant chatbot currently outputs event search results in a dense, text-heavy markdown block format. This design details a mechanism to parse event listings into beautifully-styled, collapsible React accordion cards inside the chat window, greatly improving visual readability and interaction.

## Architecture & Data Flow

### 1. Custom Structured Event Block Syntax
The Cloudflare Worker's OpenAI system prompt will be modified to request that recommended events be formatted inside unique `[EVENT]` block tags:

```text
[EVENT]
Title: Event Name
Org: Organization Name
Date: Date/Time details
Location: Location info (Physical or Virtual/Hybrid)
Url: Event details link
Description: Brief description of the event
[/EVENT]
```

### 2. Frontend Parser Updates
In the React frontend, the message formatting logic (`formatMessageContent` in `CalendarChatbot.tsx`) will be upgraded to recognize `[EVENT]` blocks:
- **Outside blocks**: Content is parsed and rendered as standard markdown text paragraphs or lists.
- **Inside blocks**: Text is parsed by looking for predefined field keys (`Title:`, `Org:`, `Date:`, `Location:`, `Url:`, and `Description:`). The parsed fields are returned as a list of structured React `EventCard` elements.

### 3. EventCard Accordion UI
Each event is rendered in a custom styled accordion component:
- **Collapsed View**:
  - Title (Navy Blue, bold)
  - Date (Calendar/Clock icon + text)
  - Organization Badge (Subtle gray badge)
  - Expand/Collapse chevron icon
- **Expanded View**:
  - Location (Map pin icon + text)
  - Description (Conversational text)
  - "Event Details" Button (Actionable link that opens in a new tab)
- **Aesthetics & Animations**:
  - Apple-style spring animations on expand/collapse and hover.
  - Consistent layout with the chatbot's overall glassmorphism design system.
