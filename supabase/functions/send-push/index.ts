// ============================================================
// EDGE FUNCTION — send-push (APNs, sob demanda)
// ============================================================
// Envia uma push iOS para um alvo. O payload inclui `to` no nível
// superior → o app abre direto na rota certa (deeplinks.js).
//
// Request (POST, JSON):
//   {
//     "title": "Despesa vencida",
//     "body": "3 despesas venceram — regularize",
//     "to": "/m/despesas",                 // rota interna OU { tipo: "despesa" }
//     "target": { "email": "x@y.com" }     // ou { "role" } / { "roles":[] }
//                                          // ou { "tokens":[] } ou {} = todos iOS
//   }
//
// Lógica de envio compartilhada em ../_shared/apns.ts
// Deploy: supabase functions deploy send-push --no-verify-jwt
// ============================================================
import { sendPush } from '../_shared/apns.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { title = 'MONTEX', body = '', to = '', target = {} } = await req.json();
    const r = await sendPush({ title, body, to, target });
    return json(r);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
