/**
 * KPICard - Componente genérico unificado de KPI
 * Substitui: UltraStatCard (Premium), KPICard (ERPIntegrado), ModernStatCard (Dashboard), HexagonIndicator (Futurista)
 *
 * Variantes: 'premium' (padrão), 'modern', 'minimal'
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Sparkline inline SVG para Premium
const SparkLine = ({ data = [], color = '#22d3ee', title = '' }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * 60},${30 - ((v - min) / range) * 25}`
  ).join(' ');

  return (
    <svg width="60" height="30">
      <defs>
        <linearGradient id={`spark-${title}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,30 ${points} 60,30`} fill={`url(#spark-${title})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
};

// Trend badge
const TrendBadge = ({ trend }) => {
  if (trend === undefined || trend === null) return null;
  const isPositive = trend > 0;
  return (
    <span className={cn(
      'text-xs flex items-center gap-0.5 font-medium',
      isPositive ? 'text-emerald-400' : 'text-red-400'
    )}>
      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(trend)}%
    </span>
  );
};

// Pulse indicator
const PulseIndicator = ({ status = 'online', size = 3 }) => {
  const colors = { online: '#22c55e', warning: '#f59e0b', offline: '#ef4444' };
  const color = colors[status] || colors.online;
  return (
    <span className="relative flex" style={{ width: size * 2, height: size * 2 }}>
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full"
        style={{ backgroundColor: color }}
        animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <span className="relative inline-flex rounded-full h-full w-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
    </span>
  );
};

// ====== MAIN KPICard COMPONENT ======
export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = '#22d3ee',
  trend,
  sparkData = [],
  variant = 'premium',
  delay = 0,
  onClick,
  status = 'online',
  className = '',
}) {
  // Premium variant (default) - estilo holográfico com sparkline
  if (variant === 'premium') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        onClick={onClick}
        className={cn(
          'p-4 rounded-xl backdrop-blur-xl cursor-pointer transition-all hover:brightness-110',
          'bg-slate-900/80 border',
          className
        )}
        style={{
          borderColor: `${color}30`,
          boxShadow: `0 0 20px ${color}10, inset 0 0 40px ${color}05`
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {Icon && <Icon className="w-4 h-4" style={{ color }} />}
              <span className="text-xs text-slate-400 font-medium">{title}</span>
              <PulseIndicator status={status} size={3} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono" style={{ color }}>{value}</span>
              <TrendBadge trend={trend} />
            </div>
            {subtitle && <p className="text-[10px] text-slate-500 mt-1">{subtitle}</p>}
          </div>
          {sparkData.length > 0 && (
            <div className="ml-2">
              <SparkLine data={sparkData} color={color} title={title} />
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Modern variant - estilo clean com gradiente (baseado no ModernStatCard)
  if (variant === 'modern') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        whileHover={{ y: -3, scale: 1.01 }}
        onClick={onClick}
        className={cn('relative group cursor-pointer', className)}
      >
        <div className="relative bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 overflow-hidden group-hover:border-slate-600/50 transition-all">
          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-slate-400 font-medium">{title}</p>
              <h3 className="text-3xl font-bold text-white">{value}</h3>
              {subtitle && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <TrendBadge trend={trend} />
                  {subtitle}
                </p>
              )}
            </div>
            {Icon && (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, ${color}80, ${color}40)` }}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Minimal variant - estilo compacto para grids densos
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={cn(
        'bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/30 p-4',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 rounded-lg" style={{ background: `${color}20` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        )}
        <div>
          <p className="text-xs text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
      {subtitle && (
        <p className="text-xs mt-2 flex items-center gap-1" style={{ color }}>
          <TrendBadge trend={trend} />
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

export { SparkLine, TrendBadge, PulseIndicator };
