// ============================================
// MONTEX COMMAND CENTER ULTRAWIDE — v5 NEXUS
// ============================================
// Dashboard ultra futurista para monitores 49" ultrawide
// Visual cinemático: control tower / mission control
// Real-time monitoring de produção, financeiro, expedição
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, Area, Line,
  ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Activity, AlertTriangle, ArrowUp, ArrowDown, Bell, Building2, CheckCircle2,
  Clock, DollarSign, Factory, Flame, Gauge, Layers, Radio, Signal, Target, TrendingUp, TrendingDown, Truck,
  Wallet, Weight, Wifi, BarChart3, Box, Radar as RadarIcon, Hash, Satellite, Briefcase, Map, PackageX, ShoppingCart,
} from 'lucide-react';
import { useObras, useProducao, useLancamentos, useMedicoes, useEstoque } from '../contexts/ERPContext';
import { useFinancialIntelligence } from '../hooks/useFinancialIntelligence';
import { resumoProducao, bloqueioFabricacao } from '../services/relatorioProducao';
import { resumoMaterialObra } from '../services/estoqueAnalytics';

// ============================================
// THEME — NEXUS Sci-Fi Tactical
// ============================================
const NX = {
  bgPrim: '#020617',
  bgSec: '#030d22',
  surface: 'rgba(6,17,40,0.85)',
  surfaceLight: 'rgba(8,22,52,0.65)',
  border: 'rgba(34,211,238,0.10)',
  borderActive: 'rgba(34,211,238,0.35)',
  cyan: '#22d3ee',
  electric: '#06b6d4',
  amber: '#fbbf24',
  emerald: '#34d399',
  rose: '#fb7185',
  violet: '#a78bfa',
  pink: '#f472b6',
  blue: '#60a5fa',
  text: '#e2e8f0',
  textDim: '#64748b',
  textDarker: '#334155',
};

// ============================================
// FORMATTERS
// ============================================
const fmt = (v) => v == null || isNaN(v) ? '—' : Math.round(v).toLocaleString('pt-BR');
const fmtR$ = (v) => {
  if (v == null || isNaN(v)) return 'R$ —';
  if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}k`;
  return `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
};
const fmtPeso = (kg) => {
  if (kg == null) return '—';
  return Math.abs(kg) >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`;
};
const fmtPct = (v) => v == null || isNaN(v) ? '—' : `${Math.round(v)}%`;
const parseLocalDate = (s) => {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])) : new Date(s);
};

// ============================================
// CORNER BRACKETS (HUD frame)
// ============================================
function CornerBrackets({ color = NX.cyan, size = 12 }) {
  return (
    <>
      <div className="absolute top-0 left-0 pointer-events-none" style={{ width: size, height: size, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <div className="absolute top-0 right-0 pointer-events-none" style={{ width: size, height: size, borderTop: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
      <div className="absolute bottom-0 left-0 pointer-events-none" style={{ width: size, height: size, borderBottom: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <div className="absolute bottom-0 right-0 pointer-events-none" style={{ width: size, height: size, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
    </>
  );
}

// ============================================
// PANEL — base sci-fi panel
// ============================================
function Panel({ children, title, subtitle, accent = NX.cyan, icon: Icon, className = '', headerRight }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative rounded-lg overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(6,17,40,0.85), rgba(2,8,23,0.85))',
        border: `1px solid ${NX.border}`,
        backdropFilter: 'blur(20px)',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 8px 32px -8px rgba(0,0,0,0.5)`,
      }}
    >
      <CornerBrackets color={accent} />
      {/* Top scanline */}
      <div className="absolute top-0 left-3 right-3 h-px" style={{
        background: `linear-gradient(90deg, transparent, ${accent}80, transparent)`,
      }} />
      {(title || subtitle) && (
        <div className="px-4 pt-3 pb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="p-1 rounded" style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}30` }}>
                <Icon className="h-3 w-3" style={{ color: accent }} />
              </div>
            )}
            <div>
              {title && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">{title}</span>
                  <span className="font-mono text-[8px]" style={{ color: NX.textDim }}>// {String([...String(title)].reduce((a, c) => a + c.charCodeAt(0), 0) % 10000).padStart(4, '0')}</span>
                </div>
              )}
              {subtitle && <p className="text-[9px] mt-0.5" style={{ color: NX.textDim }}>{subtitle}</p>}
            </div>
          </div>
          {headerRight}
        </div>
      )}
      <div className="px-4 pb-4">{children}</div>
    </motion.div>
  );
}

// ============================================
// LIVE INDICATOR
// ============================================
function LiveDot({ color = NX.emerald, label = 'LIVE' }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
      </span>
      <span className="font-mono text-[8px] font-bold tracking-widest" style={{ color }}>{label}</span>
    </div>
  );
}

// ============================================
// METRIC CELL — small KPI cell
// ============================================
function MetricCell({ label, value, sub, accent = NX.cyan, icon: Icon, delta }) {
  return (
    <div className="relative p-3 rounded-md overflow-hidden"
      style={{ background: 'rgba(8,22,52,0.4)', border: `1px solid ${accent}25` }}>
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${accent}08 1px, transparent 1px), linear-gradient(90deg, ${accent}08 1px, transparent 1px)`,
        backgroundSize: '12px 12px',
      }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: NX.textDim }}>{label}</span>
          {Icon && <Icon className="h-3 w-3" style={{ color: accent }} />}
        </div>
        <p className="text-xl font-black tabular-nums leading-none" style={{ color: accent, textShadow: `0 0 8px ${accent}40` }}>{value}</p>
        {sub && <p className="text-[9px] mt-1.5" style={{ color: NX.textDim }}>{sub}</p>}
        {delta != null && (
          <div className={`flex items-center gap-0.5 mt-1 text-[9px] font-bold tabular-nums`}
            style={{ color: delta >= 0 ? NX.emerald : NX.rose }}>
            {delta >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
            <span>{Math.abs(delta).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// CIRCULAR GAUGE
// ============================================
function CircularGauge({ value = 0, max = 100, label, sublabel, color = NX.cyan, size = 100 }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const circ = 2 * Math.PI * 36;
  const dashOffset = circ - (pct / 100) * circ;
  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`gauge-${label}-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={36} fill="none" stroke={NX.textDarker} strokeWidth="3" opacity="0.3" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={36} fill="none"
          stroke={`url(#gauge-${label}-${color})`}
          strokeWidth="3"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
        {[...Array(36)].map((_, i) => (
          <line key={i}
            x1={size / 2} y1={4}
            x2={size / 2} y2={9}
            stroke={i * 10 / 100 <= pct / 10 ? color : NX.textDarker}
            strokeWidth="1"
            opacity={i * 10 / 100 <= pct / 10 ? 0.8 : 0.3}
            transform={`rotate(${i * 10} ${size / 2} ${size / 2})`}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-black tabular-nums" style={{ color, textShadow: `0 0 8px ${color}80` }}>{Math.round(pct)}</p>
        <p className="text-[8px] uppercase tracking-widest" style={{ color: NX.textDim }}>{label}</p>
        {sublabel && <p className="text-[7px] mt-0.5 font-mono" style={{ color }}>{sublabel}</p>}
      </div>
    </div>
  );
}

// ============================================
// BAR PROGRESS (linear, with glow)
// ============================================
function BarProgress({ value, max = 100, color = NX.cyan, label, height = 4 }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      {label && (
        <div className="flex justify-between text-[9px] mb-1">
          <span style={{ color: NX.textDim }}>{label}</span>
          <span className="tabular-nums font-bold" style={{ color }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="relative bg-slate-900/60 rounded-full overflow-hidden" style={{ height }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full relative"
          style={{
            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
            boxShadow: `0 0 6px ${color}80, inset 0 0 4px rgba(255,255,255,0.3)`,
          }}
        />
      </div>
    </div>
  );
}

// ============================================
// SCAN LINE — animated
// ============================================
function ScanLine({ color = NX.cyan }) {
  return (
    <motion.div
      className="absolute left-0 right-0 h-px pointer-events-none z-10"
      style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, boxShadow: `0 0 8px ${color}` }}
      animate={{ top: ['0%', '100%', '0%'] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
    />
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function CommandCenterUltrawide() {
  const { obras } = useObras();
  const { pecas } = useProducao();
  const { estoque } = useEstoque();
  const { lancamentosDespesas } = useLancamentos();
  const { medicoes } = useMedicoes();
  const fi = useFinancialIntelligence();

  // Clock
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ===== Production Pipeline (etapas REAIS, por PESO) — fonte: resumoProducao =====
  const resumoProd = useMemo(() => resumoProducao(pecas || []), [pecas]);
  const STAGE_META = {
    fabricacao: { label: 'FAB', icon: Factory, color: NX.amber },
    solda: { label: 'WELD', icon: Flame, color: NX.violet },
    pintura: { label: 'PAINT', icon: Box, color: NX.electric },
    expedido: { label: 'SHIP', icon: Truck, color: NX.emerald },
    enviado: { label: 'FIELD', icon: Map, color: NX.blue },
  };
  const pipeline = useMemo(() => {
    return resumoProd.porEtapa
      .filter((e) => STAGE_META[e.key])
      .map((e) => ({ key: e.key, ...STAGE_META[e.key], qtd: e.qtd, peso: e.peso, count: e.pecas }));
  }, [resumoProd]);

  const totalPcs = resumoProd.totalQtd;
  const totalPeso = resumoProd.totalPeso;
  const pesoConcluido = resumoProd.pesoConcluido;      // enviado + entregue
  const efficiencyPct = resumoProd.progressoPct;        // progresso ponderado por peso

  // ===== GARGALOS DE MATERIAL consolidados (estoque faltante → não fabricável) =====
  const gargalos = useMemo(() => {
    const ativas = (obras || []).filter(o => !['cancelada', 'concluida', 'orcamento'].includes(o.status));
    const estPorObra = new Map();
    (estoque || []).forEach((e) => {
      const oid = e.obraId || e.obra_id;
      if (!oid) return;
      if (!estPorObra.has(oid)) estPorObra.set(oid, []);
      estPorObra.get(oid).push(e);
    });
    let pesoBloqueado = 0, pesoParcial = 0, faltaComprar = 0, nBloqueadas = 0;
    const perfilMap = new Map();
    ativas.forEach((o) => {
      const est = estPorObra.get(o.id);
      if (!est || !est.length) return;
      const pcsObra = (pecas || []).filter((p) => (p.obraId || p.obra_id) === o.id);
      const b = bloqueioFabricacao(pcsObra, resumoMaterialObra(est).linhas);
      if (b.itens.length === 0) return;
      pesoBloqueado += b.pesoBloqueado; pesoParcial += b.pesoParcial;
      faltaComprar += b.faltaComprarTotal; nBloqueadas += b.nBloqueadas;
      (b.porPerfil || []).forEach((g) => {
        if (!perfilMap.has(g.perfil)) perfilMap.set(g.perfil, { perfil: g.perfil, faltaComprar: 0, obras: new Set() });
        const acc = perfilMap.get(g.perfil);
        acc.faltaComprar += g.faltaComprar; acc.obras.add(o.codigo || o.id);
      });
    });
    const topPerfis = [...perfilMap.values()].map((p) => ({ ...p, nObras: p.obras.size }))
      .sort((a, b) => b.faltaComprar - a.faltaComprar).slice(0, 6);
    return {
      pesoBloqueado, pesoParcial, faltaComprar, nBloqueadas,
      pctTravado: totalPeso > 0 ? ((pesoBloqueado + pesoParcial) / totalPeso * 100) : 0,
      topPerfis,
    };
  }, [estoque, obras, pecas, totalPeso]);

  // ===== Financial state =====
  const recMes = fi.kpisGerais?.faturamentoRealMes || 0;
  const desMes = fi.kpisGerais?.despesaMensalMedia || 0;
  const margem = fi.kpisGerais?.margemReal || 0;
  const saldo = fi.kpisGerais?.saldoReal || 0;
  const meta = fi.kpisGerais?.metaReceitaDinamica || 0;

  // ===== Backlog =====
  const obrasAtivas = useMemo(() => (obras || []).filter(o => !['cancelada','concluida','orcamento'].includes(o.status)), [obras]);
  const backlog = obrasAtivas.reduce((s, o) => s + (o.contratoValorTotal || o.valorContrato || 0), 0);

  // ===== Cash flow chart =====
  const cashFlow = useMemo(() => {
    if (!fi.evolucaoMensal) return [];
    return fi.evolucaoMensal.slice(-6).map(m => ({
      mes: m.mesLabel,
      rec: m.faturamentoReal || 0,
      des: m.custo || 0,
      lucro: (m.faturamentoReal || 0) - (m.custo || 0),
    }));
  }, [fi]);

  // ===== Radar das obras (progresso ponderado por PESO) =====
  const radarObras = useMemo(() => {
    return obrasAtivas.slice(0, 6).map(o => {
      const pcsObra = (pecas || []).filter(p => (p.obraId || p.obra_id) === o.id);
      return {
        obra: (o.codigo || o.id).slice(-6),
        producao: Math.round(resumoProducao(pcsObra).progressoPct),
      };
    });
  }, [obrasAtivas, pecas]);

  // ===== Stage distribution (donut) — por peso =====
  const stageDist = pipeline.filter(p => p.peso > 0).map(p => ({ name: p.label, value: Math.round(p.peso), fill: p.color }));

  // ===== Alerts =====
  const alerts = useMemo(() => {
    const arr = [];
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const atrasadas = (lancamentosDespesas || []).filter(l => {
      if (l.status === 'pago') return false;
      const v = parseLocalDate(l.dataVencimento || l.data_vencimento);
      return v && v < hoje;
    });
    if (atrasadas.length > 0) {
      arr.push({ severity: 'critical', icon: AlertTriangle, msg: `${atrasadas.length} despesa(s) ATRASADA(S)`, sub: fmtR$(atrasadas.reduce((s, a) => s + (a.valor || 0), 0)) });
    }
    if (gargalos.nBloqueadas > 0) arr.push({ severity: 'critical', icon: PackageX, msg: `${gargalos.nBloqueadas} PEÇA(S) SEM MATERIAL`, sub: `${fmtPeso(gargalos.pesoBloqueado)} · comprar ${fmtPeso(gargalos.faltaComprar)}` });
    if (margem < 0) arr.push({ severity: 'critical', icon: TrendingDown, msg: 'MARGEM NEGATIVA', sub: `${margem.toFixed(1)}%` });
    if (saldo < 0) arr.push({ severity: 'warn', icon: Wallet, msg: 'SALDO CAIXA NEGATIVO', sub: fmtR$(saldo) });
    const proxVenc = (lancamentosDespesas || []).filter(l => {
      if (l.status === 'pago') return false;
      const v = parseLocalDate(l.dataVencimento || l.data_vencimento);
      const em7 = new Date(); em7.setDate(em7.getDate() + 7);
      return v && v >= hoje && v <= em7;
    });
    if (proxVenc.length > 0) arr.push({ severity: 'info', icon: Clock, msg: `${proxVenc.length} venc. em 7 dias`, sub: fmtR$(proxVenc.reduce((s, a) => s + (a.valor || 0), 0)) });
    if (arr.length === 0) arr.push({ severity: 'ok', icon: CheckCircle2, msg: 'SISTEMAS OPERACIONAIS', sub: 'No alerts' });
    return arr;
  }, [lancamentosDespesas, margem, saldo, gargalos]);

  // ===== System health score =====
  const sysHealth = useMemo(() => {
    const fScore = Math.max(0, Math.min(100, (margem / 25) * 100));
    const pScore = Math.round(efficiencyPct);
    const lScore = recMes >= meta ? 90 : Math.round(recMes / Math.max(1, meta) * 100);
    const total = (fScore + pScore + lScore) / 3;
    return Math.round(total);
  }, [margem, efficiencyPct, recMes, meta]);

  return (
    <div className="min-h-screen -m-4 p-4 relative overflow-hidden"
      style={{ background: NX.bgPrim }}>
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none opacity-30" style={{
        backgroundImage: `
          linear-gradient(${NX.cyan}05 1px, transparent 1px),
          linear-gradient(90deg, ${NX.cyan}05 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Radial gradient overlays */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${NX.cyan}, transparent 70%)` }} />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] rounded-full opacity-15 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${NX.violet}, transparent 70%)` }} />

      {/* ============================================ */}
      {/* HEADER — Command Bar                          */}
      {/* ============================================ */}
      <div className="relative mb-4 rounded-lg overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(6,17,40,0.95), rgba(15,28,60,0.9))',
          border: `1px solid ${NX.borderActive}`,
          boxShadow: `0 0 30px ${NX.cyan}15, inset 0 1px 0 ${NX.cyan}20`,
        }}>
        <CornerBrackets color={NX.cyan} size={16} />
        <div className="px-6 py-3 flex items-center justify-between">
          {/* Left: logo + title */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-lg blur-lg opacity-60" style={{ backgroundColor: NX.cyan }} />
              <div className="relative p-2 rounded-lg" style={{ background: `linear-gradient(135deg, ${NX.cyan}40, ${NX.violet}30)`, border: `1px solid ${NX.borderActive}` }}>
                <Satellite className="h-5 w-5" style={{ color: NX.cyan }} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: NX.cyan }}>MONTEX NEXUS // ULTRAWIDE_CMD</span>
                <LiveDot />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white" style={{ textShadow: `0 0 12px ${NX.cyan}40` }}>
                COMMAND CENTER
              </h1>
            </div>
          </div>

          {/* Middle: live metrics */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="font-mono text-[8px] uppercase tracking-widest" style={{ color: NX.textDim }}>active obras</p>
              <p className="text-xl font-black tabular-nums" style={{ color: NX.cyan }}>{obrasAtivas.length}</p>
            </div>
            <div className="w-px h-10" style={{ background: NX.border }} />
            <div className="text-center">
              <p className="font-mono text-[8px] uppercase tracking-widest" style={{ color: NX.textDim }}>throughput</p>
              <p className="text-xl font-black tabular-nums" style={{ color: NX.amber }}>{fmt(totalPcs)}<span className="text-xs"> pcs</span></p>
            </div>
            <div className="w-px h-10" style={{ background: NX.border }} />
            <div className="text-center">
              <p className="font-mono text-[8px] uppercase tracking-widest" style={{ color: NX.textDim }}>tonnage</p>
              <p className="text-xl font-black tabular-nums" style={{ color: NX.violet }}>{fmtPeso(totalPeso)}</p>
            </div>
            <div className="w-px h-10" style={{ background: NX.border }} />
            <div className="text-center">
              <p className="font-mono text-[8px] uppercase tracking-widest" style={{ color: NX.textDim }}>system health</p>
              <p className="text-xl font-black tabular-nums" style={{
                color: sysHealth >= 75 ? NX.emerald : sysHealth >= 50 ? NX.amber : NX.rose,
                textShadow: `0 0 8px ${sysHealth >= 75 ? NX.emerald : sysHealth >= 50 ? NX.amber : NX.rose}60`
              }}>{sysHealth}<span className="text-xs">%</span></p>
            </div>
          </div>

          {/* Right: clock + status */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-mono text-2xl font-black text-white tabular-nums">{now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
              <p className="font-mono text-[9px]" style={{ color: NX.textDim }}>{now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <Signal className="h-3 w-3" style={{ color: NX.emerald }} />
                <Wifi className="h-3 w-3" style={{ color: NX.emerald }} />
                <Radio className="h-3 w-3" style={{ color: NX.cyan }} />
              </div>
              <p className="font-mono text-[8px] uppercase tracking-widest" style={{ color: NX.emerald }}>ONLINE</p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* MAIN GRID — 12 columns ultrawide              */}
      {/* ============================================ */}
      <div className="relative grid grid-cols-12 gap-3">

        {/* === ROW 1 === */}

        {/* Production Pipeline (left, span 5) */}
        <Panel title="Production Pipeline" subtitle="Real-time stage distribution" icon={Factory} accent={NX.amber} className="col-span-5 row-span-2"
          headerRight={<LiveDot color={NX.amber} label="STREAMING" />}>
          <div className="space-y-3 mt-2">
            {pipeline.map((stage, i) => (
              <motion.div key={stage.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-1 rounded" style={{ backgroundColor: `${stage.color}15`, border: `1px solid ${stage.color}40` }}>
                    <stage.icon className="h-3 w-3" style={{ color: stage.color }} />
                  </div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest flex-1" style={{ color: stage.color }}>{stage.label}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black tabular-nums" style={{ color: stage.color, textShadow: `0 0 6px ${stage.color}40` }}>{fmtPeso(stage.peso)}</span>
                    <span className="font-mono text-[10px] tabular-nums" style={{ color: stage.color, opacity: 0.6 }}>{fmt(stage.qtd)} pcs</span>
                  </div>
                </div>
                <BarProgress value={stage.peso} max={totalPeso || 1} color={stage.color} height={3} />
              </motion.div>
            ))}
            {/* Throughput total */}
            <div className="pt-3 mt-3 border-t flex items-center justify-between" style={{ borderColor: NX.border }}>
              <div>
                <p className="font-mono text-[8px] uppercase tracking-widest" style={{ color: NX.textDim }}>total throughput</p>
                <p className="text-2xl font-black tabular-nums" style={{ color: NX.cyan, textShadow: `0 0 8px ${NX.cyan}40` }}>{fmt(totalPcs)}<span className="text-sm ml-1">pcs</span></p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[8px] uppercase tracking-widest" style={{ color: NX.textDim }}>efficiency</p>
                <p className="text-2xl font-black tabular-nums" style={{ color: NX.emerald, textShadow: `0 0 8px ${NX.emerald}40` }}>{fmtPct(efficiencyPct)}</p>
              </div>
            </div>
          </div>
        </Panel>

        {/* Gauges Grid (center, span 4) */}
        <Panel title="System Vitals" subtitle="Composite scores [0-100]" icon={Gauge} accent={NX.violet} className="col-span-4">
          <div className="grid grid-cols-3 gap-2 mt-1">
            <div className="flex flex-col items-center">
              <CircularGauge value={efficiencyPct} max={100} label="PROD" sublabel={fmtPeso(pesoConcluido)} color={NX.cyan} size={90} />
            </div>
            <div className="flex flex-col items-center">
              <CircularGauge value={margem} max={50} label="MARGIN" sublabel={fmtPct(margem)} color={margem >= 15 ? NX.emerald : margem >= 0 ? NX.amber : NX.rose} size={90} />
            </div>
            <div className="flex flex-col items-center">
              <CircularGauge value={meta > 0 ? (recMes / meta * 100) : 0} max={100} label="TARGET" sublabel={fmtR$(recMes)} color={NX.violet} size={90} />
            </div>
          </div>
        </Panel>

        {/* Alerts (right, span 3) */}
        <Panel title="Alert System" subtitle="Tactical notifications" icon={Bell} accent={NX.rose} className="col-span-3 row-span-2"
          headerRight={<span className="font-mono text-[8px] tabular-nums" style={{ color: NX.rose }}>{alerts.filter(a => a.severity !== 'ok').length}</span>}>
          <div className="space-y-2 mt-1">
            {alerts.map((a, i) => {
              const c = a.severity === 'critical' ? NX.rose
                : a.severity === 'warn' ? NX.amber
                : a.severity === 'info' ? NX.cyan
                : NX.emerald;
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="relative p-2 rounded-md"
                  style={{ background: `${c}10`, border: `1px solid ${c}40` }}>
                  <div className="flex items-start gap-2">
                    <a.icon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: c }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: c }}>{a.msg}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: NX.text }}>{a.sub}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Panel>

        {/* === ROW 2 === */}

        {/* Financial Quad (center after pipeline) */}
        <div className="col-span-4 grid grid-cols-2 gap-3">
          <MetricCell label="receita mês" value={fmtR$(recMes)} sub={`meta ${fmtR$(meta)}`} accent={NX.emerald} icon={DollarSign} />
          <MetricCell label="despesa mês" value={fmtR$(desMes)} sub="custo total" accent={NX.rose} icon={Flame} />
          <MetricCell label="lucro mês" value={fmtR$(recMes - desMes)} sub={`margem ${fmtPct(margem)}`} accent={NX.blue} icon={TrendingUp} />
          <MetricCell label="backlog" value={fmtR$(backlog)} sub={`${obrasAtivas.length} obras`} accent={NX.violet} icon={Briefcase} />
        </div>

        {/* Material Bottleneck (full width) — estoque faltante × não fabricável */}
        <Panel title="Material Bottleneck" subtitle="Estoque faltante × peças não fabricáveis · prioridade de compra" icon={PackageX} accent={NX.rose} className="col-span-12"
          headerRight={<span className="font-mono text-[8px] tabular-nums" style={{ color: gargalos.pesoBloqueado > 0 ? NX.rose : NX.emerald }}>{fmtPct(gargalos.pctTravado)} TRAVADO</span>}>
          {gargalos.pesoBloqueado === 0 && gargalos.pesoParcial === 0 ? (
            <div className="flex items-center gap-2 py-3">
              <CheckCircle2 className="h-4 w-4" style={{ color: NX.emerald }} />
              <span className="text-[11px]" style={{ color: NX.emerald }}>Nenhum gargalo de material nas obras com estoque cadastrado</span>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-3 mt-1">
              <div className="col-span-4 grid grid-cols-3 gap-2">
                <MetricCell label="não fabricável" value={fmtPeso(gargalos.pesoBloqueado)} sub={`${fmt(gargalos.nBloqueadas)} pç`} accent={NX.rose} icon={PackageX} />
                <MetricCell label="parcial" value={fmtPeso(gargalos.pesoParcial)} sub="parte chegou" accent={NX.amber} icon={Layers} />
                <MetricCell label="falta comprar" value={fmtPeso(gargalos.faltaComprar)} sub="total" accent={NX.cyan} icon={ShoppingCart} />
              </div>
              <div className="col-span-8">
                <p className="font-mono text-[8px] uppercase tracking-widest mb-2" style={{ color: NX.textDim }}>prioridade de compra — perfis (kg agregado entre obras)</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {gargalos.topPerfis.map((p) => {
                    const max = gargalos.topPerfis[0]?.faltaComprar || 1;
                    return (
                      <div key={p.perfil}>
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span style={{ color: NX.text }}>{p.perfil} <span style={{ color: NX.textDim }}>· {p.nObras} obra(s)</span></span>
                          <span className="tabular-nums font-bold" style={{ color: NX.cyan }}>{fmtPeso(p.faltaComprar)}</span>
                        </div>
                        <BarProgress value={p.faltaComprar} max={max} color={NX.cyan} height={3} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Panel>

        {/* === ROW 3 === */}

        {/* Cash Flow Chart (span 7) */}
        <Panel title="Cash Flow Analysis" subtitle="Receita × Despesa × Lucro [6mo]" icon={BarChart3} accent={NX.cyan} className="col-span-7">
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={cashFlow}>
              <defs>
                <linearGradient id="rec-cmd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={NX.emerald} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={NX.emerald} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="des-cmd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={NX.rose} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={NX.rose} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={NX.border} />
              <XAxis dataKey="mes" stroke={NX.textDim} fontSize={9} fontFamily="monospace" />
              <YAxis stroke={NX.textDim} fontSize={9} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: NX.bgPrim, border: `1px solid ${NX.borderActive}`, fontSize: '10px', borderRadius: '4px' }} formatter={(v) => fmtR$(v)} />
              <Area type="monotone" dataKey="rec" name="Receita" stroke={NX.emerald} fill="url(#rec-cmd)" strokeWidth={2} />
              <Area type="monotone" dataKey="des" name="Despesa" stroke={NX.rose} fill="url(#des-cmd)" strokeWidth={2} />
              <Line type="monotone" dataKey="lucro" name="Lucro" stroke={NX.cyan} strokeWidth={2.5} dot={{ r: 3, fill: NX.cyan, stroke: NX.cyan }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        {/* Stage Distribution Donut (span 2) */}
        <Panel title="Stage Mix" subtitle="Distribuição" icon={Layers} accent={NX.violet} className="col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stageDist} dataKey="value" innerRadius={40} outerRadius={70} paddingAngle={2}>
                {stageDist.map((s, i) => <Cell key={i} fill={s.fill} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />)}
              </Pie>
              <Tooltip contentStyle={{ background: NX.bgPrim, border: `1px solid ${NX.borderActive}`, fontSize: '10px', borderRadius: '4px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        {/* Radar das obras (span 3) */}
        <Panel title="Obras Performance" subtitle="Top 6 % conclusão" icon={RadarIcon} accent={NX.electric} className="col-span-3">
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarObras}>
              <PolarGrid stroke={NX.border} />
              <PolarAngleAxis dataKey="obra" stroke={NX.textDim} fontSize={9} fontFamily="monospace" />
              <PolarRadiusAxis stroke={NX.textDim} fontSize={8} angle={90} />
              <Radar name="Conclusão %" dataKey="producao" stroke={NX.electric} fill={NX.electric} fillOpacity={0.3} strokeWidth={2} />
              <Tooltip contentStyle={{ background: NX.bgPrim, border: `1px solid ${NX.borderActive}`, fontSize: '10px', borderRadius: '4px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </Panel>

        {/* === ROW 4 === Active Obras List + Status grid === */}

        {/* Active Obras Big List (span 8) */}
        <Panel title="Active Operations" subtitle="Obras em execução com métricas de progresso" icon={Building2} accent={NX.cyan} className="col-span-8"
          headerRight={<span className="font-mono text-[8px]" style={{ color: NX.cyan }}>{obrasAtivas.length} ATIVAS</span>}>
          <div className="grid grid-cols-2 gap-2 mt-1 max-h-72 overflow-y-auto custom-scroll">
            {obrasAtivas.slice(0, 8).map((o) => {
              const pcsObra = (pecas || []).filter(p => (p.obraId || p.obra_id) === o.id);
              const rp = resumoProducao(pcsObra);
              const pct = rp.progressoPct;
              const valor = o.contratoValorTotal || o.valorContrato || 0;
              const c = pct >= 75 ? NX.emerald : pct >= 50 ? NX.cyan : pct >= 25 ? NX.amber : NX.rose;
              return (
                <div key={o.id} className="relative p-3 rounded-md group hover:bg-cyan-500/5 transition-all"
                  style={{ background: 'rgba(8,22,52,0.4)', border: `1px solid ${NX.border}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${c}15`, color: c, border: `1px solid ${c}40` }}>{o.codigo}</span>
                      <span className="text-xs font-bold truncate" style={{ color: NX.text }}>{o.nome}</span>
                    </div>
                    <span className="text-lg font-black tabular-nums flex-shrink-0 ml-2" style={{ color: c, textShadow: `0 0 6px ${c}40` }}>{Math.round(pct)}%</span>
                  </div>
                  <BarProgress value={pct} max={100} color={c} height={3} />
                  <div className="flex items-center justify-between mt-2 text-[9px]">
                    <span className="font-mono" style={{ color: NX.textDim }}>{fmtPeso(rp.pesoConcluido)}/{fmtPeso(rp.totalPeso)}</span>
                    <span className="font-mono tabular-nums" style={{ color: NX.violet }}>{fmtR$(valor)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Side: Forecast + Quick Stats (span 4) */}
        <div className="col-span-4 grid grid-cols-1 gap-3">
          <Panel title="Forecast Stats" subtitle="Projeção próximos 30d" icon={Target} accent={NX.amber}>
            <div className="space-y-2 mt-1">
              <div className="flex items-center justify-between p-2 rounded" style={{ background: 'rgba(8,22,52,0.4)', border: `1px solid ${NX.border}` }}>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: NX.textDim }}>receita projetada</p>
                  <p className="text-base font-black tabular-nums" style={{ color: NX.emerald }}>{fmtR$(fi.forecast?.receitaProjetada || recMes)}</p>
                </div>
                <Target className="h-4 w-4" style={{ color: NX.emerald }} />
              </div>
              <div className="flex items-center justify-between p-2 rounded" style={{ background: 'rgba(8,22,52,0.4)', border: `1px solid ${NX.border}` }}>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: NX.textDim }}>despesa projetada</p>
                  <p className="text-base font-black tabular-nums" style={{ color: NX.rose }}>{fmtR$(fi.forecast?.despesaProjetada || desMes)}</p>
                </div>
                <Flame className="h-4 w-4" style={{ color: NX.rose }} />
              </div>
              <div className="flex items-center justify-between p-2 rounded" style={{ background: 'rgba(8,22,52,0.4)', border: `1px solid ${NX.borderActive}` }}>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: NX.textDim }}>saldo projetado</p>
                  <p className="text-base font-black tabular-nums" style={{ color: NX.cyan, textShadow: `0 0 6px ${NX.cyan}40` }}>{fmtR$((fi.forecast?.receitaProjetada || recMes) - (fi.forecast?.despesaProjetada || desMes))}</p>
                </div>
                <TrendingUp className="h-4 w-4" style={{ color: NX.cyan }} />
              </div>
            </div>
          </Panel>

          <Panel title="Operational KPIs" subtitle="Métricas chave" icon={Hash} accent={NX.electric}>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <MetricCell label="ticket médio" value={fmtR$(obrasAtivas.length > 0 ? backlog / obrasAtivas.length : 0)} accent={NX.cyan} icon={DollarSign} />
              <MetricCell label="peso médio/obra" value={fmtPeso(obrasAtivas.length > 0 ? totalPeso / obrasAtivas.length : 0)} accent={NX.amber} icon={Weight} />
              <MetricCell label="recebidas mês" value={fmt((medicoes || []).filter(m => {
                const d = parseLocalDate(m.dataMedicao || m.data_medicao);
                const ini = new Date(); ini.setDate(1); ini.setHours(0,0,0,0);
                return d && d >= ini && ['paga','pago','recebido','faturado','confirmado'].includes(m.status);
              }).length)} accent={NX.emerald} icon={CheckCircle2} />
              <MetricCell label="produtividade" value={fmtPct(efficiencyPct)} accent={NX.violet} icon={Activity} />
            </div>
          </Panel>
        </div>

      </div>

      {/* Bottom status bar */}
      <div className="mt-4 flex items-center justify-between text-[9px] font-mono px-2" style={{ color: NX.textDim }}>
        <div className="flex items-center gap-4">
          <LiveDot color={NX.emerald} label="DATA_STREAM" />
          <span>SOURCE: SUPABASE_REALTIME</span>
          <span>LATENCY: ~120ms</span>
        </div>
        <span>MONTEX NEXUS v5.0 // ULTRAWIDE_CMD</span>
        <div className="flex items-center gap-4">
          <span>SESSION: {now.toISOString().slice(11, 19)}</span>
          <span style={{ color: NX.cyan }}>● SECURE</span>
        </div>
      </div>

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: ${NX.cyan}40; border-radius: 2px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: ${NX.cyan}80; }
      `}</style>
    </div>
  );
}
