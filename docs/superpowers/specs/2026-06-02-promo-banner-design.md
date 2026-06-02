# Design Spec: Standalone Interactive Promo Banner

Design specification for creating a standalone, high-fidelity promo banner for the RAFV Community Event Calendar.

## Overview
The goal is to create a copy-pasteable HTML block designed as a banner promoting the RAFV Community Event Calendar on external websites. The banner will capture the "Event Horizon" aesthetic of the calendar application, utilizing a shifting holographic gradient background and an interactive, responsive grid of pulsing and glowing dots that react to mouse hover.

To ensure maximum compatibility and zero performance lag, the banner will be self-contained in a single, lightweight HTML file using vanilla CSS and an optimized HTML5 Canvas for rendering the interactive dot grid.

---

## User Review Required
No major architectural risks are associated with this feature as it is a standalone, isolated promotional component. However, the user should verify:
* **Host Compatibility**: The component is self-contained. When embedding in some platforms (e.g., WordPress, HubSpot, Shopify), it should be inserted via an Custom HTML block or `iframe`.
* **Copy & Link**: The copy is configured as:
  * Headline: *RAFV Community Event Calendar*
  * Subheadline: *Your centralized hub for regional REALTOR® and community partner events.*
  * Button: *Explore Calendar* -> `https://community-calendar.rafv.realtor`

---

## Proposed Changes

### Standalone Banner Component
#### [NEW] [promo-banner.html](file:///c:/Users/JacobBranscom/OneDrive%20-%20Realtors%20Association%20of%20the%20Fox%20Valley/Documents/Community%20Calendar/promo-banner.html)
A standalone file containing:
1. **HTML Layout**: Container section, overlay scanlines/gloss, absolute-positioned canvas, and central copy overlay.
2. **CSS Styles**: Full-width styling, google fonts import, color variables, holographic animation keyframes, button transitions.
3. **JS Canvas Engine**: Mouse tracking, delta calculation, responsive grid generator, dynamic dot pulse/glow drawer.

---

## Technical Details

### Shifting Holographic Background (CSS)
* Colors utilized: `#020c2e`, `#0d1b8a`, `#1a4fd6`, `#0a9ed1`, `#7b2fff`
* Keyframes: Shifting background position horizontally over a 12s infinite loop:
```css
@keyframes bgShift {
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}
```

### Canvas Dot Grid (JavaScript)
The JS engine performs the following actions:
1. Resizes the canvas to match the container client bounds.
2. Calculates column/row count based on a dot spacing of `24px` to ensure density looks premium on mobile and desktop.
3. Initializes an array of Dot objects with parameters:
   * `x`, `y` coordinates.
   * `baseOpacity` based on row height (denser/brighter at the bottom, dissolving towards the top).
   * `pulseOffset` (randomized phase for organic sine-wave pulsing).
   * `pulseDuration` (randomized speed).
   * `color` based on the horizontal coordinate to match the color zones (Left: cyan/blue, Middle: violet/purple, Right: magenta/orange).
4. Listens to `mousemove` and `mouseleave` relative to the container.
5. In the requestAnimationFrame render loop:
   * Clears the canvas.
   * Calculates individual dot opacity using `baseOpacity + Math.sin(timestamp * pulseSpeed + pulseOffset) * pulseAmplitude`.
   * For each dot, calculates distance to cursor. If distance is less than `200px`:
     * Dynamically scales size up to `1.8x`.
     * Adds a radial glowing blur using canvas `shadowBlur` and `shadowColor` based on the dot's zone color.
     * Increases brightness/opacity.
   * Draws the dot circle.

---

## Verification Plan

### Manual Verification
1. Open the generated `promo-banner.html` directly in a web browser.
2. Check page resizing (resize window to mobile, tablet, and desktop dimensions). Verify grid recalculates correctly and layout remains centered.
3. Verify hover interaction (mouse cursor triggers smooth, high-fidelity glow and size reactions on nearby dots).
4. Verify link behavior (clicking the "Explore Calendar" button opens `https://community-calendar.rafv.realtor` in a new tab).
5. Verify performance (confirm smooth 60fps rendering during fast cursor movements).
