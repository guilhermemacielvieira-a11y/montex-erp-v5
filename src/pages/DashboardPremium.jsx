// ============================================
// MONTEX DASHBOARD PREMIUM — Executive Business Intelligence
// ============================================
// Painel executivo premium com insights automáticos, forecast,
// análise estratégica, KPIs YTD/MTD, portfolio de obras e
// indicadores preditivos. Foco em tomada de decisão C-Level.
// ============================================

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, Target, Award, AlertCircle, Sparkles, BarChart3, Building2, Briefcase, ArrowUpRight, ArrowDownRight,
  PieChart as PieIcon, Layers, Shield, Lightbulb, Flame, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { Area, Bar, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { useObras, useProducao, useLancamentos, useMedicoes } from '../contexts/ERPContext';
import { useFinancialIntelligence } from '../hooks/useFinancialIntelligence';

// ============================================
// HELPERS
// ============================================
const fmt = (v) => v == null || isNaN(v) ? '—' : Math.round(v).toLocaleString('pt-BR');
const fmtR$ = (v) => v == null || isNaN(v) ? 'R$ —' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
const fmtR$k = (v) => v == null || isNaN(v) ? '—' : 'R$ ' + (v / 1000).toFixed(1) + 'k';
const fmtR$M = (v) => v == null || isNaN(v) ? '—' : 'R$ ' + (v / 1000000).toFixed(2) + 'M';
const fmtPeso = (kg) => kg == null ? '—' : Math.abs(kg) >= 1000 ? (kg / 1000).toFixed(1) + 't' : Math.round(kg) + 'kg';
const fmtPct = (v) => v == null || isNaN(v) ? '—' : `${Math.round(v)}%`;
const parseLocalDate = (s) => {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])) : new Date(s);
};

// ============================================
// COMPONENT: Premium Card Wrapper (glassmorphism)
// ============================================
function PremiumCard({ children, className = '', gradient, title, subtitle, icon: Icon, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border border-white/10 backdrop-blur-2xl overflow-hidden ${className}`}
      style={{
        background: gradient || 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95))',
        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {(title || subtitle) && (
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-white/5">
          <div>
            {title && (
              <div className="flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4 text-white/60" />}
                <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
              </div>
            )}
            {subtitle && <p className="text-[10px] text-slate-500 mt-0.5 tracking-wide">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

// ============================================
// COMPONENT: Executive KPI Big Card
// ============================================
function ExecKPI({ label, value, change, sub, gradient, icon: Icon, accent = '#a78bfa' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative rounded-2xl border border-white/10 p-5 overflow-hidden group hover:border-white/20 transition-all"
      style={{
        background: gradient || 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95))',
      }}
    >
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] text-white/50 uppercase tracking-widest font-medium">{label}</p>
          {Icon && <Icon className="h-4 w-4" style={{ color: accent }} />}
        </div>
        <p className="text-3xl font-black text-white tracking-tight tabular-nums leading-none">{value}</p>
        {sub && <p className="text-[11px] text-white/40 mt-2">{sub}</p>}
        {change !== undefined && change !== null && (
          <div className={`flex items-center gap-1 mt-3 text-xs font-semibold ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span>{change >= 0 ? '+' : ''}{Math.abs(change).toFixed(1)}%</span>
            <span className="text-white/30 font-normal">vs mês anterior</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// COMPONENT: Insight Card (IA-style)
// ============================================
function InsightCard({ severity, icon: Icon, title, detail, action }) {
  const stylesBySeverity = {
    positivo: { border: 'border-emerald-500/30', bg: 'from-emerald-500/10 to-green-500/5', text: 'text-emerald-300', dot: 'bg-emerald-400' },
    info: { border: 'border-blue-500/30', bg: 'from-blue-500/10 to-cyan-500/5', text: 'text-blue-300', dot: 'bg-blue-400' },
    atenção: { border: 'border-amber-500/30', bg: 'from-amber-500/10 to-orange-500/5', text: 'text-amber-300', dot: 'bg-amber-400' },
    crítico: { border: 'border-rose-500/30', bg: 'from-rose-500/10 to-red-500/5', text: 'text-rose-300', dot: 'bg-rose-400' },
  };
  const s = stylesBySeverity[severity] || stylesBySeverity.info;
  return (
    <div className={`relative rounded-xl border ${s.border} bg-gradient-to-br ${s.bg} p-3 backdrop-blur-sm`}>
      <div className="flex items-start gap-2.5">
        <div className={`p-1.5 rounded-lg ${s.bg.replace('/10','/20').replace('/5','/10')}`}>
          <Icon className={`h-3.5 w-3.5 ${s.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`w-1 h-1 rounded-full ${s.dot} animate-pulse`} />
            <span className={`text-[9px] font-bold uppercase tracking-widest ${s.text}`}>{severity}</span>
          </div>
          <p className="text-xs text-white font-medium leading-snug">{title}</p>
          {detail && <p className="text-[10px] text-white/50 mt-1 leading-relaxed">{detail}</p>}
          {action && <p className={`text-[10px] mt-1 ${s.text} font-medium`}>💡 {action}</p>}
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENT: Mini Score Bar
// ============================================
function ScoreBar({ label, score, max = 100, color = '#a78bfa' }) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/60 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-bold text-white tabular-nums">{Math.round(score)}<span className="text-white/40 text-[10px]">/{max}</span></span>
      </div>
      <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}aa)`, boxShadow: `0 0 8px ${color}80` }}
        />
      </div>
    </div>
  );
}

// ============================================
// MAIN
// ============================================
export default function DashboardPremium() {
  const { obras } = useObras();
  const { pecas } = useProducao();
  const { lancamentosDespesas } = useLancamentos();
  const { medicoes } = useMedicoes();
  const fi = useFinancialIntelligence();

  // ===== Métricas YTD e MTD =====
  const metricas = useMemo(() => {
    const hoje = new Date();
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    // Receitas YTD/MTD
    const recYTD = (medicoes || []).filter(m => {
      const d = parseLocalDate(m.dataMedicao || m.data_medicao);
      return d && d >= inicioAno && ['paga','pago','recebido','faturado','confirmado'].includes(m.status);
    }).reduce((s, m) => s + (m.valorBruto || m.valor_bruto || 0), 0);
    const recMTD = (medicoes || []).filter(m => {
      const d = parseLocalDate(m.dataMedicao || m.data_medicao);
      return d && d >= inicioMes && ['paga','pago','recebido','faturado','confirmado'].includes(m.status);
    }).reduce((s, m) => s + (m.valorBruto || m.valor_bruto || 0), 0);

    // Despesas YTD/MTD (sem obraId)
    const desYTD = (lancamentosDespesas || []).filter(l => {
      if (l.obraId || l.obra_id) return false;
      const d = parseLocalDate(l.dataEmissao || l.data_emissao || l.data);
      return d && d >= inicioAno;
    }).reduce((s, l) => s + (l.valor || 0), 0);
    const desMTD = (lancamentosDespesas || []).filter(l => {
      if (l.obraId || l.obra_id) return false;
      const d = parseLocalDate(l.dataEmissao || l.data_emissao || l.data);
      return d && d >= inicioMes;
    }).reduce((s, l) => s + (l.valor || 0), 0);

    // Backlog (valor das obras ativas)
    const backlog = (obras || [])
      .filter(o => !['cancelada','concluida','orcamento'].includes(o.status))
      .reduce((s, o) => s + (o.contratoValorTotal || o.valorContrato || 0), 0);

    // Toneladas produzidas no mês (peças que foram para expedição)
    // Aproximação: total peso dos itens em expedido + enviado / nº meses ativos
    const totalPesoFinal = (pecas || []).filter(p => ['expedido','enviado','entregue','montagem'].includes(p.etapa))
      .reduce((s, p) => s + (parseFloat(p.pesoTotal) || parseFloat(p.peso) || 0), 0);

    // Receita por toneladas
    const receitaPorTon = totalPesoFinal > 0 ? recYTD / (totalPesoFinal / 1000) : 0;

    return { recYTD, recMTD, desYTD, desMTD, backlog, totalPesoFinal, receitaPorTon };
  }, [medicoes, lancamentosDespesas, obras, pecas]);

  // ===== Score Premium (composite) =====
  const businessScore = useMemo(() => {
    const margem = fi.kpisGerais?.margemReal || 0;
    const fScore = Math.max(0, Math.min(100, (margem / 25) * 100));
    const pScore = (pecas || []).length > 0
      ? Math.min(100, (pecas || []).filter(p => ['expedido','enviado','entregue','montagem'].includes(p.etapa))
          .reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0)
          / Math.max(1, (pecas || []).reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0)) * 100)
      : 0;
    const lScore = (fi.kpisGerais?.faturamentoRealMes || 0) > (fi.kpisGerais?.metaReceitaDinamica || 0) ? 90 : 60;
    const rScore = (fi.kpisGerais?.saldoReal || 0) >= 0 ? 90 : 40;
    const total = (fScore * 0.30 + pScore * 0.25 + lScore * 0.25 + rScore * 0.20);
    return {
      total: Math.round(total),
      financeiro: Math.round(fScore),
      producao: Math.round(pScore),
      meta: Math.round(lScore),
      liquidez: Math.round(rScore),
    };
  }, [fi, pecas]);

  const scoreLabel = businessScore.total >= 80 ? 'EXCEPCIONAL'
    : businessScore.total >= 60 ? 'SAUDÁVEL'
    : businessScore.total >= 40 ? 'CAUTELA' : 'CRÍTICO';
  const scoreColor = businessScore.total >= 80 ? '#10b981'
    : businessScore.total >= 60 ? '#3b82f6'
    : businessScore.total >= 40 ? '#f59e0b' : '#ef4444';

  // ===== Insights automáticos (IA-style) =====
  const insights = useMemo(() => {
    const arr = [];
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    // 1. Margem
    const margem = fi.kpisGerais?.margemReal || 0;
    if (margem >= 25) {
      arr.push({ severity: 'positivo', icon: TrendingUp, title: `Margem operacional saudável (${margem.toFixed(1)}%)`, detail: 'Margem acima do alvo de 25%. Negócio rentável.', action: null });
    } else if (margem < 10 && margem >= 0) {
      arr.push({ severity: 'atenção', icon: TrendingDown, title: `Margem comprimida (${margem.toFixed(1)}%)`, detail: 'Margem abaixo do ideal. Reveja precificação ou custos.', action: 'Analisar Pareto das despesas' });
    } else if (margem < 0) {
      arr.push({ severity: 'crítico', icon: AlertTriangle, title: 'Margem negativa', detail: `Despesas superam receitas em ${fmtR$(Math.abs(fi.kpisGerais?.saldoReal || 0))}`, action: 'Ação imediata necessária' });
    }

    // 2. Receita vs meta
    const recAtual = fi.kpisGerais?.faturamentoRealMes || 0;
    const meta = fi.kpisGerais?.metaReceitaDinamica || 0;
    const pctMeta = meta > 0 ? (recAtual / meta * 100) : 0;
    if (pctMeta >= 100) {
      arr.push({ severity: 'positivo', icon: Target, title: `Meta de receita batida (${pctMeta.toFixed(0)}%)`, detail: `Receita do mês: ${fmtR$(recAtual)}`, action: null });
    } else if (pctMeta < 50) {
      arr.push({ severity: 'atenção', icon: Target, title: `Receita ${pctMeta.toFixed(0)}% da meta mensal`, detail: `Faltam ${fmtR$(meta - recAtual)} para atingir alvo`, action: 'Acelerar faturamento de medições' });
    }

    // 3. Despesas atrasadas
    const atrasadas = (lancamentosDespesas || []).filter(l => {
      if (l.status === 'pago') return false;
      const v = parseLocalDate(l.dataVencimento || l.data_vencimento);
      return v && v < hoje;
    });
    if (atrasadas.length > 0) {
      arr.push({
        severity: 'crítico',
        icon: AlertTriangle,
        title: `${atrasadas.length} despesa(s) atrasada(s)`,
        detail: `Valor total: ${fmtR$(atrasadas.reduce((s, a) => s + (a.valor || 0), 0))}`,
        action: 'Priorizar pagamentos vencidos'
      });
    }

    // 4. Backlog vs capacidade
    const obrasAtivas = (obras || []).filter(o => !['cancelada','concluida','orcamento'].includes(o.status));
    if (obrasAtivas.length >= 5) {
      arr.push({ severity: 'info', icon: Briefcase, title: `${obrasAtivas.length} obras em andamento simultâneo`, detail: `Backlog: ${fmtR$M(metricas.backlog)}. Verifique capacidade produtiva.`, action: 'Monitorar carga das equipes' });
    }

    // 5. Estoque de produção
    const pcsArr = pecas || [];
    const total = pcsArr.reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
    const fabricacao = pcsArr.filter(p => ['fabricacao','aguardando','corte'].includes(p.etapa))
      .reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
    if (fabricacao > total * 0.5) {
      arr.push({ severity: 'atenção', icon: AlertCircle, title: `${fmt(fabricacao)} pcs em fabricação (${fmtPct(fabricacao / total * 100)})`, detail: 'Mais de 50% do estoque parado na primeira etapa. Possível gargalo.', action: 'Investigar atrasos em montagem' });
    }

    // 6. Eficiência operacional
    const fin = pcsArr.filter(p => ['expedido','enviado','entregue','montagem'].includes(p.etapa))
      .reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
    const pctConclusao = total > 0 ? (fin / total * 100) : 0;
    if (pctConclusao >= 75) {
      arr.push({ severity: 'positivo', icon: CheckCircle2, title: `Conclusão geral em ${pctConclusao.toFixed(0)}%`, detail: `${fmt(fin)} pcs finalizadas de ${fmt(total)} totais`, action: null });
    }

    return arr.slice(0, 6);
  }, [fi, lancamentosDespesas, obras, pecas, metricas]);

  // ===== Cash flow forecast 6 meses =====
  const forecastCashFlow = useMemo(() => {
    if (!fi.evolucaoMensal) return [];
    return fi.evolucaoMensal.slice(-6).map((m, i, arr) => ({
      mes: m.mesLabel,
      receita: m.faturamentoReal || 0,
      despesa: m.custo || 0,
      saldo: (m.faturamentoReal || 0) - (m.custo || 0),
      acumulado: arr.slice(0, i + 1).reduce((s, x) => s + ((x.faturamentoReal || 0) - (x.custo || 0)), 0),
    }));
  }, [fi]);

  // ===== DRE Simplificado =====
  const dre = useMemo(() => {
    const receita = fi.kpisGerais?.faturamentoRealMes || 0;
    const custos = fi.kpisGerais?.despesaMensalMedia || 0;
    const ebitda = receita - custos;
    const margemEbitda = receita > 0 ? (ebitda / receita * 100) : 0;
    return { receita, custos, ebitda, margemEbitda };
  }, [fi]);

  // ===== Top categorias de despesa =====
  const topCategorias = useMemo(() => {
    const map = {};
    (lancamentosDespesas || []).forEach(l => {
      if (l.obraId || l.obra_id) return;
      const cat = l.categoria || 'Outros';
      if (!map[cat]) map[cat] = 0;
      map[cat] += l.valor || 0;
    });
    return Object.entries(map)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor).slice(0, 7);
  }, [lancamentosDespesas]);

  // ===== Pareto: top 10 obras por valor de contrato =====
  const paretoObras = useMemo(() => {
    const ativas = (obras || []).filter(o => !['cancelada','orcamento'].includes(o.status));
    const sorted = ativas
      .map(o => ({ nome: o.codigo || o.id, valor: o.contratoValorTotal || o.valorContrato || 0 }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
    const total = sorted.reduce((s, o) => s + o.valor, 0);
    let acc = 0;
    return sorted.map(o => {
      acc += o.valor;
      return { ...o, pctAcum: total > 0 ? (acc / total * 100) : 0 };
    });
  }, [obras]);

  // ===== Portfolio obras =====
  const portfolio = useMemo(() => {
    return (obras || [])
      .filter(o => !['cancelada','concluida','orcamento'].includes(o.status))
      .map(o => {
        const pcsObra = (pecas || []).filter(p => p.obraId === o.id);
        const tot = pcsObra.reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
        const fin = pcsObra.filter(p => ['expedido','enviado','entregue','montagem'].includes(p.etapa))
          .reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
        const pct = tot > 0 ? (fin / tot) * 100 : 0;
        const recObra = (medicoes || []).filter(m => (m.obraId || m.obra_id) === o.id
          && ['paga','pago','recebido','faturado','confirmado'].includes(m.status))
          .reduce((s, m) => s + (m.valorBruto || m.valor_bruto || 0), 0);
        const valorContrato = o.contratoValorTotal || o.valorContrato || 0;
        const pctFatura = valorContrato > 0 ? (recObra / valorContrato * 100) : 0;
        const saude = (pct + pctFatura) / 2;
        return { ...o, pct, pctFatura, recObra, valorContrato, saude };
      })
      .sort((a, b) => b.valorContrato - a.valorContrato);
  }, [obras, pecas, medicoes]);

  // ===== Risk Radar =====
  const riskRadar = useMemo(() => {
    const risks = [];
    const margem = fi.kpisGerais?.margemReal || 0;
    if (margem < 10) risks.push({ tipo: 'Margem', nivel: margem < 0 ? 'alto' : 'médio', desc: `${margem.toFixed(1)}%` });
    const saldo = fi.kpisGerais?.saldoReal || 0;
    if (saldo < 0) risks.push({ tipo: 'Saldo Caixa', nivel: 'alto', desc: fmtR$(saldo) });
    const atrasadas = (lancamentosDespesas || []).filter(l => {
      if (l.status === 'pago') return false;
      const v = parseLocalDate(l.dataVencimento || l.data_vencimento);
      return v && v < new Date();
    });
    if (atrasadas.length > 3) risks.push({ tipo: 'Inadimplência', nivel: 'médio', desc: `${atrasadas.length} atrasadas` });
    // Concentração de clientes (top 3 obras vs total)
    const totalContrato = portfolio.reduce((s, o) => s + o.valorContrato, 0);
    const top3 = portfolio.slice(0, 3).reduce((s, o) => s + o.valorContrato, 0);
    const conc = totalContrato > 0 ? (top3 / totalContrato * 100) : 0;
    if (conc > 70) risks.push({ tipo: 'Concentração Cliente', nivel: 'médio', desc: `Top 3 = ${conc.toFixed(0)}%` });
    return risks;
  }, [fi, lancamentosDespesas, portfolio]);

  // Variação mês anterior
  const comparativo = fi.comparativo || {};

  return (
    <div className="space-y-5 min-h-screen -m-4 p-5"
      style={{ background: 'radial-gradient(ellipse at top right, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(168,85,247,0.10) 0%, transparent 50%), #050510' }}>

      {/* ============================================ */}
      {/* HERO STRIP                                   */}
      {/* ============================================ */}
      <div className="grid grid-cols-12 gap-4">
        <PremiumCard className="col-span-8"
          gradient="linear-gradient(135deg, rgba(99,102,241,0.20), rgba(168,85,247,0.10) 50%, rgba(15,23,42,0.95))">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-violet-300/70 uppercase tracking-[0.3em] font-bold mb-1">Executive Dashboard</p>
              <h1 className="text-3xl font-black text-white tracking-tight">Business Intelligence</h1>
              <p className="text-sm text-white/50 mt-1">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Business Score</p>
                <p className="text-5xl font-black tabular-nums" style={{ color: scoreColor }}>{businessScore.total}</p>
                <p className="text-xs font-bold tracking-widest" style={{ color: scoreColor }}>{scoreLabel}</p>
              </div>
              <div className="w-px h-20 bg-white/10" />
              <div className="space-y-2 w-48">
                <ScoreBar label="Financeiro" score={businessScore.financeiro} color="#10b981" />
                <ScoreBar label="Produção" score={businessScore.producao} color="#3b82f6" />
                <ScoreBar label="Meta receita" score={businessScore.meta} color="#a855f7" />
                <ScoreBar label="Liquidez" score={businessScore.liquidez} color="#06b6d4" />
              </div>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="col-span-4" title="Highlights do Dia" subtitle="resumo executivo" icon={Sparkles}>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Receita MTD</span>
              <span className="text-emerald-300 font-bold tabular-nums">{fmtR$k(metricas.recMTD)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Despesa MTD</span>
              <span className="text-rose-300 font-bold tabular-nums">{fmtR$k(metricas.desMTD)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Lucro MTD</span>
              <span className={`font-bold tabular-nums ${(metricas.recMTD - metricas.desMTD) >= 0 ? 'text-blue-300' : 'text-rose-300'}`}>
                {fmtR$k(metricas.recMTD - metricas.desMTD)}
              </span>
            </div>
            <div className="h-px bg-white/10 my-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Backlog</span>
              <span className="text-violet-300 font-bold tabular-nums">{fmtR$M(metricas.backlog)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Produção pronta</span>
              <span className="text-cyan-300 font-bold tabular-nums">{fmtPeso(metricas.totalPesoFinal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">R$ / tonelada</span>
              <span className="text-amber-300 font-bold tabular-nums">{fmtR$k(metricas.receitaPorTon)}</span>
            </div>
          </div>
        </PremiumCard>
      </div>

      {/* ============================================ */}
      {/* EXECUTIVE KPIs                              */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ExecKPI
          label="Receita YTD"
          value={fmtR$M(metricas.recYTD)}
          sub={`Mês atual: ${fmtR$k(metricas.recMTD)}`}
          accent="#10b981"
          icon={DollarSign}
          gradient="linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,46,22,0.95))"
          change={comparativo.deltaReceitas}
        />
        <ExecKPI
          label="Despesa YTD"
          value={fmtR$M(metricas.desYTD)}
          sub={`Mês atual: ${fmtR$k(metricas.desMTD)}`}
          accent="#ef4444"
          icon={Flame}
          gradient="linear-gradient(135deg, rgba(239,68,68,0.12), rgba(60,11,11,0.95))"
          change={comparativo.deltaDespesas}
        />
        <ExecKPI
          label="EBITDA Mês"
          value={fmtR$k(dre.ebitda)}
          sub={`Margem ${dre.margemEbitda.toFixed(1)}%`}
          accent="#3b82f6"
          icon={TrendingUp}
          gradient="linear-gradient(135deg, rgba(59,130,246,0.12), rgba(15,30,60,0.95))"
        />
        <ExecKPI
          label="Backlog (Obras)"
          value={fmtR$M(metricas.backlog)}
          sub={`${portfolio.length} obras ativas`}
          accent="#a855f7"
          icon={Briefcase}
          gradient="linear-gradient(135deg, rgba(168,85,247,0.12), rgba(40,15,60,0.95))"
        />
      </div>

      {/* ============================================ */}
      {/* INSIGHTS AUTOMÁTICOS                         */}
      {/* ============================================ */}
      <PremiumCard title="Insights Automáticos" subtitle="análise inteligente dos dados" icon={Lightbulb}
        action={<span className="text-[9px] text-violet-300/70 uppercase tracking-widest">{insights.length} insights</span>}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.length === 0 ? (
            <p className="col-span-3 text-center text-white/40 text-xs italic py-4">Nenhum insight relevante no momento.</p>
          ) : insights.map((ins, i) => (
            <InsightCard key={i} {...ins} />
          ))}
        </div>
      </PremiumCard>

      {/* ============================================ */}
      {/* FINANCIAL DEEP DIVE                          */}
      {/* ============================================ */}
      <div className="grid grid-cols-12 gap-4">
        {/* Cash Flow Forecast */}
        <PremiumCard className="col-span-7" title="Cash Flow Análise" subtitle="receitas × despesas × saldo acumulado" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={forecastCashFlow}>
              <defs>
                <linearGradient id="rec-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="des-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                formatter={(v) => fmtR$(v)} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '10px' }} />
              <Area type="monotone" dataKey="receita" name="Receita" stroke="#10b981" fill="url(#rec-grad)" strokeWidth={2} />
              <Area type="monotone" dataKey="despesa" name="Despesa" stroke="#ef4444" fill="url(#des-grad)" strokeWidth={2} />
              <Line type="monotone" dataKey="acumulado" name="Saldo Acumulado" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 4, fill: '#a855f7' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </PremiumCard>

        {/* DRE Simplificado */}
        <PremiumCard className="col-span-5" title="DRE Simplificado" subtitle="demonstrativo do resultado" icon={PieIcon}>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-emerald-300 font-medium">Receita Bruta</span>
              </div>
              <span className="text-lg font-black text-emerald-300 tabular-nums">{fmtR$(dre.receita)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-rose-400" />
                <span className="text-sm text-rose-300 font-medium">(−) Custos & Despesas</span>
              </div>
              <span className="text-lg font-black text-rose-300 tabular-nums">{fmtR$(-dre.custos)}</span>
            </div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border-2 border-blue-500/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-blue-300 font-bold">EBITDA</span>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-blue-300 tabular-nums">{fmtR$(dre.ebitda)}</p>
                <p className="text-[10px] text-blue-400/70 font-bold">Margem {dre.margemEbitda.toFixed(1)}%</p>
              </div>
            </div>
            <div className="text-[10px] text-white/40 text-center mt-2">
              ⚡ Análise baseada em receitas e despesas reais lançadas no sistema
            </div>
          </div>
        </PremiumCard>
      </div>

      {/* ============================================ */}
      {/* PARETO + TOP CATEGORIAS                      */}
      {/* ============================================ */}
      <div className="grid grid-cols-12 gap-4">
        {/* Pareto Obras */}
        <PremiumCard className="col-span-7" title="Pareto de Obras" subtitle="top 10 obras por valor de contrato" icon={Award}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={paretoObras}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="nome" stroke="#64748b" fontSize={10} angle={-30} textAnchor="end" height={50} />
              <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" stroke="#a855f7" fontSize={10} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                formatter={(v, n) => n === 'pctAcum' ? `${v.toFixed(0)}%` : fmtR$(v)} />
              <Bar yAxisId="left" dataKey="valor" name="Valor Contrato" fill="#a855f7" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="pctAcum" name="% Acumulado" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4, fill: '#06b6d4' }} />
              <ReferenceLine yAxisId="right" y={80} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '80%', position: 'right', fill: '#f59e0b', fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </PremiumCard>

        {/* Top Categorias */}
        <PremiumCard className="col-span-5" title="Categorias de Despesa" subtitle="top 7 maiores" icon={Layers}>
          <div className="space-y-2.5">
            {topCategorias.length === 0 ? (
              <p className="text-center text-white/40 text-xs italic py-4">Sem despesas categorizadas</p>
            ) : (() => {
              const max = topCategorias[0]?.valor || 1;
              const total = topCategorias.reduce((s, c) => s + c.valor, 0);
              const cores = ['#a855f7', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];
              return topCategorias.map((cat, i) => {
                const pct = (cat.valor / max) * 100;
                const pctTotal = total > 0 ? (cat.valor / total * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/80">{cat.nome}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/40">{pctTotal.toFixed(1)}%</span>
                        <span className="text-xs font-bold text-white tabular-nums">{fmtR$k(cat.valor)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05 }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${cores[i % cores.length]}, ${cores[i % cores.length]}88)`,
                          boxShadow: `0 0 6px ${cores[i % cores.length]}80` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </PremiumCard>
      </div>

      {/* ============================================ */}
      {/* PORTFOLIO OBRAS                              */}
      {/* ============================================ */}
      <PremiumCard title="Portfolio de Obras" subtitle="análise de saúde individual" icon={Building2}
        action={<span className="text-[9px] text-violet-300/70 uppercase tracking-widest">{portfolio.length} obras</span>}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {portfolio.length === 0 ? (
            <p className="col-span-3 text-center text-white/40 text-xs italic py-4">Sem obras ativas</p>
          ) : portfolio.slice(0, 6).map(o => {
            const saudeColor = o.saude >= 80 ? '#10b981' : o.saude >= 60 ? '#3b82f6' : o.saude >= 40 ? '#f59e0b' : '#ef4444';
            return (
              <div key={o.id} className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[9px] text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">{o.codigo}</span>
                    <p className="text-sm text-white font-semibold truncate mt-1">{o.nome}</p>
                    <p className="text-[10px] text-white/40 truncate">{o.cliente || '—'}</p>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <p className="text-2xl font-black tabular-nums" style={{ color: saudeColor }}>{Math.round(o.saude)}</p>
                    <p className="text-[8px] text-white/40 uppercase tracking-wider">health</p>
                  </div>
                </div>
                <div className="space-y-1.5 mb-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-white/50">Produção</span>
                      <span className="text-white/80 tabular-nums">{Math.round(o.pct)}%</span>
                    </div>
                    <div className="h-1 bg-slate-800/60 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" style={{ width: `${o.pct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-white/50">Faturamento</span>
                      <span className="text-white/80 tabular-nums">{Math.round(o.pctFatura)}%</span>
                    </div>
                    <div className="h-1 bg-slate-800/60 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full" style={{ width: `${o.pctFatura}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/5">
                  <div>
                    <p className="text-white/40">Contrato</p>
                    <p className="text-white font-semibold tabular-nums">{fmtR$k(o.valorContrato)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/40">Recebido</p>
                    <p className="text-emerald-300 font-semibold tabular-nums">{fmtR$k(o.recObra)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PremiumCard>

      {/* ============================================ */}
      {/* RISK RADAR + COMPARATIVO MOM                 */}
      {/* ============================================ */}
      <div className="grid grid-cols-12 gap-4">
        {/* Risk Radar */}
        <PremiumCard className="col-span-5" title="Risk Radar" subtitle="indicadores de risco operacional" icon={Shield}>
          {riskRadar.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-emerald-300 font-bold">Nenhum risco identificado</p>
              <p className="text-[10px] text-white/40 mt-1">Operação dentro dos parâmetros esperados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {riskRadar.map((r, i) => {
                const cor = r.nivel === 'alto' ? '#ef4444' : r.nivel === 'médio' ? '#f59e0b' : '#06b6d4';
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: `${cor}40`, backgroundColor: `${cor}10` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: cor, boxShadow: `0 0 6px ${cor}` }} />
                      <div>
                        <p className="text-sm font-semibold text-white">{r.tipo}</p>
                        <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: cor }}>nível {r.nivel}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold tabular-nums" style={{ color: cor }}>{r.desc}</span>
                  </div>
                );
              })}
            </div>
          )}
        </PremiumCard>

        {/* Month-over-Month */}
        <PremiumCard className="col-span-7" title="Month-over-Month Performance" subtitle="comparativo mês atual × anterior" icon={TrendingUp}>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Receitas', atual: comparativo.atual?.receitas || 0, anterior: comparativo.anterior?.receitas || 0, delta: comparativo.deltaReceitas, color: '#10b981', invert: false },
              { label: 'Despesas', atual: comparativo.atual?.despesas || 0, anterior: comparativo.anterior?.despesas || 0, delta: comparativo.deltaDespesas, color: '#ef4444', invert: true },
              { label: 'Lucro', atual: comparativo.atual?.lucro || 0, anterior: comparativo.anterior?.lucro || 0, delta: comparativo.deltaLucro, color: '#3b82f6', invert: false },
            ].map((m, i) => {
              const sucesso = m.invert ? (m.delta || 0) <= 0 : (m.delta || 0) >= 0;
              return (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2">{m.label}</p>
                  <p className="text-2xl font-black text-white tabular-nums mb-1">{fmtR$k(m.atual)}</p>
                  <p className="text-[11px] text-white/40">anterior: {fmtR$k(m.anterior)}</p>
                  <div className={`flex items-center gap-1 mt-3 text-xs font-bold ${sucesso ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(m.delta || 0) >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    <span>{(m.delta || 0) >= 0 ? '+' : ''}{Math.abs(m.delta || 0).toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </PremiumCard>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-white/30 pt-2">
        MONTEX ERP V5 · Executive Dashboard Premium · Powered by Real-Time Data
      </div>
    </div>
  );
}
