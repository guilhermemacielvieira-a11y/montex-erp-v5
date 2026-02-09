// MONTEX ERP Premium - Command Center Ultrawide
// Integrado com ERPContext - Dados reais da obra SUPER LUNA

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, AlertTriangle, Bell,
  Building2, CheckCircle2, Clock, Cpu, Database, DollarSign, Factory,
  FileText, Gauge, HardDrive, Package,
  Power, Radio, Server, Settings, Shield, Target,
  ThermometerSun, Truck, Users, Wifi,
  Zap,
  BarChart2, Droplets, Wind, Sun, CircuitBoard, Network, Hexagon, Info, XCircle, CheckCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, Line, PieChart as RechartsPie, Pie, Cell,
  RadarChart, Radar as RechartsRadar, PolarGrid, PolarAngleAxis,
  ComposedChart, CartesianGrid
} from 'recharts';

// ERPContext - dados reais
import { useObras, useProducao } from '../contexts/ERPContext';

// Dados financeiros reais
import { LANCAMENTOS_DESPESAS, MEDICOES_RECEITAS, DRE_OBRA } from '../data/obraFinanceiraDatabase';

// Dados simulados para complemento
import { commandCenterData } from '../data/commandCenterData';

// Formatador de moeda
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// ==================== ULTRA-REALISTIC COMPONENTS ====================

// Holographic 3D Ring Component
const HolographicRing3D = ({ value, max = 100, color = '#22d3ee', size = 120, label, sublabel }) => {
  const percentage = (value / max) * 100;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size + 30 }}>
      {/* Outer glow effect */}
      <div className="absolute inset-0 rounded-full blur-xl opacity-30"
        style={{ background: `radial-gradient(circle, ${color}40, transparent 70%)` }} />

      {/* 3D perspective ring */}
      <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: 'perspective(200px) rotateX(15deg)' }}>
        {/* Background rings */}
        {[...Array(3)].map((_, i) => (
          <circle key={i} cx="50" cy="50" r={45 - i * 3} fill="none"
            stroke={`${color}${10 + i * 5}`} strokeWidth="1" opacity={0.3 - i * 0.1} />
        ))}

        {/* Main track */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="6" />

        {/* Animated progress */}
        <motion.circle
          cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, ease: 'easeOut' }}
          transform="rotate(-90 50 50)"
          style={{ filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color}50)` }}
        />

        {/* Inner decorative rings */}
        <motion.circle cx="50" cy="50" r="35" fill="none" stroke={color} strokeWidth="1" opacity="0.2"
          strokeDasharray="4 4" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} />
        <motion.circle cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth="0.5" opacity="0.3"
          strokeDasharray="2 6" animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }} />

        {/* Center value */}
        <text x="50" y="48" textAnchor="middle" className="fill-white font-bold font-mono" fontSize="16"
          style={{ textShadow: `0 0 10px ${color}` }}>
          {typeof value === 'number' ? value.toFixed(0) : value}
        </text>
        <text x="50" y="60" textAnchor="middle" fill="#64748b" fontSize="8" className="font-mono">
          {sublabel || '%'}
        </text>
      </svg>

      {label && (
        <span className="text-[10px] text-slate-400 mt-1 font-medium tracking-wide">{label}</span>
      )}
    </div>
  );
};

// Cyber Border Component
const CyberBorder = ({ children, color = '#22d3ee', className = '' }) => (
  <div className={`relative ${className}`}>
    {/* Corner accents */}
    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: color }} />
    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: color }} />
    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: color }} />
    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: color }} />
    {/* Glowing dots */}
    <motion.div className="absolute top-0 left-0 w-1.5 h-1.5 rounded-full -translate-x-0.5 -translate-y-0.5"
      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
    <motion.div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full translate-x-0.5 -translate-y-0.5"
      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
    {children}
  </div>
);

// Pulse Status Indicator
const PulseStatus = ({ status, size = 8 }) => {
  const colors = {
    online: '#22c55e', running: '#22c55e', active: '#22c55e',
    warning: '#f59e0b', idle: '#f59e0b', syncing: '#f59e0b',
    offline: '#ef4444', error: '#ef4444', maintenance: '#ef4444',
    critical: '#ef4444'
  };
  const color = colors[status] || '#22d3ee';

  return (
    <span className="relative flex" style={{ width: size * 2, height: size * 2 }}>
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: color }}
        animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <span className="relative inline-flex rounded-full h-full w-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
    </span>
  );
};

// Mini Sparkline Chart
const Sparkline = ({ data, color = '#22d3ee', height = 30, width = 80 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#spark-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      <circle cx={width} cy={height - ((data[data.length - 1] - min) / range) * height} r="2"
        fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
};

// Ultra Progress Bar
const UltraProgress = ({ value, color = '#22d3ee', height = 6, showValue = false }) => (
  <div className="relative w-full">
    <div className="w-full rounded-full overflow-hidden"
      style={{ height, background: 'rgba(30,41,59,0.8)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}>
      <motion.div
        className="h-full rounded-full relative overflow-hidden"
        style={{
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          boxShadow: `0 0 10px ${color}50, inset 0 1px 0 rgba(255,255,255,0.2)`
        }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)` }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>
    </div>
    {showValue && (
      <span className="absolute right-0 -top-4 text-[9px] font-mono" style={{ color }}>{value}%</span>
    )}
  </div>
);

// Data Panel Component
const DataPanel = ({ title, icon: Icon, color = '#22d3ee', children, className = '', badge, status }) => (
  <CyberBorder color={color} className={`bg-slate-900/90 backdrop-blur-xl rounded-xl overflow-hidden ${className}`}>
    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50"
      style={{ background: `linear-gradient(90deg, ${color}10, transparent)` }}>
      {Icon && <Icon className="w-4 h-4" style={{ color }} />}
      <span className="text-xs font-bold text-white tracking-wider uppercase">{title}</span>
      {badge && (
        <span className="px-1.5 py-0.5 text-[8px] font-bold rounded ml-auto"
          style={{ background: `${color}30`, color }}>{badge}</span>
      )}
      {status && <PulseStatus status={status} size={4} />}
      {!badge && !status && <PulseStatus status="online" size={3} />}
    </div>
    <div className="p-3">{children}</div>
  </CyberBorder>
);

// Machine Status Card
const MachineCard = ({ machine, color }) => {
  const statusColors = {
    operando: '#22c55e', manutenção: '#ef4444', standby: '#f59e0b', offline: '#64748b'
  };
  const statusColor = statusColors[machine.status] || '#22d3ee';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-2 rounded-lg border transition-all cursor-pointer"
      style={{
        background: `linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.9))`,
        borderColor: `${statusColor}30`,
        boxShadow: machine.status === 'operando' ? `0 0 15px ${statusColor}20` : 'none'
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <PulseStatus status={machine.status === 'operando' ? 'running' : machine.status === 'standby' ? 'idle' : 'error'} size={4} />
        <span className="text-[10px] text-white font-medium truncate flex-1">{machine.nome}</span>
        {machine.status === 'operando' && (
          <span className="text-[9px] font-mono px-1 py-0.5 rounded"
            style={{ background: `${statusColor}20`, color: statusColor }}>{machine.eficiencia}%</span>
        )}
      </div>
      {machine.status === 'operando' && (
        <>
          <UltraProgress value={machine.eficiencia} color={statusColor} height={3} />
          <div className="flex justify-between mt-1.5">
            <span className="text-[8px] text-slate-500">Temp: {machine.temperatura}°C</span>
            <span className="text-[8px] text-cyan-400 font-mono">{machine.ciclos}/h</span>
          </div>
        </>
      )}
    </motion.div>
  );
};

// Alert Card
const AlertCard = ({ alert }) => {
  const typeColors = {
    critico: { bg: '#ef444420', border: '#ef4444', text: '#ef4444', icon: XCircle },
    alerta: { bg: '#f59e0b20', border: '#f59e0b', text: '#f59e0b', icon: AlertTriangle },
    info: { bg: '#22d3ee20', border: '#22d3ee', text: '#22d3ee', icon: Info },
    sucesso: { bg: '#22c55e20', border: '#22c55e', text: '#22c55e', icon: CheckCircle }
  };
  const config = typeColors[alert.tipo] || typeColors.info;
  const AlertIcon = config.icon;

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="p-2 rounded-lg border flex items-start gap-2"
      style={{ background: config.bg, borderColor: `${config.border}50` }}
    >
      <AlertIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: config.text }} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white truncate">{alert.titulo}</p>
        <p className="text-[8px] text-slate-400 mt-0.5">{alert.area} • {alert.tempo}</p>
      </div>
    </motion.div>
  );
};

const COLORS = ['#22d3ee', '#34d399', '#c084fc', '#fbbf24', '#f87171', '#60a5fa', '#f472b6', '#a3e635', '#fb923c', '#818cf8'];

// ==================== MAIN COMPONENT ====================

export default function CommandCenterUltrawide() {
  // ERPContext hooks para dados reais
  const { obras, obraAtualData } = useObras();
  const { pecas } = useProducao();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showBootScreen, setShowBootScreen] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedSection, setSelectedSection] = useState('all');

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Boot sequence
  useEffect(() => {
    const timer = setTimeout(() => setShowBootScreen(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // ==================== DATA CALCULATIONS ====================
  const { producaoTempoReal, maquinasStatus, kpisIndustriais, fluxoFinanceiro,
          pipelineVendas, recursosHumanos, qualidadeMetricas, logisticaMetricas,
          energiaMetricas, alertasInteligentes, indicadoresPorProjeto,
          previsoesTendencias, comparativoPerformance } = commandCenterData;

  const metrics = useMemo(() => {
    // Dados da obra atual
    const obraAtual = obraAtualData || {};

    // Cálculos com dados reais do ERPContext
    const projetosAtivos = obras?.filter(p => ['em_fabricacao', 'em_montagem', 'aprovado'].includes(p.status))?.length || 0;
    const projetosTotal = obras?.length || 0;

    // Dados financeiros reais
    const receitas = MEDICOES_RECEITAS?.reduce((a, m) => a + (m.valor || 0), 0) || 0;
    const despesas = LANCAMENTOS_DESPESAS?.reduce((a, m) => a + (m.valor || 0), 0) || 0;
    const lucro = receitas - despesas;

    // Peso e valor da obra
    const pesoTotal = obraAtual?.peso_total || 0;
    const valorTotal = obraAtual?.valor_total || DRE_OBRA?.valor_total || 0;

    const maquinasOperando = maquinasStatus.filter(m => m.status === 'operando').length;
    const eficienciaMedia = maquinasOperando > 0 ? maquinasStatus.filter(m => m.status === 'operando')
      .reduce((a, m) => a + m.eficiencia, 0) / maquinasOperando : 0;

    return {
      projetosAtivos, projetosTotal,
      pesoTotal: pesoTotal / 1000, valorTotal: valorTotal / 1000000,
      receitas: receitas / 1000000, despesas: despesas / 1000000,
      lucro: lucro / 1000000,
      maquinasOperando, maquinasTotal: maquinasStatus.length,
      eficienciaMedia: Math.round(eficienciaMedia),
      oee: kpisIndustriais.oee.valor,
      mtbf: kpisIndustriais.mtbf.valor,
      mttr: kpisIndustriais.mttr.valor,
      stockAlerts: 0,
      alertasCriticos: alertasInteligentes.filter(a => a.tipo === 'critico').length
    };
  }, [refreshKey, obras, obraAtualData, pecas]);

  // Production trend data
  const productionTrendData = producaoTempoReal.map((item) => ({
    hora: item.hora, producao: item.producao, meta: item.meta
  }));

  // Financial flow data
  const financialData = fluxoFinanceiro.receitasPorDia.slice(0, 10).map(f => ({
    dia: f.dia, valor: f.valor / 1000
  }));

  // Pipeline data
  const pipelineData = pipelineVendas.etapas.map((etapa, i) => ({
    name: etapa.etapa,
    value: etapa.valor / 1000000,
    count: etapa.quantidade,
    color: COLORS[i]
  }));

  // Quality radar data
  const qualityRadarData = [
    { subject: 'Conformidade', A: qualidadeMetricas.conformidade, fullMark: 100 },
    { subject: 'Dimensional', A: 100 - (qualidadeMetricas.defeitosPorTipo[0]?.percentual || 0), fullMark: 100 },
    { subject: 'Solda', A: 100 - (qualidadeMetricas.defeitosPorTipo[1]?.percentual || 0), fullMark: 100 },
    { subject: 'Pintura', A: 100 - (qualidadeMetricas.defeitosPorTipo[2]?.percentual || 0), fullMark: 100 },
    { subject: 'Entrega', A: 95, fullMark: 100 },
    { subject: 'Satisfação', A: 92, fullMark: 100 }
  ];

  // Energy data
  const energyData = energiaMetricas.consumoDiario.map(e => ({
    name: e.hora, consumo: e.consumo
  }));

  // Previsões ML data
  const previsaoData = previsoesTendencias?.producaoProximaSemana || [];

  // Comparativo Performance data
  const comparativoData = [
    { name: 'Produção', atual: comparativoPerformance?.mesAtual?.producao || 0, anterior: comparativoPerformance?.mesAnterior?.producao || 0, meta: comparativoPerformance?.metaMensal?.producao || 0 },
    { name: 'Entregas', atual: comparativoPerformance?.mesAtual?.entregas || 0, anterior: comparativoPerformance?.mesAnterior?.entregas || 0, meta: comparativoPerformance?.metaMensal?.entregas || 0 },
  ];

  // Risco projetos data
  const riscoProjetosData = previsoesTendencias?.riscoProjetos?.map(p => ({
    name: p.projeto.substring(0, 15) + '...',
    score: p.score,
    fill: p.risco === 'alto' ? '#ef4444' : p.risco === 'medio' ? '#f59e0b' : '#22c55e'
  })) || [];

  // KPIs trend data
  const kpiTrendData = kpisIndustriais.oee.tendencia.map((val, i) => ({
    periodo: `S${i + 1}`,
    oee: val,
    mtbf: kpisIndustriais.mtbf.tendencia[i] / 10,
    mttr: kpisIndustriais.mttr.tendencia[i] * 10
  }));

  // Financial extended data
  const financialExtendedData = fluxoFinanceiro.receitasPorDia.map((r, i) => ({
    dia: r.dia,
    receitas: r.valor / 1000,
    despesas: (fluxoFinanceiro.despesasPorDia?.[i]?.valor || r.valor * 0.7) / 1000,
    lucro: (r.valor - (fluxoFinanceiro.despesasPorDia?.[i]?.valor || r.valor * 0.7)) / 1000
  }));

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Animated Cyber Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(192,132,252,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.05),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.05),transparent_50%)]" />

        {/* Grid pattern */}
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 6, repeat: Infinity }}
        />

        {/* Hexagon pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-5">
          <defs>
            <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse">
              <polygon points="25,0 50,14.4 50,43.4 25,57.8 0,43.4 0,14.4" fill="none" stroke="#22d3ee" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexagons)" />
        </svg>

        {/* Scan lines */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-0 right-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${COLORS[i]}40, transparent)` }}
            animate={{ top: ['-5%', '105%'] }}
            transition={{ duration: 8, repeat: Infinity, delay: i * 2, ease: 'linear' }}
          />
        ))}

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              backgroundColor: COLORS[i % COLORS.length],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.3
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.5, 1]
            }}
            transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
      </div>

      {/* Boot Screen */}
      <AnimatePresence>
        {showBootScreen && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center"
          >
            <div className="text-center">
              {/* Animated logo */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: 'spring' }}
                className="relative w-24 h-24 mx-auto mb-6"
              >
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600"
                  animate={{
                    boxShadow: ['0 0 30px rgba(34,211,238,0.3)', '0 0 60px rgba(34,211,238,0.6)', '0 0 30px rgba(34,211,238,0.3)']
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Hexagon className="w-12 h-12 text-white" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-black text-white mb-2 tracking-wider"
              >
                ULTRAWIDE COMMAND
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-cyan-400 font-mono text-sm mb-6"
              >
                49" SUPER ULTRAWIDE • 5120×1440 • DUAL QHD
              </motion.p>

              {/* Loading bar */}
              <motion.div className="w-64 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2 }}
                  style={{ boxShadow: '0 0 20px rgba(34,211,238,0.5)' }}
                />
              </motion.div>

              {/* Boot messages */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-4 font-mono text-[10px] text-slate-500 space-y-1"
              >
                <p>Initializing industrial systems...</p>
                <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }}>
                  Loading real-time data streams...
                </motion.p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 p-2 space-y-2 min-h-screen">

        {/* HEADER BAR */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl px-4 py-2"
          style={{ boxShadow: '0 0 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <motion.div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center"
                animate={{ boxShadow: ['0 0 15px rgba(34,211,238,0.3)', '0 0 25px rgba(34,211,238,0.5)', '0 0 15px rgba(34,211,238,0.3)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Hexagon className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-lg font-black text-white tracking-wider flex items-center gap-2">
                  ULTRAWIDE COMMAND
                  <span className="text-[9px] px-2 py-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 rounded-full font-mono flex items-center gap-1 border border-cyan-500/30">
                    <Radio className="w-2.5 h-2.5" /> LIVE
                  </span>
                </h1>
                <p className="text-[9px] text-slate-500 font-mono tracking-widest">GRUPO MONTEX • INDUSTRIAL SYSTEM v6.0</p>
              </div>
            </div>

            {/* Quick KPIs in Header */}
            <div className="hidden 2xl:flex items-center gap-4 ml-6 pl-6 border-l border-slate-700/50">
              {[
                { label: 'OEE', value: `${metrics.oee}%`, color: '#22d3ee', trend: '+2.3%' },
                { label: 'Máquinas', value: `${metrics.maquinasOperando}/${metrics.maquinasTotal}`, color: '#34d399', status: 'running' },
                { label: 'Projetos', value: metrics.projetosAtivos, color: '#c084fc' },
                { label: 'Alertas', value: metrics.alertasCriticos, color: metrics.alertasCriticos > 0 ? '#ef4444' : '#22c55e', pulse: metrics.alertasCriticos > 0 },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  {stat.status && <PulseStatus status={stat.status} size={3} />}
                  <div className="text-center">
                    <div className="text-sm font-bold font-mono" style={{ color: stat.color, textShadow: `0 0 10px ${stat.color}50` }}>{stat.value}</div>
                    <div className="text-[8px] text-slate-500">{stat.label}</div>
                  </div>
                  {stat.trend && <span className="text-[8px] text-emerald-400">{stat.trend}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* System Status */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
              {[
                { icon: Cpu, value: '67%', color: '#22d3ee' },
                { icon: HardDrive, value: '42%', color: '#34d399' },
                { icon: Wifi, value: '1Gbps', color: '#c084fc' },
                { icon: ThermometerSun, value: '45°C', color: '#fbbf24' },
              ].map((sys, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-1">
                    <sys.icon className="w-3 h-3" style={{ color: sys.color }} />
                    <span className="text-[10px] font-mono" style={{ color: sys.color }}>{sys.value}</span>
                  </div>
                  {i < 3 && <div className="w-px h-3 bg-slate-700" />}
                </React.Fragment>
              ))}
            </div>

            {/* Clock */}
            <CyberBorder color="#22d3ee">
              <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-800/50">
                <Clock className="w-4 h-4 text-cyan-400" />
                <div className="text-xl font-mono font-bold text-cyan-400"
                  style={{ textShadow: '0 0 15px rgba(34,211,238,0.5)' }}>
                  {currentTime.toLocaleTimeString('pt-BR')}
                </div>
                <div className="text-right border-l border-slate-700 pl-3">
                  <div className="text-[9px] text-slate-400">{currentTime.toLocaleDateString('pt-BR', { weekday: 'long' })}</div>
                  <div className="text-[10px] text-white font-medium">{currentTime.toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
            </CyberBorder>

            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition-all"
            >
              <Bell className="w-4 h-4 text-slate-400" />
              {metrics.alertasCriticos > 0 && (
                <motion.span
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {metrics.alertasCriticos}
                </motion.span>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* MAIN GRID - 8 COLUMNS FOR ULTRAWIDE */}
        <div className="grid grid-cols-8 gap-2" style={{ minHeight: 'calc(100vh - 100px)' }}>

          {/* COLUMN 1 - Industrial KPIs */}
          <div className="space-y-2">
            <DataPanel title="KPIs INDUSTRIAIS" icon={Gauge} color="#22d3ee" badge="OEE">
              <div className="flex justify-center mb-3">
                <HolographicRing3D value={metrics.oee} color="#22d3ee" size={100} label="OEE GERAL" sublabel="%" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-slate-800/50 text-center">
                  <div className="text-lg font-bold font-mono text-emerald-400">{metrics.mtbf}h</div>
                  <div className="text-[8px] text-slate-500">MTBF</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/50 text-center">
                  <div className="text-lg font-bold font-mono text-amber-400">{metrics.mttr}h</div>
                  <div className="text-[8px] text-slate-500">MTTR</div>
                </div>
              </div>
            </DataPanel>

            <DataPanel title="QUALIDADE" icon={Shield} color="#34d399">
              <ResponsiveContainer width="100%" height={130}>
                <RadarChart data={qualityRadarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={8} />
                  <RechartsRadar name="Qualidade" dataKey="A" stroke="#34d399" fill="#34d399" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1 mt-2">
                <div className="text-center">
                  <div className="text-sm font-mono text-emerald-400">{qualidadeMetricas.conformidade}%</div>
                  <div className="text-[8px] text-slate-500">Conformidade</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-mono text-amber-400">{qualidadeMetricas.naoConformidades}</div>
                  <div className="text-[8px] text-slate-500">Não Conform.</div>
                </div>
              </div>
            </DataPanel>

            <DataPanel title="TENDÊNCIA KPIs" icon={Activity} color="#60a5fa">
              <ResponsiveContainer width="100%" height={100}>
                <ComposedChart data={kpiTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="periodo" stroke="#64748b" fontSize={8} />
                  <YAxis stroke="#64748b" fontSize={8} />
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 8, fontSize: 9 }} />
                  <Area type="monotone" dataKey="oee" fill="#22d3ee20" stroke="#22d3ee" strokeWidth={2} />
                  <Line type="monotone" dataKey="mtbf" stroke="#34d399" strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex justify-between text-[8px] mt-1">
                <span className="text-cyan-400">● OEE</span>
                <span className="text-emerald-400">● MTBF/10</span>
              </div>
            </DataPanel>

            <DataPanel title="CONEXÕES" icon={Network} color="#818cf8">
              <div className="space-y-1">
                {['ERP Server', 'Database', 'MES', 'SCADA'].map((conn, i) => (
                  <div key={conn} className="flex items-center justify-between p-1 rounded bg-slate-800/30">
                    <div className="flex items-center gap-2">
                      <PulseStatus status="online" size={3} />
                      <span className="text-[8px] text-slate-300">{conn}</span>
                    </div>
                    <span className="text-[7px] font-mono text-slate-500">{5 + i * 3}ms</span>
                  </div>
                ))}
              </div>
            </DataPanel>
          </div>

          {/* COLUMN 2 - Machines */}
          <div className="space-y-2">
            <DataPanel title="MÁQUINAS" icon={Factory} color="#fbbf24" badge={`${metrics.maquinasOperando}/${metrics.maquinasTotal}`}>
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <PulseStatus status="running" size={4} />
                  <span className="text-[10px] text-slate-400">Eficiência Média</span>
                </div>
                <span className="text-sm font-mono font-bold text-emerald-400">{metrics.eficienciaMedia}%</span>
              </div>
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                {maquinasStatus.slice(0, 8).map((machine) => (
                  <MachineCard key={machine.id} machine={machine} />
                ))}
              </div>
            </DataPanel>

            <DataPanel title="ENERGIA" icon={Zap} color="#f59e0b">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-slate-400">Consumo Atual</span>
                <span className="text-sm font-mono text-amber-400">{energiaMetricas.consumoAtual} kWh</span>
              </div>
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={energyData}>
                  <defs>
                    <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="consumo" fill="url(#energyGrad)" stroke="#f59e0b" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </DataPanel>

            <DataPanel title="FONTES ENERGIA" icon={Sun} color="#22c55e">
              <ResponsiveContainer width="100%" height={80}>
                <RechartsPie>
                  <Pie
                    data={[
                      { name: 'Rede', value: energiaMetricas.fonteEnergia.rede, fill: '#64748b' },
                      { name: 'Solar', value: energiaMetricas.fonteEnergia.solar, fill: '#fbbf24' },
                      { name: 'Gerador', value: energiaMetricas.fonteEnergia.gerador, fill: '#f97316' }
                    ]}
                    cx="50%" cy="50%" innerRadius={18} outerRadius={32} dataKey="value" paddingAngle={2}
                  >
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, fontSize: 9 }} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="flex justify-center gap-3 text-[7px]">
                <span className="text-slate-400">■ Rede {energiaMetricas.fonteEnergia.rede}%</span>
                <span className="text-yellow-400">■ Solar {energiaMetricas.fonteEnergia.solar}%</span>
                <span className="text-orange-400">■ Gerador {energiaMetricas.fonteEnergia.gerador}%</span>
              </div>
            </DataPanel>
          </div>

          {/* COLUMN 3 - Production Chart */}
          <div className="col-span-2 space-y-2">
            <DataPanel title="PRODUÇÃO EM TEMPO REAL" icon={Activity} color="#22d3ee" className="h-[calc(50%-4px)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-2xl font-bold text-white">{producaoTempoReal.unidadesHoje}</div>
                    <div className="text-[9px] text-slate-500">Unidades Hoje</div>
                  </div>
                  <div className="h-10 w-px bg-slate-700" />
                  <div>
                    <div className="text-lg font-bold text-emerald-400">{producaoTempoReal.length > 0 ? Math.round(producaoTempoReal.reduce((acc, p) => acc + p.eficiencia, 0) / producaoTempoReal.length) : 0}%</div>
                    <div className="text-[9px] text-slate-500">Eficiência</div>
                  </div>
                </div>
                <Sparkline data={producaoTempoReal.map(p => p.producao)} color="#22d3ee" width={100} height={35} />
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <ComposedChart data={productionTrendData}>
                  <defs>
                    <linearGradient id="prodGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="hora" stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={9} />
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 8, fontSize: 10 }} />
                  <Area type="monotone" dataKey="producao" fill="url(#prodGradient)" stroke="#22d3ee" strokeWidth={2} />
                  <Line type="monotone" dataKey="meta" stroke="#c084fc" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </DataPanel>

            <DataPanel title="FLUXO FINANCEIRO" icon={DollarSign} color="#34d399" className="h-[calc(50%-4px)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-4">
                  <div>
                    <div className="text-lg font-bold text-emerald-400">R${metrics.receitas.toFixed(1)}M</div>
                    <div className="text-[9px] text-slate-500">Receitas</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-400">R${metrics.despesas.toFixed(1)}M</div>
                    <div className="text-[9px] text-slate-500">Despesas</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-cyan-400">R${metrics.lucro.toFixed(1)}M</div>
                    <div className="text-[9px] text-slate-500">Lucro</div>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={financialData}>
                  <defs>
                    <linearGradient id="receitasGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={9} />
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 8, fontSize: 10 }} />
                  <Area type="monotone" dataKey="receitas" fill="url(#receitasGrad)" stroke="#34d399" strokeWidth={2} />
                  <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="lucro" stroke="#22d3ee" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </DataPanel>
          </div>

          {/* COLUMN 5 - Projects */}
          <div className="space-y-2">
            <DataPanel title="PROJETOS ATIVOS" icon={Building2} color="#c084fc" badge={metrics.projetosAtivos}>
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                {indicadoresPorProjeto.slice(0, 4).map((projeto, i) => (
                  <div key={projeto.id} className="p-1.5 rounded-lg bg-slate-800/30 border border-slate-700/30">
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] text-white font-medium truncate flex-1 pr-2">{projeto.nome}</span>
                      <span className="text-[9px] font-mono" style={{ color: COLORS[i] }}>{projeto.progresso}%</span>
                    </div>
                    <UltraProgress value={projeto.progresso} color={COLORS[i]} height={3} />
                  </div>
                ))}
              </div>
            </DataPanel>

            <DataPanel title="RISCO PROJETOS" icon={AlertTriangle} color="#f59e0b">
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={riscoProjetosData} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={8} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={7} width={60} />
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, fontSize: 9 }} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {riscoProjetosData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </DataPanel>

            <DataPanel title="PIPELINE VENDAS" icon={Target} color="#f472b6">
              <div className="flex justify-between mb-1">
                <span className="text-[9px] text-slate-400">Total</span>
                <span className="text-sm font-mono text-pink-400">R${(pipelineVendas.totalPipeline / 1000000).toFixed(1)}M</span>
              </div>
              <ResponsiveContainer width="100%" height={80}>
                <RechartsPie>
                  <Pie data={pipelineData} cx="50%" cy="50%" innerRadius={20} outerRadius={35} dataKey="value" paddingAngle={3}>
                    {pipelineData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(244,114,182,0.3)', borderRadius: 8, fontSize: 9 }} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1">
                {pipelineData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-[7px] text-slate-400">{item.name}</span>
                  </div>
                ))}
              </div>
            </DataPanel>
          </div>

          {/* COLUMN 6 - Logistics */}
          <div className="space-y-2">
            <DataPanel title="LOGÍSTICA" icon={Truck} color="#60a5fa">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-2 rounded-lg bg-slate-800/50 text-center">
                  <div className="text-lg font-bold text-blue-400">{logisticaMetricas.entregasPendentes}</div>
                  <div className="text-[8px] text-slate-500">Pendentes</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/50 text-center">
                  <div className="text-lg font-bold text-emerald-400">{logisticaMetricas.entregas.noPrazo}%</div>
                  <div className="text-[8px] text-slate-500">No Prazo</div>
                </div>
              </div>
              <div className="space-y-1.5">
                {logisticaMetricas.veiculos.slice(0, 4).map((veiculo, i) => (
                  <div key={i} className="p-2 rounded bg-slate-800/30 border border-slate-700/30">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-white truncate">{veiculo.placa} - {veiculo.tipo}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded ${veiculo.status === 'disponivel' ? 'bg-emerald-500/20 text-emerald-400' : veiculo.status === 'em_transito' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {veiculo.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[8px] text-slate-500">{veiculo.destino}</span>
                      <span className="text-[8px] font-mono text-cyan-400">ETA: {veiculo.eta}</span>
                    </div>
                  </div>
                ))}
              </div>
            </DataPanel>

            <DataPanel title="ESTOQUE" icon={Package} color={metrics.stockAlerts > 0 ? '#ef4444' : '#34d399'}>
              {metrics.stockAlerts > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-400 text-[10px]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{metrics.stockAlerts} itens abaixo do mínimo</span>
                  </div>
                  {pecas?.filter(p => p.quantidade < p.minimo)?.slice(0, 3).map((item) => (
                    <div key={item.id} className="p-2 rounded bg-red-500/10 border border-red-500/30">
                      <div className="flex justify-between">
                        <span className="text-[10px] text-white truncate">{item.descricao}</span>
                        <motion.span className="text-[8px] text-red-400" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}>CRÍTICO</motion.span>
                      </div>
                      <div className="text-[8px] text-slate-500 mt-0.5">{item.quantidade}/{item.minimo} {item.unidade}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <span className="text-[11px] text-emerald-400">Estoque Normalizado</span>
                </div>
              )}
            </DataPanel>
          </div>

          {/* COLUMN 7 - Team & Predictions */}
          <div className="space-y-2">
            <DataPanel title="EQUIPE" icon={Users} color="#fbbf24">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-slate-800/50 text-center">
                  <div className="text-lg font-bold text-amber-400">{recursosHumanos.totalColaboradores}</div>
                  <div className="text-[7px] text-slate-500">Total</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-800/50 text-center">
                  <div className="text-lg font-bold text-emerald-400">{recursosHumanos.presentes}</div>
                  <div className="text-[7px] text-slate-500">Presentes</div>
                </div>
              </div>
              <div className="space-y-1">
                {recursosHumanos.setores.slice(0, 4).map((dept, i) => (
                  <div key={dept.setor} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-[8px] text-slate-400 flex-1">{dept.setor}</span>
                    <span className="text-[8px] font-mono" style={{ color: COLORS[i] }}>{dept.presentes}/{dept.total}</span>
                  </div>
                ))}
              </div>
            </DataPanel>

            <DataPanel title="PREVISÃO ML" icon={Activity} color="#a855f7" badge="IA">
              <ResponsiveContainer width="100%" height={90}>
                <ComposedChart data={previsaoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="dia" stroke="#64748b" fontSize={8} />
                  <YAxis stroke="#64748b" fontSize={8} />
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8, fontSize: 9 }} />
                  <Bar dataKey="previsto" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="confianca" stroke="#22d3ee" strokeWidth={2} dot={false} yAxisId={0} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex justify-between text-[7px] mt-1">
                <span className="text-purple-400">■ Produção Prevista</span>
                <span className="text-cyan-400">— Confiança %</span>
              </div>
            </DataPanel>

            <DataPanel title="COMPARATIVO" icon={BarChart2} color="#06b6d4">
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={comparativoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={8} />
                  <YAxis stroke="#64748b" fontSize={8} />
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8, fontSize: 9 }} />
                  <Bar dataKey="anterior" fill="#64748b" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="atual" fill="#22d3ee" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="meta" fill="#34d399" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-3 text-[7px] mt-1">
                <span className="text-slate-400">■ Anterior</span>
                <span className="text-cyan-400">■ Atual</span>
                <span className="text-emerald-400">■ Meta</span>
              </div>
            </DataPanel>

            <DataPanel title="TURNOS" icon={Clock} color="#818cf8">
              <div className="space-y-1.5">
                {recursosHumanos.turnos.map((turno, i) => (
                  <div key={turno.turno} className="p-1.5 rounded bg-slate-800/30">
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] text-white">{turno.turno}</span>
                      <span className="text-[9px] font-mono text-indigo-400">{turno.colaboradores}</span>
                    </div>
                    <UltraProgress value={turno.colaboradores} color={COLORS[i + 3]} height={3} />
                  </div>
                ))}
              </div>
            </DataPanel>
          </div>

          {/* COLUMN 8 - Alerts & Analytics */}
          <div className="space-y-2">
            <DataPanel title="ALERTAS" icon={Bell} color="#ef4444" badge={alertasInteligentes.length} status={metrics.alertasCriticos > 0 ? 'critical' : 'online'}>
              <div className="space-y-1 max-h-[180px] overflow-y-auto">
                {alertasInteligentes.slice(0, 5).map((alert, i) => (
                  <AlertCard key={i} alert={alert} />
                ))}
              </div>
            </DataPanel>

            <DataPanel title="QUALIDADE TREND" icon={Shield} color="#10b981">
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={qualidadeMetricas.tendenciaQualidade}>
                  <defs>
                    <linearGradient id="qualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="semana" stroke="#64748b" fontSize={8} />
                  <YAxis domain={[95, 100]} stroke="#64748b" fontSize={8} />
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 9 }} />
                  <Area type="monotone" dataKey="conformidade" fill="url(#qualGrad)" stroke="#10b981" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </DataPanel>

            <DataPanel title="AÇÕES RÁPIDAS" icon={Zap} color="#fbbf24">
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Projeto', icon: Building2, color: '#22d3ee' },
                  { label: 'Orçamento', icon: FileText, color: '#c084fc' },
                  { label: 'Relatório', icon: BarChart2, color: '#34d399' },
                  { label: 'Config', icon: Settings, color: '#fbbf24' },
                ].map((action) => (
                  <motion.button
                    key={action.label}
                    whileHover={{ scale: 1.03, borderColor: action.color }}
                    whileTap={{ scale: 0.97 }}
                    className="p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 transition-all flex items-center gap-1.5"
                  >
                    <action.icon className="w-3 h-3" style={{ color: action.color }} />
                    <span className="text-[8px] text-slate-300">{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </DataPanel>

            <DataPanel title="AMBIENTE" icon={ThermometerSun} color="#f87171">
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { icon: ThermometerSun, label: 'Temp.', value: '28°C', color: '#f59e0b' },
                  { icon: Droplets, label: 'Umid.', value: '65%', color: '#22d3ee' },
                  { icon: Wind, label: 'Vent.', value: 'OK', color: '#34d399' },
                  { icon: Sun, label: 'Ilum.', value: '850lx', color: '#fbbf24' },
                ].map((env) => (
                  <div key={env.label} className="flex items-center gap-2 p-2 rounded bg-slate-800/30">
                    <env.icon className="w-3.5 h-3.5" style={{ color: env.color }} />
                    <div>
                      <div className="text-[10px] font-mono" style={{ color: env.color }}>{env.value}</div>
                      <div className="text-[8px] text-slate-500">{env.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </DataPanel>
          </div>
        </div>

        {/* BOTTOM STATUS BAR */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl px-4 py-2"
        >
          <div className="flex items-center gap-6">
            {[
              { icon: Factory, label: 'Produção', value: 'ATIVO', color: '#34d399' },
              { icon: Truck, label: 'Logística', value: 'NORMAL', color: '#22d3ee' },
              { icon: Shield, label: 'Segurança', value: '100%', color: '#34d399' },
              { icon: Power, label: 'Energia', value: 'ESTÁVEL', color: '#fbbf24' },
              { icon: Database, label: 'Backup', value: 'SYNC', color: '#c084fc' },
              { icon: Server, label: 'MES', value: 'ONLINE', color: '#60a5fa' },
              { icon: CircuitBoard, label: 'SCADA', value: 'ATIVO', color: '#818cf8' },
              { icon: Wifi, label: 'Rede', value: '1Gbps', color: '#22d3ee' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <item.icon className="w-3 h-3" style={{ color: item.color }} />
                <span className="text-[9px] text-slate-500">{item.label}:</span>
                <span className="text-[9px] font-mono" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[9px] text-slate-500">Atualizado: {currentTime.toLocaleTimeString('pt-BR')}</span>
            <span className="text-[9px] text-slate-600">|</span>
            <span className="text-[9px] text-slate-500">MONTEX ERP v6.0.1</span>
            <span className="text-[9px] text-slate-600">|</span>
            <motion.span
              className="text-[9px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              5120×1440 • 49" SUPER ULTRAWIDE
            </motion.span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
