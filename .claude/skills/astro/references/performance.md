# Performance Optimization

## Astro Performance Defaults

Astro achieves **40% faster load times** and **90% less JavaScript** compared to React SPAs by:
- Rendering to static HTML by default
- Zero client-side JS unless explicitly opted in
- Automatic asset optimization via Vite

## Core Web Vitals Targets (orientativo para este projeto — meça & anote)

> Intensidade "dinâmico forte": alvos orientativos, não gates de merge. Ver .claude/rules/stability.md § Performance gates. Piso duro é prefers-reduced-motion.

| Metric | Target | How Astro Helps |
|--------|--------|----------------|
| LCP (Largest Contentful Paint) | < 2.5s | Static HTML, preloaded assets |
| CLS (Cumulative Layout Shift) | 0 | Explicit image dimensions |
| INP | ~200ms (orientativo) | JS COMPARTILHADO mínimo, hidratação adiada; 3D/hover interativo pode custar mais |
| FCP (First Contentful Paint) | < 1.8s | No JS blocking render |
| TTFB (Time to First Byte) | < 800ms | Static files from CDN |

## Image Optimization

### Astro Image Component

```astro
---
import { Image } from 'astro:assets';
import heroImage from '../assets/hero.jpg';
---

<!-- Optimized: auto-format, responsive, explicit dimensions -->
<Image
  src={heroImage}
  alt="Hero image description"
  width={1200}
  height={630}
  loading="eager"           <!-- Above fold: eager -->
  fetchpriority="high"      <!-- LCP candidate -->
  format="avif"             <!-- Modern format -->
/>

<!-- Below fold: lazy (default) -->
<Image
  src={speakerPhoto}
  alt="Speaker name"
  width={400}
  height={400}
  loading="lazy"
/>
```

### Image Rules

1. **Always set `width` and `height`** — Prevents CLS
2. **`loading="eager"` + `fetchpriority="high"`** — Only for LCP image (hero)
3. **`loading="lazy"`** — Default for below-fold images
4. **Use `astro:assets`** — Auto-optimization (format, size, quality)
5. **`public/` images** — Not optimized, use for external/dynamic URLs only

### Picture Component (Multiple Formats)

```astro
---
import { Picture } from 'astro:assets';
import hero from '../assets/hero.jpg';
---
<Picture
  src={hero}
  formats={['avif', 'webp']}
  alt="Hero"
  width={1200}
  height={630}
/>
```

## Font Optimization

### Google Fonts Best Practice

```astro
<!-- In Layout.astro <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap"
  rel="stylesheet"
/>
```

Key: `display=swap` prevents Flash of Invisible Text (FOIT).

### Self-Hosted Fonts (Better Performance)

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-v13-latin-regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

## JavaScript Budget

| Category | Target |
|----------|--------|
| Initial / shared JS bundle | ~50KB (orientativo) — mantenha libs de animação FORA do bundle compartilhado |
| Per-island JS | tão pequeno quanto o efeito permitir — island 3D/parallax rico pode ser maior, escopo nele |
| Total page JS | ~100KB (orientativo) — meça & anote em vez de bloquear |

### Reducing JS

1. **Default to `.astro`** — Zero JS components
2. **`client:visible`** over `client:load` — Defer hydration
3. **Avoid large libraries** in islands — Tree-shake or use lighter alternatives
4. **`client:idle`** for non-critical widgets
5. **Code splitting** — Vite auto-splits per island

## CSS Performance

1. **Inline critical CSS** — Astro auto-inlines small stylesheets
2. **Purge unused CSS** — Tailwind v4 auto-purges
3. **Avoid `@import` chains** — Use single entry point
4. **Minimize custom CSS** — Prefer Tailwind utilities

## Build Analysis

```bash
# Check bundle sizes
ANALYZE=true bun run build

# Lighthouse audit
npx lighthouse http://localhost:4321 --preset=desktop
```

## Preloading & Prefetching

```astro
<head>
  <!-- Preload critical assets -->
  <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/images/hero.avif" as="image" />

  <!-- Prefetch next likely navigation -->
  <link rel="prefetch" href="/about" />
</head>
```

## Animation Performance

Prefira `transform`, `opacity`, `filter` (compostos na GPU) — caminho mais barato:

```css
.animate { transition: transform 0.3s, opacity 0.3s, box-shadow 0.3s, filter 0.3s; }
```

Motion de layout-property e 3D são PERMITIDOS quando o efeito precisa — meça o custo e forneça fallback de reduced-motion:

```css
.expand { transition: grid-template-rows 0.3s; }
.tilt { transform: perspective(800px) rotateX(6deg) rotateY(-6deg); }
.parallax { transform: translate3d(0, calc(var(--scroll) * 0.2px), 0); }
```

Com Framer Motion:
```tsx
const reduce = useReducedMotion();
<motion.div animate={reduce ? {} : { rotateY: 12, scale: 1.04 }} />
```

`prefers-reduced-motion` / `useReducedMotion()` é obrigatório em TODOS os itens acima.

### Accordion / expand panels (padrão preferido)

PREFIRA CSS grid `0fr` ↔ `1fr` (mais limpo, sem jank; mantém Motion em `transform`/`opacity` para o chevron). Um reveal Framer height/`AnimatePresence` é permitido quando se quer um efeito de disclosure mais rico, desde que honre `useReducedMotion()`.

## Checklist

- [ ] LCP image has `loading="eager"` + `fetchpriority="high"`
- [ ] All images have explicit `width` and `height`
- [ ] Below-fold images use `loading="lazy"` (default)
- [ ] Fonts use `display=swap`
- [ ] Only necessary islands use `client:load`
- [ ] Below-fold islands use `client:visible`
- [ ] Shared JS ~50KB (orientativo; libs de animação escopadas no island)
- [ ] Animações preferem `transform`/`opacity`/`filter`; layout-prop/3D/parallax usados intencionalmente e medidos; painéis PREFEREM CSS grid `0fr`/`1fr`
- [ ] `prefers-reduced-motion` tratado em TODAS as animações (DURO — incluindo 3D/parallax/mouse-glow)
