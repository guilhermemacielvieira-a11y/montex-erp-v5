-- ============================================================
-- MIGRATION V16 — MÓDULO SUPRIMENTOS
-- 1. Tabela FORNECEDORES (cadastro real, antes hardcoded no front)
-- 2. Alinhamento da tabela COMPRAS com os campos usados pelo front
--    (ADD COLUMN IF NOT EXISTS é idempotente — seguro rodar em prod)
-- Rodar no SQL Editor do Supabase.
-- ============================================================

-- 1. FORNECEDORES
CREATE TABLE IF NOT EXISTS fornecedores (
  id TEXT PRIMARY KEY DEFAULT ('FOR-' || EXTRACT(EPOCH FROM NOW())::TEXT),
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  contato TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  categorias JSONB DEFAULT '[]',
  rating DECIMAL(3,1) DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_nome ON fornecedores (nome);

ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "fornecedores_anon_select" ON fornecedores
    FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fornecedores_anon_insert" ON fornecedores
    FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fornecedores_anon_update" ON fornecedores
    FOR UPDATE TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fornecedores_anon_delete" ON fornecedores
    FOR DELETE TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- O app autenticado consulta com role `authenticated` (não anon) —
-- sem estas policies a API retorna 200 com lista vazia (RLS filtra).
-- Aplicado em prod em 2026-06-11 junto com o restante da v16.
DO $$ BEGIN
  CREATE POLICY "fornecedores_auth_select" ON fornecedores
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fornecedores_auth_insert" ON fornecedores
    FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fornecedores_auth_update" ON fornecedores
    FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fornecedores_auth_delete" ON fornecedores
    FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed: fornecedor real que estava hardcoded no front (ComprasPage)
INSERT INTO fornecedores (id, nome, cnpj, telefone, email, contato, cidade, estado, categorias, rating)
VALUES (
  'FOR-GERDAU',
  'Gerdau Aços Longos S.A.',
  '07.358.761/0001-69',
  '(31) 9988-305655',
  'eduardo.acosgrdau@gmail.com',
  'Eduardo Bruno da Purificação',
  'Ouro Branco',
  'MG',
  '["Perfis W","Chapas","Barras","Cantoneiras"]',
  4.9
)
ON CONFLICT DO NOTHING;

-- 2. COMPRAS — garantir colunas usadas pelo frontend (leitura e escrita)
ALTER TABLE compras ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS fornecedor TEXT;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente';
ALTER TABLE compras ADD COLUMN IF NOT EXISTS status_financeiro TEXT DEFAULT 'previsto';
ALTER TABLE compras ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'pre_pedido';
ALTER TABLE compras ADD COLUMN IF NOT EXISTS valor_previsto DECIMAL(15,2);
ALTER TABLE compras ADD COLUMN IF NOT EXISTS valor_real DECIMAL(15,2);
ALTER TABLE compras ADD COLUMN IF NOT EXISTS valor_total DECIMAL(15,2);
ALTER TABLE compras ADD COLUMN IF NOT EXISTS peso_total_kg DECIMAL(12,2);
ALTER TABLE compras ADD COLUMN IF NOT EXISTS documento_origem TEXT;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS condicao_pagamento TEXT;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS urgencia TEXT;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS data_pedido DATE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS data_cotacao DATE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS data_previsao DATE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS data_validade DATE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS data_entrega DATE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS nota_fiscal TEXT;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS itens JSONB DEFAULT '[]';
ALTER TABLE compras ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS obra_id TEXT;

-- ============================================================
-- 3. BACKFILL — ALIMENTAR COM OS DADOS JÁ EM USO (idempotente)
-- ============================================================

-- 3.1 Índice único por nome (case-insensitive) p/ evitar duplicados no backfill
CREATE UNIQUE INDEX IF NOT EXISTS uq_fornecedores_nome_lower
  ON fornecedores (LOWER(TRIM(nome)));

-- 3.2 Popular fornecedores a partir dos dados REAIS já existentes:
--     compras, notas fiscais, pedidos de material e lançamentos de despesas.
--     id determinístico (md5 do nome) → rodar 2x não duplica.
INSERT INTO fornecedores (id, nome, observacoes)
SELECT
  'FOR-' || MD5(LOWER(TRIM(f.nome))),
  TRIM(f.nome),
  'Importado automaticamente de ' || f.origem || ' (migration v16)'
FROM (
  SELECT fornecedor AS nome, 'compras' AS origem FROM compras
  UNION
  SELECT fornecedor, 'notas_fiscais' FROM notas_fiscais
  UNION
  SELECT fornecedor, 'pedidos_material' FROM pedidos_material
  UNION
  SELECT fornecedor, 'lancamentos_despesas' FROM lancamentos_despesas
) f
WHERE f.nome IS NOT NULL
  AND TRIM(f.nome) <> ''
  AND LENGTH(TRIM(f.nome)) > 2
ON CONFLICT DO NOTHING;

-- 3.3 Normalizar compras existentes p/ o novo fluxo da página
UPDATE compras SET status_financeiro = 'previsto' WHERE status_financeiro IS NULL;
UPDATE compras SET tipo = CASE WHEN status = 'cotacao' THEN 'cotacao' ELSE 'pre_pedido' END WHERE tipo IS NULL;
UPDATE compras SET valor_total = COALESCE(valor_total, valor_previsto, valor_real) WHERE valor_total IS NULL;
UPDATE compras SET data_pedido = COALESCE(data_pedido, data_cotacao, created_at::date) WHERE data_pedido IS NULL;
UPDATE compras SET itens = '[]'::jsonb WHERE itens IS NULL;

-- 3.4 Conferência (rodar para validar o resultado)
-- SELECT COUNT(*) AS fornecedores_total FROM fornecedores;
-- SELECT nome, observacoes FROM fornecedores ORDER BY nome;
-- SELECT id, fornecedor, status, tipo, status_financeiro, valor_total, data_pedido FROM compras ORDER BY created_at DESC LIMIT 20;

-- FIM V16
