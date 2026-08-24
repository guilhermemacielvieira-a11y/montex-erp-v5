// ============================================
// MONTEX FINANCEIRO PREMIUM — Módulo Financeiro Executivo
// ============================================
// Painel 100% financeiro: KPIs, metas dinâmicas, DRE, fluxo de
// caixa histórico + PROJEÇÃO 3 meses, custos por categoria e
// centro de custo, margem/custo por kg e análises automáticas.
// Fonte: useFinancialIntelligence (receitas reais, despesas,
// metas dinâmicas, forecast sazonal).
// ============================================

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, Target, Wallet, Flame, PieChart as PieIcon,
  BarChart3, Sparkles, Lightbulb, ArrowUpRight, ArrowDownRight, AlertTriangle,
  CheckCircle2, Percent, Landmark, Layers, Gauge, Receipt, Scale,
} from 'lucide-react';
import {
  Area, Line, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, ReferenceLine, PieChart, Pie,
} from 'recharts';
import { useFinancialIntelligence } from '../hooks/useFinancialIntelligence';

// ============================================
// HELPERS
// ============================================
const fmtR$ = (v) => v == null || isNaN(v) ? 'R$ —' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
const fmtR$k = (v) => v == null || isNaN(v) ? '—' : Math.abs(v) >= 1e6 ? 'R$ ' + (v / 1e6).toFixed(2) + 'M' : 'R$ ' + (v / 1000).toFixed(0) + 'k';
const fmtPct = (v) => v == null || isNaN(v) ? '—' : `${v.toFixed(1)}%`;
const fmtNum = (v) => v == null || isNaN(v) ? '—' : Math.round(v).toLocaleString('pt-BR');

// ============================================
// COMPONENTS
// ============================================
function PremiumCard({ children, className = '', gradient, title, subtitle, icon: Icon, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border border-white/10 backdrop-blur-2xl overflow-hidden ${className}`}
      style={{ background: gradient || 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95))', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
      {(title || subtitle) && (
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-white/5">
          <div>
            {title && <div className="flex items-center gap-2">{Icon && <Icon className="h-4 w-4 text-white/60" />}<h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3></div>}
            {subtitle && <p className="text-[10px] text-slate-500 mt-0.5 tracking-wide">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

function ExecKPI({ label, value, change, sub, gradient, icon: Icon, accent = '#a78bfa', changeInvert = false }) {
  const good = change == null ? null : (changeInvert ? change <= 0 : change >= 0);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="relative rounded-2xl border border-white/10 p-5 overflow-hidden group hover:border-white/20 transition-all"
      style={{ background: gradient || 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95))' }}>
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 group-hover:opacity-20 transition-opacity" style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] text-white/50 uppercase tracking-widest font-medium">{label}</p>
          {Icon && <Icon className="h-4 w-4" style={{ color: accent }} />}
        </div>
        <p className="text-3xl font-black text-white tracking-tight tabular-nums leading-none">{value}</p>
        {sub && <p className="text-[11px] text-white/40 mt-2">{sub}</p>}
        {change != null && (
          <div className={`flex items-center gap-1 mt-3 text-xs font-semibold ${good ? 'text-emerald-400' : 'text-rose-400'}`}>
            {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
            <span className="text-white/30 font-normal">vs mês anterior</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Barra de meta (meta × realizado)
function MetaBar({ label, real, meta, progresso, fmtValue = fmtR$k, color = '#a78bfa', invert = false, desc }) {
  const pct = Math.min(100, Math.max(0, progresso || 0));
  // invert (despesa): abaixo da meta é bom (verde); acima é ruim
  const ok = invert ? (real <= meta) : (progresso >= 100);
  const barColor = ok ? '#10b981' : progresso >= 70 ? color : '#f59e0b';
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/60 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-bold tabular-nums" style={{ color: barColor }}>{Math.round(progresso || 0)}%</span>
      </div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-lg font-black text-white tabular-nums">{fmtValue(real)}</span>
        <span className="text-[10px] text-white/40">meta {fmtValue(meta)}</span>
      </div>
      <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }}
          className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${barColor}, ${barColor}aa)`, boxShadow: `0 0 8px ${barColor}80` }} />
      </div>
      {desc && <p className="text-[9px] text-white/30 mt-1.5">{desc}</p>}
    </div>
  );
}

function InsightCard({ tipo, titulo, descricao, impacto, confianca }) {
  const sev = /alerta|exced|acima|negativ|risco/i.test(`${tipo} ${titulo}`) ? 'crit' : /oportun|positiv|abaixo|econom/i.test(`${tipo} ${titulo}`) ? 'pos' : 'info';
  const S = {
    crit: { b: 'border-rose-500/30', bg: 'from-rose-500/10 to-red-500/5', t: 'text-rose-300', dot: 'bg-rose-400' },
    pos: { b: 'border-emerald-500/30', bg: 'from-emerald-500/10 to-green-500/5', t: 'text-emerald-300', dot: 'bg-emerald-400' },
    info: { b: 'border-blue-500/30', bg: 'from-blue-500/10 to-cyan-500/5', t: 'text-blue-300', dot: 'bg-blue-400' },
  }[sev];
  const Icon = sev === 'crit' ? AlertTriangle : sev === 'pos' ? TrendingUp : Lightbulb;
  return (
    <div className={`relative rounded-xl border ${S.b} bg-gradient-to-br ${S.bg} p-3 backdrop-blur-sm`}>
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-lg bg-white/5"><Icon className={`h-3.5 w-3.5 ${S.t}`} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`w-1 h-1 rounded-full ${S.dot} animate-pulse`} />
            <span className={`text-[9px] font-bold uppercase tracking-widest ${S.t}`}>{tipo || 'Insight'}</span>
            {impacto && <span className="text-[8px] text-white/30 uppercase">· impacto {impacto}</span>}
          </div>
          <p className="text-xs text-white font-medium leading-snug">{titulo}</p>
          {descricao && <p className="text-[10px] text-white/50 mt-1 leading-relaxed line-clamp-3">{descricao}</p>}
          {confianca != null && <p className={`text-[9px] mt-1 ${S.t}`}>confiança {Math.round(confianca)}%</p>}
        </div>
      </div>
    </div>
  );
}

const tooltipStyle = { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' };

// ============================================
// MAIN
// ============================================
export default function DashboardPremium() {
  const fi = useFinancialIntelligence();
  const k = fi.kpisGerais || {};
  const metas = fi.metas || {};

  // ===== KPIs do mês =====
  const receitaMes = k.faturamentoRealMes || 0;
  const despesaMes = k.despesaMensalMedia || 0;
  const saldoMes = fi.saldoReal ?? (receitaMes - despesaMes);
  const margem = fi.margemReal ?? (receitaMes > 0 ? (saldoMes / receitaMes) * 100 : 0);

  // ===== MoM real (a partir de evolucaoMensal — comparativo do hook não existe) =====
  const mom = useMemo(() => {
    const ev = fi.evolucaoMensal || [];
    const cur = ev[ev.length - 1] || {};
    const prev = ev[ev.length - 2] || {};
    const d = (a, b) => (b ? ((a - b) / Math.abs(b)) * 100 : 0);
    const recC = cur.faturamentoTotal || 0, recP = prev.faturamentoTotal || 0;
    const desC = cur.custo || 0, desP = prev.custo || 0;
    const lucC = recC - desC, lucP = recP - desP;
    return {
      receita: { atual: recC, ant: recP, delta: d(recC, recP) },
      despesa: { atual: desC, ant: desP, delta: d(desC, desP) },
      lucro: { atual: lucC, ant: lucP, delta: d(lucC, lucP) },
    };
  }, [fi]);

  // ===== Série: histórico + PROJEÇÃO 3 meses (linha contínua, sem mês duplicado) =====
  const serieProjecao = useMemo(() => {
    const ev = (fi.evolucaoMensal || []).slice(-6).map((m) => ({
      mes: m.mesLabel, receita: m.faturamentoTotal || 0, despesa: m.custo || 0,
      resultado: (m.faturamentoTotal || 0) - (m.custo || 0),
    }));
    const fc = (fi.forecast3meses || []).map((f) => ({
      mes: f.mes, receitaProj: f.faturamentoProjetado || 0, despesaProj: f.custoProjetado || 0,
      resultadoProj: (f.faturamentoProjetado || 0) - (f.custoProjetado || 0),
    }));
    // início da projeção = última linha real (mantém a linha tracejada contínua)
    if (ev.length && fc.length) {
      const last = ev[ev.length - 1];
      last.receitaProj = last.receita; last.despesaProj = last.despesa; last.resultadoProj = last.resultado;
    }
    return [...ev, ...fc];
  }, [fi]);

  const projecoes = fi.forecast3meses || [];
  const custosCategoria = (fi.custosPorCategoria || []).slice(0, 8);
  const custosCentro = (fi.custosPorCentro || []);
  const sugestoes = (fi.sugestoes || []).slice(0, 6);

  // ===== DRE =====
  const dre = { receita: receitaMes, custos: despesaMes, ebitda: saldoMes, margem };

  // ===== Margem & custo/kg (trend) =====
  const trendMargem = useMemo(() => (fi.evolucaoMensal || []).slice(-6).map((m) => ({
    mes: m.mesLabel, margem: Number((m.margem || 0).toFixed(1)), custoPerKg: Number((m.custoPerKg || 0).toFixed(2)),
  })), [fi]);

  // Projeção agregada (resultado projetado total 3 meses)
  const projResultado = projecoes.reduce((s, f) => s + ((f.faturamentoProjetado || 0) - (f.custoProjetado || 0)), 0);
  const projReceita = projecoes.reduce((s, f) => s + (f.faturamentoProjetado || 0), 0);

  return (
    <div className="space-y-5 min-h-screen -m-4 p-5"
      style={{ background: 'radial-gradient(ellipse at top right, rgba(16,185,129,0.12) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(59,130,246,0.10) 0%, transparent 50%), #050510' }}>

      {/* ============ HERO ============ */}
      <div className="grid grid-cols-12 gap-4">
        <PremiumCard className="col-span-12 lg:col-span-8" gradient="linear-gradient(135deg, rgba(16,185,129,0.18), rgba(59,130,246,0.10) 50%, rgba(15,23,42,0.95))">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-[10px] text-emerald-300/70 uppercase tracking-[0.3em] font-bold mb-1">Financeiro Executivo</p>
              <h1 className="text-3xl font-black text-white tracking-tight">Painel Financeiro</h1>
              <p className="text-sm text-white/50 mt-1">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Resultado do mês</p>
                <p className="text-4xl font-black tabular-nums" style={{ color: saldoMes >= 0 ? '#10b981' : '#ef4444' }}>{fmtR$k(saldoMes)}</p>
                <p className="text-xs font-bold tracking-widest" style={{ color: saldoMes >= 0 ? '#10b981' : '#ef4444' }}>MARGEM {fmtPct(margem)}</p>
              </div>
              <div className="w-px h-20 bg-white/10" />
              <div className="grid grid-cols-2 gap-2 w-56">
                <div className="text-center bg-white/5 rounded-lg py-1.5"><p className="text-[9px] text-white/40 uppercase">Receita</p><p className="text-sm font-bold text-emerald-300 tabular-nums">{fmtR$k(receitaMes)}</p></div>
                <div className="text-center bg-white/5 rounded-lg py-1.5"><p className="text-[9px] text-white/40 uppercase">Despesa</p><p className="text-sm font-bold text-rose-300 tabular-nums">{fmtR$k(despesaMes)}</p></div>
                <div className="text-center bg-white/5 rounded-lg py-1.5"><p className="text-[9px] text-white/40 uppercase">Proj. 3M</p><p className="text-sm font-bold text-cyan-300 tabular-nums">{fmtR$k(projResultado)}</p></div>
                <div className="text-center bg-white/5 rounded-lg py-1.5"><p className="text-[9px] text-white/40 uppercase">Meta mês</p><p className="text-sm font-bold text-violet-300 tabular-nums">{fmtR$k(k.faturamentoMetaMensal || 0)}</p></div>
              </div>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="col-span-12 lg:col-span-4" title="Metas do Mês" subtitle="produção · faturamento" icon={Target}>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Produção (kg)</span>
              <span className="text-orange-300 font-bold tabular-nums">{fmtNum(k.producaoMensalKg)} / {fmtNum(k.metaTotalMensalKg)}</span>
            </div>
            <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: `${Math.min(100, k.percentProducaoVsMeta || 0)}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-white/60">Faturamento</span>
              <span className="text-emerald-300 font-bold tabular-nums">{fmtR$k(k.faturamentoTotalMes)} / {fmtR$k(k.faturamentoMetaMensal)}</span>
            </div>
            <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400" style={{ width: `${Math.min(100, k.faturamentoMetaMensal > 0 ? (k.faturamentoTotalMes / k.faturamentoMetaMensal) * 100 : 0)}%` }} />
            </div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex items-center justify-between text-[11px]"><span className="text-white/50">Preço produção</span><span className="text-white/80 tabular-nums">{fmtR$(k.precoProducaoKg)}/kg</span></div>
            <div className="flex items-center justify-between text-[11px]"><span className="text-white/50">Custo produção</span><span className="text-amber-300 tabular-nums">{fmtR$((fi.custoProducaoPerKg) || 0)}/kg</span></div>
          </div>
        </PremiumCard>
      </div>

      {/* ============ KPIs ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ExecKPI label="Faturamento Mês" value={fmtR$k(receitaMes)} sub={`meta din. ${fmtR$k(k.metaReceitaDinamica || 0)} · ${fmtPct(k.progressoMetaReceita || 0)}`} accent="#10b981" icon={DollarSign} change={mom.receita.delta}
        gradient="linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,46,22,0.95))" />
        <ExecKPI label="Despesa Mês" value={fmtR$k(despesaMes)} sub={`meta din. ${fmtR$k(k.metaDespesaDinamica || 0)}`} accent="#ef4444" icon={Flame} change={mom.despesa.delta} changeInvert
        gradient="linear-gradient(135deg, rgba(239,68,68,0.12), rgba(60,11,11,0.95))" />
        <ExecKPI label="Resultado (EBITDA)" value={fmtR$k(saldoMes)} sub={`margem ${fmtPct(margem)}`} accent="#3b82f6" icon={TrendingUp} change={mom.lucro.delta}
        gradient="linear-gradient(135deg, rgba(59,130,246,0.12), rgba(15,30,60,0.95))" />
        <ExecKPI label="Margem Operacional" value={fmtPct(margem)} sub={`meta ${fmtPct(metas.margemReal?.meta || 25)}`} accent="#a855f7" icon={Percent}
        gradient="linear-gradient(135deg, rgba(168,85,247,0.12), rgba(40,15,60,0.95))" />
      </div>

      {/* ============ FLUXO DE CAIXA: HISTÓRICO + PROJEÇÃO ============ */}
      <PremiumCard title="Fluxo de Caixa — Histórico & Projeção" subtitle="receita × despesa × resultado · projeção sazonal 3 meses" icon={BarChart3}
        action={<span className="text-[9px] text-cyan-300/70 uppercase tracking-widest">proj. 3M: {fmtR$k(projReceita)} rec · {fmtR$k(projResultado)} result.</span>}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={serieProjecao}>
            <defs>
              <linearGradient id="recA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
              <linearGradient id="projA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} /><stop offset="100%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="mes" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtR$(v)} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '10px' }} />
            <Area type="monotone" dataKey="receita" name="Receita" stroke="#10b981" fill="url(#recA)" strokeWidth={2} connectNulls={false} />
            <Bar dataKey="despesa" name="Despesa" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={16} />
            <Line type="monotone" dataKey="resultado" name="Resultado" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3, fill: '#a855f7' }} connectNulls={false} />
            <Area type="monotone" dataKey="receitaProj" name="Receita (proj.)" stroke="#06b6d4" fill="url(#projA)" strokeWidth={2} strokeDasharray="5 4" connectNulls />
            <Line type="monotone" dataKey="despesaProj" name="Despesa (proj.)" stroke="#fb7185" strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
            <Line type="monotone" dataKey="resultadoProj" name="Resultado (proj.)" stroke="#c084fc" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: '#c084fc' }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </PremiumCard>

      {/* ============ METAS DINÂMICAS + PROJEÇÃO 3M ============ */}
      <div className="grid grid-cols-12 gap-4">
        <PremiumCard className="col-span-12 lg:col-span-7" title="Metas Dinâmicas" subtitle="baseadas no histórico real (média 3M ajustada)" icon={Gauge}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MetaBar label="Receita" real={metas.receitaReal?.real} meta={metas.receitaReal?.meta} progresso={metas.receitaReal?.progresso} color="#10b981" desc={metas.receitaReal?.descricao} />
            <MetaBar label="Despesa" real={metas.despesaReal?.real} meta={metas.despesaReal?.meta} progresso={metas.despesaReal?.progresso} color="#ef4444" invert desc={metas.despesaReal?.descricao} />
            <MetaBar label="Saldo" real={metas.saldoReal?.real} meta={metas.saldoReal?.meta} progresso={metas.saldoReal?.progresso} color="#3b82f6" desc={metas.saldoReal?.descricao} />
            <MetaBar label="Margem" real={metas.margemReal?.real} meta={metas.margemReal?.meta} progresso={metas.margemReal?.progresso} color="#a855f7" fmtValue={fmtPct} desc={metas.margemReal?.descricao} />
          </div>
        </PremiumCard>

        <PremiumCard className="col-span-12 lg:col-span-5" title="Projeção 3 Meses" subtitle="forecast sazonal + tendência" icon={TrendingUp}>
          {projecoes.length === 0 ? (
            <p className="text-center text-white/40 text-xs italic py-8">Histórico insuficiente para projeção (mín. 3 meses)</p>
          ) : (
            <div className="space-y-2">
              {projecoes.map((f, i) => {
                const result = (f.faturamentoProjetado || 0) - (f.custoProjetado || 0);
                const tCor = f.tendencia === 'alta' ? '#10b981' : f.tendencia === 'baixa' ? '#ef4444' : '#64748b';
                return (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-white">{f.mes}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ background: `${tCor}20`, color: tCor }}>{f.tendencia}</span>
                        <span className="text-[9px] text-white/40">conf. {Math.round((f.confianca || 0) * 100)}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><p className="text-[8px] text-white/40 uppercase">Receita</p><p className="text-xs font-bold text-emerald-300 tabular-nums">{fmtR$k(f.faturamentoProjetado)}</p></div>
                      <div><p className="text-[8px] text-white/40 uppercase">Custo</p><p className="text-xs font-bold text-rose-300 tabular-nums">{fmtR$k(f.custoProjetado)}</p></div>
                      <div><p className="text-[8px] text-white/40 uppercase">Resultado</p><p className="text-xs font-bold tabular-nums" style={{ color: result >= 0 ? '#3b82f6' : '#ef4444' }}>{fmtR$k(result)}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PremiumCard>
      </div>

      {/* ============ DRE + CUSTOS POR CATEGORIA ============ */}
      <div className="grid grid-cols-12 gap-4">
        <PremiumCard className="col-span-12 lg:col-span-5" title="DRE do Mês" subtitle="demonstrativo do resultado" icon={Receipt}>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-emerald-400" /><span className="text-sm text-emerald-300 font-medium">Receita Bruta</span></div>
              <span className="text-lg font-black text-emerald-300 tabular-nums">{fmtR$(dre.receita)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
              <div className="flex items-center gap-2"><ArrowDownRight className="h-4 w-4 text-rose-400" /><span className="text-sm text-rose-300 font-medium">(−) Custos & Despesas</span></div>
              <span className="text-lg font-black text-rose-300 tabular-nums">{fmtR$(-dre.custos)}</span>
            </div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border-2 border-blue-500/30">
              <div className="flex items-center gap-2"><Scale className="h-4 w-4 text-blue-400" /><span className="text-sm text-blue-300 font-bold">Resultado (EBITDA)</span></div>
              <div className="text-right"><p className="text-xl font-black tabular-nums" style={{ color: dre.ebitda >= 0 ? '#60a5fa' : '#ef4444' }}>{fmtR$(dre.ebitda)}</p><p className="text-[10px] text-blue-400/70 font-bold">Margem {fmtPct(dre.margem)}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-white/5 rounded-lg p-2 text-center"><p className="text-[9px] text-white/40 uppercase">Despesa RH</p><p className="text-sm font-bold text-white tabular-nums">{fmtR$k(k.despesasRH || 0)}</p></div>
              <div className="bg-white/5 rounded-lg p-2 text-center"><p className="text-[9px] text-white/40 uppercase">Custo/kg geral</p><p className="text-sm font-bold text-amber-300 tabular-nums">{fmtR$(fi.custoPerKgGeral || 0)}</p></div>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="col-span-12 lg:col-span-7" title="Custos por Categoria" subtitle="composição das despesas do mês" icon={Layers}>
          {custosCategoria.length === 0 ? (
            <p className="text-center text-white/40 text-xs italic py-8">Sem despesas no período</p>
          ) : (
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-5">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={custosCategoria} dataKey="valor" nameKey="nome" innerRadius={45} outerRadius={80} paddingAngle={2}>
                      {custosCategoria.map((c, i) => <Cell key={i} fill={c.cor || '#94a3b8'} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtR$(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="col-span-7 space-y-1.5">
                {custosCategoria.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.cor || '#94a3b8' }} />
                    <span className="text-white/80 flex-1 truncate capitalize">{c.nome}</span>
                    {c.variacao_mom != null && Math.abs(c.variacao_mom) >= 1 && (
                      <span className={`text-[9px] ${c.variacao_mom > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{c.variacao_mom > 0 ? '▲' : '▼'}{Math.abs(c.variacao_mom).toFixed(0)}%</span>
                    )}
                    <span className="text-white/40 tabular-nums w-8 text-right">{(c.percentual || 0).toFixed(0)}%</span>
                    <span className="text-white font-bold tabular-nums w-14 text-right">{fmtR$k(c.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </PremiumCard>
      </div>

      {/* ============ CENTROS DE CUSTO + MARGEM TREND ============ */}
      <div className="grid grid-cols-12 gap-4">
        <PremiumCard className="col-span-12 lg:col-span-6" title="Centros de Custo" subtitle="gasto × orçamento · utilização" icon={Landmark}>
          {custosCentro.length === 0 ? (
            <p className="text-center text-white/40 text-xs italic py-8">Sem centros de custo configurados</p>
          ) : (
            <div className="space-y-3">
              {custosCentro.map((c, i) => {
                const util = c.utilizacao != null ? c.utilizacao : (c.orcamento > 0 ? (c.gastoTotal / c.orcamento) * 100 : 0);
                const cor = util > 100 ? '#ef4444' : util > 85 ? '#f59e0b' : '#10b981';
                return (
                  <div key={c.id || i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/80 truncate">{c.nome}{c.qtdFuncionarios ? ` · ${c.qtdFuncionarios} func` : ''}</span>
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: cor }}>{fmtR$k(c.gastoTotal)} / {fmtR$k(c.orcamento)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, util)}%`, background: `linear-gradient(90deg, ${cor}, ${cor}aa)`, boxShadow: `0 0 6px ${cor}70` }} />
                    </div>
                    <p className="text-[9px] text-right mt-0.5" style={{ color: cor }}>{Math.round(util)}% do orçamento</p>
                  </div>
                );
              })}
            </div>
          )}
        </PremiumCard>

        <PremiumCard className="col-span-12 lg:col-span-6" title="Margem & Custo por kg" subtitle="evolução 6 meses" icon={PieIcon}>
          {trendMargem.length === 0 ? (
            <p className="text-center text-white/40 text-xs italic py-8">Sem histórico</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={trendMargem}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" stroke="#64748b" fontSize={10} />
                <YAxis yAxisId="l" stroke="#a855f7" fontSize={9} tickFormatter={(v) => `${v}%`} />
                <YAxis yAxisId="r" orientation="right" stroke="#f59e0b" fontSize={9} tickFormatter={(v) => `R$${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => n === 'Margem' ? `${v}%` : fmtR$(v)} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '10px' }} />
                <ReferenceLine yAxisId="l" y={25} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'meta 25%', position: 'right', fill: '#10b981', fontSize: 9 }} />
                <Bar yAxisId="l" dataKey="margem" name="Margem" radius={[3, 3, 0, 0]} barSize={22}>
                  {trendMargem.map((m, i) => <Cell key={i} fill={m.margem >= 25 ? '#10b981' : m.margem >= 0 ? '#a855f7' : '#ef4444'} />)}
                </Bar>
                <Line yAxisId="r" type="monotone" dataKey="custoPerKg" name="Custo/kg" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b' }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </PremiumCard>
      </div>

      {/* ============ ANÁLISES AUTOMÁTICAS ============ */}
      <PremiumCard title="Análises Financeiras" subtitle="detecção automática de riscos e oportunidades" icon={Sparkles}
        action={<span className="text-[9px] text-emerald-300/70 uppercase tracking-widest">{sugestoes.length} análises</span>}>
        {sugestoes.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs text-emerald-300 font-bold">Nenhum alerta financeiro — indicadores dentro do esperado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sugestoes.map((s, i) => <InsightCard key={s.id || i} {...s} />)}
          </div>
        )}
      </PremiumCard>

      {/* ============ MONTH-OVER-MONTH ============ */}
      <PremiumCard title="Month-over-Month" subtitle="mês atual × anterior (dados reais)" icon={Wallet}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Receita', d: mom.receita, invert: false, color: '#10b981' },
            { label: 'Despesa', d: mom.despesa, invert: true, color: '#ef4444' },
            { label: 'Resultado', d: mom.lucro, invert: false, color: '#3b82f6' },
          ].map((m, i) => {
            const good = m.invert ? m.d.delta <= 0 : m.d.delta >= 0;
            return (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2">{m.label}</p>
                <p className="text-2xl font-black text-white tabular-nums mb-1">{fmtR$k(m.d.atual)}</p>
                <p className="text-[11px] text-white/40">anterior: {fmtR$k(m.d.ant)}</p>
                <div className={`flex items-center gap-1 mt-3 text-xs font-bold ${good ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {m.d.delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  <span>{m.d.delta >= 0 ? '+' : ''}{m.d.delta.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </PremiumCard>

      {/* Footer */}
      <div className="text-center text-[10px] text-white/30 pt-2">
        MONTEX ERP V5 · Módulo Financeiro Executivo · Receitas reais · Metas dinâmicas · Projeção sazonal
      </div>
    </div>
  );
}
