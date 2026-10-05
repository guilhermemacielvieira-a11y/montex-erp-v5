// ============================================================
// Status dos alertas do Radar (reconhecido / resolvido / ignorado)
// ============================================================
// Persistência: localStorage (imediato) + entity_store 'radar_alertas_status'
// (sincroniza entre computadores). Merge por alerta: vence o mais recente.
// Os ids dos alertas são estáveis (ver services/bi/radarAlertas.js).
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../api/supabaseClient';
import { notifyLocalChange, LOCAL_SYNC_EVENT } from '../utils/localSync';

const LS_KEY = 'montex_radar_alertas_status_v1';
const STORE_ID = 'radar_alertas_status';

export const STATUS_ALERTA = {
  novo: 'Novo',
  reconhecido: 'Em tratamento',
  resolvido: 'Resolvido',
  ignorado: 'Ignorado',
};

const lerLocal = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch { return {}; }
};
const gravarLocal = (obj) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch { /* sem storage */ }
  notifyLocalChange(LS_KEY);
};

function mesclar(a = {}, b = {}) {
  const out = { ...a };
  Object.entries(b).forEach(([id, v]) => {
    if (!out[id] || String(v?.em || '') > String(out[id]?.em || '')) out[id] = v;
  });
  return out;
}

async function lerRemoto() {
  try {
    const { data, error } = await supabase.from('entity_store').select('data').eq('id', STORE_ID).maybeSingle();
    if (error) return null;
    return data?.data || {};
  } catch { return null; }
}

async function gravarRemoto(obj) {
  try {
    await supabase.from('entity_store').upsert({ id: STORE_ID, entity_type: 'config', data: obj });
  } catch { /* offline: fica no localStorage e sobe na próxima gravação */ }
}

export function useAlertasStatus() {
  const [status, setStatus] = useState(lerLocal);

  useEffect(() => {
    let vivo = true;
    lerRemoto().then((remoto) => {
      if (!vivo || !remoto) return;
      const m = mesclar(lerLocal(), remoto);
      gravarLocal(m);
      setStatus(m);
    });
    const onLocal = () => setStatus(lerLocal());
    const onStorage = (e) => { if (!e.key || e.key === LS_KEY) onLocal(); };
    window.addEventListener(LOCAL_SYNC_EVENT, onLocal);
    window.addEventListener('storage', onStorage);
    return () => { vivo = false; window.removeEventListener(LOCAL_SYNC_EVENT, onLocal); window.removeEventListener('storage', onStorage); };
  }, []);

  /** Define o status de um alerta. `status` = 'novo' remove a marcação. */
  const definir = useCallback(async (alertaId, novoStatus, { nota = '', por = '' } = {}) => {
    const atual = lerLocal();
    const em = new Date().toISOString();
    const prox = { ...atual, [alertaId]: { status: novoStatus, nota, por, em } };
    gravarLocal(prox);
    setStatus(prox);
    const remoto = await lerRemoto();
    await gravarRemoto(mesclar(remoto || {}, prox));
  }, []);

  const statusDe = useCallback((alertaId) => {
    const s = status[alertaId]?.status;
    return s && s !== 'novo' ? s : 'novo';
  }, [status]);

  return { status, statusDe, definir };
}
