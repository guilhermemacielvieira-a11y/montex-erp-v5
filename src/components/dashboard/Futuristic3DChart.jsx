import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Area, AreaChart, Tooltip } from 'recharts';

// Futuristic Radial Progress
export const FuturisticRadial = ({ value = 50, label = '', size = 150, color = 'cyan' }) => {
  const colors = {
    cyan: { main: '#22d3ee', glow: 'rgba(34, 211, 238, 0.5)' },
    emerald: { main: '#34d399', glow: 'rgba(52, 211, 153, 0.5)' },
    purple: { main: '#c084fc', glow: 'rgba(192, 132, 252, 0.5)' },
    amber: { main: '#fbbf24', glow: 'rgba(251, 191, 36, 0.5)' },
    blue: { main: '#60a5fa', glow: 'rgba(96, 165, 250, 0.5)' }
  };

  const c = colors[color] || colors.cyan;
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-30"
        style={{ background: c.glow }}
      />

      {/* SVG */}
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />

        {/* Glow track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={c.main}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{
            filter: `drop-shadow(0 0 10px ${c.glow})`,
            opacity: 0.3
          }}
        >
          <animate
            attributeName="stroke-dashoffset"
            from={circumference}
            to={strokeDashoffset}
            dur="1.5s"
            fill="freeze"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
        </circle>

        {/* Main progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={c.main}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{
            filter: `drop-shadow(0 0 6px ${c.glow})`
          }}
        >
          <animate
            attributeName="stroke-dashoffset"
            from={circumference}
            to={strokeDashoffset}
            dur="1.5s"
            fill="freeze"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
        </circle>

        {/* Tick marks */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = size / 2 + (radius - 15) * Math.cos(angle);
          const y1 = size / 2 + (radius - 15) * Math.sin(angle);
          const x2 = size / 2 + (radius - 10) * Math.cos(angle);
          const y2 = size / 2 + (radius - 10) * Math.sin(angle);

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-3xl font-bold font-mono"
          style={{ color: c.main, textShadow: `0 0 20px ${c.glow}` }}
        >
          {value}%
        </motion.span>
        {label && (
          <span className="text-xs text-slate-400 mt-1">{label}</span>
        )}
      </div>
    </div>
  );
};

// Futuristic Bar Chart with 3D effect
export const Futuristic3DBar = ({ data, dataKey = 'value', nameKey = 'name', color = 'cyan', height = 200 }) => {
  const colors = {
    cyan: { main: '#22d3ee', gradient: ['#22d3ee', '#0891b2'] },
    emerald: { main: '#34d399', gradient: ['#34d399', '#059669'] },
    purple: { main: '#c084fc', gradient: ['#c084fc', '#9333ea'] },
    amber: { main: '#fbbf24', gradient: ['#fbbf24', '#d97706'] },
    blue: { main: '#60a5fa', gradient: ['#60a5fa', '#2563eb'] }
  };

  const c = colors[color] || colors.cyan;

  const CustomBar = (props) => {
    const { x, y, width, height, fill } = props;
    const depth = 8;

    return (
      <g>
        {/* 3D side */}
        <path
          d={`M${x + width},${y} L${x + width + depth},${y - depth} L${x + width + depth},${y + height - depth} L${x + width},${y + height} Z`}
          fill={c.gradient[1]}
          opacity={0.7}
        />
        {/* 3D top */}
        <path
          d={`M${x},${y} L${x + depth},${y - depth} L${x + width + depth},${y - depth} L${x + width},${y} Z`}
          fill={c.main}
          opacity={0.9}
        />
        {/* Main bar with gradient */}
        <defs>
          <linearGradient id={`barGrad-${x}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.gradient[0]} />
            <stop offset="100%" stopColor={c.gradient[1]} />
          </linearGradient>
        </defs>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={`url(#barGrad-${x})`}
          style={{ filter: `drop-shadow(0 0 8px ${c.main}40)` }}
        />
        {/* Highlight */}
        <rect
          x={x + 2}
          y={y}
          width={3}
          height={height}
          fill="rgba(255,255,255,0.3)"
        />
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis
          dataKey={nameKey}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: `1px solid ${c.main}40`,
            borderRadius: '8px',
            boxShadow: `0 0 20px ${c.main}20`
          }}
          labelStyle={{ color: c.main }}
          itemStyle={{ color: '#e2e8f0' }}
        />
        <Bar dataKey={dataKey} shape={<CustomBar />} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Futuristic Line Chart with glow
export const FuturisticLineChart = ({ data, lines = [], height = 200 }) => {
  const defaultColors = ['#22d3ee', '#34d399', '#c084fc', '#fbbf24'];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <defs>
          {lines.map((line, i) => (
            <linearGradient key={`grad-${i}`} id={`lineGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={line.color || defaultColors[i]} stopOpacity={0.3} />
              <stop offset="100%" stopColor={line.color || defaultColors[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 10 }}
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(34, 211, 238, 0.3)',
            borderRadius: '8px'
          }}
          labelStyle={{ color: '#22d3ee' }}
        />
        {lines.map((line, i) => (
          <React.Fragment key={i}>
            <Area
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color || defaultColors[i]}
              strokeWidth={2}
              fill={`url(#lineGrad-${i})`}
              style={{ filter: `drop-shadow(0 0 8px ${line.color || defaultColors[i]}60)` }}
            />
          </React.Fragment>
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

// Futuristic Progress Bar
export const FuturisticProgress = ({ value = 0, label = '', color = 'cyan', showValue = true }) => {
  const colors = {
    cyan: '#22d3ee',
    emerald: '#34d399',
    purple: '#c084fc',
    amber: '#fbbf24',
    blue: '#60a5fa'
  };

  const c = colors[color] || colors.cyan;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-300">{label}</span>
        {showValue && (
          <span className="text-sm font-mono" style={{ color: c }}>
            {value}%
          </span>
        )}
      </div>
      <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
        {/* Glow background */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${c}20, transparent)`,
            animation: 'pulse 2s infinite'
          }}
        />
        {/* Progress */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full relative"
          style={{
            background: `linear-gradient(90deg, ${c}80, ${c})`,
            boxShadow: `0 0 10px ${c}, 0 0 20px ${c}40`
          }}
        >
          {/* Shine effect */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%)'
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default { FuturisticRadial, Futuristic3DBar, FuturisticLineChart, FuturisticProgress };
