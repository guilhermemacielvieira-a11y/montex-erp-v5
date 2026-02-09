-- MONTEX ERP - Seed File
-- Arquivo de população inicial do banco de dados PostgreSQL no Supabase
-- Data de geração: 2026-02-09
-- Sistema: MONTEX ERP V5 DEPLOY

-- ============================================================================
-- 1. TABELA: obras
-- Descrição: Registro de obras/contratos do grupo Montex
-- ============================================================================
INSERT INTO obras (id, nome, codigo, cliente, contrato_valor_total, contrato_peso_total, contrato_prazo_meses, data_inicio, data_prevista_fim, status) VALUES
('obra-001', 'SUPER LUNA - BELO VALE', '2026-01', 'Cliente Super Luna Ltda', 2700000.00, 107000, 8, '2025-12-01', '2026-07-31', 'ativo');

-- ============================================================================
-- 2. TABELA: equipes
-- Descrição: Equipes de trabalho (inicialmente sem líder para evitar FK constraint)
-- Nota: lider_id será atualizado após inserção de funcionários
-- ============================================================================
INSERT INTO equipes (id, nome, tipo, obra_atual_id) VALUES
('EQP001', 'Equipe Fábrica', 'producao', 'obra-001'),
('EQP002', 'Equipe Pintura', 'pintura', 'obra-001'),
('EQP003', 'Equipe Montagem Campo', 'montagem', 'obra-001'),
('EQP004', 'Equipe Montagem Interior', 'montagem', 'obra-001');

-- ============================================================================
-- 3. TABELA: funcionarios
-- Descrição: Todos os funcionários da MONTEX com seus dados cadastrais
-- Total de registros: 22 funcionários
-- ============================================================================
INSERT INTO funcionarios (id, nome, cargo, setor, equipe_id, salario, admissao, ativo) VALUES
('FUNC001', 'Cristiane Vieira', 'Auxiliar de Serviços Gerais', 'geral', NULL, 3322.00, '2023-01-15', true),
('FUNC002', 'Diego Alves da Silva', 'Montador I', 'montagem', 'EQP003', 4628.00, '2022-06-01', true),
('FUNC003', 'David Barbosa de Souza', 'Coordenador de Produção', 'producao', 'EQP001', 4388.00, '2019-03-10', true),
('FUNC004', 'Eder Bruno Silva Ferreira', 'Montador I', 'montagem', 'EQP003', 5217.00, '2022-08-15', true),
('FUNC005', 'Derlei Gobbi', 'Montador I', 'montagem', 'EQP003', 3500.00, '2021-11-20', true),
('FUNC006', 'Erick Welison Hosni de Paula', 'Meio Oficial de Montador', 'montagem', 'EQP003', 2800.00, '2023-02-01', true),
('FUNC007', 'Flavio da Cruz', 'Instalador Esquadrias Alumínio', 'fabricacao', 'EQP001', 6623.00, '2020-05-10', true),
('FUNC008', 'Flavio de Jesus Santos', 'Líder de Produção', 'producao', 'EQP001', 5559.00, '2018-09-01', true),
('FUNC009', 'Gilmar Sousa da Silva', 'Soldador II', 'solda', 'EQP001', 6411.00, '2017-06-15', true),
('FUNC010', 'Gabriel Ferreira Santos', 'Montador I', 'montagem', 'EQP003', 4628.00, '2022-04-20', true),
('FUNC011', 'Jeferson Bruno de O. Costa', 'Montador III', 'montagem', 'EQP003', 6833.00, '2019-08-10', true),
('FUNC012', 'João Ermelindo Soares', 'Serralheiro de Alumínio', 'fabricacao', 'EQP001', 9776.00, '2018-11-05', true),
('FUNC013', 'João Batista Alves Rodrigues', 'Ajudante de Montagem', 'montagem', 'EQP003', 2100.00, '2023-05-15', true),
('FUNC014', 'José Eduardo Lucas', 'Meio Oficial de Montador', 'montagem', 'EQP004', 4628.00, '2022-10-01', true),
('FUNC015', 'Juscelio Rodrigues de Souza', 'Soldador I', 'solda', 'EQP001', 5440.00, '2020-02-20', true),
('FUNC016', 'Juscelio Rodrigues', 'Montador III', 'montagem', 'EQP003', 6245.00, '2018-04-10', true),
('FUNC017', 'Luiz Barbosa Ferrera', 'Soldador I', 'solda', 'EQP001', 5440.00, '2019-07-15', true),
('FUNC018', 'Ricardo Alves Pereira', 'Caldeireiro Montador', 'fabricacao', 'EQP001', 7881.00, '2017-09-01', true),
('FUNC019', 'Tarcísio Vieira de Almeida', 'Almoxarife', 'geral', NULL, 3496.00, '2021-03-10', true),
('FUNC020', 'Waldercy Miranda', 'Montador II', 'montagem', 'EQP003', 6245.00, '2019-12-05', true),
('FUNC021', 'Wendel Gabriel Alves dos Reis', 'Meio Oficial de Montador', 'montagem', 'EQP004', 3496.00, '2023-03-20', true),
('FUNC022', 'Whashington de Oliveira', 'Encarregado de Campo II', 'producao', 'EQP003', 7096.00, '2016-11-15', true);

-- ============================================================================
-- 4. ATUALIZAR: equipes com lider_id
-- Descrição: Agora que os funcionários existem, atualiza os líderes das equipes
-- ============================================================================
UPDATE equipes SET lider_id = 'FUNC003' WHERE id = 'EQP001';
UPDATE equipes SET lider_id = 'FUNC008' WHERE id = 'EQP002';
UPDATE equipes SET lider_id = 'FUNC022' WHERE id = 'EQP003';
UPDATE equipes SET lider_id = 'FUNC011' WHERE id = 'EQP004';

-- ============================================================================
-- 5. TABELA: equipe_membros
-- Descrição: Relacionamento muitos-para-muitos entre equipes e funcionários
-- EQP001 (Equipe Fábrica): 8 membros
-- EQP002 (Equipe Pintura): 2 membros (a serem adicionados manualmente se necessário)
-- EQP003 (Equipe Montagem Campo): 10 membros
-- EQP004 (Equipe Montagem Interior): 2 membros
-- ============================================================================
-- Equipe Fábrica (EQP001)
INSERT INTO equipe_membros (equipe_id, funcionario_id) VALUES
('EQP001', 'FUNC003'),
('EQP001', 'FUNC007'),
('EQP001', 'FUNC008'),
('EQP001', 'FUNC009'),
('EQP001', 'FUNC012'),
('EQP001', 'FUNC015'),
('EQP001', 'FUNC017'),
('EQP001', 'FUNC018');

-- Equipe Montagem Campo (EQP003)
INSERT INTO equipe_membros (equipe_id, funcionario_id) VALUES
('EQP003', 'FUNC002'),
('EQP003', 'FUNC004'),
('EQP003', 'FUNC005'),
('EQP003', 'FUNC006'),
('EQP003', 'FUNC010'),
('EQP003', 'FUNC011'),
('EQP003', 'FUNC013'),
('EQP003', 'FUNC016'),
('EQP003', 'FUNC020'),
('EQP003', 'FUNC022');

-- Equipe Montagem Interior (EQP004)
INSERT INTO equipe_membros (equipe_id, funcionario_id) VALUES
('EQP004', 'FUNC014'),
('EQP004', 'FUNC021');

-- ============================================================================
-- 6. TABELA: lancamentos_despesas
-- Descrição: Registro de todas as despesas da obra (fornecimento de materiais)
-- Total de registros: 10 despesas
-- Todas com status 'pago' e obra_id 'obra-001'
-- Data range: 2026-01-08 até 2026-02-05
-- ============================================================================
INSERT INTO lancamentos_despesas (id, nf_numero, fornecedor, descricao, valor, data_emissao, obra_id, categoria_despesa, status) VALUES
('LANC-001', '70467', 'Gerdau', 'Chapas A36 Lote 1', 29682.98, '2026-01-08', 'obra-001', 'material_estrutura', 'pago'),
('LANC-002', '217946', 'Gerdau', 'Perfis W200', 35302.78, '2026-01-17', 'obra-001', 'material_estrutura', 'pago'),
('LANC-003', '228', 'Tolumax', 'Consumíveis solda/corte', 7202.00, '2026-01-19', 'obra-001', 'consumiveis', 'pago'),
('LANC-004', '218134', 'Gerdau', 'Perfis W250/W310/W410', 87407.98, '2026-01-23', 'obra-001', 'material_estrutura', 'pago'),
('LANC-005', '70742', 'Gerdau', 'Chapas A36 Lote 2', 60922.01, '2026-01-23', 'obra-001', 'material_estrutura', 'pago'),
('LANC-006', '218191', 'Gerdau', 'Perfis Pesados', 212116.32, '2026-01-23', 'obra-001', 'material_estrutura', 'pago'),
('LANC-007', '218103', 'Gerdau', 'Perfis Leves', 11329.87, '2026-01-23', 'obra-001', 'material_estrutura', 'pago'),
('LANC-008', '218267', 'Gerdau', 'Barras e Cantoneiras', 28924.92, '2026-01-28', 'obra-001', 'material_estrutura', 'pago'),
('LANC-009', '218614', 'Gerdau', 'Perfis Lote Final', 170695.73, '2026-02-05', 'obra-001', 'material_estrutura', 'pago'),
('LANC-010', '48645', 'Falção Tintas', 'Tintas e Revestimentos', 23515.23, '2026-02-05', 'obra-001', 'consumiveis', 'pago');

-- ============================================================================
-- 7. TABELA: composicao_contrato
-- Descrição: Composição/breakdown do contrato por categoria de trabalho/despesa
-- Total de registros: 6 itens de composição
-- Distribuição do contrato total de R$ 2.700.000,00
-- ============================================================================
INSERT INTO composicao_contrato (id, obra_id, tipo_item, percentual, valor_item, natureza, categorias_despesa) VALUES
('comp-001', 'obra-001', 'FORNECEDOR (Material)', 50.00, 1350000.00, 'despesa', ARRAY['material_estrutura', 'consumiveis']),
('comp-002', 'obra-001', 'FABRICAÇÃO', 25.00, 675000.00, 'receita', ARRAY['fabricacao']),
('comp-003', 'obra-001', 'MONTAGEM', 15.00, 405000.00, 'receita', ARRAY['montagem']),
('comp-004', 'obra-001', 'ENTRADA 1/2', 5.00, 135000.00, 'receita', ARRAY['entrada']),
('comp-005', 'obra-001', 'CHAPARIA', 5.00, 135000.00, 'receita', ARRAY['chaparia']),
('comp-006', 'obra-001', 'RETENÇÃO 5%', 5.00, 135000.00, 'retencao', ARRAY['retencao']);

-- ============================================================================
-- 8. TABELA: pedidos_pre_aprovados
-- Descrição: Pedidos/saldos pendentes de fornecedores
-- Total de registros: 2 pedidos
-- ============================================================================
INSERT INTO pedidos_pre_aprovados (id, descricao, valor_saldo, status_pedido) VALUES
('PPA-001', 'Saldo pendente Chapas Lote 2', 2180.95, 'aguardando_entrega'),
('PPA-002', 'Saldo pendente OV Perfis', 106503.56, 'aguardando_entrega');

-- ============================================================================
-- FIM DO SEED FILE
-- Totalizações de Dados Inseridos:
-- - Obras: 1
-- - Funcionários: 22
-- - Equipes: 4
-- - Membros de Equipes: 12 relacionamentos
-- - Lançamentos de Despesas: 10
-- - Composição de Contrato: 6 itens
-- - Pedidos Pré-Aprovados: 2
-- ============================================================================
