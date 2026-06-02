# Admin e captura de leads do Raio-X

## Variáveis obrigatórias

- `ADMIN_USERNAME`: usuário do painel.
- `ADMIN_PASSWORD_SHA256`: hash SHA-256 da senha. Gere com:
  `bun run admin:hash-password -- "sua-senha-forte"`.
- `ADMIN_SESSION_SECRET`: string aleatória longa para assinar o cookie de sessão.
- `UPSTASH_REDIS_REST_URL`: URL REST do banco Upstash Redis.
- `UPSTASH_REDIS_REST_TOKEN`: token REST do banco Upstash Redis.

## Variáveis opcionais

- `LEAD_NOTIFY_WEBHOOK_URL`: webhook de automação para avisar Laura/time quando um lead é capturado ou finalizado.
- `LEAD_NOTIFY_WEBHOOK_SECRET`: segredo enviado no header `X-Lead-Webhook-Secret`.
- `QUIZ_WEBHOOK_URL`: webhook legado para planilha/CRM quando o lead finaliza o quiz.

## Fluxo

1. A pessoa preenche contato e aceita a política de privacidade.
2. O site envia um evento `partial_contact` para `/api/leads/capture`.
3. O lead fica salvo no Upstash e o webhook de notificação recebe uma mensagem para Laura/time.
4. Se a pessoa finaliza as perguntas, `/api/leads/complete` atualiza o lead com respostas, score e gargalo.
5. O painel `/admin/leads` mostra leads parciais e finalizados e permite exportar CSV.

## Recuperação de senha (sem código)

O painel usa login único; a senha vive na env var `ADMIN_PASSWORD_SHA256` na Vercel
(não há banco de usuários nem reset por email). Para trocar/recuperar a senha:

1. Escolha a nova senha e gere o hash:
   `bun run admin:hash-password -- "nova-senha-forte"`.
2. Vercel → projeto → **Settings → Environment Variables** → edite
   `ADMIN_PASSWORD_SHA256` (escopo Production) e cole o novo hash.
3. **Redeploy** (ou aguarde o próximo deploy) para a função server-side ler o valor.
4. Usuário continua em `ADMIN_USERNAME` (troque junto se quiser).

> A "recuperação" efetiva é o acesso à conta Vercel. Defina
> `suporte@drasacha.com.br` como email da conta Vercel para que o reset de senha
> da própria Vercel chegue nesse endereço. Opcional: rotacionar
> `ADMIN_SESSION_SECRET` invalida todas as sessões ativas (força novo login).

## Observação sobre WhatsApp automático

O site não dispara WhatsApp direto por `wa.me`; isso exige uma API oficial ou uma automação externa. Por isso, o projeto envia um webhook estruturado para Make, Zapier, n8n ou CRM, que pode encaminhar a mensagem para Laura pelo canal operacional escolhido.
