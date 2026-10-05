-- ============================================================================
-- 2026100520 — Produção / Corte / Estoque: escritas ATÔMICAS via RPC
-- ============================================================================
-- CAUSA RAIZ
--   * pecas_producao.id tinha default 'PEC-' || extract(epoch from now()) — o
--     now() é o MESMO para todas as linhas de um INSERT, então um createMany
--     sem id gerava PK duplicada (depois de a peça original já ter sido
--     reduzida → unidades sumiam).
--   * Splits de peça eram feitos no cliente com 2-3 requests independentes
--     (update original / insert nova / delete), sem checar {error} e usando a
--     quantidade da TELA (stale) → unidades duplicadas/perdidas em falha parcial.
--   * Movimentação de etapa aceitava qualquer transição.
--   * Saldo de estoque era read-modify-write absoluto no cliente (lost update).
--   * Baixa de corte era feita pelo cliente E pelo trigger tg_corte_baixa_estoque
--     (dupla baixa), sem trava de duplo clique.
--
-- ESTE ARQUIVO (idempotente — pode ser reaplicado):
--   1. Default de pecas_producao.id único por linha (uuid).
--   2. montex_etapa_ordem / montex_status_da_etapa (helpers IMMUTABLE).
--   3. split_peca       — desmembra N unidades de uma peça p/ outra etapa (1 txn).
--   4. distribuir_peca  — edição por quantidade: distribui a peça em várias
--                         etapas (vários splits na MESMA transação).
--   5. mover_etapa      — move a peça inteira validando o fluxo.
--   6. movimentar_estoque — delta atômico de saldo + movimentacoes_estoque.
--   7. baixar_corte / estornar_corte — finalizar/resetar corte com
--      compare-and-set; a baixa/estorno do aço é feita pelo trigger EXISTENTE
--      tg_corte_baixa_estoque (trg_corte_baixa_estoque → estoque_aplicar_movimento),
--      que registra em baixa_estoque_kg exatamente o kg efetivamente aplicado
--      (estoque_aplicar_movimento não faz clamp em 0, então o kg registrado é o
--      kg realmente deduzido e o estorno devolve exatamente isso).
--
-- Todas as funções: SECURITY INVOKER (RLS das tabelas vale), search_path fixo,
-- EXECUTE só para authenticated.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ID único por linha
-- ---------------------------------------------------------------------------
ALTER TABLE public.pecas_producao
  ALTER COLUMN id SET DEFAULT ('PEC-' || replace(gen_random_uuid()::text, '-', ''));

-- ---------------------------------------------------------------------------
-- 2. Helpers de fluxo (espelhados em src/services/fluxoEtapas.js)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.montex_etapa_ordem(p_etapa text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(p_etapa, ''))
    WHEN 'aguardando' THEN 0
    WHEN 'corte'      THEN 0   -- legado: tratado como aguardando
    WHEN 'fabricacao' THEN 1
    WHEN 'solda'      THEN 2
    WHEN 'pintura'    THEN 3
    WHEN 'expedido'   THEN 4
    WHEN 'enviado'    THEN 5
    WHEN 'entregue'   THEN 6
    ELSE NULL
  END;
$$;

-- Status coerente com a etapa (mesma regra que o ERPContext usava).
CREATE OR REPLACE FUNCTION public.montex_status_da_etapa(p_etapa text, p_status_atual text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(p_etapa, ''))
    WHEN 'aguardando' THEN coalesce(p_status_atual, 'pendente')
    WHEN 'corte'      THEN coalesce(p_status_atual, 'pendente')
    WHEN 'expedido'   THEN 'concluido'
    WHEN 'enviado'    THEN 'enviado'
    WHEN 'entregue'   THEN 'entregue'
    ELSE 'em_producao'
  END;
$$;

-- Patch jsonb com funcionário/data de uma etapa (colunas funcionario_<etapa>,
-- data_inicio_<etapa>). Etapas sem coluna são ignoradas.
CREATE OR REPLACE FUNCTION public.montex_patch_funcionario(
  p_etapa text, p_funcionario text, p_data date)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    (CASE WHEN p_funcionario IS NOT NULL AND lower(p_etapa) IN ('fabricacao','solda','pintura','expedido')
          THEN jsonb_build_object('funcionario_' || lower(p_etapa), p_funcionario, 'responsavel', p_funcionario)
          WHEN p_funcionario IS NOT NULL
          THEN jsonb_build_object('responsavel', p_funcionario)
          ELSE '{}'::jsonb END)
    ||
    (CASE WHEN p_data IS NOT NULL AND lower(p_etapa) IN ('fabricacao','solda','pintura')
          THEN jsonb_build_object('data_inicio_' || lower(p_etapa), (p_data::timestamp AT TIME ZONE 'America/Sao_Paulo'))
          ELSE '{}'::jsonb END);
$$;

-- ---------------------------------------------------------------------------
-- 3. split_peca
-- ---------------------------------------------------------------------------
-- Move p_qtd unidades da peça p_id para p_nova_etapa criando uma NOVA linha
-- (cópia de TODAS as colunas: funcionario_*, datas, obra, perfil...). A
-- original fica com quantidade - p_qtd na etapa atual. Peso total é
-- redistribuído proporcionalmente (soma preservada).
--   p_funcionario / p_data → gravados nas colunas da etapa
--   coalesce(p_etapa_funcionario, p_nova_etapa) da NOVA linha.
-- 'enviado' só é aceito a partir de 'expedido' (envio parcial da Expedição);
-- 'entregue' nunca.
CREATE OR REPLACE FUNCTION public.split_peca(
  p_id text,
  p_qtd integer,
  p_nova_etapa text,
  p_funcionario text DEFAULT NULL,
  p_data date DEFAULT NULL,
  p_etapa_funcionario text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_orig      public.pecas_producao%ROWTYPE;
  v_nova      public.pecas_producao%ROWTYPE;
  v_etapa     text := lower(trim(coalesce(p_nova_etapa, '')));
  v_qtd_orig  integer;
  v_peso_tot  numeric;
  v_peso_nova numeric;
  v_base      text;
  v_new_id    text;
  v_json      jsonb;
  v_tent      integer := 0;
BEGIN
  IF p_id IS NULL OR p_qtd IS NULL OR p_qtd <= 0 THEN
    RAISE EXCEPTION 'Quantidade a desmembrar inválida (%)', p_qtd USING errcode = '22023';
  END IF;
  IF public.montex_etapa_ordem(v_etapa) IS NULL OR v_etapa IN ('corte', 'entregue') THEN
    RAISE EXCEPTION 'Etapa de destino inválida: %', p_nova_etapa USING errcode = '22023';
  END IF;

  SELECT * INTO v_orig FROM public.pecas_producao WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peça % não encontrada', p_id USING errcode = 'P0002';
  END IF;

  v_qtd_orig := coalesce(v_orig.quantidade, 1);
  IF p_qtd >= v_qtd_orig THEN
    RAISE EXCEPTION 'Peça % tem % un no banco — não é possível desmembrar % un (use mover etapa para a peça inteira)',
      p_id, v_qtd_orig, p_qtd USING errcode = '22023';
  END IF;
  IF v_etapa = 'enviado' AND lower(coalesce(v_orig.etapa, '')) <> 'expedido' THEN
    RAISE EXCEPTION 'Só peças em EXPEDIDO podem ser enviadas (via Expedição)' USING errcode = '22023';
  END IF;

  -- Peso: preserva a soma. peso_total ausente → peso_unitario × quantidade.
  v_peso_tot  := coalesce(v_orig.peso_total, coalesce(v_orig.peso_unitario, 0) * v_qtd_orig);
  v_peso_nova := round(v_peso_tot * p_qtd / v_qtd_orig, 3);

  -- ID determinístico: <base>__split_<etapa>_<epochms>_<rand4>
  v_base := split_part(p_id, '__split_', 1);
  LOOP
    v_new_id := v_base || '__split_' || v_etapa || '_'
             || (extract(epoch FROM clock_timestamp()) * 1000)::bigint::text || '_'
             || lpad((floor(random() * 10000))::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.pecas_producao WHERE id = v_new_id);
    v_tent := v_tent + 1;
    IF v_tent > 20 THEN
      RAISE EXCEPTION 'Não foi possível gerar id único para o split de %', p_id;
    END IF;
  END LOOP;

  v_json := to_jsonb(v_orig)
    || jsonb_build_object(
         'id',                   v_new_id,
         'quantidade',           p_qtd,
         'quantidade_produzida', least(coalesce(v_orig.quantidade_produzida, 0), p_qtd),
         'peso_total',           v_peso_nova,
         'peso_unitario',        coalesce(v_orig.peso_unitario, CASE WHEN v_qtd_orig > 0 THEN v_peso_tot / v_qtd_orig END),
         'etapa',                v_etapa,
         'status',               CASE WHEN v_etapa = lower(coalesce(v_orig.etapa, '')) THEN v_orig.status
                                      ELSE public.montex_status_da_etapa(v_etapa, v_orig.status) END,
         'data_inicio',          CASE WHEN public.montex_etapa_ordem(v_etapa) >= 1
                                      THEN coalesce(v_orig.data_inicio, current_date) ELSE v_orig.data_inicio END,
         'data_fim_real',        CASE WHEN v_etapa = 'expedido'
                                      THEN coalesce(v_orig.data_fim_real, current_date) ELSE v_orig.data_fim_real END,
         'created_at',           now(),
         'updated_at',           now())
    || public.montex_patch_funcionario(coalesce(p_etapa_funcionario, v_etapa), p_funcionario, p_data);

  INSERT INTO public.pecas_producao
  SELECT (jsonb_populate_record(NULL::public.pecas_producao, v_json)).*
  RETURNING * INTO v_nova;

  UPDATE public.pecas_producao
     SET quantidade           = v_qtd_orig - p_qtd,
         quantidade_produzida = least(coalesce(quantidade_produzida, 0), v_qtd_orig - p_qtd),
         peso_total           = v_peso_tot - v_peso_nova,
         peso_unitario        = coalesce(peso_unitario, v_peso_tot / v_qtd_orig),
         updated_at           = now()
   WHERE id = p_id
  RETURNING * INTO v_orig;

  RETURN json_build_object('ok', true, 'original', to_jsonb(v_orig), 'nova', to_jsonb(v_nova));
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. mover_etapa
-- ---------------------------------------------------------------------------
-- Move a peça INTEIRA. Regras (espelhadas em src/services/fluxoEtapas.js):
--   * mesma etapa → no-op (ok)
--   * avanço de exatamente 1 etapa no fluxo aguardando→fabricacao→solda→pintura→expedido
--   * retorno de exatamente 1 etapa só com p_force = true (correção manual)
--   * estorno de envio (enviado/entregue/montagem → expedido) só com p_force
--   * destino enviado/entregue → REJEITADO (só a Expedição/romaneio leva lá)
--   * saltos (ex.: fabricacao→pintura) → REJEITADOS (use distribuir_peca)
-- p_funcionario / p_data vão para as colunas da etapa
-- coalesce(p_etapa_funcionario, p_etapa).
CREATE OR REPLACE FUNCTION public.mover_etapa(
  p_id text,
  p_etapa text,
  p_funcionario text DEFAULT NULL,
  p_force boolean DEFAULT false,
  p_etapa_funcionario text DEFAULT NULL,
  p_data date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row   public.pecas_producao%ROWTYPE;
  v_para  text := lower(trim(coalesce(p_etapa, '')));
  v_de    text;
  v_ide   integer;
  v_ipara integer;
  v_patch jsonb;
BEGIN
  v_ipara := public.montex_etapa_ordem(v_para);
  IF v_ipara IS NULL OR v_para = 'corte' THEN
    RAISE EXCEPTION 'Etapa de destino inválida: %', p_etapa USING errcode = '22023';
  END IF;
  IF v_para IN ('enviado', 'entregue') THEN
    RAISE EXCEPTION 'A etapa % só é atingida pela Expedição (romaneio)', upper(v_para) USING errcode = '22023';
  END IF;

  SELECT * INTO v_row FROM public.pecas_producao WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peça % não encontrada', p_id USING errcode = 'P0002';
  END IF;

  v_de  := lower(coalesce(v_row.etapa, 'aguardando'));
  v_ide := coalesce(public.montex_etapa_ordem(v_de), 0);

  IF v_ipara = v_ide THEN
    -- no-op de etapa; ainda grava funcionário/data se informados
    NULL;
  ELSIF v_ipara = v_ide + 1 THEN
    NULL; -- avanço de 1 etapa
  ELSIF v_ipara = v_ide - 1 AND p_force THEN
    NULL; -- retorno de 1 etapa (correção manual)
  ELSIF p_force AND v_para = 'expedido' AND v_de IN ('enviado', 'entregue', 'montagem') THEN
    NULL; -- estorno de envio: peça volta para a Fila de Embarque
  ELSIF v_ipara < v_ide THEN
    RAISE EXCEPTION 'Retorno de % para % não permitido (só 1 etapa por vez, com confirmação)',
      upper(v_de), upper(v_para) USING errcode = '22023';
  ELSE
    RAISE EXCEPTION 'Transição inválida: % → % (o fluxo avança 1 etapa por vez)',
      upper(v_de), upper(v_para) USING errcode = '22023';
  END IF;

  v_patch := public.montex_patch_funcionario(coalesce(p_etapa_funcionario, v_para), p_funcionario, p_data);

  UPDATE public.pecas_producao p
     SET etapa                  = v_para,
         status                 = CASE WHEN v_para = v_de THEN p.status
                                       ELSE public.montex_status_da_etapa(v_para, p.status) END,
         data_inicio            = CASE WHEN v_ipara >= 1 THEN coalesce(p.data_inicio, current_date) ELSE p.data_inicio END,
         data_fim_real          = CASE WHEN v_para = 'expedido' THEN coalesce(p.data_fim_real, current_date)
                                       WHEN v_ipara < 4 THEN NULL ELSE p.data_fim_real END,
         responsavel            = coalesce(v_patch->>'responsavel', p.responsavel),
         funcionario_fabricacao = coalesce(v_patch->>'funcionario_fabricacao', p.funcionario_fabricacao),
         funcionario_solda      = coalesce(v_patch->>'funcionario_solda', p.funcionario_solda),
         funcionario_pintura    = coalesce(v_patch->>'funcionario_pintura', p.funcionario_pintura),
         funcionario_expedido   = coalesce(v_patch->>'funcionario_expedido', p.funcionario_expedido),
         data_inicio_fabricacao = coalesce((v_patch->>'data_inicio_fabricacao')::timestamptz, p.data_inicio_fabricacao),
         data_inicio_solda      = coalesce((v_patch->>'data_inicio_solda')::timestamptz, p.data_inicio_solda),
         data_inicio_pintura    = coalesce((v_patch->>'data_inicio_pintura')::timestamptz, p.data_inicio_pintura),
         updated_at             = now()
   WHERE p.id = p_id
  RETURNING * INTO v_row;

  RETURN json_build_object('ok', true, 'etapa_anterior', v_de, 'peca', to_jsonb(v_row));
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. distribuir_peca  (Edição por quantidade do Kanban)
-- ---------------------------------------------------------------------------
-- p_distribuicao = {"fabricacao": 3, "solda": 2, ...}. A soma TEM de bater
-- com a quantidade ATUAL no banco. A etapa mais atrasada fica na linha
-- original; as demais viram splits — tudo numa única transação.
-- Correção manual explícita: aceita qualquer etapa de produção
-- (aguardando..expedido), mas nunca enviado/entregue.
CREATE OR REPLACE FUNCTION public.distribuir_peca(
  p_id text,
  p_distribuicao jsonb,
  p_funcionario text DEFAULT NULL,
  p_data date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row       public.pecas_producao%ROWTYPE;
  v_soma      integer := 0;
  v_principal text;
  v_etapa     text;
  v_qtd       integer;
  v_split     json;
  v_novas     jsonb := '[]'::jsonb;
  v_patch     jsonb;
  v_ordem     text[] := ARRAY['aguardando','fabricacao','solda','pintura','expedido'];
BEGIN
  IF p_distribuicao IS NULL OR jsonb_typeof(p_distribuicao) <> 'object' THEN
    RAISE EXCEPTION 'Distribuição inválida' USING errcode = '22023';
  END IF;

  FOR v_etapa, v_qtd IN
    SELECT key, (value #>> '{}')::integer FROM jsonb_each(p_distribuicao)
  LOOP
    IF NOT (v_etapa = ANY (v_ordem)) THEN
      RAISE EXCEPTION 'Etapa inválida na distribuição: %', v_etapa USING errcode = '22023';
    END IF;
    IF v_qtd < 0 THEN
      RAISE EXCEPTION 'Quantidade negativa em %', v_etapa USING errcode = '22023';
    END IF;
    v_soma := v_soma + v_qtd;
  END LOOP;

  SELECT * INTO v_row FROM public.pecas_producao WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peça % não encontrada', p_id USING errcode = 'P0002';
  END IF;
  IF v_soma <> coalesce(v_row.quantidade, 1) THEN
    RAISE EXCEPTION 'A soma (%) difere da quantidade atual no banco (%) — recarregue a tela',
      v_soma, coalesce(v_row.quantidade, 1) USING errcode = '22023';
  END IF;

  SELECT e INTO v_principal
    FROM unnest(v_ordem) WITH ORDINALITY AS t(e, i)
   WHERE coalesce((p_distribuicao->>e)::integer, 0) > 0
   ORDER BY i LIMIT 1;

  FOREACH v_etapa IN ARRAY v_ordem LOOP
    v_qtd := coalesce((p_distribuicao->>v_etapa)::integer, 0);
    CONTINUE WHEN v_qtd = 0 OR v_etapa = v_principal;
    v_split := public.split_peca(p_id, v_qtd, v_etapa, p_funcionario, p_data, NULL);
    v_novas := v_novas || jsonb_build_array((v_split::jsonb)->'nova');
  END LOOP;

  -- Funcionário/data só na linha original se ela MUDOU de etapa
  v_patch := CASE WHEN v_principal <> lower(coalesce(v_row.etapa, ''))
                  THEN public.montex_patch_funcionario(v_principal, p_funcionario, p_data)
                  ELSE '{}'::jsonb END;

  UPDATE public.pecas_producao p
     SET etapa         = v_principal,
         status        = CASE WHEN v_principal = lower(coalesce(p.etapa,'')) THEN p.status
                              ELSE public.montex_status_da_etapa(v_principal, p.status) END,
         data_inicio   = CASE WHEN public.montex_etapa_ordem(v_principal) >= 1
                              THEN coalesce(p.data_inicio, current_date) ELSE p.data_inicio END,
         data_fim_real = CASE WHEN v_principal = 'expedido' THEN coalesce(p.data_fim_real, current_date)
                              ELSE NULL END,
         responsavel            = coalesce(v_patch->>'responsavel', p.responsavel),
         funcionario_fabricacao = coalesce(v_patch->>'funcionario_fabricacao', p.funcionario_fabricacao),
         funcionario_solda      = coalesce(v_patch->>'funcionario_solda', p.funcionario_solda),
         funcionario_pintura    = coalesce(v_patch->>'funcionario_pintura', p.funcionario_pintura),
         funcionario_expedido   = coalesce(v_patch->>'funcionario_expedido', p.funcionario_expedido),
         data_inicio_fabricacao = coalesce((v_patch->>'data_inicio_fabricacao')::timestamptz, p.data_inicio_fabricacao),
         data_inicio_solda      = coalesce((v_patch->>'data_inicio_solda')::timestamptz, p.data_inicio_solda),
         data_inicio_pintura    = coalesce((v_patch->>'data_inicio_pintura')::timestamptz, p.data_inicio_pintura),
         updated_at    = now()
   WHERE p.id = p_id
  RETURNING * INTO v_row;

  RETURN json_build_object('ok', true, 'original', to_jsonb(v_row), 'novas', v_novas);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. movimentar_estoque
-- ---------------------------------------------------------------------------
-- Aplica um DELTA (na unidade do item; kg para itens em kg) de forma atômica:
--   UPDATE estoque SET quantidade = quantidade + delta  (linha travada)
-- e registra a movimentação (saldo_anterior/saldo_novo coerentes) na MESMA
-- transação. Saldo negativo é rejeitado, salvo p_permitir_negativo.
-- Itens em kg também movem peso_kg (mesma convenção de estoque_aplicar_movimento).
-- p_conta_comprado (entrada de material recebido): soma em `comprado` e
-- recalcula `falta` = max(0, pedido − comprado).
CREATE OR REPLACE FUNCTION public.movimentar_estoque(
  p_item_id text,
  p_delta_kg numeric,
  p_tipo text DEFAULT NULL,
  p_origem text DEFAULT 'manual',
  p_ref text DEFAULT NULL,
  p_motivo text DEFAULT NULL,
  p_responsavel text DEFAULT NULL,
  p_nota_fiscal text DEFAULT NULL,
  p_documento_url text DEFAULT NULL,
  p_custo_unitario numeric DEFAULT NULL,
  p_obra_id text DEFAULT NULL,
  p_conta_comprado boolean DEFAULT false,
  p_permitir_negativo boolean DEFAULT false,
  p_setor text DEFAULT NULL,
  p_peca_id text DEFAULT NULL,
  p_material text DEFAULT NULL,
  p_material_perfil text DEFAULT NULL,
  p_peso numeric DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row     public.estoque%ROWTYPE;
  v_ant     numeric;
  v_novo    numeric;
  v_tipo    text;
  v_is_kg   boolean;
  v_motivo  text;
  v_mov_id  text;
BEGIN
  IF p_item_id IS NULL THEN
    RAISE EXCEPTION 'Item de estoque não informado' USING errcode = '22023';
  END IF;
  IF p_delta_kg IS NULL OR p_delta_kg = 0 THEN
    RAISE EXCEPTION 'Quantidade da movimentação deve ser diferente de zero' USING errcode = '22023';
  END IF;

  SELECT * INTO v_row FROM public.estoque WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item de estoque % não encontrado', p_item_id USING errcode = 'P0002';
  END IF;

  v_ant  := coalesce(v_row.quantidade, 0);
  v_novo := v_ant + p_delta_kg;
  IF v_novo < 0 AND NOT coalesce(p_permitir_negativo, false) THEN
    RAISE EXCEPTION 'Saldo insuficiente: saldo atual % %, saída de %',
      round(v_ant, 3), coalesce(v_row.unidade, ''), round(abs(p_delta_kg), 3) USING errcode = '23514';
  END IF;

  v_tipo  := coalesce(nullif(p_tipo, ''), CASE WHEN p_delta_kg > 0 THEN 'entrada' ELSE 'saida' END);
  v_is_kg := lower(coalesce(v_row.unidade, 'kg')) = 'kg';

  UPDATE public.estoque e
     SET quantidade     = coalesce(e.quantidade, 0) + p_delta_kg,
         peso_kg        = CASE WHEN v_is_kg THEN coalesce(e.peso_kg, 0) + p_delta_kg ELSE e.peso_kg END,
         comprado       = CASE WHEN p_conta_comprado AND p_delta_kg > 0
                               THEN round(coalesce(e.comprado, 0) + p_delta_kg, 2) ELSE e.comprado END,
         falta          = CASE WHEN p_conta_comprado AND p_delta_kg > 0
                               THEN greatest(0, round(coalesce(e.pedido, 0) - (coalesce(e.comprado, 0) + p_delta_kg), 2))
                               ELSE e.falta END,
         preco          = CASE WHEN p_delta_kg > 0 AND coalesce(p_custo_unitario, 0) > 0
                               THEN p_custo_unitario ELSE e.preco END,
         ultima_entrada = CASE WHEN p_delta_kg > 0 THEN current_date ELSE e.ultima_entrada END,
         ultima_saida   = CASE WHEN p_delta_kg < 0 THEN current_date ELSE e.ultima_saida END,
         updated_at     = now()
   WHERE e.id = p_item_id
  RETURNING * INTO v_row;

  v_motivo := coalesce(nullif(p_motivo, ''),
                       CASE WHEN p_delta_kg > 0 THEN 'Entrada' ELSE 'Saída' END || ' de estoque');
  IF p_ref IS NOT NULL AND position(p_ref IN v_motivo) = 0 THEN
    v_motivo := v_motivo || ' · ref ' || p_ref;
  END IF;

  INSERT INTO public.movimentacoes_estoque
    (item_id, obra_id, tipo, quantidade, peso, unidade, material_perfil, material,
     motivo, usuario, responsavel, nota_fiscal, setor, origem, peca_id,
     saldo_anterior, saldo_novo, custo_unitario, documento_url, gera_financeiro, data)
  VALUES
    (v_row.id, coalesce(p_obra_id, v_row.obra_id), v_tipo, abs(p_delta_kg),
     coalesce(p_peso, CASE WHEN v_is_kg THEN abs(p_delta_kg) END),
     coalesce(v_row.unidade, 'kg'),
     coalesce(p_material_perfil, v_row.perfil, v_row.codigo),
     coalesce(p_material, v_row.material, v_row.descricao),
     v_motivo, p_responsavel, p_responsavel, p_nota_fiscal, p_setor,
     coalesce(nullif(p_origem, ''), 'manual'), p_peca_id,
     v_ant, coalesce(v_row.quantidade, 0), p_custo_unitario, p_documento_url,
     coalesce(v_row.regime_material, 'proprio') <> 'direto_cliente', now())
  RETURNING id INTO v_mov_id;

  RETURN json_build_object(
    'ok', true,
    'item_id', v_row.id,
    'saldo_anterior', v_ant,
    'saldo_novo', coalesce(v_row.quantidade, 0),
    'delta', p_delta_kg,
    'movimentacao_id', v_mov_id,
    'item', to_jsonb(v_row));
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. baixar_corte / estornar_corte
-- ---------------------------------------------------------------------------
-- baixar_corte: finaliza o corte com compare-and-set (linha travada; se já
-- está cortado/finalizado, NÃO faz nada → duplo clique/abas paralelas são
-- idempotentes). A baixa do aço é feita pelo trigger tg_corte_baixa_estoque
-- na MESMA transação e o kg efetivamente deduzido fica em baixa_estoque_kg.
-- baixa_estoque_kg NULL = linha histórica sem controle de estoque (o trigger
-- não mexe no estoque) — devolvido como controlado=false.
CREATE OR REPLACE FUNCTION public.baixar_corte(
  p_corte_id text,
  p_funcionario text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row public.materiais_corte%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.materiais_corte WHERE id = p_corte_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Corte % não encontrado', p_corte_id USING errcode = 'P0002';
  END IF;

  IF lower(coalesce(v_row.status_corte, '')) IN ('cortado', 'concluido', 'finalizado') THEN
    RETURN json_build_object('ok', true, 'ja_finalizado', true,
      'baixa_kg', coalesce(v_row.baixa_estoque_kg, 0),
      'controlado', v_row.baixa_estoque_kg IS NOT NULL,
      'corte', to_jsonb(v_row));
  END IF;

  UPDATE public.materiais_corte
     SET status_corte      = 'finalizado',
         data_inicio       = coalesce(data_inicio, now()),
         data_fim          = now(),
         funcionario_corte = coalesce(p_funcionario, funcionario_corte),
         updated_at        = now()
   WHERE id = p_corte_id
     AND lower(coalesce(status_corte, '')) NOT IN ('cortado', 'concluido', 'finalizado')
  RETURNING * INTO v_row;   -- tg_corte_baixa_estoque grava baixa_estoque_kg

  RETURN json_build_object('ok', true, 'ja_finalizado', false,
    'baixa_kg', coalesce(v_row.baixa_estoque_kg, 0),
    'controlado', v_row.baixa_estoque_kg IS NOT NULL,
    'corte', to_jsonb(v_row));
END;
$$;

-- estornar_corte: volta o corte para 'aguardando'. O trigger devolve ao
-- estoque EXATAMENTE o baixa_estoque_kg registrado e zera a coluna.
-- Idempotente: se o corte não está finalizado, não faz nada.
CREATE OR REPLACE FUNCTION public.estornar_corte(p_corte_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row  public.materiais_corte%ROWTYPE;
  v_kg   numeric;
BEGIN
  SELECT * INTO v_row FROM public.materiais_corte WHERE id = p_corte_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Corte % não encontrado', p_corte_id USING errcode = 'P0002';
  END IF;

  v_kg := coalesce(v_row.baixa_estoque_kg, 0);

  UPDATE public.materiais_corte
     SET status_corte = 'aguardando',
         data_inicio  = NULL,
         data_fim     = NULL,
         maquina      = NULL,
         updated_at   = now()
   WHERE id = p_corte_id
  RETURNING * INTO v_row;   -- tg_corte_baixa_estoque estorna se estava cortado

  RETURN json_build_object('ok', true,
    'estornado_kg', CASE WHEN v_row.baixa_estoque_kg IS NULL THEN 0
                         ELSE v_kg - coalesce(v_row.baixa_estoque_kg, 0) END,
    'corte', to_jsonb(v_row));
END;
$$;

-- ---------------------------------------------------------------------------
-- Permissões: só usuários autenticados
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.montex_etapa_ordem(text)',
    'public.montex_status_da_etapa(text, text)',
    'public.montex_patch_funcionario(text, text, date)',
    'public.split_peca(text, integer, text, text, date, text)',
    'public.mover_etapa(text, text, text, boolean, text, date)',
    'public.distribuir_peca(text, jsonb, text, date)',
    'public.movimentar_estoque(text, numeric, text, text, text, text, text, text, text, numeric, text, boolean, boolean, text, text, text, text, numeric)',
    'public.baixar_corte(text, text)',
    'public.estornar_corte(text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

-- Recarrega o schema cache do PostgREST para expor as RPCs imediatamente.
NOTIFY pgrst, 'reload schema';
