import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FluxoCaixaReport({ movimentacoes, filtros }) {
  // Agrupar por mês
  const dadosPorMes = movimentacoes.reduce((acc, m) => {
    const data = new Date(m.data_movimentacao);
    const mesAno = `${data.getMonth() + 1}/${data.getFullYear()}`;
    
    if (!acc[mesAno]) {
      acc[mesAno] = { mes: mesAno, entradas: 0, saidas: 0 };
    }
    
    if (m.status === 'realizado') {
      if (m.tipo === 'entrada') {
        acc[mesAno].entradas += m.valor;
      } else {
        acc[mesAno].saidas += m.valor;
      }
    }
    
    return acc;
  }, {});

  const dadosGrafico = Object.values(dadosPorMes).sort((a, b) => {
    const [mesA, anoA] = a.mes.split('/');
    const [mesB, anoB] = b.mes.split('/');
    return new Date(anoA, mesA - 1) - new Date(anoB, mesB - 1);
  });

  const exportarCSV = () => {
    const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Projeto', 'Status'];
    const rows = movimentacoes.map(m => [
      m.data_movimentacao,
      m.tipo,
      m.categoria,
      m.descricao || '',
      m.valor,
      m.projeto_nome || '',
      m.status
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fluxo_caixa_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportarPDF = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    const elemento = document.getElementById('relatorio-fluxo');
    const canvas = await html2canvas(elemento, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`fluxo_caixa_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div id="relatorio-fluxo">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Relatório de Fluxo de Caixa</CardTitle>
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
            Período: {new Date(filtros.dataInicio).toLocaleDateString('pt-BR')} até {new Date(filtros.dataFim).toLocaleDateString('pt-BR')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip
                  formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Bar dataKey="entradas" fill="#10b981" name="Entradas" />
                <Bar dataKey="saidas" fill="#ef4444" name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Categoria</th>
                  <th className="text-left p-3">Descrição</th>
                  <th className="text-left p-3">Projeto</th>
                  <th className="text-right p-3">Valor</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.slice(0, 50).map((m) => (
                  <tr key={m.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">{new Date(m.data_movimentacao).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        m.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="p-3">{m.categoria?.replace(/_/g, ' ')}</td>
                    <td className="p-3">{m.descricao || '-'}</td>
                    <td className="p-3">{m.projeto_nome || '-'}</td>
                    <td className={`p-3 text-right font-medium ${m.tipo === 'entrada' ? 'text-emerald-700' : 'text-red-700'}`}>
                      R$ {m.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        m.status === 'realizado' ? 'bg-blue-100 text-blue-800' : 
                        m.status === 'previsto' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}