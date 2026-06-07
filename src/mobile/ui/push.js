// ============================================================
// DESIGN SYSTEM MOBILE — Push Notifications (APNs via Capacitor)
// ============================================================
// Acessa o plugin @capacitor/push-notifications em RUNTIME
// (window.Capacitor.Plugins.PushNotifications) — sem import estático,
// para não quebrar o bundle web. No web/PWA (sem o plugin) fica
// "indisponível" (instalar o app nativo). O token APNs é guardado em
// localStorage para o backend direcionar os envios (ver MOBILE-IOS-SETUP).
// ============================================================
const TOKEN_KEY = 'montex_push_token';

function plugin() {
  try {
    const cap = typeof window !== 'undefined' ? window.Capacitor : null;
    if (cap?.isNativePlatform?.() && cap?.Plugins?.PushNotifications) return cap.Plugins.PushNotifications;
  } catch { /* noop */ }
  return null;
}

export function isPushAvailable() {
  return !!plugin();
}

export function getPushToken() {
  try { return localStorage.getItem(TOKEN_KEY) || null; } catch { return null; }
}

// 'granted' | 'denied' | 'prompt' | 'indisponivel'
export async function getPushStatus() {
  const p = plugin();
  if (!p) return 'indisponivel';
  try {
    const perm = await p.checkPermissions();
    return perm?.receive || 'prompt';
  } catch { return 'indisponivel'; }
}

export async function enablePush(onReceive) {
  const p = plugin();
  if (!p) return { ok: false, reason: 'indisponivel' };
  try {
    let perm = await p.checkPermissions();
    if (perm?.receive === 'prompt' || perm?.receive === 'prompt-with-rationale') {
      perm = await p.requestPermissions();
    }
    if (perm?.receive !== 'granted') return { ok: false, reason: 'negado' };

    p.addListener('registration', (token) => {
      try { localStorage.setItem(TOKEN_KEY, token?.value || ''); } catch { /* noop */ }
    });
    p.addListener('pushNotificationReceived', (notif) => {
      try { onReceive?.(notif); } catch { /* noop */ }
    });
    await p.register();
    return { ok: true };
  } catch {
    return { ok: false, reason: 'erro' };
  }
}
