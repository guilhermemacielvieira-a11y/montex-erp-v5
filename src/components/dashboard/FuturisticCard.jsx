import React from 'react';
import { motion } from 'framer-motion';

const FuturisticCard = ({
  children,
  title,
  icon: Icon,
  className = '',
  glowColor = 'cyan',
  delay = 0,
  size = 'default'
}) => {
  const glowColors = {
    cyan: {
      border: 'border-cyan-500/30',
      glow: 'shadow-cyan-500/20',
      text: 'text-cyan-400',
      bg: 'from-cyan-500/10 to-cyan-500/5',
      line: 'bg-cyan-500',
      corner: 'border-cyan-400'
    },
    emerald: {
      border: 'border-emerald-500/30',
      glow: 'shadow-emerald-500/20',
      text: 'text-emerald-400',
      bg: 'from-emerald-500/10 to-emerald-500/5',
      line: 'bg-emerald-500',
      corner: 'border-emerald-400'
    },
    purple: {
      border: 'border-purple-500/30',
      glow: 'shadow-purple-500/20',
      text: 'text-purple-400',
      bg: 'from-purple-500/10 to-purple-500/5',
      line: 'bg-purple-500',
      corner: 'border-purple-400'
    },
    amber: {
      border: 'border-amber-500/30',
      glow: 'shadow-amber-500/20',
      text: 'text-amber-400',
      bg: 'from-amber-500/10 to-amber-500/5',
      line: 'bg-amber-500',
      corner: 'border-amber-400'
    },
    blue: {
      border: 'border-blue-500/30',
      glow: 'shadow-blue-500/20',
      text: 'text-blue-400',
      bg: 'from-blue-500/10 to-blue-500/5',
      line: 'bg-blue-500',
      corner: 'border-blue-400'
    }
  };

  const colors = glowColors[glowColor] || glowColors.cyan;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      className={`relative group ${className}`}
    >
      {/* Outer glow effect */}
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${colors.bg} rounded-lg blur opacity-40 group-hover:opacity-60 transition-opacity duration-500`} />

      {/* Main card */}
      <div className={`relative bg-slate-900/80 backdrop-blur-xl rounded-lg border ${colors.border} shadow-lg ${colors.glow} overflow-hidden`}>
        {/* Scan line animation */}
        <motion.div
          animate={{ top: ['-10%', '110%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
          className={`absolute left-0 right-0 h-px ${colors.line} opacity-30 z-10`}
        />

        {/* Corner decorations */}
        <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 ${colors.corner} rounded-tl-lg`} />
        <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 ${colors.corner} rounded-tr-lg`} />
        <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 ${colors.corner} rounded-bl-lg`} />
        <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 ${colors.corner} rounded-br-lg`} />

        {/* Header */}
        {title && (
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${colors.line} animate-pulse`} />
            {Icon && <Icon className={`w-4 h-4 ${colors.text}`} />}
            <span className={`text-sm font-medium tracking-wider uppercase ${colors.text}`}>
              {title}
            </span>
          </div>
        )}

        {/* Content */}
        <div className={size === 'compact' ? 'p-3' : 'p-4'}>
          {children}
        </div>

        {/* Bottom accent line */}
        <div className={`absolute bottom-0 left-1/4 right-1/4 h-px ${colors.line} opacity-50`} />
      </div>
    </motion.div>
  );
};

export default FuturisticCard;
