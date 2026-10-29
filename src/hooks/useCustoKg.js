// ============================================================
// useCustoKg — custo por kg da fábrica, equilíbrio, 2027 e margem por obra
// ============================================================
// Premissas (capacidade, preço de fabricação, aço, montagem, janela e
// reajustes de 2027) ficam em entity_store (id 'config_custo_kg') para valer
// em todos os dispositivos. Sem registro → padrões de biCustoKg.PADRAO_CUSTO.
// Dados vêm de useBIData (mesma fonte do BI 360): histórico normalizado,
// despesas da fábrica (sem obra), peças e obras.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { analiseCustoKg, configCusto, ID_CONFIG_CUSTO } from '@/services/bi/biCustoKg';

let cache = null;

export function useConfigCustoKg() {
  const [bruta, setBruta] = useState(cache);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (cache) return undefined;
    let vivo = true;
    (async () => {
      const { data, error } = await supabase.from('entity_store').select('data').eq('id', ID_CONFIG_CUSTO).maybeSingle();
      if (!vivo) return;
      if (error) { setErro(error.message); cache = {}; setBruta({}); return; }
      cache = data?.data || {};
      setBruta(cache);
    })();
    return () => { vivo = false; };
  }, []);

  const salvar = useCallback(async (nova) => {
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('entity_store')
        .upsert({ id: ID_CONFIG_CUSTO, entity_type: 'config_financeiro', data: nova }, { onConflict: 'id' });
      if (error) throw error;
      cache = nova;
      setBruta(nova);
      setErro(null);
      return true;
    } catch (e) {
      setErro(e?.message || 'Erro ao salvar');
      throw e;
    } finally {
      setSalvando(false);
    }
  }, []);

  const cfg = useMemo(() => configCusto(bruta || {}), [bruta]);
  return { cfg, carregado: bruta !== null, salvar, salvando, erro };
}

/** Análise completa a partir dos dados do BI (useBIData) + premissas salvas. */
export function useCustoKg(dados) {
  const config = useConfigCustoKg();
  const analise = useMemo(() => {
    const b = dados?.bruto;
    if (!b) return null;
    return analiseCustoKg({
      transicoes: b.transicoes,
      passagensNA: b.passagensNA,
      pecas: b.pecas,
      despesas: b.lancamentos,
      obras: b.obras,
      obraIds: dados.obraIds || null,
      hoje: dados.hoje,
      cfg: config.cfg,
    });
  }, [dados?.bruto, dados?.obraIds, dados?.hoje, config.cfg]);
  return { analise, config };
}
