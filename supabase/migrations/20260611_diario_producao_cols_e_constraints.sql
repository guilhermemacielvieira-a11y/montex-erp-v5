-- ============================================
-- Diário de Produção: alinhar tabela `diario_producao` ao que a página usa.
-- Aplicado em produção em 2026-06-11 (idempotente / não-destrutivo).
-- ============================================
ALTER TABLE public.diario_producao ADD COLUMN IF NOT EXISTS etapa text;
ALTER TABLE public.diario_producao ADD COLUMN IF NOT EXISTS equipe_id text;
ALTER TABLE public.diario_producao ADD COLUMN IF NOT EXISTS equipe_nome text;
ALTER TABLE public.diario_producao ADD COLUMN IF NOT EXISTS funcionario_id text;
ALTER TABLE public.diario_producao ADD COLUMN IF NOT EXISTS funcionario_nome text;
ALTER TABLE public.diario_producao ADD COLUMN IF NOT EXISTS unidades_produzidas integer DEFAULT 0;
ALTER TABLE public.diario_producao ADD COLUMN IF NOT EXISTS kg_processados numeric DEFAULT 0;
ALTER TABLE public.diario_producao ADD COLUMN IF NOT EXISTS meta_unidades integer;
ALTER TABLE public.diario_producao ADD COLUMN IF NOT EXISTS meta_kg numeric;
ALTER TABLE public.diario_producao ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.diario_producao ADD COLUMN IF NOT EXISTS turno text;

-- coluna legada 'obra' era NOT NULL sem default e bloqueava os inserts da página
ALTER TABLE public.diario_producao ALTER COLUMN obra DROP NOT NULL;

-- CHECK de turno tinha valores antigos (normal/noturno/integral);
-- a página Diário de Produção usa Manhã/Tarde/Noite
ALTER TABLE public.diario_producao DROP CONSTRAINT IF EXISTS diario_producao_turno_check;
ALTER TABLE public.diario_producao ADD CONSTRAINT diario_producao_turno_check CHECK (turno IN ('Manhã','Tarde','Noite'));
