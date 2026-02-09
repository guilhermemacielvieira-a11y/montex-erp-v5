import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const FuturisticKPI = ({
  title,
  value,
  suffix = '',
  prefix = '',
  trend = 'up',
  trendValue = '',
  icon: Icon,
  glowColor = 'cyan',
  delay = 0,
  animate = true
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  const glowColors = {
    cyan: {
      text: 'text-cyan-400',
      glow: 'drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      trendUp: 'text-emerald-400',
      trendDown: 'text-red-400'
    },
    emerald: {
      text: 'text-emerald-400',
      glow: 'drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      trendUp: 'text-emerald-400',
      trendDown: 'text-red-400'
    },
    purple: {
      text: 'text-purple-400',
      glow: 'drop-shadow-[0_0_10px_rgba(192,132,252,0.5)]',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      trendUp: 'text-emerald-400',
      trendDown: 'text-red-400'
    },
    amber: {
      text: 'text-amber-400',
      glow: 'drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      trendUp: 'text-emerald-400',
      trendDown: 'text-red-400'
    },
    blue: {
      text: 'text-blue-400',
      glow: 'drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      trendUp: 'text-emerald-400',
      trendDown: 'text-red-400'
    }
  };

  const colors = glowColors[glowColor] || glowColors.cyan;

  // Animate number counting
  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }

    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += 1;
      const progress = current / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(numValue * easeOut));

      if (current >= steps) {
        setDisplayValue(numValue);
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, animate]);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? colors.trendUp : trend === 'down' ? colors.trendDown : 'text-slate-400';

  const formatValue = (val) => {
    if (typeof val === 'number') {
      return val.toLocaleString('pt-BR');
    }
    return val;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="relative group"
    >
      {/* Glow background */}
      <div className={`absolute -inset-1 ${colors.bg} rounded-xl blur-xl opacity-50 group-hover:opacity-80 transition-opacity`} />

      {/* Card */}
      <div className={`relative bg-slate-900/90 backdrop-blur-xl rounded-xl border ${colors.border} p-4 overflow-hidden`}>
        {/* Grid pattern background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }} />
        </div>

        {/* Corner accents */}
        <div className={`absolute top-0 left-0 w-8 h-px ${colors.bg.replace('/10', '')}`} />
        <div className={`absolute top-0 left-0 h-8 w-px ${colors.bg.replace('/10', '')}`} />
        <div className={`absolute bottom-0 right-0 w-8 h-px ${colors.bg.replace('/10', '')}`} />
        <div className={`absolute bottom-0 right-0 h-8 w-px ${colors.bg.replace('/10', '')}`} />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {Icon && (
                <div className={`w-8 h-8 ${colors.bg} rounded-lg flex items-center justify-center border ${colors.border}`}>
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                </div>
              )}
              <span className="text-slate-400 text-xs font-medium tracking-wider uppercase">
                {title}
              </span>
            </div>
            {trendValue && (
              <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                <span>{trendValue}</span>
              </div>
            )}
          </div>

          {/* Value */}
          <div className="flex items-baseline gap-1">
            {prefix && (
              <span className={`text-lg ${colors.text} opacity-70`}>{prefix}</span>
            )}
            <motion.span
              className={`text-3xl font-bold ${colors.text} ${colors.glow} font-mono tracking-tight`}
            >
              {formatValue(displayValue)}
            </motion.span>
            {suffix && (
              <span className={`text-sm ${colors.text} opacity-70 ml-1`}>{suffix}</span>
            )}
          </div>

          {/* Animated bar */}
          <div className="mt-3 h-1 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: delay + 0.3, duration: 1, ease: 'easeOut' }}
              className={`h-full ${colors.bg.replace('/10', '')} rounded-full`}
              style={{
                boxShadow: `0 0 10px currentColor`
              }}
            />
          </div>
        </div>

        {/* Scan effect */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className={`absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12`}
        />
      </div>
    </motion.div>
  );
};

export default FuturisticKPI;
