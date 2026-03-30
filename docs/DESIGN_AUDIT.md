# Design Audit: RAFV Community Calendar

**Date:** March 20, 2026
**Status:** High-Fidelity Prototype Phase
**Severity Legend:** 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low

---

## 1. Executive Summary
The RAFV Community Calendar project is in a high-fidelity prototyping phase. There is a clear **identity conflict** between the current codebase (Tech-Noir/Holographic) and the brand documentation (Scholarly/Elegant). While the current UI is visually striking, it suffers from several **Critical/High UX severity issues** related to mobile usability, accessibility, and architectural duplication.

---

## 2. Design System Recommendation (Pro Max Alignment)
Based on the `Local Events & Discovery` domain and `docs/BRAND.md` constraints:

*   **Core Style:** **Scholarly Academia + Kinetic Motion**. 
    *   *Rationale:* Use the timeless elegance of Garamond (from brand) but execute with the snappy, high-energy motion of a modern tech hub.
*   **Palette (RAFV Priority):**
    *   **Primary:** `#003399` (RAFV Navy)
    *   **Secondary:** `#36C2FF` (Vibrant Blue)
    *   **Background:** `#F4F8FF` (Light Ice)
    *   **Border:** `#C8D8F8` (Muted Steel)
*   **Typography:** **EB Garamond** (All text per brand spec). Use **Space Grotesk** sparingly for technical data (times/hashes) to bridge the tech gap.
*   **Key Effects:** Scroll-triggered reveals, "Glass-Clay" hybrid cards for event details, and 150-300ms micro-interactions.

---

## 3. UI Audit: Current vs. Spec
| Element | Current Implementation | Brand/Pro Max Spec | Status |
| :--- | :--- | :--- | :--- |
| **Typography** | DM Sans + Cormorant | EB Garamond (All) | ❌ Mismatch |
| **Hero Style** | Holographic/Scanlines | Scholarly/Elegant | ⚠️ Conflict |
| **Coloring** | Varied (Cyan/Violet) | RAFV Blue (#003399) | ⚠️ Partial |
| **Button Shape** | Rectangular | Pill-shaped (MD3 Mobile) | ❌ Inconsistent |

---

## 4. UX Audit (Severity Ranked)

### 🔴 Critical Issues
*   **Touch Target Size:** View toggles (30x28px) and navigation buttons in the carousel are below the **44x44px** minimum standard. This will lead to high "mis-tap" rates on mobile.

### 🟠 High Severity Issues
*   **Contrast Ratio:** The muted text (`#94a3b8` on white) has a ratio of ~2.5:1. WCAG AA requires **4.5:1**. Secondary information (dates, times, locations) is currently inaccessible to users with visual impairments.
*   **Loading States:** The UI lacks skeleton screens or meaningful loading feedback while Supabase data is being fetched. Users see a blank or "No Events" state for the first 300-1000ms.
*   **Font Legibility:** Interactive links, navigation items, and labels are set at **13px**. The recommended mobile minimum for primary readability is **16px**.

### 🟡 Medium Severity Issues
*   **Focus States:** No visible focus indicators (rings) for keyboard users.
*   **Active States:** Navigation links do not visually indicate the currently active section.
*   **Excessive Motion:** Multiple entrance animations (headline, bar, partners, carousel) may cause "motion fatigue" or distract from the core content.

---

## 5. Architectural Observations
*   **Component Shadowing:** `App.tsx` contains an inline `SearchBar` definition that completely overrides/ignores the modular `components/SearchBar.tsx`.
*   **Monolithic App.tsx:** The main file is bloating with Carousel, Browse, and Filter logic. This will degrade maintainability during Phase 3/4.
*   **State Dependency:** The modular `SearchBar` relies on a `phase` prop that is not clearly integrated into the current navigation state of the main app.

---

## 6. Actionable Next Steps (Prioritized)

1.  **Sync Typography (High Priority):** Update `index.css` to use `EB Garamond` for all text to honor the brand spec immediately.
2.  **Fix Touch Targets (High Priority):** Increase all buttons, toggles, and interactive pills to at least `min-h-[44px]`.
3.  **Modularize Search (Medium Priority):** Delete the inline `SearchBar` in `App.tsx` and integrate `components/SearchBar.tsx`, reconciling the state/props.
4.  **A11y Pass (High Priority):** Update the `--color-muted` token to a darker shade (e.g., `#5A6A85`) to meet WCAG 4.5:1 contrast requirements.
5.  **Skeleton Implementation (Medium Priority):** Add a skeleton grid fallback in `App.tsx` to handle the initial data fetch gracefully.

---

## 7. Pre-Delivery Checklist
*   [ ] No emojis used as icons (use SVG Heroicons/Lucide)
*   [ ] `cursor-pointer` on all clickable elements
*   [ ] Hover states with smooth transitions (150-300ms)
*   [ ] Light mode text contrast 4.5:1 minimum
*   [ ] Focus states visible for keyboard nav
*   [ ] `prefers-reduced-motion` respected
*   [ ] Responsive testing: 375px, 768px, 1024px, 1440px
