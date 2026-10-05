# MONTEX ERP V5 — Contexto para Claude Code

> Este arquivo é lido automaticamente por todo agente Claude que trabalhe neste repositório.
> Mantém regras de negócio, schema, convenções e armadilhas conhecidas.

---

## 🏢 Visão do projeto

ERP de gestão para o **Grupo MONTEX** (fabricação de estruturas metálicas em Belo Vale/MG).

**Stack:** React 18 + Vite + TailwindCSS + Radix UI · Supabase (PostgreSQL + Storage + Auth) · Three.js + web-ifc · Recharts · Framer Motion · GitHub → Vercel auto-deploy.

**Estrutura do ERP:**
- **Comercial:** Orçamentos, Simulador, Vendas
- **Produção:** Kanban (Fabricação → Solda → Pintura → Expedido → Enviado), MontagemPage, Análise por funcionário/etapa
- **Financeiro:** GestaoFinanceiraObra (GFO), DespesasPage, ReceitasPage, PainelFinanceiroGlobal
- **Visualização:** MontexERP3DPage (IFC integrado ao ERP)
- **Dashboards:** VisaoGeralPage (HUD sci-fi), DashboardPremium (BI), CommandCenterUltrawide (NEXUS), CommandCenterUltra (OMEGA)
- **BI:** `BI360` (abas Executivo/Obras/Produção/Financeiro/Suprimentos) + `RadarAlertas` — motor puro em `src/services/bi/` (testado), dados via `useBIData` (escopo do topo, `producao_historico` paginado). ZERO dado fictício. BI Estratégico/Tático/Operacional antigos redirecionam para o BI 360.
- **IA:** `Copiloto` (chat com ferramentas executadas no navegador sobre o motor do BI) e `InsightsIA` (análise executiva estruturada). Tudo via Edge Function `ia-copiloto` (Claude; secret `ANTHROPIC_API_KEY`, modelo `IA_COPILOTO_MODEL`, limite `IA_LIMITE_DIARIO`, uso em `ia_uso`). NUNCA chamar a API do Claude direto do navegador. `base44.integrations.Core.InvokeLLM` é um shim para essa função.

---

## ⚠️ Regras de negócio críticas (NÃO QUEBRAR)

### 1. Despesas vs GFO são INDEPENDENTES
**Despesas com `obra_id IS NOT NULL` NUNCA podem ser deletadas durante reconciliação de planilha.**
A `DespesasPage` é o módulo independente de despesas da FÁBRICA. Despesas vinculadas a obras devem ir EXCLUSIVAMENTE para GestaoFinanceiraObra (GFO).
- Trava implementada em `import_despesas_fabrica.py`
- Form Cadastrar Despesa em DespesasPage NÃO tem campo "Vincular à Obra"

### 1b. Premissas do financeiro (definidas pelo CEO em 05/10/2026)
- **Painel Financeiro Global = caixa e resultado oficial da EMPRESA.** Não apura lucro/prejuízo por obra.
- **Fluxo de mão única:** lançamentos de Despesas / Receitas / medições alimentam o Painel Global. Lançamentos e edições feitos NO Painel Global ficam só nele e NÃO voltam para os outros módulos.
- **Materiais/despesas lançados direto na obra (GFO, `obra_id IS NOT NULL`) NÃO entram no caixa da empresa** (Painel Global, `useFinanceiroGlobal`, DRE escopo `empresa`). Receitas (medições e recebimentos) entram pelo total.
- **Resultado por obra** fica só na Gestão Financeira da Obra (GFO) e na Margem por Obra — nunca misturar com o resultado da empresa.
- **`FinanceiroPage` = Painel Financeiro comum:** visualiza receita × despesa de UM escopo — `Fábrica (geral)` (lançamentos sem obra, padrão) ou uma obra (medições + `receitas_manuais.obra_id` + `lancamentos_despesas.obra_id`). Todo lançamento lá escolhe o vínculo (Fábrica ou obra). Lançamentos comuns (Despesas/Receitas/FinanceiroPage) são espelhados no Painel Global; os feitos NO Global nunca voltam. NÃO redirecionar para o Painel Global.

### 1c. Filtro de obra ÚNICO (seletor do topo) — definido pelo CEO em 05/10/2026
- O seletor do topo (`SeletorObra`) é o ÚNICO filtro de obra. Páginas NÃO têm filtro de obra próprio (evita divergência entre módulos).
- Valores (`escopoObra` no ERPContext, `src/lib/escopoObra.js`): `'geral'` (padrão, sem obra) | grupo de `GRUPOS_OBRAS` (ex.: `temec`) | id de obra.
- `obraAtual`/`obraAtualData` só têm valor quando o escopo é UMA obra; em Geral/grupo são `null` (sem fallback para `obras[0]`). Use `obraIdsEscopo` (null = todas) / `pertenceAoEscopo()`.
- **Geral** por tipo: operacionais (Produção, Kanban, Expedição, Montagem, Estoque, Compras, BI) = todas as obras; FinanceiroPage/Despesas/Metas = Fábrica (sem obra); Receitas = todas; Painel Global = sempre empresa.
- Telas de uma obra só (GFO, 3D, Kanban Corte, Import Romaneio) mostram `<ExigeObra/>` em Geral/grupo.
- Campos "obra" em formulários de CADASTRO não são filtro e continuam existindo.

### 2. Status nunca hardcoded
Bug recorrente: `status: STATUS_LANCAMENTO.PENDENTE` sobrescreve a escolha do usuário no form.
**SEMPRE preserve o status do formulário:** `status: novoLanc.status || STATUS_LANCAMENTO.PENDENTE`.

### 3. Timezone das datas
Datas tipo `'2026-05-15'` parseadas com `new Date(str)` viram `2026-05-14` em fuso UTC-3.
**Use helper `parseLocalDate(str)`** que constroi via `new Date(ano, mes-1, dia)`.

### 4. PostgREST limite 1000 linhas
A tabela `pecas_producao` tem >1000 registros. Sempre use paginação no `getAll/getByField`.
Implementação em `createCrud` (`src/api/supabaseClient.js`).

### 5. Etapas de produção (fluxo)
`fabricacao → solda → pintura → expedido → enviado → entregue`
- `expedido` = Fila de Embarque (na Expedição)
- `enviado` = Em Obra (Aguardando Montagem)
- `entregue` = Concluído (não usado mais — substituído por localStorage)

### 6. Status no módulo Montagem é INDEPENDENTE da etapa
A `MontagemPage` usa `localStorage` + `entity_store.montagem_concluidas_global` para marcar peças como Montadas, **SEM alterar a etapa** do banco. Isso evita que outros módulos sejam afetados.

### 7. IFC do Tekla tem marcas mascaradas
O Tekla 19.0 exporta com `Assembly mark = TIPO0(?)` (placeholder).
Marcas como `C1A`, `VM50A`, `TS59A` **NÃO** existem no IFC. Matching usa:
1. Marca exata via name/tag (raro com Tekla)
2. Tokenização e regex de padrões
3. Fallback POR TIPO IFC (COLUNA, TESOURA, VM) → status majoritário do tipo no ERP
PropertySets extraídos: `Profile`, `Position code`, `Class`, `Grade`, `Top/Bottom elevation`.

---

## 📊 Estrutura de dados (Supabase)

### Tabelas principais
| Tabela | Conteúdo |
|---|---|
| `obras` | Obras/projetos (id, codigo, nome, contrato_valor_total, contrato_peso_total, status, cliente) |
| `pecas_producao` | Peças/marcas com etapa, quantidade, peso_unitario, peso_total, funcionario_X |
| `materiais_corte` | Materiais de corte separados (não confundir com peças) |
| `lancamentos_despesas` | Despesas financeiras (com ou sem obra_id) |
| `medicoes` | Medições/receitas |
| `expedicoes` | Romaneios com pecas[] e pecas_ids[] |
| `entity_store` | Overrides/configs JSON (`id`, `entity_type`, `data`) — usado p/ montagem_concluidas_global |

### Padrões de identificação
- IDs de peças: `PEC-XXXX` (4 dígitos) ou splittadas `PEC-XXXX__split_*`
- IDs de lançamentos: `lanc-{timestamp}` ou `LANC-XXX` legados
- IDs de obras: `obra-001` (Super Luna) até `obra-027b`
- Marcas Tekla: prefixos C, VM, VS, TS, TC, TP, TR, CT, CV, DN, MF, SP, TL

---

## 🔐 Credenciais & segurança

- Service role key **REMOVIDA do cliente** (`src/api/supabaseClient.js` usa só a anon key; `supabaseAdmin` é sempre `null`). Operações que exigem service_role vão por Edge Functions (`admin-users`, `send-push`, `notify-pending`) — **NUNCA reintroduzir a service key no bundle**
- **Credenciais expostas que precisam rotação:** GitHub PAT, Supabase secret legado (já avisado)
- **NÃO COMMITAR** novos secrets

---

## 🎨 Convenções de código

### React
- Componentes funcionais + hooks
- `useMemo` para computações pesadas (statusMap, kpis)
- `useCallback` para handlers que entram em deps de outros memos
- State local com `useState`, global via `ERPContext` (`useObras`, `useProducao`, etc.)

### Estilização
- TailwindCSS prioritário, sem CSS-in-JS exceto `style={}` inline para valores dinâmicos
- Paleta de status:
  - 🟢 `#22c55e` MONTADO / sucesso
  - 🟡 `#eab308` EM_OBRA / atenção
  - 🟠 `#f97316` EMBARQUE / pendente
  - ⚪ `#374151` NAO_INICIADO / ghost

### Sincronização
- localStorage como cache imediato
- Supabase `entity_store` para sync entre dispositivos
- Polling 3s para detectar mudanças na mesma aba
- `storage` event do navegador para cross-tab

---

## 🐛 Bugs históricos comuns (verificar antes de qualquer mudança)

| # | Bug | Solução |
|---|---|---|
| 1 | Status sobrescrito por PENDENTE | Preservar `novoLanc.status` |
| 2 | Datas com -1 dia | `parseLocalDate()` |
| 3 | Peças sumidas no Kanban | Paginação PostgREST |
| 4 | `Select.Item value=""` quebra Radix | Usar `"todos"` em vez de `""` |
| 5 | `<` em JSX texto quebra build | Usar `&lt;` |
| 6 | Race entre `setLancamentos` local e useEffect | Deduplicar por id antes de adicionar |
| 7 | KPIs contando elementos IFC em vez de peças ERP | Usar `erpStats`, não `stats` |
| 8 | Matching IFC por tipo distorcia colors | Strategy 5 antiga removida; Strategy 7 nova só como fallback |

---

## 🚀 Deploy

- Push em `main` → Vercel faz auto-deploy
- URL: `https://montex-erp-v5.vercel.app`
- Build: `npm run build` (Vite + Rollup)
- Não rodar build localmente em arm64 sandbox (rollup native binding ausente)
- Para git operations dentro do sandbox: usar `osascript` via `Control_your_Mac` MCP (workspace bash tem deadlock no .git)

---

## 📋 Convenções de commit

Formato: `tipo(escopo): descrição curta`

**Tipos:** `feat`, `fix`, `refactor`, `chore`, `docs`

**Escopos comuns:** `montagem`, `3d`, `gfo`, `kanban`, `expedicao`, `financeiro`, `dashboard`

**Corpo do commit:** explicar CAUSA RAIZ, MUDANÇAS e RESULTADO esperado. Usuário valoriza commits descritivos para revisão posterior.

---

## 🎯 Trabalho atual / contexto recente

Últimas grandes mudanças (referência):
- Reformulação MontexERP3DPage com matching IFC fiel (Strategy 7 fallback por tipo)
- Importação XLSX de peças montadas (planilha "MONTAGEM BELO VALE")
- Ação "Marcar como Montada" direto no painel 3D
- 4 dashboards reformulados (VisaoGeral, Premium, Ultrawide, Ultra)
- Fix GFO Novo Lançamento não persistir
- Super Luna: 47 peças marcadas como montadas via planilha (58 unidades, 27.738 kg)
- TS59A splittada (qtd 3 → 2 enviado + 1 expedido)
- 32 peças TERÇA órfãs revertidas para `expedido`

Estado atual da Super Luna:
- 532 peças total
- 47 MONTADAS / 191 EM_OBRA / 70 EMBARQUE / 224 NAO_INICIADO
- Peso contratual: 107 t

---

## 💡 Quando o usuário disser apenas "RETOMAR"

Significa: continue de onde paramos, sem precisar de instrução explícita.
Olhe o último commit, o estado das tasks pendentes, e tome iniciativa em algo útil:
- Corrigir bugs visíveis
- Melhorar UX
- Implementar a próxima feature lógica
- Validar consistência cross-módulo

Não pergunte ao usuário — ele quer ver progresso.
