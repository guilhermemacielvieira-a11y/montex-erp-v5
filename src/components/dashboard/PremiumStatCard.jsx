import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PremiumStatCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon: Icon,
  gradient = 'from-blue-500 to-cyan-500',
  delay = 0,
  size = 'default',
  onClick
}) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend === 'up') return <TrendingUp className="h-3 w-3" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-emerald-400 bg-emerald-500/20';
    if (trend === 'down') return 'text-red-400 bg-red-500/20';
    return 'text-slate-400 bg-slate-500/20';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={onClick}
      className={cn(
        "relative group cursor-pointer",
        size === 'large' && "col-span-2"
      )}
    >
      {/* Glass Card */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 h-full">
        {/* Gradient Background Glow */}
        <div className={cn(
          "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500",
          `bg-gradient-to-br ${gradient}`
        )} />

        {/* Animated Border */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className={cn(
            "absolute inset-0 rounded-2xl",
            `bg-gradient-to-r ${gradient}`
          )} style={{ padding: '1px' }}>
            <div className="w-full h-full rounded-2xl bg-slate-900/90" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
              `bg-gradient-to-br ${gradient}`
            )}>
              {Icon && <Icon className="h-6 w-6 text-white" />}
            </div>

            {trend && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.2 }}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                  getTrendColor()
                )}
              >
                {getTrendIcon()}
                <span>{trendValue}</span>
              </motion.div>
            )}
          </div>

          {/* Value */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.1 }}
          >
            <h3 className="text-3xl font-bold text-white mb-1 tracking-tight">
              {value}
            </h3>
            <p className="text-sm text-slate-400 font-medium">{title}</p>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            )}
          </motion.div>

          {/* Progress Bar (optional) */}
          {size === 'large' && (
            <motion.div
              className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.3 }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '65%' }}
                transition={{ delay: delay + 0.5, duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  `bg-gradient-to-r ${gradient}`
                )}
              />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
