-- ============================================================
-- MIGRATION V7 - Rastreamento de Funcionários na Produção
-- ============================================================
-- Adiciona vinculação de funcionários a cada etapa de produção
-- com registro de datas de início/término e histórico completo.
-- ============================================================

-- 1. MATERIAIS_CORTE: adicionar coluna de funcionário
ALTER TABLE materiais_corte ADD COLUMN IF NOT EXISTS funcionario_corte TEXT;

-- 2. PECAS_PRODUCAO: adicionar colunas de funcionário e timestamps por etapa
ALTER TABLE pecas_producao ADD COLUMN IF NOT EXISTS funcionario_fabricacao TEXT;
ALTER TABLE pecas_producao ADD COLUMN IF NOT EXISTS funcionario_solda TEXT;
ALTER TABLE pecas_producao ADD COLUMN IF NOT EXISTS funcionario_pintura TEXT;
ALTER TABLE pecas_producao ADD COLUMN IF NOT EXISTS funcionario_expedido TEXT;

ALTER TABLE pecas_producao ADD COLUMN IF NOT EXISTS data_inicio_fabricacao TIMESTAMPTZ;
ALTER TABLE pecas_producao ADD COLUMN IF NOT EXISTS data_fim_fabricacao TIMESTAMPTZ;
ALTER TABLE pecas_producao ADD COLUMN IF NOT EXISTS data_inicio_solda TIMESTAMPTZ;
ALTER TABLE pecas_producao ADD COLUMN IF NOT EXISTS data_fim_solda TIMESTAMPTZ;
ALTER TABLE pecas_producao ADD COLUMN IF NOT EXISTS data_inicio_pintura TIMESTAMPTZ;
ALTER TABLE pecas_producao ADD COLUMN IF NOT EXISTS data_fim_pintura TIMESTAMPTZ;

-- 3. TABELA DE HISTÓRICO DE PRODUÇÃO
CREATE TABLE IF NOT EXISTS producao_historico (
    id TEXT PRIMARY KEY DEFAULT ('HIST-' || substr(md5(random()::text), 1, 12)),
    peca_id TEXT NOT NULL,
    etapa_de TEXT NOT NULL,
    etapa_para TEXT NOT NULL,
    funcionario_id TEXT,
    funcionario_nome TEXT,
    data_inicio TIMESTAMPTZ DEFAULT NOW(),
    data_fim TIMESTAMPTZ,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_producao_historico_peca ON producao_historico(peca_id);
CREATE INDEX IF NOT EXISTS idx_producao_historico_funcionario ON producao_historico(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_producao_historico_data ON producao_historico(data_inicio);

-- RLS (se habilitado)
ALTER TABLE producao_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "producao_historico_all" ON producao_historico FOR ALL USING (true) WITH CHECK (true);
