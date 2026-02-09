// MONTEX ERP Premium - Módulo de Análise de Custos
// Análise detalhada de custos por categoria, centro de custo e período

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { exportToExcel } from '@/utils/exportUtils';
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
  Users,
  Truck,
  Wrench,
  FileText
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
  Treemap
} from 'recharts';

// Dados - Custos por Categoria (será preenchido com dados reais do Supabase)
const custosPorCategoria = [];

// Dados - Custos por Centro de Custo (será preenchido com dados reais do Supabase)
const custosPorCentro = [];

// Dados - Evolução Mensal (será preenchido com dados reais do Supabase)
const evolucaoMensal = [];

// Dados - Despesas Detalhadas (será preenchido com dados reais do Supabase)
const despesasDetalhadas = [];

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatPercent = (value) => `${value.toFixed(1)}%`;

// Componente de Card de Custo
function CustoCard({ item, tipo = 'categoria' }) {
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
          <p className="text-sm text-slate-400">{item.percentual}% do total</p>
        </div>
        {item.variacao !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-sm",
            item.variacao >= 0 ? "text-red-400" : "text-emerald-400"
          )}>
            {item.variacao >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(item.variacao)}%
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-white">{formatCurrency(item.valor)}</p>
        <div className="h-2 flex-1 mx-4 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${item.percentual}%`, backgroundColor: item.cor }}
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
const TreemapContent = ({ root, depth, x, y, width, height, index, colors, name, value }) => {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: custosPorCategoria[index]?.cor || '#64748b',
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
  const [periodo, setPeriodo] = useState('mes');
  const [activeTab, setActiveTab] = useState('visao-geral');

  // KPIs calculados
  const kpis = useMemo(() => {
    const totalCustos = custosPorCategoria.reduce((sum, c) => sum + c.valor, 0);
    const custoMedio = custosPorCategoria.length > 0 ? totalCustos / custosPorCategoria.length : 0;
    const maiorCusto = custosPorCategoria.length > 0
      ? custosPorCategoria.reduce((max, c) => c.valor > max.valor ? c : max, custosPorCategoria[0])
      : { nome: '-', valor: 0, variacao: 0 };

    return {
      totalCustos,
      custoMedio,
      maiorCusto,
      variacaoTotal: 0,
      custoProducao: custosPorCentro.find(c => c.nome === 'Produção')?.valor || 0
    };
  }, []);

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
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
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
              if (despesasDetalhadas.length === 0) {
                toast.error('Nenhum dado para exportar');
                return;
              }
              const columns = [
                { header: 'ID', key: 'id' },
                { header: 'Descrição', key: 'descricao' },
                { header: 'Categoria', key: 'categoria' },
                { header: 'Centro de Custo', key: 'centroCusto' },
                { header: 'Valor (R$)', key: 'valor' },
                { header: 'Data', key: 'data' },
                { header: 'Fornecedor', key: 'fornecedor' }
              ];
              const timestamp = new Date().toISOString().split('T')[0];
              exportToExcel(despesasDetalhadas, columns, `analise-custos-${timestamp}`);
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
          subtitle="Fevereiro 2026"
          icon={DollarSign}
          color="from-rose-500 to-pink-500"
          trend={kpis.variacaoTotal}
          isNegativeTrendGood={true}
        />
        <KPICard
          title="Custo Produção"
          value={formatCurrency(kpis.custoProducao)}
          subtitle="52% do total"
          icon={Wrench}
          color="from-emerald-500 to-green-500"
          trend={-2.1}
          isNegativeTrendGood={true}
        />
        <KPICard
          title="Maior Custo"
          value={kpis.maiorCusto.nome}
          subtitle={formatCurrency(kpis.maiorCusto.valor)}
          icon={AlertTriangle}
          color="from-amber-500 to-orange-500"
          trend={kpis.maiorCusto.variacao}
          isNegativeTrendGood={true}
        />
        <KPICard
          title="Custo/Peça Média"
          value="-"
          subtitle="Sem dados"
          icon={Layers}
          color="from-blue-500 to-cyan-500"
          isNegativeTrendGood={true}
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
          <TabsTrigger value="centros" className="data-[state=active]:bg-rose-500">
            <Building2 className="h-4 w-4 mr-2" />
            Centros de Custo
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
                {custosPorCategoria.length > 0 ? (
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
                {custosPorCategoria.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <Treemap
                      data={custosPorCategoria.map(c => ({ name: c.nome, value: c.valor }))}
                      dataKey="value"
                      aspectRatio={4 / 3}
                      content={<TreemapContent />}
                    />
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
              {evolucaoMensal.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={evolucaoMensal}>
                    <defs>
                      <linearGradient id="colorMP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMO" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="mes" stroke="#64748b" />
                    <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    <Area type="monotone" dataKey="materiaprima" name="Matéria Prima" stroke="#10b981" fill="url(#colorMP)" />
                    <Area type="monotone" dataKey="maodeobra" name="Mão de Obra" stroke="#3b82f6" fill="url(#colorMO)" />
                    <Line type="monotone" dataKey="total" name="Total" stroke="#f59e0b" strokeWidth={2} dot={false} />
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
          {custosPorCategoria.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {custosPorCategoria.map((item, index) => (
                <CustoCard key={index} item={item} tipo="categoria" />
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

        {/* Centros de Custo */}
        <TabsContent value="centros" className="space-y-4">
          {custosPorCentro.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {custosPorCentro.map((item, index) => (
                <CustoCard key={index} item={item} tipo="centro" />
              ))}
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">Nenhum centro de custo cadastrado</p>
              <p className="text-xs text-slate-500 mt-1">Os dados serão preenchidos com lançamentos reais</p>
            </div>
          )}
        </TabsContent>

        {/* Detalhado */}
        <TabsContent value="detalhado">
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Despesas Detalhadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Data</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Descrição</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Categoria</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Centro Custo</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Fornecedor</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {despesasDetalhadas.length > 0 ? (
                      despesasDetalhadas.map((despesa) => (
                        <tr key={despesa.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="py-3 px-4 text-slate-300">{new Date(despesa.data).toLocaleDateString('pt-BR')}</td>
                          <td className="py-3 px-4 text-white font-medium">{despesa.descricao}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-slate-300 border-slate-600">
                              {despesa.categoria}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{despesa.centroCusto}</td>
                          <td className="py-3 px-4 text-slate-400">{despesa.fornecedor}</td>
                          <td className="py-3 px-4 text-right font-semibold text-rose-400">{formatCurrency(despesa.valor)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          <FileText className="h-10 w-10 mx-auto mb-2 text-slate-600" />
                          Nenhuma despesa detalhada cadastrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
