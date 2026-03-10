// MONTEX ERP Premium - Módulo de Análise de Custos
// Análise detalhada de custos por categoria, centro de custo e período

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
  ChevronRight
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
function CustoCard({ item, tipo = 'categoria', formatCurrency }) {
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
            {trend >= 0 ? '+' : ''}{trend}%
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

  // Map UI values to hook values
  const periodoMap = {
    'geral': 'geral',
    'semanal': 'semanal',
    'mes': 'mensal',
    'trimestre': 'trimestral',
    'semestre': 'geral',
    'ano': 'anual'
  };

  // Get data from hook
  const {
    despesas,
    custoTotal,
    custoTotalGeral,
    custoPerKgGeral,
    pesoTotalPecas,
    producaoMensal,
    producaoPorEtapa,
    evolucaoMensal,
    custosPorCategoria,
    custosPorCentro,
    producaoVsCusto,
    formatCurrency,
    formatPercent
  } = useFinancialIntelligence({ periodo: periodoMap[periodo] });

  const ITEMS_PER_PAGE = 20;

  // Filter and sort despesas for detailed table
  const filteredDespesas = useMemo(() => {
    let filtered = (despesas || []).filter(d =>
      d.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort
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
    const custosPorCentroData = custosPorCentro || [];

    // Calcular correlação prod x custo (eficiência)
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
      maiorCusto,
      variacaoTotal,
      eficiencia: eficiencia
    };
  }, [custosPorCategoria, custosPorCentro, custoTotal, custoTotalGeral, custoPerKgGeral, producaoVsCusto, evolucaoMensal]);

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
          <p className="text-slate-400 mt-1">Visão detalhada dos custos operacionais</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={periodo} onValueChange={(value) => {
            setPeriodo(value);
            setCurrentPage(1);
          }}>
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
            onClick={() => toast.info('Painel de filtros em desenvolvimento')}
            variant="outline"
            className="border-slate-700 text-slate-300">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>

          <Button
            onClick={() => {
              if (!despesas || despesas.length === 0) {
                toast.error('Nenhum dado para exportar');
                return;
              }
              const columns = [
                { header: 'ID', key: 'id' },
                { header: 'Descrição', key: 'descricao' },
                { header: 'Categoria', key: 'categoria' },
                { header: 'Valor (R$)', key: 'valor' },
                { header: 'Data', key: 'data' },
                { header: 'Fornecedor', key: 'fornecedor' }
              ];
              const timestamp = new Date().toISOString().split('T')[0];
              exportToExcel(despesas, columns, `analise-custos-${timestamp}`);
              toast.success('Análise de custos exportada para Excel com sucesso!');
            }}
            className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Custo Total"
          value={formatCurrency(kpis.totalCustos)}
          subtitle={`Variação: ${kpis.variacaoTotal.toFixed(1)}%`}
          icon={DollarSign}
          color="from-rose-500 to-pink-500"
          trend={kpis.variacaoTotal}
          isNegativeTrendGood={true}
        />
        <KPICard
          title="Custo/KG"
          value={formatCurrency(kpis.custoPerKg)}
          subtitle={`Por ${pesoTotalPecas || 'kg'}`}
          icon={Wrench}
          color="from-emerald-500 to-green-500"
          isNegativeTrendGood={true}
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
          title="Eficiência"
          value={`${kpis.eficiencia.toFixed(1)}%`}
          subtitle="Correlação Prod×Custo"
          icon={Layers}
          color="from-blue-500 to-cyan-500"
        />
      </div>

      {/* Tabs de Conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 border border-slate-700/50">
          <TabsTrigger value="visao-geral" className="data-[state=active]:bg-rose-500">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Visão Geral
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
            {/* Gráfico de Pizza */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-rose-400" />
                  Distribuição de Custos
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
                      <p className="text-xs mt-1">Os dados serão preenchidos automaticamente</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Treemap */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  Mapa de Custos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {custosPorCategoria && custosPorCategoria.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <Treemap
                      data={custosPorCategoria.map(c => ({ ...c, value: c.valor }))}
                      dataKey="value"
                      aspectRatio={4 / 3}
                      content={
                        <TreemapContent formatCurrency={formatCurrency} />
                      }
                    >
                      {custosPorCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Treemap>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                      <p>Nenhum dado disponível</p>
                    </div>
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
                Evolução dos Custos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evolucaoMensal && evolucaoMensal.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={evolucaoMensal}>
                    <defs>
                      <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCustoKg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="mesLabel" stroke="#64748b" />
                    <YAxis yAxisId="left" stroke="#64748b" tickFormatter={(v) => `${(v/1000)}k`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    <Area yAxisId="left" type="monotone" dataKey="custo" name="Custo Total" stroke="#10b981" fill="url(#colorCusto)" />
                    <Line yAxisId="right" type="monotone" dataKey="custoPerKg" name="Custo/KG" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                    <p>Nenhum dado de evolução mensal</p>
                    <p className="text-xs mt-1">Os dados serão preenchidos quando houver lançamentos</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Categoria */}
        <TabsContent value="categorias" className="space-y-4">
          {custosPorCategoria && custosPorCategoria.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {custosPorCategoria.map((item, index) => (
                <CustoCard key={index} item={item} tipo="categoria" formatCurrency={formatCurrency} />
              ))}
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-12 text-center">
              <Layers className="h-12 w-12 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">Nenhuma categoria de custo cadastrada</p>
              <p className="text-xs text-slate-500 mt-1">Os dados serão preenchidos com lançamentos reais</p>
            </div>
          )}
        </TabsContent>

        {/* Produção × Custo */}
        <TabsContent value="producao" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ScatterChart - Produção vs Custo */}
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
                        cursor={{ strokeDasharray: '3 3' }}
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
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                      <p>Nenhum dado disponível</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BarChart - Custo/KG por Etapa */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-amber-400" />
                  Custo/KG por Etapa
                </CardTitle>
              </CardHeader>
              <CardContent>
                {producaoPorEtapa && producaoPorEtapa.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={producaoPorEtapa}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#64748b" />
                      <YAxis dataKey="nome" type="category" stroke="#64748b" width={115} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Bar dataKey="custoPerKg" fill="#f59e0b" name="Custo/KG" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <Layers className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                      <p>Nenhum dado de etapa disponível</p>
                    </div>
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
                <CardTitle className="text-white">Despesas Detalhadas</CardTitle>
                <div className="relative w-full lg:w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Buscar por descrição, categoria..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
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
                          <th
                            className="text-left py-3 px-4 text-slate-400 font-medium cursor-pointer hover:text-slate-300"
                            onClick={() => setSortConfig(prev => ({
                              key: 'data',
                              direction: prev.key === 'data' && prev.direction === 'desc' ? 'asc' : 'desc'
                            }))}
                          >
                            Data
                          </th>
                          <th
                            className="text-left py-3 px-4 text-slate-400 font-medium cursor-pointer hover:text-slate-300"
                            onClick={() => setSortConfig(prev => ({
                              key: 'descricao',
                              direction: prev.key === 'descricao' && prev.direction === 'desc' ? 'asc' : 'desc'
                            }))}
                          >
                            Descrição
                          </th>
                          <th
                            className="text-left py-3 px-4 text-slate-400 font-medium cursor-pointer hover:text-slate-300"
                            onClick={() => setSortConfig(prev => ({
                              key: 'categoria',
                              direction: prev.key === 'categoria' && prev.direction === 'desc' ? 'asc' : 'desc'
                            }))}
                          >
                            Categoria
                          </th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">Fornecedor</th>
                          <th
                            className="text-right py-3 px-4 text-slate-400 font-medium cursor-pointer hover:text-slate-300"
                            onClick={() => setSortConfig(prev => ({
                              key: 'valor',
                              direction: prev.key === 'valor' && prev.direction === 'desc' ? 'asc' : 'desc'
                            }))}
                          >
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedDespesas.length > 0 ? (
                          paginatedDespesas.map((despesa) => (
                            <tr key={despesa.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                              <td className="py-3 px-4 text-slate-300">
                                {despesa.data ? new Date(despesa.data).toLocaleDateString('pt-BR') : '-'}
                              </td>
                              <td className="py-3 px-4 text-white font-medium">{despesa.descricao || '-'}</td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="text-slate-300 border-slate-600">
                                  {despesa.categoria || despesa.categoriaNorm || '-'}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-slate-400">{despesa.fornecedor || '-'}</td>
                              <td className="py-3 px-4 text-right font-semibold text-rose-400">
                                {formatCurrency(despesa.valor)}
                              </td>
                            </tr>
                          ))
                        ) : (
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

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                      <div className="text-sm text-slate-400">
                        Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} de {filteredDespesas.length}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else {
                            if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className={currentPage === pageNum
                                ? "bg-rose-500 hover:bg-rose-600 border-rose-500"
                                : "border-slate-700 text-slate-300 hover:bg-slate-800"
                              }
                            >
                              {pageNum}
                            </Button>
                          );
                        })}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
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
