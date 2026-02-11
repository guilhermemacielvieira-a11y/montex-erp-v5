/**
 * PeriodSelector - Seletor de período (Semana/Mês/Ano)
 * Extraído do DashboardERPIntegrado, agora disponível no Premium
 */
import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const PERIODS = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
];

export default function PeriodSelector({ value = 'mes', onChange, className = '' }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Calendar className="w-4 h-4 text-slate-400" />
      <div className="flex items-center bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
        {PERIODS.map(period => (
          <button
            key={period.value}
            onClick={() => onChange(period.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-all',
              value === period.value
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
            )}
          >
            {period.label}
          </button>
        ))}
      </div>
    </div>
  );
}
