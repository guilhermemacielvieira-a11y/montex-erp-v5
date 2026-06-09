# Fase 0 — Roteiro de rotação de chaves e backup (MONTEX ERP V5)

> Execute **nesta ordem**. Itens marcados com 🔴 só podem ser feitos por você
> (acesso aos painéis Supabase / GitHub / Vercel). O que dá para fazer no código
> já foi aplicado (ver "O que já foi feito" no fim).

---

## Por que isto é urgente

Uma **service_role key** do Supabase estava hardcoded no código do cliente. Ela
**bypassa toda a RLS**. Como o bundle de produção é público, deve-se assumir que
a chave **vazou**. A anon key também estava em scripts versionados. Trate ambas
como **comprometidas** e rotacione.

---

## Passo 1 — 🔴 Backup verificável (ANTES de qualquer mudança)

1. Supabase → **Database → Backups**: confirme se o **Point-in-Time Recovery (PITR)**
   está ativo. Se não, ative (requer plano Pro).
2. Faça um **dump manual** agora e guarde fora do Supabase:
   ```bash
   # precisa da connection string do projeto (Settings → Database)
   export PGCONN="postgresql://postgres:[SENHA]@db.trxbohjcwsogthabairh.supabase.co:5432/postgres"
   pg_dump "$PGCONN" --no-owner --no-privileges -Fc -f montex_backup_$(date +%F).dump
   ```
3. **Teste o restore** num projeto/banco vazio antes de confiar nele. Backup que
   nunca foi restaurado não é backup.

---

## Passo 2 — 🔴 Rotacionar a SERVICE_ROLE key do Supabase

1. Supabase → **Project Settings → API → Service Role** → **Reset / Roll**.
   > Isso invalida a chave antiga imediatamente — qualquer integração que a use
   > para de funcionar até receber a nova (ver Passo 5).
2. Copie a **nova** service key para um cofre (1Password/Bitwarden), nunca para o repo.

## Passo 3 — 🔴 Rotacionar a ANON / publishable key

1. Supabase → **Project Settings → API → anon/public** → rotacione.
2. Copie a nova anon key.
   > A anon key é "pública" por natureza, mas como ela aparecia em scripts
   > versionados e a RLS estava permissiva, rotacionar fecha o ciclo.

## Passo 4 — 🔴 Rotacionar o PAT do GitHub

1. GitHub → **Settings → Developer settings → Personal access tokens** → revogue o
   token antigo e gere um novo com escopo mínimo necessário.
2. Atualize onde ele era usado (CI, scripts locais, integrações).

---

## Passo 5 — 🔴 Atualizar as variáveis de ambiente (sem hardcode)

**Vercel** (Produção) → Project → Settings → Environment Variables:

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | https://trxbohjcwsogthabairh.supabase.co |
| `VITE_SUPABASE_ANON_KEY` | (nova anon key) |
| `VITE_SUPABASE_SERVICE_KEY` | (nova service key) |

**Local** (`.env.local`, NÃO versionar):
```
VITE_SUPABASE_URL=https://trxbohjcwsogthabairh.supabase.co
VITE_SUPABASE_ANON_KEY=...nova-anon...
VITE_SUPABASE_SERVICE_KEY=...nova-service...
```

**Scripts utilitários** (agora leem do ambiente — exporte antes de rodar):
```bash
export SUPABASE_URL=https://trxbohjcwsogthabairh.supabase.co
export SUPABASE_SERVICE_KEY=...nova-service...   # scripts/montex_audit.py
export SUPABASE_KEY=...nova-anon...              # migrate-to-supabase.js
export SUPABASE_ANON_KEY=...nova-anon...         # reset-obra.mjs
```

> ⚠️ Reavalie se a `VITE_SUPABASE_SERVICE_KEY` deve mesmo existir no front-end.
> O ideal (Fase 1) é mover a criação/reset de usuário para uma **Edge Function**
> e **remover** a service key do bundle por completo.

---

## Passo 6 — Rebuild e redeploy

1. Commit das mudanças de código já aplicadas (ver abaixo) na branch `main`.
2. O push dispara o build da Vercel, que **regenera o `dist/`** sem a chave antiga.
   > O `dist/` é gitignored e continha a chave compilada; o novo build o substitui.
3. Após o deploy, confirme no navegador (DevTools → Sources) que o bundle não
   contém mais o token antigo (busque por `service_role`).

---

## Passo 7 — Higiene do histórico do Git (opcional, recomendado)

A chave ainda existe em **commits antigos**. Como ela será rotacionada (Passo 2),
o risco operacional cai a zero. Se quiser remover do histórico mesmo assim:
```bash
# requer git-filter-repo; reescreve histórico → coordene com quem clonou o repo
git filter-repo --replace-text <(echo 'DWv7azSBJop2iywuqh6J-g96ae9QH0IOHovny688pRs==>REMOVED')
```
> Reescrever histórico exige `--force` no push e re-clone por todos. Faça só se
> houver motivo de compliance; a rotação já neutraliza a chave.

---

## O que já foi feito no código (Fase 0)

| Arquivo | Mudança |
|---|---|
| `src/pages/GestaoUsuariosPage.jsx` | Removida a **service_role key hardcoded**; agora exige `VITE_SUPABASE_SERVICE_KEY` (erro explícito se ausente). |
| `scripts/montex_audit.py` | Lê `SUPABASE_SERVICE_KEY` do ambiente; aborta se ausente. |
| `migrate-to-supabase.js` | Lê `SUPABASE_KEY` do ambiente; aborta se ausente. |
| `reset-obra.mjs` | Lê `SUPABASE_ANON_KEY` do ambiente; aborta se ausente. |
| `supabase/migration_v12_rls_por_papel.sql` | Script de RLS por papel (aplicar **só após** auth real — Fase 1). |

**Verificação:** nenhum JWT (anon ou service_role) permanece hardcoded em
arquivos versionados.

---

## Checklist rápido

- [ ] PITR ativo + dump manual testado
- [ ] Service key rotacionada
- [ ] Anon key rotacionada
- [ ] PAT do GitHub rotacionado
- [ ] Env vars atualizadas (Vercel + .env.local + scripts)
- [ ] Commit + redeploy + bundle verificado
- [ ] (Fase 1) Auth real → depois aplicar `migration_v12_rls_por_papel.sql` em staging
