// ============================================
// MONTEX ERP — Módulo de Montagem em Campo
// ============================================
// Fluxo: Produção → Pintura → Expedido → ENVIADO → MONTAGEM
// Quando peça vai para etapa='enviado', entra automaticamente
// como "Aguardando Montagem" no Kanban deste módulo.
// Operações: Aguardando → Em Montagem → Montado/Entregue
// ============================================

import React, { useState, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  Wrench, CheckCircle2, Clock, MapPin, Users, Package, Building2,
  ChevronDown, Plus, Download, Filter, TrendingUp, Calendar, Search,
  ArrowRight, Truck, Box, AlertCircle, Eye, Upload, FileSpreadsheet,
  ChevronRight, X, Settings, FileText, BarChart3, Activity,
  HardHat, Layers, Send,
} from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useObras, useProducao, useEquipes } from '../contexts/ERPContext';
import { loadConcluidasSmart, saveConcluidasSmart, loadConcluidasLocal } from '../utils/montagemSync';

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
// MÓDULO INDEPENDENTE — status persistido em localStorage + Supabase
// ============================================
// Apenas peças com etapa='enviado' entram no módulo (AUTO-PULL).
// O status "Montado" é gerenciado neste módulo SEM alterar a etapa do
// banco principal (independente da Fabricação/Expedição). Persistência:
//   - localStorage (cache rápido)
//   - Supabase entity_store (sync entre máquinas)
// Ver: src/utils/montagemSync.js

const carregarConcluidas = loadConcluidasLocal;
const salvarConcluidas = saveConcluidasSmart;

// Status do módulo (derivado da etapa + override de concluidas)
const statusFromEtapa = (etapa, concluidas, pecaId) => {
  if (etapa !== 'enviado') return null;
  if (concluidas && concluidas[pecaId]) return 'montado';
  return 'aguardando_montagem';
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
  montado: {
    label: 'Montado',
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
        {peca._status === 'aguardando_montagem' && (
          <button
            onClick={(e) => { e.stopPropagation(); onAvancar?.(peca); }}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 px-2 rounded transition-all hover:opacity-90"
            style={{ background: '#10b981', color: 'white' }}
          >
            <CheckCircle2 className="h-3 w-3" /> Concluir Montagem
          </button>
        )}
        {peca._status === 'montado' && (
          <button
            onClick={(e) => { e.stopPropagation(); onRetornar?.(peca); }}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 py-1.5 px-2 rounded transition-all border border-slate-700"
            title="Retornar para Aguardando Montagem"
          >
            <ChevronDown className="h-3 w-3 rotate-90" /> Retornar p/ Aguardando
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
  const { pecas } = useProducao();
  const { equipes, funcionarios } = useEquipes();

  // Filtros
  const [obraFiltro, setObraFiltro] = useState('todas');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState('recente');
  const [pecasSelecionadas, setPecasSelecionadas] = useState(new Set());
  const [viewMode, setViewMode] = useState('kanban'); // kanban | lista
  const [pecaDetalhe, setPecaDetalhe] = useState(null);

  // ===== Concluídas (localStorage + Supabase sync) =====
  const [concluidas, setConcluidas] = useState(() => loadConcluidasSmart(remoto => {
    // Callback quando o remoto for diferente do local — atualiza UI
    setConcluidas(remoto);
  }));

  const setConcluida = (pecaId, montada) => {
    setConcluidas(prev => {
      const next = { ...prev };
      if (montada) next[pecaId] = { montadoEm: new Date().toISOString() };
      else delete next[pecaId];
      salvarConcluidas(next);
      return next;
    });
  };

  // ===== Importar planilha XLSX =====
  const fileInputRef = useRef(null);
  const [importPreview, setImportPreview] = useState(null);

  // Normalizador de marca (corrige typos comuns)
  const normalizarMarca = (m) => {
    if (!m) return '';
    let s = String(m).toUpperCase().trim().replace(/\s+/g, '');
    // Correções comuns: WM (typo de digitação) → VM (Viga-Mestra)
    s = s.replace(/^WM/, 'VM');
    // Remover barra (V/28H → V28H)
    s = s.replace(/\//g, '');
    return s;
  };

  const handleArquivoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Detecta header: linha que contém "Marca" e "Status"
        let headerIdx = -1;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const r = rows[i].map(c => String(c).toLowerCase());
          if (r.some(c => c.includes('marca')) && (r.some(c => c.includes('status')) || r.some(c => c.includes('tipo')))) {
            headerIdx = i;
            break;
          }
        }
        if (headerIdx < 0) {
          toast.error('Não foi possível detectar o cabeçalho da planilha (esperado: Item / Data / Tipo / Marca / Qtd / Status)');
          return;
        }
        const header = rows[headerIdx].map(c => String(c).toLowerCase().trim());
        const colMarca = header.findIndex(c => c.includes('marca'));
        const colStatus = header.findIndex(c => c.includes('status'));
        const colTipo = header.findIndex(c => c.includes('tipo'));
        const colQtd = header.findIndex(c => c.includes('qtd') || c.includes('quantidade'));
        const colData = header.findIndex(c => c === 'data' || c.includes('data'));

        // Coleta linhas válidas
        const linhas = [];
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const r = rows[i];
          const marca = r[colMarca];
          if (!marca) continue;
          const status = colStatus >= 0 ? String(r[colStatus] || '').toLowerCase() : 'montada';
          // Aceita "Montada", "Montado", "Mont."
          if (!status.includes('mont')) continue;
          linhas.push({
            marca: String(marca).trim(),
            marcaNorm: normalizarMarca(marca),
            tipo: colTipo >= 0 ? String(r[colTipo] || '').trim() : '',
            qtd: colQtd >= 0 ? (Number(r[colQtd]) || 1) : 1,
            data: colData >= 0 ? String(r[colData] || '').trim() : '',
          });
        }
        if (linhas.length === 0) {
          toast.error('Nenhuma linha "Montada" encontrada na planilha');
          return;
        }

        // Match com peças do contexto (priorizar etapa=enviado)
        const porMarca = {};
        (pecas || []).forEach(p => {
          const m = normalizarMarca(p.marca);
          if (m) {
            if (!porMarca[m]) porMarca[m] = [];
            porMarca[m].push(p);
          }
        });

        const matched = [];
        const naoEncontradas = [];
        for (const linha of linhas) {
          const candidatas = porMarca[linha.marcaNorm];
          if (!candidatas || candidatas.length === 0) {
            naoEncontradas.push(linha);
            continue;
          }
          const filtroObra = obraFiltro !== 'todas'
            ? candidatas.filter(c => (c.obraId || c.obra_id) === obraFiltro)
            : candidatas;
          const usar = filtroObra.length > 0 ? filtroObra : candidatas;
          const enviadas = usar.filter(p => p.etapa === 'enviado');
          const selecao = enviadas.length > 0 ? enviadas : usar;
          for (const p of selecao) {
            matched.push({ ...linha, peca: p });
          }
        }

        const pesoTotal = matched.reduce((s, m) => s + (m.peca.pesoTotal || m.peca.peso || 0), 0);
        setImportPreview({
          fileName: file.name,
          linhasPlanilha: linhas.length,
          totalLinhas: rows.length - headerIdx - 1,
          matched,
          naoEncontradas,
          pesoTotal,
        });
      } catch (err) {
        toast.error('Erro ao ler planilha: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const aplicarImportacao = () => {
    if (!importPreview || importPreview.matched.length === 0) return;
    const ids = importPreview.matched.map(m => m.peca.id);
    setConcluidas(prev => {
      const next = { ...prev };
      const agora = new Date().toISOString();
      ids.forEach(id => {
        const linha = importPreview.matched.find(m => m.peca.id === id);
        next[id] = {
          montadoEm: agora,
          origem: importPreview.fileName,
          marcaPlanilha: linha?.marca,
          dataMontagem: linha?.data,
        };
      });
      salvarConcluidas(next);
      return next;
    });
    toast.success(`✅ ${ids.length} peças marcadas como Montadas (${importPreview.naoEncontradas.length} não encontradas)`);
    setImportPreview(null);
  };

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
  // Apenas peças com etapa=enviado. Status "Montado" via localStorage.
  const pecasMontagem = useMemo(() => {
    return (pecas || [])
      .map(p => {
        const status = statusFromEtapa(p.etapa, concluidas, p.id);
        if (!status) return null;
        return { ...p, _status: status };
      })
      .filter(Boolean);
  }, [pecas, concluidas]);

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

  // ===== Agrupamento Kanban (apenas 2 colunas) =====
  const kanban = useMemo(() => ({
    aguardando_montagem: pecasFiltradas.filter(p => p._status === 'aguardando_montagem'),
    montado: pecasFiltradas.filter(p => p._status === 'montado'),
  }), [pecasFiltradas]);

  // ===== KPIs (em UNIDADES físicas; respeitam filtro de obra) =====
  const kpis = useMemo(() => {
    // Peso total da OBRA (referência 100% do progresso geral)
    // Quando obra é "todas", soma peso de todas obras ativas
    const obrasReferencia = obraFiltro !== 'todas'
      ? obras.filter(o => o.id === obraFiltro)
      : obras.filter(o => !['cancelada','concluida','orcamento'].includes(o.status));
    const pesoObraTotal = obrasReferencia.reduce((s, o) =>
      s + (o.contratoPesoTotal || o.contrato_peso_total || o.pesoTotal || 0), 0);

    // Peso e unidades das peças no escopo
    const totalPeso = pecasFiltradas.reduce((s, p) => s + (p.pesoTotal || p.peso || 0), 0);
    const totalQtd = pecasFiltradas.reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);

    // Aguardando
    const aguardando = pecasFiltradas.filter(p => p._status === 'aguardando_montagem');
    const pesoAguardando = aguardando.reduce((s, p) => s + (p.pesoTotal || p.peso || 0), 0);
    const qtdAguardando = aguardando.reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);

    // Montadas
    const montadas = pecasFiltradas.filter(p => p._status === 'montado');
    const pesoMontado = montadas.reduce((s, p) => s + (p.pesoTotal || p.peso || 0), 0);
    const qtdMontada = montadas.reduce((s, p) => s + (parseInt(p.quantidade) || 1), 0);

    return {
      // Peso da obra (referência 100%)
      pesoObraTotal,
      // Pesos
      totalPeso, pesoAguardando, pesoMontado,
      // Unidades (somatório de quantidade)
      totalQtd, qtdAguardando, qtdMontada,
      // Contadores de peças (banco)
      itensMontados: montadas.length,
      itensAguardando: aguardando.length,
      // % do PESO TOTAL DA OBRA (não do escopo)
      pctAvanco: pesoObraTotal > 0 ? (pesoMontado / pesoObraTotal * 100) : 0,
      pctAguardando: pesoObraTotal > 0 ? (pesoAguardando / pesoObraTotal * 100) : 0,
      equipesAtivas: equipesMontagem.filter(e => e.status === 'em_campo').length,
      totalEquipes: equipesMontagem.length,
      totalPecas: pecasFiltradas.length,
    };
  }, [pecasFiltradas, equipesMontagem, obras, obraFiltro]);

  // ===== Ações (apenas localStorage — NÃO altera o banco) =====
  // Concluir Montagem: marca peça como montada SOMENTE no módulo
  const handleAvancar = (peca) => {
    setConcluida(peca.id, true);
    toast.success(`✅ Montada (módulo): ${peca.codigo || peca.marca}`);
  };

  // Retornar para Aguardando: desmarca no módulo
  const handleRetornar = (peca) => {
    setConcluida(peca.id, false);
    toast.success(`↩️ Retornada para Aguardando: ${peca.codigo || peca.marca}`);
  };

  // Lote: aplica para todas as selecionadas
  const handleAcaoLote = (acao) => {
    const ids = Array.from(pecasSelecionadas);
    if (ids.length === 0) {
      toast.error('Selecione ao menos 1 peça');
      return;
    }
    let ok = 0;
    setConcluidas(prev => {
      const next = { ...prev };
      for (const id of ids) {
        const p = pecasMontagem.find(x => x.id === id);
        if (!p) continue;
        if (acao === 'concluir' && p._status === 'aguardando_montagem') {
          next[id] = { montadoEm: new Date().toISOString() }; ok++;
        } else if (acao === 'retornar' && p._status === 'montado') {
          delete next[id]; ok++;
        }
      }
      salvarConcluidas(next);
      return next;
    });
    toast.success(`${ok}/${ids.length} peça(s) atualizadas (módulo)`);
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
              Peças entram automaticamente após expedição · {fmt(kpis.totalQtd)} unidade(s) ({kpis.totalPecas} peças)
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
          {/* Importar planilha XLSX */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleArquivoUpload}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar Planilha
          </Button>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Aguardando" value={`${fmt(kpis.qtdAguardando)} un`} sub={`${kpis.itensAguardando} peças · ${fmtPeso(kpis.pesoAguardando)}`} icon={Truck} color="#f59e0b" delay={0} />
        <KPI label="Montado" value={`${fmt(kpis.qtdMontada)} un`} sub={`${kpis.itensMontados} peças · ${fmtPeso(kpis.pesoMontado)}`} icon={CheckCircle2} color="#10b981" delay={0.05} />
        <KPI label="Equipes em Campo" value={`${kpis.equipesAtivas}/${kpis.totalEquipes}`} sub="ativas / total" icon={Users} color="#a855f7" delay={0.1} />
        <KPI label="Progresso Obra" value={`${kpis.pctAvanco.toFixed(1)}%`} sub={`${fmtPeso(kpis.pesoMontado)} de ${fmtPeso(kpis.pesoObraTotal)}`} icon={TrendingUp} color="#06b6d4" delay={0.15} />
      </div>

      {/* ============================================ */}
      {/* PROGRESSO GERAL (% baseado no PESO TOTAL DA OBRA) */}
      {/* ============================================ */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            Pipeline de Montagem
            <span className="text-[10px] font-mono text-slate-500 ml-2">100% = peso total contratual da obra</span>
          </h3>
          <span className="text-[10px] font-mono text-cyan-300">{kpis.pctAvanco.toFixed(1)}% concluído</span>
        </div>
        <div className="h-3 bg-slate-800/80 rounded-full overflow-hidden flex">
          {kpis.pesoObraTotal > 0 && (
            <>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(kpis.pesoMontado / kpis.pesoObraTotal) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full"
                style={{ background: 'linear-gradient(90deg, #10b981, #059669)', boxShadow: '0 0 8px #10b98180' }}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(kpis.pesoAguardando / kpis.pesoObraTotal) * 100}%` }}
                transition={{ duration: 1, delay: 0.1, ease: 'easeOut' }}
                className="h-full"
                style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)' }}
              />
            </>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px]">
          <div className="flex gap-4">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Montado: {fmtPeso(kpis.pesoMontado)} ({kpis.pctAvanco.toFixed(1)}%)
            </span>
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Aguardando: {fmtPeso(kpis.pesoAguardando)} ({kpis.pctAguardando.toFixed(1)}%)
            </span>
          </div>
          <span className="text-slate-400 font-mono">Obra: {fmtPeso(kpis.pesoObraTotal)} (100%)</span>
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
              onClick={() => handleAcaoLote('concluir')}
              className="text-[11px] font-bold px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white transition-all"
            >
              ✓ Concluir Montagem
            </button>
            <button
              onClick={() => handleAcaoLote('retornar')}
              className="text-[11px] font-bold px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white transition-all"
            >
              ↩ Retornar
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {['aguardando_montagem', 'montado'].map(statusKey => {
            const s = STATUS_CONFIG[statusKey];
            const items = kanban[statusKey];
            const Icon = s.icon;
            const totalPesoCol = items.reduce((sum, p) => sum + (p.pesoTotal || p.peso || 0), 0);
            // Contagem por UNIDADES (não por marcas): marca com qtd>1 conta cada unidade.
            const totalUnidadesCol = items.reduce((sum, p) => sum + (parseInt(p.quantidade) || 1), 0);
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
                    <span className={cn('text-xs font-bold tabular-nums', s.text)}>{totalUnidadesCol}</span>
                    <span className="text-[10px] text-slate-500">un</span>
                    <span className="text-[10px] text-slate-600">({items.length} marcas)</span>
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
                          {peca._status === 'aguardando_montagem' && (
                            <button
                              onClick={() => handleAvancar(peca)}
                              className="p-1.5 rounded bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-all"
                              title="Concluir montagem"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {peca._status === 'montado' && (
                            <button
                              onClick={() => handleRetornar(peca)}
                              className="p-1.5 rounded bg-slate-700/40 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                              title="Retornar para Aguardando Montagem"
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
              <span className="text-[10px]">Conclui montagem em campo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono text-emerald-300 font-bold">Aguardando</span>
              <ArrowRight className="h-3 w-3 text-emerald-400" />
              <span className="font-mono text-emerald-300 font-bold">MONTADO ✓</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50 text-[10px] text-slate-500">
            <p>✨ <span className="text-orange-300 font-bold">Auto-pull:</span> peças entram nesta tela quando expedição muda etapa para "enviado".</p>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* MODAL IMPORTAÇÃO PLANILHA                    */}
      {/* ============================================ */}
      <AnimatePresence>
        {importPreview && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setImportPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between p-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Preview da Importação</p>
                    <h3 className="text-lg font-bold text-white">{importPreview.fileName}</h3>
                  </div>
                </div>
                <button onClick={() => setImportPreview(null)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Linhas planilha</p>
                    <p className="text-2xl font-black text-white tabular-nums">{importPreview.linhasPlanilha}</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-emerald-300">A marcar como Montada</p>
                    <p className="text-2xl font-black text-emerald-300 tabular-nums">{importPreview.matched.length}</p>
                    <p className="text-[10px] text-emerald-400 mt-1">{fmtPeso(importPreview.pesoTotal)}</p>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-rose-300">Não encontradas</p>
                    <p className="text-2xl font-black text-rose-300 tabular-nums">{importPreview.naoEncontradas.length}</p>
                  </div>
                </div>

                {importPreview.naoEncontradas.length > 0 && (
                  <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-3 mb-3">
                    <p className="text-xs font-bold text-rose-300 mb-1">⚠️ Marcas sem correspondência:</p>
                    <p className="text-[11px] text-rose-200">
                      {importPreview.naoEncontradas.map(n => n.marca).join(', ')}
                    </p>
                    <p className="text-[10px] text-rose-400/70 mt-1">Estas peças serão ignoradas na importação.</p>
                  </div>
                )}

                <div className="bg-slate-800/30 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-slate-800/60 border-b border-slate-700 flex items-center justify-between">
                    <p className="text-xs font-bold text-white">Peças que serão marcadas:</p>
                    <p className="text-[10px] text-slate-400">{importPreview.matched.length} peças</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scroll">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-800/40 text-[9px] uppercase text-slate-500">
                          <th className="px-3 py-1.5 text-left">Marca</th>
                          <th className="px-3 py-1.5 text-left">Tipo</th>
                          <th className="px-3 py-1.5 text-left">Peça ERP</th>
                          <th className="px-3 py-1.5 text-right">Peso</th>
                          <th className="px-3 py-1.5 text-left">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.matched.slice(0, 100).map((m, i) => (
                          <tr key={i} className="border-t border-slate-800/50">
                            <td className="px-3 py-1 text-emerald-300 font-mono">{m.marca}</td>
                            <td className="px-3 py-1 text-slate-400">{m.tipo}</td>
                            <td className="px-3 py-1 text-slate-300 font-mono text-[10px]">{m.peca.id}</td>
                            <td className="px-3 py-1 text-right text-slate-300">{fmtPeso(m.peca.pesoTotal || m.peca.peso)}</td>
                            <td className="px-3 py-1 text-slate-500">{m.data || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.matched.length > 100 && (
                      <p className="text-center text-[10px] text-slate-500 py-2">+ {importPreview.matched.length - 100} peças adicionais</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 p-5 border-t border-slate-800">
                <button
                  onClick={() => setImportPreview(null)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={aplicarImportacao}
                  disabled={importPreview.matched.length === 0}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-bold"
                >
                  ✓ Aplicar — Marcar {importPreview.matched.length} como Montadas
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                {pecaDetalhe._status === 'aguardando_montagem' && (
                  <button
                    onClick={() => { handleAvancar(pecaDetalhe); setPecaDetalhe(null); }}
                    className="flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all"
                    style={{ background: '#10b981', color: 'white' }}
                  >
                    ✓ Concluir Montagem
                  </button>
                )}
                {pecaDetalhe._status === 'montado' && (
                  <button
                    onClick={() => { handleRetornar(pecaDetalhe); setPecaDetalhe(null); }}
                    className="flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all bg-slate-700 text-slate-200 hover:bg-slate-600"
                  >
                    ↩ Retornar para Aguardando
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
