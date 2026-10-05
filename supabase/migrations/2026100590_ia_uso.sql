-- ============================================================
-- IA — registro de uso (Copiloto MONTEX / Insights IA)
-- ============================================================
-- Cada chamada à Edge Function `ia-copiloto` grava uma linha com o usuário,
-- o modo e os tokens consumidos. Serve para (1) limite diário por usuário e
-- (2) acompanhamento de custo. Idempotente e aditiva.
-- ============================================================

CREATE TABLE IF NOT EXISTS ia_uso (
  id             bigserial PRIMARY KEY,
  user_id        uuid NOT NULL DEFAULT auth.uid(),
  modo           text NOT NULL,                 -- chat | insights | prompt
  modelo         text NULL,
  input_tokens   integer NOT NULL DEFAULT 0,
  output_tokens  integer NOT NULL DEFAULT 0,
  cache_read_tokens integer NOT NULL DEFAULT 0,
  stop_reason    text NULL,
  erro           text NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ia_uso_user_dia ON ia_uso (user_id, created_at);

ALTER TABLE ia_uso ENABLE ROW LEVEL SECURITY;

-- Cada usuário grava e lê apenas o próprio uso.
DO $$ BEGIN
  CREATE POLICY "ia_uso_insert_own" ON ia_uso FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ia_uso_select_own" ON ia_uso FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
