# next-moodle — Studio Ledger

## 1. Product and experience contract

Studio Ledger is a student-facing Moodle replacement that treats learning material as an editorial workspace rather than a control panel. A compact focus rail handles global movement, the central canvas owns the current task, and contextual navigation appears only when the task benefits from it.

The product must feel composed, fast, and unmistakably original. Information hierarchy comes from type, rhythm, tonal contrast, and a two-pixel accent axis. Repeated cards, permanent three-pane layouts, decorative gradients, large shadows, and conversation styling outside real messages are prohibited. Moodle remains the source of truth, and no student-facing action opens Moodle navigation UI.

## 2. Foundation tokens

| Semantic token | Light | Dark |
|---|---:|---:|
| Canvas | `#EDEBE5` | `#0B0D10` |
| Rail | `#E4E1D9` | `#101318` |
| Surface | `#F6F3EC` | `#171A1F` |
| Elevated | `#FFFDF8` | `#20252C` |
| Selected | `#E2E8CF` | `#29321C` |
| Inset | `#E7E3DA` | `#111419` |
| Primary text | `#17191C` | `#F4F1E8` |
| Secondary text | `#626871` | `#A7ADB6` |
| Tertiary text | `#7C817F` | `#7F8791` |
| Accent | `#526F18` | `#C8F169` |
| Accent strong | `#3E5710` | `#DAFF7A` |

- Dark is the default. Light uses warm paper tones and never becomes a wall of pure-white cards.
- Accent is reserved for primary actions, current position, focus, progress, and the signature “today” axis.
- Depth uses tonal steps, one-pixel rules, and local two-pixel accent edges. Shadows are limited to command palettes, menus, drawers, and dialogs.
- Geist renders Latin text and numbers; Japanese falls through to the operating-system UI font. Geist Mono is reserved for time, counts, IDs, and shortcut labels.
- Type scale: 12px metadata, 13px labels, 15px body, 17px section title, 20–30px page title. Body measure is limited to 68ch.
- Shapes: 4px controls and rows, 8px floating controls, 14px overlays. Circular shapes are reserved for status dots and avatars.
- Spacing follows a 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

## 3. Shell geometry and scroll ownership

At 1280px and wider, the authenticated shell uses a 68px focus rail, a 56px command bar, and a fluid main canvas. Courses and messages may add a 272–320px contextual panel. Contextual panels are collapsible; inspectors are on-demand sheets and never a permanent fourth region.

At 768–1279px, the rail is 60px and contextual navigation opens as a focus-managed drawer. Below 768px, the interface uses a 52px top bar, one content pane, and a 60px five-item bottom navigation.

The shell is bounded by `100dvb`. The document does not scroll inside authenticated routes. Every content canvas, contextual list, conversation list, and thread declares one scroll owner and applies `min-block-size: 0`. Overlays restore focus to their trigger on close and close on Escape.

Workspace modes are fixed:

- `overview`: dashboard and summary routes; focus rail plus fluid canvas.
- `browse`: courses and structured indexes; optional contextual index plus canvas.
- `focus`: assignments and activities; centered reading/editing canvas plus action dock.
- `conversation`: messages; conversation index plus thread, with participant details on demand.

## 4. Information architecture

- Dashboard: asymmetric twelve-column “today” composition with the seven-day flow as the main reading path, deadlines as a signal band, course progress as rows, and unread/tools as compact utilities.
- Course list: searchable study index with classification, progress, next deadline, and last access visible without opening a course.
- Course detail: collapsible section index, maximum 960px material canvas, inline labels, activity rows, and a compact course summary band. Progress and teacher actions live in an inspector sheet.
- Activity and assignment: maximum 880px reading/editing canvas, sticky action dock, and an optional utility sheet for AI assistance, files, submission state, or attempt status.
- Messages: conversation index plus thread. Speech bubbles are used only for real conversation messages. Participant information is an inspector sheet.
- Teacher contact: desktop recipient step plus 680–760px compose canvas; mobile course → recipient → review progression. A preflight summary names the recipient, course, subject, excerpt, and server revalidation behavior.
- Calendar, notifications, grades, people, files, profile, badges, plans, diagnostics, shortcuts, and PDF tools reuse the same route header, data-row, timeline, action-dock, empty, loading, and error grammar.
- Login: centered authentication workspace with connection, privacy, and session facts in a quiet supporting rail. It is not a marketing page.

## 5. Reusable primitives and states

- `FocusRail`: global icons, active accent axis, compact identity, command/search, settings, and mobile counterpart.
- `PageFrame`: `header`, `context`, `content`, `utility`, and `actions` slots with an explicit workspace mode.
- `RouteHeader`: breadcrumb, title, description, metadata, and compact actions.
- `ContextPanel`: collapsible section, course, or conversation index with one scroll owner.
- `SectionIndex`: ordered course/activity navigation with completion and current-position states.
- `InspectorSheet`: modal on narrow screens and anchored sheet on wide screens, with focus restoration.
- `ActionDock`: sticky save, send, submit, attempt, and network-state controls.
- `DataRow`: index/icon, primary text, metadata, state, and trailing action without card chrome.
- `Timeline`: date axis, current-time marker, event row, empty day, and overdue state.
- `CapabilityNotice`: missing read/action capability, companion required, denied, malformed response, outage, and expired session.

Every primitive exposes default, hover, pressed, focus-visible, selected, disabled, loading, empty, error, long-content, and reduced-motion behavior in `/dev/ui` before release.

## 6. Motion and interaction

- Interactive feedback lasts 160–220ms and animates only `transform`, `opacity`, and intentional color transitions.
- Pressed controls move by one pixel or scale to 0.98. Panel entry uses a maximum 12px translation and opacity.
- `prefers-reduced-motion` reduces movement to effectively instant while preserving state changes.
- `Cmd/Ctrl+K` searches screens, courses, activities, messages, and settings. `?` opens shortcut help outside editors.
- Keyboard focus is always visible. Japanese IME composition never triggers submit, message send, or AI completion.
- Every touch target is at least 44px. Dense rows keep a 44px interaction box even when their visible height is smaller.

## 7. Moodle replacement contract

The redesign does not change Moodle DTOs, server sessions, BFF routes, submission APIs, AI APIs, activity adapters, or the teacher-message API. Server Components continue to load Moodle data directly, while interactive leaves remain Client Components.

`MoodleCapabilityManifestV3`, typed companion activity envelopes, authenticated file proxying, short-lived runtime tickets, and the no-Moodle-navigation fallback policy remain binding. Malformed activities stay isolated to their own rows.

## 8. Accessibility, personas, and accepted debt

Primary personas are a keyboard-first student triaging deadlines, a mobile student using touch and Japanese IME, and a student using 200% zoom, reduced motion, or high cognitive load. WCAG 2.2 AA, semantic landmarks, logical properties, visible focus, status text in addition to color, readable Japanese wrapping, and no horizontal page scroll are release gates.

Visual QA covers 375, 768, 1280, and 1600px in dark and light themes, long Japanese text, empty and malformed data, touch, keyboard, reduced motion, focus restoration, and 200% zoom. Production Chrome is the measurement surface.

Accepted deployment debt remains external: complete replacement readiness requires the configured Moodle companion contract to resolve every public third-party activity. No visual or accessibility debt is accepted for the Studio Ledger implementation.
