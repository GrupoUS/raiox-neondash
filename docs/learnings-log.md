# Learnings Log

> Append-only chronological project decisions. Newest entries on top.
> Project-wide learnings; domain-specific learnings live in subdirectory `AGENTS.md` files (when present).
> Refresh root `AGENTS.md § Recent learnings (last 3)` whenever this log gets a new entry.

---

### [2026-05-11] First `astro:assets` adoption + Dra. Sacha photos + mobile/desktop premium polish

> Added after Raio-X landing redesign per `docs/e-design-analise-toda-quiet-frost.md` (mobile + desktop polish iterations).

**Problem:** Landing needed Dra. Sacha photos (3 of 6 sourced JPGs, 8-23MB each), comprehensive 7-section redesign per brief, and conversion-focused mobile+desktop polish.

**Solution:**
- Introduced first `astro:assets` usage in repo: 3 photos at `src/assets/sacha/{hero,equipe,cta}.jpg` → Astro `<Image>` pipeline emits 12-13 webp variants per build (38KB–1.5MB depending on width).
- Schema extended via `image()` helper in `src/content.config.ts` (callback form `schema: ({ image }) => z.object({...})`). New fields: `hero.image`, `hero.headlineParts`, `hero.trustStrip[]`, `howItWorks.image`, `finalCta.image`, `finalCta.socialProof`.
- New shared components: `CriteriaColumn.astro` (variant fit|not-fit replacing twin Qualification/NotFor), `MidCTA.astro` (mid-page conversion booster between HowItWorks and Criteria), `SectionDivider.astro` (gold gradient hairline).
- Mobile: trust strip 3-cell grid below hero CTA, h1 36px (text-[2.25rem]), photo `loading="lazy"` + DOM order text-first, FAQ icon size-10 (WCAG 44px tap target), scroll-padding-bottom 6rem for sticky MobileCTABar.
- Desktop: Benefits `lg:grid-cols-2` (was vertical), FAQ `lg:grid-cols-2`, MidCTA `lg:flex-row` side-by-side, Final CTA photo `lg:w-72 lg:h-72`, Hero photo `lg:rotate-[1.5deg]` editorial micro-interaction.
- WhatsApp SSOT corrected: `WHATSAPP_SDR_E164 = "5562994705081"` in `src/lib/whatsapp.ts` (was missing 9 after area code 62).
- Theme: `--color-success` palette added for Criteria fit-column; `bg-fit-column`/`bg-not-fit-column` light bgs removed after dark-theme alignment; `.scanner-grid-bg` utility for hero X-ray texture.

**Constraints honored:** static-only Astro (cardinal #4), copy in SSOT (cardinal #5), WhatsApp via `whatsappUrlWithText` (cardinal #6), zero inline hex (cardinal #7), transform+opacity+grid-rows animations only (cardinal #8). Zero client JS islands added.

**Open items:**
- Source photo retention strategy: 8-23MB JPGs in `src/assets/sacha/` may bloat repo if pattern replicates across landings. No `.gitattributes`/LFS plan yet.
- Codex `/codex:review` + `/codex:adversarial-review` skipped during /verify due to `refresh_token_invalidated` (re-auth required: `codex login`).
- Phase 7 evaluator Mode 3 verdict: APPROVED (conditional, confidence 8/10).
- Production Lighthouse 100×4 baseline (2026-05-04) expected to hold (zero client JS delta, lazy images, no layout-property animations) — verify post-deploy.

**Files touched:** 15 (frontend-only), +168/-60 lines. Build: 3 pages, 13 webp variants, 2.7s.

---

### [2026-05-04] Raio-X landing built on existing scaffold; Vercel deploy needed `site` URL + root redirect

> Added after shipping `/raio-x` landing per `docs/e-plan-aprimore-floating-badger.md`.

**Problem:** Prior `/design` plan claimed empty content schema + missing `whatsapp.ts`, but both were already implemented on this branch — verified plan needed reality reconciliation. Vercel preview deployments returned the empty index stub at `/` even though `/raio-x` rendered correctly.

**Cause:** Plan was written against stale codebase read; Vercel domain was `raiox.gpus.com.br` while `astro.config.mjs::site` pointed to `harmonic-pascal.grupous.com.br` → canonical / OG / sitemap URLs all wrong; root `/` had a placeholder `index.astro` stub showing no content.

**Solution:**
- Demoted TASK-1 (schema) + TASK-3 (whatsapp.ts) to verify-only; extended schema additively (`hero.image?`, `hero.trustSignals?`, root `.refine()` hex guard).
- Updated `astro.config.mjs::site` to `https://raiox.gpus.com.br`; added Astro `redirects: { "/": "/raio-x" }`; deleted `src/pages/index.astro` stub.
- Added `vercel.json` (framework=astro, cleanUrls, immutable cache for `/_astro` and `/og`).
- Layout uses `astro:fonts` `<Font cssVariable />` for self-hosting — **never** add a manual `<link rel="preconnect" href="fonts.googleapis.com">` when `astro:fonts` is configured (older `astro/references/gpus-overlay.md § Layout.astro contracts § Google Fonts preconnect` is stale on this branch).
- Sitemap regex filter (hoisted to module scope) excludes `/raio-x/perguntas` (Typebot iframe host); `serialize` sets `/raio-x` priority 0.9 + `/politica-de-privacidade` priority 0.3.
- Named token utilities (`bg-gold`, `text-foreground`, `text-muted`, `border-gold`, etc.) added to `src/styles/global.css` `@layer utilities` replacing 19 arbitrary `bg-[var(--color-*)]` classes.
- JSON-LD builders extracted to `src/lib/json-ld.ts` (`buildOrganizationSchema`, `buildBreadcrumbSchema`).
- `scripts/lighthouse-audit.mjs::PAGES` reduced to `["/raio-x", "/politica-de-privacidade"]` since other 9 routes are not yet implemented on this branch.

**Validation:**
- `bun run lint` — 0 errors
- `bunx astro check` — 0 errors
- `bun run build` — 3 pages built statically
- `bun run lighthouse:audit https://raiox.gpus.com.br` — `/raio-x` and `/politica-de-privacidade` both **100/100/100/100**
- Production curl: `/`→295-byte meta-refresh stub, `/raio-x`→23,390 bytes, `/raio-x/perguntas` carries `noindex,nofollow`, `/sitemap-0.xml` has `/raio-x` priority 0.9 with perguntas excluded
- Cardinal #6/#7/#8 grep clean; `wa.me/` only in `src/lib/whatsapp.ts`
- 3 JSON-LD scripts in `/raio-x` HTML: Organization + BreadcrumbList + Service (price 0 BRL)

**Open follow-ups (per plan, blocked on external):**
- Real Typebot URL → `src/content/landings/raio-x.json::primaryCta.url` (placeholder `https://typebot.io/grupo-us-raio-x` + TODO)
- OG image asset → `public/og/raio-x.png` (1200×630 ≤ 200KB) — currently 404
- Plausible domain env var `PUBLIC_PLAUSIBLE_DOMAIN` (script only emits when PROD + env set)
- Real privacy policy copy (stub at `/politica-de-privacidade`)
- Live Playwright E2E (MCP not available in current session)
- Service JSON-LD Google Rich Results Test (manual external)

**Known dead-code:** `dist/_astro/client.*.js` ~190KB unreferenced React runtime (lucide-react SSR side effect). HTML loads zero external JS → initial-JS gate met. Switch to `lucide-static` is a separate plan if disk size matters.
