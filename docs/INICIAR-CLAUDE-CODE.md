# Começar a desenvolver com Claude Code (no Codespace) — MONTEX ERP V5

Fluxo recomendado: **desenvolvimento 100% online** = GitHub Codespaces (ambiente
na nuvem, já configurado pelo `.devcontainer/`) + **Claude Code** (assistente de
código no terminal). Sem clone local, sem corrupção de `.git`, sem build no Mac.

---

## Passo 1 — Abrir o Codespace

1. Acesse `https://github.com/guilhermemacielvieira-a11y/montex-erp-v5`
2. Botão verde **Code → aba Codespaces → Create codespace on…**
   - Escolha a branch de dev `fix/painel-financeiro-global-fases-1-4` (ou `main`).
3. Abre um VS Code no navegador. O `.devcontainer` roda `npm install` sozinho.

## Passo 2 — Configurar as chaves do Supabase (uma vez)

Siga `docs/DEV-ONLINE-CODESPACES.md` → crie os **Codespaces secrets**
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_SERVICE_KEY`).
O `devcontainer.json` injeta essas variáveis automaticamente.

## Passo 3 — Instalar e abrir o Claude Code

No **terminal do Codespace**:

```bash
# Opção simples (npm; funciona, porém marcada como legada):
npm install -g @anthropic-ai/claude-code

# Opção recomendada (instalador nativo): ver o comando atual em
# https://code.claude.com/docs/en/setup

claude            # inicia o Claude Code
```

**Login:** o Codespace não abre navegador sozinho. O Claude Code vai imprimir
uma **URL** no terminal — copie, abra no navegador, faça login na sua conta
Claude, pegue o **código** e cole de volta no terminal. (Não precisa repetir
nas próximas vezes.)

> Requer Node.js 18+ (o devcontainer usa Node 20). Há também extensão de VS Code —
> veja em `https://code.claude.com/docs`.

## Passo 4 — Ciclo de trabalho típico

```bash
npm run dev        # sobe o app (porta 5174 é encaminhada e abre no navegador)
```
No Claude Code, peça a tarefa (ex.: "quebre o PainelFinanceiroGlobal em
subcomponentes" ou "adicione auth real"). Ele edita, roda build/testes e mostra
o resultado. Depois:

```bash
git checkout -b feat/minha-mudanca
git add -A && git commit -m "feat: ..."
git push origin HEAD
```
Abra um **Pull Request** no GitHub para revisar antes de ir para produção.
No Codespace o git já vem autenticado com sua conta — sem token.

---

## Avisos importantes

- **Não use mais a pasta antiga do Mac** (`Desktop/.../MONTEX-ERP-V5-DEPLOY/source`):
  estava corrompida e foi para a Lixeira. Se quiser um clone local, use o limpo em
  `~/montex-fase0-recover` (fora do iCloud) — nunca deixe o `.git` numa pasta
  sincronizada por iCloud/Drive (foi o que corrompeu).
- **Antes de levar a branch de dev para produção (`main`):** ela está baseada numa
  `main` antiga (`73321e3`), enquanto a produção é `5a897af`. Faça **rebase/merge
  com cuidado** (e configure `VITE_SUPABASE_SERVICE_KEY` nas env vars da Vercel),
  senão você reverte mudanças que já estão no ar.
- **Produção** só muda quando a `main` muda (Vercel faz auto-deploy da `main`).
  Trabalhe sempre em branches e use PR.
