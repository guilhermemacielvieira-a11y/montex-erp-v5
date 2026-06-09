-- ============================================================================
-- MIGRATION V12: RLS POR PAPEL (substitui o acesso anônimo permissivo da v10)
-- Data: 2026-06-09
-- ----------------------------------------------------------------------------
-- OBJETIVO
--   A migration v10 abriu todas as tabelas para o papel 'anon' com USING (true),
--   o que torna o banco efetivamente público. Esta migration:
--     1. Remove as políticas permissivas de 'anon'.
--     2. Cria políticas baseadas em autenticação real (papel 'authenticated')
--        usando a função get_user_role() já existente (migration v5).
--     3. Mantém leitura/escrita funcionando para usuários LOGADOS por papel.
--
-- PRÉ-REQUISITOS (NÃO PULE):
--   • Autenticação real habilitada (Supabase Auth) — ver Fase 1 do plano.
--   • Tabela user_profiles populada com (auth_id, role) para cada usuário.
--   • Papéis sugeridos: 'admin', 'financeiro', 'producao', 'leitura'.
--   • TESTE EM STAGING ANTES DE PRODUÇÃO. Faça backup/PITR antes de aplicar.
--
-- ⚠️ ATENÇÃO: aplicar isto SEM auth real vai BLOQUEAR o app atual (que usa anon).
--    Só rode em produção depois que o login estiver funcionando.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Função auxiliar de papel (idempotente — recriada da v5 por segurança)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.user_profiles WHERE auth_id = auth.uid()::text LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$ SELECT public.get_user_role() = 'admin'; $$;

-- Quem pode escrever dados operacionais/financeiros
CREATE OR REPLACE FUNCTION public.can_write()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$ SELECT public.get_user_role() IN ('admin','financeiro','producao'); $$;

-- ----------------------------------------------------------------------------
-- 1. REMOVER POLÍTICAS PERMISSIVAS DE 'anon' (criadas na v10)
--    Faz DROP de qualquer política cujo nome contenha '_anon_'.
-- ----------------------------------------------------------------------------
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND policyname LIKE '%\_anon\_%' ESCAPE '\'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;',
                   pol.policyname, pol.schemaname, pol.tablename);
    RAISE NOTICE 'Removida policy anon: % em %', pol.policyname, pol.tablename;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. POLÍTICAS POR PAPEL (papel 'authenticated' = usuário logado)
--    Padrão: leitura para qualquer logado; escrita para can_write();
--            exclusão somente admin. Ajuste por tabela conforme a regra.
-- ----------------------------------------------------------------------------
-- Macro manual: repita o bloco abaixo para cada tabela do app.
-- Tabelas cobertas (ajuste a lista conforme seu schema atual):
--   obras, pecas_producao, materiais_corte, lancamentos_despesas, medicoes,
--   medicoes_receitas, expedicoes, estoque, movimentacoes_estoque, orcamentos,
--   compras, notas_fiscais, pedidos_material, maquinas, listas_material,
--   croquis, detalhamentos, tarefas, funcionarios, equipes, equipe_membros,
--   clientes, entity_store, config_medicao, diario_producao

DO $$
DECLARE
  t TEXT;
  tabelas TEXT[] := ARRAY[
    'obras','pecas_producao','materiais_corte','lancamentos_despesas','medicoes',
    'medicoes_receitas','expedicoes','estoque','movimentacoes_estoque','orcamentos',
    'compras','notas_fiscais','pedidos_material','maquinas','listas_material',
    'croquis','detalhamentos','tarefas','funcionarios','equipes','equipe_membros',
    'clientes','entity_store','config_medicao','diario_producao'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    -- só age se a tabela existir
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name=t) THEN

      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

      -- limpa políticas por papel anteriores (idempotência)
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_auth_select', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_auth_insert', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_auth_update', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_auth_delete', t);

      -- SELECT: qualquer usuário autenticado
      EXECUTE format($f$CREATE POLICY %I ON public.%I
        FOR SELECT TO authenticated USING (true);$f$, t||'_auth_select', t);

      -- INSERT: papéis com permissão de escrita
      EXECUTE format($f$CREATE POLICY %I ON public.%I
        FOR INSERT TO authenticated WITH CHECK (public.can_write());$f$, t||'_auth_insert', t);

      -- UPDATE: papéis com permissão de escrita
      EXECUTE format($f$CREATE POLICY %I ON public.%I
        FOR UPDATE TO authenticated USING (public.can_write()) WITH CHECK (public.can_write());$f$, t||'_auth_update', t);

      -- DELETE: somente admin
      EXECUTE format($f$CREATE POLICY %I ON public.%I
        FOR DELETE TO authenticated USING (public.is_admin());$f$, t||'_auth_delete', t);

      RAISE NOTICE 'RLS por papel aplicada em %', t;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3. REVOGAR PRIVILÉGIOS DE 'anon' (cinto e suspensório)
--    Mesmo sem políticas, garante que a chave pública não acesse dados.
-- ----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

COMMIT;

-- ============================================================================
-- ROLLBACK DE EMERGÊNCIA (se o app quebrar antes da auth estar pronta):
--   Reaplique a migration_v10_fix_rls_anon.sql para reabrir o acesso anon.
--   (Mantenha-a no histórico até a Fase 1 estar concluída e validada.)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- VERIFICAÇÃO (rode após aplicar):
--   SELECT tablename, policyname, roles, cmd
--   FROM pg_policies WHERE schemaname='public' ORDER BY tablename, cmd;
-- Não deve sobrar nenhuma policy com roles = {anon}.
-- ----------------------------------------------------------------------------
