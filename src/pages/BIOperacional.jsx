// MONTEX ERP Premium - BI Operacional
// Integrado com ERPContext - Dados reais da obra SUPER LUNA

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  Truck,
  Factory,
  Gauge,
  Zap,
  RefreshCw,
  Bell,
  Play,
  Pause,
  Circle,
  Target,
  TrendingUp,
  Cpu
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, Line
} from 'recharts';

// ERPContext - dados reais
import { useObras, useProducao, useMedicoes, useEstoque } from '../contexts/ERPContext';

// Formatador de moeda
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatWeight = (value) => {
  if (value === null || value === undefined) return '0 kg';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value) + ' kg';
};

// Import new 3D components
import { Gauge3D, PulseIndicator, AnimatedCounter } from '../components/bi/Dynamic3DCharts';
import { LiveDataStream, AnomalyDetector, MiniDashboard, HeatmapGrid } from '../components/bi/AdvancedAnalytics';

export default function BIOperacional() {
  // ERPContext hooks - dados reais
  const { obras, obraAtualData } = useObras();
  const { pecas } = useProducao();
  const { estoque, alertasEstoque } = useEstoque();
  const { medicoes } = useMedicoes();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLive, setIsLive] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState(null);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulated real-time production data
  const [realtimeData, setRealtimeData] = useState([
    { time: '08:00', producao: 12, meta: 15, eficiencia: 80 },
    { time: '09:00', producao: 18, meta: 15, eficiencia: 120 },
    { time: '10:00', producao: 15, meta: 15, eficiencia: 100 },
    { time: '11:00', producao: 22, meta: 15, eficiencia: 146 },
    { time: '12:00', producao: 8, meta: 15, eficiencia: 53 },
    { time: '13:00', producao: 19, meta: 15, eficiencia: 126 },
    { time: '14:00', producao: 21, meta: 15, eficiencia: 140 },
    { time: '15:00', producao: 17, meta: 15, eficiencia: 113 },
  ]);

  // Add new data point periodically
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      const newValue = 0;
      const newTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setRealtimeData(prev => [
        ...prev.slice(-7),
        { time: newTime, producao: newValue, meta: 15, eficiencia: Math.round((newValue / 15) * 100) }
      ]);
    }, 5000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Production status counts - dados reais do contexto
  const statusCounts = useMemo(() => ({
    aguardando: pecas.filter(i => i.etapa === 'aguardando').length,
    em_corte: pecas.filter(i => i.etapa === 'corte').length,
    em_fabricacao: pecas.filter(i => i.etapa === 'fabricacao').length,
    em_pintura: pecas.filter(i => i.etapa === 'pintura').length,
    concluido: pecas.filter(i => i.etapa === 'acabamento').length,
    expedido: pecas.filter(i => i.etapa === 'expedido').length,
  }), [pecas]);

  const totalItems = useMemo(() => Object.values(statusCounts).reduce((a, b) => a + b, 0), [statusCounts]);
  const completionRate = useMemo(() => totalItems > 0 ? ((statusCounts.concluido + statusCounts.expedido) / totalItems * 100).toFixed(0) : 0, [statusCounts, totalItems]);

  // Próximas expedições (baseadas em medicões)
  const proximasExpedicoes = useMemo(() => {
    return medicoes
      .filter(m => m.status === 'pendente' || m.status === 'planejada')
      .sort((a, b) => new Date(a.dataPrevisao) - new Date(b.dataPrevisao))
      .slice(0, 4);
  }, [medicoes]);

  // Stock alerts - usa alertasEstoque do contexto
  const stockAlerts = useMemo(() => alertasEstoque || [], [alertasEstoque]);

  // Machines status (simulated with real-time updates)
  const [machines, setMachines] = useState([
    { id: 1, name: 'CNC Plasma 01', status: 'running', efficiency: 92, currentJob: 'VG-002', temp: 45, rpm: 1200 },
    { id: 2, name: 'CNC Plasma 02', status: 'running', efficiency: 88, currentJob: 'CH-001', temp: 52, rpm: 1150 },
    { id: 3, name: 'Dobradeira 01', status: 'idle', efficiency: 0, currentJob: '-', temp: 28, rpm: 0 },
    { id: 4, name: 'Ponte Rolante', status: 'running', efficiency: 75, currentJob: 'TR-001', temp: 38, rpm: 800 },
    { id: 5, name: 'Cabine Pintura', status: 'maintenance', efficiency: 0, currentJob: 'Manutenção', temp: 22, rpm: 0 },
    { id: 6, name: 'Solda MIG 01', status: 'running', efficiency: 95, currentJob: 'PL-008', temp: 68, rpm: 0 },
  ]);

  // Update machine efficiency periodically
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setMachines(prev => prev.map(m => ({
        ...m,
        efficiency: m.status === 'running' ? m.efficiency : 0,
        temp: m.status === 'running' ? m.temp : m.temp
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Heatmap data for production by hour and day
  const heatmapData = [
    [85, 92, 78, 95, 88],
    [72, 88, 91, 82, 79],
    [90, 85, 76, 89, 94],
    [68, 75, 88, 91, 85],
    [82, 90, 85, 78, 92]
  ];

  // Anomaly detection data - baseado em peças da obra atual
  const anomalyData = useMemo(() => {
    return pecas.slice(0, 10).map((item, i) => ({
      name: item.descricao || item.codigo || `Item ${i + 1}`,
      value: 0
    }));
  }, [pecas]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'bg-emerald-500';
      case 'idle': return 'bg-amber-500';
      case 'maintenance': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'running': return 'Em operação';
      case 'idle': return 'Parado';
      case 'maintenance': return 'Manutenção';
      default: return status;
    }
  };

  // Calculate overall OEE
  const overallOEE = useMemo(() => {
    const runningMachines = machines.filter(m => m.status === 'running');
    if (runningMachines.length === 0) return 0;
    return Math.round(runningMachines.reduce((a, b) => a + b.efficiency, 0) / runningMachines.length);
  }, [machines]);

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Animated background with particles */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.03),transparent_70%)]" />
        <motion.div
          animate={{ opacity: [0.02, 0.05, 0.02] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(34,211,238,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(34,211,238,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-500/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-4 lg:p-6 space-y-4">
        {/* Header with Live Clock */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center relative"
              animate={{ boxShadow: ['0 0 20px rgba(34,211,238,0.3)', '0 0 40px rgba(34,211,238,0.5)', '0 0 20px rgba(34,211,238,0.3)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Activity className="w-7 h-7 text-white" />
              <div className="absolute -top-1 -right-1">
                <PulseIndicator color="#22d3ee" size={12} />
              </div>
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                BI Operacional
                <motion.span
                  className="flex items-center gap-1 text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30"
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Circle className="w-2 h-2 fill-current" />
                  TEMPO REAL
                </motion.span>
              </h1>
              <p className="text-slate-400 text-sm">Monitoramento do chão de fábrica • Atualização a cada 2s</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live toggle */}
            <motion.button
              onClick={() => setIsLive(!isLive)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                isLive
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {isLive ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isLive ? 'Live' : 'Pausado'}
            </motion.button>

            {/* Clock - Enhanced 3D style */}
            <motion.div
              className="bg-slate-800/80 border border-cyan-500/30 rounded-xl px-5 py-3 flex items-center gap-4"
              style={{
                boxShadow: '0 0 30px rgba(34,211,238,0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
              }}
            >
              <Clock className="w-6 h-6 text-cyan-400" />
              <div className="text-right">
                <div className="text-2xl font-mono text-white font-bold tracking-wider">
                  {currentTime.toLocaleTimeString('pt-BR')}
                </div>
                <div className="text-xs text-slate-400">
                  {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Main OEE and Status Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* OEE Gauge - 3D */}
          <motion.div
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
            <h3 className="text-slate-400 text-sm mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" />
              OEE Geral
            </h3>
            <Gauge3D value={overallOEE} max={100} color="#22d3ee" size={180} label="%" />
            <div className="mt-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm">+2.5% vs ontem</span>
            </div>
          </motion.div>

          {/* Quick Stats - Animated */}
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Aguardando', value: statusCounts.aguardando, color: '#64748b', icon: Clock, sparkline: [2, 4, 3, 5, 4, 6, statusCounts.aguardando] },
              { label: 'Em Corte', value: statusCounts.em_corte, color: '#3b82f6', icon: Zap, sparkline: [3, 5, 4, 6, 5, 7, statusCounts.em_corte] },
              { label: 'Fabricando', value: statusCounts.em_fabricacao, color: '#f59e0b', icon: Factory, sparkline: [4, 6, 5, 7, 6, 8, statusCounts.em_fabricacao] },
              { label: 'Pintura', value: statusCounts.em_pintura, color: '#a855f7', icon: Package, sparkline: [2, 3, 4, 3, 5, 4, statusCounts.em_pintura] },
              { label: 'Concluído', value: statusCounts.concluido, color: '#10b981', icon: CheckCircle2, sparkline: [5, 7, 6, 8, 9, 10, statusCounts.concluido] },
              { label: 'Expedido', value: statusCounts.expedido, color: '#22d3ee', icon: Truck, sparkline: [3, 4, 5, 6, 7, 8, statusCounts.expedido] },
            ].map((stat, i) => (
              <MiniDashboard
                key={stat.label}
                title={stat.label}
                value={<AnimatedCounter value={stat.value} />}
                trend={0}
                sparklineData={stat.sparkline}
                color={stat.color}
                icon={stat.icon}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Real-time Production Chart - Enhanced */}
          <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />
            <div className="flex items-center justify-between mb-4 relative">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Gauge className="w-5 h-5 text-cyan-400" />
                Produção em Tempo Real
                {isLive && (
                  <motion.div
                    className="w-2 h-2 bg-emerald-500 rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </h3>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-cyan-400">
                  <div className="w-3 h-3 bg-cyan-400 rounded" /> Produção
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <div className="w-3 h-3 bg-emerald-400 rounded" /> Eficiência
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <div className="w-3 h-3 bg-slate-500 rounded" /> Meta
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={realtimeData}>
                <defs>
                  <linearGradient id="colorProdOp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorEfic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(34, 211, 238, 0.3)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="producao"
                  stroke="#22d3ee"
                  strokeWidth={3}
                  fill="url(#colorProdOp)"
                  dot={{ fill: '#22d3ee', strokeWidth: 2, r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="meta"
                  stroke="#64748b"
                  strokeDasharray="5 5"
                  fill="none"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="eficiencia"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  yAxisId={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Live Data Stream */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-purple-400" />
              Feed de Produção
              <span className="text-xs text-slate-500 ml-auto">Auto-atualiza</span>
            </h3>
            <LiveDataStream maxItems={6} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Machines Status - 3D Enhanced */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
              <Factory className="w-5 h-5 text-amber-400" />
              Status das Máquinas
              <span className="ml-auto text-xs text-slate-500">
                {machines.filter(m => m.status === 'running').length}/{machines.length} ativas
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {machines.map((machine, i) => (
                <motion.div
                  key={machine.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => setSelectedMachine(selectedMachine === machine.id ? null : machine.id)}
                  className={`bg-slate-900/50 rounded-xl p-4 border cursor-pointer transition-all ${
                    selectedMachine === machine.id
                      ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                      : 'border-slate-700/50 hover:border-slate-600'
                  }`}
                  style={{
                    background: selectedMachine === machine.id
                      ? 'linear-gradient(135deg, rgba(34,211,238,0.1), transparent)'
                      : undefined
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-white font-medium">{machine.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {machine.status === 'running' && (
                        <PulseIndicator color="#10b981" size={8} />
                      )}
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(machine.status)}`} />
                    </div>
                  </div>

                  {machine.status === 'running' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Eficiência</span>
                        <span className="text-sm font-mono text-emerald-400">{machine.efficiency.toFixed(0)}%</span>
                      </div>
                      {/* Mini efficiency bar */}
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${machine.efficiency > 80 ? '#10b981' : machine.efficiency > 60 ? '#f59e0b' : '#ef4444'}, transparent)`,
                            boxShadow: `0 0 10px ${machine.efficiency > 80 ? '#10b981' : machine.efficiency > 60 ? '#f59e0b' : '#ef4444'}40`
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${machine.efficiency}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-cyan-400 font-mono">Job: {machine.currentJob}</span>
                        <span className="text-amber-400">{machine.temp}°C</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-3">
                      <span className={`text-sm ${machine.status === 'maintenance' ? 'text-red-400' : 'text-amber-400'}`}>
                        {getStatusLabel(machine.status)}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Alerts and Anomalies */}
          <div className="space-y-4">
            {/* Alerts Panel */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-amber-400" />
                Alertas Ativos
                {stockAlerts.length > 0 && (
                  <motion.span
                    className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {stockAlerts.length}
                  </motion.span>
                )}
              </h3>
              <AnomalyDetector data={anomalyData} threshold={20} />
            </div>

            {/* Quick Stock Alerts */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-red-400" />
                Estoque Crítico
              </h3>
              <div className="space-y-2 max-h-[120px] overflow-y-auto">
                {stockAlerts.slice(0, 3).map((alert, i) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-white truncate">{alert.material}</span>
                    </div>
                    <span className="text-xs text-red-400 font-mono">
                      {alert.quantidade}/{alert.minimo}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Production Heatmap and Deliveries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Production Heatmap */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-cyan-400" />
              Eficiência por Turno/Dia
            </h3>
            <HeatmapGrid
              data={heatmapData}
              rows={['Seg', 'Ter', 'Qua', 'Qui', 'Sex']}
              cols={['06h', '10h', '14h', '18h', '22h']}
            />
          </div>

          {/* Próximas Expedições - Medicões */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-emerald-400" />
              Próximas Expedições
            </h3>
            <div className="space-y-3">
              {proximasExpedicoes.length > 0 ? (
                proximasExpedicoes.map((expedicao, i) => (
                  <motion.div
                    key={expedicao.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ x: 5 }}
                    className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-all cursor-pointer"
                  >
                    <motion.div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        expedicao.status === 'concluida' ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                      }`}
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <Truck className={`w-6 h-6 ${
                        expedicao.status === 'concluida' ? 'text-emerald-400' : 'text-amber-400'
                      }`} />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{obraAtualData?.nome || 'Obra em Progresso'}</p>
                      <p className="text-xs text-slate-400 truncate">Medição {expedicao.numero}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-cyan-400 font-bold">
                        {formatCurrency(expedicao.valor || 0)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(expedicao.dataPrevisao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-sm">Nenhuma expedição planejada</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Feed - Medicões Recentes */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
            <RefreshCw className="w-5 h-5 text-purple-400" />
            Medicões Recentes
            <span className="ml-auto text-xs text-slate-500">Últimas registradas</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {medicoes && medicoes.length > 0 ? (
              medicoes.slice(0, 4).map((medicao, i) => (
                <motion.div
                  key={medicao.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: medicao.status === 'concluida' ? '#10b981' : '#f59e0b'
                      }}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    />
                    <span className="text-xs text-slate-400">{new Date(medicao.data).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-sm text-white font-medium">Medição #{medicao.numero}</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {formatCurrency(medicao.valor)} • {medicao.status}
                  </p>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center py-6 text-slate-400">
                <p className="text-sm">Nenhuma medição registrada</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
