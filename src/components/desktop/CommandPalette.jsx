import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Calculator,
  FileSearch,
  MessageSquare,
  Users,
  Building2,
  CheckSquare,
  DollarSign,
  Package,
  Zap,
  Plus,
  Download,
  Upload,
} from 'lucide-react';

const pages = [
  { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard, keywords: ['início', 'home', 'principal'] },
  { name: 'Projetos', href: 'Projetos', icon: Building2, keywords: ['obras', 'construção'] },
  { name: 'Colaboração', href: 'ColaboracaoProjetos', icon: Users, keywords: ['equipe', 'time'] },
  { name: 'Tarefas', href: 'Tarefas', icon: CheckSquare, keywords: ['atividades', 'todo'] },
  { name: 'Produção', href: 'AtualizacaoProducaoIndependente', icon: Package, keywords: ['fabricação', 'montagem'] },
  { name: 'Orçamentos', href: 'Orcamentos', icon: Calculator, keywords: ['propostas', 'cotações'] },
  { name: 'Relatórios IA', href: 'RelatoriosIA', icon: FileSearch, keywords: ['análises', 'reports'] },
  { name: 'Financeiro', href: 'RelatoriosFinanceiros', icon: DollarSign, keywords: ['contas', 'despesas'] },
  { name: 'Automações', href: 'Automacoes', icon: Zap, keywords: ['workflows', 'regras'] },
  { name: 'Analisador', href: 'Analisador', icon: FileSearch, keywords: ['memorial', 'análise'] },
  { name: 'Chatbot', href: 'Chatbot', icon: MessageSquare, keywords: ['assistente', 'chat'] },
  { name: 'Clientes', href: 'Clientes', icon: Users, keywords: ['contatos', 'empresas'] },
];

const actions = [
  { name: 'Novo Projeto', action: 'new-project', icon: Plus, keywords: ['criar', 'adicionar'] },
  { name: 'Novo Orçamento', action: 'new-budget', icon: Calculator, keywords: ['criar', 'proposta'] },
  { name: 'Nova Tarefa', action: 'new-task', icon: CheckSquare, keywords: ['criar', 'atividade'] },
  { name: 'Exportar Dados', action: 'export', icon: Download, keywords: ['baixar', 'salvar'] },
  { name: 'Importar Planilha', action: 'import', icon: Upload, keywords: ['upload', 'carregar'] },
];

export default function CommandPalette({ onAction }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = useCallback((callback) => {
    setOpen(false);
    callback();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Digite um comando ou pesquise..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        
        <CommandGroup heading="Navegação">
          {pages.map((page) => (
            <CommandItem
              key={page.href}
              onSelect={() => handleSelect(() => navigate(createPageUrl(page.href)))}
              className="flex items-center gap-3 cursor-pointer"
            >
              <page.icon className="h-4 w-4" />
              <span>{page.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Ações Rápidas">
          {actions.map((action) => (
            <CommandItem
              key={action.action}
              onSelect={() => handleSelect(() => onAction?.(action.action))}
              className="flex items-center gap-3 cursor-pointer"
            >
              <action.icon className="h-4 w-4" />
              <span>{action.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}