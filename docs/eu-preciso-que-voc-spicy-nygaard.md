# Plano — Acesso de vendedores aos leads do Raio-X

## Context

**Pergunta original:** onde os leads do formulário são salvos (Neon DB ou planilha Google?) e como dar aos vendedores uma forma visual e fácil de contatar todo mundo que preencheu.

**Resposta da investigação:** os leads **não** vão para Neon DB nem para planilha Google. Vão para **Upstash Redis** (banco chave-valor na nuvem, via API HTTP REST). O nome da pasta `raiox-neondash` é só nome — o banco real é Redis.

Fluxo atual (já implementado, commit `10f63ec`):
- Contato preenchido antes de terminar o quiz → `POST /api/leads/capture` → grava lead **parcial** no Redis.
- Quiz finalizado → `POST /api/leads/complete` → grava/atualiza lead **completo** no Redis (TTL 730 dias).
- Forward opcional para webhook externo se a env `QUIZ_WEBHOOK_URL` estiver setada (hoje provavelmente vazia).

**Descoberta-chave:** já existe um **dashboard visual pronto** em `/admin/leads` (`src/pages/admin/leads.astro`) que lista todos os leads (parciais + completos), mostra stats (Total / Parciais / Finalizados / Hot), score, gargalo, e **um botão "Chamar lead" por linha** que abre o WhatsApp com mensagem da Laura pré-preenchida. Tem export CSV e login usuário/senha (sessão cookie 8h).

**Decisões do usuário:**
1. Usar o dashboard existente (não criar planilha Google).
2. Incluir **todos** os leads (parciais + completos).
3. Escopo: **mínimo (pôr no ar + acesso) + marcação "contatado" + filtros** — para o vendedor não ligar 2x para a mesma pessoa nem esquecer ninguém.

**Resultado pretendido:** vendedores abrem uma URL, fazem login, veem a lista completa, filtram (Todos / Hot / Parciais / Não-contatados), clicam para chamar no WhatsApp e marcam quem já foi contatado.

---

## Tensão de arquitetura (decisão consciente registrada)

O `README.md` e o cardinal #4 dizem "estático, MPA, **nunca SSR, nunca `prerender = false`**, deploy Railway". Mas o sistema de leads **já foi construído em SSR**: as rotas `/admin/*` e `/api/*` usam `export const prerender = false`, e `astro.config.mjs` usa o adapter **Vercel** (`@astrojs/vercel` + `vercel.json` presentes).

Consequência: **o painel só funciona em deploy Vercel com funções server-side** — não em Railway estático puro. As páginas de marketing continuam estáticas; só `/admin/*` e `/api/*` rodam no servidor. O sitemap já exclui `/admin/*`.

Este plano **não introduz SSR novo** — apenas adiciona uma rota API (`/api/admin/contacted`) coerente com o admin SSR que já existe. As páginas de marketing permanecem 100% estáticas. Trade-off já assumido pelo commit anterior; recomenda-se anotar em `docs/learnings-log.md` (opcional, não bloqueia).

---

## Parte A — Operacional (pôr no ar + dar acesso)

> Estas etapas dependem de credenciais/infra do usuário; não são código. Eu executo o que for local (gates, gerar hash); o usuário provê segredos e confirma o deploy.

1. **Verificar deploy atual.** Conferir se o commit `10f63ec` (admin + APIs) está deployado em `raiox.gpus.com.br` (Vercel) e se as funções server-side estão ativas. Se não, fazer deploy.
2. **Provisionar Upstash Redis** (se ainda não existir): criar DB no Upstash, copiar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
3. **Gerar credenciais de admin:**
   - `ADMIN_USERNAME` → escolher (ex.: `vendas`).
   - `ADMIN_PASSWORD_SHA256` → gerar com `bun run admin:hash-password -- "senha-forte"` (script em `scripts/admin-password-hash.mjs`, imprime o SHA-256).
   - `ADMIN_SESSION_SECRET` → string aleatória longa (≥ 32 chars).
4. **Setar as 5 env vars na Vercel** (Project → Settings → Environment Variables, escopo Production):
   `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_SHA256`, `ADMIN_SESSION_SECRET`. Redeploy após setar.
5. **Verificar ponta-a-ponta:** preencher um lead de teste no quiz → confirmar que aparece em `/admin/leads` → clicar "Chamar lead" e confirmar que abre o WhatsApp certo → baixar CSV.
6. **Entregar ao vendedor:** URL (`https://raiox.gpus.com.br/admin`) + usuário + senha. (Login único compartilhado entre vendedores no escopo atual.)

---

## Parte B — Código (marcação "contatado" + filtros)

Pequena adição coerente com o padrão existente. Pure MPA: formulários POST + filtro por query param, **sem island/JS novo**. Honra tokens navy/gold (sem hex hardcoded), status via cor + texto.

### B1. Schema — `src/lib/leads/schema.ts`
Adicionar campo opcional a `storedLeadSchema` (linha ~61-75). Opcional = **retrocompatível**: leads antigos sem o campo continuam validando.
```ts
contactedAt: z.string().datetime().optional(),
```

### B2. Store — `src/lib/server/leads-store.ts`
Nova função (reusa `getLead`, `persistLead`, `storedLeadSchema` já presentes):
```ts
export async function setLeadContacted(
  id: string,
  contacted: boolean,
): Promise<StoredLead | null> {
  const existing = await getLead(id);
  if (!existing) return null;
  const lead = storedLeadSchema.parse({
    ...existing,
    contactedAt: contacted ? new Date().toISOString() : undefined,
  });
  await persistLead(lead, false); // false = não re-empurra no índice
  return lead;
}
```
> Não mexer em `updatedAt` aqui — a coluna "Atualizado" continua refletindo atividade do lead, não o toggle do vendedor. `persistLead(_, false)` reescreve `leadKey` + `sessionKey` e renova TTL; ordem do índice (LPUSH) inalterada.

### B3. Nova rota API — `src/pages/api/admin/contacted.ts` (novo arquivo)
Espelha o padrão de `src/pages/api/admin/login.ts` (`prerender = false`, `APIRoute`, `formData`, redirect 303). Auth-gated.
```ts
import type { APIRoute } from "astro";
import { readAdminSession } from "../../../lib/server/auth";
import { setLeadContacted } from "../../../lib/server/leads-store";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const session = await readAdminSession(cookies);
  if (!session) return redirect("/admin", 303);

  const form = await request.formData();
  const id = String(form.get("id") ?? "").trim();
  const contacted = String(form.get("contacted") ?? "true") === "true";
  const filter = String(form.get("filter") ?? "all");

  if (id) {
    try {
      await setLeadContacted(id, contacted);
    } catch {
      /* degrada silenciosamente; recarrega a lista */
    }
  }
  const suffix = filter && filter !== "all" ? `?filter=${encodeURIComponent(filter)}` : "";
  return redirect(`/admin/leads${suffix}`, 303);
};
```

### B4. Dashboard — `src/pages/admin/leads.astro`
- **Ler filtro:** `const filter = Astro.url.searchParams.get("filter") ?? "all";`
- **Listas derivadas** (reusa `partialLeads`/`completedLeads`/`hotLeads` já calculados; adicionar):
  ```ts
  const uncontacted = leads.filter((l) => !l.contactedAt);
  const visibleLeads =
    filter === "hot" ? hotLeads
    : filter === "partial" ? partialLeads
    : filter === "completed" ? completedLeads
    : filter === "uncontacted" ? uncontacted
    : leads;
  ```
- **Abas de filtro** (links `<a href="/admin/leads?filter=...">`, MPA-native) acima da tabela — `Todos (n)`, `Hot (n)`, `Parciais (n)`, `Não-contatados (n)`. Aba ativa marcada comparando com `filter`. Estilos: tokens gold/navy existentes (ativa = `bg-gold text-navy`, inativa = `border-gold/30 text-gold`).
- **Tabela itera `visibleLeads`** em vez de `leads`.
- **Coluna "Contato vendedor"** (nova, ou dentro da célula "Ação" ao lado do "Chamar lead"):
  - Se `lead.contactedAt`: badge `Contatado em {formatDate(lead.contactedAt)}` (cor + texto, tokens existentes) + form "Desmarcar" (`contacted=false`).
  - Senão: form `<form method="post" action="/api/admin/contacted">` com botão "Marcar contatado" (`contacted=true`).
  - Cada form carrega hidden `id={lead.id}`, hidden `contacted`, hidden `filter={filter}` (preserva a aba ao recarregar). Mesmo padrão do form de logout (linhas 67-74).
- **Sem emoji como ícone** (cardinal #3): badge texto-only ou Lucide SVG renderizado server-side; não usar emoji ✓.

### B5. CSV (opcional, baixo custo) — `src/pages/api/admin/leads.csv.ts`
Adicionar `contactedAt` ao header (linhas 17-33) e `lead.contactedAt ?? ""` à linha (34-49). Útil para o vendedor exportar com o status.

---

## Arquivos tocados (resumo)

| Arquivo | Mudança |
|---|---|
| `src/lib/leads/schema.ts` | + campo opcional `contactedAt` em `storedLeadSchema` |
| `src/lib/server/leads-store.ts` | + função `setLeadContacted()` |
| `src/pages/api/admin/contacted.ts` | **novo** — POST auth-gated, marca/desmarca + redirect preservando filtro |
| `src/pages/admin/leads.astro` | abas de filtro (query param), iterar `visibleLeads`, botão "Marcar/Desmarcar contatado" por linha |
| `src/pages/api/admin/leads.csv.ts` | + coluna `contactedAt` (opcional) |

**Não tocar:** `.claude/**`, `AGENTS.md`, `tsconfig.json`, `biome.json`, `lefthook.yml`, `bun.lock`, `astro.config.mjs`, `src/lib/whatsapp.ts` (protegidos).

---

## Verificação (end-to-end)

**Gates locais (obrigatórios após o código):**
```bash
bun run lint        # biome + oxlint, zero erros
bunx astro check    # TypeScript, zero erros
bun run build       # exit 0, dist/ produzido
```

**Teste funcional local** (precisa de `.env` com `ADMIN_USERNAME`, `ADMIN_PASSWORD_SHA256`, `ADMIN_SESSION_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`):
1. `bun run dev` → `/admin` → login com as credenciais.
2. Sem Upstash setado, o painel mostra o aviso "Configure UPSTASH..." e lista vazia (degradação ok).
3. Com Upstash: preencher quiz de teste → lead aparece em `/admin/leads`.
4. Clicar "Marcar contatado" → linha mostra badge "Contatado em …"; aba "Não-contatados" deixa de listá-lo; continua na mesma aba após reload.
5. "Desmarcar" reverte. "Chamar lead" abre o WhatsApp com a mensagem da Laura.
6. Baixar CSV → coluna `contactedAt` presente.

**Retrocompatibilidade:** leads gravados antes da mudança (sem `contactedAt`) devem listar normalmente como "não-contatados" (campo opcional).

**Pós-deploy (Vercel):** repetir passos 3-6 em produção; confirmar que `/admin/*` roda como função server-side e que o sitemap não indexa `/admin`.
