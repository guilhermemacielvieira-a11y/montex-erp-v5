import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function KeyboardShortcuts({ onShortcut }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Number para navegação rápida
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            navigate(createPageUrl('Dashboard'));
            toast.success('Navegado para Dashboard');
            break;
          case '2':
            e.preventDefault();
            navigate(createPageUrl('Projetos'));
            toast.success('Navegado para Projetos');
            break;
          case '3':
            e.preventDefault();
            navigate(createPageUrl('Orcamentos'));
            toast.success('Navegado para Orçamentos');
            break;
          case '4':
            e.preventDefault();
            navigate(createPageUrl('RelatoriosFinanceiros'));
            toast.success('Navegado para Financeiro');
            break;
          case 'n':
            e.preventDefault();
            onShortcut?.('new-item');
            break;
          case 's':
            e.preventDefault();
            onShortcut?.('search');
            break;
          case 'e':
            e.preventDefault();
            onShortcut?.('export');
            break;
          case '/':
            e.preventDefault();
            onShortcut?.('command-palette');
            break;
          default:
            break;
        }
      }

      // Esc para fechar modais
      if (e.key === 'Escape') {
        onShortcut?.('close-modal');
      }

      // Ctrl/Cmd + Shift + ? para ajuda
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '?') {
        e.preventDefault();
        onShortcut?.('show-shortcuts');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onShortcut]);

  return null;
}