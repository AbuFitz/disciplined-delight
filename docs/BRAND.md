# VAYVOR brand

**VAYVOR**, pronounced **"VAY-vor"**. Body, mind, soul, together. It covers training, food, routines, faith and
reflection, challenges, medals, games and chat, and has to work on a phone screen and on clothing.

Formerly "New Life" (working name). The repository and a few identifiers still carry the old name on purpose; see
"Identifiers that did not change".

## Wordmark

Six solid geometric capitals drawn as filled vector paths. No font, stroke, gradient or effect is needed, so it
works in one colour, at embroidery sizes and on screen.

| File                                                                  | Use                                                      |
| --------------------------------------------------------------------- | -------------------------------------------------------- |
| `public/brand/vayvor-wordmark-black.svg`                              | One-colour artwork (print, embroidery digitising, merch) |
| `public/brand/vayvor-wordmark-ink.svg`                                | On light or green backgrounds                            |
| `public/brand/vayvor-wordmark-paper.svg`                              | Paper-on-ink lockup with padding                         |
| `public/brand/vayvor-wordmark-email.png`                              | Email header (email clients don't render SVG)            |
| `public/brand/vayvor-monogram-black.svg`, `favicon.svg`, `icon-*.png` | The **V** alone: app icon, favicon, avatars              |
| `src/components/brand/Wordmark.tsx`                                   | In-app component, inherits `currentColor`                |

Rules

- Keep the aspect ratio (349:64). Don't stretch, outline, slant, add a shadow or a full stop, or recolour letters.
- Clear space: at least the height of the letter **V**'s arm width (about one fifth of cap height) all round.
- Colours: paper `#f3efe7` on ink `#0e1311` is primary. Ink on paper or on green `#4fd9a0` is the inverse. Any
  single colour with enough contrast works for merchandise. The green is an accent, never a requirement.
- Minimum size on screen: 72 px wide. Under that, use the monogram.
- Embroidery guidance (**confirm with the embroiderer's test sew**): single thread colour, satin stitch, about
  33 mm wide / 6 mm tall minimum (thinnest stroke is then about 1.1 mm). Smaller than that, use the monogram.
- In the app the wordmark stays small and quiet; the editorial display type (Funnel Display) carries page titles.

Not yet done: a trademark search and registration. Do that before printing garments or registering anything.

## Voice

British English, direct and respectful. "VAYVOR" is always capitals in running text where it's the product name.
Say what a feature does; no pressure, no shame-based streak language, no promises about health or religion.

## Domain and origins

The intended primary domain is **vayvor.com**, pending registration and connection. Nothing in the code hard-codes
it. Authentication callbacks use the origin the app is actually served from, and email templates use Supabase's
configured **Site URL**. Until vayvor.com is live, keep Site URL and redirect URLs on the working origin; when it
is connected, add it to Supabase Redirect URLs, Vercel domains and (for Google) the OAuth client, then switch Site URL.

## Identifiers that did not change (and why)

Existing installs and data are tied to these. Changing any of them needs a tested migration, so they stay.

| Identifier                                  | Value                                                  | Reason                                                            |
| ------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| Guest IndexedDB                             | `new-life`                                             | Holds existing owner data                                         |
| Account IndexedDB prefix                    | `new-life:u:<id>`                                      | Existing per-account databases                                    |
| Legacy localStorage keys                    | `sunrise-strength-*`, `new-life-shopping-checklist-v1` | Read by the one-time migration                                    |
| Theme key                                   | `nl-theme`                                             | Existing preference                                               |
| Web app manifest `id`, `start_url`, `scope` | `/`                                                    | Installed app identity                                            |
| Service worker cache prefix                 | `nl-` (now `nl-v2`)                                    | Internal; the version was bumped so new icons replace cached ones |
| Backup file `app` field                     | `new-life` (also accepts `vayvor`)                     | Files stay interchangeable across versions                        |
| npm package name, repo, Vercel project      | `new-life`, `disciplined-delight`                      | Deployment continuity                                             |
| Applied migration `0001_init.sql`           | unchanged                                              | Applied migrations are immutable                                  |

`src/data/brand.test.ts` guards this list and fails if the old visible name reappears in source.

## Installed apps

Changing the manifest `name` and icons updates new installs. An iPhone Home Screen app keeps the name it was
installed with until it is removed and added again; the app icon behaves the same. Android/Chrome refreshes on its own schedule.
This hasn't been checked on a physical device.
