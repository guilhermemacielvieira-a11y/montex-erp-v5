// ============================================================
// Edge Function: send-push — envia notificações APNs (iOS)
// ============================================================
// Envia push para os dispositivos registrados em `push_tokens`.
// Autentica no APNs com JWT ES256 (provider token) usando a chave .p8.
//
// Deploy:
//   supabase functions deploy send-push --no-verify-jwt
//
// Secrets necessários (supabase secrets set ...):
//   APNS_KEY_ID       = Key ID da AuthKey (.p8) do Apple Developer
//   APNS_TEAM_ID      = Team ID (10 chars)
//   APNS_BUNDLE_ID    = bundle id do app (ex.: com.montex.erp)
//   APNS_PRIVATE_KEY  = conteúdo do .p8 (incl. -----BEGIN PRIVATE KEY-----)
//   APNS_PRODUCTION   = "true" para produção (api.push.apple.com),
//                       ausente/false usa sandbox (api.sandbox.push.apple.com)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY já existem no ambiente da function
//
// Chamada (POST JSON):
//   { "title": "...", "body": "...",
//     "filtro": { "role": "montador", "obra_id": "obra-001", "tokens": ["..."] },
//     "data": { "rota": "/m/montagem" } }
//   - Sem filtro → envia para todos os tokens habilitados.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const enc = new TextEncoder();

function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? enc.encode(input) : new Uint8Array(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// PEM (.p8) → CryptoKey ES256
async function importP8(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    der.buffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

// Provider JWT do APNs (válido por até 60 min; reaproveitado por execução)
async function makeApnsJwt(keyId: string, teamId: string, key: CryptoKey, iat: number): Promise<string> {
  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = b64url(JSON.stringify({ iss: teamId, iat }));
  const signingInput = `${header}.${claims}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(signingInput),
  );
  return `${signingInput}.${b64url(sig)}`;
}

const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return json(405, { error: "use POST" });

  try {
    const { title, body, data = {}, filtro = {} } = await req.json().catch(() => ({}));
    if (!title && !body) return json(400, { error: "title ou body obrigatório" });

    const KEY_ID = Deno.env.get("APNS_KEY_ID");
    const TEAM_ID = Deno.env.get("APNS_TEAM_ID");
    const BUNDLE = Deno.env.get("APNS_BUNDLE_ID");
    const P8 = Deno.env.get("APNS_PRIVATE_KEY");
    if (!KEY_ID || !TEAM_ID || !BUNDLE || !P8) {
      return json(500, { error: "Secrets APNS_* ausentes (ver MOBILE-IOS-SETUP.md)" });
    }
    const host = Deno.env.get("APNS_PRODUCTION") === "true"
      ? "https://api.push.apple.com"
      : "https://api.sandbox.push.apple.com";

    // Tokens-alvo: ou explícitos no filtro, ou via tabela push_tokens
    let tokens: string[] = Array.isArray(filtro.tokens) ? filtro.tokens.filter(Boolean) : [];
    if (tokens.length === 0) {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        (Deno.env.get("MONTEX_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
      );
      let q = sb.from("push_tokens").select("token").eq("enabled", true).eq("platform", "ios");
      if (filtro.role) q = q.eq("role", filtro.role);
      if (filtro.obra_id) q = q.eq("obra_id", filtro.obra_id);
      const { data: rows, error } = await q;
      if (error) return json(500, { error: error.message });
      tokens = (rows ?? []).map((r: { token: string }) => r.token);
    }
    if (tokens.length === 0) return json(200, { sent: 0, message: "nenhum dispositivo" });

    const iat = Math.floor(Date.now() / 1000);
    const key = await importP8(P8);
    const jwt = await makeApnsJwt(KEY_ID, TEAM_ID, key, iat);

    const payload = JSON.stringify({
      aps: { alert: { title, body }, sound: "default", badge: data.badge },
      ...data,
    });

    const results = await Promise.allSettled(
      tokens.map(async (tok) => {
        const r = await fetch(`${host}/3/device/${tok}`, {
          method: "POST",
          headers: {
            authorization: `bearer ${jwt}`,
            "apns-topic": BUNDLE,
            "apns-push-type": "alert",
            "apns-priority": "10",
          },
          body: payload,
        });
        return { tok, status: r.status, reason: r.ok ? null : await r.text() };
      }),
    );

    const ok = results.filter((r) => r.status === "fulfilled" && r.value.status === 200).length;
    const fail = results.length - ok;
    return json(200, { sent: ok, failed: fail, total: results.length });
  } catch (e) {
    return json(500, { error: String(e?.message || e) });
  }
});
