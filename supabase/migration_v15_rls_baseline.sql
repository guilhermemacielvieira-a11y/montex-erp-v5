-- ============================================================================
-- MIGRATION V15: RLS baseline (somente autenticado) + views SECURITY INVOKER
-- Data: 2026-06-09
-- ----------------------------------------------------------------------------
-- Fecha os 30 erros do Security Advisor:
--   • "RLS Disabled in Public" e "Policy Exists RLS Disabled" → habilita RLS em
--     TODAS as tabelas do schema public, remove políticas antigas (inclusive as
--     'anon USING(true)' da v10) e cria uma política única para usuários LOGADOS.
--   • "Security Definer View" (5 views) → passa para SECURITY INVOKER.
--
-- ESTRATÉGIA SEGURA (não trava ninguém):
--   - Política = FOR ALL TO authenticated USING(true) WITH CHECK(true).
--     Como o app exige login (auth real ativa), todo usuário logado continua
--     lendo/gravando normalmente. A chave pública (anon) SEM login deixa de ter
--     acesso → buraco fechado.
--   - Edge Functions usam service_role/secret → BYPASSAM RLS → não são afetadas.
--   - O gating por PAPEL (admin/financeiro/produção) é o passo 2 (migration_v12),
--     a aplicar só depois de validar os papéis em user_profiles.
--
-- ⚠️ Aplicar em horário de baixo movimento. ROLLBACK no fim do arquivo.
-- ============================================================================

BEGIN;

-- 1) RLS em todas as tabelas base do public: limpa políticas antigas e cria a
--    política única para 'authenticated'.
DO $$
DECLARE r RECORD; p RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);

    -- remove TODAS as políticas existentes (anon permissivas da v10 + resquícios)
    FOR p IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = r.tablename LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', p.policyname, r.tablename);
    END LOOP;

    -- política única: usuário logado tem CRUD; anon (sem login) fica sem política → bloqueado
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      'auth_all_' || r.tablename, r.tablename
    );
  END LOOP;
END $$;

-- 2) Views: SECURITY INVOKER (Postgres 15+) — sem precisar recriar
ALTER VIEW IF EXISTS public.v_equipes_alocacao        SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_funcionarios_completo   SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_usuarios                SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_dashboard_financeiro    SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_analise_custos_categoria SET (security_invoker = on);

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO (rode depois):
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';
--   -> rowsecurity deve ser true em todas.
--   SELECT tablename, policyname, roles FROM pg_policies WHERE schemaname='public';
--   -> deve haver auth_all_<tabela> com roles = {authenticated} e NENHUMA {anon}.
-- ============================================================================
-- ROLLBACK DE EMERGÊNCIA (se o app parar de ler/gravar para usuários logados):
--   Reabre o acesso anon (volta ao comportamento da v10) — cole e rode:
--
-- DO $$
-- DECLARE r RECORD;
-- BEGIN
--   FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
--     EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);',
--                    'anon_all_'||r.tablename, r.tablename);
--   END LOOP;
-- END $$;
--
--   (ou, para reverter totalmente: ALTER TABLE public.<tabela> DISABLE ROW LEVEL SECURITY;)
-- ============================================================================
-- PRÓXIMO PASSO (Fase 2 — RLS por papel): migration_v12_rls_por_papel.sql,
-- depois de confirmar os papéis em user_profiles (admin/financeiro/produção).
-- ============================================================================
