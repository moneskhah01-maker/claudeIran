# ClaudeIran SEO audit, 2026-11-24

Scope: the repository (branch `main` at f117685, including the unreleased «خدمات و آموزش» section) and the live site https://claudeiran.com. Method: a production build (`npm run build`), a scripted check of every built page (head tags, JSON-LD, headings, internal links, sitemap coverage), live HTTP checks (status codes, redirects, headers, robots.txt, sitemap) and Google's public autocomplete for Persian seed queries.

Positioning used throughout: ClaudeIran is an independent, pre-launch platform for controlled Claude API access for Iranian teams (project keys, budget caps, usage reporting, request-level traceability, token-level settlement). It is not affiliated with Anthropic. No pricing is published. Bypass, resale and VPN queries are out of scope.

## Access

| Resource | Status |
|---|---|
| Repository and source | Yes (local clone, push access to GitHub) |
| Live site | Yes (public HTTP) |
| Deployment | Script present (`tools/deploy-vps.sh`); not used in this audit |
| Google Search Console, Analytics | No access from this session. No performance baseline below comes from them |
| Semrush, Ahrefs, Keyword Planner | No access. Keyword notes below are autocomplete signals, not volumes |

Because there is no Search Console data, there is no traffic, impressions or ranking baseline in this report. Setting that up is the first owner action (see Owner decisions).

## What is already in good shape

- Static HTML for every page (no JavaScript needed to see content), `lang="fa" dir="rtl"`, one H1 per page.
- Unique title, description, canonical, hreflang (fa-IR + x-default), Open Graph and Twitter tags on landing, blog, articles, services and skill pages. The 404 page is `noindex, follow`.
- JSON-LD: Organization, WebSite, WebPage, Service and FAQPage on the landing; BlogPosting with dates, BreadcrumbList and FAQPage on articles; Blog on /blog/; CollectionPage and SoftwareSourceCode on services.
- robots.txt allows everything except `/api/`, points to the sitemap. Search and AI crawlers are not blocked.
- Redirects: http → https, www → apex, missing trailing slash → slash, all 301.
- Security headers present (HSTS, nosniff, frame options, referrer policy).
- Relationship with Anthropic stated clearly: landing FAQ («آیا کلاود ایران سرویس رسمی Anthropic است؟ خیر…»), a trademark/non-affiliation line in every footer, and a note at the top of articles.
- Content checked for invented pricing and for bypass/resale/VPN wording: none found. Prices always point to Anthropic's official pricing page.
- No broken internal links across the 23 built pages.

## Findings

### P1: fix before or with the next deploy

**P1-1. The console demo is indexable, has no meta description or canonical, and shows sample toman amounts.**
`/console.html` is linked from about ten places on the landing and the footer. It has no robots meta, no description and no canonical, and it shows 12 sample amounts in toman («داده نمونه»). A search snippet or an AI answer can quote those as ClaudeIran's prices, which conflicts with «قیمت‌ها هنوز اعلام نشده‌اند». Query-string variants (`?view=…`) add duplicate URLs.
Fix: `noindex, follow`, a description that says it is a product preview with sample data, and a canonical to `/console.html`. Links stay, so users and link equity still flow.

**P1-2. The brand entity is defined four times and says nothing about what ClaudeIran is.**
The Organization node is written separately in `vite.config.js`, `tools/build-blog.mjs` (twice) and `tools/build-services.mjs`, with only name, URL and logo. There is no description, no alternate names, no area served. Search engines and AI systems build the entity from this; today nothing in structured data says "independent, not Anthropic" or "for Iran". Articles credit an author Organization with no `@id`, so it is a second, unlinked entity.
Fix: one shared Organization node (alternate names «کلود ایران», ClaudeIran, Claude Iran; a description stating independence and non-affiliation; areaServed Iran), used by every page; article authors point to it; the landing Service gets areaServed and audience.

**P1-3. The site never uses the spelling «کلود», which is how Persian searchers write Claude.**
The site writes «کلاود», «کلاد» or «Claude» (0 uses of «کلود» in the landing, 8 articles and the skills catalogue). Google autocomplete (fa, Iran) suggests «کلود» as the second suggestion when you type «کلاود» or «کلاد», and returns these legitimate queries: «کلود هوش مصنوعی», «api کلود», «قیمت api کلود», «کلود کد», «آموزش کلود کد», «مقایسه کلود و چت جی پی تی», «کلود فارسی», «استفاده از کلود در ایران», and the brand-like «کلود ایران». Autocomplete shows that a query exists, not its volume; confirm volumes in Keyword Planner or Search Console.
Fix: use «کلود» naturally where it matches intent: the landing description and brand FAQ, and the description, intro and keywords of the three articles that match those queries (Claude API, Claude vs ChatGPT, tokens and pricing). No keyword stuffing; the brand name itself stays «کلاود ایران».

### P2: fix soon

**P2-1. The sitemap's `lastmod` for the home page is the build date.** It changes on every build even when nothing changed, which teaches crawlers to ignore it. Fix: use the date of the landing's last commit.

**P2-2. `/index.html` returns 200 with the home page; `/404.html` returns 200.** The canonical covers the first, but a 301 is cleaner and stops the duplicate from being crawled. The 404 page should answer 404 everywhere. Fix in `server.mjs`.

**P2-3. Raw skill downloads are indexable duplicates.** `/downloads/skills/<slug>/SKILL.md` and the ZIPs repeat the skill pages' text without page chrome or links. Fix: `X-Robots-Tag: noindex` on `/downloads/` (the files still download and copy normally).

**P2-4. Weak internal links to the skill pages.** Six of ten skill pages get only one or two internal links, and no article links to `/services/`. Fix: contextual links from the prompt-engineering and Claude API articles, where skills are the natural next step.

### P3: worth doing, lower impact

- Landing headings jump from H1 to H3 (dashboard mock in the hero). Semantics/accessibility, little ranking impact.
- One Open Graph image for every page. Per-article images would lift social CTR.
- `llms.txt`: not a standard Google uses; optional for AI assistants. Low priority.
- Core Web Vitals: not measured (no field data; lab run not done in this audit). Measure after the next deploy with PageSpeed Insights.
- The «خدمات و آموزش» section (11 URLs) is built and in the sitemap of the build, but not deployed yet: live `/services/` is 404.

## Owner decisions (need facts or access this audit does not have)

1. **Search Console**: verify the domain property (DNS), submit `sitemap.xml`, and share access so a real baseline (impressions, clicks, queries, indexed pages) can be recorded. 30/60/90-day targets should be set from that baseline, not before.
2. **About / contact page**: who operates ClaudeIran, how to contact, legal entity if any. This is the biggest E-E-A-T gap for a service that will take payments, but it needs real facts.
3. **Named authors**: articles are credited to «تیم تحریریهٔ کلاود ایران». A named author with a short bio strengthens E-E-A-T, if someone is willing to be named.
4. **Commercial queries**: «خرید api کلود» and «claude api خرید» appear in autocomplete. They describe buying access, which overlaps with resale; not targeted here. Decide whether and how ClaudeIran's offering may be described against them once the supply agreement is final.

## Not targeted (by policy)

Queries about bypassing restrictions or filtering («کلود در ایران فیلتر است», «بدون محدودیت»), free or leaked keys («claude api key free», «unlimited»), account or subscription resale («خرید اکانت کلود», «خرید اشتراک Claude»).

## Changes made (branch `seo/audit-p1-p2`, not deployed)

| ID | Change | Files |
|---|---|---|
| P1-1 | Console demo: `noindex, follow`, description stating sample data and no published prices, canonical | `console.html` |
| P1-2 | One shared Organization node (alternate names, description with non-affiliation, areaServed Iran, knowsAbout) used by landing, blog, articles and services; articles credited to an editorial team node linked to it; WebSite gets alternateName; Service gets areaServed and audience | `tools/lib/site.mjs`, `tools/build-blog.mjs`, `tools/build-services.mjs`, `vite.config.js` |
| P1-3 | «کلود» added once, in context: landing description and brand FAQ; description, intro and keywords of the Claude API, Claude vs ChatGPT (also its SEO title) and tokens/pricing articles. Article dates unchanged (wording, not substance) | `index.html`, `content/blog/claude-api.md`, `content/blog/claude-vs-chatgpt.md`, `content/blog/claude-tokens-pricing.md` |
| P2-1 | Home `lastmod` = last commit date of `index.html` (today only while it has uncommitted edits) | `vite.config.js` |
| P2-2 | `…/index.html` → 301 to the directory URL (query kept); `/404.html` answers 404 | `server.mjs` |
| P2-3 | `X-Robots-Tag: noindex` on `/downloads/` (security headers unchanged) | `server.mjs` |
| P2-4 | Contextual links to `/services/` and five low-linked skill pages from the prompt-engineering and Claude API articles | `content/blog/claude-prompt-engineering.md`, `content/blog/claude-api.md` |

Verification: `npm run build` passes. Scripted checks over all 23 built pages: JSON-LD parses, exactly one `#org` Organization with the shared fields on every page that has JSON-LD, all `@id` references and article authors resolve, every page has a title and description, no broken internal links, console is noindex. Local server: `/index.html` → 301 `/`, `/blog/claude-api/index.html` → 301, `/404.html` 404, downloads 200 with `X-Robots-Tag: noindex` and the usual security headers, waitlist API unchanged. No horizontal overflow and no console errors on the landing, an article and the console page.

After deploy: request indexing of `/` and the three edited articles in Search Console; check that `/console.html` drops out of the index over the following weeks; re-run autocomplete and, once available, Search Console queries for «کلود» variants after 4–6 weeks.
