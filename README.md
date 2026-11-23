# «کلاود ایران» — landing page (Persian, RTL)

**v2 (2026-11-23): Keel redesign** — grey canvas, white sheet, ink + Terracotta `#D97757`, Vazirmatn + Manrope, Achaemenid relief photography (CC0), plus an interactive console demo at `/console.html`. The previous design is kept in `docs/*-v42-backup.*`.

Marketing landing for the Claude API platform described in `Claude_Integrated_Architecture_FA_v4` (API platform in a limited pilot; web workspace and desktop app in phase 2). Pre-launch: the call to action is joining the early-access list.

## Live

- https://claudeiran.com (since 2026-11-22). Iran VPS 5.57.39.211: `claudeiran.service` (node server.mjs on 127.0.0.1:3600, user `claudeiran`), Nginx site `/etc/nginx/sites-available/claudeiran` (HTTPS, www and http redirect to https://claudeiran.com), Let's Encrypt certificate renewed by certbot.timer (webroot `/var/www/letsencrypt`).
- DNS: Cloudflare zone claudeiran.com, A `@` and `www` → 5.57.39.211, DNS only. Registrar: Limoo Host (nameservers set to Cloudflare through Limoo's support assistant).
- Deploy a new build: `npm run build && bash tools/deploy-vps.sh` (Git Bash). Releases in `/opt/claudeiran/releases`, sign-ups in `/var/lib/claudeiran/waitlist.json` (outside the releases), last 3 releases kept, automatic rollback if the new release does not answer.

## Run locally

```powershell
npm install
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173). This serves the source files with live reload. To test the production build and early-access form API locally, run `node tools/assets.mjs` when needed, then `npm run build` and `node server.mjs 5230`; open http://localhost:5230. The server stores early-access requests in `data/waitlist.json` (validated server-side, duplicate emails ignored, honeypot field for bots).

## Structure

| path | what |
|---|---|
| `index.html` | landing: all page content and copy (semantic sections), incl. the early-access form `#early-access` |
| `console.html` | interactive console demo (self-contained page, sample data only; FA/EN, URL params in `docs/design-system-keel-FA.md`, plus `modal=topup|invite` and `spot=1`). Since 2026-11-23 it has an Apple-style glass layer (window chrome, segmented tabs, glass sheets and popovers, Ctrl/⌘ K quick search, "Reduce transparency" in the account menu) and every tile, chart, alert and table row is clickable; the pre-glass version is `docs/console-v1-backup.html` |
| `src/styles.css` | Keel design tokens, components and section layouts |
| `src/main.js` | mobile menu, bar charts, period switch, code tabs, reveals, sticky CTA, early-access form → `/api/waitlist`; since 2026-11-23 also the interactive hero console preview (tabs, 7/30-day switch, chart hover and pinned day, gauge read-out, bell popover, tilt, count-up), the sliding nav indicator and the pointer-following glass glow on cards; the tech strip is a scrolling banner with a pause button, and the roadmap cards pin on tall desktop screens so the dark highlight follows the scroll (the card nearest the screen centre on narrower screens). Copies before that change: `docs/*-v6-backup.*`. Later the same day (copies in `docs/*-v7-backup.*`): one transition contract so reveal and hover both animate (staggered via `--d`), animated sample visuals in the feature cards, glass access section, how-it-works timeline synced to the request card, and the roadmap pinning with its heading (cards only when the section does not fit), with a hold on each card and a dark wipe on the focused one. Pre-change copies: `docs/index-v5-backup.html`, `docs/styles-v5-backup.css`, `docs/main-v5-backup.js`, `docs/console-v2-backup.html` |
| `public/img/`, `public/fonts/` | relief photographs (CC0, see `docs/PHOTO_CREDITS.txt`); Vazirmatn + Manrope variable fonts |
| `server.mjs` | local static server + `POST /api/waitlist` |
| `vite.config.js` | build (two pages: `index.html`, `console.html`); inlines Solar icons into the HTML (`<i data-icon="name"></i>`), replaces `%SITE_URL%`, injects JSON-LD (Organization, WebSite, WebPage, Service, FAQPage built from the on-page FAQ) and emits `robots.txt` + `sitemap.xml` |
| `site.config.json` | site URL and names used by the SEO tags; `siteUrl` is a placeholder |
| `tools/assets.mjs` | renders `public/og-image.png` (1200x630, from the page's own H1 and og:description) and the PNG app icons with local Chrome |
| `public/manifest.webmanifest` | web app manifest (fa-IR, RTL) |
| `docs/design-system-keel-FA.md` | current design system (Keel visual language, Persian) |
| `docs/keel-previews/` | designer's reference screenshots of the redesign |
| `docs/design-system-v4.md` | v4 design system ("Ledger green"): tokens, type, components, motion; references studied |
| `docs/copy-deck-v3-delta.md` | copy for the v4 widgets, facts, eyebrows, CTA next steps and the customer-success fixes |
| `docs/copy-deck-v2.md` | the Persian copy deck the page is built from (v3 design); includes the keyword map and excluded terms |
| `docs/copy-deck.md` | v1 deck, still the reference for the demo, form and mock strings marked "unchanged from v1" |
| `docs/*-backup.*` | earlier page and stylesheet versions (v1, v2) |
| `docs/design-direction.md` | art direction, tokens, motion decisions |

## Placeholders to replace before any public launch

- Brand is «کلاود ایران». Code samples use neutral placeholders (`api.example.com`, `$API_KEY`, `key_…`) until a Latin slug is approved.
- A contact email for the footer «ارتباط» group and for data-deletion requests (the form privacy note still says "reply to our email", but sign-up sends no email).
- Payment methods and prices (intentionally absent; the page says they are announced before launch).
- Footer contact links.
- `siteUrl` in `site.config.json` (canonical, Open Graph, sitemap, robots and JSON-LD all read it). Re-run the build after changing it.
- Persian-language support (FAQ 12) is not stated in the proposal; confirm it before publishing.

## Before publishing publicly

The proposal makes commercial launch conditional on gate G0 (written confirmation from the supplier of the right to offer the service, the target market and the payment route) and lists Anthropic's Supported Regions Policy as a binding constraint. The owner chose to publish the page on 2026-11-22, before G0 is recorded as cleared; the copy keeps launch conditional on approved supply and a contract, and states non-affiliation with Anthropic in the hero, FAQ and footer.

## Credits and licences

- Vazirmatn — Saber Rastikerdar, SIL Open Font License 1.1
- Manrope — Mikhail Sharanda, SIL Open Font License 1.1
- Vite (MIT)
- Photographs: Persepolis capital and two reliefs (Wikimedia Commons / The Met Open Access, CC0); details in `docs/PHOTO_CREDITS.txt`. Product visuals are HTML/CSS interface mock-ups with sample data.
- Claude and Anthropic are trademarks of Anthropic, PBC; they are mentioned only to describe the models offered.
