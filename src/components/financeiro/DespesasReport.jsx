import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function DespesasReport({ movimentacoes, filtros }) {
  const despesas = movimentacoes.filter(m => m.tipo === 'saida' && m.status === 'realizado');

  const despesasPorCategoria = despesas.reduce((acc, m) => {
    const categoria = m.categoria || 'outros';
    if (!acc[categoria]) {
      acc[categoria] = { categoria, valor: 0, quantidade: 0 };
    }
    acc[categoria].valor += m.valor;
    acc[categoria].quantidade += 1;
    return acc;
  }, {});

  const dadosGrafico = Object.values(despesasPorCategoria)
    .sort((a, b) => b.valor - a.valor)
    .map(d => ({
      name: d.categoria.replace(/_/g, ' ').toUpperCase(),
      value: d.valor
    }));

  const totalDespesas = despesas.reduce((acc, m) => acc + m.valor, 0);

  const exportarCSV = () => {
    const headers = ['Categoria', 'Quantidade', 'Valor Total', 'Percentual'];
    const rows = Object.values(despesasPorCategoria).map(d => [
      d.categoria,
      d.quantidade,
      d.valor,
      ((d.valor / totalDespesas) * 100).toFixed(2) + '%'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `despesas_categorias_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportarPDF = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    const elemento = document.getElementById('relatorio-despesas');
    const canvas = await html2canvas(elemento, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`despesas_categorias_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div id="relatorio-despesas">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Relatório de Despesas por Categoria</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportarCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportarPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Total de Despesas: R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Gráfico de Pizza */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosGrafico}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${((entry.value / totalDespesas) * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dadosGrafico.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela Resumida */}
            <div className="space-y-3">
              {Object.values(despesasPorCategoria)
                .sort((a, b) => b.valor - a.valor)
                .map((d, idx) => {
                  const percentual = (d.valor / totalDespesas) * 100;
                  return (
                    <div key={idx} className="bg-slate-50 rounded-lg p-4 border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900">
                          {d.categoria.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="text-sm text-slate-600">
                          {d.quantidade} {d.quantidade === 1 ? 'lançamento' : 'lançamentos'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${percentual}%`,
                                backgroundColor: COLORS[idx % COLORS.length]
                              }}
                            />
                          </div>
                        </div>
                        <span className="ml-3 font-bold text-slate-900">
                          R$ {d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Tabela Detalhada */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3">Categoria</th>
                  <th className="text-center p-3">Quantidade</th>
                  <th className="text-right p-3">Valor Total</th>
                  <th className="text-right p-3">Valor Médio</th>
                  <th className="text-right p-3">% do Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(despesasPorCategoria)
                  .sort((a, b) => b.valor - a.valor)
                  .map((d, idx) => {
                    const percentual = (d.valor / totalDespesas) * 100;
                    const valorMedio = d.valor / d.quantidade;
                    return (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">
                          {d.categoria.replace(/_/g, ' ').toUpperCase()}
                        </td>
                        <td className="p-3 text-center">{d.quantidade}</td>
                        <td className="p-3 text-right font-semibold text-red-700">
                          R$ {d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right">
                          R$ {valorMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {percentual.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}