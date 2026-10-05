-- ============================================================
-- RECEITAS MANUAIS → tabela real
-- ============================================================
-- Antes as receitas manuais viviam só em localStorage
-- ('montex_receitas_gerais') + espelho JSON em entity_store
-- ('receitas_gerais_sync'), divergindo entre PCs e com chaves diferentes
-- entre módulos. Esta tabela passa a ser a fonte única (ReceitasPage, GFO,
-- Painel Financeiro Global, useFinancialIntelligence).
--
-- Status canônico (src/utils/financeiroStatus.js):
--   aberto → faturado → recebido   (ou cancelado)
-- `faturado` NÃO é dinheiro em caixa.
--
-- Idempotente e aditiva. O app mostra um botão "Importar receitas antigas"
-- para migrar uma única vez o que existir no localStorage/entity_store.
-- ============================================================

CREATE TABLE IF NOT EXISTS receitas_manuais (
  id               text PRIMARY KEY,
  obra_id          text NULL,
  descricao        text NOT NULL DEFAULT '',
  cliente          text NULL,
  categoria        text NULL,
  valor_bruto      numeric(14,2) NOT NULL DEFAULT 0,
  valor_liquido    numeric(14,2) NULL,
  data_emissao     date NULL,
  data_vencimento  date NULL,
  data_recebimento date NULL,
  status           text NOT NULL DEFAULT 'aberto',
  forma_pagto      text NULL,
  recorrencia_id   text NULL,
  observacoes      text NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Colunas extras (caso a tabela já exista de uma versão anterior)
ALTER TABLE receitas_manuais ADD COLUMN IF NOT EXISTS cliente text;
ALTER TABLE receitas_manuais ADD COLUMN IF NOT EXISTS forma_pagto text;
ALTER TABLE receitas_manuais ADD COLUMN IF NOT EXISTS recorrencia_id text;

DO $$ BEGIN
  ALTER TABLE receitas_manuais
    ADD CONSTRAINT receitas_manuais_status_check
    CHECK (status IN ('aberto', 'faturado', 'recebido', 'cancelado'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_receitas_manuais_obra ON receitas_manuais (obra_id);
CREATE INDEX IF NOT EXISTS idx_receitas_manuais_emissao ON receitas_manuais (data_emissao);
CREATE INDEX IF NOT EXISTS idx_receitas_manuais_status ON receitas_manuais (status);

ALTER TABLE receitas_manuais ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "receitas_manuais_auth_all" ON receitas_manuais
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
