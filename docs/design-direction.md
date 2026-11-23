# Design direction — «محور» landing (Persian, RTL)

**Job of the page:** introduce the platform (API now in a limited pilot; web workspace and desktop app later) to Iranian developers, product teams and organizations, and turn interest into early-access sign-ups. Pre-launch: no prices, no dates, no invented proof.

**Visual thesis — "a precision instrument for AI spend".** The product's defining trait (from the proposal) is that every request is reserved, metered and settled exactly once in a double-entry ledger. The page borrows the language of measuring instruments and ledgers: brass, ink, hairline scales, a meter that settles. Brass ages into verdigris; that patina green is the "settled / live" signal colour.

**Hero focal asset:** a live, authored product console (HTML UI, not an illustration): a Persian prompt, a streamed Persian answer, and a side ledger that goes *reserved → streaming → settled* while token counters run. Pointer adds a slight parallax tilt; it never blocks reading. Static first frame = the settled final state.

**Type:** Estedad (OFL, geometric, Black/Bold) for display and section titles; Vazirmatn variable (OFL) for text and UI; Consolas/ui-monospace only inside code.
Scale (desktop): display 60–68 / h2 40 / h3 21 / lead 19 / body 16.5 / small 14. Text right-aligned (RTL start), paragraphs ≤ ~34em.

**Colour:**
| token | hex | role |
|---|---|---|
| ink | #0A1626 | dark sections |
| ink-raised | #0F2138 | panels on dark |
| brass | #C9A063 | primary action, highlights |
| verdigris | #4DB6A6 | live / settled / success |
| paper | #EEF1F4 | light sections (cool, not cream) |
| slate | #93A4B8 | secondary text on dark |

**Section sequence:** hero → contrast (common risky routes vs our answer, as a reconciliation sheet) → products (API large, two phase-2 tiles) → control (interactive key settings) → billing lifecycle (scroll-scrubbed reserve→settle line) → audiences → developers (code tabs, endpoints, error contract) → models → security → workspace preview (phase 2) → roadmap (true sequence, numbered) → FAQ → early-access form → footer. Ink/paper alternate for rhythm.

**Motion narrative:** one orchestrated moment — the hero intro (status → headline words → line → actions → console boots and streams). Section titles reveal word by word with a restrained stagger. One scrubbed sequence: the billing lifecycle line fills as you scroll. Everything else responds to the visitor (toggles, tabs, accordion, form states).
- Smooth scroll: **Lenis** (chosen; Locomotive not installed). Driven by the GSAP ticker, feeding ScrollTrigger.
- Reduced motion: no Lenis, no scrub, no split reveals; final states render immediately (console shows the settled result).

**Three.js:** not used. The live console is the honest, product-true focal asset; a shader field would be ornamental.

**Assets & provenance:** no photographs, no people, no avatars, no logo wall (no real customers yet). Product visuals are HTML/CSS interface mock-ups. Icons: Solar (Iconify, CC BY 4.0) inlined at build time. Fonts: Vazirmatn and Estedad, both SIL OFL 1.1. Brand mark: simple authored geometric mark. Brand name «محور» and the base URL are placeholders kept in one place.

**Self-check against generic defaults:** not cream+terracotta, not black+acid accent, not a uniform card kit (contrast is a ledger table, security a hairline list, models are rows, products are unequal tiles), no ALL-CAPS eyebrows, no arrows appended to buttons, no single-word headline colouring.
