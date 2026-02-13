# MONTEX ERP V5 - Documentação da API Supabase

> Documentação completa do schema PostgreSQL, tabelas, views, políticas RLS e índices.
> Última atualização: 13/02/2026

---

## Conexão

| Parâmetro | Descrição |
|-----------|-----------|
| URL | `VITE_SUPABASE_URL` (definido em `.env`) |
| Anon Key | `VITE_SUPABASE_ANON_KEY` (definido em `.env`) |
| Client | `src/api/supabaseClient.js` |

---

## Tabelas Principais

### `usuarios`
Controle de acesso e papéis do sistema.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID (PK) | Referência ao `auth.users` do Supabase |
| nome | TEXT | Nome completo |
| email | TEXT (UNIQUE) | Email do usuário |
| role | TEXT | `admin`, `gestor`, `operador`, `visualizador` |
| ativo | BOOLEAN | Status ativo/inativo |

**Roles:**
- `admin`: Acesso total a todas as tabelas e operações
- `gestor`: Leitura completa + atualização de obras
- `operador`: Leitura + inserção de lançamentos
- `visualizador`: Apenas leitura

---

### `obras`
Projetos/obras de construção.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT (PK) | ID único da obra |
| nome | TEXT | Nome da obra |
| codigo | TEXT (UNIQUE) | Código para referência rápida |
| cliente | TEXT | Nome do cliente |
| contrato_valor_total | DECIMAL(15,2) | Valor total do contrato (R$) |
| contrato_peso_total | DECIMAL(10,2) | Peso total previsto (toneladas) |
| contrato_prazo_meses | INT | Prazo do contrato em meses |
| data_inicio | DATE | Data de início |
| data_prevista_fim | DATE | Data prevista para conclusão |
| status | TEXT | `ativo`, `concluido`, `pausado`, `cancelado` |
| endereco | JSONB | `{rua, numero, cidade, estado, cep}` |

**Índices:** `status`, `data_inicio`, `cliente`

---

### `equipes`
Equipes de trabalho.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT (PK) | ID da equipe (EQP001, etc.) |
| nome | TEXT | Nome da equipe |
| tipo | TEXT | `producao`, `pintura`, `montagem` |
| lider_id | TEXT | FK → funcionarios.id |
| obra_atual_id | TEXT | FK → obras.id |

**Índices:** `tipo`, `obra_atual_id`

---

### `funcionarios`
Funcionários e colaboradores.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT (PK) | ID do funcionário (FUNC001, etc.) |
| nome | TEXT | Nome completo |
| cargo | TEXT | Cargo/função |
| setor | TEXT | `montagem`, `solda`, `fabricacao`, `producao`, `geral` |
| equipe_id | TEXT | FK → equipes.id |
| salario | DECIMAL(10,2) | Salário mensal |
| admissao | DATE | Data de admissão |
| ativo | BOOLEAN | Status ativo/inativo |
| cpf | TEXT (UNIQUE) | CPF do funcionário |
| email | TEXT | Email |
| telefone | TEXT | Telefone |
| jornada | TEXT | Jornada de trabalho (padrão: 44h) |
| contrato | TEXT | Tipo de contrato (CLT, PJ, etc.) |

**Índices:** `setor`, `ativo`, `equipe_id`, `cpf`

---

### `equipe_membros`
Relacionamento N:N entre equipes e funcionários.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| equipe_id | TEXT (PK) | FK → equipes.id |
| funcionario_id | TEXT (PK) | FK → funcionarios.id |
| data_inicio | DATE | Data de entrada na equipe |
| data_fim | DATE | Data de saída (NULL = ativo) |

---

### `lancamentos_despesas`
Lançamentos de despesas e custos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT (PK) | ID do lançamento |
| obra_id | TEXT | FK → obras.id |
| tipo | TEXT | `material_faturado`, `despesa`, `mao_de_obra`, `servico` |
| categoria | TEXT | `material_estrutura`, `consumiveis`, `fabricacao`, `montagem`, `transporte`, `mao_obra` |
| descricao | TEXT | Descrição da despesa |
| fornecedor | TEXT | Nome do fornecedor |
| nota_fiscal | TEXT | Número da NF |
| valor | DECIMAL(15,2) | Valor (R$) |
| data_emissao | DATE | Data de emissão |
| data_vencimento | DATE | Data de vencimento |
| data_pagamento | DATE | Data do pagamento |
| status | TEXT | `pago`, `pendente`, `vencido`, `cancelado` |
| peso_kg | DECIMAL(10,2) | Peso em kg (para materiais) |

**Índices:** `obra_id`, `status`, `data_emissao`, `categoria`, composto `(obra_id, status, tipo)`

---

### `medicoes_receitas`
Medições de receita das obras.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT (PK) | ID da medição |
| obra_id | TEXT | FK → obras.id |
| numero | INT | Número sequencial da medição |
| mes_referencia | TEXT | Mês de referência (MM/YYYY) |
| valor_bruto | DECIMAL(15,2) | Valor bruto antes de retenções |
| retencao_percentual | DECIMAL(5,2) | Percentual de retenção |
| retencao_valor | DECIMAL(15,2) | Valor da retenção |
| valor_liquido | DECIMAL(15,2) | Valor líquido após retenções |
| status | TEXT | `pendente`, `aprovada`, `paga`, `cancelada` |

**Índices:** `obra_id`, `status`, `mes_referencia`, composto `(obra_id, status)`

---

### `composicao_contrato`
Estrutura e distribuição de valores do contrato.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT (PK) | ID do item |
| obra_id | TEXT | FK → obras.id |
| nome | TEXT | Nome do item de composição |
| percentual | DECIMAL(5,2) | Percentual sobre o total |
| valor_previsto | DECIMAL(15,2) | Valor previsto |
| tipo | TEXT | `despesa`, `receita`, `retencao` |
| categorias_lancamento | TEXT[] | Array de categorias associadas |

---

### `pedidos_pre_aprovados`
Pedidos pré-aprovados para compras.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT (PK) | ID do pedido |
| obra_id | TEXT | FK → obras.id |
| pre_pedido_ref | TEXT (UNIQUE) | Referência do pré-pedido |
| fornecedor | TEXT | Fornecedor |
| descricao | TEXT | Descrição |
| valor_previsto | DECIMAL(15,2) | Valor estimado |
| peso_previsto | DECIMAL(10,2) | Peso estimado (kg) |
| status | TEXT | `pendente`, `aprovado`, `em_pedido`, `entregue`, `cancelado` |

---

### `estoque`
Controle de estoque e materiais.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT (PK) | ID do item |
| codigo | TEXT | Código SKU |
| descricao | TEXT | Descrição do material |
| quantidade | DECIMAL(10,2) | Quantidade em estoque |
| unidade | TEXT | Unidade (UN, KG, M, etc.) |
| minimo | DECIMAL(10,2) | Quantidade mínima para reposição |
| localizacao | TEXT | Local de armazenamento |
| obra_id | TEXT | FK → obras.id |

---

### `diario_producao`
Registro diário de atividades e produção.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT (PK) | ID do registro |
| data | DATE | Data do registro |
| obra | TEXT | Nome/ID da obra |
| turno | TEXT | `normal`, `noturno`, `integral` |
| encarregado | TEXT | Nome do encarregado |
| pecas_produzidas | INT | Quantidade de peças |
| horas_trabalhadas | DECIMAL(5,2) | Horas totais |
| eficiencia | DECIMAL(5,2) | Percentual 0-100 |
| atividades | JSONB | `{atividade, duracao, responsavel}` |
| ocorrencias | TEXT[] | Array de ocorrências |
| equipamentos | TEXT[] | Equipamentos utilizados |

---

## Views (Visualizações)

### `v_dashboard_financeiro`
Resumo financeiro por obra com receitas, despesas e lucro estimado.

### `v_funcionarios_completo`
Funcionários com equipes e obras associadas (JOIN completo).

### `v_analise_custos_categoria`
Análise de custos detalhada por categoria de lançamento.

### `v_equipes_alocacao`
Alocação de equipes nas obras com contagem de membros.

---

## Row Level Security (RLS)

Todas as tabelas principais têm RLS habilitado. As políticas seguem a hierarquia:

| Role | Obras | Funcionários | Equipes | Lançamentos | Medições | Usuários |
|------|-------|-------------|---------|-------------|----------|----------|
| admin | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD |
| gestor | RU | R | R | R | R | - |
| operador | R | R | - | RI | - | - |
| visualizador | R | R | - | R | - | - |

**Legenda:** C=Create, R=Read, U=Update, D=Delete, I=Insert

---

## Migrations

| Arquivo | Descrição |
|---------|-----------|
| `supabase/schema.sql` | Schema completo (todas as tabelas, views, RLS, índices) |
| `supabase/migration_v2.sql` | Segunda migração |
| `supabase/migration_v3.sql` | Terceira migração |
| `supabase/migration_v4_users.sql` | Tabela de usuários e roles |
| `supabase/migration_v5_enable_rls.sql` | Habilitação de RLS em todas as tabelas |
| `supabase/migration_v6_improvements.sql` | Melhorias gerais de performance |
| `supabase/seed.sql` | Dados iniciais para desenvolvimento |

---

## RPCs (Remote Procedure Calls)

| Função | Parâmetros | Retorno |
|--------|-----------|---------|
| `get_total_despesas_pagas` | `p_obra_id` | `DECIMAL` - Total de despesas pagas |
| `get_dashboard_resumo` | `p_obra_id` | `JSON` - Resumo financeiro/operacional |

---

## Camada de Serviços (`src/services/api.js`)

Todos os serviços implementam padrão fallback: Supabase em produção, dados locais em desenvolvimento.

| Serviço | Métodos |
|---------|---------|
| `obrasService` | `getAll()`, `getById(id)`, `update(id, data)` |
| `funcionariosService` | `getAll()`, `getById(id)`, `create(data)`, `update(id, data)`, `delete(id)`, `getAtivos()` |
| `equipesService` | `getAll()`, `getById(id)` |
| `lancamentosService` | `getAll(obraId?)`, `create(data)`, `update(id, data)`, `getPagos(obraId)`, `getTotalPago(obraId)` |
| `medicoesService` | `getAll(obraId?)`, `create(data)` |
| `composicaoService` | `get(obraId)` |
| `pedidosService` | `getAll(obraId?)` |
| `diarioService` | `getByDate(data)`, `create(data)` |
| `dashboardService` | `getResumo(obraId)` |
