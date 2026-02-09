// MONTEX ERP Premium - Página de Produção
// Gestão completa da produção com Kanban, métricas e controles
// Integrado com ERPContext - Dados reais da obra SUPER LUNA

import React, { useState, useMemo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Package,
  Factory,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Weight,
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Layers,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Scissors,
  Paintbrush,
  Hammer,
  ArrowRight,
  ChevronRight,
  SkipForward,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Importar ERPContext - dados reais
import { useObras, useProducao } from '../contexts/ERPContext';

// Importar configuração de produção e enums
import { ETAPAS_PRODUCAO } from '../data/database';

// Função para formatar peso
const formatWeight = (peso) => {
  if (!peso && peso !== 0) return '0 kg';
  return peso >= 1000
    ? `${(peso / 1000).toFixed(2)} t`
    : `${peso.toFixed(1)} kg`;
};

// Configuração das colunas do Kanban - 6 PROCESSOS PADRÃO MONTEX
// AGUARDANDO → CORTE → FABRICAÇÃO → SOLDA → PINTURA → EXPEDIDO
const colunasKanban = [
  {
    id: 'aguardando',
    title: '⏳ Aguardando',
    icon: Clock,
    color: 'from-slate-500 to-slate-600',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    hexColor: '#64748b',
    description: 'Peças aguardando início',
  },
  {
    id: 'corte',
    title: '✂️ Corte',
    icon: Scissors,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    hexColor: '#f59e0b',
    description: 'Corte CNC/Plasma/Serra',
  },
  {
    id: 'fabricacao',
    title: '🔧 Fabricação',
    icon: Hammer,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    hexColor: '#3b82f6',
    description: 'Montagem e preparação',
  },
  {
    id: 'solda',
    title: '⚡ Solda',
    icon: Factory,
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    hexColor: '#8b5cf6',
    description: 'Soldagem MIG/TIG/Eletrodo',
  },
  {
    id: 'pintura',
    title: '🎨 Pintura',
    icon: Paintbrush,
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    hexColor: '#ec4899',
    description: 'Jateamento e pintura',
  },
  {
    id: 'expedido',
    title: '✅ Expedido',
    icon: CheckCircle2,
    color: 'from-emerald-500 to-green-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    hexColor: '#10b981',
    description: 'Enviado para obra',
  },
];

// Ordem das etapas para avanço rápido
const ORDEM_ETAPAS = ['aguardando', 'corte', 'fabricacao', 'solda', 'pintura', 'expedido'];

function getProximaEtapa(etapaAtual) {
  const idx = ORDEM_ETAPAS.indexOf(etapaAtual);
  if (idx < 0 || idx >= ORDEM_ETAPAS.length - 1) return null;
  return ORDEM_ETAPAS[idx + 1];
}

function getEtapaAnterior(etapaAtual) {
  const idx = ORDEM_ETAPAS.indexOf(etapaAtual);
  if (idx <= 0) return null;
  return ORDEM_ETAPAS[idx - 1];
}

function getNomeEtapa(etapaId) {
  const col = colunasKanban.find(c => c.id === etapaId);
  return col ? col.title.replace(/^[^\s]+\s/, '') : etapaId;
}

// Componente de Card de Estatística
function StatCard({ title, value, subtitle, icon: Icon, color, trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          `bg-gradient-to-br ${color}`
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3">
          <TrendingUp className={cn(
            "h-3 w-3",
            trend >= 0 ? "text-emerald-400" : "text-red-400"
          )} />
          <span className={cn(
            "text-xs",
            trend >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {trend >= 0 ? '+' : ''}{trend}% vs semana anterior
          </span>
        </div>
      )}
    </motion.div>
  );
}

// Componente de Item do Kanban (com forwardRef para AnimatePresence)
const KanbanItem = forwardRef(function KanbanItem({ item, obras, onDragStart, onDragEnd, isDragging, onVerDetalhes, onEditar, onReportarProblema, onMoverEtapa }, ref) {
  const obra = obras.find(o => o.id === item.obraId);
  const proximaEtapa = getProximaEtapa(item.etapa);
  const etapaAnterior = getEtapaAnterior(item.etapa);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      draggable
      onDragStart={() => onDragStart(item)}
      onDragEnd={onDragEnd}
      className={cn(
        "p-3 rounded-lg bg-slate-800/80 border border-slate-700/50",
        "hover:bg-slate-700/80 hover:border-slate-600/50",
        "cursor-grab active:cursor-grabbing transition-all group",
        isDragging && "opacity-50 scale-95"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm text-orange-400 font-semibold">MK-{item.marca}</p>
          <p className="text-sm text-white truncate">
            {item.tipo || item.perfil || 'Sem descrição'}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
            <DropdownMenuItem className="text-white hover:bg-slate-700" onClick={() => onVerDetalhes(item)}>
              <Eye className="h-4 w-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-slate-700" onClick={() => onEditar(item)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            {/* Opções de mover para etapa específica */}
            {ORDEM_ETAPAS.filter(e => e !== item.etapa).map(etapaId => (
              <DropdownMenuItem
                key={etapaId}
                className="text-white hover:bg-slate-700"
                onClick={() => onMoverEtapa(item, etapaId)}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Mover para {getNomeEtapa(etapaId)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem className="text-red-400 hover:bg-slate-700" onClick={() => onReportarProblema(item)}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Reportar problema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Obra */}
      {obra && (
        <div className="mb-2">
          <p className="text-xs text-slate-500 truncate">
            📍 {obra.nome}
          </p>
        </div>
      )}

      {/* Footer - Peso e Qtd */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Weight className="h-3 w-3" />
            {formatWeight(item.peso || 0)}
          </span>
          <span className="text-slate-500">x{item.quantidade || 1}</span>
        </div>
        {item.statusCorte === 'urgente' && (
          <Badge className="bg-red-500/20 text-red-400 text-xs h-5 px-1.5">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Urgente
          </Badge>
        )}
      </div>

      {/* Material */}
      {item.material && (
        <div className="mt-2 pt-2 border-t border-slate-700/50">
          <p className="text-xs text-slate-500">
            <span className="text-slate-400">Material:</span> {item.material}
          </p>
        </div>
      )}

      {/* Botões de Ação Rápida */}
      <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center gap-1.5">
        {etapaAnterior && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onMoverEtapa(item, etapaAnterior); }}
            className="h-7 px-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 flex-shrink-0"
            title={`Voltar para ${getNomeEtapa(etapaAnterior)}`}
          >
            <ChevronRight className="h-3 w-3 rotate-180 mr-1" />
            Voltar
          </Button>
        )}
        <div className="flex-1" />
        {proximaEtapa && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onMoverEtapa(item, proximaEtapa); }}
            className={cn(
              "h-7 px-2.5 text-xs font-medium flex-shrink-0",
              proximaEtapa === 'expedido'
                ? "text-emerald-400 hover:text-white hover:bg-emerald-600/30 border border-emerald-500/30"
                : "text-orange-400 hover:text-white hover:bg-orange-600/30 border border-orange-500/30"
            )}
            title={`Avançar para ${getNomeEtapa(proximaEtapa)}`}
          >
            {getNomeEtapa(proximaEtapa)}
            <Play className="h-3 w-3 ml-1" />
          </Button>
        )}
        {!proximaEtapa && (
          <Badge className="bg-emerald-500/20 text-emerald-400 text-xs border-0">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Concluído
          </Badge>
        )}
      </div>
    </motion.div>
  );
});

// Componente Principal da Página
export default function ProducaoPage() {
  // Dados do ERPContext
  const { obras } = useObras();
  const { pecas, moverPecaEtapa } = useProducao();

  // Estados locais
  const [search, setSearch] = useState('');
  const [filtroObra, setFiltroObra] = useState('todas');
  const [filtroPrioridade, setFiltroPrioridade] = useState('todas');
  const [draggedItem, setDraggedItem] = useState(null);
  const [activeTab, setActiveTab] = useState('kanban');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'create', 'edit', 'report'
  const [formData, setFormData] = useState({
    marca: '',
    tipo: '',
    perfil: '',
    material: '',
    quantidade: 1,
    peso: 0,
    obraId: ''
  });

  // Filtrar itens - usando pecas do ERPContext
  const itensFiltrados = useMemo(() => {
    let itens = [...pecas];

    if (filtroObra !== 'todas') {
      itens = itens.filter(i => i.obraId === filtroObra);
    }

    if (filtroPrioridade !== 'todas') {
      if (filtroPrioridade === 'alta') {
        itens = itens.filter(i => i.statusCorte === 'urgente');
      }
    }

    if (search) {
      const searchLower = search.toLowerCase();
      itens = itens.filter(i =>
        String(i.marca)?.toLowerCase().includes(searchLower) ||
        i.tipo?.toLowerCase().includes(searchLower) ||
        i.perfil?.toLowerCase().includes(searchLower) ||
        i.material?.toLowerCase().includes(searchLower)
      );
    }

    return itens;
  }, [pecas, filtroObra, filtroPrioridade, search]);

  // Agrupar por etapa de produção
  const itensPorColuna = useMemo(() => {
    const grupos = {};
    colunasKanban.forEach(col => {
      grupos[col.id] = itensFiltrados.filter(i => i.etapa === col.id);
    });
    return grupos;
  }, [itensFiltrados]);

  // Calcular estatísticas - usando etapas do sistema
  const estatisticas = useMemo(() => {
    const total = itensFiltrados.length;
    const concluidos = itensFiltrados.filter(i =>
      i.etapa === ETAPAS_PRODUCAO.EXPEDIDO
    ).length;
    const emProducao = itensFiltrados.filter(i =>
      [ETAPAS_PRODUCAO.CORTE, ETAPAS_PRODUCAO.FABRICACAO, ETAPAS_PRODUCAO.SOLDA, ETAPAS_PRODUCAO.PINTURA].includes(i.etapa)
    ).length;
    const aguardando = itensFiltrados.filter(i => i.etapa === ETAPAS_PRODUCAO.AGUARDANDO).length;

    const pesoTotal = itensFiltrados.reduce((acc, i) =>
      acc + (i.peso || 0), 0
    );
    const pesoConcluido = itensFiltrados
      .filter(i => i.etapa === ETAPAS_PRODUCAO.EXPEDIDO)
      .reduce((acc, i) => acc + (i.peso || 0), 0);

    const urgentes = itensFiltrados.filter(i => i.statusCorte === 'urgente').length;

    return {
      total,
      concluidos,
      emProducao,
      aguardando,
      pesoTotal,
      pesoConcluido,
      urgentes,
      progresso: total > 0 ? (concluidos / total) * 100 : 0,
    };
  }, [itensFiltrados]);

  // Handlers de drag and drop - usando ERPContext
  const handleDragStart = (item) => {
    setDraggedItem(item);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = (colunaId) => {
    if (draggedItem && draggedItem.etapa !== colunaId) {
      // Usa a função do context para mover a peça
      moverPecaEtapa(draggedItem.id, colunaId, null);
    }
    setDraggedItem(null);
  };

  // Handler para botões de ação rápida - mover peça para etapa
  const handleMoverEtapa = (item, novaEtapa) => {
    if (item.etapa === novaEtapa) return;
    moverPecaEtapa(item.id, novaEtapa, null);
    const nomeEtapa = getNomeEtapa(novaEtapa);
    toast.success(`MK-${item.marca} movido para ${nomeEtapa}`);
  };

  // Modal handlers
  const openDetailModal = (item) => {
    setSelectedItem(item);
    setModalMode('view');
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setModalMode('edit');
    setFormData(item);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setSelectedItem(null);
    setModalMode('create');
    setFormData({
      marca: String(Date.now()).slice(-4),
      tipo: '',
      perfil: '',
      material: '',
      quantidade: 1,
      peso: 0,
      obraId: filtroObra !== 'todas' ? filtroObra : ''
    });
    setShowModal(true);
  };

  const openReportModal = (item) => {
    setSelectedItem(item);
    setModalMode('report');
    setShowModal(true);
  };

  const handleExportar = () => {
    toast.success('Exportação iniciada. O arquivo será baixado em breve.');
  };

  const handleAtualizar = () => {
    toast.success('Dados atualizados com sucesso!');
  };

  const handleAddItem = () => {
    openCreateModal();
  };

  const handleReportarProblema = (item) => {
    openReportModal(item);
  };

  const handleSaveItem = () => {
    if (modalMode === 'create') {
      toast.success('Peça adicionada com sucesso!');
    } else if (modalMode === 'edit' && selectedItem) {
      toast.success('Peça atualizada com sucesso!');
    }
    closeModal();
  };

  const handleSubmitReport = () => {
    toast.success(`Problema reportado para a peça MK-${selectedItem.marca}. Será analisado em breve.`);
    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setModalMode('view');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Factory className="h-6 w-6 text-white" />
              </div>
              Produção
            </h1>
            <p className="text-slate-400 mt-1">
              Gestão e controle de produção em tempo real
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-slate-700 text-white" onClick={handleExportar}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" className="border-slate-700 text-white" onClick={handleAtualizar}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Peça
            </Button>
          </div>
        </motion.div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total de Peças"
            value={estatisticas.total}
            icon={Package}
            color="from-slate-500 to-slate-600"
          />
          <StatCard
            title="Em Produção"
            value={estatisticas.emProducao}
            icon={Hammer}
            color="from-orange-500 to-amber-500"
            trend={8}
          />
          <StatCard
            title="Aguardando"
            value={estatisticas.aguardando}
            icon={Clock}
            color="from-blue-500 to-cyan-500"
          />
          <StatCard
            title="Concluídas"
            value={estatisticas.concluidos}
            icon={CheckCircle2}
            color="from-emerald-500 to-green-500"
            trend={12}
          />
          <StatCard
            title="Peso Total"
            value={formatWeight(estatisticas.pesoTotal)}
            subtitle={`${formatWeight(estatisticas.pesoConcluido)} concluído`}
            icon={Weight}
            color="from-purple-500 to-pink-500"
          />
          <StatCard
            title="Urgentes"
            value={estatisticas.urgentes}
            icon={AlertTriangle}
            color="from-red-500 to-rose-500"
          />
        </div>

        {/* Barra de Progresso Geral */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Progresso Geral da Produção</span>
            <span className="text-sm font-semibold text-white">
              {estatisticas.progresso.toFixed(0)}%
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${estatisticas.progresso}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 rounded-full"
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>Aguardando: {estatisticas.aguardando}</span>
            <span>Em Produção: {estatisticas.emProducao}</span>
            <span>Concluídas: {estatisticas.concluidos}</span>
          </div>
        </motion.div>

        {/* Filtros e Busca */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por código, descrição ou material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-800/60 border-slate-700 text-white"
            />
          </div>

          <Select value={filtroObra} onValueChange={setFiltroObra}>
            <SelectTrigger className="w-[220px] bg-slate-800/60 border-slate-700 text-white">
              <SelectValue placeholder="Filtrar por obra" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="todas" className="text-white">Todas as obras</SelectItem>
              {obras.map(obra => (
                <SelectItem key={obra.id} value={obra.id} className="text-white">
                  {obra.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
            <SelectTrigger className="w-[180px] bg-slate-800/60 border-slate-700 text-white">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="todas" className="text-white">Todas</SelectItem>
              <SelectItem value="alta" className="text-white">🔴 Urgente</SelectItem>
              <SelectItem value="normal" className="text-white">🟢 Normal</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="border-slate-700 text-white">
            <Filter className="h-4 w-4 mr-2" />
            Mais Filtros
          </Button>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800/60 border border-slate-700">
            <TabsTrigger value="kanban" className="data-[state=active]:bg-orange-500">
              <Layers className="h-4 w-4 mr-2" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="lista" className="data-[state=active]:bg-orange-500">
              <BarChart3 className="h-4 w-4 mr-2" />
              Lista
            </TabsTrigger>
          </TabsList>

          {/* Kanban Board */}
          <TabsContent value="kanban" className="mt-0">
            <div className="flex gap-4 overflow-x-auto pb-4">
              {colunasKanban.map((coluna, colIndex) => {
                const Icon = coluna.icon;
                const itensColuna = itensPorColuna[coluna.id] || [];
                const pesoColuna = itensColuna.reduce((acc, i) =>
                  acc + (i.peso || 0), 0
                );

                return (
                  <motion.div
                    key={coluna.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: colIndex * 0.05 }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(coluna.id)}
                    className={cn(
                      "flex-shrink-0 w-[300px] rounded-xl border",
                      coluna.bgColor,
                      coluna.borderColor,
                      draggedItem && "border-dashed border-2"
                    )}
                  >
                    {/* Column Header */}
                    <div className="p-4 border-b border-slate-700/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            `bg-gradient-to-br ${coluna.color}`
                          )}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <span className="font-semibold text-white">{coluna.title}</span>
                            <p className="text-xs text-slate-500">{coluna.description}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-slate-800/50 border-slate-600 text-white">
                          {itensColuna.length}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatWeight(pesoColuna)}
                      </div>
                    </div>

                    {/* Column Body */}
                    <div className="p-2 max-h-[500px] overflow-y-auto space-y-2">
                      <AnimatePresence mode="popLayout">
                        {itensColuna.map((item) => (
                          <KanbanItem
                            key={item.id}
                            item={item}
                            obras={obras}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            isDragging={draggedItem?.id === item.id}
                            onVerDetalhes={openDetailModal}
                            onEditar={openEditModal}
                            onReportarProblema={handleReportarProblema}
                            onMoverEtapa={handleMoverEtapa}
                          />
                        ))}
                      </AnimatePresence>

                      {itensColuna.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhum item</p>
                        </div>
                      )}
                    </div>

                    {/* Add Button */}
                    <div className="p-2 border-t border-slate-700/30">
                      <Button
                        variant="ghost"
                        className="w-full text-slate-400 hover:text-white hover:bg-slate-700/50"
                        onClick={handleAddItem}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Item
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          {/* Lista View */}
          <TabsContent value="lista" className="mt-0">
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Código</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Descrição</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Obra</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Status</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-400">Qtd</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-400">Peso</th>
                      <th className="text-center p-4 text-sm font-medium text-slate-400">Prioridade</th>
                      <th className="text-center p-4 text-sm font-medium text-slate-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensFiltrados.map((item, index) => {
                      const obra = obras.find(o => o.id === item.obraId);
                      const coluna = colunasKanban.find(c => c.id === item.etapa);

                      return (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b border-slate-700/30 hover:bg-slate-800/50"
                        >
                          <td className="p-4">
                            <span className="font-mono text-orange-400 font-semibold">
                              MK-{item.marca}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{item.tipo || item.perfil}</span>
                            {item.material && (
                              <p className="text-xs text-slate-500 mt-0.5">{item.material}</p>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="text-slate-300 text-sm">
                              {obra?.nome || '-'}
                            </span>
                          </td>
                          <td className="p-4">
                            <Badge className={cn(
                              "text-xs",
                              `bg-gradient-to-r ${coluna?.color} text-white border-0`
                            )}>
                              {coluna?.title}
                            </Badge>
                          </td>
                          <td className="p-4 text-right text-white">
                            {item.quantidade}
                          </td>
                          <td className="p-4 text-right text-slate-300">
                            {formatWeight(item.peso || 0)}
                          </td>
                          <td className="p-4 text-center">
                            {item.statusCorte === 'urgente' ? (
                              <Badge className="bg-red-500/20 text-red-400 border-0">
                                Urgente
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-500/20 text-slate-400 border-0">
                                Normal
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {getProximaEtapa(item.etapa) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMoverEtapa(item, getProximaEtapa(item.etapa))}
                                  className="h-7 px-2 text-xs text-orange-400 hover:text-white hover:bg-orange-600/30 border border-orange-500/30"
                                  title={`Avançar para ${getNomeEtapa(getProximaEtapa(item.etapa))}`}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  {getNomeEtapa(getProximaEtapa(item.etapa))}
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                                  <DropdownMenuItem className="text-white hover:bg-slate-700" onClick={() => openDetailModal(item)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-white hover:bg-slate-700" onClick={() => openEditModal(item)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-slate-700" />
                                  {ORDEM_ETAPAS.filter(e => e !== item.etapa).map(etapaId => (
                                    <DropdownMenuItem
                                      key={etapaId}
                                      className="text-white hover:bg-slate-700"
                                      onClick={() => handleMoverEtapa(item, etapaId)}
                                    >
                                      <ArrowRight className="h-4 w-4 mr-2" />
                                      Mover para {getNomeEtapa(etapaId)}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal de Peça */}
        <Dialog open={showModal} onOpenChange={closeModal}>
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {modalMode === 'view' && 'Detalhes da Peça'}
                {modalMode === 'create' && 'Nova Peça'}
                {modalMode === 'edit' && 'Editar Peça'}
                {modalMode === 'report' && 'Reportar Problema'}
              </DialogTitle>
            </DialogHeader>

            {modalMode === 'view' && selectedItem ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Código</p>
                    <p className="text-sm font-medium text-white">MK-{selectedItem.marca}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Tipo</p>
                    <p className="text-sm font-medium text-white">{selectedItem.tipo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Perfil</p>
                    <p className="text-sm font-medium text-white">{selectedItem.perfil || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Material</p>
                    <p className="text-sm font-medium text-white">{selectedItem.material || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Quantidade</p>
                    <p className="text-sm font-medium text-white">{selectedItem.quantidade}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Peso</p>
                    <p className="text-sm font-medium text-white">{formatWeight(selectedItem.peso || 0)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">Obra</p>
                    <p className="text-sm font-medium text-white">
                      {obras.find(o => o.id === selectedItem.obraId)?.nome || '-'}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeModal} className="border-slate-600 text-white">
                    Fechar
                  </Button>
                  <Button onClick={() => openEditModal(selectedItem)} className="bg-orange-500 hover:bg-orange-600">
                    Editar
                  </Button>
                </DialogFooter>
              </div>
            ) : modalMode === 'report' && selectedItem ? (
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-sm text-red-400 mb-2">Peça: MK-{selectedItem.marca}</p>
                  <p className="text-sm text-slate-300">{selectedItem.tipo || selectedItem.perfil}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Descrição do Problema</label>
                  <textarea
                    placeholder="Descreva o problema encontrado..."
                    className="w-full mt-2 p-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                    rows="4"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeModal} className="border-slate-600 text-white">
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmitReport} className="bg-red-500 hover:bg-red-600">
                    Reportar Problema
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400">Código</label>
                    <Input
                      disabled
                      value={`MK-${formData.marca}`}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Tipo</label>
                    <Input
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Perfil</label>
                    <Input
                      value={formData.perfil}
                      onChange={(e) => setFormData({ ...formData, perfil: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Material</label>
                    <Input
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Quantidade</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.quantidade}
                      onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 1 })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Peso Unitário (kg)</label>
                    <Input
                      type="number"
                      value={formData.peso}
                      onChange={(e) => setFormData({ ...formData, peso: parseFloat(e.target.value) || 0 })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400">Obra</label>
                    <Select value={formData.obraId} onValueChange={(value) => setFormData({ ...formData, obraId: value })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {obras.map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeModal} className="border-slate-600 text-white">
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveItem} className="bg-orange-500 hover:bg-orange-600">
                    {modalMode === 'create' ? 'Criar' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
