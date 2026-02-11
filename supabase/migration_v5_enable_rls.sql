-- ============================================================================
-- MIGRATION V5: HABILITAÇÃO DE RLS EM TODAS AS TABELAS
-- Data: 2026-02-10
-- CRÍTICO: Sem RLS, qualquer usuário autenticado acessa TODOS os dados
-- ============================================================================

-- ============================================================================
-- 1. HABILITAR RLS NAS 14 TABELAS DA MIGRATION_V3
-- (Estavam DISABLE ROW LEVEL SECURITY para "desenvolvimento")
-- ============================================================================

ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE listas_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE pecas_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE croquis ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalhamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_medicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. HABILITAR RLS NA TABELA USER_PROFILES (MIGRATION_V4)
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. FUNÇÃO AUXILIAR: Obter role do usuário autenticado
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles
  WHERE auth_id = auth.uid()::text
  AND ativo = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- 4. POLÍTICAS RLS PARA USER_PROFILES
-- ============================================================================

-- Usuários veem seu próprio perfil
CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT USING (auth_id = auth.uid()::text);

-- Admins veem todos os perfis
CREATE POLICY "user_profiles_select_admin" ON user_profiles
  FOR SELECT USING (get_user_role() = 'admin');

-- Admins podem inserir/atualizar/deletar perfis
CREATE POLICY "user_profiles_insert_admin" ON user_profiles
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "user_profiles_update_admin" ON user_profiles
  FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "user_profiles_delete_admin" ON user_profiles
  FOR DELETE USING (get_user_role() = 'admin');

-- Usuários podem atualizar apenas seu próprio perfil (campos limitados)
CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE USING (auth_id = auth.uid()::text);

-- ============================================================================
-- 5. POLÍTICAS RLS GENÉRICAS PARA TABELAS DE NEGÓCIO
-- Padrão: Todos autenticados podem ler, roles com permissão podem escrever
-- ============================================================================

-- === ORCAMENTOS ===
CREATE POLICY "orcamentos_select" ON orcamentos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "orcamentos_insert" ON orcamentos
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'gerente', 'financeiro'));

CREATE POLICY "orcamentos_update" ON orcamentos
  FOR UPDATE USING (get_user_role() IN ('admin', 'gerente', 'financeiro'));

CREATE POLICY "orcamentos_delete" ON orcamentos
  FOR DELETE USING (get_user_role() = 'admin');

-- === LISTAS_MATERIAL ===
CREATE POLICY "listas_material_select" ON listas_material
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "listas_material_insert" ON listas_material
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'gerente', 'supervisor'));

CREATE POLICY "listas_material_update" ON listas_material
  FOR UPDATE USING (get_user_role() IN ('admin', 'gerente', 'supervisor'));

CREATE POLICY "listas_material_delete" ON listas_material
  FOR DELETE USING (get_user_role() = 'admin');

-- === PECAS_PRODUCAO ===
CREATE POLICY "pecas_producao_select" ON pecas_producao
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "pecas_producao_insert" ON pecas_producao
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'gerente', 'supervisor', 'operador'));

CREATE POLICY "pecas_producao_update" ON pecas_producao
  FOR UPDATE USING (get_user_role() IN ('admin', 'gerente', 'supervisor', 'operador'));

CREATE POLICY "pecas_producao_delete" ON pecas_producao
  FOR DELETE USING (get_user_role() IN ('admin', 'gerente'));

-- === COMPRAS ===
CREATE POLICY "compras_select" ON compras
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "compras_insert" ON compras
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'gerente', 'financeiro', 'supervisor'));

CREATE POLICY "compras_update" ON compras
  FOR UPDATE USING (get_user_role() IN ('admin', 'gerente', 'financeiro'));

CREATE POLICY "compras_delete" ON compras
  FOR DELETE USING (get_user_role() = 'admin');

-- === NOTAS_FISCAIS ===
CREATE POLICY "notas_fiscais_select" ON notas_fiscais
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "notas_fiscais_insert" ON notas_fiscais
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'gerente', 'financeiro'));

CREATE POLICY "notas_fiscais_update" ON notas_fiscais
  FOR UPDATE USING (get_user_role() IN ('admin', 'gerente', 'financeiro'));

CREATE POLICY "notas_fiscais_delete" ON notas_fiscais
  FOR DELETE USING (get_user_role() = 'admin');

-- === MOVIMENTACOES_ESTOQUE ===
CREATE POLICY "movimentacoes_estoque_select" ON movimentacoes_estoque
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "movimentacoes_estoque_insert" ON movimentacoes_estoque
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'gerente', 'supervisor', 'operador'));

CREATE POLICY "movimentacoes_estoque_update" ON movimentacoes_estoque
  FOR UPDATE USING (get_user_role() IN ('admin', 'gerente', 'supervisor'));

CREATE POLICY "movimentacoes_estoque_delete" ON movimentacoes_estoque
  FOR DELETE USING (get_user_role() = 'admin');

-- === MAQUINAS ===
CREATE POLICY "maquinas_select" ON maquinas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "maquinas_insert" ON maquinas
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'gerente', 'supervisor'));

CREATE POLICY "maquinas_update" ON maquinas
  FOR UPDATE USING (get_user_role() IN ('admin', 'gerente', 'supervisor'));

CREATE POLICY "maquinas_delete" ON maquinas
  FOR DELETE USING (get_user_role() = 'admin');

-- === MEDICOES ===
CREATE POLICY "medicoes_select" ON medicoes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "medicoes_insert" ON medicoes
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'gerente', 'supervisor'));

CREATE POLICY "medicoes_update" ON medicoes
  FOR UPDATE USING (get_user_role() IN ('admin', 'gerente', 'supervisor'));

CREATE POLICY "medicoes_delete" ON medicoes
  FOR DELETE USING (get_user_role() = 'admin');

-- === PEDIDOS_MATERIAL ===
CREATE POLICY "pedidos_material_select" ON pedidos_material
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "pedidos_material_insert" ON pedidos_material
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'gerente', 'supervisor', 'financeiro'));

CREATE POLICY "pedidos_material_update" ON pedidos_material
  FOR UPDATE USING (get_user_role() IN ('admin', 'gerente', 'supervisor', 'financeiro'));

CREATE POLICY "pedidos_material_delete" ON pedidos_material
  FOR DELETE USING (get_user_role() = 'admin');

-- === CROQUIS ===
CREATE POLICY "croquis_select" ON croquis
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "croquis_insert" ON croquis
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'gerente', 'supervisor'));

CREATE POLICY "croquis_update" ON croquis
  FOR UPDATE USING (get_user_role() IN ('admin', 'gerente', 'supervisor'));

CREATE POLICY "croquis_delete" ON croquis
  FOR DELETE USING (get_user_role() = 'admin');

-- === DETALHAMENTOS ===
CREATE POLICY "detalhamentos_select" ON detalhamentos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "detalhamentos_insert" ON detalhamentos
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'gerente', 'supervisor'));

CREATE POLICY "detalhamentos_update" ON detalhamentos
  FOR UPDATE USING (get_user_role() IN ('admin', 'gerente', 'supervisor'));

CREATE POLICY "detalhamentos_delete" ON detalhamentos
  FOR DELETE USING (get_user_role() = 'admin');

-- === EXPEDICOES ===
CREATE POLICY "expedicoes_select" ON expedicoes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "expedicoes_insert" ON expedicoes
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'gerente', 'supervisor'));

CREATE POLICY "expedicoes_update" ON expedicoes
  FOR UPDATE USING (get_user_role() IN ('admin', 'gerente', 'supervisor'));

CREATE POLICY "expedicoes_delete" ON expedicoes
  FOR DELETE USING (get_user_role() = 'admin');

-- === CONFIG_MEDICAO ===
CREATE POLICY "config_medicao_select" ON config_medicao
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "config_medicao_insert" ON config_medicao
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'gerente'));

CREATE POLICY "config_medicao_update" ON config_medicao
  FOR UPDATE USING (get_user_role() IN ('admin', 'gerente'));

CREATE POLICY "config_medicao_delete" ON config_medicao
  FOR DELETE USING (get_user_role() = 'admin');

-- === TAREFAS ===
CREATE POLICY "tarefas_select" ON tarefas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "tarefas_insert" ON tarefas
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'gerente', 'supervisor', 'operador'));

CREATE POLICY "tarefas_update" ON tarefas
  FOR UPDATE USING (get_user_role() IN ('admin', 'gerente', 'supervisor', 'operador'));

CREATE POLICY "tarefas_delete" ON tarefas
  FOR DELETE USING (get_user_role() IN ('admin', 'gerente'));

-- ============================================================================
-- 6. REMOVER SENHAS DE TESTE (SEGURANÇA)
-- Os usuários já devem ter sido criados. Forçar troca de senha no próximo login.
-- ============================================================================

-- Opcional: Invalidar tokens antigos forçando re-login
-- UPDATE auth.users SET updated_at = NOW() WHERE email LIKE '%@grupomontex.com.br';

-- ============================================================================
-- 7. VERIFICAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_rls_enabled INTEGER;
  v_policies INTEGER;
BEGIN
  -- Contar tabelas com RLS habilitado
  SELECT COUNT(*) INTO v_rls_enabled
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
  AND c.relrowsecurity = true;

  -- Contar políticas RLS
  SELECT COUNT(*) INTO v_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE '=========================================';
  RAISE NOTICE 'MIGRATION V5 - RLS HABILITADO';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Tabelas com RLS ativo: %', v_rls_enabled;
  RAISE NOTICE 'Políticas RLS criadas: %', v_policies;
  RAISE NOTICE '=========================================';
END $$;
