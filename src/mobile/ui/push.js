// ============================================================
// PUSH NOTIFICATIONS (MOBILE) — registro de device + token
// ============================================================
// Acessa @capacitor/push-notifications via runtime (window.Capacitor.
// Plugins.PushNotifications) — SEM import estático — para degradar no
// web/PWA (mesmo padrão de haptics.js / deeplinks.js).
//
// Responsabilidades AQUI: permissão + register() + persistir o token
// APNs/FCM em `device_tokens` (Supabase). O ROTEAMENTO ao tocar a push
// é tratado em deeplinks.js (listener global pushNotificationAction
// Performed) — não duplicamos esse listener aqui.
//
// Edge Function que envia: supabase/functions/send-push (data:{ to }).
// Setup completo: MOBILE-IOS-SETUP.md
// ============================================================
import { supabase } from '@/api/supabaseClient';

function cap() {
  try { return typeof window !== 'undefined' ? window.Capacitor : null; } catch { return null; }
}
function pushPlugin() {
  const c = cap();
  return c?.isNativePlatform?.() && c?.Plugins?.PushNotifications ? c.Plugins.PushNotifications : null;
}
function platform() {
  try { return cap()?.getPlatform?.() || 'web'; } catch { return 'web'; }
}

// Disponível só em build nativo (iOS/Android com o plugin)
export function isPushSupported() { return !!pushPlugin(); }

let listenersReady = false;
let currentEmail = null;

// Persiste/atualiza o token do dispositivo para o usuário atual.
async function saveToken(token) {
  if (!token) return;
  try {
    await supabase.from('device_tokens').upsert(
      { token, user_email: currentEmail || null, platform: platform(), updated_at: new Date().toISOString() },
      { onConflict: 'token' }
    );
  } catch (e) {
    console.warn('[push] falha ao salvar token:', e?.message || e);
  }
}

function ensureListeners() {
  const Push = pushPlugin();
  if (!Push || listenersReady) return;
  listenersReady = true;
  // Token emitido após register() — pode chegar de forma assíncrona.
  Push.addListener('registration', (t) => saveToken(t?.value));
  Push.addListener('registrationError', (e) => console.warn('[push] registrationError:', e));
  // OBS: pushNotificationActionPerformed (toque → rota) fica em deeplinks.js.
}

// Solicita permissão e registra o device. Retorna { ok, reason }.
export async function registerPush(userEmail) {
  const Push = pushPlugin();
  if (!Push) return { ok: false, reason: 'unsupported' };
  currentEmail = userEmail || currentEmail;
  try {
    let perm = await Push.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await Push.requestPermissions();
    }
    if (perm.receive !== 'granted') return { ok: false, reason: 'denied' };
    ensureListeners();
    await Push.register();
    return { ok: true };
  } catch (e) {
    console.warn('[push] registerPush falhou:', e?.message || e);
    return { ok: false, reason: 'error' };
  }
}

// Desativa: remove o(s) token(s) deste device/usuário do servidor para
// parar de receber. (Não há "unregister" padrão no plugin.)
export async function removePush(userEmail) {
  const email = userEmail || currentEmail;
  try {
    if (email) await supabase.from('device_tokens').delete().eq('user_email', email).eq('platform', platform());
  } catch (e) {
    console.warn('[push] removePush falhou:', e?.message || e);
  }
  return { ok: true };
}
