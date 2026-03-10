-- ============================================================================
-- MIGRATION V10: CORRIGIR RLS PARA PERMITIR ACESSO ANÔNIMO
-- Data: 2026-03-10
-- PROBLEMA: 6 tabelas têm RLS habilitado mas app usa chave anon sem auth
-- SOLUÇÃO: Adicionar políticas permissivas para o role 'anon'
-- ============================================================================
-- EXECUTAR NO SUPABASE DASHBOARD → SQL EDITOR
-- ============================================================================

-- ============================================================================
-- 1. ADICIONAR POLÍTICAS PERMISSIVAS PARA ROLE ANON
-- Estas políticas permitem que o role 'anon' (usado pelo app sem auth)
-- faça SELECT, INSERT, UPDATE e DELETE nas tabelas bloqueadas.
-- ============================================================================

-- === ORCAMENTOS ===
CREATE POLICY "orcamentos_anon_select" ON orcamentos
  FOR SELECT TO anon USING (true);
CREATE POLICY "orcamentos_anon_insert" ON orcamentos
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "orcamentos_anon_update" ON orcamentos
  FOR UPDATE TO anon USING (true);
CREATE POLICY "orcamentos_anon_delete" ON orcamentos
  FOR DELETE TO anon USING (true);

-- === COMPRAS ===
CREATE POLICY "compras_anon_select" ON compras
  FOR SELECT TO anon USING (true);
CREATE POLICY "compras_anon_insert" ON compras
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "compras_anon_update" ON compras
  FOR UPDATE TO anon USING (true);
CREATE POLICY "compras_anon_delete" ON compras
  FOR DELETE TO anon USING (true);

-- === NOTAS_FISCAIS ===
CREATE POLICY "notas_fiscais_anon_select" ON notas_fiscais
  FOR SELECT TO anon USING (true);
CREATE POLICY "notas_fiscais_anon_insert" ON notas_fiscais
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "notas_fiscais_anon_update" ON notas_fiscais
  FOR UPDATE TO anon USING (true);
CREATE POLICY "notas_fiscais_anon_delete" ON notas_fiscais
  FOR DELETE TO anon USING (true);

-- === PEDIDOS_MATERIAL ===
CREATE POLICY "pedidos_material_anon_select" ON pedidos_material
  FOR SELECT TO anon USING (true);
CREATE POLICY "pedidos_material_anon_insert" ON pedidos_material
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "pedidos_material_anon_update" ON pedidos_material
  FOR UPDATE TO anon USING (true);
CREATE POLICY "pedidos_material_anon_delete" ON pedidos_material
  FOR DELETE TO anon USING (true);

-- === MAQUINAS ===
CREATE POLICY "maquinas_anon_select" ON maquinas
  FOR SELECT TO anon USING (true);
CREATE POLICY "maquinas_anon_insert" ON maquinas
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "maquinas_anon_update" ON maquinas
  FOR UPDATE TO anon USING (true);
CREATE POLICY "maquinas_anon_delete" ON maquinas
  FOR DELETE TO anon USING (true);

-- === CONFIG_MEDICAO ===
CREATE POLICY "config_medicao_anon_select" ON config_medicao
  FOR SELECT TO anon USING (true);
CREATE POLICY "config_medicao_anon_insert" ON config_medicao
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "config_medicao_anon_update" ON config_medicao
  FOR UPDATE TO anon USING (true);
CREATE POLICY "config_medicao_anon_delete" ON config_medicao
  FOR DELETE TO anon USING (true);

-- ============================================================================
-- 2. VERIFICAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND policyname LIKE '%_anon_%';

  RAISE NOTICE '=========================================';
  RAISE NOTICE 'MIGRATION V10 - RLS ANON POLICIES';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Políticas anon criadas: %', v_policies;
  RAISE NOTICE 'Esperado: 24 (4 por tabela x 6 tabelas)';
  RAISE NOTICE '=========================================';
END $$;
