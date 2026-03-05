// MONTEX ERP - Command Center ULTRAWIDE v5
// Dashboard futurista para monitor ultrawide 49" com dados em tempo real
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, RadialBarChart, RadialBar, Treemap
} from 'recharts';
import {
  ArrowUp, ArrowDown, AlertTriangle, Bell, CheckCircle, Cpu, RefreshCw,
  Clock, Building2, Weight, Package, DollarSign, Factory, Truck, Users,
  TrendingUp, Wallet, Receipt, Activity, Flame, Droplets, Wind, Zap, Timer
} from 'lucide-react';
import { useCommandCenter } from '../hooks/useCommandCenter';
import { useObras, useEstoque, useProducao } from '../contexts/ERPContext';

// ═══════════════ DESIGN TOKENS ═══════════════
const C = {
  bg: '#030712', bgAlt: '#0a0f1e',
  card: 'rgba(6,12,30,0.8)', border: 'rgba(56,189,248,0.08)',
  accent: '#38bdf8', neon: '#22d3ee',
  success: '#34d399', warning: '#fbbf24', danger: '#f87171',
  purple: '#a78bfa', pink: '#f472b6',
  text: '#e2e8f0', muted: '#64748b', dim: '#334155',
  // Stage colors
  corte: '#fbbf24', fabricacao: '#38bdf8', solda: '#a78bfa',
  pintura: '#22d3ee', expedicao: '#34d399', entregue: '#f472b6',
};

const STAGES = [
  { key: 'corte', label: 'Corte', color: C.corte, icon: Zap },
  { key: 'fabricacao', label: 'Fabricação', color: C.fabricacao, icon: Factory },
  { key: 'solda', label: 'Solda', color: C.solda, icon: Flame },
  { key: 'pintura', label: 'Pintura', color: C.pintura, icon: Droplets },
  { key: 'expedicao', label: 'Expedição', color: C.expedicao, icon: Truck },
];

// ═══════════════ FORMATTERS ═══════════════
const fmtCurrency = (v) => {
  if (!v && v !== 0) return 'R$ 0';
  if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
};
const fmtWeight = (kg) => kg ? `${(kg / 1000).toFixed(1)}t` : '0t';
const fmtNum = (n) => (n || 0).toLocaleString('pt-BR');

// ═══════════════ GLASS CARD ═══════════════
const Glass = ({ children, className = '', glow, style = {} }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
    className={`rounded-xl backdrop-blur-xl border transition-all duration-300 overflow-hidden ${className}`}
    style={{
      background: 'linear-gradient(135deg, rgba(6,12,30,0.85), rgba(15,23,42,0.6))',
      borderColor: glow || C.border,
      boxShadow: glow ? `0 0 20px ${glow}30, inset 0 1px 0 ${glow}10` : `inset 0 1px 0 rgba(255,255,255,0.03)`,
      ...style,
    }}
  >
    {children}
  </motion.div>
);

// ═══════════════ TOOLTIP ═══════════════
const GlassTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="backdrop-blur-xl rounded-lg p-3 text-xs border"
      style={{ background: 'rgba(3,7,18,0.95)', borderColor: 'rgba(56,189,248,0.2)', boxShadow: '0 0 20px rgba(56,189,248,0.15)' }}>
      {label && <p className="text-slate-500 mb-1 text-[10px]">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4">
          <span style={{ color: p.color || p.fill }}>{p.name}:</span>
          <span className="font-bold text-white">{typeof p.value === 'number' ? fmtNum(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ═══════════════ MAIN COMPONENT ═══════════════
export default function CommandCenterUltrawide() {
  const { obraAtual, obraAtualData, obras = [] } = useObras() || {};
  const [modoAnalise, setModoAnalise] = useState('obra'); // 'obra' | 'geral'
  const obraIdParaHook = modoAnalise === 'geral' ? '__all__' : obraAtual;
  const {
    corte = {}, producao = {}, historico = {}, estoque = {}, financeiro = {}, campo = {},
    loading, lastUpdate, comparacaoDiaria, refresh
  } = useCommandCenter(obraIdParaHook) || {};

  const [time, setTime] = useState(new Date());
  const [colonBlink, setColonBlink] = useState(true);

  useEffect(() => {
    const t1 = setInterval(() => setTime(new Date()), 1000);
    const t2 = setInterval(() => setColonBlink(v => !v), 500);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  // ═══ COMPUTED DATA ═══
  const comp = useMemo(() => {
    try { return (typeof comparacaoDiaria === 'function' ? comparacaoDiaria() : comparacaoDiaria) || {}; } catch { return {}; }
  }, [comparacaoDiaria]);

  const valorContrato = modoAnalise === 'geral'
    ? obras.reduce((s, o) => s + (parseFloat(o.contrato_valor_total) || parseFloat(o.valorContrato) || parseFloat(o.valor_contrato) || 0), 0)
    : (obraAtualData?.valorContrato || obraAtualData?.valor_contrato || obraAtualData?.contrato_valor_total || 0);
  const faturamento = financeiro?.totalMedicoes || 0;
  const despesas = financeiro?.totalDespesas || 0;
  const saldo = valorContrato - despesas;
  const pesoTotal = (corte?.pesoTotal || 0) + (producao?.pesoTotal || 0);

  // Production stages data
  const stageData = useMemo(() => [
    { name: 'Corte', value: corte?.cortando || 0, total: corte?.total || 0, color: C.corte },
    { name: 'Fabricação', value: producao?.fabricacao || 0, color: C.fabricacao },
    { name: 'Solda', value: producao?.solda || 0, color: C.solda },
    { name: 'Pintura', value: producao?.pintura || 0, color: C.pintura },
    { name: 'Expedição', value: producao?.expedicao || 0, color: C.expedicao },
    { name: 'Entregue', value: producao?.entregue || 0, color: C.entregue },
  ], [corte, producao]);

  // Financial chart
  const finChart = useMemo(() => [
    { name: 'Contrato', valor: valorContrato, fill: C.accent },
    { name: 'Faturado', valor: faturamento, fill: C.success },
    { name: 'Despesas', valor: despesas, fill: C.danger },
    { name: 'Saldo', valor: Math.max(saldo, 0), fill: saldo >= 0 ? C.purple : C.danger },
  ], [valorContrato, faturamento, despesas, saldo]);

  // Workers - production
  const prodWorkers = useMemo(() => {
    const histFunc = historico?.porFuncionario || {};
    const prodFunc = producao?.porFuncionario || {};
    const src = Object.keys(histFunc).length > 0 ? histFunc : prodFunc;
    return Object.entries(src)
      .map(([nome, d]) => ({ nome, ...d }))
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 8);
  }, [producao?.porFuncionario, historico?.porFuncionario]);

  // Workers - corte
  const corteWorkers = useMemo(() => {
    return Object.entries(corte?.porFuncionario || {})
      .map(([nome, d]) => ({ nome, ...d }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 8);
  }, [corte?.porFuncionario]);

  // Peças por setor
  const pecasSetor = useMemo(() => {
    const ps = producao?.porSetor || {};
    return [
      { key: 'fabricacao', label: 'Fabricação', color: C.fabricacao },
      { key: 'solda', label: 'Solda', color: C.solda },
      { key: 'pintura', label: 'Pintura', color: C.pintura },
      { key: 'expedicao', label: 'Pronta Envio', color: C.expedicao },
    ].map(s => ({ ...s, count: (ps[s.key] || []).length, pecas: (ps[s.key] || []).slice(0, 6) }))
    .filter(s => s.count > 0);
  }, [producao?.porSetor]);

  // Treemap data
  const treemapData = useMemo(() => {
    return pecasSetor.map(s => ({ name: s.label, size: s.count, color: s.color }));
  }, [pecasSetor]);

  // Envios
  const envios = useMemo(() => campo?.enviosDetalhados || [], [campo?.enviosDetalhados]);

  // Radar data (based on real metrics)
  const radarData = useMemo(() => {
    const corteProg = corte?.progressoPecas || 0;
    const prodProg = producao?.progressoGeral || 0;
    const expRate = campo?.totalEnvios > 0 ? Math.round((campo?.entregues / campo?.totalEnvios) * 100) : 0;
    const estoqueHealth = estoque?.totalItens > 0 ? Math.round(((estoque?.normal || 0) / estoque.totalItens) * 100) : 0;
    const finHealth = valorContrato > 0 ? Math.min(Math.round((faturamento / valorContrato) * 100), 100) : 0;
    return [
      { metric: 'Corte', value: corteProg },
      { metric: 'Produção', value: prodProg },
      { metric: 'Expedição', value: expRate },
      { metric: 'Estoque', value: estoqueHealth },
      { metric: 'Financeiro', value: finHealth },
    ];
  }, [corte, producao, campo, estoque, valorContrato, faturamento]);

  // Estoque radial
  const estoqueRadial = useMemo(() => [
    { name: 'Normal', value: estoque?.normal || 0, fill: C.success },
    { name: 'Baixo', value: estoque?.baixo || 0, fill: C.warning },
    { name: 'Crítico', value: estoque?.critico || 0, fill: C.danger },
  ], [estoque]);

  // Alerts
  const alertas = useMemo(() => {
    const list = [];
    if ((estoque?.critico || 0) > 0) list.push({ type: 'critical', msg: `${estoque.critico} itens em estoque crítico`, color: C.danger, icon: AlertTriangle });
    if ((estoque?.baixo || 0) > 0) list.push({ type: 'warning', msg: `${estoque.baixo} itens com estoque baixo`, color: C.warning, icon: Bell });
    if (saldo < 0) list.push({ type: 'critical', msg: `Saldo negativo: ${fmtCurrency(saldo)}`, color: C.danger, icon: AlertTriangle });
    if ((financeiro?.despesasPendentes || 0) > 0) list.push({ type: 'warning', msg: `${fmtCurrency(financeiro.despesasPendentes)} pendentes`, color: C.warning, icon: Receipt });
    if ((corte?.aguardando || 0) > 5) list.push({ type: 'info', msg: `${corte.aguardando} peças aguardando corte`, color: C.accent, icon: Timer });
    if (list.length === 0) list.push({ type: 'info', msg: 'Todos os sistemas operacionais', color: C.success, icon: CheckCircle });
    return list;
  }, [estoque, financeiro, corte, saldo]);

  // Recent activity from historico
  const recentActivity = useMemo(() => {
    const movs = historico?.movHoje || historico?.movimentacoes?.slice(0, 8) || [];
    return movs.slice(0, 8).map(m => ({
      id: m.id,
      func: m.funcionario_nome || 'Sistema',
      de: m.etapa_de || '-',
      para: m.etapa_para || '-',
      time: m.created_at ? new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-',
    }));
  }, [historico]);

  // Time display
  const h = String(time.getHours()).padStart(2, '0');
  const m = String(time.getMinutes()).padStart(2, '0');
  const s = String(time.getSeconds()).padStart(2, '0');
  const colon = colonBlink ? ':' : ' ';

  // ═══════════════ RENDER ═══════════════
  return (
    <div className="w-screen min-h-screen overflow-auto" style={{ background: C.bg, color: C.text }}>
      {/* ANIMATED GRID BACKGROUND */}
      <style>{`
        @keyframes gridPulse { 0%,100%{opacity:0.3} 50%{opacity:0.6} }
        @keyframes scanline { 0%{top:-2px} 100%{top:100%} }
        .bg-grid {
          background-image: linear-gradient(rgba(56,189,248,0.03) 1px,transparent 1px), linear-gradient(90deg,rgba(56,189,248,0.03) 1px,transparent 1px);
          background-size: 60px 60px;
        }
        .scan-line { position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,rgba(56,189,248,0.4),transparent); animation:scanline 6s linear infinite; pointer-events:none; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${C.accent}40; border-radius:4px; }
      `}</style>
      <div className="bg-grid fixed inset-0 pointer-events-none" />

      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: 'rgba(3,7,18,0.85)', borderColor: C.border }}>
        <div className="scan-line" />
        <div className="flex items-center justify-between px-8 h-16">
          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg" style={{ background: `${C.accent}15`, boxShadow: `0 0 15px ${C.accent}40` }}>
              <Factory size={24} style={{ color: C.accent }} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-[0.3em] text-sky-300">COMMAND CENTER</h1>
              <div className="flex items-center gap-2">
                <span className="text-[9px] tracking-[0.2em] px-2 py-0.5 rounded border font-bold"
                  style={{ color: C.neon, borderColor: `${C.neon}40`, background: `${C.neon}10`, boxShadow: `0 0 8px ${C.neon}30` }}>
                  ULTRAWIDE 49"
                </span>
                {loading && (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <RefreshCw size={10} style={{ color: C.accent }} />
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Center: Clock */}
          <div className="flex items-center gap-3 px-6 py-2 rounded-lg border" style={{ background: `${C.accent}05`, borderColor: `${C.accent}15`, fontFamily: 'monospace' }}>
            <span className="text-2xl font-bold text-sky-300 tracking-tight">{h}{colon}{m}{colon}{s}</span>
            <div className="h-8 w-px" style={{ background: C.border }} />
            <span className="text-xs text-sky-400/70">
              {time.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {/* Center-Right: Modo Análise Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg border" style={{ background: 'rgba(6,12,30,0.6)', borderColor: C.border }}>
            <button
              onClick={() => setModoAnalise('obra')}
              className="px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wider transition-all duration-200"
              style={modoAnalise === 'obra' ? { background: `${C.accent}25`, color: C.accent, boxShadow: `0 0 10px ${C.accent}20` } : { color: C.muted }}
            >
              <span className="flex items-center gap-1.5">
                <Building2 size={12} />
                {obraAtualData?.codigo || 'OBRA'}
              </span>
            </button>
            <button
              onClick={() => setModoAnalise('geral')}
              className="px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wider transition-all duration-200"
              style={modoAnalise === 'geral' ? { background: `${C.neon}25`, color: C.neon, boxShadow: `0 0 10px ${C.neon}20` } : { color: C.muted }}
            >
              <span className="flex items-center gap-1.5">
                <Activity size={12} />
                ANÁLISE GERAL
              </span>
            </button>
          </div>

          {/* Right: Status */}
          <div className="flex items-center gap-5">
            {modoAnalise === 'geral' && (
              <span className="text-[10px] px-2 py-0.5 rounded border font-bold" style={{ color: C.neon, borderColor: `${C.neon}30`, background: `${C.neon}08` }}>
                {obras.length} OBRAS
              </span>
            )}
            <div className="flex items-center gap-2">
              <motion.div className="w-2 h-2 rounded-full" animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }} style={{ background: C.success, boxShadow: `0 0 8px ${C.success}` }} />
              <span className="text-[10px] text-slate-500">LIVE</span>
            </div>
            <button onClick={refresh} className="p-2 rounded-lg transition-colors hover:bg-sky-400/10">
              <RefreshCw size={16} style={{ color: C.accent }} />
            </button>
          </div>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="px-6 py-5 space-y-4">

        {/* ═══ ROW 1: KPI CARDS ═══ */}
        <div className="grid grid-cols-4 xl:grid-cols-8 gap-3">
          {[
            { icon: modoAnalise === 'geral' ? Activity : Building2, label: modoAnalise === 'geral' ? 'Análise Geral' : 'Obra Ativa', value: modoAnalise === 'geral' ? `${obras.length} Obras` : (obraAtualData?.codigo || obraAtualData?.nome || '—'), sub: modoAnalise === 'geral' ? obras.map(o => o.codigo || o.nome).join(' • ') : (obraAtualData?.nome || ''), color: modoAnalise === 'geral' ? C.neon : C.accent, isText: true },
            { icon: Weight, label: 'Peso Total', value: fmtWeight(pesoTotal), sub: `Expedido: ${fmtWeight(producao?.pesoExpedido || 0)}`, color: C.warning },
            { icon: Package, label: 'Peças Produção', value: fmtNum(producao?.total || 0), sub: `${producao?.progressoGeral || 0}% progresso`, color: C.neon },
            { icon: DollarSign, label: 'Faturamento', value: fmtCurrency(faturamento), sub: `${financeiro?.numMedicoes || 0} medições`, color: C.success },
            { icon: Receipt, label: 'Despesas', value: fmtCurrency(despesas), sub: `Pend: ${fmtCurrency(financeiro?.despesasPendentes || 0)}`, color: C.danger },
            { icon: Wallet, label: 'Saldo Contrato', value: fmtCurrency(saldo), sub: `Contrato: ${fmtCurrency(valorContrato)}`, color: saldo >= 0 ? C.success : C.danger },
            { icon: Truck, label: 'Expedição', value: fmtNum(campo?.totalEnvios || 0), sub: `${campo?.entregues || 0} entregues`, color: C.purple },
            { icon: AlertTriangle, label: 'Alertas Estoque', value: fmtNum((estoque?.critico || 0) + (estoque?.baixo || 0)), sub: `${estoque?.totalItens || 0} itens total`, color: (estoque?.critico || 0) > 0 ? C.danger : C.warning },
          ].map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }} className="group">
              <Glass className="p-4 h-full hover:border-sky-400/20 cursor-default" glow={null}>
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ background: `linear-gradient(90deg, ${kpi.color}, transparent)` }} />
                <div className="flex items-start justify-between mb-2">
                  <div className="p-1.5 rounded-lg" style={{ background: `${kpi.color}12`, boxShadow: `0 0 10px ${kpi.color}25` }}>
                    <kpi.icon size={16} style={{ color: kpi.color }} />
                  </div>
                </div>
                <div className={`text-xl font-bold ${kpi.isText ? 'text-sky-300' : ''}`}
                  style={kpi.isText ? {} : { background: `linear-gradient(135deg, ${kpi.color}, ${C.text})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {kpi.value}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{kpi.label}</div>
                <div className="text-[9px] text-slate-600 mt-0.5 truncate">{kpi.sub}</div>
              </Glass>
            </motion.div>
          ))}
        </div>

        {/* ═══ ROW 2: FINANCIAL + PIPELINE + STAGES + ACTIVITY ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4" style={{ height: 380 }}>

          {/* Financial Overview */}
          <Glass className="p-5 flex flex-col">
            <h3 className="text-sm font-bold text-sky-300 tracking-wider uppercase mb-3 flex items-center gap-2">
              <DollarSign size={14} /> VISÃO FINANCEIRA
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={finChart} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis type="number" stroke={C.muted} tick={{ fontSize: 9 }} tickFormatter={v => fmtCurrency(v)} />
                  <YAxis dataKey="name" type="category" stroke={C.muted} tick={{ fontSize: 10 }} width={65} />
                  <Tooltip content={<GlassTooltip />} />
                  <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                    {finChart.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { label: 'Pagas', val: fmtCurrency(financeiro?.despesasPagas || 0), color: C.success },
                { label: 'Pendentes', val: fmtCurrency(financeiro?.despesasPendentes || 0), color: C.warning },
                { label: 'Saldo', val: fmtCurrency(saldo), color: saldo >= 0 ? C.success : C.danger },
              ].map((m, i) => (
                <div key={i} className="rounded-lg p-2 border text-center" style={{ background: `${m.color}08`, borderColor: `${m.color}15` }}>
                  <div className="text-[9px] text-slate-500 uppercase">{m.label}</div>
                  <div className="text-xs font-bold" style={{ color: m.color }}>{m.val}</div>
                </div>
              ))}
            </div>
          </Glass>

          {/* Pipeline 3D */}
          <Glass className="p-5 flex flex-col">
            <h3 className="text-sm font-bold text-cyan-300 tracking-wider uppercase mb-3 flex items-center gap-2">
              <Activity size={14} /> PIPELINE DE PRODUÇÃO
            </h3>
            <div className="flex-1 flex items-center justify-center" style={{ perspective: '800px' }}>
              <div className="w-full" style={{ transform: 'rotateX(10deg)' }}>
                <svg viewBox="0 0 600 160" className="w-full">
                  <defs>
                    {STAGES.map(st => (
                      <filter key={st.key} id={`glow-${st.key}`}><feGaussianBlur stdDeviation="4" result="blur" />
                        <feFlood floodColor={st.color} floodOpacity="0.6" /><feComposite in2="blur" operator="in" />
                        <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    ))}
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={C.corte} stopOpacity="0.5" />
                      <stop offset="100%" stopColor={C.expedicao} stopOpacity="0.5" />
                    </linearGradient>
                  </defs>
                  {/* Connection line */}
                  <line x1="80" y1="70" x2="520" y2="70" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="8 4">
                    <animate attributeName="stroke-dashoffset" from="24" to="0" dur="2s" repeatCount="indefinite" />
                  </line>
                  {/* Stage nodes */}
                  {STAGES.map((st, i) => {
                    const x = 80 + i * 110;
                    const count = i === 0 ? (corte?.cortando || 0) :
                      i === 1 ? (producao?.fabricacao || 0) :
                      i === 2 ? (producao?.solda || 0) :
                      i === 3 ? (producao?.pintura || 0) :
                      (producao?.expedicao || 0);
                    const hasItems = count > 0;
                    return (
                      <g key={st.key}>
                        {/* Hex shape */}
                        <polygon
                          points={`${x},40 ${x+25},50 ${x+25},90 ${x},100 ${x-25},90 ${x-25},50`}
                          fill={`${st.color}${hasItems ? '30' : '10'}`}
                          stroke={st.color}
                          strokeWidth={hasItems ? 2 : 1}
                          opacity={hasItems ? 1 : 0.5}
                          filter={hasItems ? `url(#glow-${st.key})` : undefined}
                        />
                        <text x={x} y={78} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{count}</text>
                        <text x={x} y={125} textAnchor="middle" fill={st.color} fontSize="10" fontWeight="600">{st.label}</text>
                        {/* Pulse ring */}
                        {hasItems && (
                          <circle cx={x} cy={70} r="30" fill="none" stroke={st.color} strokeWidth="1" opacity="0.3">
                            <animate attributeName="r" from="30" to="40" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />
                          </circle>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-2">
              <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                <span>Progresso Geral</span>
                <span className="text-sky-400 font-bold">{producao?.progressoGeral || 0}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: `${C.dim}50` }}>
                <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                  animate={{ width: `${producao?.progressoGeral || 0}%` }}
                  transition={{ duration: 1.5 }}
                  style={{ background: `linear-gradient(90deg, ${C.corte}, ${C.fabricacao}, ${C.solda}, ${C.pintura}, ${C.expedicao})` }} />
              </div>
            </div>
          </Glass>

          {/* Production by Stage Chart */}
          <Glass className="p-5 flex flex-col">
            <h3 className="text-sm font-bold text-amber-300 tracking-wider uppercase mb-3 flex items-center gap-2">
              <TrendingUp size={14} /> PRODUÇÃO POR ESTÁGIO
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" stroke={C.muted} tick={{ fontSize: 9 }} />
                  <YAxis stroke={C.muted} tick={{ fontSize: 9 }} />
                  <Tooltip content={<GlassTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Peças">
                    {stageData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{fmtNum(producao?.total || 0)}</div>
                <div className="text-[9px] text-slate-500">Total Peças</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: C.success }}>{fmtNum((producao?.finalizado || 0) + (producao?.entregue || 0))}</div>
                <div className="text-[9px] text-slate-500">Finalizadas</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: C.warning }}>{fmtWeight(producao?.pesoTotal || 0)}</div>
                <div className="text-[9px] text-slate-500">Peso Total</div>
              </div>
            </div>
          </Glass>

          {/* Activity Feed */}
          <Glass className="p-5 flex flex-col">
            <h3 className="text-sm font-bold text-emerald-300 tracking-wider uppercase mb-3 flex items-center gap-2">
              <Zap size={14} /> ATIVIDADE EM TEMPO REAL
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {recentActivity.length > 0 ? recentActivity.map((act, i) => (
                <motion.div key={act.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-2 rounded-lg border" style={{ background: `${C.accent}05`, borderColor: C.border }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.success, boxShadow: `0 0 6px ${C.success}` }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-300 truncate">
                      <span className="font-semibold">{act.func}</span>
                    </p>
                    <p className="text-[9px] text-slate-500">{act.de} → {act.para}</p>
                  </div>
                  <span className="text-[9px] text-slate-600 font-mono">{act.time}</span>
                </motion.div>
              )) : (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">
                  Aguardando movimentações...
                </div>
              )}
            </div>
            <div className="mt-2 pt-2 border-t flex justify-between text-[9px] text-slate-600" style={{ borderColor: C.border }}>
              <span>Movimentações hoje: {historico?.totalHoje || 0}</span>
              <span className="text-sky-400">{corte?.cortadasHoje || 0} cortadas hoje</span>
            </div>
          </Glass>
        </div>

        {/* ═══ ROW 3: RADAR + TREEMAP + EXPEDICAO + ESTOQUE ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4" style={{ height: 360 }}>

          {/* Workforce Radar */}
          <Glass className="p-5 flex flex-col">
            <h3 className="text-sm font-bold text-purple-300 tracking-wider uppercase mb-3 flex items-center gap-2">
              <Users size={14} /> DESEMPENHO OPERACIONAL
            </h3>
            <div className="flex-1 min-h-0" style={{ maxHeight: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 5, right: 25, bottom: 5, left: 25 }}>
                  <PolarGrid stroke={C.border} />
                  <PolarAngleAxis dataKey="metric" stroke={C.muted} tick={{ fontSize: 9, fill: C.muted }} />
                  <PolarRadiusAxis stroke={C.border} tick={{ fontSize: 8 }} domain={[0, 100]} />
                  <Radar name="Real" dataKey="value" stroke={C.neon} fill={C.neon} fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-3 mt-1 flex-wrap justify-center">
              {radarData.map((r, i) => (
                <span key={i} className="text-[9px] text-slate-500">{r.metric}: <span className="text-white font-bold">{r.value}%</span></span>
              ))}
            </div>
          </Glass>

          {/* Peças por Setor */}
          <Glass className="p-5 flex flex-col">
            <h3 className="text-sm font-bold text-sky-300 tracking-wider uppercase mb-3 flex items-center gap-2">
              <Package size={14} /> PEÇAS POR SETOR
            </h3>
            {pecasSetor.length > 0 ? (
              <div className="flex-1 min-h-0 space-y-2 overflow-y-auto">
                {pecasSetor.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                        <span className="text-[11px] font-semibold text-slate-300">{s.label}</span>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: s.color }}>{s.count} peças</span>
                    </div>
                    <div className="h-5 rounded-lg overflow-hidden relative" style={{ background: `${C.dim}30` }}>
                      <motion.div className="h-full rounded-lg" initial={{ width: 0 }}
                        animate={{ width: `${Math.min((s.count / Math.max(...pecasSetor.map(x => x.count), 1)) * 100, 100)}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        style={{ background: `linear-gradient(90deg, ${s.color}80, ${s.color})` }} />
                      <div className="absolute inset-0 flex items-center px-2">
                        <div className="flex gap-1 overflow-hidden">
                          {s.pecas.slice(0, 4).map((p, j) => (
                            <span key={j} className="text-[7px] px-1 py-0 rounded whitespace-nowrap"
                              style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>
                              {p.nome || p.marca || '-'}
                            </span>
                          ))}
                          {s.count > 4 && <span className="text-[7px] text-white/60">+{s.count - 4}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">Sem dados</div>
            )}
          </Glass>

          {/* Expedição */}
          <Glass className="p-5 flex flex-col">
            <h3 className="text-sm font-bold text-pink-300 tracking-wider uppercase mb-3 flex items-center gap-2">
              <Truck size={14} /> EXPEDIÇÃO
            </h3>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: 'Total', val: campo?.totalEnvios || 0, color: C.accent },
                { label: 'Entregues', val: campo?.entregues || 0, color: C.success },
                { label: 'Trânsito', val: campo?.emTransito || 0, color: C.warning },
                { label: 'Pendentes', val: campo?.pendentes || 0, color: C.danger },
              ].map((s, i) => (
                <div key={i} className="text-center rounded-lg p-2 border" style={{ background: `${s.color}08`, borderColor: `${s.color}15` }}>
                  <div className="text-lg font-bold" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-[8px] text-slate-500 uppercase">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {envios.length > 0 ? envios.slice(0, 6).map((e, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg border text-[10px]" style={{ background: `${C.accent}03`, borderColor: C.border }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: e.status === 'ENTREGUE' ? C.success : e.status === 'EM_TRANSITO' ? C.warning : C.accent }} />
                  <span className="font-semibold text-slate-300 w-16 truncate">{e.numero}</span>
                  <span className="text-slate-500 flex-1 truncate">{e.destino}</span>
                  <span className="text-slate-600">{e.peso.toFixed(1)}t</span>
                </div>
              )) : (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">Sem envios</div>
              )}
            </div>
          </Glass>

          {/* Estoque Status */}
          <Glass className="p-5 flex flex-col">
            <h3 className="text-sm font-bold text-cyan-300 tracking-wider uppercase mb-3 flex items-center gap-2">
              <Package size={14} /> STATUS DE ESTOQUE
            </h3>
            <div className="flex-1 flex items-center justify-center min-h-0">
              <div className="relative" style={{ width: 160, height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart data={estoqueRadial} innerRadius="55%" outerRadius="90%" startAngle={90} endAngle={450}>
                    <RadialBar background dataKey="value" cornerRadius={8}>
                      {estoqueRadial.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </RadialBar>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white">{estoque?.totalItens || 0}</span>
                  <span className="text-[9px] text-slate-500">TOTAL</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              {estoqueRadial.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.fill }} />
                  <span className="text-[10px] text-slate-400 flex-1">{s.name}</span>
                  <span className="text-[10px] font-bold text-white">{s.value}</span>
                  <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: `${C.dim}50` }}>
                    <div className="h-full rounded-full" style={{ width: `${(estoque?.totalItens || 1) > 0 ? (s.value / (estoque?.totalItens || 1)) * 100 : 0}%`, background: s.fill }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t flex justify-between text-[9px] text-slate-600" style={{ borderColor: C.border }}>
              <span>Valor: {fmtCurrency(estoque?.valorTotal || 0)}</span>
              <span>Entradas hoje: {estoque?.entradasHoje || 0}</span>
            </div>
          </Glass>
        </div>

        {/* ═══ ROW 4: WORKERS + ALERTS ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ height: 320 }}>

          {/* Produção por Funcionário */}
          <Glass className="p-5 flex flex-col lg:col-span-2">
            <h3 className="text-sm font-bold text-emerald-300 tracking-wider uppercase mb-3 flex items-center gap-2">
              <Users size={14} /> PRODUÇÃO POR FUNCIONÁRIO
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {prodWorkers.length > 0 ? prodWorkers.map((w, i) => {
                const max = prodWorkers[0]?.total || 1;
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                          style={{ background: `${C.accent}20`, color: C.accent }}>{i + 1}</div>
                        <span className="font-medium text-slate-300 truncate max-w-[140px]">{w.nome}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {w.fabricacao > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${C.fabricacao}15`, color: C.fabricacao }}>Fab {w.fabricacao}</span>}
                        {w.solda > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${C.solda}15`, color: C.solda }}>Sol {w.solda}</span>}
                        {w.pintura > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${C.pintura}15`, color: C.pintura }}>Pin {w.pintura}</span>}
                        {w.expedicao > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${C.expedicao}15`, color: C.expedicao }}>Exp {w.expedicao}</span>}
                        <span className="font-bold text-white min-w-[30px] text-right">{w.total}</span>
                      </div>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: `${C.dim}40` }}>
                      <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                        animate={{ width: `${(w.total / max) * 100}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05 }}
                        style={{ background: `linear-gradient(90deg, ${C.accent}, ${C.neon})` }} />
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">Sem dados de produção</div>
              )}
            </div>
          </Glass>

          {/* Corte por Funcionário */}
          <Glass className="p-5 flex flex-col lg:col-span-2">
            <h3 className="text-sm font-bold text-amber-300 tracking-wider uppercase mb-3 flex items-center gap-2">
              <Zap size={14} /> CORTE POR FUNCIONÁRIO
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {corteWorkers.length > 0 ? corteWorkers.map((w, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="p-2.5 rounded-lg border" style={{ background: `${C.corte}05`, borderColor: `${C.corte}10` }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-semibold text-slate-300">{w.nome}</span>
                    <span className="text-xs font-bold" style={{ color: C.corte }}>{w.qtd} peças</span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-slate-500">
                    <span>Peso: {(w.peso / 1000).toFixed(2)}t</span>
                    {w.maquinas?.length > 0 && <span>Máq: {w.maquinas.join(', ')}</span>}
                  </div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {(w.pecas || []).slice(0, 4).map((p, j) => (
                      <span key={j} className="text-[8px] px-1.5 py-0.5 rounded border" style={{ borderColor: `${C.corte}20`, color: C.corte, background: `${C.corte}08` }}>
                        {typeof p === 'string' ? p : (p.peca || p.marca || '-')}
                      </span>
                    ))}
                    {(w.pecas || []).length > 4 && (
                      <span className="text-[8px] text-slate-600">+{w.pecas.length - 4}</span>
                    )}
                  </div>
                </motion.div>
              )) : (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">Sem dados de corte</div>
              )}
            </div>
          </Glass>

          {/* Alerts & System */}
          <Glass className="p-5 flex flex-col lg:col-span-1">
            <h3 className="text-sm font-bold text-red-300 tracking-wider uppercase mb-3 flex items-center gap-2">
              <AlertTriangle size={14} /> ALERTAS
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {alertas.map((a, i) => {
                const Icon = a.icon;
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2 p-2.5 rounded-lg border-l-2" style={{ background: `${a.color}06`, borderLeftColor: a.color }}>
                    <Icon size={12} style={{ color: a.color, marginTop: 2, flexShrink: 0 }} />
                    <span className="text-[10px] text-slate-300 leading-tight">{a.msg}</span>
                  </motion.div>
                );
              })}
            </div>
            {/* System Status */}
            <div className="mt-3 pt-3 space-y-2 border-t" style={{ borderColor: C.border }}>
              <div className="flex items-center gap-2 text-[10px]">
                <motion.div className="w-1.5 h-1.5 rounded-full" animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }} style={{ background: C.success, boxShadow: `0 0 6px ${C.success}` }} />
                <span className="text-slate-500">Supabase Conectado</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <motion.div className="w-1.5 h-1.5 rounded-full" animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }} style={{ background: C.success, boxShadow: `0 0 6px ${C.success}` }} />
                <span className="text-slate-500">Tempo Real Ativo</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <Clock size={10} style={{ color: C.muted }} />
                <span className="text-slate-500">Sync: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString('pt-BR') : '—'}</span>
              </div>
            </div>
          </Glass>
        </div>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t px-8 py-2 flex items-center justify-between text-[10px] text-slate-600" style={{ borderColor: C.border, background: 'rgba(3,7,18,0.9)' }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.success, boxShadow: `0 0 4px ${C.success}` }} />
            <span>Supabase</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.success, boxShadow: `0 0 4px ${C.success}` }} />
            <span>Realtime</span>
          </div>
          <span>Última sync: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString('pt-BR') : '—'}</span>
        </div>
        <span className="text-sky-400 font-bold tracking-wider">MONTEX ERP v5 — ULTRAWIDE</span>
      </footer>
    </div>
  );
}
