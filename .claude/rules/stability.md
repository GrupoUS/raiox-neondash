---
globs: src/**, package.json, tsconfig.json
---

# Stability — Universal Tier 2 Rules

> Universal quality bar + smoke template + anti-patterns + debug triage. Portable to any project.
> Stack-specific smoke commands (build, type-check, framework checks) live in the matching tech-stack skill.
> Project tooling values resolve from `.claude/config.json::tooling`.

---

## Purpose

Minimum always-useful stability checks for any change in any project, plus pointers to deeper references when the issue is non-trivial.

---

## Core checklist (A–L)

- **A — Barrel exports.** When adding to a `<lib>/<domain>/index.ts` (or equivalent), confirm every new export is re-exported. Missing re-exports cause runtime failures inside dynamic imports.
- **B — No `!` assertions.** Never on optional results, env vars, or query results. Use `??`, type guards, or early returns.
- **C — Array / result guards.** Always guard collection / list / fetch results against empty before mapping. Guard optional fields before access.
- **D — Render mode integrity.** Static-only project: never override to SSR. SSR project: never override to static. MPA project: never introduce SPA router. Each invariant non-negotiable for the project's deployment contract.
- **E — Error handlers.** Inline scripts wrap IO (IntersectionObserver, fetch, parsing) in try/catch + degrade silently. Never `throw` in module-top scope of an inline script.
- **F — Env config.** Build-time env vars in `.env.example`. Required keys must fail-fast on first read. Never `process.env.X!` (use guarded read + descriptive error).
- **G — CORS.** When endpoints exist: explicit allowlist + credentials handling. When no endpoints: external links carry `rel="noopener noreferrer"` when `target="_blank"`.
- **H — No `console.log`** in shipped code. `console.warn` only inside no-op fallback branches.
- **I — No `as any`.** Use schema validators (Zod / Yup / Valibot) and let the type-checker generate types. Use `unknown` + type guards at boundaries.
- **J — Mutation errors.** Forms / submits wrap in try/catch with user-facing fallback. Never silently swallow.
- **K — No dead anchors.** Never `href="#"`. `<button>` for actions, real `<a href="...">` for navigation.
- **L — Error boundaries.** 404 / error pages show generic copy + recovery CTA. Production builds expose no stack traces.

---

## Render-mode invariants

Choose the project's mode at design time. Don't drift later:

1. **Static-only** — no SSR adapter, no `prerender = false` override, no SPA router, no API routes, no DB.
2. **SSR** — adapter installed, every dynamic page documented, never silently switch a page to static at build time.
3. **MPA** — full reload between routes; no client router, no `view-transition` event listeners that imply SPA.
4. **SPA** — single shell, client router only; no per-route `<head>` mutation outside the shell.
5. **Hybrid** — explicit per-page mode declaration; no implicit fallback.

Invariant per project lives in cardinal rules (`.claude/CLAUDE.md`).

---

## Performance gates (ADVISORY — meça & anote, não trava merge)

Core Web Vitals são alvos ORIENTATIVOS para a intensidade "dinâmico forte". Meça, registre o número no PR, sinalize regressões — mas motion rico / 3D / parallax pode legitimamente mover esses números, e é um trade-off aceito. NÃO bloqueia merge.

| Metric | Alvo orientativo |
|---|---|
| LCP (Largest Contentful Paint) | ~2.5s (proteja o elemento LCP; hero text-first + `client:idle` ainda recomendado) |
| CLS (Cumulative Layout Shift) | ~0 de imagens (mantenha `width`/`height` em mídia — proteção CLS grátis; motion de interação intencional que desloca layout é ok e não conta contra isso) |
| INP (Interaction to Next Paint) | ~200ms (afrouxado de 100ms — 3D interativo / hover pesado pode custar mais; mantenha responsivo, anote) |
| Initial (shared) JS | ~50KB (orientativo; libs de animação dentro do island) |
| Lighthouse Performance / A11y / BP / SEO | ~90 perf, A11y defendido (carrega `prefers-reduced-motion`) |

O ÚNICO piso duro de acessibilidade é `prefers-reduced-motion`.

Project-specific gates (route list, custom budget) → `.claude/config.json::gates`.

---

## Smoke test template

Run after any change. Stack-specific commands resolve via `.claude/config.json::tooling` placeholders.

### Forbidden hex outside design-token source

```bash
grep -rn "bg-\[#\|text-\[#\|border-\[#" <src>
# expect: empty (or only inside @theme / token source file)
```

### Icon library mix

```bash
grep -rn "material-symbols\|<i class=\"fa\|font-awesome\|@heroicons" <src>
# expect: empty when project chose a single library
```

### Heading discipline

```bash
grep -rnE "<h1[^>]*>" <src>/pages | wc -l
# expect: ≤ 1 per page
```

### Layout-property animation — scan orientativo (não é gate de falha)

```bash
grep -rnE "transition.*\b(width|height|top|left|padding|margin)\b" <src>/styles
# Informativo: lista transições de layout-prop. NÃO é falha — animar layout é permitido quando o efeito precisa. Use para conferir que cada hit é intencional e tem fallback de prefers-reduced-motion.
```

### Reduced-motion fallback presente (checagem DURA — deve passar)

```bash
grep -rn "prefers-reduced-motion" <src>/styles
# expect: pelo menos um bloco global de reduce; todo island JS/Framer usa useReducedMotion()
```

### Bundle audit

```bash
${tooling.packageManager} run ${tooling.buildTool}
# After build, audit largest chunks:
ls -lh <dist>/<assets>/*.js | sort -k5 -rh | head -5
# expect: top initial-bundle files < 50KB on prerendered pages
```

### Type / lint / test gates

```bash
${tooling.packageManager} run ${tooling.linter}
${tooling.packageManager} run ${tooling.typeChecker}
${tooling.packageManager} run ${tooling.testRunner}    # when project has tests
${tooling.packageManager} run ${tooling.buildTool}
```

### Accessibility manual smoke (browser)

- Tab from page top → first focus is the skip link.
- Skip link Enter → focus jumps to `<main>` with `tabindex=-1`.
- Focus rings visible on every interactive element.
- FAQ / disclosure expands on Enter / Space; keyboard navigates between.
- Mobile menu opens with Enter; Escape closes.
- Disable JS in DevTools → page renders all reveal-on-scroll content.
- DevTools → Rendering → Emulate `prefers-reduced-motion: reduce` → all animations off.

> Stack-specific smoke commands (framework type-check, build, link-check, sitemap diff) → load matching tech-stack skill.

---

## Anti-patterns by domain

### Render mode

- Override the project's render-mode invariant without explicit justification. Static stays static; SSR stays SSR.
- Introduce SPA router on an MPA project (or vice versa).

### Hydration

- Hydrate eagerly when result not yet needed (immediate-load directive on pure-visual islands).
- Use `client-only` directives when component can SSR. Pre-render every island that can be pre-rendered.
- Hydrate React when static markup suffices.

### Content drift

- Hardcode product / FAQ / testimonial / CTA copy in components instead of reading from typed data layer.
- Partial copy split (data layer + literal strings in component) — move literals into schema.
- External destination drift: changing destination without syncing (a) data field, (b) redirect config, (c) sitemap exclusion. Tri-sync moves together.

### Design

- Hardcoded hex outside design-token source. (Cardinal 7 — INALTERADO)
- Mixing icon libraries. (Cardinal 3 — INALTERADO)
- `transition: all` — nomeie as props (higiene; transições multi-propriedade ricas são ok).
- Uma animação SEM fallback de `prefers-reduced-motion`. (piso duro)
- Missing `width` / `height` on images → CLS hazard.
- Pure black / white text on colored background.

### Accessibility

- Drop the skip link or move it past first focusable.
- Drop the `<noscript>` fallback when reveal-on-scroll patterns hide content.
- `href="#"` for actions.
- **Ignore `prefers-reduced-motion`** — O piso duro de acessibilidade; toda animação (2D, 3D, parallax, mouse-glow, staggered, gradiente) deve degradar.
- Caminho reduced-motion que deixa conteúdo preso em `opacity:0` / fora da tela / mid-transform.
- Icon-only buttons missing `aria-label`.

### Tooling

- Skip pre-commit hooks (`--no-verify`).
- Manual edit of generated lock file.
- Use a package manager other than the project's declared one (`.claude/config.json::tooling.packageManager`).

---

## Debug triage matrix

| Symptom | First check |
|---|---|
| Section blank with JS off | `<noscript>` reveal fallback present? |
| FAQ stutters on expand | Se usando height tween, troque por CSS grid `0fr/1fr` (ou `<details>`) para reveal mais suave; cheque que a transição é GPU-friendly |
| LCP regression | Hero image priority hint + island hydration directive (idle vs eager)? |
| CLS spike | Missing `width` / `height` on `<img>` / responsive image component? |
| 404 on bookmarked URL | Redirect config entry missing? |
| Duplicate index for product | Sitemap filter excluding redirect path? |
| Skip link not visible on Tab | First focusable in DOM order? `:focus-visible` not broken? |
| Build fails on data shape | Schema mismatched a JSON / YAML file — re-validate |
| Initial JS > 50KB | Heavy lib imported in main bundle (look for namespace imports) |
| Type-check fails after content edit | Schema vs data drift |
| Stack-specific failure | Load matching tech-stack skill for triage |

---

## Final gates

```bash
${tooling.packageManager} run ${tooling.linter}
${tooling.packageManager} run ${tooling.typeChecker}
${tooling.packageManager} run ${tooling.buildTool}
```

When the project ships tests / E2E / link checks, append those after build.

---

## Escalation triggers

Load deeper context **before** changing code when:

- Root cause unclear after initial inspection.
- Bug spans multiple layers (page + component + data schema + redirect).
- Change affects a cross-cutting SSOT (theme tokens, content layer, external surfaces).
- Change affects a layout that touches every page.
- Two consecutive fix attempts on the same hypothesis failed → invoke `evaluator` Mode 3 / `/debug recover`.

---

## Stack & project signals

| Surface | Load |
|---|---|
| Stack smoke commands (build, type-check, framework check, link-check, sitemap diff) | matching tech-stack skill |
| Project SSOT helpers (external surfaces, brand voice, design system) | matching project skill |
| Cardinal rules + routing matrix | `.claude/CLAUDE.md` |

---

## When to load more

| Need | Load |
|---|---|
| Pages, components, hydration, content data, a11y, perf | `.claude/rules/frontend.md` |
| Tokens, typography, motion | `.claude/rules/DESIGN.md` |
| SEO + JSON-LD + sitemap | `.claude/rules/seo.md` |
| Cardinal rules + routing matrix | `.claude/CLAUDE.md` + root `AGENTS.md` |
| Framework-specific patterns | matching tech-stack skill |
| Project tokens / brand voice | matching project skill |
