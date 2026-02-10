-- ============================================
-- MONTEX ERP V5 - Migração V2
-- Criação de tabelas faltantes para persistência
-- ============================================

-- 1. Tabela CLIENTES (cadastro de clientes)
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  contato TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  segmento TEXT DEFAULT 'industria',
  observacoes TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela ENTITY_STORE (armazenamento genérico para entidades sem tabela própria)
CREATE TABLE IF NOT EXISTS entity_store (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_entity_store_type ON entity_store(entity_type);
CREATE INDEX IF NOT EXISTS idx_entity_store_type_date ON entity_store(entity_type, created_date DESC);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);

-- 3. Desabilitar RLS nas novas tabelas
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE entity_store DISABLE ROW LEVEL SECURITY;

-- 4. Atualizar status da obra SUPER LUNA para 'em_fabricacao'
UPDATE obras SET status = 'em_fabricacao' WHERE nome ILIKE '%super luna%';
