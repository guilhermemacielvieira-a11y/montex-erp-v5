// MONTEX ERP Premium - Command Center Ultra v3
// Dashboard executivo com financeiro, produção por setor e funcionário
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
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
  bg: '#0B1120',
  card: 'rgba(15, 23, 42, 0.6)',
  border: 'rgba(51, 65, 85, 0.5)',
  accent: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  purple: '#8B5CF6',
  text: '#F1F5F9',
  muted: '#94A3B8',
  dimmed: '#64748B',
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
  expedicao: 'Expedição',
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
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(51,65,85,0.4)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white">{Math.round(value)}%</span>
      </div>
    </div>
  );
};

const MiniBar = ({ value = 0, max = 100, color = '#3B82F6', height = 6 }) => (
  <div className="w-full rounded-full overflow-hidden" style={{ height, background: 'rgba(51,65,85,0.4)' }}>
    <motion.div
      className="h-full rounded-full"
      style={{ background: color }}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min((value / (max || 1)) * 100, 100)}%` }}
      transition={{ duration: 1, ease: 'easeOut' }}
    />
  </div>
);

const StatCard = ({ icon: Icon, label, value, subtitle, trend, color = '#3B82F6', small }) => (
  <motion.div
    className="relative group cursor-default rounded-xl border backdrop-blur-sm overflow-hidden"
    style={{ background: colors.card, borderColor: colors.border }}
    whileHover={{ y: -2, borderColor: color }}
    transition={{ duration: 0.2 }}
  >
    <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
    <div className={small ? 'p-3' : 'p-4'}>
      <div className="flex items-start justify-between mb-2">
        <div className="p-1.5 rounded-lg" style={{ background: `${color}15` }}>
          <Icon size={small ? 14 : 18} style={{ color }} />
        </div>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      <div className={`${small ? 'text-xl' : 'text-2xl'} font-bold text-white tracking-tight`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
      {subtitle && <div className="text-[10px] text-slate-500 mt-0.5">{subtitle}</div>}
    </div>
  </motion.div>
);

const SectionCard = ({ title, icon: Icon, children, className = '', action }) => (
  <div
    className={`rounded-xl border backdrop-blur-sm ${className}`}
    style={{ background: colors.card, borderColor: colors.border }}
  >
    <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: colors.border }}>
      <div className="flex items-center gap-2.5">
        {Icon && <Icon size={16} className="text-slate-400" />}
        <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">{title}</h3>
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const StageChip = ({ label, value, color, active }) => (
  <motion.div
    className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border transition-colors ${active ? 'border-opacity-60' : 'border-transparent'}`}
    style={{
      background: active ? `${color}10` : 'rgba(30,41,59,0.4)',
      borderColor: active ? color : 'transparent'
    }}
    whileHover={{ scale: 1.03 }}
  >
    <span className="text-lg font-bold text-white">{value}</span>
    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
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
    <div className="rounded-lg border p-2" style={{ background: '#1E293B', borderColor: 'rgba(51,65,85,0.8)' }}>
      <p className="text-[10px] text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-semibold" style={{ color: p.color || p.fill }}>
          {p.name}: {typeof p.value === 'number' && p.value > 999 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ============ MAIN COMPONENT ============

export default function CommandCenterUltra() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [periodo, setPeriodo] = useState('dia');
  const {
    corte = {}, producao = {}, estoque = {}, financeiro = {}, campo = {},
    loading = false, lastUpdate = new Date(), comparacaoDiaria, refresh
  } = useCommandCenter() || {};
  const { obras = [], obraAtualData } = useObras() || {};
  const { maquinas = [] } = useProducao() || {};
  const { materiaisEstoque = [] } = useEstoque() || {};

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // ============ COMPUTED DATA ============

  const comparacao = useMemo(() => {
    try { return comparacaoDiaria?.() || {}; } catch { return {}; }
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

  // Dados por responsável (produção)
  const producaoPorFuncionario = useMemo(() => {
    const resp = producao?.porResponsavel || {};
    return Object.entries(resp)
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [producao?.porResponsavel]);

  // Dados por responsável (corte)
  const cortePorFuncionario = useMemo(() => {
    const resp = corte?.porResponsavel || {};
    return Object.entries(resp)
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 10);
  }, [corte?.porResponsavel]);

  // Peças detalhadas por setor
  const pecasPorSetor = useMemo(() => {
    const porSetor = producao?.porSetor || {};
    return Object.entries(SETOR_LABELS).map(([key, label]) => ({
      setor: label,
      key,
      color: SETOR_COLORS[key],
      pecas: (porSetor[key] || []).slice(0, 8),
      total: (porSetor[key] || []).length,
    })).filter(s => s.total > 0);
  }, [producao?.porSetor]);

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
    <div className="min-h-screen text-slate-100" style={{ background: colors.bg }}>
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b backdrop-blur-md" style={{ background: 'rgba(11,17,32,0.85)', borderColor: colors.border }}>
        <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between">
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

      <main className="max-w-[1440px] mx-auto px-6 py-5 space-y-5">

        {/* ROW 1: KPI CARDS - Obra + Financeiro + Produção */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* FINANCIAL CHART */}
          <SectionCard title="Visão Financeira" icon={DollarSign}>
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={financeiroChart} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => formatCurrency(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#E2E8F0' }} width={65} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                    {financeiroChart.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Despesas Pagas</div>
                  <div className="text-sm font-bold text-white">{formatCurrency(financeiro?.despesasPagas || 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Pendentes</div>
                  <div className="text-sm font-bold text-amber-400">{formatCurrency(financeiro?.despesasPendentes || 0)}</div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* PRODUCTION PIPELINE */}
          <SectionCard title="Pipeline de Produção" icon={Layers} className="lg:col-span-2">
            <div className="space-y-5">
              <div className="grid grid-cols-5 gap-2">
                {producaoStages.map((s, i) => (
                  <StageChip key={i} label={s.label} value={s.value} color={s.color} active={s.value > 0} />
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Progresso Geral por Peso</span>
                  <span className="text-xs font-bold text-white">{progressoGeralPeso.toFixed(1)}%</span>
                </div>
                <div className="relative h-3 rounded-full overflow-hidden bg-slate-800/60">
                  {producaoStages.map((s, i) => {
                    const totalPecas = producaoStages.reduce((a, b) => a + b.value, 0) || 1;
                    const pct = (s.value / totalPecas) * 100;
                    const offset = producaoStages.slice(0, i).reduce((a, b) => a + (b.value / totalPecas) * 100, 0);
                    return (
                      <motion.div
                        key={i}
                        className="absolute top-0 h-full"
                        style={{ background: s.color, left: `${offset}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  {producaoStages.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-[10px] text-slate-400">{s.label}: {s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Total Peças</div>
                  <div className="text-lg font-bold text-white">{(corte?.total || 0) + (producao?.total || 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Finalizadas</div>
                  <div className="text-lg font-bold text-emerald-400">{(corte?.finalizado || 0) + (producao?.finalizado || 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Peso Corte</div>
                  <div className="text-lg font-bold text-amber-400">{formatWeight(corte?.pesoTotal || 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Peso Expedido</div>
                  <div className="text-lg font-bold text-blue-400">{formatWeight(pesoExpedido)}</div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ROW 3: PRODUÇÃO POR SETOR + PEÇAS IDENTIFICADAS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* GRÁFICO POR SETOR */}
          <SectionCard title="Quantidade por Setor" icon={Layers}
            action={<PeriodFilter value={periodo} onChange={setPeriodo} />}
          >
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={producaoPorSetorChart} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                  <XAxis dataKey="setor" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="qtd" name="Peças" radius={[4, 4, 0, 0]}>
                    {producaoPorSetorChart.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="text-[10px] text-slate-500 text-center">
                {periodo === 'dia' ? 'Dados do dia atual' : periodo === 'semana' ? 'Dados da semana' : 'Dados do mês'}
              </div>
            </div>
          </SectionCard>

          {/* PEÇAS POR SETOR DETALHADAS */}
          <SectionCard title="Peças por Setor" icon={FileText} className="lg:col-span-2">
            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
              {pecasPorSetor.length > 0 ? pecasPorSetor.map((setor, si) => (
                <div key={si} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: setor.color }} />
                    <span className="text-xs font-semibold text-slate-200">{setor.setor}</span>
                    <span className="text-[10px] text-slate-500">({setor.total} peças)</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 pl-4">
                    {setor.pecas.map((p, pi) => (
                      <div key={pi} className="flex items-center gap-1.5 p-1.5 rounded-md bg-slate-800/30 border border-slate-700/30">
                        <span className="text-[10px] text-slate-300 truncate">{p.nome}</span>
                        {p.peso > 0 && <span className="text-[9px] text-slate-500 flex-shrink-0">{p.peso.toFixed(0)}kg</span>}
                      </div>
                    ))}
                    {setor.total > 8 && (
                      <div className="flex items-center justify-center p-1.5 rounded-md bg-slate-800/20">
                        <span className="text-[10px] text-slate-500">+{setor.total - 8} mais</span>
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

        {/* ROW 4: PRODUÇÃO POR FUNCIONÁRIO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* FUNCIONÁRIOS - PRODUÇÃO */}
          <SectionCard title="Produção por Funcionário" icon={Users}
            action={<PeriodFilter value={periodo} onChange={setPeriodo} />}
          >
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
              {producaoPorFuncionario.length > 0 ? producaoPorFuncionario.map((f, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/20"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{f.nome}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-blue-400">{f.fabricacao} fab</span>
                      <span className="text-[10px] text-purple-400">{f.solda} solda</span>
                      <span className="text-[10px] text-cyan-400">{f.pintura} pint</span>
                      <span className="text-[10px] text-emerald-400">{f.expedicao} exp</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-white">{f.total}</div>
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
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
              {cortePorFuncionario.length > 0 ? cortePorFuncionario.map((f, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/20"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{f.nome}</div>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {(f.pecas || []).slice(0, 4).map((p, pi) => (
                        <span key={pi} className="text-[9px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded">{p}</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

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

              <div className="space-y-2.5">
                {[
                  { name: 'Normal', value: estoque?.normal || 0, color: '#10B981' },
                  { name: 'Baixo', value: estoque?.baixo || 0, color: '#F59E0B' },
                  { name: 'Crítico', value: estoque?.critico || 0, color: '#EF4444' },
                ].map((s, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                        <span className="text-xs text-slate-300">{s.name}</span>
                      </div>
                      <span className="text-xs font-bold text-white">{s.value}</span>
                    </div>
                    <MiniBar value={s.value} max={(estoque?.normal || 0) + (estoque?.baixo || 0) + (estoque?.critico || 0) || 100} color={s.color} />
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* EXPEDIÇÃO */}
          <SectionCard title="Expedição" icon={Truck}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <div className="text-2xl font-bold text-blue-400">{campo?.totalEnvios || 0}</div>
                  <div className="text-[10px] text-slate-400">Total Envios</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <div className="text-2xl font-bold text-emerald-400">{campo?.enviados || 0}</div>
                  <div className="text-[10px] text-slate-400">Concluídos</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Progresso Envios</span>
                  <span className="text-xs font-bold text-white">
                    {campo?.totalEnvios > 0 ? Math.round(((campo?.enviados || 0) / campo.totalEnvios) * 100) : 0}%
                  </span>
                </div>
                <MiniBar value={campo?.enviados || 0} max={campo?.totalEnvios || 1} color="#10B981" />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t" style={{ borderColor: colors.border }}>
                <div className="text-center">
                  <div className="text-xs text-slate-500">Pendentes</div>
                  <div className="text-sm font-bold text-amber-400">{campo?.pendentes || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500">Peso Env.</div>
                  <div className="text-sm font-bold text-blue-400">{formatWeight(campo?.pesoEnviado || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500">Hoje</div>
                  <div className="text-sm font-bold text-emerald-400">{campo?.enviosHoje || 0}</div>
                </div>
              </div>
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
      <footer className="border-t py-3 mt-2" style={{ borderColor: colors.border, background: 'rgba(11,17,32,0.6)' }}>
        <div className="max-w-[1440px] mx-auto px-6 flex items-center justify-between text-[10px] text-slate-600">
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
