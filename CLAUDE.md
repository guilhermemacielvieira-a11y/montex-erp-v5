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
- **BI:** `BI360` (abas Executivo/Obras/Produção/Financeiro/Suprimentos/Custo-kg) + `RadarAlertas` — motor puro em `src/services/bi/` (testado), dados via `useBIData` (escopo do topo, `producao_historico` paginado). ZERO dado fictício. BI Estratégico/Tático/Operacional antigos redirecionam para o BI 360.
- **IA:** `Copiloto` (chat com ferramentas executadas no navegador sobre o motor do BI) e `InsightsIA` (análise executiva estruturada). Tudo via Edge Function `ia-copiloto` (Claude; secret `ANTHROPIC_API_KEY`, modelo `IA_COPILOTO_MODEL`, limite `IA_LIMITE_DIARIO`, uso em `ia_uso`). NUNCA chamar a API do Claude direto do navegador. `base44.integrations.Core.InvokeLLM` é um shim para essa função.
- **Colaboração & automação:** `CentralTarefas` (tabela `tarefas` + `colaboracao_mensagens`), `CentralRelatorios` (`relatorios_historico`/`relatorios_agendamentos`), `Automacoes` (`automacoes`/`automacoes_log`/`automacoes_disparos`). Motor no servidor: Edge Function `motor-automacoes` via pg_cron `montex-motor-automacoes` (de hora em hora, header x-push-key do Vault). Sino lê `notificacoes`. Use `src/api/colaboracaoApi.js` (NÃO o shim base44, que mascarava erros).

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
- **`FinanceiroPage` = Painel Financeiro comum:** visualiza receita × despesa de UM escopo — `Geral` (padrão: TODAS as receitas, de fábrica e obras, × só as despesas SEM obra, porque despesa da GFO é paga pelo cliente e abate do contrato) ou uma obra (medições + `receitas_manuais.obra_id` + `lancamentos_despesas.obra_id`). Todo lançamento lá escolhe o vínculo (Fábrica ou obra). Lançamentos comuns (Despesas/Receitas/FinanceiroPage) são espelhados no Painel Global; os feitos NO Global nunca voltam. NÃO redirecionar para o Painel Global.

### 1c. Filtro de obra ÚNICO (seletor do topo) — definido pelo CEO em 05/10/2026
- O seletor do topo (`SeletorObra`) é o ÚNICO filtro de obra. Páginas NÃO têm filtro de obra próprio (evita divergência entre módulos).
- Valores (`escopoObra` no ERPContext, `src/lib/escopoObra.js`): `'geral'` (padrão, sem obra) | grupo de `GRUPOS_OBRAS` (ex.: `temec`) | id de obra.
- `obraAtual`/`obraAtualData` só têm valor quando o escopo é UMA obra; em Geral/grupo são `null` (sem fallback para `obras[0]`). Use `obraIdsEscopo` (null = todas) / `pertenceAoEscopo()`.
- **Geral** por tipo: operacionais (Produção, Kanban, Expedição, Montagem, Estoque, Compras, BI) = todas as obras; Despesas/Metas = Fábrica (sem obra); FinanceiroPage = todas as receitas × despesas da Fábrica; Receitas = todas; Painel Global = sempre empresa.
- Telas de uma obra só (GFO, 3D, Kanban Corte, Import Romaneio) mostram `<ExigeObra/>` em Geral/grupo.
- Campos "obra" em formulários de CADASTRO não são filtro e continuam existindo.

### 1d. Medição editada na tela Receitas
Valor, status e obra de uma medição editada em Receitas são gravados NA TABELA `medicoes` (não só no override `montex_receitas_overrides`), para GFO, Receitas e Painel Financeiro mostrarem o mesmo dado.

### 1e. Histórico de produção (`producao_historico`) tem ruído — NUNCA somar bruto
Tem linhas duplicadas (mesma peça/movimento/dia/funcionário), movimentos parciais `[QTD:x/y]` em `observacoes` e peças `__split_*` que herdam o histórico da mãe. Somar `peso_total` por linha inflava a fabricação em ~2×.
**Sempre use `normalizarHistorico()` / `transicoesComPeca()` (`src/services/bi/biProducao.js`)**: remove duplicatas, kg = unidades movidas × peso unitário, teto pela quantidade da peça. "Produção do setor" = kg que SAÍRAM da etapa (Pintura concluída = peça pronta); Embarque = romaneios pela `data_saida`. A `AnaliseProducaoPage` e o BI 360 usam esse mesmo motor (`biAnaliseProducao.js`).
**Produção por pessoa** (`ProducaoFuncionarioPage`, motor `biFuncionarios.js`): pessoa = `funcionario_id` do apontamento (cadastro `funcionarios`), não o nome. Conjuntos da aba Lançamentos gravam `peca_id` REAL + `[QTD:1/N]` (id `HIST-<peça>__cN-<etapa>`, distinto entre conjuntos).
**Corte é etapa à parte** (`biCorte.js`): mede kg de MATERIAL (`materiais_corte.peso_teorico` = peso total da linha), data = `data_fim`, pessoa = `funcionario_corte` (ou o apontamento do histórico cujo `peca_id` = id do corte). Nunca somar corte ao total de peças. Coerência produzido × identificado: `coerenciaProducao()` (apontado / só responsável na peça / sem dono por etapa).
**Desempenho individual** (`biDesempenho.js`, aba Desempenho da `ProducaoFuncionarioPage`): NÃO comparar pessoas por kg puro nem por ritmo calibrado dos apontamentos (sistema em implantação: lote, espera e peça parada distorcem — ex.: terça fabricada que ficou aguardando pintura). (1) Rota por família: famílias "sem solda" (padrão TERÇA, TERÇA-TAP) não contam produção na Solda (`aplicarRotas`, também na Análise de Produção). (2) Régua = MODELO DE HORAS-PADRÃO `MODELO_HHT` (Hh/t por grupo de família × etapa, faixas de mercado: terça 6 fab, tesoura 16/14, tirante 35/10…), ajustável por família. (3) Hh-padrão = t × Hh/t. (4) Eficiência = Hh-padrão ÷ (dias úteis desde o 1º apontamento × 8,8 h) × 100; 100% = entregou o padrão; "vs equipe" = ÷ mediana dos REGULARES (≥5% da etapa). Ritmo observado (`calibrarRitmos`/`hhtObservado`) é SÓ comparação. "Passagem c/ fila" (tempo entre etapas) inclui espera e nunca mede desempenho. Config em `entity_store` id `config_rotas_producao` (`{semSolda, hht, horasDia}`, hook `useRotasProducao`).
**Etapa "não se aplica"** (ex.: terça fabricação → pintura, sem solda): no lançamento (modal do Kanban e aba Lançamentos por obra) escolher "⊘ Não se aplica" na lista de funcionário. Grava `producao_historico` com `[NA]` em `observacoes` (id `HIST-<peça>-<etapa>-NA`, sem funcionário) e limpa `funcionario_<etapa>` da peça. `normalizarHistorico` zera a passagem por essa etapa (peça e peças divididas dela): não conta no setor, na pessoa nem como "sem dono".

### 1e-bis. Custo por kg da fábrica (`biCustoKg.js`, aba Custo/kg do BI 360 e `/m/custo`)
- Custo = despesas SEM obra (classes: mão de obra, demais fixos, variáveis por kg = matéria-prima/consumíveis/impostos; "Montagem Campo" fica fora). Material de obra (GFO) nunca entra.
- Produção ("fabricado", critério da diretoria) = kg que ENTROU em pintura no histórico normalizado, INCLUINDO as passagens `[NA]` (`normalizarHistorico().passagensNA` — terça que vai da solda à pintura sem soldar). NÃO usar `pecas_producao.data_inicio_pintura` para medir mês: o campo é regravado em reajustes/lançamentos e infla o mês corrente.
- Premissas (preço de fabricação, capacidade, aço, montagem, janela, reajustes 2027) em `entity_store` id `config_custo_kg` (`useConfigCustoKg`). Lançamentos > 3× a mediana da categoria (e > R$ 20 mil) são trocados pela mediana e listados.
- Margem por obra aqui é ESTIMATIVA de fabricação (receita/kg − custo/kg no volume atual); resultado oficial continua na GFO (regra 1b).

### 1f. Fluxo integrado Obra → material → estoque → CORTE (POS) → MARCA → produção
- `materiais_corte` = POSIÇÕES (campo `marca` = código da POS, ex. `428`); `pecas_producao` = MARCAS (conjuntos, ex. `V134A`). Composição em `composicao_marcas` (obra_id, marca, pos, qtd_por_unidade), importada no Kanban de Corte ("📥 Importar posições": planilha plana com coluna Conjunto ou hierárquica do Tekla). Peça única (terça/tirante/calha) liga sozinha: POS = MARCA ou `materiais_corte.peca_id`.
- Motor puro `src/services/fluxoIntegrado.js` (testado) + hook `useFluxoIntegrado`: `abastecimentoCorte` (estoque disponível por chave → posição abastecida/parcial/sem estoque), `liberacaoMarcas` (marca liberada quando TODAS as posições estão cortadas; marcas já em produção consomem o corte primeiro), `pipelineObra`, `podeIniciarFabricacao`.
- Estoque × corte usa a RPC `fluxo_material_obra(obra)` — MESMA chave do trigger de baixa (`montex_resolver_perfil` + `montex_chave_estoque`). Sem a RPC o app mostra "estoque não consultado (estimado)" e não acusa falta. A baixa/estorno continua 100% no banco (`baixar_corte`/`estornar_corte` → `tg_corte_baixa_estoque`); `baixa_estoque_kg IS NULL` = corte histórico, nunca baixa.
- **Corte efetivo = apontado + implícito pela produção** (`corteEfetivo`): obras começaram antes do apontamento de corte, então POS de marca que já está em fabricação+ FOI cortada. POS ligada à marca → exato (`producao`); POS sem composição → estimado pela % produzida da família (`familiaCorte`: TS→TESOURA, VM→VIGA-MESTRA, TRELIÇA, TERÇA…; chapas/acessórios = GERAL). "A cortar" e o abastecimento usam só o pendente real. "🔗 Conciliar com a produção" grava as POS exatas como `finalizado` com `baixa_estoque_kg NULL` (histórico: sem baixa de estoque) e SEM `data_fim` (não vira produção de corte do dia no BI).
- Kanban de Corte: cortar posição sem saldo pede confirmação (o estoque ficaria negativo). Kanban de Produção: 1ª coluna "✂️ Corte" = etapa `aguardando`; sair dela para Fabricação exige a marca liberada (confirmação para forçar; sem composição só avisa). NÃO usar mais `corteStatusStore`/`conjuntoBOM` (BOM fictício) para status de corte.

### 1g. Rastreio de peça (busca por marca)
Campo "Rastrear peça" no Kanban de Produção (e botão "Rastrear fluxo" no detalhe do card) → `RastreioPecaDialog`: corte das posições → fabricação → solda → pintura → carregamento (romaneio, motorista) → entrega → montagem, por unidade (peça + divididas) e linha do tempo. Motor puro `services/rastreioPeca.js` (testado), dados sob demanda em `useRastreioPeca` (lê `pecas_producao` direto do banco). Histórico: agrupa duplicatas e o mesmo movimento gravado na mãe e na dividida (peça-base + movimento + dia + funcionário); por peça vale o último apontamento REGISTRADO (`created_at`), porque a peça-mãe acumula registros de unidades divididas depois. Marca repetida em várias obras aparece separada por obra (respeita o seletor do topo). **Por unidade:** seletor "Ver: Todas | Unidade N" (ou clique na linha da tabela) mostra o fluxo etapa a etapa (`unidade.fluxo`) e a linha do tempo só daquela unidade (`unidade.eventos`). Dono de cada apontamento: se o mesmo registro aparece numa peça dividida, é dela; senão, da peça onde foi gravado (corte das posições é da marca e aparece em todas).

### 2. Status nunca hardcoded
Bug recorrente: `status: STATUS_LANCAMENTO.PENDENTE` sobrescreve a escolha do usuário no form.
**SEMPRE preserve o status do formulário:** `status: novoLanc.status || STATUS_LANCAMENTO.PENDENTE`.

### 3. Timezone das datas
Datas tipo `'2026-05-15'` parseadas com `new Date(str)` viram `2026-05-14` em fuso UTC-3.
**Use helper `parseLocalDate(str)`** que constroi via `new Date(ano, mes-1, dia)`.
- "Hoje" = `hojeLocalISO()` (`src/utils/financeiroCalc.js`), NUNCA `new Date().toISOString().split('T')[0]` (após 21h vira o dia seguinte).
- Comparar timestamp do banco (`created_at`, `data_fim`…) com hoje: `diaLocal(ts) === hojeLocalISO()`. Filtro de dia no banco: `limitesDiaLocal()` (`gte inicio`, `lt fim`).

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
