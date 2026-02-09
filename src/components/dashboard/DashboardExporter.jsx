import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, FileJson, File } from 'lucide-react';
import jsPDF from 'jspdf';

const EXPORT_OPTIONS = [
  { id: 'stats', label: 'Estatísticas Gerais', default: true },
  { id: 'projects', label: 'Projetos em Andamento', default: true },
  { id: 'financial', label: 'Dados Financeiros', default: true },
  { id: 'production', label: 'Dados de Produção', default: true },
];

export default function DashboardExporter({ open, onOpenChange, dashboardData }) {
  const [selectedOptions, setSelectedOptions] = useState(
    Object.fromEntries(EXPORT_OPTIONS.map(o => [o.id, o.default]))
  );
  const [exporting, setExporting] = useState(false);

  const handleToggle = (optionId) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionId]: !prev[optionId]
    }));
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      let csvContent = 'Dados do Dashboard - ' + new Date().toLocaleDateString('pt-BR') + '\n\n';

      if (selectedOptions.stats && dashboardData.stats) {
        csvContent += 'ESTATÍSTICAS\n';
        csvContent += 'Projetos Ativos,' + dashboardData.stats.projetosAtivos + '\n';
        csvContent += 'Peso Fabricado,' + dashboardData.stats.pesoFabricacao + ' kg\n';
        csvContent += 'Progresso Médio,' + dashboardData.stats.progressoMedio + '%\n';
        csvContent += 'Valor Contratado,' + dashboardData.stats.valorTotal + '\n\n';
      }

      if (selectedOptions.projects && dashboardData.projects?.length) {
        csvContent += 'PROJETOS EM ANDAMENTO\n';
        csvContent += 'Nome,Status,Progresso\n';
        dashboardData.projects.forEach(p => {
          csvContent += `"${p.nome}","${p.status}","${p.percentual || 0}%"\n`;
        });
        csvContent += '\n';
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `dashboard_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
      onOpenChange(false);
    }
  };

  const exportToPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      doc.setFontSize(16);
      doc.text('Dashboard - Relatório', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(10);
      doc.text('Data: ' + new Date().toLocaleDateString('pt-BR'), 20, yPosition);
      yPosition += 15;

      if (selectedOptions.stats && dashboardData.stats) {
        doc.setFontSize(12);
        doc.text('Estatísticas Gerais', 20, yPosition);
        yPosition += 8;

        const statsLines = [
          'Projetos Ativos: ' + dashboardData.stats.projetosAtivos,
          'Peso Fabricado: ' + dashboardData.stats.pesoFabricacao.toFixed(2) + ' kg',
          'Progresso Médio: ' + dashboardData.stats.progressoMedio.toFixed(1) + '%',
          'Valor Contratado: R$ ' + (dashboardData.stats.valorTotal || 0).toLocaleString('pt-BR'),
        ];

        doc.setFontSize(10);
        statsLines.forEach(line => {
          doc.text(line, 20, yPosition);
          yPosition += 6;
        });
        yPosition += 10;
      }

      if (selectedOptions.projects && dashboardData.projects?.length) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.text('Projetos em Andamento', 20, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        dashboardData.projects.slice(0, 10).forEach(p => {
          doc.text(`${p.nome} - ${p.status}`, 20, yPosition);
          yPosition += 6;
        });
      }

      doc.save(`dashboard_${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setExporting(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            {EXPORT_OPTIONS.map(option => (
              <div key={option.id} className="flex items-center space-x-3">
                <Checkbox
                  id={option.id}
                  checked={selectedOptions[option.id] || false}
                  onCheckedChange={() => handleToggle(option.id)}
                />
                <Label htmlFor={option.id} className="cursor-pointer text-sm font-medium">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={exportToCSV}
              disabled={exporting || !Object.values(selectedOptions).some(v => v)}
              className="flex-1 gap-2"
              variant="outline"
            >
              <FileJson className="h-4 w-4" />
              CSV
            </Button>
            <Button
              onClick={exportToPDF}
              disabled={exporting || !Object.values(selectedOptions).some(v => v)}
              className="flex-1 gap-2 bg-orange-600 hover:bg-orange-700"
            >
              <File className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}