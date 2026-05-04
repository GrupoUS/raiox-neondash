# Learnings Log

> Append-only chronological project decisions. Newest entries on top.
> Project-wide learnings; domain-specific learnings live in subdirectory `AGENTS.md` files (when present).
> Refresh root `AGENTS.md § Recent learnings (last 3)` whenever this log gets a new entry.

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
