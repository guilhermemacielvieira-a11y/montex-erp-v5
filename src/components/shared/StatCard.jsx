import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Stat Card Component (Simplified KPI)
 *
 * Lightweight version of KPICard for displaying simple statistics.
 * Used in compact layouts where space is limited.
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.label - Stat label
 * @param {number|string} props.value - Stat value
 * @param {string} [props.color='slate'] - Color theme: 'blue', 'green', 'amber', 'red'
 * @param {string} [props.size='md'] - Card size: 'sm', 'md', 'lg'
 * @param {boolean} [props.loading=false] - Show loading state
 * @param {string} [props.className] - Additional CSS classes
 *
 * @returns {React.ReactElement} Stat card component
 *
 * @example
 * <StatCard label="Peças" value={48} color="blue" />
 * <StatCard label="Peso Total" value="1.2T" color="green" size="sm" />
 */
export default function StatCard({
  label,
  value,
  color = 'slate',
  size = 'md',
  loading = false,
  className = ''
}) {
  const colorMap = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    amber: 'text-amber-500',
    red: 'text-red-500'
  };

  const sizeMap = {
    sm: { p: 'p-3', textValue: 'text-xl', textLabel: 'text-xs' },
    md: { p: 'p-4', textValue: 'text-2xl', textLabel: 'text-sm' },
    lg: { p: 'p-5', textValue: 'text-3xl', textLabel: 'text-base' }
  };

  const sizeClasses = sizeMap[size] || sizeMap.md;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'rounded-lg border border-slate-800 bg-slate-950 transition-all duration-200',
        sizeClasses.p,
        className
      )}
    >
      <p className={cn('text-slate-400 font-medium', sizeClasses.textLabel)}>
        {label}
      </p>
      {loading ? (
        <div className={cn('h-6 w-20 bg-slate-800 rounded animate-pulse mt-1')} />
      ) : (
        <p className={cn('font-bold mt-1', colorMap[color], sizeClasses.textValue)}>
          {value}
        </p>
      )}
    </motion.div>
  );
}
