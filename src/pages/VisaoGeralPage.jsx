// ============================================
// VISÃO GERAL - Command Center em Tempo Real
// ============================================
// Integra: Corte, Produção, Estoque, Financeiro, Campo
// Supabase realtime + comparação diária
// ============================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors, Factory, Package, DollarSign, Truck,
  TrendingUp, TrendingDown, RefreshCw, Clock,
  AlertTriangle, CheckCircle2, Activity, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, Eye,
  Layers, Target, Zap, Shield
} from 'lucide-react';
import { useCommandCenter } from '../hooks/useCommandCenter';

// ===== FORMATADORES =====
const fmt = (v) => v == null ? '—' : v.toLocaleString('pt-BR');
const fmtR$ = (v) => v == null ? '—' : 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0 });
const fmtPeso = (kg) => {
  if (kg == null) return '—';
  if (Math.abs(kg) >= 1000) return (kg / 1000).toFixed(1) + 't';
  return kg.toFixed(0) + ' kg';
};
const fmtPct = (v) => v == null ? '—' : v + '%';

// ===== CORES DOS MÓDULOS =====
const CORES = {
  corte:     { bg: '#0f2942', border: '#3b82f6', text: '#60a5fa', glow: 'rgba(59,130,246,0.15)' },
  producao:  { bg: '#1a2e1a', border: '#22c55e', text: '#4ade80', glow: 'rgba(34,197,94,0.15)' },
  estoque:   { bg: '#2d1f0e', border: '#f59e0b', text: '#fbbf24', glow: 'rgba(245,158,11,0.15)' },
  financeiro:{ bg: '#1a0e2e', border: '#a855f7', text: '#c084fc', glow: 'rgba(168,85,247,0.15)' },
  campo:     { bg: '#0e1a2e', border: '#06b6d4', text: '#22d3ee', glow: 'rgba(6,182,212,0.15)' },
};

// ===== COMPONENTE: INDICADOR DE DIFERENÇA =====
function DiffBadge({ value, suffix = '', invertColors = false }) {
  if (value == null || value === 0) return <span className="text-xs text-gray-500 flex items-center gap-0.5"><Minus size={10} /> sem mudança</span>;
  const isPositive = value > 0;
  const color = invertColors
    ? (isPositive ? '#ef4444' : '#22c55e')
    : (isPositive ? '#22c55e' : '#ef4444');
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="text-xs font-medium flex items-center gap-0.5" style={{ color }}>
      <Icon size={12} />
      {isPositive ? '+' : ''}{value}{suffix}
    </span>
  );
}

// ===== COMPONENTE: BARRA DE PROGRESSO ANIMADA =====
function ProgressBar({ value = 0, color = '#3b82f6', height = 6, showLabel = false }) {
  return (
    <div className="w-full relative" style={{ height }}>
      <div className="absolute inset-0 rounded-full" style={{ backgroundColor: color + '20' }} />
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}40` }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      {showLabel && (
        <span className="absolute right-0 -top-5 text-xs font-bold" style={{ color }}>{value}%</span>
      )}
    </div>
  );
}

// ===== COMPONENTE: CARD DE MÓDULO =====
function ModuleCard({ title, icon: Icon, cor, children, href, pulse = false }) {
  const c = CORES[cor] || CORES.corte;
  return (
    <motion.div
      className="relative rounded-xl p-4 overflow-hidden"
      style={{
        backgroundColor: c.bg,
        border: `1px solid ${c.border}30`,
        boxShadow: `0 0 20px ${c.glow}`,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.01, boxShadow: `0 0 30px ${c.glow}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: c.border + '20' }}>
            <Icon size={16} style={{ color: c.text }} />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: c.text }}>{title}</h3>
          {pulse && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: c.border }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: c.text }} />
            </span>
          )}
        </div>
        {href && (
          <button
            onClick={() => { if (window.__setCurrentPage) window.__setCurrentPage(href); }}
            className="text-xs opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
            style={{ color: c.text }}
          >
            <Eye size={12} /> Abrir
          </button>
        )}
      </div>
      {/* Content */}
      <div className="space-y-2">
        {children}
      </div>
    </motion.div>
  );
}

// ===== COMPONENTE: KPI INLINE =====
function KPI({ label, value, sub, diff, diffInvert }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-white">{value}</span>
        {sub && <span className="text-xs text-gray-500">{sub}</span>}
        {diff !== undefined && <DiffBadge value={diff} invertColors={diffInvert} />}
      </div>
    </div>
  );
}

// ===== COMPONENTE: PIPELINE DE PRODUÇÃO =====
function ProductionPipeline({ producao }) {
  if (!producao) return null;
  const stages = [
    { label: 'Fabricação', value: producao.fabricacao, color: '#3b82f6' },
    { label: 'Solda', value: producao.solda, color: '#f59e0b' },
    { label: 'Pintura', value: producao.pintura, color: '#a855f7' },
    { label: 'Expedição', value: producao.expedicao, color: '#22c55e' },
  ];
  const total = producao.total || 1;
  return (
    <div className="flex items-center gap-1 mt-2">
      {stages.map((s, i) => (
        <React.Fragment key={s.label}>
          <div className="flex-1 text-center">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className="h-6 rounded-md flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: s.color + '20',
                border: `1px solid ${s.color}50`,
                color: s.color
              }}
            >
              {s.value}
            </div>
            <div className="text-[10px] text-gray-600 mt-0.5">
              {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </div>
          </div>
          {i < stages.length - 1 && (
            <div className="text-gray-600 text-xs">→</div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ===== COMPONENTE PRINCIPAL =====
export default function VisaoGeralPage() {
  const {
    corte, producao, estoque, financeiro, campo,
    loading, lastUpdate, comparacaoDiaria, refresh
  } = useCommandCenter();

  const [view, setView] = useState('grid'); // grid | list

  // ===== RESUMO GERAL =====
  const resumo = useMemo(() => {
    if (!corte || !producao || !estoque) return null;
    const progressoTotal = Math.round(
      ((corte.progressoPecas || 0) * 0.25 +
       (producao.progressoGeral || 0) * 0.50 +
       (corte.progressoPeso || 0) * 0.25)
    );
    const atividadesHoje = (corte.cortadasHoje || 0) + (producao.movidasHoje || 0) +
      (estoque.entradasHoje || 0) + (estoque.saidasHoje || 0) + (campo?.enviosHoje || 0);
    return { progressoTotal, atividadesHoje };
  }, [corte, producao, estoque, campo]);

  const comp = comparacaoDiaria;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          className="flex flex-col items-center gap-4"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Activity size={40} className="text-cyan-400" />
          <span className="text-gray-400 text-sm">Carregando Command Center...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 sm:p-4">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Target className="text-cyan-400" size={24} />
            Command Center
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Monitoramento integrado em tempo real — Obra SUPER LUNA
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={12} />
              Atualizado {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-xs text-green-400 font-medium">LIVE</span>
          <button
            onClick={refresh}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ===== RESUMO TOP KPIs ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Progresso Geral */}
        <motion.div className="col-span-1 rounded-xl p-3 bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border border-cyan-800/30"
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="text-xs text-cyan-300/70 mb-1 flex items-center gap-1">
            <Target size={10} /> Progresso Geral
          </div>
          <div className="text-2xl font-black text-cyan-300">{fmtPct(resumo?.progressoTotal || 0)}</div>
          <ProgressBar value={resumo?.progressoTotal || 0} color="#22d3ee" height={4} />
        </motion.div>

        {/* Peças Cortadas */}
        <motion.div className="rounded-xl p-3 bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-800/30"
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
          <div className="text-xs text-blue-300/70 mb-1 flex items-center gap-1">
            <Scissors size={10} /> Corte
          </div>
          <div className="text-2xl font-black text-blue-300">{fmt(corte?.finalizado || 0)}<span className="text-sm text-blue-400/60">/{fmt(corte?.total || 0)}</span></div>
          <ProgressBar value={corte?.progressoPecas || 0} color="#3b82f6" height={4} />
        </motion.div>

        {/* Produção Expedida */}
        <motion.div className="rounded-xl p-3 bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-800/30"
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <div className="text-xs text-green-300/70 mb-1 flex items-center gap-1">
            <Factory size={10} /> Produção
          </div>
          <div className="text-2xl font-black text-green-300">{fmtPeso(producao?.pesoExpedido || 0)}</div>
          <div className="text-xs text-gray-500">{fmt(producao?.total || 0)} conjuntos</div>
        </motion.div>

        {/* Estoque */}
        <motion.div className="rounded-xl p-3 bg-gradient-to-br from-yellow-900/40 to-amber-900/40 border border-yellow-800/30"
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
          <div className="text-xs text-yellow-300/70 mb-1 flex items-center gap-1">
            <Package size={10} /> Estoque
          </div>
          <div className="text-2xl font-black text-yellow-300">{fmt(estoque?.totalItens || 0)}</div>
          <div className="text-xs flex items-center gap-1">
            {estoque?.alertas > 0 ? (
              <span className="text-red-400 flex items-center gap-0.5"><AlertTriangle size={10} /> {estoque.alertas} alertas</span>
            ) : (
              <span className="text-green-400 flex items-center gap-0.5"><CheckCircle2 size={10} /> Normal</span>
            )}
          </div>
        </motion.div>

        {/* Atividades Hoje */}
        <motion.div className="rounded-xl p-3 bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-800/30 col-span-2 sm:col-span-1"
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <div className="text-xs text-purple-300/70 mb-1 flex items-center gap-1">
            <Zap size={10} /> Atividade Hoje
          </div>
          <div className="text-2xl font-black text-purple-300">{fmt(resumo?.atividadesHoje || 0)}</div>
          <div className="text-xs text-gray-500">ações registradas</div>
        </motion.div>
      </div>

      {/* ===== GRID DE MÓDULOS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* CORTE */}
        <ModuleCard title="Kanban Corte" icon={Scissors} cor="corte" href="KanbanCortePage" pulse={corte?.cortando > 0}>
          <KPI label="Total de Peças" value={fmt(corte?.total)} />
          <KPI label="Aguardando" value={fmt(corte?.aguardando)} />
          <KPI label="Em Corte" value={fmt(corte?.cortando)} />
          <KPI label="Finalizadas" value={fmt(corte?.finalizado)} diff={comp?.corte?.finalizadasDiff} />
          <div className="border-t border-gray-700/30 pt-2 mt-1">
            <KPI label="Peso Cortado" value={fmtPeso(corte?.pesoFinalizado)} sub={`de ${fmtPeso(corte?.pesoTotal)}`} />
            <div className="mt-1.5">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-500">Progresso</span>
                <span className="text-blue-300 font-bold">{fmtPct(corte?.progressoPecas)}</span>
              </div>
              <ProgressBar value={corte?.progressoPecas || 0} color="#3b82f6" />
            </div>
          </div>
          <KPI label="Cortadas Hoje" value={fmt(corte?.cortadasHoje)} />
        </ModuleCard>

        {/* PRODUÇÃO */}
        <ModuleCard title="Kanban Produção" icon={Factory} cor="producao" href="KanbanProducaoIntegrado">
          <KPI label="Total Conjuntos" value={fmt(producao?.total)} />
          <KPI label="Peso Total" value={fmtPeso(producao?.pesoTotal)} />
          <KPI label="Peso Expedido" value={fmtPeso(producao?.pesoExpedido)} />
          <ProductionPipeline producao={producao} />
          <div className="border-t border-gray-700/30 pt-2 mt-1">
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-500">Progresso Geral</span>
              <span className="text-green-300 font-bold">{fmtPct(producao?.progressoGeral)}</span>
            </div>
            <ProgressBar value={producao?.progressoGeral || 0} color="#22c55e" />
          </div>
          <KPI label="Movidas Hoje" value={fmt(producao?.movidasHoje)} />
        </ModuleCard>

        {/* ESTOQUE */}
        <ModuleCard title="Gestão Estoque" icon={Package} cor="estoque" href="EstoquePage">
          <KPI label="Total de Itens" value={fmt(estoque?.totalItens)} />
          <KPI label="Valor em Estoque" value={fmtR$(estoque?.valorTotal)} />
          <div className="flex gap-2 py-1">
            <div className="flex-1 text-center rounded-lg py-1.5" style={{ backgroundColor: '#22c55e15', border: '1px solid #22c55e30' }}>
              <div className="text-xs text-green-400 font-bold">{fmt(estoque?.normal)}</div>
              <div className="text-[10px] text-gray-500">Normal</div>
            </div>
            <div className="flex-1 text-center rounded-lg py-1.5" style={{ backgroundColor: '#f59e0b15', border: '1px solid #f59e0b30' }}>
              <div className="text-xs text-yellow-400 font-bold">{fmt(estoque?.baixo)}</div>
              <div className="text-[10px] text-gray-500">Baixo</div>
            </div>
            <div className="flex-1 text-center rounded-lg py-1.5" style={{ backgroundColor: '#ef444415', border: '1px solid #ef444430' }}>
              <div className="text-xs text-red-400 font-bold">{fmt(estoque?.critico)}</div>
              <div className="text-[10px] text-gray-500">Crítico</div>
            </div>
          </div>
          <div className="border-t border-gray-700/30 pt-2 mt-1">
            <KPI label="Entradas Hoje" value={fmt(estoque?.entradasHoje)} />
            <KPI label="Saídas Hoje" value={fmt(estoque?.saidasHoje)} />
          </div>
        </ModuleCard>

        {/* FINANCEIRO */}
        <ModuleCard title="Financeiro Obra" icon={DollarSign} cor="financeiro" href="GestaoFinanceiraObra">
          <KPI label="Total Despesas" value={fmtR$(financeiro?.totalDespesas)} diff={comp?.financeiro?.despesasDiff} diffInvert />
          <KPI label="Despesas Pagas" value={fmtR$(financeiro?.despesasPagas)} />
          <KPI label="Despesas Pendentes" value={fmtR$(financeiro?.despesasPendentes)} />
          <div className="border-t border-gray-700/30 pt-2 mt-1">
            <KPI label="Total Medições" value={fmtR$(financeiro?.totalMedicoes)} />
            <KPI label="Medições Aprovadas" value={fmtR$(financeiro?.medicoesAprovadas)} />
          </div>
          <div className="mt-2 p-2 rounded-lg" style={{
            backgroundColor: (financeiro?.saldoObra || 0) >= 0 ? '#22c55e10' : '#ef444410',
            border: `1px solid ${(financeiro?.saldoObra || 0) >= 0 ? '#22c55e30' : '#ef444430'}`
          }}>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Saldo Obra</span>
              <span className={`text-sm font-black ${(financeiro?.saldoObra || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmtR$(financeiro?.saldoObra)}
              </span>
            </div>
          </div>
        </ModuleCard>

        {/* CAMPO / EXPEDIÇÃO */}
        <ModuleCard title="Produção Campo" icon={Truck} cor="campo" href="ExpedicaoIntegrado">
          <KPI label="Total de Envios" value={fmt(campo?.totalEnvios)} />
          <KPI label="Enviados" value={fmt(campo?.enviados)} />
          <KPI label="Pendentes" value={fmt(campo?.pendentes)} />
          <div className="border-t border-gray-700/30 pt-2 mt-1">
            <KPI label="Peso Enviado" value={fmtPeso(campo?.pesoEnviado)} />
            <KPI label="Peças Enviadas" value={fmt(campo?.pecasEnviadas)} />
            <KPI label="Envios Hoje" value={fmt(campo?.enviosHoje)} />
          </div>
        </ModuleCard>

        {/* COMPARAÇÃO DIÁRIA */}
        <ModuleCard title="Análise Diária" icon={BarChart3} cor="corte">
          {comp ? (
            <>
              <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                <Activity size={10} /> Comparação com dia anterior
              </div>
              <KPI label="Peças Cortadas" value={comp.corte?.finalizadasDiff != null ? (comp.corte.finalizadasDiff > 0 ? '+' : '') + comp.corte.finalizadasDiff : '—'} diff={comp.corte?.finalizadasDiff} />
              <KPI label="Progresso Corte" value={comp.corte?.progressoDiff != null ? (comp.corte.progressoDiff > 0 ? '+' : '') + comp.corte.progressoDiff + '%' : '—'} diff={comp.corte?.progressoDiff} />
              <KPI label="Progresso Produção" value={comp.producao?.progressoDiff != null ? (comp.producao.progressoDiff > 0 ? '+' : '') + comp.producao.progressoDiff + '%' : '—'} diff={comp.producao?.progressoDiff} />
              <KPI label="Novas Despesas" value={comp.financeiro?.despesasDiff != null ? fmtR$(comp.financeiro.despesasDiff) : '—'} diff={comp.financeiro?.despesasDiff} diffInvert />
              <div className="border-t border-gray-700/30 pt-2 mt-1">
                <div className="text-[10px] text-gray-600 text-center">
                  Snapshot salvo automaticamente a cada atualização
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Shield className="mx-auto text-gray-600 mb-2" size={24} />
              <div className="text-xs text-gray-500">
                Análise disponível amanhã.<br />
                O sistema está coletando dados de hoje para comparação.
              </div>
            </div>
          )}
        </ModuleCard>
      </div>

      {/* ===== FOOTER STATUS ===== */}
      <div className="flex items-center justify-center gap-4 pt-2 pb-4">
        <span className="text-xs text-gray-600 flex items-center gap-1">
          <Layers size={10} /> 6 módulos integrados
        </span>
        <span className="text-xs text-gray-600">•</span>
        <span className="text-xs text-gray-600 flex items-center gap-1">
          <Activity size={10} /> Supabase Realtime ativo
        </span>
        <span className="text-xs text-gray-600">•</span>
        <span className="text-xs text-gray-600 flex items-center gap-1">
          <RefreshCw size={10} /> Auto-refresh 60s
        </span>
      </div>
    </div>
  );
}
