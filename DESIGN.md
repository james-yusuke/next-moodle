# next-moodle — Midnight Ledger Design System

## 0. Research Log

- **Embedded references (2026-07-21):** shortlisted Linear, Raycast, and Vercel for a precise student cockpit; selected `soft-skill.md` as the craft discipline and `linear.app.md` as the primary system reference. Linear contributes dark-native luminance hierarchy, dense information rhythm, and restrained indigo. Raycast contributes the paired outer-ring/inset-highlight material used on controls. Vercel was not selected because its stark black/white contrast is too severe for long academic sessions.
- **Local product reference:** the untouched `create-next-app` surface was inspected before changes. It supplied no reusable component anatomy or product-specific visual language, so no stock-Moodle or starter styling is carried forward.
- **Framework reference:** the installed Next.js 16.2.10 guides for App Router layouts/pages, global CSS and Tailwind v4, `next/font`, metadata, Playwright, environment variables, TypeScript, `next/script`, and `instrumentation-client.ts` were read before implementation.
- **Real-product/image research:** no live-site clone or generated screen is the target for T1. The approved brief already fixes the direction and asks for a primitive system rather than a product screen; live-screen harvesting and Imagen drafts are deferred until a product composition needs a visual reference. This is documented research debt, not permission to improvise product screens.
- **Designpowers synthesis:** accessibility outranks taste; the initial personas, cognitive constraints, state grammar, debt policy, and handoff requirements below are part of the implementation contract.

## 1. Atmosphere & Identity

Midnight Ledger is a quiet learning command surface: dark-first, precise, and calm under information load. It should feel like a midnight workbench with a disciplined ledger grid, never like stock Moodle and never like a neon gaming dashboard. Its signature is the **indigo edge signal**: graphite surfaces use paired hairline rims and a faint inset highlight, while indigo appears only where the learner can act, focus, or orient. Light mode uses layered blue-gray paper; repeated pure-white cards are forbidden.

The memorable interaction is focus moving through a dense interface: a crisp indigo ring and slight luminance lift make the next action obvious without moving layout. Product copy is direct, supportive Japanese or English; it names the action, consequence, and recovery path.

## 2. Color

### Semantic palette

| Role / token | Light | Dark | Usage |
|---|---:|---:|---|
| `--surface-canvas` | `#E9EDF5` | `#07090F` | Page canvas |
| `--surface-primary` | `#F3F5FA` | `#0D111A` | Primary content surface |
| `--surface-secondary` | `#EDF1F7` | `#101522` | Rows and rail |
| `--surface-elevated` | `#F8F9FC` | `#141A27` | Menus and emphasized surfaces |
| `--surface-inset` | `#E2E7F0` | `#090C13` | Recessed controls and tracks |
| `--text-primary` | `#161B26` | `#F3F5FA` | Headlines and body |
| `--text-secondary` | `#51586A` | `#A9AFBF` | Supporting copy |
| `--text-tertiary` | `#626A7D` | `#747B8E` | Metadata and placeholders |
| `--text-disabled` | `#9AA0AD` | `#5D6474` | Disabled-only text |
| `--border-subtle` | `#E2E5ED` | `rgba(255, 255, 255, 0.055)` | Quiet separation |
| `--border-default` | `#D3D8E3` | `rgba(255, 255, 255, 0.090)` | Component containment |
| `--border-strong` | `#B8C0CF` | `rgba(255, 255, 255, 0.160)` | Active containment |
| `--accent-soft` | `#EEF0FF` | `#1D203D` | Selected background |
| `--accent-400` | `#6675E8` | `#9BA5FF` | Hover and focus |
| `--accent-500` | `#5564D9` | `#7C89FF` | Primary action |
| `--accent-600` | `#4652C4` | `#5D68D8` | Pressed action |
| `--accent-contrast` | `#FFFFFF` | `#FFFFFF` | Text on accent |
| `--status-success` | `#19764B` | `#45C486` | Complete / available |
| `--status-success-soft` | `#E8F6EF` | `#112B22` | Success surface |
| `--status-warning` | `#9A5B13` | `#E6A451` | Due soon / caution |
| `--status-warning-soft` | `#FFF4E5` | `#302315` | Warning surface |
| `--status-error` | `#B4384B` | `#F06B7B` | Error / overdue |
| `--status-error-soft` | `#FCECEF` | `#35171E` | Error surface |
| `--status-info` | `#3668B2` | `#75A7F7` | Neutral information |
| `--status-info-soft` | `#EAF2FD` | `#13243C` | Information surface |

### Theme contract

- `:root` carries the dark token set so uninitialized rendering is safe and dark-first.
- Theme mode is one of `system`, `light`, or `dark`, persisted under `next-moodle-theme`.
- With no saved preference, `dark` is the default. A saved `system` preference still resolves `prefers-color-scheme` before hydration.
- `color-scheme` follows the resolved mode so native form controls remain coherent.
- Accent is functional only: links, focus, selection, and primary actions. It is never a decorative page wash.
- Status color is never the sole signal; pair it with an icon and explicit label.

## 3. Typography

### Families

- **Primary:** Geist Variable, then `-apple-system`, `BlinkMacSystemFont`, `"Hiragino Sans"`, `"Yu Gothic UI"`, `"Yu Gothic"`, `"Noto Sans JP"`, `sans-serif`.
- **Monospace:** Geist Mono, then `"SFMono-Regular"`, `Consolas`, `"Liberation Mono"`, `monospace`.
- Geist is bundled and loaded locally through `geist/font`; Japanese glyphs fall through to the operating system font stack without a remote request.
- Enable `kern`, `liga`, `calt`, and `ss03` where available. Japanese text uses natural glyph spacing; do not force Latin tracking onto CJK runs.
- Times, dates, percentages, grades, counts, and durations use `font-variant-numeric: tabular-nums`.

### Type scale

| Token | Size / line-height | Weight | Tracking | Usage |
|---|---|---:|---:|---|
| `--type-display` | `clamp(2rem, 4vw, 3rem) / 1.05` | 560 | `-0.035em` | Showcase or page statement |
| `--type-h1` | `2rem / 1.15` | 560 | `-0.028em` | Page title |
| `--type-h2` | `1.5rem / 1.25` | 560 | `-0.018em` | Section title |
| `--type-h3` | `1.125rem / 1.35` | 560 | `-0.010em` | Card title |
| `--type-body-lg` | `1.0625rem / 1.65` | 400 | `0` | Introductory copy |
| `--type-body` | `1rem / 1.6` | 400 | `0` | Default reading |
| `--type-body-sm` | `0.875rem / 1.5` | 430 | `0` | Secondary information |
| `--type-label` | `0.8125rem / 1.35` | 560 | `0.005em` | Controls and labels |
| `--type-caption` | `0.75rem / 1.4` | 500 | `0.018em` | Metadata |

Headings use `text-wrap: balance` with a readable maximum width. Body copy uses `text-wrap: pretty`. Japanese titles must not create a one-character orphan; lower the size or widen the container before inserting manual breaks.

## 4. Spacing & Layout

### Spacing tokens

The base unit is 4px. Intent must use this bounded scale:

| Token | Value | Typical use |
|---|---:|---|
| `--space-1` | `4px` | Icon detail |
| `--space-2` | `8px` | Tight inline cluster |
| `--space-3` | `12px` | Compact control gap |
| `--space-4` | `16px` | Standard inset |
| `--space-5` | `20px` | Comfortable inset |
| `--space-6` | `24px` | Card inset / section stack |
| `--space-8` | `32px` | Group separation |
| `--space-10` | `40px` | Page gutter at mid widths |
| `--space-12` | `48px` | Section break |
| `--space-16` | `64px` | Major rhythm |

Browser mechanics such as `clamp()`, percentages, intrinsic sizes, safe-area insets, and `minmax()` may remain raw when they express responsiveness rather than design intent.

### Shape and grid

- Radii are deliberately limited: **8px** (`--shape-control`) for buttons/fields, **12px** (`--shape-card`) for cards/menus, **18px** (`--shape-panel`) for major panels. Full circles/pills are allowed only for icon buttons, status dots, and compact badges.
- Phosphor icons use `regular` weight. Thin line icons are not part of this system.
- Content max width is 1200px. Page gutters are 16px mobile, 24px tablet, and 32px desktop.
- Showcase/content grids use `minmax(min(18rem, 100%), 1fr)` so unbroken strings cannot force overflow.
- One surface owns scrolling. Nested panels must declare a reason before adding an independent scroll region.

### Navigation principles for product lanes

- **Desktop (>= 1024px):** a compact left rail with brand/home at top, the four primary destinations in the middle, and account/theme utilities at the bottom. Labels remain visible; icons do not become memory tests. Active state uses accent edge + surface lift, not color alone.
- **Mobile (< 768px):** a fixed four-item bottom navigation for Dashboard, Courses, Calendar, and Notifications. Each target is at least 44x44px, respects safe-area insets, and uses icon + short label. Secondary destinations live in contextual menus, never a fifth compressed tab.
- **Tablet:** choose rail or bottom navigation based on available content width, not device identity. At 768px the content must remain usable in either orientation.

## 5. Components & State Grammar

Every primitive is a real semantic element, exported from `components/ui`, and demonstrated at `/dev/ui` before product composition.

### Button

- **Anatomy:** `<button>` + optional leading icon + label + optional busy indicator.
- **Variants:** primary, secondary, ghost, danger; compact and standard density.
- **States:** default, hover, active, focus-visible, disabled, loading. Loading preserves width, sets `aria-busy`, and prevents duplicate activation.
- **Motion:** transform down on press and opacity/luminance change on hover; no layout animation.

### IconButton

- **Anatomy:** 44x44px minimum `<button>` + Phosphor icon; accessible name is mandatory.
- **Variants:** neutral and accent. States match Button.
- **Rule:** no emoji, unlabeled glyph, or icon-only destructive action without an explicit accessible label.

### Field

- **Anatomy:** visible `<label>`, optional description, input, and a stable message slot.
- **States:** default, hover, focus-visible/focus-within, filled, read-only, disabled, error, success.
- **Recovery:** error copy says what failed and how to fix it; focus is not stolen while typing.

### Badge

- **Anatomy:** inline text plus optional icon/status dot.
- **Variants:** neutral, accent, success, warning, error, info.
- **Rule:** status is written in words and is not communicated by color alone.

### Surface

- **Anatomy:** optional eyebrow, title, body, actions; semantic element is chosen by the caller.
- **Variants:** base, raised, inset. Cards use 10px; major grouped panels use 16px.
- **Material:** paired outer ring, inset top highlight, and tonal step. Avoid a generic heavy drop shadow or one-layer blur.

### Notice

- **Anatomy:** semantic icon, short heading, concise body, optional recovery action.
- **Variants:** info, success, warning, error.
- **Accessibility:** `role="status"` for non-urgent updates; `role="alert"` only when immediate attention is required.

### Skeleton

- **Anatomy:** quiet blocks matching the destination geometry.
- **State:** `aria-hidden`; the parent names loading state for assistive technology.
- **Motion:** a low-contrast opacity pulse only. Reduced motion shows a static tonal block.

### ThemeControl

- **Anatomy:** three-item segmented control for System, Light, Dark.
- **States:** hover, active/selected, focus-visible. Selection uses `aria-pressed` and a text label.
- **Behavior:** updates the document synchronously, persists the mode, and follows system changes while in System mode.

### Loading, empty, and error composition

- **Loading:** show stable page chrome immediately, a textual status for screen readers, and skeletons only where data will land. Never block the whole shell with a spinner.
- **Empty:** distinguish first-use (`No upcoming work`) from filtered-empty (`No items match these filters`) and capability-empty (`This Moodle service is unavailable`). Offer one relevant next action; never blame the learner.
- **Error:** title what failed, preserve safe context, give a specific recovery action, and disclose when the learner must continue in Moodle. Technical identifiers remain out of learner-facing copy.

## 6. Motion & Interaction

| Token | Duration / easing | Usage |
|---|---|---|
| `--motion-instant` | `100ms cubic-bezier(0.2, 0, 0, 1)` | Press feedback |
| `--motion-fast` | `140ms cubic-bezier(0.2, 0, 0, 1)` | Hover and focus emphasis |
| `--motion-standard` | `220ms cubic-bezier(0.2, 0.8, 0.2, 1)` | Theme/content-state settling |

- Animate only `transform` and `opacity`. Color and shadow may change instantly with the same state; never transition layout, dimensions, position, margin, or padding.
- Motion explains interaction or state. Non-interactive decoration does not animate.
- `prefers-reduced-motion: reduce` sets effective duration to 1ms and removes transforms/pulses.
- Focus is always visible and at least a 2px outline with 2px offset. Pointer hover is enhancement, never the only affordance.

## 7. Depth & Surface

The strategy is **tonal shift plus paired rims**.

| Token | Recipe | Usage |
|---|---|---|
| `--shadow-control` | inset top highlight + quiet outer edge + lower inset shade | Buttons and fields |
| `--shadow-surface` | outer graphite ring + inset top highlight | Cards |
| `--shadow-elevated` | surface recipe + broad low-opacity ambient shadow | Popovers / raised showcase surface |
| `--shadow-focus` | two-stage indigo ring | Keyboard focus |

Dark elevation moves `#08090D -> #0E1017 -> #141722 -> #1A1E2B`; light elevation moves `#F5F6FA -> #FFFFFF`, with cool gray inset surfaces. Backdrop blur is reserved for future fixed overlays and must never be placed on scrolling content.

## 8. Accessibility Constraints, Personas, Debt & Handoff

### Accessibility constraints

- Target WCAG 2.2 AA: 4.5:1 body contrast, 3:1 large text and component boundaries, full keyboard reachability, logical landmarks/headings, and correct accessible names.
- Interactive targets are at least 44x44 CSS pixels on touch surfaces. Dense desktop controls may appear smaller only if their hit area remains 44px.
- Layout survives 200% zoom and 320px CSS width without horizontal scrolling of primary content.
- Honor color scheme and reduced motion. Future high-contrast adaptation must preserve semantic boundaries.
- Japanese copy uses plain language, stable terminology, natural line breaking, and Japanese system fonts. Do not encode meaning in English abbreviations alone.

### Inclusive personas and cognitive constraints

| Persona / context | Constraint | Pass criterion |
|---|---|---|
| Haru, keyboard and screen-reader user | Needs landmarks, names, state announcements, and deterministic focus | Can identify the page, reach every action, change theme, and understand each state without pointer or color |
| Mei, ADHD during deadline pressure | Loses place in dense, competing panels | One primary action per region; due/overdue status is explicit; navigation and labels stay stable |
| Ren, low vision at 200% zoom | Needs strong focus, contrast, and reflow | No clipped controls or two-dimensional scrolling; focus remains visible; numerals stay aligned |
| Aki, situational one-handed mobile use | Needs reachable controls and low precision demand | Four-item nav and all primary actions meet 44px targets with no horizontal overflow |
| International/Japanese learner | Switches between CJK course titles and English system terms | No tofu, clipped baselines, forced all-caps CJK, or orphaned one-character title lines |

Cognitive rules: prefer recognition over recall; keep no more than one primary call to action per card; preserve entered data after recoverable errors; explain capability limits in the same place the unavailable action would appear; avoid countdown anxiety and ambiguous red dots.

### Accepted debt register

| ID | Severity | Affected users | Location | Why accepted now | Owner / exit condition |
|---|---|---|---|---|---|
| `DS-001` | Note | Product implementers | Research log | No generated or live product-screen reference exists for the primitive-only T1 scope | Product-screen owner must capture references before introducing a new composition grammar |
| `DS-002` | Minor | Users requesting explicit high contrast | Global tokens | Dedicated `prefers-contrast` theme is not in T1 acceptance | Add and visually verify when product screens reveal contrast-specific needs |

No Critical or Major accessibility debt is accepted. New accessibility debt requires explicit user acknowledgement, named affected users, and a remediation path.

### Handoff contract

- Product lanes consume these semantic tokens and primitives; they do not fork raw colors, spacing, radii, or state styles.
- A reusable primitive change updates this document first, then `/dev/ui`, then its consumers.
- Each product route must document its content hierarchy, loading/empty/error/capability states, desktop rail behavior, and mobile four-item-nav relationship.
- Handoff evidence includes lint, typecheck, Bun tests, production build, fresh 375/768/1280 screenshots in both themes, keyboard/focus checks, touch-target checks, overflow checks, and resource cleanup receipts.
- The final owner records unresolved design/accessibility debt with severity, affected users, exact location, suggested fix, and status; debt never disappears into a summary.
