# Chatbot Event Dropdowns & UI Accordion Card Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the RAFV Assistant chatbot to parse event recommendations into beautiful, expandable UI accordion cards, and improve the typing animation state while loading.

**Architecture:** Update the Worker's OpenAI system prompt to wrap event recommendations in a structured tag `[EVENT]...[/EVENT]`. Update the React frontend's message formatter to parse these tags, extracting details (Title, Org, Date, Location, Url, Description) and rendering them in an interactive accordion card with smooth animations.

**Tech Stack:** React 19, TypeScript, CSS, Cloudflare Workers

---

### Task 1: Update Worker System Prompt

**Files:**
- Modify: `worker/src/index.ts:420-426`

- [ ] **Step 1: Edit system prompt**
  Update the system prompt in `worker/src/index.ts` to instruct the assistant to format events in `[EVENT]` blocks.
  
  ```typescript
  // In worker/src/index.ts
  const systemPrompt = `You are the RAFV Calendar Assistant. Use the following retrieved events context to answer the user's question. If the events context is empty, state that you couldn't find matching events.
  
  When recommending or listing events from the retrieved events context, you must format each event inside [EVENT] ... [/EVENT] tags using this exact key-value format (do not use bullet points or markdown styling for the event details themselves):
  
  [EVENT]
  Title: [Event Title]
  Org: [Host Organization Name]
  Date: [Date and Time details]
  Location: [Physical Location or Zoom/Hybrid details]
  Url: [Link URL or "Not Specified"]
  Description: [Brief, friendly description of the event]
  [/EVENT]
  
  Any general conversational text (like introductions or wrap-ups) should be written normally outside of these blocks. Make sure to present urls simply as raw strings inside the Url key.
  
  Context (Retrieved Events):
  ${contextText}`;
  ```

- [ ] **Step 2: Commit worker change**
  ```bash
  git add worker/src/index.ts
  git commit -m "feat(worker): format recommended events in custom tags in system prompt"
  ```

---

### Task 2: Implement Frontend Parser & Accordion Card

**Files:**
- Modify: `Inspiration Folder/src/components/CalendarChatbot.tsx`

- [ ] **Step 1: Add state and parser helper function**
  Update `formatMessageContent` to split content into standard text and custom event blocks, and create an inline Accordion component for rendering the events.
  
  Add `EventCard` component helper in `Inspiration Folder/src/components/CalendarChatbot.tsx` above `formatMessageContent` (around line 10):
  
  ```tsx
  interface ParsedEvent {
    title: string;
    org: string;
    date: string;
    location: string;
    url: string;
    description: string;
  }
  
  function EventCard({ event }: { event: ParsedEvent }) {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
      <div className="rafv-event-accordion-card" style={{
        background: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid rgba(0, 51, 153, 0.15)',
        borderRadius: '16px',
        margin: '10px 0',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }}>
        {/* Accordion Header */}
        <div 
          onClick={() => setIsOpen(!isOpen)} 
          style={{
            padding: '14px 16px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: isOpen ? 'rgba(0, 51, 153, 0.03)' : 'transparent',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '85%' }}>
            <span style={{ fontWeight: 700, color: 'var(--rafv-navy)', fontSize: '15px', lineHeight: '1.3' }}>
              {event.title}
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ color: '#666', fontWeight: 500 }}>{event.date}</span>
              {event.org && (
                <span style={{
                  background: 'rgba(0, 51, 153, 0.08)',
                  color: 'var(--rafv-navy)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontSize: '10px'
                }}>
                  {event.org}
                </span>
              )}
            </div>
          </div>
          <span style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            color: 'var(--rafv-navy)',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center'
          }}>
            ▼
          </span>
        </div>
  
        {/* Accordion Content Body */}
        {isOpen && (
          <div style={{
            padding: '14px 16px',
            borderTop: '1px solid rgba(0, 51, 153, 0.08)',
            fontSize: '13px',
            color: '#333',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: '#fff'
          }}>
            {event.location && event.location !== 'Not Specified' && (
              <div>
                <strong>📍 Location:</strong> {event.location}
              </div>
            )}
            {event.description && (
              <p style={{ margin: 0, lineHeight: '1.45', color: '#444' }}>{event.description}</p>
            )}
            {event.url && event.url !== 'Not Specified' && (
              <a 
                href={event.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  alignSelf: 'flex-start',
                  background: 'var(--rafv-gradient)',
                  color: '#fff',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontWeight: 600,
                  fontSize: '12px',
                  textDecoration: 'none',
                  marginTop: '4px',
                  boxShadow: '0 4px 10px rgba(44, 110, 250, 0.2)'
                }}
              >
                Event Details
              </a>
            )}
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 2: Update `formatMessageContent` parser logic**
  Replace `formatMessageContent` implementation to look for `[EVENT]` blocks and parse them.
  
  ```tsx
  function formatMessageContent(content: string, isUser: boolean) {
    if (isUser) {
      return <>{content}</>; // No rich formatting needed for user messages
    }
  
    const eventRegex = /\[EVENT\]([\s\S]*?)\[\/EVENT\]/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let keyIndex = 0;
  
    while ((match = eventRegex.exec(content)) !== null) {
      const matchIndex = match.index;
      
      // 1. Parse text before the event block
      if (matchIndex > lastIndex) {
        const textBefore = content.substring(lastIndex, matchIndex);
        elements.push(<span key={`text-${keyIndex++}`}>{formatTextWithMarkdown(textBefore)}</span>);
      }
  
      // 2. Parse the event block fields
      const blockContent = match[1];
      const lines = blockContent.split('\n');
      const eventObj: ParsedEvent = {
        title: '',
        org: '',
        date: '',
        location: '',
        url: '',
        description: ''
      };
  
      lines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim().toLowerCase();
          const value = line.substring(colonIndex + 1).trim();
          if (key === 'title') eventObj.title = value;
          else if (key === 'org') eventObj.org = value;
          else if (key === 'date') eventObj.date = value;
          else if (key === 'location') eventObj.location = value;
          else if (key === 'url') eventObj.url = value;
          else if (key === 'description') eventObj.description = value;
        }
      });
  
      elements.push(<EventCard key={`event-${keyIndex++}`} event={eventObj} />);
      lastIndex = eventRegex.lastIndex;
    }
  
    // 3. Parse remaining text after last event block
    if (lastIndex < content.length) {
      const textAfter = content.substring(lastIndex);
      elements.push(<span key={`text-${keyIndex++}`}>{formatTextWithMarkdown(textAfter)}</span>);
    }
  
    return <>{elements}</>;
  }
  
  // Helper for inline markdown bold and links inside remaining text blocks
  function formatTextWithMarkdown(text: string) {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
  
      // Regex for **bold** and [link](url)
      const regex = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
      const parts = [];
      let lastIdx = 0;
      let match;
      let keyIndex = 0;
  
      while ((match = regex.exec(line)) !== null) {
        const matchStart = match.index;
        if (matchStart > lastIdx) {
          parts.push(line.substring(lastIdx, matchStart));
        }
  
        if (match[0].startsWith('**')) {
          parts.push(<strong key={keyIndex++}>{match[2]}</strong>);
        } else {
          parts.push(
            <a
              key={keyIndex++}
              href={match[4]}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--rafv-royal)', textDecoration: 'none' }}
            >
              {match[3]}
            </a>
          );
        }
        lastIdx = regex.lastIndex;
      }
  
      if (lastIdx < line.length) {
        parts.push(line.substring(lastIdx));
      }
  
      elements.push(<p key={idx} style={{ margin: '0 0 6px 0' }}>{parts.length > 0 ? parts : line}</p>);
    });
  
    return elements;
  }
  ```

- [ ] **Step 3: Update Chatbot typing indicator rendering**
  Modify lines 735-741 in `CalendarChatbot.tsx` so that the typing indicator remains visible whenever `isLoading` is true AND the response is either completely empty or has just started generating (e.g. within the first few characters before a parsed block starts).
  
  ```tsx
  {isLoading && (messages[messages.length - 1]?.content ?? '').trim().length < 5 && (
    <div className="message bot" id="typing">
      <div className="typing">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    </div>
  )}
  ```

- [ ] **Step 4: Commit frontend changes**
  ```bash
  git add "Inspiration Folder/src/components/CalendarChatbot.tsx"
  git commit -m "feat(frontend): parse [EVENT] blocks to collapsible EventCard accordion cards"
  ```

---

### Task 3: Local Verification

- [ ] **Step 1: Build the frontend locally to ensure no compilation/TypeScript errors**
  Run: `npm run build --prefix "Inspiration Folder"`
  Expected: Successful compilation without errors.
