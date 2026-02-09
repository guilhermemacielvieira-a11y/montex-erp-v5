import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export default function ExportadorRelatoriosIA({ parametros, abaSelecionada }) {
  const [abrindoDialog, setAbrindoDialog] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [formatos, setFormatos] = useState({
    pdf: true,
    excel: false,
    csv: false
  });
  const [opcoes, setOpcoes] = useState({
    incluirGraficos: true,
    incluirSumario: true,
    incluirParametros: true
  });

  const gerarNomeArquivo = (formato) => {
    const data = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const tipo = abaSelecionada === 'vendas' ? 'vendas' : abaSelecionada === 'projetos' ? 'projetos' : 'clientes';
    return `relatorio-ia-${tipo}-${data}.${formato}`;
  };

  const exportarPDF = async () => {
    try {
      setExportando(true);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const titulo = abaSelecionada === 'vendas' ? 'Análise Preditiva de Vendas' :
                     abaSelecionada === 'projetos' ? 'Análise de Desempenho de Projetos' :
                     'Análise de Comportamento de Clientes';

      // Cabeçalho
      pdf.setFontSize(16);
      pdf.text(titulo, 20, 20);
      
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);

      // Parâmetros
      if (opcoes.incluirParametros) {
        pdf.setFontSize(12);
        pdf.setTextColor(0);
        pdf.text('Parâmetros de Análise', 20, 45);
        
        pdf.setFontSize(9);
        pdf.setTextColor(100);
        pdf.text(`Período: ${parametros.periodo} dias`, 25, 53);
        pdf.text(`Granularidade: ${parametros.granularidade}`, 25, 60);
        pdf.text(`Nível de Confiança: ${Math.round(parametros.nivelConfianca * 100)}%`, 25, 67);
      }

      pdf.text('Relatório gerado automaticamente pelo sistema MONTEX IA', 20, pdf.internal.pageSize.height - 10);

      const nomeArquivo = gerarNomeArquivo('pdf');
      pdf.save(nomeArquivo);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setExportando(false);
    }
  };

  const exportarExcel = async () => {
    try {
      setExportando(true);
      const ws = XLSX.utils.aoa_to_sheet([
        [abaSelecionada === 'vendas' ? 'Análise Preditiva de Vendas' :
         abaSelecionada === 'projetos' ? 'Análise de Desempenho de Projetos' :
         'Análise de Comportamento de Clientes'],
        [],
        ['Data de Geração', new Date().toLocaleDateString('pt-BR')],
        ['Período', `${parametros.periodo} dias`],
        ['Granularidade', parametros.granularidade],
        ['Nível de Confiança', `${Math.round(parametros.nivelConfianca * 100)}%`],
        [],
        ['Nota: Este relatório contém análises preditivas geradas por IA'],
        ['Recomenda-se análise adicional antes de decisões críticas']
      ]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório IA');
      
      const nomeArquivo = gerarNomeArquivo('xlsx');
      XLSX.writeFile(wb, nomeArquivo);
      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao exportar Excel');
    } finally {
      setExportando(false);
    }
  };

  const exportarCSV = async () => {
    try {
      setExportando(true);
      const csv = [
        [`Análise - ${abaSelecionada}`],
        [`Data: ${new Date().toLocaleDateString('pt-BR')}`],
        [`Período: ${parametros.periodo} dias`],
        [`Granularidade: ${parametros.granularidade}`],
        [`Nível de Confiança: ${Math.round(parametros.nivelConfianca * 100)}%`],
        [],
        ['Parâmetro', 'Valor'],
        ['Período (dias)', parametros.periodo],
        ['Incluir Previsões', parametros.incluirPrevisoes ? 'Sim' : 'Não'],
        ['Nível de Confiança (%)', Math.round(parametros.nivelConfianca * 100)],
        ['Granularidade', parametros.granularidade]
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', gerarNomeArquivo('csv'));
      link.click();
      
      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar CSV');
    } finally {
      setExportando(false);
    }
  };

  const handleExportar = async () => {
    if (!formatos.pdf && !formatos.excel && !formatos.csv) {
      toast.error('Selecione pelo menos um formato');
      return;
    }

    if (formatos.pdf) await exportarPDF();
    if (formatos.excel) await exportarExcel();
    if (formatos.csv) await exportarCSV();

    setAbrindoDialog(false);
  };

  return (
    <Dialog open={abrindoDialog} onOpenChange={setAbrindoDialog}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Relatório</DialogTitle>
          <DialogDescription>
            Selecione os formatos e opções para exportação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formatos */}
          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">Formatos</Label>
            <div className="space-y-2">
              {[
                { id: 'pdf', label: 'PDF (Melhor para impressão)' },
                { id: 'excel', label: 'Excel (Edição e análise)' },
                { id: 'csv', label: 'CSV (Compatibilidade)' }
              ].map(fmt => (
                <div key={fmt.id} className="flex items-center gap-2">
                  <Checkbox
                    id={fmt.id}
                    checked={formatos[fmt.id]}
                    onCheckedChange={(checked) =>
                      setFormatos({ ...formatos, [fmt.id]: checked })
                    }
                  />
                  <label htmlFor={fmt.id} className="text-sm cursor-pointer">
                    {fmt.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Opções */}
          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">Opções</Label>
            <div className="space-y-2">
              {[
                { id: 'incluirGraficos', label: 'Incluir Gráficos' },
                { id: 'incluirSumario', label: 'Incluir Sumário Executivo' },
                { id: 'incluirParametros', label: 'Incluir Parâmetros de Análise' }
              ].map(opt => (
                <div key={opt.id} className="flex items-center gap-2">
                  <Checkbox
                    id={opt.id}
                    checked={opcoes[opt.id]}
                    onCheckedChange={(checked) =>
                      setOpcoes({ ...opcoes, [opt.id]: checked })
                    }
                  />
                  <label htmlFor={opt.id} className="text-sm cursor-pointer">
                    {opt.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setAbrindoDialog(false)}
              className="flex-1"
              disabled={exportando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExportar}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              disabled={exportando}
            >
              {exportando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Exportar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}