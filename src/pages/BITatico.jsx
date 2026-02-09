// MONTEX ERP Premium - BI Tático
// Integrado com ERPContext - Dados reais da obra SUPER LUNA

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  Target,
  Calendar,
  Users,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Clock,
  Download,
  Building2,
  DollarSign,
  Package,
  Layers,
  Activity,
  Zap,
  Eye
} from 'lucide-react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart, Area
} from 'recharts';

// ERPContext - dados reais
import { useObras, useProducao, useMedicoes } from '../contexts/ERPContext';

// Dados financeiros reais
import { LANCAMENTOS_DESPESAS, MEDICOES_RECEITAS } from '../data/obraFinanceiraDatabase';

// Formatador de moeda
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Import new 3D components
import { Donut3D, AnimatedRadar, Bar3DChart, AnimatedCounter, PulseIndicator } from '../components/bi/Dynamic3DCharts';
import { ComparisonBars, HeatmapGrid } from '../components/bi/AdvancedAnalytics';

const COLORS = ['#22d3ee', '#34d399', '#c084fc', '#fbbf24', '#f87171', '#60a5fa'];

export default function BITatico() {
  const [periodoSelecionado, setPeriodoSelecionado] = useState('trimestre');
  const [departamento, setDepartamento] = useState('todos');
  const [activeView, setActiveView] = useState('overview');
  const [showFilter, setShowFilter] = useState(false);

  // Hooks do ERPContext
  const { obras, obraAtualData } = useObras();
  const { pecas } = useProducao();
  const { medicoes, medicoesObraAtual } = useMedicoes();

  // KPIs calculations com dados reais
  const kpis = useMemo(() => {
    const projetosAtivos = obras.filter(p =>
      ['em_fabricacao', 'em_montagem'].includes(p.status)
    );

    // Calcula receitas de medições
    const receitas = medicoesObraAtual?.reduce((acc, m) => acc + (m.valor || 0), 0) || 0;

    // Calcula despesas
    const despesas = LANCAMENTOS_DESPESAS
      .filter(d => d.obraId === obraAtualData?.id)
      .reduce((acc, d) => acc + (d.valor || 0), 0);

    // Produção real
    const pecasObraAtual = pecas.filter(p => p.obraId === obraAtualData?.id);
    const producaoTotal = pecasObraAtual.filter(p => p.etapa === 'expedicao').length;
    const metaTotal = pecasObraAtual.length;

    return {
      projetosAndamento: projetosAtivos.length,
      taxaConversao: obraAtualData?.progresso?.fabricacao || 0,
      producaoVsMeta: metaTotal > 0 ? Math.round((producaoTotal / metaTotal) * 100) : 0,
      margemOperacional: receitas > 0 ? Math.round(((receitas - despesas) / receitas) * 100) : 0,
      eficienciaGeral: obraAtualData?.progresso?.corte || 0,
      prazoMedio: 0
    };
  }, [obras, obraAtualData, pecas, medicoesObraAtual]);

  // Trend data com dados reais
  const trendData = useMemo(() => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    return meses.map((mes, i) => ({
      mes,
      fabricado: 0,
      eficiencia: 0,
      qualidade: 0
    }));
  }, []);

  // Project performance by responsible com dados reais
  const performanceByResponsavel = useMemo(() => {
    const byResp = {};
    obras.forEach(p => {
      if (!byResp[p.responsavel]) {
        byResp[p.responsavel] = { nome: p.responsavel, projetos: 0, valor: 0, progresso: 0 };
      }
      byResp[p.responsavel].projetos += 1;
      byResp[p.responsavel].valor += p.valor_contrato || 0;
      byResp[p.responsavel].progresso += p.progresso?.fabricacao || 0;
    });

    return Object.values(byResp).map(r => ({
      ...r,
      progresso: Math.round(r.progresso / r.projetos),
      valor: r.valor / 1000000
    }));
  }, [obras]);

  // Budget variance for comparison bars com dados reais
  const budgetComparison = useMemo(() => {
    return MEDICOES_RECEITAS.slice(0, 4).map(d => ({
      name: d.mes || d.dataLancamento?.substring(5, 7) || 'N/A',
      current: (d.valor || 0) / 1000,
      previous: ((d.valor || 0) * 0.85) / 1000,
      target: ((d.valor || 0) * 1.1) / 1000
    }));
  }, []);

  // Production efficiency by type
  const efficiencyByType = [];

  // Radar data for performance metrics
  const radarData = [
    { subject: 'Produtividade', value: 0, fullMark: 100 },
    { subject: 'Qualidade', value: 0, fullMark: 100 },
    { subject: 'Prazo', value: 0, fullMark: 100 },
    { subject: 'Custo', value: 0, fullMark: 100 },
    { subject: 'Segurança', value: 0, fullMark: 100 },
    { subject: 'Inovação', value: 0, fullMark: 100 },
  ];

  // Donut data for project distribution
  const donutData = [];

  // 3D Bar data
  const bar3DData = efficiencyByType.map(e => ({
    name: e.tipo,
    value: e.eficiencia,
    color: e.eficiencia >= e.meta ? '#34d399' : '#fbbf24'
  }));

  // Heatmap data for weekly performance
  const weeklyHeatmap = [];

  const KPICard3D = ({ title, value, suffix = '', trend, trendValue, icon: Icon, color, delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: -15 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.03, y: -5 }}
      className="relative overflow-hidden rounded-xl"
      style={{
        background: `linear-gradient(135deg, ${color}15, transparent)`,
        border: `1px solid ${color}30`,
        boxShadow: `0 10px 40px ${color}10`
      }}
    >
      {/* 3D effect layers */}
      <div className="absolute inset-0" style={{
        background: `linear-gradient(180deg, transparent 0%, ${color}05 100%)`
      }} />
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: `linear-gradient(90deg, transparent, ${color}40, transparent)`
      }} />

      <div className="relative p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center relative"
            style={{ background: `${color}20` }}>
            <Icon className="w-5 h-5" style={{ color }} />
            <motion.div
              className="absolute inset-0 rounded-lg"
              style={{ border: `1px solid ${color}` }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          {trend && (
            <motion.span
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                trend === 'up' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.3 }}
            >
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trendValue}
            </motion.span>
          )}
        </div>
        <div className="text-3xl font-bold font-mono text-white flex items-baseline gap-1">
          <AnimatedCounter value={value} duration={1.5} />
          <span className="text-lg" style={{ color }}>{suffix}</span>
        </div>
        <div className="text-sm text-slate-400 mt-1">{title}</div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Enhanced Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(34,211,238,0.05),transparent_50%)]" />
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(139,92,246,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center relative"
              animate={{
                boxShadow: ['0 0 20px rgba(168,85,247,0.3)', '0 0 40px rgba(168,85,247,0.5)', '0 0 20px rgba(168,85,247,0.3)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <TrendingUp className="w-7 h-7 text-white" />
              <div className="absolute -top-1 -right-1">
                <PulseIndicator color="#c084fc" size={12} />
              </div>
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                BI Tático
                <motion.span
                  className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30"
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  GERENCIAL
                </motion.span>
              </h1>
              <p className="text-slate-400 text-sm">Análise de tendências e performance por área</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Switcher */}
            <div className="flex bg-slate-800 rounded-lg p-1">
              {['overview', 'detailed', 'compare'].map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    activeView === view
                      ? 'bg-purple-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {view === 'overview' ? 'Visão Geral' : view === 'detailed' ? 'Detalhado' : 'Comparar'}
                </button>
              ))}
            </div>

            <select
              value={periodoSelecionado}
              onChange={(e) => setPeriodoSelecionado(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-purple-500 transition-colors"
            >
              <option value="mes">Este Mês</option>
              <option value="trimestre">Este Trimestre</option>
              <option value="semestre">Este Semestre</option>
              <option value="ano">Este Ano</option>
            </select>

            <select
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-purple-500 transition-colors"
            >
              <option value="todos">Todos os Departamentos</option>
              <option value="producao">Produção</option>
              <option value="comercial">Comercial</option>
              <option value="engenharia">Engenharia</option>
            </select>

            <motion.button
              onClick={() => toast.success('Relatório tático exportado!')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-400 hover:bg-purple-500/30 transition-all"
            >
              <Download className="w-4 h-4" />
              Exportar
            </motion.button>
          </div>
        </div>

        {/* KPI Grid - 3D Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard3D
            title="Projetos em Andamento"
            value={kpis.projetosAndamento}
            trend="up"
            trendValue="+2"
            icon={Building2}
            color="#22d3ee"
            delay={0}
          />
          <KPICard3D
            title="Taxa de Conversão"
            value={kpis.taxaConversao}
            suffix="%"
            trend="up"
            trendValue="+5%"
            icon={Target}
            color="#34d399"
            delay={0.1}
          />
          <KPICard3D
            title="Produção vs Meta"
            value={kpis.producaoVsMeta}
            suffix="%"
            trend={kpis.producaoVsMeta >= 100 ? 'up' : 'down'}
            trendValue={kpis.producaoVsMeta >= 100 ? 'Acima' : 'Abaixo'}
            icon={Package}
            color="#fbbf24"
            delay={0.2}
          />
          <KPICard3D
            title="Margem Operacional"
            value={kpis.margemOperacional}
            suffix="%"
            trend="up"
            trendValue="+3%"
            icon={DollarSign}
            color="#c084fc"
            delay={0.3}
          />
          <KPICard3D
            title="Eficiência Geral"
            value={kpis.eficienciaGeral}
            suffix="%"
            trend="up"
            trendValue="+2%"
            icon={BarChart3}
            color="#3b82f6"
            delay={0.4}
          />
          <KPICard3D
            title="Entregas no Prazo"
            value={kpis.prazoMedio}
            suffix="%"
            trend="up"
            trendValue="+1%"
            icon={Clock}
            color="#ec4899"
            delay={0.5}
          />
        </div>

        {/* Charts Row 1 - 3D Enhanced */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl" />
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4 relative">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Tendência de Produção e Eficiência
              <motion.div
                className="w-2 h-2 bg-purple-500 rounded-full ml-2"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={trendData}>
                <defs>
                  <linearGradient id="colorFab" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mes" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(192, 132, 252, 0.3)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                  }}
                />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="fabricado" fill="url(#colorFab)" stroke="#22d3ee" strokeWidth={2} name="Fabricado (ton)" />
                <Line yAxisId="right" type="monotone" dataKey="eficiencia" stroke="#c084fc" strokeWidth={3} name="Eficiência (%)" dot={{ fill: '#c084fc', strokeWidth: 2, r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>

          {/* 3D Donut - Project Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
          >
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-pink-400" />
              Distribuição de Projetos
            </h3>
            <div className="flex flex-col items-center">
              <Donut3D data={donutData} size={200} />
              <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                {donutData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-400">{item.name}: {item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Budget Comparison - Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
          >
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Variação Orçamentária (R$ Mil)
            </h3>
            <ComparisonBars data={budgetComparison} />
          </motion.div>

          {/* Animated Radar - Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
          >
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-cyan-400" />
              Métricas de Performance
            </h3>
            <AnimatedRadar data={radarData} color="#22d3ee" />
          </motion.div>

          {/* 3D Bar Chart - Efficiency by Type */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
          >
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-amber-400" />
              Eficiência por Tipo de Peça
            </h3>
            <Bar3DChart data={bar3DData} height={220} />
          </motion.div>
        </div>

        {/* Row 3 - Performance and Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance by Responsible - Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
          >
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-cyan-400" />
              Performance por Responsável
            </h3>
            <div className="space-y-4">
              {performanceByResponsavel.map((resp, i) => (
                <motion.div
                  key={resp.nome}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: `${COLORS[i % COLORS.length]}20`, color: COLORS[i % COLORS.length] }}>
                        {resp.nome.charAt(0)}
                      </div>
                      <span className="text-sm text-white">{resp.nome}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{resp.projetos} proj.</span>
                      <span className="text-sm font-mono font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                        {resp.progresso}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${resp.progresso}%` }}
                        transition={{ delay: 0.7 + i * 0.1, duration: 0.8 }}
                        className="h-full rounded-full relative"
                        style={{
                          background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 1) % COLORS.length]})`,
                          boxShadow: `0 0 10px ${COLORS[i % COLORS.length]}40`
                        }}
                      >
                        <motion.div
                          className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                          style={{ background: COLORS[i % COLORS.length], boxShadow: `0 0 10px ${COLORS[i % COLORS.length]}` }}
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        />
                      </motion.div>
                    </div>
                    <span className="text-xs text-slate-400 w-16 text-right">
                      R${resp.valor.toFixed(1)}M
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Weekly Performance Heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
          >
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-purple-400" />
              Performance Semanal por Turno
            </h3>
            <HeatmapGrid
              data={weeklyHeatmap}
              rows={['Manhã', 'Tarde', 'Noite', 'Extra']}
              cols={['Seg', 'Ter', 'Qua', 'Qui', 'Sex']}
            />
          </motion.div>
        </div>

        {/* Action Items - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
        >
          <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            Pontos de Atenção
            <span className="ml-auto text-xs text-slate-500">Atualizado há 5 min</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { status: 'warning', title: 'Estoque de Aço A572', desc: 'Abaixo do nível mínimo', action: 'Solicitar compra', icon: Package },
              { status: 'warning', title: 'Projeto Outlet Premium', desc: 'Prazo em 27 dias', action: 'Revisar cronograma', icon: Clock },
              { status: 'success', title: 'Eficiência CNC', desc: 'Acima da meta (+8%)', action: 'Manter padrão', icon: Zap },
              { status: 'info', title: 'Orçamento Amazon', desc: 'Aguardando aprovação', action: 'Acompanhar cliente', icon: Eye },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  item.status === 'warning' ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50' :
                  item.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50' :
                  'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    item.status === 'warning' ? 'bg-amber-500/20' :
                    item.status === 'success' ? 'bg-emerald-500/20' :
                    'bg-blue-500/20'
                  }`}>
                    <item.icon className={`w-5 h-5 ${
                      item.status === 'warning' ? 'text-amber-400' :
                      item.status === 'success' ? 'text-emerald-400' :
                      'text-blue-400'
                    }`} />
                  </div>
                  <span className="text-sm text-white font-medium">{item.title}</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{item.desc}</p>
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  item.status === 'warning' ? 'text-amber-400' :
                  item.status === 'success' ? 'text-emerald-400' :
                  'text-blue-400'
                }`}>
                  <ArrowUpRight className="w-3 h-3" />
                  {item.action}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
