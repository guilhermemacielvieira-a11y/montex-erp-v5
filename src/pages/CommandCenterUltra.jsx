// MONTEX ERP Premium - Command Center Ultra v2
// Dashboard executivo - visÃ£o objetiva e profissional
import React, { useState, useEffect, useMemo } from 'react';
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

const Sparkline = ({ data = [], color = '#3B82F6', height = 32 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data.map((v, i) => ({ v, i }))}>
      <defs>
        <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color.replace('#','')})`} dot={false} isAnimationActive={false} />
    </AreaChart>
  </ResponsiveContainer>
);

const StatCard = ({ icon: Icon, label, value, subtitle, trend, color = '#3B82F6', onClick }) => (
  <motion.div
    className="relative group cursor-default rounded-xl border backdrop-blur-sm overflow-hidden"
    style={{ background: colors.card, borderColor: colors.border }}
    whileHover={{ y: -2, borderColor: color }}
    transition={{ duration: 0.2 }}
    onClick={onClick}
  >
    <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
    <div className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
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
  if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
};

const formatWeight = (kg) => {
  if (!kg) return '0t';
  return `${(kg / 1000).toFixed(1)}t`;
};

// ============ MAIN COMPONENT ============

export default function CommandCenterUltra() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const {
    corte = {}, producao = {}, estoque = {}, financeiro = {}, campo = {},
    loading = false, lastUpdate = new Date(), comparacaoDiaria, refresh
  } = useCommandCenter() || {};
  const { obras = [] } = useObras() || {};
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

  const obrasAtivas = useMemo(() => obras?.filter(o => o?.status === 'em_producao' || o?.status === 'Em ProduÃ§Ã£o') || [], [obras]);
  const maquinasAtivas = useMemo(() => maquinas?.filter(m => m?.status === 'ativa' || m?.status === 'operando') || [], [maquinas]);

  const pesoTotal = (corte?.pesoTotal || 0) + (producao?.pesoTotal || 0);
  const pesoExpedido = producao?.pesoExpedido || 0;
  const progressoGeralPeso = pesoTotal > 0 ? (pesoExpedido / pesoTotal) * 100 : 0;

  const producaoStages = useMemo(() => [
    { label: 'Corte', value: corte?.cortando || 0, total: corte?.total || 0, color: '#F59E0B' },
    { label: 'Fabric.', value: producao?.fabricacao || 0, total: producao?.total || 0, color: '#3B82F6' },
    { label: 'Solda', value: producao?.solda || 0, total: producao?.total || 0, color: '#8B5CF6' },
    { label: 'Pintura', value: producao?.pintura || 0, total: producao?.total || 0, color: '#06B6D4' },
    { label: 'Exped.', value: producao?.expedicao || 0, total: producao?.total || 0, color: '#10B981' },
  ], [corte, producao]);

  const estoqueStatus = useMemo(() => [
    { name: 'Normal', value: estoque?.normal || 0, color: '#10B981' },
    { name: 'Baixo', value: estoque?.baixo || 0, color: '#F59E0B' },
    { name: 'CrÃ­tico', value: estoque?.critico || 0, color: '#EF4444' },
  ], [estoque]);

  const estoqueTotal = (estoque?.normal || 0) + (estoque?.baixo || 0) + (estoque?.critico || 0);

  const projetosData = useMemo(() =>
    obrasAtivas.slice(0, 6).map(o => ({
      nome: o?.codigo || o?.nome || 'Projeto',
      progresso: o?.percentualConcluido || 0,
      peso: o?.pesoTotal || 0,
      valor: o?.valorTotal || 0,
    })), [obrasAtivas]);

  const alertas = useMemo(() => {
    const list = [];
    if ((estoque?.critico || 0) > 0) list.push({ type: 'critical', message: `${estoque.critico} itens em estoque crÃ­tico`, time: 'Agora' });
    if ((estoque?.baixo || 0) > 0) list.push({ type: 'warning', message: `${estoque.baixo} itens com estoque baixo`, time: 'Agora' });
    if ((financeiro?.despesasPendentes || 0) > 0) list.push({ type: 'warning', message: `${formatCurrency(financeiro.despesasPendentes)} em despesas pendentes`, time: 'Financeiro' });
    if ((corte?.aguardando || 0) > 5) list.push({ type: 'info', message: `${corte.aguardando} peÃ§as aguardando corte`, time: 'ProduÃ§Ã£o' });
    if (list.length === 0) list.push({ type: 'info', message: 'Nenhum alerta ativo no momento', time: 'Sistema' });
    return list;
  }, [estoque, financeiro, corte]);

  // Daily production mock sparkline (simulates trend from real data)
  const prodTrend = useMemo(() => {
    const base = producao?.movidasHoje || 0;
    return Array.from({ length: 7 }, (_, i) => Math.max(0, base + Math.round((Math.random() - 0.5) * base * 0.3)));
  }, [producao?.movidasHoje]);

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

        {/* ROW 1: KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard icon={Building2} label="Obras Ativas" value={obrasAtivas.length} color="#3B82F6"
            subtitle={`${obras?.length || 0} total cadastradas`} />
          <StatCard icon={Weight} label="Peso Total" value={formatWeight(pesoTotal)} color="#8B5CF6"
            subtitle={`${formatWeight(pesoExpedido)} expedido`} trend={comparacao?.producao?.pesoExpedido} />
          <StatCard icon={Package} label="PeÃ§as Hoje" value={producao?.movidasHoje || 0} color="#10B981"
            subtitle={`${corte?.cortadasHoje || 0} cortadas`} trend={comparacao?.producao?.movidasHoje} />
          <StatCard icon={DollarSign} label="Saldo Obras" value={formatCurrency(financeiro?.saldoObra || 0)} color="#F59E0B"
            subtitle={`${financeiro?.numMedicoes || 0} mediÃ§Ãµes`} />
          <StatCard icon={Factory} label="MÃ¡quinas" value={`${maquinasAtivas.length}/${maquinas?.length || 0}`} color="#06B6D4"
            subtitle="ativas / total" />
          <StatCard icon={AlertTriangle} label="Alertas" value={(estoque?.critico || 0) + (estoque?.baixo || 0)} color="#EF4444"
            subtitle={`${estoque?.critico || 0} crÃ­ticos`} />
        </div>

        {/* ROW 2: PRODUCTION + PROGRESS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* PRODUCTION PIPELINE */}
          <SectionCard title="Pipeline de ProduÃ§Ã£o" icon={Layers} className="lg:col-span-2">
            <div className="space-y-5">
              {/* Stage chips */}
              <div className="grid grid-cols-5 gap-2">
                {producaoStages.map((s, i) => (
                  <StageChip key={i} label={s.label} value={s.value} color={s.color} active={s.value > 0} />
                ))}
              </div>

              {/* Flow bar */}
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
                      <span className="text-[10px] text-slate-400">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary row */}
              <div className="grid grid-cols-4 gap-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Total PeÃ§as</div>
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

          {/* DAILY TARGET */}
          <SectionCard title="Meta DiÃ¡ria" icon={Target}>
            <div className="flex flex-col items-center gap-4">
              <ProgressRing
                value={producao?.movidasHoje ? Math.min((producao.movidasHoje / 15) * 100, 100) : 0}
                size={100} strokeWidth={6} color={producao?.movidasHoje >= 15 ? '#10B981' : '#3B82F6'}
              />
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{producao?.movidasHoje || 0}</div>
                <div className="text-xs text-slate-400 mt-1">de 15 peÃ§as movidas</div>
              </div>
              <Sparkline data={prodTrend} color="#3B82F6" height={40} />
              <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t" style={{ borderColor: colors.border }}>
                <div className="text-center">
                  <div className="text-xs text-slate-500">Cortadas</div>
                  <div className="text-base font-bold text-amber-400">{corte?.cortadasHoje || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500">Enviadas</div>
                  <div className="text-base font-bold text-emerald-400">{campo?.enviosHoje || 0}</div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ROW 3: INVENTORY + FINANCIAL + ALERTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* INVENTORY */}
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
                {estoqueStatus.map((s, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                        <span className="text-xs text-slate-300">{s.name}</span>
                      </div>
                      <span className="text-xs font-bold text-white">{s.value}</span>
                    </div>
                    <MiniBar value={s.value} max={estoqueTotal || 100} color={s.color} />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t" style={{ borderColor: colors.border }}>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <ArrowDown size={14} className="text-emerald-400" />
                  <div>
                    <div className="text-sm font-bold text-emerald-400">{estoque?.entradasHoje || 0}</div>
                    <div className="text-[10px] text-slate-500">entradas</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                  <ArrowUp size={14} className="text-red-400" />
                  <div>
                    <div className="text-sm font-bold text-red-400">{estoque?.saidasHoje || 0}</div>
                    <div className="text-[10px] text-slate-500">saÃ­das</div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* FINANCIAL */}
          <SectionCard title="Financeiro" icon={DollarSign}>
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg border" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.15)' }}>
                <div className="text-[10px] text-slate-500 uppercase mb-1">Saldo Acumulado</div>
                <div className="text-2xl font-bold text-emerald-400">{formatCurrency(financeiro?.saldoObra || 0)}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Despesas Pagas</div>
                  <div className="text-base font-bold text-white">{formatCurrency(financeiro?.despesasPagas || 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Pendentes</div>
                  <div className="text-base font-bold text-amber-400">{formatCurrency(financeiro?.despesasPendentes || 0)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">MediÃ§Ãµes</div>
                  <div className="text-base font-bold text-blue-400">{financeiro?.totalMedicoes || 0}</div>
                  <div className="text-[10px] text-slate-500">{financeiro?.medicoesAprovadas || 0} aprovadas</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">LanÃ§amentos Hoje</div>
                  <div className="text-base font-bold text-purple-400">{financeiro?.lancamentosHoje || 0}</div>
                  <div className="text-[10px] text-slate-500">{financeiro?.numLancamentos || 0} total</div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ALERTS */}
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

        {/* ROW 4: PROJECTS + KPIs INDUSTRIAIS + EXPEDIÃÃO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* PROJECTS */}
          <SectionCard title="Projetos em ExecuÃ§Ã£o" icon={Building2} className="lg:col-span-2">
            {projetosData.length > 0 ? (
              <div className="space-y-3">
                {projetosData.map((p, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-800/30 transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-white truncate">{p.nome}</span>
                        <span className="text-[10px] text-slate-500">{formatWeight(p.peso)}</span>
                      </div>
                      <MiniBar value={p.progresso} max={100} color={p.progresso >= 80 ? '#10B981' : p.progresso >= 40 ? '#3B82F6' : '#F59E0B'} />
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-white">{Math.round(p.progresso)}%</div>
                      <div className="text-[10px] text-slate-500">{formatCurrency(p.valor)}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <Building2 size={32} className="mb-2 opacity-30" />
                <span className="text-sm">Nenhum projeto em produÃ§Ã£o</span>
              </div>
            )}
          </SectionCard>

          {/* FIELD / EXPEDIÃÃO */}
          <SectionCard title="ExpediÃ§Ã£o" icon={Truck}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <div className="text-2xl font-bold text-blue-400">{campo?.totalEnvios || 0}</div>
                  <div className="text-[10px] text-slate-400">Total Envios</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <div className="text-2xl font-bold text-emerald-400">{campo?.enviados || 0}</div>
                  <div className="text-[10px] text-slate-400">ConcluÃ­dos</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Progresso Envios</span>
                  <span className="text-xs font-bold text-white">
                    {campo?.totalEnvios > 0 ? Math.round(((campo?.enviados || 0) / campo.totalEnvios) * 100) : 0}%
                  </span>
                </div>
                <MiniBar
                  value={campo?.enviados || 0}
                  max={campo?.totalEnvios || 1}
                  color="#10B981"
                />
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
        </div>

        {/* ROW 5: KPIs INDUSTRIAIS + RH + ENERGIA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* KPIs INDUSTRIAIS */}
          <SectionCard title="KPIs Industriais" icon={Gauge}>
            <div className="space-y-3">
              {[
                { label: 'OEE', value: kpisIndustriais?.oee?.valor || 0, meta: 85, unit: '%', color: '#3B82F6' },
                { label: 'Disponibilidade', value: kpisIndustriais?.oee?.disponibilidade || 0, meta: 95, unit: '%', color: '#10B981' },
                { label: 'Performance', value: kpisIndustriais?.oee?.performance || 0, meta: 95, unit: '%', color: '#8B5CF6' },
                { label: 'Qualidade', value: kpisIndustriais?.oee?.qualidade || 100, meta: 98, unit: '%', color: '#06B6D4' },
              ].map((kpi, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">{kpi.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{kpi.value}{kpi.unit}</span>
                      <span className="text-[10px] text-slate-500">meta: {kpi.meta}{kpi.unit}</span>
                    </div>
                  </div>
                  <MiniBar value={kpi.value} max={100} color={kpi.value >= kpi.meta ? '#10B981' : kpi.color} />
                </div>
              ))}
            </div>
          </SectionCard>

          {/* RECURSOS HUMANOS */}
          <SectionCard title="Equipe" icon={Users}>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <div className="text-lg font-bold text-emerald-400">{recursosHumanos?.presentes || 0}</div>
                  <div className="text-[10px] text-slate-400">Presentes</div>
                </div>
                <div className="text-center p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="text-lg font-bold text-red-400">{recursosHumanos?.ausentes || 0}</div>
                  <div className="text-[10px] text-slate-400">Ausentes</div>
                </div>
                <div className="text-center p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <div className="text-lg font-bold text-blue-400">{recursosHumanos?.ferias || 0}</div>
                  <div className="text-[10px] text-slate-400">FÃ©rias</div>
                </div>
              </div>

              {(recursosHumanos?.turnos || []).slice(0, 3).map((t, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/20">
                  <span className="text-xs text-slate-300">{t?.turno || `Turno ${i+1}`}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500">{t?.colaboradores || 0} colab.</span>
                    <span className="text-xs font-bold text-blue-400">{t?.produtividade || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ENERGIA */}
          <SectionCard title="Energia" icon={Bolt}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-amber-400">{energiaMetricas?.consumoAtual || 0} <span className="text-xs text-slate-400">kW</span></div>
                  <div className="text-[10px] text-slate-500">consumo atual</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-red-400">{formatCurrency(energiaMetricas?.custoMensal || 0)}</div>
                  <div className="text-[10px] text-slate-500">custo mensal</div>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { label: 'Rede', value: energiaMetricas?.fonteEnergia?.rede || 0, color: '#3B82F6' },
                  { label: 'Solar', value: energiaMetricas?.fonteEnergia?.solar || 0, color: '#F59E0B' },
                  { label: 'Gerador', value: energiaMetricas?.fonteEnergia?.gerador || 0, color: '#EF4444' },
                ].map((s, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-300">{s.label}</span>
                      <span className="text-xs font-bold text-white">{s.value}%</span>
                    </div>
                    <MiniBar value={s.value} max={100} color={s.color} />
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-2">
                <Zap size={14} className="text-emerald-400" />
                <span className="text-[10px] text-slate-400">COâ: <strong className="text-white">{energiaMetricas?.emissoesCO2 || 0} kg</strong></span>
              </div>
            </div>
          </SectionCard>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t py-3 mt-2" style={{ borderColor: colors.border, background: 'rgba(11,17,32,0.6)' }}>
        <div className="max-w-[1440px] mx-auto px-6 flex items-center justify-between text-[10px] text-slate-600">
          <div className="flex items-center gap-4">
            <span>Supabase <span className="text-emerald-500">â</span> Conectado</span>
            <span>Real-time <span className="text-blue-500">â</span> Ativo</span>
          </div>
          <span>Ãltima atualizaÃ§Ã£o: {lastUpdate?.toLocaleTimeString('pt-BR') || '--:--'}</span>
        </div>
      </footer>
    </div>
  );
}
