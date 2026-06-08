// ============================================================
// EDGE FUNCTION — send-push (APNs)
// ============================================================
// Envia push notifications iOS via APNs (autenticação por token .p8,
// ES256). O payload inclui `to` no nível superior → o app abre direto
// na rota certa (ver src/mobile/ui/deeplinks.js → resolveDeepLink).
//
// Request (POST, JSON):
//   {
//     "title": "Despesa vencida",
//     "body": "3 despesas venceram — regularize",
//     "to": "/m/despesas",                 // rota interna OU { tipo: "despesa" }
//     "target": { "email": "x@y.com" }     // ou { "role": "gerente" }
//                                          // ou { "tokens": ["..."] } ou {} = todos
//   }
//
// Env (supabase secrets set ...):
//   APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_PRIVATE_KEY (.p8),
//   APNS_HOST (api.push.apple.com | api.sandbox.push.apple.com),
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy: supabase functions deploy send-push --no-verify-jwt
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// Importa a chave .p8 (PKCS#8 PEM) para assinatura ES256
async function importKey(pem: string): Promise<CryptoKey> {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), c => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

// JWT APNs (válido ~1h; aqui geramos por invocação)
async function makeJwt(keyId: string, teamId: string, key: CryptoKey): Promise<string> {
  const header = b64url(enc.encode(JSON.stringify({ alg: 'ES256', kid: keyId })));
  const payload = b64url(enc.encode(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${payload}`));
  return `${header}.${payload}.${b64url(sig)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { title = 'MONTEX', body = '', to = '', target = {} } = await req.json();

    const KEY_ID = Deno.env.get('APNS_KEY_ID')!;
    const TEAM_ID = Deno.env.get('APNS_TEAM_ID')!;
    const BUNDLE_ID = Deno.env.get('APNS_BUNDLE_ID')!;
    const HOST = Deno.env.get('APNS_HOST') || 'api.push.apple.com';
    const P8 = Deno.env.get('APNS_PRIVATE_KEY')!;
    if (!KEY_ID || !TEAM_ID || !BUNDLE_ID || !P8) {
      return new Response(JSON.stringify({ error: 'APNs env não configurado' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Resolve a lista de tokens-alvo
    let tokens: string[] = [];
    if (Array.isArray(target.tokens) && target.tokens.length) {
      tokens = target.tokens;
    } else {
      let emails: string[] | null = null;
      if (target.role) {
        const { data: profs } = await admin.from('user_profiles').select('email').eq('role', target.role);
        emails = (profs || []).map((p: { email: string }) => p.email);
      } else if (target.email) {
        emails = [target.email];
      }
      let q = admin.from('device_tokens').select('token').eq('platform', 'ios');
      if (emails) q = q.in('user_email', emails);
      const { data: rows } = await q;
      tokens = (rows || []).map((r: { token: string }) => r.token);
    }
    if (!tokens.length) return new Response(JSON.stringify({ sent: 0, note: 'nenhum token' }), { headers: { ...CORS, 'Content-Type': 'application/json' } });

    const jwt = await makeJwt(KEY_ID, TEAM_ID, await importKey(P8));
    // `to` no nível superior → vira notification.data.to no app (deep link)
    const apnsBody = JSON.stringify({ aps: { alert: { title, body }, sound: 'default', 'mutable-content': 1 }, to });

    const results = await Promise.allSettled(tokens.map(async (tk) => {
      const res = await fetch(`https://${HOST}/3/device/${tk}`, {
        method: 'POST',
        headers: {
          authorization: `bearer ${jwt}`,
          'apns-topic': BUNDLE_ID,
          'apns-push-type': 'alert',
          'apns-priority': '10',
          'content-type': 'application/json',
        },
        body: apnsBody,
      });
      // 410 = token inválido/expirado → limpa do banco
      if (res.status === 410) { await admin.from('device_tokens').delete().eq('token', tk); }
      return { token: tk.slice(0, 8) + '…', status: res.status };
    }));

    const sent = results.filter(r => r.status === 'fulfilled' && (r.value as { status: number }).status === 200).length;
    return new Response(JSON.stringify({ sent, total: tokens.length }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
