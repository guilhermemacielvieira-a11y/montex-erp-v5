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
import { AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const categoriasCusto = [
  { id: 'mao_obra', label: 'Mão de Obra', color: '#3b82f6' },
  { id: 'material', label: 'Material', color: '#10b981' },
  { id: 'terceiros', label: 'Terceiros', color: '#a855f7' },
  { id: 'equipamento', label: 'Equipamento', color: '#f59e0b' },
  { id: 'overhead', label: 'Overhead', color: '#64748b' },
];

export default function RelatorioComparativoDetalhado({ orcamento, projeto }) {
  const [filtroEtapa, setFiltroEtapa] = useState('ambas');

  const { data: detalhesOrcamento = [] } = useQuery({
    queryKey: ['orcamento-detalhado', orcamento?.id],
    queryFn: () => base44.entities.OrcamentoDetalhado.filter(
      { orcamento_id: orcamento?.id },
      '-created_date',
      500
    ),
    enabled: !!orcamento?.id
  });

  const { data: custos = [] } = useQuery({
    queryKey: ['custos-producao', projeto?.id],
    queryFn: () => base44.entities.CustoProducao.filter(
      { projeto_id: projeto?.id },
      '-data_lancamento',
      1000
    ),
    enabled: !!projeto?.id
  });

  // Filtrar por etapa
  const detalhesFiltrados = filtroEtapa === 'ambas'
    ? detalhesOrcamento
    : detalhesOrcamento.filter(d => d.etapa === filtroEtapa);

  const custosFiltrados = filtroEtapa === 'ambas'
    ? custos
    : custos.filter(c => c.etapa === filtroEtapa);

  // Agrupar por categoria
  const comparativoPorCategoria = categoriasCusto.map(cat => {
    const orcado = detalhesFiltrados
      .filter(d => d.categoria === cat.id)
      .reduce((acc, d) => acc + (d.valor_total_orcado || 0), 0);

    const realizado = custosFiltrados
      .filter(c => c.categoria === cat.id)
      .reduce((acc, c) => acc + (c.valor || 0), 0);

    const variacao = orcado > 0 ? ((realizado - orcado) / orcado) * 100 : 0;
    const diferenca = realizado - orcado;

    return {
      id: cat.id,
      categoria: cat.label,
      color: cat.color,
      orcado,
      realizado,
      variacao,
      diferenca,
      status: variacao > 10 ? 'acima' : variacao < -10 ? 'abaixo' : 'ok'
    };
  }).filter(c => c.orcado > 0 || c.realizado > 0);

  // Agrupar por item
  const comparativoPorItem = detalhesFiltrados.map(detalhe => {
    const custosItem = custosFiltrados.filter(c => c.item_producao_id === detalhe.item_id);
    const realizado = custosItem.reduce((acc, c) => acc + (c.valor || 0), 0);
    const variacao = detalhe.valor_total_orcado > 0
      ? ((realizado - detalhe.valor_total_orcado) / detalhe.valor_total_orcado) * 100
      : 0;

    return {
      id: detalhe.id,
      item: detalhe.item_nome || detalhe.descricao,
      categoria: detalhe.categoria,
      etapa: detalhe.etapa,
      orcado: detalhe.valor_total_orcado,
      realizado,
      variacao,
      diferenca: realizado - detalhe.valor_total_orcado,
      status: variacao > 10 ? 'acima' : variacao < -10 ? 'abaixo' : 'ok'
    };
  });

  const totalOrcado = detalhesFiltrados.reduce((acc, d) => acc + (d.valor_total_orcado || 0), 0);
  const totalRealizado = custosFiltrados.reduce((acc, c) => acc + (c.valor || 0), 0);
  const variacaoGeral = totalOrcado > 0 ? ((totalRealizado - totalOrcado) / totalOrcado) * 100 : 0;
  const diferencaGeral = totalRealizado - totalOrcado;

  const graficoCategoria = comparativoPorCategoria.map(cat => ({
    categoria: cat.categoria,
    Orçado: cat.orcado,
    Realizado: cat.realizado,
  }));

  const graficoEvolucao = [
    { nome: 'Total', Orçado: totalOrcado, Realizado: totalRealizado }
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600 mb-1">Total Orçado</p>
            <p className="text-2xl font-bold text-blue-900">
              R$ {totalOrcado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <p className="text-sm text-green-600 mb-1">Realizado até Agora</p>
            <p className="text-2xl font-bold text-green-900">
              R$ {totalRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className={variacaoGeral > 10 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}>
          <CardContent className="p-4">
            <p className={`text-sm mb-1 ${variacaoGeral > 10 ? 'text-red-600' : 'text-emerald-600'}`}>
              Variação Total
            </p>
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-bold ${variacaoGeral > 10 ? 'text-red-900' : 'text-emerald-900'}`}>
                {variacaoGeral > 0 ? '+' : ''}{variacaoGeral.toFixed(1)}%
              </p>
              {variacaoGeral > 10 && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-red-600" />
                  <span className="text-xs text-red-600">Acima</span>
                </div>
              )}
              {variacaoGeral < -10 && (
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs text-emerald-600">Abaixo</span>
                </div>
              )}
            </div>
            <p className={`text-xs mt-2 ${variacaoGeral > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              Diferença: R$ {diferencaGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="categoria" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categoria">Por Categoria</TabsTrigger>
          <TabsTrigger value="item">Por Item</TabsTrigger>
          <TabsTrigger value="grafico">Gráficos</TabsTrigger>
        </TabsList>

        {/* Por Categoria */}
        <TabsContent value="categoria" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Comparativo por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Orçado</TableHead>
                    <TableHead className="text-right">Realizado</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead className="text-right">Variação</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparativoPorCategoria.map(cat => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.categoria}</TableCell>
                      <TableCell className="text-right">
                        R$ {cat.orcado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        R$ {cat.realizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${cat.diferenca > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {cat.diferenca > 0 ? '+' : ''} R$ {cat.diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={
                          cat.status === 'acima' ? 'bg-red-100 text-red-700' :
                          cat.status === 'abaixo' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-blue-100 text-blue-700'
                        }>
                          {cat.variacao > 0 ? '+' : ''}{cat.variacao.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Item */}
        <TabsContent value="item" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Comparativo por Item</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {comparativoPorItem.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">Nenhum item para comparação</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Item</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Orçado</TableHead>
                      <TableHead className="text-right">Realizado</TableHead>
                      <TableHead className="text-right">Variação</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparativoPorItem
                      .sort((a, b) => Math.abs(b.variacao) - Math.abs(a.variacao))
                      .map(item => {
                        const cat = categoriasCusto.find(c => c.id === item.categoria);
                        return (
                          <TableRow key={item.id} className={item.status === 'acima' ? 'bg-red-50' : ''}>
                            <TableCell className="font-medium">{item.item}</TableCell>
                            <TableCell>
                              <Badge style={{ backgroundColor: cat?.color || '#gray', opacity: 0.2 }}>
                                {cat?.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              R$ {item.orcado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              R$ {item.realizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge className={
                                item.status === 'acima' ? 'bg-red-100 text-red-700' :
                                item.status === 'abaixo' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-blue-100 text-blue-700'
                              }>
                                {item.variacao > 0 ? '+' : ''}{item.variacao.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            {item.status === 'acima' && (
                              <TableCell className="text-center">
                                <AlertCircle className="h-4 w-4 text-red-600 mx-auto" />
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gráficos */}
        <TabsContent value="grafico" className="space-y-4">
          {graficoCategoria.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Orçado vs Realizado por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={graficoCategoria}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
                    <Legend />
                    <Bar dataKey="Orçado" fill="#3b82f6" />
                    <Bar dataKey="Realizado" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Variação Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Execução do Orçamento</span>
                    <span className="text-sm font-bold text-slate-900">
                      {totalOrcado > 0 ? ((totalRealizado / totalOrcado) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <Progress
                    value={totalOrcado > 0 ? Math.min((totalRealizado / totalOrcado) * 100, 100) : 0}
                    className="h-3"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alertas */}
      {comparativoPorCategoria.filter(c => c.status === 'acima').length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Categorias Acima do Orçado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparativoPorCategoria.filter(c => c.status === 'acima').map(cat => (
                <div key={cat.id} className="flex justify-between items-center p-2 bg-white rounded border border-red-200">
                  <span className="text-sm font-medium">{cat.categoria}</span>
                  <span className="text-sm font-bold text-red-600">
                    +R$ {cat.diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({cat.variacao.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}