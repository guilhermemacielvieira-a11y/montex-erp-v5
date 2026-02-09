import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';

export default function RentabilidadeReport({ projetos, movimentacoes, orcamentos, filtros }) {
  const calcularRentabilidadeProjeto = (projeto) => {
    // Receitas do projeto
    const receitasRealizadas = movimentacoes
      .filter(m => m.projeto_id === projeto.id && m.tipo === 'entrada' && m.status === 'realizado')
      .reduce((acc, m) => acc + m.valor, 0);

    // Custos reais do projeto
    const custosReais = movimentacoes
      .filter(m => m.projeto_id === projeto.id && m.tipo === 'saida' && m.status === 'realizado')
      .reduce((acc, m) => acc + m.valor, 0);

    // Orçamento aprovado
    const orcamento = orcamentos.find(o => o.projeto_nome === projeto.nome && o.status === 'aprovado');
    const custoEstimado = orcamento?.custo_total || 0;
    const receitaContratada = projeto.valor_contrato || 0;

    // Cálculos
    const margemBruta = receitasRealizadas - custosReais;
    const margemPercentual = receitasRealizadas > 0 ? ((margemBruta / receitasRealizadas) * 100) : 0;
    const desvioOrcamento = custoEstimado > 0 ? ((custosReais - custoEstimado) / custoEstimado * 100) : 0;

    return {
      projeto: projeto.nome,
      receitaContratada,
      receitasRealizadas,
      custoEstimado,
      custosReais,
      margemBruta,
      margemPercentual,
      desvioOrcamento,
      status: projeto.status
    };
  };

  const projetosFiltrados = filtros.projetoId === 'todos' 
    ? projetos 
    : projetos.filter(p => p.id === filtros.projetoId);

  const dadosRentabilidade = projetosFiltrados.map(calcularRentabilidadeProjeto);

  const totais = dadosRentabilidade.reduce((acc, d) => ({
    receitaContratada: acc.receitaContratada + d.receitaContratada,
    receitasRealizadas: acc.receitasRealizadas + d.receitasRealizadas,
    custosReais: acc.custosReais + d.custosReais,
    margemBruta: acc.margemBruta + d.margemBruta
  }), { receitaContratada: 0, receitasRealizadas: 0, custosReais: 0, margemBruta: 0 });

  const margemTotalPercentual = totais.receitasRealizadas > 0 
    ? ((totais.margemBruta / totais.receitasRealizadas) * 100) 
    : 0;

  const exportarCSV = () => {
    const headers = ['Projeto', 'Receita Contratada', 'Receitas Realizadas', 'Custo Estimado', 'Custos Reais', 'Margem Bruta', 'Margem %', 'Desvio Orçamento %', 'Status'];
    const rows = dadosRentabilidade.map(d => [
      d.projeto,
      d.receitaContratada,
      d.receitasRealizadas,
      d.custoEstimado,
      d.custosReais,
      d.margemBruta,
      d.margemPercentual.toFixed(2),
      d.desvioOrcamento.toFixed(2),
      d.status
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rentabilidade_projetos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportarPDF = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    const elemento = document.getElementById('relatorio-rentabilidade');
    const canvas = await html2canvas(elemento, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`rentabilidade_projetos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div id="relatorio-rentabilidade">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Relatório de Rentabilidade por Projeto</CardTitle>
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
        </CardHeader>
        <CardContent>
          {/* Resumo Geral */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-xs text-blue-700 mb-1">Receitas Contratadas</p>
                <p className="text-lg font-bold text-blue-900">
                  R$ {totais.receitaContratada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4">
                <p className="text-xs text-emerald-700 mb-1">Receitas Realizadas</p>
                <p className="text-lg font-bold text-emerald-900">
                  R$ {totais.receitasRealizadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <p className="text-xs text-red-700 mb-1">Custos Reais</p>
                <p className="text-lg font-bold text-red-900">
                  R$ {totais.custosReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card className={`bg-${margemTotalPercentual >= 0 ? 'purple' : 'orange'}-50 border-${margemTotalPercentual >= 0 ? 'purple' : 'orange'}-200`}>
              <CardContent className="p-4">
                <p className={`text-xs text-${margemTotalPercentual >= 0 ? 'purple' : 'orange'}-700 mb-1`}>Margem Total</p>
                <p className={`text-lg font-bold text-${margemTotalPercentual >= 0 ? 'purple' : 'orange'}-900`}>
                  {margemTotalPercentual.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Projetos */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3">Projeto</th>
                  <th className="text-right p-3">Receita Contratada</th>
                  <th className="text-right p-3">Receitas Realizadas</th>
                  <th className="text-right p-3">Custos Reais</th>
                  <th className="text-right p-3">Margem Bruta</th>
                  <th className="text-right p-3">Margem %</th>
                  <th className="text-right p-3">Desvio Orçamento</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {dadosRentabilidade.map((d, idx) => (
                  <tr key={idx} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium">{d.projeto}</td>
                    <td className="p-3 text-right">
                      R$ {d.receitaContratada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right text-emerald-700 font-medium">
                      R$ {d.receitasRealizadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right text-red-700 font-medium">
                      R$ {d.custosReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`p-3 text-right font-bold ${d.margemBruta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      R$ {d.margemBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right">
                      <Badge className={d.margemPercentual >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                        {d.margemPercentual >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {d.margemPercentual.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Badge className={Math.abs(d.desvioOrcamento) <= 10 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                        {d.desvioOrcamento > 0 ? '+' : ''}{d.desvioOrcamento.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-800">
                        {d.status}
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