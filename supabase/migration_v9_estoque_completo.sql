-- ============================================================
-- MIGRATION V9 - Estoque completo com campos para matching + baixa automática
-- ============================================================

-- 1. Adicionar colunas faltantes em estoque
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS pedido NUMERIC(10,2) DEFAULT 0;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS comprado NUMERIC(10,2) DEFAULT 0;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS falta NUMERIC(10,2) DEFAULT 0;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS maximo NUMERIC(10,2) DEFAULT 0;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS preco NUMERIC(10,2) DEFAULT 0;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS ultima_entrada DATE;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS ultima_saida DATE;

-- 2. Adicionar colunas faltantes em movimentacoes_estoque
ALTER TABLE movimentacoes_estoque ADD COLUMN IF NOT EXISTS material_perfil TEXT;
ALTER TABLE movimentacoes_estoque ADD COLUMN IF NOT EXISTS peca_id TEXT;
ALTER TABLE movimentacoes_estoque ADD COLUMN IF NOT EXISTS unidade TEXT DEFAULT 'kg';
ALTER TABLE movimentacoes_estoque ADD COLUMN IF NOT EXISTS usuario TEXT;

-- 3. UPSERT dos 32 itens reais de estoque (SUPER LUNA BELO VALE)
-- Executado diretamente no Supabase SQL Editor
