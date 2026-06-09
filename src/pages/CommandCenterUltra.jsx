// ============================================
// MONTEX COMMAND CENTER ULTRA — v5 OMEGA
// ============================================
// Operations control deep-dive: foco em pessoas, produção,
// financeiro consolidado e timeline operacional. Visual
// industrial / blueprint com toque executivo.
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, Area, Line,
  ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Treemap,
} from 'recharts';
import { AlertTriangle, ArrowUp, ArrowDown, Briefcase, Calendar, CheckCircle2, DollarSign, Factory,
  Flame, Layers, TrendingUp, Truck, Users, Wallet, Zap,
  BarChart3, ArrowRight, Box, Map, Cog,
} from 'lucide-react';
import { useObras, useProducao, useLancamentos, useMedicoes } from '../contexts/ERPContext';
import { useFinancialIntelligence } from '../hooks/useFinancialIntelligence';

// ============================================
// THEME — OMEGA Industrial Blueprint
// ============================================
const OM = {
  // Base
  bgDeep: '#040814',
  bgPanel: '#0a1124',
  bgPanelAlt: '#0d1830',
  bgRail: '#06091a',
  border: 'rgba(96,165,250,0.15)',
  borderStrong: 'rgba(96,165,250,0.4)',
  // Brand
  blue: '#60a5fa',
  blueDeep: '#3b82f6',
  navy: '#1e3a8a',
  orange: '#fb923c',
  amber: '#fbbf24',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  rose: '#fb7185',
  violet: '#a78bfa',
  cyan: '#22d3ee',
  // Text
  text: '#e5e7eb',
  textBright: '#f3f4f6',
  textDim: '#6b7280',
  textDimmer: '#4b5563',
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
const fmtR$Full = (v) => v == null ? 'R$ —' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
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
// SECTION HEADER (Blueprint title-block style)
// ============================================
function Section({ children, title, sub, icon: Icon, accent = OM.blue, className = '', action }) {
  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(180deg, ${OM.bgPanel}, ${OM.bgPanelAlt})`,
        border: `1px solid ${OM.border}`,
        boxShadow: '0 4px 24px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.02)',
      }}>
      {/* Title block */}
      <div className="relative px-4 py-2.5 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${OM.border}`, background: 'rgba(96,165,250,0.03)' }}>
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-1.5 rounded" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
              <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
            </div>
          )}
          <div>
            <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.15em]">{title}</h3>
            {sub && <p className="text-[9px] mt-0.5" style={{ color: OM.textDim }}>{sub}</p>}
          </div>
        </div>
        {action}
        {/* Right accent bar */}
        <div className="absolute right-0 top-0 bottom-0 w-1" style={{ background: `linear-gradient(180deg, ${accent}, transparent)` }} />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ============================================
// STAT BLOCK
// ============================================
function StatBlock({ label, value, sub, accent = OM.blue, icon: Icon, delta, deltaPositive }) {
  const isPositive = deltaPositive !== undefined ? deltaPositive : (delta || 0) >= 0;
  return (
    <div className="relative p-4 rounded-lg group hover:border-blue-500/30 transition-all"
      style={{ background: OM.bgPanel, border: `1px solid ${OM.border}` }}>
      <div className="absolute top-0 left-0 w-12 h-0.5" style={{ background: accent }} />
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: OM.textDim }}>{label}</p>
        </div>
        {Icon && (
          <div className="p-1.5 rounded" style={{ background: `${accent}12` }}>
            <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
          </div>
        )}
      </div>
      <p className="text-2xl font-black tabular-nums leading-none" style={{ color: OM.textBright }}>{value}</p>
      {sub && <p className="text-[10px] mt-2" style={{ color: OM.textDim }}>{sub}</p>}
      {delta != null && (
        <div className={`flex items-center gap-1 mt-2 text-[11px] font-bold`}
          style={{ color: isPositive ? OM.emerald : OM.rose }}>
          {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          <span className="tabular-nums">{Math.abs(delta).toFixed(1)}%</span>
          <span style={{ color: OM.textDim }} className="font-normal">vs anterior</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// FLOW STAGE (production funnel)
// ============================================
function FlowStage({ label, value, percent, color, icon: Icon, isLast }) {
  return (
    <div className="flex items-center flex-1 min-w-0">
      <div className="flex-1 rounded-lg p-3 relative overflow-hidden"
        style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
        <div className="absolute bottom-0 left-0 h-1" style={{ width: `${percent}%`, background: color, boxShadow: `0 0 8px ${color}80` }} />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color }}>{label}</span>
          {Icon && <Icon className="h-3 w-3" style={{ color }} />}
        </div>
        <p className="text-xl font-black tabular-nums" style={{ color: OM.textBright, textShadow: `0 0 6px ${color}30` }}>{fmt(value)}</p>
        <p className="text-[9px] mt-0.5 tabular-nums" style={{ color: OM.textDim }}>{percent.toFixed(1)}% do total</p>
      </div>
      {!isLast && (
        <div className="px-2 flex-shrink-0">
          <ArrowRight className="h-4 w-4" style={{ color: OM.textDim }} />
        </div>
      )}
    </div>
  );
}

// ============================================
// PROGRESS RING (compact)
// ============================================
function ProgressRing({ value, size = 60, color = OM.blue, label, sub }) {
  const radius = (size - 8) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size + 14 }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={OM.textDimmer} strokeWidth="3" opacity="0.3" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 3px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: -7 }}>
        <span className="text-sm font-black tabular-nums" style={{ color }}>{Math.round(pct)}%</span>
      </div>
      {label && <p className="text-[9px] mt-0.5 truncate uppercase tracking-wider font-semibold" style={{ color: OM.textDim, maxWidth: size + 20 }}>{label}</p>}
    </div>
  );
}

// ============================================
// BAR LIST
// ============================================
function BarList({ items, color = OM.blue, valueFormatter = fmt, max }) {
  const m = max || items.reduce((mx, i) => Math.max(mx, i.value), 1);
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const pct = (item.value / m) * 100;
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs truncate" style={{ color: OM.text }}>{item.label}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: item.color || color }}>{valueFormatter(item.value)}</span>
            </div>
            <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: OM.bgRail }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: i * 0.04 }}
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${item.color || color}, ${item.color || color}80)`,
                  boxShadow: `0 0 4px ${item.color || color}60`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// MAIN
// ============================================
export default function CommandCenterUltra() {
  const { obras } = useObras();
  const { pecas } = useProducao();
  const { lancamentosDespesas } = useLancamentos();
  const { medicoes } = useMedicoes();
  const fi = useFinancialIntelligence();

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // ===== Pipeline =====
  const pipeline = useMemo(() => {
    const stages = [
      { key: 'fabricacao', label: 'Fabricação', icon: Factory, color: OM.blue },
      { key: 'corte', label: 'Corte', icon: Zap, color: OM.amber },
      { key: 'solda', label: 'Solda', icon: Flame, color: OM.violet },
      { key: 'pintura', label: 'Pintura', icon: Box, color: OM.cyan },
      { key: 'expedicao', label: 'Expedição', icon: Truck, color: OM.emerald },
    ];
    const total = (pecas || []).reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
    return stages.map(s => {
      const qtd = (pecas || []).filter(p => p.etapa === s.key)
        .reduce((sum, p) => sum + (parseInt(p.quantidade) || 1), 0);
      return { ...s, qtd, total, percent: total > 0 ? (qtd / total * 100) : 0 };
    });
  }, [pecas]);

  const totalPcs = (pecas || []).reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
  const finalizadas = (pecas || []).filter(p => ['expedido','enviado','entregue','montagem'].includes(p.etapa))
    .reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
  const eficiencia = totalPcs > 0 ? (finalizadas / totalPcs * 100) : 0;

  // ===== Financial Top Line =====
  const recMes = fi.kpisGerais?.faturamentoRealMes || 0;
  const desMes = fi.kpisGerais?.despesaMensalMedia || 0;
  const margem = fi.kpisGerais?.margemReal || 0;
  const saldo = fi.kpisGerais?.saldoReal || 0;
  const comp = fi.comparativo || {};

  const obrasAtivas = (obras || []).filter(o => !['cancelada','concluida','orcamento'].includes(o.status));
  const backlog = obrasAtivas.reduce((s, o) => s + (o.contratoValorTotal || o.valorContrato || 0), 0);

  // ===== Funcionários produção (por etapa) =====
  const funcionarios = useMemo(() => {
    const map = {};
    (pecas || []).forEach(p => {
      ['fabricacao','solda','pintura','corte','expedicao'].forEach(et => {
        const f = p[`funcionario_${et}`] || p[`func_${et}`];
        if (f && p.etapa === et) {
          if (!map[f]) map[f] = { nome: f, total: 0, etapas: {} };
          const qtd = parseInt(p.quantidade) || 1;
          map[f].total += qtd;
          map[f].etapas[et] = (map[f].etapas[et] || 0) + qtd;
        }
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [pecas]);

  // ===== Cash Flow histórico =====
  const cashHist = useMemo(() => {
    if (!fi.evolucaoMensal) return [];
    return fi.evolucaoMensal.slice(-6).map(m => ({
      mes: m.mesLabel,
      receita: m.faturamentoReal || 0,
      despesa: m.custo || 0,
      lucro: (m.faturamentoReal || 0) - (m.custo || 0),
    }));
  }, [fi]);

  // ===== Próximos Vencimentos =====
  const proxVenc = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const em30 = new Date(); em30.setDate(em30.getDate() + 30);
    return (lancamentosDespesas || [])
      .filter(l => {
        if (l.status === 'pago') return false;
        const v = parseLocalDate(l.dataVencimento || l.data_vencimento);
        return v && v >= hoje && v <= em30;
      })
      .sort((a, b) => parseLocalDate(a.dataVencimento || a.data_vencimento) - parseLocalDate(b.dataVencimento || b.data_vencimento))
      .slice(0, 6);
  }, [lancamentosDespesas]);

  // ===== Atrasadas =====
  const atrasadas = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    return (lancamentosDespesas || []).filter(l => {
      if (l.status === 'pago') return false;
      const v = parseLocalDate(l.dataVencimento || l.data_vencimento);
      return v && v < hoje;
    });
  }, [lancamentosDespesas]);

  const atrasadasTotal = atrasadas.reduce((s, a) => s + (a.valor || 0), 0);

  // ===== Obras ranking =====
  const obrasRank = useMemo(() => {
    return obrasAtivas.map(o => {
      const pcsObra = (pecas || []).filter(p => p.obraId === o.id);
      const tot = pcsObra.reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
      const fin = pcsObra.filter(p => ['expedido','enviado','entregue','montagem'].includes(p.etapa))
        .reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
      const recObra = (medicoes || []).filter(m => (m.obraId || m.obra_id) === o.id
        && ['paga','pago','recebido','faturado','confirmado'].includes(m.status))
        .reduce((s, m) => s + (m.valorBruto || m.valor_bruto || 0), 0);
      const valor = o.contratoValorTotal || o.valorContrato || 0;
      return {
        ...o,
        pcs: tot, fin, valor, recObra,
        prog: tot > 0 ? (fin / tot * 100) : 0,
        fatura: valor > 0 ? (recObra / valor * 100) : 0,
      };
    }).sort((a, b) => b.valor - a.valor).slice(0, 6);
  }, [obrasAtivas, pecas, medicoes]);

  // ===== Categorias despesa =====
  const categorias = useMemo(() => {
    const map = {};
    (lancamentosDespesas || []).forEach(l => {
      if (l.obraId || l.obra_id) return;
      const cat = l.categoria || 'Outros';
      if (!map[cat]) map[cat] = 0;
      map[cat] += l.valor || 0;
    });
    const cores = [OM.blue, OM.violet, OM.cyan, OM.orange, OM.emerald, OM.amber, OM.rose];
    return Object.entries(map).map(([label, value], i) => ({ label, value, color: cores[i % cores.length] }))
      .sort((a, b) => b.value - a.value).slice(0, 6);
  }, [lancamentosDespesas]);

  // ===== Receita por obra (treemap data) =====
  const receitaPorObra = useMemo(() => {
    return obrasAtivas.map(o => {
      const rec = (medicoes || []).filter(m => (m.obraId || m.obra_id) === o.id
        && ['paga','pago','recebido','faturado','confirmado'].includes(m.status))
        .reduce((s, m) => s + (m.valorBruto || m.valor_bruto || 0), 0);
      return { name: o.codigo || o.id, size: rec, fill: OM.blue };
    }).filter(x => x.size > 0).sort((a, b) => b.size - a.size).slice(0, 10);
  }, [obrasAtivas, medicoes]);

  return (
    <div className="min-h-screen -m-4 p-4 relative" style={{ background: OM.bgDeep }}>
      {/* Blueprint pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: `
          linear-gradient(${OM.blue} 1px, transparent 1px),
          linear-gradient(90deg, ${OM.blue} 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
      }} />

      {/* ============ HEADER ============ */}
      <div className="relative mb-4 rounded-lg overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${OM.bgPanel}, ${OM.bgPanelAlt})`,
          border: `1px solid ${OM.borderStrong}`,
          boxShadow: `0 4px 24px -4px ${OM.blue}20`,
        }}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${OM.blue}, ${OM.orange}, ${OM.emerald})` }} />
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl blur opacity-60" style={{ background: OM.blue }} />
              <div className="relative p-2.5 rounded-xl" style={{ background: `linear-gradient(135deg, ${OM.blueDeep}, ${OM.navy})`, border: `1px solid ${OM.borderStrong}` }}>
                <Cog className="h-6 w-6 text-white animate-spin-slow" style={{ animationDuration: '12s' }} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color: OM.blue }}>MONTEX OMEGA // CMD_CTRL</p>
              <h1 className="text-2xl font-black text-white tracking-tight">Command Center Ultra</h1>
              <p className="text-xs mt-0.5" style={{ color: OM.textDim }}>{now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: OM.textDim }}>Operações</p>
              <p className="text-2xl font-black tabular-nums" style={{ color: OM.blue }}>{obrasAtivas.length}</p>
              <p className="text-[9px]" style={{ color: OM.textDim }}>obras ativas</p>
            </div>
            <div className="w-px h-12" style={{ background: OM.border }} />
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: OM.textDim }}>Produção</p>
              <p className="text-2xl font-black tabular-nums" style={{ color: OM.orange }}>{fmt(totalPcs)}</p>
              <p className="text-[9px]" style={{ color: OM.textDim }}>peças total</p>
            </div>
            <div className="w-px h-12" style={{ background: OM.border }} />
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: OM.textDim }}>Eficiência</p>
              <p className="text-2xl font-black tabular-nums" style={{ color: eficiencia >= 75 ? OM.emerald : eficiencia >= 50 ? OM.amber : OM.rose }}>{Math.round(eficiencia)}%</p>
              <p className="text-[9px]" style={{ color: OM.textDim }}>conclusão</p>
            </div>
            <div className="w-px h-12" style={{ background: OM.border }} />
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: OM.textDim }}>Backlog</p>
              <p className="text-2xl font-black tabular-nums" style={{ color: OM.violet }}>{fmtR$(backlog)}</p>
              <p className="text-[9px]" style={{ color: OM.textDim }}>{obrasAtivas.length} contratos</p>
            </div>
          </div>
        </div>
      </div>

      {/* ============ STAT ROW ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatBlock label="Receita Mensal" value={fmtR$(recMes)} sub={`meta ${fmtR$(fi.kpisGerais?.metaReceitaDinamica || 0)}`} accent={OM.emerald} icon={DollarSign} delta={comp.deltaReceitas} />
        <StatBlock label="Despesa Mensal" value={fmtR$(desMes)} sub="todos custos" accent={OM.rose} icon={Flame} delta={comp.deltaDespesas} deltaPositive={comp.deltaDespesas <= 0} />
        <StatBlock label="Lucro Operacional" value={fmtR$(recMes - desMes)} sub={`margem ${fmtPct(margem)}`} accent={OM.blue} icon={TrendingUp} delta={comp.deltaLucro} />
        <StatBlock label="Saldo Caixa" value={fmtR$(saldo)} sub={saldo >= 0 ? 'positivo' : 'atenção'} accent={saldo >= 0 ? OM.cyan : OM.rose} icon={Wallet} />
      </div>

      {/* ============ PRODUCTION FLOW ============ */}
      <Section title="Production Flow" sub="funil de produção em tempo real" icon={Factory} accent={OM.orange} className="mb-4"
        action={<span className="text-[10px] font-mono" style={{ color: OM.textDim }}>{fmt(totalPcs)} pcs · {fmtPeso((pecas || []).reduce((s, p) => s + (parseFloat(p.pesoTotal) || parseFloat(p.peso) || 0), 0))}</span>}>
        <div className="flex items-stretch gap-1">
          {pipeline.map((s, i) => {
            const { key, ...rest } = s; // key fora do spread (senão React avisa "key prop spread")
            return <FlowStage key={key} {...rest} value={s.qtd} percent={s.percent} isLast={i === pipeline.length - 1} />;
          })}
          <div className="flex flex-col items-center justify-center px-3 ml-2 rounded-lg"
            style={{ background: `linear-gradient(135deg, ${OM.emerald}20, ${OM.emerald}10)`, border: `1px solid ${OM.emerald}40` }}>
            <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: OM.emerald }}>Finalizado</p>
            <p className="text-2xl font-black tabular-nums" style={{ color: OM.emerald }}>{fmt(finalizadas)}</p>
            <p className="text-[9px] tabular-nums" style={{ color: OM.emerald }}>{fmtPct(eficiencia)}</p>
          </div>
        </div>
      </Section>

      {/* ============ MIDDLE ROW: Cash Flow + Categorias ============ */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <Section title="Cash Flow Histórico" sub="evolução 6 meses" icon={BarChart3} accent={OM.blue} className="col-span-8">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={cashHist}>
              <defs>
                <linearGradient id="rec-ult" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={OM.emerald} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={OM.emerald} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="des-ult" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={OM.rose} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={OM.rose} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={OM.border} />
              <XAxis dataKey="mes" stroke={OM.textDim} fontSize={10} />
              <YAxis stroke={OM.textDim} fontSize={10} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: OM.bgPanel, border: `1px solid ${OM.borderStrong}`, borderRadius: '6px', fontSize: '11px' }}
                formatter={(v) => fmtR$(v)}
              />
              <Legend wrapperStyle={{ fontSize: '10px', color: OM.textDim }} />
              <Area type="monotone" dataKey="receita" name="Receita" stroke={OM.emerald} fill="url(#rec-ult)" strokeWidth={2} />
              <Area type="monotone" dataKey="despesa" name="Despesa" stroke={OM.rose} fill="url(#des-ult)" strokeWidth={2} />
              <Line type="monotone" dataKey="lucro" name="Lucro" stroke={OM.blue} strokeWidth={2.5} dot={{ r: 4, fill: OM.blue }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Top Categorias" sub="despesas operacionais" icon={Layers} accent={OM.violet} className="col-span-4">
          {categorias.length === 0 ? (
            <p className="text-center text-xs italic py-6" style={{ color: OM.textDim }}>Sem categorização</p>
          ) : (
            <BarList items={categorias} valueFormatter={fmtR$} />
          )}
        </Section>
      </div>

      {/* ============ TEAM PERFORMANCE + RECEITA POR OBRA ============ */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <Section title="Team Performance" sub="ranking de produção por funcionário" icon={Users} accent={OM.amber} className="col-span-7">
          {funcionarios.length === 0 ? (
            <p className="text-center text-xs italic py-6" style={{ color: OM.textDim }}>Sem registros de produção por funcionário</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {funcionarios.map((f, i) => {
                const top = funcionarios[0]?.total || 1;
                const pct = (f.total / top) * 100;
                const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                const corRank = i === 0 ? OM.amber : i === 1 ? OM.cyan : i === 2 ? OM.orange : OM.blue;
                return (
                  <div key={f.nome} className="relative p-3 rounded-lg"
                    style={{ background: OM.bgRail, border: `1px solid ${OM.border}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full font-mono text-xs font-bold"
                        style={{ background: `${corRank}20`, color: corRank, border: `1px solid ${corRank}40` }}>
                        {medalha || `#${i + 1}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate text-white">{f.nome}</p>
                        <p className="text-[9px]" style={{ color: OM.textDim }}>{Object.keys(f.etapas).length} etapa(s) ativa(s)</p>
                      </div>
                      <span className="text-lg font-black tabular-nums" style={{ color: corRank }}>{fmt(f.total)}</span>
                    </div>
                    <div className="relative h-1 rounded-full overflow-hidden" style={{ background: OM.bgPanel }}>
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: corRank, boxShadow: `0 0 4px ${corRank}80` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Receita por Obra" sub="treemap de faturamento" icon={Map} accent={OM.cyan} className="col-span-5">
          {receitaPorObra.length === 0 ? (
            <p className="text-center text-xs italic py-6" style={{ color: OM.textDim }}>Sem receitas registradas</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <Treemap data={receitaPorObra} dataKey="size" stroke={OM.bgDeep} fill={OM.blue}
                content={({ x, y, width, height, name, size }) => (
                  <g>
                    <rect x={x} y={y} width={width} height={height}
                      fill={OM.blue}
                      fillOpacity={Math.min(0.9, 0.3 + ((Number(size) || 0) / (receitaPorObra[0]?.size || 1)) * 0.6)}
                      stroke={OM.bgDeep} strokeWidth={2} />
                    {width > 50 && height > 30 && (
                      <>
                        <text x={x + width / 2} y={y + height / 2 - 4} textAnchor="middle"
                          fill="white" fontSize={Math.min(11, width / 8)} fontWeight="bold">{name}</text>
                        <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle"
                          fill="rgba(255,255,255,0.7)" fontSize={9}>{fmtR$(size)}</text>
                      </>
                    )}
                  </g>
                )}
              />
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* ============ OBRAS RANKING (DETAIL) ============ */}
      <Section title="Portfolio de Obras" sub="top 6 por valor de contrato" icon={Briefcase} accent={OM.blue} className="mb-4"
        action={<span className="text-[10px]" style={{ color: OM.textDim }}>{obrasAtivas.length} ativas</span>}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {obrasRank.map(o => {
            const corProg = o.prog >= 75 ? OM.emerald : o.prog >= 50 ? OM.cyan : o.prog >= 25 ? OM.amber : OM.rose;
            const corFat = o.fatura >= 75 ? OM.emerald : o.fatura >= 50 ? OM.cyan : OM.violet;
            return (
              <div key={o.id} className="relative p-4 rounded-lg group hover:border-blue-500/40 transition-all"
                style={{ background: OM.bgPanel, border: `1px solid ${OM.border}` }}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${OM.blue}15`, color: OM.blue }}>{o.codigo}</span>
                    <p className="text-sm font-bold text-white mt-1 truncate">{o.nome}</p>
                    <p className="text-[10px] truncate" style={{ color: OM.textDim }}>{o.cliente || '—'}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <ProgressRing value={o.prog} color={corProg} size={48} label="Prod" />
                    <ProgressRing value={o.fatura} color={corFat} size={48} label="Fat" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-1.5 rounded" style={{ background: OM.bgRail }}>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: OM.textDim }}>Contrato</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: OM.violet }}>{fmtR$(o.valor)}</p>
                  </div>
                  <div className="p-1.5 rounded" style={{ background: OM.bgRail }}>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: OM.textDim }}>Recebido</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: OM.emerald }}>{fmtR$(o.recObra)}</p>
                  </div>
                  <div className="p-1.5 rounded" style={{ background: OM.bgRail }}>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: OM.textDim }}>Peças</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: OM.blue }}>{fmt(o.fin)}/{fmt(o.pcs)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ============ FOOTER: VENCIMENTOS + ATRASADAS ============ */}
      <div className="grid grid-cols-12 gap-4">
        <Section title="Próximos Vencimentos" sub="30 dias" icon={Calendar} accent={OM.amber} className="col-span-7">
          {proxVenc.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2" style={{ color: OM.emerald }} />
              <p className="text-xs font-bold" style={{ color: OM.emerald }}>Sem vencimentos nos próximos 30 dias</p>
            </div>
          ) : (
            <div className="space-y-2">
              {proxVenc.map((v, i) => {
                const dt = parseLocalDate(v.dataVencimento || v.data_vencimento);
                const hoje = new Date(); hoje.setHours(0,0,0,0);
                const dias = Math.ceil((dt - hoje) / (1000 * 60 * 60 * 24));
                const urg = dias <= 3 ? OM.rose : dias <= 7 ? OM.amber : OM.blue;
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg group hover:bg-blue-500/5 transition-all"
                    style={{ background: OM.bgRail, border: `1px solid ${OM.border}` }}>
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg flex-shrink-0"
                      style={{ background: `${urg}15`, border: `1px solid ${urg}40` }}>
                      <span className="text-[8px] uppercase tracking-widest font-bold" style={{ color: urg }}>{dt?.toLocaleDateString('pt-BR', { month: 'short' }).slice(0, 3)}</span>
                      <span className="text-base font-black tabular-nums" style={{ color: urg }}>{dt?.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{v.descricao || v.fornecedor || 'Despesa'}</p>
                      <p className="text-[10px]" style={{ color: OM.textDim }}>{v.categoria || '—'} · em {dias} dia(s)</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums" style={{ color: urg }}>{fmtR$(v.valor)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Atrasadas" sub="ação necessária" icon={AlertTriangle} accent={OM.rose} className="col-span-5">
          {atrasadas.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2" style={{ color: OM.emerald }} />
              <p className="text-xs font-bold" style={{ color: OM.emerald }}>Nenhuma despesa atrasada</p>
              <p className="text-[10px] mt-1" style={{ color: OM.textDim }}>Operação em dia</p>
            </div>
          ) : (
            <>
              <div className="mb-3 p-3 rounded-lg text-center" style={{ background: `${OM.rose}10`, border: `1px solid ${OM.rose}40` }}>
                <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: OM.rose }}>Total atrasado</p>
                <p className="text-2xl font-black tabular-nums" style={{ color: OM.rose, textShadow: `0 0 8px ${OM.rose}40` }}>{fmtR$(atrasadasTotal)}</p>
                <p className="text-[10px]" style={{ color: OM.textDim }}>{atrasadas.length} lançamento(s) vencido(s)</p>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scroll">
                {atrasadas.slice(0, 6).map((a, i) => {
                  const dt = parseLocalDate(a.dataVencimento || a.data_vencimento);
                  const hoje = new Date(); hoje.setHours(0,0,0,0);
                  const dias = Math.floor((hoje - dt) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={i} className="flex items-center justify-between gap-2 p-2 rounded text-[11px]"
                      style={{ background: OM.bgRail, border: `1px solid ${OM.rose}20` }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate font-medium">{a.descricao || a.fornecedor || 'Despesa'}</p>
                        <p style={{ color: OM.rose }} className="text-[9px] font-bold">-{dias} dia(s) · {dt?.toLocaleDateString('pt-BR')}</p>
                      </div>
                      <p className="font-bold tabular-nums" style={{ color: OM.rose }}>{fmtR$(a.valor)}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Section>
      </div>

      {/* Footer */}
      <div className="mt-4 text-center text-[10px] font-mono" style={{ color: OM.textDim }}>
        MONTEX OMEGA · COMMAND CENTER ULTRA v5 · {now.toLocaleTimeString('pt-BR')}
      </div>

      <style>{`
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: ${OM.blue}40; border-radius: 2px; }
      `}</style>
    </div>
  );
}
