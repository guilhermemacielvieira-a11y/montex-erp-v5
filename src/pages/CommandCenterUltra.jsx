// MONTEX ERP Premium - Command Center Ultra
// Integrado com ERPContext - Dados reais da obra SUPER LUNA

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Weight, TrendingUp, DollarSign, Factory, Truck, Users,
  Target, Activity, Bell, Layers, Shield, Cpu, Radio,
  Wifi, Radar, Gauge, Terminal, BarChart3,
  Database, Server, Crosshair, AlertTriangle, CheckCircle, Thermometer, Bolt, ArrowUp, ArrowDown
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  ComposedChart, Line, CartesianGrid
} from 'recharts';

// ERPContext - dados reais
import { useObras, useProducao } from '../contexts/ERPContext';

// Dados financeiros reais

// Componentes
import { AnimatedCounter, AnimatedRadar } from '../components/bi/Dynamic3DCharts';

// Mock data fallback para compatibilidade
import {
  producaoTempoReal, maquinasStatus, kpisIndustriais, fluxoFinanceiro, pipelineVendas,
  recursosHumanos, qualidadeMetricas, logisticaMetricas,
  energiaMetricas, alertasInteligentes, indicadoresPorProjeto
} from '../data/commandCenterData';

// Formatador de moeda
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// ============ CYBER COMPONENTS ============

const GlowText = ({ children, color = '#22d3ee', size = 'lg' }) => {
  const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl', xl: 'text-4xl', '2xl': 'text-6xl' };
  return (
    <span className={`font-bold font-mono ${sizes[size]}`} style={{ color, textShadow: `0 0 20px ${color}, 0 0 40px ${color}50` }}>
      {children}
    </span>
  );
};

const CyberBorder = ({ children, color = '#22d3ee', className = '' }) => (
  <div className={`relative ${className}`}>
    <div className="absolute inset-0 rounded-2xl" style={{
      background: `linear-gradient(135deg, ${color}15, transparent 50%, ${color}08)`,
      border: `1px solid ${color}30`,
      boxShadow: `0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px ${color}15`
    }} />
    {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
      <div key={corner} className={`absolute w-8 h-8 ${corner.includes('top') ? 'top-0' : 'bottom-0'} ${corner.includes('left') ? 'left-0' : 'right-0'}`}
        style={{
          borderTop: corner.includes('top') ? `2px solid ${color}60` : 'none',
          borderBottom: corner.includes('bottom') ? `2px solid ${color}60` : 'none',
          borderLeft: corner.includes('left') ? `2px solid ${color}60` : 'none',
          borderRight: corner.includes('right') ? `2px solid ${color}60` : 'none',
        }}
      />
    ))}
    <motion.div className="absolute left-0 right-0 h-px" style={{
      background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
      boxShadow: `0 0 10px ${color}`
    }} animate={{ top: ['0%', '100%'] }} transition={{ duration: 5, repeat: Infinity, ease: 'linear' }} />
    <div className="relative z-10">{children}</div>
  </div>
);

const StatusDot = ({ status, size = 8 }) => {
  const colors = {
    online: '#34d399', offline: '#f87171', warning: '#fbbf24',
    syncing: '#60a5fa', operando: '#34d399', parado: '#f87171'
  };
  return (
    <motion.div className="relative" style={{ width: size, height: size }}
      animate={status === 'syncing' || status === 'operando' ? { scale: [1, 1.2, 1] } : {}}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <div className="absolute inset-0 rounded-full" style={{ background: colors[status] || '#64748b' }} />
      {(status === 'online' || status === 'operando') && (
        <motion.div className="absolute inset-0 rounded-full" style={{ background: colors[status] }}
          animate={{ scale: [1, 2], opacity: [0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

const MiniChart = ({ data, color = '#22d3ee' }) => (
  <div className="h-12 w-24">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data.map((v, i) => ({ v }))}>
        <defs>
          <linearGradient id={`mini-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#mini-${color.replace('#', '')})`} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const HolographicRing = ({ value, max = 100, size = 140, color = '#22d3ee', label, icon: Icon }) => {
  const progress = (value / max) * 100;
  const circumference = 2 * Math.PI * 55;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.div className="absolute inset-0" animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        <svg viewBox="0 0 120 120" className="w-full h-full">
          <circle cx="60" cy="60" r="58" fill="none" stroke={`${color}10`} strokeWidth="0.5" strokeDasharray="2 4" />
        </svg>
      </motion.div>
      <svg viewBox="0 0 120 120" className="w-full h-full absolute inset-0">
        <defs>
          <linearGradient id={`ring-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.3" />
          </linearGradient>
          <filter id={`glow-${label}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <circle cx="60" cy="60" r="55" fill="none" stroke="#1e293b" strokeWidth="4" />
        <motion.circle cx="60" cy="60" r="55" fill="none" stroke={`url(#ring-${label})`}
          strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, ease: 'easeOut' }}
          transform="rotate(-90 60 60)" filter={`url(#glow-${label})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {Icon && <Icon className="w-5 h-5 mb-1" style={{ color }} />}
        <motion.span className="text-2xl font-bold font-mono" style={{ color }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <AnimatedCounter value={value} duration={2} />
        </motion.span>
        <span className="text-[10px] text-slate-400 text-center px-2">{label}</span>
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============

export default function CommandCenterUltra() {
  // Hooks do ERPContext - dados reais da obra
  const { obras, obraAtualData } = useObras();
  const { pecas, maquinas } = useProducao();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showBootSequence, setShowBootSequence] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowBootSequence(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Métricas consolidadas - integradas com dados reais do ERPContext
  const metrics = useMemo(() => {
    const projetosAtivos = obras.filter(p => ['em_fabricacao', 'em_montagem', 'aprovado'].includes(p.status)).length;
    const pesoTotal = obras.reduce((acc, p) => acc + (p.peso_total || 0), 0);
    const valorTotal = obras.reduce((acc, p) => acc + (p.valor_total || 0), 0);
    const progressoMedio = obras.filter(p => p.progresso && p.progresso.geral).reduce((acc, p, _, arr) => acc + (p.progresso.geral || 0) / arr.length, 0);
    const maquinasAtivas = maquinas.filter(m => m.status === 'operando').length;
    const oee = kpisIndustriais.oee.valor;
    return { projetosAtivos, pesoTotal, valorTotal, progressoMedio, maquinasAtivas, oee };
  }, [obras, maquinas]);

  const radarData = [
    { subject: 'Produção', value: kpisIndustriais.oee.valor, fullMark: 100 },
    { subject: 'Qualidade', value: qualidadeMetricas.conformidade, fullMark: 100 },
    { subject: 'Prazo', value: logisticaMetricas.entregas.noPrazo, fullMark: 100 },
    { subject: 'Custo', value: 92, fullMark: 100 },
    { subject: 'Segurança', value: 98, fullMark: 100 },
    { subject: 'Satisfação', value: recursosHumanos.indicadores.satisfacao, fullMark: 100 },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#030712]">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        {[
          { color: 'cyan', x: '-5%', y: '-5%', size: 800 },
          { color: 'purple', x: '85%', y: '75%', size: 600 },
          { color: 'blue', x: '50%', y: '20%', size: 700 },
          { color: 'emerald', x: '15%', y: '85%', size: 500 },
        ].map((orb, i) => (
          <motion.div key={i} className="absolute rounded-full"
            style={{
              left: orb.x, top: orb.y, width: orb.size, height: orb.size,
              background: `radial-gradient(circle, var(--${orb.color}-500) 0%, transparent 70%)`,
              opacity: 0.08, filter: 'blur(100px)'
            }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.12, 0.05] }}
            transition={{ duration: 8 + i * 2, repeat: Infinity, delay: i }}
          />
        ))}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(34,211,238,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.02) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }} />
      </div>

      {/* Boot Sequence */}
      <AnimatePresence>
        {showBootSequence && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 bg-[#030712] flex items-center justify-center"
          >
            <motion.div className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }}
                className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-6"
                style={{ boxShadow: '0 0 60px rgba(34,211,238,0.5)' }}
              >
                <Cpu className="w-12 h-12 text-white" />
              </motion.div>
              <h1 className="text-2xl font-bold text-white tracking-widest mb-2">COMMAND CENTER</h1>
              <div className="text-cyan-400 font-mono text-sm">INITIALIZING ULTRA MODE...</div>
              <motion.div className="w-48 h-1 bg-slate-800 rounded-full mx-auto mt-4 overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.5 }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 p-4 lg:p-6 space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: showBootSequence ? 2 : 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <motion.div className="relative" whileHover={{ scale: 1.05 }}>
              <motion.div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center"
                animate={{ boxShadow: ['0 0 30px rgba(34,211,238,0.3)', '0 0 50px rgba(34,211,238,0.6)', '0 0 30px rgba(34,211,238,0.3)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Crosshair className="h-7 w-7 text-white" />
              </motion.div>
              <div className="absolute -top-1 -right-1"><StatusDot status="online" size={12} /></div>
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                <span style={{ textShadow: '0 0 30px rgba(34,211,238,0.5)' }}>COMMAND CENTER</span>
                <motion.span className="text-xs px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/40 font-mono flex items-center gap-2"
                  animate={{ borderColor: ['rgba(34,211,238,0.4)', 'rgba(34,211,238,0.8)', 'rgba(34,211,238,0.4)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Radio className="w-3 h-3" />ULTRA
                </motion.span>
              </h1>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-slate-500 text-sm font-mono">MONTEX ERP // INDUSTRIAL INTELLIGENCE</p>
                <div className="flex items-center gap-2 px-2 py-0.5 bg-emerald-500/20 rounded text-emerald-400 text-xs">
                  <Shield className="w-3 h-3" />ALL SYSTEMS NOMINAL
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <motion.div className="px-5 py-3 bg-slate-900/80 backdrop-blur-xl rounded-xl border border-cyan-500/30 flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-mono text-cyan-400 font-bold tracking-wider">
                  {currentTime.toLocaleTimeString('pt-BR')}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {currentTime.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
                </div>
              </div>
              <div className="w-px h-10 bg-cyan-500/30" />
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <Database className="w-4 h-4 text-cyan-400" />
                <Server className="w-4 h-4 text-purple-400" />
              </div>
            </motion.div>
            <motion.button className="relative p-3 bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-700/50"
              whileHover={{ scale: 1.05, borderColor: 'rgba(34,211,238,0.5)' }}
            >
              <Bell className="w-5 h-5 text-slate-400" />
              <motion.span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}
              >
                {alertasInteligentes.filter(a => a.tipo === 'critico' || a.tipo === 'urgente').length}
              </motion.span>
            </motion.button>
          </div>
        </motion.div>

        {/* KPI Row - Stats Principais */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'PROJETOS', value: metrics.projetosAtivos, color: '#22d3ee', icon: Building2, trend: kpisIndustriais.oee.tendencia },
            { label: 'PESO (ton)', value: Math.round(metrics.pesoTotal / 1000), color: '#34d399', icon: Weight, trend: [82, 85, 88, 91, 95, 98] },
            { label: 'VALOR (M)', value: `${(metrics.valorTotal / 1000000).toFixed(1)}`, color: '#c084fc', icon: DollarSign, trend: [3.2, 3.5, 3.8, 4.0, 4.2, 4.5] },
            { label: 'OEE %', value: metrics.oee, color: '#fbbf24', icon: Gauge, trend: kpisIndustriais.oee.tendencia },
            { label: 'MÁQUINAS', value: `${metrics.maquinasAtivas}/${maquinasStatus.length}`, color: '#f87171', icon: Cpu, trend: [4, 5, 5, 6, 5, 5] },
            { label: 'QUALIDADE', value: qualidadeMetricas.conformidade, color: '#60a5fa', icon: CheckCircle, trend: qualidadeMetricas.tendenciaQualidade.map(t => t.conformidade) },
          ].map((stat, i) => (
            <motion.div key={stat.label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              whileHover={{ scale: 1.02, y: -3 }}
            >
              <CyberBorder color={stat.color} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <motion.div className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: `${stat.color}20` }}
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                  >
                    <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                  </motion.div>
                  <MiniChart data={stat.trend} color={stat.color} />
                </div>
                <div className="text-3xl font-bold font-mono mb-1" style={{ color: stat.color, textShadow: `0 0 20px ${stat.color}40` }}>
                  {typeof stat.value === 'number' ? <AnimatedCounter value={stat.value} /> : stat.value}
                </div>
                <div className="text-[10px] text-slate-500 font-mono tracking-wider">{stat.label}</div>
              </CyberBorder>
            </motion.div>
          ))}
        </div>

        {/* Main Grid - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column - Machines & Production */}
          <div className="lg:col-span-4 space-y-5">
            {/* Máquinas Status */}
            <CyberBorder color="#22d3ee" className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <motion.div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center"
                    animate={{ boxShadow: ['0 0 0px rgba(34,211,238,0)', '0 0 15px rgba(34,211,238,0.5)', '0 0 0px rgba(34,211,238,0)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Cpu className="w-5 h-5 text-cyan-400" />
                  </motion.div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">MÁQUINAS</h3>
                    <div className="flex items-center gap-2">
                      <StatusDot status="operando" size={6} />
                      <span className="text-[10px] text-slate-500 font-mono">MONITORAMENTO LIVE</span>
                    </div>
                  </div>
                </div>
                <span className="text-cyan-400 font-mono text-sm">{metrics.maquinasAtivas}/{maquinas.length}</span>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {maquinas.map((maq, i) => (
                  <motion.div key={maq.id}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    whileHover={{ scale: 1.01, x: 3 }}
                    className="p-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: maq.status === 'operando' ? 'linear-gradient(135deg, rgba(34,211,238,0.08), transparent)' : 'rgba(248,113,113,0.08)',
                      border: `1px solid ${maq.status === 'operando' ? 'rgba(34,211,238,0.3)' : 'rgba(248,113,113,0.3)'}`
                    }}
                    onClick={() => setSelectedMachine(maq)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StatusDot status={maq.status} />
                        <span className="text-xs font-mono text-white">{maq.id}</span>
                      </div>
                      <span className="text-xs text-slate-500">{maq.utilizacao}%</span>
                    </div>
                    <div className="text-xs text-slate-400 truncate mb-2">{maq.nome}</div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full"
                        style={{
                          background: maq.status === 'operando'
                            ? `linear-gradient(90deg, #22d3ee, #06b6d4)`
                            : '#f87171',
                          boxShadow: maq.status === 'operando' ? '0 0 10px rgba(34,211,238,0.5)' : 'none'
                        }}
                        initial={{ width: 0 }} animate={{ width: `${maq.utilizacao}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                      <span><Thermometer className="w-3 h-3 inline mr-1" />{maq.temperatura}°C</span>
                      <span><Bolt className="w-3 h-3 inline mr-1" />{maq.consumoEnergia}kW</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CyberBorder>

            {/* Produção Tempo Real */}
            <CyberBorder color="#34d399" className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">PRODUÇÃO HOJE</h3>
                  <span className="text-[10px] text-slate-500 font-mono">ATUALIZAÇÃO: 30s</span>
                </div>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={producaoTempoReal}>
                    <defs>
                      <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="hora" stroke="#475569" fontSize={9} />
                    <YAxis stroke="#475569" fontSize={9} />
                    <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="producao" stroke="#34d399" strokeWidth={2} fill="url(#prodGrad)" />
                    <Line type="monotone" dataKey="meta" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { label: 'Realizado', value: producaoTempoReal.reduce((a, b) => a + b.producao, 0), color: '#34d399' },
                  { label: 'Meta', value: producaoTempoReal.reduce((a, b) => a + b.meta, 0), color: '#fbbf24' },
                  { label: 'Eficiência', value: `${producaoTempoReal.length > 0 ? Math.round(producaoTempoReal.reduce((a, b) => a + b.producao, 0) / producaoTempoReal.reduce((a, b) => a + b.meta, 0) * 100) : 0}%`, color: '#22d3ee' },
                ].map(item => (
                  <div key={item.label} className="text-center p-2 rounded-lg" style={{ background: `${item.color}10` }}>
                    <div className="text-lg font-bold font-mono" style={{ color: item.color }}>{item.value}</div>
                    <div className="text-[9px] text-slate-500">{item.label}</div>
                  </div>
                ))}
              </div>
            </CyberBorder>
          </div>

          {/* Center Column - Main Dashboard */}
          <div className="lg:col-span-5 space-y-5">
            {/* KPIs Industriais */}
            <CyberBorder color="#c084fc" className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">KPIs INDUSTRIAIS</h3>
                    <span className="text-[10px] text-slate-500 font-mono">INDICADORES CHAVE</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <HolographicRing value={kpisIndustriais.oee.valor} max={100} size={120} color="#22d3ee" label="OEE" icon={Gauge} />
                <HolographicRing value={kpisIndustriais.produtividade.valor} max={150} size={120} color="#34d399" label="Produtividade" icon={TrendingUp} />
                <HolographicRing value={100 - kpisIndustriais.taxaRetrabalho.valor} max={100} size={120} color="#fbbf24" label="Qualidade" icon={CheckCircle} />
              </div>
              <div className="grid grid-cols-4 gap-3 mt-4">
                {[
                  { label: 'Disponibilidade', value: kpisIndustriais.oee.disponibilidade, meta: 95, color: '#22d3ee' },
                  { label: 'Performance', value: kpisIndustriais.oee.performance, meta: 95, color: '#34d399' },
                  { label: 'MTBF', value: kpisIndustriais.mtbf.valor, meta: 720, unit: 'h', color: '#c084fc' },
                  { label: 'MTTR', value: kpisIndustriais.mttr.valor, meta: 4, unit: 'h', color: '#fbbf24' },
                ].map(kpi => (
                  <div key={kpi.label} className="text-center p-2 rounded-lg border" style={{ borderColor: `${kpi.color}30`, background: `${kpi.color}08` }}>
                    <div className="text-lg font-bold font-mono" style={{ color: kpi.color }}>
                      {kpi.value}{kpi.unit || '%'}
                    </div>
                    <div className="text-[9px] text-slate-500">{kpi.label}</div>
                    <div className="text-[8px] mt-1" style={{ color: kpi.value >= kpi.meta ? '#34d399' : '#fbbf24' }}>
                      Meta: {kpi.meta}{kpi.unit || '%'}
                    </div>
                  </div>
                ))}
              </div>
            </CyberBorder>

            {/* Projetos Ativos */}
            <CyberBorder color="#22d3ee" className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">PROJETOS ATIVOS</h3>
                    <span className="text-[10px] text-slate-500 font-mono">{indicadoresPorProjeto.length} EM EXECUÇÃO</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {indicadoresPorProjeto.map((proj, i) => (
                  <motion.div key={proj.id}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    whileHover={{ scale: 1.01, x: 3 }}
                    className="p-3 rounded-xl transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${proj.risco === 'alto' ? 'rgba(248,113,113,0.08)' : 'rgba(34,211,238,0.05)'}, transparent)`,
                      border: `1px solid ${proj.risco === 'alto' ? 'rgba(248,113,113,0.3)' : 'rgba(34,211,238,0.2)'}`
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${proj.risco === 'alto' ? 'bg-red-500' : proj.risco === 'medio' ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
                        <span className="text-sm text-white font-medium truncate max-w-[180px]">{proj.nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {proj.trending === 'up' && <ArrowUp className="w-3 h-3 text-emerald-400" />}
                        {proj.trending === 'down' && <ArrowDown className="w-3 h-3 text-red-400" />}
                        <span className="text-sm font-mono text-cyan-400">{proj.progresso}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                      <motion.div className="h-full rounded-full relative"
                        style={{
                          background: proj.risco === 'alto'
                            ? 'linear-gradient(90deg, #f87171, #ef4444)'
                            : 'linear-gradient(90deg, #22d3ee, #06b6d4)',
                          boxShadow: '0 0 10px rgba(34,211,238,0.5)'
                        }}
                        initial={{ width: 0 }} animate={{ width: `${proj.progresso}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                      >
                        <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                        />
                      </motion.div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Prazo: {proj.prazo}d</span>
                      <span>Orçamento: {proj.orcamento}%</span>
                      <span>Valor: R$ {(proj.valor.total / 1000000).toFixed(1)}M</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CyberBorder>
          </div>

          {/* Right Column - Alerts & Finance */}
          <div className="lg:col-span-3 space-y-5">
            {/* Alertas */}
            <CyberBorder color="#f87171" className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <motion.div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }}
                  >
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </motion.div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">ALERTAS</h3>
                    <span className="text-[10px] text-slate-500 font-mono">{alertasInteligentes.length} ATIVOS</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {alertasInteligentes.map((alerta, i) => (
                  <motion.div key={alerta.id}
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="p-3 rounded-lg"
                    style={{
                      background: alerta.tipo === 'critico' ? 'rgba(248,113,113,0.15)'
                        : alerta.tipo === 'urgente' ? 'rgba(251,191,36,0.15)'
                        : alerta.tipo === 'sucesso' ? 'rgba(52,211,153,0.15)'
                        : 'rgba(96,165,250,0.15)',
                      border: `1px solid ${
                        alerta.tipo === 'critico' ? 'rgba(248,113,113,0.4)'
                        : alerta.tipo === 'urgente' ? 'rgba(251,191,36,0.4)'
                        : alerta.tipo === 'sucesso' ? 'rgba(52,211,153,0.4)'
                        : 'rgba(96,165,250,0.4)'
                      }`
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            alerta.tipo === 'critico' ? 'bg-red-500/30 text-red-400'
                            : alerta.tipo === 'urgente' ? 'bg-yellow-500/30 text-yellow-400'
                            : alerta.tipo === 'sucesso' ? 'bg-emerald-500/30 text-emerald-400'
                            : 'bg-blue-500/30 text-blue-400'
                          }`}>
                            {alerta.tipo.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-white font-medium truncate">{alerta.titulo}</p>
                        <p className="text-[10px] text-slate-400 truncate">{alerta.mensagem}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CyberBorder>

            {/* Financeiro Resumo */}
            <CyberBorder color="#34d399" className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">FINANCEIRO</h3>
                  <span className="text-[10px] text-slate-500 font-mono">JAN 2026</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-xs text-slate-400">Receitas</span>
                  <span className="text-sm font-mono text-emerald-400">R$ {(fluxoFinanceiro.receitasMes / 1000000).toFixed(2)}M</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <span className="text-xs text-slate-400">Despesas</span>
                  <span className="text-sm font-mono text-red-400">R$ {(fluxoFinanceiro.despesasMes / 1000000).toFixed(2)}M</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <span className="text-xs text-slate-400">Lucro</span>
                  <span className="text-sm font-mono text-cyan-400">R$ {(fluxoFinanceiro.lucroLiquido / 1000000).toFixed(2)}M</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <span className="text-xs text-slate-400">Margem</span>
                  <span className="text-sm font-mono text-purple-400">{fluxoFinanceiro.margemLiquida}%</span>
                </div>
              </div>
              <div className="h-24 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fluxoFinanceiro.receitasPorDia.slice(-15)}>
                    <defs>
                      <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="valor" stroke="#34d399" strokeWidth={2} fill="url(#finGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CyberBorder>

            {/* Performance Radar */}
            <CyberBorder color="#c084fc" className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Radar className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">PERFORMANCE</h3>
                  <span className="text-[10px] text-slate-500 font-mono">VISÃO 360°</span>
                </div>
              </div>
              <div className="flex justify-center">
                <AnimatedRadar data={radarData} color="#c084fc" size={200} />
              </div>
            </CyberBorder>
          </div>
        </div>

        {/* Bottom Row - Extended Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Pipeline de Vendas */}
          <CyberBorder color="#fbbf24" className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">PIPELINE</h3>
                <span className="text-[10px] text-slate-500 font-mono">R$ {(pipelineVendas.totalPipeline / 1000000).toFixed(1)}M TOTAL</span>
              </div>
            </div>
            <div className="space-y-2">
              {pipelineVendas.etapas.map((etapa, i) => (
                <div key={etapa.etapa} className="flex items-center gap-3">
                  <div className="w-20 text-[10px] text-slate-400">{etapa.etapa}</div>
                  <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, #fbbf24, #f59e0b)` }}
                      initial={{ width: 0 }} animate={{ width: `${etapa.conversao}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                    />
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-xs font-mono text-yellow-400">{etapa.quantidade}</span>
                  </div>
                </div>
              ))}
            </div>
          </CyberBorder>

          {/* Recursos Humanos */}
          <CyberBorder color="#60a5fa" className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">EQUIPE</h3>
                <span className="text-[10px] text-slate-500 font-mono">{recursosHumanos.presentes}/{recursosHumanos.totalColaboradores} PRESENTES</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {recursosHumanos.turnos.map(turno => (
                <div key={turno.turno} className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="text-xs text-slate-400">{turno.turno}</div>
                  <div className="text-lg font-mono text-blue-400">{turno.colaboradores}</div>
                  <div className="text-[10px] text-slate-500">Prod: {turno.produtividade}%</div>
                </div>
              ))}
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-xs text-slate-400">Satisfação</div>
                <div className="text-lg font-mono text-emerald-400">{recursosHumanos.indicadores.satisfacao}%</div>
              </div>
            </div>
          </CyberBorder>

          {/* Energia */}
          <CyberBorder color="#34d399" className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Bolt className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">ENERGIA</h3>
                <span className="text-[10px] text-slate-500 font-mono">{energiaMetricas.consumoAtual} kW ATUAL</span>
              </div>
            </div>
            <div className="h-24 mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={energiaMetricas.consumoDiario}>
                  <defs>
                    <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="consumo" stroke="#34d399" strokeWidth={2} fill="url(#energyGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-cyan-500/10">
                <div className="text-sm font-mono text-cyan-400">{energiaMetricas.fonteEnergia.rede}%</div>
                <div className="text-[9px] text-slate-500">Rede</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-yellow-500/10">
                <div className="text-sm font-mono text-yellow-400">{energiaMetricas.fonteEnergia.solar}%</div>
                <div className="text-[9px] text-slate-500">Solar</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-orange-500/10">
                <div className="text-sm font-mono text-orange-400">{energiaMetricas.fonteEnergia.gerador}%</div>
                <div className="text-[9px] text-slate-500">Gerador</div>
              </div>
            </div>
          </CyberBorder>
        </div>

        {/* Footer Status Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-6 py-4 px-6 rounded-2xl"
          style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.05), transparent)', border: '1px solid rgba(34,211,238,0.2)' }}
        >
          {[
            { icon: Factory, label: 'Produção', value: `${maquinas.filter(m => m.status === 'operando').length}/${maquinas.length}`, color: '#34d399' },
            { icon: Truck, label: 'Logística', value: `${logisticaMetricas.expedicoesHoje} EXP`, color: '#60a5fa' },
            { icon: Shield, label: 'Qualidade', value: `${qualidadeMetricas.conformidade}%`, color: '#c084fc' },
            { icon: Bolt, label: 'Energia', value: `${energiaMetricas.consumoAtual}kW`, color: '#fbbf24' },
            { icon: Users, label: 'Equipe', value: `${recursosHumanos.presentes}`, color: '#f87171' },
            { icon: Terminal, label: 'Sistema', value: 'v6.0 ULTRA', color: '#22d3ee' },
          ].map((item, i) => (
            <motion.div key={item.label} className="flex items-center gap-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 + i * 0.1 }}
            >
              <item.icon className="w-4 h-4" style={{ color: item.color }} />
              <span className="text-xs text-slate-500">{item.label}:</span>
              <span className="text-xs font-mono" style={{ color: item.color }}>{item.value}</span>
              {i < 5 && <div className="w-px h-4 bg-slate-700 ml-3" />}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
