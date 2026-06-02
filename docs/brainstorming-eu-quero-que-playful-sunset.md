# Aprimoramento Geral — Landing Raio-X Gratuito (design + motion + conversão)

> Plano de execução para o chain `/design-improve` (audit → bolder → animate → colorize → overdrive) sobre a landing **Raio-X Gratuito** do Grupo US / Dra. Sacha. Cada fase roda `frontend-specialist` em foreground; gate único `/verify quick` no fim.

---

## Context

**Por quê:** a landing já é bem estruturada e tem motion forte (reveal/tilt/glow/parallax/shimmer, tokens Navy/Gold, render estático MPA). Mas o doc de pesquisa `docs/landing-pages-design-conversao-2026-06-01.md` aponta lacunas de **conversão** e **ritmo visual** que travam o objetivo comercial: atrair donos de clínica de estética para a Sessão de Diagnóstico Gratuita (Raio-X), que é o topo do funil rumo ao NeonDash / soluções Grupo US.

**Produto ativo:** `Raio-X Gratuito` — sessão diagnóstica grátis de 45min. Lead vai para a SDR **Laura** via WhatsApp + quiz nativo em `/raio-x/perguntas`. Conteúdo real vive em `src/content/landings/raio-x.json` (não `aula-trintae3.json` que o config aponta — divergência conhecida, não-bloqueante).

**Resultado pretendido:** página mais bonita, mais dinâmica (motion premium equilibrado), com copy calibrada e elementos de conversão que o doc prioriza — sem inventar dados (guardrail regulatório de saúde), sem quebrar o contrato estático/tokens/SSOT.

**Achados do audit (verificados em código):**
1. `MidCTA` tem copy **hardcoded** em `index.astro:107-110` → fura o SSOT de conteúdo.
2. **Analytics não conectado:** `src/lib/analytics.ts` expõe `track`/`trackOnce`/`attachCtaClickListener`, mas `attachCtaClickListener` **nunca é chamado** e só `quiz_cta_clicked` é emitido. Nenhum evento do doc (`click_cta_*`, `click_whatsapp_*`, `section_view_*`, `faq_open`, `scroll_25/50/75/90`) está ligado.
3. `ProblemSection` é a seção mais fraca — texto puro centralizado, só `data-reveal`.
4. `SectionDivider` e o conector horizontal do `HowItWorks` são estáticos.
5. `DiagnosticBenefits` não tem `data-tilt` (inconsistente com `CostOfChaos`/`CriteriaColumn`).
6. `--color-text-muted` = `#94a3b8` (`global.css`); doc pede contraste maior (`#b8c0d0`).

**Decisões do usuário:**
- **Motion:** Premium equilibrado (expressivo mas refinado; manter 1 camada de parallax; nada de drama excessivo).
- **Novas seções:** Barra de prova/stats (pós-hero) · Bloco comparativo · Card de oferta sticky (desktop). **Sem** seção de depoimentos por ora.
- **Conteúdo de prova:** construir como **shells PROPOSTA** — render condicional (`{data.X && ...}`) + copy placeholder marcada PROPOSTA; acendem sozinhas quando o JSON for preenchido. Zero dado inventado.

---

## Hard constraints (cardinal — não-negociáveis)

- Astro **estático MPA** apenas — sem SSR, sem `prerender = false`, sem `ClientRouter`. Preferir Astro puro + script vanilla; **zero ilha React nova**.
- **Sem hex hardcoded** fora de `src/styles/global.css @theme`. Tokens semânticos. (O Zod `refine` em `content.config.ts:185` bloqueia hex em copy.)
- Ícones **Lucide / SVG inline** — nunca emoji.
- Motion: qualquer propriedade animável, **preferir `transform`/`opacity`**; **`prefers-reduced-motion` obrigatório** em toda mudança de motion.
- WhatsApp só via `src/lib/whatsapp.ts`; mensagens começam com `"Olá, Laura!"`.
- Adicionar campo de conteúdo = **schema + JSON + leitor numa só mudança**.
- Branch **main-only**; deploy/push só quando pedido.

---

## Schema additions (GATE DE APROVAÇÃO — `src/content.config.ts` é arquivo protegido)

Lote único de campos novos no schema `landings`. Todos **opcionais** (exceto `midCta`, que substitui hardcode) para manter render condicional:

| Sub-objeto | Campo novo | Tipo | Uso |
|---|---|---|---|
| `hero.cta` | `microproof?` | string | linha "por que confiar agora" perto do CTA |
| `hero.cta` | `consultiveVariant?` | string | A/B PROPOSTA ("Ver se tenho perfil") |
| **`proof?`** (novo) | `{ stats: [{value, label}] (≥3), note? }` | obj | barra de stats — **dados REAIS** (PROPOSTA até preencher) |
| `problem` | `image?` | `{ src: image(), alt(≥10), objectPosition? }` | quebra monotonia da seção fraca |
| **`midCta`** (novo) | `{ headline, ctaLabel, microcopy? }` | obj | de-hardcode do `index.astro` |
| **`comparison?`** (novo) | `{ headline, traditional:{label,items[]}, raiox:{label,items[]} }` | obj | bloco comparativo (copy estruturada, sem dado sensível) |
| **`offerSummary?`** (novo) | `{ label, points: string[], ctaLabel }` | obj | card sticky desktop |

**Token (não-schema):** `--color-text-muted` `#94a3b8 → #b8c0d0` em `global.css @theme` (contraste global; validar WCAG AA).

> `src/content.config.ts` e `src/lib/whatsapp.ts` são **protegidos** (`protect_files.py`). As adições de schema exigem aprovação explícita — este é o gate principal. `whatsapp.ts` **não será tocado** nesta rodada (CTAs WhatsApp atuais bastam).

---

## Execução por fase do chain

### Fase 1 — audit (relatório; sem edição destrutiva)
Esta exploração **é** o audit. Gravar relatório em `.claude/agent-memory/design-improve/audit.md` com os 6 achados acima. Confirmar escopo e o gate de schema. Nenhum arquivo de produção alterado.

### Fase 2 — bolder (estrutura/layout — sem dependência de dado real)
- **`ProblemSection`**: adicionar visual de apoio opcional (`problem.image`) + alternância de fundo; sair do texto puro. Manter copy (já bem calibrada por guardrail de saúde — não agressivar).
- **`DiagnosticBenefits`**: promover para `data-tilt` (paridade de profundidade com `CostOfChaos`).
- **NOVO `ProofBar.astro`** (após hero, condicional `{data.proof && ...}`): faixa fina `bg-navy-light/30`, numerais com gradiente gold, placeholder PROPOSTA.
- **NOVO `ComparisonBlock.astro`** (condicional `{data.comparison && ...}`): "Abordagem tradicional vs Raio-X Grupo US"; coluna tradicional em `text-muted`, coluna Raio-X com acento gold.
- **De-hardcode `MidCTA`**: mover copy para `data.midCta`; `index.astro` passa a ler do SSOT.
- **Ritmo de fundo**: alternância navy → navy-light/30 → navy entre seções para quebrar monotonia (recomendação do doc).
- Adicionar atributo `data-section="<nome>"` em cada `<section>` (prepara analytics da Fase 5).

### Fase 3 — animate (premium equilibrado; tudo honra `prefers-reduced-motion`)
- **Barra de progresso de scroll** (vanilla em `interactions.ts` + markup no `Layout.astro`): barra 2px topo, `bg-gold`, largura = `scroll/scrollHeight`, rAF-throttled (mesmo padrão de `initParallax`). Reduced-motion → funcional sem suavização.
- **Conector do `HowItWorks`**: desenhar linha no reveal (`scaleX` 0→1, `transform-origin:left`, ou keyframe `line-draw`). Reduced-motion → largura cheia instantânea.
- **Count-up dos stats** do `ProofBar` (JS no observer): anima ao entrar no viewport; reduced-motion → valor final estático.
- **Entrada do `MidCTA`/`MobileCTABar`** (slide-up único pós-hero; reduced-motion → estático).
- Estender `glow`/`shimmer` ao `ComparisonBlock` e `ProofBar` com moderação. **Não** adicionar novas camadas de parallax (cautela do doc).

### Fase 4 — colorize (tokens semânticos — zero hex novo)
- Aplicar bump de contraste `--color-text-muted` → `#b8c0d0` (global); revalidar pares foreground/background em WCAG AA.
- Verificar **orçamento de gold ≤10% de superfície** após ProofBar/Comparison (modo premium-restrained).
- Semântica de cor do `ComparisonBlock` (muted = tradicional, gold = Grupo US) sem ferir `success`/gold do `CriteriaColumn`.
- **Copy claim:** revisar "20–30% absenteísmo" (`raio-x.json:57`) — exige fonte documentada ou suavizar para não-numérico (guardrail). Flag PROPOSTA.

### Fase 5 — overdrive (maior risco; re-rodar Maestro 6 gates)
- **NOVO `OfferSummaryCard.astro`**: `position: sticky` aside, `md:`+ apenas (mobile já tem `MobileCTABar`); recap da oferta (grátis · 45min · vagas limitadas) + CTA primário. Lê de `data.offerSummary` (ou `hero.cta`+`hero.trustStrip`). Não pode sobrepor `MobileCTABar`.
- **Suite de analytics** (usa `track()` existente; não muda IDs/endpoint):
  - importar + chamar `attachCtaClickListener()` em `interactions.ts`;
  - emitir `click_cta_<location>` e `click_whatsapp_<location>` (detectar via `isWhatsAppDestination` do `whatsapp.ts`);
  - `section_view_<nome>` via um `IntersectionObserver` compartilhado keyed em `data-section`;
  - `faq_open` no evento `toggle` do `<details>` (quando `open`);
  - `scroll_25/50/75/90` no mesmo handler de scroll (via `trackOnce`).
- **CTA wording**: registrar `hero.cta.consultiveVariant` como PROPOSTA A/B ("Ver se tenho perfil") — decisão de copy fica para o preenchimento; manter "Quero minha Sessão" como primário atual.
- **Pré-flight ASK gate**: como o escopo toca `src/content.config.ts` (protegido), confirmar antes de aplicar as adições de schema.

---

## Arquivos críticos

| Arquivo | Mudança |
|---|---|
| `src/content.config.ts` | **PROTEGIDO** — lote de adições de schema (gate de aprovação) |
| `src/content/landings/raio-x.json` | copy + placeholders PROPOSTA (`proof`, `comparison`, `midCta`, `offerSummary`, `problem.image`, `hero.cta.microproof`) |
| `src/pages/index.astro` | montar ProofBar/Comparison/OfferSummary, de-hardcode MidCTA, `data-section` por seção |
| `src/components/landing/ProblemSection.astro` | visual de apoio + alternância de fundo |
| `src/components/landing/DiagnosticBenefits.astro` | adicionar `data-tilt` |
| `src/components/landing/MidCTA.astro` | ler de `data.midCta` |
| `src/components/landing/HowItWorks.astro` | conector animado no reveal |
| `src/components/landing/MobileCTABar.astro` | entrada slide-up |
| **`src/components/landing/ProofBar.astro`** | NOVO (shell condicional) |
| **`src/components/landing/ComparisonBlock.astro`** | NOVO |
| **`src/components/landing/OfferSummaryCard.astro`** | NOVO (sticky desktop) |
| `src/scripts/interactions.ts` | barra de progresso, count-up, observer de `section_view`, wiring de analytics |
| `src/lib/analytics.ts` | estender nomes de evento + detecção WhatsApp (se necessário) |
| `src/styles/global.css` | token de contraste, keyframe `line-draw`, utility da barra de progresso |
| `src/layouts/Layout.astro` | markup da barra de progresso de scroll |

**Reuso (não recriar):** `track`/`trackOnce`/`attachCtaClickListener` (`src/lib/analytics.ts`), `whatsappUrlWithText`/`isWhatsAppDestination` (`src/lib/whatsapp.ts`), primitivas `data-reveal`/`data-tilt`/`data-glow-card`/`data-parallax` e utilities `glass-card`/`card-hover-lift`/`gold-pulse-glow` (`global.css`), padrão de render condicional `{data.X && ...}` (`index.astro:78-88`).

---

## Conteúdo que exige input REAL do cliente (flag PROPOSTA até fornecer)

- **Stats da ProofBar** — qualquer número na página (regulatório: sem stats fabricados).
- Claim "20–30% absenteísmo" (`raio-x.json:57`) — fonte documentada ou remoção.
- `finalCta.socialProof` (estrelas/texto genérico) — base real ou remover.
- Decisão de wording do CTA primário (direto vs consultivo).

> Seções de prova nascem **dark** (render condicional) e acendem ao preencher o JSON — sem retrabalho de código.

---

## Verificação (gate único no fim do chain)

`/verify quick` →
1. `bun run lint`
2. `bunx astro check`
3. `bun run build`
4. Scan hex: nenhum `#[0-9a-fA-F]{3,8}` fora de `global.css`.
5. Scan WhatsApp: nenhum `wa.me/` fora de `src/lib/whatsapp.ts`.
6. Scan content drift: nenhuma copy nova hardcoded em `.astro` (MidCTA migrado para SSOT).

**Smoke manual:**
- DevTools → Rendering → `prefers-reduced-motion: reduce` → todas as animações novas (barra de progresso, conector, count-up, entradas) degradam.
- Tab do topo → skip link primeiro; foco visível.
- Mobile: `MobileCTABar` fixo; sem sobreposição do card sticky desktop.
- Contraste do novo `--color-text-muted` em pares reais (WCAG AA ≥ 4.5:1 body).
- Eventos de analytics disparando no `dataLayer`/Plausible ao clicar CTA, abrir FAQ, scrollar e entrar em seção.

---

## Sequência de risco

- **Mais baixo risco:** Fase 2 (estrutura/layout) e Fase 4 (token de contraste).
- **Médio:** Fase 3 (handlers de scroll — reusar padrão rAF de `interactions.ts` p/ evitar jank).
- **Mais alto:** Fase 5 (card sticky + wiring de analytics + adições de schema em arquivo protegido) — por isso o pré-flight ASK gate.
- **Bloqueio externo:** seções de prova dependem de dado real do cliente → entregues como shells PROPOSTA, não bloqueiam o chain.
