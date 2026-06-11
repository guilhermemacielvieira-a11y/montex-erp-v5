// ============================================================
// DASHBOARD MOBILE — Análise estratégica (nível sênior)
// ============================================================
// Painel analítico NATIVO mobile (substitui o wrapper escalado do
// DashboardPremium desktop, ilegível no celular). Consolida os
// principais módulos do ERP em KPIs + GRÁFICOS leves (recharts):
//   1. KPIs estratégicos (avanço físico, produção, financeiro)
//   2. Avanço da obra vs contrato (radial gauge — peso)
//   3. Funil de produção por etapa (barras horizontais — peso)
//   4. Financeiro: realizado x previsto (barras agrupadas)
//   5. Composição por tipo de peça (donut — top tipos)
//   6. Ranking de obras (quando "Todas") por avanço de produção
// Respeita as regras do CLAUDE.md:
//   - Montadas vêm do entity_store (montagemSync), NÃO da etapa (#6)
//   - Peso total = pesoTotal ?? peso*quantidade
//   - Filtro global por obra (matchObra) em todos os datasets
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList,
  RadialBarChart, RadialBar, PolarAngleAxis, PieChart, Pie,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Factory, Wallet, Layers,
  Target, ChevronRight, Building2, AlertTriangle, DollarSign,
} from 'lucide-react';
import MobileLayout from '../MobileLayout';
import { useERP } from '@/contexts/ERPContext';
import { useObraFiltro } from '../ObraContext';
import { loadConcluidasSmart } from '@/utils/montagemSync';
import {
  isRecebida, valorMedicao, isDespesaPaga, isDespesaAberta, isDespesaAtrasada,
  contratoPesoKg, contratoValor,
} from '../dados';
import { usePainelGlobal, kpisDe, futuroDe } from '../usePainelGlobal';

// ── Helpers de formatação ──────────────────────────────────
const fmtBR = (n, dec = 0) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtMoney = (n) => 'R$ ' + fmtBR(n, 0);
const fmtTon = (kg) => fmtBR((Number(kg) || 0) / 1000, 1) + ' t';
const fmtMoneyShort = (n) => {
  const v = Number(n) || 0; const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (a >= 1e3) return Math.round(v / 1e3) + 'k';
  return String(Math.round(v));
};
// Peso total da peça: prefere o campo agregado, cai p/ unitário×qtd (regra mobile)
const pesoDe = (p) => Number(p.pesoTotal) || (Number(p.peso) || 0) * (Number(p.quantidade) || 1);

// Paleta de etapas (etapas REAIS do banco — auditoria 11/06 incluiu 'entregue')
const ETAPAS = [
  { key: 'aguardando', label: 'Aguardando', color: '#475569' },
  { key: 'fabricacao', label: 'Fabricação', color: '#3b82f6' },
  { key: 'solda', label: 'Solda', color: '#f59e0b' },
  { key: 'pintura', label: 'Pintura', color: '#8b5cf6' },
  { key: 'expedido', label: 'Expedido', color: '#f97316' },
  { key: 'enviado', label: 'Em obra', color: '#eab308' },
  { key: 'entregue', label: 'Entregue', color: '#14b8a6' },
  { key: 'montado', label: 'Montado', color: '#22c55e' },
];
const TIPO_CORES = ['#f59e0b', '#3b82f6', '#8b5cf6', '#22c55e', '#ec4899', '#06b6d4', '#64748b'];

// Tooltip escuro compacto (recharts default é branco — ilegível no tema)
function DarkTooltip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 text-[11px] shadow-xl">
      {label != null && <div className="font-semibold text-slate-200 mb-0.5">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5 text-slate-300">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.color }} />
          {p.name}: <span className="font-bold text-slate-100">{fmt ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ icon: Icon, children, action }) {
  return (
    <div className="flex items-center justify-between mb-2 mt-5 px-4">
      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />} {children}
      </div>
      {action}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color = 'amber', to }) {
  const C = {
    amber: { bg: 'from-amber-500/15 to-amber-600/5', ic: 'text-amber-400', bd: 'border-amber-500/20' },
    blue: { bg: 'from-blue-500/15 to-blue-600/5', ic: 'text-blue-400', bd: 'border-blue-500/20' },
    green: { bg: 'from-emerald-500/15 to-emerald-600/5', ic: 'text-emerald-400', bd: 'border-emerald-500/20' },
    red: { bg: 'from-red-500/15 to-red-600/5', ic: 'text-red-400', bd: 'border-red-500/20' },
    violet: { bg: 'from-violet-500/15 to-violet-600/5', ic: 'text-violet-400', bd: 'border-violet-500/20' },
  }[color] || {};
  const Inner = (
    <div className={`relative h-full bg-gradient-to-br ${C.bg} border ${C.bd} rounded-2xl p-3.5 active:scale-[.98] transition`}>
      <div className="flex items-start justify-between mb-1.5">
        <Icon className={C.ic} style={{ width: 18, height: 18 }} />
        {to && <ChevronRight className="w-4 h-4 text-slate-600" />}
      </div>
      <div className="text-lg font-black tracking-tight leading-none">{value}</div>
      <div className="text-[10px] text-slate-400 mt-1">{label}</div>
      {sub && <div className={`text-[10px] mt-0.5 ${C.ic}`}>{sub}</div>}
    </div>
  );
  return to ? <Link to={to} className="block h-full">{Inner}</Link> : Inner;
}

// Card-container de um gráfico
function ChartCard({ children }) {
  return <div className="mx-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-3">{children}</div>;
}

export default function DashboardMobile() {
  const erp = useERP?.() || {};
  const { obras = [], pecas = [], lancamentosDespesas = [], medicoes = [] } = erp;
  const { matchObra, isTodas, obraSelecionada } = useObraFiltro();
  // Montadas: entity_store/localStorage (independente da etapa — regra #6)
  const [concluidas, setConcluidas] = useState(() => loadConcluidasSmart(r => setConcluidas(r || {})) || {});

  // Datasets filtrados pela obra global
  const pecasF = useMemo(() => pecas.filter(matchObra), [pecas, matchObra]);
  // Blocos de OBRA: só despesas VINCULADAS a obra. Fábrica/adm (sem obra) vivem
  // no Painel Global — sem este filtro, no modo "Todas" a margem de obra somava
  // o custo fixo da empresa inteira e ficava milhões negativa (irreal).
  const temObra = (x) => (x?.obraId ?? x?.obra_id ?? x?.obra?.id) != null;
  const despesas = useMemo(() => lancamentosDespesas.filter(temObra).filter(matchObra), [lancamentosDespesas, matchObra]);
  const receitas = useMemo(() => medicoes.filter(matchObra), [medicoes, matchObra]);
  const obrasEscopo = useMemo(
    () => (isTodas ? obras : obras.filter(o => o.id === obraSelecionada?.id)),
    [obras, isTodas, obraSelecionada]
  );

  // ── Produção: peso por etapa (montado sobrepõe a etapa do banco) ──
  const prod = useMemo(() => {
    const m = {}; ETAPAS.forEach(e => { m[e.key] = { peso: 0, conjuntos: 0 }; });
    let pesoTotal = 0;
    for (const p of pecasF) {
      const w = pesoDe(p); pesoTotal += w;
      const montada = !!concluidas[String(p.id)];
      const etapa = montada ? 'montado' : (p.etapa || 'aguardando').toLowerCase();
      const slot = m[etapa] || m.aguardando;
      slot.peso += w; slot.conjuntos += 1;
    }
    // "Concluído na fábrica" = saiu da fábrica (expedido+enviado+entregue+montado)
    const pesoSaiu = m.expedido.peso + m.enviado.peso + m.entregue.peso + m.montado.peso;
    const pesoMontado = m.montado.peso;
    const pesoCampo = m.enviado.peso + m.entregue.peso + m.montado.peso; // em obra
    return {
      m, pesoTotal, pesoSaiu, pesoMontado, pesoCampo,
      pctProducao: pesoTotal ? (pesoSaiu / pesoTotal) * 100 : 0,
      pctMontagem: pesoCampo ? (pesoMontado / pesoCampo) * 100 : 0,
    };
  }, [pecasF, concluidas]);

  // Peso/valor contratados (fonte única ../dados — contrato_peso_total em KG)
  const pesoContrato = useMemo(() => obrasEscopo.reduce((s, o) => s + contratoPesoKg(o), 0), [obrasEscopo]);
  const valorContrato = useMemo(() => obrasEscopo.reduce((s, o) => s + contratoValor(o), 0), [obrasEscopo]);
  // Obras do escopo SEM valor de contrato cadastrado (dados incompletos → backlog subestimado)
  const obrasSemContrato = useMemo(() => obrasEscopo.filter(o => !contratoValor(o)), [obrasEscopo]);
  // Avanço físico da obra = peso montado / peso contratado
  const pctAvancoFisico = pesoContrato ? Math.min(100, (prod.pesoMontado / pesoContrato) * 100) : 0;

  // ── Financeiro (predicados da fonte única: medição recebida = 'paga') ──
  const fin = useMemo(() => {
    const desPagas = despesas.filter(isDespesaPaga).reduce((s, d) => s + (Number(d.valor) || 0), 0);
    const desPend = despesas.filter(isDespesaAberta).reduce((s, d) => s + (Number(d.valor) || 0), 0);
    const recPagas = receitas.filter(isRecebida).reduce((s, r) => s + valorMedicao(r), 0);
    const recPend = receitas.filter(r => !isRecebida(r)).reduce((s, r) => s + valorMedicao(r), 0);
    const hoje = new Date().toISOString().slice(0, 10);
    const atrasadas = despesas.filter(d => isDespesaAtrasada(d, hoje));
    const desAtraso = atrasadas.reduce((s, d) => s + (Number(d.valor) || 0), 0);
    const margem = (recPagas + recPend) - (desPagas + desPend);
    const medidoTotal = recPagas + recPend;
    return {
      desPagas, desPend, recPagas, recPend, medidoTotal,
      saldoReal: recPagas - desPagas, saldoProj: recPend - desPend, margem,
      atrasoCount: atrasadas.length, desAtraso,
      pctFaturado: valorContrato ? (recPagas / valorContrato) * 100 : 0,
      // Backlog comercial = contrato − tudo já medido (a executar/medir)
      backlog: Math.max(0, valorContrato - medidoTotal),
    };
  }, [despesas, receitas, valorContrato]);

  // ── EMPRESA (Painel Financeiro Global) — caixa geral, ≠ financeiro de obra ──
  const { todasMovs: movsGlobais, metas: metasGlobais } = usePainelGlobal();
  const empresa = useMemo(() => kpisDe(movsGlobais), [movsGlobais]);
  const empresaFuturo = useMemo(() => futuroDe(movsGlobais, Number(metasGlobais?.saldoMinimo) || 50000), [movsGlobais, metasGlobais]);

  // ── Fluxo de caixa mensal (últimos 6 meses, realizado) ──
  // Receita: medições recebidas por mês (dataMedicao); Despesa: pagas por
  // mês de vencimento (proxy de competência — data de pagamento não existe).
  const fluxoMensal = useMemo(() => {
    const meses = [];
    const ref = new Date(); ref.setDate(1);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      meses.push({ ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, name: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), Receita: 0, Despesa: 0 });
    }
    const slot = (s) => meses.find(m => m.ym === String(s || '').slice(0, 7));
    for (const r of receitas) { if (isRecebida(r)) { const m = slot(r.dataMedicao || r.data_medicao || r.data); if (m) m.Receita += valorMedicao(r); } }
    for (const d of despesas) { if (isDespesaPaga(d)) { const m = slot(d.dataVencimento || d.data_vencimento || d.dataEmissao || d.data_emissao); if (m) m.Despesa += Number(d.valor) || 0; } }
    return meses.map(m => ({ ...m, Receita: Math.round(m.Receita), Despesa: Math.round(m.Despesa) }));
  }, [receitas, despesas]);
  const temFluxo = fluxoMensal.some(m => m.Receita || m.Despesa);

  // ── Visão executiva por obra (modo "Todas"): margem e backlog ──
  const execObras = useMemo(() => {
    if (!isTodas) return [];
    return obras.map(o => {
      const okObra = (x) => (x.obraId ?? x.obra_id ?? x.obra?.id) === o.id;
      const rec = medicoes.filter(okObra);
      const des = lancamentosDespesas.filter(okObra).filter(d => !String(d.status || '').toLowerCase().includes('cancelado'));
      const medido = rec.reduce((s, r) => s + valorMedicao(r), 0);
      const recebido = rec.filter(isRecebida).reduce((s, r) => s + valorMedicao(r), 0);
      const gasto = des.reduce((s, d) => s + (Number(d.valor) || 0), 0);
      const contrato = contratoValor(o);
      return {
        id: o.id, nome: o.nome || o.codigo || o.id,
        contrato, medido, recebido, gasto,
        margem: medido - gasto,
        backlog: Math.max(0, contrato - medido),
        semContrato: !contrato,
      };
    }).filter(o => o.contrato || o.medido || o.gasto)
      .sort((a, b) => b.margem - a.margem);
  }, [isTodas, obras, medicoes, lancamentosDespesas]);

  // ── Charts data ──
  const funilData = useMemo(
    () => ETAPAS.filter(e => prod.m[e.key].conjuntos > 0)
      .map(e => ({ label: e.label, peso: Math.round(prod.m[e.key].peso), conjuntos: prod.m[e.key].conjuntos, color: e.color })),
    [prod]
  );
  const finData = useMemo(() => [
    { name: 'Receitas', Realizado: Math.round(fin.recPagas), Previsto: Math.round(fin.recPend) },
    { name: 'Despesas', Realizado: Math.round(fin.desPagas), Previsto: Math.round(fin.desPend) },
  ], [fin]);
  const tipoData = useMemo(() => {
    const m = {};
    for (const p of pecasF) { const t = (p.tipo || 'OUTROS').toUpperCase(); m[t] = (m[t] || 0) + pesoDe(p); }
    const arr = Object.entries(m).map(([name, peso]) => ({ name, peso: Math.round(peso) })).sort((a, b) => b.peso - a.peso);
    const top = arr.slice(0, 6);
    const resto = arr.slice(6).reduce((s, x) => s + x.peso, 0);
    if (resto > 0) top.push({ name: 'OUTROS', peso: resto });
    return top;
  }, [pecasF]);
  // Ranking de obras (só no modo "Todas")
  const rankObras = useMemo(() => {
    if (!isTodas) return [];
    return obras.map(o => {
      const ps = pecas.filter(p => (p.obraId ?? p.obra_id ?? p.obra?.id) === o.id);
      let total = 0, saiu = 0;
      for (const p of ps) {
        const w = pesoDe(p); total += w;
        const et = concluidas[String(p.id)] ? 'montado' : (p.etapa || '').toLowerCase();
        if (['expedido', 'enviado', 'entregue', 'montado'].includes(et)) saiu += w;
      }
      return { nome: (o.nome || o.codigo || o.id).slice(0, 14), pct: total ? Math.round((saiu / total) * 100) : 0, total };
    }).filter(o => o.total > 0).sort((a, b) => b.pct - a.pct).slice(0, 6);
  }, [isTodas, obras, pecas, concluidas]);

  const semDados = pecasF.length === 0 && despesas.length === 0 && receitas.length === 0;

  return (
    <MobileLayout title="Dashboard" obraFilter>
      <div className="px-4 pt-4 pb-1">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Análise estratégica</div>
        <div className="text-xl font-bold mt-0.5">{isTodas ? 'Visão Consolidada' : (obraSelecionada?.nome || 'Obra')}</div>
      </div>

      {semDados && (
        <div className="mx-4 mt-4 p-6 text-center text-slate-400 text-sm bg-slate-900/60 border border-slate-800 rounded-2xl">
          Sem dados para exibir nesta seleção.
        </div>
      )}

      {!semDados && (<>
        {/* ── KPIs estratégicos (visão CEO) ───────────────── */}
        <div className="px-4 grid grid-cols-2 gap-2.5 mt-3">
          <KpiCard icon={Target} label="Avanço físico (obra)" value={`${pctAvancoFisico.toFixed(0)}%`}
            sub={`${fmtTon(prod.pesoMontado)} / ${fmtTon(pesoContrato)}`} color="green" to="/m/montagem" />
          <KpiCard icon={Factory} label="Produção (fábrica)" value={`${prod.pctProducao.toFixed(0)}%`}
            sub={`${fmtTon(prod.pesoSaiu)} fora da fábrica`} color="blue" to="/m/producao" />
          <KpiCard icon={fin.margem >= 0 ? TrendingUp : TrendingDown} label="Margem (medido − gasto)"
            value={fmtMoney(fin.margem)} sub={`Caixa realizado ${fmtMoneyShort(fin.saldoReal)}`}
            color={fin.margem >= 0 ? 'green' : 'red'} to="/m/financeiro" />
          <KpiCard icon={DollarSign} label="Recebido / contrato" value={`${fin.pctFaturado.toFixed(0)}%`}
            sub={`${fmtMoneyShort(fin.recPagas)} de ${fmtMoneyShort(valorContrato)}`} color="amber" to="/m/receitas" />
          <KpiCard icon={Wallet} label="A receber (medido)" value={fmtMoney(fin.recPend)}
            sub={`${fmtMoneyShort(fin.desPend)} a pagar`} color="violet" to="/m/receitas" />
          <KpiCard icon={Building2} label="Backlog (a medir)" value={fmtMoney(fin.backlog)}
            sub={obrasSemContrato.length ? `${obrasSemContrato.length} obra(s) sem valor de contrato` : 'Contrato − medições'}
            color="blue" to="/m/obras" />
        </div>

        {/* ── EMPRESA: caixa geral (Painel Global) — separado das obras ── */}
        <SectionTitle icon={Wallet} action={<Link to="/m/painel-global" className="text-[11px] font-bold text-amber-400 pr-4">Painel Global</Link>}>
          Empresa — caixa geral
        </SectionTitle>
        <div className="px-4 grid grid-cols-2 gap-2.5">
          <KpiCard icon={empresa.lucro >= 0 ? TrendingUp : TrendingDown} label="Resultado da empresa"
            value={fmtMoney(empresa.lucro)} sub={`Margem ${empresa.margem.toFixed(1)}% · ${empresa.qtd} mov.`}
            color={empresa.lucro >= 0 ? 'green' : 'red'} to="/m/painel-global" />
          <KpiCard icon={Wallet} label="Saldo projetado 30d"
            value={fmtMoney(empresaFuturo.saldo30)}
            sub={empresaFuturo.semanasCriticas ? `${empresaFuturo.semanasCriticas} semana(s) abaixo do mínimo` : `+${fmtMoneyShort(empresaFuturo.receber30)} / −${fmtMoneyShort(empresaFuturo.pagar30)}`}
            color={empresaFuturo.saldo30 >= 0 ? 'blue' : 'red'} to="/m/painel-global" />
        </div>
        <div className="px-5 mt-1.5 text-[10px] text-slate-500">
          Caixa geral consolidado (fábrica + obras + painel). Os blocos abaixo analisam as OBRAS (contratos e medições).
        </div>

        {/* Dados incompletos: obra sem valor de contrato distorce backlog/% */}
        {obrasSemContrato.length > 0 && (
          <div className="mx-4 mt-3 flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="text-[11px] text-amber-200/90">
              Sem valor de contrato: <b>{obrasSemContrato.map(o => o.nome || o.id).join(', ')}</b> — backlog e % recebido ficam subestimados. Cadastre em Obras.
            </div>
          </div>
        )}

        {/* Alerta de despesas em atraso */}
        {fin.atrasoCount > 0 && (
          <Link to="/m/despesas" className="mx-4 mt-3 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 active:scale-[.99] transition">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-red-300">{fin.atrasoCount} despesa(s) em atraso</div>
              <div className="text-[11px] text-red-400/80">{fmtMoney(fin.desAtraso)} vencidos</div>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400" />
          </Link>
        )}

        {/* ── Avanço físico (radial gauge) ────────────────── */}
        <SectionTitle icon={Target}>Avanço da obra vs contrato</SectionTitle>
        <ChartCard>
          <div className="flex items-center">
            <div className="relative" style={{ width: 150, height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: 'Avanço', value: Math.round(pctAvancoFisico), fill: '#22c55e' }]}
                  startAngle={90} endAngle={-270}>
                  {/* domain fixo 0–100: sem isto o anel sempre preenche 100% (escala pelo próprio valor) */}
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background={{ fill: '#1e293b' }} dataKey="value" cornerRadius={8} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-black text-emerald-400">{pctAvancoFisico.toFixed(0)}%</div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wide">montado</div>
              </div>
            </div>
            <div className="flex-1 pl-3 space-y-2">
              <GaugeRow label="Contratado" value={fmtTon(pesoContrato)} color="#64748b" />
              <GaugeRow label="Em obra" value={fmtTon(prod.pesoCampo)} color="#eab308" />
              <GaugeRow label="Montado" value={fmtTon(prod.pesoMontado)} color="#22c55e" />
              <GaugeRow label="Montagem em campo" value={`${prod.pctMontagem.toFixed(0)}%`} color="#22c55e" />
            </div>
          </div>
        </ChartCard>

        {/* ── Funil de produção por etapa ─────────────────── */}
        <SectionTitle icon={Layers} action={<Link to="/m/producao" className="text-[11px] font-bold text-amber-400 pr-4">Detalhes</Link>}>
          Funil de produção (peso)
        </SectionTitle>
        <ChartCard>
          <ResponsiveContainer width="100%" height={Math.max(140, funilData.length * 34)}>
            <BarChart data={funilData} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }} barSize={16}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={72} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#ffffff08' }} content={<DarkTooltip fmt={(v) => fmtBR(v) + ' kg'} />} />
              <Bar dataKey="peso" name="Peso" radius={[0, 6, 6, 0]}>
                {funilData.map((e, i) => <Cell key={i} fill={e.color} />)}
                <LabelList dataKey="peso" position="right" formatter={(v) => fmtTon(v)} style={{ fontSize: 9, fill: '#cbd5e1' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ── Financeiro: realizado x previsto ────────────── */}
        <SectionTitle icon={Wallet} action={<Link to="/m/financeiro" className="text-[11px] font-bold text-amber-400 pr-4">Detalhes</Link>}>
          Obras — realizado x previsto (medições)
        </SectionTitle>
        <ChartCard>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={finData} margin={{ top: 10, right: 4, left: -8, bottom: 0 }} barGap={4}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={fmtMoneyShort} axisLine={false} tickLine={false} width={40} />
              <Tooltip cursor={{ fill: '#ffffff08' }} content={<DarkTooltip fmt={fmtMoney} />} />
              <Bar dataKey="Realizado" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Previsto" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-[10px] text-slate-400 mt-1">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Realizado (pago)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Previsto (pendente)</span>
          </div>
        </ChartCard>

        {/* ── Fluxo de caixa mensal (realizado, 6 meses) ──── */}
        {temFluxo && (<>
          <SectionTitle icon={TrendingUp} action={<Link to="/m/financeiro" className="text-[11px] font-bold text-amber-400 pr-4">Detalhes</Link>}>
            Obras — fluxo 6 meses (medições x despesas)
          </SectionTitle>
          <ChartCard>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={fluxoMensal} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={2}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={fmtMoneyShort} axisLine={false} tickLine={false} width={40} />
                <Tooltip cursor={{ fill: '#ffffff08' }} content={<DarkTooltip fmt={fmtMoney} />} />
                <Bar dataKey="Receita" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Despesa" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-[10px] text-slate-400 mt-1">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Recebido</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Pago</span>
            </div>
          </ChartCard>
        </>)}

        {/* ── Visão executiva por obra (margem & backlog) ─── */}
        {isTodas && execObras.length > 0 && (<>
          <SectionTitle icon={Building2}>Resultado por obra</SectionTitle>
          <div className="mx-4 bg-slate-900/70 border border-slate-800 rounded-2xl divide-y divide-slate-800">
            {execObras.map(o => (
              <div key={o.id} className="px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[13px] truncate flex-1">{o.nome}</span>
                  {o.semContrato && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">SEM CONTRATO</span>}
                  <span className={`text-[13px] font-black ${o.margem >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmtMoneyShort(o.margem)}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 mt-1.5 text-center">
                  <MiniStat label="Contrato" value={o.contrato ? fmtMoneyShort(o.contrato) : '—'} />
                  <MiniStat label="Medido" value={fmtMoneyShort(o.medido)} />
                  <MiniStat label="Gasto" value={fmtMoneyShort(o.gasto)} />
                  <MiniStat label="Backlog" value={o.contrato ? fmtMoneyShort(o.backlog) : '—'} />
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 mt-1.5 text-[10px] text-slate-500">
            Margem = medições (recebidas + a receber) − despesas não-canceladas, por obra.
          </div>
        </>)}

        {/* ── Composição por tipo ─────────────────────────── */}
        {tipoData.length > 0 && (<>
          <SectionTitle icon={Layers}>Composição por tipo (peso)</SectionTitle>
          <ChartCard>
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={tipoData} dataKey="peso" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={64} paddingAngle={2} stroke="none">
                    {tipoData.map((e, i) => <Cell key={i} fill={TIPO_CORES[i % TIPO_CORES.length]} />)}
                  </Pie>
                  <Tooltip content={<DarkTooltip fmt={(v) => fmtTon(v)} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {tipoData.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-2 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: TIPO_CORES[i % TIPO_CORES.length] }} />
                    <span className="text-slate-300 flex-1 truncate">{t.name}</span>
                    <span className="text-slate-100 font-semibold">{fmtTon(t.peso)}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </>)}

        {/* ── Ranking de obras (modo Todas) ───────────────── */}
        {isTodas && rankObras.length > 0 && (<>
          <SectionTitle icon={Building2} action={<Link to="/m/obras" className="text-[11px] font-bold text-amber-400 pr-4">Ver obras</Link>}>
            Ranking de obras (% produção)
          </SectionTitle>
          <ChartCard>
            <ResponsiveContainer width="100%" height={Math.max(140, rankObras.length * 34)}>
              <BarChart data={rankObras} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }} barSize={16}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="nome" width={92} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#ffffff08' }} content={<DarkTooltip fmt={(v) => v + '%'} />} />
                <Bar dataKey="pct" name="Produção" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                  <LabelList dataKey="pct" position="right" formatter={(v) => v + '%'} style={{ fontSize: 9, fill: '#cbd5e1' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>)}

        {/* Link p/ BI desktop completo */}
        <div className="px-4 mt-5">
          <Link to="/m/dashboard-bi" className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl active:scale-[.99] transition">
            <div>
              <div className="text-sm font-semibold">Dashboard BI completo</div>
              <div className="text-[11px] text-slate-400">Versão desktop detalhada</div>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-400" />
          </Link>
        </div>
      </>)}

      <div className="h-6" />
    </MobileLayout>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-slate-800/50 rounded-lg py-1">
      <div className="text-[8px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-[11px] font-bold text-slate-200">{value}</div>
    </div>
  );
}

function GaugeRow({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-slate-400 flex-1">{label}</span>
      <span className="text-slate-100 font-bold">{value}</span>
    </div>
  );
}
