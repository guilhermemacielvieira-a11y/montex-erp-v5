-- MONTEX ERP - Schema para Supabase
-- Execute este SQL no Supabase SQL Editor

-- ============================================
-- TABELA: CLIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  email TEXT,
  telefone TEXT,
  contato TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  segmento TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- ============================================
-- TABELA: PROJETOS
-- ============================================
CREATE TABLE IF NOT EXISTS projetos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cliente_id UUID REFERENCES clientes(id),
  cliente_nome TEXT,
  tipo TEXT,
  status TEXT DEFAULT 'planejamento',
  localizacao TEXT,
  area DECIMAL,
  peso_estimado DECIMAL,
  valor_contrato DECIMAL,
  custo_por_kg_fabricacao DECIMAL,
  custo_por_kg_montagem DECIMAL,
  data_inicio DATE,
  data_fim_prevista DATE,
  data_fim_real DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- ============================================
-- TABELA: ORÇAMENTOS
-- ============================================
CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT,
  projeto_id UUID REFERENCES projetos(id),
  projeto_nome TEXT,
  cliente_nome TEXT,
  cliente_email TEXT,
  status TEXT DEFAULT 'rascunho',
  area DECIMAL,
  peso_estimado DECIMAL,
  custo_estrutura DECIMAL,
  custo_montagem DECIMAL,
  custo_cobertura DECIMAL,
  custo_transporte DECIMAL,
  custo_total DECIMAL,
  margem_lucro DECIMAL,
  valor_venda DECIMAL,
  preco_por_kg DECIMAL,
  prazo_fabricacao INTEGER,
  prazo_montagem INTEGER,
  validade DATE,
  itens JSONB,
  conteudo_proposta TEXT,
  observacoes_aprovacao TEXT,
  link_aprovacao TEXT,
  data_envio TIMESTAMPTZ,
  data_aprovacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- ============================================
-- TABELA: MOVIMENTAÇÕES FINANCEIRAS
-- ============================================
CREATE TABLE IF NOT EXISTS movimentacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID REFERENCES projetos(id),
  projeto_nome TEXT,
  tipo TEXT NOT NULL, -- 'receita' ou 'despesa'
  categoria TEXT,
  descricao TEXT,
  valor DECIMAL NOT NULL,
  data_movimentacao DATE,
  forma_pagamento TEXT,
  documento_fiscal TEXT,
  status TEXT DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- ============================================
-- TABELA: ITENS DE PRODUÇÃO
-- ============================================
CREATE TABLE IF NOT EXISTS itens_producao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID REFERENCES projetos(id),
  projeto_nome TEXT,
  codigo TEXT,
  nome TEXT NOT NULL,
  marca TEXT,
  quantidade INTEGER DEFAULT 1,
  quantidade_produzida INTEGER DEFAULT 0,
  peso_unitario DECIMAL,
  peso_total DECIMAL,
  etapa TEXT,
  status TEXT DEFAULT 'pendente',
  percentual_conclusao INTEGER DEFAULT 0,
  responsavel TEXT,
  data_inicio DATE,
  data_fim_prevista DATE,
  data_fim_real DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- ============================================
-- TABELA: CUSTOS
-- ============================================
CREATE TABLE IF NOT EXISTS custos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID REFERENCES projetos(id),
  projeto_nome TEXT,
  tipo TEXT,
  categoria TEXT,
  descricao TEXT,
  valor DECIMAL,
  data_custo DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- ============================================
-- TABELA: MATERIAIS/ESTOQUE
-- ============================================
CREATE TABLE IF NOT EXISTS materiais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  unidade TEXT,
  quantidade_estoque DECIMAL DEFAULT 0,
  quantidade_minima DECIMAL DEFAULT 0,
  preco_unitario DECIMAL,
  fornecedor TEXT,
  localizacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- ============================================
-- TABELA: TAREFAS
-- ============================================
CREATE TABLE IF NOT EXISTS tarefas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID REFERENCES projetos(id),
  titulo TEXT NOT NULL,
  descricao TEXT,
  responsavel TEXT,
  prioridade TEXT DEFAULT 'media',
  status TEXT DEFAULT 'pendente',
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- ============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE custos ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS DE ACESSO PÚBLICO (para desenvolvimento)
-- ============================================
CREATE POLICY "Permitir leitura pública" ON clientes FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública" ON clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública" ON clientes FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública" ON clientes FOR DELETE USING (true);

CREATE POLICY "Permitir leitura pública" ON projetos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública" ON projetos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública" ON projetos FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública" ON projetos FOR DELETE USING (true);

CREATE POLICY "Permitir leitura pública" ON orcamentos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública" ON orcamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública" ON orcamentos FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública" ON orcamentos FOR DELETE USING (true);

CREATE POLICY "Permitir leitura pública" ON movimentacoes FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública" ON movimentacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública" ON movimentacoes FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública" ON movimentacoes FOR DELETE USING (true);

CREATE POLICY "Permitir leitura pública" ON itens_producao FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública" ON itens_producao FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública" ON itens_producao FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública" ON itens_producao FOR DELETE USING (true);

CREATE POLICY "Permitir leitura pública" ON custos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública" ON custos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública" ON custos FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública" ON custos FOR DELETE USING (true);

CREATE POLICY "Permitir leitura pública" ON materiais FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública" ON materiais FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública" ON materiais FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública" ON materiais FOR DELETE USING (true);

CREATE POLICY "Permitir leitura pública" ON tarefas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública" ON tarefas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública" ON tarefas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública" ON tarefas FOR DELETE USING (true);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_projetos_status ON projetos(status);
CREATE INDEX IF NOT EXISTS idx_projetos_cliente ON projetos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_projeto ON movimentacoes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_itens_producao_projeto ON itens_producao(projeto_id);
CREATE INDEX IF NOT EXISTS idx_itens_producao_status ON itens_producao(status);
