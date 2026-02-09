import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

const shortcuts = [
  {
    category: 'Navegação',
    items: [
      { keys: ['Ctrl', 'K'], description: 'Abrir paleta de comandos' },
      { keys: ['Ctrl', '1'], description: 'Ir para Dashboard' },
      { keys: ['Ctrl', '2'], description: 'Ir para Projetos' },
      { keys: ['Ctrl', '3'], description: 'Ir para Orçamentos' },
      { keys: ['Ctrl', '4'], description: 'Ir para Financeiro' },
    ],
  },
  {
    category: 'Ações',
    items: [
      { keys: ['Ctrl', 'N'], description: 'Criar novo item' },
      { keys: ['Ctrl', 'S'], description: 'Pesquisar' },
      { keys: ['Ctrl', 'E'], description: 'Exportar dados' },
      { keys: ['Enter'], description: 'Abrir item selecionado' },
      { keys: ['Esc'], description: 'Fechar modal/diálogo' },
    ],
  },
  {
    category: 'Edição',
    items: [
      { keys: ['Ctrl', 'Z'], description: 'Desfazer' },
      { keys: ['Ctrl', 'Y'], description: 'Refazer' },
      { keys: ['Ctrl', 'C'], description: 'Copiar' },
      { keys: ['Ctrl', 'V'], description: 'Colar' },
    ],
  },
  {
    category: 'Ajuda',
    items: [
      { keys: ['Ctrl', 'Shift', '?'], description: 'Mostrar atalhos' },
    ],
  },
];

export default function ShortcutsHelp({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white flex items-center gap-3">
            <Keyboard className="h-6 w-6 text-orange-500" />
            Atalhos de Teclado
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Use esses atalhos para navegar mais rapidamente pelo sistema
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 mt-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-lg font-semibold text-white mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                  >
                    <span className="text-slate-300">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key) => (
                        <Badge
                          key={key}
                          variant="outline"
                          className="bg-slate-700 border-slate-600 text-white font-mono px-2 py-1"
                        >
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <p className="text-sm text-orange-400">
            <strong>Dica:</strong> No Mac, use ⌘ (Command) ao invés de Ctrl
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}