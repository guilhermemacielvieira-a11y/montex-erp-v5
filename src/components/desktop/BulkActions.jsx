import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Trash2,
  Archive,
  CheckSquare,
  X,
  MoreHorizontal,
  FileText,
  Share2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function BulkActions({ selectedCount, onAction, onClearSelection }) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl px-6 py-4 flex items-center gap-4 backdrop-blur-xl">
        <Badge className="bg-orange-500 text-white">
          {selectedCount} {selectedCount === 1 ? 'item selecionado' : 'itens selecionados'}
        </Badge>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            onClick={() => onAction('export')}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            onClick={() => onAction('report')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Relatório
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-900 border-slate-800">
              <DropdownMenuItem
                className="text-slate-300 cursor-pointer"
                onClick={() => onAction('duplicate')}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-slate-300 cursor-pointer"
                onClick={() => onAction('share')}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-slate-300 cursor-pointer"
                onClick={() => onAction('archive')}
              >
                <Archive className="h-4 w-4 mr-2" />
                Arquivar
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                className="text-red-400 cursor-pointer focus:text-red-400"
                onClick={() => onAction('delete')}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="text-slate-400 hover:text-white"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}