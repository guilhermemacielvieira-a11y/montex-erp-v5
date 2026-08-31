// ============================================
// MONTEX COMMAND CENTER ULTRA — v5 OMEGA (OPERAÇÕES)
// ============================================
// Centro de controle OPERACIONAL: produção, corte, estoque de
// material, gargalos e entrega/expedição. Sem dados financeiros.
// Todas as métricas de produção por PESO (ponderado). Visual
// industrial / blueprint.
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, Box, Briefcase, CheckCircle2, Cog, Factory,
  Flame, Layers, Map as MapIcon, PackageX, Scissors, ShoppingCart, Truck,
  Users, Warehouse, Send,
} from 'lucide-react';
import { useObras, useProducao, useEstoque, useEquipes, useExpedicao } from '../contexts/ERPContext';
import { resumoProducao, porFuncionario, bloqueioFabricacao } from '../services/relatorioProducao';
import { resumoMaterialObra, kpisEstoque } from '../services/estoqueAnalytics';

// ============================================
// THEME — OMEGA Industrial Blueprint
// ============================================
const OM = {
  bgDeep: '#040814',
  bgPanel: '#0a1124',
  bgPanelAlt: '#0d1830',
  bgRail: '#06091a',
  border: 'rgba(96,165,250,0.15)',
  borderStrong: 'rgba(96,165,250,0.4)',
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
  text: '#e5e7eb',
  textBright: '#f3f4f6',
  textDim: '#6b7280',
  textDimmer: '#4b5563',
};

// ============================================
// FORMATTERS
// ============================================
const fmt = (v) => v == null || isNaN(v) ? '—' : Math.round(v).toLocaleString('pt-BR');
const fmtPeso = (kg) => {
  if (kg == null) return '—';
  return `${(Number(kg) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;
};
const fmtPct = (v) => v == null || isNaN(v) ? '—' : `${Math.round(v)}%`;

// ============================================
// SECTION (Blueprint title-block)
// ============================================
function Section({ children, title, sub, icon: Icon, accent = OM.blue, className = '', action }) {
  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(180deg, ${OM.bgPanel}, ${OM.bgPanelAlt})`,
        border: `1px solid ${OM.border}`,
        boxShadow: '0 4px 24px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.02)',
      }}>
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
        <div className="absolute right-0 top-0 bottom-0 w-1" style={{ background: `linear-gradient(180deg, ${accent}, transparent)` }} />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ============================================
// STAT BLOCK
// ============================================
function StatBlock({ label, value, sub, accent = OM.blue, icon: Icon }) {
  return (
    <div className="relative p-4 rounded-lg" style={{ background: OM.bgPanel, border: `1px solid ${OM.border}` }}>
      <div className="absolute top-0 left-0 w-12 h-0.5" style={{ background: accent }} />
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: OM.textDim }}>{label}</p>
        {Icon && (
          <div className="p-1.5 rounded" style={{ background: `${accent}12` }}>
            <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
          </div>
        )}
      </div>
      <p className="text-2xl font-black tabular-nums leading-none" style={{ color: OM.textBright }}>{value}</p>
      {sub && <p className="text-[10px] mt-2" style={{ color: OM.textDim }}>{sub}</p>}
    </div>
  );
}

// ============================================
// FLOW STAGE (production/cut funnel) — por peso
// ============================================
function FlowStage({ label, value, percent, color, icon: Icon, isLast, sub }) {
  return (
    <div className="flex items-center flex-1 min-w-0">
      <div className="flex-1 rounded-lg p-3 relative overflow-hidden"
        style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
        <div className="absolute bottom-0 left-0 h-1" style={{ width: `${percent}%`, background: color, boxShadow: `0 0 8px ${color}80` }} />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color }}>{label}</span>
          {Icon && <Icon className="h-3 w-3" style={{ color }} />}
        </div>
        <p className="text-xl font-black tabular-nums" style={{ color: OM.textBright, textShadow: `0 0 6px ${color}30` }}>{fmtPeso(value)}</p>
        <p className="text-[9px] mt-0.5 tabular-nums" style={{ color: OM.textDim }}>{sub || `${percent.toFixed(1)}% do peso`}</p>
      </div>
      {!isLast && (
        <div className="px-2 flex-shrink-0"><ArrowRight className="h-4 w-4" style={{ color: OM.textDim }} /></div>
      )}
    </div>
  );
}

// ============================================
// PROGRESS RING (compact)
// ============================================
function ProgressRing({ value, size = 60, color = OM.blue, label }) {
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
                style={{ background: `linear-gradient(90deg, ${item.color || color}, ${item.color || color}80)`, boxShadow: `0 0 4px ${item.color || color}60` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// HELPERS de dados
// ============================================
const pesoDe = (p) => Number(p?.pesoTotal ?? p?.peso_total ?? p?.peso ?? 0) || 0;

// Fluxo de corte (statusCorte)
const CORTE_STAGES = [
  { key: 'aguardando', label: 'Aguardando', cor: OM.textDim },
  { key: 'programacao', label: 'Programação', cor: OM.blue },
  { key: 'em_corte', label: 'Em corte', cor: OM.amber },
  { key: 'conferencia', label: 'Conferência', cor: OM.violet },
  { key: 'liberado', label: 'Liberado', cor: OM.emerald },
];
const CORTE_KEYS = CORTE_STAGES.map((s) => s.key);

// Distribuição de saúde do estoque
const SAUDE_META = [
  { key: 'zerado', label: 'Zerado', cor: OM.rose },
  { key: 'critico', label: 'Crítico', cor: OM.orange },
  { key: 'baixo', label: 'Baixo', cor: OM.amber },
  { key: 'atencao', label: 'Atenção', cor: OM.violet },
  { key: 'saudavel', label: 'Saudável', cor: OM.emerald },
  { key: 'entregue', label: 'Entregue', cor: OM.cyan },
  { key: 'excesso', label: 'Excesso', cor: OM.blue },
  { key: 'sem_minimo', label: 'Sem mínimo', cor: OM.textDimmer },
];

// ============================================
// MAIN
// ============================================
export default function CommandCenterUltra() {
  const { obras } = useObras();
  const { pecas } = useProducao();
  const { estoque } = useEstoque();
  const { expedicoes } = useExpedicao();
  const { funcionarios: funcionariosCad } = useEquipes();

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const mapaNomes = useMemo(() => {
    const m = {};
    (funcionariosCad || []).forEach((f) => { if (f?.id) m[String(f.id)] = f.nome || String(f.id); });
    return m;
  }, [funcionariosCad]);

  const obrasAtivas = useMemo(() => (obras || []).filter(o => !['cancelada', 'concluida', 'orcamento'].includes(o.status)), [obras]);

  // ===== Produção global (por PESO) =====
  const resumoProd = useMemo(() => resumoProducao(pecas || []), [pecas]);
  const ETAPA_ICON = { aguardando: Layers, fabricacao: Factory, solda: Flame, pintura: Box, expedido: Truck, enviado: MapIcon, entregue: CheckCircle2 };
  const pipeline = useMemo(() => {
    const total = resumoProd.totalPeso || 0;
    return resumoProd.porEtapa
      .filter((e) => ['aguardando', 'fabricacao', 'solda', 'pintura', 'expedido'].includes(e.key))
      .map((e) => ({ key: e.key, label: e.label.replace(/ \(.*\)/, ''), icon: ETAPA_ICON[e.key] || Layers, color: e.cor, peso: e.peso, total, percent: total > 0 ? (e.peso / total * 100) : 0 }));
  }, [resumoProd]);
  const totalPcs = (pecas || []).reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
  const pesoTotal = resumoProd.totalPeso;
  const pesoConcluido = resumoProd.pesoConcluido;   // enviado + entregue
  const eficiencia = resumoProd.progressoPct;

  // ===== Corte (statusCorte) =====
  const corte = useMemo(() => {
    const stages = CORTE_STAGES.map((s) => ({ ...s, peso: 0, pecas: 0 }));
    const idx = Object.fromEntries(stages.map((s, i) => [s.key, i]));
    let totalPeso = 0;
    (pecas || []).forEach((p) => {
      const sc = p.statusCorte || p.status_corte;
      if (!sc || !CORTE_KEYS.includes(sc)) return;
      const linha = stages[idx[sc]];
      const peso = pesoDe(p);
      linha.peso += peso; linha.pecas += 1; totalPeso += peso;
    });
    const totalP = totalPeso || 0;
    stages.forEach((s) => { s.peso = Math.round(s.peso); s.percent = totalP > 0 ? (s.peso / totalP * 100) : 0; });
    const liberado = stages.find((s) => s.key === 'liberado');
    return { stages, totalPeso: Math.round(totalP), liberadoPeso: liberado?.peso || 0, temDados: totalP > 0 };
  }, [pecas]);

  // ===== Estoque (saúde + faltantes) =====
  const estoqueKpis = useMemo(() => kpisEstoque(estoque || []), [estoque]);
  const estoqueSaude = useMemo(() => {
    return SAUDE_META
      .map((s) => ({ ...s, n: estoqueKpis.porSaude?.[s.key] || 0 }))
      .filter((s) => s.n > 0);
  }, [estoqueKpis]);
  const topFalta = useMemo(() => {
    return resumoMaterialObra(estoque || []).linhas
      .filter((l) => l.status !== 'entregue' && l.falta > 0)
      .sort((a, b) => b.falta - a.falta)
      .slice(0, 8);
  }, [estoque]);

  // ===== Entrega / Expedição =====
  const entrega = useMemo(() => {
    const byKey = Object.fromEntries(resumoProd.porEtapa.map((e) => [e.key, e]));
    const stages = [
      { key: 'expedido', label: 'Fila de embarque', cor: OM.orange, peso: byKey.expedido?.peso || 0, pecas: byKey.expedido?.pecas || 0 },
      { key: 'enviado', label: 'Em obra', cor: OM.amber, peso: byKey.enviado?.peso || 0, pecas: byKey.enviado?.pecas || 0 },
      { key: 'entregue', label: 'Entregue', cor: OM.emerald, peso: byKey.entregue?.peso || 0, pecas: byKey.entregue?.pecas || 0 },
    ];
    const romaneios = (expedicoes || [])
      .map((e) => ({
        id: e.id,
        romaneio: e.romaneio || e.id,
        destino: e.destino || e.obraNome || '—',
        status: e.status || '—',
        peso: Number(e.pesoTotal || e.peso_total || 0) || 0,
        nPecas: Array.isArray(e.pecas) ? e.pecas.length : (Array.isArray(e.pecasIds) ? e.pecasIds.length : (Array.isArray(e.pecas_ids) ? e.pecas_ids.length : 0)),
      }))
      .sort((a, b) => b.peso - a.peso)
      .slice(0, 6);
    const pesoEmbarcado = stages.reduce((s, x) => s + x.peso, 0);
    return { stages, romaneios, nRomaneios: (expedicoes || []).length, pesoEmbarcado };
  }, [resumoProd, expedicoes]);

  // ===== Team Performance (por peso) =====
  const funcionarios = useMemo(() => {
    return porFuncionario(pecas || [], mapaNomes)
      .map((f) => ({ nome: f.funcionario, total: f.peso, etapas: f.porEtapa }))
      .slice(0, 8);
  }, [pecas, mapaNomes]);

  // ===== Gargalos de material (consolidado) =====
  const gargalos = useMemo(() => {
    const estPorObra = new Map();
    (estoque || []).forEach((e) => {
      const oid = e.obraId || e.obra_id;
      if (!oid) return;
      if (!estPorObra.has(oid)) estPorObra.set(oid, []);
      estPorObra.get(oid).push(e);
    });
    let pesoBloqueado = 0, pesoParcial = 0, faltaComprar = 0, nBloqueadas = 0;
    const perfilMap = new Map();
    const porObra = [];
    (obrasAtivas || []).forEach((o) => {
      const est = estPorObra.get(o.id);
      if (!est || !est.length) return;
      const pcsObra = (pecas || []).filter((p) => (p.obraId || p.obra_id) === o.id);
      const b = bloqueioFabricacao(pcsObra, resumoMaterialObra(est).linhas);
      if (b.itens.length === 0) return;
      pesoBloqueado += b.pesoBloqueado; pesoParcial += b.pesoParcial;
      faltaComprar += b.faltaComprarTotal; nBloqueadas += b.nBloqueadas;
      porObra.push({ id: o.id, pesoBloqueado: b.pesoBloqueado, faltaComprar: b.faltaComprarTotal });
      (b.porPerfil || []).forEach((g) => {
        if (!perfilMap.has(g.perfil)) perfilMap.set(g.perfil, { perfil: g.perfil, faltaComprar: 0, obras: new Set() });
        const acc = perfilMap.get(g.perfil);
        acc.faltaComprar += g.faltaComprar; acc.obras.add(o.codigo || o.id);
      });
    });
    const topPerfis = [...perfilMap.values()].map((p) => ({ ...p, nObras: p.obras.size }))
      .sort((a, b) => b.faltaComprar - a.faltaComprar).slice(0, 8);
    return {
      pesoBloqueado, pesoParcial, faltaComprar, nBloqueadas,
      pctTravado: pesoTotal > 0 ? ((pesoBloqueado + pesoParcial) / pesoTotal * 100) : 0,
      porObra, topPerfis,
    };
  }, [estoque, obrasAtivas, pecas, pesoTotal]);

  // ===== Portfolio de obras (operacional) =====
  const obrasRank = useMemo(() => {
    const riscoPorObra = Object.fromEntries((gargalos.porObra || []).map((g) => [g.id, g]));
    return obrasAtivas.map(o => {
      const pcsObra = (pecas || []).filter(p => (p.obraId || p.obra_id) === o.id);
      const rp = resumoProducao(pcsObra);
      const risco = riscoPorObra[o.id];
      return {
        ...o,
        pcs: pcsObra.length, pesoTotal: rp.totalPeso, pesoConcluido: rp.pesoConcluido,
        prog: rp.progressoPct,
        pesoBloqueado: risco?.pesoBloqueado || 0,
      };
    }).sort((a, b) => b.pesoTotal - a.pesoTotal).slice(0, 6);
  }, [obrasAtivas, pecas, gargalos]);

  return (
    <div className="min-h-screen -m-4 p-4 relative" style={{ background: OM.bgDeep }}>
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(${OM.blue} 1px, transparent 1px), linear-gradient(90deg, ${OM.blue} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }} />

      {/* ============ HEADER ============ */}
      <div className="relative mb-4 rounded-lg overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${OM.bgPanel}, ${OM.bgPanelAlt})`, border: `1px solid ${OM.borderStrong}`, boxShadow: `0 4px 24px -4px ${OM.blue}20` }}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${OM.blue}, ${OM.orange}, ${OM.emerald})` }} />
        <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl blur opacity-60" style={{ background: OM.blue }} />
              <div className="relative p-2.5 rounded-xl" style={{ background: `linear-gradient(135deg, ${OM.blueDeep}, ${OM.navy})`, border: `1px solid ${OM.borderStrong}` }}>
                <Cog className="h-6 w-6 text-white animate-spin-slow" style={{ animationDuration: '12s' }} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color: OM.blue }}>MONTEX OMEGA // OPS_CTRL</p>
              <h1 className="text-2xl font-black text-white tracking-tight">Command Center Ultra</h1>
              <p className="text-xs mt-0.5" style={{ color: OM.textDim }}>{now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="flex items-center gap-8 flex-wrap">
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: OM.textDim }}>Operações</p>
              <p className="text-2xl font-black tabular-nums" style={{ color: OM.blue }}>{obrasAtivas.length}</p>
              <p className="text-[9px]" style={{ color: OM.textDim }}>obras ativas</p>
            </div>
            <div className="w-px h-12" style={{ background: OM.border }} />
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: OM.textDim }}>Produção</p>
              <p className="text-2xl font-black tabular-nums" style={{ color: OM.orange }}>{fmtPeso(pesoTotal)}</p>
              <p className="text-[9px]" style={{ color: OM.textDim }}>{fmt(totalPcs)} peças</p>
            </div>
            <div className="w-px h-12" style={{ background: OM.border }} />
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: OM.textDim }}>Progresso</p>
              <p className="text-2xl font-black tabular-nums" style={{ color: eficiencia >= 75 ? OM.emerald : eficiencia >= 50 ? OM.amber : OM.rose }}>{Math.round(eficiencia)}%</p>
              <p className="text-[9px]" style={{ color: OM.textDim }}>ponderado/peso</p>
            </div>
            <div className="w-px h-12" style={{ background: OM.border }} />
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: OM.textDim }}>Entregue</p>
              <p className="text-2xl font-black tabular-nums" style={{ color: OM.emerald }}>{fmtPeso(pesoConcluido)}</p>
              <p className="text-[9px]" style={{ color: OM.textDim }}>em obra + concluído</p>
            </div>
          </div>
        </div>
      </div>

      {/* ============ STAT ROW (operacional) ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatBlock label="Produção" value={fmtPeso(pesoTotal)} sub={`${fmt(totalPcs)} peças · ${obrasAtivas.length} obras`} accent={OM.orange} icon={Factory} />
        <StatBlock label="Corte liberado" value={corte.temDados ? fmtPeso(corte.liberadoPeso) : '—'} sub={corte.temDados ? `de ${fmtPeso(corte.totalPeso)} em corte` : 'sem dados de corte'} accent={OM.emerald} icon={Scissors} />
        <StatBlock label="Estoque — cobertura" value={estoqueKpis.coberturaPct != null ? `${estoqueKpis.coberturaPct}%` : '—'} sub={`falta ${fmtPeso(estoqueKpis.totalFalta)} · ${fmt(estoqueKpis.alertas)} alertas`} accent={estoqueKpis.alertas > 0 ? OM.rose : OM.cyan} icon={Warehouse} />
        <StatBlock label="Entrega" value={fmtPeso(entrega.pesoEmbarcado)} sub={`${fmt(entrega.nRomaneios)} romaneio(s)`} accent={OM.violet} icon={Truck} />
      </div>

      {/* ============ PRODUCTION FLOW ============ */}
      <Section title="Fluxo de Produção" sub="funil por peso (ponderado)" icon={Factory} accent={OM.orange} className="mb-4"
        action={<span className="text-[10px] font-mono" style={{ color: OM.textDim }}>{fmt(totalPcs)} pcs · {fmtPeso(pesoTotal)}</span>}>
        <div className="flex items-stretch gap-1 flex-wrap">
          {pipeline.map((s, i) => {
            const { key, ...rest } = s;
            return <FlowStage key={key} {...rest} value={s.peso} percent={s.percent} isLast={i === pipeline.length - 1} />;
          })}
          <div className="flex flex-col items-center justify-center px-3 ml-2 rounded-lg"
            style={{ background: `linear-gradient(135deg, ${OM.emerald}20, ${OM.emerald}10)`, border: `1px solid ${OM.emerald}40` }}>
            <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: OM.emerald }}>Concluído</p>
            <p className="text-2xl font-black tabular-nums" style={{ color: OM.emerald }}>{fmtPeso(pesoConcluido)}</p>
            <p className="text-[9px] tabular-nums" style={{ color: OM.emerald }}>{fmtPct(eficiencia)}</p>
          </div>
        </div>
      </Section>

      {/* ============ CORTE + ESTOQUE ============ */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        {/* Corte */}
        <Section title="Corte de Material" sub="fluxo de corte por peso (statusCorte)" icon={Scissors} accent={OM.amber} className="col-span-12 lg:col-span-6"
          action={corte.temDados ? <span className="text-[10px] font-mono" style={{ color: OM.textDim }}>{fmtPeso(corte.totalPeso)}</span> : null}>
          {!corte.temDados ? (
            <p className="text-center text-xs italic py-6" style={{ color: OM.textDim }}>Sem peças com status de corte registrado</p>
          ) : (
            <>
              <div className="flex items-stretch gap-1 mb-3">
                {corte.stages.map((s, i) => (
                  <FlowStage key={s.key} label={s.label} value={s.peso} percent={s.percent} color={s.cor}
                    sub={`${fmt(s.pecas)} pç`} isLast={i === corte.stages.length - 1} />
                ))}
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: `${OM.emerald}10`, border: `1px solid ${OM.emerald}30` }}>
                <span className="text-[11px] font-semibold" style={{ color: OM.emerald }}>Liberado para fabricação</span>
                <span className="text-lg font-black tabular-nums" style={{ color: OM.emerald }}>{fmtPeso(corte.liberadoPeso)}</span>
              </div>
            </>
          )}
        </Section>

        {/* Estoque */}
        <Section title="Estoque de Material" sub="saúde e cobertura da fábrica" icon={Warehouse} accent={OM.cyan} className="col-span-12 lg:col-span-6"
          action={<span className="text-[10px] font-mono" style={{ color: estoqueKpis.alertas > 0 ? OM.rose : OM.emerald }}>{fmt(estoqueKpis.nItens)} itens</span>}>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="p-2.5 rounded-lg text-center" style={{ background: OM.bgRail, border: `1px solid ${OM.border}` }}>
              <p className="text-[9px] uppercase tracking-wider" style={{ color: OM.textDim }}>Cobertura</p>
              <p className="text-lg font-black tabular-nums" style={{ color: OM.cyan }}>{estoqueKpis.coberturaPct != null ? `${estoqueKpis.coberturaPct}%` : '—'}</p>
            </div>
            <div className="p-2.5 rounded-lg text-center" style={{ background: OM.bgRail, border: `1px solid ${OM.border}` }}>
              <p className="text-[9px] uppercase tracking-wider" style={{ color: OM.textDim }}>Falta</p>
              <p className="text-lg font-black tabular-nums" style={{ color: OM.amber }}>{fmtPeso(estoqueKpis.totalFalta)}</p>
            </div>
            <div className="p-2.5 rounded-lg text-center" style={{ background: OM.bgRail, border: `1px solid ${estoqueKpis.alertas > 0 ? OM.rose + '40' : OM.border}` }}>
              <p className="text-[9px] uppercase tracking-wider" style={{ color: OM.textDim }}>Alertas</p>
              <p className="text-lg font-black tabular-nums" style={{ color: estoqueKpis.alertas > 0 ? OM.rose : OM.emerald }}>{fmt(estoqueKpis.alertas)}</p>
            </div>
          </div>
          {estoqueSaude.length > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden mb-2" style={{ background: OM.bgRail }}>
              {estoqueSaude.map((s) => (
                <div key={s.key} style={{ width: `${(s.n / estoqueKpis.nItens) * 100}%`, background: s.cor }} title={`${s.label}: ${s.n}`} />
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
            {estoqueSaude.map((s) => (
              <span key={s.key} className="flex items-center gap-1 text-[9px]" style={{ color: OM.textDim }}>
                <span className="w-2 h-2 rounded-full" style={{ background: s.cor }} /> {s.label} {s.n}
              </span>
            ))}
          </div>
          {topFalta.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: OM.textDim }}>Maiores faltas (kg por perfil)</p>
              <BarList color={OM.amber} valueFormatter={fmtPeso}
                items={topFalta.slice(0, 6).map((l) => ({ label: l.perfil, value: l.falta, color: l.status === 'faltando' ? OM.rose : OM.amber }))} />
            </>
          )}
        </Section>
      </div>

      {/* ============ GARGALOS DE MATERIAL ============ */}
      <Section title="Gargalos de Material" sub="estoque faltante × peças não fabricáveis · todas as obras" icon={PackageX} accent={OM.rose} className="mb-4"
        action={<span className="text-[10px] font-mono" style={{ color: gargalos.pesoBloqueado > 0 ? OM.rose : OM.emerald }}>{fmtPct(gargalos.pctTravado)} do peso travado</span>}>
        {gargalos.pesoBloqueado === 0 && gargalos.pesoParcial === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2" style={{ color: OM.emerald }} />
            <p className="text-xs font-bold" style={{ color: OM.emerald }}>Nenhum gargalo de material nas obras com estoque cadastrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-5">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg" style={{ background: `${OM.rose}10`, border: `1px solid ${OM.rose}30` }}>
                  <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: OM.rose }}>Não fabricável</p>
                  <p className="text-xl font-black tabular-nums" style={{ color: OM.rose }}>{fmtPeso(gargalos.pesoBloqueado)}</p>
                  <p className="text-[9px]" style={{ color: OM.textDim }}>{fmt(gargalos.nBloqueadas)} peça(s)</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: `${OM.amber}10`, border: `1px solid ${OM.amber}30` }}>
                  <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: OM.amber }}>Material parcial</p>
                  <p className="text-xl font-black tabular-nums" style={{ color: OM.amber }}>{fmtPeso(gargalos.pesoParcial)}</p>
                  <p className="text-[9px]" style={{ color: OM.textDim }}>parte chegou</p>
                </div>
                <div className="p-3 rounded-lg col-span-2" style={{ background: `${OM.cyan}10`, border: `1px solid ${OM.cyan}30` }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: OM.cyan }}>Falta comprar (total)</p>
                      <p className="text-xl font-black tabular-nums" style={{ color: OM.cyan }}>{fmtPeso(gargalos.faltaComprar)}</p>
                    </div>
                    <ShoppingCart className="h-6 w-6" style={{ color: OM.cyan }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-7">
              <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: OM.textDim }}>Prioridade de compra — perfis (kg agregado entre obras)</p>
              {gargalos.topPerfis.length === 0 ? (
                <p className="text-xs italic" style={{ color: OM.textDim }}>Sem perfis pendentes</p>
              ) : (
                <BarList color={OM.cyan} valueFormatter={fmtPeso}
                  items={gargalos.topPerfis.map((p) => ({ label: `${p.perfil}  ·  ${p.nObras} obra(s)`, value: p.faltaComprar, color: OM.cyan }))} />
              )}
            </div>
          </div>
        )}
      </Section>

      {/* ============ ENTREGA + TEAM ============ */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        {/* Entrega / Expedição */}
        <Section title="Entrega & Expedição" sub="embarque → em obra → concluído" icon={Send} accent={OM.violet} className="col-span-12 lg:col-span-6">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {entrega.stages.map((s) => (
              <div key={s.key} className="p-2.5 rounded-lg text-center" style={{ background: `${s.cor}10`, border: `1px solid ${s.cor}30` }}>
                <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: s.cor }}>{s.label}</p>
                <p className="text-lg font-black tabular-nums" style={{ color: s.cor }}>{fmtPeso(s.peso)}</p>
                <p className="text-[9px]" style={{ color: OM.textDim }}>{fmt(s.pecas)} pç</p>
              </div>
            ))}
          </div>
          {entrega.romaneios.length === 0 ? (
            <p className="text-center text-xs italic py-3" style={{ color: OM.textDim }}>Sem romaneios de expedição</p>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: OM.textDim }}>Romaneios (maiores)</p>
              <div className="space-y-1.5">
                {entrega.romaneios.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 p-2 rounded-lg text-[11px]" style={{ background: OM.bgRail, border: `1px solid ${OM.border}` }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-white truncate font-medium">{r.romaneio} <span style={{ color: OM.textDim }}>· {r.destino}</span></p>
                      <p className="text-[9px]" style={{ color: OM.textDim }}>{r.status} · {fmt(r.nPecas)} pç</p>
                    </div>
                    <span className="font-bold tabular-nums" style={{ color: OM.violet }}>{fmtPeso(r.peso)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>

        {/* Team Performance */}
        <Section title="Produção por Funcionário" sub="ranking por peso (todas as etapas registradas)" icon={Users} accent={OM.amber} className="col-span-12 lg:col-span-6">
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
                  <div key={f.nome} className="relative p-3 rounded-lg" style={{ background: OM.bgRail, border: `1px solid ${OM.border}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full font-mono text-xs font-bold"
                        style={{ background: `${corRank}20`, color: corRank, border: `1px solid ${corRank}40` }}>
                        {medalha || `#${i + 1}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate text-white">{f.nome}</p>
                        <p className="text-[9px]" style={{ color: OM.textDim }}>{Object.keys(f.etapas).length} etapa(s) registrada(s)</p>
                      </div>
                      <span className="text-lg font-black tabular-nums" style={{ color: corRank }}>{fmtPeso(f.total)}</span>
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
      </div>

      {/* ============ PORTFOLIO DE OBRAS (operacional) ============ */}
      <Section title="Portfolio de Obras" sub="top 6 por peso · progresso, entrega e material" icon={Briefcase} accent={OM.blue}
        action={<span className="text-[10px]" style={{ color: OM.textDim }}>{obrasAtivas.length} ativas</span>}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {obrasRank.map(o => {
            const corProg = o.prog >= 75 ? OM.emerald : o.prog >= 50 ? OM.cyan : o.prog >= 25 ? OM.amber : OM.rose;
            return (
              <div key={o.id} className="relative p-4 rounded-lg" style={{ background: OM.bgPanel, border: `1px solid ${OM.border}` }}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${OM.blue}15`, color: OM.blue }}>{o.codigo}</span>
                    <p className="text-sm font-bold text-white mt-1 truncate">{o.nome}</p>
                    <p className="text-[10px] truncate" style={{ color: OM.textDim }}>{o.cliente || '—'}</p>
                  </div>
                  <ProgressRing value={o.prog} color={corProg} size={52} label="Prod" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-1.5 rounded" style={{ background: OM.bgRail }}>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: OM.textDim }}>Peso</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: OM.blue }}>{fmtPeso(o.pesoTotal)}</p>
                  </div>
                  <div className="p-1.5 rounded" style={{ background: OM.bgRail }}>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: OM.textDim }}>Entregue</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: OM.emerald }}>{fmtPeso(o.pesoConcluido)}</p>
                  </div>
                </div>
                {o.pesoBloqueado > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded text-[10px]" style={{ background: `${OM.rose}12`, border: `1px solid ${OM.rose}30` }}>
                    <PackageX className="h-3 w-3 flex-shrink-0" style={{ color: OM.rose }} />
                    <span style={{ color: OM.rose }} className="font-bold tabular-nums">{fmtPeso(o.pesoBloqueado)}</span>
                    <span style={{ color: OM.textDim }}>sem material p/ fabricar</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Footer */}
      <div className="mt-4 text-center text-[10px] font-mono" style={{ color: OM.textDim }}>
        MONTEX OMEGA · COMMAND CENTER ULTRA v5 · OPERAÇÕES · {now.toLocaleTimeString('pt-BR')}
      </div>

      <style>{`
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: ${OM.blue}40; border-radius: 2px; }
      `}</style>
    </div>
  );
}
