/**
 * MONTEX ERP Premium - Dashboard ERP Integrado
 *
 * Visão consolidada de todas as obras com métricas,
 * progresso de produção, alertas e indicadores de desempenho
 * Integrado com ERPContext para dados em tempo real
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Building2,
  Package,
  Truck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Weight,
  DollarSign,
  Scissors,
  Wrench,
  Zap,
  Paintbrush,
  Users,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  RefreshCw,
  ChevronRight,
  Gauge,
  Target,
  Box
} from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import {
  useObras,
  useEstoque,
  useProducao,
  useExpedicao,
  useMedicoes,
  useEquipes
} from '../contexts/ERPContext';
import {
  ETAPAS_PRODUCAO,
  STATUS_OBRA,
  STATUS_EXPEDICAO
} from '../data/database';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Cores para gráficos
const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];
const ETAPA_COLORS = {
  corte: '#ef4444',
  fabricacao: '#3b82f6',
  solda: '#8b5cf6',
  pintura: '#ec4899',
  expedicao: '#06b6d4',
  montagem: '#10b981'
};

// Componente de Card de KPI
const KPICard = ({ title, value, subtitle, icon: Icon, color, trend, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`bg-gradient-to-br from-${color}-500/20 to-${color}-600/10 backdrop-blur-xl
               rounded-xl border border-${color}-500/30 p-4 relative overflow-hidden`}
    style={{
      background: `linear-gradient(135deg, rgba(${color === 'blue' ? '59, 130, 246' : color === 'purple' ? '139, 92, 246' : color === 'emerald' ? '16, 185, 129' : color === 'orange' ? '249, 115, 22' : color === 'cyan' ? '6, 182, 212' : color === 'red' ? '239, 68, 68' : '100, 116, 139'}, 0.2), rgba(${color === 'blue' ? '59, 130, 246' : color === 'purple' ? '139, 92, 246' : color === 'emerald' ? '16, 185, 129' : color === 'orange' ? '249, 115, 22' : color === 'cyan' ? '6, 182, 212' : color === 'red' ? '239, 68, 68' : '100, 116, 139'}, 0.05))`
    }}
  >
    <div className="absolute top-0 right-0 w-16 h-16 rounded-full -mr-4 -mt-4"
         style={{ background: `rgba(${color === 'blue' ? '59, 130, 246' : color === 'purple' ? '139, 92, 246' : color === 'emerald' ? '16, 185, 129' : color === 'orange' ? '249, 115, 22' : color === 'cyan' ? '6, 182, 212' : color === 'red' ? '239, 68, 68' : '100, 116, 139'}, 0.1)` }} />
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg"
           style={{ background: `rgba(${color === 'blue' ? '59, 130, 246' : color === 'purple' ? '139, 92, 246' : color === 'emerald' ? '16, 185, 129' : color === 'orange' ? '249, 115, 22' : color === 'cyan' ? '6, 182, 212' : color === 'red' ? '239, 68, 68' : '100, 116, 139'}, 0.2)` }}>
        <Icon className="w-5 h-5"
              style={{ color: color === 'blue' ? '#3b82f6' : color === 'purple' ? '#8b5cf6' : color === 'emerald' ? '#10b981' : color === 'orange' ? '#f97316' : color === 'cyan' ? '#06b6d4' : color === 'red' ? '#ef4444' : '#64748b' }} />
      </div>
      <div>
        <p className="text-xs text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
    {subtitle && (
      <p className="text-xs mt-2 flex items-center gap-1"
         style={{ color: color === 'blue' ? '#60a5fa' : color === 'purple' ? '#a78bfa' : color === 'emerald' ? '#34d399' : color === 'orange' ? '#fb923c' : color === 'cyan' ? '#22d3ee' : color === 'red' ? '#f87171' : '#94a3b8' }}>
        {trend !== undefined && (
          trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
        )}
        {subtitle}
      </p>
    )}
  </motion.div>
);

// Componente de Progress Ring
const ProgressRing = ({ value, color, size = 80, strokeWidth = 8, label }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#334155"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-white">{value}%</span>
        {label && <span className="text-[10px] text-slate-400">{label}</span>}
      </div>
    </div>
  );
};

export default function DashboardERPIntegrado() {
  const { obras = [], obraAtual, setObraAtual, obraAtualData } = useObras();
  const { estoque = [], alertasEstoque = [] } = useEstoque();
  const { pecas: pecasProducao = [] } = useProducao();
  const { expedicoes = [] } = useExpedicao();
  const { medicoes = [] } = useMedicoes();
  const { equipes = [] } = useEquipes();

  const [periodo, setPeriodo] = useState('mes');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estatísticas gerais
  const estatisticas = useMemo(() => {
    const obrasAtivas = obras.filter(o => o.status === STATUS_OBRA.EM_ANDAMENTO);
    const obrasFinalizadas = obras.filter(o => o.status === STATUS_OBRA.FINALIZADA);

    // Peso total calculado a partir dos itens de produção (itens_producao)
    const pesoTotalObras = pecasProducao.reduce((sum, p) => sum + (p.peso_total || 0), 0);
    const valorTotalObras = obras.reduce((sum, o) => sum + (o.valor || 0), 0);

    // Progresso de produção por etapa
    const progressoPorEtapa = {};
    Object.values(ETAPAS_PRODUCAO).forEach(etapa => {
      progressoPorEtapa[etapa] = pecasProducao.filter(p => p.etapa === etapa).length;
    });

    // Peças por status
    const pecasTotal = pecasProducao.length;
    const pecasFinalizadas = pecasProducao.filter(p => p.etapa === ETAPAS_PRODUCAO.EXPEDIDO).length;

    // Expedições
    const expedicoesAtivas = expedicoes.filter(
      e => e.status !== STATUS_EXPEDICAO.ENTREGUE
    ).length;
    const expedicoesEntregues = expedicoes.filter(
      e => e.status === STATUS_EXPEDICAO.ENTREGUE
    ).length;
    const pesoExpedido = expedicoes
      .filter(e => e.status === STATUS_EXPEDICAO.ENTREGUE)
      .reduce((sum, e) => sum + (e.pesoTotal || 0), 0);

    // Medições
    const valorMedicoes = medicoes.reduce((sum, m) => sum + (m.valor || 0), 0);
    const medicoesAprovadas = medicoes.filter(m => m.status === 'aprovada');

    // Estoque
    const itensEstoque = estoque.length;
    const pesoEstoque = estoque.reduce((sum, item) => sum + ((item.peso || 0) * (item.quantidade || 0)), 0);

    return {
      obrasTotal: obras.length,
      obrasAtivas: obrasAtivas.length,
      obrasFinalizadas: obrasFinalizadas.length,
      pesoTotalObras,
      valorTotalObras,
      progressoPorEtapa,
      pecasTotal,
      pecasFinalizadas,
      expedicoesAtivas,
      expedicoesEntregues,
      pesoExpedido,
      valorMedicoes,
      medicoesAprovadas: medicoesAprovadas.length,
      alertasEstoque: alertasEstoque?.length || 0,
      equipesAtivas: equipes.filter(e => e.membros?.length > 0).length,
      itensEstoque,
      pesoEstoque
    };
  }, [obras, pecasProducao, expedicoes, medicoes, estoque, equipes, alertasEstoque]);

  // Dados para gráficos
  const dadosProgressoObras = useMemo(() => {
    return obras
      .filter(o => o.status === STATUS_OBRA.EM_ANDAMENTO)
      .map(obra => {
        const progresso = obra.progresso || {};
        const progressoTotal = Object.values(progresso).reduce((a, b) => a + b, 0) / 6;
        return {
          nome: obra.codigo,
          cliente: obra.cliente,
          corte: progresso.corte || 0,
          fabricacao: progresso.fabricacao || 0,
          solda: progresso.solda || 0,
          pintura: progresso.pintura || 0,
          expedicao: progresso.expedicao || 0,
          montagem: progresso.montagem || 0,
          total: progressoTotal,
          peso: obra.pesoTotal || 0,
          valor: obra.valor || 0
        };
      });
  }, [obras]);

  const dadosPizzaEtapas = useMemo(() => {
    return Object.entries(estatisticas.progressoPorEtapa)
      .filter(([_, qtd]) => qtd > 0)
      .map(([etapa, qtd]) => ({
        name: etapa.charAt(0).toUpperCase() + etapa.slice(1).replace('_', ' '),
        value: qtd,
        color: ETAPA_COLORS[etapa.toLowerCase().split('_')[0]] || '#64748b'
      }));
  }, [estatisticas.progressoPorEtapa]);

  const dadosProducaoSemanal = useMemo(() => {
    // Será preenchido com dados reais de produção
    return [];
  }, []);

  // Refresh simulado
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // KPIs - Será preenchido com dados reais
  const oeeGeral = 0;
  const taxaEntrega = 0;
  const qualidade = 0;
  const produtividade = 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
                <LayoutDashboard className="w-8 h-8 text-white" />
              </div>
              Dashboard ERP Integrado
            </h1>
            <p className="text-slate-400 mt-1">
              Visão consolidada de todas as operações • {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select.Root value={periodo} onValueChange={setPeriodo}>
              <Select.Trigger className="flex items-center gap-2 px-4 py-2 bg-slate-800/50
                                       border border-slate-700/50 rounded-xl text-white">
                <Calendar className="w-4 h-4 text-slate-400" />
                <Select.Value />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-50">
                  <Select.Viewport>
                    <Select.Item value="semana" className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer">
                      <Select.ItemText>Esta Semana</Select.ItemText>
                    </Select.Item>
                    <Select.Item value="mes" className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer">
                      <Select.ItemText>Este Mês</Select.ItemText>
                    </Select.Item>
                    <Select.Item value="ano" className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer">
                      <Select.ItemText>Este Ano</Select.ItemText>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>

            <button
              onClick={handleRefresh}
              className={`p-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400
                       hover:text-white hover:bg-slate-700/50 transition-all
                       ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <KPICard
            title="Obras Ativas"
            value={estatisticas.obrasAtivas}
            subtitle={`${estatisticas.obrasTotal} total`}
            icon={Building2}
            color="blue"
            trend={1}
            delay={0.1}
          />
          <KPICard
            title="Peso Total"
            value={`${(estatisticas.pesoTotalObras / 1000).toFixed(0)} ton`}
            subtitle="em obras"
            icon={Weight}
            color="purple"
            delay={0.15}
          />
          <KPICard
            title="Valor Obras"
            value={`${(estatisticas.valorTotalObras / 1000000).toFixed(1)}M`}
            subtitle="em contratos"
            icon={DollarSign}
            color="emerald"
            trend={1}
            delay={0.2}
          />
          <KPICard
            title="Peças Produção"
            value={estatisticas.pecasTotal}
            subtitle={`${estatisticas.pecasFinalizadas} finalizadas`}
            icon={Package}
            color="orange"
            delay={0.25}
          />
          <KPICard
            title="Expedições"
            value={estatisticas.expedicoesAtivas}
            subtitle={`${(estatisticas.pesoExpedido / 1000).toFixed(1)} ton expedidas`}
            icon={Truck}
            color="cyan"
            delay={0.3}
          />
          <KPICard
            title="Alertas"
            value={estatisticas.alertasEstoque}
            subtitle={estatisticas.alertasEstoque > 0 ? 'estoque baixo' : 'tudo normal'}
            icon={AlertTriangle}
            color={estatisticas.alertasEstoque > 0 ? 'red' : 'slate'}
            delay={0.35}
          />
        </div>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progresso das Obras */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                     rounded-2xl border border-slate-700/50 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-400" />
                Progresso por Obra
              </h3>
              <button
                onClick={() => toast.success('Carregando todas as obras...')}
                className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
                Ver todas <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {dadosProgressoObras.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Nenhuma obra em andamento
                </div>
              ) : (
                dadosProgressoObras.slice(0, 4).map((obra, idx) => (
                  <motion.div
                    key={obra.nome}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    className="bg-slate-800/50 rounded-xl p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
                    onClick={() => {
                      const obraObj = obras.find(o => o.codigo === obra.nome);
                      if (obraObj) setObraAtual(obraObj.id);
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600
                                      rounded-lg flex items-center justify-center text-white font-bold">
                          {obra.nome.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-white font-medium">{obra.nome}</p>
                          <p className="text-xs text-slate-400">
                            {(obra.peso / 1000).toFixed(1)} ton • R$ {(obra.valor / 1000000).toFixed(2)}M
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-2xl font-bold ${
                          obra.total >= 80 ? 'text-emerald-400' :
                          obra.total >= 50 ? 'text-amber-400' : 'text-slate-300'
                        }`}>
                          {Math.round(obra.total)}%
                        </span>
                      </div>
                    </div>

                    {/* Barras de progresso por etapa */}
                    <div className="grid grid-cols-6 gap-1">
                      {['corte', 'fabricacao', 'solda', 'pintura', 'expedicao', 'montagem'].map(etapa => (
                        <div key={etapa} className="relative group">
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${obra[etapa]}%` }}
                              transition={{ duration: 0.8, delay: idx * 0.1 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: ETAPA_COLORS[etapa] }}
                            />
                          </div>
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1
                                        bg-slate-700 rounded text-xs text-white opacity-0
                                        group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {etapa}: {obra[etapa]}%
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Legenda */}
                    <div className="flex items-center gap-4 mt-3 text-xs">
                      {[
                        { key: 'corte', icon: Scissors },
                        { key: 'fabricacao', icon: Wrench },
                        { key: 'solda', icon: Zap },
                        { key: 'pintura', icon: Paintbrush },
                        { key: 'expedicao', icon: Truck },
                        { key: 'montagem', icon: Building2 }
                      ].map(({ key, icon: Icon }) => (
                        <div key={key} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ETAPA_COLORS[key] }} />
                          <Icon className="w-3 h-3 text-slate-500" />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Distribuição por Etapa */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                     rounded-2xl border border-slate-700/50 p-5"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <PieChartIcon className="w-5 h-5 text-purple-400" />
              Peças por Etapa
            </h3>

            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={dadosPizzaEtapas}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {dadosPizzaEtapas.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 gap-2 mt-4">
              {dadosPizzaEtapas.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-slate-400">{item.name}</span>
                  <span className="text-xs text-white font-bold ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Segunda Linha de Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Produção Semanal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                     rounded-2xl border border-slate-700/50 p-5"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Produção Semanal (peças)
            </h3>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dadosProducaoSemanal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="dia" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="corte" name="Corte" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fabricacao" name="Fabricação" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="solda" name="Solda" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pintura" name="Pintura" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Indicadores de Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                     rounded-2xl border border-slate-700/50 p-5"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Gauge className="w-5 h-5 text-amber-400" />
              Indicadores de Performance
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col items-center">
                <ProgressRing value={oeeGeral} color="#10b981" label="OEE" />
                <p className="text-sm text-slate-400 mt-2">OEE Geral</p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col items-center">
                <ProgressRing value={taxaEntrega} color="#06b6d4" label="Prazo" />
                <p className="text-sm text-slate-400 mt-2">Entregas no Prazo</p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col items-center">
                <ProgressRing value={qualidade} color="#8b5cf6" label="Qual" />
                <p className="text-sm text-slate-400 mt-2">Qualidade</p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col items-center">
                <ProgressRing value={produtividade} color="#f59e0b" label="Prod" />
                <p className="text-sm text-slate-400 mt-2">Produtividade</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Terceira Linha - Atividades e Equipes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Atividades Recentes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                     rounded-2xl border border-slate-700/50 p-5"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-emerald-400" />
              Atividades Recentes
            </h3>

            <div className="space-y-3">
              {[
                // Será preenchido com atividades reais
              ].map((atividade, idx) => {
                const IconComp = atividade.icon;
                const colorMap = {
                  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
                  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
                  red: { bg: 'bg-red-500/20', text: 'text-red-400' },
                  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
                  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400' }
                };
                const colors = colorMap[atividade.color] || colorMap.emerald;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl"
                  >
                    <div className={`p-2 ${colors.bg} rounded-lg`}>
                      <IconComp className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{atividade.msg}</p>
                    </div>
                    <span className="text-xs text-slate-500">{atividade.tempo}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Equipes Ativas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                     rounded-2xl border border-slate-700/50 p-5"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-pink-400" />
              Equipes Ativas ({estatisticas.equipesAtivas})
            </h3>

            <div className="space-y-3">
              {equipes.slice(0, 5).map((equipe, idx) => (
                <div
                  key={equipe.id}
                  className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600
                                rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {equipe.nome?.slice(0, 2) || 'EQ'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{equipe.nome}</p>
                    <p className="text-xs text-slate-400">{equipe.setor}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex -space-x-2">
                      {(equipe.membros || []).slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 bg-slate-600 rounded-full border-2 border-slate-800"
                        />
                      ))}
                    </div>
                    {(equipe.membros?.length || 0) > 3 && (
                      <span className="text-xs text-slate-400">
                        +{equipe.membros.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => toast.success('Carregando todas as equipes...')}
              className="w-full mt-4 py-2 text-sm text-slate-400 hover:text-white
                             border border-slate-700/50 rounded-xl hover:bg-slate-700/30 transition-colors">
              Ver todas as equipes
            </button>
          </motion.div>
        </div>

        {/* Resumo Financeiro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 backdrop-blur-xl
                   rounded-2xl border border-emerald-500/30 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Resumo Financeiro - Medições
            </h3>
            <span className="text-sm text-emerald-400">
              {estatisticas.medicoesAprovadas} medições aprovadas
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Valor Total Medições</p>
              <p className="text-2xl font-bold text-white">
                R$ {(estatisticas.valorMedicoes / 1000).toFixed(0)}k
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Média por Medição</p>
              <p className="text-2xl font-bold text-emerald-400">
                R$ {medicoes.length > 0
                  ? (estatisticas.valorMedicoes / medicoes.length / 1000).toFixed(0)
                  : 0}k
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">R$/kg Médio</p>
              <p className="text-2xl font-bold text-cyan-400">
                R$ 0,00
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Expedições Entregues</p>
              <p className="text-2xl font-bold text-amber-400">
                {estatisticas.expedicoesEntregues}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Estoque Resumo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                   rounded-2xl border border-slate-700/50 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Box className="w-5 h-5 text-blue-400" />
              Resumo do Estoque
            </h3>
            {estatisticas.alertasEstoque > 0 && (
              <span className="flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                <AlertTriangle className="w-4 h-4" />
                {estatisticas.alertasEstoque} alertas
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{estatisticas.itensEstoque}</p>
              <p className="text-sm text-slate-400">Itens em Estoque</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-400">
                {(estatisticas.pesoEstoque / 1000).toFixed(1)}
              </p>
              <p className="text-sm text-slate-400">Toneladas</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-emerald-400">
                {estoque.filter(i => i.status === 'disponivel').length}
              </p>
              <p className="text-sm text-slate-400">Disponíveis</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-amber-400">
                {estoque.filter(i => i.reservas?.length > 0).length}
              </p>
              <p className="text-sm text-slate-400">Reservados</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
