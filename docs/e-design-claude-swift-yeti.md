# Plan — Landing Page "Raio-X Gratuito" (NeonDash Diagnostic Session)

> Plan file. No code yet. Awaits user approval before `/implement`.

## 1. Executive Summary

**Goal.** Build a pt-BR conversion landing page that captures qualified leads for a free diagnostic session ("Sessão de Diagnóstico Gratuita") aimed at clinic owners in saúde estética — funneling toward NeonDash (and, when warranted, Mentoria Black NEON / Black Neon group).

**Complexity:** L5 — new page on a scaffold-state repo. Requires **also** minimum foundation (Layout, content schema, WhatsApp SSOT, shared primitives) because none of it exists yet on this branch.

**Layers touched, in order:**
1. Content schema (Zod, `src/content.config.ts`) — single source of truth for landing copy
2. Content data (`src/content/landings/raio-x.json`) — BLOCO 01–04 copy
3. Lib (`src/lib/whatsapp.ts`) — SDR Laura SSOT (cardinal #6)
4. Layout (`src/layouts/Layout.astro`) — minimal SEO + a11y contract
5. Shared primitive (`src/components/shared/Button.astro`)
6. Landing sections (`src/components/landing/*.astro`) — Hero, Benefits, Qualification, FinalCTA, MobileCTABar
7. Page (`src/pages/raio-x.astro`) — composition only
8. Redirects/sitemap (`astro.config.mjs`) — no tri-sync needed (page is internal)
9. Validation harness (lint + astro check + build + smoke + Lighthouse)

**Recommended route:** `/raio-x` (matches BLOCO 01 headline; clean and memorable). Open decision — user may prefer `/diagnostico-gratuito` or `/neondash-diagnostico`.

---

## 2. Codebase Findings (verified by direct `Read` + `Glob`)

> Three Explore agents were run in parallel. Two of them quoted file contents (skill references) describing a richer prior state — those were stale. The actual filesystem is the authoritative source. Listed below.

### What exists today
- `astro.config.mjs` — Astro 6, `@astrojs/react`, `@astrojs/sitemap`, Tailwind v4 via `@tailwindcss/vite`, Google Fonts via `astro:fonts` (Playfair Display + Inter). **No SSR adapter, no redirects block, no sitemap filter.**
- `src/pages/index.astro` — stub (`<title>GP-US Harmonic Pascal</title>`, empty body). No Layout, no actual home content.
- `src/content.config.ts` — placeholder: `export const collections = {} as Record<...>` — empty.
- `src/styles/global.css` — **complete** design system: Navy/Gold `@theme`, glass / glow / shimmer / mesh-drift / float / gold-pulse utilities, `[data-reveal]` IntersectionObserver classes, `prefers-reduced-motion` blocks, `.skip-link`, `:focus-visible` ring. **Reuse heavily.**
- `package.json` — `bun` only; lint = biome + oxlint; predeploy = `lint && astro check && build`. Deps include `lucide-react@^1.6.0`, `motion@^12.38.0`, `clsx`, `tailwind-merge`. **Zero form / validation library installed.**
- `public/` — favicons + `robots.txt`. **No `og-image.png`, no images directory.**
- `scripts/lighthouse-audit.mjs` exists. `scripts/check-external-urls.mjs` and `scripts/smoke-test.mjs` are **referenced in `package.json` but missing** — their corresponding scripts will fail until added (out of scope here).
- `.claude/skills/grupo-us/references/whatsapp-ssot.md` — defines `WHATSAPP_SDR_E164 = "556294705081"` and the canonical "Olá, Laura!" message prefix. **Skill content; no `src/lib/whatsapp.ts` actually committed.**
- `.claude/skills/grupo-us/references/produtos-e-rotas.md` — declares `/neon-dash` as **external redirect** to `https://neondash.com.br/`. **The redirect is NOT yet wired in `astro.config.mjs`** on this branch. Means the diagnostic landing route must NOT collide with `/neon-dash` if/when the redirect lands.

### What does not exist (must be built)
- `src/layouts/Layout.astro`
- `src/components/` (no shared primitives, no landing sections, no header/footer)
- `src/lib/whatsapp.ts`
- `src/content/**` (no JSON, no MDX)
- Any form, API route, analytics, or webhook integration
- Privacy policy page
- OG image asset

### Cardinal rules pertinent here
- **#3** — No emojis as UI icons. Lucide React only.
- **#4** — Static MPA only. No SSR adapter, no `prerender = false`.
- **#5** — Never hardcode landing copy in `.astro` / `.tsx`. Use `getCollection()`.
- **#6** — Never inline `wa.me/...`. Always go through `src/lib/whatsapp.ts`.
- **#7** — No hex outside `@theme`. Use Navy/Gold tokens.
- **#8** — Never animate layout properties. `transform` + `opacity` only. FAQ uses `<details>` or grid `0fr↔1fr`.

---

## 3. Assumptions and Unknowns

### Decisions confirmed by the user
- **Lead-capture mechanism = Typebot** (conversational form). Embed mode TBD (iframe vs popup-script) — see TASK-2 / TASK-9.
- **Page slug = `/raio-x`**.
- **Foundation scope = minimum-only**. Defer Header / Footer / full nav / full product collection.

### Still-open follow-ups (callable as separate plans, NOT blocking v1)
1. **Typebot endpoint URL** — must be provided before `bun run build` of v1 ships to staging. Plan uses a `TODO` placeholder until then. JSON `primaryCta.url` is the single swap point.
2. **Typebot host** — Typebot Cloud vs self-hosted (Grupo US infra). Affects only the URL, not the implementation. Self-hosted favored for LGPD posture; cloud favored for fastest go-live.
3. **`/politica-de-privacidade` page** — does not exist. Required if any personal data is captured (Typebot collects WhatsApp, e-mail, etc.). Out of v1 scope but flagged as high-priority follow-up; the landing must link to it once it exists.
4. **Analytics** — no tracker installed. Three options: (a) ship without analytics; (b) install Plausible (privacy-friendly, no banner needed for non-PII); (c) install GA4 (requires consent banner). Recommendation: defer to a separate plan; v1 ships analytics-free.
5. **OG image** — no asset exists. Generate `public/og/raio-x.png` (1200×630, ≤ 200KB) or use a minimal Navy/Gold gradient placeholder. Recommend generation in TASK-13.

### Stated assumptions
- Render mode stays static (cardinal #4). No SSR introduced.
- Brand voice + WhatsApp SSOT match the skills definitions even though `src/lib/whatsapp.ts` is not yet committed.
- BLOCO 01–04 copy is preserved verbatim, with only minor pt-BR polish where conversion friction is obvious (called out per change in TASK-3).
- Pre-existing (yet-unwired) `/neon-dash` external redirect is **not** affected by this work.

---

## 4. Recommended Approach

### One-liner
A single internal `/raio-x` page rendered from a typed content-collection JSON, composed of five small `.astro` sections (Hero, Benefits, Qualification, FinalCTA, MobileCTABar), wrapped in a minimal `Layout.astro`. Primary CTA opens a **Typebot conversational form** (iframe embed on a sub-route `/raio-x/perguntas`, or popup via Typebot's standard embed script — see TASK-9); secondary fallback CTA links via `src/lib/whatsapp.ts` to SDR Laura.

### Why this shape
- **Matches existing Grupo US pattern** (per skills): typed content collection drives copy; components only read fields; layout owns SEO + a11y; CTAs route through SSOT lib.
- **Zero new runtime dependencies.** Uses only Astro + Tailwind v4 utilities + lucide-react (already installed). No form lib, no react-hook-form, no client-side validation runtime — Typebot absorbs that complexity. Typebot is loaded via its hosted embed (iframe or `<script>` tag); no npm package added.
- **Static-only safe.** No API routes, no envs, no SSR. Cardinal #4 preserved.
- **Reversible.** Single feature; if Typebot is replaced later (Tally / internal webhook), only the `primaryCta.url` field in the JSON and the embed snippet change.

### Visual hierarchy & conversion architecture
- One `<h1>` (Hero), strong tagline ("Raio-X Gratuito"), primary CTA above the fold.
- Single conversion goal per section. No competing nav.
- Trust signals: Dra. Sacha bio paragraph (small, optional), urgency microcopy ("vagas limitadas por semana") matching BLOCO 04.
- Mobile sticky CTA bar (transform-only animation, safe-area-inset).
- Reading time ≤ 90 seconds at scroll.

---

## 5. Proposed Landing Page Structure

### Route
`/raio-x` (rendered statically from `src/pages/raio-x.astro`).

### Component tree
```
Layout.astro                       (minimal: head, fonts, skip-link, jsonLd, footer)
└── raio-x.astro                   (page; reads landing entry from getCollection())
    ├── DiagnosticHero.astro       (BLOCO 01 — h1, tagline, sub, primary CTA + helper)
    ├── DiagnosticBenefits.astro   (BLOCO 02 — bulleted list, lucide icons)
    ├── DiagnosticQualification.astro (BLOCO 03 — "Esta sessão é para você se" checklist)
    ├── DiagnosticFinalCTA.astro   (BLOCO 04 — urgency + primary CTA + microcopy)
    └── MobileCTABar.astro         (sticky CTA on small viewports)
```

### Section specs (per `.claude/rules/DESIGN.md` + `frontend.md`)

| Section | Purpose | Key elements | Hydration |
|---|---|---|---|
| **DiagnosticHero** | First-impression conversion | `<h1>` (Playfair, `text-shimmer` on key word), tagline, sub-paragraph, primary `Button` (gold, `gold-pulse-glow`), microcopy "Vagas limitadas" | Pure Astro (no JS) |
| **DiagnosticBenefits** | Show what user gets | 5 bullet items, lucide icons (`Stethoscope`, `Target`, `Lightbulb`, `Map`, `Users`), `glass-card` container | Pure Astro |
| **DiagnosticQualification** | Self-selection | 3 bullets ("Esta sessão é para você se…"), check icons, sober card | Pure Astro |
| **DiagnosticFinalCTA** | Final close | Headline, capacity-limit copy, primary `Button`, microcopy under it | Pure Astro |
| **MobileCTABar** | Reduce mobile friction | Fixed bottom bar < md, primary CTA, safe-area-inset padding | Pure Astro (CSS-only sticky) |

> All sections use existing utilities from `src/styles/global.css`: `glass-card`, `glass-card-bright`, `gold-pulse-glow`, `card-hover-lift`, `text-shimmer`, `text-gradient-gold`, `landing-mesh-bg`, `[data-reveal]` data attrs.
> No React island is needed for v1 (no carousel, no accordion). If FAQ is later added, use **native `<details>`** or CSS grid `0fr↔1fr` (cardinal #8).

### Shared primitive
`src/components/shared/Button.astro` — variants `primary | whatsapp | outline | ghost`, sizes `sm | md | lg`, optional `href`, `target`, `aria-label`. Used by Hero, FinalCTA, MobileCTABar.

### Layout contract (minimum-viable)
`src/layouts/Layout.astro` accepts:
- `title: string` (≤ 60 chars)
- `description: string` (≥ 120 chars, ≤ 160 chars)
- `ogImage?: string` (default `/og/raio-x.png`)
- `canonical?: string`
- `jsonLd?: Record<string, unknown>` — emitted as `<script type="application/ld+json">`
- `breadcrumbs?: Array<{name, url}>` — if provided, BreadcrumbList JSON-LD added.

Includes:
- `<html lang="pt-BR">`, `<meta charset>`, `<meta viewport>`, favicon, font preconnect (Astro `astro:fonts` already handles it via `Font` component or the default emit).
- Skip-link as first focusable, target `#conteudo-principal`.
- `<noscript>` rule forcing `[data-reveal] { opacity: 1 !important; }` (a11y; matches existing `global.css` reveal pattern).
- Inline `IntersectionObserver` script for `[data-reveal]` (try / catch + degrade).
- Default Organization JSON-LD (per `.claude/rules/seo.md`).

### Content collection
Define a new collection `landings` (or extend `products`) in `src/content.config.ts`. Recommendation: **separate `landings` collection** to avoid bloating the product schema with funnel-specific fields.

```ts
const landings = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "src/content/landings" }),
  schema: z.object({
    slug: z.string(),
    seo: z.object({
      title: z.string().max(60),
      description: z.string().min(120).max(180),
      ogImage: z.string().optional(),
      canonical: z.string().url().optional(),
    }),
    hero: z.object({
      eyebrow: z.string().optional(),
      headline: z.string(),
      tagline: z.string(),
      subhead: z.string(),
      cta: z.object({
        label: z.string(),
        helperText: z.string().optional(),
      }),
    }),
    benefits: z.object({
      headline: z.string(),
      items: z.array(z.object({
        icon: z.string(),
        title: z.string(),
        description: z.string().optional(),
      })).min(3),
    }),
    qualification: z.object({
      headline: z.string(),
      items: z.array(z.string()).min(3),
    }),
    finalCta: z.object({
      headline: z.string(),
      paragraphs: z.array(z.string()).min(1),
      cta: z.object({
        label: z.string(),
        microcopy: z.string().optional(),
      }),
    }),
    primaryCta: z.object({
      mode: z.enum(["typebot-iframe", "typebot-popup", "external-url", "whatsapp"]),
      url: z.string().url(),
      whatsappMessage: z.string().startsWith("Olá, Laura!").optional(),
    }),
  }),
});

export const collections = { landings };
```

### Content data
`src/content/landings/raio-x.json` — uses copy from BLOCO 01–04 verbatim. `primaryCta.mode = "typebot-iframe"` (default; `"typebot-popup"` if Typebot's `<script>`-based bubble/popup is preferred). `primaryCta.url` points to the Typebot endpoint (placeholder `https://typebot.io/grupo-us-raio-x` until the real URL is provided — single-line swap when ready).

---

## 6. Lead Capture Flow

### Primary path — Typebot conversational form
Two embed strategies; pick **one** at TASK-9 time:

**6.A. Iframe embed on a sub-route (recommended for v1)**
1. Primary CTA `<a href="/raio-x/perguntas">` (same-origin link, no `target="_blank"`).
2. `src/pages/raio-x/perguntas.astro` is a **minimal page** (Layout + a single `<iframe src="{typebotUrl}" title="Sessão de Diagnóstico — Perguntas" allow="clipboard-write" class="w-full h-[100dvh]" loading="eager"></iframe>`). No analytics, no chrome.
3. Typebot collects: nome, WhatsApp, e-mail, nome da clínica/consultório, cidade/UF, estágio (já tem clínica? está estruturando?), principal gargalo (open-text), faixa de faturamento (optional select), checkbox de aceite LGPD.
4. Typebot fires its native webhook → Grupo US ops (email / CRM / n8n — handled inside Typebot, not in this repo).
5. Typebot redirects to `/raio-x/obrigado` (static thank-you page — **out of v1 scope unless approved**).

**6.B. Popup script embed (alternative)**
1. Add the Typebot embed `<script type="module">` only inside `DiagnosticFinalCTA.astro` (`is:inline` to avoid Vite processing).
2. Primary CTA fires `Typebot.open()` (no navigation).
3. Initial JS budget impact: ~15–25KB module-loaded only after click — acceptable.
4. Slightly higher complexity vs iframe; lower context-switch for the user.

> Either way, the JSON `primaryCta.url` is the single source for the Typebot endpoint. Cardinal #5 preserved.

### Secondary CTA (fallback)
- `src/lib/whatsapp.ts` exposes `whatsappUrlWithText(message)`. An outline button in `DiagnosticFinalCTA` ("Prefere conversar direto? Fale com a Laura") routes to `wa.me/556294705081?text=Olá, Laura! …`.

### LGPD posture
- Typebot embeds the consent checkbox + privacy notice **inside** the conversational flow.
- Grupo US must add `/politica-de-privacidade` — **does not exist yet, flagged as high-priority follow-up**. The landing copy must link to it once it exists; for v1 we can either link to a placeholder or omit the link, with rationale recorded.
- Iframe embed (6.A) keeps cookie scope on the Typebot host — no first-party cookies set by `harmonic-pascal.grupous.com.br` from the form itself.

### Analytics events (deferred — see follow-up #4)
If/when a tracker lands, instrument:
- `cta_click` (location: hero | final | mobile-bar)
- `external_link_click` (Typebot / WhatsApp)
- Form-completion events handled inside Typebot.

---

## 7. Atomic Task Plan

### TASK-1: Define `landings` content collection schema
- **Goal:** Type-safe SSOT for landing copy.
- **Scope:** Add `landings` collection to `src/content.config.ts` with the Zod schema above. Do not touch other collections.
- **Likely files:** `src/content.config.ts`.
- **Subtasks:**
  - [ ] Import `defineCollection`, `z` from `astro:content`, `glob` from `astro/loaders`.
  - [ ] Declare `landings` collection with the schema in §5.
  - [ ] Export updated `collections` object.
- **Dependencies:** none.
- **Validation:** `bunx astro check` — schema compiles. `bun run lint`.
- **Rollback:** Revert single file.
- **Done when:** `bunx astro check` returns 0 errors with the schema present.
- **Risk:** Low.

### TASK-2: Author `raio-x` content JSON
- **Goal:** Land BLOCO 01–04 copy in typed JSON.
- **Scope:** Create `src/content/landings/raio-x.json`. Copy verbatim. Polish only where called out below.
- **Likely files:** `src/content/landings/raio-x.json`.
- **Subtasks:**
  - [ ] Map BLOCO 01 → `hero` (headline `Raio-X Gratuito`, tagline = primary subhead, sub = second paragraph, cta.label `Quero minha Sessão!`).
  - [ ] Map BLOCO 02 → `benefits.items` (5 items, with `icon` strings: `Stethoscope`, `Target`, `Lightbulb`, `Map`, `Users`).
  - [ ] Map BLOCO 03 → `qualification.items` (3 strings).
  - [ ] Map BLOCO 04 → `finalCta` with `cta.label = Quero minha Sessão de Diagnóstico Gratuita`, `cta.microcopy = Preencha as perguntas e garanta sua vaga!`.
  - [ ] Set `primaryCta.mode = "typebot-iframe"` (default) or `"typebot-popup"` per chosen strategy in TASK-9. `primaryCta.url` = `https://typebot.io/<grupo-us-id>` placeholder + `// TODO: replace before staging deploy`.
  - [ ] Fill `seo.title` (≤ 60ch, e.g., `Raio-X Gratuito — Diagnóstico para sua Clínica | Grupo US`), `seo.description` (≥ 120ch, ≤ 180ch).
- **Polish (rationale flagged inline):**
  - BLOCO 01 sub-headline: tighten to one sentence for above-fold readability — preserve meaning.
  - BLOCO 03 add an opening connector sentence so the bulleted list reads as a coherent block.
- **Dependencies:** TASK-1.
- **Validation:** `bunx astro check` — JSON validates against schema.
- **Rollback:** Delete file.
- **Done when:** Astro build picks up the entry and `getCollection("landings")` returns it.
- **Risk:** Low.

### TASK-3: WhatsApp SSOT lib (cardinal #6)
- **Goal:** Centralize WhatsApp URL construction; never inline `wa.me`.
- **Scope:** Add `src/lib/whatsapp.ts`. Export `WHATSAPP_SDR_E164`, `WHATSAPP_DEFAULT_SITE_MESSAGE`, `whatsappUrlWithText(message)`, `isWhatsAppDestination(url)`.
- **Likely files:** `src/lib/whatsapp.ts`.
- **Subtasks:**
  - [ ] Define `WHATSAPP_SDR_E164 = "556294705081"` per skill SSOT.
  - [ ] Implement `whatsappUrlWithText` using `encodeURIComponent`.
  - [ ] Implement `isWhatsAppDestination` regex match on `wa.me/<E164>`.
  - [ ] Default exported message starts `Olá, Laura!`.
- **Dependencies:** none.
- **Validation:** Type-check + lint pass. Hand-trace one call.
- **Rollback:** Delete file.
- **Done when:** `whatsappUrlWithText("Olá, Laura! teste").includes("Ol%C3%A1%2C+Laura%21")` (URL-encoded) and the function is the only place URL building happens.
- **Risk:** Low.

### TASK-4: Minimal `Layout.astro`
- **Goal:** SEO + a11y contract for the page.
- **Scope:** Create `src/layouts/Layout.astro` with the props in §5 "Layout contract". Include skip-link, `<main id="conteudo-principal">`, default Organization JSON-LD, optional BreadcrumbList JSON-LD, optional custom `jsonLd`, `<noscript>` reveal fallback, IntersectionObserver inline script with try/catch.
- **Likely files:** `src/layouts/Layout.astro`.
- **Subtasks:**
  - [ ] Frontmatter: typed `Props`, derive defaults (`ogImage = "/og/raio-x.png"`).
  - [ ] `<head>`: meta charset, viewport, robots, title, description, canonical, OG, Twitter, fonts (Astro 6 `astro:fonts` `<Font />` if applicable).
  - [ ] `<body>`: skip-link → `<main id="conteudo-principal" tabindex="-1">` → `<slot />`.
  - [ ] Default Organization JSON-LD inline.
  - [ ] Inline IntersectionObserver wrapped in try/catch (per `.claude/rules/stability.md` rule E).
  - [ ] `<noscript>` reveals all `[data-reveal]` content.
- **Dependencies:** none.
- **Validation:** `bunx astro check` + `bun run build`. Manual: tab from URL bar — first focus = skip-link.
- **Rollback:** Delete file.
- **Done when:** Lighthouse a11y ≥ 95 on a smoke render, JSON-LD validates in Rich Results Test.
- **Risk:** Medium (cross-cutting; touches every future page).

### TASK-5: Shared `Button.astro` primitive
- **Goal:** Reusable CTA primitive matching brand.
- **Scope:** `src/components/shared/Button.astro`. Variants: `primary` (gold bg + navy fg + `gold-pulse-glow` optional), `whatsapp` (green-tinted gold), `outline` (gold border, transparent bg), `ghost`. Sizes: `sm | md | lg`. Optional `href`, `target`, `rel`, `ariaLabel`, `class`.
- **Likely files:** `src/components/shared/Button.astro`.
- **Subtasks:**
  - [ ] Define `Props` interface.
  - [ ] Render `<a>` when `href` present, else `<button type="button">` (cardinal: never `href="#"`).
  - [ ] Auto-set `rel="noopener noreferrer"` when `target="_blank"`.
  - [ ] Active state: `active:scale-[0.98]` (transform-only).
  - [ ] `:focus-visible` ring inherited from global.
  - [ ] Min touch target ≥ 44×44px on `lg`.
- **Dependencies:** none.
- **Validation:** Render all 4 variants in a smoke `index.astro` preview, tab through.
- **Rollback:** Delete file.
- **Done when:** Variants render correctly; keyboard-accessible; passes contrast.
- **Risk:** Low.

### TASK-6: `DiagnosticHero.astro`
- **Goal:** Above-fold conversion section.
- **Scope:** New file under `src/components/landing/`.
- **Likely files:** `src/components/landing/DiagnosticHero.astro`.
- **Subtasks:**
  - [ ] Accept `Props`: `eyebrow?`, `headline`, `tagline`, `subhead`, `cta: { label, url, helperText? }`.
  - [ ] `<section class="landing-mesh-bg">`, container `max-w-6xl mx-auto px-6 lg:px-8 py-20 md:py-28`.
  - [ ] `<h1>` Playfair, gradient highlight on key word via `text-gradient-gold` or `text-shimmer`.
  - [ ] Tagline + subhead Inter, muted.
  - [ ] Primary `Button` (size `lg`, `gold-pulse-glow`).
  - [ ] Microcopy below CTA (≥ 3:1 contrast).
  - [ ] `data-reveal="up"` on key children with staggered delays.
  - [ ] Lucide icon next to CTA optional (`ArrowRight`).
- **Dependencies:** TASK-5.
- **Validation:** Visual smoke; reveal disabled under `prefers-reduced-motion`.
- **Rollback:** Delete file.
- **Done when:** Renders headline + CTA above the fold on 1280×720; tab focuses CTA; CLS = 0.
- **Risk:** Low.

### TASK-7 [PARALLEL with TASK-8/9/10]: `DiagnosticBenefits.astro`
- **Goal:** BLOCO 02 list with icons.
- **Scope:** New file under `src/components/landing/`.
- **Likely files:** `src/components/landing/DiagnosticBenefits.astro`.
- **Subtasks:**
  - [ ] Accept `Props`: `headline`, `items: Array<{icon, title, description?}>`.
  - [ ] Resolve `icon` string → `lucide-react` component (use a small whitelist map; no `import * as Icons`).
  - [ ] `glass-card` for each row OR a single rounded container with stacked rows; choose the stacked rows variant for clarity at low viewports.
  - [ ] `data-reveal="up"` per row, `data-reveal-delay` 1..5.
- **Dependencies:** TASK-5.
- **Validation:** Visual smoke; icons render; mobile single-column.
- **Rollback:** Delete file.
- **Done when:** All five BLOCO 02 bullets render with icon + title.
- **Risk:** Low.

### TASK-8 [PARALLEL]: `DiagnosticQualification.astro`
- **Goal:** BLOCO 03 self-qualification list.
- **Scope:** New file under `src/components/landing/`.
- **Likely files:** `src/components/landing/DiagnosticQualification.astro`.
- **Subtasks:**
  - [ ] Accept `Props`: `headline`, `items: string[]`.
  - [ ] Render check-icon (`Check`) + line per item.
  - [ ] Single `glass-card` wrapper.
  - [ ] `data-reveal="up"` staggered.
- **Dependencies:** none beyond global utilities.
- **Validation:** Visual smoke; bullets render in pt-BR.
- **Rollback:** Delete file.
- **Done when:** Three bullets render correctly; layout responsive.
- **Risk:** Low.

### TASK-9 [PARALLEL]: `DiagnosticFinalCTA.astro` + Typebot wiring
- **Goal:** BLOCO 04 final close + finalize Typebot embed strategy.
- **Scope:** New file under `src/components/landing/`. Decide between embed strategy 6.A (iframe sub-route) or 6.B (popup script). Default = 6.A.
- **Likely files:** `src/components/landing/DiagnosticFinalCTA.astro`. If 6.A: also `src/pages/raio-x/perguntas.astro`. If 6.B: inline `is:inline` `<script type="module">` from Typebot.
- **Subtasks:**
  - [ ] Accept `Props`: `headline`, `paragraphs`, `cta: {label, url, microcopy?}`, `secondaryCta?` (WhatsApp fallback), `embedMode: "iframe-route" | "popup"`.
  - [ ] `glass-card-bright` wrapper.
  - [ ] Primary `Button` (size `lg`, gold). For `iframe-route`: `href="/raio-x/perguntas"`. For `popup`: `data-typebot-open` attr + onClick wiring per Typebot docs.
  - [ ] Optional secondary `Button` (variant `outline`, label "Falar direto com a Laura"). WhatsApp URL via `whatsappUrlWithText(...)` (TASK-3) — never inline `wa.me`.
  - [ ] If `iframe-route`: create `src/pages/raio-x/perguntas.astro` (Layout title `Perguntas — Sessão de Diagnóstico Gratuita`, `noindex` meta robots, single full-viewport iframe).
  - [ ] If `popup`: gate the Typebot `<script type="module" is:inline>` snippet to avoid Vite processing.
- **Dependencies:** TASK-3, TASK-5; if `iframe-route` also TASK-4 (Layout).
- **Validation:** Click CTA; Typebot loads; first interaction reachable. `data-reveal` honored under reduced motion. `lighthouse:audit` budget unaffected (iframe doesn't count toward `/raio-x` JS).
- **Rollback:** Delete file (and `perguntas.astro` if created).
- **Done when:** CTA wired to Typebot; WhatsApp fallback uses lib; no inline `wa.me`; `/raio-x/perguntas` (if used) has `noindex`.
- **Risk:** Medium (depends on Typebot URL availability + chosen embed mode).

### TASK-10 [PARALLEL]: `MobileCTABar.astro`
- **Goal:** Sticky mobile CTA — reduce conversion friction on small viewports.
- **Scope:** New file under `src/components/landing/`.
- **Likely files:** `src/components/landing/MobileCTABar.astro`.
- **Subtasks:**
  - [ ] Render only `< md` (Tailwind `md:hidden`).
  - [ ] Fixed bottom, full width, safe-area-inset padding (`pb-[env(safe-area-inset-bottom,0px)]`).
  - [ ] Single primary `Button` (size `md`, full width).
  - [ ] Backdrop blur + `glass-card-bright` style.
- **Dependencies:** TASK-5.
- **Validation:** DevTools 360px viewport — bar pinned bottom, doesn't overlap content. Page sets `pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0` so last section isn't hidden.
- **Rollback:** Delete file.
- **Done when:** Visible only on mobile; CTA tap target ≥ 44px; respects safe-area.
- **Risk:** Low.

### TASK-11: `raio-x.astro` page composition
- **Goal:** Wire content + sections under Layout.
- **Scope:** New file `src/pages/raio-x.astro`. Read entry from `getCollection("landings")`, fail fast if missing.
- **Likely files:** `src/pages/raio-x.astro`.
- **Subtasks:**
  - [ ] Frontmatter: import sections, Layout, get entry.
  - [ ] `if (!entry) throw new Error("landing raio-x not found")`.
  - [ ] Build per-page JSON-LD (Service or Event schema — recommend Service since the diagnostic isn't a scheduled event).
  - [ ] Compose sections in order: Hero, Benefits, Qualification, FinalCTA, MobileCTABar.
  - [ ] Pass `hasBottomBar` semantics via `pb-...` wrapper div per TASK-10 spec.
  - [ ] Set `Layout` props: `title`, `description`, `ogImage`, `breadcrumbs=[{Home, /}, {Raio-X Gratuito, /raio-x}]`, `jsonLd`.
- **Dependencies:** TASK-1..-10.
- **Validation:** `bunx astro check`, `bun run build`, then `bun run preview` and open `/raio-x`.
- **Rollback:** Delete file.
- **Done when:** Page builds; route accessible at `/raio-x`; manual browser smoke (golden path) green.
- **Risk:** Low.

### TASK-12: Sitemap entry & priority
- **Goal:** Index `/raio-x` correctly.
- **Scope:** `astro.config.mjs` — extend the (currently absent) `sitemap()` config with a `serialize` map for the new route. No `redirects` and no `filter()` change required (page is internal).
- **Likely files:** `astro.config.mjs`.
- **Subtasks:**
  - [ ] Add `sitemap({ serialize(item) { ... } })` with `/raio-x` priority `0.9`, changefreq `monthly`.
  - [ ] Confirm no exclusion filter is needed (`/raio-x` is canonical).
- **Dependencies:** TASK-11.
- **Validation:** `bun run build` then inspect `dist/sitemap-0.xml` for `/raio-x`.
- **Rollback:** Revert config.
- **Done when:** Sitemap contains `/raio-x` with the right priority.
- **Risk:** Low.

### TASK-13: OG image asset
- **Goal:** Provide OG/Twitter card image at `/og/raio-x.png` (1200×630).
- **Scope:** Static asset only. Either generate via design tool or use a Navy/Gold gradient with the headline in Playfair.
- **Likely files:** `public/og/raio-x.png`.
- **Subtasks:**
  - [ ] Create asset 1200×630 PNG ≤ 200KB.
  - [ ] Add to `public/og/`.
  - [ ] Reference matches `seo.ogImage` in the JSON.
- **Dependencies:** none.
- **Validation:** Twitter Card validator + Facebook Sharing Debugger.
- **Rollback:** Delete file; `Layout.astro` falls back to default.
- **Done when:** Sharing preview renders correctly with no 404.
- **Risk:** Low.

### TASK-14: Quality gates + smoke
- **Goal:** Final verification.
- **Scope:** Run lint + check + build + Lighthouse + manual a11y/keyboard smoke.
- **Likely files:** none (validation only).
- **Subtasks:**
  - [ ] `bun run lint` (biome + oxlint).
  - [ ] `bunx astro check` (Astro + TS).
  - [ ] `bun run build`.
  - [ ] `bun run preview` then `bun run lighthouse:audit` against `/raio-x`.
  - [ ] Manual: skip-link first-focus, keyboard tab through all CTAs, `prefers-reduced-motion` emulated, JS off (noscript content visible), 360px and 1280px viewports.
- **Dependencies:** TASK-1..-13.
- **Validation:** Lighthouse ≥ 95 on Performance / A11y / Best Practices / SEO. CLS = 0. Initial JS < 50KB.
- **Rollback:** None — fix-forward.
- **Done when:** All gates green per `.claude/config.json::gates`.
- **Risk:** Medium (perf budget can be tight with mesh-drift animation; mitigate by disabling on mobile per existing CSS).

---

## 8. Validation Plan

| Layer | Command | Pass criterion |
|---|---|---|
| Schema | `bunx astro check` | 0 errors |
| Lint | `bun run lint` | 0 violations |
| Build | `bun run build` | exits 0; `/raio-x` HTML in `dist/raio-x/index.html` |
| Sitemap | grep `/raio-x` in `dist/sitemap-0.xml` | present, priority 0.9 |
| Lighthouse | `bun run lighthouse:audit` (script exists) | Perf / A11y / BP / SEO ≥ 95 each |
| CWV | Lighthouse + DevTools | LCP < 2.5s, CLS = 0, INP < 100ms |
| JS budget | `ls dist/_astro/*.js` | initial < 50KB |
| A11y manual | Chrome DevTools | skip-link → main; focus rings; reduced-motion honored |
| Smoke (NoJS) | DevTools → Disable JS | All `[data-reveal]` content visible via `<noscript>` rule |
| Cardinal #6 | `grep -rn "wa.me/" src/` | only inside `src/lib/whatsapp.ts` |
| Cardinal #7 | `grep -rnE "bg-\[#\|text-\[#" src/` | empty |
| Cardinal #8 | `grep -rnE "transition.*\\b(width\|height\|top\|left\|padding\|margin)\\b" src/` | empty |

> `bun run check:external-urls` and `bun run smoke-test` reference scripts that **don't exist on this branch**. They will exit non-zero. Out of scope for this plan — flagged as a follow-up.

---

## 9. Risks and Rollback

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Typebot URL not finalized at build time | High | Medium | Use placeholder URL + `TODO` comment in JSON; do not deploy v1 to staging until real URL provided. Rollback = swap URL in JSON only. |
| Typebot popup-script bumps initial JS budget if loaded eagerly | Medium | Medium | Default to iframe-route (6.A). If 6.B chosen, gate the `<script type="module" is:inline>` to load on click only or via `'use client'` defer pattern. |
| Typebot iframe blocks page interactivity if oversized | Low | Low | Iframe lives on its own route `/raio-x/perguntas`; landing keeps pure static HTML. |
| `prefers-reduced-motion` regression from `landing-mesh-bg` animation | Medium | Low | Existing CSS already disables on mobile; verify also disabled under `prefers-reduced-motion: reduce`. |
| LGPD non-compliance if Tally is replaced by an internal form later | Low (current scope) | High (future) | Tally handles it for v1. Add `/politica-de-privacidade` before any internal-form rollout. |
| Layout.astro becomes a cross-cutting blocker (every future page depends on it) | Medium | Medium | Keep this Layout minimal; don't hard-code product nav. Future product pages can extend. |
| `/neon-dash` redirect lands later and collides | Low | Low | `/raio-x` has no overlap. Future redirect work should not touch `/raio-x`. |
| Lighthouse perf < 95 due to font payload | Medium | Medium | Astro 6 `astro:fonts` self-hosts and subsets; verify only the weights listed in `astro.config.mjs` are emitted. |
| Initial JS > 50KB if a future React island is added | Low (no island in v1) | Medium | v1 ships zero JS islands on `/raio-x`. Re-evaluate when adding any. |

### Rollback ladder
1. **Per-task:** delete the new file (mostly net-new files, no edits to shared shipped code outside `astro.config.mjs` and `content.config.ts`).
2. **CTA destination:** swap `primaryCta.url` value in `src/content/landings/raio-x.json` — single line.
3. **Whole feature:** delete `src/pages/raio-x.astro` + `src/content/landings/raio-x.json` + `src/components/landing/Diagnostic*` + revert sitemap config. Layout / Button / lib/whatsapp.ts stay (still useful generally).

---

## 10. Acceptance Criteria

- [ ] `/raio-x` renders statically and is reachable via direct URL.
- [ ] BLOCO 01–04 copy is present, sourced from `src/content/landings/raio-x.json`, validated by Zod.
- [ ] Primary CTA opens the Typebot conversational form (iframe sub-route `/raio-x/perguntas` by default, or popup when chosen). External links carry `rel="noopener noreferrer"` if `target="_blank"`.
- [ ] If `/raio-x/perguntas` is used as the iframe host, it emits `<meta name="robots" content="noindex">`.
- [ ] Secondary CTA (if rendered) routes through `src/lib/whatsapp.ts` — no inline `wa.me/`.
- [ ] One `<h1>`; landmarks `<main>`, `<footer>`; skip-link is the first focusable element.
- [ ] Focus visible on every interactive element; keyboard-only navigation works end-to-end.
- [ ] Animations respect `prefers-reduced-motion`; no layout properties animated.
- [ ] `<noscript>` fallback reveals all `[data-reveal]` content.
- [ ] Mobile sticky CTA bar visible only `< md`, respects `safe-area-inset`.
- [ ] Lighthouse ≥ 95 on Perf / A11y / BP / SEO.
- [ ] CLS = 0; LCP < 2.5s; initial JS < 50KB.
- [ ] OG image at `/og/raio-x.png` exists and validates in OG/Twitter scrapers.
- [ ] Page-level Service JSON-LD validates in Google Rich Results Test.
- [ ] Sitemap includes `/raio-x` with priority 0.9.
- [ ] No new dependency added to `package.json`.
- [ ] Cardinal rules #3–#8 grep checks pass (see §8).
- [ ] No SSR adapter introduced; `bun run build` produces a static `dist/raio-x/index.html`.

---

## 11. Implementation Order

```
TASK-1   (schema)               ─┐
TASK-3   (lib/whatsapp.ts)      ─┼─ foundation, sequential first
TASK-4   (Layout.astro)         ─┘
TASK-5   (Button)               ─→ depends on Layout being stable
TASK-2   (raio-x.json content)  ─→ depends on schema (TASK-1)
TASK-6   (Hero)                 ─┐
TASK-7   (Benefits)             ─┤
TASK-8   (Qualification)        ─┼─ PARALLEL — depend on TASK-5/3
TASK-9   (FinalCTA)             ─┤
TASK-10  (MobileCTABar)         ─┘
TASK-11  (raio-x.astro page)     ─→ depends on TASK-1..-10
TASK-12  (sitemap entry)         ─→ depends on TASK-11
TASK-13  (OG image)              ─→ PARALLEL with TASK-12
TASK-14  (gates + smoke)         ─→ final
```

---

## Confirmed by user
- Lead-capture mechanism: **Typebot** conversational form.
- Page slug: **`/raio-x`**.
- Foundation scope: **minimum-only**.

## Still-needed inputs before staging deploy
1. **Typebot endpoint URL** (required to swap `primaryCta.url` placeholder).
2. **Typebot embed mode** (iframe sub-route 6.A vs popup 6.B). Default = 6.A.
3. **Typebot host** (cloud vs self-hosted) — affects only the URL, not the implementation.

---

## Self-check

- Tasks atomic + testable: yes.
- No implementation performed: yes (plan-only).
- No destructive action without warning: yes.
- Existing project patterns respected: cardinals enforced, brand SSOT honored.
- Unknowns labeled: all open decisions called out.
- Validation concrete + realistic: every command exists in `package.json` (except `check:external-urls` / `smoke-test`, flagged).
- Page focused on lead capture: yes.
- Provided copy preserved: yes; only minor polish flagged with rationale.
- Responsive / a11y / SEO / analytics / LGPD covered: yes (analytics + LGPD as open decisions when escalation needed).
