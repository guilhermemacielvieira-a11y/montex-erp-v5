// ============================================================
// DEEP LINK HANDLER — abre a tela certa por deep link / push
// ============================================================
// No app nativo (Capacitor): ouve `App.appUrlOpen` (deep link
// montex://m/... ou https://.../m/...) e `pushNotificationActionPerformed`
// (toque numa push → notification.data.path) e navega para a rota /m/...
// No web/PWA fica inerte. Roda dentro do <Router> (via App.jsx → MobileApp).
// ============================================================
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const cap = typeof window !== 'undefined' ? window.Capacitor : null;
    if (!cap?.isNativePlatform?.()) return;

    const go = (path) => {
      if (path && typeof path === 'string' && path.startsWith('/m')) navigate(path);
    };

    const subs = [];
    const App = cap.Plugins?.App;
    const Push = cap.Plugins?.PushNotifications;

    if (App?.addListener) {
      subs.push(App.addListener('appUrlOpen', (data) => {
        try { go(new URL(data.url).pathname); } catch { /* url inválida */ }
      }));
    }
    if (Push?.addListener) {
      // Usuário tocou na notificação → data.path define a tela
      subs.push(Push.addListener('pushNotificationActionPerformed', (action) => {
        go(action?.notification?.data?.path);
      }));
    }

    return () => { subs.forEach(s => { try { s?.remove?.(); } catch { /* noop */ } }); };
  }, [navigate]);

  return null;
}
