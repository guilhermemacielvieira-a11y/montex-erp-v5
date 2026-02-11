/**
 * FinancialSummary - Resumo financeiro (Receitas, Despesas, Lucro)
 *
 * Props:
 *   - receitas: valor em BRL
 *   - despesas: valor em BRL
 *   - className: classes Tailwind adicionais
 *   - variant: 'default' | 'compact' (default: 'default')
 */
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatBRL = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value || 0);
};

export default function FinancialSummary({
  receitas = 0,
  despesas = 0,
  className = '',
  variant = 'default',
}) {
  const lucro = receitas - despesas;
  const margemLucro = receitas > 0 ? ((lucro / receitas) * 100).toFixed(1) : 0;
  const lucroColor = lucro >= 0 ? '#10b981' : '#ef4444';

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'p-4 rounded-lg backdrop-blur-xl bg-slate-900/80 border',
          className
        )}
        style={{
          borderColor: '#22d3ee30',
          boxShadow: '0 0 15px rgba(34,211,238,0.06)'
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs text-slate-400">Lucro</span>
            <p className="text-lg font-bold" style={{ color: lucroColor }}>
              {formatBRL(lucro)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Margem</span>
            <p className="text-lg font-bold text-white">{margemLucro}%</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-xl backdrop-blur-xl bg-slate-900/80 border',
        className
      )}
      style={{
        borderColor: '#22d3ee30',
        boxShadow: '0 0 20px rgba(34,211,238,0.08)'
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-bold text-white">RESUMO FINANCEIRO</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Receitas */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="p-3 rounded-lg bg-slate-800/40 border border-emerald-500/20"
        >
          <span className="text-[10px] text-slate-400 block mb-1">Receitas</span>
          <p className="text-lg font-bold text-emerald-400">
            {formatBRL(receitas)}
          </p>
          <span className="text-[9px] text-slate-500">Entrada</span>
        </motion.div>

        {/* Despesas */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-3 rounded-lg bg-slate-800/40 border border-red-500/20"
        >
          <span className="text-[10px] text-slate-400 block mb-1">Despesas</span>
          <p className="text-lg font-bold text-red-400">
            {formatBRL(despesas)}
          </p>
          <span className="text-[9px] text-slate-500">Saída</span>
        </motion.div>

        {/* Lucro */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-3 rounded-lg bg-slate-800/40 border border-emerald-500/20"
        >
          <span className="text-[10px] text-slate-400 block mb-1">Lucro</span>
          <p className="text-lg font-bold" style={{ color: lucroColor }}>
            {formatBRL(lucro)}
          </p>
          <span className="text-[9px]" style={{ color: lucroColor }}>
            {margemLucro}% margem
          </span>
        </motion.div>
      </div>

      {/* Detalhe visual */}
      <div className="mt-4 pt-4 border-t border-slate-700/30">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Taxa de lucratibidade</span>
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full mx-3 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: lucroColor }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(Math.max(margemLucro, 0), 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <span className="font-mono text-slate-400">{margemLucro}%</span>
        </div>
      </div>
    </div>
  );
}
