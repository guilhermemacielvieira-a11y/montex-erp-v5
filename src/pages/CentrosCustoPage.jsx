// MONTEX ERP Premium - Módulo de Centros de Custo
// Gestão de centros de custo e alocação de despesas

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Building2,
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
  LineChart,
  Line
} from 'recharts';
import { useFinancialIntelligence } from '@/hooks/useFinancialIntelligence';

// Componente de Card de Centro de Custo
function CentroCustoCard({ centro, formatCurrency }) {
  const percentual = centro.orcamento > 0 ? (centro.gasto / centro.orcamento) * 100 : 0;
  const Icon = Building2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5 hover:border-slate-600/50 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${centro.cor}20` }}
          >
            <Icon className="h-6 w-6" style={{ color: centro.cor }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">{centro.nome}</h3>
              <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                {centro.id}
              </Badge>
            </div>
            <p className="text-sm text-slate-400">{centro.responsavel}</p>
          </div>
        </div>
        <Badge
          className={cn(
            "border",
            centro.status === 'Excedido' ? "bg-red-500/20 text-red-400 border-red-500/30" :
            centro.status === 'Atenção' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
            "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
          )}
        >
          {centro.status}
        </Badge>
      </div>

      {/* Barra de Progresso */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Utilização do Orçamento</span>
          <span className={cn(
            "font-semibold",
            percentual > 100 ? "text-red-400" :
            percentual > 90 ? "text-amber-400" :
            "text-emerald-400"
          )}>{percentual.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentual, 100)}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-full"
            style={{ backgroundColor: centro.cor }}
          />
        </div>
      </div>

      {/* Valores */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
        <div>
          <p className="text-xs text-slate-500">Gasto Atual</p>
          <p className="text-lg font-bold text-white">{formatCurrency(centro.gasto)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Orçamento</p>
          <p className="text-lg font-semibold text-slate-300">{formatCurrency(centro.orcamento)}</p>
        </div>
      </div>

      {/* Categorias */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-500 mb-2">Categorias:</p>
        <div className="flex flex-wrap gap-1">
          {centro.categorias && centro.categorias.slice(0, 3).map((cat, idx) => (
            <Badge key={idx} variant="outline" className="text-xs text-slate-400 border-slate-600">
              {typeof cat === 'string' ? cat : cat.nome}
            </Badge>
          ))}
          {centro.categorias && centro.categorias.length > 3 && (
            <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
              +{centro.categorias.length - 3}
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function CentrosCustoPage() {
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [periodo, setPeriodo] = useState('mes');
  const [lancamentosPage, setLancamentosPage] = useState(1);
  const [centroCustoFilter, setCentroCustoFilter] = useState('');
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    responsavel: '',
    orcamentoMensal: ''
  });

  // Period mapping
  const periodoMap = {
    'mes': 'mensal',
    'trimestre': 'trimestral',
    'ano': 'anual'
  };

  // Hook de dados financeiros
  const { custosPorCentro, evolucaoMensal, formatCurrency } = useFinancialIntelligence({
    periodo: periodoMap[periodo]
  });

  // Alert para centros com utilização > 90%
  useEffect(() => {
    if (custosPorCentro && custosPorCentro.length > 0) {
      const centrosAlerta = custosPorCentro.filter(c => c.utilizacao > 90);
      centrosAlerta.forEach(centro => {
        if (centro.utilizacao > 100) {
          toast.error(`Centro "${centro.nome}" excedeu o orçamento em ${(centro.utilizacao - 100).toFixed(0)}%`, {
            duration: 4000,
          });
        } else if (centro.utilizacao > 90) {
          toast.warn(`Centro "${centro.nome}" utiliza ${centro.utilizacao.toFixed(0)}% do orçamento`, {
            duration: 4000,
          });
        }
      });
    }
  }, [custosPorCentro]);

  // KPIs calculados dos dados reais
  const kpis = useMemo(() => {
    if (!custosPorCentro || custosPorCentro.length === 0) {
      return { totalOrcamento: 0, totalGasto: 0, saldo: 0, utilizacao: 0 };
    }

    const totalOrcamento = custosPorCentro.reduce((sum, c) => sum + (c.orcamento || 0), 0);
    const totalGasto = custosPorCentro.reduce((sum, c) => sum + (c.gasto || 0), 0);
    const saldo = totalOrcamento - totalGasto;
    const utilizacao = totalOrcamento > 0 ? (totalGasto / totalOrcamento) * 100 : 0;

    return { totalOrcamento, totalGasto, saldo, utilizacao };
  }, [custosPorCentro]);

  // Dados para gráfico de pizza
  const pieData = (custosPorCentro || []).map(c => ({
    name: c.nome,
    value: c.gasto || 0,
    fill: c.cor
  })).filter(d => d.value > 0);

  // Dados para gráfico de barras horizontal
  const barData = (custosPorCentro || []).map(c => ({
    nome: c.nome,
    orcamento: c.orcamento || 0,
    gasto: c.gasto || 0
  }));

  // Dados para AreaChart de evolução mensal
  const areaData = (evolucaoMensal || []).map(item => ({
    ...item,
    utilizacao: item.utilizacao || 0
  }));

  // Lançamentos para tabela
  const lancamentosFormatted = useMemo(() => {
    if (!custosPorCentro || custosPorCentro.length === 0) return [];

    const allLancamentos = custosPorCentro.flatMap(centro =>
      (centro.lancamentos || []).map(lanc => ({
        ...lanc,
        centroCusto: centro.nome,
        centroCustoId: centro.id
      }))
    );

    // Filtro por centro se selecionado
    let filtered = allLancamentos;
    if (centroCustoFilter) {
      filtered = filtered.filter(l => l.centroCustoId === centroCustoFilter);
    }

    // Ordenar por data descendente
    return filtered.sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [custosPorCentro, centroCustoFilter]);

  // Paginação para lançamentos
  const itemsPerPage = 20;
  const totalPages = Math.ceil(lancamentosFormatted.length / itemsPerPage);
  const lancamentosPaginados = lancamentosFormatted.slice(
    (lancamentosPage - 1) * itemsPerPage,
    lancamentosPage * itemsPerPage
  );

  const handleSaveCentroCusto = () => {
    if (!formData.codigo || !formData.nome || !formData.descricao || !formData.responsavel || !formData.orcamentoMensal) {
      toast.error('Preencher todos os campos');
      return;
    }

    toast.success('Centro de custo será criado no servidor');
    setDialogOpen(false);
    setFormData({
      codigo: '',
      nome: '',
      descricao: '',
      responsavel: '',
      orcamentoMensal: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            Centros de Custo
          </h1>
          <p className="text-slate-400 mt-1">Gestão e controle de centros de custo</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="ano">Ano</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                Novo Centro
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Criar Centro de Custo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Código</Label>
                    <Input
                      className="mt-1 bg-slate-800 border-slate-700"
                      placeholder="CC-006"
                      value={formData.codigo}
                      onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Nome</Label>
                    <Input
                      className="mt-1 bg-slate-800 border-slate-700"
                      placeholder="Nome do centro"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Descrição</Label>
                  <Input
                    className="mt-1 bg-slate-800 border-slate-700"
                    placeholder="Descrição do centro de custo"
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Responsável</Label>
                    <Input
                      className="mt-1 bg-slate-800 border-slate-700"
                      placeholder="Nome do responsável"
                      value={formData.responsavel}
                      onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Orçamento Mensal</Label>
                    <Input
                      className="mt-1 bg-slate-800 border-slate-700"
                      type="number"
                      placeholder="50000"
                      value={formData.orcamentoMensal}
                      onChange={(e) => setFormData({...formData, orcamentoMensal: e.target.value})}
                    />
                  </div>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-500"
                  onClick={handleSaveCentroCusto}
                >
                  Criar Centro de Custo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Orçamento Total</p>
                <p className="text-xl font-bold text-white">{formatCurrency(kpis.totalOrcamento)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Gasto Atual</p>
                <p className="text-xl font-bold text-white">{formatCurrency(kpis.totalGasto)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Saldo Disponível</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(kpis.saldo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <PieChart className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Utilização</p>
                <p className="text-xl font-bold text-white">{kpis.utilizacao.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 border border-slate-700/50">
          <TabsTrigger value="visao-geral" className="data-[state=active]:bg-violet-500">
            <PieChart className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="centros" className="data-[state=active]:bg-violet-500">
            <Building2 className="h-4 w-4 mr-2" />
            Centros
          </TabsTrigger>
          <TabsTrigger value="lancamentos" className="data-[state=active]:bg-violet-500">
            <FileText className="h-4 w-4 mr-2" />
            Lançamentos
          </TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Pizza */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-violet-400" />
                  Distribuição por Centro
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Legend
                        wrapperStyle={{ color: '#94a3b8' }}
                        formatter={(value) => <span className="text-slate-300">{value}</span>}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-400">
                    Sem dados disponíveis
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Barras */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  Orçamento vs Gasto
                </CardTitle>
              </CardHeader>
              <CardContent>
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#64748b" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="nome" stroke="#64748b" width={100} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Bar dataKey="orcamento" name="Orçamento" fill="#64748b" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="gasto" name="Gasto" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-400">
                    Sem dados disponíveis
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Evolução Mensal */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                Evolução Mensal da Utilização
              </CardTitle>
            </CardHeader>
            <CardContent>
              {areaData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={areaData}>
                    <defs>
                      <linearGradient id="colorUtilizacao" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="mes" stroke="#64748b" />
                    <YAxis stroke="#64748b" label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(value) => [`${value.toFixed(0)}%`, 'Utilização']}
                    />
                    <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '90% Alerta', fill: '#f59e0b', fontSize: 12 }} />
                    <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '100% Limite', fill: '#ef4444', fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="utilizacao"
                      stroke="#8b5cf6"
                      fillOpacity={1}
                      fill="url(#colorUtilizacao)"
                      name="Utilização (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Centros */}
        <TabsContent value="centros" className="space-y-4 mt-6">
          {custosPorCentro && custosPorCentro.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {custosPorCentro.map(centro => (
                <CentroCustoCard key={centro.id} centro={centro} formatCurrency={formatCurrency} />
              ))}
            </div>
          ) : (
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="p-8 text-center">
                <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Nenhum centro de custo disponível</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Lançamentos */}
        <TabsContent value="lancamentos" className="mt-6 space-y-4">
          {/* Filtros */}
          <div className="flex flex-col gap-3">
            <Label className="text-slate-300">Filtrar por Centro de Custo</Label>
            <Select value={centroCustoFilter} onValueChange={setCentroCustoFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue placeholder="Todos os centros" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="">Todos os centros</SelectItem>
                {(custosPorCentro || []).map(centro => (
                  <SelectItem key={centro.id} value={centro.id}>
                    {centro.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabela de Lançamentos */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">
                Lançamentos {lancamentosFormatted.length > 0 && `(${lancamentosFormatted.length})`}
              </CardTitle>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {lancamentosPaginados.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-400">Data</TableHead>
                        <TableHead className="text-slate-400">Centro de Custo</TableHead>
                        <TableHead className="text-slate-400">Categoria</TableHead>
                        <TableHead className="text-slate-400">Descrição</TableHead>
                        <TableHead className="text-slate-400 text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lancamentosPaginados.map(lanc => (
                        <TableRow key={lanc.id} className="border-slate-800">
                          <TableCell className="text-slate-300">
                            {new Date(lanc.data).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-slate-600 text-slate-300">
                              {lanc.centroCusto}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-400">{lanc.categoriaNorm || lanc.categoria || '-'}</TableCell>
                          <TableCell className="text-white">{lanc.descricao}</TableCell>
                          <TableCell className="text-right font-semibold text-rose-400">
                            {formatCurrency(lanc.valor || lanc.valorAlocado || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                      <p className="text-sm text-slate-400">
                        Página {lancamentosPage} de {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-700"
                          onClick={() => setLancamentosPage(Math.max(1, lancamentosPage - 1))}
                          disabled={lancamentosPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-700"
                          onClick={() => setLancamentosPage(Math.min(totalPages, lancamentosPage + 1))}
                          disabled={lancamentosPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center">
                  <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Nenhum lançamento encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
