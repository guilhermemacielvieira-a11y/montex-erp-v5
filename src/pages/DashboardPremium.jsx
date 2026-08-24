// ============================================
// MONTEX FINANCEIRO PREMIUM — baseado no Painel Financeiro Global
// ============================================
// Módulo financeiro executivo que consome a MESMA fonte do Painel Financeiro
// Global (useFinanceiroGlobal): despesas de fábrica + medições + receitas
// manuais + movimentos/overrides/metas do bundle. Os números batem 1:1 com o
// Painel. Mostra KPIs, metas do mês, fluxo de caixa, projeção de recebimentos,
// DRE, custos por categoria, top fornecedores e comparativo MoM.
// ============================================

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, Wallet, Flame, PieChart as PieIcon, BarChart3, Building2,
  ArrowUpRight, ArrowDownRight, Receipt, Scale, Percent, Gauge, Target, Truck, CalendarClock,
} from 'lucide-react';
import {
  Area, Line, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, ReferenceLine, PieChart, Pie,
} from 'recharts';
import { useFinanceiroGlobal } from '../hooks/useFinanceiroGlobal';

// ============================================
// HELPERS
// ============================================
const fmtR$ = (v) => v == null || isNaN(v) ? 'R$ —' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
const fmtR$k = (v) => v == null || isNaN(v) ? '—' : Math.abs(v) >= 1e6 ? 'R$ ' + (v / 1e6).toFixed(2) + 'M' : 'R$ ' + (v / 1000).toFixed(0) + 'k';
const fmtPct = (v) => v == null || isNaN(v) ? '—' : `${v.toFixed(1)}%`;

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

function MetaBar({ label, real, meta, fmtValue = fmtR$k, color = '#a78bfa', invert = false, desc }) {
  const progresso = meta > 0 ? (real / meta) * 100 : 0;
  const pct = Math.min(100, Math.max(0, progresso));
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
        <span className="text-[10px] text-white/40">{invert ? 'teto' : 'meta'} {fmtValue(meta)}</span>
      </div>
      <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }}
          className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${barColor}, ${barColor}aa)`, boxShadow: `0 0 8px ${barColor}80` }} />
      </div>
      {desc && <p className="text-[9px] text-white/30 mt-1.5">{desc}</p>}
    </div>
  );
}

const tooltipStyle = { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' };

// ============================================
// MAIN
// ============================================
export default function DashboardPremium() {
  const fg = useFinanceiroGlobal();
  const k = fg.kpis;
  const mr = fg.metasReal;
  const metas = fg.metas;
  const comp = fg.comparativo;

  const receitaMes = mr.receitaMes;
  const despesaMes = mr.despesaMes;
  const saldoMes = mr.saldoMes;
  const margem = mr.margemReal;

  // Projeção de recebimentos (próximos 3 meses)
  const proj3M = useMemo(() => (fg.forecast.meses || []).slice(0, 3).reduce((s, m) => s + (m.forecast || 0), 0), [fg.forecast]);

  // Business score financeiro (margem × meta receita × saldo positivo)
  const score = useMemo(() => {
    const fMargem = Math.max(0, Math.min(100, (margem / (metas.margemMinima || 25)) * 100));
    const fReceita = Math.max(0, Math.min(100, metas.receitaMinimaMensal > 0 ? (receitaMes / metas.receitaMinimaMensal) * 100 : 0));
    const fDespesa = metas.despesaTetoMensal > 0 ? Math.max(0, Math.min(100, (1 - Math.max(0, despesaMes - metas.despesaTetoMensal) / metas.despesaTetoMensal) * 100)) : 100;
    const fSaldo = saldoMes >= (metas.saldoMinimo || 0) ? 100 : saldoMes >= 0 ? 60 : 20;
    return {
      total: Math.round(fMargem * 0.3 + fReceita * 0.3 + fDespesa * 0.2 + fSaldo * 0.2),
      margem: Math.round(fMargem), receita: Math.round(fReceita), despesa: Math.round(fDespesa), saldo: Math.round(fSaldo),
    };
  }, [margem, receitaMes, despesaMes, saldoMes, metas]);
  const scoreLabel = score.total >= 80 ? 'EXCEPCIONAL' : score.total >= 60 ? 'SAUDÁVEL' : score.total >= 40 ? 'CAUTELA' : 'CRÍTICO';
  const scoreColor = score.total >= 80 ? '#10b981' : score.total >= 60 ? '#3b82f6' : score.total >= 40 ? '#f59e0b' : '#ef4444';

  const cashFlow = useMemo(() => (fg.evolucaoMensal || []).slice(-8).map((m) => ({ mes: m.mes, receita: m.receitas, despesa: m.despesas, saldo: m.saldo })), [fg.evolucaoMensal]);
  const custos = (fg.custosPorCategoria || []).slice(0, 8);
  const fornecedores = (fg.topFornecedores || []).slice(0, 7);
  const projecao = fg.forecast.meses || [];

  return (
    <div className="space-y-5 min-h-screen -m-4 p-5"
      style={{ background: 'radial-gradient(ellipse at top right, rgba(16,185,129,0.12) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(59,130,246,0.10) 0%, transparent 50%), #050510' }}>

      {/* ============ HERO ============ */}
      <div className="grid grid-cols-12 gap-4">
        <PremiumCard className="col-span-12 lg:col-span-8" gradient="linear-gradient(135deg, rgba(16,185,129,0.18), rgba(59,130,246,0.10) 50%, rgba(15,23,42,0.95))">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-[10px] text-emerald-300/70 uppercase tracking-[0.3em] font-bold mb-1">Financeiro · Painel Global</p>
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
                <div className="text-center bg-white/5 rounded-lg py-1.5"><p className="text-[9px] text-white/40 uppercase">A receber 3M</p><p className="text-sm font-bold text-cyan-300 tabular-nums">{fmtR$k(proj3M)}</p></div>
                <div className="text-center bg-white/5 rounded-lg py-1.5"><p className="text-[9px] text-white/40 uppercase">Score</p><p className="text-sm font-bold tabular-nums" style={{ color: scoreColor }}>{score.total} · {scoreLabel}</p></div>
              </div>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="col-span-12 lg:col-span-4" title="Saúde Financeira" subtitle="score do mês" icon={Gauge}>
          <div className="flex items-center gap-4">
            <div className="text-center flex-shrink-0">
              <p className="text-5xl font-black tabular-nums" style={{ color: scoreColor }}>{score.total}</p>
              <p className="text-[10px] font-bold tracking-widest" style={{ color: scoreColor }}>{scoreLabel}</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {[['Margem', score.margem, '#a855f7'], ['Receita', score.receita, '#10b981'], ['Despesa', score.despesa, '#ef4444'], ['Saldo', score.saldo, '#06b6d4']].map(([lbl, val, cor]) => (
                <div key={lbl}>
                  <div className="flex justify-between text-[9px] mb-0.5"><span className="text-white/50">{lbl}</span><span className="text-white/70 tabular-nums">{val}</span></div>
                  <div className="h-1 bg-slate-800/60 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${val}%`, background: cor }} /></div>
                </div>
              ))}
            </div>
          </div>
        </PremiumCard>
      </div>

      {/* ============ KPIs ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ExecKPI label="Receita do Mês" value={fmtR$k(receitaMes)} sub={`recebida · meta ${fmtR$k(metas.receitaMinimaMensal)}`} accent="#10b981" icon={DollarSign} change={comp.deltaReceitas}
          gradient="linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,46,22,0.95))" />
        <ExecKPI label="Despesa do Mês" value={fmtR$k(despesaMes)} sub={`teto ${fmtR$k(metas.despesaTetoMensal)}`} accent="#ef4444" icon={Flame} change={comp.deltaDespesas} changeInvert
          gradient="linear-gradient(135deg, rgba(239,68,68,0.12), rgba(60,11,11,0.95))" />
        <ExecKPI label="Resultado" value={fmtR$k(saldoMes)} sub={`margem ${fmtPct(margem)}`} accent="#3b82f6" icon={TrendingUp} change={comp.deltaLucro}
          gradient="linear-gradient(135deg, rgba(59,130,246,0.12), rgba(15,30,60,0.95))" />
        <ExecKPI label="Margem" value={fmtPct(margem)} sub={`meta ${metas.margemMinima}%`} accent="#a855f7" icon={Percent}
          gradient="linear-gradient(135deg, rgba(168,85,247,0.12), rgba(40,15,60,0.95))" />
      </div>

      {/* ============ FLUXO DE CAIXA + PROJEÇÃO ============ */}
      <div className="grid grid-cols-12 gap-4">
        <PremiumCard className="col-span-12 lg:col-span-7" title="Fluxo de Caixa" subtitle="receita × despesa × saldo (histórico do Painel Global)" icon={BarChart3}>
          {cashFlow.length === 0 ? <p className="text-center text-white/40 text-xs italic py-10">Sem movimentações lançadas</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={cashFlow}>
                <defs>
                  <linearGradient id="recA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtR$(v)} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '10px' }} />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="#10b981" fill="url(#recA)" strokeWidth={2} />
                <Bar dataKey="despesa" name="Despesa" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={16} />
                <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3, fill: '#a855f7' }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </PremiumCard>

        <PremiumCard className="col-span-12 lg:col-span-5" title="Projeção de Recebimentos" subtitle="receitas a receber (aprovadas/pendentes) · 6 meses" icon={CalendarClock}
          action={<span className="text-[9px] text-cyan-300/70 uppercase tracking-widest">total {fmtR$k(fg.forecast.totalForecast)}</span>}>
          {(fg.forecast.totalForecast || 0) === 0 ? <p className="text-center text-white/40 text-xs italic py-10">Sem receitas a receber</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={projecao}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtR$(v)} />
                <ReferenceLine y={metas.receitaMinimaMensal} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'meta', position: 'right', fill: '#10b981', fontSize: 9 }} />
                <Bar dataKey="forecast" name="A receber" radius={[4, 4, 0, 0]} barSize={26}>
                  {projecao.map((m, i) => <Cell key={i} fill={m.forecast >= metas.receitaMinimaMensal ? '#10b981' : '#06b6d4'} />)}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </PremiumCard>
      </div>

      {/* ============ METAS DO MÊS + DRE ============ */}
      <div className="grid grid-cols-12 gap-4">
        <PremiumCard className="col-span-12 lg:col-span-7" title="Metas do Mês" subtitle="realizado × meta (config. do Painel Global)" icon={Target}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MetaBar label="Receita" real={receitaMes} meta={metas.receitaMinimaMensal} color="#10b981" desc="Receita recebida no mês" />
            <MetaBar label="Despesa" real={despesaMes} meta={metas.despesaTetoMensal} color="#ef4444" invert desc="Despesas do mês vs teto" />
            <MetaBar label="Saldo" real={saldoMes} meta={metas.saldoMinimo} color="#3b82f6" desc="Receita − despesa" />
            <MetaBar label="Margem" real={margem} meta={metas.margemMinima} color="#a855f7" fmtValue={(v) => `${(v || 0).toFixed(1)}%`} desc="Margem operacional" />
          </div>
        </PremiumCard>

        <PremiumCard className="col-span-12 lg:col-span-5" title="DRE do Mês" subtitle="demonstrativo do resultado" icon={Receipt}>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-emerald-400" /><span className="text-sm text-emerald-300 font-medium">Receita (recebida)</span></div>
              <span className="text-lg font-black text-emerald-300 tabular-nums">{fmtR$(receitaMes)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
              <div className="flex items-center gap-2"><ArrowDownRight className="h-4 w-4 text-rose-400" /><span className="text-sm text-rose-300 font-medium">(−) Despesas</span></div>
              <span className="text-lg font-black text-rose-300 tabular-nums">{fmtR$(-despesaMes)}</span>
            </div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border-2 border-blue-500/30">
              <div className="flex items-center gap-2"><Scale className="h-4 w-4 text-blue-400" /><span className="text-sm text-blue-300 font-bold">Resultado</span></div>
              <div className="text-right"><p className="text-xl font-black tabular-nums" style={{ color: saldoMes >= 0 ? '#60a5fa' : '#ef4444' }}>{fmtR$(saldoMes)}</p><p className="text-[10px] text-blue-400/70 font-bold">Margem {fmtPct(margem)}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-white/5 rounded-lg p-2 text-center"><p className="text-[9px] text-white/40 uppercase">Receita acum.</p><p className="text-sm font-bold text-white tabular-nums">{fmtR$k(k.totR)}</p></div>
              <div className="bg-white/5 rounded-lg p-2 text-center"><p className="text-[9px] text-white/40 uppercase">Despesa acum.</p><p className="text-sm font-bold text-white tabular-nums">{fmtR$k(k.totD)}</p></div>
            </div>
          </div>
        </PremiumCard>
      </div>

      {/* ============ CUSTOS POR CATEGORIA + TOP FORNECEDORES ============ */}
      <div className="grid grid-cols-12 gap-4">
        <PremiumCard className="col-span-12 lg:col-span-6" title="Custos por Categoria" subtitle="composição das despesas" icon={PieIcon}>
          {custos.length === 0 ? <p className="text-center text-white/40 text-xs italic py-8">Sem despesas</p> : (
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-5">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={custos} dataKey="valor" nameKey="nome" innerRadius={45} outerRadius={80} paddingAngle={2}>
                      {custos.map((c, i) => <Cell key={i} fill={c.cor} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtR$(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="col-span-7 space-y-1.5">
                {custos.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.cor }} />
                    <span className="text-white/80 flex-1 truncate">{c.nome}</span>
                    <span className="text-white/40 tabular-nums w-8 text-right">{(c.percentual || 0).toFixed(0)}%</span>
                    <span className="text-white font-bold tabular-nums w-14 text-right">{fmtR$k(c.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </PremiumCard>

        <PremiumCard className="col-span-12 lg:col-span-6" title="Top Fornecedores" subtitle="maiores despesas por fornecedor" icon={Truck}>
          {fornecedores.length === 0 ? <p className="text-center text-white/40 text-xs italic py-8">Sem fornecedores</p> : (
            <div className="space-y-2.5">
              {fornecedores.map((f, i) => {
                const max = fornecedores[0]?.valor || 1;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/80 truncate">{f.nome} <span className="text-white/30">· {f.qtd}x</span></span>
                      <span className="text-xs font-bold text-rose-300 tabular-nums">{fmtR$k(f.valor)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(f.valor / max) * 100}%` }} transition={{ duration: 0.8 }}
                        className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #ef4444, #ef444488)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PremiumCard>
      </div>

      {/* ============ MONTH-OVER-MONTH ============ */}
      <PremiumCard title="Month-over-Month" subtitle="mês atual × anterior (dados reais do Painel Global)" icon={Wallet}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Receita', atual: comp.atual?.receitas || 0, ant: comp.anterior?.receitas || 0, delta: comp.deltaReceitas, invert: false },
            { label: 'Despesa', atual: comp.atual?.despesas || 0, ant: comp.anterior?.despesas || 0, delta: comp.deltaDespesas, invert: true },
            { label: 'Resultado', atual: comp.atual?.lucro || 0, ant: comp.anterior?.lucro || 0, delta: comp.deltaLucro, invert: false },
          ].map((m, i) => {
            const good = m.invert ? m.delta <= 0 : m.delta >= 0;
            return (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2">{m.label}</p>
                <p className="text-2xl font-black text-white tabular-nums mb-1">{fmtR$k(m.atual)}</p>
                <p className="text-[11px] text-white/40">anterior: {fmtR$k(m.ant)}</p>
                <div className={`flex items-center gap-1 mt-3 text-xs font-bold ${good ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {m.delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  <span>{m.delta >= 0 ? '+' : ''}{(m.delta || 0).toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </PremiumCard>

      {/* Footer */}
      <div className="text-center text-[10px] text-white/30 pt-2 flex items-center justify-center gap-2">
        <Building2 className="h-3 w-3" /> MONTEX ERP V5 · Financeiro Executivo · fonte: Painel Financeiro Global (receitas/despesas/metas)
      </div>
    </div>
  );
}
