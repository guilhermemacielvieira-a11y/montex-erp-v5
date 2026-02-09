// MONTEX ERP Premium - Dashboard Futurista (Command Center HUD)
// Integrado com ERPContext - Dados reais da obra SUPER LUNA

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, TrendingUp, DollarSign, Factory, Truck, Users, Globe, Zap,
  Activity, Bell, Shield, Radio, Wifi,
  Radar, Gauge, Database, Server,
  Crosshair, Clock, AlertTriangle, ArrowUp, ArrowDown,
  Info, XCircle
} from 'lucide-react';
import {
  ResponsiveContainer, RadarChart,
  Radar as RechartsRadar, PolarGrid, PolarAngleAxis
} from 'recharts';

// ERPContext - dados reais
import { useObras, useProducao } from '../contexts/ERPContext';

// Dados financeiros reais
import { LANCAMENTOS_DESPESAS, MEDICOES_RECEITAS } from '../data/obraFinanceiraDatabase';

import { commandCenterData } from '../data/commandCenterData';
import { Globe3D, Gauge3D, AnimatedCounter, CyberGrid } from '@/components/ui/Ultra3DComponents';

// ==================== FUTURISTIC HUD COMPONENTS ====================

const HUDFrame = ({ children, title, icon: Icon, color = '#22d3ee', status = 'online', className = '' }) => (
  <div className={`relative bg-slate-900/80 backdrop-blur-xl rounded-lg overflow-hidden ${className}`}
    style={{ border: `1px solid ${color}30`, boxShadow: `0 0 30px ${color}10, inset 0 0 60px ${color}05` }}>
    {/* Corner brackets */}
    <svg className="absolute top-0 left-0 w-6 h-6" viewBox="0 0 24 24">
      <path d="M2,8 L2,2 L8,2" fill="none" stroke={color} strokeWidth="2" />
    </svg>
    <svg className="absolute top-0 right-0 w-6 h-6" viewBox="0 0 24 24">
      <path d="M16,2 L22,2 L22,8" fill="none" stroke={color} strokeWidth="2" />
    </svg>
    <svg className="absolute bottom-0 left-0 w-6 h-6" viewBox="0 0 24 24">
      <path d="M2,16 L2,22 L8,22" fill="none" stroke={color} strokeWidth="2" />
    </svg>
    <svg className="absolute bottom-0 right-0 w-6 h-6" viewBox="0 0 24 24">
      <path d="M16,22 L22,22 L22,16" fill="none" stroke={color} strokeWidth="2" />
    </svg>

    {/* Header */}
    {title && (
      <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: `${color}30`, background: `linear-gradient(90deg, ${color}10, transparent)` }}>
        {Icon && <Icon className="w-4 h-4" style={{ color }} />}
        <span className="text-xs font-bold tracking-wider text-white">{title}</span>
        <motion.div
          className="w-2 h-2 rounded-full ml-auto"
          style={{ backgroundColor: status === 'online' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#ef4444' }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>
    )}

    <div className="p-4">{children}</div>

    {/* Scan line effect */}
    <motion.div
      className="absolute left-0 right-0 h-px pointer-events-none"
      style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }}
      animate={{ top: ['0%', '100%'] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

const HexagonIndicator = ({ value, label, color = '#22d3ee', size = 80 }) => {
  const hexPoints = (cx, cy, r) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return points.join(' ');
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Outer hexagon glow */}
        <polygon points={hexPoints(50, 50, 45)} fill="none" stroke={color} strokeWidth="1" opacity="0.2" />
        <polygon points={hexPoints(50, 50, 42)} fill="none" stroke={color} strokeWidth="1" opacity="0.3" />
        <polygon points={hexPoints(50, 50, 39)} fill="none" stroke={color} strokeWidth="2" opacity="0.5"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }} />

        {/* Animated inner hexagon */}
        <motion.polygon
          points={hexPoints(50, 50, 35)}
          fill={`${color}20`}
          stroke={color}
          strokeWidth="2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />

        {/* Value */}
        <text x="50" y="48" textAnchor="middle" fill="white" fontSize="16" className="font-bold font-mono">
          {value}
        </text>
        <text x="50" y="62" textAnchor="middle" fill={color} fontSize="8" className="font-mono">
          {label}
        </text>
      </svg>
    </div>
  );
};

const CircularProgress3D = ({ value, max = 100, color = '#22d3ee', size = 120, label, icon: Icon }) => {
  const percentage = (value / max) * 100;
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size + 20 }}>
      <svg viewBox="0 0 120 120" className="w-full" style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.3))' }}>
        {/* Background circles */}
        {[55, 52, 50].map((r, i) => (
          <circle key={i} cx="60" cy="60" r={r} fill="none" stroke={`${color}${10 + i * 5}`} strokeWidth="1" />
        ))}

        {/* Track */}
        <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="8" />

        {/* Progress */}
        <motion.circle
          cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, ease: 'easeOut' }}
          transform="rotate(-90 60 60)"
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}
        />

        {/* Inner decorative */}
        <motion.circle cx="60" cy="60" r="40" fill="none" stroke={color} strokeWidth="0.5" opacity="0.3"
          strokeDasharray="3 3" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} />

        {/* Center content */}
        {Icon && <Icon x="48" y="45" width="24" height="24" style={{ color }} className="lucide" />}
        <text x="60" y="Icon ? 80 : 65" textAnchor="middle" fill="white" fontSize="20" className="font-bold font-mono">
          {value}
        </text>
      </svg>
      {label && <span className="text-[10px] text-slate-400 mt-1">{label}</span>}
    </div>
  );
};

const DataStream = ({ data = [], color = '#22d3ee', height = 60 }) => {
  const [animatedData, setAnimatedData] = useState(data);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedData(prev => {
        const newData = [...prev.slice(1), prev[0]];
        return newData;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const max = Math.max(...animatedData, 1);
  const min = Math.min(...animatedData);
  const range = max - min || 1;

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <defs>
        <linearGradient id="streamGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="streamGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((p, i) => (
        <line key={i} x1="0" y1={height * (1 - p / 100)} x2="100%" y2={height * (1 - p / 100)}
          stroke={`${color}15`} strokeWidth="0.5" />
      ))}

      {/* Area fill */}
      <motion.path
        d={`M 0,${height} ${animatedData.map((v, i) =>
          `L ${(i / (animatedData.length - 1)) * 100}%,${height - ((v - min) / range) * (height - 10)}`
        ).join(' ')} L 100%,${height} Z`}
        fill="url(#streamGradient)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* Line */}
      <motion.path
        d={`M ${animatedData.map((v, i) =>
          `${(i / (animatedData.length - 1)) * 100}%,${height - ((v - min) / range) * (height - 10)}`
        ).join(' L ')}`}
        fill="none" stroke={color} strokeWidth="2" filter="url(#streamGlow)"
      />

      {/* Current value indicator */}
      <motion.circle
        cx="100%"
        cy={height - ((animatedData[animatedData.length - 1] - min) / range) * (height - 10)}
        r="4" fill={color}
        animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1, repeat: Infinity }}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </svg>
  );
};

const MachineGrid = ({ machines }) => {
  const statusColors = { operando: '#22c55e', standby: '#f59e0b', 'manutenção': '#ef4444', offline: '#64748b' };

  return (
    <div className="grid grid-cols-4 gap-2">
      {machines.slice(0, 12).map((m, i) => {
        const color = statusColors[m.status] || '#22d3ee';
        return (
          <motion.div
            key={m.id}
            className="aspect-square rounded-lg relative overflow-hidden cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${color}20, ${color}05)`,
              border: `1px solid ${color}40`
            }}
            whileHover={{ scale: 1.05, boxShadow: `0 0 20px ${color}40` }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            {/* Status indicator */}
            <motion.div
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
              animate={m.status === 'operando' ? { scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            />

            {/* Machine icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Factory className="w-4 h-4" style={{ color }} />
            </div>

            {/* Efficiency bar */}
            {m.status === 'operando' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                <motion.div
                  className="h-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${m.eficiencia}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            )}

            {/* Hover tooltip */}
            <div className="absolute inset-0 bg-slate-900/90 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1">
              <span className="text-[7px] text-white truncate w-full text-center">{m.nome}</span>
              {m.status === 'operando' && (
                <span className="text-[9px] font-mono" style={{ color }}>{m.eficiencia}%</span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const COLORS = ['#22d3ee', '#34d399', '#c084fc', '#fbbf24', '#f87171', '#60a5fa', '#f472b6', '#a3e635'];

// ==================== MAIN COMPONENT ====================

export default function DashboardFuturista() {
  // ERPContext - dados reais
  const { obras, obraAtualData } = useObras();
  const { pecas } = useProducao();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showBootScreen, setShowBootScreen] = useState(true);
  const [activeView, setActiveView] = useState('hud');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowBootScreen(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const { producaoTempoReal, maquinasStatus, kpisIndustriais, fluxoFinanceiro,
          pipelineVendas, recursosHumanos, qualidadeMetricas, logisticaMetricas,
          energiaMetricas, alertasInteligentes, indicadoresPorProjeto } = commandCenterData;

  // Métricas usando dados reais do ERPContext e dados financeiros
  const metrics = useMemo(() => {
    const projetosAtivos = obras.filter(p => ['em_fabricacao', 'em_montagem', 'aprovado', 'execucao'].includes(p.status)).length;
    const valorTotal = obras.reduce((acc, p) => acc + (p.valor || 0), 0);

    // Dados financeiros reais
    const receitas = MEDICOES_RECEITAS.reduce((a, m) => a + m.valor, 0);
    const despesas = LANCAMENTOS_DESPESAS.reduce((a, d) => a + d.valor, 0);

    const maquinasOperando = maquinasStatus.filter(m => m.status === 'operando').length;

    return {
      projetosAtivos, projetosTotal: obras.length,
      valorTotal: valorTotal / 1000000,
      receitas: receitas / 1000000, despesas: despesas / 1000000,
      lucro: (receitas - despesas) / 1000000,
      oee: kpisIndustriais.oee.atual,
      mtbf: kpisIndustriais.mtbf.atual,
      mttr: kpisIndustriais.mttr.atual,
      maquinasOperando, maquinasTotal: maquinasStatus.length,
      eficienciaMedia: Math.round(maquinasStatus.filter(m => m.status === 'operando').reduce((a, m) => a + m.eficiencia, 0) / maquinasOperando || 0),
      alertasCriticos: alertasInteligentes.filter(a => a.tipo === 'critico').length
    };
  }, [obras]);

  const productionData = producaoTempoReal.porHora;
  const radarData = [
    { subject: 'OEE', A: metrics.oee || 0 },
    { subject: 'Qualidade', A: qualidadeMetricas?.taxaAprovacao || 0 },
    { subject: 'Entrega', A: logisticaMetricas?.taxaEntregaNoPrazo || 0 },
    { subject: 'Custo', A: 0 },
    { subject: 'Segurança', A: 0 },
    { subject: 'Moral', A: 0 }
  ];

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* HUD Background */}
      <div className="fixed inset-0 pointer-events-none">
        <CyberGrid color="#22d3ee" opacity={0.04} />

        {/* Radial gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.1),transparent_70%)]" />
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.08),transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_bottom_right,rgba(192,132,252,0.08),transparent_50%)]" />

        {/* Hexagon pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-5">
          <defs>
            <pattern id="hexPattern" width="60" height="52" patternUnits="userSpaceOnUse">
              <polygon points="30,0 60,15 60,45 30,60 0,45 0,15" fill="none" stroke="#22d3ee" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexPattern)" />
        </svg>

        {/* Animated rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {[200, 300, 400, 500].map((size, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border"
              style={{
                width: size, height: size,
                left: -size / 2, top: -size / 2,
                borderColor: `rgba(34,211,238,${0.1 - i * 0.02})`
              }}
              animate={{ rotate: i % 2 === 0 ? 360 : -360, scale: [1, 1.02, 1] }}
              transition={{ duration: 30 + i * 10, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        </div>
      </div>

      {/* Boot Screen */}
      <AnimatePresence>
        {showBootScreen && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, 360] }}
                transition={{ duration: 1, type: 'spring' }}
                className="relative w-24 h-24 mx-auto mb-6"
              >
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: '3px solid #22d3ee', borderTopColor: 'transparent' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Crosshair className="w-10 h-10 text-white" />
                </div>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-black text-white mb-2"
              >
                COMMAND CENTER
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-cyan-400 font-mono text-sm"
              >
                INITIALIZING HUD INTERFACE...
              </motion.p>
              <motion.div className="w-48 h-1 bg-slate-800 rounded-full mx-auto mt-4 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.5 }}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 p-4 space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-slate-900/90 backdrop-blur-xl rounded-lg px-6 py-3"
          style={{ border: '1px solid rgba(34,211,238,0.3)', boxShadow: '0 0 30px rgba(34,211,238,0.1)' }}
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="w-12 h-12 rounded-full flex items-center justify-center relative"
              style={{ background: 'linear-gradient(135deg, #22d3ee20, #22d3ee05)', border: '2px solid #22d3ee' }}
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: '1px solid #22d3ee' }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <Crosshair className="w-6 h-6 text-cyan-400" />
            </motion.div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wider flex items-center gap-2">
                COMMAND CENTER
                <motion.span
                  className="text-[9px] px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded font-mono flex items-center gap-1"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Radio className="w-2.5 h-2.5" /> LIVE
                </motion.span>
              </h1>
              <p className="text-[10px] text-cyan-400/60 font-mono">GRUPO MONTEX • HUD INTERFACE v6.0</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick stats */}
            <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
              {[
                { label: 'OEE', value: `${metrics.oee}%`, color: '#22d3ee' },
                { label: 'Máquinas', value: `${metrics.maquinasOperando}/${metrics.maquinasTotal}`, color: '#34d399' },
                { label: 'Alertas', value: metrics.alertasCriticos, color: metrics.alertasCriticos > 0 ? '#ef4444' : '#22c55e' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-sm font-mono font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[8px] text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Clock */}
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-lg border border-cyan-500/30">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-xl font-mono font-bold text-cyan-400" style={{ textShadow: '0 0 20px rgba(34,211,238,0.5)' }}>
                {currentTime.toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column - KPIs */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            {/* OEE Hexagon */}
            <HUDFrame title="OEE GERAL" icon={Gauge} color="#22d3ee">
              <div className="flex justify-center">
                <HexagonIndicator value={metrics.oee} label="%" color="#22d3ee" size={100} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="text-center p-2 rounded bg-slate-800/50">
                  <div className="text-lg font-mono font-bold text-emerald-400">{metrics.mtbf}h</div>
                  <div className="text-[8px] text-slate-500">MTBF</div>
                </div>
                <div className="text-center p-2 rounded bg-slate-800/50">
                  <div className="text-lg font-mono font-bold text-amber-400">{metrics.mttr}h</div>
                  <div className="text-[8px] text-slate-500">MTTR</div>
                </div>
              </div>
            </HUDFrame>

            {/* Projects */}
            <HUDFrame title="PROJETOS" icon={Building2} color="#c084fc">
              <div className="flex items-center justify-between mb-3">
                <CircularProgress3D value={metrics.projetosAtivos} max={10} color="#c084fc" size={80} label="Ativos" />
                <div className="text-right">
                  <div className="text-2xl font-mono font-bold text-purple-400">{metrics.projetosAtivos}</div>
                  <div className="text-[10px] text-slate-500">de {metrics.projetosTotal} total</div>
                </div>
              </div>
              <div className="space-y-1">
                {indicadoresPorProjeto.slice(0, 3).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 p-1.5 rounded bg-slate-800/30">
                    <div className="w-1 h-6 rounded" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-[9px] text-slate-300 flex-1 truncate">{p.nome}</span>
                    <span className="text-[9px] font-mono" style={{ color: COLORS[i] }}>{p.progresso}%</span>
                  </div>
                ))}
              </div>
            </HUDFrame>

            {/* Financial */}
            <HUDFrame title="FINANCEIRO" icon={DollarSign} color="#34d399">
              <div className="space-y-3">
                {[
                  { label: 'Receitas', value: `R$${metrics.receitas.toFixed(1)}M`, color: '#34d399', icon: ArrowUp },
                  { label: 'Despesas', value: `R$${metrics.despesas.toFixed(1)}M`, color: '#ef4444', icon: ArrowDown },
                  { label: 'Lucro', value: `R$${metrics.lucro.toFixed(1)}M`, color: '#22d3ee', icon: TrendingUp },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-slate-800/30">
                    <item.icon className="w-4 h-4" style={{ color: item.color }} />
                    <span className="text-[10px] text-slate-400 flex-1">{item.label}</span>
                    <span className="text-sm font-mono font-bold" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </HUDFrame>
          </div>

          {/* Center Column - Main displays */}
          <div className="col-span-12 lg:col-span-6 space-y-4">
            {/* Production Stream */}
            <HUDFrame title="PRODUÇÃO EM TEMPO REAL" icon={Activity} color="#22d3ee">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-3xl font-bold text-white">{producaoTempoReal.unidadesHoje}</div>
                    <div className="text-[10px] text-slate-500">Unidades Produzidas Hoje</div>
                  </div>
                  <div className="h-12 w-px bg-slate-700" />
                  <div>
                    <div className="text-xl font-bold text-emerald-400">{producaoTempoReal.eficienciaGeral}%</div>
                    <div className="text-[10px] text-slate-500">Eficiência Geral</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-emerald-500"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-[10px] text-emerald-400">STREAMING</span>
                </div>
              </div>
              <DataStream data={productionData} color="#22d3ee" height={120} />
            </HUDFrame>

            {/* Machine Grid */}
            <HUDFrame title="MONITORAMENTO DE MÁQUINAS" icon={Factory} color="#fbbf24">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500" />
                    <span className="text-[10px] text-slate-400">Operando ({metrics.maquinasOperando})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-500" />
                    <span className="text-[10px] text-slate-400">Standby</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span className="text-[10px] text-slate-400">Manutenção</span>
                  </div>
                </div>
                <div className="text-sm font-mono text-amber-400">
                  Eficiência: {metrics.eficienciaMedia}%
                </div>
              </div>
              <MachineGrid machines={maquinasStatus} />
            </HUDFrame>

            {/* Performance Radar */}
            <div className="grid grid-cols-2 gap-4">
              <HUDFrame title="RADAR DE PERFORMANCE" icon={Radar} color="#c084fc">
                <ResponsiveContainer width="100%" height={150}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={9} />
                    <RechartsRadar name="Performance" dataKey="A" stroke="#c084fc" fill="#c084fc" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </HUDFrame>

              <HUDFrame title="3D GLOBE" icon={Globe} color="#60a5fa">
                <div className="flex justify-center">
                  <Globe3D size={150} color="#60a5fa" rotationSpeed={0.3} />
                </div>
              </HUDFrame>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            {/* Alerts */}
            <HUDFrame title="ALERTAS INTELIGENTES" icon={Bell} color={metrics.alertasCriticos > 0 ? '#ef4444' : '#22c55e'}
              status={metrics.alertasCriticos > 0 ? 'warning' : 'online'}>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alertasInteligentes.slice(0, 6).map((alert, i) => {
                  const colors = { critico: '#ef4444', alerta: '#f59e0b', info: '#22d3ee', sucesso: '#22c55e' };
                  const color = colors[alert.tipo] || '#22d3ee';
                  return (
                    <motion.div
                      key={i}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-2 p-2 rounded"
                      style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                    >
                      {alert.tipo === 'critico' ? <XCircle className="w-3.5 h-3.5 mt-0.5" style={{ color }} /> :
                       alert.tipo === 'alerta' ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5" style={{ color }} /> :
                       <Info className="w-3.5 h-3.5 mt-0.5" style={{ color }} />}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white truncate">{alert.titulo}</p>
                        <p className="text-[8px] text-slate-500">{alert.area} • {alert.tempo}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </HUDFrame>

            {/* Team */}
            <HUDFrame title="RECURSOS HUMANOS" icon={Users} color="#f472b6">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="text-center p-2 rounded bg-slate-800/50">
                  <AnimatedCounter value={recursosHumanos.totalColaboradores} color="#f472b6" size="md" />
                  <div className="text-[8px] text-slate-500 mt-1">Total</div>
                </div>
                <div className="text-center p-2 rounded bg-slate-800/50">
                  <AnimatedCounter value={recursosHumanos.presentes} color="#22c55e" size="md" />
                  <div className="text-[8px] text-slate-500 mt-1">Presentes</div>
                </div>
              </div>
              <div className="space-y-1.5">
                {recursosHumanos.turnos.map((turno, i) => (
                  <div key={turno.turno} className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-400 w-16">{turno.turno}</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
                      <motion.div
                        className="h-full rounded"
                        style={{ backgroundColor: COLORS[i + 3] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${turno.produtividade}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                    <span className="text-[9px] font-mono" style={{ color: COLORS[i + 3] }}>{turno.colaboradores}</span>
                  </div>
                ))}
              </div>
            </HUDFrame>

            {/* Quality */}
            <HUDFrame title="QUALIDADE" icon={Shield} color="#34d399">
              <div className="flex justify-between mb-3">
                <HexagonIndicator value={qualidadeMetricas.taxaAprovacao} label="Aprovação" color="#34d399" size={70} />
                <HexagonIndicator value={100 - qualidadeMetricas.retrabalho} label="Eficiência" color="#22d3ee" size={70} />
              </div>
              <div className="space-y-1.5">
                {[
                  { label: 'Precisão Dimensional', value: `${qualidadeMetricas.precisaoDimensional}%`, color: '#34d399' },
                  { label: 'Taxa Retrabalho', value: `${qualidadeMetricas.retrabalho}%`, color: '#f59e0b' },
                  { label: 'Refugo', value: `${qualidadeMetricas.refugo}%`, color: '#ef4444' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-1.5 rounded bg-slate-800/30">
                    <span className="text-[9px] text-slate-400">{item.label}</span>
                    <span className="text-[10px] font-mono" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </HUDFrame>

            {/* Energy */}
            <HUDFrame title="ENERGIA" icon={Zap} color="#f59e0b">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400">Consumo Atual</span>
                <span className="text-lg font-mono font-bold text-amber-400">{energiaMetricas.consumoAtual} kWh</span>
              </div>
              <Gauge3D value={energiaMetricas.consumoAtual} max={1000} color="#f59e0b" size={100} label="kWh" />
            </HUDFrame>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-slate-900/90 backdrop-blur-xl rounded-lg px-4 py-2"
          style={{ border: '1px solid rgba(34,211,238,0.2)' }}
        >
          <div className="flex items-center gap-6">
            {[
              { icon: Factory, label: 'Produção', value: 'ATIVO', color: '#34d399' },
              { icon: Truck, label: 'Logística', value: 'NORMAL', color: '#22d3ee' },
              { icon: Shield, label: 'Segurança', value: '100%', color: '#34d399' },
              { icon: Database, label: 'Backup', value: 'SYNC', color: '#c084fc' },
              { icon: Server, label: 'API', value: 'ONLINE', color: '#60a5fa' },
              { icon: Wifi, label: 'Rede', value: '1Gbps', color: '#22d3ee' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                <span className="text-[9px] text-slate-500">{item.label}:</span>
                <span className="text-[9px] font-mono" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[9px] text-slate-500">{currentTime.toLocaleTimeString('pt-BR')}</span>
            <span className="text-[9px] text-slate-600">|</span>
            <motion.span
              className="text-[9px] font-mono text-cyan-400"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              COMMAND CENTER HUD v6.0
            </motion.span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
