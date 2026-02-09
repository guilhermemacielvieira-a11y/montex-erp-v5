import React from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FinancialSummary({ movimentacoes = [] }) {
  // Calculate financial metrics
  const calcularResumo = () => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const movimentacoesMes = movimentacoes.filter(m => {
      const data = new Date(m.created_date);
      return data >= inicioMes;
    });

    const receitas = movimentacoesMes
      .filter(m => m.tipo === 'receita')
      .reduce((acc, m) => acc + (m.valor || 0), 0);

    const despesas = movimentacoesMes
      .filter(m => m.tipo === 'despesa')
      .reduce((acc, m) => acc + (m.valor || 0), 0);

    const saldo = receitas - despesas;

    // Mock para a receber e a pagar
    const aReceber = 2450000;
    const aPagar = 1280000;

    return { receitas, despesas, saldo, aReceber, aPagar };
  };

  const resumo = calcularResumo();

  // Use mock data if no real data
  const financialData = movimentacoes.length > 0 ? resumo : {
    receitas: 3750000,
    despesas: 2100000,
    saldo: 1650000,
    aReceber: 2450000,
    aPagar: 1280000,
  };

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(2)}M`;
    }
    return `R$ ${(value / 1000).toFixed(0)}K`;
  };

  const metrics = [
    {
      label: 'Receitas do Mês',
      value: financialData.receitas,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      gradient: 'from-emerald-500 to-green-500',
    },
    {
      label: 'Despesas do Mês',
      value: financialData.despesas,
      icon: TrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      gradient: 'from-red-500 to-orange-500',
    },
    {
      label: 'A Receber',
      value: financialData.aReceber,
      icon: ArrowUpRight,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'A Pagar',
      value: financialData.aPagar,
      icon: ArrowDownRight,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      gradient: 'from-purple-500 to-pink-500',
    },
  ];

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
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Resumo Financeiro
            </h3>
            <p className="text-sm text-slate-400">Janeiro 2026</p>
          </div>

          {/* Saldo Badge */}
          <div className={cn(
            "px-4 py-2 rounded-xl",
            financialData.saldo >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"
          )}>
            <p className="text-xs text-slate-400">Saldo</p>
            <p className={cn(
              "text-lg font-bold",
              financialData.saldo >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {formatCurrency(financialData.saldo)}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;

          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="relative p-4 rounded-xl bg-slate-800/50 border border-slate-700/30 group hover:border-slate-600/50 transition-all"
            >
              {/* Glow */}
              <div className={cn(
                "absolute -top-6 -right-6 w-16 h-16 rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity",
                `bg-gradient-to-br ${metric.gradient}`
              )} />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("p-1.5 rounded-lg", metric.bgColor)}>
                    <Icon className={cn("h-4 w-4", metric.color)} />
                  </div>
                  <span className="text-xs text-slate-400">{metric.label}</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(metric.value)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Cash Flow Indicator */}
      <div className="px-4 pb-4">
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800/80 to-slate-800/40 border border-slate-700/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Fluxo de Caixa Previsto</span>
            <span className="text-sm font-medium text-emerald-400">+12% vs mês anterior</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '75%' }}
              transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>Realizado: R$ 3.75M</span>
            <span>Meta: R$ 5.0M</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
