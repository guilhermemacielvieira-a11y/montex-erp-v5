-- ============================================================
-- Fase 3 — Tarefas, colaboração, notificações, automações, relatórios
-- ============================================================
-- Aditiva e idempotente. Substitui entidades do entity_store que nunca
-- persistiram (MensagemProjeto, Automacao, LogAutomacao, AgendamentoRelatorio,
-- HistoricoRelatorio, Notificacao) por tabelas reais.
-- ============================================================

-- ---------- Tarefas: campos que a UI usa ----------
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS horas_estimadas numeric(10,2);
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS horas_realizadas numeric(10,2);
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS percentual integer NOT NULL DEFAULT 0;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS dependencias jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';  -- manual | automacao | alerta | importacao
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS origem_ref text;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS criado_por uuid DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS idx_tarefas_data_fim ON tarefas (data_fim);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tarefas_origem ON tarefas (origem, origem_ref) WHERE origem_ref IS NOT NULL;

-- ---------- Mural/comentários (por obra e por tarefa) ----------
CREATE TABLE IF NOT EXISTS colaboracao_mensagens (
  id          bigserial PRIMARY KEY,
  obra_id     text NULL,
  tarefa_id   text NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  autor_id    uuid NULL DEFAULT auth.uid(),
  autor_nome  text NULL,
  texto       text NOT NULL,
  anexo_url   text NULL,
  anexo_nome  text NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_colab_obra ON colaboracao_mensagens (obra_id, created_at);
CREATE INDEX IF NOT EXISTS idx_colab_tarefa ON colaboracao_mensagens (tarefa_id, created_at);

-- ---------- Notificações persistidas ----------
CREATE TABLE IF NOT EXISTS notificacoes (
  id            bigserial PRIMARY KEY,
  titulo        text NOT NULL,
  mensagem      text NULL,
  severidade    text NOT NULL DEFAULT 'info',   -- critico | alto | medio | info
  link          text NULL,
  obra_id       text NULL,
  origem        text NOT NULL DEFAULT 'sistema', -- automacao | relatorio | sistema | usuario
  origem_ref    text NULL,
  destino_role  text NULL,                       -- null = todos
  destino_user  uuid NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notificacoes (created_at DESC);

CREATE TABLE IF NOT EXISTS notificacoes_lidas (
  notificacao_id bigint NOT NULL REFERENCES notificacoes(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL DEFAULT auth.uid(),
  lida_em        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notificacao_id, user_id)
);

-- ---------- Automações ----------
CREATE TABLE IF NOT EXISTS automacoes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             text NOT NULL,
  descricao        text NULL,
  ativa            boolean NOT NULL DEFAULT true,
  gatilho          text NOT NULL,   -- peca_parada | conta_vencendo | conta_vencida | medicao_sem_recebimento | estoque_minimo | obra_sem_producao | prazo_obra
  parametros       jsonb NOT NULL DEFAULT '{}'::jsonb,
  acoes            jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{tipo: notificar|criar_tarefa|push, ...}]
  obra_id          text NULL,       -- null = todas as obras
  ultima_execucao  timestamptz NULL,
  criado_por       uuid NULL DEFAULT auth.uid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automacoes_log (
  id            bigserial PRIMARY KEY,
  automacao_id  uuid NULL REFERENCES automacoes(id) ON DELETE CASCADE,
  executada_em  timestamptz NOT NULL DEFAULT now(),
  origem        text NOT NULL DEFAULT 'agendada',   -- agendada | manual | teste
  status        text NOT NULL,                      -- ok | sem_disparo | erro
  disparos      integer NOT NULL DEFAULT 0,
  detalhes      jsonb NULL,
  erro          text NULL
);
CREATE INDEX IF NOT EXISTS idx_autolog ON automacoes_log (automacao_id, executada_em DESC);

-- Deduplicação: a mesma ocorrência (chave) só dispara uma vez por automação.
CREATE TABLE IF NOT EXISTS automacoes_disparos (
  automacao_id  uuid NOT NULL REFERENCES automacoes(id) ON DELETE CASCADE,
  chave         text NOT NULL,
  disparado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (automacao_id, chave)
);

-- ---------- Relatórios ----------
CREATE TABLE IF NOT EXISTS relatorios_agendamentos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             text NOT NULL,
  tipo             text NOT NULL,     -- executivo | producao | financeiro | estoque | alertas
  obra_id          text NULL,
  frequencia       text NOT NULL DEFAULT 'semanal',  -- diaria | semanal | mensal
  dia_semana       integer NULL,      -- 1=seg … 7=dom
  dia_mes          integer NULL,
  hora             integer NOT NULL DEFAULT 7,       -- hora de Brasília
  ativo            boolean NOT NULL DEFAULT true,
  destino_role     text NULL,
  ultima_execucao  timestamptz NULL,
  criado_por       uuid NULL DEFAULT auth.uid(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS relatorios_historico (
  id               bigserial PRIMARY KEY,
  tipo             text NOT NULL,
  titulo           text NOT NULL,
  obra_id          text NULL,
  escopo_rotulo    text NULL,
  formato          text NULL,          -- pdf | xlsx | csv | resumo
  origem           text NOT NULL DEFAULT 'manual',  -- manual | agendado
  agendamento_id   uuid NULL REFERENCES relatorios_agendamentos(id) ON DELETE SET NULL,
  parametros       jsonb NULL,
  resumo           jsonb NULL,
  gerado_por       uuid NULL DEFAULT auth.uid(),
  gerado_por_nome  text NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_relhist_created ON relatorios_historico (created_at DESC);

-- ---------- RLS: equipe autenticada; leitura de notificação por usuário ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['colaboracao_mensagens','notificacoes','automacoes','automacoes_log','automacoes_disparos','relatorios_agendamentos','relatorios_historico'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    BEGIN
      EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t || '_auth_all', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END LOOP;
END $$;

ALTER TABLE notificacoes_lidas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "notif_lidas_own" ON notificacoes_lidas FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Realtime ----------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE colaboracao_mensagens;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE tarefas;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL; END $$;
