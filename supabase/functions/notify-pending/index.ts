// ============================================================
// EDGE FUNCTION — notify-pending (push automático via cron)
// ============================================================
// Porta a lógica de alertas do app (useAlertas) para o servidor:
// varre as pendências e dispara push aos papéis responsáveis, com
// `data.path` apontando para a tela que resolve cada uma (deep link
// tratado por src/mobile/DeepLinkHandler.jsx).
//
// O envio é delegado à Edge Function `send-push` (mesma infra: tabela
// `push_tokens` + APNs JWT ES256) — aqui só se resolvem os tokens por
// papel e se monta o payload.
//
// Acionada por pg_cron (ver MOBILE-IOS-SETUP.md §7.5). Só envia quando
// há pendência. Idempotência diária: agende 1x/dia para evitar repetição.
//
// Deploy: supabase functions deploy notify-pending --no-verify-jwt
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const num = (v: unknown) => Number(v) || 0;
const money = (n: number) => 'R$ ' + num(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

const GESTAO = ['gerente', 'admin'];
const FIN = ['gerente', 'financeiro', 'admin'];
const OPER = ['gerente', 'supervisor', 'admin'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SECRET = (Deno.env.get('MONTEX_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!;
    const admin = createClient(SUPABASE_URL, SECRET);
    const hoje = new Date().toISOString().slice(0, 10);
    const alerts: { title: string; body: string; path: string; roles: string[] }[] = [];

    // 1) Despesas vencidas (não pagas/canceladas, vencimento < hoje)
    const { data: desp } = await admin
      .from('lancamentos_despesas')
      .select('valor, data_vencimento, status')
      .not('status', 'in', '("pago","cancelado")')
      .lt('data_vencimento', hoje);
    if (desp && desp.length) {
      const total = desp.reduce((s, d) => s + num(d.valor), 0);
      alerts.push({ title: 'Despesas vencidas', body: `${desp.length} despesa(s) vencida(s) · ${money(total)}`, path: '/m/despesas', roles: FIN });
    }

    // 2) Estoque crítico/zerado (minimo*0.5 não dá p/ filtrar no PostgREST → calcula aqui)
    const { data: estq } = await admin.from('estoque').select('quantidade, minimo');
    const crit = (estq || []).filter(i => { const q = num(i.quantidade), m = num(i.minimo); return q <= 0 || (m && q <= m * 0.5); });
    if (crit.length) alerts.push({ title: 'Estoque crítico', body: `${crit.length} item(ns) zerado(s)/abaixo do mínimo`, path: '/m/estoque', roles: OPER });

    // 3) Peças prontas p/ embarque (etapa expedido) — count sem trazer linhas (limite 1000)
    const { count: prontas } = await admin.from('pecas_producao').select('id', { count: 'exact', head: true }).eq('etapa', 'expedido');
    if (prontas && prontas > 0) alerts.push({ title: 'Fila de embarque', body: `${prontas} conjunto(s) prontos para expedição`, path: '/m/expedicao', roles: OPER });

    // 4) Medições pendentes de recebimento
    const { data: med } = await admin.from('medicoes').select('valor, status').neq('status', 'pago');
    if (med && med.length) {
      const total = med.reduce((s, m) => s + num(m.valor), 0);
      alerts.push({ title: 'Medições pendentes', body: `${med.length} medição(ões) · a receber ${money(total)}`, path: '/m/receitas', roles: GESTAO });
    }

    // Resolve tokens por papel e delega o envio ao send-push (só quando há pendência)
    const out: unknown[] = [];
    for (const a of alerts) {
      const { data: rows } = await admin
        .from('push_tokens').select('token')
        .eq('enabled', true).eq('platform', 'ios').in('role', a.roles);
      const tokens = (rows || []).map((r: { token: string }) => r.token).filter(Boolean);
      if (!tokens.length) { out.push({ ...a, sent: 0, total: 0 }); continue; }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET}`, apikey: SECRET },
        body: JSON.stringify({ title: a.title, body: a.body, data: { path: a.path }, filtro: { tokens } }),
      });
      const r = await res.json().catch(() => ({}));
      out.push({ ...a, sent: r.sent ?? 0, total: tokens.length });
    }
    return json({ alerts: out.length, detail: out });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
