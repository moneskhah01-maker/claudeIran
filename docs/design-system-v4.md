# کلاود ایران — design system v4 ("Ledger green")

References studied (2026-11-22): Keel (fintech SaaS, light canvas + emerald), AssetFlow (dark fintech dashboard, lime/emerald data lines, two-tone numbers), Doctor Sem (healthcare SaaS, airy light cards, tinted tiles). Traits taken as principles only; no layout, asset, copy or identity is copied.

## Principles
1. **The product is the hero.** The page sells controlled API access, so it shows the controls: wallet, key, budget, usage. Floating widget cards beside the headline, then a dark product window (the live request demo).
2. **Light canvas, one dark surface per screen.** Paper-grey page, white cards; dark "ink" panels only where the product itself is shown (console, billing lifecycle, API card, code).
3. **Green means money and state.** Emerald is the only accent: primary actions, live/OK states, progress, chart highlights. Never decoration.
4. **Numbers are typography.** Big figures in light weight with the minor part in grey (two-tone); labels small and quiet.
5. **Every row lines up.** 12-column grid; card rows use CSS subgrid so titles, text and footers align; Persian body text justified with `text-wrap: pretty`.
6. **Honest UI.** Every figure in a mock is marked as sample; no testimonials, logos or metrics that do not exist.

## Tokens
| token | value | use |
|---|---|---|
| `--canvas` | `#ECEEEC` | page background (warm grey with a hint of green) |
| `--paper` | `#F6F7F5` | band sections |
| `--card` | `#FFFFFF` | cards |
| `--ink` | `#0E1311` | text, dark surfaces |
| `--ink-2` | `#151B18` | dark card raised |
| `--text-2` | `#4C5551` | body |
| `--muted` | `#7C8580` | captions, decimals |
| `--line` | `rgba(14,19,17,.08)` | hairlines |
| `--green` | `#1DBF6A` | primary accent (fills, progress) |
| `--green-strong` | `#0E9F55` | green text on light |
| `--green-glow` | `#3FE38A` | glows, charts on dark |
| `--lime` | `#C6EF4E` | second stop of data gradients only |
| `--mint` | `#E3F6EA` | tinted tile |
| `--sand` | `#F1EFE6` | tinted tile |
| `--sky` | `#E6EEF3` | tinted tile |
| `--risk` | `#E0533D` | risk/danger only |
| radius | 28 / 20 / 14 / pill | panel / card / control / chip |
| shadow | `0 1px 2px rgba(14,19,17,.04), 0 18px 40px -24px rgba(14,19,17,.18)` | cards |

## Type
- One family: **Vazirmatn** variable (OFL). Headlines mix weights in one line: 300 for context words, 800 for the key phrase (`<b>` inside headings). Letter-spacing −0.02em on display sizes.
- Scale: display 76 / h2 52 / h3 19 / body 16.5 / small 13.5. Line-height 1.15 display, 1.9 body.
- Numbers: `font-variant-numeric: tabular-nums`; minor part `.minor` in `--muted`, weight 300.

## Components
- **Pill label** `.eyebrow` — white pill, 7px green dot, 13px text. One per section head.
- **Buttons** — `.btn-dark` (ink pill, white text, arrow icon in a green disc), `.btn-green`, `.btn-ghost` (white, hairline).
- **Card** — white, radius 20, hairline + soft shadow; `.tint-mint/sand/sky` variants; `.card-ink` dark variant.
- **Widget** — small dashboard card used in the hero (title, figure, mini chart, chip).
- **Chip** — pill with dot: neutral, `ok` (green), `risk`.
- **Segmented tabs** — grey pill track, white active segment (code tabs, product window tabs).
- **Data line** — 3px track with lime→emerald gradient fill (progress, budget used, lifecycle).

## Motion
Lenis + GSAP as before: one hero intro (headline words, widgets float in with a stagger), product window settles flat on scroll, billing lifecycle pinned and scrubbed. Widgets drift 6px on pointer (fine pointers only). Reduced motion renders final states.
