# Plano — Meta Pixel 926368978957843 (consent-gated, browser-side)

## Context

**Problema:** O cliente roda campanhas de tráfego pago na Meta, mas o Pixel `926368978957843` **não existe no código**. O `config.json` declara `PUBLIC_FB_PIXEL_ID` como metadado, porém nenhum trecho lê essa env, não há `fbq`, nem script `fbevents.js`, nem PageView. Resultado: a Meta não enxerga o site, não há atribuição de conversão e as campanhas otimizam às cegas.

**O que disparou:** Pedido direto de configurar o Pixel corretamente, deixá-lo rodando, fazer a Meta verificá-lo e habilitar acompanhamento das campanhas.

**Resultado pretendido:** Pixel ativo em produção (PageView + conversões do funil), verificável no Gerenciador de Eventos / Pixel Helper, com verificação de domínio pronta — tudo respeitando a LGPD via consentimento opt-in.

**Restrições do projeto que moldam a solução:**
- Site **static-only MPA** (sem SSR/adapter) → **somente Pixel browser-side**. Conversions API (server-side) fica fora de escopo (precisaria de endpoint serverless; anotado como evolução futura, podendo deduplicar com o webhook de lead existente).
- A **política de privacidade atual promete explicitamente** "cookieless" e "não utilizamos para perfis publicitários terceirizados" (`src/pages/politica-de-privacidade.astro` linhas 56-59, 91-94, 129-131, 178-185). Meta Pixel contraria isso → **consentimento opt-in + atualização da política são obrigatórios**, não opcionais.
- Cardinal rules: ID de tracking **só em env, nunca hardcoded/commitado**; sem hex fora de `@theme`; sem `console.log`; honrar `prefers-reduced-motion`; main-only.

**Decisões aprovadas pelo usuário:**
1. Consentimento = **banner opt-in** (Pixel só após aceite). Plausible/Vercel seguem livres (cookieless, legítimo interesse).
2. Escopo = **PageView + conversões** integradas ao `track()`.
3. **Incluir slot de verificação de domínio** via env (meta-tag), preenchível depois sem redeploy de código.

---

## Arquitetura

```
.env (local, gitignored) + Vercel env
  └─ PUBLIC_FB_PIXEL_ID=926368978957843
  └─ PUBLIC_FB_DOMAIN_VERIFICATION=        (vazio até colar o código do Business Manager)
        │
Layout.astro (head)
  ├─ <meta facebook-domain-verification>   (renderiza só se env setada)
  └─ bootstrap inline (define:vars fbPixelId)  → window.__FB_PIXEL_ID + stub fbq + loader consent-aware
Layout.astro (body)
  └─ <CookieConsent />  (renderiza só se fbPixelId setada)  → grava localStorage + dispara evento de consent
        │
src/lib/analytics.ts  (track multiplexer já existente)
  └─ novo branch fbq: mapeia evento interno → Standard Event Meta; só envia se __fbReady
        │
Quiz.tsx (já chama track())  → conversões fluem automaticamente após consent
```

**Fluxo de consentimento (gating real do cookie):**
- O bloco base oficial da Meta injeta `fbevents.js` (rede + cookie) ao rodar. Para respeitar a LGPD, o injetor **não roda** antes do consentimento.
- Bootstrap sempre define o *stub* `fbq` (enfileira chamadas, sem rede). Em `accept` (ou consent já gravado em visita anterior) → injeta `fbevents.js` → `fbq('init', id)` → `fbq('track','PageView')` → seta `window.__fbReady=true`.
- Em `reject`/sem decisão → nada é injetado, nenhuma chamada chega à Meta.
- MPA: cada navegação recarrega a página e dispara seu próprio PageView nativamente (sem necessidade de hook de rota).

---

## Mudanças por arquivo

### 1. `.env.example` (+ `.env` local, gitignored)
Documentar as duas chaves (sem valores reais no exemplo):
```
PUBLIC_FB_PIXEL_ID=
PUBLIC_FB_DOMAIN_VERIFICATION=
```
No `.env` local (não commitado) gravar `PUBLIC_FB_PIXEL_ID=926368978957843` para teste. **Usuário adiciona as mesmas chaves no Vercel** (produção/preview) — passo manual fora do código.

### 2. `src/layouts/Layout.astro`
- Ler envs no frontmatter (padrão dos `import.meta.env` já existentes nas linhas 46-49):
  `const fbPixelId = import.meta.env.PUBLIC_FB_PIXEL_ID;`
  `const fbDomainVerification = import.meta.env.PUBLIC_FB_DOMAIN_VERIFICATION;`
- No `<head>`: meta-tag de verificação quando `fbDomainVerification` setada:
  `<meta name="facebook-domain-verification" content={fbDomainVerification} />`
- No `<head>`: bootstrap `<script is:inline define:vars={{ fbPixelId }}>` (renderiza só se `fbPixelId`) — define stub `fbq`, expõe `window.__FB_PIXEL_ID`, lê `localStorage` de consent e injeta/inicia o Pixel se já consentido.
- No `<body>` (antes dos scripts finais): `{fbPixelId && <CookieConsent />}` + import do componente.
- Gating por **presença de `PUBLIC_FB_PIXEL_ID`** (não por `PROD`), para permitir verificação local com Test Events; recomendação: setar a env no Vercel.

### 3. `src/components/landing/CookieConsent.astro` — **NOVO**
- Banner fixo (bottom), tokens semânticos do `@theme` (sem hex), `prefers-reduced-motion` honrado, foco visível, `<button>` reais (sem `href="#"`), link para `/politica-de-privacidade`.
- Copy de chrome/legal inline no componente — **precedente:** skip-link (`Layout.astro:137`) e `<noscript>` já são chrome hardcoded; banner de cookie é chrome de compliance, não copy de produto. (Decisão documentada; alternativa seria mover ao content JSON tocando o protegido `content.config.ts`.)
- Script inline: botões "Aceitar" / "Recusar" gravam `localStorage` (`marketing-consent` = `granted|denied` + timestamp ISO), escondem o banner e, no aceite, disparam `window.dispatchEvent(new Event("consent:marketing-granted"))` (capturado pelo bootstrap → carrega o Pixel). Try/catch silencioso, sem `console.log`.

### 4. `src/lib/analytics.ts`
- Adicionar `META_EVENT_MAP` (evento interno → Standard Event Meta):
  `quiz_started → ViewContent`, `lead_partial_captured → Lead`, `quiz_completed → CompleteRegistration`, `click_whatsapp_* → Contact`. Demais → `trackCustom` com o nome original.
- No `track()`, novo branch try/catch: se `window.__fbReady` e `typeof window.fbq === "function"`, chamar `fbq('track', std, safeProps)` ou `fbq('trackCustom', name, safeProps)`.
- Manter contrato de privacidade: **sem PII** para a Meta (sem advanced matching/hash de e-mail/telefone — anotado como evolução futura, sensível a consentimento). Reaproveita o multiplexer; nada muda em `Quiz.tsx` (já chama `track()`).
- Estender `declare global Window` com `fbq?` e `__fbReady?`.

### 5. `src/pages/politica-de-privacidade.astro`
- Seção 1: incluir cookies de marketing/Meta Pixel nos dados coletados.
- Seção 3 (base legal): acrescentar **consentimento** para cookies de marketing.
- Seção 4 (operadores): adicionar **Meta Platforms Ireland Ltd.** como operador de mensuração de anúncios.
- Seção 7 (Cookies): reescrever — deixa de ser "apenas cookieless"; descreve cookie de marketing opt-in, como aceitar/recusar pelo banner e revogar.
- Ajustar a frase "não utilizamos para perfis publicitários terceirizados" (escopar/atualizar) e atualizar `lastUpdated`.

### 6. `.claude/config.json`
- Em `tracking`, adicionar `"pixelDomainVerificationEnv": "PUBLIC_FB_DOMAIN_VERIFICATION"` (não protegido; mantém SSOT de metadados).

> **Não tocar** `astro.config.mjs` (sem CSP a ajustar) nem demais arquivos protegidos (`content.config.ts`, `whatsapp.ts`, etc.).

---

## Verificação (end-to-end)

1. **Gates:** `bun run lint && bunx astro check && bun run build`.
2. **Scans manuais:** sem hex fora de `global.css`; sem `wa.me` fora de `whatsapp.ts`; sem `console.log`/`debugger`.
3. **Local:** com `PUBLIC_FB_PIXEL_ID` no `.env`, `bun run build && bun run preview` → aceitar o banner → confirmar no **Meta Pixel Helper** (extensão) e em **Gerenciador de Eventos → Testar Eventos** que `init` + `PageView` disparam. Recusar → confirmar que `fbevents.js` **não** carrega (aba Network).
4. **Conversões:** percorrer o quiz após consentir → confirmar `ViewContent`, `Lead` (captura parcial) e `CompleteRegistration` (conclusão) no Test Events.
5. **A11y:** Tab chega ao banner com foco visível; `prefers-reduced-motion` desliga a animação de entrada; JS-off não quebra a página.
6. **Verificação de domínio (pós-deploy):** colar o código do Business Manager em `PUBLIC_FB_DOMAIN_VERIFICATION` (Vercel) → redeploy → Business Manager → Segurança da marca → Domínios → Verificar.
7. **Produção:** após deploy com env no Vercel, Gerenciador de Eventos mostra o Pixel "Ativo" recebendo PageView de tráfego real.

## Passos manuais do usuário (fora do código)
- Adicionar `PUBLIC_FB_PIXEL_ID=926368978957843` (e, quando tiver, `PUBLIC_FB_DOMAIN_VERIFICATION`) nas **Environment Variables do Vercel**.
- Gerar o código de verificação de domínio no **Gerenciador de Negócios** e me passar para colar na env.
- Aprovar o deploy (push/deploy só quando pedido — main-only).

## Fora de escopo (evolução futura)
- **Conversions API** server-side (dedupe com webhook de lead) — exigiria endpoint, quebra o contrato static-only atual.
- **Advanced matching** (hash de e-mail/telefone) — ganho de atribuição, mas envia PII à Meta; reavaliar consentimento.
