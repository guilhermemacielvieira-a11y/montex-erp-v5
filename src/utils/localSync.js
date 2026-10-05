// ============================================
// SYNC LOCAL (localStorage) — mesma aba + outras abas
// ============================================
// O evento `storage` do navegador só dispara nas OUTRAS abas. Antes, para
// perceber gravações feitas na MESMA aba (ex.: 3D marca peça montada enquanto
// a Montagem está aberta), várias páginas faziam polling de localStorage a
// cada 3 s. Agora quem grava chama notifyLocalChange(key) (CustomEvent na
// própria aba) e quem lê assina com subscribeLocalKeys(), que combina:
//   - CustomEvent  → mesma aba (imediato)
//   - storage      → outras abas (imediato)
//   - intervalo lento (30 s) → rede de segurança p/ gravações que não
//     notificam (código legado que faz localStorage.setItem direto).
// ============================================

export const LOCAL_SYNC_EVENT = 'montex:local-storage-change';
export const LOCAL_SYNC_FALLBACK_MS = 30000;

const pendentes = new Set();
let agendado = false;

/**
 * Avisa os assinantes da MESMA aba que `key` mudou no localStorage.
 * Assíncrono (microtask) e agrupado por chave: writers como
 * saveConcluidasSmart são chamados de dentro de updaters do setState — um
 * dispatch síncrono faria o listener chamar setState durante o render.
 */
export function notifyLocalChange(key) {
  if (typeof window === 'undefined') return;
  pendentes.add(key ?? null);
  if (agendado) return;
  agendado = true;
  const flush = () => {
    agendado = false;
    const keys = [...pendentes];
    pendentes.clear();
    for (const k of keys) {
      try {
        window.dispatchEvent(new CustomEvent(LOCAL_SYNC_EVENT, { detail: { key: k } }));
      } catch { /* noop */ }
    }
  };
  if (typeof queueMicrotask === 'function') queueMicrotask(flush);
  else Promise.resolve().then(flush);
}

/**
 * Assina mudanças das chaves `keys` (mesma aba, outras abas e fallback lento).
 * onChange(key, origem) — origem: 'local' | 'storage' | 'fallback'.
 * key === null significa "qualquer/desconhecida" (storage.clear() ou fallback).
 * Retorna a função de unsubscribe.
 */
export function subscribeLocalKeys(keys, onChange, { fallbackMs = LOCAL_SYNC_FALLBACK_MS } = {}) {
  if (typeof window === 'undefined') return () => {};
  const watched = new Set(keys || []);
  const onLocal = (e) => {
    const key = e?.detail?.key ?? null;
    if (key === null || watched.has(key)) onChange(key, 'local');
  };
  const onStorage = (e) => {
    if (e.key === null || watched.has(e.key)) onChange(e.key, 'storage');
  };
  window.addEventListener(LOCAL_SYNC_EVENT, onLocal);
  window.addEventListener('storage', onStorage);
  const iv = fallbackMs > 0 ? setInterval(() => onChange(null, 'fallback'), fallbackMs) : null;
  return () => {
    window.removeEventListener(LOCAL_SYNC_EVENT, onLocal);
    window.removeEventListener('storage', onStorage);
    if (iv) clearInterval(iv);
  };
}
