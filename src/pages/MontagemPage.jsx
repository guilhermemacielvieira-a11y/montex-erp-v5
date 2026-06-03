// ============================================
// MONTEX ERP — Módulo de Montagem em Campo
// ============================================
// Fluxo: Produção → Pintura → Expedido → ENVIADO → MONTAGEM
// Quando peça vai para etapa='enviado', entra automaticamente
// como "Aguardando Montagem" no Kanban deste módulo.
// Operações: Aguardando → Em Montagem → Montado/Entregue
// ============================================

import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, CheckCircle2, Clock, MapPin, Users, Package, Building2,
  ChevronDown, Plus, Download, Filter, TrendingUp, Calendar, Search,
  ArrowRight, PlayCircle, Truck, Hammer, Box, AlertCircle, Eye,
  ChevronRight, X, Settings, FileText, BarChart3, Activity,
  HardHat, Layers, Send,
} from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useObras, useProducao, useEquipes } from '../contexts/ERPContext';

// ============================================
// HELPERS
// ============================================
const fmt = (v) => v == null || isNaN(v) ? '—' : Math.round(v).toLocaleString('pt-BR');
const fmtPeso = (kg) => {
  if (kg == null) return '0kg';
  return Math.abs(kg) >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${Math.round(kg)} kg`;
};
const fmtData = (d) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch { return '—'; }
};

// ============================================
// STATUS DE MONTAGEM (derivado da etapa)
// ============================================
// etapa === 'enviado'   → 'aguardando_montagem' (vem automaticamente)
// etapa === 'montagem'  → 'em_montagem'
// etapa === 'entregue'  → 'montado'
const statusFromEtapa = (etapa) => {
  if (etapa === 'enviado') return 'aguardando_montagem';
  if (etapa === 'montagem') return 'em_montagem';
  if (etapa === 'entregue') return 'montado';
  return null;
};

const proximaEtapa = {
  aguardando_montagem: 'montagem',
  em_montagem: 'entregue',
};

const STATUS_CONFIG = {
  aguardando_montagem: {
    label: 'Aguardando Montagem',
    short: 'Aguardando',
    icon: Truck,
    color: '#f59e0b',
    bg: 'bg-amber-500/20',
    text: 'text-amber-300',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/20',
  },
  em_montagem: {
    label: 'Em Montagem',
    short: 'Em Montagem',
    icon: Hammer,
    color: '#3b82f6',
    bg: 'bg-blue-500/20',
    text: 'text-blue-300',
    border: 'border-blue-500/40',
    glow: 'shadow-blue-500/20',
  },
  montado: {
    label: 'Montado / Entregue',
    short: 'Montado',
    icon: CheckCircle2,
    color: '#10b981',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-300',
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-500/20',
  },
};

// ============================================
// SUB-COMPONENT: KPI Card
// ============================================
function KPI({ label, value, sub, icon: Icon, color = '#f97316', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4 overflow-hidden group hover:border-slate-700 transition-all"
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{label}</p>
          {Icon && (
            <div className="p-1.5 rounded-lg" style={{ background: `${color}15` }}>
              <Icon className="h-3.5 w-3.5" style={{ color }} />
            </div>
          )}
        </div>
        <p className="text-2xl font-black text-white tabular-nums leading-none">{value}</p>
        {sub && <p className="text-[11px] text-slate-500 mt-2">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ============================================
// SUB-COMPONENT: Card Kanban
// ============================================
function PecaCard({ peca, obra, onAvancar, onRetornar, isSelected, onToggleSelect, dragRef }) {
  const s = STATUS_CONFIG[peca._status];
  const Icon = s.icon;
  return (
    <motion.div
      ref={dragRef}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'relative bg-slate-900 border rounded-lg p-3 hover:shadow-lg transition-all cursor-pointer',
        isSelected ? 'border-orange-500 ring-2 ring-orange-500/30' : 'border-slate-800 hover:border-slate-700',
      )}
      onClick={(e) => {
        // Click on body toggles selection (but not when clicking buttons)
        if (e.target.closest('button')) return;
        onToggleSelect?.(peca.id);
      }}
    >
      {/* Top accent */}
      <div className="absolute top-0 left-3 right-3 h-0.5 rounded-b" style={{ background: s.color }} />

      {/* Checkbox + status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(peca.id)}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-orange-500"
          />
          <span className={cn('inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded', s.bg, s.text)}>
            <Icon className="h-2.5 w-2.5" />
            {s.short}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">{fmt(peca.quantidade)} pcs</span>
      </div>

      {/* Código e nome */}
      <div className="mb-2">
        <p className="text-xs font-mono font-bold text-orange-300 truncate">{peca.codigo || peca.marca}</p>
        <p className="text-[11px] text-slate-300 truncate" title={peca.nome}>{peca.nome || peca.tipo || '—'}</p>
      </div>

      {/* Obra */}
      <div className="flex items-center gap-1 mb-2 text-[10px] text-slate-400">
        <Building2 className="h-2.5 w-2.5 flex-shrink-0" />
        <span className="truncate">{obra?.codigo || '—'}</span>
        <span className="text-slate-600">·</span>
        <span className="truncate">{obra?.nome?.substring(0, 22) || '—'}</span>
      </div>

      {/* Peso */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
        <span className="font-mono tabular-nums">{fmtPeso(peca.pesoTotal || peca.peso)}</span>
        <span className="text-[10px] text-slate-500">{fmtData(peca.dataEnvio || peca.updated_at)}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-1 mt-2">
        {peca._status !== 'montado' && (
          <button
            onClick={(e) => { e.stopPropagation(); onAvancar?.(peca); }}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 px-2 rounded transition-all hover:opacity-90"
            style={{
              background: peca._status === 'aguardando_montagem' ? '#3b82f6' : '#10b981',
              color: 'white',
            }}
          >
            {peca._status === 'aguardando_montagem' ? (
              <><PlayCircle className="h-3 w-3" /> Iniciar Montagem</>
            ) : (
              <><CheckCircle2 className="h-3 w-3" /> Concluir</>
            )}
          </button>
        )}
        {peca._status !== 'aguardando_montagem' && (
          <button
            onClick={(e) => { e.stopPropagation(); onRetornar?.(peca); }}
            className="px-2 py-1.5 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-all"
            title="Retornar etapa anterior"
          >
            <ChevronDown className="h-3 w-3 rotate-90" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN
// ============================================
export default function MontagemPage() {
  const { obras } = useObras();
  const { pecas, updatePeca } = useProducao();
  const { equipes, funcionarios } = useEquipes();

  // Filtros
  const [obraFiltro, setObraFiltro] = useState('todas');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState('recente');
  const [pecasSelecionadas, setPecasSelecionadas] = useState(new Set());
  const [viewMode, setViewMode] = useState('kanban'); // kanban | lista
  const [pecaDetalhe, setPecaDetalhe] = useState(null);

  // ===== Equipes de Montagem =====
  const equipesMontagem = useMemo(() => {
    if (!equipes || equipes.length === 0) return [];
    return equipes
      .filter(eq => eq.tipo === 'montagem' || !eq.tipo)
      .map(eq => {
        const membrosEq = funcionarios?.filter(f => f.equipeId === eq.id) || [];
        const lider = funcionarios?.find(f => f.id === eq.liderId) || membrosEq[0];
        return {
          id: eq.id,
          nome: eq.nome || `Equipe ${eq.id}`,
          membros: membrosEq.length,
          lider: lider?.nome || 'Sem líder',
          status: eq.status || 'em_campo',
        };
      });
  }, [equipes, funcionarios]);

  // ===== Peças do módulo de Montagem (auto-pull) =====
  // Inclui peças com etapa: enviado | montagem | entregue
  const pecasMontagem = useMemo(() => {
    return (pecas || [])
      .map(p => {
        const status = statusFromEtapa(p.etapa);
        if (!status) return null;
        return { ...p, _status: status };
      })
      .filter(Boolean);
  }, [pecas]);

  // ===== Aplicar filtros =====
  const pecasFiltradas = useMemo(() => {
    let arr = pecasMontagem;

    // Obra
    if (obraFiltro !== 'todas') {
      arr = arr.filter(p => p.obraId === obraFiltro || p.obra_id === obraFiltro);
    }

    // Status
    if (statusFiltro !== 'todos') {
      arr = arr.filter(p => p._status === statusFiltro);
    }

    // Busca
    if (busca.trim()) {
      const q = busca.toLowerCase().trim();
      arr = arr.filter(p =>
        (p.codigo || '').toLowerCase().includes(q) ||
        (p.nome || '').toLowerCase().includes(q) ||
        (p.marca || '').toLowerCase().includes(q) ||
        (p.tipo || '').toLowerCase().includes(q)
      );
    }

    // Ordenação
    if (ordenacao === 'recente') {
      arr = [...arr].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    } else if (ordenacao === 'peso_desc') {
      arr = [...arr].sort((a, b) => (b.pesoTotal || b.peso || 0) - (a.pesoTotal || a.peso || 0));
    } else if (ordenacao === 'obra') {
      arr = [...arr].sort((a, b) => (a.obraId || '').localeCompare(b.obraId || ''));
    }

    return arr;
  }, [pecasMontagem, obraFiltro, statusFiltro, busca, ordenacao]);

  // ===== Agrupamento Kanban =====
  const kanban = useMemo(() => ({
    aguardando_montagem: pecasFiltradas.filter(p => p._status === 'aguardando_montagem'),
    em_montagem: pecasFiltradas.filter(p => p._status === 'em_montagem'),
    montado: pecasFiltradas.filter(p => p._status === 'montado'),
  }), [pecasFiltradas]);

  // ===== KPIs =====
  const kpis = useMemo(() => {
    const totalPeso = pecasMontagem.reduce((s, p) => s + (p.pesoTotal || p.peso || 0), 0);
    const pesoAguardando = pecasMontagem.filter(p => p._status === 'aguardando_montagem')
      .reduce((s, p) => s + (p.pesoTotal || p.peso || 0), 0);
    const pesoEmMontagem = pecasMontagem.filter(p => p._status === 'em_montagem')
      .reduce((s, p) => s + (p.pesoTotal || p.peso || 0), 0);
    const pesoMontado = pecasMontagem.filter(p => p._status === 'montado')
      .reduce((s, p) => s + (p.pesoTotal || p.peso || 0), 0);
    const totalQtd = pecasMontagem.reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
    const qtdMontada = pecasMontagem.filter(p => p._status === 'montado')
      .reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);
    return {
      totalPeso, pesoAguardando, pesoEmMontagem, pesoMontado,
      totalQtd, qtdMontada,
      pctAvanco: totalPeso > 0 ? (pesoMontado / totalPeso * 100) : 0,
      equipesAtivas: equipesMontagem.filter(e => e.status === 'em_campo').length,
      totalEquipes: equipesMontagem.length,
      totalPecas: pecasMontagem.length,
    };
  }, [pecasMontagem, equipesMontagem]);

  // ===== Ações =====
  const handleAvancar = async (peca) => {
    const novaEtapa = peca._status === 'aguardando_montagem' ? 'montagem' : 'entregue';
    try {
      await updatePeca(peca.id, { etapa: novaEtapa });
      toast.success(
        novaEtapa === 'montagem'
          ? `▶️ Montagem iniciada: ${peca.codigo || peca.marca}`
          : `✅ Montagem concluída: ${peca.codigo || peca.marca}`
      );
    } catch (err) {
      toast.error('Erro ao avançar etapa: ' + err.message);
    }
  };

  const handleRetornar = async (peca) => {
    const novaEtapa = peca._status === 'em_montagem' ? 'enviado' : 'montagem';
    try {
      await updatePeca(peca.id, { etapa: novaEtapa });
      toast.success(`↩️ Retornado: ${peca.codigo || peca.marca}`);
    } catch (err) {
      toast.error('Erro ao retornar etapa: ' + err.message);
    }
  };

  const handleAcaoLote = async (acao) => {
    const ids = Array.from(pecasSelecionadas);
    if (ids.length === 0) {
      toast.error('Selecione ao menos 1 peça');
      return;
    }
    const t = toast.loading(`Processando ${ids.length} peça(s)...`);
    let ok = 0;
    for (const id of ids) {
      const p = pecasMontagem.find(x => x.id === id);
      if (!p) continue;
      const novaEtapa = acao === 'iniciar' && p._status === 'aguardando_montagem' ? 'montagem'
        : acao === 'concluir' && p._status === 'em_montagem' ? 'entregue'
        : null;
      if (novaEtapa) {
        try { await updatePeca(p.id, { etapa: novaEtapa }); ok++; } catch {}
      }
    }
    toast.dismiss(t);
    toast.success(`${ok}/${ids.length} peça(s) atualizadas`);
    setPecasSelecionadas(new Set());
  };

  const toggleSelecao = (id) => {
    setPecasSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const limparSelecao = () => setPecasSelecionadas(new Set());

  return (
    <div className="space-y-4">
      {/* ============================================ */}
      {/* HEADER                                       */}
      {/* ============================================ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30">
            <HardHat className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Montagem em Campo
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">
                AUTO-PULL · Expedido → Enviado
              </span>
            </h1>
            <p className="text-sm text-slate-400">
              Peças entram automaticamente após expedição · {kpis.totalPecas} peça(s) no módulo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-700 overflow-hidden bg-slate-800/50">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
                viewMode === 'kanban' ? 'bg-orange-500/20 text-orange-300' : 'text-slate-400 hover:text-slate-200',
              )}
            >
              <Layers className="h-3.5 w-3.5" /> Kanban
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
                viewMode === 'lista' ? 'bg-orange-500/20 text-orange-300' : 'text-slate-400 hover:text-slate-200',
              )}
            >
              <FileText className="h-3.5 w-3.5" /> Lista
            </button>
          </div>
          <Button
            onClick={() => toast.success('Relatório de montagem em desenvolvimento')}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Download className="h-4 w-4 mr-2" />
            Relatório
          </Button>
        </div>
      </div>

      {/* ============================================ */}
      {/* KPIs                                         */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPI label="Aguardando" value={fmtPeso(kpis.pesoAguardando)} sub={`${kanban.aguardando_montagem.length} peças`} icon={Truck} color="#f59e0b" delay={0} />
        <KPI label="Em Montagem" value={fmtPeso(kpis.pesoEmMontagem)} sub={`${kanban.em_montagem.length} peças`} icon={Hammer} color="#3b82f6" delay={0.05} />
        <KPI label="Montado" value={fmtPeso(kpis.pesoMontado)} sub={`${kanban.montado.length} peças · ${fmt(kpis.qtdMontada)} pcs`} icon={CheckCircle2} color="#10b981" delay={0.1} />
        <KPI label="Equipes em Campo" value={`${kpis.equipesAtivas}/${kpis.totalEquipes}`} sub="ativas / total" icon={Users} color="#a855f7" delay={0.15} />
        <KPI label="Progresso Geral" value={`${kpis.pctAvanco.toFixed(1)}%`} sub={fmtPeso(kpis.totalPeso)} icon={TrendingUp} color="#06b6d4" delay={0.2} />
      </div>

      {/* ============================================ */}
      {/* PROGRESSO GERAL                              */}
      {/* ============================================ */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            Pipeline de Montagem
          </h3>
          <span className="text-[10px] font-mono text-slate-500">peso · peças</span>
        </div>
        <div className="h-3 bg-slate-800/80 rounded-full overflow-hidden flex">
          {kpis.totalPeso > 0 && (
            <>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(kpis.pesoMontado / kpis.totalPeso) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full"
                style={{ background: 'linear-gradient(90deg, #10b981, #059669)', boxShadow: '0 0 8px #10b98180' }}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(kpis.pesoEmMontagem / kpis.totalPeso) * 100}%` }}
                transition={{ duration: 1, delay: 0.1, ease: 'easeOut' }}
                className="h-full"
                style={{ background: 'linear-gradient(90deg, #3b82f6, #2563eb)', boxShadow: '0 0 8px #3b82f680' }}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(kpis.pesoAguardando / kpis.totalPeso) * 100}%` }}
                transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                className="h-full"
                style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)' }}
              />
            </>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px]">
          <div className="flex gap-4">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Montado: {fmtPeso(kpis.pesoMontado)}
            </span>
            <span className="text-blue-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Em montagem: {fmtPeso(kpis.pesoEmMontagem)}
            </span>
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Aguardando: {fmtPeso(kpis.pesoAguardando)}
            </span>
          </div>
          <span className="text-slate-400 font-mono">Total: {fmtPeso(kpis.totalPeso)}</span>
        </div>
      </div>

      {/* ============================================ */}
      {/* FILTROS                                      */}
      {/* ============================================ */}
      <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
        {/* Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código, nome, marca..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50"
          />
        </div>

        {/* Filtro Obra */}
        <Select.Root value={obraFiltro} onValueChange={setObraFiltro}>
          <Select.Trigger className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-white min-w-[180px]">
            <Building2 className="h-4 w-4 text-slate-400" />
            <Select.Value placeholder="Todas as obras" />
            <ChevronDown className="h-4 w-4 text-slate-400 ml-auto" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-72 overflow-y-auto">
              <Select.Viewport className="p-1">
                <Select.Item value="todas" className="px-3 py-2 text-sm text-white hover:bg-slate-800 rounded cursor-pointer outline-none">
                  <Select.ItemText>📊 Todas as Obras</Select.ItemText>
                </Select.Item>
                {obras.map(obra => (
                  <Select.Item key={obra.id} value={obra.id} className="px-3 py-2 text-sm text-white hover:bg-slate-800 rounded cursor-pointer outline-none">
                    <Select.ItemText>{obra.codigo} — {obra.nome}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        {/* Filtro Status */}
        <Select.Root value={statusFiltro} onValueChange={setStatusFiltro}>
          <Select.Trigger className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-white min-w-[180px]">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select.Value placeholder="Todos os status" />
            <ChevronDown className="h-4 w-4 text-slate-400 ml-auto" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50">
              <Select.Viewport className="p-1">
                <Select.Item value="todos" className="px-3 py-2 text-sm text-white hover:bg-slate-800 rounded cursor-pointer outline-none">
                  <Select.ItemText>Todos os Status</Select.ItemText>
                </Select.Item>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <Select.Item key={k} value={k} className="px-3 py-2 text-sm text-white hover:bg-slate-800 rounded cursor-pointer outline-none">
                    <Select.ItemText>{v.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        {/* Ordenação */}
        <Select.Root value={ordenacao} onValueChange={setOrdenacao}>
          <Select.Trigger className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-white min-w-[140px]">
            <BarChart3 className="h-4 w-4 text-slate-400" />
            <Select.Value />
            <ChevronDown className="h-4 w-4 text-slate-400 ml-auto" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50">
              <Select.Viewport className="p-1">
                <Select.Item value="recente" className="px-3 py-2 text-sm text-white hover:bg-slate-800 rounded cursor-pointer outline-none">
                  <Select.ItemText>Mais recente</Select.ItemText>
                </Select.Item>
                <Select.Item value="peso_desc" className="px-3 py-2 text-sm text-white hover:bg-slate-800 rounded cursor-pointer outline-none">
                  <Select.ItemText>Maior peso</Select.ItemText>
                </Select.Item>
                <Select.Item value="obra" className="px-3 py-2 text-sm text-white hover:bg-slate-800 rounded cursor-pointer outline-none">
                  <Select.ItemText>Por obra</Select.ItemText>
                </Select.Item>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        {/* Selecionadas - ações em lote */}
        {pecasSelecionadas.size > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-3 py-2 bg-orange-500/15 border border-orange-500/40 rounded-lg"
          >
            <span className="text-xs font-bold text-orange-300">{pecasSelecionadas.size} selecionada(s)</span>
            <button
              onClick={() => handleAcaoLote('iniciar')}
              className="text-[11px] font-bold px-2 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white transition-all"
            >
              ▶ Iniciar
            </button>
            <button
              onClick={() => handleAcaoLote('concluir')}
              className="text-[11px] font-bold px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white transition-all"
            >
              ✓ Concluir
            </button>
            <button onClick={limparSelecao} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </div>

      {/* ============================================ */}
      {/* CONTEÚDO: KANBAN OU LISTA                    */}
      {/* ============================================ */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {['aguardando_montagem', 'em_montagem', 'montado'].map(statusKey => {
            const s = STATUS_CONFIG[statusKey];
            const items = kanban[statusKey];
            const Icon = s.icon;
            const totalPesoCol = items.reduce((sum, p) => sum + (p.pesoTotal || p.peso || 0), 0);
            return (
              <div key={statusKey}
                className={cn('rounded-xl border bg-slate-900/40 backdrop-blur overflow-hidden flex flex-col', s.border)}
                style={{ minHeight: 400 }}
              >
                {/* Column header */}
                <div className={cn('px-4 py-3 border-b flex items-center justify-between', s.bg, s.border)}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', s.text)} />
                    <h3 className={cn('text-sm font-bold uppercase tracking-wider', s.text)}>
                      {s.label}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-xs font-bold tabular-nums', s.text)}>{items.length}</span>
                    <span className="text-[10px] text-slate-500">·</span>
                    <span className="text-[10px] font-mono text-slate-400">{fmtPeso(totalPesoCol)}</span>
                  </div>
                </div>
                {/* Cards */}
                <div className="p-3 space-y-2.5 overflow-y-auto custom-scroll flex-1" style={{ maxHeight: 'calc(100vh - 420px)' }}>
                  <AnimatePresence mode="popLayout">
                    {items.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <Box className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 italic">
                          {statusKey === 'aguardando_montagem'
                            ? 'Aguardando expedições. Peças com etapa "enviado" aparecerão aqui automaticamente.'
                            : 'Sem peças nesta etapa'}
                        </p>
                      </div>
                    ) : items.map(peca => (
                      <PecaCard
                        key={peca.id}
                        peca={peca}
                        obra={obras.find(o => o.id === (peca.obraId || peca.obra_id))}
                        onAvancar={handleAvancar}
                        onRetornar={handleRetornar}
                        isSelected={pecasSelecionadas.has(peca.id)}
                        onToggleSelect={toggleSelecao}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // ============ LISTA DETALHADA ============
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto custom-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50 text-[10px] uppercase tracking-widest text-slate-400">
                  <th className="px-3 py-2 text-left w-8">
                    <input
                      type="checkbox"
                      checked={pecasFiltradas.length > 0 && pecasFiltradas.every(p => pecasSelecionadas.has(p.id))}
                      onChange={(e) => {
                        if (e.target.checked) setPecasSelecionadas(new Set(pecasFiltradas.map(p => p.id)));
                        else setPecasSelecionadas(new Set());
                      }}
                      className="rounded border-slate-600 bg-slate-800 text-orange-500"
                    />
                  </th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Obra</th>
                  <th className="px-3 py-2 text-right">Qtd</th>
                  <th className="px-3 py-2 text-right">Peso</th>
                  <th className="px-3 py-2 text-center">Última Mov.</th>
                  <th className="px-3 py-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pecasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-500 italic text-xs">
                      Nenhuma peça encontrada com os filtros atuais.
                    </td>
                  </tr>
                ) : pecasFiltradas.map(peca => {
                  const s = STATUS_CONFIG[peca._status];
                  const Icon = s.icon;
                  const obra = obras.find(o => o.id === (peca.obraId || peca.obra_id));
                  const isSelected = pecasSelecionadas.has(peca.id);
                  return (
                    <tr
                      key={peca.id}
                      className={cn(
                        'border-t border-slate-800 hover:bg-slate-800/30 transition-colors',
                        isSelected && 'bg-orange-500/5',
                      )}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelecao(peca.id)}
                          className="rounded border-slate-600 bg-slate-800 text-orange-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold', s.bg, s.text)}>
                          <Icon className="h-3 w-3" />
                          {s.short}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-orange-300 text-xs">{peca.codigo || peca.marca}</td>
                      <td className="px-3 py-2 text-slate-300 truncate max-w-xs" title={peca.nome}>{peca.nome || peca.tipo || '—'}</td>
                      <td className="px-3 py-2 text-slate-400 text-xs">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span className="font-mono">{obra?.codigo || '—'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-300">{fmt(peca.quantidade)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-300 font-mono text-xs">{fmtPeso(peca.pesoTotal || peca.peso)}</td>
                      <td className="px-3 py-2 text-center text-[10px] text-slate-500 font-mono">{fmtData(peca.updated_at)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          {peca._status !== 'montado' && (
                            <button
                              onClick={() => handleAvancar(peca)}
                              className={cn('p-1.5 rounded transition-all', peca._status === 'aguardando_montagem' ? 'bg-blue-500/15 text-blue-300 hover:bg-blue-500/25' : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25')}
                              title={peca._status === 'aguardando_montagem' ? 'Iniciar montagem' : 'Concluir'}
                            >
                              {peca._status === 'aguardando_montagem' ? <PlayCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          {peca._status !== 'aguardando_montagem' && (
                            <button
                              onClick={() => handleRetornar(peca)}
                              className="p-1.5 rounded bg-slate-700/40 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                              title="Retornar etapa"
                            >
                              <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                            </button>
                          )}
                          <button
                            onClick={() => setPecaDetalhe(peca)}
                            className="p-1.5 rounded bg-slate-700/40 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                            title="Ver detalhes"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Mostrando {pecasFiltradas.length} de {pecasMontagem.length} peças no módulo de Montagem</span>
            <span className="font-mono">Soma: {fmtPeso(pecasFiltradas.reduce((s, p) => s + (p.pesoTotal || p.peso || 0), 0))}</span>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* EQUIPES + ALERTA INFORMATIVO                 */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-purple-400" />
            Equipes de Montagem
            <span className="text-[10px] text-slate-500 font-normal">{equipesMontagem.length} equipe(s) cadastrada(s)</span>
          </h3>
          {equipesMontagem.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-8 w-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500 italic">Nenhuma equipe de montagem cadastrada</p>
              <p className="text-[10px] text-slate-600 mt-1">Cadastre equipes na seção Gestão → Equipes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {equipesMontagem.map(eq => (
                <div key={eq.id} className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-700/50 rounded-lg hover:border-slate-600 transition-all">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-purple-500/15 border border-purple-500/30">
                      <Users className="h-3.5 w-3.5 text-purple-300" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{eq.nome}</p>
                      <p className="text-[10px] text-slate-400">{eq.membros} membros · {eq.lider}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {eq.status === 'em_campo' ? 'Em Campo' : 'Disponível'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fluxo explicativo */}
        <div className="bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-slate-900/60 border border-orange-500/20 rounded-xl p-4">
          <h3 className="text-sm font-bold text-orange-300 flex items-center gap-2 mb-3">
            <Send className="h-4 w-4" />
            Fluxo Operacional
          </h3>
          <div className="space-y-2 text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="font-mono text-slate-400">Produção</span>
              <ArrowRight className="h-3 w-3 text-slate-600" />
              <span className="font-mono text-slate-400">Pintura</span>
              <ArrowRight className="h-3 w-3 text-slate-600" />
              <span className="font-mono text-slate-400">Expedido</span>
            </div>
            <div className="flex items-center gap-2 pl-3 text-slate-500">
              <span className="w-1 h-3 border-l border-orange-500/40 inline-block" />
              <span className="text-[10px]">Peça é despachada (Expedição)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-mono text-amber-300 font-bold">ENVIADO</span>
              <ArrowRight className="h-3 w-3 text-amber-400" />
              <span className="font-mono text-amber-300 font-bold">Aguardando Montagem</span>
            </div>
            <div className="flex items-center gap-2 pl-3 text-slate-500">
              <span className="w-1 h-3 border-l border-orange-500/40 inline-block" />
              <span className="text-[10px]">Inicia montagem em campo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="font-mono text-blue-300 font-bold">Em Montagem</span>
              <ArrowRight className="h-3 w-3 text-blue-400" />
              <span className="font-mono text-emerald-300 font-bold">Montado</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50 text-[10px] text-slate-500">
            <p>✨ <span className="text-orange-300 font-bold">Auto-pull:</span> peças entram nesta tela quando expedição muda etapa para "enviado".</p>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* MODAL DETALHE                                */}
      {/* ============================================ */}
      <AnimatePresence>
        {pecaDetalhe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPecaDetalhe(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-orange-400 font-bold">Peça em Montagem</p>
                  <h3 className="text-lg font-bold text-white mt-1">{pecaDetalhe.codigo || pecaDetalhe.marca}</h3>
                  <p className="text-sm text-slate-400">{pecaDetalhe.nome}</p>
                </div>
                <button onClick={() => setPecaDetalhe(null)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-800 py-1.5">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-orange-300">{STATUS_CONFIG[pecaDetalhe._status]?.label}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 py-1.5">
                  <span className="text-slate-500">Quantidade</span>
                  <span className="font-bold text-white">{fmt(pecaDetalhe.quantidade)} pcs</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 py-1.5">
                  <span className="text-slate-500">Peso total</span>
                  <span className="font-bold text-white">{fmtPeso(pecaDetalhe.pesoTotal || pecaDetalhe.peso)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 py-1.5">
                  <span className="text-slate-500">Tipo</span>
                  <span className="font-medium text-white">{pecaDetalhe.tipo || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 py-1.5">
                  <span className="text-slate-500">Marca</span>
                  <span className="font-mono text-white">{pecaDetalhe.marca || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 py-1.5">
                  <span className="text-slate-500">Obra</span>
                  <span className="font-bold text-white">{obras.find(o => o.id === (pecaDetalhe.obraId || pecaDetalhe.obra_id))?.nome || '—'}</span>
                </div>
                {pecaDetalhe.observacoes && (
                  <div className="pt-2">
                    <p className="text-slate-500 mb-1 text-xs">Observações:</p>
                    <p className="text-slate-300 text-xs bg-slate-800/50 rounded p-2">{pecaDetalhe.observacoes}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                {pecaDetalhe._status !== 'montado' && (
                  <button
                    onClick={() => { handleAvancar(pecaDetalhe); setPecaDetalhe(null); }}
                    className="flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all"
                    style={{
                      background: pecaDetalhe._status === 'aguardando_montagem' ? '#3b82f6' : '#10b981',
                      color: 'white',
                    }}
                  >
                    {pecaDetalhe._status === 'aguardando_montagem' ? '▶ Iniciar Montagem' : '✓ Concluir Montagem'}
                  </button>
                )}
                <button
                  onClick={() => setPecaDetalhe(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(249,115,22,0.3); border-radius: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(249,115,22,0.5); }
      `}</style>
    </div>
  );
}
