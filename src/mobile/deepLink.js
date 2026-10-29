// ============================================================
// DEEP LINK — converte a URL recebida pelo app nativo na rota /m/...
// ============================================================
// Aceita:
//   montex://m/aprovacoes?aba=pagar   (esquema próprio: "m" chega como host)
//   https://montex-erp-v5.vercel.app/m/obras/obra-001 (link universal)
//   /m/financeiro (caminho já pronto, ex.: data.path de uma push)
// Devolve o caminho com query/hash ou null quando não é rota do app.
// Puro e testado em src/mobile/__tests__/deepLink.test.js.
// ============================================================

const ehRotaApp = (p) => p === '/m' || p.startsWith('/m/');

export function caminhoDeepLink(entrada) {
  if (!entrada || typeof entrada !== 'string') return null;
  const txt = entrada.trim();

  if (txt.startsWith('/')) {
    const so = txt.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
    return ehRotaApp(so) ? txt : null;
  }

  let url;
  try { url = new URL(txt); } catch { return null; }

  let caminho = url.pathname || '';
  // Esquema próprio (montex://m/...): o primeiro segmento vem como host.
  if (!/^https?:$/.test(url.protocol) && url.host) {
    caminho = `/${url.host}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
  }
  caminho = caminho.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  if (!ehRotaApp(caminho)) return null;
  return `${caminho}${url.search}${url.hash}`;
}
