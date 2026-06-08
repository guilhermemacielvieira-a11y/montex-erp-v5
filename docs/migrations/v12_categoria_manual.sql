-- ============================================================
-- MIGRATION v12 — categoria_manual + categoria_origem em lancamentos_despesas
-- ============================================================
-- CONTEXTO:
-- A função normalizarCategoria() em useFinancialIntelligence.js aplica regras
-- de keyword na renderização ("CEMIG..." sempre vira Energia/Utilidades). Isso
-- sobrescreve qualquer correção manual do usuário no banco.
--
-- A Fase 1 (commit anterior) introduziu override local em localStorage para
-- tampar o problema na hora. A Fase 2 (esta migration) torna a correção
-- persistente no Supabase, sincronizada entre dispositivos.
--
-- COMO APLICAR:
-- 1. Abra o Supabase Studio → SQL Editor
-- 2. Cole este SQL inteiro e execute
-- 3. Após sucesso, atualizar transforms.js com as novas colunas (já feito
--    no mesmo PR desta migration)
-- 4. Deploy do frontend → handleSaveDespesa começa a enviar categoria_manual
-- 5. Backfill automático: ao recarregar DespesasPage, overrides locais da
--    Fase 1 são gravados no Supabase via syncOverridesParaSupabase()
--
-- REVERT:
--   ALTER TABLE lancamentos_despesas
--     DROP COLUMN IF EXISTS categoria_manual,
--     DROP COLUMN IF EXISTS categoria_origem;
-- ============================================================

-- 1. Adicionar as colunas
ALTER TABLE lancamentos_despesas
  ADD COLUMN IF NOT EXISTS categoria_manual boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS categoria_origem text DEFAULT 'auto' NOT NULL;

-- 2. Comentários para documentar
COMMENT ON COLUMN lancamentos_despesas.categoria_manual IS
  'true quando a categoria foi editada manualmente pelo usuário. Quando true, ' ||
  'normalizarCategoria() e re-importações NÃO devem sobrescrever este valor.';
COMMENT ON COLUMN lancamentos_despesas.categoria_origem IS
  'Origem da categorização: auto (keyword), manual (edição do usuário), ' ||
  'mapping (aprendido por fornecedor/CNPJ), xml (importado de NFe).';

-- 3. Índice parcial para queries que listam só corrigidas manualmente
CREATE INDEX IF NOT EXISTS lancamentos_despesas_categoria_manual_idx
  ON lancamentos_despesas (categoria_manual)
  WHERE categoria_manual = true;

-- 4. CHECK constraint para origem (evita typos)
ALTER TABLE lancamentos_despesas
  DROP CONSTRAINT IF EXISTS lancamentos_categoria_origem_check;
ALTER TABLE lancamentos_despesas
  ADD CONSTRAINT lancamentos_categoria_origem_check
  CHECK (categoria_origem IN ('auto', 'manual', 'mapping', 'xml'));

-- 5. Verificação pós-migration (sanidade)
DO $$
DECLARE
  total int;
  com_manual int;
BEGIN
  SELECT count(*) INTO total FROM lancamentos_despesas;
  SELECT count(*) INTO com_manual FROM lancamentos_despesas WHERE categoria_manual = true;
  RAISE NOTICE 'Migration v12 OK: % lançamentos totais, % com categoria_manual=true', total, com_manual;
END $$;
