import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Copy,
  Edit,
  Trash2,
  Download,
  Share2,
  Eye,
  FileText,
  MoreHorizontal,
  Star,
  Archive,
} from 'lucide-react';

export default function DataContextMenu({ children, item, onAction, type = 'generic' }) {
  const menuItems = {
    project: [
      { label: 'Visualizar Detalhes', icon: Eye, action: 'view', shortcut: 'Enter' },
      { label: 'Editar', icon: Edit, action: 'edit', shortcut: '⌘E' },
      { separator: true },
      { label: 'Duplicar', icon: Copy, action: 'duplicate', shortcut: '⌘D' },
      { label: 'Gerar Relatório', icon: FileText, action: 'report' },
      { label: 'Exportar', icon: Download, action: 'export', shortcut: '⌘⇧E' },
      { separator: true },
      { label: 'Arquivar', icon: Archive, action: 'archive' },
      { label: 'Excluir', icon: Trash2, action: 'delete', shortcut: '⌘⌫', danger: true },
    ],
    budget: [
      { label: 'Abrir', icon: Eye, action: 'view' },
      { label: 'Editar', icon: Edit, action: 'edit', shortcut: '⌘E' },
      { separator: true },
      { label: 'Duplicar', icon: Copy, action: 'duplicate' },
      { label: 'Compartilhar', icon: Share2, action: 'share' },
      { label: 'Baixar PDF', icon: Download, action: 'download' },
      { separator: true },
      { label: 'Marcar como Favorito', icon: Star, action: 'favorite' },
      { label: 'Excluir', icon: Trash2, action: 'delete', danger: true },
    ],
    task: [
      { label: 'Detalhes', icon: Eye, action: 'view' },
      { label: 'Editar', icon: Edit, action: 'edit' },
      { separator: true },
      { label: 'Duplicar', icon: Copy, action: 'duplicate' },
      { label: 'Mover para...', icon: MoreHorizontal, action: 'move' },
      { separator: true },
      { label: 'Excluir', icon: Trash2, action: 'delete', danger: true },
    ],
    generic: [
      { label: 'Visualizar', icon: Eye, action: 'view' },
      { label: 'Editar', icon: Edit, action: 'edit' },
      { separator: true },
      { label: 'Excluir', icon: Trash2, action: 'delete', danger: true },
    ],
  };

  const items = menuItems[type] || menuItems.generic;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64 bg-slate-900 border-slate-800">
        {items.map((menuItem, idx) => {
          if (menuItem.separator) {
            return <ContextMenuSeparator key={idx} className="bg-slate-800" />;
          }

          const Icon = menuItem.icon;
          return (
            <ContextMenuItem
              key={idx}
              className={`flex items-center gap-3 cursor-pointer ${
                menuItem.danger ? 'text-red-400 focus:text-red-400' : 'text-slate-300'
              }`}
              onClick={() => onAction?.(menuItem.action, item)}
            >
              <Icon className="h-4 w-4" />
              <span>{menuItem.label}</span>
              {menuItem.shortcut && (
                <ContextMenuShortcut className="ml-auto">
                  {menuItem.shortcut}
                </ContextMenuShortcut>
              )}
            </ContextMenuItem>
          );
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}