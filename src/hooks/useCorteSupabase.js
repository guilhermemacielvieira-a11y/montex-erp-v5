// ============================================
// USE CORTE SUPABASE - Hook para Corte com Persistência
// ============================================
// Lê dados da tabela materiais_corte do Supabase
// (importada da planilha BELO-VALE_LISTA_MATERIAIS PARA CORTE)
//
// Status possíveis (modelo de 3 estados):
//   'aguardando'  → Peça na fila para corte
//   'cortando'    → Peça sendo cortada agora
//   'finalizado'  → Corte concluído
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';

/**
 * Hook que fornece dados de corte da tabela materiais_corte do Supabase.
 *
 * @returns {object} { items, metrics, categorias, iniciarCorte, finalizarCorte,
 *                      resetarCorte, finalizarCorteEmLote, contarCortadasParaConjunto, loading }
 */
export function useCorteSupabase() {
  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===== CARREGAR DADOS DO SUPABASE =====
  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('materiais_corte')
        .select('*')
        .order('marca', { ascending: true });

      if (error) throw error;
      setRawItems(data || []);
    } catch (err) {
      console.error('[useCorteSupabase] Erro ao carregar materiais_corte:', err);
      setRawItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===== MAPEAR PARA FORMATO DO KANBAN =====
  const allItems = useMemo(() => {
    if (!rawItems || rawItems.length === 0) return [];
    return rawItems.map(p => ({
      id: p.id,
      marca: String(p.marca || ''),
      peca: p.peca || '',
      perfil: p.perfil || '',
      comprimento: p.comprimento_mm || 0,
      material: p.material || '',
      quantidade: p.quantidade || 1,
      peso: parseFloat(p.peso_teorico) || 0,
      status: normalizeStatus(p.status_corte),
      dataInicio: p.data_inicio || null,
      dataFim: p.data_fim || null,
      maquina: p.maquina || null
    }));
  }, [rawItems]);

  // ===== AÇÕES DE CORTE (com persistência Supabase) =====

  const iniciarCorte = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('materiais_corte')
        .update({
          status_corte: 'cortando',
          data_inicio: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
      await fetchData();
      return true;
    } catch (err) {
      console.error('Erro ao iniciar corte:', err);
      return false;
    }
  }, [fetchData]);

  const finalizarCorte = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('materiais_corte')
        .update({
          status_corte: 'finalizado',
          data_fim: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
      await fetchData();
      return true;
    } catch (err) {
      console.error('Erro ao finalizar corte:', err);
      return false;
    }
  }, [fetchData]);

  const resetarCorte = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('materiais_corte')
        .update({
          status_corte: 'aguardando',
          data_inicio: null,
          data_fim: null,
          maquina: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
      await fetchData();
      return true;
    } catch (err) {
      console.error('Erro ao resetar corte:', err);
      return false;
    }
  }, [fetchData]);

  const finalizarCorteEmLote = useCallback(async (ids) => {
    let count = 0;
    const dataFim = new Date().toISOString();
    const promises = ids.map(async (id) => {
      const item = allItems.find(i => i.id === id);
      if (item && item.status !== 'finalizado') {
        try {
          const { error } = await supabase
            .from('materiais_corte')
            .update({
              status_corte: 'finalizado',
              data_fim: dataFim,
              updated_at: dataFim
            })
            .eq('id', id);
          if (!error) count++;
        } catch (err) {
          console.error('Erro ao finalizar ' + id + ':', err);
        }
      }
    });
    await Promise.all(promises);
    await fetchData();
    return count;
  }, [allItems, fetchData]);

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
    loading
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
