// ============================================================
// OBRA CONTEXT (MOBILE) — Filtro global de seleção por obra
// ============================================================
// Mantém UMA obra selecionada (ou "todas") compartilhada por todas
// as páginas mobile (Início, Produção, Montagem, Financeiro...).
//  - Persiste a escolha em localStorage (sobrevive reload / PWA)
//  - Ao escolher uma obra específica, também seta `obraAtual` do ERP
//    para que as páginas desktop abertas em wrapper (3D, Kanban, GFO)
//    já abram focadas na mesma obra.
//  - Expõe helper `matchObra(item)` para filtrar peças/despesas/receitas
//    de forma consistente (aceita obraId, obra_id e nested obra.id).
// ============================================================
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useERP } from '@/contexts/ERPContext';

const LS_KEY = 'montex_mobile_obra_filtro';
export const OBRA_TODAS = 'todas';

const ObraCtx = createContext(null);

function lerInicial() {
  try {
    return localStorage.getItem(LS_KEY) || OBRA_TODAS;
  } catch {
    return OBRA_TODAS;
  }
}

export function ObraMobileProvider({ children }) {
  const { obras = [], setObraAtual } = useERP?.() || {};
  const [obraFiltro, setObraFiltroState] = useState(lerInicial);

  // Lista de obras ordenada: ativas primeiro, depois por nome
  const obrasOrdenadas = useMemo(() => {
    const peso = (o) => (o.status === 'concluida' || o.status === 'cancelada' ? 1 : 0);
    return [...obras].sort((a, b) => peso(a) - peso(b) || (a.nome || '').localeCompare(b.nome || ''));
  }, [obras]);

  // Se a obra salva não existe mais, cair para "todas"
  const obraValida = obraFiltro === OBRA_TODAS || obras.some(o => o.id === obraFiltro);
  const obraEfetiva = obraValida ? obraFiltro : OBRA_TODAS;

  const obraSelecionada = useMemo(
    () => (obraEfetiva === OBRA_TODAS ? null : obras.find(o => o.id === obraEfetiva) || null),
    [obras, obraEfetiva]
  );

  const setObraFiltro = useCallback((id) => {
    const valor = id || OBRA_TODAS;
    setObraFiltroState(valor);
    try { localStorage.setItem(LS_KEY, valor); } catch { /* noop */ }
    // Focar a obra também no ERP global (beneficia páginas desktop em wrapper)
    if (valor !== OBRA_TODAS) setObraAtual?.(valor);
  }, [setObraAtual]);

  // Helper de filtragem reutilizável (peças, despesas, receitas, medições…)
  const matchObra = useCallback((item) => {
    if (obraEfetiva === OBRA_TODAS) return true;
    if (!item) return false;
    const oid = item.obraId ?? item.obra_id ?? item.obra?.id ?? null;
    return oid === obraEfetiva;
  }, [obraEfetiva]);

  const value = useMemo(() => ({
    obraFiltro: obraEfetiva,
    isTodas: obraEfetiva === OBRA_TODAS,
    obraSelecionada,
    obras: obrasOrdenadas,
    setObraFiltro,
    matchObra,
  }), [obraEfetiva, obraSelecionada, obrasOrdenadas, setObraFiltro, matchObra]);

  return <ObraCtx.Provider value={value}>{children}</ObraCtx.Provider>;
}

export function useObraFiltro() {
  const ctx = useContext(ObraCtx);
  if (!ctx) {
    // Fallback seguro caso usado fora do provider (ex.: páginas desktop em wrapper)
    return {
      obraFiltro: OBRA_TODAS,
      isTodas: true,
      obraSelecionada: null,
      obras: [],
      setObraFiltro: () => {},
      matchObra: () => true,
    };
  }
  return ctx;
}
