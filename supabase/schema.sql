-- ============================================================================
-- MONTEX ERP V5 - Schema PostgreSQL
-- Estrutura completa do banco de dados para o Sistema de Gestão
-- ============================================================================

-- ============================================================================
-- EXTENSÕES NECESSÁRIAS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================================

-- Função para atualizar o timestamp updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- TABELAS PRINCIPAIS
-- ============================================================================

-- Tabela de Usuários (Roles e controle de acesso)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'visualizador' CHECK (role IN ('admin', 'gestor', 'operador', 'visualizador')),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE usuarios IS 'Tabela de usuários do sistema com controle de papéis (roles)';
COMMENT ON COLUMN usuarios.id IS 'ID do usuário (referência ao auth.users do Supabase)';
COMMENT ON COLUMN usuarios.role IS 'Papel do usuário: admin (total acesso), gestor (gerenciamento), operador (registro de dados), visualizador (apenas leitura)';

-- Tabela de Obras/Projetos
CREATE TABLE IF NOT EXISTS obras (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    codigo TEXT NOT NULL UNIQUE,
    cliente TEXT,
    contrato_valor_total DECIMAL(15,2),
    contrato_peso_total DECIMAL(10,2),
    contrato_prazo_meses INT,
    data_inicio DATE,
    data_prevista_fim DATE,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'pausado', 'cancelado')),
    endereco JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE obras IS 'Tabela de projetos/obras de construção da Montex';
COMMENT ON COLUMN obras.id IS 'ID único da obra (identificador da estrutura)';
COMMENT ON COLUMN obras.codigo IS 'Código da obra para referência rápida';
COMMENT ON COLUMN obras.contrato_valor_total IS 'Valor total do contrato em R$';
COMMENT ON COLUMN obras.contrato_peso_total IS 'Peso total de estrutura metálica prevista em toneladas';
COMMENT ON COLUMN obras.endereco IS 'Endereço da obra em formato JSON {rua, numero, cidade, estado, cep}';
COMMENT ON COLUMN obras.status IS 'Status atual da obra: ativo, concluido, pausado ou cancelado';

CREATE TRIGGER update_obras_updated_at BEFORE UPDATE ON obras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_obras_status ON obras(status);
CREATE INDEX idx_obras_data_inicio ON obras(data_inicio);
CREATE INDEX idx_obras_cliente ON obras(cliente);


-- Tabela de Equipes
CREATE TABLE IF NOT EXISTS equipes (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'producao' CHECK (tipo IN ('producao', 'pintura', 'montagem')),
    lider_id TEXT,
    obra_atual_id TEXT REFERENCES obras(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE equipes IS 'Tabela de equipes de trabalho';
COMMENT ON COLUMN equipes.id IS 'ID da equipe (EQP001, EQP002, etc)';
COMMENT ON COLUMN equipes.tipo IS 'Tipo de equipe: producao, pintura ou montagem';
COMMENT ON COLUMN equipes.lider_id IS 'ID do funcionário líder da equipe';
COMMENT ON COLUMN equipes.obra_atual_id IS 'ID da obra em que a equipe está trabalhando atualmente';

CREATE TRIGGER update_equipes_updated_at BEFORE UPDATE ON equipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_equipes_tipo ON equipes(tipo);
CREATE INDEX idx_equipes_obra_atual_id ON equipes(obra_atual_id);


-- Tabela de Funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cargo TEXT,
    setor TEXT DEFAULT 'geral' CHECK (setor IN ('montagem', 'solda', 'fabricacao', 'producao', 'geral')),
    equipe_id TEXT REFERENCES equipes(id) ON DELETE SET NULL,
    salario DECIMAL(10,2),
    admissao DATE,
    ativo BOOLEAN DEFAULT true,
    cpf TEXT UNIQUE,
    email TEXT,
    telefone TEXT,
    jornada TEXT DEFAULT '44h',
    contrato TEXT DEFAULT 'CLT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE funcionarios IS 'Tabela de funcionários e colaboradores';
COMMENT ON COLUMN funcionarios.id IS 'ID do funcionário (FUNC001, FUNC002, etc)';
COMMENT ON COLUMN funcionarios.setor IS 'Setor de atuação: montagem, solda, fabricacao, producao ou geral';
COMMENT ON COLUMN funcionarios.jornada IS 'Jornada de trabalho em horas (padrão 44h)';
COMMENT ON COLUMN funcionarios.contrato IS 'Tipo de contrato: CLT, PJ, etc';

CREATE TRIGGER update_funcionarios_updated_at BEFORE UPDATE ON funcionarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_funcionarios_setor ON funcionarios(setor);
CREATE INDEX idx_funcionarios_ativo ON funcionarios(ativo);
CREATE INDEX idx_funcionarios_equipe_id ON funcionarios(equipe_id);
CREATE INDEX idx_funcionarios_cpf ON funcionarios(cpf);


-- Tabela de Membros da Equipe (Relacionamento Many-to-Many)
CREATE TABLE IF NOT EXISTS equipe_membros (
    equipe_id TEXT NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
    funcionario_id TEXT NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
    data_inicio DATE DEFAULT CURRENT_DATE,
    data_fim DATE,
    PRIMARY KEY (equipe_id, funcionario_id)
);

COMMENT ON TABLE equipe_membros IS 'Tabela de relacionamento entre equipes e funcionários';
COMMENT ON COLUMN equipe_membros.data_inicio IS 'Data de entrada do funcionário na equipe';
COMMENT ON COLUMN equipe_membros.data_fim IS 'Data de saída do funcionário da equipe (NULL se ativo)';

CREATE INDEX idx_equipe_membros_funcionario ON equipe_membros(funcionario_id);


-- Tabela de Lançamentos de Despesas
CREATE TABLE IF NOT EXISTS lancamentos_despesas (
    id TEXT PRIMARY KEY,
    obra_id TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'material_faturado' CHECK (tipo IN ('material_faturado', 'despesa', 'mao_de_obra', 'servico')),
    categoria TEXT DEFAULT 'material_estrutura' CHECK (categoria IN ('material_estrutura', 'consumiveis', 'fabricacao', 'montagem', 'transporte', 'mao_obra')),
    descricao TEXT,
    fornecedor TEXT,
    nota_fiscal TEXT,
    valor DECIMAL(15,2) NOT NULL,
    data_emissao DATE,
    data_vencimento DATE,
    data_pagamento DATE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente', 'vencido', 'cancelado')),
    pre_pedido_ref TEXT,
    peso_kg DECIMAL(10,2),
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE lancamentos_despesas IS 'Tabela de lançamentos de despesas e custos das obras';
COMMENT ON COLUMN lancamentos_despesas.id IS 'ID do lançamento (LANC-001, LANC-002, etc)';
COMMENT ON COLUMN lancamentos_despesas.tipo IS 'Tipo de lançamento: material_faturado, despesa, mao_de_obra ou servico';
COMMENT ON COLUMN lancamentos_despesas.categoria IS 'Categoria para detalhamento: material_estrutura, consumiveis, fabricacao, montagem, transporte ou mao_obra';
COMMENT ON COLUMN lancamentos_despesas.status IS 'Status do pagamento: pago, pendente, vencido ou cancelado';
COMMENT ON COLUMN lancamentos_despesas.pre_pedido_ref IS 'Referência ao pré-pedido aprovado';

CREATE TRIGGER update_lancamentos_despesas_updated_at BEFORE UPDATE ON lancamentos_despesas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_lancamentos_despesas_obra_id ON lancamentos_despesas(obra_id);
CREATE INDEX idx_lancamentos_despesas_status ON lancamentos_despesas(status);
CREATE INDEX idx_lancamentos_despesas_data_emissao ON lancamentos_despesas(data_emissao);
CREATE INDEX idx_lancamentos_despesas_categoria ON lancamentos_despesas(categoria);


-- Tabela de Medições/Receitas
CREATE TABLE IF NOT EXISTS medicoes_receitas (
    id TEXT PRIMARY KEY,
    obra_id TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    numero INT NOT NULL,
    mes_referencia TEXT NOT NULL,
    descricao TEXT,
    valor_bruto DECIMAL(15,2) NOT NULL,
    retencao_percentual DECIMAL(5,2) DEFAULT 0,
    retencao_valor DECIMAL(15,2) DEFAULT 0,
    valor_liquido DECIMAL(15,2),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'paga', 'cancelada')),
    data_emissao DATE NOT NULL,
    data_aprovacao DATE,
    data_pagamento DATE,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE medicoes_receitas IS 'Tabela de medições de receita das obras';
COMMENT ON COLUMN medicoes_receitas.numero IS 'Número sequencial da medição';
COMMENT ON COLUMN medicoes_receitas.mes_referencia IS 'Mês de referência da medição (MM/YYYY)';
COMMENT ON COLUMN medicoes_receitas.valor_bruto IS 'Valor bruto da medição antes de retenções';
COMMENT ON COLUMN medicoes_receitas.retencao_percentual IS 'Percentual de retenção (ex: 5%)';
COMMENT ON COLUMN medicoes_receitas.valor_liquido IS 'Valor liquido após retenções';
COMMENT ON COLUMN medicoes_receitas.status IS 'Status da medição: pendente, aprovada, paga ou cancelada';

CREATE TRIGGER update_medicoes_receitas_updated_at BEFORE UPDATE ON medicoes_receitas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_medicoes_receitas_obra_id ON medicoes_receitas(obra_id);
CREATE INDEX idx_medicoes_receitas_status ON medicoes_receitas(status);
CREATE INDEX idx_medicoes_receitas_mes_referencia ON medicoes_receitas(mes_referencia);


-- Tabela de Composição do Contrato
CREATE TABLE IF NOT EXISTS composicao_contrato (
    id TEXT PRIMARY KEY,
    obra_id TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    percentual DECIMAL(5,2),
    valor_previsto DECIMAL(15,2),
    tipo TEXT NOT NULL DEFAULT 'receita' CHECK (tipo IN ('despesa', 'receita', 'retencao')),
    descricao TEXT,
    categorias_lancamento TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE composicao_contrato IS 'Tabela de composição e estrutura dos contratos';
COMMENT ON COLUMN composicao_contrato.nome IS 'Nome do item de composição';
COMMENT ON COLUMN composicao_contrato.percentual IS 'Percentual sobre o contrato total';
COMMENT ON COLUMN composicao_contrato.tipo IS 'Tipo: despesa, receita ou retencao';
COMMENT ON COLUMN composicao_contrato.categorias_lancamento IS 'Array de categorias de lançamentos associadas';

CREATE TRIGGER update_composicao_contrato_updated_at BEFORE UPDATE ON composicao_contrato
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_composicao_contrato_obra_id ON composicao_contrato(obra_id);


-- Tabela de Pré-Pedidos Aprovados
CREATE TABLE IF NOT EXISTS pedidos_pre_aprovados (
    id TEXT PRIMARY KEY,
    obra_id TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    pre_pedido_ref TEXT NOT NULL UNIQUE,
    fornecedor TEXT NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT,
    valor_previsto DECIMAL(15,2) NOT NULL,
    peso_previsto DECIMAL(10,2),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'em_pedido', 'entregue', 'cancelado')),
    data_prevista DATE,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE pedidos_pre_aprovados IS 'Tabela de pré-pedidos aprovados para compras';
COMMENT ON COLUMN pedidos_pre_aprovados.pre_pedido_ref IS 'Referência única do pré-pedido';
COMMENT ON COLUMN pedidos_pre_aprovados.valor_previsto IS 'Valor estimado do pedido';
COMMENT ON COLUMN pedidos_pre_aprovados.peso_previsto IS 'Peso estimado em kg';

CREATE TRIGGER update_pedidos_pre_aprovados_updated_at BEFORE UPDATE ON pedidos_pre_aprovados
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_pedidos_pre_aprovados_obra_id ON pedidos_pre_aprovados(obra_id);
CREATE INDEX idx_pedidos_pre_aprovados_status ON pedidos_pre_aprovados(status);


-- Tabela de Estoque
CREATE TABLE IF NOT EXISTS estoque (
    id TEXT PRIMARY KEY,
    codigo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    tipo TEXT,
    quantidade DECIMAL(10,2) NOT NULL DEFAULT 0,
    unidade TEXT DEFAULT 'UN',
    minimo DECIMAL(10,2) DEFAULT 0,
    localizacao TEXT,
    obra_id TEXT REFERENCES obras(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE estoque IS 'Tabela de controle de estoque e materiais';
COMMENT ON COLUMN estoque.codigo IS 'Código do material (SKU)';
COMMENT ON COLUMN estoque.quantidade IS 'Quantidade em estoque';
COMMENT ON COLUMN estoque.unidade IS 'Unidade de medida (UN, KG, M, etc)';
COMMENT ON COLUMN estoque.minimo IS 'Quantidade mínima para reposição';
COMMENT ON COLUMN estoque.localizacao IS 'Local de armazenamento';

CREATE TRIGGER update_estoque_updated_at BEFORE UPDATE ON estoque
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_estoque_codigo ON estoque(codigo);
CREATE INDEX idx_estoque_obra_id ON estoque(obra_id);


-- Tabela de Diário de Produção
CREATE TABLE IF NOT EXISTS diario_producao (
    id TEXT PRIMARY KEY,
    data DATE NOT NULL,
    obra TEXT NOT NULL,
    turno TEXT DEFAULT 'normal' CHECK (turno IN ('normal', 'noturno', 'integral')),
    encarregado TEXT,
    pecas_produzidas INT DEFAULT 0,
    horas_trabalhadas DECIMAL(5,2),
    eficiencia DECIMAL(5,2),
    atividades JSONB,
    ocorrencias TEXT[],
    observacoes TEXT,
    clima TEXT,
    equipamentos TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE diario_producao IS 'Tabela de registro diário de produção';
COMMENT ON COLUMN diario_producao.data IS 'Data do registro de produção';
COMMENT ON COLUMN diario_producao.turno IS 'Turno de trabalho: normal, noturno ou integral';
COMMENT ON COLUMN diario_producao.pecas_produzidas IS 'Quantidade de peças produzidas';
COMMENT ON COLUMN diario_producao.horas_trabalhadas IS 'Total de horas trabalhadas';
COMMENT ON COLUMN diario_producao.eficiencia IS 'Percentual de eficiência (0-100)';
COMMENT ON COLUMN diario_producao.atividades IS 'Detalhes de atividades em JSON {atividade, duracao, responsavel}';
COMMENT ON COLUMN diario_producao.ocorrencias IS 'Array de ocorrências registradas';
COMMENT ON COLUMN diario_producao.equipamentos IS 'Array de equipamentos utilizados';

CREATE TRIGGER update_diario_producao_updated_at BEFORE UPDATE ON diario_producao
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_diario_producao_data ON diario_producao(data);
CREATE INDEX idx_diario_producao_obra ON diario_producao(obra);


-- ============================================================================
-- VIEWS (VISUALIZAÇÕES)
-- ============================================================================

-- View: Dashboard Financeiro por Obra
CREATE OR REPLACE VIEW v_dashboard_financeiro AS
SELECT
    o.id,
    o.nome,
    o.codigo,
    o.cliente,
    o.contrato_valor_total,
    COALESCE(SUM(CASE WHEN ld.tipo = 'material_faturado' THEN ld.valor ELSE 0 END), 0) as despesa_total,
    COALESCE(SUM(CASE WHEN ld.status = 'pago' THEN ld.valor ELSE 0 END), 0) as despesa_paga,
    COALESCE(SUM(CASE WHEN ld.status IN ('pendente', 'vencido') THEN ld.valor ELSE 0 END), 0) as despesa_pendente,
    COALESCE(SUM(CASE WHEN mr.status IN ('aprovada', 'paga') THEN mr.valor_liquido ELSE 0 END), 0) as receita_total,
    COALESCE(SUM(CASE WHEN mr.status = 'paga' THEN mr.valor_liquido ELSE 0 END), 0) as receita_paga,
    (COALESCE(SUM(CASE WHEN mr.status IN ('aprovada', 'paga') THEN mr.valor_liquido ELSE 0 END), 0) -
     COALESCE(SUM(CASE WHEN ld.tipo = 'material_faturado' THEN ld.valor ELSE 0 END), 0)) as lucro_estimado,
    o.status,
    o.data_inicio,
    o.data_prevista_fim
FROM obras o
LEFT JOIN lancamentos_despesas ld ON o.id = ld.obra_id
LEFT JOIN medicoes_receitas mr ON o.id = mr.obra_id
GROUP BY o.id, o.nome, o.codigo, o.cliente, o.contrato_valor_total, o.status, o.data_inicio, o.data_prevista_fim;

COMMENT ON VIEW v_dashboard_financeiro IS 'View com resumo financeiro de cada obra (receitas, despesas e lucro estimado)';


-- View: Funcionários com Informações de Equipe
CREATE OR REPLACE VIEW v_funcionarios_completo AS
SELECT
    f.id,
    f.nome,
    f.cargo,
    f.setor,
    f.email,
    f.telefone,
    f.salario,
    f.admissao,
    f.ativo,
    f.jornada,
    f.contrato,
    e.id as equipe_id,
    e.nome as equipe_nome,
    e.tipo as equipe_tipo,
    o.id as obra_id,
    o.nome as obra_nome,
    o.codigo as obra_codigo
FROM funcionarios f
LEFT JOIN equipes e ON f.equipe_id = e.id
LEFT JOIN obras o ON e.obra_atual_id = o.id;

COMMENT ON VIEW v_funcionarios_completo IS 'View de funcionários com suas equipes e obras associadas';


-- View: Análise de Custos por Categoria
CREATE OR REPLACE VIEW v_analise_custos_categoria AS
SELECT
    o.id as obra_id,
    o.nome as obra_nome,
    ld.categoria,
    ld.tipo,
    COUNT(*) as quantidade_lancamentos,
    COALESCE(SUM(ld.valor), 0) as valor_total,
    COALESCE(SUM(CASE WHEN ld.status = 'pago' THEN ld.valor ELSE 0 END), 0) as valor_pago,
    COALESCE(SUM(CASE WHEN ld.status IN ('pendente', 'vencido') THEN ld.valor ELSE 0 END), 0) as valor_pendente,
    COALESCE(SUM(ld.peso_kg), 0) as peso_total_kg
FROM obras o
LEFT JOIN lancamentos_despesas ld ON o.id = ld.obra_id
GROUP BY o.id, o.nome, ld.categoria, ld.tipo;

COMMENT ON VIEW v_analise_custos_categoria IS 'View para análise de custos detalhada por categoria de lançamento';


-- View: Status de Equipes e Alocação
CREATE OR REPLACE VIEW v_equipes_alocacao AS
SELECT
    e.id as equipe_id,
    e.nome as equipe_nome,
    e.tipo as equipe_tipo,
    o.id as obra_id,
    o.nome as obra_nome,
    o.status as obra_status,
    COUNT(DISTINCT em.funcionario_id) as total_membros,
    f_lider.nome as lider_nome,
    f_lider.cargo as lider_cargo
FROM equipes e
LEFT JOIN obras o ON e.obra_atual_id = o.id
LEFT JOIN equipe_membros em ON e.id = em.equipe_id AND em.data_fim IS NULL
LEFT JOIN funcionarios f_lider ON e.lider_id = f_lider.id
GROUP BY e.id, e.nome, e.tipo, o.id, o.nome, o.status, f_lider.nome, f_lider.cargo;

COMMENT ON VIEW v_equipes_alocacao IS 'View para visualizar alocação de equipes nas obras';


-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Políticas de Acesso
-- ============================================================================

-- Habilitar RLS nas tabelas principais
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos_despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicoes_receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários ADMIN (acesso total)
CREATE POLICY "Admin pode acessar todas as obras" ON obras
    FOR ALL USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin pode acessar todos os funcionarios" ON funcionarios
    FOR ALL USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin pode acessar todas as equipes" ON equipes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin pode acessar todos os lançamentos" ON lancamentos_despesas
    FOR ALL USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin pode acessar todas as medições" ON medicoes_receitas
    FOR ALL USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin')
    );

-- Políticas para usuários GESTOR (leitura completa, escrita limitada)
CREATE POLICY "Gestor pode ler obras" ON obras
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('gestor', 'admin'))
    );

CREATE POLICY "Gestor pode atualizar obras" ON obras
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('gestor', 'admin'))
    );

-- Políticas para usuários OPERADOR (leitura e inserção limitada)
CREATE POLICY "Operador pode ler obras" ON obras
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('operador', 'gestor', 'admin'))
    );

CREATE POLICY "Operador pode inserir lançamentos" ON lancamentos_despesas
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('operador', 'gestor', 'admin'))
    );

-- Políticas para usuários VISUALIZADOR (apenas leitura)
CREATE POLICY "Visualizador pode ler obras" ON obras
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('visualizador', 'operador', 'gestor', 'admin'))
    );

CREATE POLICY "Visualizador pode ler funcionarios" ON funcionarios
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('visualizador', 'operador', 'gestor', 'admin'))
    );

CREATE POLICY "Visualizador pode ler lançamentos" ON lancamentos_despesas
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role IN ('visualizador', 'operador', 'gestor', 'admin'))
    );

-- Política de acesso à tabela de usuários
CREATE POLICY "Usuários podem ver seu próprio perfil" ON usuarios
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admin pode gerenciar todos os usuários" ON usuarios
    FOR ALL USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'admin')
    );


-- ============================================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ============================================================================

-- Índices para buscas rápidas por obra
CREATE INDEX idx_equipe_membros_data ON equipe_membros(data_inicio, data_fim);

-- Índices para consultas financeiras
CREATE INDEX idx_lancamentos_despesas_obra_data ON lancamentos_despesas(obra_id, data_emissao);
CREATE INDEX idx_medicoes_receitas_obra_data ON medicoes_receitas(obra_id, data_emissao);

-- Índices para buscas de status
CREATE INDEX idx_pedidos_pre_aprovados_referencia ON pedidos_pre_aprovados(pre_pedido_ref);

-- Índice composto para eficiência em dashboard
CREATE INDEX idx_lancamentos_despesas_filtro ON lancamentos_despesas(obra_id, status, tipo);
CREATE INDEX idx_medicoes_receitas_filtro ON medicoes_receitas(obra_id, status);

-- Índice para relatórios de diário
CREATE INDEX idx_diario_producao_periodo ON diario_producao(data, obra);


-- ============================================================================
-- DADOS INICIAIS (OPCIONAL)
-- ============================================================================

-- Você pode descomentar e adaptar para popular dados iniciais

/*
-- Inserir usuário admin inicial
INSERT INTO usuarios (id, nome, email, role)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Administrador',
    'admin@montex.com.br',
    'admin'
) ON CONFLICT DO NOTHING;
*/


-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
-- Schema criado: 09/02/2026
-- Versão: MONTEX ERP V5
-- Compatível com Supabase PostgreSQL
