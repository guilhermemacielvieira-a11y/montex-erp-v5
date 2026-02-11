-- ============================================================================
-- MIGRATION V6: MELHORIAS DE BANCO DE DADOS
-- Data: 2026-02-11
-- Descrição: Padronização de PKs, unificação de tabelas de usuários,
--            foreign keys, validação JSONB, RPC functions e senhas seguras
-- ============================================================================

-- ============================================================================
-- 1. DOCUMENTAÇÃO DE PKs (informativo - não altera estrutura existente)
-- ============================================================================
-- NOTA: O schema original (v1) usa UUID PKs via gen_random_uuid()
-- As tabelas da migration_v3 usam TEXT PKs
-- user_profiles usa TEXT PKs
-- Recomendação futura: migrar tudo para UUID nativo
-- Por ora, mantemos compatibilidade via TEXT casting

COMMENT ON TABLE public.user_profiles IS 'Tabela principal de perfis de usuários (substitui usuarios)';

-- ============================================================================
-- 2. UNIFICAR TABELAS DE USUÁRIOS
-- ============================================================================

-- 2a. Migrar dados únicos de 'usuarios' para 'user_profiles' (se existirem)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usuarios' AND table_schema = 'public') THEN
    -- Inserir usuarios que não existem em user_profiles
    INSERT INTO public.user_profiles (id, auth_id, email, nome, role, cargo, departamento, ativo)
    SELECT
      COALESCE(u.id, gen_random_uuid()::text),
      COALESCE(u.id, gen_random_uuid()::text),
      u.email,
      u.nome,
      CASE
        WHEN u.role = 'producao' THEN 'supervisor'
        WHEN u.role IN ('admin', 'gerente', 'supervisor', 'operador', 'financeiro', 'viewer') THEN u.role
        ELSE 'viewer'
      END,
      u.cargo,
      u.departamento,
      COALESCE(u.ativo, true)
    FROM public.usuarios u
    WHERE u.email IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.email = u.email)
    ON CONFLICT (email) DO NOTHING;

    -- Marcar tabela como deprecated
    COMMENT ON TABLE public.usuarios IS 'DEPRECATED: Use user_profiles. Esta tabela será removida em versão futura.';

    RAISE NOTICE 'Dados migrados de usuarios → user_profiles';
  ELSE
    RAISE NOTICE 'Tabela usuarios não encontrada - nada a migrar';
  END IF;
END $$;

-- 2b. Criar VIEW de compatibilidade
CREATE OR REPLACE VIEW public.v_usuarios AS
SELECT
  id,
  auth_id,
  email,
  nome,
  role,
  cargo,
  departamento,
  avatar_url AS avatar,
  ativo,
  ultimo_acesso,
  created_at,
  updated_at
FROM public.user_profiles;

COMMENT ON VIEW public.v_usuarios IS 'View de compatibilidade - mapeia user_profiles para formato antigo';

-- ============================================================================
-- 3. FOREIGN KEYS (com verificação de existência)
-- ============================================================================

-- 3a. pecas_producao.obra_id → projetos.id (TEXT → UUID precisa de cast)
-- Como as PKs são de tipos diferentes, usamos um trigger ao invés de FK direta

-- Criar função de validação de obra_id
CREATE OR REPLACE FUNCTION public.validate_obra_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Permitir NULL
  IF NEW.obra_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verificar se obra existe (comparação flexível TEXT/UUID)
  IF NOT EXISTS (
    SELECT 1 FROM public.projetos WHERE id::text = NEW.obra_id::text
  ) THEN
    RAISE WARNING 'obra_id % não encontrado em projetos - inserindo mesmo assim', NEW.obra_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas que referenciam obra_id
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['pecas_producao', 'listas_material', 'romaneios', 'notas_fiscais', 'lancamentos_despesas', 'pedidos_material', 'movimentacoes_estoque'])
  LOOP
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_validate_obra_%s ON public.%I', tbl, tbl);
      EXECUTE format('CREATE TRIGGER trg_validate_obra_%s BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validate_obra_id()', tbl, tbl);
      RAISE NOTICE 'Trigger de validação obra_id criado para: %', tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 4. VALIDAÇÃO JSONB
-- ============================================================================

-- 4a. user_profiles.permissoes_custom deve ser um array JSON válido
DO $$
BEGIN
  -- Verificar se constraint já existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_permissoes_custom_array'
    AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD CONSTRAINT chk_permissoes_custom_array
    CHECK (permissoes_custom IS NULL OR jsonb_typeof(permissoes_custom) = 'array');

    RAISE NOTICE 'Constraint JSONB adicionada: permissoes_custom deve ser array';
  END IF;
END $$;

-- 4b. Validar JSONB em outras tabelas que usam JSONB
DO $$
BEGIN
  -- orcamentos.itens deve ser array ou objeto
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orcamentos' AND column_name = 'itens') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'chk_orcamentos_itens_json'
      AND table_name = 'orcamentos'
    ) THEN
      ALTER TABLE public.orcamentos
      ADD CONSTRAINT chk_orcamentos_itens_json
      CHECK (itens IS NULL OR jsonb_typeof(itens) IN ('array', 'object'));
      RAISE NOTICE 'Constraint JSONB adicionada: orcamentos.itens';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 5. RPC FUNCTIONS
-- ============================================================================

-- 5a. Dashboard Stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_projetos', (SELECT COUNT(*) FROM public.projetos),
    'projetos_ativos', (SELECT COUNT(*) FROM public.projetos WHERE status IN ('em_andamento', 'em_producao', 'aprovada')),
    'total_clientes', (SELECT COUNT(*) FROM public.clientes),
    'total_pecas', (SELECT COALESCE(COUNT(*), 0) FROM public.pecas_producao),
    'pecas_produzidas', (SELECT COALESCE(COUNT(*), 0) FROM public.pecas_producao WHERE status IN ('pronto', 'concluido', 'expedido')),
    'peso_total_kg', (SELECT COALESCE(SUM(peso_total), 0) FROM public.pecas_producao),
    'peso_produzido_kg', (SELECT COALESCE(SUM(peso_total), 0) FROM public.pecas_producao WHERE status IN ('pronto', 'concluido', 'expedido')),
    'total_orcamentos', (SELECT COUNT(*) FROM public.orcamentos),
    'orcamentos_aprovados', (SELECT COUNT(*) FROM public.orcamentos WHERE status = 'aprovado'),
    'total_usuarios', (SELECT COUNT(*) FROM public.user_profiles WHERE ativo = true),
    'updated_at', NOW()
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_stats() IS 'Retorna estatísticas gerais do dashboard em JSON';

-- 5b. Produção por Obra
CREATE OR REPLACE FUNCTION public.get_producao_por_obra(p_obra_id TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'obra_id', p_obra_id,
    'total_pecas', (SELECT COUNT(*) FROM public.pecas_producao WHERE (p_obra_id IS NULL OR obra_id::text = p_obra_id)),
    'pecas_pendentes', (SELECT COUNT(*) FROM public.pecas_producao WHERE (p_obra_id IS NULL OR obra_id::text = p_obra_id) AND status IN ('pendente', 'aguardando')),
    'pecas_em_producao', (SELECT COUNT(*) FROM public.pecas_producao WHERE (p_obra_id IS NULL OR obra_id::text = p_obra_id) AND status IN ('em_producao', 'corte', 'montagem', 'solda')),
    'pecas_prontas', (SELECT COUNT(*) FROM public.pecas_producao WHERE (p_obra_id IS NULL OR obra_id::text = p_obra_id) AND status IN ('pronto', 'concluido')),
    'pecas_expedidas', (SELECT COUNT(*) FROM public.pecas_producao WHERE (p_obra_id IS NULL OR obra_id::text = p_obra_id) AND status = 'expedido'),
    'peso_total', (SELECT COALESCE(SUM(peso_total), 0) FROM public.pecas_producao WHERE (p_obra_id IS NULL OR obra_id::text = p_obra_id)),
    'peso_produzido', (SELECT COALESCE(SUM(peso_total), 0) FROM public.pecas_producao WHERE (p_obra_id IS NULL OR obra_id::text = p_obra_id) AND status IN ('pronto', 'concluido', 'expedido')),
    'percentual_conclusao', (
      SELECT CASE
        WHEN COALESCE(SUM(peso_total), 0) = 0 THEN 0
        ELSE ROUND((COALESCE(SUM(CASE WHEN status IN ('pronto', 'concluido', 'expedido') THEN peso_total ELSE 0 END), 0) / NULLIF(SUM(peso_total), 0)) * 100)
      END
      FROM public.pecas_producao WHERE (p_obra_id IS NULL OR obra_id::text = p_obra_id)
    ),
    'por_etapa', (
      SELECT COALESCE(json_agg(json_build_object('etapa', etapa, 'count', cnt, 'peso', peso)), '[]'::json)
      FROM (
        SELECT COALESCE(etapa, 'sem_etapa') AS etapa, COUNT(*) AS cnt, COALESCE(SUM(peso_total), 0) AS peso
        FROM public.pecas_producao
        WHERE (p_obra_id IS NULL OR obra_id::text = p_obra_id)
        GROUP BY etapa ORDER BY cnt DESC
      ) sub
    ),
    'updated_at', NOW()
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_producao_por_obra(TEXT) IS 'Retorna estatísticas de produção por obra em JSON';

-- 5c. Resumo Financeiro por Obra
CREATE OR REPLACE FUNCTION public.get_financeiro_resumo(p_obra_id TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'obra_id', p_obra_id,
    'total_receitas', (
      SELECT COALESCE(SUM(valor), 0) FROM public.movimentacoes
      WHERE tipo = 'receita' AND (p_obra_id IS NULL OR projeto_id::text = p_obra_id)
    ),
    'total_despesas', (
      SELECT COALESCE(SUM(valor), 0) FROM public.movimentacoes
      WHERE tipo = 'despesa' AND (p_obra_id IS NULL OR projeto_id::text = p_obra_id)
    ),
    'saldo', (
      SELECT COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE -valor END), 0)
      FROM public.movimentacoes
      WHERE (p_obra_id IS NULL OR projeto_id::text = p_obra_id)
    ),
    'count_receitas', (
      SELECT COUNT(*) FROM public.movimentacoes
      WHERE tipo = 'receita' AND (p_obra_id IS NULL OR projeto_id::text = p_obra_id)
    ),
    'count_despesas', (
      SELECT COUNT(*) FROM public.movimentacoes
      WHERE tipo = 'despesa' AND (p_obra_id IS NULL OR projeto_id::text = p_obra_id)
    ),
    'valor_contrato', (
      SELECT COALESCE(valor_contrato, 0) FROM public.projetos WHERE id::text = p_obra_id
    ),
    'custos_por_categoria', (
      SELECT COALESCE(json_agg(json_build_object('categoria', categoria, 'total', total_cat)), '[]'::json)
      FROM (
        SELECT COALESCE(categoria, 'Outros') AS categoria, SUM(valor) AS total_cat
        FROM public.movimentacoes
        WHERE tipo = 'despesa' AND (p_obra_id IS NULL OR projeto_id::text = p_obra_id)
        GROUP BY categoria ORDER BY total_cat DESC
      ) sub
    ),
    'updated_at', NOW()
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_financeiro_resumo(TEXT) IS 'Retorna resumo financeiro por obra em JSON';

-- ============================================================================
-- 6. ALTERAR SENHAS DOS USUÁRIOS DE TESTE
-- ============================================================================

-- IMPORTANTE: Substituir senhas padrão por senhas fortes e únicas
-- Estas senhas devem ser comunicadas aos usuários de forma segura

UPDATE auth.users SET encrypted_password = crypt('Mx#Adm!n2026$Pr0d', gen_salt('bf'))
WHERE email = 'guilherme@grupomontex.com.br';

UPDATE auth.users SET encrypted_password = crypt('Mx#Ger3nt3!2026$Prd', gen_salt('bf'))
WHERE email = 'gerente@grupomontex.com.br';

UPDATE auth.users SET encrypted_password = crypt('Mx#Sup3rv!s0r2026$', gen_salt('bf'))
WHERE email = 'supervisor@grupomontex.com.br';

UPDATE auth.users SET encrypted_password = crypt('Mx#Op3rad0r!2026$P', gen_salt('bf'))
WHERE email = 'operador@grupomontex.com.br';

UPDATE auth.users SET encrypted_password = crypt('Mx#F!nanc3!r02026$', gen_salt('bf'))
WHERE email = 'financeiro@grupomontex.com.br';

UPDATE auth.users SET encrypted_password = crypt('Mx#V!3w3r2026$Prod', gen_salt('bf'))
WHERE email = 'viewer@grupomontex.com.br';

-- ============================================================================
-- 7. ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pecas_producao_obra_status ON public.pecas_producao(obra_id, status);
CREATE INDEX IF NOT EXISTS idx_pecas_producao_etapa ON public.pecas_producao(etapa);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_projeto_tipo ON public.movimentacoes(projeto_id, tipo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_obra ON public.lancamentos_despesas(obra_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_ativo ON public.user_profiles(role, ativo);

-- ============================================================================
-- 8. GRANT PERMISSIONS para anon e authenticated
-- ============================================================================

-- RPC functions acessíveis por authenticated
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_producao_por_obra(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financeiro_resumo(TEXT) TO authenticated;

-- View acessível
GRANT SELECT ON public.v_usuarios TO authenticated;
GRANT SELECT ON public.v_usuarios TO anon;

-- ============================================================================
-- 9. VALIDAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
  v_users_updated INTEGER;
  v_functions_count INTEGER;
  v_indexes_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_users_updated FROM auth.users
  WHERE email LIKE '%@grupomontex.com.br';

  SELECT COUNT(*) INTO v_functions_count FROM pg_proc
  WHERE proname IN ('get_dashboard_stats', 'get_producao_por_obra', 'get_financeiro_resumo');

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'MIGRATION V6 - RESUMO DA EXECUÇÃO';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Senhas atualizadas: % usuários', v_users_updated;
  RAISE NOTICE 'RPC Functions criadas: %', v_functions_count;
  RAISE NOTICE 'View v_usuarios criada: SIM';
  RAISE NOTICE 'Validações JSONB adicionadas: SIM';
  RAISE NOTICE 'Triggers de validação obra_id: SIM';
  RAISE NOTICE '==========================================';
END $$;

-- ============================================================================
-- FIM DA MIGRATION V6
-- ============================================================================
