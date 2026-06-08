// ============================================================
// EDGE FUNCTION — notify-pending (push automático via cron)
// ============================================================
// Porta a lógica de src/mobile/ui/notificacoes.js para o servidor:
// varre as pendências e dispara push aos papéis responsáveis, com
// `to` apontando para a tela que resolve cada uma (deep link).
//
// Acionada por pg_cron (ver MOBILE-IOS-SETUP.md §7.5). Só envia quando
// há pendência. Idempotência diária: agende 1x/dia para evitar repetição.
//
// Deploy: supabase functions deploy notify-pending --no-verify-jwt
// ============================================================
import { adminClient, sendPush } from '../_shared/apns.ts';

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
    const admin = adminClient();
    const hoje = new Date().toISOString().slice(0, 10);
    const alerts: { title: string; body: string; to: string; roles: string[] }[] = [];

    // 1) Despesas vencidas (não pagas/canceladas, vencimento < hoje)
    const { data: desp } = await admin
      .from('lancamentos_despesas')
      .select('valor, data_vencimento, status')
      .not('status', 'in', '("pago","cancelado")')
      .lt('data_vencimento', hoje);
    if (desp && desp.length) {
      const total = desp.reduce((s, d) => s + num(d.valor), 0);
      alerts.push({ title: 'Despesas vencidas', body: `${desp.length} despesa(s) vencida(s) · ${money(total)}`, to: '/m/despesas', roles: FIN });
    }

    // 2) Estoque crítico/zerado (minimo*0.5 não dá p/ filtrar no PostgREST → calcula aqui)
    const { data: estq } = await admin.from('estoque').select('quantidade, minimo');
    const crit = (estq || []).filter(i => { const q = num(i.quantidade), m = num(i.minimo); return q <= 0 || (m && q <= m * 0.5); });
    if (crit.length) alerts.push({ title: 'Estoque crítico', body: `${crit.length} item(ns) zerado(s)/abaixo do mínimo`, to: '/m/estoque', roles: OPER });

    // 3) Peças prontas p/ embarque (etapa expedido) — count sem trazer linhas (limite 1000)
    const { count: prontas } = await admin.from('pecas_producao').select('id', { count: 'exact', head: true }).eq('etapa', 'expedido');
    if (prontas && prontas > 0) alerts.push({ title: 'Fila de embarque', body: `${prontas} conjunto(s) prontos para expedição`, to: '/m/expedicao', roles: OPER });

    // 4) Medições pendentes de recebimento
    const { data: med } = await admin.from('medicoes').select('valor, status').neq('status', 'pago');
    if (med && med.length) {
      const total = med.reduce((s, m) => s + num(m.valor), 0);
      alerts.push({ title: 'Medições pendentes', body: `${med.length} medição(ões) · a receber ${money(total)}`, to: '/m/receitas', roles: GESTAO });
    }

    // Dispara (só quando há pendência)
    const out: unknown[] = [];
    for (const a of alerts) {
      const r = await sendPush({ title: a.title, body: a.body, to: a.to, target: { roles: a.roles }, admin });
      out.push({ ...a, ...r });
    }
    return json({ alerts: out.length, detail: out });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
