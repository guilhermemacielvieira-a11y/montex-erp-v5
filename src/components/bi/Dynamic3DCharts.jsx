import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
  PieChart, Pie,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// ============================================
// ANIMATED 3D GAUGE
// ============================================
export const Gauge3D = ({ value = 0, max = 100, label = '', color = '#22d3ee', size = 200 }) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const percentage = (animatedValue / max) * 100;
  const angle = (percentage / 100) * 180;
  const radius = size / 2 - 20;

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 40 }}>
      {/* 3D Base Shadow */}
      <div
        className="absolute rounded-t-full"
        style={{
          width: size,
          height: size / 2,
          background: `linear-gradient(180deg, ${color}10, transparent)`,
          filter: 'blur(20px)',
          transform: 'translateY(10px)'
        }}
      />

      <svg width={size} height={size / 2 + 40} viewBox={`0 0 ${size} ${size / 2 + 40}`}>
        {/* Background Arc */}
        <path
          d={`M 20,${size / 2} A ${radius},${radius} 0 0,1 ${size - 20},${size / 2}`}
          fill="none"
          stroke="#1e293b"
          strokeWidth="20"
          strokeLinecap="round"
        />

        {/* 3D Effect - Inner shadow */}
        <path
          d={`M 20,${size / 2} A ${radius},${radius} 0 0,1 ${size - 20},${size / 2}`}
          fill="none"
          stroke="#0f172a"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Animated Progress Arc */}
        <motion.path
          d={`M 20,${size / 2} A ${radius},${radius} 0 0,1 ${size - 20},${size / 2}`}
          fill="none"
          stroke={`url(#gauge-gradient-${label})`}
          strokeWidth="12"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: percentage / 100 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}
        />

        {/* Gradient Definition */}
        <defs>
          <linearGradient id={`gauge-gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick, i) => {
          const tickAngle = ((tick / 100) * 180 - 180) * (Math.PI / 180);
          const x1 = size / 2 + (radius - 25) * Math.cos(tickAngle);
          const y1 = size / 2 + (radius - 25) * Math.sin(tickAngle);
          const x2 = size / 2 + (radius - 35) * Math.cos(tickAngle);
          const y2 = size / 2 + (radius - 35) * Math.sin(tickAngle);

          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth="2" />
              <text
                x={size / 2 + (radius - 50) * Math.cos(tickAngle)}
                y={size / 2 + (radius - 50) * Math.sin(tickAngle)}
                fill="#64748b"
                fontSize="10"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Needle */}
        <motion.g
          initial={{ rotate: -180 }}
          animate={{ rotate: -180 + angle }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}
        >
          <polygon
            points={`${size / 2},${size / 2 - radius + 30} ${size / 2 - 4},${size / 2} ${size / 2 + 4},${size / 2}`}
            fill={color}
            style={{ filter: `drop-shadow(0 2px 4px ${color}80)` }}
          />
        </motion.g>

        {/* Center circle */}
        <circle cx={size / 2} cy={size / 2} r="15" fill="#1e293b" stroke={color} strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r="8" fill={color} />
      </svg>

      {/* Value Display */}
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <motion.div
          className="text-3xl font-bold font-mono"
          style={{ color, textShadow: `0 0 20px ${color}50` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {animatedValue.toFixed(1)}
        </motion.div>
        <div className="text-sm text-slate-400">{label}</div>
      </div>
    </div>
  );
};

// ============================================
// 3D ROTATING DONUT CHART
// ============================================
export const Donut3D = ({ data, size = 200, innerRadius = 60 }) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => prev + 0.5);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const colors = ['#22d3ee', '#34d399', '#c084fc', '#fbbf24', '#f87171', '#60a5fa'];

  return (
    <div className="relative" style={{ width: size, height: size, perspective: '500px' }}>
      {/* 3D Shadow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)',
          transform: 'translateY(20px) rotateX(60deg)',
          filter: 'blur(10px)'
        }}
      />

      <motion.div
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(20deg) rotateZ(${rotation}deg)`
        }}
      >
        <ResponsiveContainer width={size} height={size}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={size / 2 - 20}
              paddingAngle={3}
              dataKey="value"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  style={{
                    filter: activeIndex === index ? `drop-shadow(0 0 15px ${colors[index % colors.length]})` : 'none',
                    transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center'
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(34, 211, 238, 0.3)',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Center Value */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {data.reduce((a, b) => a + b.value, 0)}
          </div>
          <div className="text-xs text-slate-400">Total</div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ANIMATED WAVE CHART
// ============================================
export const WaveChart = ({ data, height = 200, color = '#22d3ee' }) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl" style={{ height }}>
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            `linear-gradient(180deg, ${color}10 0%, transparent 100%)`,
            `linear-gradient(180deg, ${color}20 0%, transparent 100%)`,
            `linear-gradient(180deg, ${color}10 0%, transparent 100%)`
          ]
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="name" stroke="#475569" fontSize={11} />
          <YAxis stroke="#475569" fontSize={11} />
          <Tooltip
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: `1px solid ${color}40`,
              borderRadius: '12px'
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            fill="url(#waveGradient)"
            filter="url(#glow)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================
// 3D BAR CHART
// ============================================
export const Bar3DChart = ({ data, height = 250, colors = ['#22d3ee', '#34d399'] }) => {
  const CustomBar = (props) => {
    const { x, y, width, height, fill, index } = props;
    const depth = 10;

    return (
      <motion.g
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: index * 0.1, duration: 0.5 }}
        style={{ transformOrigin: `${x + width / 2}px ${y + height}px` }}
      >
        {/* 3D side */}
        <path
          d={`M${x + width},${y} L${x + width + depth},${y - depth} L${x + width + depth},${y + height - depth} L${x + width},${y + height} Z`}
          fill={fill}
          opacity={0.6}
        />
        {/* 3D top */}
        <path
          d={`M${x},${y} L${x + depth},${y - depth} L${x + width + depth},${y - depth} L${x + width},${y} Z`}
          fill={fill}
          opacity={0.8}
        />
        {/* Main bar */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          style={{ filter: `drop-shadow(0 4px 15px ${fill}50)` }}
        />
        {/* Highlight */}
        <rect
          x={x + 3}
          y={y}
          width={4}
          height={height}
          fill="rgba(255,255,255,0.2)"
        />
      </motion.g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="name" stroke="#475569" fontSize={11} />
        <YAxis stroke="#475569" fontSize={11} />
        <Tooltip
          contentStyle={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(34, 211, 238, 0.3)',
            borderRadius: '12px'
          }}
        />
        <Bar dataKey="value" shape={<CustomBar />}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ============================================
// ANIMATED RADAR CHART
// ============================================
export const AnimatedRadar = ({ data, color = '#22d3ee', size = 300 }) => {
  const [animatedData, setAnimatedData] = useState(data.map(d => ({ ...d, value: 0 })));

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedData(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [data]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          filter: 'blur(20px)'
        }}
      />

      <ResponsiveContainer width={size} height={size}>
        <RadarChart data={animatedData}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={11} />
          <PolarRadiusAxis stroke="#334155" />
          <Radar
            name="Value"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.3}
            strokeWidth={2}
            style={{ filter: `drop-shadow(0 0 10px ${color})` }}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: `1px solid ${color}40`,
              borderRadius: '12px'
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================
// PULSE INDICATOR
// ============================================
export const PulseIndicator = ({ value, label, color = '#22d3ee', size = 120 }) => {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Pulse rings */}
      {[1, 2, 3].map((ring) => (
        <motion.div
          key={ring}
          className="absolute rounded-full border-2"
          style={{ borderColor: color }}
          initial={{ width: size * 0.5, height: size * 0.5, opacity: 0.8 }}
          animate={{
            width: size,
            height: size,
            opacity: 0
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: ring * 0.6,
            ease: 'easeOut'
          }}
        />
      ))}

      {/* Center circle */}
      <motion.div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: size * 0.6,
          height: size * 0.6,
          background: `linear-gradient(135deg, ${color}40, ${color}20)`,
          border: `2px solid ${color}`,
          boxShadow: `0 0 30px ${color}40`
        }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="text-center">
          <div className="text-xl font-bold font-mono" style={{ color }}>
            {value}
          </div>
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// ANIMATED COUNTER
// ============================================
export const AnimatedCounter = ({ value, prefix = '', suffix = '', duration = 2, color = '#22d3ee', size = 'default' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const endValue = typeof value === 'number' ? value : parseFloat(value) || 0;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(endValue * easeOut);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  const sizeClasses = {
    small: 'text-2xl',
    default: 'text-4xl',
    large: 'text-6xl'
  };

  return (
    <motion.span
      className={`font-bold font-mono ${sizeClasses[size]}`}
      style={{ color, textShadow: `0 0 30px ${color}50` }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {prefix}
      {displayValue.toFixed(value % 1 === 0 ? 0 : 1)}
      {suffix}
    </motion.span>
  );
};

// ============================================
// SPARKLINE
// ============================================
export const Sparkline = ({ data, color = '#22d3ee', width = 100, height = 30 }) => {
  const points = useMemo(() => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    return data.map((value, index) => ({
      x: (index / (data.length - 1)) * width,
      y: height - ((value - min) / range) * height
    }));
  }, [data, width, height]);

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaD}
        fill={`url(#spark-grad-${color})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      <motion.path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
      {/* End dot */}
      <motion.circle
        cx={points[points.length - 1]?.x}
        cy={points[points.length - 1]?.y}
        r="3"
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1 }}
      />
    </svg>
  );
};

export default {
  Gauge3D,
  Donut3D,
  WaveChart,
  Bar3DChart,
  AnimatedRadar,
  PulseIndicator,
  AnimatedCounter,
  Sparkline
};
