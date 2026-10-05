// ============================================================
// Histórico do Insights IA (análises geradas + status das recomendações)
// ============================================================
// Persistência: localStorage (imediato) + entity_store 'insights_ia_historico'
// (sincroniza entre computadores). Mesmo padrão de useAlertasStatus:
//   - merge por id de análise (união);
//   - status de cada recomendação: vence o registro mais recente (campo `em`, ISO);
//   - no máximo MAX_ANALISES (descarta as mais antigas).
// Formato: { analises: [{ id, criadoEm, escopo, escopoObra, foco, focoRotulo,
//   modelo, usage, por, resultado: { resumo, destaques[], riscos[],
//   recomendacoes[{ id, titulo, detalhe, area, impacto, prazo }] },
//   status: { [recId]: { status, nota, por, em } } }] }
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../api/supabaseClient';
import { notifyLocalChange, LOCAL_SYNC_EVENT } from '../utils/localSync';

const LS_KEY = 'montex_insights_ia_v1';
const STORE_ID = 'insights_ia_historico';
export const MAX_ANALISES = 30;

export const STATUS_RECOMENDACAO = {
  nova: 'Nova',
  aceita: 'Aceita',
  andamento: 'Em andamento',
  concluida: 'Concluída',
  descartada: 'Descartada',
};

const vazio = () => ({ analises: [] });

const normalizar = (obj) => ({ analises: Array.isArray(obj?.analises) ? obj.analises.filter((a) => a && a.id) : [] });

const lerLocal = () => {
  try { return normalizar(JSON.parse(localStorage.getItem(LS_KEY) || 'null')); } catch { return vazio(); }
};
const gravarLocal = (obj) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch { /* sem storage / cota */ }
  notifyLocalChange(LS_KEY);
};

function mesclarStatus(a = {}, b = {}) {
  const out = { ...a };
  Object.entries(b || {}).forEach(([id, v]) => {
    if (!out[id] || String(v?.em || '') > String(out[id]?.em || '')) out[id] = v;
  });
  return out;
}

/** Une dois históricos: análises por id; status por recomendação (mais recente vence). */
export function mesclarHistorico(a, b) {
  const mapa = new Map();
  [...normalizar(a).analises, ...normalizar(b).analises].forEach((an) => {
    const atual = mapa.get(an.id);
    mapa.set(an.id, atual ? { ...atual, ...an, status: mesclarStatus(atual.status, an.status) } : an);
  });
  const analises = [...mapa.values()]
    .sort((x, y) => String(y.criadoEm || '').localeCompare(String(x.criadoEm || '')))
    .slice(0, MAX_ANALISES);
  return { analises };
}

async function lerRemoto() {
  try {
    const { data, error } = await supabase.from('entity_store').select('data').eq('id', STORE_ID).maybeSingle();
    if (error) return null;
    return normalizar(data?.data);
  } catch { return null; }
}

async function gravarRemoto(obj) {
  try {
    await supabase.from('entity_store').upsert({ id: STORE_ID, entity_type: 'config', data: obj });
  } catch { /* offline: fica no localStorage e sobe na próxima gravação */ }
}

async function sincronizar(local) {
  const remoto = await lerRemoto();
  await gravarRemoto(mesclarHistorico(remoto || vazio(), local));
}

export function useInsightsHistorico() {
  const [hist, setHist] = useState(lerLocal);

  useEffect(() => {
    let vivo = true;
    lerRemoto().then((remoto) => {
      if (!vivo || !remoto) return;
      const m = mesclarHistorico(lerLocal(), remoto);
      gravarLocal(m);
      setHist(m);
    });
    const onLocal = () => setHist(lerLocal());
    const onStorage = (e) => { if (!e.key || e.key === LS_KEY) onLocal(); };
    window.addEventListener(LOCAL_SYNC_EVENT, onLocal);
    window.addEventListener('storage', onStorage);
    return () => { vivo = false; window.removeEventListener(LOCAL_SYNC_EVENT, onLocal); window.removeEventListener('storage', onStorage); };
  }, []);

  /** Salva uma análise nova (já com ids nas recomendações). Retorna o id. */
  const salvarAnalise = useCallback(async (analise) => {
    const prox = mesclarHistorico(lerLocal(), { analises: [{ status: {}, ...analise }] });
    gravarLocal(prox);
    setHist(prox);
    await sincronizar(prox);
    return analise.id;
  }, []);

  /** Define status (e nota) de uma recomendação de uma análise. */
  const definirStatus = useCallback(async (analiseId, recId, { status, nota, por = '' }) => {
    const atual = lerLocal();
    const em = new Date().toISOString();
    const analises = atual.analises.map((an) => {
      if (an.id !== analiseId) return an;
      const anterior = an.status?.[recId] || {};
      const reg = {
        status: status ?? anterior.status ?? 'nova',
        nota: nota ?? anterior.nota ?? '',
        por,
        em,
      };
      return { ...an, status: { ...(an.status || {}), [recId]: reg } };
    });
    const prox = { analises };
    gravarLocal(prox);
    setHist(prox);
    await sincronizar(prox);
  }, []);

  return { analises: hist.analises, salvarAnalise, definirStatus };
}
