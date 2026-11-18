# UI Design System & Architecture Specification: OpenCode Study & Focus Terminal

> **Purpose:** This document serves as a comprehensive UI/UX specification and design system blueprint. Use this guide to refactor or style an existing mobile/web application to strictly match the **"Apple-meets-Terminal" Monospace Aesthetic** defined in the reference implementation (`study_focus_mobile_app_ui`).

---

## 1. Core Design Philosophy & Aesthetic Identity

* **Concept:** "Apple-meets-Terminal" (Clean, functional, developer-centric CLI/TUI aesthetic blended with Apple Human Interface Guidelines semantic colors).
* **Zero Shadows (`box-shadow: none`):** Depth and hierarchy are strictly achieved through **flat surface fills** and **1px hairline borders**, never drop shadows or glows.
* **Sharp, Technical Geometry:** Universal small border-radius (`4px` / `rounded-sm`) across cards, buttons, modals, and inputs.
* **Strict Monospace Typography:** Every single element in the application—headings, body text, buttons, badges, and timers—uses a monospace font family.
* **ASCII & Bracket-Driven Micro-UI:** Instead of traditional icon libraries (like FontAwesome or Lucide), navigation, status indicators, and actions rely on clean ASCII/bracket notation (e.g., `[+]`, `[x]`, `[ ]`, `[>]`, `[||]`, `[H]`, `[S]`, `[T]`, `[I]`, `[P]`, `< Back`).
* **Dual Theme Support:** Warm paper-like Light Mode (`#fdfcfc`) and high-contrast Charcoal Dark Mode (`#201d1d`).

---

## 2. Color System & CSS Design Tokens

### 2.1 Core & Semantic Palette
| Token Name | Hex / Value | Usage |
| :--- | :--- | :--- |
| `--color-ink` | `#201d1d` | Primary dark ink, light-mode primary buttons, dark-mode canvas |
| `--color-canvas` | `#fdfcfc` | Warm off-white primary canvas (Light Mode), dark-mode primary text |
| `--color-body` | `#424245` | Secondary body text (Light Mode) |
| `--color-muted` | `#6e6e73` | Muted labels, timestamps, inactive states (Light Mode) |
| `--color-stone` | `#9a9898` | Muted text in Dark Mode |
| `--color-surface-soft` | `#f5f5f7` | Recessed containers/cards in Light Mode |
| `--color-surface-dark-elevated` | `#302c2c` | Elevated containers/cards in Dark Mode |
| `--color-accent` | `#007aff` | Primary interactive accent, active timer ring, links, Physics tag |
| `--color-accent-hover` | `#0056b3` | Hover state for links/accents |
| `--color-success` | `#30d158` | Completed tasks `[x]`, streak progress bar, Chemistry tag, `[OK]` |
| `--color-warning` | `#ff9f0a` | Active streak label, paused status, Math/Coral tag |
| `--color-danger` | `#ff3b30` | Low-hour chart indicators, destructive states |

### 2.2 Theme Bindings
* **Light Theme (Default):**
  * `--bg-page`: `#f5f5f7`
  * `--bg-canvas`: `#fdfcfc`
  * `--bg-surface`: `#f5f5f7`
  * `--bg-elevated`: `#fdfcfc`
  * `--text-primary`: `#201d1d`
  * `--text-secondary`: `#424245`
  * `--text-muted`: `#6e6e73`
  * `--border-hairline`: `rgba(15, 0, 0, 0.12)`
  * `--border-emphasis`: `#201d1d`
  * `--hover-overlay`: `rgba(15, 0, 0, 0.06)`

* **Dark Theme (`.theme-dark`):**
  * `--bg-page`: `#181616`
  * `--bg-canvas`: `#201d1d`
  * `--bg-surface`: `#302c2c`
  * `--bg-elevated`: `#201d1d`
  * `--text-primary`: `#fdfcfc`
  * `--text-secondary`: `#d4d2d2`
  * `--text-muted`: `#9a9898`
  * `--border-hairline`: `rgba(253, 252, 252, 0.14)`
  * `--border-emphasis`: `#646262`
  * `--hover-overlay`: `rgba(253, 252, 252, 0.07)`

---

## 3. Typography & Layout Rules

* **Font Stack:** `'Berkeley Mono', 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace`
* **Type Scale:**
  * **Timer Display:** `34px`, Bold (`700`), `tracking-tight`
  * **Screen Greeting / Hero Heading:** `18px`, Bold (`700`), `tracking-tight`
  * **Modal / Top Bar Title:** `14px`, Bold (`700`)
  * **Section Headers:** `13px`, Bold (`700`), prefixed with `[+]` (e.g., `[+] Today's Schedule`)
  * **Body / Card Titles:** `12px` – `12.5px`, Medium (`500`) or Bold (`700`)
  * **Metadata / Timestamps / Nav Labels:** `10px` – `11px`, Regular (`400`) or Medium (`500`)
* **Spacing & Geometry:**
  * **Border Radius:** Strictly `4px` (`--radius-sm`) on all rectangular elements. Only circular avatars, status dots, and SVG progress rings use `9999px` / circular geometry.
  * **Shadows:** Globally disabled (`box-shadow: none !important`).
  * **Viewport / Mobile Container:** Designed around a `356px × 744px` mobile viewport with `1px solid var(--border-emphasis)` frame border, scrollable content body (hidden scrollbars), fixed top status bar (`28px` height), and fixed bottom navigation bar.

---

## 4. Reusable UI Components

### 4.1 Surface Containers
* **`.oc-surface` (Recessed Card):** `background-color: var(--bg-surface)`, `border: 1px solid var(--border-hairline)`, `border-radius: 4px`. Used for summary cards, strips, and chart containers.
* **`.oc-elevated` (Elevated Card):** `background-color: var(--bg-elevated)`, `border: 1px solid var(--border-hairline)`, `border-radius: 4px`. Used for interactive task items, modals, and sub-cards inside `.oc-surface`.

### 4.2 Semantic Left Accent Bars (Task Cards)
Task items feature a `3px` solid left border indicating category/priority:
* **Accent / Blue:** `border-left: 3px solid #007aff`
* **Success / Mint:** `border-left: 3px solid #30d158`
* **Warning / Coral:** `border-left: 3px solid #ff9f0a`

### 4.3 Buttons & Interactive Controls
* **Primary Button (`.oc-btn-primary`):** High-contrast inverted fill (`#201d1d` bg with `#fdfcfc` text in Light Mode; `#fdfcfc` bg with `#201d1d` text in Dark Mode), `1px` solid border, `4px` radius, `padding: 4px 14px`, `font-size: 12px`, `font-weight: 500`. Label style: `[+ Add Task]`, `[||] PAUSE`.
* **Secondary Button (`.oc-btn-secondary`):** Transparent background, `1px solid var(--border-hairline)`, `4px` radius, `padding: 4px 12px`, `font-size: 12px`. Hover adds `var(--hover-overlay)`. Label style: `[x]`, `Cancel`, `[<<]`, `[>>]`.
* **README Links (`.oc-link`):** Colored `#007aff`, underlined (`text-decoration: underline; text-underline-offset: 3px`), used for `< Back` and month pagination `<` / `>`.
* **Terminal Toggle Switch (`.toggle-pill`):** Rectangular `44px × 22px` box (`4px` radius) with `1px solid var(--border-emphasis)`. Contains a `14px × 14px` square-ish knob (`2px` radius) that translates `22px` horizontally when `.on` (`#007aff` fill).

### 4.4 Device Chrome (Top & Bottom Bars)
* **Top Terminal Status Bar (`.terminal-header-bar`):** `28px` height, `var(--bg-surface)`, bottom hairline border, `11px` muted text showing route path on the left (`opencode://study/{screenKey}`) and system status on the right (`9:41 [100%]`).
* **Bottom Navigation Bar (`.bottom-nav`):** `var(--bg-surface)`, top hairline border, 5 equal-width flex buttons:
  1. `[H]` `Home`
  2. `[S]` `Schedule`
  3. `[T]` `Timer`
  4. `[I]` `Insights`
  5. `[P]` `Profile`
  * *Active State:* `var(--bg-elevated)` background, `1px solid var(--border-hairline)`, bold text, underlined label.

---

## 5. Screen-by-Screen Layout Specifications

### Screen 1: Home (`opencode://study/home`)
1. **Header:** Left: `Hello, Alex!` (`18px` bold) + `[+] This Week // workspace` (`12px` muted). Right: Circular initials avatar (`32px`, `AC`, `1px` border) + date range `Oct 16 - 22` (`10px` muted). Bottom hairline divider.
2. **Weekly Streak Card (`.oc-surface`):**
   * Top row: `[+] Weekly Streak` | `ACTIVE` (bold `#ff9f0a`).
   * Middle row: `5 days` (`18px` bold) | `Progress: XX%` (`11px` muted).
   * Visual progress bar (`8px` height, `#30d158` fill) + ASCII block progress bar below (`[█████████████████░░░░░░░░░]`).
3. **7-Day Horizontal Strip (`.oc-surface`):** 7-column grid (`Mon 16` to `Sun 22`). Selected day gets inverted high-contrast fill (`#201d1d` bg / `#fdfcfc` text in Light Mode) and underlined date number.
4. **Today's Schedule Section:**
   * Header: `[+] Today's Schedule` + item count (`3 items`).
   * Task list (`.oc-elevated` + left semantic border): Left checkbox (`[x]` in green or `[ ]` in muted), timestamp & duration (`09:00 AM // (2h)`), task title (strikethrough + `opacity-60` when done), right action badge (`[>]` play button in `#007aff` border, `DONE` in green, or `WAIT` in muted).
5. **Footer CTA:** Right-aligned `[+ Add Task]` primary button.

### Screen 2: Schedule (`opencode://study/schedule`)
1. **Top Navigation:** `< Back` (`.oc-link`) | `Schedule` (`14px` bold) | spacer.
2. **Subheader:** `[+] Weekly Planner` | `UTC-5`.
3. **Calendar Strip Card (`.oc-surface`):** Month switcher header (`<` `October 2023` `>`) over a hairline border, followed by the 7-day selector grid.
4. **Vertical Hairline Timeline:**
   * Left column (`16px` wide): Colored circular node (`10px` diameter) connected vertically by a `1px` solid line (`var(--border-emphasis)`).
   * Right column: `.oc-elevated` card with semantic left border, time, bold short title, and right-aligned `[x]` / `[ ]` toggle.
   * Bottom row: `*` node on the left + `[+ Add Task]` primary button on the right.

### Screen 3: Focus Timer (`opencode://study/timer`)
1. **Top Navigation:** `< Back` | `Focus Session` | spacer.
2. **Active Subject Banner (`.oc-surface.accent-bar-blue`):** Displays `ACTIVE_TARGET:` (`10px` muted), subject name (`12px` bold), and `[25m]` badge on the right.
3. **Circular SVG Progress Ring:**
   * `200px × 200px` `.oc-surface` circular container.
   * Flat SVG ring (`stroke-width="6"`, `stroke-linecap="butt"`, no gradients/glows): background track in `var(--border-hairline)`, active arc in `#007aff`.
   * Center readout: `REMAINING` (`10px`), countdown `21:45` (`34px` bold), status `[RUNNING]` (`#30d158`) or `[PAUSED]` (`#ff9f0a`).
4. **Status & Media Controls:**
   * Prompt text: `> Stay focused!` or `> Session paused.`.
   * Button row: `[<<]` (Reset), `[||] PAUSE` / `[>] START` (Primary), `[>>]` (Skip 1 min).
5. **Ambient Audio Card (`.oc-surface`):** `[~] Music/Sounds` + `Lo-Fi Study Beats (ON/OFF)` on the left, rectangular `.toggle-pill` switch on the right.

### Screen 4: Study Insights (`opencode://study/insights`)
1. **Top Navigation:** `< Back` | `Study Insights` | spacer.
2. **Hours Studied Bar Chart (`.oc-surface`):**
   * Header: `[+] Hours studied` | `Goal: 5 hrs/day` (`#007aff`).
   * Y-axis (`5` down to `0`) with horizontal hairline grid lines (top `5` line is dashed `#007aff`).
   * Solid flat vertical bars (`14px` width, `rounded-t-sm`, zero gradients) colored semantically by day (`#007aff`, `#30d158`, `#ff9f0a`, `#ff3b30`) above X-axis day labels (`Mon`–`Sun`).
3. **Subject Breakdown (`.oc-surface`):**
   * Header: `[+] Subject Breakdown`.
   * 3-column grid of `.oc-elevated` cards, each containing a `56px × 56px` flat SVG donut ring (`stroke-width="5"`, `stroke-linecap="butt"`), center percentage (`45%`, `90%`, `75%`), and subject label below.
4. **Top Achiever Banner (`.oc-elevated.accent-bar-mint`):** `[+] Top Achiever` + `24.5 Hours Studied this week!` on the left; `RANK #1` badge in `#30d158` on the right.

### Screen 5: Profile (`opencode://study/profile`)
1. **Top Navigation:** `< Back` | `Profile` | spacer.
2. **User Profile Card (`.oc-surface`):**
   * Circular initials avatar (`46px`, `AC`), `Alex Carter` (`14px` bold), `Level 15 // XP 720/1000` (`11.5px` muted).
   * Full-width `8px` XP progress bar (`#007aff` fill).
3. **Achievements Grid:**
   * Header: `[+] Achievements`.
   * 3-column grid of `.oc-surface` cards with bracketed ASCII badges (`[***]` in `#ff9f0a`, `[#1]` in `#30d158`, `[OWL]` in `#007aff`) and two-line titles (`Streak King`, `Study Star`, `Late Night Owl`).
4. **Settings List (`.oc-elevated`):**
   * Header: `[+] Settings`.
   * Stacked full-width rows separated by `1px` top hairline borders: `[01] Study Goals`, `[02] Notifications`, `[03] App Themes` (toggles Light/Dark theme), `[04] Support`, each with a right-aligned `>` link indicator.

---

## 6. Modals & Feedback Overlays

* **Add Task Dialog Modal:** Centered overlay (`bg-[#201d1d]/60`) containing a `336px` `.oc-elevated` box with `1px solid var(--border-emphasis)`. Features `[+] Add Study Task` header, `[x]` close button, monospace `<input>` fields (`Subject & Topic`, `Start Time`, `Duration`), 3-column semantic tag selector (`[Accent]`, `[Success]`, `[Warning]`), and `Cancel` / `[+ Add to Schedule]` actions.
* **Terminal Toast Banner:** Fixed bottom pill (`4px` radius, `.oc-elevated`, `1px solid var(--border-emphasis)`) displaying `[OK]` in bold `#30d158` followed by concise status text.

---

## 7. Implementation Checklist for AI Code Generation

When applying this UI to an existing application, enforce these strict rules:
1. **Override Global Fonts & Shadows:** Force `font-family: 'JetBrains Mono', monospace` and `box-shadow: none` on `*`.
2. **Replace Icons with ASCII Markers:** Convert all SVG/icon-font UI icons into bracketed monospace strings (`[H]`, `[+]`, `[x]`, `[>]`, `[||]`, `< Back`). Keep SVGs strictly for data visualizations (progress rings and bar charts).
3. **Flatten All Surfaces:** Remove gradients, glassmorphism (`backdrop-blur`), and soft rounded corners (`rounded-xl`, `rounded-2xl`). Replace them with `4px` radius, flat CSS variables (`--bg-surface`, `--bg-elevated`), and `1px` hairline borders.
4. **Support Light & Dark Tokens:** Bind all colors to the CSS custom properties in Section 2 so toggling `.theme-dark` cleanly switches between Warm Canvas (`#fdfcfc`) and Dark Terminal (`#201d1d`).