// MONTEX ERP Premium - Módulo de Metas Financeiras
// Gestão de metas de faturamento, objetivos e acompanhamento

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Target,
  DollarSign,
  Calendar,
  Plus,
  BarChart3,
  PieChart,
  Award,
  Flag,
  Zap,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';

// Metas - Será preenchido com dados reais
const mockMetas = [];

// Histórico Mensal - Será preenchido com dados reais
// Histórico será preenchido com dados reais
const historicoMensal = [];

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatPercent = (value) => `${value.toFixed(1)}%`;

// Componente de Card de Meta
function MetaCard({ meta }) {
  const percentual = (meta.valorAtual / meta.valorMeta) * 100;
  const isPercentMeta = meta.unidade === '%';

  const getStatusColor = (status) => {
    switch (status) {
      case 'atingida': return 'from-emerald-500 to-green-500';
      case 'em_andamento': return 'from-blue-500 to-cyan-500';
      case 'atencao': return 'from-amber-500 to-orange-500';
      case 'nao_atingida': return 'from-red-500 to-rose-500';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'atingida': return 'Meta Atingida';
      case 'em_andamento': return 'Em Andamento';
      case 'atencao': return 'Atenção';
      case 'nao_atingida': return 'Não Atingida';
      default: return status;
    }
  };

  const getPrioridadeColor = (prioridade) => {
    switch (prioridade) {
      case 'alta': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'media': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'baixa': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5 hover:border-slate-600/50 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
            getStatusColor(meta.status)
          )}>
            <Target className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{meta.titulo}</h3>
            <p className="text-sm text-slate-400">{meta.responsavel}</p>
          </div>
        </div>
        <Badge className={cn("border", getPrioridadeColor(meta.prioridade))}>
          {meta.prioridade.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Progresso</span>
          <span className={cn(
            "font-semibold",
            percentual >= 100 ? "text-emerald-400" : percentual >= 75 ? "text-blue-400" : percentual >= 50 ? "text-amber-400" : "text-red-400"
          )}>
            {formatPercent(percentual)}
          </span>
        </div>

        <div className="relative">
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentual, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full bg-gradient-to-r",
                getStatusColor(meta.status)
              )}
            />
          </div>
          {percentual > 100 && (
            <div className="absolute -top-1 right-0 text-emerald-400">
              <Zap className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="flex justify-between items-end pt-2">
          <div>
            <p className="text-xs text-slate-500">Atual</p>
            <p className="text-lg font-bold text-white">
              {isPercentMeta ? formatPercent(meta.valorAtual) : meta.unidade ? `${meta.valorAtual} ${meta.unidade}` : formatCurrency(meta.valorAtual)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Meta</p>
            <p className="text-lg font-semibold text-slate-300">
              {isPercentMeta ? formatPercent(meta.valorMeta) : meta.unidade ? `${meta.valorMeta} ${meta.unidade}` : formatCurrency(meta.valorMeta)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
          <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
            <Calendar className="h-3 w-3 mr-1" />
            {meta.dataLimite}
          </Badge>
          <Badge className={cn("text-xs", meta.status === 'atingida' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-300')}>
            {getStatusText(meta.status)}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
}

// Componente de KPI Grande
function KPICard({ title, value, subtitle, icon: Icon, color, trend, trendValue }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br",
          color
        )}>
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700/50">
          {trend >= 0 ? (
            <ArrowUp className="h-4 w-4 text-emerald-400" />
          ) : (
            <ArrowDown className="h-4 w-4 text-red-400" />
          )}
          <span className={cn(
            "text-sm font-medium",
            trend >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {trend >= 0 ? '+' : ''}{trendValue || trend}%
          </span>
          <span className="text-xs text-slate-500">vs mês anterior</span>
        </div>
      )}
    </motion.div>
  );
}

export default function MetasFinanceirasPage() {
  const [metas, setMetas] = useState(mockMetas);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);

  // KPIs calculados
  const kpis = useMemo(() => {
    const metasAtingidas = metas.filter(m => m.status === 'atingida').length;
    const totalMetas = metas.length;
    const taxaSucesso = totalMetas > 0 ? (metasAtingidas / totalMetas) * 100 : 0;

    const faturamentoMeta = metas.find(m => m.tipo === 'faturamento');
    const progressoFaturamento = faturamentoMeta
      ? (faturamentoMeta.valorAtual / faturamentoMeta.valorMeta) * 100
      : 0;

    return {
      metasAtingidas,
      totalMetas,
      taxaSucesso,
      progressoFaturamento,
      faturamentoAtual: faturamentoMeta?.valorAtual || 0,
      faturamentoMeta: faturamentoMeta?.valorMeta || 0
    };
  }, [metas]);

  // Filtrar metas
  const metasFiltradas = useMemo(() => {
    return metas.filter(meta => {
      if (filtroTipo !== 'todos' && meta.tipo !== filtroTipo) return false;
      if (filtroStatus !== 'todos' && meta.status !== filtroStatus) return false;
      return true;
    });
  }, [metas, filtroTipo, filtroStatus]);

  // Dados para gráfico radial
  const radialData = [
    { name: 'Faturamento', value: kpis.progressoFaturamento, fill: '#10b981' },
    { name: 'Produção', value: 113.9, fill: '#3b82f6' },
    { name: 'Margem', value: 90, fill: '#f59e0b' },
    { name: 'Clientes', value: 80, fill: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Target className="h-6 w-6 text-white" />
            </div>
            Metas Financeiras
          </h1>
          <p className="text-slate-400 mt-1">Acompanhamento de objetivos e metas da empresa</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700">
              <SelectValue placeholder="Tipo de Meta" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              <SelectItem value="faturamento">Faturamento</SelectItem>
              <SelectItem value="reducao_custo">Redução de Custo</SelectItem>
              <SelectItem value="producao">Produção</SelectItem>
              <SelectItem value="margem">Margem</SelectItem>
              <SelectItem value="novos_clientes">Novos Clientes</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="atingida">Atingida</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="atencao">Atenção</SelectItem>
              <SelectItem value="nao_atingida">Não Atingida</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Criar Nova Meta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label className="text-slate-300">Título da Meta</Label>
                  <Input className="mt-1 bg-slate-800 border-slate-700" placeholder="Ex: Meta de Faturamento Q1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Tipo</Label>
                    <Select>
                      <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="faturamento">Faturamento</SelectItem>
                        <SelectItem value="reducao_custo">Redução de Custo</SelectItem>
                        <SelectItem value="producao">Produção</SelectItem>
                        <SelectItem value="margem">Margem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Prioridade</Label>
                    <Select>
                      <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Valor da Meta</Label>
                    <Input className="mt-1 bg-slate-800 border-slate-700" type="number" placeholder="500000" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Data Limite</Label>
                    <Input className="mt-1 bg-slate-800 border-slate-700" type="date" />
                  </div>
                </div>
                <Button
                  onClick={() => {
                    toast.success('Meta criada com sucesso!');
                    setDialogOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500">
                  Criar Meta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Faturamento Atual"
          value={formatCurrency(kpis.faturamentoAtual)}
          subtitle={`Meta: ${formatCurrency(kpis.faturamentoMeta)}`}
          icon={DollarSign}
          color="from-emerald-500 to-green-500"
          trend={-5.2}
        />
        <KPICard
          title="Progresso da Meta"
          value={formatPercent(kpis.progressoFaturamento)}
          subtitle="do objetivo mensal"
          icon={Target}
          color="from-blue-500 to-cyan-500"
          trend={3.8}
        />
        <KPICard
          title="Metas Atingidas"
          value={`${kpis.metasAtingidas}/${kpis.totalMetas}`}
          subtitle={`Taxa de sucesso: ${formatPercent(kpis.taxaSucesso)}`}
          icon={Award}
          color="from-amber-500 to-orange-500"
          trend={12}
        />
        <KPICard
          title="Dias Restantes"
          value="25"
          subtitle="para fim do período"
          icon={Calendar}
          color="from-purple-500 to-pink-500"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Evolução */}
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              Faturamento vs Meta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historicoMensal}>
                <defs>
                  <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mes" stroke="#64748b" />
                <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Area
                  type="monotone"
                  dataKey="faturamento"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#colorFaturamento)"
                  name="Faturamento"
                />
                <Line
                  type="monotone"
                  dataKey="meta"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Meta"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico Radial de Progresso */}
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-400" />
              Progresso por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="20%"
                outerRadius="90%"
                data={radialData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  minAngle={15}
                  background={{ fill: '#1e293b' }}
                  clockWise
                  dataKey="value"
                  cornerRadius={5}
                />
                <Legend
                  iconSize={10}
                  layout="horizontal"
                  verticalAlign="bottom"
                  wrapperStyle={{ color: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  formatter={(value) => `${value}%`}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Metas */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Flag className="h-5 w-5 text-amber-400" />
          Metas Ativas ({metasFiltradas.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metasFiltradas.map((meta) => (
            <MetaCard key={meta.id} meta={meta} />
          ))}
        </div>
      </div>
    </div>
  );
}
