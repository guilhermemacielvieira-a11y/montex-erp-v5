import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Zap,
  Activity
} from 'lucide-react';

// ============================================
// LIVE DATA STREAM
// ============================================
export const LiveDataStream = ({ data = [], maxItems = 8 }) => {
  const [items, setItems] = useState(data.slice(0, maxItems));
  const [newItem, setNewItem] = useState(null);

  useEffect(() => {
    // Simulate live data
    const interval = setInterval(() => {
      const randomValue = Math.floor(Math.random() * 100) + 50;
      const randomType = ['production', 'quality', 'delivery'][Math.floor(Math.random() * 3)];
      const newData = {
        id: Date.now(),
        value: randomValue,
        type: randomType,
        timestamp: new Date().toLocaleTimeString('pt-BR')
      };

      setNewItem(newData);
      setItems(prev => [newData, ...prev.slice(0, maxItems - 1)]);
    }, 3000);

    return () => clearInterval(interval);
  }, [maxItems]);

  const getTypeColor = (type) => {
    switch (type) {
      case 'production': return '#22d3ee';
      case 'quality': return '#34d399';
      case 'delivery': return '#c084fc';
      default: return '#64748b';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'production': return Activity;
      case 'quality': return CheckCircle;
      case 'delivery': return ArrowRight;
      default: return Zap;
    }
  };

  return (
    <div className="space-y-2 max-h-[300px] overflow-hidden">
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => {
          const Icon = getTypeIcon(item.type);
          const color = getTypeColor(item.type);

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -50, scale: 0.8 }}
              animate={{ opacity: 1 - index * 0.1, x: 0, scale: 1 - index * 0.02 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{
                background: `linear-gradient(90deg, ${color}10, transparent)`,
                borderLeft: `3px solid ${color}`
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}20` }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-medium">{item.type}</span>
                  <span className="text-xs text-slate-500">{item.timestamp}</span>
                </div>
                <div className="text-lg font-bold font-mono" style={{ color }}>
                  {item.value}
                </div>
              </div>
              {index === 0 && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: 3 }}
                  className="w-2 h-2 rounded-full"
                  style={{ background: color, boxShadow: `0 0 10px ${color}` }}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// COMPARISON BARS
// ============================================
export const ComparisonBars = ({ data, showLabels = true }) => {
  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const maxValue = Math.max(item.current, item.previous, item.target || 0);
        const currentPercent = (item.current / maxValue) * 100;
        const previousPercent = (item.previous / maxValue) * 100;
        const isPositive = item.current >= item.previous;

        return (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">{item.name}</span>
              <div className="flex items-center gap-2">
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-sm font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{((item.current - item.previous) / item.previous * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Current bar */}
            <div className="relative h-6 bg-slate-800 rounded-lg overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-lg"
                style={{
                  background: 'linear-gradient(90deg, #22d3ee, #34d399)',
                  boxShadow: '0 0 20px rgba(34, 211, 238, 0.3)'
                }}
                initial={{ width: 0 }}
                animate={{ width: `${currentPercent}%` }}
                transition={{ duration: 1, delay: index * 0.1 }}
              />
              {showLabels && (
                <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-mono text-white">
                  {item.current.toLocaleString('pt-BR')}
                </span>
              )}
            </div>

            {/* Previous bar (smaller) */}
            <div className="relative h-2 bg-slate-800/50 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-slate-500"
                initial={{ width: 0 }}
                animate={{ width: `${previousPercent}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Anterior: {item.previous.toLocaleString('pt-BR')}</span>
              {item.target && <span>Meta: {item.target.toLocaleString('pt-BR')}</span>}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ============================================
// HEATMAP GRID
// ============================================
export const HeatmapGrid = ({ data, rows, cols }) => {
  const getColor = (value) => {
    if (value >= 90) return '#22c55e';
    if (value >= 70) return '#84cc16';
    if (value >= 50) return '#eab308';
    if (value >= 30) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="space-y-1">
      {/* Column headers */}
      <div className="flex gap-1 pl-16">
        {cols.map((col, i) => (
          <div key={i} className="w-12 text-center text-xs text-slate-400">
            {col}
          </div>
        ))}
      </div>

      {/* Grid */}
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1 items-center">
          <div className="w-14 text-xs text-slate-400 text-right pr-2">{row}</div>
          {cols.map((_, colIndex) => {
            const value = data[rowIndex]?.[colIndex] || 0;
            return (
              <motion.div
                key={colIndex}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (rowIndex * cols.length + colIndex) * 0.02 }}
                className="w-12 h-8 rounded flex items-center justify-center text-xs font-mono text-white cursor-pointer hover:scale-110 transition-transform"
                style={{
                  background: getColor(value),
                  boxShadow: `0 0 10px ${getColor(value)}40`
                }}
                title={`${row} x ${cols[colIndex]}: ${value}%`}
              >
                {value}
              </motion.div>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-slate-700/50">
        {[
          { color: '#ef4444', label: '0-30%' },
          { color: '#f97316', label: '30-50%' },
          { color: '#eab308', label: '50-70%' },
          { color: '#84cc16', label: '70-90%' },
          { color: '#22c55e', label: '90-100%' }
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ background: item.color }} />
            <span className="text-xs text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// TREND INDICATOR
// ============================================
export const TrendIndicator = ({ current, previous, format = 'number', size = 'default' }) => {
  const change = current - previous;
  const percentChange = previous !== 0 ? (change / previous) * 100 : 0;
  const isPositive = change >= 0;

  const formatValue = (val) => {
    switch (format) {
      case 'currency':
        return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
      case 'percent':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString('pt-BR');
    }
  };

  const sizeClasses = {
    small: { value: 'text-lg', change: 'text-xs' },
    default: { value: 'text-2xl', change: 'text-sm' },
    large: { value: 'text-4xl', change: 'text-base' }
  };

  return (
    <div className="flex items-center gap-3">
      <motion.div
        className={`${sizeClasses[size].value} font-bold font-mono text-white`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {formatValue(current)}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
          isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}
      >
        {isPositive ? (
          <TrendingUp className={size === 'small' ? 'w-3 h-3' : 'w-4 h-4'} />
        ) : (
          <TrendingDown className={size === 'small' ? 'w-3 h-3' : 'w-4 h-4'} />
        )}
        <span className={`${sizeClasses[size].change} font-medium`}>
          {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
        </span>
      </motion.div>
    </div>
  );
};

// ============================================
// ANOMALY DETECTOR
// ============================================
export const AnomalyDetector = ({ data, threshold = 20 }) => {
  const anomalies = useMemo(() => {
    const avg = data.reduce((a, b) => a + b.value, 0) / data.length;
    const stdDev = Math.sqrt(
      data.reduce((sq, item) => sq + Math.pow(item.value - avg, 2), 0) / data.length
    );

    return data.filter(item => Math.abs(item.value - avg) > stdDev * 1.5).map(item => ({
      ...item,
      deviation: ((item.value - avg) / avg * 100).toFixed(1)
    }));
  }, [data]);

  if (anomalies.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
        <CheckCircle className="w-5 h-5 text-emerald-400" />
        <span className="text-emerald-400">Nenhuma anomalia detectada</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {anomalies.map((anomaly, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">{anomaly.name}</span>
              <span className="text-amber-400 font-mono text-sm">
                {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation}%
              </span>
            </div>
            <span className="text-xs text-slate-400">Valor: {anomaly.value}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ============================================
// MINI DASHBOARD CARD
// ============================================
export const MiniDashboard = ({ title, value, trend, sparklineData, color = '#22d3ee', icon: Icon }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="relative p-4 rounded-xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}10, transparent)`,
        border: `1px solid ${color}30`
      }}
    >
      {/* Background glow */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl"
        style={{ background: `${color}20` }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          {Icon && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${color}20` }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
          )}
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        </div>

        <div className="text-xs text-slate-400 mb-1">{title}</div>
        <div className="text-2xl font-bold font-mono" style={{ color }}>{value}</div>

        {/* Sparkline */}
        {sparklineData && (
          <div className="mt-3 h-8">
            <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`mini-grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path
                d={`M 0,${30 - sparklineData[0] * 0.3} ${sparklineData.map((v, i) =>
                  `L ${(i / (sparklineData.length - 1)) * 100},${30 - v * 0.3}`
                ).join(' ')} L 100,30 L 0,30 Z`}
                fill={`url(#mini-grad-${title})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
              <motion.path
                d={`M 0,${30 - sparklineData[0] * 0.3} ${sparklineData.map((v, i) =>
                  `L ${(i / (sparklineData.length - 1)) * 100},${30 - v * 0.3}`
                ).join(' ')}`}
                fill="none"
                stroke={color}
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
              />
            </svg>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default {
  LiveDataStream,
  ComparisonBars,
  HeatmapGrid,
  TrendIndicator,
  AnomalyDetector,
  MiniDashboard
};
