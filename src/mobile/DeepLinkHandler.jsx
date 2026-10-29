// ============================================================
// DEEP LINK HANDLER — abre a tela certa por deep link / push
// ============================================================
// No app nativo (Capacitor): ouve `App.appUrlOpen` (deep link
// montex://m/... ou https://.../m/...) e `pushNotificationActionPerformed`
// (toque numa push → notification.data.path) e navega para a rota /m/...
// Na abertura a frio usa `App.getLaunchUrl()` (o evento pode disparar antes
// deste componente montar). No web/PWA fica inerte.
// A URL vira rota em caminhoDeepLink (./deepLink.js, testado).
// ============================================================
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { caminhoDeepLink } from './deepLink';

const CHAVE_LANCAMENTO = 'montex_deeplink_launch';

export default function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const cap = typeof window !== 'undefined' ? window.Capacitor : null;
    if (!cap?.isNativePlatform?.()) return undefined;

    let ativo = true;
    const go = (entrada) => {
      const caminho = caminhoDeepLink(entrada);
      if (ativo && caminho) navigate(caminho);
    };

    // addListener devolve o handle direto (Capacitor 2) ou uma Promise dele
    // (Capacitor 3+). Guarda os dois jeitos para conseguir remover depois.
    const handles = [];
    const ouvir = (plugin, evento, fn) => {
      try {
        const h = plugin?.addListener?.(evento, fn);
        if (h) handles.push(Promise.resolve(h));
      } catch { /* plugin indisponível */ }
    };

    const App = cap.Plugins?.App;
    const Push = cap.Plugins?.PushNotifications;

    ouvir(App, 'appUrlOpen', (data) => go(data?.url));
    // Usuário tocou na notificação → data.path define a tela
    ouvir(Push, 'pushNotificationActionPerformed', (action) => go(action?.notification?.data?.path));

    // Abertura a frio por link: só uma vez por sessão (recarregar não repete).
    try {
      if (App?.getLaunchUrl && sessionStorage.getItem(CHAVE_LANCAMENTO) !== '1') {
        sessionStorage.setItem(CHAVE_LANCAMENTO, '1');
        Promise.resolve(App.getLaunchUrl()).then((r) => go(r?.url)).catch(() => {});
      }
    } catch { /* sessionStorage indisponível */ }

    return () => {
      ativo = false;
      handles.forEach((p) => p.then((h) => h?.remove?.()).catch(() => {}));
    };
  }, [navigate]);

  return null;
}
