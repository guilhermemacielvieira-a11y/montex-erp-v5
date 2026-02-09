import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';

// ==================== 3D GLOBE COMPONENT ====================
export const Globe3D = ({ data = [], size = 200, color = '#22d3ee', rotationSpeed = 0.5 }) => {
  const [rotation, setRotation] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(r => (r + rotationSpeed) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [rotationSpeed]);

  // Generate points on sphere
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 50; i++) {
      const phi = Math.acos(-1 + (2 * i) / 50);
      const theta = Math.sqrt(50 * Math.PI) * phi;
      pts.push({
        id: i,
        x: Math.cos(theta) * Math.sin(phi),
        y: Math.sin(theta) * Math.sin(phi),
        z: Math.cos(phi),
        value: Math.random() * 100,
        active: Math.random() > 0.5
      });
    }
    return pts;
  }, []);

  const project = (x, y, z, rot) => {
    const rad = (rot * Math.PI) / 180;
    const rotatedX = x * Math.cos(rad) - z * Math.sin(rad);
    const rotatedZ = x * Math.sin(rad) + z * Math.cos(rad);
    const scale = 1 / (2 - rotatedZ);
    return {
      x: rotatedX * scale * (size / 2.5) + size / 2,
      y: y * scale * (size / 2.5) + size / 2,
      z: rotatedZ,
      scale
    };
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full blur-2xl opacity-30"
        style={{ background: `radial-gradient(circle, ${color}60, transparent 70%)` }} />

      <svg width={size} height={size} className="relative z-10">
        {/* Globe outline circles */}
        {[0.3, 0.5, 0.7, 0.9].map((r, i) => (
          <ellipse key={i} cx={size/2} cy={size/2} rx={size * r / 2.5} ry={size * r / 2.5}
            fill="none" stroke={`${color}20`} strokeWidth="0.5" />
        ))}

        {/* Latitude lines */}
        {[-0.6, -0.3, 0, 0.3, 0.6].map((lat, i) => {
          const r = Math.sqrt(1 - lat * lat) * (size / 2.5);
          return (
            <ellipse key={`lat-${i}`} cx={size/2} cy={size/2 + lat * (size/2.5)} rx={r} ry={r * 0.3}
              fill="none" stroke={`${color}15`} strokeWidth="0.5"
              style={{ transform: `rotateY(${rotation}deg)`, transformOrigin: 'center' }} />
          );
        })}

        {/* Data points */}
        {points.map((point) => {
          const projected = project(point.x, point.y, point.z, rotation);
          if (!projected || projected.z < 0 || !projected.scale || isNaN(projected.x) || isNaN(projected.y)) return null;
          const pointSize = Math.max(2, Math.min(10, 2 + (projected.scale || 0) * 3));
          const opacity = Math.max(0.3, Math.min(1, 0.3 + (projected.z || 0) * 0.7));
          const cx = isNaN(projected.x) ? size / 2 : projected.x;
          const cy = isNaN(projected.y) ? size / 2 : projected.y;

          return (
            <g key={point.id}>
              <circle
                cx={cx}
                cy={cy}
                r={pointSize}
                fill={point.active ? color : `${color}50`}
                opacity={opacity}
                onMouseEnter={() => setHoveredPoint(point.id)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ filter: point.active ? `drop-shadow(0 0 4px ${color})` : 'none', cursor: 'pointer' }}
              />
              {hoveredPoint === point.id && (
                <text x={cx + 10} y={cy} fill={color} fontSize="10" className="font-mono">
                  {point.value.toFixed(0)}%
                </text>
              )}
            </g>
          );
        })}

        {/* Connection lines */}
        {points.filter(p => p.active).slice(0, 10).map((point, i, arr) => {
          if (i === arr.length - 1) return null;
          const p1 = project(point.x, point.y, point.z, rotation);
          const p2 = project(arr[i + 1].x, arr[i + 1].y, arr[i + 1].z, rotation);
          if (p1.z < 0 || p2.z < 0) return null;
          return (
            <motion.line
              key={`line-${i}`}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={color}
              strokeWidth="0.5"
              opacity={0.3}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: i * 0.1 }}
            />
          );
        })}
      </svg>

      {/* Center highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}` }} />
    </div>
  );
};

// ==================== 3D BAR CHART ====================
export const BarChart3D = ({ data = [], height = 200, color = '#22d3ee', interactive = true }) => {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const svgWidth = 300; // Fixed width for viewBox calculations

  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) {
    return <div className="relative" style={{ height }} />;
  }

  const maxValue = Math.max(...data.map(d => d.value || 0), 1);
  const barWidthPercent = 100 / (data.length * 1.5);
  const barWidth = (barWidthPercent / 100) * svgWidth;

  return (
    <div className="relative" style={{ height, perspective: '500px' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ transform: 'rotateX(10deg)' }}>
        <defs>
          <linearGradient id="bar3dGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={`${color}40`} />
          </linearGradient>
          <filter id="bar3dShadow">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor={color} floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((percent, i) => (
          <g key={i}>
            <line x1="0" y1={height - (height * percent / 100) - 20} x2={svgWidth} y2={height - (height * percent / 100) - 20}
              stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
            <text x="5" y={height - (height * percent / 100) - 25} fill="#64748b" fontSize="8" className="font-mono">
              {percent}%
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((item, i) => {
          const barHeight = ((item.value || 0) / maxValue) * (height - 40);
          const xPercent = (i * (100 / data.length)) + (100 / data.length - barWidthPercent) / 2;
          const x = (xPercent / 100) * svgWidth;
          const isHovered = hoveredBar === i;

          return (
            <g key={i}
              onMouseEnter={() => interactive && setHoveredBar(i)}
              onMouseLeave={() => interactive && setHoveredBar(null)}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
            >
              {/* 3D side face */}
              <motion.polygon
                points={`${x},${height - 20} ${x + 9},${height - 25} ${x + 9},${height - 25 - barHeight} ${x},${height - 20 - barHeight}`}
                fill={`${color}60`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              />

              {/* 3D top face */}
              <motion.polygon
                points={`${x},${height - 20 - barHeight} ${x + 9},${height - 25 - barHeight} ${x + barWidth + 9},${height - 25 - barHeight} ${x + barWidth},${height - 20 - barHeight}`}
                fill={`${color}80`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1 + 0.2 }}
              />

              {/* Main bar face */}
              <rect
                x={x}
                y={height - 20 - (barHeight || 0)}
                width={Math.max(1, barWidth || 1)}
                height={Math.max(0, barHeight || 0)}
                fill={isHovered ? color : "url(#bar3dGradient)"}
                filter={isHovered ? "url(#bar3dShadow)" : "none"}
                rx="2"
              />

              {/* Value label */}
              <AnimatePresence>
                {(isHovered || animationComplete) && (
                  <motion.text
                    x={x + barWidth / 2}
                    y={height - 25 - barHeight - 5}
                    textAnchor="middle"
                    fill={color}
                    fontSize="10"
                    className="font-mono font-bold"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {item.value}
                  </motion.text>
                )}
              </AnimatePresence>

              {/* Label */}
              <text x={x + barWidth / 2} y={height - 5} textAnchor="middle" fill="#64748b" fontSize="9">
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ==================== 3D DONUT CHART ====================
export const DonutChart3D = ({ data = [], size = 150, thickness = 25, color = '#22d3ee' }) => {
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const total = data.reduce((acc, d) => acc + d.value, 0);

  let currentAngle = -90;
  const segments = data.map((item, i) => {
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return { ...item, startAngle, angle, index: i };
  });

  const polarToCartesian = (cx, cy, r, angle) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (cx, cy, r, startAngle, endAngle) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  };

  return (
    <div className="relative" style={{ width: size, height: size + 20, perspective: '400px' }}>
      <svg width={size} height={size + 20} style={{ transform: 'rotateX(20deg)' }}>
        <defs>
          {segments.map((seg, i) => (
            <linearGradient key={i} id={`donut3d-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={seg.color || `hsl(${i * 60}, 70%, 60%)`} />
              <stop offset="100%" stopColor={seg.color || `hsl(${i * 60}, 70%, 40%)`} />
            </linearGradient>
          ))}
        </defs>

        {/* 3D depth effect */}
        {segments.map((seg, i) => (
          <path
            key={`depth-${i}`}
            d={describeArc(size/2, size/2 + 10, size/2 - thickness/2, seg.startAngle, seg.startAngle + seg.angle)}
            fill="none"
            stroke={`${seg.color || `hsl(${i * 60}, 70%, 30%)`}`}
            strokeWidth={thickness}
            opacity="0.5"
          />
        ))}

        {/* Main segments */}
        {segments.map((seg, i) => {
          const isHovered = hoveredSegment === i;
          return (
            <motion.path
              key={i}
              d={describeArc(size/2, size/2, size/2 - thickness/2, seg.startAngle, seg.startAngle + seg.angle)}
              fill="none"
              stroke={`url(#donut3d-${i})`}
              strokeWidth={thickness}
              strokeLinecap="round"
              onMouseEnter={() => setHoveredSegment(i)}
              onMouseLeave={() => setHoveredSegment(null)}
              initial={{ pathLength: 0 }}
              animate={{
                pathLength: 1,
                strokeWidth: isHovered ? thickness + 5 : thickness,
                filter: isHovered ? `drop-shadow(0 0 10px ${seg.color || color})` : 'none'
              }}
              transition={{ duration: 1.5, delay: i * 0.2 }}
              style={{ cursor: 'pointer' }}
            />
          );
        })}

        {/* Center text */}
        <text x={size/2} y={size/2 - 5} textAnchor="middle" fill="white" fontSize="20" className="font-bold font-mono">
          {total}
        </text>
        <text x={size/2} y={size/2 + 12} textAnchor="middle" fill="#64748b" fontSize="10">
          Total
        </text>
      </svg>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredSegment !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
          >
            <p className="text-white text-xs font-medium">{segments[hoveredSegment].label}</p>
            <p className="text-cyan-400 text-sm font-mono">{segments[hoveredSegment].value} ({((segments[hoveredSegment].value / total) * 100).toFixed(1)}%)</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==================== WAVE CHART 3D ====================
export const WaveChart3D = ({ data = [], height = 120, color = '#22d3ee', animate = true }) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const interval = setInterval(() => setOffset(o => (o + 1) % 100), 50);
    return () => clearInterval(interval);
  }, [animate]);

  const generateWavePath = (data, yOffset = 0) => {
    if (data.length < 2) return '';
    const max = Math.max(...data, 1);
    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * 100,
      y: height - 20 - ((v / max) * (height - 40)) + yOffset
    }));

    let path = `M 0,${height - 20}`;
    points.forEach((p, i) => {
      if (i === 0) {
        path += ` L ${p.x},${p.y}`;
      } else {
        const prev = points[i - 1];
        const cpx = (prev.x + p.x) / 2;
        path += ` C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
      }
    });
    path += ` L 100,${height - 20} Z`;
    return path;
  };

  return (
    <svg width="100%" height={height} style={{ perspective: '300px' }}>
      <defs>
        <linearGradient id="waveGradient3d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="waveGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Background waves */}
      <motion.path
        d={generateWavePath(data.map(d => d * 0.5), 10)}
        fill={`${color}10`}
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.path
        d={generateWavePath(data.map(d => d * 0.7), 5)}
        fill={`${color}20`}
        animate={{ opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
      />

      {/* Main wave */}
      <motion.path
        d={generateWavePath(data)}
        fill="url(#waveGradient3d)"
        filter="url(#waveGlow)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />

      {/* Wave line */}
      <motion.path
        d={generateWavePath(data).replace(/ L 100,.*/, '').replace(/^M 0,\d+\.?\d* L/, 'M')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2 }}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />

      {/* Data points */}
      {data.map((v, i) => {
        const max = Math.max(...data, 1);
        const x = (i / (data.length - 1)) * 100;
        const y = height - 20 - ((v / max) * (height - 40));
        return (
          <motion.circle
            key={i}
            cx={`${x}%`}
            cy={y}
            r="3"
            fill={color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        );
      })}
    </svg>
  );
};

// ==================== 3D GAUGE ====================
export const Gauge3D = ({ value = 0, max = 100, size = 150, color = '#22d3ee', label = '' }) => {
  const percentage = (value / max) * 100;
  const angle = (percentage / 100) * 270 - 135;

  return (
    <div className="relative" style={{ width: size, height: size * 0.7, perspective: '400px' }}>
      <svg width={size} height={size * 0.7} viewBox="0 0 150 105" style={{ transform: 'rotateX(15deg)' }}>
        <defs>
          <linearGradient id="gaugeGradient3d" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <filter id="gaugeGlow3d">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={color} floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Background arc */}
        <path
          d="M 20 85 A 55 55 0 1 1 130 85"
          fill="none"
          stroke="#1e293b"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* 3D depth */}
        <path
          d="M 20 88 A 55 55 0 1 1 130 88"
          fill="none"
          stroke="#0f172a"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Progress arc */}
        <motion.path
          d="M 20 85 A 55 55 0 1 1 130 85"
          fill="none"
          stroke="url(#gaugeGradient3d)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="283"
          initial={{ strokeDashoffset: 283 }}
          animate={{ strokeDashoffset: 283 - (283 * percentage / 100) }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          filter="url(#gaugeGlow3d)"
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick, i) => {
          const tickAngle = ((tick / 100) * 270 - 135) * (Math.PI / 180);
          const x1 = 75 + 45 * Math.cos(tickAngle);
          const y1 = 75 + 45 * Math.sin(tickAngle);
          const x2 = 75 + 55 * Math.cos(tickAngle);
          const y2 = 75 + 55 * Math.sin(tickAngle);
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#64748b" strokeWidth="2" />
              <text x={75 + 65 * Math.cos(tickAngle)} y={75 + 65 * Math.sin(tickAngle) + 3}
                textAnchor="middle" fill="#64748b" fontSize="8" className="font-mono">
                {tick}
              </text>
            </g>
          );
        })}

        {/* Needle */}
        <motion.g
          initial={{ rotate: -135 }}
          animate={{ rotate: angle }}
          transition={{ duration: 1.5, type: 'spring', damping: 15 }}
          style={{ transformOrigin: '75px 75px' }}
        >
          <polygon
            points="75,30 72,75 75,80 78,75"
            fill={color}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </motion.g>

        {/* Center circle */}
        <circle cx="75" cy="75" r="8" fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
        <circle cx="75" cy="75" r="4" fill="white" />

        {/* Value text */}
        <text x="75" y="100" textAnchor="middle" fill="white" fontSize="18" className="font-bold font-mono">
          {value}
        </text>
      </svg>

      {label && (
        <p className="text-center text-xs text-slate-400 mt-1">{label}</p>
      )}
    </div>
  );
};

// ==================== PARTICLE NETWORK ====================
export const ParticleNetwork = ({ width = 300, height = 200, particleCount = 30, color = '#22d3ee' }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const pts = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 2 + Math.random() * 3
    }));
    setParticles(pts);

    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        x: (p.x + p.vx + width) % width,
        y: (p.y + p.vy + height) % height
      })));
    }, 50);

    return () => clearInterval(interval);
  }, [width, height, particleCount]);

  const connections = useMemo(() => {
    const conns = [];
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60) {
          conns.push({ p1: particles[i], p2: particles[j], opacity: 1 - dist / 60 });
        }
      }
    }
    return conns;
  }, [particles]);

  return (
    <svg width={width} height={height}>
      {/* Connections */}
      {connections.map((conn, i) => (
        <line key={i}
          x1={conn.p1.x} y1={conn.p1.y}
          x2={conn.p2.x} y2={conn.p2.y}
          stroke={color}
          strokeWidth="0.5"
          opacity={conn.opacity * 0.3}
        />
      ))}

      {/* Particles */}
      {particles.map(p => (
        <motion.circle
          key={p.id}
          cx={p.x}
          cy={p.y}
          r={p.size}
          fill={color}
          opacity={0.6}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, delay: p.id * 0.1 }}
          style={{ filter: `drop-shadow(0 0 2px ${color})` }}
        />
      ))}
    </svg>
  );
};

// ==================== ANIMATED COUNTER ====================
export const AnimatedCounter = ({ value = 0, duration = 2, prefix = '', suffix = '', color = '#22d3ee', size = 'lg' }) => {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const [displayValue, setDisplayValue] = useState(safeValue);

  useEffect(() => {
    if (typeof safeValue !== 'number' || isNaN(safeValue)) return;

    let startTime = null;
    const startValue = displayValue;
    const diff = safeValue - startValue;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplayValue(startValue + diff * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [safeValue, duration]);

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl'
  };

  return (
    <motion.span
      className={`font-bold font-mono ${sizeClasses[size]}`}
      style={{ color, textShadow: `0 0 20px ${color}50` }}
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ duration: 0.3 }}
    >
      {prefix}{typeof safeValue === 'number' ? displayValue.toFixed(safeValue % 1 === 0 ? 0 : 1) : safeValue}{suffix}
    </motion.span>
  );
};

// ==================== HOLOGRAPHIC CARD ====================
export const HolographicCard = ({ children, color = '#22d3ee', className = '' }) => {
  const cardRef = useRef(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotation({ x: y * 10, y: -x * 10 });
  };

  const handleMouseLeave = () => setRotation({ x: 0, y: 0 });

  return (
    <motion.div
      ref={cardRef}
      className={`relative rounded-xl overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX: rotation.x, rotateY: rotation.y }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
    >
      {/* Holographic gradient overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(
            ${135 + rotation.y * 5}deg,
            ${color}10 0%,
            transparent 40%,
            ${color}20 50%,
            transparent 60%,
            ${color}10 100%
          )`
        }}
      />

      {/* Border glow */}
      <div className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          boxShadow: `inset 0 0 0 1px ${color}30, 0 0 20px ${color}20`,
          transform: 'translateZ(10px)'
        }}
      />

      {/* Content */}
      <div className="relative z-10" style={{ transform: 'translateZ(20px)' }}>
        {children}
      </div>

      {/* Corner accents */}
      {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
        <motion.div
          key={i}
          className={`absolute w-4 h-4 ${pos}`}
          style={{
            borderTop: i < 2 ? `2px solid ${color}` : 'none',
            borderBottom: i >= 2 ? `2px solid ${color}` : 'none',
            borderLeft: i % 2 === 0 ? `2px solid ${color}` : 'none',
            borderRight: i % 2 === 1 ? `2px solid ${color}` : 'none'
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.25 }}
        />
      ))}
    </motion.div>
  );
};

// ==================== CYBER GRID BACKGROUND ====================
export const CyberGrid = ({ color = '#22d3ee', opacity = 0.1 }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Grid lines */}
    <div className="absolute inset-0"
      style={{
        backgroundImage: `
          linear-gradient(${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px),
          linear-gradient(90deg, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }}
    />

    {/* Perspective grid */}
    <div className="absolute bottom-0 left-0 right-0 h-1/2"
      style={{
        background: `linear-gradient(to bottom, transparent, ${color}05)`,
        transform: 'perspective(500px) rotateX(60deg)',
        transformOrigin: 'bottom'
      }}
    >
      <div className="w-full h-full"
        style={{
          backgroundImage: `
            linear-gradient(${color}20 1px, transparent 1px),
            linear-gradient(90deg, ${color}20 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
    </div>

    {/* Scan line */}
    <motion.div
      className="absolute left-0 right-0 h-px"
      style={{ background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }}
      animate={{ top: ['-5%', '105%'] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

export default {
  Globe3D,
  BarChart3D,
  DonutChart3D,
  WaveChart3D,
  Gauge3D,
  ParticleNetwork,
  AnimatedCounter,
  HolographicCard,
  CyberGrid
};
