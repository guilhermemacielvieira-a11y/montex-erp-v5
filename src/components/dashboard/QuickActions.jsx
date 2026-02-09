import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Plus,
  Package,
  DollarSign,
  Users,
  Building2,
  Calculator,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

const quickActions = [
  {
    id: 'novo-projeto',
    label: 'Novo Projeto',
    icon: Building2,
    href: 'Projetos',
    gradient: 'from-blue-500 to-cyan-500',
    shortcut: 'Alt+P',
  },
  {
    id: 'novo-orcamento',
    label: 'Novo Orçamento',
    icon: Calculator,
    href: 'OrcamentosPage',
    gradient: 'from-emerald-500 to-teal-500',
    shortcut: 'Alt+O',
  },
  {
    id: 'lancar-producao',
    label: 'Lançar Produção',
    icon: Package,
    href: 'ProducaoPage',
    gradient: 'from-amber-500 to-orange-500',
    shortcut: 'Alt+L',
  },
  {
    id: 'nova-movimentacao',
    label: 'Movimentação',
    icon: DollarSign,
    href: 'FinanceiroPage',
    gradient: 'from-purple-500 to-pink-500',
    shortcut: 'Alt+M',
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: BarChart3,
    href: 'RelatoriosIA',
    gradient: 'from-indigo-500 to-purple-500',
    shortcut: 'Alt+R',
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: Users,
    href: 'Clientes',
    gradient: 'from-pink-500 to-rose-500',
    shortcut: 'Alt+C',
  },
];

export default function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-500" />
              Ações Rápidas
            </h3>
            <p className="text-sm text-slate-400">Acesso direto às funções principais</p>
          </div>
          <span className="text-xs text-slate-500">
            Ctrl+K para buscar
          </span>
        </div>
      </div>

      {/* Actions Grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {quickActions.map((action, index) => {
          const Icon = action.icon;

          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={createPageUrl(action.href)}>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative p-4 rounded-xl bg-slate-800/50 border border-slate-700/30
                           hover:border-slate-600/50 transition-all cursor-pointer group overflow-hidden"
                >
                  {/* Background Glow */}
                  <div className={cn(
                    "absolute -top-8 -right-8 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-300",
                    `bg-gradient-to-br ${action.gradient}`
                  )} />

                  <div className="relative z-10 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-lg",
                      `bg-gradient-to-br ${action.gradient}`
                    )}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>

                    {/* Label */}
                    <span className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                      {action.label}
                    </span>

                    {/* Shortcut */}
                    <span className="text-xs text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {action.shortcut}
                    </span>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
