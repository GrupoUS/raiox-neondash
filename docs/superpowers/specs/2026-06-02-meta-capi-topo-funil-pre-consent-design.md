# Spec — CAPI de topo de funil pré-consentimento (híbrido opt-out)

> Data: 2026-06-02 · Branch: `main` · Projeto: Raio-X / Neon Dash (GPUS Astro Landing)
> Status: aprovado para plano de implementação.

## 1. Problema

Hoje o Meta Pixel é **opt-in** (`Layout.astro:138-187`): `fbevents.js` carrega no load, mas `fbq("consent","revoke")` segura os eventos até a pessoa clicar **Aceitar** no banner. Resultado: todo visitante que **não** aceita cookies não gera `PageView`, `ViewContent` nem `Contact` no Meta. Só os eventos de conversão (`Lead`, `CompleteRegistration`) já chegam, porque disparam via CAPI server-side (`meta-capi.ts`) com base no consentimento de contato do quiz (`consentGiven`), independente do banner.

A lacuna é o **topo de funil**: PageView, ViewContent (`quiz_started`) e Contact (clique de WhatsApp).

## 2. Decisão

Adotar modelo **híbrido opt-out**:

- **Pixel no browser**: `consent` default vira `grant` no load (só `revoke` se houver recusa explícita). Captura quem tem JS e não usa ad-blocker.
- **CAPI server-side de reforço**: PageView + ViewContent + Contact disparados por um **beacon first-party** (mesmo domínio → foge de ad-blocker), deduplicados com o pixel por `event_id` compartilhado. Cobertura máxima, à prova de ad-blocker.
- **Recusar**: revoga **apenas** o pixel no browser. O CAPI de topo de funil **continua** disparando (escolha explícita do dono do produto).

### 2.1 Postura LGPD (decisão registrada)

O modelo opt-out seta cookies de marketing e processa IP/UA antes de consentimento explícito, e o "Recusar" não interrompe o CAPI. É uma decisão de negócio assumida pelo dono do produto (interesse legítimo / opt-out, comum no BR, contestável). Este spec **não** trata da defesa jurídica; apenas implementa a política escolhida. Nenhuma PII (nome, e-mail, telefone, etc.) é enviada nos eventos de topo de funil.

## 3. Escopo

### Eventos reforçados via CAPI (allowlist)
| Evento interno | Meta Standard Event | Gatilho |
|---|---|---|
| PageView | `PageView` | load de qualquer página da landing |
| `quiz_started` | `ViewContent` | início do quiz |
| `click_whatsapp_*` | `Contact` | clique em CTA de WhatsApp |

`click_cta_*` (não-WhatsApp) **não** vai pro CAPI (segue só Plausible/dataLayer) — limita ruído.

### Conversões (fora deste escopo, permanecem como estão)
`Lead` (`capture.ts`) e `CompleteRegistration` (`complete.ts`) seguem disparando via CAPI com base legal própria (consentimento de contato do quiz). Não mudam.

## 4. Arquitetura

```
[browser]                                  [server]                [Meta]
load ─► fbq consent grant
     ─► fbq track PageView (eventID=X) ───────────────────────────► Pixel event (X)
     ─► beacon POST /api/track/event {PageView, X} ─► CAPI PageView(event_id=X) ─► Server event (X)
                                                                     └─ Meta deduplica por (event_name, X)
quiz start ─► ViewContent (mesmo padrão)
whatsapp click ─► Contact (mesmo padrão)
Recusar ─► fbq consent revoke  (só o pixel; beacon/CAPI seguem)
```

## 5. Componentes (unidades isoladas)

### 5.1 Pixel bootstrap — `src/layouts/Layout.astro` (inline script, ~L138-187)
**Faz:** inicializa o pixel em `grant` por padrão; dispara PageView do browser com `eventID`; emite o beacon de PageView com o mesmo id; registra listener de Recusar → `fbq("consent","revoke")`.
**Mudanças:**
- Default de consent: `var granted = localStorage.getItem("marketing-consent") !== "denied";` → `fbq("consent", granted ? "grant" : "revoke")`. (Antes era grant só se `=== "granted"`.)
- Gerar `eventId` (UUID com fallback), usar em `fbq("track","PageView",{},{eventID})`.
- Emitir beacon `POST /api/track/event` com `{ event: "PageView", eventId, landingPath }` (via `navigator.sendBeacon` ou `fetch keepalive`).
- Trocar o listener atual (que re-dispara PageView no grant) por: em evento de **recusa** → `fbq("consent","revoke")`. (O grant já é default; não há mais "re-fire on grant".)
**Depende de:** `PUBLIC_FB_PIXEL_ID`, endpoint `/api/track/event`, contrato do `CookieConsent`.

### 5.2 Beacon endpoint — `src/pages/api/track/event.ts` (NOVO)
**Faz:** recebe o beacon do browser e dispara o evento CAPI correspondente.
**Contrato:**
- `export const prerender = false;`
- Aceita só `Content-Type: application/json`.
- Valida com Zod: `event ∈ {PageView, ViewContent, Contact}`, `eventId: string min 6`, `landingPath?: string`, `props?` (só chaves seguras — sem PII). Payload inválido → 400, silencioso.
- Guard anti-abuso: checagem de origem same-site (header `Origin`/`Sec-Fetch-Site`); schema estrito; ignora chaves fora da allowlist; nunca repassa PII.
- Lê contexto via `readCapiRequestContext(request)` + `fbclid` da URL/referer.
- Chama `sendCapiEvent` (variante sem `lead`). Falha → resposta `ok` mesmo assim (nunca quebra a página); status interno em `capi`.
- `isCapiConfigured()` falso → `{ status: "skipped" }`.
**Depende de:** `meta-capi.ts` (generalizado), `META_CAPI_TOKEN`, `PUBLIC_FB_PIXEL_ID`.

### 5.3 `src/lib/server/meta-capi.ts` — generalizar
**Mudanças:**
- `CapiEventName` += `"PageView" | "ViewContent" | "Contact"`.
- `CapiEventInput.lead` vira **opcional**. `user_data` montado do contexto da request (IP/UA/`_fbp`/`_fbc`) + dados hasheados do lead **quando houver**. Sem lead → user_data só com identificadores de browser/rede.
- Novo helper `buildFbcFromFbclid(fbclid, ts)` → `fb.1.{ts}.{fbclid}`; usado quando o cookie `_fbc` está ausente.
- `readCapiRequestContext` passa a também tentar extrair `fbclid` (querystring do `event_source_url`/referer) para construir `_fbc`.
**Invariante mantida:** PII só entra quando há `lead` com `consentGiven`. Topo de funil nunca manda PII.

### 5.4 `src/lib/analytics.ts` — beacon no `track()`
**Mudanças:**
- Para os eventos da allowlist (`quiz_started`→ViewContent, `click_whatsapp_*`→Contact), gerar `event_id` quando não fornecido, disparar o pixel com `eventID` (já suportado) **e** emitir o beacon `POST /api/track/event` com o mesmo id.
- `attachCtaClickListener`: nos `click_whatsapp_*`, anexar `event_id` + beacon. `click_cta_*` permanece inalterado.
- Beacon helper isolado (`sendTrackBeacon(event, eventId, props)`) com `navigator.sendBeacon` + fallback `fetch keepalive`; try/catch silencioso.
**Depende de:** endpoint `/api/track/event`.

### 5.5 `src/components/landing/CookieConsent.astro` — copy opt-out
**Mudanças:** microcopy ajustada para deixar claro que a medição roda por padrão e que **Recusar** interrompe os cookies de marketing (pixel). Botão **Recusar** persiste `denied` e dispara `window.dispatchEvent(new Event("consent:marketing-revoked"))`. **Aceitar** persiste `granted` (sem necessidade de re-disparar grant, que já é default).
**Contrato com o Layout (definido):** novo evento `consent:marketing-revoked` disparado em **Recusar**. O Layout registra listener desse evento → `fbq("consent","revoke")` e remove o antigo listener de `consent:marketing-granted` (grant agora é default no load). Ambos os lados mudam numa só alteração.

## 6. Match quality
`user_data` do topo de funil: `client_ip_address`, `client_user_agent`, `_fbp`, `_fbc`. Quando `_fbc` ausente mas há `fbclid` na URL/referer, construir `fb.1.{timestamp}.{fbclid}`. IP/UA sempre presentes.

## 7. Dedup
Meta deduplica por `(event_name, event_id)` em janela ~48h. Browser e beacon usam o **mesmo** `event_id` (UUID). Validar no Events Manager → status "deduplicated".

## 8. Env / segredos
Reusa `META_CAPI_TOKEN` + `PUBLIC_FB_PIXEL_ID`. **Nenhum secret novo.** Inerte quando ausentes (`isCapiConfigured()`). `META_CAPI_TEST_EVENT_CODE` opcional para validação.

## 9. Edge cases / guardas
- `PUBLIC_FB_PIXEL_ID` ausente → pixel inerte (já hoje); beacon endpoint responde `skipped`.
- Lead store não configurado → **não** bloqueia o endpoint de track (é independente do leads-store).
- Beacon antes do pixel setar `_fbp` (race) → CAPI manda sem `_fbp`; ainda dedupa por `event_id`.
- `navigator.sendBeacon` indisponível → fallback `fetch keepalive`.
- Endpoint público → schema estrito + same-site guard + sem PII passthrough limitam abuso (forwarding pro Meta só de eventos da allowlist, sem dados sensíveis).
- `prefers-reduced-motion`, a11y do banner, contrato de Layout: **inalterados** (hard floor preservado).

## 10. Validação
1. `bun run lint`
2. `bunx astro check`
3. `bun run build`
4. Hex/WhatsApp/console/PII scans (gate manual de commit).
5. Events Manager → Test Events (`META_CAPI_TEST_EVENT_CODE`): confirmar PageView/ViewContent/Contact chegando por browser **e** server, status "deduplicated".

## 11. Fora de escopo (YAGNI)
- Mudança na base legal/defesa LGPD.
- CAPI para `click_cta_*` não-WhatsApp.
- Rate-limiting robusto no endpoint (guard básico same-site basta para o tráfego de landing).
- Alterar o fluxo de conversões (`Lead`/`CompleteRegistration`).

## 12. Arquivos tocados
| Arquivo | Ação |
|---|---|
| `src/layouts/Layout.astro` | editar bootstrap do pixel (default grant + beacon PageView + listener revoke) |
| `src/pages/api/track/event.ts` | **novo** endpoint beacon |
| `src/lib/server/meta-capi.ts` | generalizar (lead opcional, novos eventos, fbclid→_fbc) — não está na lista de `protectedFiles`, edição livre |
| `src/lib/analytics.ts` | beacon nos eventos da allowlist + Contact |
| `src/components/landing/CookieConsent.astro` | copy opt-out + evento de revoke |
| `src/lib/leads/schema.ts` ou novo `src/lib/track/schema.ts` | schema Zod do beacon |
