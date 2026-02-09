import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function GraficosAvancados({ movimentacoes = [] }) {
  // Dados por mês
  const dadosPorMes = React.useMemo(() => {
    const agrupado = movimentacoes.reduce((acc, m) => {
      const data = new Date(m.data_movimentacao);
      const mesAno = `${data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}`;
      
      if (!acc[mesAno]) {
        acc[mesAno] = { mes: mesAno, entradas: 0, saidas: 0, saldo: 0 };
      }
      
      if (m.status === 'realizado') {
        if (m.tipo === 'entrada') {
          acc[mesAno].entradas += m.valor;
        } else {
          acc[mesAno].saidas += m.valor;
        }
      }
      acc[mesAno].saldo = acc[mesAno].entradas - acc[mesAno].saidas;
      
      return acc;
    }, {});

    return Object.values(agrupado).sort((a, b) => {
      const dateA = new Date(a.mes.split('/')[0]);
      const dateB = new Date(b.mes.split('/')[0]);
      return dateA - dateB;
    });
  }, [movimentacoes]);

  // Dados por categoria
  const dadosPorCategoria = React.useMemo(() => {
    const agrupado = movimentacoes.reduce((acc, m) => {
      if (m.status === 'realizado') {
        if (!acc[m.categoria]) {
          acc[m.categoria] = { categoria: m.categoria.replace(/_/g, ' '), valor: 0, tipo: m.tipo };
        }
        acc[m.categoria].valor += m.valor;
      }
      return acc;
    }, {});

    return Object.values(agrupado).sort((a, b) => b.valor - a.valor);
  }, [movimentacoes]);

  // Dados por tipo
  const dadosPorTipo = React.useMemo(() => {
    const tipos = { entradas: 0, saidas: 0 };
    movimentacoes.forEach(m => {
      if (m.status === 'realizado') {
        if (m.tipo === 'entrada') {
          tipos.entradas += m.valor;
        } else {
          tipos.saidas += m.valor;
        }
      }
    });
    return [
      { name: 'Receitas', value: tipos.entradas, fill: '#10b981' },
      { name: 'Despesas', value: tipos.saidas, fill: '#ef4444' },
    ];
  }, [movimentacoes]);

  // Dados acumulados
  const dadosAcumulados = React.useMemo(() => {
    let saldoAcumulado = 0;
    return dadosPorMes.map(mes => {
      saldoAcumulado += mes.saldo;
      return {
        ...mes,
        saldoAcumulado,
      };
    });
  }, [dadosPorMes]);

  return (
    <Tabs defaultValue="tendencia" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="tendencia">Tendência</TabsTrigger>
        <TabsTrigger value="categoria">Por Categoria</TabsTrigger>
        <TabsTrigger value="pie">Distribuição</TabsTrigger>
        <TabsTrigger value="acumulado">Saldo Acumulado</TabsTrigger>
      </TabsList>

      {/* Gráfico de Tendência */}
      <TabsContent value="tendencia" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tendência de Receitas e Despesas</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Evolução mensal do fluxo de caixa</p>
          </CardHeader>
          <CardContent>
            {dadosPorMes.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-slate-500">
                Nenhum dado disponível
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dadosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                    labelFormatter={(label) => `Período: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="entradas" fill="#10b981" name="Receitas" />
                  <Bar dataKey="saidas" fill="#ef4444" name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Gráfico por Categoria */}
      <TabsContent value="categoria" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Despesas/Receitas por Categoria</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Maiores categorias de movimentação</p>
          </CardHeader>
          <CardContent>
            {dadosPorCategoria.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-slate-500">
                Nenhum dado disponível
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={dadosPorCategoria}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="categoria" type="category" width={190} />
                  <Tooltip
                    formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                  />
                  <Bar
                    dataKey="valor"
                    fill="#3b82f6"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Gráfico Pizza */}
      <TabsContent value="pie" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribuição Receitas vs Despesas</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Proporção do fluxo total</p>
          </CardHeader>
          <CardContent>
            {dadosPorTipo.filter(d => d.value > 0).length === 0 ? (
              <div className="h-80 flex items-center justify-center text-slate-500">
                Nenhum dado disponível
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dadosPorTipo}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => (
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      )}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dadosPorTipo.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-6 grid grid-cols-2 gap-6 w-full max-w-xs">
                  {dadosPorTipo.map((item, index) => (
                    <div key={index} className="text-center">
                      <p className="text-2xl font-bold" style={{ color: item.fill }}>
                        R$ {(item.value / 1000).toFixed(1)}k
                      </p>
                      <p className="text-xs text-slate-600 mt-1">{item.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Saldo Acumulado */}
      <TabsContent value="acumulado" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Saldo Acumulado por Período</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Evolução do saldo de caixa</p>
          </CardHeader>
          <CardContent>
            {dadosAcumulados.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-slate-500">
                Nenhum dado disponível
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={dadosAcumulados}>
                  <defs>
                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="saldoAcumulado"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorSaldo)"
                    name="Saldo Acumulado"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}