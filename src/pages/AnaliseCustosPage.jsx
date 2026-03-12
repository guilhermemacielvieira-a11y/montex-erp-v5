// MONTEX ERP Premium - Módulo de Análise de Custos v3
// Reestruturado com centros de custo por RH, regra 50/50, separação Produção/Montagem/Alumínio

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { exportToExcel } from '@/utils/exportUtils';
import { useFinancialIntelligence } from '@/hooks/useFinancialIntelligence';
import {
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  Download,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Layers,
  Building2,
  Wrench,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Factory,
  HardHat,
  Percent
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Treemap,
  ScatterChart,
  Scatter,
  BarChart,
  Bar
} from 'recharts';

// Componente de Card de Custo
function CustoCard({ item, formatCurrency }) {
  const Icon = item.icon || Layers;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600/50 transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${item.cor}20` }}
        >
          <Icon className="h-5 w-5" style={{ color: item.cor }} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-white">{item.nome}</p>
          <p className="text-sm text-slate-400">{item.percentual.toFixed(1)}% do total</p>
        </div>
        {item.variacao_mom !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-sm",
            item.variacao_mom >= 0 ? "text-red-400" : "text-emerald-400"
          )}>
            {item.variacao_mom >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(item.variacao_mom).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-white">{formatCurrency(item.valor)}</p>
        <div className="h-2 flex-1 mx-4 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(item.percentual, 100)}%`, backgroundColor: item.cor }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// Componente de KPI
function KPICard({ title, value, subtitle, icon: Icon, color, trend, isNegativeTrendGood = false }) {
  const trendColor = isNegativeTrendGood
    ? (trend >= 0 ? "text-red-400" : "text-emerald-400")
    : (trend >= 0 ? "text-emerald-400" : "text-red-400");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
          color
        )}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50">
          {(isNegativeTrendGood ? trend < 0 : trend >= 0) ? (
            <TrendingDown className={cn("h-4 w-4", trendColor)} />
          ) : (
            <TrendingUp className={cn("h-4 w-4", trendColor)} />
          )}
          <span className={cn("text-sm font-medium", trendColor)}>
            {trend >= 0 ? '+' : ''}{typeof trend === 'number' ? trend.toFixed(1) : trend}%
          </span>
          <span className="text-xs text-slate-500">vs mês anterior</span>
        </div>
      )}
    </motion.div>
  );
}

// Custom Treemap Content
const TreemapContent = ({ x, y, width, height, name, value, cor, formatCurrency }) => {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: cor || '#64748b',
          stroke: '#0f172a',
          strokeWidth: 2,
          opacity: 0.85
        }}
      />
      {width > 50 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            fill="#fff"
            fontSize={12}
            fontWeight="bold"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={10}
          >
            {formatCurrency(value)}
          </text>
        </>
      )}
    </g>
  );
};

export default function AnaliseCustosPage() {
  const [periodo, setPeriodo] = useState('geral');
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'data', direction: 'desc' });

  const periodoMap = {
    'geral': 'geral',
    'semanal': 'semanal',
    'mes': 'mensal',
    'trimestre': 'trimestral',
    'semestre': 'geral',
    'ano': 'anual'
  };

  const {
    despesas,
    custoTotal,
    custoTotalGeral,
    custoPerKgGeral,
    custoProducaoPerKg,
    custoProducaoTotal,
    custoTotalRH,
    pesoTotalPecas,
    producaoMensal,
    producaoPorEtapa,
    evolucaoMensal,
    custosPorCategoria,
    custosPorCentro,
    producaoVsCusto,
    kpisGerais,
    formatCurrency,
    formatPercent,
    rhPorCentro
  } = useFinancialIntelligence({ periodo: periodoMap[periodo] });

  const ITEMS_PER_PAGE = 20;

  // Filter and sort despesas for detailed table
  const filteredDespesas = useMemo(() => {
    let filtered = (despesas || []).filter(d =>
      d.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === undefined || bVal === undefined) return 0;
      if (sortConfig.key === 'valor' || sortConfig.key === 'data') {
        const compareVal = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortConfig.direction === 'asc' ? compareVal : -compareVal;
      }
      const compareVal = String(aVal).localeCompare(String(bVal));
      return sortConfig.direction === 'asc' ? compareVal : -compareVal;
    });

    return filtered;
  }, [despesas, searchTerm, sortConfig]);

  const totalPages = Math.ceil(filteredDespesas.length / ITEMS_PER_PAGE);
  const paginatedDespesas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDespesas.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDespesas, currentPage]);

  // KPIs calculados
  const kpis = useMemo(() => {
    const custosPorCategoriaData = custosPorCategoria || [];

    let eficiencia = 0;
    if (producaoVsCusto && producaoVsCusto.length > 0) {
      const prodValues = producaoVsCusto.map(p => p.producaoKg || 0);
      const custoValues = producaoVsCusto.map(p => p.custoTotal || 0);
      const prodMean = prodValues.reduce((a, b) => a + b, 0) / prodValues.length;
      const custoMean = custoValues.reduce((a, b) => a + b, 0) / custoValues.length;
      const covariance = prodValues.reduce((sum, p, i) => sum + (p - prodMean) * (custoValues[i] - custoMean), 0) / prodValues.length;
      const prodStdDev = Math.sqrt(prodValues.reduce((sum, p) => sum + Math.pow(p - prodMean, 2), 0) / prodValues.length);
      const custoStdDev = Math.sqrt(custoValues.reduce((sum, c) => sum + Math.pow(c - custoMean, 2), 0) / custoValues.length);
      eficiencia = prodStdDev && custoStdDev ? Math.abs((covariance / (prodStdDev * custoStdDev)) * 100) : 0;
    }

    const maiorCusto = custosPorCategoriaData.length > 0
      ? custosPorCategoriaData.reduce((max, c) => c.valor > max.valor ? c : max, custosPorCategoriaData[0])
      : { nome: '-', valor: 0, percentual: 0, variacao_mom: 0 };

    const variacaoTotal = evolucaoMensal && evolucaoMensal.length >= 2
      ? ((evolucaoMensal[evolucaoMensal.length - 1]?.custo - evolucaoMensal[evolucaoMensal.length - 2]?.custo) / evolucaoMensal[evolucaoMensal.length - 2]?.custo * 100)
      : 0;

    return {
      totalCustos: custoTotal || custoTotalGeral || 0,
      custoPerKg: custoPerKgGeral || 0,
      custoProducaoPerKg: custoProducaoPerKg || 0,
      maiorCusto,
      variacaoTotal,
      eficiencia
    };
  }, [custosPorCategoria, custoTotal, custoTotalGeral, custoPerKgGeral, custoProducaoPerKg, producaoVsCusto, evolucaoMensal]);

  // Dados para gráfico de centros (Produção vs Montagem vs Alumínio)
  const centrosBarData = useMemo(() => {
    return (custosPorCentro || []).map(c => ({
      nome: c.nome.replace('(Fábrica)', '').replace('(Esquadrias)', '').trim(),
      despesas: c.gasto,
      rh: c.gastoRH,
      total: c.gastoTotal,
      funcionarios: c.qtdFuncionarios,
      cor: c.cor
    }));
  }, [custosPorCentro]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
              <PieChartIcon className="h-6 w-6 text-white" />
            </div>
            Análise de Custos
          </h1>
          <p className="text-slate-400 mt-1">Custos operacionais separados por centro (Produção, Montagem, Alumínio)</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={periodo} onValueChange={(value) => { setPeriodo(value); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="geral">Geral</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="semestre">Semestre</SelectItem>
              <SelectItem value="ano">Ano</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => {
              if (!despesas || despesas.length === 0) { toast.error('Nenhum dado para exportar'); return; }
              const columns = [
                { header: 'ID', key: 'id' },
                { header: 'Descrição', key: 'descricao' },
                { header: 'Categoria', key: 'categoriaNorm' },
                { header: 'Valor (R$)', key: 'valor' },
                { header: 'Data', key: 'data' },
                { header: 'Fornecedor', key: 'fornecedor' }
              ];
              const timestamp = new Date().toISOString().split('T')[0];
              exportToExcel(despesas, columns, `analise-custos-${timestamp}`);
              toast.success('Exportado!');
            }}
            className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs - 5 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Custo Total (Despesas)"
          value={formatCurrency(kpis.totalCustos)}
          subtitle={`+ RH: ${formatCurrency(custoTotalRH || 0)}`}
          icon={DollarSign}
          color="from-rose-500 to-pink-500"
          trend={kpis.variacaoTotal}
          isNegativeTrendGood={true}
        />
        <KPICard
          title="Custo Produção/KG"
          value={`R$ ${(kpis.custoProducaoPerKg || 0).toFixed(2)}`}
          subtitle="Fábrica (s/ alumínio/montagem)"
          icon={Factory}
          color="from-emerald-500 to-green-500"
          isNegativeTrendGood={true}
        />
        <KPICard
          title="Faturamento Produção"
          value={formatCurrency(kpisGerais?.faturamentoRealProducao || 0)}
          subtitle={`Meta: ${formatCurrency(kpisGerais?.faturamentoMetaMensal || 0)}/mês`}
          icon={Percent}
          color="from-cyan-500 to-blue-500"
        />
        <KPICard
          title="Maior Categoria"
          value={kpis.maiorCusto.nome}
          subtitle={`${kpis.maiorCusto.percentual.toFixed(1)}% do total`}
          icon={AlertTriangle}
          color="from-amber-500 to-orange-500"
          trend={kpis.maiorCusto.variacao_mom}
          isNegativeTrendGood={true}
        />
        <KPICard
          title="Funcionários"
          value={`${kpisGerais?.totalFuncionarios || 0}`}
          subtitle={`RH: ${formatCurrency(custoTotalRH || 0)}/mês`}
          icon={Users}
          color="from-violet-500 to-purple-500"
        />
      </div>

      {/* Banner Produção × Despesa */}
      <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 rounded-xl border border-blue-700/30 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-blue-400" />
            <span className="text-sm font-semibold text-blue-300">Base: Produção × R$ 12,50/kg</span>
            <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-700">
              Meta: 70 ton fábrica + 25 ton montagem = 95 ton/mês
            </Badge>
          </div>
          <div className="flex gap-6 text-sm">
            <span className="text-slate-300">
              Faturamento Produção: <span className="font-bold text-emerald-400">{formatCurrency(kpisGerais?.faturamentoRealProducao || 0)}</span>
            </span>
            <span className="text-slate-300">
              Despesas: <span className="font-bold text-red-400">{formatCurrency(kpisGerais?.despesas || 0)}</span>
            </span>
            <span className="text-slate-300">
              Margem: <span className={cn("font-bold", (kpisGerais?.margem || 0) >= 0 ? "text-emerald-400" : "text-red-400")}>{formatPercent(kpisGerais?.margem || 0)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 border border-slate-700/50">
          <TabsTrigger value="visao-geral" className="data-[state=active]:bg-rose-500">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="centros" className="data-[state=active]:bg-rose-500">
            <Building2 className="h-4 w-4 mr-2" />
            Centros de Custo
          </TabsTrigger>
          <TabsTrigger value="categorias" className="data-[state=active]:bg-rose-500">
            <Layers className="h-4 w-4 mr-2" />
            Por Categoria
          </TabsTrigger>
          <TabsTrigger value="producao" className="data-[state=active]:bg-rose-500">
            <BarChart3 className="h-4 w-4 mr-2" />
            Produção × Custo
          </TabsTrigger>
          <TabsTrigger value="detalhado" className="data-[state=active]:bg-rose-500">
            <FileText className="h-4 w-4 mr-2" />
            Detalhado
          </TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Pizza - Categorias */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-rose-400" />
                  Distribuição por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {custosPorCategoria && custosPorCategoria.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={custosPorCategoria}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="valor"
                        nameKey="nome"
                      >
                        {custosPorCategoria.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.cor} />
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
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <PieChartIcon className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                      <p>Nenhum dado de custo cadastrado</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Barras por Centro (Despesas + RH) */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-400" />
                  Custo por Centro (Despesas + RH)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {centrosBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={centrosBarData} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#64748b" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="nome" stroke="#64748b" width={95} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(value, name) => [formatCurrency(value), name === 'despesas' ? 'Despesas' : name === 'rh' ? 'RH (Salários+Encargos)' : name]}
                      />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Bar dataKey="despesas" name="Despesas" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="rh" name="RH" stackId="a" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    <p>Nenhum dado disponível</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Evolução Mensal */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                Evolução dos Custos (Receita Empresa vs Custo vs Custo/KG)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evolucaoMensal && evolucaoMensal.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={evolucaoMensal}>
                    <defs>
                      <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRecEmpresa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="mesLabel" stroke="#64748b" />
                    <YAxis yAxisId="left" stroke="#64748b" tickFormatter={(v) => `${(v/1000)}k`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(value, name) => [formatCurrency(value), name]}
                    />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    <Area yAxisId="left" type="monotone" dataKey="faturamentoProducao" name="Faturamento Produção" stroke="#10b981" fill="url(#colorRecEmpresa)" />
                    <Area yAxisId="left" type="monotone" dataKey="custo" name="Custo Total" stroke="#ef4444" fill="url(#colorCusto)" />
                    <Line yAxisId="right" type="monotone" dataKey="custoPerKg" name="Custo/KG" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                    <p>Nenhum dado de evolução mensal</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Centros de Custo */}
        <TabsContent value="centros" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(custosPorCentro || []).map((centro) => (
              <motion.div
                key={centro.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${centro.cor}20` }}>
                      {centro.id === 'CC-PROD' ? <Factory className="h-5 w-5" style={{ color: centro.cor }} /> :
                       centro.id === 'CC-MONT' ? <HardHat className="h-5 w-5" style={{ color: centro.cor }} /> :
                       <Building2 className="h-5 w-5" style={{ color: centro.cor }} />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">{centro.nome}</h3>
                      <p className="text-xs text-slate-500">{centro.responsavel}</p>
                    </div>
                  </div>
                  <Badge className={cn("text-xs",
                    centro.status === 'Excedido' ? "bg-red-500/20 text-red-400" :
                    centro.status === 'Atenção' ? "bg-amber-500/20 text-amber-400" :
                    "bg-emerald-500/20 text-emerald-400"
                  )}>{centro.status}</Badge>
                </div>

                <p className="text-xs text-slate-500 mb-3">{centro.descricao}</p>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Utilização</span>
                    <span className={cn("font-semibold",
                      centro.utilizacao > 100 ? "text-red-400" : centro.utilizacao > 90 ? "text-amber-400" : "text-emerald-400"
                    )}>{centro.utilizacao.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(centro.utilizacao, 100)}%`, backgroundColor: centro.cor }} />
                  </div>
                </div>

                {/* Valores */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <p className="text-slate-500">Despesas</p>
                    <p className="font-bold text-white">{formatCurrency(centro.gasto)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">RH ({centro.qtdFuncionarios} func.)</p>
                    <p className="font-bold text-violet-400">{formatCurrency(centro.gastoRH)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total</p>
                    <p className="font-bold text-rose-400">{formatCurrency(centro.gastoTotal)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Orçamento</p>
                    <p className="font-bold text-slate-300">{formatCurrency(centro.orcamento)}</p>
                  </div>
                </div>

                {/* Categorias vinculadas */}
                <div className="flex flex-wrap gap-1">
                  {(centro.categoriasVinculadas || []).slice(0, 4).map((cat, idx) => (
                    <Badge key={idx} variant="outline" className="text-[10px] text-slate-400 border-slate-700">{cat}</Badge>
                  ))}
                  {(centro.categoriasVinculadas || []).length > 4 && (
                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">+{centro.categoriasVinculadas.length - 4}</Badge>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Por Categoria */}
        <TabsContent value="categorias" className="space-y-4">
          {custosPorCategoria && custosPorCategoria.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {custosPorCategoria.map((item, index) => (
                <CustoCard key={index} item={item} formatCurrency={formatCurrency} />
              ))}
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-12 text-center">
              <Layers className="h-12 w-12 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">Nenhuma categoria de custo cadastrada</p>
            </div>
          )}
        </TabsContent>

        {/* Produção × Custo */}
        <TabsContent value="producao" className="space-y-6">
          {/* Info banner - custo produção exclui alumínio e montagem */}
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-3">
            <p className="text-sm text-emerald-300">
              <Factory className="h-4 w-4 inline mr-1" />
              Custo de Produção/KG: <span className="font-bold">R$ {(custoProducaoPerKg || 0).toFixed(2)}</span> — considera apenas CC-PROD (Fábrica). Alumínio e Montagem são centros independentes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  Produção vs Custo Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                {producaoVsCusto && producaoVsCusto.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="mes" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Scatter
                        name="Produção (KG)"
                        data={producaoVsCusto.map(p => ({ mes: p.mes, x: p.producaoKg, y: p.custoTotal }))}
                        fill="#10b981"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    <p>Nenhum dado disponível</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-amber-400" />
                  Custo/KG por Etapa (Produção)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {producaoPorEtapa && Object.keys(producaoPorEtapa).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Object.entries(producaoPorEtapa).map(([etapa, dados]) => ({
                        nome: etapa.charAt(0) + etapa.slice(1).toLowerCase(),
                        kg: dados.kg,
                        custoPerKg: custoProducaoPerKg || 0
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#64748b" />
                      <YAxis dataKey="nome" type="category" stroke="#64748b" width={115} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(value, name) => [name === 'kg' ? `${value.toFixed(0)} kg` : formatCurrency(value), name === 'kg' ? 'Produção' : 'Custo/KG']}
                      />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Bar dataKey="kg" fill="#f59e0b" name="Peso (kg)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    <p>Nenhum dado de etapa disponível</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Detalhado */}
        <TabsContent value="detalhado" className="space-y-4">
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <CardTitle className="text-white">Despesas Detalhadas ({filteredDespesas.length})</CardTitle>
                <div className="relative w-full lg:w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Buscar por descrição, categoria..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {despesas && despesas.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-slate-400 font-medium cursor-pointer hover:text-slate-300"
                            onClick={() => setSortConfig(prev => ({ key: 'data', direction: prev.key === 'data' && prev.direction === 'desc' ? 'asc' : 'desc' }))}>
                            Data
                          </th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium cursor-pointer hover:text-slate-300"
                            onClick={() => setSortConfig(prev => ({ key: 'descricao', direction: prev.key === 'descricao' && prev.direction === 'desc' ? 'asc' : 'desc' }))}>
                            Descrição
                          </th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium cursor-pointer hover:text-slate-300"
                            onClick={() => setSortConfig(prev => ({ key: 'categoriaNorm', direction: prev.key === 'categoriaNorm' && prev.direction === 'desc' ? 'asc' : 'desc' }))}>
                            Categoria
                          </th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">Fornecedor</th>
                          <th className="text-right py-3 px-4 text-slate-400 font-medium cursor-pointer hover:text-slate-300"
                            onClick={() => setSortConfig(prev => ({ key: 'valor', direction: prev.key === 'valor' && prev.direction === 'desc' ? 'asc' : 'desc' }))}>
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedDespesas.length > 0 ? paginatedDespesas.map((despesa) => (
                          <tr key={despesa.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className="py-3 px-4 text-slate-300">
                              {despesa.data ? new Date(despesa.data).toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td className="py-3 px-4 text-white font-medium">{despesa.descricao || '-'}</td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="text-slate-300 border-slate-600">
                                {despesa.categoriaNorm || despesa.categoria || '-'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-slate-400">{despesa.fornecedor || '-'}</td>
                            <td className="py-3 px-4 text-right font-semibold text-rose-400">
                              {formatCurrency(despesa.valor)}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-500">
                              <FileText className="h-10 w-10 mx-auto mb-2 text-slate-600" />
                              Nenhum resultado encontrado
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                      <div className="text-sm text-slate-400">
                        Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} de {filteredDespesas.length}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) pageNum = i + 1;
                          else if (currentPage <= 3) pageNum = i + 1;
                          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                          else pageNum = currentPage - 2 + i;
                          return (
                            <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)}
                              className={currentPage === pageNum ? "bg-rose-500 hover:bg-rose-600 border-rose-500" : "border-slate-700 text-slate-300 hover:bg-slate-800"}>
                              {pageNum}
                            </Button>
                          );
                        })}
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <FileText className="h-10 w-10 mx-auto mb-2 text-slate-600" />
                  <p>Nenhuma despesa detalhada cadastrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
