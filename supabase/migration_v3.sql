-- ============================================
-- MONTEX ERP V5 - Migração V3
-- Criação de 14 tabelas faltantes
-- Referenciadas por supabaseClient.js e ERPContext
-- ============================================

-- 1. ORCAMENTOS
CREATE TABLE IF NOT EXISTS orcamentos (
  id TEXT PRIMARY KEY DEFAULT ('ORC-' || EXTRACT(EPOCH FROM NOW())::TEXT),
  numero TEXT,
  cliente_id TEXT,
  obra_id TEXT REFERENCES obras(id) ON DELETE SET NULL,
  cliente_nome TEXT,
  status TEXT DEFAULT 'rascunho',
  data_criacao DATE DEFAULT CURRENT_DATE,
  data_aprovacao DATE,
  validade_ate DATE,
  versao INT DEFAULT 1,
  itens JSONB DEFAULT '[]',
  valor_total DECIMAL(15,2) DEFAULT 0,
  condicoes_pagamento TEXT,
  prazo_entrega TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LISTAS_MATERIAL
CREATE TABLE IF NOT EXISTS listas_material (
  id TEXT PRIMARY KEY DEFAULT ('LST-' || EXTRACT(EPOCH FROM NOW())::TEXT),
  obra_id TEXT REFERENCES obras(id) ON DELETE CASCADE,
  nome TEXT,
  tipo TEXT DEFAULT 'resumo_material',
  data_importacao DATE DEFAULT CURRENT_DATE,
  arquivo TEXT,
  itens JSONB DEFAULT '[]',
  peso_total DECIMAL(12,2) DEFAULT 0,
  peso_chaparia DECIMAL(12,2) DEFAULT 0,
  total_pecas INT DEFAULT 0,
  tipos_pecas INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PECAS_PRODUCAO
CREATE TABLE IF NOT EXISTS pecas_producao (
  id TEXT PRIMARY KEY DEFAULT ('PEC-' || EXTRACT(EPOCH FROM NOW())::TEXT),
  obra_id TEXT REFERENCES obras(id) ON DELETE CASCADE,
  obra_nome TEXT,
  codigo TEXT,
  nome TEXT NOT NULL,
  tipo TEXT,
  marca TEXT,
  perfil TEXT,
  material TEXT,
  quantidade INT DEFAULT 1,
  quantidade_produzida INT DEFAULT 0,
  comprimento DECIMAL(10,2),
  peso_unitario DECIMAL(10,2),
  peso_total DECIMAL(10,2),
  etapa TEXT DEFAULT 'aguardando',
  status TEXT DEFAULT 'pendente',
  status_corte TEXT DEFAULT 'aguardando',
  percentual_conclusao INT DEFAULT 0,
  responsavel TEXT,
  equipe_id TEXT,
  data_inicio DATE,
  data_fim_prevista DATE,
  data_fim_real DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COMPRAS
CREATE TABLE IF NOT EXISTS compras (
  id TEXT PRIMARY KEY DEFAULT ('CMP-' || EXTRACT(EPOCH FROM NOW())::TEXT),
  obra_id TEXT REFERENCES obras(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  fornecedor TEXT,
  valor_previsto DECIMAL(15,2),
  valor_real DECIMAL(15,2),
  status TEXT DEFAULT 'pendente',
  data_pedido DATE DEFAULT CURRENT_DATE,
  data_previsao DATE,
  data_entrega DATE,
  nota_fiscal TEXT,
  itens JSONB DEFAULT '[]',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. NOTAS_FISCAIS
CREATE TABLE IF NOT EXISTS notas_fiscais (
  id TEXT PRIMARY KEY DEFAULT ('NF-' || EXTRACT(EPOCH FROM NOW())::TEXT),
  obra_id TEXT REFERENCES obras(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  fornecedor TEXT,
  tipo TEXT DEFAULT 'entrada',
  valor DECIMAL(15,2),
  data_emissao DATE DEFAULT CURRENT_DATE,
  data_entrada DATE,
  status TEXT DEFAULT 'pendente',
  itens JSONB DEFAULT '[]',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MOVIMENTACOES_ESTOQUE
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id TEXT PRIMARY KEY DEFAULT ('MOV-' || EXTRACT(EPOCH FROM NOW())::TEXT),
  item_id TEXT,
  obra_id TEXT REFERENCES obras(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'entrada',
  quantidade DECIMAL(10,2),
  peso DECIMAL(10,2),
  motivo TEXT,
  responsavel TEXT,
  nota_fiscal TEXT,
  setor TEXT,
  data TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MAQUINAS
CREATE TABLE IF NOT EXISTS maquinas (
  id TEXT PRIMARY KEY DEFAULT ('MAQ-' || EXTRACT(EPOCH FROM NOW())::TEXT),
  nome TEXT NOT NULL,
  tipo TEXT,
  status TEXT DEFAULT 'disponivel',
  operador TEXT,
  ultima_manutencao DATE,
  proxima_manutencao DATE,
  horas_uso DECIMAL(8,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. MEDICOES (diferente de medicoes_receitas - esta é medições de produção)
CREATE TABLE IF NOT EXISTS medicoes (
  id TEXT PRIMARY KEY DEFAULT ('MED-' || EXTRACT(EPOCH FROM NOW())::TEXT),
  obra_id TEXT REFERENCES obras(id) ON DELETE CASCADE,
  tipo TEXT DEFAULT 'producao',
  data_medicao DATE DEFAULT CURRENT_DATE,
  responsavel TEXT,
  peso_medido DECIMAL(10,2),
  area_medida DECIMAL(10,2),
  percentual DECIMAL(5,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PEDIDOS_MATERIAL
CREATE TABLE IF NOT EXISTS pedidos_material (
  id TEXT PRIMARY KEY DEFAULT ('PM-' || EXTRACT(EPOCH FROM NOW())::TEXT),
  obra_id TEXT REFERENCES obras(id) ON DELETE CASCADE,
  descricao TEXT,
  material TEXT,
  perfil TEXT,
  quantidade DECIMAL(10,2),
  unidade TEXT DEFAULT 'kg',
  peso_previsto DECIMAL(10,2),
  peso_comprado DECIMAL(10,2) DEFAULT 0,
  peso_entregue DECIMAL(10,2) DEFAULT 0,
  peso_falta DECIMAL(10,2) DEFAULT 0,
  fornecedor TEXT,
  status TEXT DEFAULT 'previsto',
  data_pedido DATE,
  data_entrega DATE,
  nota_fiscal TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CROQUIS
CREATE TABLE IF NOT EXISTS croquis (
  id TEXT PRIMARY KEY DEFAULT ('CRQ-' || EXTRACT(EPOCH FROM NOW())::TEXT),
  obra_id TEXT REFERENCES obras(id) ON DELETE CASCADE,
  marca TEXT,
  tipo TEXT,
  arquivo_url TEXT,
  status TEXT DEFAULT 'pendente',
  responsavel TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. DETALHAMENTOS
CREATE TABLE IF NOT EXISTS detalhamentos (
  id TEXT PRIMARY KEY DEFAULT ('DET-' || EXTRACT(EPOCH FROM NOW())::TEXT),
  obra_id TEXT REFERENCES obras(id) ON DELETE CASCADE,
  numero TEXT,
  tipo TEXT,
  arquivo_url TEXT,
  status TEXT DEFAULT 'pendente',
  responsavel TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. EXPEDICOES
CREATE TABLE IF NOT EXISTS expedicoes (
  id TEXT PRIMARY KEY DEFAULT ('EXP-' || EXTRACT(EPOCH FROM NOW())::TEXT),
  obra_id TEXT REFERENCES obras(id) ON DELETE CASCADE,
  numero_romaneio TEXT,
  data_expedicao DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'preparando',
  transportadora TEXT,
  motorista TEXT,
  placa TEXT,
  peso_total DECIMAL(10,2),
  pecas JSONB DEFAULT '[]',
  destino TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. CONFIG_MEDICAO
CREATE TABLE IF NOT EXISTS config_medicao (
  id TEXT PRIMARY KEY DEFAULT 'config-padrao',
  tipo TEXT DEFAULT 'padrao',
  peso_total_contrato DECIMAL(12,2),
  etapas JSONB DEFAULT '[]',
  percentuais JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. TAREFAS
CREATE TABLE IF NOT EXISTS tarefas (
  id TEXT PRIMARY KEY DEFAULT ('TAR-' || EXTRACT(EPOCH FROM NOW())::TEXT),
  obra_id TEXT REFERENCES obras(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  responsavel TEXT,
  prioridade TEXT DEFAULT 'media',
  status TEXT DEFAULT 'pendente',
  data_inicio DATE,
  data_fim DATE,
  data_conclusao DATE,
  tags JSONB DEFAULT '[]',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_orcamentos_obra ON orcamentos(obra_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos(status);
CREATE INDEX IF NOT EXISTS idx_listas_material_obra ON listas_material(obra_id);
CREATE INDEX IF NOT EXISTS idx_pecas_producao_obra ON pecas_producao(obra_id);
CREATE INDEX IF NOT EXISTS idx_pecas_producao_etapa ON pecas_producao(etapa);
CREATE INDEX IF NOT EXISTS idx_pecas_producao_status ON pecas_producao(status);
CREATE INDEX IF NOT EXISTS idx_compras_obra ON compras(obra_id);
CREATE INDEX IF NOT EXISTS idx_compras_status ON compras(status);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_obra ON notas_fiscais(obra_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_obra ON movimentacoes_estoque(obra_id);
CREATE INDEX IF NOT EXISTS idx_maquinas_status ON maquinas(status);
CREATE INDEX IF NOT EXISTS idx_medicoes_obra ON medicoes(obra_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_material_obra ON pedidos_material(obra_id);
CREATE INDEX IF NOT EXISTS idx_expedicoes_obra ON expedicoes(obra_id);
CREATE INDEX IF NOT EXISTS idx_expedicoes_status ON expedicoes(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_obra ON tarefas(obra_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);

-- ============================================
-- DESABILITAR RLS (desenvolvimento)
-- ============================================

ALTER TABLE orcamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE listas_material DISABLE ROW LEVEL SECURITY;
ALTER TABLE pecas_producao DISABLE ROW LEVEL SECURITY;
ALTER TABLE compras DISABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque DISABLE ROW LEVEL SECURITY;
ALTER TABLE maquinas DISABLE ROW LEVEL SECURITY;
ALTER TABLE medicoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_material DISABLE ROW LEVEL SECURITY;
ALTER TABLE croquis DISABLE ROW LEVEL SECURITY;
ALTER TABLE detalhamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE expedicoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE config_medicao DISABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas DISABLE ROW LEVEL SECURITY;

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE TRIGGER update_orcamentos_updated_at BEFORE UPDATE ON orcamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listas_material_updated_at BEFORE UPDATE ON listas_material FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pecas_producao_updated_at BEFORE UPDATE ON pecas_producao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compras_updated_at BEFORE UPDATE ON compras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notas_fiscais_updated_at BEFORE UPDATE ON notas_fiscais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_movimentacoes_estoque_updated_at BEFORE UPDATE ON movimentacoes_estoque FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maquinas_updated_at BEFORE UPDATE ON maquinas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medicoes_updated_at BEFORE UPDATE ON medicoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pedidos_material_updated_at BEFORE UPDATE ON pedidos_material FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_croquis_updated_at BEFORE UPDATE ON croquis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_detalhamentos_updated_at BEFORE UPDATE ON detalhamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expedicoes_updated_at BEFORE UPDATE ON expedicoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_config_medicao_updated_at BEFORE UPDATE ON config_medicao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tarefas_updated_at BEFORE UPDATE ON tarefas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
