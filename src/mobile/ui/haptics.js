// ============================================================
// DESIGN SYSTEM MOBILE — Haptics
// ============================================================
// Feedback tátil unificado. Acessa o plugin nativo @capacitor/haptics
// via runtime (window.Capacitor.Plugins.Haptics) — SEM import estático,
// para não quebrar o bundle web quando o plugin não está instalado.
// Fallback para navigator.vibrate (web/PWA). Quando o app for empacotado
// com Capacitor + @capacitor/haptics, o plugin é detectado automaticamente.
// ============================================================
import { getSetting } from './settings';

function nativeHaptics() {
  try {
    const cap = typeof window !== 'undefined' ? window.Capacitor : null;
    if (cap?.isNativePlatform?.() && cap?.Plugins?.Haptics) return cap.Plugins.Haptics;
  } catch { /* noop */ }
  return null;
}

const STYLE = { light: 'LIGHT', medium: 'MEDIUM', heavy: 'HEAVY' };

export async function tap(style = 'medium') {
  if (getSetting('haptics') === false) return; // respeita preferência do usuário
  const h = nativeHaptics();
  if (h) {
    try { await h.impact({ style: STYLE[style] || 'MEDIUM' }); return; } catch { /* fallthrough */ }
  }
  try { navigator.vibrate?.(style === 'heavy' ? 30 : style === 'light' ? 8 : 15); } catch { /* noop */ }
}

export async function success() {
  if (getSetting('haptics') === false) return; // respeita preferência do usuário
  const h = nativeHaptics();
  if (h) {
    try { await h.notification({ type: 'SUCCESS' }); return; } catch { /* fallthrough */ }
  }
  try { navigator.vibrate?.([10, 40, 10]); } catch { /* noop */ }
}
