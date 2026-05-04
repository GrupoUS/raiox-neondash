# Plan — Raio-X Landing (Aprimoramento sobre `e-design-claude-swift-yeti.md`)

> Plan-only. Refines the prior `/design` plan with verified codebase state, gap closures, and updated task graph.
> Source plan: `docs/e-design-claude-swift-yeti.md`. This file supersedes it for execution. No code yet — awaits `/implement` approval.

---

## 1. Context

**Why aprimorar.** Prior plan was thorough but written against an outdated read of the repo. Three foundation files described as "must be built" already exist and a fourth claim about `/neon-dash` is wrong. Re-running the plan as-written would (a) recreate `src/lib/whatsapp.ts`, (b) recreate the `landings` schema in `src/content.config.ts`, (c) chase a redirect that isn't there, and (d) miss the actually-needed Lighthouse PAGES update. Refined plan removes redundant tasks, adds the missed ones, closes 13 gaps surfaced by gap-analysis pass.

**Goal unchanged.** Static pt-BR conversion landing at `/raio-x` for the free diagnostic session ("Raio-X Gratuito"). Lead capture via Typebot. SDR Laura WhatsApp fallback.

**Complexity.** L4 (single new page + minimum foundation; less than prior L5 because foundation is partially built).

---

## 2. Reality Check — What Changed Since Prior Plan

> Verified against filesystem + skills 2026-05-04.

| Prior claim | Actual state | Impact on plan |
|---|---|---|
| `src/content.config.ts` is empty placeholder | **Already has `landings` collection** with `seo / hero / benefits / qualification / finalCta / primaryCta` — including extras the prior plan missed (`qualification.intro`, `finalCta.secondaryCta` with WhatsApp prefix check, `seo.title.max(70)` vs prior `max(60)`) | TASK-1 → demoted to "schema audit + small extension" |
| `src/lib/whatsapp.ts` does not exist | **Already implemented**, exports match SSOT (`WHATSAPP_SDR_E164 = "556294705081"`, `WHATSAPP_DEFAULT_SITE_MESSAGE`, `whatsappUrlWithText`, `isWhatsAppDestination`) | TASK-3 → demoted to "verify only" (delete from build path) |
| `/neon-dash` is external redirect to `https://neondash.com.br/` | `produtos-e-rotas.md` lists it as **internal page** (`cta.url = https://drasacha.com.br/neon-dash`); no redirect in `astro.config.mjs` | Strike "redirect collision" risk from §9. `/raio-x` ≠ `/neon-dash` → no conflict regardless |
| Astro 6 fonts setup not detailed | `astro.config.mjs` already configures `astro:fonts` with Playfair (400/600/700) + Inter (300–700) | Layout.astro consumes via `astro:fonts` `<Font />`; do **not** add manual `<link rel="preconnect" href="fonts.googleapis...">` (cardinal: self-hosted via Astro 6) |
| `scripts/lighthouse-audit.mjs` audits all pages | Hardcoded `PAGES` array of 9 routes (line 28–37); **`/raio-x` absent** | New TASK: add to PAGES before final smoke |
| `src/styles/global.css` has minimum utilities | Has all claimed + extras: `card-hover-lift`, `float-gentle`, `animate-spotlight`, `animate-aurora`, `card-glow-hover` | Reuse rather than re-style |

Two scripts referenced in `package.json` but missing on disk: `scripts/check-external-urls.mjs`, `scripts/smoke-test.mjs`. Out of scope here, but `bun run check:external-urls` and `bun run smoke-test` will exit non-zero — flag in TASK-VERIFY only.

---

## 3. Decisions Locked (changed from "open" in prior plan)

| Decision | Locked value | Rationale |
|---|---|---|
| Lead-capture | Typebot | confirmed by user |
| Page slug | `/raio-x` | confirmed |
| Foundation scope | minimum-only | confirmed |
| **Embed mode** | **Iframe sub-route `/raio-x/perguntas`** (was deferred in prior plan) | Zero JS budget on landing. Cookie scope isolated to Typebot host (LGPD posture). Popup mode kept as future migration (perf optimization), not a v1 fork point. Closes prior P1 gap #1. |
| **LGPD posture v1** | **Stub `/politica-de-privacidade` page (single Layout-only page; copy "Em construção" + contact email) before merge** | Capturing PII via Typebot without any privacy link is non-compliant. Stub keeps a real link target. Real policy = separate plan. Closes prior P1 gap #3. |
| **Analytics v1** | **Plausible script (`<script defer data-domain="..." src="https://plausible.io/js/script.js">`)** | Cookieless → no consent banner needed. ~1KB. Cardinal #4 preserved. Closes prior P2 gap #7. Owner must confirm Plausible account exists; if not → ship without and re-evaluate. |
| **Font weights** | Playfair `400 700`, Inter `400 500 600` | Match `DESIGN.md` weight discipline (regular + semibold + bold). Reduces font-payload share of LCP. |
| **JSON-LD type** | `Service` (sub-type `MedicalBusiness` not used; provider is consultancy) | Schema.org/Service fits ongoing offering. Not Event (no scheduled instance) nor Offer (Offer wraps a Service). Validate in Rich Results Test before merge. Closes prior P3 gap #11. |
| **Hero image** | Optional schema field added; **v1 ships without** (text-first hero) | Avoid LCP risk from un-optimized stock photo. Re-introduce when professional asset exists. Closes prior P3 gap #10. |
| **Typebot URL** | Placeholder `https://typebot.io/grupo-us-raio-x` + `// TODO` until real URL provided | Single-line swap in JSON. Prior plan correct here. |

Still-open inputs (do **not** block plan approval, but block staging deploy):
1. Typebot endpoint URL.
2. Plausible domain key (or "skip analytics v1" call).
3. Privacy stub copy approval (one paragraph + contact email).

---

## 4. Refined Component Tree

```
Layout.astro                       (props + SEO + skip-link + JSON-LD + IntersectionObserver inline)
└── raio-x.astro                   (composition; reads getEntry("landings", "raio-x"))
    ├── DiagnosticHero.astro       (BLOCO 01)
    ├── DiagnosticBenefits.astro   (BLOCO 02 — 5 lucide icons)
    ├── DiagnosticQualification.astro (BLOCO 03 — Check icons)
    ├── DiagnosticFinalCTA.astro   (BLOCO 04 + secondary WhatsApp button)
    └── MobileCTABar.astro         (md:hidden; sticky bottom)

Aux pages
├── raio-x/perguntas.astro         (Typebot iframe host; <meta robots="noindex">)
└── politica-de-privacidade.astro  (stub; LGPD link target)

Shared primitive (already-zero):
└── shared/Button.astro            (variants: primary | whatsapp | outline | ghost; sizes sm|md|lg)

Existing reused (no edit):
├── src/lib/whatsapp.ts            ✓ already exists
├── src/styles/global.css          ✓ utilities present
└── src/content.config.ts          ⚠ extend (add hero.image?, hero.trustSignals?)
```

Critical files to modify:
- `src/content.config.ts` — extend schema (additive, no breaking change)
- `src/content/landings/raio-x.json` — **create**
- `src/layouts/Layout.astro` — **create**
- `src/layouts/PerguntasLayout.astro` *(or reuse Layout with `noIndex` prop)* — **create**
- `src/components/shared/Button.astro` — **create**
- `src/components/landing/{DiagnosticHero,DiagnosticBenefits,DiagnosticQualification,DiagnosticFinalCTA,MobileCTABar}.astro` — **create**
- `src/pages/raio-x.astro` — **create**
- `src/pages/raio-x/perguntas.astro` — **create**
- `src/pages/politica-de-privacidade.astro` — **create stub**
- `astro.config.mjs` — extend `sitemap()` with `serialize` for `/raio-x` priority + `filter` excluding `/raio-x/perguntas`
- `scripts/lighthouse-audit.mjs` — add `/raio-x` to `PAGES` array
- `public/og/raio-x.png` — generate 1200×630 ≤ 200KB

Reused without modification:
- `src/lib/whatsapp.ts`
- `src/styles/global.css` (utilities: `glass-card`, `glass-card-bright`, `gold-pulse-glow`, `text-shimmer`, `text-gradient-gold`, `landing-mesh-bg`, `card-hover-lift`, `[data-reveal]`, `.skip-link`)

---

## 5. Schema Extension (additive, no breaking change)

Add to existing `landings` schema in `src/content.config.ts`:

```ts
hero: z.object({
  // existing fields …
  image: z.object({          // NEW — optional, deferred for v1
    src: z.string(),
    alt: z.string().min(10),
    priority: z.boolean().default(true),
  }).optional(),
  trustSignals: z.object({   // NEW — captures BLOCO 04 urgency + Dra. Sacha bio
    doctorBio: z.string().optional(),
    urgencyMicrocopy: z.string().optional(),
  }).optional(),
}),
```

Plus add `.refine()` at root to block hex literals leaking into JSON copy (closes P2 gap #8):

```ts
.refine(
  (data) => !JSON.stringify(data).match(/#[0-9a-f]{3,6}\b/i),
  { message: "Hex color literals not allowed in landing copy (cardinal #7)" }
)
```

`seo.title.max(70)` (existing) stays — prior plan's `max(60)` was tighter than current; 70 is acceptable per Google SERP truncation tolerance.

---

## 6. Atomic Tasks (refined; numbered to map to prior plan where applicable)

> **VERIFY** prefix = no-edit task (asserts existing state). **NEW** = task absent in prior plan. Otherwise refines prior task.

### TASK-VERIFY-1: Audit existing schema (replaces prior TASK-1)
- Read `src/content.config.ts`. Confirm `landings` collection + Zod fields match §4 component needs.
- Apply additive extension from §5 above (hero.image?, hero.trustSignals?, root `.refine()` hex guard).
- **Done when:** `bunx astro check` passes; new fields are optional so no existing data breaks.
- **Risk:** Low.

### TASK-2 (refined): Author `raio-x.json`
- Create `src/content/landings/raio-x.json`. Map BLOCO 01–04 verbatim with polish flagged inline.
- `primaryCta.mode = "typebot-iframe"` (locked). `primaryCta.url = "https://typebot.io/grupo-us-raio-x"` + `// TODO` header comment.
- Use `hero.trustSignals.urgencyMicrocopy` for "vagas limitadas por semana".
- Set `seo.title` ≤ 60 chars (tighter than schema max for SERP safety), `seo.description` 120-180 chars.
- **Done when:** `getCollection("landings")` returns the entry; `astro check` 0 errors.

### TASK-VERIFY-3: Audit `src/lib/whatsapp.ts` (replaces prior TASK-3)
- Open file. Confirm exports match SSOT spec from `whatsapp-ssot.md`.
- If `WHATSAPP_DEFAULT_SITE_MESSAGE` doesn't start with "Olá, Laura!", correct (one-line edit).
- No other change. Cardinal #6 already enforced by file's existence as SSOT.
- **Done when:** `grep -rn "wa.me/" src/` returns matches **only** in `src/lib/whatsapp.ts`.

### TASK-4 (refined): Minimal `Layout.astro`
- Per §5 prior plan + these refinements:
  - Use Astro 6 `<Font name="Playfair Display" cssVariable="--font-serif" />` and `<Font name="Inter" cssVariable="--font-sans" />` from `astro:fonts` — **do NOT** add `<link rel="preconnect">` to Google Fonts; Astro 6 self-hosts.
  - Inline IntersectionObserver wrapped in try/catch + `<noscript>` reveal fallback. Use snippet from `.claude/skills/astro/references/gpus-overlay.md § [data-reveal] IntersectionObserver` (closes P3 gap #9).
  - Add `noIndex?: boolean` prop. When true → `<meta name="robots" content="noindex,nofollow">` (used by `/raio-x/perguntas`).
  - Default Organization JSON-LD inline. Optional BreadcrumbList when `breadcrumbs` prop provided.
  - Plausible script when `withAnalytics?: boolean = true` and `import.meta.env.PROD`. Single `<script defer src="https://plausible.io/js/script.js" data-domain="...">`.
- **Done when:** `astro check` + `bun run build` pass; manual tab from URL bar lands first focus on skip-link.

### TASK-5 (refined): `Button.astro`
- Per prior spec. Add explicit:
  - `data-cta-location` data attr (`hero | benefits | finalCta | mobileBar`) for future analytics.
  - `gold-pulse-glow` opt-in via `glow?: boolean` prop (default false; primary hero CTA sets true).
- **Reorder dependency:** TASK-5 has **no dependency on TASK-VERIFY-3 (whatsapp.ts)** — Button is generic; WhatsApp URL building happens in components, not Button (closes P3 gap #12). Can run parallel with TASK-4.

### TASK-6 (refined): `DiagnosticHero.astro`
- Per prior spec. Reads `hero.trustSignals.urgencyMicrocopy` if present, renders below CTA.
- If `hero.image` later supplied: `<Image src={...} fetchpriority="high" loading="eager" width={...} height={...} />` ; for v1 the field is absent so the markup conditionally skips.

### TASK-7 [PARALLEL]: `DiagnosticBenefits.astro`
- Per prior spec. Lucide icon resolution: small whitelist map `{ Stethoscope, Target, Lightbulb, Map, Users }` to keep tree-shaking tight.

### TASK-8 [PARALLEL]: `DiagnosticQualification.astro`
- Per prior spec. Reads optional `qualification.intro` (already in current schema) before list.

### TASK-9 (refined): `DiagnosticFinalCTA.astro` + Typebot iframe wiring
- **Embed mode locked = iframe sub-route.** No popup-script branch.
- Primary `Button` `<a href="/raio-x/perguntas">` (same-origin; **no** `target="_blank"`).
- Secondary `Button` (variant `outline`): label "Prefere conversar direto? Fale com a Laura." `href = whatsappUrlWithText(entry.data.finalCta.secondaryCta?.whatsappMessage ?? WHATSAPP_DEFAULT_SITE_MESSAGE)`. Cardinal #6 enforced.
- LGPD link: small text below CTA: `Ao continuar, você aceita nossa <a href="/politica-de-privacidade">política de privacidade</a>.`

### NEW TASK-9b: `/raio-x/perguntas.astro` (iframe host)
- Layout with `noIndex={true}`, `title="Perguntas — Sessão de Diagnóstico Gratuita"`, `description` minimal.
- Single iframe full viewport: `<iframe src={entry.data.primaryCta.url} title="Sessão de Diagnóstico — Perguntas" allow="clipboard-write" loading="eager" class="w-full h-[100dvh] border-0">`.
- No mesh-bg, no animations, no MobileCTABar — chrome-free Typebot host.

### TASK-10 (refined): `MobileCTABar.astro`
- Per prior spec + closure of P2 gap #6: in `raio-x.astro` page, wrapper div pattern is `class="pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0"` — verified `md:pb-0` reset applied so desktop has no spurious padding.

### TASK-11 (refined): `raio-x.astro` page composition
- Per prior spec.
- JSON-LD: build a Service object: `{ "@type": "Service", "name": "Raio-X Gratuito — Sessão de Diagnóstico", "provider": { "@type": "Organization", ...projectOrg }, "areaServed": "BR", "serviceType": "Consultoria estratégica para clínicas de estética", "offers": { "@type": "Offer", "price": 0, "priceCurrency": "BRL" } }`.
- Compose: Hero → Benefits → Qualification → FinalCTA → MobileCTABar.

### NEW TASK-11b: `/politica-de-privacidade.astro` stub
- Single Layout page, `<h1>Política de Privacidade</h1>`, one paragraph "Em desenvolvimento. Para dúvidas, contate `suporte@drasacha.com.br`.", canonical, noindex **off** (page should index — placeholder is real intent).
- Replaces prior P1 gap #3 minimum-viable LGPD stance.

### TASK-12 (refined): Sitemap config
- `astro.config.mjs` — extend existing `sitemap()`:
  ```js
  sitemap({
    serialize(item) {
      if (item.url.endsWith("/raio-x")) return { ...item, priority: 0.9, changefreq: "monthly" };
      if (item.url.endsWith("/politica-de-privacidade")) return { ...item, priority: 0.3, changefreq: "yearly" };
      return item;
    },
    filter: (page) => !page.endsWith("/raio-x/perguntas"),
  });
  ```

### NEW TASK-12b: Add `/raio-x` to lighthouse-audit PAGES (closes P1 gap #2)
- `scripts/lighthouse-audit.mjs` line 28–37: add `"/raio-x"` to `PAGES` array. No other change.
- **Done when:** `bun run lighthouse:audit` includes `/raio-x` in its output table.

### TASK-13: OG image
- Per prior spec. 1200×630 PNG ≤ 200KB at `public/og/raio-x.png`. Navy background + Gold "Raio-X Gratuito" wordmark in Playfair (or hand-off to design tool).

### TASK-VERIFY-14 (refined): Quality gates + smoke
- `bun run lint` (biome + oxlint)
- `bunx astro check`
- `bun run build` (must produce `dist/raio-x/index.html`, `dist/raio-x/perguntas/index.html`, `dist/politica-de-privacidade/index.html`)
- `bun run preview` then `bun run lighthouse:audit http://localhost:4321` — confirm all 4 categories ≥ 95 on `/raio-x`
- Manual checks (closes P3 gap #13):
  - skip-link first-focus
  - keyboard tab through all CTAs (Hero → Benefits → Qualification → FinalCTA primary → FinalCTA secondary → MobileCTABar)
  - DevTools `prefers-reduced-motion: reduce` → all reveal animations off
  - Disable JS → `[data-reveal]` content visible via `<noscript>`
  - 360px and 1280px viewports
  - `<meta name="canonical">` set to `https://harmonic-pascal.grupous.com.br/raio-x` (or env-derived host)
  - `/raio-x/perguntas` HTML contains `<meta name="robots" content="noindex,nofollow">`
  - `<a href="/politica-de-privacidade">` present in FinalCTA
- Cardinal greps:
  ```bash
  grep -rn "wa.me/" src/                                          # only src/lib/whatsapp.ts
  grep -rnE "bg-\[#|text-\[#|border-\[#" src/                      # empty
  grep -rnE "transition:.*\b(width|height|top|left|padding|margin)\b" src/  # empty
  ```
- **Skip:** `bun run check:external-urls` + `bun run smoke-test` — scripts missing on disk; flag as separate follow-up plan, **do not block this PR**.

---

## 7. Updated Implementation Order

```
TASK-VERIFY-1   (schema audit + extend)        ─┐
TASK-VERIFY-3   (whatsapp.ts audit)            ─┼─ foundation, parallel
TASK-4          (Layout.astro)                  ─┤
TASK-5          (Button.astro)                  ─┘  ← now independent of whatsapp.ts
TASK-2          (raio-x.json)                   ─→ depends on TASK-VERIFY-1
TASK-11b        (privacy stub)                  ─→ depends on TASK-4
TASK-6/7/8/9/10 (landing sections)              ─→ PARALLEL — depend on TASK-5; TASK-9 also depends on whatsapp.ts (already done)
TASK-9b         (/raio-x/perguntas iframe)      ─→ depends on TASK-4 + TASK-2 (URL ref)
TASK-11         (raio-x.astro page)             ─→ depends on TASK-2/4/6/7/8/9/10
TASK-12         (sitemap)                       ─┐
TASK-12b        (lighthouse PAGES)              ─┼─ PARALLEL after TASK-11
TASK-13         (OG image)                      ─┘
TASK-VERIFY-14  (gates + smoke)                 ─→ final
```

Wave 1 (foundation, 4 parallel): VERIFY-1, VERIFY-3, TASK-4, TASK-5.
Wave 2 (data + privacy stub, parallel): TASK-2, TASK-11b.
Wave 3 (5 landing sections + iframe page, parallel): TASK-6, TASK-7, TASK-8, TASK-9, TASK-10, TASK-9b.
Wave 4 (composition): TASK-11.
Wave 5 (config + assets, 3 parallel): TASK-12, TASK-12b, TASK-13.
Wave 6 (final): VERIFY-14.

---

## 8. Risks & Rollback (delta vs prior plan)

Removed risks (no longer applicable):
- ~~`/neon-dash` redirect collision~~ — no redirect exists.
- ~~Typebot popup script JS budget~~ — embed mode locked to iframe.

Persisting risks:
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Typebot URL not finalized at staging deploy | High | Medium | Placeholder + `// TODO`. Single-line swap in JSON. Block staging deploy until provided. |
| Typebot iframe load > 3s on 3G | Low | Low | Iframe is on its own route; landing untouched. Add `loading="eager"` to ensure form starts loading on navigation. |
| Plausible domain not configured | Medium | Low | TASK-4 conditional: if domain env var unset, omit script. v1 ships with or without analytics. |
| Privacy stub copy delays merge | Low | Low | One-paragraph stub already drafted in §3. Owner approval = single Slack message. |
| Lighthouse perf < 95 from font payload | Medium | Medium | Constrained weights (Playfair 400/700, Inter 400/500/600). If still tight, drop Inter 600 or Playfair 700. |
| Hex literal sneaks into JSON copy | Low | Medium | Schema `.refine()` blocks at `astro check`. Closes P2 gap #8. |

Rollback ladder (mostly unchanged):
1. **Per-task:** delete the new file.
2. **CTA destination:** swap `primaryCta.url` in JSON — single line.
3. **Whole feature:** delete `src/pages/raio-x.astro` + `src/pages/raio-x/perguntas.astro` + `src/content/landings/raio-x.json` + `src/components/landing/Diagnostic*.astro` + revert sitemap config + revert lighthouse PAGES. Layout / Button / privacy stub stay (still useful generally).

---

## 9. Acceptance Criteria (delta vs prior plan)

Adds to prior plan §10:

- [ ] `/politica-de-privacidade` exists (stub form acceptable for v1).
- [ ] FinalCTA links to `/politica-de-privacidade` with explicit consent microcopy.
- [ ] `/raio-x/perguntas` emits `<meta name="robots" content="noindex,nofollow">` and is excluded from sitemap.
- [ ] `scripts/lighthouse-audit.mjs` PAGES array includes `/raio-x`.
- [ ] Schema `.refine()` hex guard rejects test JSON containing `#fff`.
- [ ] `<meta name="canonical">` on `/raio-x` resolves to canonical project host.
- [ ] No `<link rel="preconnect" href="fonts.googleapis.com">` in built HTML — confirms `astro:fonts` self-hosting.
- [ ] If Plausible enabled: exactly one `<script defer ... data-domain="...">` tag in `<head>` of `/raio-x` (none on `/raio-x/perguntas`).
- [ ] All BLOCO 01-04 copy renders verbatim from JSON (grep page HTML for unique BLOCO sentence; expect 1 match).

Carries from prior plan §10: Lighthouse ≥ 95, CLS = 0, LCP < 2.5s, initial JS < 50KB, single `<h1>`, `<noscript>` reveal fallback, `prefers-reduced-motion` honored, no inline `wa.me/`, no hex outside `@theme`, Service JSON-LD validates in Rich Results Test, no SSR adapter, sitemap entry priority 0.9.

---

## 10. Verification (end-to-end test plan)

| Layer | Command / step | Pass criterion |
|---|---|---|
| Schema | `bunx astro check` | 0 errors after schema extend + JSON write |
| Hex guard | Manually inject `#fff` into JSON, run `astro check` | Build fails with refine error; revert |
| Build | `bun run build` | exits 0; emits `dist/raio-x/index.html`, `dist/raio-x/perguntas/index.html`, `dist/politica-de-privacidade/index.html` |
| Sitemap | inspect `dist/sitemap-0.xml` | `/raio-x` priority `0.9` present; `/raio-x/perguntas` absent; `/politica-de-privacidade` priority `0.3` |
| Lighthouse | `bun run preview &` then `bun run lighthouse:audit http://localhost:4321` | All categories ≥ 95 on `/raio-x` |
| CWV | DevTools Performance | LCP < 2.5s, CLS = 0, INP < 100ms |
| JS budget | `ls -lh dist/_astro/*.js` (sorted) | Largest bundle < 50KB |
| A11y manual | Browser tab walk | Skip-link first focus → main → all CTAs |
| NoJS smoke | DevTools → Disable JS → reload `/raio-x` | All `[data-reveal]` content visible |
| Reduced-motion | DevTools → Rendering → emulate `prefers-reduced-motion` | All animations off |
| Cardinal #6 | `grep -rn "wa.me/" src/` | Only `src/lib/whatsapp.ts` |
| Cardinal #7 | `grep -rnE "bg-\[#\|text-\[#\|border-\[#" src/` | Empty |
| Cardinal #8 | `grep -rnE "transition:.*\b(width\|height\|top\|left\|padding\|margin)\b" src/` | Empty |
| Typebot iframe | Click hero CTA | Lands `/raio-x/perguntas`; Typebot loads in iframe |
| WhatsApp fallback | Click secondary CTA on FinalCTA | Opens `wa.me/556294705081?text=Ol%C3%A1%2C%20Laura...` |
| LGPD link | Click `política de privacidade` link | Lands `/politica-de-privacidade` stub |
| Robots noindex | View source `/raio-x/perguntas` | `<meta name="robots" content="noindex,nofollow">` present |
| Canonical | View source `/raio-x` | `<link rel="canonical" href="https://harmonic-pascal.grupous.com.br/raio-x">` |
| Service JSON-LD | Google Rich Results Test on `https://<staging>/raio-x` | "Service" detected, no errors |
| OG image | Twitter Card Validator + Facebook Sharing Debugger | Card preview renders, no 404 |

> **Skip:** `bun run check:external-urls`, `bun run smoke-test` — backing scripts missing. Flagged as separate follow-up plan.

---

## 11. Self-Check

- Tasks atomic + testable: yes.
- No implementation performed: yes (plan-only, plan file is the single edit).
- Existing patterns respected: cardinals enforced (1–8), brand SSOT honored (`whatsapp.ts`, schema-driven copy).
- Reality drift from prior plan reconciled: yes (whatsapp.ts, content.config.ts, /neon-dash redirect claim, font setup all corrected).
- Open decisions surfaced: Typebot URL, Plausible domain, privacy stub copy approval — flagged but not blocking plan approval.
- All 13 gap-analysis findings addressed: P1 (3) closed in §3 + new TASKs; P2 (6) closed in §5 schema + §6 task refinements; P3 (4) closed via reorder + acceptance additions.
- Validation concrete: every command exists in `package.json` (skipped two missing scripts flagged).
