-- ============================================================
-- MIGRATION v13 — Tabela categorias_despesas (catálogo dinâmico)
-- ============================================================
-- CONTEXTO:
-- Hoje as categorias estão hardcoded em useFinancialIntelligence.js
-- (8 categorias fixas: Matéria Prima, Mão de Obra, Energia/Utilidades,
-- Manutenção, Transporte, Administrativo, Impostos, Outros).
--
-- Adicionar "Tecnologia", "Marketing", ou "Hospedagem" exige edição de
-- código + redeploy. A Fase 3b move o catálogo para o Supabase, permitindo
-- gestão direto da UI (cor, ícone, ativa/inativa, ordem).
--
-- ESTRATÉGIA DE DEPLOY:
-- 1. Aplicar este SQL no Supabase Studio.
-- 2. Tabela vem pré-populada com as 9 categorias padrão (incluindo Alumínio).
-- 3. Frontend (DespesasPage) passa a ler `categorias_despesas` em vez do
--    array CATEGORIAS_PADRAO em categoriaInteligente.js. Implementar como
--    Fase 3b separada — esta migration é o passo zero.
--
-- REVERT:
--   DROP TABLE IF EXISTS categorias_despesas CASCADE;
-- ============================================================

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS categorias_despesas (
  id text PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  cor text NOT NULL DEFAULT '#94A3B8',
  icone text DEFAULT 'Tag',
  ativa boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  descricao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Trigger updated_at automático
CREATE OR REPLACE FUNCTION categorias_despesas_set_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS categorias_despesas_updated_at ON categorias_despesas;
CREATE TRIGGER categorias_despesas_updated_at
  BEFORE UPDATE ON categorias_despesas
  FOR EACH ROW EXECUTE FUNCTION categorias_despesas_set_updated_at();

-- 3. Seed com as 9 categorias padrão
INSERT INTO categorias_despesas (id, nome, cor, icone, ordem, descricao) VALUES
  ('materia_prima',   'Matéria Prima',      '#3B82F6', 'Package',    10, 'Insumos de fabricação, aço, ferro, consumíveis'),
  ('mao_de_obra',     'Mão de Obra',        '#60A5FA', 'Users',      20, 'Folha, diárias, FGTS, INSS, benefícios'),
  ('energia',         'Energia/Utilidades', '#F59E0B', 'Zap',        30, 'Energia elétrica, água, gás, conta de luz'),
  ('manutencao',      'Manutenção',         '#10B981', 'Wrench',     40, 'Manutenção de equipamentos, EPIs, ferramentas'),
  ('transporte',      'Transporte',         '#EC4899', 'Truck',      50, 'Combustível, fretes, passagens, locação veicular'),
  ('administrativo',  'Administrativo',     '#06B6D4', 'Briefcase',  60, 'Contabilidade, internet, telefone, planos de saúde, aluguel'),
  ('impostos',        'Impostos',           '#EF4444', 'FileText',   70, 'INSS, Simples, DAS, impostos diversos'),
  ('aluminio',        'Alumínio',           '#D97706', 'Square',     80, 'Esquadrias, perfis e materiais de alumínio'),
  ('outros',          'Outros',             '#94A3B8', 'HelpCircle', 999, 'Categoria genérica de fallback')
ON CONFLICT (id) DO NOTHING;

-- 4. Índice para listar ativas ordenadas
CREATE INDEX IF NOT EXISTS categorias_despesas_ativa_idx
  ON categorias_despesas (ativa, ordem)
  WHERE ativa = true;

-- 5. Verificação
DO $$
DECLARE total int;
BEGIN
  SELECT count(*) INTO total FROM categorias_despesas;
  RAISE NOTICE 'Migration v13 OK: % categorias seed inseridas (ativas=%)',
    total, (SELECT count(*) FROM categorias_despesas WHERE ativa = true);
END $$;

-- ============================================================
-- PRÓXIMOS PASSOS (Fase 3b — fora desta migration):
--
-- a) DespesasPage: novo useEffect carrega via supabase.from('categorias_despesas')
--    .select().eq('ativa', true).order('ordem')
-- b) Fallback para CATEGORIAS_PADRAO se a tabela vazia ou inacessível
-- c) Modal "Gerenciar Categorias" (lista, cor, ícone, ativa, ordem)
-- d) ImportarNFModal: select também lê do Supabase
-- ============================================================
