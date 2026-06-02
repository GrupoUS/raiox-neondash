# Design — Universal Tier 2 Rules

> Universal design do/don't. Portable to any project.
> Project tokens (color palette, typography pairing, brand utilities, glow / glass / depth / 3D / elevation) live in the project's brand / theme skill — Claude auto-loads via skill description match. Veja `gpus-theme` para o vocabulário de tokens de shadow/elevation/glow/3D.
> Tech-stack syntax (Tailwind v4 `@theme`, vanilla-extract, CSS Modules, etc.) lives in the matching tech-stack skill.

---

## 1. Color

### Do
- Use **semantic tokens** (`bg-background`, `text-foreground`, `bg-primary`, `border-border`) or named brand utilities. Tokens carry meaning; the implementation can swap freely.
- Hex values live **only** in the design-token source file (e.g., `:root` CSS variables, `@theme` block, theme config). Never inline.
- Validate every foreground / background pair against WCAG before commit.
- Status (success / warning / destructive) is communicated with **color + icon + text** — never color alone.

### Don't
- Hardcode hex outside the design-token source file (`bg-[#hex]`, `text-[#hex]`, `style="color:#hex"`).
- Use pure black `#000` or pure white `#fff` for body text on a colored background — drop a step on the neutral scale instead.
- Cross-mode bleed: importing light tokens into a dark-only project (or vice versa).
- Color as the **sole** signal for state, status, or focus.

### Contrast minimums (WCAG AA)
| Surface | Ratio |
|---|---|
| Body text | ≥ 4.5:1 |
| Large text (18pt / 14pt bold) | ≥ 3:1 |
| Non-text UI (icons, borders, focus rings) when informative | ≥ 3:1 |

---

## 2. Typography

### Do
- One heading family + one body family — total typographic system has at most two type families.
- **Sentence case** in headlines. UPPERCASE only on badges / status pills with letter-spacing (≥ 0.04em).
- `tabular-nums` on currency, KPI counters, dates, anything aligned in columns.
- Heading-to-body ratio ≥ 2x at the largest viewport.
- Minimum font size: 12px.

### Don't
- More than two type families (excludes monospace for code).
- ALL CAPS in body or headings (limit to badges).
- Font size < 12px on any viewport.
- Justified text (creates rivers, hurts readability).

---

## 3. Components

### Buttons

- Hierarchy: **primary** (one per view, drives the conversion), **secondary** (alternative path), **ghost** (low-emphasis nav / utility), **destructive** (red / warning, confirms-required).
- Touch target: **≥ 44 × 44 px** on mobile, ≥ 36 × 36 px on desktop.
- Focus ring on `:focus-visible`: 2px solid + 2px offset.
- Icon-only buttons require `aria-label`.
- Active state via `transform: scale(0.98)` (transform-only, never `padding`).

### Cards

- Padding scales by viewport: smaller on mobile, larger on desktop.
- Hover lift: `transform: translateY(-Npx)` + optional `scale(1.0X)` — never animate `top`.
- Borders: ghost (low-contrast) by default; named token color on premium / focus.

### Inputs

- Padding: `px-4 py-3` (or equivalent ≥ 12px / ≥ 16px).
- `:focus-visible` ring (2px solid + 2px offset), uses focus token color.
- Placeholder ≤ 0.6 opacity vs body text — never primary color.
- Disabled: `opacity 0.5` + `cursor-not-allowed`.

### Badges / pills

- `rounded-full`, 11–12px font, weight 500, letter-spacing 0.04em, UPPERCASE.
- Padding `px-3 py-1` (or equivalent).

---

## 4. Layout

- 8px spacing grid — every margin / padding / gap is a multiple of 8 (or 4 in tight UI).
- Container: max-width pattern (`max-w-7xl mx-auto px-6 lg:px-8` or equivalent).
- Asymmetric splits (7/5, 8/4, ou extremo 90/10) for hero. Avoid 50/50 — visually static. Composições em camadas / sobrepostas (eixo Z) e parallax são encorajadas.
- Section vertical spacing: generous on desktop (≥ 96px), compressed on mobile (≥ 64px).

### Responsive breakpoints

| Breakpoint | Behavior |
|---|---|
| Mobile (< 640px) | Single column, hamburger nav, sticky CTA bar |
| Tablet (640–1024px) | 2-col grids, condensed nav |
| Desktop (≥ 1024px) | Full layout, 3-col grids, asymmetric hero |
| Wide (≥ 1280px) | Edge-to-edge `max-w-7xl`, generous gutters |

---

## 5. Border radius

- Use a discrete radius scale (e.g., `sm` / `md` / `lg` / `xl` / `2xl` / `full`).
- Pills + avatars + icon buttons: `rounded-full`.
- Inputs + default buttons: medium (`rounded-md`).
- Cards: large (`rounded-lg` / `rounded-xl`).
- Modals: largest (`rounded-2xl`).
- Never inline `border-radius: <px>` — token only.

---

## 6. Iconography

### Do
- **One icon library** per project. Choose and stick with it.
- Named imports only — supports tree-shaking.
- Decorative icons: `aria-hidden="true"`.
- Icon-only buttons: `aria-label` required.
- Inherit color via `currentColor` — color hop via `text-*` utility on parent.

### Don't
- Emoji as UI icons.
- Mix icon libraries (Material Symbols + Lucide + Font Awesome).
- `import * as Icons from '<lib>'` — defeats tree-shaking.
- Custom inline SVG (except logos).

---

## 7. Motion

> Intensity target: **dinâmico forte.** Motion é ferramenta de design de primeira classe — profundidade em camadas, 3D, glow e dinamismo são encorajados, não racionados. O único piso duro é `prefers-reduced-motion`.

### Prefira (mais barato, primeira escolha)
- `transform` (translate, scale, rotate, rotateX/Y/Z, perspective)
- `opacity`
- `filter` (`blur`, `brightness`, `drop-shadow`) + `backdrop-filter`
- CSS grid `grid-template-rows: 0fr ↔ 1fr` para disclosure

Compostos na GPU; caminho padrão.

### Use com intenção (permitido quando o efeito pedir)
- Layout props (`width`, `height`, `top`, `left`, `padding`, `margin`, `border-width`, `clip-path`) ok para efeitos que precisam (cards expandindo, painéis morphing, bordas animadas) — meça o custo, prefira `transform` se der o mesmo resultado.
- 3D / tilt (`perspective` + `rotateX/Y`, `preserve-3d`), parallax, entrances escalonadas, gradientes animados (`background-position` / conic / `@property` hue), mouse-glow / spotlight, transições de sombra + glow em camadas.
- Transições multi-propriedade nomeadas (evite `transition: all` — nomeie as props; higiene de perf, não proibição de motion).
- Accordion: grid `0fr/1fr` ou `<details>` PREFERIDO, reveal Framer height / `AnimatePresence` permitido para efeito mais rico.

### Required (piso duro de acessibilidade — inegociável)
- `prefers-reduced-motion` honored on every animation:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
- Islands React / Framer usam `useReducedMotion()`.
- Listeners de pointer-parallax / mouse-glow / tilt são pulados (ou ficam estáticos) sob reduced motion.
- Fallback deixa conteúdo totalmente visível e usável (nada preso em `opacity:0` ou fora da tela).

### Durações sugeridas (guia, não gate)
- Hover / focus: 150–250ms ease
- Reveal / entrance escalonada: 300–600ms ease-out (passo ~60–120ms)
- 3D tilt / parallax follow: contínuo eased (~120–200ms lerp)
- Transição de seção: 200–400ms ease-in-out

---

## 8. Imagery

### Do
- Hero / above-fold: `loading="eager"` + `fetchpriority="high"`.
- Below-fold: `loading="lazy"` + `fetchpriority="low"`.
- Always explicit `width` + `height` (CLS = 0).
- Decorative: `alt=""` + `aria-hidden="true"`.
- Meaningful: descriptive `alt` (who + role + context, in project locale).
- Aspect ratios: hero 16:9 or 21:9; card 4:3; avatar 1:1.

### Don't
- Stock-clinical imagery on a brand-led product.
- Wrong priority on a competing LCP candidate.
- Missing dimensions → CLS spike.
- Lossy formats for vector-style content (use SVG).

---

## 9. Depth & elevation

> Reenquadrado: **premium com profundidade.** Construa hierarquia com tom AND sombra + glow em camadas. Sombras multi-camada e glow em tiers leem como intencional e premium — use.

| Level | Surface | Effect |
|---|---|---|
| 0 | Page background | tonal base — mesh / noise / gradiente animado bem-vindos |
| 1 | Section alternate | passo tonal, glow ambiente opcional |
| 2 | Card (resting) | border + sombra em camadas ambient+key; brand glow em premium |
| 3 | Glass / blur | translucent + backdrop-blur + inner highlight + soft outer shadow |
| 4 | Hover / focus lift | `translateY(-Npx)` ou scale + sombra mais profunda + glow + 3D tilt opcional |
| 5 | CTA halo | tier de glow brand — encorajado em CTAs primários; pode pulsar / animar, reduced-motion → glow estático |
| 6 | Floating / parallax layer | camada de profundidade deslocada, spread maior, blur em camadas distantes |
| 7 | Modal / overlay | raio maior + sombra mais pesada + scrim |

Construa sombras em CAMADAS (ambient larga baixa-opacidade + key mais apertada) = premium. Glow é feature, não defeito (CTAs, cards premium, focus — use tokens de glow do skill de tema). 3D (tilt no hover, parallax em camadas) bem-vindo. Ainda evite um anel solitário `0 0 50px hard-color` SEM camadas de apoio (parece inacabado — coloque em camadas).

---

## 10. Focus & keyboard

- `:focus-visible` ring: 2px solid (brand focus token) + 2px offset.
- Never `outline: none` without replacement.
- `<button>` for actions, `<a href>` for navigation. Never `href="#"`.

---

## 11. Do's and Don'ts

| Do | Don't |
|---|---|
| Semantic tokens + named brand utilities | Hardcoded hex in components |
| Sentence case headlines | UPPERCASE outside badges |
| `tabular-nums` for numerics | Pure `#000` / `#fff` body text |
| One icon library, named imports | `import *` of icon library |
| 8px spacing grid | Inline custom CSS bypassing tokens |
| Sombras em camadas + glow em tiers + glass para profundidade premium | Um anel solitário `0 0 50px` sem camadas de sombra |
| `prefers-reduced-motion` em TODA animação (piso duro) | Qualquer animação sem fallback de reduced-motion |
| `<button>` actions / `<a>` nav | `href="#"` placeholders |
| Prefira `transform`+`opacity`+`filter`; use layout props / 3D / parallax quando o efeito pedir | `transition: all` (nomeie as props — higiene, não proibição) |
| Validate contrast before commit | Cross-mode bleed |

---

## 12. Stack & project signals

When the task touches **project tokens / brand voice / theme implementation**, load the matching project skill (e.g., a `<brand>-theme` skill).

When the task touches **stack-specific token syntax** (Tailwind v4 `@theme`, vanilla-extract, CSS Modules, styled-components), load the matching tech-stack skill.

---

## 13. When to load more

| Need | Load |
|---|---|
| Pages, components, hydration, content data, a11y plumbing | `.claude/rules/frontend.md` |
| Universal stability checklist | `.claude/rules/stability.md` |
| SEO meta / JSON-LD | `.claude/rules/seo.md` |
| Cardinal rules + routing matrix | `.claude/CLAUDE.md` |
| Project tokens / brand voice | matching project skill |
| Stack-specific token syntax | matching tech-stack skill |
