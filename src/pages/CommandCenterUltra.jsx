// MONTEX ERP Premium - Command Center Ultra v3
// Dashboard executivo com financeiro, produção por setor e funcionário
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend } from 'recharts';
import {
  Minus, ArrowUp, ArrowDown, AlertTriangle, Bell, CheckCircle,
  Cpu, RefreshCw, Clock, Building2, Weight, Package, DollarSign,
  Factory, Layers, Target, Truck, Gauge, Users, Zap, Bolt,
  TrendingUp, Wallet, Receipt, FileText, Calendar, Filter, User
} from 'lucide-react';
import { kpisIndustriais, recursosHumanos, energiaMetricas
} from '../data/commandCenterData';
import { useCommandCenter } from '../hooks/useCommandCenter';
import { useObras, useEstoque, useProducao } from '../contexts/ERPContext';

// ============ DESIGN TOKENS ============
const colors = {
  bg: '#060A14',
  card: 'rgba(12, 20, 38, 0.75)',
  cardHover: 'rgba(15, 25, 48, 0.85)',
  border: 'rgba(56, 72, 100, 0.35)',
  borderHover: 'rgba(80, 100, 140, 0.5)',
  accent: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  purple: '#8B5CF6',
  text: '#F1F5F9',
  muted: '#94A3B8',
  dimmed: '#64748B',
  glow: 'rgba(59,130,246,0.08)',
};

const SETOR_COLORS = {
  fabricacao: '#3B82F6',
  solda: '#8B5CF6',
  pintura: '#06B6D4',
  expedicao: '#10B981',
  corte: '#F59E0B',
};

const SETOR_LABELS = {
  fabricacao: 'Fabricação',
  solda: 'Solda',
  pintura: 'Pintura',
  expedicao: 'Pronta p/ Envio',
  corte: 'Corte',
};

// ============ MICRO COMPONENTS ============

const TrendBadge = ({ value, suffix = '%' }) => {
  if (value === 0 || value === undefined || value === null) return (
    <span className="inline-flex items-center gap-0.5 text-xs text-slate-500 font-medium">
      <Minus size={12} /> 0{suffix}
    </span>
  );
  const isUp = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
      {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
};

const ProgressRing = ({ value = 0, size = 56, strokeWidth = 4, color = '#3B82F6' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`ringGrad-${color.replace('#','')}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={color} stopOpacity={0.5} />
          </linearGradient>
          <filter id={`ringGlow-${color.replace('#','')}`}>
            <feGaussianBlur stdDeviation="2" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(51,65,85,0.3)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={`url(#ringGrad-${color.replace('#','')})`}
          strokeWidth={strokeWidth + 1}
          strokeDasharray={circumference} strokeLinecap="round"
          filter={`url(#ringGlow-${color.replace('#','')})`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white" style={{ textShadow: `0 0 8px ${color}30` }}>{Math.round(value)}%</span>
      </div>
    </div>
  );
};

const MiniBar = ({ value = 0, max = 100, color = '#3B82F6', height = 6 }) => (
  <div className="w-full rounded-full overflow-hidden" style={{
    height,
    background: 'linear-gradient(180deg, rgba(30,41,59,0.6), rgba(51,65,85,0.3))',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
  }}>
    <motion.div
      className="h-full rounded-full"
      style={{
        background: `linear-gradient(180deg, ${color}, ${color}cc)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 0 6px ${color}25`,
      }}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min((value / (max || 1)) * 100, 100)}%` }}
      transition={{ duration: 1, ease: 'easeOut' }}
    />
  </div>
);

const StatCard = ({ icon: Icon, label, value, subtitle, trend, color = '#3B82F6', small }) => (
  <motion.div
    className="relative group cursor-default rounded-xl border backdrop-blur-md overflow-hidden"
    style={{
      background: `linear-gradient(135deg, ${colors.card}, rgba(15,25,48,0.4))`,
      borderColor: colors.border,
      boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)`,
    }}
    whileHover={{ y: -3, borderColor: color, boxShadow: `0 8px 32px ${color}15, inset 0 1px 0 rgba(255,255,255,0.05)` }}
    transition={{ duration: 0.25 }}
  >
    <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: `linear-gradient(90deg, ${color}, ${color}40, transparent)` }} />
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `radial-gradient(ellipse at top left, ${color}08, transparent 70%)` }} />
    <div className={small ? 'p-3 relative' : 'p-4 relative'}>
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 rounded-lg" style={{ background: `${color}12`, boxShadow: `0 0 12px ${color}15` }}>
          <Icon size={small ? 15 : 18} style={{ color }} />
        </div>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      <div className={`${small ? 'text-xl' : 'text-2xl'} font-bold text-white tracking-tight`}>{value}</div>
      <div className="text-[11px] text-slate-400 mt-1 font-medium">{label}</div>
      {subtitle && <div className="text-[10px] text-slate-500 mt-0.5">{subtitle}</div>}
    </div>
  </motion.div>
);

const SectionCard = ({ title, icon: Icon, children, className = '', action }) => (
  <div
    className={`rounded-xl border backdrop-blur-md overflow-hidden ${className}`}
    style={{
      background: `linear-gradient(145deg, ${colors.card}, rgba(8,15,30,0.65))`,
      borderColor: colors.border,
      boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)',
    }}
  >
    <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: colors.border, background: 'rgba(15,23,42,0.3)' }}>
      <div className="flex items-center gap-2.5">
        {Icon && <Icon size={15} className="text-blue-400/70" />}
        <h3 className="text-xs font-bold text-slate-300 tracking-widest uppercase">{title}</h3>
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const StageChip = ({ label, value, color, active }) => (
  <motion.div
    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border transition-all ${active ? '' : 'border-transparent'}`}
    style={{
      background: active ? `linear-gradient(135deg, ${color}12, ${color}05)` : 'rgba(20,30,50,0.4)',
      borderColor: active ? `${color}40` : 'transparent',
      boxShadow: active ? `0 4px 16px ${color}15, inset 0 1px 0 rgba(255,255,255,0.03)` : 'none',
    }}
    whileHover={{ scale: 1.04, boxShadow: `0 6px 20px ${color}20` }}
  >
    <span className="text-xl font-bold text-white">{value}</span>
    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">{label}</span>
  </motion.div>
);

const PeriodFilter = ({ value, onChange }) => (
  <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-0.5">
    {[
      { id: 'dia', label: 'Dia' },
      { id: 'semana', label: 'Semana' },
      { id: 'mes', label: 'Mês' },
    ].map(p => (
      <button
        key={p.id}
        onClick={() => onChange(p.id)}
        className={`text-[10px] font-semibold px-3 py-1.5 rounded-md transition-all ${
          value === p.id
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : 'text-slate-500 hover:text-slate-300 border border-transparent'
        }`}
      >
        {p.label}
      </button>
    ))}
  </div>
);

const AlertItem = ({ type, message, time }) => {
  const cfg = {
    critical: { icon: AlertTriangle, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
    warning: { icon: Bell, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    info: { icon: CheckCircle, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  }[type] || { icon: Bell, color: '#94A3B8', bg: 'rgba(148,163,184,0.08)' };
  const IconComp = cfg.icon;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: cfg.bg }}>
      <IconComp size={14} style={{ color: cfg.color, marginTop: 2, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
        {time && <p className="text-[10px] text-slate-500 mt-1">{time}</p>}
      </div>
    </div>
  );
};

const formatCurrency = (v) => {
  if (v === 0 || !v) return 'R$ 0';
  if (v < 0) return `-R$ ${formatCurrencyAbs(Math.abs(v))}`;
  return `R$ ${formatCurrencyAbs(v)}`;
};
const formatCurrencyAbs = (v) => {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
  return v.toFixed(0);
};
const formatCurrencyFull = (v) => {
  if (!v && v !== 0) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
};

const formatWeight = (kg) => {
  if (!kg) return '0t';
  return `${(kg / 1000).toFixed(1)}t`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border p-3 backdrop-blur-xl" style={{
      background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))',
      borderColor: 'rgba(100,116,139,0.3)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 1px 0 rgba(255,255,255,0.08) inset',
    }}>
      <p className="text-[10px] text-slate-400 mb-1.5 font-medium uppercase tracking-wider">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{
            background: `linear-gradient(135deg, ${p.color || p.fill}, ${p.color || p.fill}88)`,
            boxShadow: `0 0 6px ${p.color || p.fill}40`,
          }} />
          <span className="text-[11px] text-slate-300">{p.name}:</span>
          <span className="text-xs font-bold text-white">{typeof p.value === 'number' && p.value > 999 ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ============ MAIN COMPONENT ============

export default function CommandCenterUltra() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [periodo, setPeriodo] = useState('dia');
  const { obraAtual, obras = [], obraAtualData } = useObras() || {};
  const {
    corte = {}, producao = {}, historico = {}, estoque = {}, financeiro = {}, campo = {},
    loading = false, lastUpdate = new Date(), comparacaoDiaria, refresh
  } = useCommandCenter(obraAtual) || {};
  const { maquinas = [] } = useProducao() || {};
  const { materiaisEstoque = [] } = useEstoque() || {};

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // ============ COMPUTED DATA ============

  const comparacao = useMemo(() => {
    try { return (typeof comparacaoDiaria === 'function' ? comparacaoDiaria() : comparacaoDiaria) || {}; } catch { return {}; }
  }, [comparacaoDiaria]);

  // Apenas a obra ativa atual (SUPER LUNA)
  const obrasAtivas = useMemo(() => obraAtualData ? [obraAtualData] : [], [obraAtualData]);
  const maquinasAtivas = useMemo(() => maquinas?.filter(m => m?.status === 'ativa' || m?.status === 'operando') || [], [maquinas]);

  // Peso total baseado na obra ativa
  const pesoTotalObra = obraAtualData?.pesoTotal || obraAtualData?.peso_total || 0;
  const pesoTotal = pesoTotalObra > 0 ? pesoTotalObra : (corte?.pesoTotal || 0) + (producao?.pesoTotal || 0);
  const pesoExpedido = producao?.pesoExpedido || 0;
  const progressoGeralPeso = pesoTotal > 0 ? (pesoExpedido / pesoTotal) * 100 : 0;

  // FINANCEIRO: Faturamento, Despesas, Saldo Contrato
  const valorContrato = obraAtualData?.valorContrato || obraAtualData?.valor_contrato || 0;
  const faturamentoTotal = financeiro?.totalMedicoes || 0;
  const despesaTotal = financeiro?.totalDespesas || 0;
  const saldoContrato = valorContrato - despesaTotal;

  const producaoStages = useMemo(() => [
    { label: 'Corte', value: corte?.cortando || 0, total: corte?.total || 0, color: '#F59E0B' },
    { label: 'Fabric.', value: producao?.fabricacao || 0, total: producao?.total || 0, color: '#3B82F6' },
    { label: 'Solda', value: producao?.solda || 0, total: producao?.total || 0, color: '#8B5CF6' },
    { label: 'Pintura', value: producao?.pintura || 0, total: producao?.total || 0, color: '#06B6D4' },
    { label: 'Exped.', value: producao?.expedicao || 0, total: producao?.total || 0, color: '#10B981' },
  ], [corte, producao]);

  // Dados para gráfico de barras por setor
  const producaoPorSetorChart = useMemo(() => {
    const porSetor = producao?.porSetor || {};
    return Object.entries(SETOR_LABELS).map(([key, label]) => ({
      setor: label,
      qtd: (porSetor[key] || []).length,
      color: SETOR_COLORS[key],
    }));
  }, [producao?.porSetor]);

  // Dados por funcionário (produção) - do kanban produção
  const producaoPorFuncionario = useMemo(() => {
    // Preferir dados do histórico real se disponíveis
    const histFunc = historico?.porFuncionario || {};
    const prodFunc = producao?.porFuncionario || {};
    const source = Object.keys(histFunc).length > 0 ? histFunc : prodFunc;
    return Object.entries(source)
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 10);
  }, [producao?.porFuncionario, historico?.porFuncionario]);

  // Dados por funcionário (corte) - do kanban corte
  const cortePorFuncionario = useMemo(() => {
    const resp = corte?.porFuncionario || {};
    return Object.entries(resp)
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 10);
  }, [corte?.porFuncionario]);

  // Envios detalhados para seção de expedição
  const enviosDetalhados = useMemo(() => campo?.enviosDetalhados || [], [campo?.enviosDetalhados]);

  // Peças detalhadas por setor
  const pecasPorSetor = useMemo(() => {
    const porSetor = producao?.porSetor || {};
    return Object.entries(SETOR_LABELS).map(([key, label]) => ({
      setor: label,
      key,
      color: SETOR_COLORS[key],
      pecas: (porSetor[key] || []).slice(0, 12),
      total: (porSetor[key] || []).length,
    })).filter(s => s.total > 0);
  }, [producao?.porSetor]);

  // Peças entregues em obra (etapa entregue + expedições entregues)
  const pecasEntregues = useMemo(() => {
    const entregues = producao?.porSetor?.entregue || [];
    const expItems = campo?.items || [];
    const expEntregues = expItems.filter(i => (i.status || '').toUpperCase() === 'ENTREGUE');
    return {
      pecas: entregues,
      totalPecas: entregues.length,
      pesoTotal: entregues.reduce((s, p) => s + (p.peso || 0), 0),
      envios: expEntregues.map(e => ({
        id: e.id,
        numero: e.numero_romaneio || '-',
        data: e.data_expedicao || e.created_at || '',
        peso: parseFloat(e.peso_total) || 0,
        pecas: typeof e.pecas === 'number' ? e.pecas : (Array.isArray(e.pecas) ? e.pecas.length : parseInt(e.pecas) || 0),
        transportadora: e.transportadora || '-',
        destino: e.destino || '-',
      })),
      totalEnvios: expEntregues.length,
    };
  }, [producao?.porSetor?.entregue, campo?.items]);

  // Gráfico comparativo financeiro
  const financeiroChart = useMemo(() => [
    { name: 'Contrato', valor: valorContrato, fill: '#3B82F6' },
    { name: 'Faturado', valor: faturamentoTotal, fill: '#10B981' },
    { name: 'Despesas', valor: despesaTotal, fill: '#EF4444' },
    { name: 'Saldo', valor: Math.max(saldoContrato, 0), fill: saldoContrato >= 0 ? '#8B5CF6' : '#EF4444' },
  ], [valorContrato, faturamentoTotal, despesaTotal, saldoContrato]);

  const alertas = useMemo(() => {
    const list = [];
    if ((estoque?.critico || 0) > 0) list.push({ type: 'critical', message: `${estoque.critico} itens em estoque crítico`, time: 'Agora' });
    if ((estoque?.baixo || 0) > 0) list.push({ type: 'warning', message: `${estoque.baixo} itens com estoque baixo`, time: 'Agora' });
    if (saldoContrato < 0) list.push({ type: 'critical', message: `Saldo do contrato negativo: ${formatCurrencyFull(saldoContrato)}`, time: 'Financeiro' });
    if ((financeiro?.despesasPendentes || 0) > 0) list.push({ type: 'warning', message: `${formatCurrency(financeiro.despesasPendentes)} em despesas pendentes`, time: 'Financeiro' });
    if ((corte?.aguardando || 0) > 5) list.push({ type: 'info', message: `${corte.aguardando} peças aguardando corte`, time: 'Produção' });
    if (list.length === 0) list.push({ type: 'info', message: 'Nenhum alerta ativo no momento', time: 'Sistema' });
    return list;
  }, [estoque, financeiro, corte, saldoContrato]);

  // ============ RENDER ============

  return (
    <div className="min-h-screen text-slate-100" style={{ background: `linear-gradient(180deg, ${colors.bg} 0%, #080E1C 50%, #0A1020 100%)` }}>
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b backdrop-blur-xl" style={{ background: 'rgba(6,10,20,0.88)', borderColor: colors.border, boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        <div className="w-full px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Cpu size={20} className="text-blue-400" />
              <span className="text-base font-bold text-white tracking-tight">Command Center</span>
            </div>
            <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">ULTRA</span>
          </div>

          <div className="flex items-center gap-5">
            {loading && (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <RefreshCw size={14} className="text-blue-400" />
              </motion.div>
            )}
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock size={13} />
              <span className="text-xs font-mono">{currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-500">Online</span>
            </div>
            <button onClick={refresh} className="p-1.5 rounded-md hover:bg-slate-800 transition-colors" title="Atualizar dados">
              <RefreshCw size={14} className="text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 2xl:px-6 py-4 space-y-4">

        {/* ROW 1: KPI CARDS - Obra + Financeiro + Produção */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <StatCard icon={Building2} label="Obra Ativa" value={obrasAtivas.length} color="#3B82F6"
            subtitle={obraAtualData?.nome || obraAtualData?.codigo || 'SUPER LUNA'} small />
          <StatCard icon={Receipt} label="Faturamento Total" value={formatCurrency(faturamentoTotal)} color="#10B981"
            subtitle={`${financeiro?.numMedicoes || 0} medições`} small />
          <StatCard icon={Wallet} label="Despesa Total" value={formatCurrency(despesaTotal)} color="#EF4444"
            subtitle={`${formatCurrency(financeiro?.despesasPendentes || 0)} pendentes`} small />
          <StatCard icon={TrendingUp} label="Saldo Contrato" value={formatCurrency(saldoContrato)} color={saldoContrato >= 0 ? '#8B5CF6' : '#EF4444'}
            subtitle={`Contrato: ${formatCurrency(valorContrato)}`} small />
          <StatCard icon={Weight} label="Peso Total" value={formatWeight(pesoTotal)} color="#F59E0B"
            subtitle={`${formatWeight(pesoExpedido)} expedido`} small />
          <StatCard icon={Package} label="Peças Produção" value={(corte?.total || 0) + (producao?.total || 0)} color="#06B6D4"
            subtitle={`${producao?.movidasHoje || 0} movidas hoje`} small />
        </div>

        {/* ROW 2: FINANCIAL OVERVIEW + PRODUCTION PIPELINE */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* FINANCIAL CHART */}
          <SectionCard title="Visão Financeira" icon={DollarSign} className="lg:col-span-2">
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={financeiroChart} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <defs>
                    {financeiroChart.map((entry, i) => (
                      <linearGradient key={i} id={`finGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={entry.fill} stopOpacity={0.9} />
                        <stop offset="50%" stopColor={entry.fill} stopOpacity={1} />
                        <stop offset="100%" stopColor={entry.fill} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                    {financeiroChart.map((entry, i) => (
                      <filter key={`shadow${i}`} id={`barShadow${i}`}>
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={entry.fill} floodOpacity="0.3" />
                      </filter>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.2)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => formatCurrency(v)} axisLine={{ stroke: 'rgba(51,65,85,0.3)' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#E2E8F0', fontWeight: 600 }} width={70} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
                  <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={28}>
                    {financeiroChart.map((entry, i) => (
                      <Cell key={i} fill={`url(#finGrad${i})`} style={{ filter: `drop-shadow(0 2px 4px ${entry.fill}30)` }} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                <div className="p-2.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.04)', boxShadow: 'inset 0 1px 0 rgba(16,185,129,0.08)' }}>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Despesas Pagas</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">{formatCurrency(financeiro?.despesasPagas || 0)}</div>
                </div>
                <div className="p-2.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.04)', boxShadow: 'inset 0 1px 0 rgba(245,158,11,0.08)' }}>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Pendentes</div>
                  <div className="text-sm font-bold text-amber-400 mt-0.5">{formatCurrency(financeiro?.despesasPendentes || 0)}</div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* PRODUCTION PIPELINE */}
          <SectionCard title="Pipeline de Produção" icon={Layers} className="lg:col-span-3">
            <div className="space-y-5">
              {/* Stage chips with radial glow */}
              <div className="grid grid-cols-5 gap-3">
                {producaoStages.map((s, i) => (
                  <motion.div
                    key={i}
                    className="relative flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl border overflow-hidden"
                    style={{
                      background: s.value > 0
                        ? `linear-gradient(160deg, ${s.color}14, ${s.color}06, rgba(15,23,42,0.5))`
                        : 'rgba(20,30,50,0.4)',
                      borderColor: s.value > 0 ? `${s.color}35` : 'rgba(51,65,85,0.2)',
                      boxShadow: s.value > 0
                        ? `0 4px 20px ${s.color}12, inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px ${s.color}08`
                        : 'inset 0 1px 0 rgba(255,255,255,0.02)',
                    }}
                    whileHover={{
                      scale: 1.05,
                      borderColor: `${s.color}60`,
                      boxShadow: `0 8px 30px ${s.color}20, inset 0 1px 0 rgba(255,255,255,0.06)`,
                    }}
                  >
                    {s.value > 0 && <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }} />}
                    <span className="text-2xl font-bold text-white" style={{ textShadow: s.value > 0 ? `0 0 20px ${s.color}30` : 'none' }}>{s.value}</span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">{s.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* 3D Progress bar with gradient segments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Progresso Geral por Peso</span>
                  <span className="text-sm font-bold text-white" style={{ textShadow: '0 0 10px rgba(59,130,246,0.3)' }}>{progressoGeralPeso.toFixed(1)}%</span>
                </div>
                <div className="relative h-5 rounded-full overflow-hidden" style={{
                  background: 'linear-gradient(180deg, rgba(15,23,42,0.8), rgba(30,41,59,0.6))',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.03)',
                }}>
                  {producaoStages.map((s, i) => {
                    const totalPecas = producaoStages.reduce((a, b) => a + b.value, 0) || 1;
                    const pct = (s.value / totalPecas) * 100;
                    const offset = producaoStages.slice(0, i).reduce((a, b) => a + (b.value / totalPecas) * 100, 0);
                    return (
                      <motion.div
                        key={i}
                        className="absolute top-0 h-full"
                        style={{
                          background: `linear-gradient(180deg, ${s.color}dd, ${s.color}, ${s.color}aa)`,
                          left: `${offset}%`,
                          boxShadow: `inset 0 1px 1px rgba(255,255,255,0.2), 0 0 8px ${s.color}30`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.2, delay: i * 0.15, ease: 'easeOut' }}
                      />
                    );
                  })}
                  {/* Highlight/shine overlay */}
                  <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)' }} />
                </div>
                <div className="flex items-center gap-5 flex-wrap">
                  {producaoStages.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}88)`, boxShadow: `0 0 6px ${s.color}30` }} />
                      <span className="text-[10px] text-slate-400 font-medium">{s.label}: <span className="text-white font-bold">{s.value}</span></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats row with subtle 3D cards */}
              <div className="grid grid-cols-4 gap-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                {[
                  { label: 'Total Peças', value: (corte?.total || 0) + (producao?.total || 0), color: '#F1F5F9' },
                  { label: 'Finalizadas', value: (corte?.finalizado || 0) + (producao?.finalizado || 0), color: '#10B981' },
                  { label: 'Peso Corte', value: formatWeight(corte?.pesoTotal || 0), color: '#F59E0B' },
                  { label: 'Peso Expedido', value: formatWeight(pesoExpedido), color: '#3B82F6' },
                ].map((item, i) => (
                  <div key={i} className="p-2.5 rounded-lg" style={{
                    background: `linear-gradient(135deg, ${item.color}06, transparent)`,
                    boxShadow: `inset 0 1px 0 ${item.color}08`,
                  }}>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</div>
                    <div className="text-lg font-bold mt-0.5" style={{ color: item.color, textShadow: `0 0 15px ${item.color}20` }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ROW 3: PRODUÇÃO POR SETOR + PEÇAS IDENTIFICADAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* GRÁFICO POR SETOR */}
          <SectionCard title="Quantidade por Setor" icon={Layers}
            action={<PeriodFilter value={periodo} onChange={setPeriodo} />}
          >
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={producaoPorSetorChart} margin={{ left: -10, bottom: 5 }}>
                  <defs>
                    {Object.entries(SETOR_COLORS).map(([key, color], i) => (
                      <linearGradient key={key} id={`setorGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.15)" vertical={false} />
                  <XAxis dataKey="setor" tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }} axisLine={{ stroke: 'rgba(51,65,85,0.3)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.04)', radius: 4 }} />
                  <Bar dataKey="qtd" name="Peças" radius={[8, 8, 0, 0]} barSize={40}>
                    {producaoPorSetorChart.map((entry, i) => (
                      <Cell key={i} fill={`url(#setorGrad${i})`} style={{ filter: `drop-shadow(0 4px 8px ${entry.color}25)` }} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="flex items-center justify-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-pulse" />
                <span className="text-[10px] text-slate-500">
                  {periodo === 'dia' ? 'Dados do dia atual' : periodo === 'semana' ? 'Dados da semana' : 'Dados do mês'}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* PEÇAS POR SETOR DETALHADAS */}
          <SectionCard title="Peças por Setor" icon={FileText}>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {pecasPorSetor.length > 0 ? pecasPorSetor.map((setor, si) => (
                <div key={si} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: setor.color }} />
                    <span className="text-xs font-semibold text-slate-200">{setor.setor}</span>
                    <span className="text-[10px] text-slate-500">({setor.total} peças)</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-1.5 pl-4">
                    {setor.pecas.map((p, pi) => (
                      <div key={pi} className="flex items-center gap-1.5 p-1.5 rounded-md bg-slate-800/30 border border-slate-700/30">
                        <span className="text-[10px] text-slate-300 truncate">{p.nome}</span>
                        {p.peso > 0 && <span className="text-[9px] text-slate-500 flex-shrink-0">{p.peso.toFixed(0)}kg</span>}
                      </div>
                    ))}
                    {setor.total > 12 && (
                      <div className="flex items-center justify-center p-1.5 rounded-md bg-slate-800/20">
                        <span className="text-[10px] text-slate-500">+{setor.total - 12} mais</span>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <Package size={32} className="mb-2 opacity-30" />
                  <span className="text-sm">Nenhuma peça em produção</span>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ROW 3.5: PEÇAS ENTREGUES EM OBRA */}
        {(pecasEntregues.totalPecas > 0 || pecasEntregues.totalEnvios > 0) && (
          <SectionCard title="Peças Entregues em Obra" icon={CheckCircle}>
            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <div className="text-xl font-bold text-emerald-400">{pecasEntregues.totalPecas}</div>
                  <div className="text-[10px] text-slate-400">Peças Entregues</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <div className="text-xl font-bold text-blue-400">{formatWeight(pecasEntregues.pesoTotal)}</div>
                  <div className="text-[10px] text-slate-400">Peso Entregue</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                  <div className="text-xl font-bold text-purple-400">{pecasEntregues.totalEnvios}</div>
                  <div className="text-[10px] text-slate-400">Envios Entregues</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Lista de peças entregues */}
                <div className="space-y-2">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Peças Entregues ({pecasEntregues.totalPecas})</div>
                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                    {pecasEntregues.pecas.length > 0 ? pecasEntregues.pecas.slice(0, 20).map((p, i) => (
                      <motion.div key={p.id || i}
                        initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-800/20 border border-slate-700/20"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                          <span className="text-[11px] text-slate-200 truncate">{p.nome}</span>
                          {p.tipo !== '-' && <span className="text-[9px] text-slate-500 flex-shrink-0">{p.tipo}</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {p.peso > 0 && <span className="text-[10px] text-blue-400 font-medium">{p.peso.toFixed(0)}kg</span>}
                          <span className="text-[9px] text-slate-500">{p.resp}</span>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="text-center py-4 text-slate-500 text-xs">Nenhuma peça entregue registrada</div>
                    )}
                    {pecasEntregues.totalPecas > 20 && (
                      <div className="text-center py-2 text-[10px] text-slate-500">+{pecasEntregues.totalPecas - 20} peças adicionais</div>
                    )}
                  </div>
                </div>

                {/* Lista de envios entregues */}
                <div className="space-y-2">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Envios Entregues ({pecasEntregues.totalEnvios})</div>
                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                    {pecasEntregues.envios.length > 0 ? pecasEntregues.envios.map((env, i) => (
                      <motion.div key={env.id || i}
                        initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-2.5 rounded-lg border bg-emerald-500/5 border-emerald-500/10"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">ROM {env.numero}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium text-emerald-400 bg-emerald-500/10">ENTREGUE</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                          <div className="text-[10px] text-slate-400">
                            <span className="text-slate-500">Data:</span> <span className="text-slate-300">{env.data ? env.data.slice(0, 10) : '-'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            <span className="text-slate-500">Destino:</span> <span className="text-slate-300">{env.destino}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            <span className="text-slate-500">Transp:</span> <span className="text-slate-300">{env.transportadora}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            <span className="text-slate-500">Peso:</span> <span className="text-blue-400 font-medium">{formatWeight(env.peso)}</span>
                            <span className="text-slate-500 ml-2">Peças:</span> <span className="text-cyan-400 font-medium">{env.pecas}</span>
                          </div>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="text-center py-4 text-slate-500 text-xs">Nenhum envio entregue registrado</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ROW 4: PRODUÇÃO POR FUNCIONÁRIO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* FUNCIONÁRIOS - PRODUÇÃO */}
          <SectionCard title="Produção por Funcionário" icon={Users}
            action={<PeriodFilter value={periodo} onChange={setPeriodo} />}
          >
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {producaoPorFuncionario.length > 0 ? producaoPorFuncionario.map((f, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/20"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))',
                    border: '1px solid rgba(59,130,246,0.15)',
                    boxShadow: '0 2px 8px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}>
                    <User size={14} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{f.nome}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-blue-400 font-medium">{f.fabricacao} fab</span>
                      <span className="text-[10px] text-purple-400 font-medium">{f.solda} solda</span>
                      <span className="text-[10px] text-cyan-400 font-medium">{f.pintura} pint</span>
                      <span className="text-[10px] text-emerald-400 font-medium">{f.expedicao} exp</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-white" style={{ textShadow: '0 0 10px rgba(255,255,255,0.1)' }}>{f.total}</div>
                    <div className="text-[10px] text-slate-500">{formatWeight(f.peso)}</div>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-6 text-slate-500 text-xs">Sem dados de responsável registrados</div>
              )}
            </div>
          </SectionCard>

          {/* FUNCIONÁRIOS - CORTE */}
          <SectionCard title="Corte por Funcionário" icon={Factory}
            action={<PeriodFilter value={periodo} onChange={setPeriodo} />}
          >
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {cortePorFuncionario.length > 0 ? cortePorFuncionario.map((f, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/20"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
                    border: '1px solid rgba(245,158,11,0.15)',
                    boxShadow: '0 2px 8px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}>
                    <User size={14} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{f.nome}</div>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {(f.pecas || []).slice(0, 4).map((p, pi) => (
                        <span key={pi} className="text-[9px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded">
                          {typeof p === 'string' ? p : (p.peca || p.marca || '-')}
                        </span>
                      ))}
                      {(f.pecas || []).length > 4 && (
                        <span className="text-[9px] text-slate-500">+{f.pecas.length - 4}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-white">{f.qtd}</div>
                    <div className="text-[10px] text-slate-500">{formatWeight(f.peso)}</div>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-6 text-slate-500 text-xs">Sem dados de responsável registrados</div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ROW 5: ESTOQUE + EXPEDIÇÃO + ALERTAS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ESTOQUE */}
          <SectionCard title="Estoque" icon={Package}>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-2xl font-bold text-white">{estoque?.totalItens || 0}</div>
                  <div className="text-xs text-slate-400">itens cadastrados</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400">{formatCurrency(estoque?.valorTotal || 0)}</div>
                  <div className="text-[10px] text-slate-500">valor total</div>
                </div>
              </div>

              {/* Mini PieChart for estoque distribution */}
              {(() => {
                const estoqueData = [
                  { name: 'Normal', value: estoque?.normal || 0, color: '#10B981' },
                  { name: 'Baixo', value: estoque?.baixo || 0, color: '#F59E0B' },
                  { name: 'Crítico', value: estoque?.critico || 0, color: '#EF4444' },
                ].filter(d => d.value > 0);
                const total = estoqueData.reduce((a, b) => a + b.value, 0) || 1;
                return (
                  <div className="flex items-center gap-4">
                    <div className="relative" style={{ width: 100, height: 100 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <defs>
                            {estoqueData.map((d, i) => (
                              <linearGradient key={i} id={`estGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor={d.color} stopOpacity={1} />
                                <stop offset="100%" stopColor={d.color} stopOpacity={0.6} />
                              </linearGradient>
                            ))}
                          </defs>
                          <Pie
                            data={estoqueData}
                            cx="50%" cy="50%"
                            innerRadius={28} outerRadius={44}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                            animationBegin={200}
                            animationDuration={1200}
                          >
                            {estoqueData.map((d, i) => (
                              <Cell key={i} fill={`url(#estGrad${i})`} style={{ filter: `drop-shadow(0 0 4px ${d.color}40)` }} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{total}</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {[
                        { name: 'Normal', value: estoque?.normal || 0, color: '#10B981' },
                        { name: 'Baixo', value: estoque?.baixo || 0, color: '#F59E0B' },
                        { name: 'Crítico', value: estoque?.critico || 0, color: '#EF4444' },
                      ].map((s, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}88)`, boxShadow: `0 0 4px ${s.color}30` }} />
                              <span className="text-xs text-slate-300">{s.name}</span>
                            </div>
                            <span className="text-xs font-bold text-white">{s.value}</span>
                          </div>
                          <MiniBar value={s.value} max={total} color={s.color} height={5} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </SectionCard>

          {/* EXPEDIÇÃO */}
          <SectionCard title="Expedição" icon={Truck}>
            <div className="space-y-4">
              {/* Resumo numérico com 3D depth */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Total', value: campo?.totalEnvios || 0, color: '#3B82F6' },
                  { label: 'Entregues', value: campo?.entregues || 0, color: '#10B981' },
                  { label: 'Em Trânsito', value: campo?.emTransito || 0, color: '#06B6D4' },
                  { label: 'Pendentes', value: campo?.pendentes || 0, color: '#F59E0B' },
                ].map((item, i) => (
                  <motion.div key={i}
                    className="text-center p-2.5 rounded-lg border overflow-hidden relative"
                    style={{
                      background: `linear-gradient(160deg, ${item.color}08, transparent)`,
                      borderColor: `${item.color}15`,
                      boxShadow: `0 2px 12px ${item.color}08, inset 0 1px 0 rgba(255,255,255,0.03)`,
                    }}
                    whileHover={{ borderColor: `${item.color}35`, boxShadow: `0 4px 20px ${item.color}15` }}
                  >
                    <div className="text-lg font-bold" style={{ color: item.color, textShadow: `0 0 12px ${item.color}25` }}>{item.value}</div>
                    <div className="text-[9px] text-slate-400 font-medium">{item.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Progresso */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Progresso Envios</span>
                  <span className="text-xs font-bold text-white">
                    {campo?.totalEnvios > 0 ? Math.round(((campo?.enviados || 0) / campo.totalEnvios) * 100) : 0}%
                  </span>
                </div>
                <MiniBar value={campo?.enviados || 0} max={campo?.totalEnvios || 1} color="#10B981" />
              </div>

              {/* Peso e envios hoje */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t" style={{ borderColor: colors.border }}>
                <div className="text-center">
                  <div className="text-xs text-slate-500">Peso Env.</div>
                  <div className="text-sm font-bold text-blue-400">{formatWeight(campo?.pesoEnviado || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500">Peças Env.</div>
                  <div className="text-sm font-bold text-cyan-400">{campo?.pecasEnviadas || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500">Hoje</div>
                  <div className="text-sm font-bold text-emerald-400">{campo?.enviosHoje || 0}</div>
                </div>
              </div>

              {/* Lista detalhada de envios recentes */}
              {enviosDetalhados.length > 0 && (
                <div className="pt-3 border-t space-y-2" style={{ borderColor: colors.border }}>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Envios Recentes</div>
                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                    {enviosDetalhados.map((env, idx) => {
                      const statusColor = env.status === 'ENTREGUE' ? 'text-emerald-400' :
                        env.status === 'EM_TRANSITO' ? 'text-cyan-400' :
                        env.status === 'ENVIADO' ? 'text-blue-400' : 'text-amber-400';
                      const statusBg = env.status === 'ENTREGUE' ? 'bg-emerald-500/10' :
                        env.status === 'EM_TRANSITO' ? 'bg-cyan-500/10' :
                        env.status === 'ENVIADO' ? 'bg-blue-500/10' : 'bg-amber-500/10';
                      return (
                        <motion.div key={env.id || idx}
                          initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-2.5 rounded-lg border"
                          style={{ background: colors.cardBg, borderColor: colors.border }}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">ROM {env.numero}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusColor} ${statusBg}`}>
                                {env.status === 'EM_TRANSITO' ? 'EM TRÂNSITO' : env.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">{env.data ? env.data.slice(0, 10) : '-'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                            <div className="text-[10px] text-slate-400">
                              <span className="text-slate-500">Transp:</span> <span className="text-slate-300">{env.transportadora}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              <span className="text-slate-500">Motorista:</span> <span className="text-slate-300">{env.motorista}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              <span className="text-slate-500">Placa:</span> <span className="text-slate-300">{env.placa}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              <span className="text-slate-500">Destino:</span> <span className="text-slate-300">{env.destino}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              <span className="text-slate-500">Peso:</span> <span className="text-blue-400 font-medium">{formatWeight(env.peso)}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              <span className="text-slate-500">Peças:</span> <span className="text-cyan-400 font-medium">{env.pecas}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* ALERTAS */}
          <SectionCard title="Alertas" icon={Bell}
            action={
              <span className="text-[10px] font-bold text-white bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                {alertas.length}
              </span>
            }
          >
            <div className="space-y-2">
              {alertas.map((a, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                  <AlertItem {...a} />
                </motion.div>
              ))}
            </div>
          </SectionCard>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t py-2 mt-1" style={{ borderColor: colors.border, background: 'rgba(6,10,20,0.7)' }}>
        <div className="w-full px-6 flex items-center justify-between text-[10px] text-slate-600">
          <div className="flex items-center gap-4">
            <span>Supabase <span className="text-emerald-500">●</span> Conectado</span>
            <span>Real-time <span className="text-blue-500">●</span> Ativo</span>
          </div>
          <span>Última atualização: {lastUpdate?.toLocaleTimeString('pt-BR') || '--:--'}</span>
        </div>
      </footer>
    </div>
  );
}
