-- ============================================================================
-- MIGRATION V14: tabela dedicada do PainelFinanceiroGlobal (camada ISOLADA)
-- Data: 2026-06-09
-- ----------------------------------------------------------------------------
-- Substitui o blob único em entity_store ('painel_financeiro_global') por
-- LINHAS, permitindo edição concorrente entre usuários sem sobrescrever e
-- visibilidade em tempo real (Supabase Realtime).
--
-- ISOLAMENTO: nenhum outro módulo lê esta tabela → os dados do painel NÃO
-- vazam para Receitas/Financeiro/Despesas etc. A entrada do painel (espelho
-- de despesas/medições) não muda.
--
-- Aplicar ANTES de publicar o código (senão o painel não acha a tabela).
-- ============================================================================

CREATE TABLE IF NOT EXISTS painel_financeiro_global (
  row_id     TEXT PRIMARY KEY,         -- chave determinística (ex.: 'mov:PEC-1', 'override:<id>', 'meta', 'alert:<user>:<id>')
  tipo       TEXT NOT NULL,            -- mov | override | hidden | meta | alert_read
  ref_id     TEXT,                     -- id externo (override/hidden/alert) ou id do lançamento (mov)
  usuario    TEXT,                     -- preenchido SÓ em alert_read (alertas lidos por usuário)
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pfg_tipo       ON painel_financeiro_global(tipo);
CREATE INDEX IF NOT EXISTS idx_pfg_alert_user ON painel_financeiro_global(tipo, usuario);

-- Consistente com entity_store (hoje sem RLS). Endurecer na Fase 1 (auth + RLS por papel).
ALTER TABLE painel_financeiro_global DISABLE ROW LEVEL SECURITY;

-- Realtime: visibilidade imediata entre usuários quando alguém lança/edita.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE painel_financeiro_global;
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- já estava na publicação
    END;
  END IF;
END $$;

-- Observação: a migração dos dados existentes (blob antigo em entity_store)
-- é feita automaticamente pelo código no primeiro load (loadBundleRemote):
-- se a tabela estiver vazia e existir o blob, ele é convertido em linhas.
