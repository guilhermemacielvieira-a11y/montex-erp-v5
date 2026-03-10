// MONTEX ERP Premium - Módulo de Metas Financeiras
// Gestão de metas de faturamento, objetivos e acompanhamento

import React, { useState } from 'react';
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
  ArrowDown,
  TrendingUp
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
  ComposedChart
} from 'recharts';
import { useFinancialIntelligence } from '@/hooks/useFinancialIntelligence';

// Componente de Card de Meta
function MetaCard({ meta, formatCurrency, formatPercent }) {
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

// Componente de Card de Estágio
function EstagioCard({ etapa }) {
  const getTaxaColor = (taxa) => {
    if (taxa >= 95) return 'text-emerald-400';
    if (taxa >= 80) return 'text-blue-400';
    if (taxa >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5 hover:border-slate-600/50 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white">{etapa.nome}</h3>
          <p className="text-sm text-slate-400 mt-1">{etapa.etapa}</p>
        </div>
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          <TrendingUp className="h-3 w-3 mr-1" />
          {etapa.taxa}%
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500">Produção</p>
            <p className="text-lg font-semibold text-white">{(etapa.producaoKg / 1000).toFixed(1)} ton</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Peças</p>
            <p className="text-lg font-semibold text-white">{etapa.pecas}</p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 mb-1">Valor Gerado</p>
          <p className="text-xl font-bold text-emerald-400">{etapa.valorGerado}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function MetasFinanceirasPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Integração com hook real
  const fi = useFinancialIntelligence();

  // Dados para gráfico radial de metas
  const radialData = [
    { name: 'Faturamento', value: fi.metas.faturamento.progresso, fill: '#10b981' },
    { name: 'Produção', value: fi.metas.producao.progresso, fill: '#3b82f6' },
    { name: 'Margem', value: fi.metas.margem.progresso, fill: '#f59e0b' },
    { name: 'Red. Custos', value: Math.max(0, 100 + fi.metas.reducaoCustos.variacao), fill: '#8b5cf6' },
  ];

  // Dados combinados para gráfico de tendências
  const tendenciasData = [
    ...(fi.evolucaoMensal || []),
    ...(fi.forecast3meses || []).map(f => ({ ...f, forecast: true }))
  ];

  // Dados para gráfico de comparação mensal
  const analiseMonthlyData = fi.evolucaoMensal || [];

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
          title="Faturamento"
          value={fi.formatCurrency(fi.kpisGerais.faturamento)}
          subtitle={`Meta: ${fi.formatCurrency(fi.metas.faturamento.meta)}`}
          icon={DollarSign}
          color="from-emerald-500 to-green-500"
        />
        <KPICard
          title="Custos Totais"
          value={fi.formatCurrency(fi.kpisGerais.despesas)}
          subtitle={`${fi.kpisGerais.totalDespesas} lançamentos`}
          icon={BarChart3}
          color="from-red-500 to-orange-500"
        />
        <KPICard
          title="Margem Operacional"
          value={fi.formatPercent(fi.margemOperacional)}
          subtitle="Meta: 25%"
          icon={TrendingUp}
          color="from-amber-500 to-orange-500"
        />
        <KPICard
          title="Produção"
          value={`${(fi.kpisGerais.producaoKg / 1000).toFixed(1)} ton`}
          subtitle={`por mês: ${fi.kpisGerais.producaoMensal} kg`}
          icon={Award}
          color="from-blue-500 to-cyan-500"
        />
      </div>

      {/* Abas com Visão Geral, Análise Mensal, Por Estágio e Tendências */}
      <Tabs defaultValue="visao-geral" className="space-y-4">
        <TabsList className="bg-slate-900/60 border border-slate-700/50">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="analise-mensal">Análise Mensal</TabsTrigger>
          <TabsTrigger value="por-estagio">Por Estágio</TabsTrigger>
          <TabsTrigger value="tendencias">Tendências</TabsTrigger>
        </TabsList>

        {/* Aba: Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-6">
          {/* Gráfico de Evolução */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-400" />
                  Evolução: Receita vs Custo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={fi.evolucaoMensal || []}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="mesLabel" stroke="#64748b" />
                    <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(value) => fi.formatCurrency(value)}
                    />
                    <Area
                      type="monotone"
                      dataKey="receita"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#colorReceita)"
                      name="Receita"
                    />
                    <Area
                      type="monotone"
                      dataKey="custo"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fill="url(#colorCusto)"
                      name="Custo"
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
                  Progresso de Metas
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
                      formatter={(value) => `${value.toFixed(1)}%`}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba: Análise Mensal */}
        <TabsContent value="analise-mensal" className="space-y-6">
          {/* Tabela de Análise */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Dados Mensais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50">
                      <TableHead className="text-slate-400">Mês</TableHead>
                      <TableHead className="text-slate-400 text-right">Receita</TableHead>
                      <TableHead className="text-slate-400 text-right">Custo</TableHead>
                      <TableHead className="text-slate-400 text-right">Margem</TableHead>
                      <TableHead className="text-slate-400 text-right">Custo/kg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(fi.evolucaoMensal || []).map((mes, idx) => (
                      <TableRow key={idx} className="border-slate-700/50 hover:bg-slate-800/30">
                        <TableCell className="text-slate-300">{mes.mesLabel}</TableCell>
                        <TableCell className="text-right text-emerald-400 font-semibold">{fi.formatCurrency(mes.receita)}</TableCell>
                        <TableCell className="text-right text-red-400 font-semibold">{fi.formatCurrency(mes.custo)}</TableCell>
                        <TableCell className="text-right text-blue-400 font-semibold">{fi.formatPercent(mes.margem)}</TableCell>
                        <TableCell className="text-right text-slate-300">{fi.formatCurrency(mes.custoPerKg)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Comparação Mensal */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-amber-400" />
                Comparação: Receita vs Custo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analiseMonthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mesLabel" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value) => fi.formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Bar dataKey="receita" fill="#10b981" name="Receita" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="custo" fill="#ef4444" name="Custo" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Por Estágio */}
        <TabsContent value="por-estagio" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(fi.etapasAnalise || []).map((etapa, idx) => (
              <EstagioCard key={idx} etapa={etapa} />
            ))}
          </div>
        </TabsContent>

        {/* Aba: Tendências */}
        <TabsContent value="tendencias" className="space-y-6">
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                Evolução + Previsão (3 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={tendenciasData}>
                  <defs>
                    <linearGradient id="colorTendencia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mesLabel" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value) => fi.formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorTendencia)"
                    name="Receita Real"
                  />
                  <Line
                    type="monotone"
                    dataKey="receitaProjetada"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Receita Projetada"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="custoProjetado"
                    stroke="#f97316"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Custo Projetado"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
