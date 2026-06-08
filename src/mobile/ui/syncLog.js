// ============================================================
// DESIGN SYSTEM MOBILE — Histórico de sincronização
// ============================================================
// Registra as ações da fila offline que foram efetivamente sincronizadas
// (aplicadas no servidor ao reconectar). Mostrado em Configurações →
// "Atividade recente". Mantém as últimas 20 (localStorage).
// ============================================================
const LS = 'montex_sync_log';
export const SYNCLOG_EVENT = 'montex-synclog-change';

export function logSync(label) {
  try {
    const arr = JSON.parse(localStorage.getItem(LS) || '[]');
    arr.unshift({ label: String(label || 'Ação'), ts: Date.now() });
    localStorage.setItem(LS, JSON.stringify(arr.slice(0, 20)));
    window.dispatchEvent(new Event(SYNCLOG_EVENT));
  } catch { /* noop */ }
}

export function getSyncLog() {
  try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; }
}
