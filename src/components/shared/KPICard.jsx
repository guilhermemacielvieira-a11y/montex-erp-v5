import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * KPI Card Component
 *
 * Displays a key performance indicator with title, value, icon, and trend indicator.
 * Used across all dashboards to show metrics in a consistent, visually appealing way.
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.label - KPI title/label
 * @param {number|string} props.value - Main value to display
 * @param {number} [props.trend=0] - Percentage change (-100 to 100). Positive = up, negative = down
 * @param {React.ComponentType} [props.icon] - Lucide icon component to display
 * @param {string} [props.color='blue'] - Color theme: 'blue', 'green', 'amber', 'red', 'purple', 'cyan'
 * @param {string} [props.unit=''] - Unit suffix (e.g., '%', 'kg', 'R$')
 * @param {boolean} [props.loading=false] - Show loading skeleton
 * @param {string} [props.description=''] - Optional subtitle/description
 * @param {Function} [props.onClick] - Optional click handler
 * @param {string} [props.className] - Additional CSS classes
 *
 * @returns {React.ReactElement} KPI card component
 *
 * @example
 * // Basic usage
 * <KPICard
 *   label="Total Produção"
 *   value={1250}
 *   unit="kg"
 *   icon={Package}
 *   color="orange"
 *   trend={15}
 * />
 *
 * @example
 * // With callback
 * <KPICard
 *   label="Estoque Baixo"
 *   value={3}
 *   icon={AlertTriangle}
 *   color="red"
 *   onClick={() => navigate('/estoque')}
 * />
 */
export default function KPICard({
  label,
  value,
  trend = 0,
  icon: Icon,
  color = 'blue',
  unit = '',
  loading = false,
  description = '',
  onClick,
  className = ''
}) {
  const colorMap = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', icon: 'text-blue-500', border: 'border-blue-200/20' },
    green: { bg: 'bg-green-500/10', text: 'text-green-600', icon: 'text-green-500', border: 'border-green-200/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-600', icon: 'text-amber-500', border: 'border-amber-200/20' },
    red: { bg: 'bg-red-500/10', text: 'text-red-600', icon: 'text-red-500', border: 'border-red-200/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-600', icon: 'text-purple-500', border: 'border-purple-200/20' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', icon: 'text-cyan-500', border: 'border-cyan-200/20' }
  };

  const colors = colorMap[color] || colorMap.blue;
  const trendColor = trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-slate-400';
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 transition-all duration-200',
        colors.border,
        onClick && 'cursor-pointer hover:border-slate-700 hover:bg-slate-900/50',
        className
      )}
    >
      {/* Background gradient accent */}
      <div className={cn('absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20', colors.bg)} />

      <div className="relative z-10">
        {/* Header: Icon + Label */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            {Icon && <Icon className={cn('h-5 w-5', colors.icon)} />}
            <h3 className="text-sm font-medium text-slate-400">{label}</h3>
          </div>
          {trend !== 0 && (
            <div className={cn('flex items-center gap-1 text-xs font-semibold', trendColor)}>
              <TrendIcon className="h-4 w-4" />
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        {/* Main Value */}
        {loading ? (
          <div className="h-8 w-24 bg-slate-800 rounded animate-pulse" />
        ) : (
          <div className={cn('text-3xl font-bold', colors.text)}>
            {value}
            {unit && <span className="text-lg ml-1">{unit}</span>}
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-xs text-slate-500 mt-2">{description}</p>
        )}
      </div>
    </motion.div>
  );
}
