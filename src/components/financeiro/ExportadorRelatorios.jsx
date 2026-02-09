import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportadorRelatorios({ movimentacoes = [], filtros = {} }) {
  const [showDialog, setShowDialog] = useState(false);
  const [formato, setFormato] = useState('csv');
  const [opcoes, setOpcoes] = useState({
    incluirGraficos: true,
    incluirResumo: true,
    incluirDetalhes: true,
  });
  const [exportando, setExportando] = useState(false);

  const exportarCSV = async () => {
    setExportando(true);
    try {
      const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Projeto', 'Status', 'Forma Pagamento'];
      const rows = movimentacoes.map(m => [
        new Date(m.data_movimentacao).toLocaleDateString('pt-BR'),
        m.tipo === 'entrada' ? 'RECEITA' : 'DESPESA',
        m.categoria?.replace(/_/g, ' ').toUpperCase() || '',
        m.descricao || '',
        m.valor.toString().replace('.', ','),
        m.projeto_nome || '',
        m.status?.toUpperCase() || '',
        m.forma_pagamento || '',
      ]);

      let conteudo = headers.join(';') + '\n';
      conteudo += rows.map(row => row.map(cell => `"${cell}"`).join(';')).join('\n');

      const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar CSV');
      console.error(error);
    } finally {
      setExportando(false);
      setShowDialog(false);
    }
  };

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const elemento = document.getElementById('relatorio-completo');
      if (!elemento) {
        toast.error('Elemento de relatório não encontrado');
        return;
      }

      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let posY = 0;
      let imgHeight = pdfHeight;
      let pageHeight = pdf.internal.pageSize.getHeight();

      while (imgHeight > 0) {
        if (posY > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'PNG', 0, posY, pdfWidth, pdfHeight);
        imgHeight -= pageHeight;
        posY -= pageHeight;
      }

      pdf.save(`relatorio_financeiro_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
      console.error(error);
    } finally {
      setExportando(false);
      setShowDialog(false);
    }
  };

  const exportarXLSX = async () => {
    setExportando(true);
    try {
      const XLSX = (await import('xlsx')).default;

      const dados = movimentacoes.map(m => ({
        'Data': new Date(m.data_movimentacao).toLocaleDateString('pt-BR'),
        'Tipo': m.tipo === 'entrada' ? 'RECEITA' : 'DESPESA',
        'Categoria': m.categoria?.replace(/_/g, ' ').toUpperCase() || '',
        'Descrição': m.descricao || '',
        'Valor': m.valor,
        'Projeto': m.projeto_nome || '',
        'Status': m.status?.toUpperCase() || '',
        'Forma Pagamento': m.forma_pagamento || '',
      }));

      const ws = XLSX.utils.json_to_sheet(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Movimentações');

      // Adicionar coluna de resumo se selecionado
      if (opcoes.incluirResumo) {
        const resumo = [
          ['RESUMO FINANCEIRO'],
          [''],
          ['Total Receitas', movimentacoes
            .filter(m => m.tipo === 'entrada')
            .reduce((acc, m) => acc + m.valor, 0)],
          ['Total Despesas', movimentacoes
            .filter(m => m.tipo === 'saida')
            .reduce((acc, m) => acc + m.valor, 0)],
          ['Saldo', movimentacoes
            .filter(m => m.tipo === 'entrada')
            .reduce((acc, m) => acc + m.valor, 0) - movimentacoes
            .filter(m => m.tipo === 'saida')
            .reduce((acc, m) => acc + m.valor, 0)],
        ];
        const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
        XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
      }

      XLSX.writeFile(wb, `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar Excel');
      console.error(error);
    } finally {
      setExportando(false);
      setShowDialog(false);
    }
  };

  const handleExportar = () => {
    if (formato === 'csv') {
      exportarCSV();
    } else if (formato === 'pdf') {
      exportarPDF();
    } else if (formato === 'xlsx') {
      exportarXLSX();
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Exportar
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Exportar Relatório Financeiro</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Formato */}
            <div className="space-y-2">
              <Label>Formato de Exportação</Label>
              <Select value={formato} onValueChange={setFormato}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Tabular)</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  <SelectItem value="pdf">PDF (Com Gráficos)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {formato === 'csv' && 'Ideal para importar em outras ferramentas'}
                {formato === 'xlsx' && 'Formato Excel com resumo e dados detalhados'}
                {formato === 'pdf' && 'Documento visual com gráficos e tabelas'}
              </p>
            </div>

            {/* Opções */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Opções de Exportação</Label>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="resumo"
                  checked={opcoes.incluirResumo}
                  onCheckedChange={(checked) =>
                    setOpcoes({ ...opcoes, incluirResumo: checked })
                  }
                />
                <label htmlFor="resumo" className="text-sm cursor-pointer">
                  Incluir Resumo (Total Receitas/Despesas)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="detalhes"
                  checked={opcoes.incluirDetalhes}
                  onCheckedChange={(checked) =>
                    setOpcoes({ ...opcoes, incluirDetalhes: checked })
                  }
                />
                <label htmlFor="detalhes" className="text-sm cursor-pointer">
                  Incluir Detalhes de Cada Movimentação
                </label>
              </div>

              {formato === 'pdf' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="graficos"
                    checked={opcoes.incluirGraficos}
                    onCheckedChange={(checked) =>
                      setOpcoes({ ...opcoes, incluirGraficos: checked })
                    }
                  />
                  <label htmlFor="graficos" className="text-sm cursor-pointer">
                    Incluir Gráficos Interativos
                  </label>
                </div>
              )}
            </div>

            {/* Informações */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600">
                <span className="font-semibold">Registros:</span> {movimentacoes.length} movimentações
              </p>
              <p className="text-xs text-slate-600 mt-1">
                <span className="font-semibold">Período:</span> {filtros.dataInicio || 'Indefinido'} a {filtros.dataFim || 'Indefinido'}
              </p>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleExportar}
                disabled={exportando}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600"
              >
                {exportando ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar {formato.toUpperCase()}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}