# Plan: Raio-X Landing Redesign + Dra. Sacha Photos

**Date:** 2026-05-11
**Slug:** `e-design-analise-toda-quiet-frost`
**Complexity:** L6 — touches schema + data + 8 landing components + theme tokens + new asset pipeline
**Layers (execution order):** Assets → Schema → Data SSOT → Theme tokens → Presentation (8 components) → Cross-cutting (a11y, perf) → Verification
**Render mode:** Astro static (cardinal #4) — preserved; no SSR, no SPA

---

## Context

Site is live at `raiox.gpus.com.br` with Lighthouse 100×4 (per 2026-05-04 learning). Current landing renders at `/` (home) — the `/raio-x` path is redirected to `/` in `astro.config.mjs`. Inventory confirmed:

- All 10 landing sections live as pure Astro under `src/components/landing/`
- Copy SSOT in `src/content/landings/raio-x.json` (cardinal #5)
- Brand is Navy/Gold — gold is the accent (cardinal #7)
- FAQ already uses native `<details>` + CSS grid `0fr↔1fr` (cardinal #8 compliant)
- DiagnosticHero currently renders **no photo** — schema already exposes `hero.image` as optional but unused

The redesign brief introduces a 7-dobra spec and 6 source photos under `docs/logos/fotos/`. The task: implement every layout/visual change while honoring all cardinals (no SPA, no inline hex, no animated layout properties, copy in SSOT only).

### Decisions confirmed with user

1. **Accent stays gold** (brand canon — no orange/green added for CTAs)
2. **Social proof line**: generic "★★★★★  Avaliação dos donos de clínica atendidos" (no unverified "200 clínicas" count)
3. **New `--color-success` + `--color-success-soft`** tokens added to `@theme` for the "é pra você" column (light green)
4. **Photo pipeline**: introduce `astro:assets` + move 3 best photos to `src/assets/sacha/`

### Photo mapping (from inventory)

| Photo | Use | Why |
|---|---|---|
| `sacha3.jpg` (4657×6986) | Hero | ¾ bust, confident smile, neutral dark background, best lighting |
| `sacha4.jpg` (4240×6360) | Como Funciona | Working environment (conference table), welcoming, professional |
| `sacha1.jpg` (2860×4289) | CTA Final | Centered bust, big smile, ideal for circular crop |

Other 3 photos stay in `docs/logos/fotos/` for future use (not deleted, not promoted).

---

## Phase 0: Asset pipeline [SEQUENTIAL — blocks all UI work]

Introduce `astro:assets` once so every future photo flows through the same pipeline.

- [ ] Create `src/assets/sacha/` directory
- [ ] Copy 3 selected photos into `src/assets/sacha/` (rename to lowercase semantic names):
  - `docs/logos/fotos/sacha3.jpg` → `src/assets/sacha/sacha-hero.jpg`
  - `docs/logos/fotos/sacha4.jpg` → `src/assets/sacha/sacha-equipe.jpg`
  - `docs/logos/fotos/sacha1.jpg` → `src/assets/sacha/sacha-cta.jpg`
- [ ] Verify `astro.config.mjs` has no opt-out of the default image service (it doesn't — confirmed)
- [ ] No need to install `sharp` separately; Astro 6 ships with it as default service

**Verify:** `bunx astro check` (no errors after schema update in Phase 1)

---

## Phase 1: Schema extension [SEQUENTIAL — blocks Data]

**File:** `src/content.config.ts`

Landings schema already has `hero.image` optional. Extend so `howItWorks` and `finalCta` can carry images sourced from `src/assets/`.

- [ ] In the `landings` collection definition, add `image()` import (`import { defineCollection, z, reference } from "astro:content"` + image helper from schema callback): switch landings to the `defineCollection({ schema: ({ image }) => z.object({...}) })` form
- [ ] Change `hero.image.src` from `z.string()` to `image()` (or accept both via union if existing JSON references public paths — none do per inventory)
- [ ] Add `howItWorks.image` optional: `{ src: image(), alt: z.string(), objectPosition: z.string().optional() }`
- [ ] Add `finalCta.image` optional: `{ src: image(), alt: z.string(), objectPosition: z.string().optional() }` — used as the circular portrait

**Verify:** `bunx astro check` — schema compiles, existing JSON still parses (image fields are optional)

---

## Phase 2: Data SSOT update [SEQUENTIAL — blocks Presentation]

**File:** `src/content/landings/raio-x.json`

Per cardinal #5, every copy or image reference goes here, not in `.astro`.

- [ ] `hero.image`: `{ src: "../../assets/sacha/sacha-hero.jpg", alt: "Dra. Sacha, retrato profissional", priority: true }`
- [ ] `howItWorks.image`: `{ src: "../../assets/sacha/sacha-equipe.jpg", alt: "Dra. Sacha em ambiente de trabalho", objectPosition: "center top" }`
- [ ] `finalCta.image`: `{ src: "../../assets/sacha/sacha-cta.jpg", alt: "Dra. Sacha sorrindo", objectPosition: "center top" }`
- [ ] In `hero.headline`: keep current copy but mark "Gratuito" as the highlight token — strategy: split headline into `headlineParts: { lead: string, highlight: string, tail: string }` so the component can wrap `highlight` in a `<span class="text-gold">`. Update schema to make `headlineParts` optional alongside legacy `headline` string.
- [ ] Confirm `howItWorks.steps[].duration` exists (it should per "≤2 min", "24h", "45 min" badges in the brief). If missing, add `duration?: string` to schema + populate per step.
- [ ] Add `finalCta.socialProof`: `{ stars: 5, text: "Avaliação dos donos de clínica atendidos" }` (per user decision #2). Schema gets optional `socialProof` object.

**Verify:** `bunx astro check` — JSON validates against extended schema

---

## Phase 3: Theme tokens [SEQUENTIAL — blocks Para Você column]

**File:** `src/styles/global.css`

Add success palette + scanner texture utility. All hex stays inside `@theme` per cardinal #7.

- [ ] In `@theme` block, add (after gold scale):
  ```css
  --color-success: #2f9e6b;        /* HSL ~150° 55% 40% — readable on light bg */
  --color-success-light: #4cb583;
  --color-success-soft: #e8f5ee;   /* tint for fit-column bg */
  --color-neutral-soft: #f1f1ef;   /* tint for not-fit-column bg */
  ```
- [ ] In `@layer utilities`, add `.scanner-grid-bg`: pure CSS `background-image: repeating-linear-gradient(...)` — fine horizontal lines + radial-gradient vignette evoking an X-ray scanner. Opacity ≤ 0.06 so it doesn't compete with content. Honors `prefers-reduced-motion` (static; no animation).
- [ ] Add `.text-stroke-gold` utility (optional fallback if "Gratuito" needs an outlined treatment).
- [ ] Verify no `bg-[#...]` arbitrary hex creeps into components (smoke grep in Phase 8).

**Verify:** `bun run build` — no PostCSS errors

---

## Phase 4: Hero split-screen [PARALLEL with Phase 5]

**File:** `src/components/landing/DiagnosticHero.astro`

Current: text-only centered hero. Target: 60/40 split with photo right.

- [ ] Import `Image` from `astro:assets` + read `hero.image` from props
- [ ] Replace centered single-column layout with `grid lg:grid-cols-5` — text spans `lg:col-span-3` (60%), photo `lg:col-span-2` (40%)
- [ ] Mobile: stack vertically, photo above text? **No** — keep photo below to preserve LCP path (text is critical). Use `flex-col lg:grid` with photo `order-1 lg:order-2`
- [ ] Headline: render `headlineParts.lead + <span class="text-gold">{highlight}</span> + tail` when present, fallback to plain `headline`. Apply `text-5xl md:text-6xl lg:text-[72px] xl:text-[88px] leading-[1.05]` per brief minimum
- [ ] CTA button: stays `Button` primary variant (gold). Add subtle gold-glow on hover (utility already exists). No color change per user decision.
- [ ] Background: apply `landing-mesh-bg` (existing) + overlay `.scanner-grid-bg` for the X-ray texture
- [ ] `<Image>` invocation: `widths={[480, 640, 960]} sizes="(max-width: 1024px) 90vw, 40vw" loading="eager" fetchpriority="high"` — explicit width/height for CLS=0
- [ ] Photo wrapper: gold soft frame (`ring-1 ring-gold/30 shadow-2xl rounded-2xl overflow-hidden`) + optional `aspect-[3/4]`

**Verify:** Manual — `bun run dev`, inspect mobile + desktop, confirm LCP candidate is hero text or photo and not regressed

---

## Phase 5: Sintomas 2×2 grid [PARALLEL with Phase 4]

**File:** `src/components/landing/CostOfChaos.astro`

Current: 4-card layout. Target: 2×2 grid with icon-on-top cards + hover lift + section bg variation.

- [ ] Change grid to `grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8` (already uses `bg-navy-light/30` per inventory — keep)
- [ ] Each card: icon at top (Lucide), bold title, description. Use existing `glass-card` utility + add hover state via wrapper class: `transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-xl` (transform-only per cardinal #8)
- [ ] Icon mapping in data (or via switch in component) — update `raio-x.json::problem.costs[].icon` slugs to match brief: `chair-empty`, `clock-message`, `chart-down`, `user-overloaded` → existing Lucide map: `Armchair`, `MessageSquareDashed`, `TrendingDown`, `UserCog`. Adjust component's icon resolver if needed.

**Verify:** Mouse-hover lifts only via transform; tab focus shows focus ring; no layout shift

---

## Phase 6: Como Funciona timeline [SEQUENTIAL — depends on Phase 1 schema]

**File:** `src/components/landing/HowItWorks.astro`

Current: 4-step layout. Target: horizontal timeline on desktop with connector line, vertical timeline on mobile.

- [ ] Add Sacha equipe photo above the timeline header (centered, rounded, max-w-md, eager=false): `<Image>` from `astro:assets` reading `howItWorks.image`
- [ ] Desktop layout: `grid grid-cols-4 gap-0 relative` with absolute-positioned connector line behind step circles (`absolute top-[Npx] left-[10%] right-[10%] h-px bg-gold/40`)
- [ ] Step number: large display font (`text-5xl lg:text-7xl font-serif text-gold/80 leading-none`) — visual anchor
- [ ] Duration badges: pill style — `inline-flex items-center px-3 py-1 rounded-full bg-gold-soft text-gold text-xs font-medium tracking-wider uppercase`. Render from `steps[].duration`
- [ ] Icons per step: data-driven via `steps[].icon` slug → Lucide map (`FileText`, `MessageCircle`, `Video`, `MapPin`)
- [ ] Mobile layout: `grid grid-cols-1` with each step having `border-l-2 border-gold/40 pl-6 relative` and number circle absolute-positioned on the line. Line is continuous between steps.
- [ ] No height tween — collapse/expand not used here, but if a step has expandable detail, use CSS grid `0fr↔1fr`

**Verify:** Horizontal timeline at `lg:` breakpoint, vertical below; connector line visually behind numbers, not over them

---

## Phase 7: O que Você Leva — left border [SEQUENTIAL]

**File:** `src/components/landing/DiagnosticBenefits.astro`

Current: 4 vertical cards. Target: keep cards but add 4px gold left border + gold icon emphasis.

- [ ] Each card receives `border-l-4 border-gold` (rest of border removed) + `rounded-r-lg` to soften the right side
- [ ] Icon: `text-gold` confirmed, increase to `w-7 h-7`
- [ ] Card hover: subtle `hover:bg-navy-light/40` (no transform — cards are vertical info, not interactive targets)

**Verify:** Border-left renders 4px gold on every card; no layout shift on hover

---

## Phase 8: Qualification + NotFor side-by-side [SEQUENTIAL — needs success token from Phase 3]

**Files:**
- `src/components/landing/DiagnosticQualification.astro`
- `src/components/landing/NotForSection.astro`
- `src/pages/index.astro` (wrap both in a grid)

Current: stacked sections. Target: 50/50 columns at desktop.

- [ ] In `index.astro`, wrap the two sections in a flex/grid container at the section-pair point: `<section class="py-20 px-6 lg:px-8"><div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">...</div></section>`. Remove each component's outer `<section>` wrapper or convert to inner `<div>` with appropriate padding.
- [ ] `DiagnosticQualification.astro`: column bg `bg-success-soft text-navy` (or define as utility `.bg-fit-column`), check icon → `CheckCircle2` from Lucide in `text-success`
- [ ] `NotForSection.astro`: column bg `bg-neutral-soft text-navy` (utility `.bg-not-fit-column`), x icon → `XCircle` in `text-muted-foreground`
- [ ] Both columns: `rounded-2xl p-8 lg:p-10` + matching min-height so they bottom-align
- [ ] Mobile: stack normally

**Verify:** Side-by-side at `lg:`; readable contrast on green soft bg (foreground must be navy, not gold); WCAG AA passes

---

## Phase 9: FAQ +/− icons [SEQUENTIAL]

**File:** `src/components/landing/FAQ.astro`

Current: ChevronDown rotates 180° on `[open]`. Target: distinct `+` (closed) / `−` (open).

- [ ] Replace single `<ChevronDown>` with two icons rendered inside the `<summary>`: `<Plus class="icon-closed">` + `<Minus class="icon-open">` (both Lucide React via existing pattern)
- [ ] CSS: `summary .icon-open { display: none; } details[open] summary .icon-closed { display: none; } details[open] summary .icon-open { display: block; }` — pure CSS, no JS
- [ ] Both icons `text-gold` (already accent)
- [ ] Keep current grid `0fr↔1fr` animation (~200ms ease-in-out per brief — current is already ease, may need to bump duration if not 200ms)
- [ ] Confirm `details + details` has thin separator: `border-t border-foreground/10` (likely already present)

**Verify:** Open/close shows distinct `+` and `−`; keyboard Enter/Space works; reduced-motion respected

---

## Phase 10: CTA Final circular photo [SEQUENTIAL — needs Phase 0 photo + Phase 2 data]

**File:** `src/components/landing/DiagnosticFinalCTA.astro`

Current: text + buttons. Target: circular photo + two-button hierarchy + social proof + dark gradient closer.

- [ ] Section bg: layered gradient — `bg-gradient-to-b from-navy via-navy-light to-navy` + subtle gold radial glow utility (existing `.glass-card` glow can be lifted to section level)
- [ ] Layout: `grid lg:grid-cols-[auto_1fr] gap-8 lg:gap-12 items-center max-w-5xl mx-auto`
- [ ] Photo: `<Image>` from `astro:assets` reading `finalCta.image`. Container: `w-40 h-40 lg:w-56 lg:h-56 rounded-full overflow-hidden ring-2 ring-gold/40 shadow-2xl`. Image inside: `object-cover` + dynamic `objectPosition` from data
- [ ] Two buttons: primary gold (`Button variant="primary"`) + outline (`Button variant="outline"`). Read from `finalCta.cta` (primary) and `finalCta.secondaryCta` (outline)
- [ ] Social proof line below buttons: `<p class="mt-4 text-sm text-foreground/80"><span aria-hidden="true">★★★★★</span> {socialProof.text}</p>` (renders only when `socialProof` present in data)

**Verify:** Circular crop centered on face; buttons stack vertically on mobile, side-by-side on desktop; stars decorative (aria-hidden)

---

## Phase 11: Accessibility + Performance gate [SEQUENTIAL — final]

- [ ] Skip link still first focusable (verify with Tab from page top)
- [ ] `<h1>` count ≤ 1 (Hero only)
- [ ] All Lucide icons in interactive contexts have `aria-hidden="true"` when paired with text label, `aria-label` when icon-only
- [ ] Decorative scanner-grid + stars `aria-hidden="true"`
- [ ] `<noscript>` reveal fallback still active (Layout.astro unchanged)
- [ ] Images: every `<Image>` has explicit width/height (astro:assets does this) + `alt` from data
- [ ] Hero photo `loading="eager" fetchpriority="high"`; others `loading="lazy"`
- [ ] `prefers-reduced-motion` honored — current global rule in `global.css` already covers this
- [ ] Bundle: confirm initial JS still < 50KB (no new client-side islands introduced)

**Verify:**
```
bun run lint
bunx astro check
bun run build
```
Then manual:
- DevTools → Lighthouse → Mobile + Desktop → Performance / A11y / BP / SEO all ≥ 95
- DevTools → Rendering → Emulate `prefers-reduced-motion: reduce` → animations disabled
- Disable JS → page still readable, no blank reveal sections
- Tab from top → skip link first

---

## Critical files (touched)

- `src/content.config.ts` — schema extension (image fields, socialProof, headlineParts)
- `src/content/landings/raio-x.json` — copy + image refs (SSOT)
- `src/styles/global.css` — success tokens + scanner utility
- `src/assets/sacha/sacha-hero.jpg` — new
- `src/assets/sacha/sacha-equipe.jpg` — new
- `src/assets/sacha/sacha-cta.jpg` — new
- `src/components/landing/DiagnosticHero.astro` — split layout, photo, headline highlight
- `src/components/landing/CostOfChaos.astro` — 2×2 grid + hover lift
- `src/components/landing/HowItWorks.astro` — timeline + connector + duration pills + photo
- `src/components/landing/DiagnosticBenefits.astro` — 4px gold left border
- `src/components/landing/DiagnosticQualification.astro` — column form, success bg
- `src/components/landing/NotForSection.astro` — column form, neutral bg
- `src/components/landing/FAQ.astro` — Plus/Minus pair via CSS
- `src/components/landing/DiagnosticFinalCTA.astro` — circular photo + two buttons + social proof
- `src/pages/index.astro` — wrap qualification + notFor in shared grid section

## Reused (no change)

- `src/components/shared/Button.astro` — variants already correct
- `src/lib/whatsapp.ts` — SSOT untouched
- `src/layouts/Layout.astro` — SEO/a11y plumbing intact
- `src/components/quiz/Quiz.tsx` — conversion path preserved
- `astro.config.mjs` — no redirect/sitemap changes (no new routes)

---

## Risks + Mitigations

| Risk | Mitigation |
|---|---|
| `astro:assets` first-use breaks build | Run `bunx astro check` after Phase 1; if schema migration breaks existing `hero.image: string` usage, fall back to `z.union([image(), z.string()])` |
| 23MB source photos balloon build time | Astro `<Image>` resizes at build; keep `widths` array short ([480, 640, 960] for hero, [320, 480] for circular CTA) |
| Headline split (`headlineParts`) breaks JSON validation | Make schema accept both legacy `headline: string` and new `headlineParts: object` via `.refine()` requiring exactly one |
| Side-by-side qualification/notFor regresses reveal animations | Re-apply `data-reveal="up"` on inner column wrappers |
| Light-green column reduces contrast | `--color-success-soft` light enough that `text-navy` on top still passes ≥ 4.5:1 — verify in DevTools |
| FAQ Plus/Minus needs JS in some browsers | Pure CSS swap via `details[open]` — no JS needed (supported everywhere `<details>` is) |
| Scanner-grid texture hurts LCP | Pure CSS gradient — zero network cost, near-zero paint cost; verify Lighthouse |

---

## Verification (end-to-end)

```bash
bun run lint
bunx astro check
bun run build
bun run check:external-urls   # if applicable per AGENTS.md
```

Manual smoke:
1. `bun run preview` → open `http://localhost:4321/`
2. Hero renders split-screen on desktop, stacked on mobile; "Gratuito" appears in gold
3. Sintomas renders 2×2; hover lifts a card with no layout shift
4. Como Funciona horizontal timeline desktop, vertical mobile; duration pills visible
5. Benefits cards show 4px gold left border
6. Qualification + NotFor side-by-side at `lg:`; green soft vs neutral soft contrast clear
7. FAQ: each item shows `+` closed, `−` open; keyboard accessible
8. CTA Final: circular photo + 2 buttons + 5 stars + social proof text; dark gradient background
9. Lighthouse mobile + desktop ≥ 95 on all four metrics
10. Tab from top → skip link first; disable JS → no blank reveal sections

---

## Out of scope

- Other 3 photos (sacha2, sacha5, sacha6) — kept in `docs/logos/fotos/` for future use
- Quiz / `/raio-x/perguntas` flow — untouched
- New landing routes or content collections
- WhatsApp SSOT changes
- Analytics events (existing `data-cta-location` preserved)

---

Next: approve plan, then `/implement docs/e-design-analise-toda-quiet-frost.md` (or proceed directly given the `/design` half of the original command).
