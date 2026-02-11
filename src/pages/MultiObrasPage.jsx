// MONTEX ERP Premium - Multi-Obras
// Visão consolidada de múltiplos projetos/obras
// INTEGRADO COM ERPContext - Dados Reais

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { exportToExcel } from '@/utils/exportUtils';
import {
  Building2,
  Package,
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  BarChart3,
  Eye,
  Download,
  MapPin,
  Percent,
  Factory,
  Scissors,
  Hammer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Importar hooks do ERPContext
import {
  useObras,
  useProducao,
  useExpedicao,
  useMedicoes,
  useEquipes,
  useOrcamentos,
  useERP
} from '@/contexts/ERPContext';

import { STATUS_OBRA, ETAPAS_PRODUCAO } from '@/data/database';

// Cores para obras
const CORES_OBRAS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0
  }).format(value);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

const getStatusColor = (status) => {
  switch (status) {
    case STATUS_OBRA.CONCLUIDA: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case STATUS_OBRA.EM_PRODUCAO: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case STATUS_OBRA.EM_MONTAGEM: return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case STATUS_OBRA.EM_EXPEDICAO: return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case STATUS_OBRA.EM_PROJETO: return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case STATUS_OBRA.APROVADA: return 'bg-green-500/20 text-green-400 border-green-500/30';
    case STATUS_OBRA.AGUARDANDO_MATERIAL: return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case STATUS_OBRA.ORCAMENTO: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    case STATUS_OBRA.CANCELADA: return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

const getStatusText = (status) => {
  const statusMap = {
    [STATUS_OBRA.ORCAMENTO]: 'Orçamento',
    [STATUS_OBRA.APROVADA]: 'Aprovada',
    [STATUS_OBRA.EM_PROJETO]: 'Em Projeto',
    [STATUS_OBRA.AGUARDANDO_MATERIAL]: 'Aguardando Material',
    [STATUS_OBRA.EM_PRODUCAO]: 'Em Produção',
    [STATUS_OBRA.EM_EXPEDICAO]: 'Em Expedição',
    [STATUS_OBRA.EM_MONTAGEM]: 'Em Montagem',
    [STATUS_OBRA.CONCLUIDA]: 'Concluída',
    [STATUS_OBRA.CANCELADA]: 'Cancelada'
  };
  return statusMap[status] || status;
};

// Componente de Card de Obra
function ObraCard({ obra, pecas, expedicoes, medicoes, clientes, orcamentos, cor }) {
  // Calcular estatísticas das peças
  const pecasObra = pecas.filter(p => p.obraId === obra.id);
  const totalPecas = pecasObra.length;

  const pecasProduzidas = pecasObra.filter(p =>
    [ETAPAS_PRODUCAO.FABRICACAO, ETAPAS_PRODUCAO.SOLDA, ETAPAS_PRODUCAO.PINTURA, ETAPAS_PRODUCAO.EXPEDIDO].includes(p.etapa)
  ).length;

  const pecasEnviadas = pecasObra.filter(p => p.etapa === ETAPAS_PRODUCAO.EXPEDIDO).length;

  // Calcular peso das expedições entregues
  const expedicoesObra = expedicoes.filter(e => e.obraId === obra.id);
  const pesoExpedido = expedicoesObra.reduce((acc, e) => acc + (e.pesoTotal || 0), 0);
  const pesoMontado = expedicoesObra.filter(e => e.status === 'entregue').reduce((acc, e) => acc + (e.pesoTotal || 0), 0);

  // Calcular progresso físico e financeiro
  const progressoFisico = Math.round(
    (((obra.progresso?.corte || 0) + (obra.progresso?.fabricacao || 0) + (obra.progresso?.solda || 0) +
      (obra.progresso?.pintura || 0) + (obra.progresso?.expedicao || 0) + (obra.progresso?.montagem || 0)) / 6)
  );

  // Calcular medições (faturado)
  const medicoesObra = medicoes.filter(m => m.obraId === obra.id);
  const valorFaturado = medicoesObra.reduce((acc, m) => acc + (m.totalValor || 0), 0);

  // Calcular percentual financeiro
  const percentualFinanceiro = obra.valorContrato > 0
    ? Math.round((valorFaturado / obra.valorContrato) * 100)
    : 0;

  // Buscar cliente
  const cliente = clientes.find(c => c.id === obra.clienteId);

  // Buscar equipes alocadas
  const totalEquipe = (obra.equipeProducao?.length || 0) + (obra.equipeMontagem?.length || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden hover:border-slate-600/50 transition-all"
    >
      {/* Header colorido */}
      <div
        className="h-2"
        style={{ backgroundColor: cor }}
      />

      <div className="p-5">
        {/* Info Principal */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs border-slate-600 text-slate-300">
                {obra.codigo}
              </Badge>
              <Badge className={cn("border text-xs", getStatusColor(obra.status))}>
                {getStatusText(obra.status)}
              </Badge>
            </div>
            <h3 className="font-semibold text-white mt-2">{obra.nome}</h3>
            <p className="text-sm text-slate-400">{cliente?.nomeFantasia || cliente?.razaoSocial}</p>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <Eye className="h-4 w-4" />
          </Button>
        </div>

        {/* Local e Responsável */}
        <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {obra.endereco?.cidade} - {obra.endereco?.uf}
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {totalEquipe} equipes
          </div>
        </div>

        {/* Progresso Físico/Financeiro */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">Físico</span>
              <span className="text-emerald-400 font-semibold">{progressoFisico}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all"
                style={{ width: `${progressoFisico}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">Financeiro</span>
              <span className="text-blue-400 font-semibold">{percentualFinanceiro}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                style={{ width: `${Math.min(percentualFinanceiro, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Progresso por Etapa */}
        <div className="grid grid-cols-3 gap-2 mb-4 py-2 border-y border-slate-700/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Scissors className="h-3 w-3 text-orange-400" />
              <span className="text-xs text-slate-500">Corte</span>
            </div>
            <p className="text-sm font-bold text-orange-400">{obra.progresso?.corte || 0}%</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Factory className="h-3 w-3 text-blue-400" />
              <span className="text-xs text-slate-500">Fab/Solda</span>
            </div>
            <p className="text-sm font-bold text-blue-400">{Math.round(((obra.progresso?.fabricacao || 0) + (obra.progresso?.solda || 0)) / 2)}%</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Hammer className="h-3 w-3 text-emerald-400" />
              <span className="text-xs text-slate-500">Montagem</span>
            </div>
            <p className="text-sm font-bold text-emerald-400">{obra.progresso?.montagem || 0}%</p>
          </div>
        </div>

        {/* Peso */}
        <div className="grid grid-cols-3 gap-2 py-3 border-b border-slate-700/50">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{formatNumber(obra.pesoTotal)}</p>
            <p className="text-xs text-slate-500">kg Total</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-400">{formatNumber(pesoExpedido)}</p>
            <p className="text-xs text-slate-500">kg Expedido</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-400">{formatNumber(pesoMontado)}</p>
            <p className="text-xs text-slate-500">kg Montado</p>
          </div>
        </div>

        {/* Valores */}
        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-xs text-slate-500">Valor Contrato</p>
            <p className="text-lg font-bold text-white">{formatCurrency(obra.valorContrato)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Faturado</p>
            <p className="text-lg font-semibold text-emerald-400">{formatCurrency(valorFaturado)}</p>
          </div>
        </div>

        {/* Datas */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Início: {obra.dataInicio ? new Date(obra.dataInicio).toLocaleDateString('pt-BR') : '-'}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Previsão: {obra.previsaoTermino ? new Date(obra.previsaoTermino).toLocaleDateString('pt-BR') : '-'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function MultiObrasPage() {
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [activeTab, setActiveTab] = useState('cards');

  // Hooks do ERPContext - Dados Reais
  const { obras, setObraAtual } = useObras();
  const { pecas } = useProducao();
  const { expedicoes } = useExpedicao();
  const { medicoes } = useMedicoes();
  const { equipes, funcionarios } = useEquipes();
  const { orcamentos } = useOrcamentos();
  const { clientes } = useERP();

  // Filtrar obras (excluindo canceladas por padrão)
  const obrasFiltradas = useMemo(() => {
    let resultado = obras.filter(o => o.status !== STATUS_OBRA.CANCELADA);

    if (filtroStatus === 'em_andamento') {
      resultado = resultado.filter(o =>
        [STATUS_OBRA.EM_PRODUCAO, STATUS_OBRA.EM_EXPEDICAO, STATUS_OBRA.EM_MONTAGEM, STATUS_OBRA.AGUARDANDO_MATERIAL].includes(o.status)
      );
    } else if (filtroStatus === 'planejamento') {
      resultado = resultado.filter(o =>
        [STATUS_OBRA.ORCAMENTO, STATUS_OBRA.APROVADA, STATUS_OBRA.EM_PROJETO].includes(o.status)
      );
    } else if (filtroStatus === 'concluido') {
      resultado = resultado.filter(o => o.status === STATUS_OBRA.CONCLUIDA);
    }

    return resultado;
  }, [obras, filtroStatus]);

  // KPIs consolidados
  const kpis = useMemo(() => {
    const obrasAtivas = obras.filter(o =>
      [STATUS_OBRA.EM_PRODUCAO, STATUS_OBRA.EM_EXPEDICAO, STATUS_OBRA.EM_MONTAGEM, STATUS_OBRA.AGUARDANDO_MATERIAL].includes(o.status)
    );

    const valorTotal = obras.filter(o => o.status !== STATUS_OBRA.CANCELADA)
      .reduce((sum, o) => sum + (o.valorContrato || 0), 0);

    const valorFaturado = medicoes.reduce((sum, m) => sum + (m.totalValor || 0), 0);

    const pesoTotal = obrasAtivas.reduce((sum, o) => sum + (o.pesoTotal || 0), 0);

    const pecasProduzidas = pecas.filter(p =>
      [ETAPAS_PRODUCAO.FABRICACAO, ETAPAS_PRODUCAO.SOLDA, ETAPAS_PRODUCAO.PINTURA, ETAPAS_PRODUCAO.EXPEDIDO].includes(p.etapa)
    ).length;

    const percentualMedio = obrasAtivas.length > 0
      ? obrasAtivas.reduce((sum, o) => {
          const prog = ((o.progresso?.corte || 0) + (o.progresso?.fabricacao || 0) +
                       (o.progresso?.solda || 0) + (o.progresso?.pintura || 0) +
                       (o.progresso?.expedicao || 0) + (o.progresso?.montagem || 0)) / 6;
          return sum + prog;
        }, 0) / obrasAtivas.length
      : 0;

    return {
      totalObras: obras.filter(o => o.status !== STATUS_OBRA.CANCELADA).length,
      obrasAtivas: obrasAtivas.length,
      valorTotal,
      valorFaturado,
      pesoTotal,
      pecasProduzidas,
      percentualMedio
    };
  }, [obras, pecas, medicoes]);

  // Dados para gráfico comparativo
  const dadosComparativo = useMemo(() => {
    return obrasFiltradas.map(obra => {
      const medicoesObra = medicoes.filter(m => m.obraId === obra.id);
      const valorFaturado = medicoesObra.reduce((acc, m) => acc + (m.totalValor || 0), 0);
      const percentualFinanceiro = obra.valorContrato > 0
        ? Math.round((valorFaturado / obra.valorContrato) * 100)
        : 0;

      const progressoFisico = Math.round(
        ((obra.progresso?.corte || 0) + (obra.progresso?.fabricacao || 0) +
         (obra.progresso?.solda || 0) + (obra.progresso?.pintura || 0) +
         (obra.progresso?.expedicao || 0) + (obra.progresso?.montagem || 0)) / 6
      );

      return {
        nome: obra.codigo,
        fisico: progressoFisico,
        financeiro: percentualFinanceiro
      };
    });
  }, [obrasFiltradas, medicoes]);

  // Dados para gráfico de peso por obra
  const dadosPeso = useMemo(() => {
    return obrasFiltradas.map(obra => {
      const expedicoesObra = expedicoes.filter(e => e.obraId === obra.id);
      const pesoExpedido = expedicoesObra.reduce((acc, e) => acc + (e.pesoTotal || 0), 0);
      const pesoMontado = expedicoesObra.filter(e => e.status === 'entregue')
        .reduce((acc, e) => acc + (e.pesoTotal || 0), 0);

      return {
        nome: obra.codigo,
        total: obra.pesoTotal || 0,
        expedido: pesoExpedido,
        montado: pesoMontado
      };
    });
  }, [obrasFiltradas, expedicoes]);

  // Dados para gráfico de pizza (status)
  const dadosPizza = useMemo(() => {
    const statusCounts = {};
    obras.filter(o => o.status !== STATUS_OBRA.CANCELADA).forEach(obra => {
      const statusText = getStatusText(obra.status);
      statusCounts[statusText] = (statusCounts[statusText] || 0) + 1;
    });

    const cores = {
      'Em Produção': '#3b82f6',
      'Em Expedição': '#8b5cf6',
      'Em Montagem': '#06b6d4',
      'Em Projeto': '#f59e0b',
      'Aprovada': '#10b981',
      'Orçamento': '#64748b',
      'Concluída': '#10b981',
      'Aguardando Material': '#f97316'
    };

    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
      color: cores[name] || '#64748b'
    }));
  }, [obras]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            Multi-Obras
          </h1>
          <p className="text-slate-400 mt-1">Visão consolidada de todos os projetos - Dados em tempo real</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="planejamento">Planejamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => {
              const exportData = obrasFiltradas.map(obra => ({
                codigo: obra.codigo,
                nome: obra.nome,
                status: getStatusText(obra.status),
                valorContrato: obra.valorContrato || 0,
                dataInicio: obra.dataInicio ? new Date(obra.dataInicio).toLocaleDateString('pt-BR') : '',
                previsaoTermino: obra.previsaoTermino ? new Date(obra.previsaoTermino).toLocaleDateString('pt-BR') : '',
                pesoTotal: obra.pesoTotal || 0,
                progressoCorte: `${obra.progresso?.corte || 0}%`,
                progressoFabricacao: `${obra.progresso?.fabricacao || 0}%`,
                progressoSolda: `${obra.progresso?.solda || 0}%`,
                progressoPintura: `${obra.progresso?.pintura || 0}%`,
                progressoExpedicao: `${obra.progresso?.expedicao || 0}%`,
                progressoMontagem: `${obra.progresso?.montagem || 0}%`
              }));
              const columns = [
                { header: 'Código', key: 'codigo' },
                { header: 'Nome', key: 'nome' },
                { header: 'Status', key: 'status' },
                { header: 'Valor Contrato (R$)', key: 'valorContrato' },
                { header: 'Data Início', key: 'dataInicio' },
                { header: 'Previsão Término', key: 'previsaoTermino' },
                { header: 'Peso Total (kg)', key: 'pesoTotal' },
                { header: 'Corte (%)', key: 'progressoCorte' },
                { header: 'Fabricação (%)', key: 'progressoFabricacao' },
                { header: 'Solda (%)', key: 'progressoSolda' },
                { header: 'Pintura (%)', key: 'progressoPintura' },
                { header: 'Expedição (%)', key: 'progressoExpedicao' },
                { header: 'Montagem (%)', key: 'progressoMontagem' }
              ];
              const timestamp = new Date().toISOString().split('T')[0];
              exportToExcel(exportData, columns, `multi-obras-${timestamp}`);
              toast.success('Obras exportadas para Excel com sucesso!');
            }}
            variant="outline"
            className="border-slate-700 text-slate-300">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <Building2 className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{kpis.totalObras}</p>
            <p className="text-xs text-slate-500">Total Obras</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{kpis.obrasAtivas}</p>
            <p className="text-xs text-slate-500">Em Andamento</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-lg font-bold text-white">{formatCurrency(kpis.valorTotal)}</p>
            <p className="text-xs text-slate-500">Valor Total</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(kpis.valorFaturado)}</p>
            <p className="text-xs text-slate-500">Faturado</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <Package className="h-6 w-6 text-amber-400 mx-auto mb-2" />
            <p className="text-lg font-bold text-white">{formatNumber(kpis.pesoTotal)}</p>
            <p className="text-xs text-slate-500">kg em Produção</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <Factory className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{kpis.pecasProduzidas}</p>
            <p className="text-xs text-slate-500">Peças Produzidas</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <Percent className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{kpis.percentualMedio.toFixed(0)}%</p>
            <p className="text-xs text-slate-500">Progresso Médio</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 border border-slate-700/50">
          <TabsTrigger value="cards" className="data-[state=active]:bg-blue-500">
            <Building2 className="h-4 w-4 mr-2" />
            Cards
          </TabsTrigger>
          <TabsTrigger value="comparativo" className="data-[state=active]:bg-blue-500">
            <BarChart3 className="h-4 w-4 mr-2" />
            Comparativo
          </TabsTrigger>
          <TabsTrigger value="timeline" className="data-[state=active]:bg-blue-500">
            <Calendar className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* Cards */}
        <TabsContent value="cards" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {obrasFiltradas.map((obra, idx) => (
              <ObraCard
                key={obra.id}
                obra={obra}
                pecas={pecas}
                expedicoes={expedicoes}
                medicoes={medicoes}
                clientes={clientes}
                orcamentos={orcamentos}
                cor={CORES_OBRAS[idx % CORES_OBRAS.length]}
              />
            ))}
          </div>

          {obrasFiltradas.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma obra encontrada com este filtro</p>
            </div>
          )}
        </TabsContent>

        {/* Comparativo */}
        <TabsContent value="comparativo" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progresso Físico vs Financeiro */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-400" />
                  Progresso Físico vs Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dadosComparativo}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="nome" stroke="#64748b" />
                    <YAxis stroke="#64748b" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(value) => [`${value}%`, '']}
                    />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    <Bar dataKey="fisico" name="Físico %" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="financeiro" name="Financeiro %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Peso por Obra */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-amber-400" />
                  Peso por Obra (kg)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dadosPeso} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" tickFormatter={(v) => formatNumber(v)} />
                    <YAxis type="category" dataKey="nome" stroke="#64748b" width={60} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(value) => [formatNumber(value) + ' kg', '']}
                    />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    <Bar dataKey="total" name="Total" fill="#64748b" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="expedido" name="Expedido" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="montado" name="Montado" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribuição por Status */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-400" />
                  Distribuição por Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dadosPizza}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {dadosPizza.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Resumo Financeiro */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {obrasFiltradas.map((obra, idx) => {
                  const medicoesObra = medicoes.filter(m => m.obraId === obra.id);
                  const valorFaturado = medicoesObra.reduce((acc, m) => acc + (m.totalValor || 0), 0);
                  const percentual = obra.valorContrato > 0
                    ? Math.round((valorFaturado / obra.valorContrato) * 100)
                    : 0;

                  return (
                    <div key={obra.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: CORES_OBRAS[idx % CORES_OBRAS.length] }}
                          />
                          <span className="text-sm text-white font-medium">{obra.codigo}</span>
                        </div>
                        <span className="text-sm text-slate-400">
                          {formatCurrency(valorFaturado)} / {formatCurrency(obra.valorContrato)}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(percentual, 100)}%`,
                            backgroundColor: CORES_OBRAS[idx % CORES_OBRAS.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="mt-6">
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Timeline de Obras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {obrasFiltradas
                  .sort((a, b) => new Date(a.dataInicio || 0) - new Date(b.dataInicio || 0))
                  .map((obra, index) => {
                    const cor = CORES_OBRAS[index % CORES_OBRAS.length];
                    const cliente = clientes.find(c => c.id === obra.clienteId);
                    const progressoFisico = Math.round(
                      ((obra.progresso?.corte || 0) + (obra.progresso?.fabricacao || 0) +
                       (obra.progresso?.solda || 0) + (obra.progresso?.pintura || 0) +
                       (obra.progresso?.expedicao || 0) + (obra.progresso?.montagem || 0)) / 6
                    );

                    return (
                      <div key={obra.id} className="flex items-center gap-4">
                        <div className="w-24 text-right">
                          <p className="text-sm font-mono text-slate-400">
                            {obra.dataInicio
                              ? new Date(obra.dataInicio).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
                              : '-'
                            }
                          </p>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full border-4"
                          style={{
                            borderColor: cor,
                            backgroundColor: obra.status === STATUS_OBRA.CONCLUIDA ? cor : 'transparent'
                          }}
                        />
                        <div className="flex-1 bg-slate-800/50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs">{obra.codigo}</Badge>
                                <span className="font-semibold text-white">{obra.nome}</span>
                              </div>
                              <p className="text-sm text-slate-400 mt-1">{cliente?.nomeFantasia || cliente?.razaoSocial}</p>
                            </div>
                            <div className="text-right">
                              <Badge className={cn("border", getStatusColor(obra.status))}>
                                {getStatusText(obra.status)}
                              </Badge>
                              <p className="text-sm text-slate-500 mt-1">{progressoFisico}% concluído</p>
                            </div>
                          </div>
                          {/* Barra de progresso */}
                          <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${progressoFisico}%`, backgroundColor: cor }}
                            />
                          </div>
                        </div>
                        <div className="w-24">
                          <p className="text-sm font-mono text-slate-400">
                            {obra.previsaoTermino
                              ? new Date(obra.previsaoTermino).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
                              : '-'
                            }
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
