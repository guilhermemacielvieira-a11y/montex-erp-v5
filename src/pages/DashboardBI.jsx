// MONTEX ERP Premium - Dashboard BI
// Integrado com useDashboardMetrics - Centralized Metrics Hook

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Database,
  Download,
  RefreshCw,
  Layers,
  Activity,
  Target,
  DollarSign,
  Package
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend,
  AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Treemap
} from 'recharts';

import BIFilters from '@/components/bi/BIFilters';
import PivotTable from '@/components/bi/PivotTable';
import RelationshipModel from '@/components/bi/RelationshipModel';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

// Formatador de moeda
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const COLORS = ['#22d3ee', '#34d399', '#c084fc', '#fbbf24', '#f87171', '#60a5fa'];

export default function DashboardBI() {
  // Centralized metrics hook
  const metrics = useDashboardMetrics();

  // Extract raw data for BI-specific filtering
  const { obras, pecas } = metrics.raw;

  const [filters, setFilters] = useState({
    periodo: 'all',
    status: 'todos',
    projeto: 'todos',
    responsavel: 'todos'
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);

  // Converter obras para formato compatível com filtros
  const projetos = useMemo(() => {
    return obras.map(obra => ({
      ...obra,
      valor_total: obra.valor || 0,
      peso_total: obra.pesoTotal || 0,
      progresso: obra.progresso || 0,
      cliente: obra.cliente || 'CONSTRUTORA CARMO'
    }));
  }, [obras]);

  // Filter data based on current filters
  const filteredProjetos = useMemo(() => {
    return projetos.filter(p => {
      if (filters.status !== 'todos' && p.status !== filters.status) return false;
      if (filters.projeto !== 'todos' && p.id !== filters.projeto) return false;
      if (filters.responsavel !== 'todos' && p.responsavel !== filters.responsavel) return false;
      return true;
    });
  }, [projetos, filters]);

  // Calculate KPIs from filtered projetos and base metrics
  const kpis = useMemo(() => {
    const totalValor = filteredProjetos.reduce((acc, p) => acc + (p.valor_total || 0), 0);
    const totalPeso = filteredProjetos.reduce((acc, p) => acc + (p.peso_total || 0), 0);
    const progressoMedio = filteredProjetos.reduce((acc, p) => acc + (p.progresso || 0), 0) / (filteredProjetos.length || 1);

    // Use base financial metrics from centralized hook, but apply to filtered data
    const receitas = metrics.financeiro.receitas * 1000000; // Convert back to base
    const despesas = metrics.financeiro.despesas * 1000000;
    const lucro = receitas - despesas;

    return {
      totalProjetos: filteredProjetos.length,
      totalValor,
      totalPeso,
      progressoMedio,
      receitas,
      despesas,
      lucro,
      margemLucro: receitas > 0 ? ((lucro / receitas) * 100).toFixed(1) : 0
    };
  }, [filteredProjetos, metrics.financeiro]);

  // Chart data preparations
  const statusDistribution = useMemo(() => {
    const counts = {};
    filteredProjetos.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name === 'em_fabricacao' ? 'Fabricação' :
            name === 'em_montagem' ? 'Montagem' :
            name === 'aprovado' ? 'Aprovado' :
            name === 'concluido' ? 'Concluído' : name,
      value
    }));
  }, [filteredProjetos]);

  const valorPorCliente = useMemo(() => {
    const byClient = {};
    filteredProjetos.forEach(p => {
      byClient[p.cliente] = (byClient[p.cliente] || 0) + (p.valor_total || 0);
    });
    return Object.entries(byClient)
      .map(([name, value]) => ({ name: name.split(' ')[0], value: value / 1000000 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredProjetos]);

  // Dados de produção derivados dos dados reais
  const dadosProducao = useMemo(() => {
    const pesoReal = pecas.reduce((acc, p) => acc + (p.peso || 0), 0);
    if (pesoReal === 0) return [];
    return [
      { mes: 'Atual', fabricado: pesoReal, planejado: 0 },
    ];
  }, [pecas]);

  const performanceRadar = useMemo(() => {
    return [
      { subject: 'Produção', A: 0, fullMark: 100 },
      { subject: 'Qualidade', A: 0, fullMark: 100 },
      { subject: 'Prazo', A: 0, fullMark: 100 },
      { subject: 'Custo', A: 0, fullMark: 100 },
      { subject: 'Segurança', A: 0, fullMark: 100 },
    ];
  }, []);

  const treemapData = useMemo(() => {
    return filteredProjetos.map(p => ({
      name: p.nome.split(' - ')[0],
      size: p.valor_total || 0,
      fill: p.status === 'em_fabricacao' ? '#fbbf24' :
            p.status === 'em_montagem' ? '#34d399' :
            p.status === 'aprovado' ? '#60a5fa' : '#c084fc'
    }));
  }, [filteredProjetos]);

  const handleReset = () => {
    setFilters({
      periodo: 'all',
      status: 'todos',
      projeto: 'todos',
      responsavel: 'todos'
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'analysis', label: 'Análise OLAP', icon: Layers },
    { id: 'relations', label: 'Relações', icon: Activity },
  ];

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative z-10 p-4 lg:p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="relative"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <Database className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -inset-1 bg-purple-500/30 rounded-xl blur-lg -z-10" />
            </motion.div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                Business Intelligence
                <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30 font-mono">
                  OLAP
                </span>
              </h1>
              <p className="text-slate-400 text-sm">
                Análise avançada de dados • {filteredProjetos.length} projetos filtrados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className={`p-2 bg-slate-800/80 border border-slate-700 rounded-lg hover:border-purple-500/50 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-5 h-5 text-slate-400" />
            </button>
            <button
              onClick={() => toast.success('Dashboard exportado em PDF!')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-400 hover:bg-purple-500/30 transition-all"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4"
        >
          <BIFilters
            filters={filters}
            onFilterChange={setFilters}
            onReset={handleReset}
          />
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Valor Total', value: formatCurrency(kpis.totalValor), icon: DollarSign, color: 'emerald', trend: '+12%' },
            { label: 'Peso Total', value: `${(kpis.totalPeso / 1000).toFixed(0)} ton`, icon: Package, color: 'cyan', trend: '+8%' },
            { label: 'Progresso Médio', value: `${kpis.progressoMedio.toFixed(1)}%`, icon: Target, color: 'purple', trend: '+5%' },
            { label: 'Margem de Lucro', value: `${kpis.margemLucro}%`, icon: TrendingUp, color: 'amber', trend: '+3%' },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="relative group"
            >
              <div className={`absolute -inset-0.5 bg-${kpi.color}-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className={`relative bg-slate-800/80 backdrop-blur-xl rounded-xl border border-${kpi.color}-500/30 p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <kpi.icon className={`w-5 h-5 text-${kpi.color}-400`} />
                  <span className="text-xs text-emerald-400">{kpi.trend}</span>
                </div>
                <div className={`text-2xl font-bold text-${kpi.color}-400 font-mono`}>{kpi.value}</div>
                <div className="text-xs text-slate-400 mt-1">{kpi.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-700/50 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                ${activeTab === tab.id
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                  : 'text-slate-400 hover:bg-slate-800/50 border border-transparent'}
              `}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Status Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4"
            >
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-400" />
                Distribuição por Status
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </motion.div>

            {/* Valor por Cliente */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4"
            >
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                Valor por Cliente (M)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={valorPorCliente} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={80} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [`R$ ${value.toFixed(2)}M`, 'Valor']}
                  />
                  <Bar dataKey="value" fill="#22d3ee" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Performance Radar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4"
            >
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                Performance Geral
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={performanceRadar}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={11} />
                  <PolarRadiusAxis stroke="#334155" />
                  <Radar
                    name="Performance"
                    dataKey="A"
                    stroke="#34d399"
                    fill="#34d399"
                    fillOpacity={0.3}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Production Trend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4"
            >
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                Tendência de Produção
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={dadosProducao}>
                  <defs>
                    <linearGradient id="colorFabricado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPlanejado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="fabricado"
                    stroke="#22d3ee"
                    fillOpacity={1}
                    fill="url(#colorFabricado)"
                    name="Fabricado"
                  />
                  <Area
                    type="monotone"
                    dataKey="planejado"
                    stroke="#c084fc"
                    fillOpacity={1}
                    fill="url(#colorPlanejado)"
                    name="Planejado"
                  />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Treemap */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4"
            >
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-pink-400" />
                Mapa de Valores
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="#1e293b"
                  content={({ x, y, width, height, name, fill }) => (
                    <g>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={fill}
                        stroke="#1e293b"
                        strokeWidth={2}
                        rx={4}
                      />
                      {width > 50 && height > 30 && (
                        <text
                          x={x + width / 2}
                          y={y + height / 2}
                          textAnchor="middle"
                          fill="#fff"
                          fontSize={10}
                        >
                          {name}
                        </text>
                      )}
                    </g>
                  )}
                />
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <PivotTable data={filteredProjetos} title="Análise OLAP de Projetos" />
          </motion.div>
        )}

        {activeTab === 'relations' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <RelationshipModel />
          </motion.div>
        )}
      </div>
    </div>
  );
}
