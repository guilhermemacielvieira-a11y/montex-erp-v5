// ============================================================
// DESIGN SYSTEM MOBILE — Biometria (Face ID / Touch ID)
// ============================================================
// Confirmação biométrica via plugin nativo (capacitor-native-biometric),
// acessado em runtime (window.Capacitor.Plugins.NativeBiometric) — SEM
// import estático, para não quebrar o bundle web. No web/PWA ou sem o
// plugin, NÃO bloqueia (retorna true) — a ação prossegue normalmente.
// ============================================================
function nativeBio() {
  try {
    const cap = typeof window !== 'undefined' ? window.Capacitor : null;
    if (cap?.isNativePlatform?.() && cap?.Plugins?.NativeBiometric) return cap.Plugins.NativeBiometric;
  } catch { /* noop */ }
  return null;
}

// Retorna true se autorizado (ou se não há biometria disponível → não bloqueia).
// Retorna false apenas se o usuário tinha biometria e FALHOU/cancelou.
export async function confirmarBiometria(reason = 'Confirmar ação') {
  const bio = nativeBio();
  if (!bio) return true;
  try {
    const avail = await bio.isAvailable();
    if (!avail?.isAvailable) return true;
    await bio.verifyIdentity({ reason, title: 'MONTEX', subtitle: reason });
    return true;
  } catch {
    return false;
  }
}
