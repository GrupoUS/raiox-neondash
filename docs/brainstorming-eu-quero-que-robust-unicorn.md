# Playbook "Dinâmico Forte" — Motion, Profundidade & 3D para landings Astro do Grupo US

> **O que é este documento.** Registro reutilizável da transformação que tirou uma landing Astro estática do estado "parada" e a deixou viva (profundidade em camadas, 3D, parallax, glow, motion orquestrado) — **sem quebrar o contrato de build estático nem a acessibilidade**.
>
> **Como usar em outro projeto.** Tudo aqui é genérico. Onde aparecem tokens de marca (cores, sombras), use os do projeto-alvo. A seção *Portabilidade* no fim lista exatamente o que trocar. Os *Gotchas* são a parte mais valiosa: são os bugs/conflitos que custam horas se você não souber de antemão.

---

## Contexto / motivação

Uma landing pode parecer "estática" por **dois motivos independentes**, e quase sempre é o segundo:

1. **As regras proíbem motion.** Raramente o caso real. A maioria das regras "anti-animação" na verdade proíbe o *jeito errado* de animar (`width`/`height`/`top`/`left`) enquanto **manda** o jeito certo (`transform`+`opacity`). Isso é pró-fluidez, não anti-motion.
2. **O motion nunca foi implementado.** O caso real quase sempre. Sintomas típicos encontrados:
   - biblioteca de animação (`motion`/Framer) **instalada e 100% sem uso**;
   - utilities de efeito (ex.: glow seguindo o mouse) **definidas e nunca aplicadas**;
   - hover lifts minúsculos (2–4px), **zero 3D/tilt/perspective**;
   - tema **sem tokens de sombra/elevação** (flat por design);
   - islands React com transições em **corte seco**;
   - animações **desligadas em bloco no mobile**;
   - hero **sem entrance no load** (só scroll-reveal).

> **Princípio-chave:** o ganho vem 20% de afrouxar regras e 80% de **implementar motion de verdade** + corrigir bugs latentes que mascaram efeitos.

### Doutrina adotada
- **Motion é ferramenta de design de primeira classe** ("dinâmico forte"): profundidade, 3D, parallax, glow e dinamismo são **encorajados**.
- **CWV viram orientativos** (medir & anotar, não travar merge). INP afrouxado para ~200ms.
- **Animar layout props é permitido** quando o efeito pedir — preferir `transform`/`opacity`/`filter` primeiro.
- **Piso duro único:** `prefers-reduced-motion`. Toda animação degrada; nada fica preso em `opacity:0` ou fora da tela.
- **Intocável:** invariantes de render-mode (build estático / MPA, sem SSR/SPA/`ClientRouter`), Lucide-only, content/contato SSOT, tokens-only (sem hex inline — *fortalecido*: todo valor de sombra/glow/3D vira token).

---

## Parte 1 — Reescrita de governança (padrão portável)

Aplique este padrão de reescrita em **qualquer** base de regras de IA/projeto (arquivos `.claude/`, `AGENTS.md`, `CLAUDE.md`, skills, rules):

| De (proibitivo) | Para (encorajador) |
|---|---|
| "**NEVER** animate layout properties … `transform`+`opacity` **only**" | "**PREFIRA** GPU-composited; layout props / 3D / parallax **permitidos quando o efeito pedir** — meça o custo, degrade sob `prefers-reduced-motion`" |
| Seção Motion `Allowed` / **`Forbidden`** / `Required` | `Prefira` / `Use com intenção` / **`Required` (só reduced-motion)** / `Durações sugeridas (guia, não gate)` |
| Depth "Layer by tonal contrast, **not** aggressive shadow" + "avoid `0 0 50px`" | "**Premium COM profundidade**: sombras em **camadas** (ambient + key) + glow em tiers + 3D. Evite só o anel solitário *sem camadas de apoio*" |
| `transition: all` proibido | "Nomeie as props (transições multi-propriedade ricas são ok — higiene, não proibição)" |
| Performance gates: `CLS=0`, `INP<100ms`, `JS<50KB` (duros) | **ADVISORY** — alvos orientativos; INP ~200ms; libs de animação dentro do island; A11y defendido |
| FAQ "**never** animate height" | "**PREFIRA** grid `0fr↔1fr`/`<details>`; height/`AnimatePresence` **permitido** para efeito mais rico se honra reduced-motion" |
| Tema "flat / minimal / subtle shadows" | "premium **com dimensão** — vocabulário de tokens elevation/glow/3D" |

**Regras que NÃO se afrouxam (anotar como inalteradas, nunca remover):**
- Render-mode (estático/MPA, sem `prerender=false`, sem `output:'server'`, sem `ClientRouter`/`astro:after-swap`).
- `prefers-reduced-motion` (vira **mais forte** — estende explicitamente a 3D/parallax/mouse-glow/staggered/gradiente).
- Tokens-only (fortalecido: novos valores de profundidade/glow/3D **devem** ser tokens).
- Lucide-only, content/contato SSOT, contratos do Layout (skip-link, `<noscript>`, preconnect de fontes).

**Downstream a sincronizar** (senão a regra antiga volta a ser reimposta por um agente/auditor): prompts de agentes (`frontend-specialist`, `code-reviewer`), comandos de design (auditores "Glass/Glow trap"), regras consolidadas de debug, perfis de evolução/memória. Procure por: `transform/opacity only`, `INP<100`, `flat/minimal`, `subtle shadows`, `no glow/glass`, `height tween` e relaxe todos com o mesmo padrão.

---

## Parte 2 — Sistema de tokens de profundidade & motion (CSS genérico)

> Substitua `--color-surface-deep` pela cor escura base da marca (sombra ambiente) e `--color-accent` pela cor de destaque (glow). No projeto de origem: `navy` → surface-deep, `gold` → accent.

No bloco `@theme` do CSS global (Tailwind v4 **auto-gera utilities `shadow-*`** a partir de chaves `--shadow-*` **e** expõe cada uma como `var(--shadow-*)` para uso interno):

```css
@theme {
  /* Elevação em camadas (ambient + key) — tonalizada na cor escura da marca */
  --shadow-soft:  0 1px 2px color-mix(in srgb, var(--color-surface-deep) 40%, transparent),
                  0 4px 12px color-mix(in srgb, var(--color-surface-deep) 35%, transparent);
  --shadow-float: 0 6px 16px color-mix(in srgb, var(--color-surface-deep) 45%, transparent),
                  0 14px 40px color-mix(in srgb, var(--color-surface-deep) 40%, transparent);
  --shadow-deep:  0 10px 30px color-mix(in srgb, var(--color-surface-deep) 50%, transparent),
                  0 30px 80px color-mix(in srgb, var(--color-surface-deep) 45%, transparent);

  /* Glow da cor de destaque, em tiers (aditivo sobre a sombra) */
  --shadow-glow-accent-sm: 0 0 16px color-mix(in srgb, var(--color-accent) 18%, transparent);
  --shadow-glow-accent:    0 0 28px color-mix(in srgb, var(--color-accent) 28%, transparent);
  --shadow-glow-accent-lg: 0 0 36px color-mix(in srgb, var(--color-accent) 38%, transparent),
                           0 0 70px color-mix(in srgb, var(--color-accent) 16%, transparent);

  /* Edge-light: bevel superior + contato inferior (o "rim" 3D) */
  --shadow-edge-light: inset 0 1px 0 color-mix(in srgb, white 10%, transparent),
                       inset 0 -1px 0 color-mix(in srgb, var(--color-surface-deep) 60%, transparent);

  /* Composto para cards com tilt: ambient profundo + rim de destaque + edge-light */
  --shadow-3d: 0 18px 50px color-mix(in srgb, var(--color-surface-deep) 50%, transparent),
               0 0 30px color-mix(in srgb, var(--color-accent) 14%, transparent),
               inset 0 1px 0 color-mix(in srgb, white 9%, transparent);

  --perspective-card: 900px;
  --tilt-max-deg: 8deg;
}
```

Utilities de comportamento (fora do `@theme`):

```css
/* Hover lift generoso */
@utility card-hover-lift-lg {
  transition: transform .4s cubic-bezier(.16,1,.3,1), border-color .3s ease, box-shadow .3s ease;
  will-change: transform;
}
.card-hover-lift-lg:hover { transform: translateY(-10px) scale(1.015); box-shadow: var(--shadow-float), var(--shadow-glow-accent-sm); }

/* 3D tilt — self-perspective: cada card tem vanishing point próprio (correto em grids,
   dispensa wrapper). --rx/--ry escritos pelo JS no pointermove. */
[data-tilt] {
  --rx: 0deg; --ry: 0deg;
  transform: perspective(var(--perspective-card)) rotateX(var(--rx)) rotateY(var(--ry));
  transform-style: preserve-3d;
  transition: transform .2s cubic-bezier(.16,1,.3,1), box-shadow .3s ease;
  will-change: transform;
}
[data-tilt]:hover { box-shadow: var(--shadow-3d); }
[data-tilt] [data-tilt-layer] { transform: translateZ(36px); transform-style: preserve-3d; } /* pop durante o tilt */

/* Parallax: só escreve --py; CSS aplica translate → zero CLS */
[data-parallax] { transform: translate3d(0, var(--py, 0), 0); will-change: transform; }

@media (prefers-reduced-motion: reduce) {
  [data-tilt] { --rx:0deg!important; --ry:0deg!important; transition:none; }
  [data-tilt] [data-tilt-layer] { transform:none; }
  [data-parallax] { transform:none; }
}

/* Mouse-glow: radial seguindo o cursor. z-index NEGATIVO (gotcha #3). */
[data-glow-card] { --mouse-x:50%; --mouse-y:50%; position:relative; }
[data-glow-card]::before {
  content:""; position:absolute; inset:0; border-radius:inherit;
  background: radial-gradient(300px circle at var(--mouse-x) var(--mouse-y),
              color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 60%);
  opacity:0; transition:opacity .3s ease; pointer-events:none; z-index:-1;
}
[data-glow-card]:hover::before { opacity:1; }
```

---

## Parte 3 — Módulo de interações compartilhado (genérico)

Um **único** módulo JS bundled (`src/scripts/interactions.ts`), importado **uma vez** no Layout via `<script>` (não `is:inline`, para o bundler minificar). MPA-safe: roda a cada full page load, sem router. Tudo é *progressive enhancement* (try/catch global, nunca quebra a página) e degrada por `matchMedia`.

```ts
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

// Mouse-glow: escreve --mouse-x/--mouse-y em [data-glow-card]
function initGlow() {
  for (const card of document.querySelectorAll<HTMLElement>("[data-glow-card]")) {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mouse-x", `${e.clientX - r.left}px`);
      card.style.setProperty("--mouse-y", `${e.clientY - r.top}px`);
    });
  }
}

// 3D tilt: só pointer fino + motion permitido (nunca em touch → scroll suave no mobile)
function initTilt() {
  if (!hasFinePointer || prefersReducedMotion) return;
  const max = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tilt-max-deg")) || 8;
  for (const el of document.querySelectorAll<HTMLElement>("[data-tilt]")) {
    let raf = 0;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--ry", `${(px * max).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${(-py * max).toFixed(2)}deg`);
      });
    });
    el.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg");
    });
  }
}

// Parallax de scroll: escreve --py (passive + rAF). CSS aplica o translate.
function initParallax() {
  if (prefersReducedMotion) return;
  const items = [...document.querySelectorAll<HTMLElement>("[data-parallax]")];
  if (!items.length) return;
  let ticking = false;
  const update = () => {
    const vh = window.innerHeight;
    for (const el of items) {
      const speed = Number.parseFloat(el.dataset.parallax || "0.15");
      const r = el.getBoundingClientRect();
      const progress = (r.top + r.height / 2 - vh / 2) / vh; // -1..1
      el.style.setProperty("--py", `${(-progress * speed * 100).toFixed(1)}px`);
    }
    ticking = false;
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

try { initGlow(); initTilt(); initParallax(); } catch { /* enhancement — nunca quebra */ }
```

Wiring no Layout (após o script de reveal, antes de `</body>`):
```astro
<script>
  import "../scripts/interactions.ts";
</script>
```

---

## Parte 4 — Padrões de aplicação por componente (genérico)

| Tipo de componente | Padrão a aplicar |
|---|---|
| **Hero** | entrance escalonada (`data-reveal` + delays); destaque do headline com gradiente **animado** (shimmer); imagem com `data-parallax="0.12"` + `shadow-deep`; cards de "trust strip" com `data-glow-card`. |
| **Cards de grid** (problemas, critérios) | `data-tilt` + `data-glow-card` no card; `data-tilt-layer` no ícone (pop durante tilt). **Não** combine com `card-hover-lift` (conflito de `transform` — gotcha #1). |
| **Linhas/listas largas** (benefícios) | lift generoso (`hover:-translate-y-2`) + `data-glow-card` + ícone `group-hover:scale-110`. Tilt fica estranho em linhas largas → use lift. |
| **Passos / timeline** | círculos com `group-hover:scale-110` + `shadow-glow-accent`; imagem com `data-parallax`. |
| **FAQ / disclosure** | **mantém grid `0fr↔1fr`** (Cardinal preservado); enriquece o *feedback de aberto*: tint no `summary:hover`, rotate do ícone em `[open]`, `box-shadow: var(--shadow-glow-accent-sm)` no item aberto, transição ~260ms. Tudo em `<style>` scoped + guarda reduced-motion. |
| **CTA intermediário** | `data-glow-card` + `hover:shadow-2xl`. |
| **CTA final** | tilt no avatar; blob de luz com `animate-pulse` + parallax. |
| **Botão (shared)** | micro-lift universal `hover:-translate-y-0.5` + `hover:shadow-glow-accent` no primário (mantém `active:scale-[0.98]`). |

> **Headings:** aplique shimmer só nos **1–2 headlines hero-level**. Shimmer em todo `<h2>` de seção fica ruidoso e prejudica leitura (gradiente em movimento sob o texto).

---

## Parte 5 — Biblioteca de motion nos islands

Ative a lib (`motion`/Framer) **só nos islands React que já hidratam** (não na página marketing, que fica leve). Caso canônico: transições de passo de um quiz/wizard em corte seco.

```tsx
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

// direção +1 avança / -1 volta
const prefersReducedMotion = useReducedMotion();
const prevStepRef = useRef(currentStep);
const direction = currentStep >= prevStepRef.current ? 1 : -1;
useEffect(() => { prevStepRef.current = currentStep; }, [currentStep]);

<AnimatePresence mode="wait" initial={false}>
  <motion.div
    key={currentStep}
    initial={prefersReducedMotion ? false : { opacity: 0, x: 24 * direction }}
    animate={{ opacity: 1, x: 0 }}
    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -24 * direction }}
    transition={{ duration: prefersReducedMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
  >
    {/* conteúdo do passo */}
  </motion.div>
</AnimatePresence>
```
- Opções/botões: `whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}` + glow no selecionado.
- A lib fica **dentro do chunk do island** → não pesa na entry da landing. Custo de bundle é **orientativo** (medir & anotar).
- Não cria novos islands sempre-ativos; não muda a diretiva de hidratação existente.

---

## Parte 6 — Mobile

O erro comum é **desligar motion em bloco** no mobile — é o que mata a sensação. Substitua por escopo estreito:
```css
@media (max-width: 768px) {
  .float-gentle { animation: none; }          /* float contínuo pode dar jank no scroll */
  .landing-mesh-bg { animation-duration: 32s; } /* mantém o mesh, só mais lento */
}
```
- Glow pulsante do CTA **continua** (dinâmico forte).
- Tilt **nunca** roda em touch (gate `pointer:fine` no JS) → scroll permanece suave.
- Reveals, gradiente animado e parallax **funcionam** no mobile.

---

## Parte 7 — Acessibilidade (piso duro)

Toda técnica nova tem fallback explícito **além** do bloco global:

| Efeito | Degradação sob `prefers-reduced-motion` |
|---|---|
| Tokens de sombra/glow | estáticos, sem animação — totalmente visíveis |
| 3D tilt | `--rx/--ry: 0`, `transition:none` (CSS) **+** listeners não registrados (JS early-return) |
| Parallax | `transform:none` (CSS) **+** scroll listener pulado (JS) |
| Mouse-glow | sem animação envolvida; opcionalmente atrás de `@media (prefers-reduced-motion: no-preference)` |
| Gradiente animado / mesh / pulse | já neutralizados pelo bloco global |
| Motion island | `useReducedMotion()` → duração 0 / só opacity |

---

## ⚠️ Gotchas & decisões de engenharia (a parte que economiza horas)

1. **Bug do reveal com `animation: ... forwards`.** Um scroll-reveal que termina com `forwards` **trava o `transform`** no estado final do keyframe. Resultado: **todo hover-lift e 3D-tilt no mesmo elemento fica mascarado** após o reveal — o elemento parece morto mesmo com hover definido. **Fix:** remova `forwards` e fixe o fim com regra normal:
   ```css
   [data-reveal].revealed { opacity: 1; }                 /* segura o fim, não o transform */
   [data-reveal="up"].revealed { animation: reveal-up .5s cubic-bezier(.16,1,.3,1); } /* sem forwards */
   ```
   Sem `forwards`, após o reveal o `transform` volta à regra base (`[data-tilt]`/hover) e os efeitos funcionam. **Provável causa #1** da sensação de "parado" em qualquer projeto com esse padrão.

2. **Dois `transform` na mesma regra brigam.** `card-hover-lift` (`:hover { transform: translateY() }`) **e** `[data-tilt]` (`transform: perspective() rotate…`) no mesmo elemento → um anula o outro. **Regra:** em card com tilt, o **tilt É o hover** (some o `card-hover-lift`); a sombra de hover vem de `[data-tilt]:hover`.

3. **`[data-glow-card]::before` precisa de `z-index: -1`.** Um pseudo posicionado com `z-index:1` (ou `0`) pinta **acima** do conteúdo não-posicionado (ordem de empilhamento), tingindo o texto. Com `z-index:-1` o glow pinta **acima do fundo do card e atrás do conteúdo** (o card pinta bg → filhos z-negativo → conteúdo). Funciona porque o card tem fundo próprio.

4. **Tilt: use `perspective()` na própria transform, não `tilt-scene` ancestral.** `transform: perspective(var(--perspective-card)) rotateX… rotateY…` dá vanishing point por card — correto em grids de múltiplos cards. Um `perspective` no container compartilha o ponto de fuga e distorce cards longe do centro.

5. **`tilt-layer` + `overflow:hidden`.** `overflow:hidden` no card achata o contexto 3D dos filhos (`preserve-3d` quebra) → o `translateZ` não dá pop. Em cards com `overflow-hidden`, deixe só o tilt do card (sem `data-tilt-layer`). O tilt do próprio elemento (rotateX/Y) funciona mesmo assim.

6. **Tailwind v4: `translate`/`scale` são propriedades independentes.** `hover:-translate-y-0.5` + `active:scale-[0.98]` **compõem** (não se anulam) — diferente do v3. Inclua `translate,scale` na lista do `transition-[...]`.

7. **Parallax x transform de posicionamento.** Não ponha `data-parallax` em elemento que já usa `transform` para posicionar (ex.: `-translate-y-1/2` para centralizar, blobs com `-translate-x-1/2`) — o parallax sobrescreve e o elemento salta. Use parallax só onde o `transform` está livre.

8. **`data-reveal` + `data-tilt`/`data-parallax` no mesmo elemento:** OK **depois** do fix #1. Durante os ~0.5s do reveal a animação domina o transform; ao terminar (sem `forwards`), a regra base (tilt/parallax) assume. Os efeitos só importam pós-entrada, então não há conflito perceptível.

9. **Lint de specificity descendente.** Seletor mais específico (`ul .x::after`) antes de um menos específico (`.x::after`) dispara aviso. Evite escopar por ancestral em overrides mobile; prefira soltar a regra (deixar o efeito rodar) ou igualar a specificity.

10. **Warnings de CSS minify com classes bizarras** (`bg-[var(--color-*)]`, `[file:lines]`): o auto-scan de conteúdo do Tailwind v4 captura literais em docs/markdown e gera utilities inócuas. Confirme com `grep src/` que não vêm do seu código; build segue verde.

---

## Verificação (end-to-end)

```bash
bun run lint && bunx astro check && bun run build
```
- **Smoke render-mode (devem continuar vazios):** `ClientRouter`, `astro:after-swap`, `prerender = false`/`output:'server'` **em páginas de marketing** (endpoints/admin pré-existentes ficam fora).
- **Smoke reduced-motion (deve passar):** `grep -rc "prefers-reduced-motion" src/styles/` ≥ 1; todo island usa `useReducedMotion()`.
- **Manual:** desktop (tilt/glow/parallax a 60fps), mobile (reveals/mesh/parallax vivos, sem tilt), DevTools → Rendering → emular `prefers-reduced-motion: reduce` (tudo congela, conteúdo visível), JS-off (reveal `<noscript>` mostra tudo).
- CWV / bundle dos islands: **anote como informativo**, não bloqueie.

---

## Portabilidade — o que trocar por projeto

| Item | Como adaptar |
|---|---|
| Cor de sombra ambiente | `--color-surface-deep` → cor escura base da marca |
| Cor de glow | `--color-accent` → cor de destaque da marca |
| Nome das utilities de glow | `shadow-glow-accent*` → nomeie com o token da marca (ex.: `shadow-glow-gold*`) |
| `--perspective-card` / `--tilt-max-deg` | ajuste a intensidade (900px/8deg = sutil-forte) |
| Componentes | mapeie os tipos da tabela da Parte 4 para os nomes reais do projeto |
| Island de motion | aplique o padrão da Parte 5 ao wizard/quiz/carrossel existente |
| Governança | rode o padrão da Parte 1 sobre as regras/skills do projeto-alvo |

**Pré-requisitos do projeto-alvo:** Astro estático/MPA, Tailwind v4 (`@theme` + `@utility`), scroll-reveal via `[data-reveal]`+IntersectionObserver, e `prefers-reduced-motion` como piso. Se o reveal usa `forwards`, **aplique o fix #1 antes de tudo**.

---

## Status desta aplicação (projeto de origem)

`bun run lint` → 0/0 · `bunx astro check` → 0 erros · `bun run build` → estático, todas as rotas pré-renderizadas. Invariantes preservados; `prefers-reduced-motion` estendido a todos os efeitos novos. Arquivos: governança em `.claude/**` (Cardinal 8, `DESIGN/frontend/stability/seo`, skills `astro`/`gpus-theme`, agentes/comandos downstream) + site (`src/styles/global.css`, `src/scripts/interactions.ts`, `src/layouts/Layout.astro`, componentes de landing, `Button`, island do quiz).
