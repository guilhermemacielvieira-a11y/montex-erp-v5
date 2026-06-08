// ============================================================
// DEEP LINKS (MOBILE) — roteamento por payload/URL externa
// ============================================================
// Fundação push-agnóstica: traduz um destino externo (URL aberta no
// app, toque em push notification, atalho do PWA) para uma rota /m/*
// interna e navega até ela.
//
// Os listeners nativos são acessados via runtime (window.Capacitor.
// Plugins.*) — SEM import estático — para não quebrar o bundle web
// quando os plugins não estão instalados (mesmo padrão de haptics.js).
// Quando o push (#2) entrar, basta a Edge Function enviar no data do
// push um { to: '/m/despesas' } ou { tipo: 'despesa' } — já resolve.
// ============================================================

// Mapa semântico tipo → rota (para payloads que mandam só a categoria)
const TIPO_ROTA = {
  despesa: '/m/despesas', despesas: '/m/despesas',
  receita: '/m/receitas', receitas: '/m/receitas', medicao: '/m/receitas',
  estoque: '/m/estoque',
  expedicao: '/m/expedicao', embarque: '/m/expedicao',
  producao: '/m/producao', peca: '/m/producao',
  montagem: '/m/montagem',
  obra: '/m/obras', obras: '/m/obras',
  financeiro: '/m/financeiro',
  dashboard: '/m/dashboard',
  notificacoes: '/m/notificacoes',
};

// Resolve um payload heterogêneo para uma rota interna /m/* (ou null).
export function resolveDeepLink(data) {
  if (!data) return null;
  if (typeof data === 'string') return resolveDeepLink({ url: data });

  // 1) Rota direta já no formato interno
  if (typeof data.to === 'string' && data.to.startsWith('/m')) return data.to;

  // 2) URL completa (montex://app/m/... ou https://.../m/...)
  const url = data.url || data.link || data.deeplink || '';
  if (url) {
    const i = url.indexOf('/m/');
    if (i >= 0) return url.slice(i);
    if (/\/m\b/.test(url)) return '/m';
  }

  // 3) Categoria semântica
  const tipo = String(data.tipo || data.type || '').toLowerCase();
  if (tipo && TIPO_ROTA[tipo]) return TIPO_ROTA[tipo];

  return null;
}

// Registra os listeners nativos. Recebe o `navigate` do react-router.
// Retorna função de cleanup. No web (sem Capacitor) é no-op silencioso.
export function initDeepLinks(navigate) {
  if (typeof window === 'undefined' || typeof navigate !== 'function') return () => {};
  const cap = window.Capacitor;
  const handles = [];
  const go = (data) => { const to = resolveDeepLink(data); if (to) { try { navigate(to); } catch { /* noop */ } } };

  // App.appUrlOpen — abertura por URL/scheme (deep link clássico)
  try {
    const App = cap?.Plugins?.App;
    if (App?.addListener) handles.push(App.addListener('appUrlOpen', (ev) => go({ url: ev?.url })));
  } catch { /* noop */ }

  // PushNotifications.pushNotificationActionPerformed — toque na push
  try {
    const Push = cap?.Plugins?.PushNotifications;
    if (Push?.addListener) handles.push(Push.addListener('pushNotificationActionPerformed', (ev) => go(ev?.notification?.data || {})));
  } catch { /* noop */ }

  return () => {
    handles.forEach(h => {
      try {
        if (h?.remove) h.remove();
        else if (h?.then) h.then(x => x?.remove?.()).catch(() => {});
      } catch { /* noop */ }
    });
  };
}
