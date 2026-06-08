// ============================================================
// _shared/apns.ts — envio APNs reutilizável
// ============================================================
// Usado por send-push (sob demanda) e notify-pending (cron). Concentra
// JWT ES256 (.p8), resolução de tokens-alvo e o POST ao APNs.
// ============================================================
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

async function importKey(pem: string): Promise<CryptoKey> {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), c => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

// JWT APNs válido por ~50min — cacheado em memória da instância.
let jwtCache: { token: string; t: number } | null = null;
async function getJwt(): Promise<string> {
  if (jwtCache && Date.now() - jwtCache.t < 50 * 60 * 1000) return jwtCache.token;
  const KEY_ID = Deno.env.get('APNS_KEY_ID')!;
  const TEAM_ID = Deno.env.get('APNS_TEAM_ID')!;
  const key = await importKey(Deno.env.get('APNS_PRIVATE_KEY')!);
  const header = b64url(enc.encode(JSON.stringify({ alg: 'ES256', kid: KEY_ID })));
  const payload = b64url(enc.encode(JSON.stringify({ iss: TEAM_ID, iat: Math.floor(Date.now() / 1000) })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${payload}`));
  const token = `${header}.${payload}.${b64url(sig)}`;
  jwtCache = { token, t: Date.now() };
  return token;
}

export type Target = { tokens?: string[]; email?: string; role?: string; roles?: string[] };

// Resolve a lista de tokens iOS a partir do alvo.
export async function resolveTokens(admin: SupabaseClient, target: Target = {}): Promise<string[]> {
  if (Array.isArray(target.tokens) && target.tokens.length) return target.tokens;
  let emails: string[] | null = null;
  const roles = target.roles || (target.role ? [target.role] : null);
  if (roles) {
    const { data } = await admin.from('user_profiles').select('email').in('role', roles);
    emails = (data || []).map((p: { email: string }) => p.email).filter(Boolean);
  } else if (target.email) {
    emails = [target.email];
  }
  let q = admin.from('device_tokens').select('token').eq('platform', 'ios');
  if (emails) { if (!emails.length) return []; q = q.in('user_email', emails); }
  const { data: rows } = await q;
  return (rows || []).map((r: { token: string }) => r.token);
}

// Envia uma push (data:{ to }) para o alvo. Limpa tokens 410.
export async function sendPush(opts: { title: string; body: string; to?: unknown; target?: Target; admin?: SupabaseClient }) {
  const admin = opts.admin || adminClient();
  const tokens = await resolveTokens(admin, opts.target || {});
  if (!tokens.length) return { sent: 0, total: 0 };

  const HOST = Deno.env.get('APNS_HOST') || 'api.push.apple.com';
  const BUNDLE_ID = Deno.env.get('APNS_BUNDLE_ID')!;
  const jwt = await getJwt();
  const apnsBody = JSON.stringify({ aps: { alert: { title: opts.title, body: opts.body }, sound: 'default', 'mutable-content': 1 }, to: opts.to ?? '' });

  const results = await Promise.allSettled(tokens.map(async (tk) => {
    const res = await fetch(`https://${HOST}/3/device/${tk}`, {
      method: 'POST',
      headers: { authorization: `bearer ${jwt}`, 'apns-topic': BUNDLE_ID, 'apns-push-type': 'alert', 'apns-priority': '10', 'content-type': 'application/json' },
      body: apnsBody,
    });
    if (res.status === 410) await admin.from('device_tokens').delete().eq('token', tk);
    return res.status;
  }));
  const sent = results.filter(r => r.status === 'fulfilled' && r.value === 200).length;
  return { sent, total: tokens.length };
}
