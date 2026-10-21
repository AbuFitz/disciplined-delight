# VAYVOR visual redesign research

Status: design direction for the next interface pass  
Decision owner: product  
Recommended direction: **Living Instrument**

## The decision

VAYVOR should not look like a gym app with more modules bolted onto it. It should feel like a calm personal instrument that turns a complicated life into one understandable next action.

The visual system must make a broad platform feel small at the point of use:

- show what matters now;
- disclose detail only when requested;
- make progress feel personal rather than competitive by default;
- keep the companion optional and useful;
- let a person shape the colour and density without harming readability;
- reserve expressive motion for state changes, direct manipulation and earned moments.

The creative thesis is:

> **A living instrument for the person you are becoming.**  
> Calm at rest. Precise in use. Alive when you act.

The product mantra is **you versus yesterday**, not “you against everyone.” Community and competition can be opted into; self-comparison is the default.

## What is wrong with the current interface

The existing screens are functional, but the presentation flattens their importance:

1. Rounded, bordered panels repeat so often that everything looks equally important.
2. Large uppercase headings, cards, status chips and accent colour all compete for attention.
3. Green is functioning as a brand lock rather than a chosen personal accent.
4. Glass, borders and radius are used as general decoration instead of communicating depth or state.
5. Today is dense, Train feels like a form, and Library behaves like a long catalogue rather than a visual movement tool.
6. Onboarding asks for data before it has established trust, value or a clear sense of progress.
7. The fixed mobile navigation and action areas need stronger safe-area and overlap rules.
8. Generic icons and repeated component geometry make different product areas feel interchangeable.

The current code confirms the pattern: `Panel` is the dominant layout primitive. A panel is useful for an independently actionable object, but it should not be the default wrapper for every section.

## Reference study

These are principles to translate, not pages, components, assets or brand systems to copy.

| Reference | What is valuable | What VAYVOR should borrow | What not to copy |
| --- | --- | --- | --- |
| [Linear](https://linear.app/) and its [design refresh](https://linear.app/now/behind-the-latest-design-refresh) | Calm density, quiet inactive states and structure that is felt rather than outlined | Fewer borders, lower-noise navigation, clear type hierarchy, token-based personal themes | Its monochrome identity, exact sidebar or product shell |
| [Raycast](https://www.raycast.com/) and [Theme Studio](https://manual.raycast.com/themes) | Fast command interaction, extensibility and controlled user theming | A global action surface; previewable accent worlds; Buddy as an optional command/helper layer | Red beam aesthetic, glass-heavy promotional styling or command UI on every screen |
| [Nothing](https://nothing.tech/) | One focal object, industrial restraint, microtype and tiny signal accents | Telemetry typography, strong empty space, one dominant object or action per view | Dot-matrix branding, exact glyph language or black hardware scenes |
| [Teenage Engineering](https://teenage.engineering/) | Playful instruments, physical metaphors, distinctive symbols and purposeful asymmetry | Controls that feel tactile; custom product glyphs; sparse utility colour; delightful details | Proprietary symbols, deliberately awkward navigation or its editorial layout |
| [Craft](https://www.craft.do/) | Warmth, authored spaces and editorial contrast inside a capable productivity product | Human language, softer reflective moments, editable personal worlds and calmer setup | Its collages, exact serif treatment or document-product structure |
| [Cosmos](https://www.cosmos.so/) | Breathing room, a single dominant action and content arranged with visual rhythm | A calm search/command entry; media-led discovery; spatial rhythm instead of tiled dashboards | A floating-image-cloud homepage or search as the whole product |

### Research facts and implications

| Status | Finding | Product implication |
| --- | --- | --- |
| VERIFIED | Linear says inactive navigation should not compete for attention, reduces backgrounds and icon use, and aims for structure that is “felt not seen.” | Reduce containers and outlines; use type, spacing and subtle dividers for most hierarchy. |
| VERIFIED | Linear’s theme builder separates base, accent and contrast rather than letting one arbitrary colour recolour the whole UI. | Keep neutral surfaces and semantic status colours stable; let users select a restrained accent world. |
| VERIFIED | Raycast supports curated themes, custom backgrounds, primary/support colours, light/dark variants and real-time preview. | Appearance setup should preview a complete theme before applying it and preserve accessibility constraints. |
| VERIFIED | WCAG 2.2 requires pointer targets of at least 24×24 CSS px or sufficient spacing; 44×44 is the enhanced target. | Use 44px as VAYVOR’s normal touch target, particularly in Gym Mode and one-handed use. |
| VERIFIED | W3C advises supporting `prefers-reduced-motion`; Apple advises purposeful, brief motion with non-motion alternatives. | Every transition needs a static/reduced-motion path. Information cannot exist only in movement or haptics. |
| VERIFIED | Apple accessibility guidance recommends identifying core functionality and breaking multi-step flows into one interaction per screen to reduce cognitive load. | Onboarding and plan creation should use progressive disclosure, summaries and reversible choices. |
| INFERRED | The strongest non-fitness references each make one visual idea dominant rather than combining every current design trend. | VAYVOR needs one signature interaction, not a collection of glass, gradients, blobs and large type. |
| INFERRED | VAYVOR’s breadth makes a conventional dashboard increasingly overwhelming as modules are added. | Organise by user intent and time horizon, not by exposing every tracker on Today. |
| PROVISIONAL | The existing Fraunces, Hanken Grotesk and DM Mono family can create enough contrast without a font migration. | Test real screens first; do not add a new font until a specimen proves it improves the system. |
| BLOCKED | We do not yet have observed usability sessions with target users. | Validate the vertical slice with 5–8 representative users before scaling the new shell to every module. |

## Recommended art direction: Living Instrument

### The signature move: the Dayline

A thin temporal rail connects readiness, plan, action and recovery. On Today it shows the day as a sequence of meaningful moments. Selecting a moment expands it into a full-width **Stage**. In Gym Mode it becomes the set/rest progression. In review it becomes the completed story of the session.

This is the one repeated visual metaphor. It should be recognisable without becoming ornamental.

### Three spatial layers

1. **Canvas** — the neutral page, carrying typography, rhythm and low-noise separators.
2. **Stage** — one dominant active object: the next workout, current exercise, daily check-in or important decision.
3. **Utility** — transient sheets, menus, action dock and optional Buddy conversation.

Glass belongs only to Utility. A Stage may have depth, but scrolling content should generally remain solid and calm.

### Visual grammar

- Use space, alignment and type before adding a container.
- A panel is allowed only when its content has its own state, action or boundary.
- Use full-width sections and rows for sequences; use cards for movable or independently actionable objects.
- Use a maximum of two elevation levels on a screen.
- Large display type is reserved for the page’s emotional or directional moment, never every section heading.
- Pills are for tags, compact statuses and binary toggles—not ordinary buttons, inputs or navigation.
- The accent should behave like a signal, not paint the whole screen.

## Colour and material

The system starts neutral and gives the user a controlled colour choice.

### Stable neutrals

- **Obsidian**: near-black dark canvas, slightly warm rather than blue-black.
- **Parchment**: warm light canvas, not pure white.
- **Graphite/Fog**: text and secondary surfaces.
- **Semantic colours**: success, caution, destructive and informational colours remain consistent across themes.

### User colour worlds

Offer previewable worlds such as Cobalt, Citrus, Coral, Violet, Rose, Ice and Slate. Each world defines an audited light/dark pair and a foreground contrast pair. A future advanced control may tune hue, but free colour entry should not ship until contrast can be guaranteed.

Accent use should normally stay below roughly 10–15% of a viewport. This is a design heuristic, not an accessibility standard.

### Radius, borders and depth

- 6px: compact controls and data affordances.
- 12px: media, fields and self-contained objects.
- 20px: rare hero Stage or large sheet.
- Full pill: tags, segmented states and avatars only.
- Prefer subtle dividers and tonal changes to enclosing borders.
- Shadows indicate a floating/transient layer, never ordinary page content.

## Typography

Keep the existing families for the first prototype:

- **Hanken Grotesk** for UI, instructions and body copy.
- **Funnel Display** only for confident product headings, with far less all-caps usage.
- **Fraunces** sparingly for reflective, human moments: a weekly reflection, identity statement or milestone.
- **DM Mono** for time, reps, load, readiness and device telemetry.

The contrast should come from role, size and spacing—not four fonts appearing together in one viewport.

## Icon system

Phosphor remains the source for familiar actions such as search, close, edit and settings. VAYVOR needs a small authored glyph family for product concepts:

- Today / Dayline
- Train
- Fuel
- Recover
- Body
- Mind
- Meaning / faith or values
- Circle / community
- Buddy
- Readiness
- Adaptation
- Gym Mode

Glyph rules:

- 24px base grid; 16, 20 and 24px delivered sizes;
- approximately 1.75px stroke at 24px;
- a squared/rounded hybrid that feels engineered but friendly;
- no generic coloured circle behind every icon;
- active states may add one restrained fill or heavier internal mark;
- every unfamiliar icon ships with a visible label until comprehension is validated.

## Motion and haptics

Motion exists to explain change:

- 100ms: press and tactile acknowledgement;
- 180ms: local state change;
- 280ms: sheet or spatial transition;
- up to 450ms: an earned milestone, never routine navigation.

Use springs only for direct manipulation. Do not run decorative ambient animation behind reading or data entry. The Dayline can draw or advance when a real state changes; Buddy can react briefly after completing a useful task. All motion must respect `prefers-reduced-motion`, and important feedback needs text/visual equivalents to haptics.

## Mobile-first information design

### Today

- One **Now Stage** with the next meaningful action.
- Dayline beneath it, showing completed/current/later states.
- A maximum of two user-selected signals above the fold.
- Remaining modules live under “Later” or are reached through the global action surface.
- No generic feed of every metric.

### Train

- Week rail and programme status at the top.
- Sessions as structured rows rather than individual floating cards.
- Entering a session moves to a full-width workout Stage.
- Scheduled time and location can suggest Gym Mode; it never starts a session without confirmation.

### Gym Mode

- Edge-to-edge focus view with no global bottom navigation.
- Exercise name, demonstration, current set/load/reps and one next action dominate.
- Voice, haptic and wearable controls are progressive enhancements.
- Offline-first session state and an obvious resume path are mandatory.

### Library

- Media-first results with consistent licensed movement demonstrations.
- Search is the dominant control; filters open in a sheet.
- Rows or a compact two-column media grid replace tiny text rows inside cards.
- Exercise detail prioritises demonstration, setup, cues, common mistakes, regressions and substitutions.
- Long result sets must be virtualised or incrementally loaded.

### Onboarding

- Begin with the value promise and privacy posture, not a demographic form.
- Ask one meaningful decision per screen.
- Explain why sensitive information improves recommendations and make it skippable.
- Let people select outcomes and constraints before optional systems such as faith, nutrition depth, community or Buddy.
- Generate a readable “Here is what VAYVOR will set up” preview before committing.
- Allow adjustment after setup; do not imply the initial configuration is permanent.

### Buddy

Buddy is an optional helper surface, not a home-screen mascot. It can translate intent into actions—“move tomorrow’s workout,” “make a hotel version,” “log what I ate,” or “why is today lighter?”—then show a preview and ask for confirmation before consequential changes.

Its character can add warmth in setup, empty states and celebrations, but it must not float over content, interrupt focus or become the primary navigation model.

## Navigation model

For mobile, keep four high-frequency destinations in the bottom navigation and place the rest behind a clearly labelled More/You surface. The final labels should follow product IA testing, but a working structure is:

1. Today
2. Plan
3. Track
4. Progress
5. You / More as the account and module index

Explore, community, meaning/faith, devices, reports and optional systems remain reachable without occupying the always-visible rail. The global action control can create/log/ask from anywhere, but should not compete with the current screen’s primary CTA.

## Accessibility and resilience rules

- 44×44px default interactive target; never below WCAG’s 24×24 minimum without qualifying spacing.
- Visible keyboard focus and logical focus order.
- No meaning communicated by colour, animation, haptics or icon alone.
- Support 200% text zoom and narrow 320px viewports without horizontal scrolling.
- Respect reduced motion and increased contrast.
- Provide captions/poster frames for movement demonstrations and a text cue alternative.
- Fixed navigation, notices, Buddy and active-session controls must never overlap page actions.
- Test touch, mouse, keyboard and screen-reader paths.

## Anti-goals

- No endless dashboard of rounded cards.
- No default neon green identity.
- No glass on every surface.
- No purple-blue “AI gradient” as a substitute for art direction.
- No giant heading on every route.
- No emoji as core product iconography.
- No copy of Apple rings, Strava feeds or generic fitness challenge UI.
- No Buddy bubble covering content.
- No competition or faith assumption enabled by default.
- No unlicensed images or inconsistent workout media.
- No visual redesign that changes trusted health logic without a separate review.

## Validation questions

Each prototype review must answer:

1. Can a new user identify the primary action in three seconds?
2. Can an existing user complete today’s main action one-handed?
3. Does removing the borders preserve the intended grouping?
4. Does the screen still work without accent colour and motion?
5. Is optional functionality discoverable without appearing mandatory?
6. Can 200% text, 320px width and safe-area insets coexist without overlap?
7. Does the interface explain what the system changed and why?

## Source list

- Linear, [Behind the latest design refresh](https://linear.app/now/behind-the-latest-design-refresh)
- Raycast, [Themes and Theme Studio](https://manual.raycast.com/themes)
- W3C, [WCAG 2.2 target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- W3C, [Animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions)
- Apple, [Human Interface Guidelines: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- Apple, [Human Interface Guidelines: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- Rendered visual references: [Nothing](https://nothing.tech/), [Teenage Engineering](https://teenage.engineering/), [Craft](https://www.craft.do/), [Cosmos](https://www.cosmos.so/)

