/**
 * MONTEX ERP - Barra de Ferramentas de Exportação
 * Componente reutilizável que combina exportação rápida e agendamento
 * Facilita a integração em qualquer página que necessite exportações
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Clock, ChevronDown } from 'lucide-react';
import ExportScheduler from './ExportScheduler';
import toast from 'react-hot-toast';

/**
 * Barra de ferramentas de exportação
 * @param {Object} config
 * @param {Function} config.onExportXLSX - Callback para exportar XLSX
 * @param {Function} config.onExportPDF - Callback para exportar PDF
 * @param {string} config.disabled - Desabilita botões se true
 * @param {string} config.size - Tamanho do botão (sm, md, lg)
 */
export default function ExportToolbar({
  onExportXLSX,
  onExportPDF,
  disabled = false,
  size = 'sm',
  showScheduler = true,
  label = 'Exportar'
}) {
  const handleExportXLSX = async () => {
    try {
      if (onExportXLSX) {
        await onExportXLSX();
        toast.success('Exportação XLSX iniciada');
      }
    } catch (error) {
      toast.error('Erro ao exportar XLSX');
      console.error('Export error:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      if (onExportPDF) {
        await onExportPDF();
        toast.success('Exportação PDF iniciada');
      }
    } catch (error) {
      toast.error('Erro ao exportar PDF');
      console.error('Export error:', error);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={size}
            disabled={disabled}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {label}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onExportXLSX && (
            <DropdownMenuItem onClick={handleExportXLSX}>
              <FileText className="h-4 w-4 mr-2" />
              <div>
                <div className="font-medium">Exportar como XLSX</div>
                <div className="text-xs text-slate-500">Planilha Excel com formatação</div>
              </div>
            </DropdownMenuItem>
          )}

          {onExportPDF && (
            <DropdownMenuItem onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              <div>
                <div className="font-medium">Exportar como PDF</div>
                <div className="text-xs text-slate-500">Documento em PDF</div>
              </div>
            </DropdownMenuItem>
          )}

          {(onExportXLSX || onExportPDF) && showScheduler && (
            <DropdownMenuSeparator />
          )}

          {showScheduler && (
            <DropdownMenuItem disabled className="cursor-default">
              <Clock className="h-4 w-4 mr-2 text-slate-400" />
              <div>
                <div className="font-medium text-slate-600">Agendar Exportações</div>
                <div className="text-xs text-slate-400">Configure exportações automáticas</div>
              </div>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showScheduler && <ExportScheduler />}
    </div>
  );
}
