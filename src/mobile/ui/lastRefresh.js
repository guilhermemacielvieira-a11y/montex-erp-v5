// ============================================================
// DESIGN SYSTEM MOBILE — Última atualização
// ============================================================
// Guarda o instante da última carga/atualização de dados (localStorage,
// por origem) e formata em tempo relativo ("agora", "há 3 min").
// ============================================================
const LS_KEY = 'montex_mobile_last_refresh';

export function setLastRefresh(ts = Date.now()) {
  try { localStorage.setItem(LS_KEY, String(ts)); } catch { /* noop */ }
}

export function getLastRefresh() {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v ? Number(v) : 0;
  } catch { return 0; }
}

// Define a 1ª vez (abertura do app) sem sobrescrever um valor já existente
// numa mesma sessão de origem.
export function initLastRefresh() {
  if (!getLastRefresh()) setLastRefresh();
}

export function formatRelative(ts, now = Date.now()) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 10) return 'agora';
  if (s < 60) return `há ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} d`;
}
