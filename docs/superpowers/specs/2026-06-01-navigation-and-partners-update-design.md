# Navigation Links & Trusted Partners Update

This specification outlines the technical plan to make the top-right navigation links functional, hide the "Trends" link, and update the "Trusted Partners" section.

## Proposed Changes

### CSS / Styling

#### [MODIFY] [index.css](file:///c:/Users/JacobBranscom/OneDrive%20-%20Realtors%20Association%20of%20the%20Fox%20Valley/Documents/Community%20Calendar/Inspiration%20Folder/src/index.css)
- Add native smooth scrolling configuration to the `html` element:
  ```css
  html {
    scroll-behavior: smooth;
  }
  ```

### Components & Layout

#### [MODIFY] [CalendarView.tsx](file:///c:/Users/JacobBranscom/OneDrive%20-%20Realtors%20Association%20of%20the%20Fox%20Valley/Documents/Community%20Calendar/Inspiration%20Folder/src/pages/CalendarView.tsx)
- Modify the `<nav>` links:
  - Keep "Events" and point to `#browse-events`.
  - Keep "Partners" and point to `#partners`.
  - Remove the "Trends" link.
  - Keep "Contact" and point `href` to `mailto:hello@rafv.realtor`.
- Add `id="partners"` to `<section className="partners-section">` so it can be targeted by hash linking.
- Update the `<div className="partners-list">` section:
  - Keep "RAFV" and "NSBAR".
  - Temporarily remove "NAHREP" and "Illinois REALTORS".
  - Add "Lazarus House" with the `brand-3` branding class.

## Verification Plan

### Manual Verification
- Check the navigation links on the local development server at `http://localhost:5173/`.
- Verify clicking "Events" smooth-scrolls to the events browsing container.
- Verify clicking "Partners" smooth-scrolls to the partners list.
- Verify "Trends" is hidden from the header.
- Verify clicking "Contact" opens the mail client addressed to `hello@rafv.realtor`.
- Verify the partners section displays "RAFV", "NSBAR", and "Lazarus House" in purple.
