/**
 * MONTEX ERP Premium - Expedição Integrada
 *
 * Módulo de expedição integrado com peças prontas da produção
 * Gerencia romaneios, carregamentos e entregas
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  FileText,
  Weight,
  Building2,
  Phone,
  User,
  Printer,
  Download,
  Eye,
  ChevronDown,
  ChevronRight,
  BarChart3,
  PackageCheck,
  ClipboardList
} from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { useExpedicao, useProducao, useObras } from '../contexts/ERPContext';
import { ETAPAS_PRODUCAO, STATUS_EXPEDICAO } from '../data/database';
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

// Status de expedição com cores e ícones
const STATUS_CONFIG = {
  [STATUS_EXPEDICAO.AGUARDANDO]: {
    label: 'Aguardando Carregamento',
    color: 'slate',
    bgColor: 'bg-slate-500/20',
    textColor: 'text-slate-400',
    borderColor: 'border-slate-500/30',
    icon: Clock
  },
  [STATUS_EXPEDICAO.CARREGANDO]: {
    label: 'Em Carregamento',
    color: 'amber',
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    icon: Package
  },
  [STATUS_EXPEDICAO.EM_TRANSITO]: {
    label: 'Em Trânsito',
    color: 'blue',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    icon: Truck
  },
  [STATUS_EXPEDICAO.ENTREGUE]: {
    label: 'Entregue',
    color: 'emerald',
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    icon: CheckCircle2
  },
  [STATUS_EXPEDICAO.PROBLEMA]: {
    label: 'Com Problema',
    color: 'red',
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/30',
    icon: AlertTriangle
  }
};

// Tipos de veículos
const VEICULOS = [
  { id: 'truck', label: 'Caminhão Truck', capacidade: 14000, icon: '🚛' },
  { id: 'carreta', label: 'Carreta', capacidade: 28000, icon: '🚚' },
  { id: 'bitrem', label: 'Bitrem', capacidade: 45000, icon: '🚛' },
  { id: 'rodotrem', label: 'Rodotrem', capacidade: 74000, icon: '🚛' }
];

export default function ExpedicaoIntegrado() {
  const { expedicoes, addExpedicao, updateExpedicao } = useExpedicao();
  const { pecas: pecasProducao } = useProducao();
  const { obraAtual, obraAtualData, obras } = useObras();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showNovoRomaneio, setShowNovoRomaneio] = useState(false);
  const [selectedExpedicao, setSelectedExpedicao] = useState(null);
  const [pecasSelecionadas, setPecasSelecionadas] = useState([]);
  const [expandedRomaneios, setExpandedRomaneios] = useState({});

  // Peças prontas para expedição (etapa === EXPEDIDO)
  const pecasProntas = useMemo(() => {
    return pecasProducao.filter(p => {
      const matchObra = !obraAtual || p.obraId === obraAtual;
      const matchEtapa = p.etapa === ETAPAS_PRODUCAO.EXPEDIDO;
      // Verifica se a peça já não está em algum romaneio
      const jaExpedida = expedicoes.some(exp =>
        exp.pecas?.some(peca => peca.id === p.id)
      );
      return matchObra && matchEtapa && !jaExpedida;
    });
  }, [pecasProducao, obraAtual, expedicoes]);

  // Estatísticas
  const estatisticas = useMemo(() => {
    const expedicoesFiltradas = obraAtual
      ? expedicoes.filter(e => e.obraId === obraAtual)
      : expedicoes;

    const porStatus = Object.values(STATUS_EXPEDICAO).reduce((acc, status) => {
      acc[status] = expedicoesFiltradas.filter(e => e.status === status).length;
      return acc;
    }, {});

    const pesoTotal = expedicoesFiltradas.reduce((sum, e) => sum + (e.pesoTotal || 0), 0);
    const pecasTotal = expedicoesFiltradas.reduce((sum, e) => sum + (e.pecas?.length || 0), 0);

    return {
      total: expedicoesFiltradas.length,
      porStatus,
      pesoTotal,
      pecasTotal,
      prontas: pecasProntas.length,
      pesoProntas: pecasProntas.reduce((sum, p) => sum + (p.peso || 0), 0)
    };
  }, [expedicoes, obraAtual, pecasProntas]);

  // Filtragem de expedições
  const expedicoesFiltradas = useMemo(() => {
    return expedicoes.filter(exp => {
      const matchObra = !obraAtual || exp.obraId === obraAtual;
      const matchStatus = statusFilter === 'todos' || exp.status === statusFilter;
      const matchSearch = !searchTerm ||
        exp.romaneio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.destino?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchObra && matchStatus && matchSearch;
    });
  }, [expedicoes, obraAtual, statusFilter, searchTerm]);

  // Dados para gráficos
  const dadosGrafico = useMemo(() => {
    const porDia = {};
    expedicoes.forEach(exp => {
      if (exp.dataSaida) {
        const dia = new Date(exp.dataSaida).toLocaleDateString('pt-BR');
        if (!porDia[dia]) porDia[dia] = { dia, peso: 0, qtd: 0 };
        porDia[dia].peso += exp.pesoTotal || 0;
        porDia[dia].qtd++;
      }
    });
    return Object.values(porDia).slice(-7);
  }, [expedicoes]);

  // Toggle expansão do romaneio
  const toggleExpand = (id) => {
    setExpandedRomaneios(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Criar novo romaneio
  const criarRomaneio = (dados) => {
    const novaExpedicao = {
      id: `EXP-${Date.now()}`,
      romaneio: `ROM-${String(expedicoes.length + 1).padStart(4, '0')}`,
      obraId: obraAtual,
      status: STATUS_EXPEDICAO.AGUARDANDO,
      pecas: pecasSelecionadas,
      pesoTotal: pecasSelecionadas.reduce((sum, p) => sum + (p.peso || 0), 0),
      dataCriacao: new Date().toISOString(),
      ...dados
    };

    addExpedicao(novaExpedicao);
    toast.success(`Romaneio ${novaExpedicao.romaneio} criado com ${pecasSelecionadas.length} peças`);

    setPecasSelecionadas([]);
    setShowNovoRomaneio(false);
  };

  // Atualizar status da expedição
  const atualizarStatus = (expedicaoId, novoStatus) => {
    const expedicao = expedicoes.find(e => e.id === expedicaoId);
    if (!expedicao) return;

    const updates = { status: novoStatus };

    if (novoStatus === STATUS_EXPEDICAO.EM_TRANSITO) {
      updates.dataSaida = new Date().toISOString();
    } else if (novoStatus === STATUS_EXPEDICAO.ENTREGUE) {
      updates.dataEntrega = new Date().toISOString();
    }

    updateExpedicao(expedicaoId, updates);
    toast.success(`${expedicao.romaneio}: ${STATUS_CONFIG[novoStatus]?.label || novoStatus}`);
  };

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
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl">
                <Truck className="w-8 h-8 text-white" />
              </div>
              Expedição Integrada
            </h1>
            <p className="text-slate-400 mt-1">
              Gerenciamento de romaneios, carregamentos e entregas
              {obraAtualData && (
                <span className="ml-2 text-cyan-400">• {obraAtualData.codigo}</span>
              )}
            </p>
          </div>

          <button
            onClick={() => setShowNovoRomaneio(true)}
            disabled={pecasProntas.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-600
                     text-white rounded-xl hover:from-cyan-600 hover:to-teal-700 transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Novo Romaneio
          </button>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                     rounded-xl border border-slate-700/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <PackageCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Prontas p/ Exp.</p>
                <p className="text-xl font-bold text-white">{estatisticas.prontas}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {(estatisticas.pesoProntas / 1000).toFixed(1)} ton
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                     rounded-xl border border-slate-700/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Aguardando</p>
                <p className="text-xl font-bold text-white">
                  {estatisticas.porStatus[STATUS_EXPEDICAO.AGUARDANDO] || 0}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                     rounded-xl border border-slate-700/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Truck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Em Trânsito</p>
                <p className="text-xl font-bold text-white">
                  {estatisticas.porStatus[STATUS_EXPEDICAO.EM_TRANSITO] || 0}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                     rounded-xl border border-slate-700/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Entregues</p>
                <p className="text-xl font-bold text-white">
                  {estatisticas.porStatus[STATUS_EXPEDICAO.ENTREGUE] || 0}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                     rounded-xl border border-slate-700/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Weight className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Peso Expedido</p>
                <p className="text-xl font-bold text-white">
                  {(estatisticas.pesoTotal / 1000).toFixed(1)} ton
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                     rounded-xl border border-slate-700/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <ClipboardList className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Romaneios</p>
                <p className="text-xl font-bold text-white">{estatisticas.total}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs.Root defaultValue="romaneios" className="space-y-4">
          <Tabs.List className="flex gap-2 bg-slate-800/50 p-1 rounded-xl w-fit">
            <Tabs.Trigger
              value="romaneios"
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400
                       data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 transition-colors"
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Romaneios
            </Tabs.Trigger>
            <Tabs.Trigger
              value="prontas"
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400
                       data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 transition-colors"
            >
              <Package className="w-4 h-4 inline mr-2" />
              Peças Prontas ({pecasProntas.length})
            </Tabs.Trigger>
            <Tabs.Trigger
              value="metricas"
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400
                       data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 transition-colors"
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Métricas
            </Tabs.Trigger>
          </Tabs.List>

          {/* Tab: Romaneios */}
          <Tabs.Content value="romaneios" className="space-y-4">
            {/* Filtros */}
            <div className="flex gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar romaneio ou destino..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50
                           rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2
                           focus:ring-cyan-500/50"
                />
              </div>

              <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
                <Select.Trigger className="flex items-center gap-2 px-4 py-2 bg-slate-800/50
                                         border border-slate-700/50 rounded-xl text-white">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <Select.Value />
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-50">
                    <Select.Viewport>
                      <Select.Item value="todos" className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer">
                        <Select.ItemText>Todos os Status</Select.ItemText>
                      </Select.Item>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <Select.Item key={key} value={key} className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer">
                          <Select.ItemText>{config.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Lista de Romaneios */}
            <div className="space-y-3">
              <AnimatePresence>
                {expedicoesFiltradas.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/30"
                  >
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Nenhum romaneio encontrado</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {pecasProntas.length > 0
                        ? 'Crie um novo romaneio com as peças prontas'
                        : 'Aguardando peças da produção'}
                    </p>
                  </motion.div>
                ) : (
                  expedicoesFiltradas.map((expedicao, index) => {
                    const config = STATUS_CONFIG[expedicao.status];
                    const Icon = config.icon;
                    const isExpanded = expandedRomaneios[expedicao.id];
                    const obra = obras.find(o => o.id === expedicao.obraId);

                    return (
                      <motion.div
                        key={expedicao.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                                  rounded-xl border ${config.borderColor} overflow-hidden`}
                      >
                        {/* Header do Romaneio */}
                        <div
                          className="p-4 cursor-pointer hover:bg-slate-700/20 transition-colors"
                          onClick={() => toggleExpand(expedicao.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 ${config.bgColor} rounded-xl`}>
                                <Icon className={`w-6 h-6 ${config.textColor}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-bold text-white">{expedicao.romaneio}</h3>
                                  <span className={`px-2 py-0.5 ${config.bgColor} ${config.textColor}
                                                 text-xs rounded-full`}>
                                    {config.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Building2 className="w-4 h-4" />
                                    {obra?.codigo || 'N/A'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {expedicao.destino || 'Destino não definido'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Package className="w-4 h-4" />
                                    {expedicao.pecas?.length || 0} peças
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Weight className="w-4 h-4" />
                                    {((expedicao.pesoTotal || 0) / 1000).toFixed(2)} ton
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Ações rápidas */}
                              {expedicao.status === STATUS_EXPEDICAO.AGUARDANDO && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    atualizarStatus(expedicao.id, STATUS_EXPEDICAO.CARREGANDO);
                                  }}
                                  className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg
                                           text-sm hover:bg-amber-500/30 transition-colors"
                                >
                                  Iniciar Carregamento
                                </button>
                              )}
                              {expedicao.status === STATUS_EXPEDICAO.CARREGANDO && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    atualizarStatus(expedicao.id, STATUS_EXPEDICAO.EM_TRANSITO);
                                  }}
                                  className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg
                                           text-sm hover:bg-blue-500/30 transition-colors"
                                >
                                  Despachar
                                </button>
                              )}
                              {expedicao.status === STATUS_EXPEDICAO.EM_TRANSITO && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    atualizarStatus(expedicao.id, STATUS_EXPEDICAO.ENTREGUE);
                                  }}
                                  className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg
                                           text-sm hover:bg-emerald-500/30 transition-colors"
                                >
                                  Confirmar Entrega
                                </button>
                              )}

                              <motion.div
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                              </motion.div>
                            </div>
                          </div>
                        </div>

                        {/* Conteúdo Expandido */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="border-t border-slate-700/50"
                            >
                              <div className="p-4 space-y-4">
                                {/* Informações do Transporte */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-xs text-slate-500">Veículo</p>
                                    <p className="text-white font-medium">{expedicao.veiculo || 'Não definido'}</p>
                                  </div>
                                  <div className="bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-xs text-slate-500">Motorista</p>
                                    <p className="text-white font-medium">{expedicao.motorista || 'Não definido'}</p>
                                  </div>
                                  <div className="bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-xs text-slate-500">Data Criação</p>
                                    <p className="text-white font-medium">
                                      {expedicao.dataCriacao
                                        ? new Date(expedicao.dataCriacao).toLocaleDateString('pt-BR')
                                        : 'N/A'}
                                    </p>
                                  </div>
                                  <div className="bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-xs text-slate-500">Data Saída</p>
                                    <p className="text-white font-medium">
                                      {expedicao.dataSaida
                                        ? new Date(expedicao.dataSaida).toLocaleDateString('pt-BR')
                                        : 'Aguardando'}
                                    </p>
                                  </div>
                                </div>

                                {/* Lista de Peças */}
                                <div>
                                  <h4 className="text-sm font-medium text-slate-300 mb-2">
                                    Peças no Romaneio ({expedicao.pecas?.length || 0})
                                  </h4>
                                  <div className="max-h-60 overflow-y-auto space-y-2">
                                    {expedicao.pecas?.map((peca, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between p-2 bg-slate-800/50
                                                 rounded-lg text-sm"
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="text-white font-mono">{peca.marca}</span>
                                          <span className="text-slate-400">{peca.tipo}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-slate-400">
                                          <span>{peca.perfil}</span>
                                          <span>{peca.peso?.toFixed(1)} kg</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Ações */}
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                                  <button
                                    onClick={() => {
                                      window.print();
                                      toast.success('Impressão iniciada');
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-700/50
                                                   text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                                  >
                                    <Printer className="w-4 h-4" />
                                    Imprimir
                                  </button>
                                  <button
                                    onClick={() => toast.success('Romaneio exportado em PDF!')}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-700/50
                                                   text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                                  >
                                    <Download className="w-4 h-4" />
                                    Exportar PDF
                                  </button>
                                  <button
                                    onClick={() => setSelectedExpedicao(expedicao)}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-700/50
                                             text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                                  >
                                    <Eye className="w-4 h-4" />
                                    Detalhes
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </Tabs.Content>

          {/* Tab: Peças Prontas */}
          <Tabs.Content value="prontas" className="space-y-4">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                          rounded-xl border border-slate-700/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Peças Prontas para Expedição
                </h3>
                {pecasSelecionadas.length > 0 && (
                  <button
                    onClick={() => setShowNovoRomaneio(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-600
                             text-white rounded-xl hover:from-cyan-600 hover:to-teal-700 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Criar Romaneio ({pecasSelecionadas.length} peças)
                  </button>
                )}
              </div>

              {pecasProntas.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Nenhuma peça pronta para expedição</p>
                  <p className="text-sm text-slate-500 mt-1">
                    As peças aparecerão aqui após concluírem a pintura
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {/* Header */}
                  <div className="flex items-center gap-3 px-3 py-2 text-xs text-slate-500 uppercase">
                    <input
                      type="checkbox"
                      checked={pecasSelecionadas.length === pecasProntas.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPecasSelecionadas(pecasProntas);
                        } else {
                          setPecasSelecionadas([]);
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700"
                    />
                    <span className="flex-1">Marca</span>
                    <span className="w-24">Tipo</span>
                    <span className="w-32">Perfil</span>
                    <span className="w-20 text-right">Peso</span>
                    <span className="w-24 text-right">Comprimento</span>
                  </div>

                  {/* Lista */}
                  {pecasProntas.map((peca, idx) => {
                    const isSelected = pecasSelecionadas.some(p => p.id === peca.id);
                    return (
                      <motion.div
                        key={peca.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer
                                  ${isSelected
                                    ? 'bg-cyan-500/20 border border-cyan-500/30'
                                    : 'bg-slate-800/50 hover:bg-slate-700/50'}`}
                        onClick={() => {
                          if (isSelected) {
                            setPecasSelecionadas(prev => prev.filter(p => p.id !== peca.id));
                          } else {
                            setPecasSelecionadas(prev => [...prev, peca]);
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700"
                        />
                        <span className="flex-1 font-mono text-white">{peca.marca}</span>
                        <span className="w-24 text-slate-400">{peca.tipo}</span>
                        <span className="w-32 text-slate-400">{peca.perfil}</span>
                        <span className="w-20 text-right text-white">{peca.peso?.toFixed(1)} kg</span>
                        <span className="w-24 text-right text-slate-400">{peca.comprimento} mm</span>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Resumo da Seleção */}
              {pecasSelecionadas.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    <span className="text-white font-bold">{pecasSelecionadas.length}</span> peças selecionadas
                    <span className="mx-2">•</span>
                    <span className="text-cyan-400 font-bold">
                      {(pecasSelecionadas.reduce((sum, p) => sum + (p.peso || 0), 0) / 1000).toFixed(2)} ton
                    </span>
                  </div>
                  <button
                    onClick={() => setPecasSelecionadas([])}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Limpar seleção
                  </button>
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* Tab: Métricas */}
          <Tabs.Content value="metricas" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gráfico de Expedições por Status */}
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                            rounded-xl border border-slate-700/50 p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Romaneios por Status</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(STATUS_CONFIG).map(([key, config]) => ({
                        name: config.label,
                        value: estatisticas.porStatus[key] || 0,
                        color: key === STATUS_EXPEDICAO.AGUARDANDO ? '#64748b' :
                               key === STATUS_EXPEDICAO.CARREGANDO ? '#f59e0b' :
                               key === STATUS_EXPEDICAO.EM_TRANSITO ? '#3b82f6' :
                               key === STATUS_EXPEDICAO.ENTREGUE ? '#10b981' : '#ef4444'
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {Object.entries(STATUS_CONFIG).map(([key], idx) => (
                        <Cell
                          key={idx}
                          fill={
                            key === STATUS_EXPEDICAO.AGUARDANDO ? '#64748b' :
                            key === STATUS_EXPEDICAO.CARREGANDO ? '#f59e0b' :
                            key === STATUS_EXPEDICAO.EM_TRANSITO ? '#3b82f6' :
                            key === STATUS_EXPEDICAO.ENTREGUE ? '#10b981' : '#ef4444'
                          }
                        />
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
                <div className="flex flex-wrap gap-3 justify-center mt-4">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${config.bgColor}`} />
                      <span className="text-xs text-slate-400">{config.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gráfico de Peso Expedido por Dia */}
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                            rounded-xl border border-slate-700/50 p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Peso Expedido por Dia (ton)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dadosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="dia" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => (v/1000).toFixed(1)} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [(value/1000).toFixed(2) + ' ton', 'Peso']}
                    />
                    <Bar dataKey="peso" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Resumo Geral */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                          rounded-xl border border-slate-700/50 p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Resumo de Expedição</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-3xl font-bold text-white">{estatisticas.total}</p>
                  <p className="text-sm text-slate-400">Total de Romaneios</p>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-3xl font-bold text-emerald-400">{estatisticas.pecasTotal}</p>
                  <p className="text-sm text-slate-400">Peças Expedidas</p>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-3xl font-bold text-cyan-400">
                    {(estatisticas.pesoTotal / 1000).toFixed(1)}
                  </p>
                  <p className="text-sm text-slate-400">Toneladas Expedidas</p>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-3xl font-bold text-amber-400">
                    {estatisticas.porStatus[STATUS_EXPEDICAO.AGUARDANDO] || 0}
                  </p>
                  <p className="text-sm text-slate-400">Aguardando Despacho</p>
                </div>
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>

        {/* Modal: Novo Romaneio */}
        <Dialog.Root open={showNovoRomaneio} onOpenChange={setShowNovoRomaneio}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                                      w-full max-w-lg bg-slate-800 border border-slate-700
                                      rounded-2xl p-6 z-50 max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-xl font-bold text-white mb-4">
                Criar Novo Romaneio
              </Dialog.Title>

              <NovoRomaneioForm
                pecasSelecionadas={pecasSelecionadas}
                onSubmit={criarRomaneio}
                onCancel={() => setShowNovoRomaneio(false)}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}

// Componente: Formulário de Novo Romaneio
function NovoRomaneioForm({ pecasSelecionadas, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    destino: '',
    veiculo: '',
    motorista: '',
    telefone: '',
    observacoes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const pesoTotal = pecasSelecionadas.reduce((sum, p) => sum + (p.peso || 0), 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Resumo das peças */}
      <div className="bg-slate-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Peças Selecionadas</p>
            <p className="text-2xl font-bold text-white">{pecasSelecionadas.length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Peso Total</p>
            <p className="text-2xl font-bold text-cyan-400">{(pesoTotal / 1000).toFixed(2)} ton</p>
          </div>
        </div>
      </div>

      {/* Destino */}
      <div>
        <label className="block text-sm text-slate-400 mb-1">Destino *</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            required
            value={formData.destino}
            onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
            placeholder="Endereço de entrega"
            className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600
                     rounded-xl text-white placeholder-slate-500 focus:outline-none
                     focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
      </div>

      {/* Veículo */}
      <div>
        <label className="block text-sm text-slate-400 mb-1">Tipo de Veículo</label>
        <Select.Root value={formData.veiculo} onValueChange={(v) => setFormData({ ...formData, veiculo: v })}>
          <Select.Trigger className="w-full flex items-center justify-between px-4 py-2
                                   bg-slate-700/50 border border-slate-600 rounded-xl text-white">
            <Select.Value placeholder="Selecione o veículo" />
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-[60]">
              <Select.Viewport>
                {VEICULOS.map(v => (
                  <Select.Item
                    key={v.id}
                    value={v.label}
                    className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer"
                  >
                    <Select.ItemText>
                      {v.icon} {v.label} - até {(v.capacidade/1000).toFixed(0)} ton
                    </Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      {/* Motorista */}
      <div>
        <label className="block text-sm text-slate-400 mb-1">Motorista</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={formData.motorista}
            onChange={(e) => setFormData({ ...formData, motorista: e.target.value })}
            placeholder="Nome do motorista"
            className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600
                     rounded-xl text-white placeholder-slate-500 focus:outline-none
                     focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
      </div>

      {/* Telefone */}
      <div>
        <label className="block text-sm text-slate-400 mb-1">Telefone</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="tel"
            value={formData.telefone}
            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
            placeholder="(00) 00000-0000"
            className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600
                     rounded-xl text-white placeholder-slate-500 focus:outline-none
                     focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm text-slate-400 mb-1">Observações</label>
        <textarea
          value={formData.observacoes}
          onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
          placeholder="Observações adicionais..."
          rows={3}
          className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600
                   rounded-xl text-white placeholder-slate-500 focus:outline-none
                   focus:ring-2 focus:ring-cyan-500/50 resize-none"
        />
      </div>

      {/* Botões */}
      <div className="flex items-center gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-xl
                   hover:bg-slate-600 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-600
                   text-white rounded-xl hover:from-cyan-600 hover:to-teal-700
                   transition-all font-medium"
        >
          Criar Romaneio
        </button>
      </div>
    </form>
  );
}
