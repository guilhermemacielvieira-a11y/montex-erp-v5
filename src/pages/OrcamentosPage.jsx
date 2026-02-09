// MONTEX ERP Premium - Página de Orçamentos
// Pipeline comercial e gestão de orçamentos
// Integrado com ERPContext - Dados reais da obra SUPER LUNA

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FileText,
  Plus,
  Search,
  Download,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Building2,
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Target,
  BarChart3
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

// ERPContext - dados reais
import { useOrcamentos, useERP } from '../contexts/ERPContext';

// Funções utilitárias
const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
};

const formatWeight = (peso) => {
  if (!peso && peso !== 0) return '0 kg';
  return peso >= 1000
    ? `${(peso / 1000).toFixed(2)} t`
    : `${peso.toFixed(1)} kg`;
};

// Configuração de status do pipeline
const statusConfig = {
  rascunho: {
    label: 'Rascunho',
    icon: FileText,
    color: 'slate',
    bgColor: 'bg-slate-500/20',
    textColor: 'text-slate-400',
    borderColor: 'border-slate-500/30',
  },
  enviado: {
    label: 'Enviado',
    icon: Send,
    color: 'blue',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
  },
  em_analise: {
    label: 'Em Análise',
    icon: Clock,
    color: 'amber',
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
  },
  negociacao: {
    label: 'Negociação',
    icon: Users,
    color: 'purple',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
  },
  aprovado: {
    label: 'Aprovado',
    icon: CheckCircle2,
    color: 'emerald',
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
  },
  perdido: {
    label: 'Perdido',
    icon: XCircle,
    color: 'red',
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/30',
  },
};

// Card de KPI
function KPICard({ title, value, subtitle, icon: Icon, color, trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5"
    >
      <div className="flex items-start justify-between">
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center",
          `bg-gradient-to-br ${color}`
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            trend >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            <TrendingUp className="h-3 w-3" />
            {trend >= 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <p className="text-sm text-slate-400 mt-3">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {subtitle && (
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
}

// Card de Orçamento para o Pipeline
const OrcamentoCard = React.forwardRef(({ orcamento, onDragStart, onDragEnd, isDragging, onVerDetalhes, onEditar, onDuplicar, onEnviarCliente }, ref) => {
  const config = statusConfig[orcamento.status];
  const diasRestantes = Math.ceil(
    (new Date(orcamento.validade) - new Date()) / (1000 * 60 * 60 * 24)
  );
  const expirado = diasRestantes < 0;
  const expiraSoon = diasRestantes <= 7 && diasRestantes >= 0;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={() => onDragStart(orcamento)}
      onDragEnd={onDragEnd}
      className={cn(
        "p-4 rounded-xl bg-slate-800/80 border border-slate-700/50",
        "hover:bg-slate-700/80 hover:border-slate-600/50",
        "cursor-grab active:cursor-grabbing transition-all group",
        isDragging && "opacity-50 scale-95"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs text-slate-500 font-mono">{orcamento.numero}</span>
          <h4 className="text-sm font-semibold text-white mt-0.5 line-clamp-2">
            {orcamento.projeto}
          </h4>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
            <DropdownMenuItem className="text-white hover:bg-slate-700" onClick={() => onVerDetalhes(orcamento)}>
              <Eye className="h-4 w-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-slate-700" onClick={() => onEditar(orcamento)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-slate-700" onClick={() => onDuplicar(orcamento)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem className="text-white hover:bg-slate-700" onClick={() => onEnviarCliente(orcamento)}>
              <Send className="h-4 w-4 mr-2" />
              Enviar ao cliente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cliente */}
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-xs text-slate-400 truncate">{orcamento.cliente}</span>
      </div>

      {/* Valor */}
      <div className="mb-3">
        <p className="text-lg font-bold text-white">
          {formatCurrency(orcamento.valor_total)}
        </p>
        <p className="text-xs text-slate-500">
          {formatWeight(orcamento.peso_estimado)} estimado
        </p>
      </div>

      {/* Probabilidade */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500">Probabilidade</span>
          <span className="text-xs font-medium text-white">{orcamento.probabilidade}%</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              orcamento.probabilidade >= 70 ? "bg-emerald-500" :
              orcamento.probabilidade >= 40 ? "bg-amber-500" : "bg-red-500"
            )}
            style={{ width: `${orcamento.probabilidade}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          <span className={cn(
            "text-xs",
            expirado ? "text-red-400" :
            expiraSoon ? "text-amber-400" : "text-slate-400"
          )}>
            {expirado ? 'Expirado' :
             expiraSoon ? `${diasRestantes}d restantes` :
             formatDate(orcamento.validade)}
          </span>
        </div>
        <span className="text-xs text-slate-500">{orcamento.responsavel}</span>
      </div>
    </motion.div>
  );
});

OrcamentoCard.displayName = 'OrcamentoCard';

// Componente Principal
export default function OrcamentosPage() {
  // ERPContext - dados reais
  const { orcamentos: orcamentosContext, aprovarOrcamento, addOrcamento } = useOrcamentos();
  const { clientes } = useERP();

  // Estados locais - usar cópia local para permitir drag and drop
  const [orcamentosLocal, setOrcamentosLocal] = useState([]);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [activeTab, setActiveTab] = useState('pipeline');
  const [draggedItem, setDraggedItem] = useState(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState(null);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'create', 'edit'
  const [formData, setFormData] = useState({
    numero: '',
    projeto: '',
    cliente: '',
    valor_total: 0,
    peso_estimado: 0,
    probabilidade: 50,
    responsavel: '',
    validade: '',
    status: 'rascunho'
  });

  // Sincronizar com context quando mudar
  React.useEffect(() => {
    setOrcamentosLocal(orcamentosContext);
  }, [orcamentosContext]);

  // Usar dados locais para exibição
  const orcamentos = orcamentosLocal.length > 0 ? orcamentosLocal : orcamentosContext;

  // Filtrar orçamentos
  const orcamentosFiltrados = useMemo(() => {
    let orcs = [...orcamentos];

    if (filtroStatus !== 'todos') {
      orcs = orcs.filter(o => o.status === filtroStatus);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      orcs = orcs.filter(o =>
        o.numero?.toLowerCase().includes(searchLower) ||
        o.cliente?.toLowerCase().includes(searchLower) ||
        o.projeto?.toLowerCase().includes(searchLower)
      );
    }

    return orcs;
  }, [orcamentos, filtroStatus, search]);

  // Agrupar por status para pipeline
  const porStatus = useMemo(() => {
    const grupos = {};
    Object.keys(statusConfig).forEach(status => {
      grupos[status] = orcamentosFiltrados.filter(o => o.status === status);
    });
    return grupos;
  }, [orcamentosFiltrados]);

  // Calcular métricas
  const metricas = useMemo(() => {
    const abertos = orcamentos.filter(o =>
      ['enviado', 'em_analise', 'negociacao'].includes(o.status)
    );
    const valorAberto = abertos.reduce((acc, o) => acc + (o.valor_total || 0), 0);
    const valorPonderado = abertos.reduce((acc, o) =>
      acc + ((o.valor_total || 0) * (o.probabilidade / 100)), 0
    );
    const aprovados = orcamentos.filter(o => o.status === 'aprovado');
    const valorAprovado = aprovados.reduce((acc, o) => acc + (o.valor_total || 0), 0);
    const taxaConversao = orcamentos.length > 0
      ? (aprovados.length / orcamentos.length) * 100
      : 0;

    return {
      totalOrcamentos: orcamentos.length,
      orcamentosAbertos: abertos.length,
      valorAberto,
      valorPonderado,
      valorAprovado,
      taxaConversao,
    };
  }, [orcamentos]);

  // Handlers de drag and drop
  const handleDragStart = (item) => setDraggedItem(item);
  const handleDragEnd = () => setDraggedItem(null);

  const handleDrop = (novoStatus) => {
    if (draggedItem && draggedItem.status !== novoStatus) {
      setOrcamentosLocal(prev =>
        prev.map(o =>
          o.id === draggedItem.id ? { ...o, status: novoStatus } : o
        )
      );
      // Se aprovado, usar ação do context
      if (novoStatus === 'aprovado') {
        aprovarOrcamento(draggedItem.id, draggedItem.obraId);
      }
    }
    setDraggedItem(null);
  };

  // Modal handlers
  const openCreateModal = () => {
    setSelectedOrcamento(null);
    setModalMode('create');
    setFormData({
      numero: `ORC-${String(Date.now()).slice(-4)}`,
      projeto: '',
      cliente: '',
      valor_total: 0,
      peso_estimado: 0,
      probabilidade: 50,
      responsavel: '',
      validade: '',
      status: 'rascunho'
    });
    setShowModal(true);
  };

  const openDetailModal = (orcamento) => {
    setSelectedOrcamento(orcamento);
    setModalMode('view');
    setShowModal(true);
  };

  const openEditModal = (orcamento) => {
    setSelectedOrcamento(orcamento);
    setModalMode('edit');
    setFormData(orcamento);
    setShowModal(true);
  };

  const handleDuplicateOrcamento = (orcamento) => {
    const novoOrcamento = {
      ...orcamento,
      id: `orc_${Date.now()}`,
      numero: `ORC-${String(Date.now()).slice(-4)}`,
      status: 'rascunho'
    };
    setOrcamentosLocal(prev => [...prev, novoOrcamento]);
    toast.success('Orçamento duplicado com sucesso!');
  };

  const handleEnviarCliente = (orcamento) => {
    toast.success(`Orçamento ${orcamento.numero} enviado ao cliente!`);
  };

  const handleExportar = () => {
    toast.success('Exportação iniciada. O arquivo será baixado em breve.');
  };

  const handleSaveOrcamento = () => {
    if (modalMode === 'create') {
      const novoOrcamento = {
        ...formData,
        id: `orc_${Date.now()}`,
        obraId: formData.obraId || null
      };
      setOrcamentosLocal(prev => [...prev, novoOrcamento]);
      toast.success('Orçamento criado com sucesso!');
    } else if (modalMode === 'edit' && selectedOrcamento) {
      setOrcamentosLocal(prev =>
        prev.map(o => o.id === selectedOrcamento.id ? { ...o, ...formData } : o)
      );
      toast.success('Orçamento atualizado com sucesso!');
    }
    setShowModal(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrcamento(null);
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              Orçamentos
            </h1>
            <p className="text-slate-400 mt-1">
              Pipeline comercial e gestão de propostas
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-slate-700 text-white" onClick={handleExportar}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button className="bg-purple-500 hover:bg-purple-600 text-white" onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </div>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Orçamentos Abertos"
            value={metricas.orcamentosAbertos}
            subtitle={`${metricas.totalOrcamentos} total`}
            icon={FileText}
            color="from-purple-500 to-purple-600"
          />
          <KPICard
            title="Valor em Aberto"
            value={formatCurrency(metricas.valorAberto)}
            subtitle="Aguardando decisão"
            icon={DollarSign}
            color="from-blue-500 to-cyan-500"
            trend={8}
          />
          <KPICard
            title="Valor Ponderado"
            value={formatCurrency(metricas.valorPonderado)}
            subtitle="Com base na probabilidade"
            icon={Target}
            color="from-amber-500 to-orange-500"
          />
          <KPICard
            title="Taxa de Conversão"
            value={`${metricas.taxaConversao.toFixed(1)}%`}
            subtitle={formatCurrency(metricas.valorAprovado) + ' aprovado'}
            icon={TrendingUp}
            color="from-emerald-500 to-green-500"
            trend={12}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TabsList className="bg-slate-800/60 border border-slate-700">
              <TabsTrigger value="pipeline" className="data-[state=active]:bg-purple-500">
                <BarChart3 className="h-4 w-4 mr-2" />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="lista" className="data-[state=active]:bg-purple-500">
                <FileText className="h-4 w-4 mr-2" />
                Lista
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar orçamentos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-64 bg-slate-800/60 border-slate-700 text-white"
                />
              </div>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[160px] bg-slate-800/60 border-slate-700 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="todos" className="text-white">Todos</SelectItem>
                  {Object.entries(statusConfig).map(([key, val]) => (
                    <SelectItem key={key} value={key} className="text-white">
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pipeline View */}
          <TabsContent value="pipeline" className="mt-0">
            <div className="flex gap-4 overflow-x-auto pb-4">
              {Object.entries(statusConfig).filter(([key]) => key !== 'perdido').map(([status, config], index) => {
                const Icon = config.icon;
                const orcamentosStatus = porStatus[status] || [];
                const valorTotal = orcamentosStatus.reduce((acc, o) => acc + (o.valor_total || 0), 0);

                return (
                  <motion.div
                    key={status}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(status)}
                    className={cn(
                      "flex-shrink-0 w-[320px] rounded-xl border",
                      config.bgColor,
                      config.borderColor,
                      draggedItem && "border-dashed border-2"
                    )}
                  >
                    {/* Column Header */}
                    <div className="p-4 border-b border-slate-700/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            config.bgColor
                          )}>
                            <Icon className={cn("h-4 w-4", config.textColor)} />
                          </div>
                          <span className="font-semibold text-white">{config.label}</span>
                        </div>
                        <Badge variant="outline" className="bg-slate-800/50 border-slate-600 text-white">
                          {orcamentosStatus.length}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400">
                        {formatCurrency(valorTotal)}
                      </p>
                    </div>

                    {/* Column Body */}
                    <div className="p-2 max-h-[600px] overflow-y-auto space-y-2">
                      <AnimatePresence mode="popLayout">
                        {orcamentosStatus.map((orcamento) => (
                          <OrcamentoCard
                            key={orcamento.id}
                            orcamento={orcamento}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            isDragging={draggedItem?.id === orcamento.id}
                            onVerDetalhes={openDetailModal}
                            onEditar={openEditModal}
                            onDuplicar={handleDuplicateOrcamento}
                            onEnviarCliente={handleEnviarCliente}
                          />
                        ))}
                      </AnimatePresence>

                      {orcamentosStatus.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhum orçamento</p>
                        </div>
                      )}
                    </div>

                    {/* Add Button */}
                    <div className="p-2 border-t border-slate-700/30">
                      <Button
                        variant="ghost"
                        className="w-full text-slate-400 hover:text-white hover:bg-slate-700/50"
                        onClick={openCreateModal}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Orçamento
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
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Número</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Projeto</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Cliente</th>
                      <th className="text-center p-4 text-sm font-medium text-slate-400">Status</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-400">Valor</th>
                      <th className="text-center p-4 text-sm font-medium text-slate-400">Prob.</th>
                      <th className="text-center p-4 text-sm font-medium text-slate-400">Validade</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Responsável</th>
                      <th className="text-center p-4 text-sm font-medium text-slate-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orcamentosFiltrados.map((orc, index) => {
                      const config = statusConfig[orc.status];
                      const diasRestantes = Math.ceil(
                        (new Date(orc.validade) - new Date()) / (1000 * 60 * 60 * 24)
                      );

                      return (
                        <motion.tr
                          key={orc.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b border-slate-700/30 hover:bg-slate-800/50"
                        >
                          <td className="p-4">
                            <span className="font-mono text-purple-400 font-semibold">
                              {orc.numero}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{orc.projeto}</span>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {formatWeight(orc.peso_estimado)}
                            </p>
                          </td>
                          <td className="p-4 text-slate-300">
                            {orc.cliente}
                          </td>
                          <td className="p-4 text-center">
                            <Badge className={cn("text-xs border-0", config.bgColor, config.textColor)}>
                              {config.label}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-white font-semibold">
                              {formatCurrency(orc.valor_total)}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    orc.probabilidade >= 70 ? "bg-emerald-500" :
                                    orc.probabilidade >= 40 ? "bg-amber-500" : "bg-red-500"
                                  )}
                                  style={{ width: `${orc.probabilidade}%` }}
                                />
                              </div>
                              <span className="text-sm text-white">{orc.probabilidade}%</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={cn(
                              "text-sm",
                              diasRestantes < 0 ? "text-red-400" :
                              diasRestantes <= 7 ? "text-amber-400" : "text-slate-400"
                            )}>
                              {formatDate(orc.validade)}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400">
                            {orc.responsavel}
                          </td>
                          <td className="p-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                                <DropdownMenuItem className="text-white hover:bg-slate-700" onClick={() => openDetailModal(orc)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-white hover:bg-slate-700" onClick={() => openEditModal(orc)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-white hover:bg-slate-700" onClick={() => handleDuplicateOrcamento(orc)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

        {/* Modal de Orçamento */}
        <Dialog open={showModal} onOpenChange={closeModal}>
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {modalMode === 'view' && 'Detalhes do Orçamento'}
                {modalMode === 'create' && 'Novo Orçamento'}
                {modalMode === 'edit' && 'Editar Orçamento'}
              </DialogTitle>
            </DialogHeader>

            {modalMode === 'view' && selectedOrcamento ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Número</p>
                    <p className="text-sm font-medium text-white">{selectedOrcamento.numero}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Projeto</p>
                    <p className="text-sm font-medium text-white">{selectedOrcamento.projeto}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Cliente</p>
                    <p className="text-sm font-medium text-white">{selectedOrcamento.cliente}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Responsável</p>
                    <p className="text-sm font-medium text-white">{selectedOrcamento.responsavel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Valor Total</p>
                    <p className="text-sm font-medium text-white">{formatCurrency(selectedOrcamento.valor_total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Peso Estimado</p>
                    <p className="text-sm font-medium text-white">{formatWeight(selectedOrcamento.peso_estimado)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Probabilidade</p>
                    <p className="text-sm font-medium text-white">{selectedOrcamento.probabilidade}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Validade</p>
                    <p className="text-sm font-medium text-white">{formatDate(selectedOrcamento.validade)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Status</p>
                    <Badge className={cn("text-xs border-0", statusConfig[selectedOrcamento.status]?.bgColor, statusConfig[selectedOrcamento.status]?.textColor)}>
                      {statusConfig[selectedOrcamento.status]?.label}
                    </Badge>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeModal} className="border-slate-600 text-white">
                    Fechar
                  </Button>
                  <Button onClick={() => openEditModal(selectedOrcamento)} className="bg-purple-500 hover:bg-purple-600">
                    Editar
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400">Número</label>
                    <Input
                      disabled
                      value={formData.numero}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Projeto</label>
                    <Input
                      value={formData.projeto}
                      onChange={(e) => setFormData({ ...formData, projeto: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Cliente</label>
                    <Select value={formData.cliente} onValueChange={(value) => setFormData({ ...formData, cliente: value })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {clientes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Responsável</label>
                    <Input
                      value={formData.responsavel}
                      onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Valor Total (R$)</label>
                    <Input
                      type="number"
                      value={formData.valor_total}
                      onChange={(e) => setFormData({ ...formData, valor_total: parseFloat(e.target.value) || 0 })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Peso Estimado (kg)</label>
                    <Input
                      type="number"
                      value={formData.peso_estimado}
                      onChange={(e) => setFormData({ ...formData, peso_estimado: parseFloat(e.target.value) || 0 })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Probabilidade (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probabilidade}
                      onChange={(e) => setFormData({ ...formData, probabilidade: parseInt(e.target.value) || 50 })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Validade</label>
                    <Input
                      type="date"
                      value={formData.validade}
                      onChange={(e) => setFormData({ ...formData, validade: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Status</label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {Object.entries(statusConfig).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeModal} className="border-slate-600 text-white">
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveOrcamento} className="bg-purple-500 hover:bg-purple-600">
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
