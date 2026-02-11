// MONTEX ERP Premium - Dashboard Premium (Canônico Consolidado)
// Integrado com useDashboardMetrics hook - Dados reais + Componentes Compartilhados
// Consolidação: absorveu widgets de ERPIntegrado, Futurista, e Dashboard legacy

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Import hooks
import { useResolution } from '../hooks/useResolution';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import {
  Building2, DollarSign, Bell, Activity, Target, Globe, Layers,
  Clock, Users, Factory, Truck, Shield, BarChart3, Settings,
  Cpu, HardDrive, Wifi, Play, Pause,
  ArrowUp, ArrowDown, Gauge, Database, Server, Radio,
  Download, Grid3X3, Monitor
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

// ===== COMPONENTES COMPARTILHADOS (Consolidação) =====
import {
  KPICard, ChartWrapper, PeriodSelector, ObraProgressWidget,
  EstoqueResumoWidget, DashboardWidgetCustomizer, useWidgetVisibility,
  AlertsWidget, PerformanceRadar, FinancialSummary, StatusBar,
  MachineStatusGrid, TeamPanel, ProgressRing
} from '@/components/dashboard/shared';

// ===== NOVOS COMPONENTES (4 Features) =====
import DashboardExporter from '@/components/dashboard/DashboardExporter';
import QuickActions from '@/components/dashboard/QuickActions';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';

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

// HUD Mode Scan Line Effect
const ScanLineEffect = () => (
  <>
    <style>{`
      @keyframes scan-line {
        0% { top: 0; }
        100% { top: 100%; }
      }
      .hud-scan-line {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(to bottom, rgba(34, 197, 94, 0.3), transparent);
        pointer-events: none;
        animation: scan-line 8s linear infinite;
        z-index: 5;
      }
    `}</style>
    <div className="hud-scan-line" />
  </>
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

// ===== HUD MODE COMPONENTS (NEW) =====

const HexagonIndicator = ({ value = 85, title = '', color = '#22c55e', size = 120 }) => {
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const getColor = (val) => {
    if (val >= 80) return '#22c55e';
    if (val >= 60) return '#eab308';
    return '#ef4444';
  };

  const indicatorColor = getColor(normalizedValue);
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 - 90) * (Math.PI / 180);
    const x = (size / 2) * Math.cos(angle);
    const y = (size / 2) * Math.sin(angle);
    return `${size / 2 + x},${size / 2 + y}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="drop-shadow-lg">
        <defs>
          <linearGradient id="hexGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={indicatorColor} stopOpacity="0.1" />
            <stop offset="100%" stopColor={indicatorColor} stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <polygon points={hexPoints} fill="url(#hexGrad)" stroke={indicatorColor} strokeWidth="2" />
        <motion.polygon
          points={hexPoints}
          fill="none"
          stroke={indicatorColor}
          strokeWidth="1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dy="0.3em"
          className="text-xs font-bold"
          fill={indicatorColor}
          fontSize="24"
        >
          {normalizedValue.toFixed(0)}%
        </text>
      </svg>
      {title && <span className="text-xs font-bold text-slate-300">{title}</span>}
    </div>
  );
};

const DataStream = ({ data = [], color = '#22c55e', height = 80, width = '100%' }) => {
  const [offset, setOffset] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setOffset(prev => (prev + 2) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const points = data.length > 0
    ? data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * (typeof width === 'number' ? width : 300)},${height - (v / 100) * (height * 0.8)}`).join(' ')
    : `0,${height / 2} 50,${height / 3} 100,${height / 2}`;

  const svgWidth = typeof width === 'number' ? width : 300;

  return (
    <svg width="100%" height={height} className="overflow-hidden">
      <defs>
        <linearGradient id="streamGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="streamLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="50%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${svgWidth},${height}`} fill="url(#streamGrad)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
      <motion.circle
        cx={data.length > 0 ? `${(data.length - 1) / Math.max(data.length - 1, 1) * 100}%` : '50%'}
        cy={data.length > 0 ? height - (data[data.length - 1] / 100) * (height * 0.8) : height / 2}
        r="4"
        fill={color}
        animate={{ r: [4, 6, 4], opacity: [1, 0.6, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </svg>
  );
};

const EnergyGauge = ({ value = 847, maxValue = 1000, color = '#22c55e', title = 'Consumo Energia' }) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const gaugeColor = percentage > 80 ? '#ef4444' : percentage > 60 ? '#eab308' : '#22c55e';

  return (
    <HolographicCard color={gaugeColor} className="p-4 bg-slate-900/80 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-white">{title}</span>
        <span className="text-xl font-bold" style={{ color: gaugeColor }}>{value} kWh</span>
      </div>
      <svg width="100%" height="80" viewBox="0 0 200 100">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path d="M 20 80 A 80 80 0 0 1 180 80" fill="none" stroke="#334155" strokeWidth="8" />
        <path
          d="M 20 80 A 80 80 0 0 1 180 80"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="8"
          strokeDasharray={`${(percentage / 100) * 251}, 251`}
          strokeLinecap="round"
        />
        <motion.circle
          cx={20 + (160 * percentage / 100)}
          cy={80}
          r="6"
          fill={gaugeColor}
          animate={{ r: [6, 8, 6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <text x="100" y="95" textAnchor="middle" className="text-xs font-bold" fill={gaugeColor} fontSize="16">
          {percentage.toFixed(0)}%
        </text>
      </svg>
    </HolographicCard>
  );
};

const CircularProgress3D = ({ value = 85, label = '', color = '#22c55e', size = 100 }) => {
  const circumference = 2 * Math.PI * (size / 2 - 10);
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 10} fill="none" stroke="#334155" strokeWidth="3" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          filter="url(#glow)"
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5 }}
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dy="0.3em"
          className="text-sm font-bold"
          fill={color}
          fontSize="18"
        >
          {value.toFixed(0)}%
        </text>
      </svg>
      {label && <span className="text-xs text-slate-400">{label}</span>}
    </div>
  );
};

const COLORS = ['#22d3ee', '#34d399', '#c084fc', '#fbbf24', '#f87171', '#60a5fa', '#f472b6', '#a3e635'];

// ==================== MAIN COMPONENT ====================

export default function DashboardPremium() {
  // Centralized metrics hook - single source of truth
  const metrics = useDashboardMetrics();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLive, setIsLive] = useState(true);
  const [showBootScreen, setShowBootScreen] = useState(true);
  const [periodo, setPeriodo] = useState('mes');
  const [showCustomizer, setShowCustomizer] = useState(false);

  // New Features: Exporter, HUD Mode
  const [exporterOpen, setExporterOpen] = useState(false);
  const [hudTheme, setHudTheme] = useState(() => {
    // Load from localStorage
    const stored = localStorage.getItem('dashboardHudMode');
    return stored ? JSON.parse(stored) : false;
  });

  // Widget visibility (Dashboard Customizer)
  const widgetState = useWidgetVisibility();

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

  // Persist HUD theme to localStorage
  useEffect(() => {
    localStorage.setItem('dashboardHudMode', JSON.stringify(hudTheme));
  }, [hudTheme]);

  // Derivar dados de obras em andamento a partir do contexto raw (mantém compatibilidade)
  const obrasEmAndamento = useMemo(() => {
    return metrics.raw.obras
      .filter(o => ['em_fabricacao', 'em_montagem', 'aprovada', 'aprovado', 'em_producao', 'em_projeto', 'em_andamento'].includes(o.status))
      .map(obra => ({
        codigo: obra.codigo,
        nome: obra.nome,
        cliente: obra.cliente || 'N/A',
        progresso: obra.progresso || {},
      }));
  }, [metrics.raw.obras]);

  // Memoized dashboard data for exporter
  const exporterData = useMemo(() => ({
    stats: {
      projetosAtivos: metrics.projetos.ativos,
      pesoFabricacao: metrics.producao.totalPecas * 2.5, // Approximate kg
      progressoMedio: metrics.producao.progressoGeral,
      valorTotal: metrics.financeiro.valorFaturado || 0,
    },
    projects: obrasEmAndamento.slice(0, 10).map(obra => ({
      nome: obra.nome,
      status: obra.status,
      percentual: Object.values(obra.progresso)[0] || 0,
    })),
  }), [metrics, obrasEmAndamento]);

  // Quality metrics for HUD mode
  const qualityMetrics = useMemo(() => ({
    taxaAprovacao: metrics.performance?.qualidade || 94.2,
    precisaoDimensional: 99.1,
    retrabalho: metrics.performance?.retrabalho || 3.2,
    refugo: metrics.performance?.refugo || 1.8,
    energiaKwh: 847,
  }), [metrics.performance]);

  // HUD theme colors
  const hudColors = hudTheme
    ? { primary: '#22c55e', accent: '#16a34a', bg: 'bg-gradient-to-b from-slate-950 via-green-950/20 to-slate-950' }
    : { primary: '#22d3ee', accent: '#0891b2', bg: 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950' };

  return (
    <div className={`min-h-screen ${hudColors.bg} relative overflow-hidden`}>
      {/* HUD Scan Line Effect */}
      {hudTheme && <ScanLineEffect />}

      {/* Animated Background */}
      <CyberGrid color={hudColors.primary} opacity={0.03} />

      {/* Gradient overlays */}
      <div className="fixed inset-0 pointer-events-none">
        {hudTheme ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,197,94,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(34,197,94,0.05),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.03),transparent_60%)]" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(192,132,252,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.05),transparent_60%)]" />
          </>
        )}
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
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                hudTheme
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600'
              }`}
              animate={{
                boxShadow: hudTheme
                  ? ['0 0 20px rgba(34,197,94,0.3)', '0 0 40px rgba(34,197,94,0.5)', '0 0 20px rgba(34,197,94,0.3)']
                  : ['0 0 20px rgba(52,211,153,0.3)', '0 0 40px rgba(52,211,153,0.5)', '0 0 20px rgba(52,211,153,0.3)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Gauge className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                {hudTheme ? 'COMMAND CENTER' : 'DASHBOARD PREMIUM'}
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ${
                  hudTheme
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}>
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

            {/* Period Selector (absorvido do ERPIntegrado) */}
            <PeriodSelector value={periodo} onChange={setPeriodo} />

            {/* Live toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLive(!isLive)}
              className={cn("gap-2", isLive ? (hudTheme ? "text-green-400" : "text-emerald-400") : "text-slate-400")}
            >
              {isLive ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isLive ? 'LIVE' : 'PAUSED'}
            </Button>

            {/* HUD Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHudTheme(!hudTheme)}
              className={cn("gap-2", hudTheme ? "text-green-400" : "text-slate-400")}
              title={hudTheme ? 'Disable HUD Mode' : 'Enable HUD Mode'}
            >
              <Monitor className="w-4 h-4" />
              {hudTheme ? 'HUD' : 'PREMIUM'}
            </Button>

            {/* Export Dashboard */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExporterOpen(true)}
              className="text-slate-400 hover:text-white gap-2"
              title="Export dashboard data"
            >
              <Download className="w-4 h-4" />
            </Button>

            {/* Dashboard Customizer toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomizer(true)}
              className="text-slate-400 hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className={`grid ${dynamicSizes.mainGridCols} gap-${dynamicSizes.gap}`} style={{ gap: `${dynamicSizes.gap * 4}px` }}>
          {/* Left Column - Stats */}
          <div className={`${dynamicSizes.leftColSpan} space-y-${dynamicSizes.gap}`} style={{ gap: `${dynamicSizes.gap * 4}px` }}>
            <UltraStatCard
              title="PROJETOS ATIVOS"
              value={metrics.projetos.ativos}
              subtitle={`de ${metrics.projetos.total} projetos totais`}
              icon={Building2}
              color="#22d3ee"
              trend={metrics.projetos.trend}
              sparkData={[3, 5, 4, 6, 5, 7, 6, 8]}
            />
            {hudTheme ? (
              <HolographicCard color="#22c55e" className="p-4 bg-slate-900/80 backdrop-blur-xl">
                <div className="flex flex-col items-center justify-center gap-3">
                  <HexagonIndicator value={metrics.producao.progressoGeral} title="OEE GERAL" color="#22c55e" size={100} />
                  <p className="text-[10px] text-slate-500 text-center">Eficiência Global do Equipamento</p>
                </div>
              </HolographicCard>
            ) : (
              <UltraStatCard
                title="OEE GERAL"
                value={metrics.producao.progressoGeral}
                subtitle="Eficiência Global do Equipamento"
                icon={Gauge}
                color="#34d399"
                trend={2.3}
                sparkData={[82, 84, 83, 85, 87, 86, 88, 87]}
              />
            )}
            <UltraStatCard
              title="FATURAMENTO"
              value={metrics.financeiro.valorMilhoes}
              subtitle="Valor total em projetos"
              icon={DollarSign}
              color="#c084fc"
              trend={8}
              sparkData={[12, 14, 13, 16, 15, 18, 17, 19]}
            />
            {hudTheme && <MachineStatusGrid machines={metrics.maquinas.lista} />}
            {!hudTheme && <MachineStatusGrid machines={metrics.maquinas.lista} />}
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
                    <div className="text-2xl font-bold text-white">
                      {metrics.producao.totalPecas - (metrics.producao.pecasPorEtapa?.aguardando || 0)}
                    </div>
                    <div className="text-[10px] text-slate-500">Peças Processadas / {metrics.producao.totalPecas}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-emerald-400">{metrics.producao.progressoGeral}%</div>
                    <div className="text-[10px] text-slate-500">Progresso</div>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={dynamicSizes.chartHeightLarge}>
                <ComposedChart data={metrics.chartData.productionTrend}>
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

            {/* DataStream - Only in HUD mode */}
            {hudTheme && (
              <HolographicCard color="#22c55e" className="p-4 bg-slate-900/80 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold text-white">UNIDADES PRODUZIDAS / DIA</span>
                    <PulseIndicator status="online" size={3} />
                  </div>
                  <span className="text-sm font-bold text-green-400">{metrics.producao.totalPecas} unidades</span>
                </div>
                <DataStream
                  data={metrics.chartData.productionTrend.map(d => (d.fabricado / Math.max(...metrics.chartData.productionTrend.map(x => x.fabricado || 1))) * 100)}
                  color="#22c55e"
                  height={60}
                />
              </HolographicCard>
            )}

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
                <AreaChart data={metrics.chartData.fluxoFinanceiro}>
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
                  <Area type="monotone" dataKey="receita" fill="url(#recGrad)" stroke="#34d399" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </HolographicCard>
          </div>

          {/* Right Column */}
          <div className={`${dynamicSizes.rightColSpan} space-y-${dynamicSizes.gap}`} style={{ gap: `${dynamicSizes.gap * 4}px` }}>
            {hudTheme ? (
              <EnergyGauge value={qualityMetrics.energiaKwh} maxValue={1000} color="#22c55e" title="CONSUMO ENERGIA" />
            ) : (
              <HolographicCard color="#60a5fa" className="p-4 bg-slate-900/80 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-white">OPERAÇÕES GLOBAIS</span>
                </div>
                <div className="flex justify-center">
                  <Globe3D size={dynamicSizes.globeSize} color="#60a5fa" />
                </div>
              </HolographicCard>
            )}

            {/* Alerts - Using shared component */}
            <AlertsWidget alerts={metrics.raw.alertasInteligentes || []} />

            {/* Performance Radar - Using shared component */}
            <PerformanceRadar data={metrics.chartData.radarData} height={dynamicSizes.radarHeight} />
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
                <DonutChart3D data={metrics.chartData.projectStatus} size={dynamicSizes.donutSize} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {metrics.chartData.projectStatus.map((item) => (
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
                data={metrics.chartData.productionTrend.slice(0, 6).map(d => ({ label: d.mes.substring(0, 3), value: d.fabricado }))}
                height={dynamicSizes.chartHeight}
                color="#fbbf24"
              />
            </HolographicCard>
          </div>

          {/* Team & Resources - Using shared component */}
          <TeamPanel equipes={metrics.equipes.lista} />
        </div>

        {/* ===== WIDGETS ABSORVIDOS (ERPIntegrado) ===== */}
        {(widgetState.isVisible('obrasProgress') || widgetState.isVisible('estoque')) && (
          <div className="grid grid-cols-12 gap-4">
            {widgetState.isVisible('obrasProgress') && obrasEmAndamento.length > 0 && (
              <div className="col-span-12 lg:col-span-8">
                <ObraProgressWidget obras={obrasEmAndamento} maxItems={4} />
              </div>
            )}
            {widgetState.isVisible('estoque') && (
              <div className={cn(
                widgetState.isVisible('obrasProgress') && obrasEmAndamento.length > 0
                  ? 'col-span-12 lg:col-span-4'
                  : 'col-span-12 lg:col-span-6'
              )}>
                <EstoqueResumoWidget estoque={metrics.raw.estoque} alertasEstoque={metrics.estoque.alertas} />
              </div>
            )}
          </div>
        )}

        {/* ===== HUD MODE: QUALITY KPIs SECTION ===== */}
        {hudTheme && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-12 gap-4"
          >
            <div className="col-span-12">
              <HolographicCard color="#22c55e" className="p-4 bg-slate-900/80 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-6">
                  <Target className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-bold text-white">QUALIDADE - INDICADORES CRÍTICOS</span>
                  <PulseIndicator status="online" size={4} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {/* Taxa de Aprovação */}
                  <div className="flex flex-col items-center">
                    <CircularProgress3D value={qualityMetrics.taxaAprovacao} label="Taxa Aprovação" color="#22c55e" size={90} />
                    <span className="text-xs text-slate-500 mt-2">{qualityMetrics.taxaAprovacao.toFixed(1)}%</span>
                  </div>

                  {/* Precisão Dimensional */}
                  <div className="flex flex-col items-center">
                    <CircularProgress3D value={qualityMetrics.precisaoDimensional} label="Precisão Dimensional" color="#10b981" size={90} />
                    <span className="text-xs text-slate-500 mt-2">{qualityMetrics.precisaoDimensional.toFixed(1)}%</span>
                  </div>

                  {/* Taxa de Retrabalho */}
                  <div className="flex flex-col items-center">
                    <CircularProgress3D value={100 - qualityMetrics.retrabalho} label="Sem Retrabalho" color="#f59e0b" size={90} />
                    <span className="text-xs text-slate-500 mt-2">{qualityMetrics.retrabalho.toFixed(1)}%</span>
                  </div>

                  {/* Taxa de Refugo */}
                  <div className="flex flex-col items-center">
                    <CircularProgress3D value={100 - qualityMetrics.refugo} label="Sem Refugo" color="#ef4444" size={90} />
                    <span className="text-xs text-slate-500 mt-2">{qualityMetrics.refugo.toFixed(1)}%</span>
                  </div>
                </div>
              </HolographicCard>
            </div>
          </motion.div>
        )}

        {/* ===== NOVOS WIDGETS (4 Features) ===== */}

        {/* QuickActions + ActivityTimeline Grid */}
        {(widgetState.isVisible('quickActions') || widgetState.isVisible('activityTimeline')) && (
          <div className="grid grid-cols-12 gap-4">
            {widgetState.isVisible('quickActions') && (
              <div className={cn(
                widgetState.isVisible('activityTimeline')
                  ? 'col-span-12 lg:col-span-6'
                  : 'col-span-12'
              )}>
                <QuickActions />
              </div>
            )}
            {widgetState.isVisible('activityTimeline') && (
              <div className={cn(
                widgetState.isVisible('quickActions')
                  ? 'col-span-12 lg:col-span-6'
                  : 'col-span-12'
              )}>
                <ActivityTimeline activities={[]} />
              </div>
            )}
          </div>
        )}

        {/* Bottom Status Bar - Using shared component */}
        <StatusBar currentTime={currentTime} viewport={viewport} currentBreakpoint={currentBreakpoint} />
      </div>

      {/* Dashboard Customizer Modal */}
      <DashboardWidgetCustomizer
        open={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        widgetState={widgetState}
      />

      {/* Dashboard Exporter Dialog */}
      <DashboardExporter
        open={exporterOpen}
        onOpenChange={setExporterOpen}
        dashboardData={exporterData}
      />
    </div>
  );
}
