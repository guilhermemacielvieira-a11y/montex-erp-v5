# Plano de Sincronização entre 2 PCs — MONTEX ERP V5 (v2 endurecido)

> Revisão de engenharia sênior sobre o plano original. Mantém o que está certo,
> corrige o que ainda deixa brecha de dados/segurança e adiciona a governança que
> faltava para o fluxo ser profissional de fato.
> Revisado: 2026-06-08. Base: PLANO-SINCRONIZACAO-2PCS.md.

---

## 0. Veredito da auditoria

O plano original está **80% correto** e o diagnóstico raiz (iCloud × Git competindo pelo
`.git`, e banco único de produção) está certo. Mas, mesmo seguindo-o à risca, **três riscos
graves continuam abertos**. Eles são o foco desta v2:

| # | Lacuna que o plano original não fecha | Consequência se ignorada |
|---|----------------------------------------|--------------------------|
| **C1** | **A `service_role key` foi commitada no Git.** Trocar o fallback no `supabaseClient.js` NÃO a remove do histórico nem do repositório remoto. | A chave continua viva e válida no GitHub e em qualquer bundle já publicado. Vazamento de admin total do banco. **Tem que ROTACIONAR, não esconder.** |
| **C2** | **`service_role key` num app Vite (prefixo `VITE_`)** é embarcada no JS público do navegador. O `.env.local` da v1 ainda lista `VITE_SUPABASE_SERVICE_KEY`. | Qualquer pessoa abre o DevTools e tem acesso que ignora RLS. O frontend **nunca** deve ver a service key. |
| **C3** | **Conflito de origem do estado de montagem.** O plano diz "localStorage" (achado #4); a memória do projeto diz que `concluidasMontagem` vive no `entity_store` (sincronizado). Se as duas coisas coexistirem, os 2 Macs divergem silenciosamente. | "Marquei como montado num Mac e sumiu no outro" — exatamente o sintoma que se quer eliminar. Precisa de **uma única fonte de verdade**. |

O resto do documento resolve C1–C3 e adiciona governança de branch, migrations, lockfile e
concorrência que o plano não cobria.

---

## 1. O que está CERTO no plano original (manter)

- Princípio central: **Git é a única fonte de verdade do código; nuvem nunca toca a pasta**. Correto.
- Tirar o projeto do iCloud para `~/Dev` (Etapa A). Correto e é a prioridade #1.
- `node_modules` recriado por máquina, nunca sincronizado. Correto.
- Separar Supabase DEV de PROD. Correto e necessário.
- Rotina pull no início / push no fim (Etapa D). Correto — só falta disciplina de branch e lockfile (ver §4 e §5).

Não há motivo para refazer essas partes. As seções abaixo **substituem ou complementam** pontos específicos.

---

## 2. C1 — Rotacionar a service key (faça HOJE, antes de tudo)

Esconder o fallback é cosmético. A sequência correta:

1. **Supabase → Project Settings → API → "Reset/Rotate" a `service_role` key** do projeto PROD (`trxbohjc…`).
   Isso invalida a chave vazada imediatamente.
2. Atualizar a nova chave **somente onde ela realmente precisa existir**: variáveis de
   ambiente da Vercel (server-side) e/ou Edge Functions. **Nunca** num arquivo versionado.
3. Conferir se a `anon key` também foi exposta indevidamente — anon pode ficar no client (é
   feita pra isso), desde que o **RLS esteja ativo** em todas as tabelas.
4. Opcional (higiene de histórico): a chave antiga já estará morta após o passo 1, então
   reescrever o histórico Git não é urgente. Se quiser limpar mesmo assim, usar
   `git filter-repo` — mas só depois de alinhar os 2 Macs, porque reescrever histórico
   força `git push --force` e exige re-clone do outro Mac.

> Regra: **toda credencial que um dia entrou num commit é considerada comprometida.** A única
> correção real é rotacionar.

---

## 3. C2 — Arquitetura correta de chaves (frontend nunca vê service key)

O `.env.local` da v1 perpetua o problema. Modelo correto:

```
# source/.env.local  (NÃO commitar) — APENAS chaves de cliente
VITE_SUPABASE_URL=https://SEU-PROJETO-DEV.supabase.co
VITE_SUPABASE_ANON_KEY=anon_key_do_DEV
# NÃO existe VITE_SUPABASE_SERVICE_KEY aqui. Nunca.
```

- O app (Vite) usa **só** `anon key` + **RLS** no banco. É assim que o Supabase foi desenhado.
- Se alguma operação realmente exige privilégio de admin (ex.: import em massa, job de limpeza),
  ela vai para uma **Edge Function / rota server-side** que lê a service key do ambiente do
  servidor — fora do bundle do navegador.
- No `supabaseClient.js`, trocar o fallback hardcoded por um **erro explícito**:

```js
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) {
  throw new Error('[config] Faltando VITE_SUPABASE_URL/ANON_KEY. Crie source/.env.local.');
}
```

Falhar alto é melhor que cair silenciosamente em produção.

### `.env.example` versionado (novo)

Commitar um template **sem segredos** para padronizar os 2 Macs:

```
# source/.env.example  (PODE commitar — sem valores reais)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Cada Mac copia `.env.example → .env.local` e preenche. Acaba o risco de configs divergentes (achado #5).

---

## 4. C3 — Uma única fonte de verdade para o estado de montagem

Antes de qualquer coisa, **verificar no código** (posso fazer isso se conectar o repo) qual é o
caminho real de `concluidasMontagem`:

- Se grava em **`entity_store` (Supabase)** → sincroniza entre Macs. ✅ É o que queremos. O
  achado #4 do plano original estaria desatualizado e deve ser corrigido.
- Se grava em **`localStorage`** → **não viaja** e é fonte de divergência. Migrar para `entity_store`.
- Se grava nos **dois** (cache local + banco) → definir o banco como verdade e o localStorage
  como cache descartável (revalidado no boot).

> A memória do projeto registra o formato `{pecaId: {montadoEm, origem, marca}}` no `entity_store`.
> O campo `origem: 'mobile'|'desktop'|'3d'` já sugere intenção multi-dispositivo — reforça que a
> verdade deve ser o banco, não o localStorage.

Decisão a aplicar: **estado de negócio (montagem, status) sempre no Supabase; localStorage só para
preferências de UI** (filtros, zoom, tema) que podem divergir por máquina sem prejuízo.

---

## 5. Governança de desenvolvimento (o que faltava para ser "profissional")

### 5.1 Estratégia de branches

`main` dispara deploy em PROD. Logo, **nunca desenvolver direto em `main`**.

```
main            ← protegida; só recebe merge validado → deploy PROD
└─ feat/<x>     ← trabalho do dia; Vercel cria Preview Deploy automático
└─ fix/<x>      ← correções
```

- Trabalho diário em branch `feat/` ou `fix/`. Push da branch → Vercel gera um **Preview** isolado
  (não afeta PROD).
- Merge em `main` só quando validado — idealmente via **Pull Request** (mesmo sozinho: serve de
  checkpoint e histórico revisável).
- Proteger `main` no GitHub: *Settings → Branches → Require PR before merging*. Evita push
  acidental direto em produção a partir de qualquer um dos Macs.

### 5.2 Lockfile e instalação determinística

Trocar `npm install` por `npm ci` na rotina de início:

- `npm install` pode **alterar** o `package-lock.json` e gerar árvores de dependência
  diferentes entre os 2 Macs.
- `npm ci` instala **exatamente** o lockfile — idêntico nos dois. Determinístico.
- `package-lock.json` **deve estar versionado** (confirmar que não está no `.gitignore`).

Regra: só roda `npm install` quem **adiciona/atualiza** dependência de propósito; o commit
resultante leva o `package-lock.json` junto. O outro Mac roda `npm ci`.

### 5.3 Migrations de banco com ordem e rastreio

Aplicar migrations "na mão" (Etapa C do plano) gera **drift DEV/PROD**. Disciplina mínima:

- Pasta `source/supabase/migrations/` com arquivos **numerados/sequenciais e imutáveis**
  (`001_init.sql`, `002_fix_rls_anon.sql`…). Uma vez aplicada, nunca se edita — cria-se a próxima.
- Toda mudança de schema é primeiro um arquivo de migration, **depois** aplicada. Nada de alterar
  schema só pelo painel sem registrar o SQL no repo.
- Aplicar **a mesma sequência** em DEV e PROD, na mesma ordem. Manter uma tabela
  `schema_migrations` (ou um doc) registrando o que já rodou em cada ambiente.
- Antes de promover para PROD: rodar a migration em DEV, validar, só então em PROD.

### 5.4 Concorrência cross-device (last-write-wins)

Com 2 Macs (e o mobile) escrevendo nas mesmas linhas do `entity_store`, a última escrita
sobrescreve a anterior silenciosamente. Mitigações, por ordem de esforço:

1. **Curto prazo:** disciplina — não editar a mesma obra nos 2 Macs ao mesmo tempo.
2. **Médio:** usar `updated_at` para escrita condicional (atualiza só se `updated_at` não mudou
   desde o load) e avisar o usuário em vez de sobrescrever cego.
3. **Ideal (backlog):** **Supabase Realtime** — assinar mudanças e refazer fetch automático
   (resolve também o achado #3, "sem refetch cross-device"). Mudança no Mac-A aparece no Mac-B
   sem reload total.

---

## 6. Rotina diária corrigida

**Ao SENTAR (qualquer Mac):**
```bash
cd ~/Dev/montex-erp
git checkout main && git pull          # sincroniza base
git checkout -b feat/descricao         # ou: git checkout feat/x existente
npm ci                                  # só se package-lock.json mudou
npm run dev
```

**Ao LEVANTAR (qualquer Mac):**
```bash
git add -A
git commit -m "tipo(escopo): descrição"   # padrão CLAUDE.md
git push -u origin feat/descricao          # push da BRANCH, não de main
# abrir PR → revisar → merge em main quando validado (aí sim deploy)
```

### Regras anti-conflito (atualizadas)
1. `git pull` no início, `git push` no fim — sempre. O outro Mac só vê o que foi pro GitHub.
2. **Nunca** editar nos 2 Macs ao mesmo tempo sem ter dado push no primeiro.
3. **Nunca** desenvolver direto em `main`; use branch + PR.
4. **Nunca** `npm install` casual — use `npm ci`. Só atualiza lockfile quem muda dependência de propósito.
5. Conflito de merge: **parar e resolver**, nunca `push --force` em `main`.
6. **Nunca** copiar `node_modules` entre Macs.
7. Desenvolvimento/teste → **Supabase DEV**. Só a Vercel (PROD) fala com o banco PROD.

---

## 7. Estrutura-alvo (visual atualizado)

```
ICLOUD (documentos — ok)                LOCAL ~/Dev (código — NUNCA na nuvem)
~/Desktop/SISTEMA GRUPO MONTEX.../       ~/Dev/montex-erp/   ← git clone
  ├─ Auditoria_*.docx                      ├─ src/
  ├─ Diario_Producao_*.xlsx                ├─ supabase/migrations/  ← numeradas, imutáveis
  ├─ *.csv  *.ifc                          ├─ .env.example  ← versionado (sem segredo)
  └─ (sem .git aqui)                       ├─ .env.local    ← anon key DEV, NÃO commitado
                                           └─ .git → GitHub (branches feat/fix → PR → main)

SUPABASE PROD (trxbohjc…)                 SUPABASE DEV (novo)
  ↑ só a Vercel (server)                    ↑ os 2 Macs em dev (anon key + RLS)
  service key: SÓ em env server-side        service key: nunca no frontend
```

---

## 8. Ordem de execução (repriorizada por risco)

| Quando | Ação | Etapa |
|--------|------|-------|
| **AGORA** | Rotacionar `service_role key` no Supabase PROD | §2 (C1) |
| **AGORA** | Remover `VITE_SUPABASE_SERVICE_KEY` do frontend; fallback vira erro explícito | §3 (C2) |
| **Hoje** | Tirar o código do iCloud → clone limpo em `~/Dev` nos 2 Macs | Plano v1, Etapa A |
| **Hoje** | Padronizar `.env.local` (só anon) + commitar `.env.example` | §3 |
| **Esta semana** | Confirmar fonte única do estado de montagem (entity_store) | §4 (C3) |
| **Esta semana** | Criar Supabase DEV + pasta `migrations/` numerada | §5.3 |
| **Esta semana** | Proteger branch `main` no GitHub + adotar branch/PR | §5.1 |
| **Contínuo** | Rotina pull/branch/push + `npm ci` | §6 |
| **Backlog** | Supabase Realtime (refetch cross-device + resolve achado #3) | §5.4 |

---

## 9. Verificação no código real (pendente — precisa do repo conectado)

Esta revisão se baseou no plano + memória do projeto. Para fechar com 100% de certeza, ainda
preciso inspecionar o repositório real (não está acessível nesta pasta). Itens a confirmar
diretamente no código quando o repo for conectado:

1. `supabaseClient.js` — confirmar fallback hardcoded e qual chave exatamente está commitada.
2. `concluidasMontagem` — confirmar se grava em `entity_store`, `localStorage` ou ambos (C3).
3. `package-lock.json` — confirmar que está versionado (não no `.gitignore`).
4. `.gitignore` — confirmar `node_modules/`, `dist/`, `.env.local`, e que `.env.example` NÃO está ignorado.
5. Histórico Git — confirmar em quais commits a service key aparece (para decidir sobre `filter-repo`).
6. RLS — confirmar que todas as tabelas têm Row Level Security ativo (pré-requisito para usar só anon key).

Posso conectar ao Mac (terminal/computer-use) e executar essa verificação, ou você roda os
comandos e me cola a saída.
```
```
```

>>> Resumo de uma linha: o plano original resolve o "não sincroniza"; esta v2 fecha as
>>> brechas que ainda deixavam **dados misturados** (C3) e um **vazamento de credencial** (C1/C2),
>>> e adiciona a governança (branch, lockfile, migrations) que torna o fluxo profissional.
