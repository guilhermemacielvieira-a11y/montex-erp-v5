// ============================================
// KANBAN CORTE PAGE - Controle de Corte
// ============================================
// Lista completa de peças para corte com
// rastreamento de status PERSISTIDO NO SUPABASE
// e notificações automáticas para o Kanban de Produção.
//
// Refatorado: usa useCorteSupabase em vez de
// corteStatusStore (que era 100% em memória).
// ============================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useCorteSupabase } from '../hooks/useCorteSupabase';
import { CONJUNTO_BOM, getBOMByConjunto, getConjuntosByMarca } from '../data/conjuntoBOM';
import { useEstoqueReal } from '../contexts/EstoqueRealContext';

// ==========================================
// CONSTANTES DE VISUAL
// ==========================================
const ITEMS_PER_PAGE = 50;

const CATEGORIA_CORES = {
  'COLUNA':           { bg: '#1e3a5f', border: '#2980b9', text: '#5dade2', icon: '🏗️' },
  'TESOURA':          { bg: '#3d1f5e', border: '#8e44ad', text: '#bb8fce', icon: '✂️' },
  'MISULA':           { bg: '#1a3c34', border: '#1abc9c', text: '#48c9b0', icon: '📐' },
  'CHAPA':            { bg: '#5d3a1f', border: '#e67e22', text: '#f0b27a', icon: '🔲' },
  'CHUMBADOR':        { bg: '#4a1a1a', border: '#c0392b', text: '#ec7063', icon: '⚓' },
  'TERÇA-TAP':        { bg: '#1f4a5d', border: '#16a085', text: '#73c6b6', icon: '📏' },
  'VIGA':             { bg: '#2c3e50', border: '#3498db', text: '#85c1e9', icon: '🔩' },
  'VIGA-MESTRA':      { bg: '#1a2634', border: '#2c3e80', text: '#7fb3d8', icon: '🔧' },
  'DIAGONAL-VM':      { bg: '#3d3d1f', border: '#f1c40f', text: '#f9e79f', icon: '↗️' },
  'MONTANTE-VM':      { bg: '#4a3a1a', border: '#d4ac0d', text: '#f4d03f', icon: '↕️' },
  'TRELIÇA':          { bg: '#1f3d3d', border: '#17a589', text: '#76d7c4', icon: '🔺' },
  'SUPORTE':          { bg: '#3d1f3d', border: '#a569bd', text: '#c39bd3', icon: '📎' },
  'CALHA':            { bg: '#1f2d3d', border: '#5b9bd5', text: '#85c1e9', icon: '🌊' },
  'COLUNETA':         { bg: '#2d3d1f', border: '#82e0aa', text: '#a9dfbf', icon: '🏛️' },
  'DIAGONAL':         { bg: '#3d2d1f', border: '#dc7633', text: '#f0b27a', icon: '↗️' },
  'DIAGONAL-TL':      { bg: '#3d3d2d', border: '#d4ac0d', text: '#f7dc6f', icon: '↗️' },
  'TIRANTE':          { bg: '#1f1f3d', border: '#5b2c6f', text: '#a569bd', icon: '🔗' },
  'CONTRAVENTAMENTO': { bg: '#2d1f1f', border: '#cb4335', text: '#f1948a', icon: '✖️' },
  'BOCAL':            { bg: '#2d2d4f', border: '#6c5ce7', text: '#a29bfe', icon: '🔧' },
};

const getCor = (tipo) => CATEGORIA_CORES[tipo] || { bg: '#2d2d2d', border: '#7f8c8d', text: '#bdc3c7', icon: '📦' };

const STATUS_CONF = {
  'aguardando': { label: 'Aguardando', bg: '#44370e', border: '#f59e0b', text: '#fbbf24', icon: '⏳' },
  'cortando':   { label: 'Cortando',   bg: '#0c2d48', border: '#3b82f6', text: '#60a5fa', icon: '⚙️' },
  'finalizado': { label: 'Finalizado', bg: '#0d3320', border: '#22c55e', text: '#4ade80', icon: '✅' }
};

// ==========================================
// FORMATADORES
// ==========================================
const formatPeso = (kg) => {
  if (kg == null || isNaN(kg)) return '—';
  if (Math.abs(kg) >= 1000) return (kg / 1000).toFixed(2) + ' t';
  return kg.toFixed(1) + ' kg';
};

const formatComp = (mm) => {
  if (!mm) return '—';
  if (mm >= 1000) return (mm / 1000).toFixed(2) + ' m';
  return mm + ' mm';
};

// ==========================================
// GRID COLUMNS
// ==========================================
const GRID_COLS = '36px 62px 125px minmax(140px,1fr) 80px minmax(100px,1fr) 48px 82px 98px 108px';

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function KanbanCortePage() {
  // --- Hook de dados reais do Supabase ---
  const {
    items, metrics, categorias,
    iniciarCorte, finalizarCorte, resetarCorte, finalizarCorteEmLote,
    contarCortadasParaConjunto, loading: corteLoading
  } = useCorteSupabase();

  // --- Estado local da UI ---
  const [viewMode, setViewMode] = useState('lista');
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [busca, setBusca] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showPanel, setShowPanel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('marca');
  const [sortDir, setSortDir] = useState('asc');
  const [toast, setToast] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const prevReadyRef = useRef([]);
  const toastTimer = useRef(null);
  const mountedRef = useRef(false);

  // --- Integração Estoque Real ---
  const { deduzirEstoque } = useEstoqueReal();

  // Abater peso do estoque quando peça entra em corte
  const abaterEstoquePorCorte = useCallback((item) => {
    if (!item || !item.perfil || !item.peso) return;
    deduzirEstoque(
      item.perfil,
      item.peso,
      'obra-001',
      `MARCA-${item.marca}`,
      `Corte Marca ${item.marca} - ${item.peca} (${item.perfil})`
    );
  }, [deduzirEstoque]);

  // --- Conjuntos (BOM) prontidão - computado reativamente ---
  const conjuntosInfo = useMemo(() => {
    const info = [];
    const allConj = Object.keys(CONJUNTO_BOM);
    allConj.forEach(nome => {
      const bom = getBOMByConjunto(nome);
      if (!bom || bom.length === 0) return;
      const { totalPecas, cortadas } = contarCortadasParaConjunto(bom);
      info.push({
        nome,
        totalPecas,
        cortadas,
        progresso: totalPecas > 0 ? Math.round((cortadas / totalPecas) * 100) : 0,
        pronto: cortadas === totalPecas && totalPecas > 0
      });
    });
    info.sort((a, b) => {
      if (a.pronto !== b.pronto) return b.pronto ? 1 : -1;
      return b.progresso - a.progresso;
    });
    return info;
  }, [contarCortadasParaConjunto]);

  // Toast para conjuntos que acabaram de ficar prontos
  useEffect(() => {
    const newReady = conjuntosInfo.filter(c => c.pronto).map(c => c.nome);
    if (mountedRef.current) {
      const justReady = newReady.filter(n => !prevReadyRef.current.includes(n));
      if (justReady.length > 0) {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        const msg = justReady.length <= 3
          ? justReady.join(', ')
          : justReady.slice(0, 3).join(', ') + ` +${justReady.length - 3}`;
        setToast({ message: `🎉 Material pronto para montagem: ${msg}` });
        toastTimer.current = setTimeout(() => setToast(null), 7000);
      }
    }
    mountedRef.current = true;
    prevReadyRef.current = newReady;
  }, [conjuntosInfo]);

  // Cleanup do timer
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // --- Filtragem e Ordenação ---
  const filteredItems = useMemo(() => {
    let result = [...items];
    if (filtroCategoria !== 'TODOS') result = result.filter(i => i.peca === filtroCategoria);
    if (filtroStatus !== 'TODOS') result = result.filter(i => i.status === filtroStatus);
    if (busca) {
      const t = busca.toLowerCase();
      result = result.filter(i =>
        String(i.marca).includes(t) ||
        (i.peca || '').toLowerCase().includes(t) ||
        (i.perfil || '').toLowerCase().includes(t) ||
        (i.material || '').toLowerCase().includes(t)
      );
    }
    result.sort((a, b) => {
      let va = a[sortField] ?? '', vb = b[sortField] ?? '';
      if (typeof va === 'string') { va = va.toLowerCase(); vb = String(vb).toLowerCase(); }
      return (va < vb ? -1 : va > vb ? 1 : 0) * (sortDir === 'asc' ? 1 : -1);
    });
    return result;
  }, [items, filtroCategoria, filtroStatus, busca, sortField, sortDir]);

  // Paginação
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const pageItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  useEffect(() => { setCurrentPage(1); }, [filtroCategoria, filtroStatus, busca]);

  // Resumo filtrado
  const filteredSummary = useMemo(() => ({
    count: filteredItems.length,
    peso: filteredItems.reduce((s, i) => s + (i.peso || 0), 0),
    qtd: filteredItems.reduce((s, i) => s + (i.quantidade || 0), 0),
  }), [filteredItems]);

  // --- Seleção (por ID único) ---
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAllPage = () => {
    setSelectedIds(new Set(pageItems.filter(i => i.status !== 'finalizado').map(i => i.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  // --- Ações (com abatimento automático de estoque + persistência Supabase) ---
  const handleBatchFinalize = async () => {
    if (selectedIds.size === 0) return;
    const idsArray = Array.from(selectedIds);
    // Abater estoque para peças que ainda estão aguardando
    idsArray.forEach(id => {
      const item = items.find(i => i.id === id);
      if (item && item.status === 'aguardando') {
        abaterEstoquePorCorte(item);
      }
    });
    await finalizarCorteEmLote(idsArray);
    setSelectedIds(new Set());
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // --- Kanban Drag-and-Drop Handler ---
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;

    const id = draggableId;
    const item = items.find(i => i.id === id);
    if (!item) return;

    const sourceStatus = source.droppableId;
    const destStatus = destination.droppableId;

    // Determine what functions to call based on transition
    if (sourceStatus === 'aguardando' && destStatus === 'cortando') {
      abaterEstoquePorCorte(item);
      iniciarCorte(id);
    } else if (sourceStatus === 'aguardando' && destStatus === 'finalizado') {
      abaterEstoquePorCorte(item);
      finalizarCorte(id);
    } else if (sourceStatus === 'cortando' && destStatus === 'finalizado') {
      finalizarCorte(id);
    } else if (sourceStatus === 'cortando' && destStatus === 'aguardando') {
      resetarCorte(id);
    } else if (sourceStatus === 'finalizado' && destStatus === 'aguardando') {
      resetarCorte(id);
    }
  };

  // Conjuntos derivados
  const conjuntosReady = conjuntosInfo.filter(c => c.pronto);
  const conjuntosProgress = conjuntosInfo.filter(c => !c.pronto && c.cortadas > 0);

  // --- Kanban Board Data ---
  const kanbanItemsForDisplay = useMemo(() => {
    let result = [...items];
    if (filtroCategoria !== 'TODOS') result = result.filter(i => i.peca === filtroCategoria);
    if (busca) {
      const t = busca.toLowerCase();
      result = result.filter(i =>
        String(i.marca).includes(t) ||
        (i.peca || '').toLowerCase().includes(t) ||
        (i.perfil || '').toLowerCase().includes(t) ||
        (i.material || '').toLowerCase().includes(t)
      );
    }
    return result;
  }, [items, filtroCategoria, busca]);

  const kanbanColumns = useMemo(() => ({
    aguardando: kanbanItemsForDisplay.filter(i => i.status === 'aguardando'),
    cortando: kanbanItemsForDisplay.filter(i => i.status === 'cortando'),
    finalizado: kanbanItemsForDisplay.filter(i => i.status === 'finalizado')
  }), [kanbanItemsForDisplay]);

  // ==========================================
  // RENDER
  // ==========================================

  // Loading state
  if (corteLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0f1c 0%, #111827 50%, #0f172a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#9ca3af', fontSize: 16
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
          <div>Carregando dados de corte do Supabase...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0f1c 0%, #111827 50%, #0f172a 100%)',
      color: '#e5e7eb',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '20px 24px',
      position: 'relative'
    }}>

      {/* ====== TOAST ====== */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '14px 28px', borderRadius: 12,
          background: 'linear-gradient(135deg, #064e3b, #065f46)',
          border: '1px solid #22c55e', color: '#fff', fontWeight: 600, fontSize: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'toastSlide 0.3s ease-out', maxWidth: 600, textAlign: 'center'
        }}>
          {toast.message}
        </div>
      )}

      {/* ====== HEADER ====== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px',
            background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            KANBAN CORTE
          </h1>
          <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: 13 }}>
            Controle de Corte — {metrics.totalMarcas || 0} peças | {formatPeso(metrics.pesoTotal)} total
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', gap: 4, background: '#1f2937', borderRadius: 10, padding: 4 }}>
            <button
              onClick={() => setViewMode('lista')}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: viewMode === 'lista' ? '1px solid #3b82f6' : '1px solid transparent',
                background: viewMode === 'lista' ? '#0c2d48' : 'transparent',
                color: viewMode === 'lista' ? '#60a5fa' : '#9ca3af',
                cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              📋 Lista
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: viewMode === 'kanban' ? '1px solid #8b5cf6' : '1px solid transparent',
                background: viewMode === 'kanban' ? '#3d1a5e' : 'transparent',
                color: viewMode === 'kanban' ? '#c4b5fd' : '#9ca3af',
                cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              🎯 Kanban
            </button>
          </div>

          <button
            onClick={() => setShowPanel(!showPanel)}
            style={{
              position: 'relative',
              background: conjuntosReady.length > 0 ? 'linear-gradient(135deg, #064e3b, #065f46)' : '#1f2937',
              border: `1px solid ${conjuntosReady.length > 0 ? '#22c55e' : '#374151'}`,
              borderRadius: 12, padding: '10px 18px', cursor: 'pointer',
              color: '#fff', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
              boxShadow: conjuntosReady.length > 0 ? '0 0 20px rgba(34,197,94,0.2)' : 'none'
            }}
          >
            <span style={{ fontSize: 18 }}>🔔</span>
            <span>Conjuntos Prontos</span>
            {conjuntosReady.length > 0 && (
              <span style={{
                background: '#22c55e', color: '#000', borderRadius: 20,
                padding: '2px 8px', fontSize: 11, fontWeight: 800, minWidth: 20, textAlign: 'center',
                animation: 'pulse 2s infinite'
              }}>
                {conjuntosReady.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ====== KPI CARDS ====== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
        gap: 10, marginBottom: 16
      }}>
        {[
          { label: 'Total Peças', value: metrics.totalMarcas || 0, sub: formatPeso(metrics.pesoTotal), color: '#6366f1', icon: '📋' },
          { label: 'Aguardando', value: metrics.aguardando || 0, sub: formatPeso(metrics.pesoAguardando), color: '#f59e0b', icon: '⏳' },
          { label: 'Em Corte', value: metrics.cortando || 0, sub: formatPeso(metrics.pesoCortando), color: '#3b82f6', icon: '⚙️' },
          { label: 'Finalizadas', value: metrics.finalizado || 0, sub: formatPeso(metrics.pesoFinalizado), color: '#22c55e', icon: '✅' },
          { label: 'Progresso', value: `${metrics.progressoMarcas || 0}%`, sub: `${formatPeso(metrics.pesoFinalizado)} cortado`, color: '#8b5cf6', icon: '📊' },
        ].map((kpi, idx) => (
          <div key={idx} style={{
            background: '#111827', border: '1px solid #1f2937', borderRadius: 12,
            padding: '12px 14px', borderLeft: `3px solid ${kpi.color}`
          }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>{kpi.icon} {kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, lineHeight: 1.2 }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ====== BARRA DE PROGRESSO GLOBAL ====== */}
      <div style={{
        background: '#111827', border: '1px solid #1f2937', borderRadius: 10,
        padding: '10px 14px', marginBottom: 14
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Progresso Geral de Corte</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6' }}>
            {metrics.progressoPeso || 0}% do peso | {metrics.progressoMarcas || 0}% das peças
          </span>
        </div>
        <div style={{ background: '#1f2937', borderRadius: 6, height: 8, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 6,
            background: 'linear-gradient(90deg, #8b5cf6, #6366f1, #3b82f6)',
            width: `${metrics.progressoPeso || 0}%`,
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      {/* ====== CHIPS DE CATEGORIA ====== */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14,
        padding: '10px 14px', background: '#111827', border: '1px solid #1f2937', borderRadius: 10
      }}>
        <button
          onClick={() => setFiltroCategoria('TODOS')}
          style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            border: filtroCategoria === 'TODOS' ? '1px solid #8b5cf6' : '1px solid #374151',
            background: filtroCategoria === 'TODOS' ? '#4c1d95' : '#1f2937',
            color: filtroCategoria === 'TODOS' ? '#c4b5fd' : '#9ca3af',
            cursor: 'pointer', transition: 'all 0.15s'
          }}
        >
          TODOS ({metrics.totalMarcas || 0})
        </button>
        {categorias.map(cat => {
          const cor = getCor(cat);
          const cm = metrics.categorias?.[cat] || {};
          const active = filtroCategoria === cat;
          return (
            <button key={cat}
              onClick={() => setFiltroCategoria(active ? 'TODOS' : cat)}
              style={{
                padding: '5px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                border: `1px solid ${active ? cor.border : '#374151'}`,
                background: active ? cor.bg : '#1f2937',
                color: active ? cor.text : '#9ca3af',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'inline-flex', alignItems: 'center', gap: 3
              }}
            >
              {cor.icon} {cat}
              <span style={{
                background: active ? cor.border + '33' : '#374151',
                padding: '1px 5px', borderRadius: 10, fontSize: 9
              }}>
                {cm.finalizado || 0}/{cm.total || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* ====== BARRA DE FILTROS ====== */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 170 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 14 }}>🔍</span>
          <input
            type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar marca, tipo, perfil, material..."
            style={{
              width: '100%', padding: '9px 10px 9px 32px', borderRadius: 10,
              background: '#111827', border: '1px solid #374151', color: '#e5e7eb',
              fontSize: 13, outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        <select
          value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          style={{
            padding: '9px 12px', borderRadius: 10, background: '#111827',
            border: '1px solid #374151', color: '#e5e7eb', fontSize: 13, cursor: 'pointer'
          }}
        >
          <option value="TODOS">Todos Status</option>
          <option value="aguardando">Aguardando</option>
          <option value="cortando">Em Corte</option>
          <option value="finalizado">Finalizado</option>
        </select>

        <div style={{
          padding: '9px 12px', borderRadius: 10, background: '#1f2937',
          fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap'
        }}>
          {filteredSummary.count} itens | {formatPeso(filteredSummary.peso)} | {filteredSummary.qtd} pcs
        </div>

        {selectedIds.size > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleBatchFinalize} style={{
              padding: '7px 14px', borderRadius: 10, border: '1px solid #22c55e',
              background: '#064e3b', color: '#4ade80', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s'
            }}>
              Finalizar {selectedIds.size} selecionadas
            </button>
            <button onClick={clearSelection} style={{
              padding: '7px 10px', borderRadius: 10, border: '1px solid #374151',
              background: '#1f2937', color: '#9ca3af', fontSize: 12, cursor: 'pointer'
            }}>
              Limpar
            </button>
          </div>
        )}
      </div>

      {/* ====== VISTA PRINCIPAL: LISTA OU KANBAN ====== */}
      {viewMode === 'lista' ? (
        /* LISTA VIEW */
        <div style={{
          background: '#111827', border: '1px solid #1f2937', borderRadius: 12,
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 920 }}>
              {/* Cabecalho */}
              <div style={{
                display: 'grid', gridTemplateColumns: GRID_COLS,
                padding: '9px 14px', background: '#0d1117',
                borderBottom: '2px solid #1f2937',
                fontSize: 10, fontWeight: 700, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                position: 'sticky', top: 0, zIndex: 2
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={pageItems.filter(i => i.status !== 'finalizado').length > 0 &&
                      pageItems.filter(i => i.status !== 'finalizado').every(i => selectedIds.has(i.id))}
                    onChange={e => e.target.checked ? selectAllPage() : clearSelection()}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
                {[
                  { field: 'marca', label: 'Marca' },
                  { field: 'peca', label: 'Tipo' },
                  { field: 'perfil', label: 'Perfil' },
                  { field: 'comprimento', label: 'Comp.' },
                  { field: 'material', label: 'Material' },
                  { field: 'quantidade', label: 'Qtd' },
                  { field: 'peso', label: 'Peso' },
                  { field: 'status', label: 'Status' },
                ].map(col => (
                  <div key={col.field}
                    onClick={() => handleSort(col.field)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, userSelect: 'none' }}
                  >
                    {col.label}
                    {sortField === col.field && (
                      <span style={{ fontSize: 8, color: '#8b5cf6' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                ))}
                <div>Acoes</div>
              </div>

              {/* Corpo */}
              {pageItems.map((item, idx) => {
                const cor = getCor(item.peca);
                const sc = STATUS_CONF[item.status] || STATUS_CONF['aguardando'];
                const isSel = selectedIds.has(item.id);
                const isExp = expandedId === item.id;

                return (
                  <React.Fragment key={item.id}>
                    <div
                      style={{
                        display: 'grid', gridTemplateColumns: GRID_COLS,
                        padding: '8px 14px',
                        background: isSel ? '#1a1a2e' : idx % 2 === 0 ? '#111827' : '#0f1520',
                        borderBottom: '1px solid #1f293744',
                        fontSize: 12, alignItems: 'center',
                        transition: 'background 0.1s', cursor: 'pointer'
                      }}
                      onClick={() => setExpandedId(isExp ? null : item.id)}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#181e2e'; }}
                      onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = idx % 2 === 0 ? '#111827' : '#0f1520'; }}
                    >
                      {/* Checkbox */}
                      <div onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSel}
                          onChange={() => toggleSelect(item.id)}
                          disabled={item.status === 'finalizado'}
                          style={{ cursor: item.status === 'finalizado' ? 'default' : 'pointer' }}
                        />
                      </div>

                      {/* Marca */}
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>
                        {item.marca}
                      </div>

                      {/* Tipo */}
                      <div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          padding: '2px 8px', borderRadius: 5,
                          background: cor.bg, border: `1px solid ${cor.border}44`,
                          color: cor.text, fontSize: 10, fontWeight: 600
                        }}>
                          {cor.icon} {item.peca}
                        </span>
                      </div>

                      {/* Perfil */}
                      <div style={{ color: '#d1d5db', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.perfil || '—'}
                      </div>

                      {/* Comprimento */}
                      <div style={{ color: '#9ca3af', fontSize: 11 }}>{formatComp(item.comprimento)}</div>

                      {/* Material */}
                      <div style={{ color: '#9ca3af', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.material || '—'}
                      </div>

                      {/* Quantidade */}
                      <div style={{ fontWeight: 600, color: '#e5e7eb', textAlign: 'center' }}>{item.quantidade}</div>

                      {/* Peso */}
                      <div style={{ fontWeight: 600, color: '#c4b5fd', fontSize: 11 }}>{formatPeso(item.peso)}</div>

                      {/* Status */}
                      <div>
                        <span style={{
                          padding: '3px 8px', borderRadius: 5,
                          background: sc.bg, border: `1px solid ${sc.border}`,
                          color: sc.text, fontSize: 10, fontWeight: 600,
                          display: 'inline-flex', alignItems: 'center', gap: 3
                        }}>
                          {sc.icon} {sc.label}
                        </span>
                      </div>

                      {/* Acoes - com abatimento automático de estoque + persistência Supabase */}
                      <div style={{ display: 'flex', gap: 3 }} onClick={e => e.stopPropagation()}>
                        {item.status === 'aguardando' && (
                          <>
                            <button onClick={() => { abaterEstoquePorCorte(item); iniciarCorte(item.id); }} title="Iniciar Corte (abate estoque)"
                              style={actionBtnStyle('#1e3a5f', '#3b82f6', '#60a5fa')}>
                              ▶
                            </button>
                            <button onClick={() => { abaterEstoquePorCorte(item); finalizarCorte(item.id); }} title="Finalizar Corte (abate estoque)"
                              style={actionBtnStyle('#064e3b', '#22c55e', '#4ade80')}>
                              ✅
                            </button>
                          </>
                        )}
                        {item.status === 'cortando' && (
                          <button onClick={() => finalizarCorte(item.id)} title="Finalizar"
                            style={{ ...actionBtnStyle('#064e3b', '#22c55e', '#4ade80'), padding: '3px 10px' }}>
                            ✅ Finalizar
                          </button>
                        )}
                        {item.status === 'finalizado' && (
                          <button onClick={() => resetarCorte(item.id)} title="Voltar para Aguardando"
                            style={actionBtnStyle('#374151', '#6b7280', '#9ca3af')}>
                            ↩
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Linha expandida - conjuntos que usam esta marca */}
                    {isExp && (
                      <div style={{
                        padding: '8px 14px 8px 112px', background: '#0a0e18',
                        borderBottom: '1px solid #1f2937', fontSize: 11
                      }}>
                        <span style={{ color: '#6b7280', marginRight: 6 }}>Usado nos conjuntos:</span>
                        {(() => {
                          const conjs = getConjuntosByMarca(item.marca);
                          if (conjs.length === 0) return <span style={{ color: '#4b5563', fontStyle: 'italic' }}>Nenhum conjunto mapeado</span>;
                          return (
                            <>
                              {conjs.slice(0, 25).map(c => (
                                <span key={c} style={{
                                  display: 'inline-block', padding: '1px 7px', margin: '1px 3px',
                                  borderRadius: 4, background: '#1f2937', border: '1px solid #374151',
                                  color: '#93c5fd', fontSize: 10
                                }}>
                                  {c}
                                </span>
                              ))}
                              {conjs.length > 25 && <span style={{ color: '#6b7280' }}> +{conjs.length - 25} mais</span>}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Estado vazio */}
              {pageItems.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
                  <div style={{ fontSize: 14 }}>Nenhum item encontrado com os filtros atuais</div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* KANBAN VIEW */
        <DragDropContext onDragEnd={handleDragEnd}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            minHeight: 600
          }}>
            {/* Coluna Aguardando */}
            <Droppable droppableId="aguardando">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    background: '#111827',
                    border: `2px solid ${snapshot.isDraggingOver ? '#f59e0b' : '#1f2937'}`,
                    borderRadius: 12,
                    padding: 12,
                    minHeight: 600,
                    transition: 'border-color 0.2s',
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 500px)'
                  }}
                >
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#fbbf24',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span>⏳</span>
                    Aguardando ({kanbanColumns.aguardando.length})
                  </div>
                  {kanbanColumns.aguardando.map((item, idx) => (
                    <Draggable key={item.id} draggableId={item.id} index={idx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            background: '#1a1a2e',
                            border: '1px solid #44370e',
                            borderRadius: 8,
                            padding: 10,
                            marginBottom: 8,
                            cursor: 'grab',
                            transition: 'all 0.15s',
                            opacity: snapshot.isDragging ? 0.5 : 1,
                            boxShadow: snapshot.isDragging ? '0 8px 24px rgba(245, 158, 11, 0.3)' : 'none',
                            ...provided.draggableProps.style
                          }}
                          onMouseEnter={e => {
                            if (!snapshot.isDragging) {
                              e.currentTarget.style.background = '#252840';
                              e.currentTarget.style.borderColor = '#f59e0b';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!snapshot.isDragging) {
                              e.currentTarget.style.background = '#1a1a2e';
                              e.currentTarget.style.borderColor = '#44370e';
                            }
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                            {item.marca}
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 2,
                              padding: '2px 6px', borderRadius: 4,
                              background: getCor(item.peca).bg,
                              border: `1px solid ${getCor(item.peca).border}44`,
                              color: getCor(item.peca).text,
                              fontSize: 9,
                              fontWeight: 600,
                              whiteSpace: 'nowrap'
                            }}>
                              {getCor(item.peca).icon} {item.peca}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: '#d1d5db', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.perfil || '—'}
                          </div>
                          <div style={{ fontSize: 10, color: '#c4b5fd', fontWeight: 600 }}>
                            {formatPeso(item.peso)}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* Coluna Em Corte */}
            <Droppable droppableId="cortando">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    background: '#111827',
                    border: `2px solid ${snapshot.isDraggingOver ? '#3b82f6' : '#1f2937'}`,
                    borderRadius: 12,
                    padding: 12,
                    minHeight: 600,
                    transition: 'border-color 0.2s',
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 500px)'
                  }}
                >
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#60a5fa',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span>⚙️</span>
                    Em Corte ({kanbanColumns.cortando.length})
                  </div>
                  {kanbanColumns.cortando.map((item, idx) => (
                    <Draggable key={item.id} draggableId={item.id} index={idx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            background: '#0c2d48',
                            border: '1px solid #0c2d48',
                            borderRadius: 8,
                            padding: 10,
                            marginBottom: 8,
                            cursor: 'grab',
                            transition: 'all 0.15s',
                            opacity: snapshot.isDragging ? 0.5 : 1,
                            boxShadow: snapshot.isDragging ? '0 8px 24px rgba(59, 130, 246, 0.3)' : 'none',
                            ...provided.draggableProps.style
                          }}
                          onMouseEnter={e => {
                            if (!snapshot.isDragging) {
                              e.currentTarget.style.background = '#1a3a56';
                              e.currentTarget.style.borderColor = '#3b82f6';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!snapshot.isDragging) {
                              e.currentTarget.style.background = '#0c2d48';
                              e.currentTarget.style.borderColor = '#0c2d48';
                            }
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                            {item.marca}
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 2,
                              padding: '2px 6px', borderRadius: 4,
                              background: getCor(item.peca).bg,
                              border: `1px solid ${getCor(item.peca).border}44`,
                              color: getCor(item.peca).text,
                              fontSize: 9,
                              fontWeight: 600,
                              whiteSpace: 'nowrap'
                            }}>
                              {getCor(item.peca).icon} {item.peca}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: '#d1d5db', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.perfil || '—'}
                          </div>
                          <div style={{ fontSize: 10, color: '#c4b5fd', fontWeight: 600 }}>
                            {formatPeso(item.peso)}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* Coluna Finalizado */}
            <Droppable droppableId="finalizado">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    background: '#111827',
                    border: `2px solid ${snapshot.isDraggingOver ? '#22c55e' : '#1f2937'}`,
                    borderRadius: 12,
                    padding: 12,
                    minHeight: 600,
                    transition: 'border-color 0.2s',
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 500px)'
                  }}
                >
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#4ade80',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span>✅</span>
                    Finalizado ({kanbanColumns.finalizado.length})
                  </div>
                  {kanbanColumns.finalizado.map((item, idx) => (
                    <Draggable key={item.id} draggableId={item.id} index={idx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            background: '#0d3320',
                            border: '1px solid #0d3320',
                            borderRadius: 8,
                            padding: 10,
                            marginBottom: 8,
                            cursor: 'grab',
                            transition: 'all 0.15s',
                            opacity: snapshot.isDragging ? 0.5 : 1,
                            boxShadow: snapshot.isDragging ? '0 8px 24px rgba(34, 197, 94, 0.3)' : 'none',
                            ...provided.draggableProps.style
                          }}
                          onMouseEnter={e => {
                            if (!snapshot.isDragging) {
                              e.currentTarget.style.background = '#1a4a30';
                              e.currentTarget.style.borderColor = '#22c55e';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!snapshot.isDragging) {
                              e.currentTarget.style.background = '#0d3320';
                              e.currentTarget.style.borderColor = '#0d3320';
                            }
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                            {item.marca}
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 2,
                              padding: '2px 6px', borderRadius: 4,
                              background: getCor(item.peca).bg,
                              border: `1px solid ${getCor(item.peca).border}44`,
                              color: getCor(item.peca).text,
                              fontSize: 9,
                              fontWeight: 600,
                              whiteSpace: 'nowrap'
                            }}>
                              {getCor(item.peca).icon} {item.peca}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: '#d1d5db', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.perfil || '—'}
                          </div>
                          <div style={{ fontSize: 10, color: '#c4b5fd', fontWeight: 600 }}>
                            {formatPeso(item.peso)}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      )}

      {/* ====== PAGINACAO (somente para vista de lista) ====== */}
      {viewMode === 'lista' && totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6,
          padding: '14px 0', marginTop: 6
        }}>
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
            style={pageBtnStyle(false, currentPage === 1)}>{'«'}</button>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            style={pageBtnStyle(false, currentPage === 1)}>{'‹'} Anterior</button>

          <div style={{ display: 'flex', gap: 3 }}>
            {getPageNumbers(currentPage, totalPages).map((page, i) => (
              page === '...' ? (
                <span key={`d${i}`} style={{ padding: '6px 4px', color: '#6b7280', fontSize: 12 }}>...</span>
              ) : (
                <button key={page} onClick={() => setCurrentPage(page)}
                  style={pageBtnStyle(page === currentPage, false)}>
                  {page}
                </button>
              )
            ))}
          </div>

          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            style={pageBtnStyle(false, currentPage === totalPages)}>Proxima {'›'}</button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
            style={pageBtnStyle(false, currentPage === totalPages)}>{'»'}</button>
        </div>
      )}

      {/* ====== PAINEL DE NOTIFICACOES ====== */}
      {showPanel && (
        <>
          <div
            onClick={() => setShowPanel(false)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.4)', zIndex: 998
            }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, width: 400, height: '100vh',
            background: 'linear-gradient(180deg, #111827, #0f172a)',
            borderLeft: '1px solid #1f2937',
            boxShadow: '-4px 0 32px rgba(0,0,0,0.6)',
            zIndex: 1000, overflowY: 'auto', padding: '20px',
            animation: 'slideRight 0.25s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#e5e7eb' }}>
                🔔 Material para Montagem
              </h2>
              <button onClick={() => setShowPanel(false)} style={{
                background: '#1f2937', border: '1px solid #374151', borderRadius: 8,
                color: '#9ca3af', fontSize: 16, cursor: 'pointer', padding: '4px 10px'
              }}>✕</button>
            </div>

            <div style={{
              padding: '10px 14px', marginBottom: 16, borderRadius: 8,
              background: '#1f2937', border: '1px solid #374151'
            }}>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                {conjuntosReady.length} prontos | {conjuntosProgress.length} em progresso | {Object.keys(CONJUNTO_BOM).length} conjuntos total
              </div>
            </div>

            {conjuntosReady.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', marginBottom: 8 }}>
                  PRONTOS PARA MONTAGEM ({conjuntosReady.length})
                </h3>
                {conjuntosReady.map(c => (
                  <div key={c.nome} style={{
                    padding: '10px 12px', marginBottom: 5, borderRadius: 8,
                    background: '#064e3b', border: '1px solid #22c55e33'
                  }}>
                    <div style={{ fontWeight: 700, color: '#4ade80', fontSize: 14 }}>{c.nome}</div>
                    <div style={{ fontSize: 11, color: '#86efac' }}>
                      {c.cortadas}/{c.totalPecas} pecas cortadas — Material completo!
                    </div>
                  </div>
                ))}
              </div>
            )}

            {conjuntosProgress.length > 0 && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>
                  EM PROGRESSO ({conjuntosProgress.length})
                </h3>
                {conjuntosProgress.slice(0, 60).map(c => (
                  <div key={c.nome} style={{
                    padding: '8px 12px', marginBottom: 4, borderRadius: 8,
                    background: '#1f2937', border: '1px solid #37415144'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: '#e5e7eb', fontSize: 12 }}>{c.nome}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: c.progresso >= 80 ? '#22c55e' : c.progresso >= 50 ? '#f59e0b' : '#6366f1'
                      }}>{c.progresso}%</span>
                    </div>
                    <div style={{ background: '#374151', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 4,
                        background: c.progresso >= 80 ? '#22c55e' : c.progresso >= 50 ? '#f59e0b' : '#6366f1',
                        width: `${c.progresso}%`, transition: 'width 0.3s'
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                      {c.cortadas}/{c.totalPecas} pecas cortadas
                    </div>
                  </div>
                ))}
                {conjuntosProgress.length > 60 && (
                  <div style={{ padding: 8, textAlign: 'center', color: '#6b7280', fontSize: 11 }}>
                    +{conjuntosProgress.length - 60} conjuntos adicionais
                  </div>
                )}
              </div>
            )}

            {conjuntosReady.length === 0 && conjuntosProgress.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
                <div style={{ fontSize: 13 }}>Nenhum progresso de corte ainda</div>
                <div style={{ fontSize: 11, marginTop: 4, color: '#4b5563' }}>
                  Finalize o corte das pecas para ver conjuntos prontos
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ====== CSS ====== */}
      <style>{`
        @keyframes toastSlide {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes slideRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        input[type="checkbox"] { accent-color: #8b5cf6; }
        select:focus, input:focus { border-color: #6366f1 !important; }
      `}</style>
    </div>
  );
}

// ==========================================
// HELPERS
// ==========================================
function actionBtnStyle(bg, border, color) {
  return {
    padding: '3px 7px', borderRadius: 5,
    border: `1px solid ${border}`, background: bg,
    color, fontSize: 11, cursor: 'pointer',
    transition: 'all 0.15s', lineHeight: 1
  };
}

function pageBtnStyle(active, disabled) {
  return {
    padding: '5px 10px', borderRadius: 7, fontSize: 12,
    border: active ? '1px solid #8b5cf6' : '1px solid #374151',
    background: active ? '#4c1d95' : '#1f2937',
    color: disabled ? '#4b5563' : active ? '#c4b5fd' : '#9ca3af',
    cursor: disabled ? 'default' : 'pointer',
    fontWeight: active ? 700 : 400,
    opacity: disabled ? 0.5 : 1
  };
}

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
