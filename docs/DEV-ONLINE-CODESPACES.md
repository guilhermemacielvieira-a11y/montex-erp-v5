# Desenvolvimento 100% online — MONTEX ERP V5 (GitHub Codespaces)

Objetivo: desenvolver sem clone local, direto do navegador, usando o mesmo
banco Supabase na nuvem que a produção. O `.devcontainer/` deste repositório
já deixa tudo pronto.

---

## Como abrir o ambiente online

1. Acesse o repositório: `https://github.com/guilhermemacielvieira-a11y/montex-erp-v5`
2. Botão verde **Code → Codespaces → Create codespace** (escolha a branch de dev
   `fix/painel-financeiro-global-fases-1-4` ou a `main`).
3. Abre um VS Code no navegador. O `postCreateCommand` roda `npm install` sozinho.
4. No terminal do Codespace: `npm run dev`. A porta 5174 é encaminhada e abre o app.

Pronto — você está desenvolvendo na nuvem, sem nada instalado no seu Mac.

---

## Variáveis de ambiente (uma vez por conta)

O app precisa das chaves do Supabase. Configure como **Codespaces secrets**
(ficam guardadas com segurança no GitHub, nunca no código):

1. `https://github.com/settings/codespaces` → **Secrets** → **New secret**
2. Crie cada uma e dê acesso ao repositório `montex-erp-v5`:

| Secret | Valor |
|---|---|
| `VITE_SUPABASE_URL` | https://trxbohjcwsogthabairh.supabase.co |
| `VITE_SUPABASE_ANON_KEY` | (anon key — de preferência a NOVA, após rotação) |
| `VITE_SUPABASE_SERVICE_KEY` | (service key — só se precisar de admin; idealmente migrar p/ Edge Function) |

O `devcontainer.json` já injeta essas variáveis no ambiente (`remoteEnv`).

> Para rodar em dev sem secrets, dá para criar um `.env.local` dentro do Codespace
> (ele é ignorado pelo git). Mas secrets é o jeito recomendado.

---

## Banco de dados: já é online para dev e produção

Não há banco local. Todos os ambientes usam o **mesmo Supabase na nuvem**
(`trxbohjcwsogthabairh.supabase.co`):

| Ambiente | Como acessa o banco |
|---|---|
| Produção (web/Vercel) | env vars no painel da Vercel |
| Desktop (Electron) / Mobile (Capacitor) | mesmas chaves embarcadas no build |
| Dev (Codespaces) | Codespaces secrets (acima) |

Recomendação (do plano de melhorias): criar um **2º projeto Supabase (staging)**
para o dev não escrever no banco de produção. Quando existir, basta apontar os
secrets do Codespace para a URL/chaves de staging.

---

## Git sem token (já configurado)

Dentro do Codespace, o git já vem autenticado com sua conta do GitHub —
commit e push funcionam sem token. No seu Mac, ficou configurada uma **chave SSH**
para o mesmo efeito. Você não precisa mais informar token para commitar.
