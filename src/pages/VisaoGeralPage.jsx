// ============================================
// VISÃO GERAL - Painel Operacional MONTEX
// ============================================
// Foco: produção, obras, expedição, funcionários.
// Financeiro como apoio secundário.
// ============================================

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Factory, Package, Truck, Users, AlertTriangle, CheckCircle2,
  Activity, BarChart3, ArrowUpRight, ArrowDownRight, RefreshCw,
  Building2, Target, Zap, Clock, TrendingUp, Award, Layers,
  Wrench, Paintbrush, Send, Hammer, Scissors,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { useObras, useProducao, useLancamentos, useMedicoes } from '../contexts/ERPContext';
import { supabase } from '../api/supabaseClient';
import { GRUPOS_OBRAS } from './AnaliseProducaoPage';
import { useFinancialIntelligence } from '../hooks/useFinancialIntelligence';

// ============================================
// HELPERS
// ============================================
const fmt = (v) => v == null || isNaN(v) ? '—' : Math.round(v).toLocaleString('pt-BR');
const fmtR$ = (v) => v == null || isNaN(v) ? 'R$ —' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
const fmtPeso = (kg) => {
  if (kg == null || isNaN(kg)) return '—';
  if (Math.abs(kg) >= 1000) return (kg / 1000).toFixed(1) + 't';
  return Math.round(kg).toLocaleString('pt-BR') + ' kg';
};
const fmtPct = (v) => v == null || isNaN(v) ? '—' : Math.round(v) + '%';
const parseLocalDate = (s) => {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  return new Date(s);
};
const hojeISO = () => new Date().toISOString().split('T')[0];

// ============================================
// HOOK: produção do dia + ranking funcionários
// ============================================
function useProducaoHoje() {
  const [lancamentosHoje, setLancamentosHoje] = useState([]);
  const [rankingMes, setRankingMes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
        const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
        const { data } = await supabase
          .from('producao_historico')
          .select('id, peca_id, funcionario_id, funcionario_nome, etapa_de, etapa_para, quantidade, data_movimentacao, obra_id')
          .gte('data_movimentacao', inicioMes)
          .limit(5000);

        if (cancel) return;
        const all = data || [];
        const hojeData = all.filter(h => (h.data_movimentacao || '') >= inicioHoje);
        setLancamentosHoje(hojeData);

        // Ranking do mês por funcionário
        const map = {};
        all.forEach(h => {
          const nome = h.funcionario_nome || 'Sem responsável';
          if (!map[nome]) map[nome] = { nome, qtd: 0, etapas: new Set() };
          map[nome].qtd += parseInt(h.quantidade) || 1;
          map[nome].etapas.add(h.etapa_para || h.etapa_de);
        });
        const rank = Object.values(map)
          .map(r => ({ ...r, etapas: Array.from(r.etapas).join(', ') }))
          .sort((a, b) => b.qtd - a.qtd)
          .slice(0, 10);
        setRankingMes(rank);
      } catch (e) {
        console.warn('[VisaoGeral] erro produção hoje:', e?.message);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  return { lancamentosHoje, rankingMes, loading };
}

// ============================================
// HOOK: expedição (peças em fila de embarque + romaneios)
// ============================================
function useExpedicaoResumo(pecas) {
  return useMemo(() => {
    const expedidas = (pecas || []).filter(p => p.etapa === 'expedido');
    const enviadas = (pecas || []).filter(p => p.etapa === 'enviado');
    const pesoExpedido = expedidas.reduce((s, p) => s + (parseFloat(p.pesoTotal) || parseFloat(p.peso) || 0), 0);
    const pesoEnviado = enviadas.reduce((s, p) => s + (parseFloat(p.pesoTotal) || parseFloat(p.peso) || 0), 0);
    const qtdExpedida = expedidas.reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
    const qtdEnviada = enviadas.reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);

    // Por obra
    const porObra = {};
    expedidas.forEach(p => {
      const id = p.obraId || 'sem-obra';
      const nome = p.obraNome || '—';
      if (!porObra[id]) porObra[id] = { nome, qtd: 0, peso: 0 };
      porObra[id].qtd += parseInt(p.quantidade) || 1;
      porObra[id].peso += parseFloat(p.pesoTotal) || parseFloat(p.peso) || 0;
    });
    const filaPorObra = Object.values(porObra).sort((a, b) => b.peso - a.peso).slice(0, 6);

    return { qtdExpedida, qtdEnviada, pesoExpedido, pesoEnviado, filaPorObra };
  }, [pecas]);
}

// ============================================
// COMPONENTE: KPI Card Operacional
// ============================================
function KPIOpCard({ icon: Icon, label, value, sub, cor = 'blue', extra }) {
  const cores = {
    blue: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-300',
    emerald: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30 text-emerald-300',
    amber: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300',
    purple: 'from-purple-500/20 to-violet-500/10 border-purple-500/30 text-purple-300',
    rose: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-300',
    cyan: 'from-cyan-500/20 to-teal-500/10 border-cyan-500/30 text-cyan-300',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${cores[cor]} border rounded-xl p-4 backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">{label}</span>
        <Icon className="h-4 w-4 opacity-70" />
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-1">{sub}</div>}
      {extra}
    </motion.div>
  );
}

// ============================================
// COMPONENTE: Card Obra
// ============================================
function ObraCard({ obra, pecas, medicoes }) {
  const pecasObra = (pecas || []).filter(p => p.obraId === obra.id);
  const totalPecas = pecasObra.reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
  const expedidas = pecasObra.filter(p => ['expedido','enviado','entregue','montagem'].includes(p.etapa));
  const qtdExpedida = expedidas.reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
  const pct = totalPecas > 0 ? Math.round((qtdExpedida / totalPecas) * 100) : 0;
  const pesoTotal = pecasObra.reduce((s, p) => s + (parseFloat(p.pesoTotal) || parseFloat(p.peso) || 0), 0);
  const pesoProduzido = expedidas.reduce((s, p) => s + (parseFloat(p.pesoTotal) || parseFloat(p.peso) || 0), 0);

  // Receita acumulada (medições pagas)
  const receitaRecebida = (medicoes || [])
    .filter(m => (m.obraId || m.obra_id) === obra.id)
    .filter(m => ['paga','pago','recebido','faturado','confirmado'].includes(m.status))
    .reduce((s, m) => s + (m.valorBruto || m.valor_bruto || 0), 0);
  const valorContrato = obra.contratoValorTotal || obra.valorContrato || obra.valor_contrato || 0;
  const pctRec = valorContrato > 0 ? (receitaRecebida / valorContrato * 100) : 0;

  const corPct = pct >= 90 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 30 ? '#f59e0b' : '#ef4444';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-4 hover:border-slate-500/60 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">{obra.codigo}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${obra.status === 'cancelada' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              {obra.status || 'ativo'}
            </span>
          </div>
          <p className="text-sm font-bold text-white truncate">{obra.nome || obra.name || obra.id}</p>
          <p className="text-[10px] text-slate-500 truncate">{obra.cliente || '—'}</p>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <div className="text-3xl font-black" style={{ color: corPct }}>{pct}%</div>
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">concluído</p>
        </div>
      </div>

      <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: corPct, boxShadow: `0 0 8px ${corPct}80` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-[9px] text-slate-500 uppercase">Peças</p>
          <p className="text-white font-semibold">{fmt(qtdExpedida)}<span className="text-slate-500"> / {fmt(totalPecas)}</span></p>
        </div>
        <div>
          <p className="text-[9px] text-slate-500 uppercase">Peso</p>
          <p className="text-white font-semibold">{fmtPeso(pesoProduzido)}<span className="text-slate-500"> / {fmtPeso(pesoTotal)}</span></p>
        </div>
        <div>
          <p className="text-[9px] text-slate-500 uppercase">Contrato</p>
          <p className="text-purple-400 font-semibold">{fmtR$(valorContrato)}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-500 uppercase">Faturado</p>
          <p className="text-emerald-400 font-semibold">{fmtR$(receitaRecebida)} <span className="text-[9px] text-slate-500">({pctRec.toFixed(0)}%)</span></p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function VisaoGeralPage() {
  const { obras } = useObras();
  const { pecas } = useProducao();
  const { lancamentosDespesas } = useLancamentos();
  const { medicoes } = useMedicoes();
  const fi = useFinancialIntelligence();
  const { lancamentosHoje, rankingMes } = useProducaoHoje();
  const expedicao = useExpedicaoResumo(pecas);
  const [refreshKey, setRefreshKey] = useState(0);

  // KPIs Produção Globais
  const kpisProducao = useMemo(() => {
    const pcs = pecas || [];
    const total = pcs.reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
    const fabricacao = pcs.filter(p => ['fabricacao','aguardando','corte'].includes(p.etapa)).reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
    const solda = pcs.filter(p => p.etapa === 'solda').reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
    const pintura = pcs.filter(p => p.etapa === 'pintura').reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
    const expedido = pcs.filter(p => p.etapa === 'expedido').reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
    const enviado = pcs.filter(p => ['enviado','entregue','montagem'].includes(p.etapa)).reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
    const pesoTotal = pcs.reduce((s, p) => s + (parseFloat(p.pesoTotal) || parseFloat(p.peso) || 0), 0);
    const pesoFinalizado = pcs.filter(p => ['expedido','enviado','entregue','montagem'].includes(p.etapa))
      .reduce((s, p) => s + (parseFloat(p.pesoTotal) || parseFloat(p.peso) || 0), 0);
    const pct = total > 0 ? Math.round(((expedido + enviado) / total) * 100) : 0;
    return { total, fabricacao, solda, pintura, expedido, enviado, pesoTotal, pesoFinalizado, pct };
  }, [pecas]);

  // Obras ativas ordenadas por progresso
  const obrasAtivas = useMemo(() => {
    return (obras || [])
      .filter(o => !['cancelada','concluida','orcamento'].includes(o.status))
      .slice(0, 8);
  }, [obras]);

  // KPIs Produção Hoje
  const kpisHoje = useMemo(() => {
    const total = (lancamentosHoje || []).reduce((s, h) => s + (parseInt(h.quantidade) || 1), 0);
    const funcionariosAtivos = new Set((lancamentosHoje || []).map(h => h.funcionario_nome).filter(Boolean));
    return { totalMovs: lancamentosHoje?.length || 0, pecasMovimentadas: total, funcionariosAtivos: funcionariosAtivos.size };
  }, [lancamentosHoje]);

  // Pipeline data para gráfico
  const pipelineData = useMemo(() => [
    { etapa: 'Fab', valor: kpisProducao.fabricacao, cor: '#3b82f6' },
    { etapa: 'Solda', valor: kpisProducao.solda, cor: '#8b5cf6' },
    { etapa: 'Pintura', valor: kpisProducao.pintura, cor: '#ec4899' },
    { etapa: 'Expedido', valor: kpisProducao.expedido, cor: '#10b981' },
    { etapa: 'Enviado', valor: kpisProducao.enviado, cor: '#06b6d4' },
  ], [kpisProducao]);

  // Distribuição de peças por obra (pizza)
  const distPorObra = useMemo(() => {
    const map = {};
    (pecas || []).forEach(p => {
      const nome = p.obraNome || 'Sem obra';
      const qtd = parseInt(p.quantidade) || 1;
      if (!map[nome]) map[nome] = 0;
      map[nome] += qtd;
    });
    const arr = Object.entries(map).map(([nome, valor]) => ({ nome, valor }));
    return arr.sort((a, b) => b.valor - a.valor).slice(0, 6);
  }, [pecas]);

  // Cores para pizza
  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];

  // Alertas operacionais
  const alertasOperacionais = useMemo(() => {
    const al = [];
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    // Despesas vencidas/atrasadas
    const atrasadas = (lancamentosDespesas || []).filter(l => {
      if (l.status === 'pago') return false;
      const venc = l.dataVencimento || l.data_vencimento;
      if (!venc) return false;
      return parseLocalDate(venc) < hoje;
    });
    if (atrasadas.length > 0) {
      al.push({ tipo: 'danger', icon: AlertTriangle, titulo: `${atrasadas.length} despesa(s) atrasada(s)`, valor: fmtR$(atrasadas.reduce((s, a) => s + (a.valor || 0), 0)) });
    }
    // Peças paradas há muito tempo (vamos simplificar e considerar muitas em uma etapa)
    if (kpisProducao.fabricacao > 200) {
      al.push({ tipo: 'warn', icon: Wrench, titulo: `${kpisProducao.fabricacao} pcs em fabricação`, valor: 'Verificar gargalo' });
    }
    // Fila de expedição grande
    if (expedicao.qtdExpedida > 100) {
      al.push({ tipo: 'info', icon: Truck, titulo: `${fmt(expedicao.qtdExpedida)} pcs aguardando envio`, valor: fmtPeso(expedicao.pesoExpedido) });
    }
    // Saldo baixo
    if (fi.kpisGerais?.saldoReal != null && fi.kpisGerais.saldoReal < 0) {
      al.push({ tipo: 'danger', icon: TrendingUp, titulo: 'Saldo mensal negativo', valor: fmtR$(fi.kpisGerais.saldoReal) });
    }
    return al;
  }, [lancamentosDespesas, kpisProducao, expedicao, fi]);

  return (
    <div className="space-y-5">
      {/* ============================================ */}
      {/* HEADER                                       */}
      {/* ============================================ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-400" />
            Painel Operacional · Visão Geral
          </h1>
          <p className="text-xs text-slate-400 mt-1">Produção • Obras • Expedição • Funcionários — atualização em tempo real</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            <span>Hoje: {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs text-slate-300"
          >
            <RefreshCw className="h-3 w-3" />
            Atualizar
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* KPIs PRINCIPAIS (Produção)                  */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <KPIOpCard icon={Package} cor="blue" label="Total Peças"
          value={fmt(kpisProducao.total)} sub={fmtPeso(kpisProducao.pesoTotal)} />
        <KPIOpCard icon={Wrench} cor="amber" label="Em Fabricação"
          value={fmt(kpisProducao.fabricacao)} sub={`${fmtPct(kpisProducao.total > 0 ? kpisProducao.fabricacao / kpisProducao.total * 100 : 0)} do total`} />
        <KPIOpCard icon={Zap} cor="purple" label="Em Solda"
          value={fmt(kpisProducao.solda)} sub={`${fmtPct(kpisProducao.total > 0 ? kpisProducao.solda / kpisProducao.total * 100 : 0)} do total`} />
        <KPIOpCard icon={Paintbrush} cor="rose" label="Em Pintura"
          value={fmt(kpisProducao.pintura)} sub={`${fmtPct(kpisProducao.total > 0 ? kpisProducao.pintura / kpisProducao.total * 100 : 0)} do total`} />
        <KPIOpCard icon={Truck} cor="emerald" label="Expedido / Enviado"
          value={fmt(kpisProducao.expedido + kpisProducao.enviado)} sub={`${fmtPeso(kpisProducao.pesoFinalizado)} prontos`} />
        <KPIOpCard icon={Target} cor="cyan" label="% Concluído Geral"
          value={fmtPct(kpisProducao.pct)} sub={`${fmt(kpisProducao.expedido + kpisProducao.enviado)} de ${fmt(kpisProducao.total)} pcs`} />
      </div>

      {/* ============================================ */}
      {/* PRODUÇÃO HOJE + PIPELINE + DIST POR OBRA    */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Produção Hoje */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-emerald-900/20 to-green-900/10 border border-emerald-700/30 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <h3 className="text-sm font-bold text-emerald-300">PRODUÇÃO HOJE</h3>
            </div>
            <span className="text-[10px] text-slate-500">{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400">Lançamentos</span>
              <span className="text-2xl font-black text-emerald-400">{kpisHoje.totalMovs}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400">Peças movimentadas</span>
              <span className="text-xl font-bold text-white">{fmt(kpisHoje.pecasMovimentadas)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400">Funcionários ativos</span>
              <span className="text-xl font-bold text-cyan-300">{kpisHoje.funcionariosAtivos}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-emerald-700/20">
              <div className="text-[10px] text-slate-500 mb-1">Movimentos nas últimas horas</div>
              <div className="grid grid-cols-6 gap-0.5 h-8">
                {Array.from({ length: 24 }).map((_, h) => {
                  const hora = new Date(); hora.setHours(h, 0, 0, 0);
                  const horaProxima = new Date(); horaProxima.setHours(h + 1, 0, 0, 0);
                  const count = (lancamentosHoje || []).filter(l => {
                    const d = new Date(l.data_movimentacao);
                    return d >= hora && d < horaProxima;
                  }).length;
                  const max = Math.max(1, ...Array.from({ length: 24 }).map((_, hh) => {
                    const a = new Date(); a.setHours(hh, 0, 0, 0);
                    const b = new Date(); b.setHours(hh + 1, 0, 0, 0);
                    return (lancamentosHoje || []).filter(l => {
                      const d = new Date(l.data_movimentacao);
                      return d >= a && d < b;
                    }).length;
                  }));
                  const altura = (count / max) * 100;
                  return (
                    <div key={h} className="bg-emerald-500/20 rounded-sm" style={{ height: `${Math.max(8, altura)}%` }} title={`${h}h: ${count} movs`} />
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pipeline Produção */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">PIPELINE DE PRODUÇÃO</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pipelineData} layout="vertical" margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#64748b" fontSize={10} />
              <YAxis type="category" dataKey="etapa" stroke="#94a3b8" fontSize={11} width={60} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                formatter={(v) => [fmt(v) + ' pcs', '']}
              />
              <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                {pipelineData.map((e, i) => <Cell key={i} fill={e.cor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Distribuição por Obra */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">PEÇAS POR OBRA</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={distPorObra} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2} dataKey="valor">
                {distPorObra.map((e, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                formatter={(v) => [fmt(v) + ' pcs', '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2 max-h-24 overflow-y-auto">
            {distPorObra.map((o, i) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1.5 text-slate-300 truncate flex-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="truncate">{o.nome}</span>
                </span>
                <span className="text-white font-semibold ml-2">{fmt(o.valor)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ============================================ */}
      {/* OBRAS ATIVAS                                 */}
      {/* ============================================ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">OBRAS ATIVAS</h2>
            <span className="text-xs text-slate-500">{obrasAtivas.length} obras em andamento</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {obrasAtivas.map(o => (
            <ObraCard key={o.id} obra={o} pecas={pecas} medicoes={medicoes} />
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* EXPEDIÇÃO + RANKING FUNCIONÁRIOS            */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expedição */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-cyan-900/20 to-blue-900/10 border border-cyan-700/30 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-cyan-300">EXPEDIÇÃO & ENVIOS</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-900/40 rounded-lg p-3">
              <p className="text-[10px] text-slate-400 uppercase">Fila de Embarque</p>
              <p className="text-2xl font-black text-cyan-300">{fmt(expedicao.qtdExpedida)}</p>
              <p className="text-[10px] text-slate-500">{fmtPeso(expedicao.pesoExpedido)}</p>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-3">
              <p className="text-[10px] text-slate-400 uppercase">Já Enviado</p>
              <p className="text-2xl font-black text-emerald-300">{fmt(expedicao.qtdEnviada)}</p>
              <p className="text-[10px] text-slate-500">{fmtPeso(expedicao.pesoEnviado)}</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 uppercase mb-2">Fila por Obra (top 6)</p>
          <div className="space-y-1.5">
            {expedicao.filaPorObra.length === 0 && (
              <p className="text-xs text-slate-500 italic">Nenhuma peça em fila de embarque.</p>
            )}
            {expedicao.filaPorObra.map((o, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-slate-900/40 rounded px-2 py-1.5">
                <span className="text-slate-300 truncate flex-1">{o.nome}</span>
                <span className="text-cyan-300 font-semibold ml-2">{fmt(o.qtd)} pcs</span>
                <span className="text-slate-500 ml-2">{fmtPeso(o.peso)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Ranking Funcionários */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-900/20 to-orange-900/10 border border-amber-700/30 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-300">RANKING DE FUNCIONÁRIOS (mês)</h3>
            </div>
          </div>
          <div className="space-y-1.5">
            {rankingMes.length === 0 && (
              <p className="text-xs text-slate-500 italic">Sem lançamentos de produção neste mês.</p>
            )}
            {rankingMes.map((f, i) => {
              const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
              const max = rankingMes[0]?.qtd || 1;
              const pct = (f.qtd / max) * 100;
              return (
                <div key={i} className="bg-slate-900/40 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm">{medalha}</span>
                      <span className="text-xs text-white font-medium truncate">{f.nome}</span>
                    </div>
                    <span className="text-amber-400 font-bold text-sm ml-2">{fmt(f.qtd)}</span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5">{f.etapas}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ============================================ */}
      {/* RESUMO FINANCEIRO (secundário)              */}
      {/* ============================================ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-300">RESUMO FINANCEIRO DO MÊS</h2>
          <span className="text-[10px] text-slate-500">(visão de apoio — detalhes em Painel Financeiro)</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPIOpCard icon={ArrowUpRight} cor="emerald" label="Receita Mês"
            value={fmtR$(fi.kpisGerais?.faturamentoRealMes || 0)}
            sub={`${fi.kpisGerais?.qtdReceitasLancadas || 0} lançamentos`} />
          <KPIOpCard icon={ArrowDownRight} cor="rose" label="Despesa Mês"
            value={fmtR$(fi.kpisGerais?.despesaMensalMedia || 0)}
            sub={`média ${fi.kpisGerais?.mesesBaseCalculo || 0}M`} />
          <KPIOpCard icon={TrendingUp} cor={fi.kpisGerais?.saldoReal >= 0 ? 'blue' : 'rose'} label="Saldo Mensal"
            value={fmtR$(fi.kpisGerais?.saldoReal || 0)}
            sub={`Margem ${(fi.kpisGerais?.margemReal || 0).toFixed(1)}%`} />
          <KPIOpCard icon={Target} cor="purple" label="Obras Ativas"
            value={obrasAtivas.length}
            sub={`Valor total: ${fmtR$(obrasAtivas.reduce((s, o) => s + (o.contratoValorTotal || o.valorContrato || 0), 0))}`} />
        </div>
      </div>

      {/* ============================================ */}
      {/* ALERTAS OPERACIONAIS                         */}
      {/* ============================================ */}
      {alertasOperacionais.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold text-amber-300">ALERTAS OPERACIONAIS</h2>
            <span className="text-[10px] text-slate-500">{alertasOperacionais.length} alerta(s)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {alertasOperacionais.map((a, i) => {
              const Icon = a.icon;
              const cor = a.tipo === 'danger' ? 'border-red-700/40 bg-red-900/20 text-red-300'
                : a.tipo === 'warn' ? 'border-amber-700/40 bg-amber-900/20 text-amber-300'
                : 'border-blue-700/40 bg-blue-900/20 text-blue-300';
              return (
                <div key={i} className={`rounded-lg border p-3 ${cor}`}>
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{a.titulo}</p>
                      <p className="text-[10px] opacity-80 truncate">{a.valor}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rodapé */}
      <div className="text-center text-[10px] text-slate-600 pt-2">
        MONTEX ERP · Painel Operacional · Dados em tempo real
      </div>
    </div>
  );
}
