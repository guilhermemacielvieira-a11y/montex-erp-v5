# Changelog - MONTEX ERP V5

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [2.2.0] - 2026-06-11

### Módulo Comercial — Reestruturação (PR7 / #24)

#### Corrigido
- **Projetos**: criar/editar gravava colunas inexistentes em `obras` (falha silenciosa) — mapeamento p/ schema real + metadados em `endereco.meta`; gera `id`/`codigo` automaticamente
- **Projetos**: crash ao abrir "IA de Gestão" (imports `Target`/`AlertTriangle` ausentes)
- **Orçamentos**: cards R$ 0,00 / probabilidade vazia (snake_case vs camelCase) — normalização + probabilidade persistida no JSONB `itens`
- **transforms.js**: `orcamentoToSupabase` agora é partial-aware — update parcial zerava `itens` (setores/cálculos do Simulador), resetava `data_criacao` e anulava `cliente_nome`
- **Simulador**: aceita `/SimuladorOrcamento?editar=<id>` vindo do pipeline

#### Adicionado
- Pipeline: drag & drop, duplicar e enviar persistem no Supabase; Exportar gera CSV real
- Seletor de cliente com clientes reais; Projetos com autocomplete de clientes; Clientes exibe nº de projetos + orçamentos e valor de pipeline
- Confirmação de exclusão (Clientes/Projetos) e toasts de sucesso/erro

#### Observação
- Rodar `seed_comercial_v1.sql` (pacote montex-pr7-pronto) no SQL Editor do Supabase para alimentar o módulo comercial com os dados em uso (idempotente)

### Módulo Suprimentos — Reestruturação

#### Adicionado
- **Compras com persistência real**: Novo Pedido e Nova Cotação agora salvam no Supabase via `addCompra` (antes ficavam só em estado local e sumiam ao recarregar)
- **Cotações reais**: cotação registrada como compra `status='cotacao'`, com ações funcionais "Converter em Pedido" e "Encerrar" (antes exibia valores falsos hardcoded R$ 15.000/25.000)
- **Receber Pedido** na tabela de Compras: marca como entregue e registra movimentações de ENTRADA em `movimentacoes_estoque` por item (integração Compras → Estoque, que a notificação prometia mas não existia)
- **Fornecedores consolidados**: aba puxa fornecedores reais identificados nas compras, NFs e pedidos de material (estatísticas de pedidos/NFs/valor por fornecedor), além do cadastro persistente
- **Tabela `fornecedores`** + alinhamento de colunas de `compras`: `supabase/migration_v16_suprimentos.sql` (idempotente; inclui seed do fornecedor Gerdau antes hardcoded no front)
- **`updateCompra`** no ERPContext/useCompras
- **Exportar CSV** dos pedidos filtrados (botão antes sem handler)
- **Histórico de importações persistente** no Import Listas: reconstruído dos lotes gravados em `pedidos_material`/`pecas_producao` (antes sumia no F5)

#### Corrigido
- **Crash no DetalhamentosPage**: ícone `Package` usado sem import — quebrava ao abrir modal com peças relacionadas
- **Reducer RECEBER_COMPRA**: lia `payload.id` mas o dispatch envia `compraId` (estado local nunca atualizava); status local agora espelha o Supabase (`entregue`)
- **Croquis/Detalhamentos com dados desatualizados**: passaram a cruzar com peças REAIS da produção (Supabase) em vez do mock estático de `src/data/database.js` (fallback para mock se contexto vazio)
- **Datas inválidas** ("Invalid Date") em pedidos/NFs sem data — agora exibe "—"
- **Badge Financeiro** na tabela de pedidos refletia sempre "PREVISTO" — agora usa o `statusFinanceiro` real (previsto/lançado/pago)
- **Busca de fornecedores** funcional (campo era decorativo)
- Botões "Visualizar/Editar fornecedor" que só exibiam toast → edição real com persistência

#### Observação
- Rodar `supabase/migration_v16_suprimentos.sql` no SQL Editor do Supabase para habilitar o cadastro de fornecedores e garantir as colunas de `compras`. O front degrada graciosamente caso a migration ainda não tenha sido aplicada.

## [2.1.0] - 2026-02-13

### Adicionado
- **Camada de Serviços** (`src/services/api.js`): Service layer completa com 9 serviços (obras, funcionários, equipes, lançamentos, medições, composição, pedidos, diário, dashboard) extraída do código local não versionado
- **Pipeline CI/CD** (`.github/workflows/ci.yml`): GitHub Actions com lint, build, testes e deploy automático para Vercel
- **Testes automatizados** (Vitest): Setup completo com mocks de Supabase, testes da camada de serviços (26 test cases)
- **Documentação de API** (`docs/SUPABASE-API.md`): Documentação completa do schema PostgreSQL, tabelas, views, RLS policies e índices
- **CHANGELOG.md**: Histórico de mudanças seguindo padrão Keep a Changelog
- **Versionamento semântico**: Arquivo `src/version.json` atualizado com rastreamento de features

### Melhorado
- **.gitignore** atualizado para proteger credenciais sensíveis (.env, .env.local, .env.*.local)
- **Segurança**: Garantida exclusão de arquivos `.env.local` e chaves Base44 do repositório

### Segurança
- Auditoria de credenciais: Confirmado que `.env` contém apenas anon key (pública) do Supabase
- `.env.local` com chave Base44 API corretamente excluído via `.gitignore`
- RLS (Row Level Security) documentada e validada para todas as tabelas

## [2.0.0] - 2026-02-04

### Adicionado
- **Integração Estoque Real ↔ Kanban Corte**: Dedução automática de peso ao iniciar corte
- **VisaoGeralPage**: Dashboard com visão geral LIVE
- **GestaoObrasPage**: Gestão centralizada de obras
- **ForgotPasswordPage / ResetPasswordPage**: Fluxo completo de recuperação de senha
- **Internacionalização (i18n)**: Suporte multi-idioma com i18next
- **Drag & Drop**: Biblioteca @dnd-kit para interações de arrastar/soltar
- **Suporte Electron**: Empacotamento desktop para macOS/Windows/Linux
- **KPIs em tempo real**: Widget de consumo no Kanban e Estoque
- **useCommandCenter**: Hook para métricas do Command Center em tempo real
- **useCorteSupabase**: Hook dedicado para integração Supabase no Corte
- **useSmartPagination**: Paginação inteligente para grandes datasets
- **Componentes admin/kanban**: Novos diretórios de componentes especializados

### Alterado
- **Arquitetura de Estado**: Refatorada de DataProvider monolítico para reducers modulares por domínio (producao, estoque, financeiro, compras, expedição, medições, obras, orçamentos, RH, UI)
- **Lazy Loading**: Todas as páginas agora usam React.lazy() para code splitting
- **Consolidação de Dashboards**: Dashboard, DashboardFuturista e DashboardERPIntegrado unificados no DashboardPremium
- **Consolidação de Estoque**: EstoquePage substituída por EstoquePageV2 (alias mantido)
- **Consolidação de Orçamentos**: Orcamentos substituída por OrcamentosPage

### Removido
- Dashboard.jsx (substituído por DashboardPremium)
- DashboardFuturista.jsx (substituído por DashboardPremium)
- DashboardERPIntegrado.jsx (substituído por DashboardPremium)
- EstoquePage.jsx (substituído por EstoquePageV2)
- Orcamentos.jsx (substituído por OrcamentosPage)
- mockData.js e backups (limpeza de dados de teste)
- useMockData.js (removido em favor de Supabase direto)
- DataProvider.jsx (substituído por reducers modulares)

## [1.0.0] - 2026-01-20

### Adicionado
- Release inicial do MONTEX ERP V5
- 12 módulos ERP: Dashboard, Comercial, Suprimentos, Engenharia, PCP/Corte, Fábrica, Expedição, Medição, Financeiro, Gestão, Inteligência, Ferramentas
- Integração completa com Supabase (PostgreSQL + Auth + RLS)
- PWA com Service Worker e manifest.json
- BI Analytics com 3 níveis (Operacional, Tático, Estratégico)
- Command Center para monitores ultrawide
- Chatbot e Assistente Técnico com IA
- Sistema de autenticação com roles (admin, gestor, operador, visualizador)
