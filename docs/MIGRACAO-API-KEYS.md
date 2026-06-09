# Migração para as novas API keys do Supabase — runbook (MONTEX ERP V5)

Objetivo: trocar as chaves legadas (`anon` / `service_role` JWT) pelas novas
(`sb_publishable_…` no cliente, `sb_secret_…` no servidor) **sem downtime** e,
ao final, desabilitar as legadas para neutralizar a service_role vazada.

## Estado atual do código (já pronto)
- `src/api/supabaseClient.js`: cliente usa só a chave pública (anon/publishable).
  `supabaseAdmin = null` — **nenhuma chave de alto privilégio vai para o bundle**.
- Operações de admin (criar/redefinir usuário) → Edge Function `admin-users`
  (`supabase/functions/admin-users`), que lê `SUPABASE_SERVICE_ROLE_KEY` do
  ambiente do servidor (nunca exposta ao navegador).
- `scripts/montex_audit.py`: **corrigido neste PR** — lê a chave de env
  (`SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`).
  Era o último hardcode da service_role no repositório.

## Ordem da virada (sem downtime)

1. **Supabase → Settings → API Keys:** ative as novas chaves. Gera 1
   `sb_publishable_…` e permite criar `sb_secret_…`. Crie uma secret.
   Mantenha as legadas **ativas** por enquanto.

2. **Cliente (publishable):** atualize a env e **redeploy** (a chave fica
   compilada no build, só troca após rebuild):
   - Vercel → Settings → Environment Variables → `VITE_SUPABASE_ANON_KEY` = a
     **publishable** (`sb_publishable_…`). Redeploy.
   - `.env.local` (dev) e Codespaces secrets: idem.

3. **Servidor (secret):** a secret key vai apenas em ambiente de servidor:
   - Edge Function `admin-users`: secret `SUPABASE_SERVICE_ROLE_KEY` = a
     **secret** (`sb_secret_…`). (Secret key funciona em backend/Edge/CLI; só dá
     401 em navegador.) Redeploy da função: `supabase functions deploy admin-users`.
   - `montex_audit.py` (CLI): `export SUPABASE_SECRET_KEY="sb_secret_…"`.
   - **Nunca** colocar a secret numa variável `VITE_*` (essas vão para o cliente).

4. **Verificar uso zero das legadas:** Supabase → Logs/Advisors → API. Confirme
   que o tráfego pela `anon`/`service_role` legadas caiu a zero após o redeploy.

5. **Desabilitar as legadas:** Settings → API Keys → desabilitar `anon` e
   `service_role`. Isso **revoga instantaneamente** o token vazado. Como nada mais
   as usa (passos 2–4), não há downtime.

## Rollback
Se algo quebrar após o passo 5, **reative** a `anon`/`service_role` legadas
(reversível) e investigue o que ainda dependia delas (passo 4).

## Lembretes de segurança
- Rotacionar/Revogar também: o PAT `ghp_…` exposto e a senha do GitHub.
- A `migration_v12_rls_por_papel.sql` (RLS por papel) só depois de auth real.
