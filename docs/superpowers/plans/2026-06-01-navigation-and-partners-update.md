# Navigation Links & Trusted Partners Update Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make navigation links functional with smooth scroll or mailto, and update the Trusted Partners list.

**Architecture:** Use native CSS smooth scrolling by adding `scroll-behavior: smooth` to the HTML tag, pointing navigation anchors in `CalendarView.tsx` to page element IDs (`#browse-events`, `#partners`), and updating the static partners list to include Lazarus House instead of NAHREP and Illinois REALTORS.

**Tech Stack:** React, TailwindCSS, CSS

---

### Task 1: Add Native CSS Smooth Scrolling

**Files:**
- Modify: `Inspiration Folder/src/index.css`

- [ ] **Step 1: Add smooth scrolling behavior to index.css**

Add `scroll-behavior: smooth;` to the `html` element styling:
```css
html,
body {
  width: 100%;
  overflow-x: hidden;
  scroll-behavior: smooth;
}
```

- [ ] **Step 2: Verify compiling**
No errors on dev server console.

- [ ] **Step 3: Commit**
```bash
git add "Inspiration Folder/src/index.css"
git commit -m "style: add native smooth-scrolling behavior to html"
```

---

### Task 2: Configure Navigation Anchor Targets and Hide Trends

**Files:**
- Modify: `Inspiration Folder/src/pages/CalendarView.tsx`

- [ ] **Step 1: Set navigation target IDs and remove Trends**

In the `<nav>` component in `CalendarView.tsx`, update links to:
```tsx
        <div className="nav-links">
          <a href="#browse-events">Events</a>
          <a href="#partners">Partners</a>
          <a href="mailto:hello@rafv.realtor">Contact</a>
        </div>
```

- [ ] **Step 2: Add ID to Partners Section**

Add `id="partners"` to the partners section container:
```tsx
      <section className="partners-section" id="partners">
```

- [ ] **Step 3: Verify compiling**
No errors on dev server console.

- [ ] **Step 4: Commit**
```bash
git add "Inspiration Folder/src/pages/CalendarView.tsx"
git commit -m "feat: configure navigation anchors and hide Trends"
```

---

### Task 3: Update Trusted Partners List

**Files:**
- Modify: `Inspiration Folder/src/pages/CalendarView.tsx`

- [ ] **Step 1: Replace NAHREP and Illinois REALTORS with Lazarus House**

In the `<div className="partners-list">` section of `CalendarView.tsx`, remove NAHREP and Illinois REALTORS, and add Lazarus House using `brand-3`:
```tsx
        <div className="partners-list">
          <div className="partner-logo brand-1">RAFV</div>
          <div className="partner-logo brand-2">NSBAR</div>
          <div className="partner-logo brand-3">Lazarus House</div>
        </div>
```

- [ ] **Step 2: Verify compiling**
No errors on dev server console.

- [ ] **Step 3: Commit**
```bash
git add "Inspiration Folder/src/pages/CalendarView.tsx"
git commit -m "feat: update trusted partners list to include Lazarus House"
```
