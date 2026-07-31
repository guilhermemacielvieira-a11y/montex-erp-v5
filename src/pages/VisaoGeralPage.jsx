// ============================================
// MONTEX VISÃO GERAL — HUD Operacional Sci-Fi
// ============================================
// Painel futurista com analytics profundo:
// - Score Saúde Sistêmica + gauges
// - Pipeline produção (peças/peso por etapa)
// - Forecast cash flow 6 meses
// - Heatmap atividade (24h × 7 dias)
// - Comparativo mês × mês
// - Ranking obras + funcionários
// - Activity feed live + alertas
// ============================================

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, AlertTriangle, Cpu, Shield, Truck, Wrench, RefreshCw, TrendingUp,
  TrendingDown, CheckCircle2, Radio, Power,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { useObras, useProducao, useLancamentos, useMedicoes } from '../contexts/ERPContext';
import { useFinancialIntelligence } from '../hooks/useFinancialIntelligence';
import { supabase } from '../api/supabaseClient';

// ============================================
// HELPERS
// ============================================
const fmt = (v) => v == null || isNaN(v) ? '—' : Math.round(v).toLocaleString('pt-BR');
const fmtR$ = (v) => v == null || isNaN(v) ? 'R$ —' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
const fmtR$k = (v) => v == null || isNaN(v) ? '—' : 'R$ ' + (Math.round(v / 1000)).toLocaleString('pt-BR') + 'k';
const fmtPeso = (kg) => {
  if (kg == null || isNaN(kg)) return '—';
  if (Math.abs(kg) >= 1000) return (kg / 1000).toFixed(1) + 't';
  return Math.round(kg) + 'kg';
};
const fmtPct = (v) => v == null || isNaN(v) ? '—' : Math.round(v) + '%';
const parseLocalDate = (s) => {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  return new Date(s);
};
const COR_ETAPAS = {
  fabricacao: '#3b82f6', solda: '#8b5cf6', pintura: '#ec4899',
  expedido: '#10b981', enviado: '#06b6d4', corte: '#f59e0b', aguardando: '#64748b',
};

// ============================================
// HOOK: clock em tempo real
// ============================================
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ============================================
// HOOK: histórico de produção (últimos 30 dias)
// ============================================
function useHistoricoProducao() {
  const [data, setData] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const { data: rows } = await supabase
          .from('producao_historico')
          .select('id,peca_id,funcionario_nome,etapa_de,etapa_para,data_inicio,observacoes,created_at')
          .gte('data_inicio', since.toISOString())
          .order('data_inicio', { ascending: true })
          .limit(5000);
        // Normaliza p/ o formato esperado pela pagina: a tabela tem data_inicio
        // (nao data_movimentacao) e a quantidade vive em observacoes ([QTD:n/total]).
        const norm = (rows || []).map((h) => {
          const m = /\[QTD:(\d+)/.exec(h.observacoes || '');
          return { ...h, data_movimentacao: h.data_inicio || h.created_at, quantidade: m ? parseInt(m[1], 10) : 1 };
        });
        setData(norm);
      } catch (e) { /* ignore */ }
    })();
  }, []);
  return data;
}

// ============================================
// COMPONENT: HUD Gauge Circular
// ============================================
function HUDGauge({ value, max = 100, label, color = '#06b6d4', size = 110, suffix = '%', sublabel }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const R = size / 2 - 8;
  const C = 2 * Math.PI * R;
  const offset = C - (pct / 100) * C;
  const gradId = `grad-${label || 'g'}-${color.replace('#','')}`;
  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <circle cx={size/2} cy={size/2} r={R} stroke="#1e293b" strokeWidth="6" fill="none" />
          <motion.circle
            cx={size/2} cy={size/2} r={R}
            stroke={`url(#${gradId})`} strokeWidth="6" fill="none" strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white tabular-nums">{Math.round(value)}{suffix}</span>
          {sublabel && <span className="text-[8px] text-slate-500 uppercase">{sublabel}</span>}
        </div>
      </div>
      {label && <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-1">{label}</span>}
    </div>
  );
}

// ============================================
// COMPONENT: HUD Panel wrapper
// ============================================
function HUDPanel({ children, title, glow = '#06b6d4', className = '', subtitle, status = 'online', headerRight }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative rounded-lg border backdrop-blur-md overflow-hidden ${className}`}
      style={{
        backgroundColor: 'rgba(2,6,23,0.85)',
        borderColor: `${glow}40`,
        boxShadow: `0 0 20px ${glow}15, inset 0 0 30px ${glow}05`,
      }}
    >
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l rounded-tl" style={{ borderColor: glow }} />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r rounded-tr" style={{ borderColor: glow }} />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l rounded-bl" style={{ borderColor: glow }} />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r rounded-br" style={{ borderColor: glow }} />

      {title && (
        <div className="flex items-center justify-between px-3 pt-2 pb-1.5 border-b" style={{ borderColor: `${glow}25` }}>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: glow, boxShadow: `0 0 6px ${glow}` }} />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: glow }}>{title}</h3>
            {subtitle && <span className="text-[9px] text-slate-500">· {subtitle}</span>}
          </div>
          {headerRight ?? <span className="text-[8px] text-slate-600 uppercase tracking-wider">{status}</span>}
        </div>
      )}
      <div className="p-3">{children}</div>
    </motion.div>
  );
}

// ============================================
// COMPONENT: Sparkline mini
// ============================================
function Sparkline({ data, color = '#06b6d4', height = 30 }) {
  if (!data || data.length === 0) return <div style={{ height }} className="bg-slate-800/30 rounded" />;
  const id = `spk-${color.replace('#','')}-${Math.random().toString(36).slice(2,7)}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data.map((v, i) => ({ i, v }))}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ============================================
// MAIN
// ============================================
export default function VisaoGeralPage() {
  const { obras } = useObras();
  const { pecas } = useProducao();
  const { lancamentosDespesas } = useLancamentos();
  const { medicoes } = useMedicoes();
  const fi = useFinancialIntelligence();
  const historico = useHistoricoProducao();
  const now = useClock();
  const [bootMs, setBootMs] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setBootMs(Date.now() - start), 1000);
    return () => clearInterval(t);
  }, []);

  // ===== KPIs produção =====
  const kpis = useMemo(() => {
    const pcs = pecas || [];
    const total = pcs.reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
    const buckets = { fabricacao: 0, solda: 0, pintura: 0, expedido: 0, enviado: 0 };
    pcs.forEach(p => {
      const qtd = parseInt(p.quantidade) || 1;
      const e = p.etapa;
      if (['fabricacao','aguardando','corte'].includes(e)) buckets.fabricacao += qtd;
      else if (e === 'solda') buckets.solda += qtd;
      else if (e === 'pintura') buckets.pintura += qtd;
      else if (e === 'expedido') buckets.expedido += qtd;
      else if (['enviado','entregue','montagem'].includes(e)) buckets.enviado += qtd;
    });
    const pesoTotal = pcs.reduce((s, p) => s + (parseFloat(p.pesoTotal) || parseFloat(p.peso) || 0), 0);
    const pesoFin = pcs.filter(p => ['expedido','enviado','entregue','montagem'].includes(p.etapa))
      .reduce((s, p) => s + (parseFloat(p.pesoTotal) || parseFloat(p.peso) || 0), 0);
    const pct = total > 0 ? (buckets.expedido + buckets.enviado) / total * 100 : 0;
    return { total, ...buckets, pesoTotal, pesoFin, pct };
  }, [pecas]);

  // ===== Sparkline produção últimos 30 dias =====
  const sparkProducao = useMemo(() => {
    const arr = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i)); d.setHours(0,0,0,0);
      const fim = new Date(d); fim.setDate(fim.getDate() + 1);
      const qtd = (historico || []).filter(h => {
        const md = new Date(h.data_movimentacao);
        return md >= d && md < fim;
      }).reduce((s, h) => s + (parseInt(h.quantidade) || 1), 0);
      return qtd;
    });
    return arr;
  }, [historico]);

  // ===== Heatmap atividade (7 dias × 24h) =====
  const heatmap = useMemo(() => {
    // matriz[dia][hora] = qtd lançamentos
    const matriz = Array.from({ length: 7 }, () => Array(24).fill(0));
    const labelsDias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    let maxVal = 0;
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const inicio = new Date(hoje); inicio.setDate(inicio.getDate() - 6);
    (historico || []).forEach(h => {
      const d = new Date(h.data_movimentacao);
      if (d < inicio) return;
      const diaIdx = d.getDay();
      const horaIdx = d.getHours();
      matriz[diaIdx][horaIdx] += parseInt(h.quantidade) || 1;
      if (matriz[diaIdx][horaIdx] > maxVal) maxVal = matriz[diaIdx][horaIdx];
    });
    return { matriz, labelsDias, max: maxVal || 1 };
  }, [historico]);

  // ===== Score Saúde Sistêmica =====
  const score = useMemo(() => {
    const margem = fi.kpisGerais?.margemReal || 0;
    const fScore = Math.max(0, Math.min(100, (margem / 25) * 100));
    const pScore = kpis.pct;
    const expedScore = kpis.total > 0 ? Math.min(100, (kpis.expedido / kpis.total) * 100 * 1.5) : 0;
    // Bonus se receita real > 0
    const rScore = (fi.kpisGerais?.faturamentoRealMes || 0) > 0 ? 80 : 40;
    return Math.round((fScore * 0.3 + pScore * 0.3 + expedScore * 0.2 + rScore * 0.2));
  }, [kpis, fi]);
  const scoreCor = score >= 80 ? '#10b981' : score >= 60 ? '#06b6d4' : score >= 40 ? '#f59e0b' : '#ef4444';
  const scoreLabel = score >= 80 ? 'OPTIMAL' : score >= 60 ? 'NOMINAL' : score >= 40 ? 'CAUTION' : 'CRITICAL';

  // ===== Obras ativas =====
  const obrasAtivas = useMemo(() => {
    return (obras || []).filter(o => !['cancelada','cancelado','concluida','concluido','pausado','pausada','orcamento'].includes(o.status));
  }, [obras]);

  // ===== Cash flow 6 meses =====
  const cashFlow = useMemo(() => {
    if (!fi.evolucaoMensal) return [];
    return fi.evolucaoMensal.slice(-6).map(m => ({
      mes: m.mesLabel,
      receita: m.faturamentoReal || 0,
      despesa: m.custo || 0,
      saldo: (m.faturamentoReal || 0) - (m.custo || 0),
    }));
  }, [fi]);

  // ===== Pipeline =====
  const pipelineData = useMemo(() => [
    { name: 'FAB', value: kpis.fabricacao, peso: 0, cor: COR_ETAPAS.fabricacao },
    { name: 'SOLDA', value: kpis.solda, peso: 0, cor: COR_ETAPAS.solda },
    { name: 'PINT', value: kpis.pintura, peso: 0, cor: COR_ETAPAS.pintura },
    { name: 'EXPED', value: kpis.expedido, peso: 0, cor: COR_ETAPAS.expedido },
    { name: 'ENVD', value: kpis.enviado, peso: 0, cor: COR_ETAPAS.enviado },
  ], [kpis]);

  // ===== Comparativo Mês vs Anterior =====
  const comparativoMes = useMemo(() => {
    if (!fi.comparativo) return null;
    return fi.comparativo;
  }, [fi]);

  // ===== Radar das obras (top 5) =====
  const radarObras = useMemo(() => {
    const ativas = obrasAtivas.slice(0, 5);
    return ativas.map(o => {
      const pcsObra = (pecas || []).filter(p => p.obraId === o.id);
      const tot = pcsObra.reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
      const fin = pcsObra.filter(p => ['expedido','enviado','entregue','montagem'].includes(p.etapa))
        .reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
      const pct = tot > 0 ? (fin / tot) * 100 : 0;
      return { obra: o.codigo || o.id, valor: Math.round(pct) };
    });
  }, [obrasAtivas, pecas]);

  // ===== Alertas =====
  const alertas = useMemo(() => {
    const al = [];
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const atrasadas = (lancamentosDespesas || []).filter(l => {
      if (l.status === 'pago') return false;
      const v = parseLocalDate(l.dataVencimento || l.data_vencimento);
      return v && v < hoje;
    });
    if (atrasadas.length > 0) {
      al.push({ nivel: 'CRIT', icon: AlertTriangle, msg: `${atrasadas.length} despesas atrasadas`, valor: fmtR$(atrasadas.reduce((s, a) => s + (a.valor || 0), 0)) });
    }
    if (kpis.fabricacao > 200) {
      al.push({ nivel: 'WARN', icon: Wrench, msg: `${fmt(kpis.fabricacao)} pcs paradas em fabricação`, valor: 'Possível gargalo' });
    }
    if ((fi.kpisGerais?.saldoReal || 0) < 0) {
      al.push({ nivel: 'CRIT', icon: TrendingDown, msg: 'Saldo mensal negativo', valor: fmtR$(fi.kpisGerais?.saldoReal) });
    }
    if (kpis.expedido > 50) {
      al.push({ nivel: 'INFO', icon: Truck, msg: `${fmt(kpis.expedido)} pcs aguardando embarque`, valor: fmtPeso(kpis.pesoFin) });
    }
    return al;
  }, [lancamentosDespesas, kpis, fi]);

  // ===== Activity feed =====
  const activityFeed = useMemo(() => {
    return [...(historico || [])].reverse().slice(0, 15);
  }, [historico]);

  // ===== Ranking funcionários =====
  const ranking = useMemo(() => {
    const map = {};
    (historico || []).forEach(h => {
      const n = h.funcionario_nome || 'Sem nome';
      if (!map[n]) map[n] = { nome: n, qtd: 0, etapas: new Set() };
      map[n].qtd += parseInt(h.quantidade) || 1;
      map[n].etapas.add(h.etapa_para || h.etapa_de);
    });
    return Object.values(map)
      .map(r => ({ ...r, etapas: Array.from(r.etapas).slice(0, 3).join('·') }))
      .sort((a, b) => b.qtd - a.qtd).slice(0, 8);
  }, [historico]);

  // ===== Próximos vencimentos =====
  const proxVenc = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    return (lancamentosDespesas || [])
      .filter(l => {
        if (l.status === 'pago') return false;
        const v = parseLocalDate(l.dataVencimento || l.data_vencimento);
        if (!v) return false;
        const dias = Math.round((v - hoje) / 86400000);
        return dias >= -7 && dias <= 14;
      })
      .map(l => {
        const v = parseLocalDate(l.dataVencimento || l.data_vencimento);
        const dias = v ? Math.round((v - hoje) / 86400000) : 0;
        return { ...l, dias };
      })
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 6);
  }, [lancamentosDespesas]);

  const hora = now.toLocaleTimeString('pt-BR');

  return (
    <div className="space-y-3 -m-4 p-3" style={{
      background: 'radial-gradient(ellipse at top, #0a1929 0%, #050510 50%, #000 100%)',
      minHeight: 'calc(100vh - 0px)',
    }}>
      {/* ============================================ */}
      {/* HEADER COMMAND BAR                          */}
      {/* ============================================ */}
      <div className="grid grid-cols-12 gap-3 items-center bg-slate-950/80 border border-cyan-700/30 rounded-lg p-3 backdrop-blur-md"
        style={{ boxShadow: '0 0 30px rgba(6,182,212,0.1)' }}>
        <div className="col-span-3 flex items-center gap-3">
          <div className="relative">
            <Cpu className="h-7 w-7 text-cyan-400" style={{ filter: 'drop-shadow(0 0 6px #06b6d4)' }} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-widest">MONTEX <span className="text-cyan-400">VISÃO GERAL</span></h1>
            <p className="text-[10px] text-slate-500 tracking-wider">SYS::OPERATIONAL-HUD · V5 · ALL MODULES ONLINE</p>
          </div>
        </div>

        <div className="col-span-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[8px] text-slate-500 uppercase tracking-widest">Date</p>
            <p className="text-xs text-cyan-300 font-mono">{now.toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-[8px] text-slate-500 uppercase tracking-widest">Time</p>
            <p className="text-xs text-cyan-300 font-mono tabular-nums">{hora}</p>
          </div>
          <div>
            <p className="text-[8px] text-slate-500 uppercase tracking-widest">Session</p>
            <p className="text-xs text-emerald-300 font-mono tabular-nums">{String(Math.floor((bootMs/60000)%60)).padStart(2,'0')}:{String(Math.floor((bootMs/1000)%60)).padStart(2,'0')}</p>
          </div>
        </div>

        <div className="col-span-3 flex items-center justify-center gap-4">
          <HUDGauge value={score} sublabel="health" color={scoreCor} size={70} />
          <div>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">System Status</p>
            <p className="text-lg font-black tracking-wider" style={{ color: scoreCor }}>{scoreLabel}</p>
            <p className="text-[9px] text-slate-500">Score: {score}/100</p>
          </div>
        </div>

        <div className="col-span-3 flex items-center justify-end gap-3">
          <div className="flex items-center gap-1.5 text-[10px]">
            <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
            <span className="text-emerald-400 uppercase tracking-wider">Live</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <Shield className="h-3 w-3 text-blue-400" />
            <span className="text-blue-400 uppercase tracking-wider">Secure</span>
          </div>
          <button onClick={() => window.location.reload()}
            className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded text-[10px] text-cyan-300 uppercase tracking-wider flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />Refresh
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* 4 GAUGES PRINCIPAIS                         */}
      {/* ============================================ */}
      <div className="grid grid-cols-12 gap-3">
        <HUDPanel className="col-span-3" title="PRODUCTION" glow="#3b82f6" subtitle="conclusão geral">
          <div className="flex items-center gap-3">
            <HUDGauge value={kpis.pct} color="#3b82f6" size={90} sublabel="completo" />
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Total</span><span className="text-white font-bold tabular-nums">{fmt(kpis.total)}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Finalizado</span><span className="text-emerald-300 font-bold tabular-nums">{fmt(kpis.expedido + kpis.enviado)}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Peso total</span><span className="text-white font-bold tabular-nums">{fmtPeso(kpis.pesoTotal)}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Peso pronto</span><span className="text-emerald-300 font-bold tabular-nums">{fmtPeso(kpis.pesoFin)}</span></div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/60">
            <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">30-day trend</p>
            <Sparkline data={sparkProducao} color="#3b82f6" height={28} />
          </div>
        </HUDPanel>

        <HUDPanel className="col-span-3" title="FINANCIAL" glow="#10b981" subtitle="margem operacional">
          <div className="flex items-center gap-3">
            <HUDGauge value={Math.max(0, Math.min(100, fi.kpisGerais?.margemReal || 0))} color="#10b981" size={90} sublabel="margem" />
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Receita</span><span className="text-emerald-300 font-bold tabular-nums">{fmtR$k(fi.kpisGerais?.faturamentoRealMes || 0)}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Despesa</span><span className="text-rose-300 font-bold tabular-nums">{fmtR$k(fi.kpisGerais?.despesaMensalMedia || 0)}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Saldo</span><span className={`font-bold tabular-nums ${(fi.kpisGerais?.saldoReal || 0) >= 0 ? 'text-blue-300' : 'text-rose-300'}`}>{fmtR$k(fi.kpisGerais?.saldoReal || 0)}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Margem</span><span className="text-amber-300 font-bold tabular-nums">{(fi.kpisGerais?.margemReal || 0).toFixed(1)}%</span></div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/60">
            <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Cash flow 6M</p>
            <Sparkline data={cashFlow.map(c => c.saldo)} color="#10b981" height={28} />
          </div>
        </HUDPanel>

        <HUDPanel className="col-span-3" title="SHIPPING" glow="#06b6d4" subtitle="expedição & envios">
          <div className="flex items-center gap-3">
            <HUDGauge value={kpis.total > 0 ? (kpis.expedido + kpis.enviado) / kpis.total * 100 : 0} color="#06b6d4" size={90} sublabel="enviado" />
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Fila embarque</span><span className="text-cyan-300 font-bold tabular-nums">{fmt(kpis.expedido)} pcs</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Já enviado</span><span className="text-emerald-300 font-bold tabular-nums">{fmt(kpis.enviado)} pcs</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Em pintura</span><span className="text-pink-300 font-bold tabular-nums">{fmt(kpis.pintura)} pcs</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Em solda</span><span className="text-purple-300 font-bold tabular-nums">{fmt(kpis.solda)} pcs</span></div>
            </div>
          </div>
        </HUDPanel>

        <HUDPanel className="col-span-3" title="ALERTS" glow={alertas.length > 0 ? '#ef4444' : '#10b981'} subtitle={`${alertas.length} ativos`}
          status={alertas.length > 0 ? 'alert' : 'online'}>
          <div className="flex items-center gap-3">
            <HUDGauge value={Math.max(0, 100 - alertas.length * 15)} color={alertas.length > 0 ? '#ef4444' : '#10b981'} size={90} sublabel="health" />
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Críticos</span><span className="text-red-300 font-bold tabular-nums">{alertas.filter(a => a.nivel === 'CRIT').length}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Atenção</span><span className="text-amber-300 font-bold tabular-nums">{alertas.filter(a => a.nivel === 'WARN').length}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Informativos</span><span className="text-cyan-300 font-bold tabular-nums">{alertas.filter(a => a.nivel === 'INFO').length}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">Obras ativas</span><span className="text-white font-bold tabular-nums">{obrasAtivas.length}</span></div>
            </div>
          </div>
        </HUDPanel>
      </div>

      {/* ============================================ */}
      {/* PIPELINE + CASH FLOW + RADAR                */}
      {/* ============================================ */}
      <div className="grid grid-cols-12 gap-3">
        {/* Pipeline */}
        <HUDPanel className="col-span-4" title="PIPELINE PRODUÇÃO" glow="#8b5cf6" subtitle="peças por etapa">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pipelineData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                {pipelineData.map((d, i) => (
                  <linearGradient key={i} id={`bar-${d.name}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={d.cor} stopOpacity={1} />
                    <stop offset="100%" stopColor={d.cor} stopOpacity={0.4} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#475569" fontSize={10} tick={{ fill: '#94a3b8', fontFamily: 'monospace' }} />
              <YAxis stroke="#475569" fontSize={9} tick={{ fill: '#64748b' }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', fontSize: '10px' }}
                formatter={(v) => [fmt(v) + ' pcs', '']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {pipelineData.map((e, i) => <Cell key={i} fill={`url(#bar-${e.name})`} stroke={e.cor} strokeWidth={1} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-5 gap-1 mt-2 text-center">
            {pipelineData.map(d => (
              <div key={d.name} className="text-[9px]">
                <p className="text-slate-500 uppercase tracking-wider">{d.name}</p>
                <p className="font-bold tabular-nums" style={{ color: d.cor }}>{fmt(d.value)}</p>
              </div>
            ))}
          </div>
        </HUDPanel>

        {/* Cash Flow */}
        <HUDPanel className="col-span-5" title="CASH FLOW ANALYSIS" glow="#10b981" subtitle="receitas × despesas 6M">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={cashFlow}>
              <defs>
                <linearGradient id="recArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" />
              <XAxis dataKey="mes" stroke="#475569" fontSize={10} tick={{ fill: '#94a3b8' }} />
              <YAxis stroke="#475569" fontSize={9} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fill: '#64748b' }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', fontSize: '10px' }}
                formatter={(v) => fmtR$(v)} />
              <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
              <Area type="monotone" dataKey="receita" name="Receita" stroke="#10b981" strokeWidth={2} fill="url(#recArea)" />
              <Bar dataKey="despesa" name="Despesa" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={20} />
              <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3, fill: '#06b6d4' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </HUDPanel>

        {/* Radar Obras */}
        <HUDPanel className="col-span-3" title="OBRAS RADAR" glow="#ec4899" subtitle="top 5 conclusão">
          {radarObras.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarObras}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="obra" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} />
                <PolarRadiusAxis stroke="#1e293b" tick={{ fill: '#475569', fontSize: 9 }} />
                <Radar name="Conclusão" dataKey="valor" stroke="#ec4899" fill="#ec4899" fillOpacity={0.4}
                  style={{ filter: 'drop-shadow(0 0 4px #ec4899)' }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px]">
              <p className="text-xs text-slate-500 italic">Sem obras ativas</p>
            </div>
          )}
        </HUDPanel>
      </div>

      {/* ============================================ */}
      {/* HEATMAP + COMPARATIVO + OBRAS LISTA          */}
      {/* ============================================ */}
      <div className="grid grid-cols-12 gap-3">
        {/* Heatmap atividade */}
        <HUDPanel className="col-span-5" title="ACTIVITY HEATMAP" glow="#f59e0b" subtitle="últimos 7 dias × 24h">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="flex items-center gap-px mb-1 ml-8">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="w-[14px] text-center text-[8px] text-slate-600 font-mono">
                    {h % 4 === 0 ? `${h}h` : ''}
                  </div>
                ))}
              </div>
              {heatmap.matriz.map((row, di) => (
                <div key={di} className="flex items-center gap-px mb-px">
                  <div className="w-7 text-[9px] text-slate-500 font-mono uppercase">{heatmap.labelsDias[di]}</div>
                  {row.map((val, hi) => {
                    const intensity = val / heatmap.max;
                    const bg = val === 0
                      ? 'rgba(15,23,42,0.4)'
                      : `rgba(245, 158, 11, ${0.15 + intensity * 0.85})`;
                    return (
                      <div key={hi}
                        title={`${heatmap.labelsDias[di]} ${hi}h: ${val} movs`}
                        className="w-[14px] h-[14px] rounded-[2px] transition-all hover:ring-1 hover:ring-amber-400"
                        style={{
                          backgroundColor: bg,
                          boxShadow: intensity > 0.5 ? `0 0 4px rgba(245,158,11,${intensity})` : 'none',
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[9px] text-slate-500">
            <span>Total semana: <strong className="text-amber-300">{fmt(heatmap.matriz.flat().reduce((s, v) => s + v, 0))}</strong> movs</span>
            <div className="flex items-center gap-1">
              <span>Menor</span>
              {[0.15, 0.35, 0.55, 0.75, 1].map((i, idx) => (
                <div key={idx} className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: `rgba(245,158,11,${i})` }} />
              ))}
              <span>Maior</span>
            </div>
          </div>
        </HUDPanel>

        {/* Comparativo mês × anterior */}
        <HUDPanel className="col-span-3" title="MONTH-OVER-MONTH" glow="#3b82f6" subtitle="comparativo">
          <div className="space-y-2">
            {comparativoMes ? (
              <>
                <div className="bg-slate-900/40 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-emerald-300 uppercase tracking-wider">Receita</span>
                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${comparativoMes.deltaReceitas >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {comparativoMes.deltaReceitas >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(comparativoMes.deltaReceitas || 0).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-base font-black text-white tabular-nums">{fmtR$k(comparativoMes.atual?.receitas || 0)}</p>
                  <p className="text-[9px] text-slate-500">vs {fmtR$k(comparativoMes.anterior?.receitas || 0)}</p>
                </div>
                <div className="bg-slate-900/40 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-rose-300 uppercase tracking-wider">Despesa</span>
                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${comparativoMes.deltaDespesas <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {comparativoMes.deltaDespesas >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(comparativoMes.deltaDespesas || 0).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-base font-black text-white tabular-nums">{fmtR$k(comparativoMes.atual?.despesas || 0)}</p>
                  <p className="text-[9px] text-slate-500">vs {fmtR$k(comparativoMes.anterior?.despesas || 0)}</p>
                </div>
                <div className="bg-slate-900/40 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-blue-300 uppercase tracking-wider">Lucro</span>
                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${comparativoMes.deltaLucro >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {comparativoMes.deltaLucro >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(comparativoMes.deltaLucro || 0).toFixed(1)}%
                    </span>
                  </div>
                  <p className={`text-base font-black tabular-nums ${(comparativoMes.atual?.lucro || 0) >= 0 ? 'text-blue-300' : 'text-rose-300'}`}>{fmtR$k(comparativoMes.atual?.lucro || 0)}</p>
                  <p className="text-[9px] text-slate-500">vs {fmtR$k(comparativoMes.anterior?.lucro || 0)}</p>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500 italic text-center py-4">Sem dados de comparação</p>
            )}
          </div>
        </HUDPanel>

        {/* Obras lista compacta */}
        <HUDPanel className="col-span-4" title="ACTIVE OPERATIONS" glow="#3b82f6" subtitle={`${obrasAtivas.length} obras`}>
          <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
            {obrasAtivas.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">Sem operações ativas</p>
            ) : obrasAtivas.map(o => {
              const pcsObra = (pecas || []).filter(p => p.obraId === o.id);
              const tot = pcsObra.reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
              const fin = pcsObra.filter(p => ['expedido','enviado','entregue','montagem'].includes(p.etapa))
                .reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
              const pct = tot > 0 ? Math.round((fin / tot) * 100) : 0;
              const cor = pct >= 80 ? '#10b981' : pct >= 50 ? '#06b6d4' : pct >= 25 ? '#f59e0b' : '#ef4444';
              return (
                <div key={o.id} className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 rounded p-2 transition-all">
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-[9px] text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">{o.codigo}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate font-medium">{o.nome}</p>
                      <p className="text-[9px] text-slate-500">{fmt(fin)}/{fmt(tot)} · {fmtR$k(o.contratoValorTotal || o.valorContrato || 0)}</p>
                    </div>
                    <p className="text-sm font-black tabular-nums" style={{ color: cor }}>{pct}%</p>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }}
                      className="h-full rounded-full" style={{ backgroundColor: cor, boxShadow: `0 0 4px ${cor}80` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </HUDPanel>
      </div>

      {/* ============================================ */}
      {/* ACTIVITY FEED + RANKING + ALERTAS + VENCIMENTOS */}
      {/* ============================================ */}
      <div className="grid grid-cols-12 gap-3">
        {/* Activity Feed */}
        <HUDPanel className="col-span-3" title="ACTIVITY FEED" glow="#06b6d4" subtitle="últimas movs">
          <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
            {activityFeed.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">Aguardando dados...</p>
            ) : activityFeed.map((h, i) => {
              const tempo = new Date(h.data_movimentacao);
              const diff = (new Date() - tempo) / 60000;
              const tempoTxt = diff < 60 ? `${Math.round(diff)}m` : diff < 1440 ? `${Math.round(diff/60)}h` : `${Math.round(diff/1440)}d`;
              const corEtapa = COR_ETAPAS[h.etapa_para] || '#94a3b8';
              return (
                <div key={i} className="flex items-center gap-2 text-[10px] py-1 border-b border-slate-800/50">
                  <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: corEtapa, boxShadow: `0 0 4px ${corEtapa}` }} />
                  <span className="text-slate-500 font-mono w-7 flex-shrink-0">{tempoTxt}</span>
                  <span className="text-cyan-300 truncate flex-1">{(h.funcionario_nome || '—').split(' ')[0]}</span>
                  <span className="text-slate-400 uppercase font-mono text-[9px]">{h.etapa_para}</span>
                  <span className="text-white font-bold ml-1 tabular-nums">×{h.quantidade}</span>
                </div>
              );
            })}
          </div>
        </HUDPanel>

        {/* Ranking funcionários */}
        <HUDPanel className="col-span-3" title="TOP PERFORMERS" glow="#f59e0b" subtitle="ranking mês">
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {ranking.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">Sem lançamentos</p>
            ) : ranking.map((f, i) => {
              const max = ranking[0]?.qtd || 1;
              const pct = (f.qtd / max) * 100;
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
              return (
                <div key={i} className="bg-slate-900/40 rounded p-1.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-[10px] flex-shrink-0">{medal}</span>
                      <span className="text-[11px] text-white truncate">{f.nome}</span>
                    </div>
                    <span className="text-amber-300 font-bold text-xs tabular-nums ml-2">{fmt(f.qtd)}</span>
                  </div>
                  <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${pct}%`, boxShadow: '0 0 4px #f59e0b' }} />
                  </div>
                  <p className="text-[8px] text-slate-500 truncate mt-0.5 uppercase">{f.etapas}</p>
                </div>
              );
            })}
          </div>
        </HUDPanel>

        {/* Alertas */}
        <HUDPanel className="col-span-3" title="ALERT SYSTEM" glow={alertas.length ? '#ef4444' : '#10b981'} subtitle={`${alertas.length} alerts`}
          status={alertas.length ? 'alert' : 'online'}>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {alertas.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-emerald-300 uppercase tracking-wider">All Systems Nominal</p>
              </div>
            ) : alertas.map((a, i) => {
              const cor = a.nivel === 'CRIT' ? '#ef4444' : a.nivel === 'WARN' ? '#f59e0b' : '#06b6d4';
              const Icon = a.icon;
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-slate-900/60 border-l-2 rounded-r p-2 flex items-start gap-2"
                  style={{ borderLeftColor: cor }}
                >
                  <Icon className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: cor }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: cor }}>[{a.nivel}]</span>
                    </div>
                    <p className="text-[10px] text-white">{a.msg}</p>
                    {a.valor && <p className="text-[9px] text-slate-400">{a.valor}</p>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </HUDPanel>

        {/* Próximos vencimentos */}
        <HUDPanel className="col-span-3" title="UPCOMING PAYMENTS" glow="#ec4899" subtitle="próximos 14 dias">
          <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
            {proxVenc.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">Sem vencimentos próximos</p>
            ) : proxVenc.map((l, i) => {
              const cor = l.dias < 0 ? '#ef4444' : l.dias <= 2 ? '#f59e0b' : l.dias <= 7 ? '#06b6d4' : '#64748b';
              return (
                <div key={i} className="bg-slate-900/40 rounded p-1.5 border-l-2" style={{ borderLeftColor: cor }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] text-white truncate flex-1">{l.descricao || l.fornecedor || '—'}</p>
                    <span className="text-[9px] font-bold tabular-nums whitespace-nowrap" style={{ color: cor }}>
                      {l.dias < 0 ? `${Math.abs(l.dias)}d atraso` : l.dias === 0 ? 'HOJE' : `${l.dias}d`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] mt-0.5">
                    <span className="text-slate-500 truncate">{l.fornecedor}</span>
                    <span className="text-rose-300 font-bold tabular-nums ml-2">{fmtR$(l.valor || 0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </HUDPanel>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[9px] text-slate-600 px-2 py-1 border-t border-slate-800/50">
        <div className="flex items-center gap-4">
          <span>MONTEX ERP V5 · VISÃO GERAL HUD</span>
          <span className="flex items-center gap-1"><Activity className="h-2.5 w-2.5 text-emerald-400" /> SUPABASE LIVE</span>
          <span className="flex items-center gap-1"><Power className="h-2.5 w-2.5 text-emerald-400" /> ALL SYSTEMS GO</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono">SESS::{Date.now().toString(36).toUpperCase().slice(-8)}</span>
        </div>
      </div>
    </div>
  );
}
