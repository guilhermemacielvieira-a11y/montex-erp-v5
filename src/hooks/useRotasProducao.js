// ============================================================
// Configuração de rotas e ritmo-padrão por família de peça
// ============================================================
// Guardada em entity_store (id 'config_rotas_producao') para valer em todos
// os dispositivos. Formato: { semSolda: ['TERCA', ...], ritmos: { etapa: { FAMILIA: kgDia } } }.
// Sem registro → padrões de services/bi/biDesempenho.js.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { configRotas, FAMILIAS_SEM_SOLDA_PADRAO } from '@/services/bi/biDesempenho';

const ID = 'config_rotas_producao';
let cache = null;

export function useRotasProducao() {
  const [bruta, setBruta] = useState(cache);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (cache) return;
    let vivo = true;
    (async () => {
      const { data, error } = await supabase.from('entity_store').select('data').eq('id', ID).maybeSingle();
      if (!vivo) return;
      if (error) { setErro(error.message); return; }
      cache = data?.data || { semSolda: FAMILIAS_SEM_SOLDA_PADRAO, ritmos: {} };
      setBruta(cache);
    })();
    return () => { vivo = false; };
  }, []);

  const salvar = useCallback(async (nova) => {
    setSalvando(true);
    try {
      const { error } = await supabase.from('entity_store').upsert({ id: ID, entity_type: 'config_producao', data: nova }, { onConflict: 'id' });
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

  const cfg = useMemo(() => configRotas(bruta || {}), [bruta]);
  return { cfg, bruta: bruta || { semSolda: FAMILIAS_SEM_SOLDA_PADRAO, ritmos: {} }, carregado: !!bruta, salvar, salvando, erro };
}
