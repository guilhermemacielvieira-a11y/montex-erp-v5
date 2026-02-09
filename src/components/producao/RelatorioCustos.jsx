import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const CORES_CATEGORIA = {
  mao_obra: '#3b82f6',
  material: '#10b981',
  terceiros: '#a855f7',
  equipamento: '#f59e0b',
  overhead: '#64748b',
};

export default function RelatorioCustos({ projetoId, itensFabricacao = [], itensMontagem = [] }) {
  const [filtroEtapa, setFiltroEtapa] = useState('ambas');

  const { data: custos = [] } = useQuery({
    queryKey: ['custos-relatorio', projetoId],
    queryFn: () => base44.entities.CustoProducao.filter(
      { projeto_id: projetoId },
      '-data_lancamento',
      1000
    ),
    enabled: !!projetoId
  });

  const { data: orcamentos = [] } = useQuery({
    queryKey: ['orcamentos-projeto', projetoId],
    queryFn: () => base44.entities.Orcamento.filter(
      { projeto_id: projetoId },
      '-created_date',
      50
    ),
    enabled: !!projetoId
  });

  // Filtrar custos por etapa
  const custosFiltrados = filtroEtapa === 'ambas'
    ? custos
    : custos.filter(c => c.etapa === filtroEtapa);

  // Agrupar custos por categoria
  const custosPorCategoria = [
    { id: 'mao_obra', label: 'Mão de Obra' },
    { id: 'material', label: 'Material' },
    { id: 'terceiros', label: 'Terceiros' },
    { id: 'equipamento', label: 'Equipamento' },
    { id: 'overhead', label: 'Overhead' },
  ].map(cat => ({
    ...cat,
    valor: custosFiltrados
      .filter(c => c.categoria === cat.id)
      .reduce((acc, c) => acc + (c.valor || 0), 0),
    count: custosFiltrados.filter(c => c.categoria === cat.id).length
  }));

  const custoTotal = custosPorCategoria.reduce((acc, c) => acc + c.valor, 0);

  // Dados para gráficos
  const dadosPizza = custosPorCategoria.filter(c => c.valor > 0);
  
  // Custos por item
  const custosItem = itensFabricacao.concat(itensMontagem).map(item => {
    const totalItem = custosFiltrados
      .filter(c => c.item_producao_id === item.id)
      .reduce((acc, c) => acc + (c.valor || 0), 0);
    return {
      id: item.id,
      nome: item.nome,
      etapa: item.etapa,
      total: totalItem,
      quantidade: item.quantidade,
      custoPorUnidade: item.quantidade > 0 ? totalItem / item.quantidade : 0
    };
  }).filter(i => i.total > 0);

  // Orcamento vs Real
  const orcamentoTotal = orcamentos.reduce((acc, o) => acc + (o.custo_total || 0), 0);
  const variacao = orcamentoTotal > 0 ? ((custoTotal - orcamentoTotal) / orcamentoTotal) * 100 : 0;
  const variacaoAtrasado = variacao > 10;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600 mb-1">Custo Realizado</p>
            <p className="text-2xl font-bold text-blue-900">R$ {custoTotal.toFixed(0)}</p>
            <p className="text-xs text-blue-600 mt-2">{custosFiltrados.length} lançamentos</p>
          </CardContent>
        </Card>

        <Card className={orcamentoTotal > 0 ? 'border-green-200 bg-green-50' : ''}>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600 mb-1">Orçado</p>
            <p className="text-2xl font-bold text-slate-900">
              R$ {orcamentoTotal.toFixed(0)}
            </p>
            <p className="text-xs text-slate-600 mt-2">{orcamentos.length} orçamento(s)</p>
          </CardContent>
        </Card>

        <Card className={variacaoAtrasado ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <CardContent className="p-4">
            <p className={`text-sm mb-1 ${variacaoAtrasado ? 'text-red-600' : 'text-green-600'}`}>
              Variação
            </p>
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-bold ${variacaoAtrasado ? 'text-red-900' : 'text-green-900'}`}>
                {variacao > 0 ? '+' : ''}{variacao.toFixed(1)}%
              </p>
              {variacaoAtrasado && <AlertCircle className="h-4 w-4 text-red-600" />}
            </div>
            <p className={`text-xs mt-2 ${variacaoAtrasado ? 'text-red-600' : 'text-green-600'}`}>
              {variacaoAtrasado ? 'Acima do orçado' : 'Dentro do orçado'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="categoria" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categoria">Por Categoria</TabsTrigger>
          <TabsTrigger value="item">Por Item</TabsTrigger>
          <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
        </TabsList>

        {/* Por Categoria */}
        <TabsContent value="categoria" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Custos por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dadosPizza}
                      dataKey="valor"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                    >
                      {dadosPizza.map((entry) => (
                        <Cell key={entry.id} fill={CORES_CATEGORIA[entry.id]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `R$ ${value.toFixed(0)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Detalhamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {custosPorCategoria.map((cat) => (
                    <div key={cat.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-700">{cat.label}</span>
                        <span className="text-sm font-bold text-slate-900">
                          R$ {cat.valor.toFixed(0)}
                        </span>
                      </div>
                      <Progress
                        value={custoTotal > 0 ? (cat.valor / custoTotal) * 100 : 0}
                        className="h-2"
                      />
                      <p className="text-xs text-slate-500 mt-1">{cat.count} item(ns)</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Por Item */}
        <TabsContent value="item">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Custo Unitário por Item
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {custosItem.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">Nenhum custo registrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Custo/Un</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {custosItem
                      .sort((a, b) => b.total - a.total)
                      .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm font-medium">
                            {item.nome}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.etapa === 'fabricacao' ? '🔧 Fab' : '🏗️ Montagem'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            R$ {item.total.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">{item.quantidade}</TableCell>
                          <TableCell className="text-right">
                            R$ {item.custoPorUnidade.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparativo */}
        <TabsContent value="comparativo">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Custo Real vs Orçado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orcamentoTotal > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    {
                      nome: 'Projeto',
                      Orçado: orcamentoTotal,
                      Realizado: custoTotal,
                    }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip formatter={(value) => `R$ ${value.toFixed(0)}`} />
                    <Legend />
                    <Bar dataKey="Orçado" fill="#10b981" />
                    <Bar dataKey="Realizado" fill={variacaoAtrasado ? '#ef4444' : '#3b82f6'} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">Nenhum orçamento para comparação</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}