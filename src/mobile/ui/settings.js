// ============================================================
// SETTINGS (MOBILE) — preferências do app persistidas
// ============================================================
// Pequeno store de preferências do usuário (localStorage), com
// assinatura reativa para a UI. Usado por Configurações, pelo badge
// do sino (notificações) e pelos haptics.
// ============================================================
import { useState, useEffect } from 'react';

const LS_KEY = 'montex_mobile_settings_v1';
const DEFAULTS = { notificacoes: true, haptics: true };
const listeners = new Set();

function read() {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(LS_KEY) || '{}')) }; }
  catch { return { ...DEFAULTS }; }
}
let cache = read();

export function getSettings() { return cache; }
export function getSetting(key) { return cache[key]; }

export function setSetting(key, value) {
  cache = { ...cache, [key]: value };
  try { localStorage.setItem(LS_KEY, JSON.stringify(cache)); } catch { /* noop */ }
  listeners.forEach(fn => { try { fn(cache); } catch { /* noop */ } });
}

export function subscribeSettings(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Hook reativo: re-renderiza quando qualquer preferência muda.
export function useSettings() {
  const [s, setS] = useState(getSettings);
  useEffect(() => subscribeSettings(setS), []);
  return s;
}
