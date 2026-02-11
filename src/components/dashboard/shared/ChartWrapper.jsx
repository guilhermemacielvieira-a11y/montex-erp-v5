/**
 * ChartWrapper - Wrapper responsivo genérico para todos os gráficos Recharts
 * Substitui: implementações avulsas de ResponsiveContainer + headers em 4 dashboards
 *
 * Features: título, ícone, status badge, legend, loading/empty state
 */
import React from 'react';
import { ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { PulseIndicator } from './KPICard';
import { cn } from '@/lib/utils';

export default function ChartWrapper({
  title,
  icon: Icon,
  iconColor = '#22d3ee',
  height = 200,
  children,
  legend,
  rightContent,
  status = 'online',
  loading = false,
  empty = false,
  emptyMessage = 'Sem dados disponíveis',
  className = '',
  color = '#22d3ee',
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl backdrop-blur-xl bg-slate-900/80 border',
        className
      )}
      style={{
        borderColor: `${color}30`,
        boxShadow: `0 0 20px ${color}10, inset 0 0 40px ${color}05`
      }}
    >
      {/* Header */}
      {(title || rightContent) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5" style={{ color: iconColor }} />}
            {title && <span className="text-sm font-bold text-white">{title}</span>}
            {status && <PulseIndicator status={status} size={4} />}
          </div>
          <div className="flex items-center gap-4">
            {legend && (
              <div className="flex items-center gap-3">
                {legend.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
            {rightContent}
          </div>
        </div>
      )}

      {/* Chart area */}
      {loading ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <motion.div
            className="w-8 h-8 rounded-full border-2 border-t-transparent"
            style={{ borderColor: `${color}40`, borderTopColor: 'transparent' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      ) : empty ? (
        <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}>
          {emptyMessage}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
}
