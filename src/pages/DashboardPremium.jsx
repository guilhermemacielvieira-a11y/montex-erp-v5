// MONTEX ERP Premium - Dashboard Premium
// Integrado com ERPContext - Dados reais da obra SUPER LUNA

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Import hooks
import { useResolution } from '../hooks/useResolution';

// ERPContext - dados reais
import { useObras, useProducao, useEstoque, useMedicoes } from '../contexts/ERPContext';

// Import complementary data
import { commandCenterData } from '../data/commandCenterData';

// Import financial data
import { DRE_OBRA, COMPOSICAO_CONTRATO } from '../data/obraFinanceiraDatabase';
import {
  Building2, DollarSign, Bell, Activity, Target, Globe, Layers,
  Clock, Users, Factory, Truck, Shield, BarChart3,
  Cpu, HardDrive, Wifi, Play, Pause,
  ArrowUp, ArrowDown, Gauge, Database, Server, Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  ComposedChart, Line, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';

// Import 3D Components
import {
  Globe3D, BarChart3D, DonutChart3D,
  AnimatedCounter, HolographicCard, CyberGrid
} from '@/components/ui/Ultra3DComponents';

// ==================== ULTRA COMPONENTS ====================

const PulseIndicator = ({ status = 'online', size = 8 }) => {
  const colors = { online: '#22c55e', warning: '#f59e0b', offline: '#ef4444', syncing: '#22d3ee' };
  const color = colors[status] || colors.online;
  return (
    <span className="relative flex" style={{ width: size * 2, height: size * 2 }}>
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full"
        style={{ backgroundColor: color }}
        animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <span className="relative inline-flex rounded-full h-full w-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
    </span>
  );
};

const CyberBorder = ({ children, color = '#22d3ee', className = '', glow = true }) => (
  <div className={`relative ${className}`}>
    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: color }} />
    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: color }} />
    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: color }} />
    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: color }} />
    {glow && (
      <>
        <motion.div className="absolute top-0 left-0 w-2 h-2 rounded-full -translate-x-1 -translate-y-1"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }} />
        <motion.div className="absolute bottom-0 right-0 w-2 h-2 rounded-full translate-x-1 translate-y-1"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
      </>
    )}
    {children}
  </div>
);

const UltraStatCard = ({ title, value, subtitle, icon: Icon, color = '#22d3ee', trend, sparkData = [], onClick }) => (
  <HolographicCard color={color} className="p-4 bg-slate-900/80 backdrop-blur-xl cursor-pointer hover:bg-slate-900/90 transition-all">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4" style={{ color }} />
          <span className="text-xs text-slate-400 font-medium">{title}</span>
          <PulseIndicator status="online" size={3} />
        </div>
        <div className="flex items-baseline gap-2">
          <AnimatedCounter value={parseFloat(value) || 0} color={color} size="md" />
          {trend && (
            <span className={`text-xs flex items-center gap-0.5 ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        {subtitle && <p className="text-[10px] text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {sparkData.length > 0 && (
        <div className="ml-2">
          <svg width="60" height="30">
            <defs>
              <linearGradient id={`spark-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {(() => {
              const max = Math.max(...sparkData);
              const min = Math.min(...sparkData);
              const range = max - min || 1;
              const points = sparkData.map((v, i) =>
                `${(i / (sparkData.length - 1)) * 60},${30 - ((v - min) / range) * 25}`
              ).join(' ');
              return (
                <>
                  <polygon points={`0,30 ${points} 60,30`} fill={`url(#spark-${title})`} />
                  <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
                </>
              );
            })()}
          </svg>
        </div>
      )}
    </div>
  </HolographicCard>
);

const MachineStatusWidget = ({ machines = [] }) => {
  const defaultMachines = [];
  const machineList = machines.length > 0 ? machines : defaultMachines;
  const operando = machineList.filter(m => m.status === 'operando').length;
  const total = machineList.length;

  return (
    <HolographicCard color="#fbbf24" className="p-4 bg-slate-900/80 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Factory className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-white font-bold">MÁQUINAS</span>
        </div>
        <span className="text-lg font-mono font-bold text-amber-400">{operando}/{total}</span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {machineList.slice(0, 8).map((m, i) => (
          <motion.div
            key={m.id}
            className="aspect-square rounded-lg flex items-center justify-center relative overflow-hidden"
            style={{
              background: m.status === 'operando' ? 'rgba(34,197,94,0.2)' :
                         m.status === 'standby' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
              border: `1px solid ${m.status === 'operando' ? '#22c55e' : m.status === 'standby' ? '#f59e0b' : '#ef4444'}30`
            }}
            whileHover={{ scale: 1.1 }}
          >
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: m.status === 'operando' ? '#22c55e' : m.status === 'standby' ? '#f59e0b' : '#ef4444' }}
              animate={m.status === 'operando' ? { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            />
            {m.status === 'operando' && (
              <span className="absolute bottom-0 left-0 right-0 text-[7px] text-center text-emerald-400 font-mono">
                {m.eficiencia}%
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </HolographicCard>
  );
};

const AlertsWidget = ({ alerts = [] }) => {
  const defaultAlerts = [];
  const alertList = alerts.length > 0 ? alerts : defaultAlerts;
  const criticos = alertList.filter(a => a.tipo === 'critico').length;

  return (
    <HolographicCard color={criticos > 0 ? '#ef4444' : '#22c55e'} className="p-4 bg-slate-900/80 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" style={{ color: criticos > 0 ? '#ef4444' : '#22c55e' }} />
          <span className="text-xs text-white font-bold">ALERTAS</span>
        </div>
        {criticos > 0 && (
          <motion.span
            className="px-2 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 rounded"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {criticos} CRÍTICOS
          </motion.span>
        )}
      </div>
      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {alertList.slice(0, 4).map((alert, i) => (
          <motion.div
            key={i}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-2 p-1.5 rounded text-[10px]"
            style={{
              background: alert.tipo === 'critico' ? 'rgba(239,68,68,0.1)' :
                         alert.tipo === 'alerta' ? 'rgba(245,158,11,0.1)' : 'rgba(34,211,238,0.1)'
            }}
          >
            <span className={alert.tipo === 'critico' ? 'text-red-400' : alert.tipo === 'alerta' ? 'text-amber-400' : 'text-cyan-400'}>
              {alert.tipo === 'critico' ? '⚠️' : alert.tipo === 'alerta' ? '⚡' : 'ℹ️'}
            </span>
            <span className="text-slate-300 truncate flex-1">{alert.titulo}</span>
          </motion.div>
        ))}
      </div>
    </HolographicCard>
  );
};

const COLORS = ['#22d3ee', '#34d399', '#c084fc', '#fbbf24', '#f87171', '#60a5fa', '#f472b6', '#a3e635'];

// ==================== MAIN COMPONENT ====================

export default function DashboardPremium() {
  // ERPContext - dados reais
  const { obras, obraAtualData } = useObras();
  const { pecas } = useProducao();
  const { estoque } = useEstoque();
  const { medicoes } = useMedicoes();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLive, setIsLive] = useState(true);
  const [showBootScreen, setShowBootScreen] = useState(true);

  // Hook de resolução para dimensionamento automático
  const resolution = useResolution();
  const { viewport, currentBreakpoint, isUltrawide, recommendedColumns } = resolution;

  // Configurações dinâmicas baseadas no tamanho da tela
  const dynamicSizes = useMemo(() => {
    const width = viewport?.width || 1920;
    const height = viewport?.height || 1080;

    // Fator de escala baseado na largura (referência: 1920px)
    const scaleFactor = Math.min(Math.max(width / 1920, 0.6), 1.5);
    const heightFactor = Math.min(Math.max(height / 1080, 0.6), 1.5);

    return {
      // Tamanhos de gráficos
      chartHeight: Math.round(180 * heightFactor),
      chartHeightLarge: Math.round(200 * heightFactor),
      radarHeight: Math.round(140 * heightFactor),

      // Tamanhos de componentes 3D
      globeSize: Math.round(160 * scaleFactor),
      donutSize: Math.round(140 * scaleFactor),
      barChartHeight: Math.round(180 * heightFactor),

      // Padding e espaçamentos
      padding: currentBreakpoint === 'xs' || currentBreakpoint === 'sm' ? 2 : 4,
      gap: currentBreakpoint === 'xs' || currentBreakpoint === 'sm' ? 2 : 4,

      // Grid columns para diferentes seções
      mainGridCols: isUltrawide ? 'grid-cols-12' : 'grid-cols-12',
      leftColSpan: isUltrawide ? 'col-span-2' : 'col-span-12 lg:col-span-3',
      centerColSpan: isUltrawide ? 'col-span-8' : 'col-span-12 lg:col-span-6',
      rightColSpan: isUltrawide ? 'col-span-2' : 'col-span-12 lg:col-span-3',
      bottomColSpan: isUltrawide ? 'col-span-4' : 'col-span-12 md:col-span-4',

      // Tamanhos de fonte dinâmicos
      titleSize: scaleFactor < 0.8 ? 'text-lg' : 'text-xl',
      subtitleSize: scaleFactor < 0.8 ? 'text-xs' : 'text-sm',

      // Escala geral
      scale: scaleFactor,
      heightScale: heightFactor,
    };
  }, [viewport, currentBreakpoint, isUltrawide]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowBootScreen(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const { maquinasStatus = [], kpisIndustriais = {}, fluxoFinanceiro = {}, alertasInteligentes = [],
          producaoTempoReal = {}, pipelineVendas = {}, recursosHumanos = {}, qualidadeMetricas = {} } = commandCenterData || {};

  // Métricas usando dados reais do ERPContext
  const metrics = useMemo(() => {
    const obrasAtivas = obras.filter(o => ['em_fabricacao', 'em_montagem', 'aprovada', 'aprovado', 'em_producao', 'em_projeto'].includes(o.status)).length;
    const pesoTotal = obraAtualData?.pesoTotal || COMPOSICAO_CONTRATO?.pesoTotal || 107000;
    const valorTotal = obraAtualData?.valorContrato || COMPOSICAO_CONTRATO?.valorTotalContrato || 2700000;
    const receitas = DRE_OBRA?.receitas?.totalRealizado || 0;
    const despesas = DRE_OBRA?.despesas?.totalRealizado || 0;

    // Calcular progresso real baseado em peças por etapa
    const totalPecas = pecas.length;
    const pecasAguardando = pecas.filter(p => p.etapa === 'aguardando').length;
    const pecasEmCorte = pecas.filter(p => p.etapa === 'corte').length;
    const pecasEmFab = pecas.filter(p => p.etapa === 'fabricacao').length;
    const pecasEmSolda = pecas.filter(p => p.etapa === 'solda').length;
    const pecasEmPintura = pecas.filter(p => p.etapa === 'pintura').length;
    const pecasExpedidas = pecas.filter(p => p.etapa === 'expedido').length;
    const pecasProcessadas = totalPecas - pecasAguardando;
    const progressoGeral = totalPecas > 0 ? Math.round((pecasProcessadas / totalPecas) * 100) : 0;

    // Alertas de estoque: items sem_estoque ou abaixo do mínimo
    const alertasEstoque = estoque.filter(e =>
      (e.quantidadeAtual || e.quantidade || 0) < (e.quantidadeMinima || e.minimo || 0)
    ).length;

    return {
      projetosAtivos: obrasAtivas || 1,
      projetosTotal: obras.length || 1,
      pesoTotal: pesoTotal / 1000,
      valorTotal: valorTotal / 1000000,
      receitas: receitas / 1000000,
      despesas: despesas / 1000000,
      lucro: (receitas - despesas) / 1000000,
      oee: progressoGeral || 0,
      stockAlerts: alertasEstoque,
      totalPecas, pecasAguardando, pecasEmCorte, pecasEmFab, pecasEmSolda, pecasEmPintura, pecasExpedidas,
      progressoGeral,
      totalFuncionarios: 22,
      totalEquipes: 5,
    };
  }, [obras, obraAtualData, estoque, pecas, kpisIndustriais]);

  // Dados de produção por etapa - derivado de dados reais das peças
  const productionData = useMemo(() => {
    const etapas = ['aguardando', 'corte', 'fabricacao', 'solda', 'pintura', 'expedido'];
    const nomes = { aguardando: 'Aguardando', corte: 'Corte', fabricacao: 'Fabricação', solda: 'Solda', pintura: 'Pintura', expedido: 'Expedido' };
    return etapas.map(etapa => {
      const pecasEtapa = pecas.filter(p => p.etapa === etapa);
      return {
        mes: nomes[etapa],
        fabricado: Math.round(pecasEtapa.reduce((acc, p) => acc + (p.peso || 0), 0)),
        planejado: Math.round(107715 / 6), // peso total dividido igualmente como referência
      };
    });
  }, [pecas]);

  const financialData = (fluxoFinanceiro?.receitasPorDia || []).length > 0
    ? fluxoFinanceiro.receitasPorDia.map(f => ({ dia: f.dia, valor: (f.valor || 0) / 1000 }))
    : [];

  // Status das obras
  const projectStatusData = useMemo(() => [
    { name: 'Aprovado', value: obras.filter(o => o.status === 'aprovado').length, color: '#60a5fa' },
    { name: 'Fabricação', value: obras.filter(o => o.status === 'em_fabricacao').length, color: '#22d3ee' },
    { name: 'Montagem', value: obras.filter(o => o.status === 'em_montagem').length, color: '#34d399' },
    { name: 'Concluído', value: obras.filter(o => o.status === 'concluido').length, color: '#c084fc' },
  ].filter(d => d.value > 0), [obras]);

  const radarData = [
    { subject: 'Produção', value: 0 },
    { subject: 'Qualidade', value: qualidadeMetricas?.taxaAprovacao || qualidadeMetricas?.conformidade || 0 },
    { subject: 'Prazo', value: 0 },
    { subject: 'Custo', value: 0 },
    { subject: 'Segurança', value: 0 },
    { subject: 'Inovação', value: 0 }
  ];

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Animated Background */}
      <CyberGrid color="#22d3ee" opacity={0.03} />

      {/* Gradient overlays */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(192,132,252,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.05),transparent_60%)]" />
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{ backgroundColor: COLORS[i % COLORS.length], left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ y: [0, -50, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
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
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, type: 'spring' }}
                className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"
                style={{ boxShadow: '0 0 50px rgba(52,211,153,0.5)' }}
              >
                <Gauge className="w-10 h-10 text-white" />
              </motion.div>
              <h1 className="text-2xl font-black text-white mb-1">MONTEX DASHBOARD</h1>
              <p className="text-emerald-400 font-mono text-sm">PREMIUM EDITION v6.0</p>
              <motion.div className="w-48 h-1 bg-slate-800 rounded-full mx-auto mt-4 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.2 }}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={`relative z-10 p-${dynamicSizes.padding} space-y-${dynamicSizes.gap}`}
           style={{ padding: `${dynamicSizes.padding * 4}px`, gap: `${dynamicSizes.gap * 4}px` }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl px-6 py-3"
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"
              animate={{ boxShadow: ['0 0 20px rgba(52,211,153,0.3)', '0 0 40px rgba(52,211,153,0.5)', '0 0 20px rgba(52,211,153,0.3)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Gauge className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                DASHBOARD PREMIUM
                <span className="text-[9px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-mono flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5" /> LIVE
                </span>
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">GRUPO MONTEX • SISTEMA INTEGRADO</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* System Status */}
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
              {[
                { icon: Cpu, value: '67%', color: '#22d3ee' },
                { icon: HardDrive, value: '42%', color: '#34d399' },
                { icon: Wifi, value: '1Gbps', color: '#c084fc' },
              ].map((sys, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <sys.icon className="w-3.5 h-3.5" style={{ color: sys.color }} />
                  <span className="text-xs font-mono" style={{ color: sys.color }}>{sys.value}</span>
                </div>
              ))}
            </div>

            {/* Clock */}
            <CyberBorder color="#22d3ee" glow={false}>
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-lg">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-lg font-mono font-bold text-cyan-400" style={{ textShadow: '0 0 10px rgba(34,211,238,0.5)' }}>
                  {currentTime.toLocaleTimeString('pt-BR')}
                </span>
              </div>
            </CyberBorder>

            {/* Live toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLive(!isLive)}
              className={cn("gap-2", isLive ? "text-emerald-400" : "text-slate-400")}
            >
              {isLive ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isLive ? 'LIVE' : 'PAUSED'}
            </Button>
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className={`grid ${dynamicSizes.mainGridCols} gap-${dynamicSizes.gap}`} style={{ gap: `${dynamicSizes.gap * 4}px` }}>
          {/* Left Column - Stats */}
          <div className={`${dynamicSizes.leftColSpan} space-y-${dynamicSizes.gap}`} style={{ gap: `${dynamicSizes.gap * 4}px` }}>
            <UltraStatCard
              title="PROJETOS ATIVOS"
              value={metrics.projetosAtivos}
              subtitle={`de ${metrics.projetosTotal} projetos totais`}
              icon={Building2}
              color="#22d3ee"
              trend={12}
              sparkData={[3, 5, 4, 6, 5, 7, 6, 8]}
            />
            <UltraStatCard
              title="OEE GERAL"
              value={metrics.oee}
              subtitle="Eficiência Global do Equipamento"
              icon={Gauge}
              color="#34d399"
              trend={2.3}
              sparkData={[82, 84, 83, 85, 87, 86, 88, 87]}
            />
            <UltraStatCard
              title="FATURAMENTO"
              value={`R$${metrics.valorTotal.toFixed(1)}M`}
              subtitle="Valor total em projetos"
              icon={DollarSign}
              color="#c084fc"
              trend={8}
              sparkData={[12, 14, 13, 16, 15, 18, 17, 19]}
            />
            <MachineStatusWidget machines={maquinasStatus} />
          </div>

          {/* Center Column - Charts */}
          <div className={`${dynamicSizes.centerColSpan} space-y-${dynamicSizes.gap}`} style={{ gap: `${dynamicSizes.gap * 4}px` }}>
            {/* Production Chart */}
            <HolographicCard color="#22d3ee" className="p-4 bg-slate-900/80 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm font-bold text-white">PRODUÇÃO EM TEMPO REAL</span>
                  <PulseIndicator status="online" size={4} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{metrics.totalPecas - metrics.pecasAguardando}</div>
                    <div className="text-[10px] text-slate-500">Peças Processadas / {metrics.totalPecas}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-emerald-400">{metrics.progressoGeral}%</div>
                    <div className="text-[10px] text-slate-500">Progresso</div>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={dynamicSizes.chartHeightLarge}>
                <ComposedChart data={productionData}>
                  <defs>
                    <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="fabricado" fill="url(#prodGrad)" stroke="#22d3ee" strokeWidth={2} />
                  <Line type="monotone" dataKey="planejado" stroke="#c084fc" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </HolographicCard>

            {/* Financial Chart */}
            <HolographicCard color="#34d399" className="p-4 bg-slate-900/80 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-bold text-white">FLUXO FINANCEIRO</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500" />
                    <span className="text-xs text-slate-400">Receitas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span className="text-xs text-slate-400">Despesas</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={dynamicSizes.chartHeight}>
                <AreaChart data={financialData}>
                  <defs>
                    <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="dia" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="valor" fill="url(#recGrad)" stroke="#34d399" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </HolographicCard>
          </div>

          {/* Right Column */}
          <div className={`${dynamicSizes.rightColSpan} space-y-${dynamicSizes.gap}`} style={{ gap: `${dynamicSizes.gap * 4}px` }}>
            {/* 3D Globe */}
            <HolographicCard color="#60a5fa" className="p-4 bg-slate-900/80 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">OPERAÇÕES GLOBAIS</span>
              </div>
              <div className="flex justify-center">
                <Globe3D size={dynamicSizes.globeSize} color="#60a5fa" />
              </div>
            </HolographicCard>

            {/* Alerts */}
            <AlertsWidget alerts={alertasInteligentes} />

            {/* Performance Radar */}
            <HolographicCard color="#c084fc" className="p-4 bg-slate-900/80 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">PERFORMANCE</span>
              </div>
              <ResponsiveContainer width="100%" height={dynamicSizes.radarHeight}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={8} />
                  <Radar name="Performance" dataKey="value" stroke="#c084fc" fill="#c084fc" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </HolographicCard>
          </div>
        </div>

        {/* Bottom Row */}
        <div className={`grid ${dynamicSizes.mainGridCols} gap-${dynamicSizes.gap}`} style={{ gap: `${dynamicSizes.gap * 4}px` }}>
          {/* Projects Status 3D */}
          <div className={dynamicSizes.bottomColSpan}>
            <HolographicCard color="#22d3ee" className="p-4 bg-slate-900/80 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">STATUS DOS PROJETOS</span>
              </div>
              <div className="flex items-center justify-center">
                <DonutChart3D data={projectStatusData} size={dynamicSizes.donutSize} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {projectStatusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-slate-400">{item.name}</span>
                    <span className="text-[10px] font-mono ml-auto" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </HolographicCard>
          </div>

          {/* 3D Bar Chart */}
          <div className={dynamicSizes.bottomColSpan}>
            <HolographicCard color="#fbbf24" className="p-4 bg-slate-900/80 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">PRODUÇÃO POR MÊS</span>
              </div>
              <BarChart3D
                data={productionData.slice(0, 6).map(d => ({ label: d.mes.substring(0, 3), value: d.fabricado }))}
                height={dynamicSizes.chartHeight}
                color="#fbbf24"
              />
            </HolographicCard>
          </div>

          {/* Team & Resources */}
          <div className={dynamicSizes.bottomColSpan}>
            <HolographicCard color="#f472b6" className="p-4 bg-slate-900/80 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-pink-400" />
                <span className="text-xs font-bold text-white">RECURSOS HUMANOS</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-slate-800/50">
                  <AnimatedCounter value={recursosHumanos?.totalColaboradores || 48} color="#f472b6" size="lg" />
                  <p className="text-[10px] text-slate-500 mt-1">Total</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-800/50">
                  <AnimatedCounter value={recursosHumanos?.presentes || 42} color="#22c55e" size="lg" />
                  <p className="text-[10px] text-slate-500 mt-1">Presentes</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {(recursosHumanos?.setores?.length > 0 ? recursosHumanos.setores : [
                  { setor: 'Produção', presentes: 18, total: 20 },
                  { setor: 'Montagem', presentes: 12, total: 14 },
                  { setor: 'Engenharia', presentes: 6, total: 6 },
                  { setor: 'Administrativo', presentes: 6, total: 8 }
                ]).slice(0, 4).map((dept, i) => (
                  <div key={dept.setor} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-[10px] text-slate-400 flex-1">{dept.setor}</span>
                    <span className="text-[10px] font-mono" style={{ color: COLORS[i] }}>{dept.presentes}/{dept.total}</span>
                  </div>
                ))}
              </div>
            </HolographicCard>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl px-4 py-2"
        >
          <div className="flex items-center gap-6">
            {[
              { icon: Factory, label: 'Produção', value: 'ATIVO', color: '#34d399' },
              { icon: Truck, label: 'Logística', value: 'NORMAL', color: '#22d3ee' },
              { icon: Shield, label: 'Segurança', value: '100%', color: '#34d399' },
              { icon: Database, label: 'Backup', value: 'SYNC', color: '#c084fc' },
              { icon: Server, label: 'API', value: 'ONLINE', color: '#60a5fa' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                <span className="text-[10px] text-slate-500">{item.label}:</span>
                <span className="text-[10px] font-mono" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-500">{currentTime.toLocaleTimeString('pt-BR')}</span>
            <span className="text-[10px] text-slate-600">|</span>
            <span className="text-[10px] text-slate-500">{viewport?.width}x{viewport?.height}</span>
            <span className="text-[10px] text-slate-600">|</span>
            <span className="text-[10px] text-cyan-500">{currentBreakpoint?.toUpperCase()}</span>
            <span className="text-[10px] text-slate-600">|</span>
            <span className="text-[10px] text-slate-500">MONTEX ERP v6.0</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
