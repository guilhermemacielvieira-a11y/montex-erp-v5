// ============================================
// USE CORTE SUPABASE - Hook para Corte com Persistência
// ============================================
// Substitui o corteStatusStore (em memória) por dados
// reais do Supabase via ERPContext/ProducaoContext.
//
// Status possíveis (modelo de 3 estados):
//   'aguardando'  → Peça na fila para corte
//   'cortando'    → Peça sendo cortada agora
//   'finalizado'  → Corte concluído
// ============================================

import { useMemo, useCallback, useContext } from 'react';
import ERPContext, { useProducao } from '../contexts/ERPContext';

/**
 * Hook que fornece dados de corte persistidos no Supabase.
 * Mesma interface que o antigo corteStatusStore, mas com persistência real.
 *
 * @returns {object} { items, metrics, categorias, iniciarCorte, finalizarCorte,
 *                      resetarCorte, finalizarCorteEmLote, contarCortadasParaConjunto, loading }
 */
export function useCorteSupabase() {
  // Contextos do ERP
  const erpCore = useContext(ERPContext);
  const dataSource = erpCore?.dataSource || 'loading';
  const { pecas, updatePeca } = useProducao();

  // ===== MAPEAR PEÇAS DO SUPABASE PARA FORMATO DO KANBAN =====
  const allItems = useMemo(() => {
    if (!pecas || pecas.length === 0) return [];
    return pecas.map(p => ({
      id: p.id,
      marca: String(p.marca || p.id),
      peca: p.tipo || p.nome || '',
      nome: p.nome || '',
      perfil: p.perfil || '',
      comprimento: p.comprimento || 0,
      material: p.material || '',
      quantidade: p.quantidade || 1,
      peso: p.pesoTotal || p.peso || p.pesoUnitario || 0,
      status: normalizeStatus(p.statusCorte),
      dataInicio: p.dataInicio || null,
      dataFim: p.dataFimReal || null,
      maquina: null
    }));
  }, [pecas]);

  // ===== AÇÕES DE CORTE (com persistência Supabase) =====

  const iniciarCorte = useCallback(async (id) => {
    try {
      await updatePeca(id, {
        statusCorte: 'cortando',
        dataInicio: new Date().toISOString().split('T')[0]
      });
      return true;
    } catch (err) {
      console.error('Erro ao iniciar corte:', err);
      return false;
    }
  }, [updatePeca]);

  const finalizarCorte = useCallback(async (id) => {
    try {
      await updatePeca(id, {
        statusCorte: 'finalizado',
        dataFimReal: new Date().toISOString().split('T')[0]
      });
      return true;
    } catch (err) {
      console.error('Erro ao finalizar corte:', err);
      return false;
    }
  }, [updatePeca]);

  const resetarCorte = useCallback(async (id) => {
    try {
      await updatePeca(id, {
        statusCorte: 'aguardando'
      });
      return true;
    } catch (err) {
      console.error('Erro ao resetar corte:', err);
      return false;
    }
  }, [updatePeca]);

  const finalizarCorteEmLote = useCallback(async (ids) => {
    let count = 0;
    const dataFim = new Date().toISOString().split('T')[0];
    const promises = ids.map(async (id) => {
      const item = allItems.find(i => i.id === id);
      if (item && item.status !== 'finalizado') {
        try {
          await updatePeca(id, { statusCorte: 'finalizado', dataFimReal: dataFim });
          count++;
        } catch (err) {
          console.error(`Erro ao finalizar ${id}:`, err);
        }
      }
    });
    await Promise.all(promises);
    return count;
  }, [allItems, updatePeca]);

  // ===== MÉTRICAS / KPIs =====
  const metrics = useMemo(() => {
    const items = allItems;
    const aguardando = items.filter(i => i.status === 'aguardando');
    const cortando = items.filter(i => i.status === 'cortando');
    const finalizado = items.filter(i => i.status === 'finalizado');

    const pesoTotal = items.reduce((s, i) => s + (i.peso || 0), 0);
    const pesoAguardando = aguardando.reduce((s, i) => s + (i.peso || 0), 0);
    const pesoCortando = cortando.reduce((s, i) => s + (i.peso || 0), 0);
    const pesoFinalizado = finalizado.reduce((s, i) => s + (i.peso || 0), 0);

    const qtdTotal = items.reduce((s, i) => s + (i.quantidade || 0), 0);
    const qtdAguardando = aguardando.reduce((s, i) => s + (i.quantidade || 0), 0);
    const qtdCortando = cortando.reduce((s, i) => s + (i.quantidade || 0), 0);
    const qtdFinalizado = finalizado.reduce((s, i) => s + (i.quantidade || 0), 0);

    const categorias = {};
    items.forEach(i => {
      const key = i.peca || 'SEM TIPO';
      if (!categorias[key]) {
        categorias[key] = { total: 0, finalizado: 0, peso: 0, pesoFinalizado: 0 };
      }
      categorias[key].total++;
      categorias[key].peso += i.peso || 0;
      if (i.status === 'finalizado') {
        categorias[key].finalizado++;
        categorias[key].pesoFinalizado += i.peso || 0;
      }
    });

    return {
      totalMarcas: items.length,
      aguardando: aguardando.length,
      cortando: cortando.length,
      finalizado: finalizado.length,
      pesoTotal: Math.round(pesoTotal * 10) / 10,
      pesoAguardando: Math.round(pesoAguardando * 10) / 10,
      pesoCortando: Math.round(pesoCortando * 10) / 10,
      pesoFinalizado: Math.round(pesoFinalizado * 10) / 10,
      qtdTotal,
      qtdAguardando,
      qtdCortando,
      qtdFinalizado,
      progressoPeso: pesoTotal > 0 ? Math.round((pesoFinalizado / pesoTotal) * 100) : 0,
      progressoMarcas: items.length > 0 ? Math.round((finalizado.length / items.length) * 100) : 0,
      categorias
    };
  }, [allItems]);

  // ===== CATEGORIAS ÚNICAS =====
  const categorias = useMemo(() => {
    const tipos = new Set();
    allItems.forEach(item => {
      if (item.peca) tipos.add(item.peca);
    });
    return Array.from(tipos).sort();
  }, [allItems]);

  // ===== CONTAR CORTADAS PARA CONJUNTO (BOM) =====
  const contarCortadasParaConjunto = useCallback((marcasComQuantidade) => {
    let totalPecas = 0;
    let cortadas = 0;
    marcasComQuantidade.forEach(({ marca, quantidade }) => {
      totalPecas += quantidade;
      const item = allItems.find(i => String(i.marca) === String(marca));
      if (item && item.status === 'finalizado') {
        cortadas += quantidade;
      }
    });
    return { totalPecas, cortadas };
  }, [allItems]);

  return {
    items: allItems,
    metrics,
    categorias,
    iniciarCorte,
    finalizarCorte,
    resetarCorte,
    finalizarCorteEmLote,
    contarCortadasParaConjunto,
    loading: dataSource === 'loading'
  };
}

// Normalizar status_corte do Supabase para modelo de 3 estados do Kanban
function normalizeStatus(statusCorte) {
  switch (statusCorte) {
    case 'cortando':
    case 'em_corte':
      return 'cortando';
    case 'finalizado':
    case 'liberado':
    case 'conferencia':
      return 'finalizado';
    case 'aguardando':
    case 'programacao':
    default:
      return 'aguardando';
  }
}
