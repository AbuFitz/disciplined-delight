# Authored interface system

## Living training ledger

The visual direction is “physiological instrument meets warm training ledger.” A ruled signal rail connects readiness, plan, current work and recovery on Today and Plan. Training/library surfaces use ordered rows, visible baselines, purposeful asymmetry and data-first type instead of repeated floating cards. Gym Mode is the strongest expression: an edge-to-edge heads-up hierarchy with the current movement and set as the dominant signal.

Shared `nl/ui` primitives establish 44px minimum touch targets, visible native focus treatment, consistent label/hint/error rhythm, explicit disabled/loading/selected states, compact geometry and portal z-indexes above navigation. Transient layers use `spatial-glass`: a semantic surface mix, restrained blur, border highlight and solid forced-colour/reduced-transparency fallback. Scrolling content does not use glass.

Settings uses progressive disclosure rather than rendering every optional system at once. A compact grouped index opens one section, while direct `#training`, `#faith` and `#companion` links expand, scroll and focus their target. Account/data/destructive controls remain visible in the index. Active-session resume space is reserved below page content so its dock and the mobile navigation do not hide the final controls.

## Appearance

Theme mode and colour world are device-persisted. First paint is graphite-led with cobalt as the restrained default signal; authentication and onboarding never devote a large panel to the chosen accent. The curated worlds are mint, cobalt, violet, coral, amber, rose and slate. They only replace semantic signal tokens (`primary`, `ring`, `spring`, first chart series) with audited light/dark foreground pairings. Body text and primary surfaces do not inherit arbitrary user colours. This avoids turning a colour into a gender, culture or faith assumption.

## Icons

Core product surfaces import icons only through `components/nl/icon.tsx`. The wrapper uses official `@phosphor-icons/react` (MIT licensed), keeps names semantic, defaults decorative icons to `aria-hidden`, supports labelled icons with an SVG title, and standardises 16/18/20/24/28px sizes plus regular/bold active weights. Phosphor is tree-shakeable; central imports preserve source clarity without bundling a second icon pack into redesigned surfaces.

Readiness and adaptation use two deliberately simple custom 24px stroke glyphs because they express VAYVOR-specific concepts. They share the same view box, line caps and stroke scale. New raw icon-package imports are not allowed in core VAYVOR surfaces.

## Motion and overlap rules

Motion communicates a state change with transform/opacity; no ambient playback is required. Reduced-motion users see static media posters and unchanged status information. Buddy is never a floating overlay: it is a reserved bar on mobile, a sidebar rail on desktop, and an in-flow panel; the mobile scrollport ends above the reserved bottom stack. During a session, the global mobile nav is removed; Gym Mode and the normal session each own a single action region. Sheets/dialogs use higher portal layers, safe-area padding and bounded viewport height. Long labels wrap or truncate only where the full accessible name remains.
