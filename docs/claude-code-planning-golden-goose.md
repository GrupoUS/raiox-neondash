# Plan — Quiz Diagnóstico Nativo + Copy de Conversão (Raio-X / Neon Dash)

**Status:** Awaiting approval
**Author:** Claude Code (Plan mode)
**Date:** 2026-05-04
**Branch:** `main`
**Site:** https://raiox.gpus.com.br
**Project root:** `D:\Coders\raiox-neondash`

---

## Context

A landing `/raio-x` captura leads para a "Sessão de Diagnóstico Gratuita" (Raio-X) do produto **Neon Dash** — SaaS de gestão para clínicas/consultórios brasileiros de saúde estética. Hoje o CTA "Quero minha Sessão!" empurra o lead para `/raio-x/perguntas`, que é apenas um **iframe Typebot externo** (https://typebot.io/grupo-us-raio-x). A copy da landing é simples e descritiva, sem moldura de problema, sem prova, sem objeção tratada, sem FAQ. Resultado: pouco controle sobre tracking, copy do quiz, branding visual e qualificação do lead.

**Decisões do usuário (tomadas em planning):**

1. **Quiz nativo no site** substitui o iframe Typebot — controle total sobre UX, copy, branding e tracking.
2. **Lead sink = webhook para CRM externo** (URL via env var) — mantém site 100% estático (cardinal #4).
3. **Quiz na rota dedicada `/raio-x/perguntas`** — reaproveita a rota atual.
4. **Escopo = quiz + copy juntos** — entrega completa.

**Outcome desejado:**

- Quiz nativo de 6 passos com scoring + segmentação + fallback gracioso para WhatsApp.
- Landing reescrita com framing de problema → custo → solução → prova → FAQ → CTA, baseada em dores validadas do mercado BR de estética.
- Tracking custom completo (Plausible + Vercel Analytics + dataLayer fallback) sem PII.
- Conformidade LGPD (consent explícito, política de privacidade atualizada, sem PII em events).

---

## 1. Executive Summary

| Item | Decisão |
|---|---|
| Stack | Astro 6 static + Tailwind v4 + React 19 island único + Bun + Vercel |
| Quiz delivery | Rota dedicada `src/pages/raio-x/perguntas.astro` hospeda `<Quiz client:load />` |
| Quiz steps | 6 (perfil, faturamento, gargalo, urgência, consultoria, contato+consent) |
| Lead sink | `fetch(PUBLIC_QUIZ_WEBHOOK_URL, { method: "POST", keepalive: true })` |
| Fallback | WhatsApp deeplink pré-preenchido (via `whatsappUrlWithText`) quando webhook falha |
| Validação | `zod` (instalar) — schema único compartilhado entre content collection + runtime |
| Estado | `useReducer` + `sessionStorage` (`raiox:quiz:v1`, TTL 24h) |
| Persistência local de leads | Nenhuma — webhook é o sink |
| Tracking | `src/lib/analytics.ts` multiplexa Plausible + Vercel + `dataLayer`; ZERO PII |
| LGPD | Consent obrigatório (zod `z.literal(true)`); privacy policy atualizada |
| Copy | Reescrita do `raio-x.json` + 5 sections novas em `src/components/landing/` |
| Sem novas APIs | Sem SSR, sem API routes, sem DB |

**Bundle additions:** `zod` (~12KB gz). Sem framer-motion, sem zustand, sem react-hook-form.

---

## 2. Codebase Findings

### 2.1 Estrutura existente

- **Landing:** `src/pages/raio-x.astro` (root `/` redireciona para `/raio-x` via `astro.config.mjs:16-18`).
- **Conteúdo SSOT:** `src/content/landings/raio-x.json` — schema em `src/content.config.ts:6-88` (top-level: `seo`, `hero`, `benefits`, `qualification`, `finalCta`, `primaryCta`).
- **Sections atuais (todas pure `.astro`, zero islands):** `DiagnosticHero.astro`, `DiagnosticBenefits.astro`, `DiagnosticQualification.astro`, `DiagnosticFinalCTA.astro`, `MobileCTABar.astro`.
- **Layout:** `src/layouts/Layout.astro` — skip-link, `<main id="conteudo-principal">`, `<noscript>` reveal fallback, JSON-LD (Service+Org+Breadcrumb), Plausible (condicional via `PUBLIC_PLAUSIBLE_DOMAIN`) + Vercel Analytics, fonts via `astro:fonts` (Playfair + Inter).
- **Página atual do quiz:** `src/pages/raio-x/perguntas.astro:1-28` — apenas iframe Typebot. Será substituída.
- **Privacidade:** `src/pages/politica-de-privacidade.astro` — placeholder (precisa atualização).

### 2.2 Capabilities ausentes (net-new)

- ❌ Forms / inputs / multi-step UI
- ❌ Validation libs (zod, valibot, yup, react-hook-form, etc.)
- ❌ Modal / Dialog / Drawer / Stepper / Progress / Accordion / Input / Label primitives
- ❌ API routes / SSR adapter (cardinal #4: nunca introduzir)
- ❌ DB / lead storage
- ❌ Custom analytics events (apenas page-view auto)

### 2.3 Capabilities reutilizáveis

- ✅ **WhatsApp SSOT:** `src/lib/whatsapp.ts` (`WHATSAPP_SDR_E164 = "556294705081"`, `whatsappUrlWithText`, `isWhatsAppDestination`)
- ✅ **Theme tokens:** `src/styles/global.css` `@theme` (Navy/Gold), utilities `glass-card`, `glass-card-bright`, `gold-glow`, `card-hover-lift`, `reveal-up/left/right/scale`, `text-gradient-gold`, `gold-pulse-glow`, `landing-mesh-bg`
- ✅ **Button shared:** `src/components/shared/Button.astro` (variants: primary, whatsapp, outline, ghost; aceita `dataCtaLocation`)
- ✅ **Lucide React** (cardinal #3) — imports nomeados
- ✅ **`data-cta-location`** atributos já presentes nos botões (sem listener — ativaremos)
- ✅ **Schema content collection** com refine `HEX_LITERAL` (cardinal #7) e `startsWith("Olá, Laura!")` (cardinal #6)
- ✅ **Vercel Analytics** + Plausible já wired em `Layout.astro` — apenas adicionar custom events
- ✅ **`<noscript>` reveal pattern** em `Layout.astro:122-129` (referência para fallback do quiz)

---

## 3. Market Research Findings

> Compilado em 2026-05-04. Cada claim tem fonte + confiabilidade. Onde não há fonte, marcado **ASSUMPTION — verificar**.

### 3.1 Dores financeiras (BR)

- **No-show 20–30%** em clínicas brasileiras, redutível para ~5% com lembretes WhatsApp/24h. *Fácil Consulta, 2026 — alta — BR*.
- **CAC alto** no setor beleza/estética (top do mercado de serviços) — sem retenção, dono fica preso a loop de aquisição. *SEBRAE, 2024 — média — BR*.
- **Reforma fiscal CBS/IBS 2026** força reposicionamento de margens; maioria dos donos não tem visibilidade prévia. *Rocha Contábil, 2026 — alta — BR*.
- *ASSUMPTION:* dono pequeno gasta 20–25h/sem em tarefas administrativas (sem fonte BR pública).
- *ASSUMPTION:* clínicas pequenas misturam fluxo PF/PJ em planilha/caderno (observação de mercado, comum em comunidades SEBRAE).

### 3.2 Captação e conversão

- **CPL Meta Ads BR (estética/serviços):** R$15–25/lead qualificado. *Meta Ads benchmarks, 2025 — alta — BR*.
- **CPL subiu ~21% em 2025** vs 2024 — competição crescendo. *Instagram Meta Data, 2025 — alta — BR*.
- **Resposta lenta mata conversão** — lead frio em horas. Padrão observado em comunidades de gestão estética IG (TolkiBrasil + Analise Clínicas, 2025 — média — BR).
- **Quiz B2B SaaS:** 1.1–2.9% conversion baseline. *Predictable Profits, 2025 — alta — internacional*.
- **LeadQuizzes:** 31.6% conversion em templates (com público qualificado + oferta clara). *Learning Mole, 2024 — alta — internacional*.
- *ASSUMPTION:* lead-to-first-consultation 10–20% em estética (sem benchmark BR público).

### 3.3 Agenda, no-show, recorrência

- **Cadeira vazia 1–2×/semana** com ticket R$300–800 = R$1.200–6.400/mês perdidos em clínica pequena. *Inferência via Fácil Consulta, 2026 — alta — BR*.
- **Lembretes WhatsApp** têm taxa de abertura >98% (canal mais eficiente). *Fácil Consulta, 2026 — alta — BR*.
- *ASSUMPTION:* retorno/recompra 30–50% em 90 dias pós-primeiro procedimento (sem dado BR).

### 3.4 Sobrecarga do dono

- **Decisões por gut-feel** sem dashboard — ocupação real, margem por procedimento e horários críticos invisíveis. *Padrão observado em comunidades IG/SEBRAE — média — BR*.
- **Vagas premium** (Glassdoor BR, 2025) listam KPI/ticket médio/conversão como requisitos — sinaliza que clínicas de ponta dependem de dado, mas pequenas não. *Glassdoor, 2025 — média — BR*.

### 3.5 Gatilhos de adoção SaaS

1. **Resolver no-show com ROI visível** (R$600–3.200/mês recuperados).
2. **Visibilidade de receita real** (ticket médio + margem por procedimento + ocupação).
3. **Automação de follow-up** WhatsApp (qualidade de vida + retenção).
4. **Prontuário digital** (compliance crescente).
5. **Captura de leads Meta → agenda → follow-up** sem copy/paste.

**Objeções típicas (ASSUMPTION):** preço inicial >R$300/mês sem trial; medo de "outro sistema que ninguém usa"; integração com agenda existente (Google/Hotmart).

### 3.6 Best practices quiz funnel

- **8–10 perguntas** = ponto ótimo B2B; >12 sofrem 30–40% drop-off. *Typeform/Leadquizzes case studies, 2024 — média*.
- **Captura de contato no FINAL** (após valor entregue) supera captura no início em 20–25%. *Medium / Elliot Padfield, 2024 — alta — internacional*.
- **Resultado personalizado + CTA WhatsApp direto** + opção "agendar" é padrão vencedor.
- **LGPD-aware:** consent explícito, sem dark patterns, opt-in claro.

### 3.7 Síntese aplicável

Os 4 ângulos de dor com **alta confiança** que devem alimentar copy + quiz:

1. No-show 20–30% (cadeira vazia mensurável)
2. CAC alto + resposta lenta (lead morre rápido)
3. Falta de visibilidade de lucro/custo por procedimento
4. Dono sobrecarregado decidindo por intuição

---

## 4. Assumptions and Unknowns

| Item | Status | Próxima ação |
|---|---|---|
| `PUBLIC_QUIZ_WEBHOOK_URL` (CRM destino) | **UNKNOWN** | User precisa fornecer antes de TASK-06 (RD Station / Make / Zapier / próprio endpoint). Default em dev: noop (vai direto pro fallback). |
| CORS do CRM destino | **UNKNOWN** | Validar `Access-Control-Allow-Origin: https://raiox.gpus.com.br` antes de TASK-11. |
| Features reais do Neon Dash | **PARCIALMENTE CONHECIDO** | Plano não promete features específicas. Copy fala de "diagnóstico" (sessão Raio-X), não vende sistema diretamente. Confirmar com user antes da reescrita final. |
| Threshold "high intent" (score ≥ 70) | **ASSUMPTION** | Pesos calibráveis via JSON sem deploy de código. |
| Plausible ativo em produção | **UNKNOWN** | Verificar `PUBLIC_PLAUSIBLE_DOMAIN` em Vercel project settings. Vercel Analytics sempre ativo. |
| 4 dores BR validadas | **ALTA CONFIANÇA** | Ver §3.7. |
| Recompra/retenção estética BR | **ASSUMPTION** | Não usar como claim na copy. |
| Tempo dono em admin | **ASSUMPTION** | Usar linguagem qualitativa ("muitas horas"), não números. |
| LGPD: cookie banner | **NÃO NECESSÁRIO** | Plausible cookieless + Vercel cookieless por padrão. Política de privacidade cobre. |

---

## 5. Recommended Quiz Strategy

### 5.1 Princípios

- **Sentir como diagnóstico, não formulário** — cada pergunta gera consciência ("você sabe...?").
- **Curto** — 6 passos (5 diagnósticas + 1 contato), abaixo do ponto de drop-off observado em B2B (~10).
- **Captura de contato APENAS no fim** (per evidência §3.6).
- **Progressive disclosure** — uma pergunta por step, sem fadiga visual.
- **Sem manipulação** — nenhuma pergunta de FOMO ou medo. Diagnóstico, não pressão.
- **LGPD-aware** — apenas dados de negócio + contato; sem dado de saúde, sem CPF, sem dado sensível de paciente.

### 5.2 Estrutura

| # | Step | Tipo | Output | Peso |
|---|---|---|---|---|
| 1 | Estágio da clínica | single-choice (4) | segmento bruto | 25 |
| 2 | Faturamento mensal médio | single-choice (4) | tier financeiro | 30 |
| 3 | Maior gargalo percebido | single-choice (5) | área de dor | 15 |
| 4 | Quão urgente resolver (1–5) | scale | intent score | 20 |
| 5 | Já trabalhou com consultoria? | single-choice (3) | maturidade | 10 |
| 6 | Contato (nome, whatsapp, email) + consent | contact | PII + consent | — |

**Total bruto: 100 pontos.**

### 5.3 Lead score & segmentação

**Buckets de intent:**

- `cold`: 0–39 — nutrir por email, sem prioridade SDR
- `warm`: 40–69 — Laura contata em 24h
- `hot`: 70–100 — Laura contata em ≤2h

**Segmento (independente de score, usa Q1+Q2):**

- `clinica-inicial` — Q1=inicial OR (Q1=crescimento AND Q2<10k)
- `em-crescimento` — Q1=crescimento AND Q2 ∈ [10–30k, 30–80k]
- `estabelecida` — Q1=estabelecida AND Q2≥30k
- `pronta-para-diagnostico` — Q1=pronta OR (score≥70 AND Q5≠"atualmente")

**Evento `high_intent_lead`:** dispara se `score ≥ 70 || segment === "pronta-para-diagnostico"`.

### 5.4 Pós-submit

- **Sucesso:** `ResultScreen mode="success"` — confirma envio, mostra próximos passos ("Laura entra em contato em ≤24h"), CTA secundário WhatsApp para urgência.
- **Falha (webhook 4xx/5xx/timeout):** `ResultScreen mode="fallback"` — botão WhatsApp pré-preenchido com mensagem começando "Olá, Laura!" + nome + segmento + score curto.
- **Sem JS:** `<noscript>` mostra link wa.me direto + texto "Habilite JavaScript ou fale com a Laura no WhatsApp".

---

## 6. Recommended Landing Page Copy Direction

### 6.1 Posicionamento

- **ICP:** dono(a) de clínica/consultório de saúde estética com 1–15 profissionais.
- **Tom:** premium, direto, brasileiro de mercado, sem jargão SaaS, sem promessa de receita.
- **Framing:** problema → custo silencioso → diagnóstico (Raio-X) → caminho → prova → CTA.
- **Não promete:** crescimento garantido, faturamento garantido, claim médico, "10x leads", "duplicar pacientes".
- **Preserva:** marca **Neon Dash** + nome do produto-isca **Raio-X Gratuito**.

### 6.2 Sections (ordem nova)

1. **Hero** — eyebrow + headline + subhead + 3 problem-pills + CTA primário + helper "Resposta em 24h" + microcopy "Vagas limitadas".
2. **ProblemSection** *(novo)* — "Sua clínica cresce, mas a clareza não acompanha." 2–3 parágrafos curtos com 4 dores validadas (§3.7).
3. **CostOfChaos** *(novo)* — "4 sintomas de quem está crescendo no escuro" — grid 2x2 (Lucide icons): cadeira vazia, lead frio, lucro invisível, dono sobrecarregado.
4. **Benefits** *(existente)* — "O que você leva da sessão" (refinar para 4 itens objetivos).
5. **HowItWorks** *(novo)* — "Como funciona seu Raio-X" — 4 passos: agendar → conversa estruturada (45min) → diagnóstico em PDF → recomendação prática.
6. **Qualification** *(existente)* — "Esta sessão é para você se" (refinar para específico de estética).
7. **NotForSection** *(novo)* — "Esta sessão NÃO é para você se" — qualifica negativamente (quem ainda não abriu, quem só quer demo de software, quem espera resposta milagrosa).
8. **FAQ** *(novo)* — 6–8 perguntas: "É realmente gratuito?", "Quanto tempo dura?", "Quem é a Dra. Sacha?", "Vou ouvir um pitch?", "E se eu não estiver pronto?", "Como vocês usam meus dados?".
9. **FinalCTA** *(existente)* — refinar copy + manter WhatsApp secundário.
10. **MobileCTABar** *(existente)* — sem mudança estrutural.

### 6.3 Copy gaps preenchidos

| Gap atual | Resolução |
|---|---|
| Sem framing de problema | ProblemSection + CostOfChaos |
| Sem prova/credibilidade | Mencionar "Dra. Sacha + equipe" + frame de diagnóstico (já neutro) — sem testimonials inventados |
| Sem objeção tratada | NotForSection + FAQ |
| Sem mecanismo diferenciado | HowItWorks (4 passos: agenda → conversa → PDF → caminho) |
| CTA genérico | Manter "Quero minha Sessão!" no hero (já bom); refinar microcopy de urgência |
| Sem risk reversal | "Gratuito" + "sem pitch, sem enrolação" (já presente — manter e amplificar) |

---

## 7. Proposed Quiz Questions and Lead Scoring

> Drafts iniciais; copy final em PR de implementação. Tom: pt-BR, direto, sem manipulação.

### Step 1 — Estágio da clínica

**Pergunta:** "Como você descreveria o momento atual da sua clínica?"

| ID | Label | Peso | Segmento parcial |
|---|---|---|---|
| `inicial` | Acabei de abrir / em validação (até 6 meses) | 5 | clinica-inicial |
| `crescimento` | Em crescimento, mas com gargalos operacionais | 15 | em-crescimento |
| `estabelecida` | Estabelecida, faturando bem, mas com problemas de escala | 25 | estabelecida |
| `pronta` | Quero fazer um diagnóstico estratégico agora | 20 | pronta-para-diagnostico |

### Step 2 — Faturamento mensal médio

**Pergunta:** "Qual a faixa aproximada de faturamento mensal da clínica?"

| ID | Label | Peso |
|---|---|---|
| `<10k` | Até R$ 10 mil | 5 |
| `10-30k` | R$ 10 mil a R$ 30 mil | 15 |
| `30-80k` | R$ 30 mil a R$ 80 mil | 25 |
| `80k+` | Acima de R$ 80 mil | 30 |

### Step 3 — Maior gargalo percebido

**Pergunta:** "Onde você sente que mais perde tempo, dinheiro ou energia hoje?"

| ID | Label | Peso |
|---|---|---|
| `marketing` | Captação de leads e marketing | 10 |
| `operacional` | Agenda, no-show e organização | 15 |
| `financeiro` | Visibilidade de lucro e custos | 15 |
| `time` | Equipe e processos | 12 |
| `indeciso` | Honestamente, não sei dizer | 5 |

### Step 4 — Urgência

**Pergunta:** "Em uma escala de 1 a 5, quão urgente é resolver isso para você?"

| Valor | Label | Peso |
|---|---|---|
| 1 | "Posso esperar" | 4 |
| 2 | — | 8 |
| 3 | — | 12 |
| 4 | — | 16 |
| 5 | "Preciso resolver agora" | 20 |

### Step 5 — Consultoria prévia

**Pergunta:** "Você já trabalhou com consultoria ou mentoria de gestão antes?"

| ID | Label | Peso |
|---|---|---|
| `nunca` | Nunca | 5 |
| `ja-tive` | Já tive, hoje não tenho | 10 |
| `atualmente` | Tenho atualmente | 3 |

### Step 6 — Contato + consent

**Campos:**

- `name` (text, required, min 2)
- `whatsapp` (tel, required, regex E.164 BR `^\+?55?\s?\d{2}\s?\d{8,9}$`, normalizar para E.164 antes de submit)
- `email` (email, required)
- `clinicName` (text, optional)
- `cityState` (text, optional, "Cidade/UF")
- `consentGiven` (checkbox, required, `z.literal(true)`)

**Consent text:**

> "Concordo com o tratamento dos meus dados pelo Grupo US para fins de agendamento e contato sobre a Sessão de Diagnóstico, conforme a [Política de Privacidade](/politica-de-privacidade)."

### 7.1 High-intent / high-pain answers

- **High-intent:** Q1=`pronta` OR Q4≥4 OR Q5=`nunca`+Q1=`crescimento`
- **High-pain:** Q3=`financeiro` OR Q3=`operacional`
- **Cold:** Q4≤2 AND Q1=`inicial`

### 7.2 Result screens

**Sucesso (`mode="success"`):**

> ## Diagnóstico recebido!
> A Laura (nossa SDR) entra em contato pelo WhatsApp em até **24 horas** para agendar sua Sessão de Diagnóstico de 45 minutos.
> [CTA secundário: "Conversar agora no WhatsApp"]

**Fallback (`mode="fallback"`):**

> ## Quase lá — vamos finalizar pelo WhatsApp
> Tivemos um problema técnico ao registrar suas respostas. Clique abaixo para enviar direto para a Laura:
> [Botão WhatsApp pré-preenchido com `Olá, Laura! [nome] | [segmento] | [score]`]

**Erro retry (`mode="error"`):**

> ## Não foi dessa vez
> [Botão "Tentar novamente"] [Botão WhatsApp fallback]

---

## 8. Data, Privacy, and Analytics Plan

### 8.1 Payload do webhook

```typescript
type QuizPayload = {
  quizId: "raio-x";
  quizVersion: "1.0.0"; // semver bump quando steps mudam
  submittedAt: string; // ISO-8601
  sessionId: string; // nanoid 12
  answers: {
    stage: "inicial" | "crescimento" | "estabelecida" | "pronta";
    revenue: "<10k" | "10-30k" | "30-80k" | "80k+";
    bottleneck: "marketing" | "operacional" | "financeiro" | "time" | "indeciso";
    urgency: 1 | 2 | 3 | 4 | 5;
    consultancyHistory: "nunca" | "ja-tive" | "atualmente";
  };
  contact: {
    name: string;
    whatsapp: string; // E.164 normalizado
    email: string;
    clinicName?: string;
    cityState?: string;
    consentGiven: true;
    consentTimestamp: string; // ISO-8601
  };
  score: {
    total: number; // 0-100
    intent: "cold" | "warm" | "hot";
    segment: "clinica-inicial" | "em-crescimento" | "estabelecida" | "pronta-para-diagnostico";
  };
  meta: {
    utm: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
    referrer?: string;
    userAgent: string; // truncado 200 chars
    landingPath: string;
  };
};
```

### 8.2 Eventos de tracking

| Evento | Trigger | Props (sem PII) |
|---|---|---|
| `quiz_cta_clicked` | click em `[data-cta-location]` na landing | `{ location, label }` |
| `quiz_started` | mount do `<Quiz />` step 1 | `{ sessionId, version }` |
| `quiz_step_viewed` | render de cada step | `{ step, stepId, sessionId }` |
| `quiz_question_answered` | onChange final por step | `{ stepId, answerId, sessionId }` |
| `quiz_abandoned` | `visibilitychange hidden` ou `beforeunload` antes de complete (debounced once) | `{ lastStep, sessionId }` |
| `quiz_completed` | submit válido client-side | `{ sessionId, score, intent, segment }` |
| `lead_submitted` | webhook 2xx | `{ sessionId, score, intent }` |
| `lead_submission_failed` | webhook erro | `{ sessionId, errorCode }` |
| `high_intent_lead` | `score ≥ 70 \|\| segment === "pronta-para-diagnostico"` | `{ sessionId, score, intent }` |
| `whatsapp_fallback_used` | click no WhatsApp da `ResultScreen` em modo fallback | `{ sessionId, reason }` |

**Privacy guarantee:** ZERO PII (`name`, `whatsapp`, `email`) em `track()` calls. Code review enforces.

### 8.3 LGPD

- **Consent obrigatório** (zod `z.literal(true)`) — submit bloqueado sem.
- **Privacy policy** (`src/pages/politica-de-privacidade.astro`) — atualizar com:
  - Quais dados (nome, whatsapp, email, respostas, score, UTM)
  - Finalidade (qualificação + agendamento + contato comercial)
  - Compartilhamento com operadores (CRM via webhook; analytics agregada cookieless)
  - Retenção (24 meses ou até solicitação de exclusão)
  - Direitos do titular via `suporte@drasacha.com.br`
  - Base legal (consentimento art. 7º I + legítimo interesse art. 7º IX para analytics agregada)
  - Atualizar "Última atualização" para data do deploy
- **Sem cookie banner** — Plausible cookieless + Vercel Analytics cookieless por padrão.
- **Sem dark patterns** — consent text claro, opt-in explícito, sem pré-marcado, sem "obrigado" enganoso.

---

## 9. Atomic Task Plan

### TASK-01: Instalar zod
- **Goal:** dep única para validação cross-layer
- **Scope:** package.json, lockfile
- **Files:** `package.json`, `bun.lock`
- **Subtasks:**
  - [ ] `bun add zod`
  - [ ] confirmar versão `^3.x` (ou v4 se estável)
  - [ ] `bun run lint && bunx astro check`
- **Dependencies:** nenhuma
- **Validation:** `bunx astro check` passa
- **Rollback:** `bun remove zod`
- **Done when:** zod listado em `dependencies` e gates passam
- **Risk level:** Low

### TASK-02: Estender `src/content.config.ts` (landing + quizzes)
- **Goal:** novos campos opcionais na landing + collection `quizzes`
- **Scope:** apenas schema, sem alterar conteúdo existente
- **Files:** `src/content.config.ts`
- **Subtasks:**
  - [ ] adicionar opcionais à landing schema: `hero.problemPills` (array length 3), `problem`, `howItWorks`, `notFor`, `faq`
  - [ ] adicionar `"native-quiz"` ao enum `primaryCta.mode`
  - [ ] relax regex de `primaryCta.url` para aceitar path interno (`/...`) OU URL absoluta
  - [ ] criar collection `quizzes` (loader glob `src/content/quizzes/**/*.json`) com schema (steps, intro, consent, thanksScreen, errorScreen)
  - [ ] reaplicar `HEX_LITERAL` refine + `startsWith("Olá, Laura!")` no fallback whatsapp template
  - [ ] export collection
- **Dependencies:** TASK-01
- **Validation:** `bunx astro sync && bunx astro check`
- **Rollback:** `git revert`
- **Done when:** schema valida `raio-x.json` atual sem alterar nada (backward compatible)
- **Risk level:** Medium

### TASK-03: Criar `src/content/quizzes/raio-x.json` [PARALLEL with TASK-04]
- **Goal:** SSOT do quiz (copy + weights + thanks/error)
- **Scope:** apenas conteúdo
- **Files:** `src/content/quizzes/raio-x.json` (novo)
- **Subtasks:**
  - [ ] 6 steps com options + weights (per §7)
  - [ ] consent text com link `/politica-de-privacidade`
  - [ ] thanks screen (success copy)
  - [ ] error screen + fallback whatsapp template (`Olá, Laura! ...`)
  - [ ] sem hex literals
- **Dependencies:** TASK-02
- **Validation:** `bunx astro check` valida zod
- **Rollback:** deletar arquivo
- **Done when:** `getEntry("quizzes","raio-x")` retorna data tipada
- **Risk level:** Low

### TASK-04: Criar `src/lib/analytics.ts` [PARALLEL with TASK-03]
- **Goal:** helper `track()` multiplexado, SSR-safe
- **Scope:** apenas o helper
- **Files:** `src/lib/analytics.ts` (novo)
- **Subtasks:**
  - [ ] export `track(eventName, props)` e `trackOnce(key, ...)`
  - [ ] checa `typeof window !== 'undefined'`
  - [ ] dispatch para Plausible (`window.plausible?.()`), Vercel (`window.va?.track?.()`), `dataLayer.push`
  - [ ] tipos TS strict + JSDoc explicando "ZERO PII"
- **Dependencies:** nenhuma
- **Validation:** `bun run lint` + import dummy em uma página, abrir DevTools
- **Rollback:** deletar
- **Done when:** import funciona sem runtime error
- **Risk level:** Low

### TASK-05: Criar componentes do quiz
- **Goal:** quiz nativo funcional
- **Scope:** componentes React + scoring + hook + tipos zod
- **Files:** novo dir `src/components/quiz/`:
  - `Quiz.tsx` (root island)
  - `QuizContainer.tsx`
  - `ProgressBar.tsx` (CSS `transform: scaleX` — não animar `width` direto, cardinal #8)
  - `QuizStep.tsx`
  - `QuestionMultipleChoice.tsx`
  - `QuestionScale.tsx`
  - `QuestionContact.tsx`
  - `ResultScreen.tsx` (3 modes: success, fallback, error)
  - `useQuizState.ts` (hook: reducer + sessionStorage sync, TTL 24h)
  - `scoring.ts` (fn pura)
  - `schema.ts` (zod schemas compartilhados)
- **Subtasks:**
  - [ ] zod schemas (payload, per-step input)
  - [ ] reducer states: `currentStep`, `answers`, `status: "idle"|"submitting"|"success"|"fallback"|"error"`
  - [ ] sessionStorage persistence (chave `raiox:quiz:v1`, debounce 300ms, TTL 24h)
  - [ ] validação per step
  - [ ] submit `fetch(PUBLIC_QUIZ_WEBHOOK_URL, { keepalive: true })` com `AbortController` timeout 8s
  - [ ] graceful fallback (sem URL ou erro → `mode="fallback"` com WhatsApp deeplink via `whatsappUrlWithText`)
  - [ ] tracking events (TASK-04)
  - [ ] estilos via Tailwind utilities + tokens (sem hex)
  - [ ] aria-labels, focus management entre steps, Esc/back/next keyboard
- **Dependencies:** TASK-01, TASK-03, TASK-04
- **Validation:** `bunx astro check && bun run lint` + dev server smoke (preencher quiz manualmente, refresh no meio, sem rede)
- **Rollback:** deletar dir
- **Done when:** quiz flow completo funciona em dev
- **Risk level:** High

### TASK-06: Refatorar `src/pages/raio-x/perguntas.astro`
- **Goal:** trocar iframe Typebot pelo island
- **Scope:** apenas a página
- **Files:** `src/pages/raio-x/perguntas.astro`
- **Subtasks:**
  - [ ] remover iframe Typebot e `bodyClass="bg-navy m-0 p-0"`
  - [ ] importar `<Quiz client:load />` (justificativa: rota é puro container do quiz, sem fold estático)
  - [ ] passar `webhookUrl={import.meta.env.PUBLIC_QUIZ_WEBHOOK_URL}` + `quiz={getEntry("quizzes","raio-x").data}` + `sdrFallbackPhone={WHATSAPP_SDR_E164}`
  - [ ] manter `noIndex={true}`, `withAnalytics={true}`
  - [ ] `<noscript>` block com link wa.me direto + texto fallback
  - [ ] manter UTMs via `Astro.url.searchParams` → injetar em meta payload (opcional via dataset no body)
- **Dependencies:** TASK-05
- **Validation:** `bun run build` gera HTML + JS bundle do quiz; rota carrega
- **Rollback:** `git revert`
- **Done when:** `/raio-x/perguntas` renderiza quiz nativo
- **Risk level:** Medium

### TASK-07: Reescrita de `src/content/landings/raio-x.json`
- **Goal:** copy nova baseada em §6 + §3
- **Scope:** apenas o JSON
- **Files:** `src/content/landings/raio-x.json`
- **Subtasks:**
  - [ ] reescrever hero (incluir `problemPills` 3 chips de dor)
  - [ ] adicionar `problem` (eyebrow, headline, paragraphs, costs 4 itens)
  - [ ] adicionar `howItWorks` (4 steps)
  - [ ] refinar `benefits` (4 itens objetivos)
  - [ ] refinar `qualification` (específico estética)
  - [ ] adicionar `notFor` (3–5 itens)
  - [ ] adicionar `faq` (6–8 perguntas, ver §6.2)
  - [ ] mudar `primaryCta.mode` para `"native-quiz"` e `url` para `/raio-x/perguntas`
  - [ ] manter `finalCta.secondaryCta.whatsappMessage` começando "Olá, Laura!"
  - [ ] sem hex literals em qualquer string
- **Dependencies:** TASK-02
- **Validation:** `bunx astro check` valida schema (zod refines incluem HEX_LITERAL)
- **Rollback:** `git revert`
- **Done when:** schema valida e copy nova aparece em dev
- **Risk level:** Medium

### TASK-08: Criar componentes Astro de copy [PARALLEL with TASK-07 após schema pronto]
- **Goal:** ProblemSection, CostOfChaos, HowItWorks, NotForSection, FAQ
- **Scope:** apenas componentes; conteúdo via props
- **Files:** novos em `src/components/landing/`:
  - `ProblemSection.astro`
  - `CostOfChaos.astro`
  - `HowItWorks.astro`
  - `NotForSection.astro`
  - `FAQ.astro`
- **Subtasks:**
  - [ ] cada componente puro Astro, recebe props (sem hardcoded copy — cardinal #5)
  - [ ] `FAQ.astro` usa `<details>/<summary>` nativos + animação CSS `grid-template-rows: 0fr ↔ 1fr` no wrapper de conteúdo (cardinal #8 — nunca animar height)
  - [ ] icons via `lucide-react` imports nomeados (cardinal #3)
  - [ ] reutilizar utilities `glass-card`, `card-hover-lift`, `text-gradient-gold`, `landing-mesh-bg`
  - [ ] `data-reveal` attrs para fadein via Layout IntersectionObserver
  - [ ] sem hex literals em CSS inline
- **Dependencies:** TASK-02 (schema)
- **Validation:** visual smoke em dev + `bun run lint`
- **Rollback:** deletar arquivos
- **Done when:** cada section renderiza
- **Risk level:** Medium

### TASK-09: Refatorar `src/pages/raio-x.astro`
- **Goal:** orquestrar 9 sections na ordem nova
- **Scope:** ordem + props condicionais
- **Files:** `src/pages/raio-x.astro:58-76`
- **Subtasks:**
  - [ ] importar 5 componentes novos (TASK-08)
  - [ ] inserir na ordem definida (§6.2)
  - [ ] passar props condicionalmente (`data.problem &&`)
  - [ ] manter `primaryCtaHref="/raio-x/perguntas"`
- **Dependencies:** TASK-07, TASK-08
- **Validation:** `bun run build` + visual QA + `bun run lighthouse:audit`
- **Rollback:** `git revert`
- **Done when:** `/raio-x` mostra todas as 9 seções na ordem
- **Risk level:** Low

### TASK-10: Atualizar `src/pages/politica-de-privacidade.astro` [PARALLEL with TASK-05+]
- **Goal:** declarar quiz, webhook, retenção, direitos LGPD
- **Scope:** apenas conteúdo da página
- **Files:** `src/pages/politica-de-privacidade.astro`
- **Subtasks:**
  - [ ] seções listadas em §8.3
  - [ ] data atualizada
- **Dependencies:** nenhuma técnica
- **Validation:** revisão manual de copy
- **Rollback:** `git revert`
- **Done when:** política cobre fluxo do quiz + webhook + analytics
- **Risk level:** Low

### TASK-11: Validação final + smoke test
- **Goal:** gates de qualidade
- **Files:** nenhum (apenas comandos)
- **Subtasks:**
  - [ ] `bun run lint`
  - [ ] `bunx astro check`
  - [ ] `bun run build`
  - [ ] `bun run smoke-test` (se script existe — caso contrário, manual)
  - [ ] `bun run check:external-urls`
  - [ ] `bun run lighthouse:audit` (Performance, Accessibility, BP, SEO)
  - [ ] manual: preencher quiz com webhook mock (sucesso) + sem rede (fallback) + JS off (noscript)
  - [ ] manual: keyboard navigation (Tab, Enter, Esc) no quiz
  - [ ] manual: refresh acidental no meio do quiz restaura via sessionStorage
  - [ ] manual: consent unchecked bloqueia submit
  - [ ] DevTools Network: payload do webhook conforme schema; events Plausible sem PII
- **Dependencies:** TASK-01..10
- **Validation:** zero errors, performance ≥ baseline (Lighthouse 100×4 confirmado em commit recente — sem regressão)
- **Rollback:** revert merge
- **Done when:** todos gates verdes
- **Risk level:** High

### Ordem de execução

```
01 → 02 → (03 ‖ 04) → 05 → 06
              ↓
              07 → 08 → 09     (em paralelo com 05/06 após 02)
              10                (paralelo com 05+, sem dependência técnica)
              ↓
              11
```

---

## 10. Validation Plan

### Comandos disponíveis (de `package.json`)

```bash
bun run dev                    # dev server
bun run build                  # astro build (gera dist/)
bun run preview                # preview build local
bun run lint                   # biome + oxlint
bun run lint:fix
bunx astro check               # type-check + content schema
bun run check:external-urls    # smoke de URLs externas
bun run lighthouse:audit       # Lighthouse 4-pillar
bun run predeploy              # lint + astro check + build
```

### Por categoria

| Categoria | Validação |
|---|---|
| CTA behavior | Click `[data-cta-location]` dispara `quiz_cta_clicked` (DevTools console / Plausible Live) e navega para `/raio-x/perguntas` |
| Quiz flow | Manual: abrir `/raio-x/perguntas`, completar 6 steps, ver result screen success |
| Form validation | Submit sem consent → bloqueado; whatsapp inválido → erro claro; required missing → mostra error inline |
| Submission OK | Webhook mock (https://webhook.site) recebe payload conforme zod schema |
| Submission fail | Bloquear rede em DevTools → result screen `mode="fallback"` com botão wa.me prefilled |
| Mobile | Chrome DevTools 375×667 + 414×896 — touch targets ≥44px, sticky bar não conflita com quiz na rota dedicada |
| A11y | Axe DevTools sem violations; keyboard-only completa quiz; `prefers-reduced-motion` desabilita animações |
| Analytics | DevTools Network: events em ordem; sem PII em props |
| Lead payload | Schema zod valida payload server-side ANTES de POST (já validado client-side) |
| Copy rendering | Visual QA em /raio-x: 9 sections na ordem; FAQ expande sem layout shift |
| Regressão landing | Lighthouse `/raio-x` ≥ baseline (Performance 100, A11y 100, BP 100, SEO 100 atual) |
| Build/lint/typecheck | `bun run predeploy` exit 0 |

### JS off / noscript

- DevTools Settings → Disable JavaScript → recarregar `/raio-x/perguntas`
- Esperado: bloco `<noscript>` mostra link wa.me direto + texto "Habilite JavaScript ou fale com a Laura no WhatsApp"

---

## 11. Risks and Rollback

| Risco | Mitigação | Rollback |
|---|---|---|
| **Cardinal #4 violation:** introduzir SSR sem querer | Quiz é client-side fetch puro; sem API routes Astro; sem `output: "server"`. Confirmar `astro.config.mjs` inalterado nas zonas de output. | Revert |
| **CORS bloqueado pelo CRM** | Validar com user antes de TASK-06 que CRM destino aceita origin `raiox.gpus.com.br`. Caso bloqueado: dois caminhos: (a) usar webhook genérico (Make/Zapier/n8n cloud com CORS aberto); (b) criar Vercel Function `src/pages/api/quiz.ts` (quebra cardinal #4 — pedir aprovação explícita do user). | Fallback WhatsApp 100% se CORS quebrar em prod |
| **Webhook offline / 5xx** | `try/catch` + `AbortController` 8s + fallback ResultScreen + `lead_submission_failed` event | Automático |
| **`PUBLIC_QUIZ_WEBHOOK_URL` ausente em prod** | Build-time check em `Quiz.tsx`: se URL undefined, montar `mode="fallback"` direto sem fetch. Console.warn em build via integration. | Feature-flag implícita |
| **Schema content quebra build** | Todos os novos campos `optional()` — landing JSON antigo continua válido. PR atômico testa `bunx astro check` antes de merge. | `git revert` schema |
| **Cardinal #7 (hex literals)** | Refine `HEX_LITERAL` no zod schema bloqueia em build. Revisar JSON com regex `\b#[0-9a-fA-F]{3,8}\b` antes de commit. | Build falha cedo |
| **Cardinal #8 (animar layout)** | ProgressBar usa `transform: scaleX`. FAQ usa `grid-template-rows`. Code review: grep `transition.*\b(width\|height\|top\|left\|padding\|margin)\b` em CSS adicionado. | Revisar diff |
| **Cardinal #6 (WhatsApp SSOT)** | Fallback msg construída via `whatsappUrlWithText(...)`; nunca `wa.me/...` inline. Schema zod valida `startsWith("Olá, Laura!")`. | Build falha cedo |
| **PII em events** | Code review enforce: zero `name`/`whatsapp`/`email` em chamadas `track()`. JSDoc no `analytics.ts` reforça. | Scrub events server-side via Plausible filters |
| **Bundle size na rota /perguntas** | Limitar deps a React + zod. Sem framer-motion, sem zustand, sem react-hook-form. Lighthouse audit obrigatório em TASK-11. | Code-split mais agressivo (lazy import de scoring) |
| **Lighthouse regression em `/raio-x`** | Sections novas são pure Astro (zero JS adicional). FAQ usa `<details>` (zero JS). Apenas `/perguntas` ganha bundle (que é noindex). | Reverter sections novas; manter apenas copy do JSON |
| **Refresh acidental perde dados** | sessionStorage com TTL 24h restaura. | Documentado |
| **Privacy policy desatualizada vai live antes do quiz** | TASK-10 não bloqueia release (ordem livre), mas deploy gate exige TASK-10 done. | Hotfix se detectado em prod |

---

## 12. Acceptance Criteria

1. ✅ `/raio-x/perguntas` renderiza quiz nativo React (sem iframe Typebot) e fica interativo em ≤2s em fast 3G simulado.
2. ✅ Quiz completo (6 steps) submete payload tipado conforme zod schema para `PUBLIC_QUIZ_WEBHOOK_URL`.
3. ✅ Falha de webhook (rede off, 4xx/5xx, timeout 8s, ou URL ausente) mostra ResultScreen `mode="fallback"` com botão WhatsApp pré-preenchido começando "Olá, Laura!".
4. ✅ Refresh acidental no meio do quiz restaura respostas via `sessionStorage` (TTL 24h).
5. ✅ Submit sem `consentGiven=true` é bloqueado client-side com erro inline.
6. ✅ `bun run lint && bunx astro check && bun run build` passam sem warnings novos.
7. ✅ `/raio-x` exibe 9 seções na ordem de §6.2; copy nova validada por schema (zero hex literals).
8. ✅ Política de privacidade lista quiz, webhook, retenção 24m, direitos do titular, base legal.
9. ✅ Eventos `quiz_started`, `quiz_completed`, `lead_submitted`, `high_intent_lead` aparecem em Plausible (e/ou DevTools Network) **sem PII** (auditável visualmente).
10. ✅ Lighthouse `/raio-x` mantém Performance / Accessibility / BP / SEO ≥ baseline atual (100×4 conforme commit recente).
11. ✅ JS desabilitado: `/raio-x/perguntas` mostra `<noscript>` com link wa.me direto.
12. ✅ Keyboard-only navega o quiz (Tab/Shift+Tab/Enter/Space), focus ring visível em cada step.

---

## 13. Implementation Order

### Sprint 1 — Foundation (≤1 dia)

1. **TASK-01** — instalar zod
2. **TASK-02** — estender content schema (landing + quizzes collection)
3. **TASK-04** — `analytics.ts` *(paralelo com TASK-03)*
4. **TASK-03** — `quizzes/raio-x.json` *(paralelo com TASK-04)*

### Sprint 2 — Quiz Engine (1–2 dias)

5. **TASK-05** — componentes do quiz (alta complexidade, validar incrementalmente)
6. **TASK-06** — refactor `/perguntas` para hospedar island

### Sprint 3 — Copy & Layout (1 dia, paralelo com Sprint 2 após TASK-02)

7. **TASK-07** — reescrita `landings/raio-x.json`
8. **TASK-08** — 5 componentes Astro novos
9. **TASK-09** — orquestração `raio-x.astro`

### Sprint 4 — Compliance & QA (≤0.5 dia)

10. **TASK-10** — atualizar privacy policy *(paralelo a partir de qualquer ponto)*
11. **TASK-11** — validação final + smoke test + Lighthouse + manual QA

### Pré-requisitos antes de começar

- [ ] User fornece `PUBLIC_QUIZ_WEBHOOK_URL` (CRM destino) **OU** confirma usar Make/Zapier/n8n com CORS aberto **OU** aprova Vercel Function (quebra static-only — pedir confirmação explícita).
- [ ] User valida 4 dores BR (§3.7) antes de TASK-07.
- [ ] User aprova drafts de perguntas do quiz (§7) antes de TASK-03.

---

## Files Touched (resumo)

**Modificar:**
- `package.json` + `bun.lock` (TASK-01)
- `src/content.config.ts` (TASK-02)
- `src/content/landings/raio-x.json` (TASK-07)
- `src/pages/raio-x.astro` (TASK-09)
- `src/pages/raio-x/perguntas.astro` (TASK-06)
- `src/pages/politica-de-privacidade.astro` (TASK-10)

**Criar:**
- `src/content/quizzes/raio-x.json` (TASK-03)
- `src/lib/analytics.ts` (TASK-04)
- `src/components/quiz/Quiz.tsx` + 9 arquivos auxiliares (TASK-05)
- `src/components/landing/ProblemSection.astro` (TASK-08)
- `src/components/landing/CostOfChaos.astro` (TASK-08)
- `src/components/landing/HowItWorks.astro` (TASK-08)
- `src/components/landing/NotForSection.astro` (TASK-08)
- `src/components/landing/FAQ.astro` (TASK-08)

**Reusar:**
- `src/lib/whatsapp.ts` (SSOT — `whatsappUrlWithText`, `WHATSAPP_SDR_E164`)
- `src/components/shared/Button.astro`
- `src/layouts/Layout.astro`
- `src/styles/global.css` (tokens + utilities)

---

**End of plan.**
