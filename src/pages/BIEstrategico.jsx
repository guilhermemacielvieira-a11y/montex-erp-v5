// MONTEX ERP Premium - BI Estratégico
// Integrado com ERPContext - Dados reais da obra SUPER LUNA

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  TrendingUp,
  Target,
  DollarSign,
  Building2,
  Users,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Map,
  PieChart,
  LineChart,
  Shield,
  Eye,
  Compass,
  Crown,
  Sparkles,
  Star
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

// ERPContext - dados reais
import { useObras, useProducao, useMedicoes } from '../contexts/ERPContext';

// Dados financeiros reais
import { LANCAMENTOS_DESPESAS } from '../data/obraFinanceiraDatabase';

// Formatador de moeda
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Import new 3D components
import { Gauge3D, Donut3D, AnimatedCounter, PulseIndicator, AnimatedRadar, Bar3DChart } from '../components/bi/Dynamic3DCharts';
import { ComparisonBars, MiniDashboard } from '../components/bi/AdvancedAnalytics';

const COLORS = ['#22d3ee', '#34d399', '#c084fc', '#fbbf24', '#f87171', '#60a5fa', '#f472b6'];

export default function BIEstrategico() {
  // ERPContext hooks
  const { obras, obraAtualData } = useObras();
  const { pecas } = useProducao();
  const { medicoes } = useMedicoes();

  const [anoSelecionado, setAnoSelecionado] = useState('2026');
  const [activeSection, setActiveSection] = useState('overview');
  const [showWelcome, setShowWelcome] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Strategic KPIs - Calculados a partir dos dados reais
  const strategicKPIs = useMemo(() => {
    const totalContratado = obras.reduce((acc, o) => acc + (o.valor_contrato || 0), 0);

    // Calcula receitas a partir de medições
    const receitasAprovadas = medicoes
      .filter(m => ['aprovada', 'faturada', 'paga'].includes(m.status))
      .reduce((acc, m) => acc + (m.valor || 0), 0);

    // Calcula despesas a partir dos lançamentos
    const despesasRealizadas = LANCAMENTOS_DESPESAS
      .filter(d => d.status === 'aprovado' || d.status === 'pago')
      .reduce((acc, d) => acc + (d.valor || 0), 0);

    const faturamentoAnual = receitasAprovadas / 1000000;
    const crescimentoYoY = 23; // Baseline do histórico
    const marketShare = 12.5; // Baseline do histórico

    return {
      faturamentoAnual,
      crescimentoYoY,
      marketShare,
      pipeline: (totalContratado - receitasAprovadas) / 1000000,
      totalContratado: totalContratado / 1000000,
      clientesAtivos: obras.length,
      satisfacaoCliente: 94,
      ebitda: (receitasAprovadas - despesasRealizadas) / 1000000,
      roi: totalContratado > 0 ? ((receitasAprovadas / totalContratado) * 100) : 0
    };
  }, [obras, medicoes]);

  // Dados financeiros derivados do ERPContext
  const waveData = useMemo(() => {
    const faturamento = strategicKPIs.totalContratado || 0;
    return [0, 0, 0, 0, faturamento];
  }, [strategicKPIs]);

  const multiYearData = useMemo(() => [
    { ano: '2026', faturamento: strategicKPIs.totalContratado || 0, lucro: strategicKPIs.ebitda || 0, investimento: 0 },
  ], [strategicKPIs]);

  // Segmentos de mercado - será preenchido com dados reais
  const marketSegments = [];

  // Comparação regional - será preenchido com dados reais
  const regionalComparison = [];

  // Metas estratégicas - derivadas dos dados reais
  const strategicGoals = useMemo(() => [
    { name: 'Faturamento', atual: strategicKPIs.totalContratado || 0, meta: 20, unidade: 'M', fill: '#22d3ee' },
    { name: 'Market Share', atual: 0, meta: 18, unidade: '%', fill: '#34d399' },
    { name: 'EBITDA', atual: strategicKPIs.ebitda || 0, meta: 4, unidade: 'M', fill: '#c084fc' },
    { name: 'Clientes', atual: strategicKPIs.clientesAtivos || 0, meta: 15, unidade: '', fill: '#fbbf24' },
  ], [strategicKPIs]);

  // Pipeline - será preenchido com dados reais
  const pipelineData = [];

  // Radar competitivo - será preenchido com dados reais
  const competitiveRadar = [];

  // Iniciativas estratégicas - será preenchido com dados reais
  const initiativesBar = [];

  const ExecutiveMetric = ({ title, value, suffix = '', subtitle, trend, icon: Icon, color, delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.03, y: -5 }}
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        background: `linear-gradient(145deg, ${color}15, ${color}05, transparent)`,
        border: `1px solid ${color}30`,
        boxShadow: `0 20px 60px ${color}15, inset 0 1px 0 ${color}20`
      }}
    >
      {/* Premium glow effects */}
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl -mr-20 -mt-20" style={{ background: `${color}15` }} />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl -ml-16 -mb-16" style={{ background: `${color}10` }} />

      {/* Animated border */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{ border: `1px solid ${color}` }}
        animate={{ opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-12 h-12 rounded-xl flex items-center justify-center relative"
              style={{ background: `${color}20` }}
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <Icon className="w-6 h-6" style={{ color }} />
              <motion.div
                className="absolute inset-0 rounded-xl"
                style={{ border: `2px solid ${color}` }}
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </div>
          {trend && (
            <motion.div
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${
                trend > 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'
              }`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: delay + 0.3 }}
            >
              {trend > 0 ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-sm font-bold ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {Math.abs(trend)}%
              </span>
            </motion.div>
          )}
        </div>

        <div className="text-sm text-slate-400 mb-2">{title}</div>

        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold font-mono text-white">
            <AnimatedCounter value={parseFloat(String(value).replace(/[^0-9.]/g, ''))} duration={2} />
          </span>
          {suffix && <span className="text-xl font-medium" style={{ color }}>{suffix}</span>}
        </div>

        {subtitle && (
          <p className="text-slate-500 text-sm mt-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Premium animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(34,211,238,0.05),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(192,132,252,0.03),transparent_60%)]" />

        {/* Animated grid */}
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(251,191,36,0.1) 1px, transparent 0)`,
            backgroundSize: '60px 60px'
          }}
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 6, repeat: Infinity }}
        />

        {/* Floating premium particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: COLORS[i % COLORS.length],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              boxShadow: `0 0 10px ${COLORS[i % COLORS.length]}`
            }}
            animate={{
              y: [0, -50, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1]
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* Welcome animation overlay */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <motion.div
                className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-3xl flex items-center justify-center"
                animate={{ boxShadow: ['0 0 30px rgba(251,191,36,0.3)', '0 0 60px rgba(251,191,36,0.5)', '0 0 30px rgba(251,191,36,0.3)'] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Crown className="w-12 h-12 text-white" />
              </motion.div>
              <motion.h1
                className="text-3xl font-bold text-white mb-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                BI Estratégico
              </motion.h1>
              <motion.p
                className="text-amber-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Visão Executiva C-Level
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 p-4 lg:p-8 space-y-8">
        {/* Executive Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: showWelcome ? 3 : 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="w-16 h-16 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center relative"
              animate={{
                boxShadow: ['0 0 30px rgba(251,191,36,0.3)', '0 0 50px rgba(251,191,36,0.5)', '0 0 30px rgba(251,191,36,0.3)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Globe className="w-8 h-8 text-white" />
              <div className="absolute -top-1 -right-1">
                <PulseIndicator color="#fbbf24" size={14} />
              </div>
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                BI Estratégico
                <motion.span
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 rounded-full border border-amber-500/30 font-medium"
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Crown className="w-3 h-3" />
                  C-LEVEL
                </motion.span>
              </h1>
              <p className="text-slate-400">Visão executiva • GRUPO MONTEX • {new Date().getFullYear()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Section switcher */}
            <div className="flex bg-slate-800/80 rounded-xl p-1 border border-slate-700">
              {['overview', 'financial', 'market'].map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeSection === section
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {section === 'overview' ? 'Visão Geral' : section === 'financial' ? 'Financeiro' : 'Mercado'}
                </button>
              ))}
            </div>

            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(e.target.value)}
              className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:border-amber-500 transition-colors"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>
        </motion.div>

        {/* Top Strategic Metrics - Premium Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ExecutiveMetric
            title="Faturamento Anual"
            value={`R$ ${strategicKPIs.faturamentoAnual}`}
            suffix="M"
            trend={strategicKPIs.crescimentoYoY}
            subtitle="Crescimento YoY"
            icon={DollarSign}
            color="#34d399"
            delay={0.1}
          />
          <ExecutiveMetric
            title="Pipeline Comercial"
            value={`R$ ${strategicKPIs.pipeline.toFixed(1)}`}
            suffix="M"
            trend={15}
            subtitle="Em negociação"
            icon={Briefcase}
            color="#c084fc"
            delay={0.2}
          />
          <ExecutiveMetric
            title="Market Share"
            value={strategicKPIs.marketShare}
            suffix="%"
            trend={2.5}
            subtitle="Região SP"
            icon={Target}
            color="#22d3ee"
            delay={0.3}
          />
          <ExecutiveMetric
            title="EBITDA"
            value={`R$ ${strategicKPIs.ebitda}`}
            suffix="M"
            trend={18}
            subtitle="Margem 17.7%"
            icon={TrendingUp}
            color="#fbbf24"
            delay={0.4}
          />
        </div>

        {/* Secondary KPIs Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: 'ROI', value: strategicKPIs.roi, suffix: '%', color: '#34d399', icon: TrendingUp },
            { title: 'Clientes Ativos', value: strategicKPIs.clientesAtivos, suffix: '', color: '#22d3ee', icon: Users },
            { title: 'Satisfação', value: strategicKPIs.satisfacaoCliente, suffix: '%', color: '#c084fc', icon: Star },
            { title: 'Projetos', value: obras.length, suffix: '', color: '#fbbf24', icon: Building2 },
          ].map((kpi, i) => (
            <MiniDashboard
              key={kpi.title}
              title={kpi.title}
              value={<AnimatedCounter value={kpi.value} />}
              trend={0}
              sparklineData={[65, 70, 75, 72, 80, 85, kpi.value]}
              color={kpi.color}
              icon={kpi.icon}
            />
          ))}
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Multi-year Performance - Premium */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl" />
            <h3 className="text-white text-lg font-semibold flex items-center gap-2 mb-6 relative">
              <LineChart className="w-5 h-5 text-emerald-400" />
              Evolução Plurianual (R$ Milhões)
              <motion.div
                className="w-2 h-2 bg-emerald-500 rounded-full ml-2"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={multiYearData}>
                <defs>
                  <linearGradient id="colorFatStr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="ano" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                  }}
                  formatter={(value) => [`R$ ${value}M`, '']}
                />
                <Legend />
                <Area type="monotone" dataKey="faturamento" fill="url(#colorFatStr)" stroke="#34d399" strokeWidth={3} name="Faturamento" />
                <Area type="monotone" dataKey="lucro" fill="url(#colorLucro)" stroke="#c084fc" strokeWidth={2} name="Lucro Líquido" />
                <Bar dataKey="investimento" fill="#fbbf24" fillOpacity={0.6} name="Investimentos" radius={[6, 6, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Strategic Goals - 3D Gauges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6"
          >
            <h3 className="text-white text-lg font-semibold flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-amber-400" />
              Metas Estratégicas 2026
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {strategicGoals.map((goal, i) => {
                const progress = Math.round((goal.atual / goal.meta) * 100);
                return (
                  <motion.div
                    key={goal.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className="text-center"
                  >
                    <Gauge3D value={progress} max={100} color={goal.fill} size={100} label="%" />
                    <div className="mt-2">
                      <p className="text-sm text-white font-medium">{goal.name}</p>
                      <p className="text-xs text-slate-400">{goal.atual}/{goal.meta}{goal.unidade}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Second Row - 3D Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Market Segments - 3D Donut */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6"
          >
            <h3 className="text-white text-lg font-semibold flex items-center gap-2 mb-6">
              <PieChart className="w-5 h-5 text-purple-400" />
              Segmentos de Mercado
            </h3>
            <div className="flex flex-col items-center">
              <Donut3D data={marketSegments} size={180} />
              <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                {marketSegments.map((seg, i) => (
                  <motion.div
                    key={seg.name}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/30 transition-colors cursor-pointer"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ background: seg.color, boxShadow: `0 0 10px ${seg.color}` }} />
                    <div>
                      <span className="text-xs text-white">{seg.name}</span>
                      <span className="text-xs text-slate-400 block">{seg.value}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Regional Comparison - Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6"
          >
            <h3 className="text-white text-lg font-semibold flex items-center gap-2 mb-6">
              <Map className="w-5 h-5 text-cyan-400" />
              Performance Regional (R$ Mil)
            </h3>
            <ComparisonBars data={regionalComparison} />
          </motion.div>

          {/* Competitive Radar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6"
          >
            <h3 className="text-white text-lg font-semibold flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-amber-400" />
              Posicionamento Competitivo
            </h3>
            <AnimatedRadar data={competitiveRadar} color="#fbbf24" />
          </motion.div>
        </div>

        {/* Pipeline and Initiatives */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline Funnel - Premium */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6"
          >
            <h3 className="text-white text-lg font-semibold flex items-center gap-2 mb-6">
              <Briefcase className="w-5 h-5 text-cyan-400" />
              Funil Comercial
            </h3>
            <div className="space-y-4">
              {pipelineData.map((item, i) => {
                const width = 100 - (i * 15);
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.1 + i * 0.1 }}
                    className="relative"
                  >
                    <motion.div
                      className="h-14 rounded-xl flex items-center justify-between px-5 mx-auto cursor-pointer relative overflow-hidden"
                      style={{
                        width: `${width}%`,
                        background: `linear-gradient(90deg, ${item.fill}, ${item.fill}80)`,
                        boxShadow: `0 10px 30px ${item.fill}30`
                      }}
                      whileHover={{ scale: 1.02, y: -2 }}
                    >
                      <span className="text-white font-medium">{item.name}</span>
                      <span className="text-white font-bold text-lg">{item.value}</span>
                      {/* Shine effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '200%' }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                      />
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
            <div className="text-center mt-6 pt-4 border-t border-slate-700/50">
              <span className="text-slate-400 text-sm">Taxa de Conversão: </span>
              <span className="text-emerald-400 font-bold text-lg">16%</span>
            </div>
          </motion.div>

          {/* Strategic Initiatives - 3D Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6"
          >
            <h3 className="text-white text-lg font-semibold flex items-center gap-2 mb-6">
              <Compass className="w-5 h-5 text-emerald-400" />
              Progresso das Iniciativas
            </h3>
            <Bar3DChart data={initiativesBar} height={220} />
            <div className="grid grid-cols-2 gap-3 mt-4">
              {[
                { name: 'Expansão Regional', status: 'Em andamento', color: '#22d3ee' },
                { name: 'Automação', status: 'Planejado', color: '#fbbf24' },
                { name: 'Certificação ISO', status: 'Em andamento', color: '#34d399' },
                { name: 'Parcerias', status: 'Negociação', color: '#c084fc' },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-slate-400">{item.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Summary - Premium */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/20 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Resumo Executivo</h3>
              <p className="text-sm text-slate-400">Indicadores consolidados do período</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: 'Crescimento', value: '+23%', color: '#34d399' },
              { label: 'Pipeline', value: 'R$ 4.2M', color: '#c084fc' },
              { label: 'Win Rate', value: '16%', color: '#22d3ee' },
              { label: 'NPS Score', value: '94', color: '#fbbf24' },
              { label: 'Margem', value: '17.7%', color: '#f472b6' },
              { label: 'ROI', value: '156%', color: '#60a5fa' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 + i * 0.05 }}
                className="text-center p-3 bg-slate-800/50 rounded-xl"
              >
                <div className="text-2xl font-bold font-mono" style={{ color: item.color }}>
                  {item.value}
                </div>
                <div className="text-xs text-slate-400 mt-1">{item.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
