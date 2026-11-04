# Hope, Inc. ERP - Design System

This document contains the core design tokens and components for the Login and Sign Up screens.

## 1. Colors

### Text & Borders
*   **Main Text (Light):** `#00072D`
*   **Main Text (Dark):** `#eef2ff`
*   **Muted Text (Light):** `#5a6488`
*   **Muted Text (Dark):** `#97a3d0`
*   **Border/Line (Light):** `#dbe2f5`
*   **Border/Line (Dark):** `#1a2c78`
*   **Accent (Vivid Blue):** `#1A43BF`
*   **Accent 2 (Darker Blue):** `#123499`
*   **Link (`--ac`):** `#1A43BF` (no hover color change)

### Backgrounds & Shapes
*   **Main Background (Light):** `#F2F5FD`
*   **Main Background (Dark):** `#00072D`
*   **Surface / Card (Light):** `#ffffff`
*   **Surface / Card (Dark):** `#051650`
*   **Highlight / Subtle Fill (Light):** `#E8EEFF`
*   **Highlight / Subtle Fill (Dark):** `#0A2472`
*   **Primary Gradient:** `linear-gradient(135deg, #1A43BF, #123499)`
*   **Logo Gradient:** `linear-gradient(135deg, #1A43BF, #5b82ff)`

### Status Colors
*   **Success / OK:** `#0a8f5b` (light) / `#3ddc97` (dark)
*   **Error / Danger:** `#c9304a` (light) / `#ff6b81` (dark)
*   **Error Background Tint:** `color-mix` based on Error/Danger token

### Shadow
*   **Shadow (Light):** `0 20px 60px rgba(10,36,114,.14)`
*   **Shadow (Dark):** `0 20px 60px rgba(0,0,0,.45)`

---

## 2. Typography

*   **Font Family:** `Manrope, system-ui, sans-serif` (Weights: 400, 500, 700, 800)
*   **Base Body:** `500 15px/1.55` (Medium weight, 15px, line-height 1.55)
*   **Hero H1:** `clamp(46px, 8.5vw, 112px)` / Weight 800 / Line-height 0.98
*   **Section H2:** `clamp(24px, 3vw, 36px)` 
*   **Big Section H2 (`.big`):** `clamp(30px, 4.4vw, 54px)`
*   **Card H3:** `19px` (feature cards), `21px` (module cards)
*   **Labels:** `12px` / Weight 700 / Color `--mu`
*   **Small Text (Notes/Hints):** `12px` / Weight 400 / Color `--mu`
*   **Buttons:** Inherit base body, Weight 700

---

## 3. Core Components

### Form Card (`.box` / `#ab`)
*   **Container:** Surface background (`--sf`), 1px border (`--ln`).
*   **Radius:** `22px` (Rounded corners).
*   **Padding:** `32px`.
*   **Shadow:** `var(--sh)`.
*   *Note: No gradient header, flat card design.*

### Text Boxes (`input`, `select`)
*   **Background:** `--bg` (subtle tinted).
*   **Border:** `1px solid var(--ln)` (light blue-gray).
*   **Radius:** `10px` (Rounded corners, **not** pill-shaped).
*   **Padding:** `11px 13px`.
*   **Focus State:** Border becomes `--ac` + `box-shadow: 0 0 0 3px` (soft accent glow).

### Error Text Box
*   **Border:** `--er` (Red).
*   **Background:** Red tint (`color-mix`).
*   **Text/Placeholder:** Red italic text inside the box.
*   *Note: Required message is shown via placeholder inside the box, not as text below it.*

### Buttons (`.btn`)
*   **Base:** 1px border (`--ln`), Surface bg, `10px` radius, weight 700.
*   **Primary (`.pri`):** Gradient `#1A43BF` to `#123499`, no border, white text.
*   **Hover:** Subtle `translateY(-1px)` and border shifts to `--ac`.

### Error Messages & Toasts
*   **System/Wi-Fi Error:** Top-right toast notification. Red left border, "!" icon, auto-dismisses. *(Not an inline card alert).*
*   **Input Error:** Red border + red tinted background + red italic placeholder. *(No separate red text line below the field).*

### Links (`.lk`)
*   **Color:** `#1A43BF` (Azure).
*   **Hover:** No underline, no color change (flat).

### Tables (`.tw`, `table`)
*   **Container:** Surface bg, 1px border, `16px` radius, horizontal scroll.
*   **Headers:** Muted color, 12px, bold.
*   **Rows:** 13.5px font, `11px 14px` padding.
*   **Deleted Rows:** Light red tint background.

### Modals (`.ov`, `.md`)
*   **Overlay:** `rgba(0,7,45,.55)` with blur.
*   **Card:** Surface bg, `20px` radius, shadow.

### Checkbox (`.cb input[type=checkbox]`)
*   **Size:** 18x18px, `5px` radius.
*   **Checked State:** Gradient `#1A43BF` to `#123499` background with white CSS checkmark.

### Theme Support
*   Full **Light / Dark mode** support via `prefers-color-scheme` and `[data-theme]` toggles.
*   *Note: Theme preference is not saved in localStorage on reload.*
