// MONTEX ERP Premium - Página Financeira
// Gestão financeira completa com receitas, despesas e análises
// Integrado com ERPContext - Dados reais da obra SUPER LUNA

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Download,
  CreditCard,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  BarChart3,
  Search,
  Eye,
  Edit,
  FileText,
  Building2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ERPContext - dados reais
import { useObras } from '../contexts/ERPContext';

// PAINEL FINANCEIRO GERAL DA EMPRESA
// Independente do módulo Gestão Financeira da Obra
// Os lançamentos da obra ficam em: GestaoFinanceiraObra.jsx
// Este painel é para gestão financeira GERAL (todas as obras, empresa)

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

// Cores para categorias
const categoriasCores = {
  'material': { cor: '#3B82F6', label: 'Material', icon: Receipt },
  'mao_de_obra': { cor: '#F97316', label: 'Mão de Obra', icon: Wallet },
  'transporte': { cor: '#A855F7', label: 'Transporte', icon: CreditCard },
  'equipamento': { cor: '#10B981', label: 'Equipamento', icon: Receipt },
  'administrativo': { cor: '#64748B', label: 'Administrativo', icon: DollarSign },
  'outros': { cor: '#EF4444', label: 'Outros', icon: DollarSign },
  'venda': { cor: '#22C55E', label: 'Venda', icon: DollarSign },
};

// Card de KPI Financeiro
function FinanceCard({ title, value, subtitle, icon: Icon, color, trend, trendLabel }) {
  const isPositive = trend >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          `bg-gradient-to-br ${color}`
        )}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium",
            isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <p className="text-sm text-slate-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && (
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      )}
      {trendLabel && (
        <p className="text-xs text-slate-500 mt-2">{trendLabel}</p>
      )}
    </motion.div>
  );
}

// Tooltip customizado para gráficos
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-white font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Componente Principal
export default function FinanceiroPage() {
  // ERPContext - dados reais
  const { obras } = useObras();

  // Estados de filtros
  const [periodo, setPeriodo] = useState('mes');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroObra, setFiltroObra] = useState('todas');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('visao-geral');

  // PAINEL FINANCEIRO GERAL - Independente da Gestão Financeira da Obra
  // Movimentações da empresa (não inclui lançamentos específicos de obra)
  // Para ver dados financeiros por obra: use o módulo "Gestão Financeira Obra"
  const [movimentacoesGeral, setMovimentacoesGeral] = useState([]);

  // Movimentações combinadas (empresa geral)
  const movimentacoes = useMemo(() => {
    return movimentacoesGeral.sort((a, b) =>
      new Date(b.data) - new Date(a.data)
    );
  }, [movimentacoesGeral]);

  // Filtrar movimentações
  const movimentacoesFiltradas = useMemo(() => {
    let movs = [...movimentacoes];

    if (filtroTipo !== 'todos') {
      movs = movs.filter(m => m.tipo === filtroTipo);
    }

    if (filtroCategoria !== 'todas') {
      movs = movs.filter(m => m.categoria === filtroCategoria);
    }

    if (filtroObra !== 'todas') {
      movs = movs.filter(m => m.obraId === filtroObra);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      movs = movs.filter(m =>
        m.descricao?.toLowerCase().includes(searchLower)
      );
    }

    return movs;
  }, [movimentacoes, filtroTipo, filtroCategoria, filtroObra, search]);

  // Calcular resumos a partir das movimentações próprias
  const resumo = useMemo(() => {
    const totalReceitas = movimentacoes.filter(m => m.tipo === 'receita').reduce((s, m) => s + (m.valor || 0), 0);
    const totalDespesas = movimentacoes.filter(m => m.tipo === 'despesa').reduce((s, m) => s + (m.valor || 0), 0);
    const lucro = totalReceitas - totalDespesas;
    const margemLucro = totalReceitas > 0 ? (lucro / totalReceitas) * 100 : 0;

    return {
      totalReceitas,
      totalDespesas,
      lucro,
      margemLucro,
      receitasPendentes: 0,
      despesasPendentes: 0,
      valorContrato: 0,
      faturado: 0,
      qtdReceitas: movimentacoes.filter(m => m.tipo === 'receita').length,
      qtdDespesas: movimentacoes.filter(m => m.tipo === 'despesa').length,
    };
  }, [movimentacoes]);

  // Dados por categoria para gráfico de pizza
  const dadosPorCategoria = useMemo(() => {
    const despesas = movimentacoes.filter(m => m.tipo === 'despesa');
    const porCategoria = despesas.reduce((acc, d) => {
      const cat = d.categoria || 'outros';
      acc[cat] = (acc[cat] || 0) + (d.valor || 0);
      return acc;
    }, {});

    return Object.entries(porCategoria).map(([categoria, valor]) => ({
      name: categoriasCores[categoria]?.label || categoria,
      value: valor,
      color: categoriasCores[categoria]?.cor || '#64748B',
    }));
  }, [movimentacoes]);

  // Dados para gráfico de evolução mensal - será preenchido com dados reais do Supabase
  const dadosEvolucaoMensal = useMemo(() => {
    return []; // Sem dados mock - dados virão do banco
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              Financeiro
            </h1>
            <p className="text-slate-400 mt-1">
              Gestão financeira e controle de custos
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-800 rounded-lg p-1">
              {['semana', 'mes', 'trimestre', 'ano'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all capitalize",
                    periodo === p
                      ? "bg-emerald-500 text-white"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <Button variant="outline" className="border-slate-700 text-white">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nova Movimentação
            </Button>
          </div>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FinanceCard
            title="Receitas"
            value={formatCurrency(resumo.totalReceitas)}
            subtitle={`${resumo.qtdReceitas} lançamentos`}
            icon={ArrowUpRight}
            color="from-emerald-500 to-green-500"
            trend={0}
            trendLabel="vs mês anterior"
          />
          <FinanceCard
            title="Despesas"
            value={formatCurrency(resumo.totalDespesas)}
            subtitle={`${resumo.qtdDespesas} lançamentos`}
            icon={ArrowDownRight}
            color="from-red-500 to-rose-500"
            trend={0}
            trendLabel="vs mês anterior"
          />
          <FinanceCard
            title="Lucro Líquido"
            value={formatCurrency(resumo.lucro)}
            subtitle={`Margem: ${resumo.margemLucro.toFixed(1)}%`}
            icon={TrendingUp}
            color="from-blue-500 to-cyan-500"
            trend={0}
          />
          <FinanceCard
            title="A Receber"
            value={formatCurrency(resumo.receitasPendentes)}
            subtitle={`A pagar: ${formatCurrency(resumo.despesasPendentes)}`}
            icon={Clock}
            color="from-orange-500 to-amber-500"
          />
        </div>

        {/* Tabs de Conteúdo */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800/60 border border-slate-700">
            <TabsTrigger value="visao-geral" className="data-[state=active]:bg-emerald-500">
              <BarChart3 className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="movimentacoes" className="data-[state=active]:bg-emerald-500">
              <FileText className="h-4 w-4 mr-2" />
              Movimentações
            </TabsTrigger>
            <TabsTrigger value="por-obra" className="data-[state=active]:bg-emerald-500">
              <Building2 className="h-4 w-4 mr-2" />
              Por Obra
            </TabsTrigger>
          </TabsList>

          {/* Tab: Visão Geral */}
          <TabsContent value="visao-geral" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Gráfico de Evolução */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-2 bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Evolução Financeira</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      Receitas
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      Despesas
                    </span>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dadosEvolucaoMensal}>
                      <defs>
                        <linearGradient id="receitas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="despesas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="mes" stroke="#64748B" />
                      <YAxis stroke="#64748B" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="receitas"
                        stroke="#10B981"
                        strokeWidth={2}
                        fill="url(#receitas)"
                        name="Receitas"
                      />
                      <Area
                        type="monotone"
                        dataKey="despesas"
                        stroke="#EF4444"
                        strokeWidth={2}
                        fill="url(#despesas)"
                        name="Despesas"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Gráfico por Categoria */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Despesas por Categoria</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={dadosPorCategoria}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="value"
                        label={false}
                      >
                        {dadosPorCategoria.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: '#1E293B',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {dadosPorCategoria.slice(0, 4).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-slate-400">{item.name}</span>
                      </div>
                      <span className="text-sm text-white font-medium">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Últimas Movimentações */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Últimas Movimentações</h3>
                  <Button variant="ghost" className="text-emerald-400 hover:text-emerald-300">
                    Ver todas
                    <ArrowUpRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
              <div className="divide-y divide-slate-700/30">
                {movimentacoes.slice(0, 8).map((mov, index) => {
                  const catInfo = categoriasCores[mov.categoria] || categoriasCores.outros;
                  const Icon = catInfo.icon;
                  const obra = obras.find(o => o.id === mov.obraId);

                  return (
                    <motion.div
                      key={mov.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${catInfo.cor}20` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: catInfo.cor }} />
                        </div>
                        <div>
                          <p className="text-white font-medium">{mov.descricao}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500">
                              {formatDate(mov.data)}
                            </span>
                            {obra && (
                              <>
                                <span className="text-xs text-slate-600">•</span>
                                <span className="text-xs text-slate-500">{obra.nome}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          className={cn(
                            "text-xs",
                            mov.status === 'confirmado'
                              ? "bg-emerald-500/20 text-emerald-400 border-0"
                              : "bg-amber-500/20 text-amber-400 border-0"
                          )}
                        >
                          {mov.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                        </Badge>
                        <span className={cn(
                          "font-semibold",
                          mov.tipo === 'receita' ? "text-emerald-400" : "text-red-400"
                        )}>
                          {mov.tipo === 'receita' ? '+' : '-'}{formatCurrency(mov.valor)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </TabsContent>

          {/* Tab: Movimentações */}
          <TabsContent value="movimentacoes" className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar movimentações..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-800/60 border-slate-700 text-white"
                />
              </div>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-[150px] bg-slate-800/60 border-slate-700 text-white">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="todos" className="text-white">Todos</SelectItem>
                  <SelectItem value="receita" className="text-white">Receitas</SelectItem>
                  <SelectItem value="despesa" className="text-white">Despesas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-[180px] bg-slate-800/60 border-slate-700 text-white">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="todas" className="text-white">Todas</SelectItem>
                  {Object.entries(categoriasCores).map(([key, val]) => (
                    <SelectItem key={key} value={key} className="text-white">
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroObra} onValueChange={setFiltroObra}>
                <SelectTrigger className="w-[200px] bg-slate-800/60 border-slate-700 text-white">
                  <SelectValue placeholder="Obra" />
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
            </div>

            {/* Tabela */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Data</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Descrição</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Categoria</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Obra</th>
                      <th className="text-center p-4 text-sm font-medium text-slate-400">Status</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-400">Valor</th>
                      <th className="text-center p-4 text-sm font-medium text-slate-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentacoesFiltradas.map((mov, index) => {
                      const catInfo = categoriasCores[mov.categoria] || categoriasCores.outros;
                      const obra = obras.find(o => o.id === mov.obraId);

                      return (
                        <motion.tr
                          key={mov.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b border-slate-700/30 hover:bg-slate-800/50"
                        >
                          <td className="p-4 text-slate-300">
                            {formatDate(mov.data)}
                          </td>
                          <td className="p-4 text-white">
                            {mov.descricao}
                          </td>
                          <td className="p-4">
                            <Badge
                              className="text-xs border-0"
                              style={{
                                backgroundColor: `${catInfo.cor}20`,
                                color: catInfo.cor
                              }}
                            >
                              {catInfo.label}
                            </Badge>
                          </td>
                          <td className="p-4 text-slate-400 text-sm">
                            {obra?.nome || '-'}
                          </td>
                          <td className="p-4 text-center">
                            <Badge
                              className={cn(
                                "text-xs",
                                mov.status === 'confirmado'
                                  ? "bg-emerald-500/20 text-emerald-400 border-0"
                                  : "bg-amber-500/20 text-amber-400 border-0"
                              )}
                            >
                              {mov.status === 'confirmado' ? (
                                <><CheckCircle2 className="h-3 w-3 mr-1" /> Confirmado</>
                              ) : (
                                <><Clock className="h-3 w-3 mr-1" /> Pendente</>
                              )}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <span className={cn(
                              "font-semibold",
                              mov.tipo === 'receita' ? "text-emerald-400" : "text-red-400"
                            )}>
                              {mov.tipo === 'receita' ? '+' : '-'}{formatCurrency(mov.valor)}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                                <DropdownMenuItem className="text-white hover:bg-slate-700">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-white hover:bg-slate-700">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
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

          {/* Tab: Por Obra */}
          <TabsContent value="por-obra" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {obras.map((obra, index) => {
                const receitas = movimentacoes
                  .filter(m => m.obraId === obra.id && m.tipo === 'receita')
                  .reduce((acc, m) => acc + (m.valor || 0), 0);
                const despesas = movimentacoes
                  .filter(m => m.obraId === obra.id && m.tipo === 'despesa')
                  .reduce((acc, m) => acc + (m.valor || 0), 0);
                const saldo = receitas - despesas;
                const margem = receitas > 0 ? (saldo / receitas) * 100 : 0;

                return (
                  <motion.div
                    key={obra.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{obra.nome}</h3>
                        <p className="text-sm text-slate-400">{obra.clienteNome}</p>
                      </div>
                      <Badge
                        className={cn(
                          "text-xs border-0",
                          obra.status === 'em_fabricacao' && "bg-orange-500/20 text-orange-400",
                          obra.status === 'em_montagem' && "bg-emerald-500/20 text-emerald-400",
                          obra.status === 'aprovado' && "bg-blue-500/20 text-blue-400",
                        )}
                      >
                        {obra.status?.replace('_', ' ') || 'ativo'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Receitas</p>
                        <p className="text-lg font-bold text-emerald-400">
                          {formatCurrency(receitas)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Despesas</p>
                        <p className="text-lg font-bold text-red-400">
                          {formatCurrency(despesas)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Saldo</p>
                        <p className={cn(
                          "text-lg font-bold",
                          saldo >= 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                          {formatCurrency(saldo)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Margem de Lucro</span>
                      <span className={cn(
                        "font-medium",
                        margem >= 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {margem.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden mt-2">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          margem >= 0 ? "bg-emerald-500" : "bg-red-500"
                        )}
                        style={{ width: `${Math.min(Math.abs(margem), 100)}%` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
