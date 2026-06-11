# Fechar as chaves legadas do Supabase — sem derrubar nada (Frente A)

Objetivo: neutralizar a `service_role` legada (que já esteve exposta) **sem quebrar**
as Edge Functions. Há um bug conhecido do Supabase (aberto em jan/2026): ao
desabilitar as chaves legadas, a `SUPABASE_SERVICE_ROLE_KEY` **auto-injetada** nas
functions continua legada → as funções dão erro "Legacy API keys are disabled".
Por isso as funções precisam usar um **secret próprio** ANTES do disable.

## O que já foi feito no código (este PR)
- `admin-users` e `send-push` agora leem `MONTEX_SECRET_KEY` (com fallback para
  `SUPABASE_SERVICE_ROLE_KEY` enquanto a transição não termina). Nome fora do
  prefixo reservado `SUPABASE_`, então pode ser criado como secret manual.

## Passos no painel (nesta ordem)

### 1. Cliente na publishable (se ainda não fez)
- Vercel → Settings → Environment Variables → `VITE_SUPABASE_ANON_KEY` = a
  **publishable** (`sb_publishable_…`) nos 3 ambientes → **Redeploy**.

### 2. Criar o secret das funções
- Supabase → **Edge Functions → Secrets** → **Add secret**:
  - Nome: `MONTEX_SECRET_KEY`
  - Valor: sua **secret** nova (`sb_secret_…`)

### 3. Deploy das duas funções (para pegarem o novo código + secret)
- Via CLI: `supabase functions deploy admin-users --no-verify-jwt` e
  `supabase functions deploy send-push --no-verify-jwt`.
- Ou pelo **editor de funções do dashboard** (colar o index.ts atualizado e Deploy).
- `--no-verify-jwt` é necessário porque a publishable/secret **não são JWT** e o
  gateway rejeitaria a verificação automática.

### 4. Testar com a secret nova (legadas ainda ATIVAS)
- App → Gestão de Usuários: criar/redefinir senha (testa `admin-users`).
- Disparar uma notificação push (testa `send-push`), se aplicável.
- Confirme que funcionam — agora elas usam `MONTEX_SECRET_KEY`.

### 5. Verificar uso zero das legadas
- Supabase → **Logs / Advisors → API**: confirme que o tráfego pelas chaves
  legadas (anon/service_role) caiu a zero após o redeploy e o deploy das funções.

### 6. Desabilitar as legadas
- Supabase → **Settings → API Keys** → desabilitar `anon` e `service_role`.
- Isso **revoga a service_role vazada** na hora. Como tudo já usa publishable/secret
  (passos 1–4), não há downtime.

## Rollback
Se algo quebrar após o passo 6, **reative** as chaves legadas (reversível) e
investigue o que ainda as usava (volte ao passo 5).

## Checklist
- [ ] Publishable no cliente + redeploy
- [ ] `MONTEX_SECRET_KEY` criado nas Functions Secrets
- [ ] `admin-users` e `send-push` re-deployadas (--no-verify-jwt)
- [ ] Funções testadas OK com a secret
- [ ] Uso zero das legadas confirmado
- [ ] Legadas desabilitadas
- [ ] (Higiene) PAT `ghp_…` revogado + senha do GitHub trocada
