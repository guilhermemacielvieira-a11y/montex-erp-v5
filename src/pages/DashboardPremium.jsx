import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Zap,
  Package,
  AlertCircle,
  Clock,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { useCommandCenter } from '../hooks/useCommandCenter';
import {
  useObras,
  useProducao,
  useEstoque,
  useLancamentos,
  useEquipes,
} from '../contexts/ERPContext';

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
};

const etapaColors = {
  aguardando: '#F59E0B',
  corte: '#3B82F6',
  fabricacao: '#8B5CF6',
  solda: '#EF4444',
  pintura: '#06B6D4',
  expedido: '#10B981',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

function StatCard({ icon: Icon, label, value, trend, color }) {
  return (
    <motion.div
      variants={itemVariants}
      className="p-4 rounded-lg border"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">{label}</p>
          <p className="text-lg font-semibold text-white">{value}</p>
          {trend && (
            <p className="text-xs mt-1" style={{ color: trend > 0 ? colors.success : colors.danger }}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
          )}
        </div>
        <Icon size={24} style={{ color }} />
      </div>
    </motion.div>
  );
}

function KPICard({ icon: Icon, title, value, unit, subtext, color }) {
  return (
    <motion.div
      variants={itemVariants}
      className="p-6 rounded-lg border h-full"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-gray-400 mb-2">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {unit && <p className="text-xs text-gray-500 mt-1">{unit}</p>}
        </div>
        <Icon size={28} style={{ color }} />
      </div>
      {subtext && <p className="text-xs text-gray-400 border-t pt-3" style={{ borderColor: colors.border }}>{subtext}</p>}
    </motion.div>
  );
}

function ProjectItem({ obra }) {
  const prog = typeof obra.progresso === 'number' ? obra.progresso :
    (obra.progresso && typeof obra.progresso === 'object' ? Math.round(Object.values(obra.progresso).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0) / Math.max(Object.keys(obra.progresso).length, 1)) : 0);
  const progressColor = prog > 75 ? colors.success : prog > 50 ? colors.warning : colors.danger;
  return (
    <motion.div
      variants={itemVariants}
      className="p-3 rounded border mb-3"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        borderColor: colors.border,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{obra.nome}</p>
          <p className="text-xs text-gray-400">{obra.codigo}</p>
        </div>
        <p className="text-xs font-semibold text-gray-300" style={{ color: progressColor }}>
          {prog}%
        </p>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${prog}%`,
            backgroundColor: progressColor,
          }}
        />
      </div>
    </motion.div>
  );
}

function MachineCard({ maquina }) {
  const statusColor = {
    ativa: colors.success,
    operando: colors.accent,
    standby: colors.warning,
    offline: colors.danger,
  }[maquina.status] || colors.info;

  return (
    <motion.div
      variants={itemVariants}
      className="p-4 rounded border text-center"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
    >
      <p className="text-sm font-semibold text-white mb-2">{maquina.nome}</p>
      <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: statusColor + '20', border: `2px solid ${statusColor}` }}>
        <Activity size={20} style={{ color: statusColor }} />
      </div>
      <p className="text-xs text-gray-400 capitalize">{maquina.status}</p>
      {maquina.eficiencia && (
        <p className="text-xs font-semibold text-white mt-1">{maquina.eficiencia}%</p>
      )}
    </motion.div>
  );
}

function ActivityItem({ lancamento }) {
  return (
    <motion.div
      variants={itemVariants}
      className="p-3 border-l-2 mb-3"
      style={{
        borderColor: colors.accent,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
      }}
    >
      <div className="flex items-start gap-2">
        <Clock size={16} style={{ color: colors.info, marginTop: '2px', flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{lancamento.descricao || 'Atividade registrada'}</p>
          <p className="text-xs text-gray-500 mt-1">
            {lancamento.data ? new Date(lancamento.data).toLocaleDateString('pt-BR') : 'Data não informada'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function StockStatus({ estoque }) {
  const normal = estoque?.filter(e => (e.quantidadeAtual || 0) >= (e.quantidadeMinima || e.minimo || 0)).length || 0;
  const baixo = estoque?.filter(e => {
    const qtd = e.quantidadeAtual || 0;
    const min = e.quantidadeMinima || e.minimo || 0;
    return qtd < min && qtd > 0;
  }).length || 0;
  const critico = estoque?.filter(e => (e.quantidadeAtual || 0) === 0).length || 0;
  const total = normal + baixo + critico;

  return (
    <motion.div
      variants={itemVariants}
      className="p-6 rounded-lg border h-full"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
    >
      <p className="text-sm text-gray-400 mb-4">Estoque</p>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Normal</span>
            <span className="text-white font-semibold">{normal}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${total > 0 ? (normal / total) * 100 : 0}%`,
                backgroundColor: colors.success,
              }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Baixo</span>
            <span className="text-white font-semibold">{baixo}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${total > 0 ? (baixo / total) * 100 : 0}%`,
                backgroundColor: colors.warning,
              }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Crítico</span>
            <span className="text-white font-semibold">{critico}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${total > 0 ? (critico / total) * 100 : 0}%`,
                backgroundColor: colors.danger,
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function QualityMetrics() {
  const metrics = [
    { label: 'OEE', value: '87%', color: colors.success },
    { label: 'Conformidade', value: '94%', color: colors.accent },
    { label: 'Retrabalho', value: '3%', color: colors.warning },
  ];

  return (
    <motion.div
      variants={itemVariants}
      className="p-6 rounded-lg border h-full"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
    >
      <p className="text-sm text-gray-400 mb-4">Qualidade & KPIs</p>
      <div className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">{metric.label}</span>
              <span className="font-semibold text-white">{metric.value}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: metric.value,
                  backgroundColor: metric.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function TeamStatus({ equipes }) {
  const presentes = equipes?.filter(e => e.status === 'presente').length || 0;
  const ausentes = equipes?.filter(e => e.status === 'ausente').length || 0;
  const total = presentes + ausentes;

  return (
    <motion.div
      variants={itemVariants}
      className="p-6 rounded-lg border h-full"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
    >
      <p className="text-sm text-gray-400 mb-4">Equipe</p>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} style={{ color: colors.success }} />
            <span className="text-sm text-gray-400">Presentes</span>
          </div>
          <span className="text-lg font-semibold text-white">{presentes}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} style={{ color: colors.warning }} />
            <span className="text-sm text-gray-400">Ausentes</span>
          </div>
          <span className="text-lg font-semibold text-white">{ausentes}</span>
        </div>
        <div className="border-t pt-3" style={{ borderColor: colors.border }}>
          <p className="text-xs text-gray-500">Total: {total} colaboradores</p>
        </div>
      </div>
    </motion.div>
  );
}

function ProductionFlowChart({ pecas }) {
  const flowData = useMemo(() => {
    const etapas = ['aguardando', 'corte', 'fabricacao', 'solda', 'pintura', 'expedido'];
    return etapas.map(etapa => ({
      name: etapa.charAt(0).toUpperCase() + etapa.slice(1),
      quantidade: pecas?.filter(p => p.etapa === etapa || p.etapa === etapa.replace(/[aã]/, 'a')).length || 0,
    }));
  }, [pecas]);

  return (
    <motion.div
      variants={itemVariants}
      className="p-6 rounded-lg border"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
    >
      <p className="text-sm text-gray-400 mb-4">Fluxo de Produção</p>
      <div className="w-full overflow-x-auto">
        <BarChart
          width={Math.max(500, flowData.length * 80)}
          height={280}
          data={flowData}
          margin={{ top: 20, right: 30, left: 0, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#FFF' }}
          />
          <Bar dataKey="quantidade" fill={colors.accent} radius={[8, 8, 0, 0]} />
        </BarChart>
      </div>
    </motion.div>
  );
}

function FinancialChart({ financeiro }) {
  const chartData = useMemo(() => {
    const pagas = financeiro?.despesasPagas || 0;
    const pendentes = financeiro?.despesasPendentes || 0;
    const saldo = Math.max(0, (financeiro?.saldoObra || 0));
    return [
      { name: 'Despesas Pagas', value: pagas, color: colors.danger },
      { name: 'Despesas Pendentes', value: pendentes, color: colors.warning },
      { name: 'Saldo', value: saldo, color: colors.success },
    ].filter(item => item.value > 0);
  }, [financeiro]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="p-2 rounded text-sm"
          style={{
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
          }}
        >
          <p className="text-white">{payload[0].name}</p>
          <p style={{ color: payload[0].color }}>
            R$ {(payload[0].value / 1000).toFixed(1)}k
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      variants={itemVariants}
      className="p-6 rounded-lg border"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
    >
      <p className="text-sm text-gray-400 mb-4">Financeiro</p>
      <div className="flex justify-center">
        <PieChart width={280} height={260}>
          <Pie
            data={chartData}
            cx={140}
            cy={120}
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </div>
      <div className="mt-4 space-y-2 text-xs">
        {chartData.map(item => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-400">{item.name}</span>
            </div>
            <span className="text-white font-semibold">R$ {(item.value / 1000).toFixed(1)}k</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function DashboardPremium() {
  const { corte, producao, estoque, financeiro, campo, loading } = useCommandCenter();
  const { obras } = useObras();
  const { pecas, maquinas } = useProducao();
  const { estoque: estoqueData } = useEstoque();
  const { lancamentos } = useLancamentos();
  const { equipes } = useEquipes();

  const obrasPendentes = useMemo(
    () => obras?.filter(o => o.status?.includes('producao') || o.status?.includes('fabricacao') || o.status?.includes('montagem')).slice(0, 5) || [],
    [obras]
  );

  const maquinasAtivas = useMemo(() => maquinas?.slice(0, 6) || [], [maquinas]);
  const atividadesRecentes = useMemo(() => lancamentos?.slice(0, 5) || [], [lancamentos]);

  const totalProjetos = obras?.length || 0;
  const totalPecas = pecas?.length || 0;
  const totalMaquinas = maquinas?.length || 0;
  const totalAlertas = (estoqueData?.filter(e => (e.quantidadeAtual || 0) <= (e.quantidadeMinima || e.minimo || 0)).length || 0);

  if (loading) {
    return (
      <div
        className="w-full h-screen flex items-center justify-center"
        style={{ backgroundColor: colors.bg }}
      >
        <p className="text-gray-400">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full min-h-screen p-6"
      style={{ backgroundColor: colors.bg }}
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Premium</h1>
          <p className="text-sm text-gray-400 mt-1">MONTEX ERP - Sistema de Gestão Integrada</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-white">
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-gray-400">Online</p>
          </div>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: colors.success }}
          />
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={itemVariants} className="mb-8 grid grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Projetos"
          value={totalProjetos}
          color={colors.accent}
        />
        <StatCard
          icon={Zap}
          label="Peças"
          value={totalPecas}
          color={colors.info}
        />
        <StatCard
          icon={Activity}
          label="Máquinas"
          value={totalMaquinas}
          color={colors.purple}
        />
        <StatCard
          icon={AlertCircle}
          label="Alertas"
          value={totalAlertas}
          color={colors.warning}
        />
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="mb-8 grid grid-cols-4 gap-6">
        <KPICard
          icon={TrendingUp}
          title="Faturamento Total"
          value={`R$ ${((financeiro?.totalDespesas || 0) / 1000).toFixed(1)}k`}
          unit="Despesas do período"
          color={colors.accent}
        />
        <KPICard
          icon={Activity}
          title="Progresso Geral"
          value={`${producao?.progressoGeral || 0}%`}
          unit="Produção em andamento"
          color={colors.success}
        />
        <KPICard
          icon={Zap}
          title="Receita vs Despesa"
          value={`R$ ${((financeiro?.saldoObra || 0) / 1000).toFixed(1)}k`}
          unit="Saldo disponível"
          color={colors.info}
        />
        <KPICard
          icon={Package}
          title="Peso Expedido"
          value={`${((producao?.progressoPeso || 0) * 100).toFixed(0)}%`}
          unit="Do total programado"
          color={colors.purple}
        />
      </motion.div>

      {/* Main Charts */}
      <motion.div variants={itemVariants} className="mb-8 grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <ProductionFlowChart pecas={pecas} />
        </div>
        <FinancialChart financeiro={financeiro} />
      </motion.div>

      {/* Operations Grid */}
      <motion.div variants={itemVariants} className="mb-8 grid grid-cols-3 gap-6">
        {/* Projetos */}
        <motion.div
          variants={itemVariants}
          className="p-6 rounded-lg border"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}
        >
          <p className="text-sm text-gray-400 mb-4 font-semibold">Projetos em Andamento</p>
          <div className="max-h-72 overflow-y-auto">
            {obrasPendentes.length > 0 ? (
              obrasPendentes.map(obra => (
                <ProjectItem key={obra.id} obra={obra} />
              ))
            ) : (
              <p className="text-xs text-gray-500 text-center py-8">Nenhum projeto em andamento</p>
            )}
          </div>
        </motion.div>

        {/* Máquinas */}
        <motion.div
          variants={itemVariants}
          className="p-6 rounded-lg border"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}
        >
          <p className="text-sm text-gray-400 mb-4 font-semibold">Máquinas</p>
          <div className="grid grid-cols-2 gap-3">
            {maquinasAtivas.length > 0 ? (
              maquinasAtivas.map(maquina => (
                <MachineCard key={maquina.id || maquina.nome} maquina={maquina} />
              ))
            ) : (
              <p className="text-xs text-gray-500 col-span-2 text-center py-8">Nenhuma máquina registrada</p>
            )}
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div
          variants={itemVariants}
          className="p-6 rounded-lg border"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}
        >
          <p className="text-sm text-gray-400 mb-4 font-semibold">Timeline de Atividades</p>
          <div className="max-h-72 overflow-y-auto">
            {atividadesRecentes.length > 0 ? (
              atividadesRecentes.map((lancamento, idx) => (
                <ActivityItem key={lancamento.id || idx} lancamento={lancamento} />
              ))
            ) : (
              <p className="text-xs text-gray-500 text-center py-8">Nenhuma atividade recente</p>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-6 mb-8">
        <StockStatus estoque={estoqueData} />
        <QualityMetrics />
        <TeamStatus equipes={equipes} />
      </motion.div>

      {/* Footer */}
      <motion.div
        variants={itemVariants}
        className="border-t pt-4 text-center text-xs text-gray-500"
        style={{ borderColor: colors.border }}
      >
        <p>
          MONTEX ERP • Última atualização:{' '}
          {new Date().toLocaleTimeString('pt-BR')} • Sistema Integrado de Gestão
        </p>
      </motion.div>
    </motion.div>
  );
}
