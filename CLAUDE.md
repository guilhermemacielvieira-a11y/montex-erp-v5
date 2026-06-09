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

---

## ⚠️ Regras de negócio críticas (NÃO QUEBRAR)

### 1. Despesas vs GFO são INDEPENDENTES
**Despesas com `obra_id IS NOT NULL` NUNCA podem ser deletadas durante reconciliação de planilha.**
A `DespesasPage` é o módulo independente de despesas da FÁBRICA. Despesas vinculadas a obras devem ir EXCLUSIVAMENTE para GestaoFinanceiraObra (GFO).
- Trava implementada em `import_despesas_fabrica.py`
- Form Cadastrar Despesa em DespesasPage NÃO tem campo "Vincular à Obra"

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

- Service role key **hardcoded** em `src/api/supabaseClient.js` como fallback (aceito pelo usuário, app sem auth real)
- **Credenciais expostas que precisam rotação:** GitHub PAT, Supabase secret (já avisado)
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

---

## 🌐 Ambiente de desenvolvimento recomendado (atualizado 2026-06)

**Desenvolver online:** GitHub Codespaces (`.devcontainer/` já configurado) + Claude Code.
Passo a passo em `docs/INICIAR-CLAUDE-CODE.md`. Banco é o mesmo Supabase na nuvem
para dev e produção; chaves via Codespaces secrets (`docs/DEV-ONLINE-CODESPACES.md`).

**Avisos:**
- Nunca manter `.git` em pasta sincronizada por iCloud/Drive — corrompe o repositório
  (já aconteceu; o clone antigo do Mac foi descartado). Clone limpo: `~/montex-fase0-recover`.
- A service_role key foi removida do código (Fase 0). Em produção, definir
  `VITE_SUPABASE_SERVICE_KEY` nas env vars da Vercel; ideal migrar admin p/ Edge Function.
- `migration_v12_rls_por_papel.sql` só deve ser aplicada APÓS auth real (senão quebra o app).
- Build não roda em sandbox arm64 (rollup native ausente) — usar Codespace/CI.
