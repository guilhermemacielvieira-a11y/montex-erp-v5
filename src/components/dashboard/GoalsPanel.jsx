import React from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Award, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GoalsPanel({ goals = [] }) {
  // Mock goals for demonstration
  const mockGoals = [
    {
      id: 1,
      title: 'Meta Mensal de Produção',
      target: 500,
      current: 385,
      unit: 'ton',
      icon: Target,
      gradient: 'from-emerald-500 to-green-500',
    },
    {
      id: 2,
      title: 'Faturamento do Mês',
      target: 5000000,
      current: 3750000,
      unit: 'R$',
      icon: TrendingUp,
      gradient: 'from-blue-500 to-cyan-500',
      formatValue: (v) => `${(v / 1000000).toFixed(1)}M`,
    },
    {
      id: 3,
      title: 'Projetos Entregues',
      target: 8,
      current: 6,
      unit: '',
      icon: Award,
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      id: 4,
      title: 'Eficiência de Produção',
      target: 95,
      current: 88,
      unit: '%',
      icon: Zap,
      gradient: 'from-orange-500 to-amber-500',
    },
  ];

  const displayGoals = goals.length > 0 ? goals : mockGoals;

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
              <Target className="h-5 w-5 text-emerald-500" />
              Metas & Objetivos
            </h3>
            <p className="text-sm text-slate-400">Acompanhamento mensal</p>
          </div>
          <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
            Jan 2026
          </span>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayGoals.map((goal, index) => {
          const Icon = goal.icon;
          const percentage = Math.round((goal.current / goal.target) * 100);
          const formatValue = goal.formatValue || ((v) => v.toLocaleString('pt-BR'));

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="relative p-4 rounded-xl bg-slate-800/50 border border-slate-700/30 group hover:border-slate-600/50 transition-all"
            >
              {/* Background Glow */}
              <div className={cn(
                "absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity",
                `bg-gradient-to-br ${goal.gradient}`
              )} />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    `bg-gradient-to-br ${goal.gradient}`
                  )}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    percentage >= 100
                      ? "bg-emerald-500/20 text-emerald-400"
                      : percentage >= 75
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-orange-500/20 text-orange-400"
                  )}>
                    {percentage}%
                  </span>
                </div>

                {/* Title */}
                <p className="text-sm font-medium text-white mb-2">{goal.title}</p>

                {/* Progress Bar */}
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                    transition={{ delay: 0.3 + index * 0.1, duration: 0.8, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      `bg-gradient-to-r ${goal.gradient}`
                    )}
                  />
                </div>

                {/* Values */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {formatValue(goal.current)} {goal.unit}
                  </span>
                  <span className="text-slate-500">
                    Meta: {formatValue(goal.target)} {goal.unit}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
