// ============================================================
// PAINEL FINANCEIRO GLOBAL — caixa GERAL da empresa (mobile)
// ============================================================
// Financeiro de OBRA ≠ financeiro da EMPRESA. Esta tela espelha o
// PainelFinanceiroGlobal do desktop (mesmas fontes, mesma matemática,
// realtime) em formato mobile de leitura/análise:
//   • KPIs do período: receitas/despesas (real x pendente), lucro, margem
//   • Projeção 30/60/90 dias (a receber − a pagar, só pendências)
//   • 13 semanas de saldo acumulado com alerta de saldo mínimo
//   • Top categorias de despesa
//   • Últimos movimentos consolidados
// Filtros: período (geral/semana/mês/trimestre) e ORIGEM (tudo /
// só empresa-sem-obra / uma obra específica) — o filtro de obra aqui é
// independente do filtro global do app (o painel é da empresa inteira).
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  ComposedChart, Line, PieChart, Pie,
} from 'recharts';
import {
  Landmark, TrendingUp, TrendingDown, AlertTriangle, ChevronRight, Wallet, PiggyBank, Hourglass, Flame,
} from 'lucide-react';
import MobileLayout from '../MobileLayout';
import { usePainelGlobal, kpisDe, futuroDe, parseLocalDate, ehPago } from '../usePainelGlobal';

const fmtBR = (n, dec = 0) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtMoney = (n) => 'R$ ' + fmtBR(n, 0);
const fmtShort = (n) => {
  const v = Number(n) || 0; const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (a >= 1e3) return Math.round(v / 1e3) + 'k';
  return String(Math.round(v));
};
const PERIODOS = [
  { key: 'geral', label: 'Geral' },
  { key: 'semanal', label: '7 dias' },
  { key: 'mensal', label: '30 dias' },
  { key: 'trimestral', label: '90 dias' },
];
const CAT_CORES = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

function DarkTooltip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 text-[11px] shadow-xl">
      {label != null && <div className="font-semibold text-slate-200 mb-0.5">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5 text-slate-300">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.color }} />
          {p.name}: <span className="font-bold text-slate-100">{fmt ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone = 'slate' }) {
  const T = {
    green: 'text-emerald-300', red: 'text-red-300', amber: 'text-amber-300', slate: 'text-slate-100', blue: 'text-blue-300',
  }[tone];
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className={`text-lg font-black mt-1 leading-none ${T}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function PainelGlobalMobile() {
  const { todasMovs, metas, obrasMap } = usePainelGlobal();
  const [periodo, setPeriodo] = useState('geral');
  const [origem, setOrigem] = useState('tudo'); // 'tudo' | 'empresa' | obraId

  // ===== Filtros (período + origem/obra) =====
  const movsFiltradas = useMemo(() => {
    let lista = todasMovs;
    if (origem === 'empresa') lista = lista.filter(m => !m.obraId);
    else if (origem !== 'tudo') lista = lista.filter(m => m.obraId === origem);
    if (periodo === 'geral') return lista;
    const hoje = new Date();
    const inicio = new Date();
    if (periodo === 'semanal') inicio.setDate(hoje.getDate() - 7);
    else if (periodo === 'mensal') inicio.setMonth(hoje.getMonth() - 1);
    else inicio.setMonth(hoje.getMonth() - 3);
    return lista.filter(m => { const d = parseLocalDate(m.data || m.vencimento); return d && d >= inicio && d <= hoje; });
  }, [todasMovs, periodo, origem]);

  const kpis = useMemo(() => kpisDe(movsFiltradas), [movsFiltradas]);
  // Projeção sempre sobre a base filtrada por ORIGEM (período não corta futuro)
  const baseOrigem = useMemo(() => {
    if (origem === 'empresa') return todasMovs.filter(m => !m.obraId);
    if (origem !== 'tudo') return todasMovs.filter(m => m.obraId === origem);
    return todasMovs;
  }, [todasMovs, origem]);
  const saldoMinimo = Number(metas?.saldoMinimo) || 50000;
  const futuro = useMemo(() => futuroDe(baseOrigem, saldoMinimo), [baseOrigem, saldoMinimo]);

  // Top categorias de DESPESA do período
  const categorias = useMemo(() => {
    const m = {};
    movsFiltradas.filter(x => x.tipo === 'despesa').forEach(x => { const c = x.categoria || 'Outros'; m[c] = (m[c] || 0) + (x.valor || 0); });
    const arr = Object.entries(m).map(([name, valor]) => ({ name, valor: Math.round(valor) })).sort((a, b) => b.valor - a.valor);
    const top = arr.slice(0, 6); const resto = arr.slice(6).reduce((s, x) => s + x.valor, 0);
    if (resto > 0) top.push({ name: 'Outros', valor: resto });
    return top;
  }, [movsFiltradas]);

  const obrasComMov = useMemo(() => {
    const ids = [...new Set(todasMovs.map(m => m.obraId).filter(Boolean))];
    const arr = ids.map(id => ({ id, nome: obrasMap[id] || id })).sort((a, b) => a.nome.localeCompare(b.nome));
    // Labels ÚNICOS nos chips: obras com prefixo igual (ex.: 4× "TEMEC - QUADRO
    // MAS…") truncavam idênticas. Quando o prefixo colide, mantém o começo e
    // acrescenta o FINAL do nome, que é a parte distintiva.
    const prefixo = (s) => String(s).slice(0, 18);
    const colisoes = {};
    arr.forEach(o => { const p = prefixo(o.nome); colisoes[p] = (colisoes[p] || 0) + 1; });
    return arr.map(o => {
      const nome = String(o.nome);
      if (nome.length <= 18) return { ...o, label: nome };
      if (colisoes[prefixo(nome)] > 1) return { ...o, label: nome.slice(0, 10).trimEnd() + '…' + nome.slice(-8).trimStart() };
      return { ...o, label: nome.slice(0, 17).trimEnd() + '…' };
    });
  }, [todasMovs, obrasMap]);

  const ultimos = useMemo(() => movsFiltradas.slice(0, 8), [movsFiltradas]);

  // ===== Aging de recebíveis (pendentes da ORIGEM, sem corte de período) =====
  // Quanto mais velho o título vencido, menor a chance de receber sem ação.
  const aging = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const pend = baseOrigem.filter(m => m.tipo === 'receita' && !ehPago(m));
    const b = {
      aVencer: { v: 0, n: 0 }, d30: { v: 0, n: 0 }, d60: { v: 0, n: 0 }, d60p: { v: 0, n: 0 },
    };
    for (const m of pend) {
      const d = parseLocalDate(m.vencimento && m.vencimento !== '-' ? m.vencimento : m.data);
      const atraso = d ? Math.round((hoje - d) / 86400000) : 0;
      const slot = (!d || atraso <= 0) ? b.aVencer : atraso <= 30 ? b.d30 : atraso <= 60 ? b.d60 : b.d60p;
      slot.v += m.valor || 0; slot.n += 1;
    }
    return { ...b, total: pend.reduce((s, m) => s + (m.valor || 0), 0), vencido: b.d30.v + b.d60.v + b.d60p.v };
  }, [baseOrigem]);

  // ===== Burn rate fixo mensal (EMPRESA: despesas sem obra, média 3 meses) =====
  // É o custo de manter a porta aberta — a margem mínima que as obras
  // precisam gerar por mês para a empresa empatar. Sempre da empresa
  // inteira (independe do filtro de origem).
  const burn = useMemo(() => {
    const hoje = new Date();
    const meses = [];
    for (let i = 3; i >= 1; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const fixas = todasMovs.filter(m => m.tipo === 'despesa' && !m.obraId);
    const porMes = meses.map(ym => fixas.filter(m => String(m.data || m.vencimento || '').slice(0, 7) === ym).reduce((s, m) => s + (m.valor || 0), 0));
    const comDado = porMes.filter(v => v > 0);
    const media = comDado.length ? comDado.reduce((a, b2) => a + b2, 0) / comDado.length : 0;
    return { media, nMeses: comDado.length };
  }, [todasMovs]);

  return (
    <MobileLayout title="Painel Global" back>
      <div className="px-4 pt-4 pb-1">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Financeiro geral da empresa</div>
        <div className="text-xl font-bold mt-0.5 flex items-center gap-2"><Landmark className="w-5 h-5 text-amber-400" /> Painel Financeiro Global</div>
        <div className="text-[11px] text-slate-400 mt-1">
          Caixa consolidado (fábrica + obras + lançamentos do painel). Para o financeiro de UMA obra, use <Link to="/m/financeiro" className="text-amber-400 font-bold">Financeiro da Obra</Link>.
        </div>
      </div>

      {/* Filtros: período + origem */}
      <div className="px-4 mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {PERIODOS.map(p => (
          <button key={p.key} onClick={() => setPeriodo(p.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition ${periodo === p.key ? 'bg-amber-500/20 border-amber-500/60 text-amber-300' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="px-4 mt-2 flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setOrigem('tudo')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition ${origem === 'tudo' ? 'bg-blue-500/20 border-blue-500/60 text-blue-300' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
          Empresa inteira
        </button>
        <button onClick={() => setOrigem('empresa')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition ${origem === 'empresa' ? 'bg-blue-500/20 border-blue-500/60 text-blue-300' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
          Sem obra (fábrica/adm)
        </button>
        {obrasComMov.map(o => (
          <button key={o.id} onClick={() => setOrigem(o.id)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition ${origem === o.id ? 'bg-blue-500/20 border-blue-500/60 text-blue-300' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* KPIs do período */}
      <div className="px-4 grid grid-cols-2 gap-2.5 mt-3">
        <Kpi icon={TrendingUp} label="Receitas" value={fmtMoney(kpis.totR)} sub={`${fmtShort(kpis.recRecebidas)} recebido · ${fmtShort(kpis.recPendentes)} pendente`} tone="green" />
        <Kpi icon={TrendingDown} label="Despesas" value={fmtMoney(kpis.totD)} sub={`${fmtShort(kpis.despPagas)} pago · ${fmtShort(kpis.despPendentes)} pendente`} tone="red" />
        {/* Lucro = base COMPARÁVEL (recebido x pago). Receitas futuras x
            despesas só lançadas inflava o resultado — previsto vai separado. */}
        <Kpi icon={Wallet} label="Resultado (realizado)" value={fmtMoney(kpis.recRecebidas - kpis.despPagas)}
          sub={`Margem ${kpis.recRecebidas > 0 ? (((kpis.recRecebidas - kpis.despPagas) / kpis.recRecebidas) * 100).toFixed(1) : '0.0'}% s/ recebido`}
          tone={(kpis.recRecebidas - kpis.despPagas) >= 0 ? 'green' : 'red'} />
        <Kpi icon={PiggyBank} label="Previsto (c/ pendências)" value={fmtMoney(kpis.lucro)}
          sub={`+${fmtShort(kpis.recPendentes)} a receber · −${fmtShort(kpis.despPendentes)} a pagar`}
          tone="blue" />
      </div>

      {/* Projeção 30/60/90 */}
      <div className="px-4 grid grid-cols-3 gap-2 mt-2.5">
        {[['30d', futuro.saldo30, futuro.receber30, futuro.pagar30], ['60d', futuro.saldo60, futuro.receber60, futuro.pagar60], ['90d', futuro.saldo90, futuro.receber90, futuro.pagar90]].map(([l, s, r, p]) => (
          <div key={l} className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 text-center">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Saldo {l}</div>
            <div className={`text-sm font-black mt-0.5 ${s >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtShort(s)}</div>
            <div className="text-[9px] text-slate-500 mt-0.5">+{fmtShort(r)} / −{fmtShort(p)}</div>
          </div>
        ))}
      </div>

      {/* Alerta saldo mínimo */}
      {futuro.semanasCriticas > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="text-[11px] text-red-200/90">
            <b>{futuro.semanasCriticas} semana(s)</b> com saldo acumulado abaixo do mínimo ({fmtMoney(saldoMinimo)}) nas próximas 13 semanas.
          </div>
        </div>
      )}

      {/* Aging de recebíveis */}
      {aging.total > 0 && (<>
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-4 mt-5 mb-2 flex items-center gap-1.5">
          <Hourglass className="w-3 h-3" /> Aging de recebíveis (pendentes)
        </div>
        <div className="px-4 grid grid-cols-4 gap-1.5">
          {[
            ['A vencer', aging.aVencer, 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10'],
            ['1–30d', aging.d30, 'text-amber-300 border-amber-500/25 bg-amber-500/10'],
            ['31–60d', aging.d60, 'text-orange-300 border-orange-500/30 bg-orange-500/10'],
            ['60+d', aging.d60p, 'text-red-300 border-red-500/30 bg-red-500/10'],
          ].map(([l, b, cls]) => (
            <div key={l} className={`border rounded-xl p-2 text-center ${cls}`}>
              <div className="text-[9px] uppercase tracking-wide font-bold opacity-80">{l}</div>
              <div className="text-[13px] font-black mt-0.5">{fmtShort(b.v)}</div>
              <div className="text-[9px] opacity-70">{b.n} título(s)</div>
            </div>
          ))}
        </div>
        {aging.vencido > 0 && (
          <div className="px-5 mt-1.5 text-[10px] text-slate-500">
            {fmtMoney(aging.vencido)} já vencidos — priorizar cobrança dos mais antigos.
          </div>
        )}
      </>)}

      {/* Burn rate fixo mensal */}
      {burn.media > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Burn fixo mensal (fábrica/adm)</div>
            <div className="text-lg font-black text-orange-300 leading-tight">{fmtMoney(burn.media)}</div>
            <div className="text-[10px] text-slate-400">
              Média de {burn.nMeses} mês(es) sem obra — é a margem mínima que as obras precisam gerar/mês p/ empatar.
            </div>
          </div>
        </div>
      )}

      {/* 13 semanas — saldo acumulado */}
      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-4 mt-5 mb-2">Próximas 13 semanas (pendências)</div>
      <div className="mx-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-3">
        <ResponsiveContainer width="100%" height={190}>
          <ComposedChart data={futuro.semanas} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={fmtShort} axisLine={false} tickLine={false} width={42} />
            <Tooltip cursor={{ fill: '#ffffff08' }} content={<DarkTooltip fmt={fmtMoney} />} />
            <Bar dataKey="receitas" name="A receber" fill="#22c55e" radius={[2, 2, 0, 0]} barSize={8} />
            <Bar dataKey="despesas" name="A pagar" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={8} />
            <Line dataKey="saldoAcumulado" name="Saldo acumulado" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-3 text-[10px] text-slate-400 mt-1">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> A receber</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> A pagar</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-amber-500" /> Saldo acum.</span>
        </div>
      </div>

      {/* Top categorias de despesa */}
      {categorias.length > 0 && (<>
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-4 mt-5 mb-2">Despesas por categoria</div>
        <div className="mx-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-3 flex items-center">
          <ResponsiveContainer width="45%" height={150}>
            <PieChart>
              <Pie data={categorias} dataKey="valor" nameKey="name" cx="50%" cy="50%" innerRadius={34} outerRadius={58} paddingAngle={2} stroke="none">
                {categorias.map((e, i) => <Cell key={i} fill={CAT_CORES[i % CAT_CORES.length]} />)}
              </Pie>
              <Tooltip content={<DarkTooltip fmt={fmtMoney} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1.5">
            {categorias.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CAT_CORES[i % CAT_CORES.length] }} />
                <span className="text-slate-300 flex-1 truncate">{c.name}</span>
                <span className="text-slate-100 font-semibold">{fmtShort(c.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      </>)}

      {/* Últimos movimentos */}
      {ultimos.length > 0 && (<>
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-4 mt-5 mb-2">Últimos movimentos</div>
        <div className="mx-4 bg-slate-900/70 border border-slate-800 rounded-2xl divide-y divide-slate-800">
          {ultimos.map(m => (
            <div key={m.ovKey || m.id} className="px-3.5 py-2.5 flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${m.tipo === 'receita' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate">{m.descricao}</div>
                <div className="text-[10px] text-slate-400 truncate">{m.origemLabel} · {m.categoria}{ehPago(m) ? '' : ' · pendente'}</div>
              </div>
              <span className={`text-[13px] font-black ${m.tipo === 'receita' ? 'text-emerald-300' : 'text-red-300'}`}>
                {m.tipo === 'receita' ? '+' : '−'}{fmtShort(m.valor)}
              </span>
            </div>
          ))}
        </div>
      </>)}

      {/* Painel desktop completo */}
      <div className="px-4 mt-5">
        <Link to="/m/painel-global-desktop" className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl active:scale-[.99] transition">
          <div>
            <div className="text-sm font-semibold">Painel completo (edição)</div>
            <div className="text-[11px] text-slate-400">Lançar/editar movimentos — versão desktop</div>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-400" />
        </Link>
      </div>

      <div className="h-6" />
    </MobileLayout>
  );
}
