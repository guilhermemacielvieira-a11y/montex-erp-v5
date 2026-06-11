# Verificação do Prompt "Mac 2 — clone limpo + sequência" (contra o git real)

> Rodei as premissas do prompt contra o repositório de fato. Revisado: 2026-06-08.
> **Resultado: 1 erro CRÍTICO de premissa que causaria perda de trabalho. O resto está correto.**

---

## 0. Veredito

A Fase 2 (sequência da service key) está **correta** — incorporou a ordem que validamos
(refatorar → remover do ambiente → deploy → rotacionar). As regras gerais e a maioria das checagens
da Fase 1 estão boas. **Mas a premissa-base do prompt é falsa para o repositório atual**, e seguir o
prompt confiando nela perde 5 commits.

---

## 1. 🔴 CRÍTICO — "o Mac 1 já enviou todo o trabalho" é FALSO

**O prompt afirma:** *"origin/main está em `aca2bfd` (o Mac 1 já enviou todo o trabalho dele)."*

**O git real desta máquina diz:**
- `origin/main` = `aca2bfd` ✅ (essa parte está certa)
- **`main` local (HEAD) = `f1b8612`** ❌ — está **5 commits À FRENTE** do origin. **Não foram enviados.**

Os 5 commits locais que **só existem nesta máquina** (do mais antigo ao mais novo):

| SHA | Commit |
|---|---|
| `7cd2b6a` | test(mobile): cobre utilitários do super app (fila offline, syncLog, lastRefresh, online) |
| `c23f83d` | feat(mobile): galeria de evidências (fotos de montagem e carga) por obra |
| `111e7e7` | feat(mobile/montagem): relatório de montagem exportável (CSV) |
| `33b43fe` | fix(montagem): KPI Aguardando conta unidades pendentes de peças PARCIAIS |
| `f1b8612` | refactor(montagem/3d): unificar getMontadasCount + remover dead code |

**Consequência se ignorar:**
- Um **clone limpo agora traz só `aca2bfd`** — esses 5 commits (galeria de evidências, relatório CSV,
  correção de KPI, refactor) **não vêm**. Se a pasta antiga do iCloud for apagada depois, **perda permanente**.
- Eles também **nunca foram para produção** (só `git push` em `main` dispara o deploy da Vercel).

**Atenção combinada:** esta máquina **ainda está no iCloud** (o `.git` continua dando deadlock) — ou seja,
ela **não é** um "Mac 1 já migrado". Ou o rótulo Mac 1/Mac 2 está trocado, ou o Mac 1 não foi concluído.

### Correção obrigatória ANTES de rodar o prompt no Mac 2

1. **Nesta máquina, enviar os 5 commits primeiro.** Como o `.git` está em deadlock no iCloud, o `git push`
   pode falhar daqui — duas saídas:
   - **(preferida)** migrar ESTA máquina também via clone limpo em `~/Dev`, mas **só depois de garantir o push**; ou
   - usar o terminal real do Mac (não o sandbox) para `git push origin main`.
2. **Antes do push, decida:** push em `main` **deploya os 5 commits**. Se quiser validar antes, suba para
   uma branch sem deploy: `git switch -c backup/pre-migracao && git push -u origin backup/pre-migracao`.
3. Só **depois** que `origin/main` (ou a branch de backup) contiver esse trabalho, o clone limpo do Mac 2
   é seguro.

> A boa notícia: a **Fase 1, passo 1** do prompt já manda checar `git log origin/main..HEAD` antes de clonar —
> é exatamente o que pega esse problema. O perigo é a **premissa do cabeçalho** induzir a pular essa checagem.
> **Recomendação:** trocar o texto do prompt de "Mac 1 já enviou tudo" para "**confirme com `git log origin/main..HEAD`
> em CADA Mac; se houver commits, envie antes de clonar**".

---

## 2. 🟡 Referência quebrada ao "plano canônico"

O prompt cita: *"Plano completo de referência: `SISTEMA PRODUCAO/PLANO-MONTEX-SYNC-CANONICO.md`."*

**Verificado:** esse arquivo **não existe** em lugar nenhum, e **não há** pasta "SISTEMA PRODUCAO"
(a pasta real é **`SISTEMA GRUPO MONTEX VERSAO FINAL`**). O agente do Mac 2 não encontrará a referência.

Planos reais existentes (corrigir a referência para um destes):
- `PLANO-SINCRONIZACAO-2PCS-v2.md` (raiz) — a v2 endurecida.
- `MONTEX-ERP-V5-DEPLOY/ANALISE-CONFORMIDADE-PLANO-v2.md` — a conformidade validada no código.
- `MONTEX-ERP-V5-DEPLOY/PLANO-SINCRONIZACAO-2PCS.md` — o plano v1.

> Como `.md` na raiz fora de `source/` **não está no repositório Git**, esses planos **não chegam ao
> Mac 2 pelo clone**. Para o Mac 2 ter acesso, envie por AirDrop, **ou** mova os planos para dentro de
> `source/docs/` e comite.

---

## 3. 🟡 Risco de credencial no `git clone`

O prompt usa `GIT_TERMINAL_PROMPT=0` no clone. Se o repo for **privado** e o Mac 2 **não** tiver o token
no `credential.helper store`, o clone **falha em silêncio** (a flag impede o prompt de senha).

Some-se a isto: o `CLAUDE.md` registra que o **GitHub PAT está exposto e precisa rotação** — se for
rotacionado, qualquer credencial salva no Mac 2 fica inválida.

**Recomendação:** antes do clone no Mac 2, garantir credencial válida (`git ls-remote origin` deve listar
refs). Se falhar, configurar o PAT antes — e tratar a rotação do PAT junto com a da service key.

---

## 4. 🟢 O que está CORRETO no prompt (manter)

- **Fase 1 §1** — checar trabalho não enviado antes de clonar: essencial e bem-feito (resolve o §1 acima se seguido).
- **Fase 1 §2** — descobrir o `npm` via `/bin/zsh -lc` (PATH do shell não-interativo): correto no macOS.
- **Clone limpo em `~/Dev`** (fora do iCloud) deixando a cópia antiga como rede de segurança: correto.
- **`npm ci`** (lockfile versionado, confirmado) em vez de `npm install`: correto. O aviso sobre drift de lockfile é prudente.
- **`.env.local` copiado à mão** (é ignorado no Git): correto.
- **Fase 2 — ordem da service key:** correta e batendo com o código:
  - `migration_v10` já dá CRUD anon às 6 tabelas → remover `supabaseAdmin` é seguro;
  - `auth.admin.createUser` é a única exceção que exige service_role → Edge Function/painel;
  - remover do ambiente **antes** de rotacionar (inverter quebraria a produção).
- **Fase 2 ser ação única e coordenada** (de um Mac só, branch + PR, avisar antes do merge): correto.
- **Regras gerais** (pull no início/push no fim; nunca em `main` direto; nunca copiar `node_modules`;
  não `push --force` em `main`): corretas.

---

## 5. 🔧 Ajuste técnico a acrescentar na Fase 2

No passo **2.1**, além de remover o `supabaseAdmin`, **remover também o fallback hardcoded** da service
key em `supabaseClient.js` (as constantes nas linhas ~15–16). Se a string ficar no código, ela continua
sendo **compilada no bundle** e o `supabaseAdmin` ainda é criado — mesmo sem a variável de ambiente.
Trocar o fallback por erro explícito (como na §3 da análise de conformidade).

---

## 6. Resumo das ações antes de liberar o prompt para o Mac 2

| Prioridade | Ação |
|---|---|
| 🔴 1 | Enviar os **5 commits locais** desta máquina (push em `main` **ou** branch de backup) antes de qualquer clone |
| 🔴 2 | Esclarecer qual máquina é Mac 1/Mac 2 — esta ainda está no iCloud (não migrada) |
| 🟡 3 | Corrigir no prompt a referência ao plano (arquivo/pasta inexistentes) e levar os planos ao Mac 2 (AirDrop ou `source/docs/`) |
| 🟡 4 | Garantir credencial Git válida no Mac 2 antes do clone (cuidado com rotação do PAT) |
| 🟢 5 | Trocar a frase "Mac 1 já enviou tudo" por "confirme `git log origin/main..HEAD` em cada Mac" |
| 🟢 6 | Acrescentar na Fase 2.1 a remoção do fallback hardcoded da service key |

---

>>> Resumo: o prompt é bom e a sequência da service key está certa. O bloqueador é factual —
>>> **este repositório tem 5 commits não enviados** e a premissa "Mac 1 já enviou tudo" é falsa.
>>> Enviar esse trabalho ao GitHub é o passo zero, antes de clonar qualquer coisa no Mac 2.
