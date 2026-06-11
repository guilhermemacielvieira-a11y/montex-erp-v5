# Análise de Conformidade — Plano v2 (validado contra o código real)

> A v2 (gerada no outro PC) foi escrita **sem acesso ao repositório** — ela mesma admite isso na §9.
> Esta análise roda os 6 itens pendentes da §9 da v2 **diretamente no código de produção** e aponta
> as inconformidades. Revisado: 2026-06-08.

---

## 0. Veredito

A v2 é uma boa evolução: acerta o diagnóstico raiz, reforça segurança e adiciona governança.
**Porém, por não ter visto o código, ela contém 1 erro de ordenação que QUEBRARIA a produção**
e superestima 2 riscos que **já estão resolvidos no repositório**. O essencial:

| Item da v2 | Status após checar o código | Ação |
|---|---|---|
| C1 — rotacionar service key | Válido, mas **a ordem está invertida** (rotacionar antes de remir do front quebra a produção) | Corrigir ordem |
| C2 — tirar service key do front | **Viável e seguro** — a migration v10 já dá acesso anon às 6 tabelas | Manter, com 1 ressalva (criação de usuário) |
| C3 — fonte única do estado de montagem | **Já implementado**: `entity_store` é a verdade (`montagemSync.js` + `MontagemPage` L74) | Rebaixar de risco para "concluído" |
| §5.2 npm ci / lockfile | Confirmado: `package-lock.json` versionado | Manter |
| §5.3 migrations numeradas | **Já existem** (`supabase/migration_v2…v10`) — não criar do zero | Reformular: consolidar + reconciliar duplicatas |
| RLS pré-requisito | Confirmado ativo, mas **`USING(true)`** = RLS não protege nada | Adicionar nota de realidade de segurança |

---

## 1. Inconformidade CRÍTICA — ordem de C1/C2 quebraria a produção

**O que a v2 manda fazer (§8):** rotacionar a service key **AGORA**, como primeiro passo.

**O que o código mostra:**
- `supabaseClient.js` cria `supabaseAdmin` com a service key e o app usa o padrão
  `const client = supabaseAdmin || supabase` em **orcamentos, compras, notas_fiscais,
  pedidos_material, maquinas, config_medicao** e em `auth.admin.createUser`
  (`LancamentoProducaoModal.jsx`, `useProducaoAnalytics.js`, `supabaseClient.js`).
- Ou seja: **enquanto a service key existir no ambiente, o app PREFERE o `supabaseAdmin`.**

**Por que a ordem da v2 quebra:**
Se você **rotacionar primeiro** sem antes remover a key do bundle/Vercel, o `supabaseAdmin`
continua sendo criado — agora com uma chave **inválida** — e **todas** as gravações nessas 6
tabelas passam a falhar (401), não só a criação de usuário. A produção quebra na hora.

**Ordem correta (segura):**
1. **Remover** `VITE_SUPABASE_SERVICE_KEY` do front e do ambiente (Vercel) → o código cai no
   `|| supabase` (anon), que **já funciona** (ver §2).
2. **Deploy** e validar todos os módulos.
3. **Só então rotacionar** a chave antiga (que a essa altura não é mais usada por ninguém).

> Rotacionar é necessário (a chave vazou no Git), mas é o **último** passo, não o primeiro.

---

## 2. Por que tirar a service key do front é seguro (a v2 não sabia disso)

A migration **`supabase/migration_v10_fix_rls_anon.sql`** já cria **24 políticas** (`SELECT/INSERT/UPDATE/DELETE`)
para o role `anon`, com `USING (true)`, exatamente nas 6 tabelas que usavam a service key:
`orcamentos, compras, notas_fiscais, pedidos_material, maquinas, config_medicao`.

Consequência: **o `anon` já tem CRUD completo nessas tabelas.** O `supabaseAdmin` virou
**redundante** para dados. Removê-lo e deixar o fallback `|| supabase` assumir é seguro.

**Única exceção real:** `auth.admin.createUser` (em `GestaoUsuariosPage`) **exige** service_role —
não dá para fazer com anon. Tratamento:
- **Curto prazo:** criar usuários pelo painel do Supabase (Authentication → Add user).
- **Definitivo:** mover a criação para uma **Edge Function** que lê a service key do ambiente do
  servidor (fora do navegador). É o único pedaço que precisa de privilégio elevado.

---

## 3. Inconformidade — C3 já está resolvido (a v2 superestimou)

A v2 trata o estado de montagem como risco aberto ("localStorage vs entity_store divergindo").
O código diz o contrário:
- `src/utils/montagemSync.js`: persiste em **dois** lugares por desenho — `localStorage` (cache
  imediato) **e** `entity_store` (sync entre máquinas), com o `entity_store` como referência.
- `src/pages/MontagemPage.jsx` L74: comentário explícito — *"entity_store (concluidasMontagem) é
  fonte ÚNICA da verdade para 'Montado'."*

Ou seja: a **fonte de verdade já é o banco**; o localStorage é cache descartável — exatamente o
modelo que a v2 pede em §4. **O achado #4 do plano v1 (que dizia "localStorage") estava
desatualizado.** C3 deve ser rebaixado de "risco crítico" para "já conforme".
O que resta é o **achado #3 (refetch cross-device)** — cache pode ficar velho até o poll/reload.
Isso é o item de backlog (Realtime), não uma divergência de fonte de verdade.

---

## 4. Inconformidade — migrations já existem (reformular a §5.3)

A v2 recomenda "criar pasta `migrations/` numerada". Na prática **já há** uma sequência:
`supabase/schema.sql`, `seed.sql`, `migration_v2.sql` … `migration_v10_fix_rls_anon.sql`.

O problema real **não** é falta de numeração — é **duplicação/drift**:
- `migration_v10_fix_rls_anon.sql` existe **2×**: dentro de `source/supabase/` **e** solto na
  raiz `SISTEMA GRUPO MONTEX VERSAO FINAL/` (fora do repo).
- Há **dois** arquivos de schema: `source/supabase-schema.sql` (raiz do source) **e**
  `source/supabase/schema.sql`. Precisam ser reconciliados (qual é o canônico?).

Ação correta: **eleger `source/supabase/` como pasta canônica**, apagar as cópias soltas,
confirmar a ordem v2→v10 e registrar numa tabela `schema_migrations` (ou doc) o que já rodou em
PROD e o que precisa rodar no DEV novo.

---

## 5. O que a v2 acertou e deve ser mantido

- **C1 rotacionar** (a chave realmente vazou — esconder não resolve). Só muda a **ordem**.
- **C2 arquitetura de chaves** (anon no front, service só server-side) — correta e agora **comprovadamente viável**.
- **`.env.example` versionado** sem segredos — bom (o arquivo já existe no repo; padronizar uso).
- **§5.1 branches + proteger `main`** — correto; hoje `main` faz deploy e qualquer push direto vai pro ar.
- **§5.2 `npm ci`** — correto; `package-lock.json` está versionado (confirmado: só `package-lock 2.json`,
  a cópia-fantasma do iCloud, está no `.gitignore` — mais uma prova do problema de sync).
- **§5.4 Realtime / last-write-wins** — correto como backlog; resolve junto o achado #3.

---

## 6. Nota de realidade de segurança (nenhum dos planos mencionou)

As políticas anon são `USING (true)` — **CRUD totalmente aberto**. Como a `anon key` vai no
bundle público, na prática **qualquer pessoa com a URL do app tem leitura e escrita totais no
banco**. RLS, hoje, **não protege nada** — é apenas o que destrava o app sem auth.

Implicação: a proteção real dos dados **não** vem do RLS, e sim de **separar DEV de PROD**
(o que ambos os planos pedem). Se um dia quiser proteção de verdade, é preciso **auth real +
políticas RLS por usuário/papel** — fora do escopo agora, mas registrado.

---

## 7. Plano consolidado — ordem de execução corrigida

| Ordem | Ação | Origem | Por quê nessa posição |
|---|---|---|---|
| **1** | Tirar código do iCloud → **clone limpo** em `~/Dev` nos 2 Macs | v1 Etapa A | Sem isso o `git` nem roda (deadlock); pré-requisito de tudo |
| **2** | Padronizar `.env.local` (**só** `URL`+`ANON`) a partir do `.env.example` | v2 §3 | Base do ambiente; remove a service key do uso local |
| **3** | Refatorar `supabaseClient.js`: remover `supabaseAdmin`; mover `createUser` p/ Edge Function (ou painel) | v2 §3 + código | Anon já cobre CRUD (v10); só user-creation precisa de server |
| **4** | Remover `VITE_SUPABASE_SERVICE_KEY` da **Vercel** + deploy + validar | v2 §3 (reordenado) | App passa a rodar 100% anon |
| **5** | **Rotacionar** a service_role key no Supabase PROD | v2 §2 C1 (reordenado) | Agora a chave antiga não é usada por ninguém — rotação não quebra nada |
| **6** | Criar **Supabase DEV** + rodar `migration_v2…v10` na ordem; reconciliar duplicatas de schema | v1 Etapa C + v2 §5.3 | Separação real de dados (a proteção que importa) |
| **7** | Proteger `main` no GitHub + fluxo branch/PR + `npm ci` | v2 §5.1/§5.2 | Governança; evita push acidental em produção |
| **8** | Backlog: Supabase **Realtime** (refetch cross-device, achado #3) | v2 §5.4 | Elimina dado velho entre Macs sem reload |

---

## 8. Itens da §9 da v2 — resolvidos aqui

| § | Pergunta da v2 | Resposta (código real) |
|---|---|---|
| 9.1 | fallback hardcoded? qual chave? | Sim — `URL`+`ANON`+**`service_role`** hardcoded em `supabaseClient.js` (L9–16) |
| 9.2 | montagem em LS, entity_store ou ambos? | **Ambos por desenho**; `entity_store` é a verdade (`montagemSync.js`; `MontagemPage` L74) |
| 9.3 | `package-lock.json` versionado? | **Sim** (só `package-lock 2.json` ignorado) |
| 9.4 | `.gitignore` cobre node_modules/dist/.env.local e não ignora .env.example? | **Sim** — confere |
| 9.5 | em que commits a service key aparece? | Não verificável no sandbox (deadlock no `.git`); fazer após o clone limpo (passo 1) |
| 9.6 | RLS ativo em todas as tabelas? | RLS ativo (v5/v10), mas políticas anon são `USING(true)` = **abertas** (ver §6) |

---

>>> Resumo: a v2 está certa no destino. As correções são **(a)** inverter a ordem rotacionar↔remover
>>> a service key (senão quebra a produção), **(b)** rebaixar C3 (já conforme no código) e
>>> **(c)** tratar migrations como "consolidar o que existe", não "criar do zero". A migration v10
>>> torna a saída da service key segura — algo que o outro PC não tinha como saber sem o repo.
