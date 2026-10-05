-- ==============================================
-- FIX: C6A — 5 enviadas, 2 na fila de embarque
-- Rodar no Supabase SQL Editor
-- ==============================================

-- PASSO 0: Verificar dados atuais
-- Encontrar a peça C6A e a expedição que a contém
SELECT 'PEÇA C6A' as info, id, marca, quantidade, peso_total, etapa
FROM pecas_producao
WHERE marca = 'C6A';

SELECT 'EXPEDIÇÃO' as info, id, numero_romaneio, peso_total, pecas
FROM expedicoes
WHERE pecas::text LIKE '%C6A%' OR pecas::text LIKE '%' || (SELECT id FROM pecas_producao WHERE marca = 'C6A' LIMIT 1) || '%';

-- ==============================================
-- PASSO 1: Atualizar a expedição - mudar qtd_enviada de C6A de 7 para 5
-- ==============================================

-- Primeiro, vamos encontrar o ID da peça C6A
DO $$
DECLARE
  v_peca_id TEXT;
  v_exp_id TEXT;
  v_pecas JSONB;
  v_peso_unitario DECIMAL;
  v_peso_total_antigo DECIMAL;
  v_peso_total_novo DECIMAL;
  v_idx INT;
BEGIN
  -- Encontrar ID da peça C6A
  SELECT id, CASE WHEN quantidade > 0 THEN peso_total / quantidade ELSE 0 END
  INTO v_peca_id, v_peso_unitario
  FROM pecas_producao
  WHERE marca = 'C6A'
  LIMIT 1;
  
  IF v_peca_id IS NULL THEN
    RAISE NOTICE 'Peça C6A não encontrada!';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Peça C6A encontrada: ID = %, Peso unitário = %', v_peca_id, v_peso_unitario;
  
  -- Encontrar expedição que contém C6A
  SELECT id, pecas, peso_total
  INTO v_exp_id, v_pecas, v_peso_total_antigo
  FROM expedicoes
  WHERE pecas @> jsonb_build_array(jsonb_build_object('id', v_peca_id))
     OR pecas::text LIKE '%' || v_peca_id || '%'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_exp_id IS NULL THEN
    RAISE NOTICE 'Expedição com C6A não encontrada!';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Expedição encontrada: ID = %, Peso total = %', v_exp_id, v_peso_total_antigo;
  
  -- Encontrar o índice de C6A no array JSONB
  FOR v_idx IN 0..jsonb_array_length(v_pecas) - 1
  LOOP
    IF (v_pecas->v_idx->>'id') = v_peca_id THEN
      -- Atualizar qtd_enviada de 7 para 5
      v_pecas := jsonb_set(
        v_pecas,
        ARRAY[v_idx::text, 'qtd_enviada'],
        '5'::jsonb
      );
      RAISE NOTICE 'Atualizado C6A no índice % de qtd_enviada=7 para qtd_enviada=5', v_idx;
      EXIT;
    END IF;
  END LOOP;
  
  -- Calcular novo peso total (reduzir 2 unidades de C6A)
  v_peso_total_novo := v_peso_total_antigo - (v_peso_unitario * 2);
  
  -- Atualizar expedição
  UPDATE expedicoes
  SET pecas = v_pecas,
      peso_total = v_peso_total_novo,
      updated_at = NOW()
  WHERE id = v_exp_id;
  
  RAISE NOTICE 'Expedição atualizada! Peso: % → %', v_peso_total_antigo, v_peso_total_novo;
  
  -- PASSO 2: Voltar etapa da peça C6A para 'expedido' (pois não foi totalmente enviada)
  UPDATE pecas_producao
  SET etapa = 'expedido',
      updated_at = NOW()
  WHERE id = v_peca_id
    AND etapa = 'enviado';
  
  RAISE NOTICE 'Peça C6A: etapa atualizada para "expedido" (2 un restantes na fila)';
  
END $$;

-- ==============================================
-- PASSO 2: Verificar resultado
-- ==============================================
SELECT 'RESULTADO PEÇA' as info, id, marca, quantidade, peso_total, etapa
FROM pecas_producao
WHERE marca = 'C6A';

SELECT 'RESULTADO EXPEDIÇÃO' as info, id, numero_romaneio, peso_total, pecas
FROM expedicoes
WHERE pecas::text LIKE '%' || (SELECT id FROM pecas_producao WHERE marca = 'C6A' LIMIT 1) || '%';
