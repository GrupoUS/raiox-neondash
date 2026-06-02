# Prompt — Painel interno de leads/alunos com login (admin + vendas) sobre Upstash Redis

> **Como usar:** cole o bloco em `PROMPT` abaixo num projeto novo (Claude Code / agente de codigo). Ele reconstroi, do zero, o mesmo painel administrativo de captura/visualizacao de leads que existe no projeto Raio-X, com login multiusuario (`admin` + `vendas`) e armazenamento no Upstash Redis via REST.
>
> Este documento tem duas partes:
> 1. **Contexto de engenharia** (o que o sistema faz, decisoes, env vars, protocolo do Upstash) — para voce conferir.
> 2. **O PROMPT** (auto-contido, copiavel) — o que voce entrega ao agente no outro projeto.

---

## Parte 1 — Contexto de engenharia (referencia, nao colar)

### Arquitetura real (origem: projeto Raio-X)

| Camada | Arquivo de origem | Papel |
|---|---|---|
| Schema de dados | `src/lib/leads/schema.ts` | Zod: contato, meta, score, lead armazenado |
| Store | `src/lib/server/leads-store.ts` | Upstash Redis REST (GET/SET/LPUSH/LTRIM/LRANGE) |
| Auth | `src/lib/server/auth.ts` | SHA-256 senha + cookie HMAC-SHA256, timing-safe |
| Leitor de env | `src/lib/server/env.ts` | `process.env` (runtime) com fallback `import.meta.env` (build) |
| Notificacao | `src/lib/server/lead-notifier.ts` | Webhook opcional (Make/Zapier/n8n) |
| Login UI | `src/pages/admin/index.astro` | Form de login |
| Dashboard | `src/pages/admin/leads.astro` | Tabela, stats, filtros, CSV, marcar contatado |
| API login | `src/pages/api/admin/login.ts` | Valida credenciais, seta cookie |
| API logout | `src/pages/api/admin/logout.ts` | Limpa cookie |
| API contacted | `src/pages/api/admin/contacted.ts` | Toggle "contatado" |
| API CSV | `src/pages/api/admin/leads.csv.ts` | Export CSV (so autenticado) |
| API capture | `src/pages/api/leads/capture.ts` | Lead parcial (`partial_contact`) |
| API complete | `src/pages/api/leads/complete.ts` | Lead finalizado (com score) |
| Script | `scripts/admin-password-hash.mjs` | Gera o hash SHA-256 da senha |

### Render mode

Astro 6 + `@astrojs/vercel` (adapter). **Hibrido**: a landing e estatica, mas toda rota de painel/API declara `export const prerender = false` (renderizacao on-demand / serverless). Sem SSR global, sem SPA.

### Variaveis de ambiente (nomes canonicos — nao renomear)

**Obrigatorias:**
- `UPSTASH_REDIS_REST_URL` — URL REST do banco Upstash Redis.
- `UPSTASH_REDIS_REST_TOKEN` — token REST (Bearer) do banco Upstash Redis.
- `ADMIN_USERS` — **(versao multiusuario deste prompt)** JSON com os usuarios e hashes. Ex.:
  `[{"username":"admin","passwordSha256":"<hash>","role":"admin"},{"username":"vendas","passwordSha256":"<hash>","role":"vendas"}]`
- `ADMIN_SESSION_SECRET` — string aleatoria longa p/ assinar o cookie de sessao (HMAC).

> Versao single-user original usava `ADMIN_USERNAME` + `ADMIN_PASSWORD_SHA256`. Este prompt generaliza para `ADMIN_USERS` (admin + vendas compartilham a mesma visualizacao). Mantenha um, nao os dois.

**Opcionais:**
- `LEAD_NOTIFY_WEBHOOK_URL` — webhook de notificacao (avisar o time quando entra lead).
- `LEAD_NOTIFY_WEBHOOK_SECRET` — vai no header `X-Lead-Webhook-Secret`.
- `QUIZ_WEBHOOK_URL` — webhook legado p/ planilha/CRM no `complete`.

Gerar hash da senha (ex.: senha `abril33`):
```bash
node scripts/admin-password-hash.mjs "abril33"
# imprime o SHA-256 hex -> cola no passwordSha256 do usuario em ADMIN_USERS
```

### Protocolo Upstash Redis REST (documentacao correta)

Doc oficial: https://upstash.com/docs/redis/features/restapi

Um comando = um `POST` na URL REST, com o comando **como array JSON no body** e o token no header `Authorization: Bearer`:

```
POST https://<db>.upstash.io
Authorization: Bearer <UPSTASH_REDIS_REST_TOKEN>
Content-Type: application/json

["SET", "chave", "valor", "EX", 3600]
```

Resposta:
```json
{ "result": "OK" }      // sucesso
{ "error": "ERR ..." }  // erro -> tratar como excecao
```

Comandos usados pelo store: `GET`, `SET ... EX <ttl>`, `LPUSH`, `LTRIM`, `LRANGE`. Nenhum SDK — so `fetch`. Funciona em qualquer runtime (Node, edge, workers) porque e HTTP puro.

### Modelo de dados (Zod)

- **Contato** (`leadContactSchema`): `name` (>=2), `whatsapp` (>=10), `email` (email), `instagram?`, `cityState?`, `consentGiven: literal(true)`, `consentTimestamp: datetime`. (LGPD: consentimento obrigatorio.)
- **Meta** (`leadMetaSchema`): `utm` (record), `referrer?`, `userAgent?`, `landingPath?`.
- **Score** (`leadScoreSchema`): `total`, `rawTotal`, `intent: cold|warm|hot`, `segment: <enum do produto>`.
- **Lead armazenado** (`storedLeadSchema`): `id`, `status: partial|completed`, timestamps, `quizId/quizVersion`, `sessionId`, `contact`, `answers?`, `score?`, `meta`, `events[]`, `contactedAt?`.

### Chaves Redis e regras

- `raiox:lead:<id>` — JSON do lead (TTL 730 dias).
- `raiox:lead-session:<sessionId>` — mapeia sessao -> id do lead (dedupe).
- `raiox:leads:index` — lista (LPUSH no topo, LTRIM mantem 500 mais recentes).
- `id` = `lead_<timestamp>_<random8>`.
- Eventos `partial_contact` / `completed_quiz` deduplicados; `shouldNotify` so na 1a vez.

### Auth (como funciona, exatamente)

1. Senha do usuario nunca em texto: guarda-se o **SHA-256 hex** em `ADMIN_USERS`.
2. Login: compara `username` e `sha256(senha)` com **comparacao timing-safe** (XOR byte a byte). Acha o usuario no `ADMIN_USERS`.
3. Sessao: payload `{ username, role, exp }` -> base64url -> assinado com **HMAC-SHA256(`ADMIN_SESSION_SECRET`)** -> cookie `token = body.signature`.
4. Cookie: `httpOnly`, `secure` em producao, `sameSite=lax`, `maxAge` 8h.
5. Toda rota protegida le o cookie, refaz a assinatura, compara timing-safe, checa `exp`.
6. Tudo com **WebCrypto** (`crypto.subtle`) — sem dependencia externa.

---

## Parte 2 — O PROMPT (copie tudo abaixo desta linha)

```
# TAREFA
Construa, neste projeto, um painel administrativo interno de captura e visualizacao de leads/alunos, com:
- login multiusuario (usuarios `admin` e `vendas`, ambos veem a MESMA tela);
- armazenamento no Upstash Redis via REST API (sem SDK, so fetch);
- validacao com Zod;
- export CSV e marcacao "contatado";
- notificacao opcional por webhook.

Replique fielmente a arquitetura descrita abaixo. Nao invente libs nem troque nomes de env var.

# STACK ASSUMIDA
Astro 6 + `@astrojs/vercel` (adapter), TypeScript, Zod. Render hibrido: TODA rota de painel/API recebe `export const prerender = false`. Se o projeto nao for Astro, mapeie 1:1 para o framework alvo (Next route handlers, etc.) mantendo a mesma logica, chaves e env vars.

# VARIAVEIS DE AMBIENTE (nomes exatos, nao renomear)
Obrigatorias:
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- ADMIN_USERS  -> JSON array de usuarios: [{"username":"admin","passwordSha256":"<sha256hex>","role":"admin"},{"username":"vendas","passwordSha256":"<sha256hex>","role":"vendas"}]
- ADMIN_SESSION_SECRET -> string aleatoria longa
Opcionais:
- LEAD_NOTIFY_WEBHOOK_URL, LEAD_NOTIFY_WEBHOOK_SECRET, QUIZ_WEBHOOK_URL
Documente todas em .env.example. NUNCA comite valores reais.

# PROTOCOLO UPSTASH REDIS REST (doc: https://upstash.com/docs/redis/features/restapi)
Um comando = um POST na UPSTASH_REDIS_REST_URL, comando como ARRAY JSON no body, header Authorization: Bearer <UPSTASH_REDIS_REST_TOKEN>, Content-Type application/json.
Resposta: { "result": ... } em sucesso, { "error": "..." } em falha (tratar como excecao).
Exemplo: body ["SET","chave","valor","EX",3600].

# ARQUIVO 1 — leitor de env (src/lib/server/env.ts)
Exporte getServerEnv(name): le globalThis.process?.env?.[name] (runtime) com fallback import.meta.env[name] (build); retorna undefined se vazio.
Exporte getMissingEnv(names: string[]): string[] -> filtra os que faltam.

# ARQUIVO 2 — schema Zod (src/lib/leads/schema.ts)
Defina e exporte (com tipos inferidos):
- leadContactSchema: { name: string trim min2; whatsapp: string trim min10; email: string trim email; instagram?: string trim; cityState?: string trim; consentGiven: literal(true); consentTimestamp: string datetime }
- leadMetaSchema: { utm: record(string,string) default {}; referrer?; userAgent?; landingPath? }
- leadScoreSchema: { total: number; rawTotal: number; intent: enum[cold,warm,hot]; segment: enum[...adapte ao produto...] }
- answersExportSchema: record(string, string|number)
- partialLeadPayloadSchema = base { quizId, quizVersion, sessionId(min6), contact, meta } + { capturedAt: datetime, eventType: literal("partial_contact") }
- completedLeadPayloadSchema = base + { submittedAt: datetime, answers: answersExportSchema, score: leadScoreSchema }
- storedLeadEventSchema: { type: enum[partial_contact,completed_quiz]; at: datetime }
- storedLeadSchema: { id; status: enum[partial,completed]; createdAt; updatedAt; completedAt?; quizId; quizVersion; sessionId; contact; answers?; score?; meta; events: array default []; contactedAt? }

# ARQUIVO 3 — store Upstash (src/lib/server/leads-store.ts)
Constantes: LEADS_INDEX_KEY="raiox:leads:index"; LEAD_TTL_SECONDS=730*24*60*60; MAX_STORED_LEADS=500.
getRedisConfig(): le url (sem barra final) e token via getServerEnv.
getLeadStoreConfigStatus(): { configured, missing } a partir de getMissingEnv(["UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN"]).
redisCommand<T>(command: unknown[]): faz o POST do protocolo acima; throw se !url||!token ("lead_store_not_configured"); throw com body.error ou `redis_http_${status}` em falha; retorna body.result.
Helpers de chave: leadKey(id)=`raiox:lead:${id}`; sessionKey(s)=`raiox:lead-session:${s}`.
createLeadId(): `lead_${Date.now()}_${crypto.randomUUID().slice(0,8)}` (fallback Math.random).
persistLead(lead, created): SET leadKey EX TTL; SET sessionKey=id EX TTL; se created: LPUSH index + LTRIM index 0..MAX-1.
Exporte:
- capturePartialLead(payload): dedupe por sessao; cria/atualiza; retorna { lead, created, shouldNotify } (shouldNotify=true so no 1o partial_contact).
- completeLead(payload): merge com lead existente da sessao; adiciona evento completed_quiz uma vez; retorna { lead, created, shouldNotify }.
- getLead(id); listLeads(limit=100) via LRANGE do index + GET de cada; filtra nulos.
- setLeadContacted(id, contacted): seta/limpa contactedAt e re-persiste.
Sempre valide com storedLeadSchema.parse antes de persistir.

# ARQUIVO 4 — auth multiusuario (src/lib/server/auth.ts) [WebCrypto, sem libs]
SESSION_COOKIE="<app>_admin_session"; SESSION_TTL_SECONDS=8*60*60.
Helpers: bytesToHex, bytesToBase64Url, base64UrlToBytes, sha256Hex(value) via crypto.subtle.digest, hmacSha256(value, secret) via crypto.subtle importKey/sign, timingSafeEqual(a,b) (XOR byte a byte, length-check primeiro).
Parsing de usuarios: leia ADMIN_USERS (JSON) -> array {username, passwordSha256, role}. getAdminAuthConfigStatus(): exige ADMIN_USERS e ADMIN_SESSION_SECRET.
verifyAdminLogin(username, password): acha o usuario por username (timing-safe), compara sha256Hex(password) com passwordSha256 (timing-safe). Retorna o usuario {username, role} ou null.
createAdminSession({username, role}): payload {username, role, exp=now+TTL} -> base64url(body) -> `${body}.${hmacSha256(body, secret)}`.
readAdminSession(cookies): split em body.signature; refaz HMAC; timingSafeEqual; decodifica; valida exp. Retorna {username, role, exp} ou null.
setAdminSessionCookie(cookies, token): httpOnly, secure em PROD, sameSite lax, maxAge=TTL, path "/".
clearAdminSessionCookie(cookies).

# ARQUIVO 5 — notificacao opcional (src/lib/server/lead-notifier.ts)
notifyLeadOwner(eventType, lead): se !LEAD_NOTIFY_WEBHOOK_URL -> {status:"skipped"}. Senao POST JSON { eventType, message, lead } com timeout 6s (AbortController); inclui header X-Lead-Webhook-Secret se LEAD_NOTIFY_WEBHOOK_SECRET existir; retorna {status: sent|failed|skipped, reason?}. message = resumo legivel (nome, whatsapp, email, instagram, cidade/uf, score, id).

# ARQUIVO 6 — API login (src/pages/api/admin/login.ts)
prerender=false. POST: le form (username, password); se invalido -> redirect("/admin?error=invalid",303). Senao createAdminSession + setAdminSessionCookie + redirect("/admin/leads",303).

# ARQUIVO 7 — API logout (src/pages/api/admin/logout.ts)
prerender=false. POST: clearAdminSessionCookie + redirect("/admin",303).

# ARQUIVO 8 — API contacted (src/pages/api/admin/contacted.ts)
prerender=false. POST: exige sessao (senao redirect("/admin",303)); le id, contacted(bool), filter; setLeadContacted (try/catch silencioso); redirect de volta a /admin/leads preservando ?filter.

# ARQUIVO 9 — API CSV (src/pages/api/admin/leads.csv.ts)
prerender=false. GET: exige sessao (senao 401). listLeads(500); monta CSV (header + linhas: id,status,createdAt,updatedAt,completedAt,name,whatsapp,email,instagram,cityState,score,intent,segment,quizVersion,contactedAt); escapa aspas; Content-Type text/csv; Content-Disposition attachment.

# ARQUIVO 10 — API capture (src/pages/api/leads/capture.ts)
prerender=false. POST: exige Content-Type application/json (senao 415); se store nao configurado -> 503 {error,missing}; valida partialLeadPayloadSchema.safeParse (senao 400 invalid_payload); capturePartialLead; se shouldNotify -> notifyLeadOwner("partial_contact"); responde { ok, leadId, created, notification }.

# ARQUIVO 11 — API complete (src/pages/api/leads/complete.ts)
prerender=false. POST: igual ao capture mas valida completedLeadPayloadSchema; em paralelo (Promise.all): forwardToExternalWebhook (QUIZ_WEBHOOK_URL, timeout 8s) e notifyLeadOwner("completed_quiz") se shouldNotify; responde { ok, leadId, created, externalWebhook, notification }.

# ARQUIVO 12 — pagina login (src/pages/admin/index.astro)
prerender=false. Se ja ha sessao -> redirect /admin/leads. Mostra aviso se getAdminAuthConfigStatus().configured=false. Form method=post action=/api/admin/login com <label> reais (Usuario, Senha), autocomplete username/current-password, required, min-height 48px. Mostra erro se ?error. noindex. Sem analytics.

# ARQUIVO 13 — dashboard (src/pages/admin/leads.astro)
prerender=false. Exige sessao (senao redirect /admin). listLeads(150). Deriva: partial, completed, hot (intent=hot), uncontacted (sem contactedAt). Cards de stats (Total, Parciais, Finalizados, Hot). Tabs de filtro (all, uncontacted, hot, partial) via ?filter. Tabela: Lead (nome, id, entrada), Status, Contato (whatsapp/email/instagram/cidade), Score (total/100 + intent), Gargalo/segment (label PT), Atualizado, Acao (botao "Chamar lead" via helper de whatsapp; form "Marcar/Desmarcar contatado" -> /api/admin/contacted). Botoes "Baixar CSV" (/api/admin/leads.csv) e "Sair" (form -> /api/admin/logout). Datas em Intl.DateTimeFormat pt-BR, timeZone America/Sao_Paulo. noindex. Sem analytics.

# ARQUIVO 14 — script de hash (scripts/admin-password-hash.mjs)
Le process.argv[2] (a senha), imprime createHash("sha256").update(senha).digest("hex"). Sem arg -> erro de uso. Adicione script no package.json: "admin:hash-password": "node scripts/admin-password-hash.mjs".

# SEGURANCA / LGPD (obrigatorio)
- Form de contato com consentimento explicito (consentGiven=true + timestamp) e link de politica de privacidade.
- Senhas so como SHA-256 em ADMIN_USERS; sessao assinada com HMAC; cookies httpOnly+secure+sameSite.
- Comparacoes de credencial timing-safe. Sem PII em logs. HTTPS only.
- Rotas /admin e /api/admin com noindex; excluir /admin do sitemap.

# EXEMPLO DE SETUP DOS USUARIOS (admin + vendas, senha de exemplo abril33)
1) node scripts/admin-password-hash.mjs "abril33"  -> copie o hash (use senhas diferentes/fortes por usuario em producao)
2) ADMIN_USERS=[{"username":"admin","passwordSha256":"<hash_admin>","role":"admin"},{"username":"vendas","passwordSha256":"<hash_vendas>","role":"vendas"}]
3) ADMIN_SESSION_SECRET=<openssl rand -hex 32>
4) UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN do painel Upstash.

# GATES (rode antes de concluir)
- lint + typecheck (astro check) + build, todos verdes.
- Smoke: login com admin e com vendas; ambos chegam a /admin/leads e veem os mesmos leads; logout; capture (POST JSON) cria lead; CSV baixa so autenticado; contacted alterna.
- Confira que nenhuma rota de painel virou estatica (prerender=false em todas) e que a landing continua estatica.

# NAO FACA
- Nao use SDK do Upstash (so fetch REST). Nao renomeie env vars. Nao guarde senha em texto. Nao exponha /admin a indexacao. Nao remova o consentimento LGPD. Nao comite segredos.
```

---

## Notas finais

- O sistema de origem usava **1 usuario** (`ADMIN_USERNAME` + `ADMIN_PASSWORD_SHA256`). Este prompt pede a versao **multiusuario** (`ADMIN_USERS`) porque voce pediu `admin` + `vendas` com a mesma visualizacao. Se quiser papeis com permissoes diferentes (ex.: `vendas` nao baixa CSV), adicione a checagem de `session.role` nas rotas — o `role` ja viaja na sessao.
- A senha `abril33` e so exemplo; em producao use senhas fortes e distintas por usuario e rotacione `ADMIN_SESSION_SECRET` para invalidar sessoes.
- Para o `segment`/`gargalo` do score, troque o enum pelos segmentos do produto do outro projeto.
