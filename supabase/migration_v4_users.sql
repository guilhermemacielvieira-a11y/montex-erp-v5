-- ============================================================================
-- MIGRATION V4: SISTEMA DE USUÁRIOS E PERFIS
-- Data: 2025-02-10
-- Descrição: Criação da tabela user_profiles, usuários de autenticação
--            e configuração de permissões e identidades
-- ============================================================================

-- ============================================================================
-- 1. CRIAR TABELA user_profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  -- Identificadores
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  auth_id TEXT NOT NULL UNIQUE,

  -- Informações de Contato e Identificação
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,

  -- Papéis e Permissões
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'gerente', 'supervisor', 'operador', 'financeiro', 'viewer')),
  cargo TEXT,
  departamento TEXT,

  -- Configurações do Usuário
  avatar_url TEXT,
  obra_padrao TEXT,
  telefone TEXT,
  permissoes_custom JSONB DEFAULT '[]'::jsonb,

  -- Status e Auditoria
  ativo BOOLEAN DEFAULT true,
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários para documentação
COMMENT ON TABLE public.user_profiles IS 'Armazena perfis de usuários vinculados à autenticação Supabase';
COMMENT ON COLUMN public.user_profiles.id IS 'UUID único do perfil do usuário';
COMMENT ON COLUMN public.user_profiles.auth_id IS 'Referência ao ID do usuário em auth.users';
COMMENT ON COLUMN public.user_profiles.role IS 'Papel do usuário no sistema: admin, gerente, supervisor, operador, financeiro ou viewer';
COMMENT ON COLUMN public.user_profiles.permissoes_custom IS 'Permissões customizadas em formato JSON que sobrescrevem as permissões padrão do role';
COMMENT ON COLUMN public.user_profiles.obra_padrao IS 'Obra padrão do usuário para acesso rápido';
COMMENT ON COLUMN public.user_profiles.ativo IS 'Indica se o usuário está ativo no sistema';

-- ============================================================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_id ON public.user_profiles(auth_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_ativo ON public.user_profiles(ativo);

-- ============================================================================
-- 3. DESABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CRIAR FUNÇÃO E TRIGGER PARA UPDATED_AT
-- ============================================================================

-- Criar função que atualiza o timestamp updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger que chama a função antes de UPDATE
DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. CRIAR USUÁRIOS DE AUTENTICAÇÃO (auth.users)
-- ============================================================================

-- Nota: Os usuários são inseridos em auth.users usando a função crypt()
-- para gerar hashs bcrypt das senhas. A senha padrão é utilizada apenas
-- para inicialização. Recomenda-se resetar senhas em produção.

-- Usuário 1: Guilherme Maciel Vieira (Admin)
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at, confirmation_token, recovery_token,
  raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111'::uuid,
  'authenticated', 'authenticated',
  'guilherme@grupomontex.com.br',
  crypt('Montex@Admin2025', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '',
  '{"provider":"email","providers":["email"]}',
  '{}'
) ON CONFLICT (email) DO NOTHING;

-- Usuário 2: Carlos Eduardo Silva (Gerente)
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at, confirmation_token, recovery_token,
  raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222'::uuid,
  'authenticated', 'authenticated',
  'gerente@grupomontex.com.br',
  crypt('Montex@Gerente2025', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '',
  '{"provider":"email","providers":["email"]}',
  '{}'
) ON CONFLICT (email) DO NOTHING;

-- Usuário 3: Roberto Almeida Santos (Supervisor)
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at, confirmation_token, recovery_token,
  raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333'::uuid,
  'authenticated', 'authenticated',
  'supervisor@grupomontex.com.br',
  crypt('Montex@Super2025', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '',
  '{"provider":"email","providers":["email"]}',
  '{}'
) ON CONFLICT (email) DO NOTHING;

-- Usuário 4: João Paulo Ferreira (Operador)
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at, confirmation_token, recovery_token,
  raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '44444444-4444-4444-4444-444444444444'::uuid,
  'authenticated', 'authenticated',
  'operador@grupomontex.com.br',
  crypt('Montex@Oper2025', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '',
  '{"provider":"email","providers":["email"]}',
  '{}'
) ON CONFLICT (email) DO NOTHING;

-- Usuário 5: Ana Carolina Mendes (Financeiro)
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at, confirmation_token, recovery_token,
  raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '55555555-5555-5555-5555-555555555555'::uuid,
  'authenticated', 'authenticated',
  'financeiro@grupomontex.com.br',
  crypt('Montex@Fin2025', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '',
  '{"provider":"email","providers":["email"]}',
  '{}'
) ON CONFLICT (email) DO NOTHING;

-- Usuário 6: Maria Fernanda Costa (Viewer)
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at, confirmation_token, recovery_token,
  raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '66666666-6666-6666-6666-666666666666'::uuid,
  'authenticated', 'authenticated',
  'viewer@grupomontex.com.br',
  crypt('Montex@View2025', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '',
  '{"provider":"email","providers":["email"]}',
  '{}'
) ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 6. CRIAR PERFIS DE USUÁRIOS (user_profiles)
-- ============================================================================

-- Perfil 1: Guilherme Maciel Vieira (Admin)
INSERT INTO public.user_profiles (
  id, auth_id, email, nome, role, cargo, departamento, ativo
)
SELECT
  gen_random_uuid()::text,
  au.id::text,
  au.email,
  'Guilherme Maciel Vieira',
  'admin',
  'Diretor Geral',
  'Diretoria',
  true
FROM auth.users au
WHERE au.email = 'guilherme@grupomontex.com.br'
ON CONFLICT (email) DO NOTHING;

-- Perfil 2: Carlos Eduardo Silva (Gerente)
INSERT INTO public.user_profiles (
  id, auth_id, email, nome, role, cargo, departamento, ativo
)
SELECT
  gen_random_uuid()::text,
  au.id::text,
  au.email,
  'Carlos Eduardo Silva',
  'gerente',
  'Gerente de Produção',
  'Produção',
  true
FROM auth.users au
WHERE au.email = 'gerente@grupomontex.com.br'
ON CONFLICT (email) DO NOTHING;

-- Perfil 3: Roberto Almeida Santos (Supervisor)
INSERT INTO public.user_profiles (
  id, auth_id, email, nome, role, cargo, departamento, ativo
)
SELECT
  gen_random_uuid()::text,
  au.id::text,
  au.email,
  'Roberto Almeida Santos',
  'supervisor',
  'Supervisor de Fábrica',
  'Produção',
  true
FROM auth.users au
WHERE au.email = 'supervisor@grupomontex.com.br'
ON CONFLICT (email) DO NOTHING;

-- Perfil 4: João Paulo Ferreira (Operador)
INSERT INTO public.user_profiles (
  id, auth_id, email, nome, role, cargo, departamento, ativo
)
SELECT
  gen_random_uuid()::text,
  au.id::text,
  au.email,
  'João Paulo Ferreira',
  'operador',
  'Operador de Produção',
  'Produção',
  true
FROM auth.users au
WHERE au.email = 'operador@grupomontex.com.br'
ON CONFLICT (email) DO NOTHING;

-- Perfil 5: Ana Carolina Mendes (Financeiro)
INSERT INTO public.user_profiles (
  id, auth_id, email, nome, role, cargo, departamento, ativo
)
SELECT
  gen_random_uuid()::text,
  au.id::text,
  au.email,
  'Ana Carolina Mendes',
  'financeiro',
  'Analista Financeira',
  'Financeiro',
  true
FROM auth.users au
WHERE au.email = 'financeiro@grupomontex.com.br'
ON CONFLICT (email) DO NOTHING;

-- Perfil 6: Maria Fernanda Costa (Viewer)
INSERT INTO public.user_profiles (
  id, auth_id, email, nome, role, cargo, departamento, ativo
)
SELECT
  gen_random_uuid()::text,
  au.id::text,
  au.email,
  'Maria Fernanda Costa',
  'viewer',
  'Assistente Administrativa',
  'Administrativo',
  true
FROM auth.users au
WHERE au.email = 'viewer@grupomontex.com.br'
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 7. CRIAR ENTRADAS DE IDENTIDADE (auth.identities)
-- ============================================================================

-- Nota: As identidades vinculam o método de autenticação (email/password)
-- ao usuário. Cada entrada permite que o Supabase valide o login.

-- Identidade 1: Guilherme Maciel Vieira
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT
  au.id, au.id,
  json_build_object('sub', au.id::text, 'email', au.email),
  'email',
  au.id,
  NOW(), NOW(), NOW()
FROM auth.users au
WHERE au.email = 'guilherme@grupomontex.com.br'
ON CONFLICT DO NOTHING;

-- Identidade 2: Carlos Eduardo Silva
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT
  au.id, au.id,
  json_build_object('sub', au.id::text, 'email', au.email),
  'email',
  au.id,
  NOW(), NOW(), NOW()
FROM auth.users au
WHERE au.email = 'gerente@grupomontex.com.br'
ON CONFLICT DO NOTHING;

-- Identidade 3: Roberto Almeida Santos
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT
  au.id, au.id,
  json_build_object('sub', au.id::text, 'email', au.email),
  'email',
  au.id,
  NOW(), NOW(), NOW()
FROM auth.users au
WHERE au.email = 'supervisor@grupomontex.com.br'
ON CONFLICT DO NOTHING;

-- Identidade 4: João Paulo Ferreira
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT
  au.id, au.id,
  json_build_object('sub', au.id::text, 'email', au.email),
  'email',
  au.id,
  NOW(), NOW(), NOW()
FROM auth.users au
WHERE au.email = 'operador@grupomontex.com.br'
ON CONFLICT DO NOTHING;

-- Identidade 5: Ana Carolina Mendes
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT
  au.id, au.id,
  json_build_object('sub', au.id::text, 'email', au.email),
  'email',
  au.id,
  NOW(), NOW(), NOW()
FROM auth.users au
WHERE au.email = 'financeiro@grupomontex.com.br'
ON CONFLICT DO NOTHING;

-- Identidade 6: Maria Fernanda Costa
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT
  au.id, au.id,
  json_build_object('sub', au.id::text, 'email', au.email),
  'email',
  au.id,
  NOW(), NOW(), NOW()
FROM auth.users au
WHERE au.email = 'viewer@grupomontex.com.br'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. VALIDAÇÃO E SUMMARY
-- ============================================================================

-- Query para verificação: contagem de usuários criados
DO $$
DECLARE
  v_users_count INTEGER;
  v_profiles_count INTEGER;
  v_identities_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_users_count FROM auth.users
  WHERE email LIKE '%@grupomontex.com.br';

  SELECT COUNT(*) INTO v_profiles_count FROM public.user_profiles;

  SELECT COUNT(*) INTO v_identities_count FROM auth.identities
  WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%@grupomontex.com.br'
  );

  RAISE NOTICE '======================================';
  RAISE NOTICE 'MIGRATION V4 - RESUMO DA EXECUÇÃO';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Usuários de autenticação criados: %', v_users_count;
  RAISE NOTICE 'Perfis de usuários criados: %', v_profiles_count;
  RAISE NOTICE 'Identidades criadas: %', v_identities_count;
  RAISE NOTICE '======================================';
END $$;

-- ============================================================================
-- FIM DA MIGRATION V4
-- ============================================================================
