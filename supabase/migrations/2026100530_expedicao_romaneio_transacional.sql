-- ============================================================================
-- EXPEDIÇÃO: romaneio transacional (criar / despachar / excluir)
-- ============================================================================
-- CAUSA RAIZ
--   * Peças viravam `enviado` (Em Obra) já na CRIAÇÃO do romaneio, mesmo com o
--     romaneio em "preparando" → Montagem/3D mostravam peças ainda no pátio
--     como "em obra".
--   * Criação/despacho/exclusão eram N chamadas REST soltas no cliente (split
--     parcial, insert do romaneio, update das peças) com `.catch(()=>{})`
--     engolindo erros → estados intermediários inconsistentes.
--   * Status gravado em caixas diferentes (ENTREGUE x entregue).
--   * Exclusão de romaneio era hard-delete e deixava as peças em `enviado`.
--
-- REGRA NOVA
--   * criar_romaneio: peças continuam em `expedido`; envio parcial vira uma
--     linha própria (split determinístico `<id>__split_enviado_<romaneio>`),
--     reservada no romaneio, ainda em `expedido`.
--   * despachar_romaneio: em_transito/entregue → peças `enviado`;
--     preparando/aguardando_transporte/problema → peças voltam a `expedido`.
--   * excluir_romaneio: peças voltam a `expedido`, splits são reunidos à peça
--     original (quando ela ainda está em `expedido` e livre) e o romaneio é
--     soft-deletado (deleted_at).
--
-- Idempotente. Funções SECURITY INVOKER (respeitam o RLS do usuário).
-- ============================================================================

-- 1) Colunas novas -----------------------------------------------------------
ALTER TABLE public.expedicoes ADD COLUMN IF NOT EXISTS data_saida      date;
ALTER TABLE public.expedicoes ADD COLUMN IF NOT EXISTS data_entrega    date;
ALTER TABLE public.expedicoes ADD COLUMN IF NOT EXISTS deleted_at      timestamptz;
ALTER TABLE public.expedicoes ADD COLUMN IF NOT EXISTS motivo_problema text;

-- 2) Normalização de status (uma vez) + CHECK -------------------------------
UPDATE public.expedicoes
   SET status = lower(btrim(status))
 WHERE status IS NOT NULL AND status <> lower(btrim(status));

UPDATE public.expedicoes
   SET status = CASE
                  WHEN status IN ('enviado', 'expedido', 'em transito', 'em_trânsito') THEN 'em_transito'
                  WHEN status IN ('aguardando', 'aguardando transporte')               THEN 'aguardando_transporte'
                  ELSE 'preparando'
                END
 WHERE status IS NULL
    OR status NOT IN ('preparando', 'aguardando_transporte', 'em_transito', 'entregue', 'problema');

ALTER TABLE public.expedicoes ALTER COLUMN status SET DEFAULT 'preparando';
ALTER TABLE public.expedicoes ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'expedicoes_status_check'
       AND conrelid = 'public.expedicoes'::regclass
  ) THEN
    ALTER TABLE public.expedicoes
      ADD CONSTRAINT expedicoes_status_check
      CHECK (status IN ('preparando', 'aguardando_transporte', 'em_transito', 'entregue', 'problema'));
  END IF;
END $$;

-- Datas de saída/entrega dos romaneios legados já despachados
UPDATE public.expedicoes
   SET data_saida = data_expedicao
 WHERE data_saida IS NULL AND status IN ('em_transito', 'entregue');
UPDATE public.expedicoes
   SET data_entrega = data_expedicao
 WHERE data_entrega IS NULL AND status = 'entregue';

CREATE INDEX IF NOT EXISTS idx_expedicoes_ativos
  ON public.expedicoes (obra_id) WHERE deleted_at IS NULL;

-- 3) Helpers internos ---------------------------------------------------------
-- Itens do romaneio que representam a linha INTEIRA da peça (novos romaneios
-- sempre; legados pré-split com qtd_enviada < qtd_total são ignorados para
-- não mover a peça original inteira).
CREATE OR REPLACE FUNCTION public._romaneio_ids_integrais(p_pecas jsonb)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT x.pid ORDER BY x.pid), '{}'::text[])
    FROM (
      SELECT CASE jsonb_typeof(e) WHEN 'object' THEN e->>'id' ELSE e #>> '{}' END AS pid,
             CASE jsonb_typeof(e) WHEN 'object' THEN e ELSE '{}'::jsonb END      AS obj
        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_pecas) = 'array' THEN p_pecas ELSE '[]'::jsonb END) e
    ) x
   WHERE x.pid IS NOT NULL AND x.pid <> ''
     AND coalesce(
       nullif(x.obj->>'qtd_enviada', '')::numeric >= nullif(x.obj->>'qtd_total', '')::numeric,
       true
     );
$$;

CREATE OR REPLACE FUNCTION public._hoje_brt()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $$ SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date $$;

-- 4) criar_romaneio(p jsonb) -------------------------------------------------
-- p = { id?, numero_romaneio?, data_expedicao?, status? (preparando|aguardando_transporte),
--       transportadora?, motorista?, placa?, observacoes?, destino?,
--       pecas: [{ id, qtd }] }
CREATE OR REPLACE FUNCTION public.criar_romaneio(p jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_id        text := nullif(btrim(p->>'id'), '');
  v_status    text := lower(coalesce(nullif(btrim(p->>'status'), ''), 'preparando'));
  v_item      jsonb;
  v_peca      pecas_producao%ROWTYPE;
  v_pj        jsonb;
  v_pid       text;
  v_qtd       int;
  v_qtd_atual int;
  v_obra      text;
  v_primeira  boolean := true;
  v_peso      numeric := 0;
  v_peso_item numeric;
  v_peso_orig numeric;
  v_split_id  text;
  v_entries   jsonb := '[]'::jsonb;
  v_splits    jsonb := '[]'::jsonb;
  v_ids       text[];
  v_tem_qp    boolean;
  v_rom       text;
  v_destino   text;
  v_row       expedicoes%ROWTYPE;
  v_now       timestamptz := now();
BEGIN
  IF v_status NOT IN ('preparando', 'aguardando_transporte') THEN
    RAISE EXCEPTION 'Status inicial inválido para romaneio: % (use preparando ou aguardando_transporte)', v_status
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p->'pecas') IS DISTINCT FROM 'array' OR jsonb_array_length(p->'pecas') = 0 THEN
    RAISE EXCEPTION 'Romaneio sem peças' USING ERRCODE = '22023';
  END IF;

  SELECT array_agg(e->>'id') INTO v_ids FROM jsonb_array_elements(p->'pecas') e;
  IF EXISTS (SELECT 1 FROM unnest(v_ids) u WHERE u IS NULL OR btrim(u) = '') THEN
    RAISE EXCEPTION 'Item do romaneio sem id de peça' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(DISTINCT u) FROM unnest(v_ids) u) <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'Peça repetida no romaneio' USING ERRCODE = '22023';
  END IF;

  IF v_id IS NULL THEN
    v_id := 'EXP-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 4);
  END IF;
  IF EXISTS (SELECT 1 FROM expedicoes WHERE id = v_id) THEN
    RAISE EXCEPTION 'Romaneio % já existe', v_id USING ERRCODE = '23505';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'pecas_producao' AND column_name = 'quantidade_produzida'
  ) INTO v_tem_qp;

  -- Trava as peças em ordem determinística (evita deadlock entre romaneios concorrentes)
  PERFORM 1 FROM pecas_producao WHERE id = ANY (v_ids) ORDER BY id FOR UPDATE;

  FOR v_item IN SELECT e FROM jsonb_array_elements(p->'pecas') e LOOP
    v_pid := v_item->>'id';

    SELECT * INTO v_peca FROM pecas_producao WHERE id = v_pid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Peça % não encontrada', v_pid USING ERRCODE = 'P0002';
    END IF;

    IF coalesce(v_peca.etapa, '') <> 'expedido' THEN
      RAISE EXCEPTION 'Peça % não está na Fila de Embarque (etapa atual: %)',
        coalesce(v_peca.marca, v_pid), coalesce(v_peca.etapa, '-') USING ERRCODE = '22023';
    END IF;

    IF v_peca.obra_id IS NULL THEN
      RAISE EXCEPTION 'Peça % sem obra vinculada', coalesce(v_peca.marca, v_pid) USING ERRCODE = '22023';
    END IF;
    IF v_primeira THEN
      v_obra := v_peca.obra_id;
      v_primeira := false;
    ELSIF v_peca.obra_id IS DISTINCT FROM v_obra THEN
      RAISE EXCEPTION 'Romaneio não pode misturar obras (% e %)', v_obra, v_peca.obra_id USING ERRCODE = '22023';
    END IF;

    -- Já reservada (linha inteira) em outro romaneio ativo?
    SELECT e.id INTO v_rom
      FROM expedicoes e
     WHERE e.deleted_at IS NULL
       AND v_pid = ANY (public._romaneio_ids_integrais(e.pecas))
     LIMIT 1;
    IF v_rom IS NOT NULL THEN
      RAISE EXCEPTION 'Peça % já está no romaneio %', coalesce(v_peca.marca, v_pid), v_rom USING ERRCODE = '22023';
    END IF;

    v_qtd_atual := greatest(coalesce(v_peca.quantidade, 1), 1);
    v_qtd := coalesce(nullif(v_item->>'qtd', '')::int, nullif(v_item->>'qtd_enviada', '')::int, v_qtd_atual);
    IF v_qtd <= 0 THEN
      RAISE EXCEPTION 'Quantidade inválida para a peça %', coalesce(v_peca.marca, v_pid) USING ERRCODE = '22023';
    END IF;
    IF v_qtd > v_qtd_atual THEN
      RAISE EXCEPTION 'Quantidade insuficiente da peça % (pedido %, disponível %)',
        coalesce(v_peca.marca, v_pid), v_qtd, v_qtd_atual USING ERRCODE = '22023';
    END IF;

    v_peso_orig := coalesce(v_peca.peso_total, coalesce(v_peca.peso_unitario, 0) * v_qtd_atual, 0);

    IF v_qtd < v_qtd_atual THEN
      -- ENVIO PARCIAL: isola as unidades do romaneio numa linha própria (ainda 'expedido')
      v_split_id  := v_pid || '__split_enviado_' || v_id;
      v_peso_item := round(v_peso_orig * v_qtd / v_qtd_atual, 2);
      IF EXISTS (SELECT 1 FROM pecas_producao WHERE id = v_split_id) THEN
        RAISE EXCEPTION 'Split % já existe', v_split_id USING ERRCODE = '23505';
      END IF;

      v_pj := to_jsonb(v_peca) || jsonb_build_object(
        'id', v_split_id,
        'quantidade', v_qtd,
        'peso_total', v_peso_item,
        'created_at', v_now,
        'updated_at', v_now
      );
      IF v_tem_qp THEN
        v_pj := v_pj || jsonb_build_object('quantidade_produzida',
          least(coalesce((to_jsonb(v_peca)->>'quantidade_produzida')::int, 0), v_qtd));
      END IF;
      INSERT INTO pecas_producao SELECT (jsonb_populate_record(NULL::pecas_producao, v_pj)).*;

      UPDATE pecas_producao
         SET quantidade = v_qtd_atual - v_qtd,
             peso_total = v_peso_orig - v_peso_item,
             updated_at = v_now
       WHERE id = v_pid;
      IF v_tem_qp THEN
        EXECUTE 'UPDATE pecas_producao SET quantidade_produzida = greatest(coalesce(quantidade_produzida, 0) - $1, 0) WHERE id = $2'
          USING v_qtd, v_pid;
      END IF;

      v_entries := v_entries || jsonb_build_array(jsonb_build_object(
        'id', v_split_id, 'qtd_enviada', v_qtd, 'qtd_total', v_qtd, 'id_original', v_pid));
      v_splits := v_splits || jsonb_build_array(jsonb_build_object('id', v_split_id, 'id_original', v_pid, 'qtd', v_qtd));
    ELSE
      v_peso_item := v_peso_orig;
      v_entries := v_entries || jsonb_build_array(jsonb_build_object(
        'id', v_pid, 'qtd_enviada', v_qtd, 'qtd_total', v_qtd));
    END IF;

    v_peso := v_peso + v_peso_item;
  END LOOP;

  v_destino := nullif(btrim(p->>'destino'), '');
  IF v_destino IS NULL THEN
    SELECT o.nome INTO v_destino FROM obras o WHERE o.id = v_obra;
  END IF;

  INSERT INTO expedicoes (
    id, obra_id, numero_romaneio, data_expedicao, status,
    transportadora, motorista, placa, peso_total, pecas, destino, observacoes,
    created_at, updated_at
  ) VALUES (
    v_id,
    v_obra,
    coalesce(nullif(btrim(p->>'numero_romaneio'), ''), v_id),
    coalesce(nullif(p->>'data_expedicao', '')::date, public._hoje_brt()),
    v_status,
    nullif(btrim(p->>'transportadora'), ''),
    nullif(btrim(p->>'motorista'), ''),
    nullif(btrim(p->>'placa'), ''),
    round(v_peso, 2),
    v_entries,
    v_destino,
    nullif(btrim(p->>'observacoes'), ''),
    v_now, v_now
  )
  RETURNING * INTO v_row;

  RETURN json_build_object('expedicao', to_json(v_row), 'splits', v_splits);
END;
$$;

-- 5) despachar_romaneio(p_id, p_status, p_motivo) ---------------------------
CREATE OR REPLACE FUNCTION public.despachar_romaneio(p_id text, p_status text, p_motivo text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_exp    expedicoes%ROWTYPE;
  v_ids    text[];
  v_n      int := 0;
  v_hoje   date := public._hoje_brt();
BEGIN
  IF v_status NOT IN ('preparando', 'aguardando_transporte', 'em_transito', 'entregue', 'problema') THEN
    RAISE EXCEPTION 'Status de romaneio inválido: %', p_status USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_exp FROM expedicoes WHERE id = p_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Romaneio % não encontrado', p_id USING ERRCODE = 'P0002';
  END IF;

  v_ids := public._romaneio_ids_integrais(v_exp.pecas);
  PERFORM 1 FROM pecas_producao WHERE id = ANY (v_ids) ORDER BY id FOR UPDATE;

  IF v_status IN ('em_transito', 'entregue') THEN
    UPDATE pecas_producao
       SET etapa = 'enviado', status = 'enviado', updated_at = now()
     WHERE id = ANY (v_ids) AND etapa = 'expedido';
  ELSE
    UPDATE pecas_producao
       SET etapa = 'expedido', status = 'expedido', updated_at = now()
     WHERE id = ANY (v_ids) AND etapa = 'enviado';
  END IF;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  UPDATE expedicoes
     SET status = v_status,
         data_saida = CASE
                        WHEN v_status IN ('em_transito', 'entregue') THEN coalesce(data_saida, v_hoje)
                        WHEN v_status IN ('preparando', 'aguardando_transporte') THEN NULL
                        ELSE data_saida
                      END,
         data_entrega = CASE WHEN v_status = 'entregue' THEN coalesce(data_entrega, v_hoje) ELSE NULL END,
         motivo_problema = CASE
                             WHEN v_status = 'problema' THEN coalesce(nullif(btrim(p_motivo), ''), motivo_problema)
                             ELSE motivo_problema
                           END,
         updated_at = now()
   WHERE id = p_id
  RETURNING * INTO v_exp;

  RETURN json_build_object('expedicao', to_json(v_exp), 'pecas_movidas', v_n);
END;
$$;

-- 6) excluir_romaneio(p_id) --------------------------------------------------
CREATE OR REPLACE FUNCTION public.excluir_romaneio(p_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_exp      expedicoes%ROWTYPE;
  v_ids      text[];
  v_entry    jsonb;
  v_sid      text;
  v_orig     text;
  v_split    pecas_producao%ROWTYPE;
  v_original pecas_producao%ROWTYPE;
  v_tem_qp   boolean;
  v_voltaram int := 0;
  v_reunidas int := 0;
BEGIN
  SELECT * INTO v_exp FROM expedicoes WHERE id = p_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Romaneio % não encontrado', p_id USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'pecas_producao' AND column_name = 'quantidade_produzida'
  ) INTO v_tem_qp;

  v_ids := public._romaneio_ids_integrais(v_exp.pecas);

  -- Trava também as peças originais candidatas ao merge (mesma ordem global por id)
  PERFORM 1 FROM pecas_producao
   WHERE id = ANY (v_ids)
      OR id IN (
        SELECT coalesce(nullif(e->>'id_original', ''), regexp_replace(e->>'id', '__split_enviado_.*$', ''))
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_exp.pecas) = 'array' THEN v_exp.pecas ELSE '[]'::jsonb END) e
         WHERE jsonb_typeof(e) = 'object'
      )
   ORDER BY id FOR UPDATE;

  -- 6.1) Peças voltam para a Fila de Embarque
  UPDATE pecas_producao
     SET etapa = 'expedido', status = 'expedido', updated_at = now()
   WHERE id = ANY (v_ids) AND etapa = 'enviado';
  GET DIAGNOSTICS v_voltaram = ROW_COUNT;

  -- 6.2) Reúne splits de envio parcial na peça original (se ela ainda está na fila e livre)
  FOR v_entry IN
    SELECT e FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_exp.pecas) = 'array' THEN v_exp.pecas ELSE '[]'::jsonb END) e
     WHERE jsonb_typeof(e) = 'object'
  LOOP
    v_sid := v_entry->>'id';
    IF v_sid IS NULL OR NOT (v_sid = ANY (v_ids)) THEN CONTINUE; END IF;
    v_orig := nullif(v_entry->>'id_original', '');
    IF v_orig IS NULL AND position('__split_enviado_' IN v_sid) > 0 THEN
      v_orig := regexp_replace(v_sid, '__split_enviado_.*$', '');
    END IF;
    IF v_orig IS NULL OR v_orig = v_sid THEN CONTINUE; END IF;

    SELECT * INTO v_split FROM pecas_producao WHERE id = v_sid AND etapa = 'expedido';
    IF NOT FOUND THEN CONTINUE; END IF;
    SELECT * INTO v_original FROM pecas_producao WHERE id = v_orig AND etapa = 'expedido';
    IF NOT FOUND THEN CONTINUE; END IF;

    -- Original reservada (linha inteira) em OUTRO romaneio ativo → não mexe na quantidade dela
    IF EXISTS (
      SELECT 1 FROM expedicoes e
       WHERE e.deleted_at IS NULL AND e.id <> p_id
         AND v_orig = ANY (public._romaneio_ids_integrais(e.pecas))
    ) THEN
      CONTINUE;
    END IF;

    UPDATE pecas_producao
       SET quantidade = coalesce(v_original.quantidade, 0) + coalesce(v_split.quantidade, 0),
           peso_total = coalesce(v_original.peso_total, 0) + coalesce(v_split.peso_total, 0),
           updated_at = now()
     WHERE id = v_orig;
    IF v_tem_qp THEN
      EXECUTE 'UPDATE pecas_producao SET quantidade_produzida = coalesce(quantidade_produzida, 0) + $1 WHERE id = $2'
        USING coalesce((to_jsonb(v_split)->>'quantidade_produzida')::int, 0), v_orig;
    END IF;
    DELETE FROM pecas_producao WHERE id = v_sid;
    v_reunidas := v_reunidas + 1;
  END LOOP;

  -- 6.3) Soft-delete
  UPDATE expedicoes SET deleted_at = now(), updated_at = now() WHERE id = p_id;

  RETURN json_build_object('id', p_id, 'pecas_retornadas', v_voltaram, 'splits_reunidos', v_reunidas);
END;
$$;

-- 7) Permissões --------------------------------------------------------------
REVOKE ALL ON FUNCTION public._romaneio_ids_integrais(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._hoje_brt() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.criar_romaneio(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.despachar_romaneio(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.excluir_romaneio(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public._romaneio_ids_integrais(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public._hoje_brt() TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_romaneio(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.despachar_romaneio(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_romaneio(text) TO authenticated;
