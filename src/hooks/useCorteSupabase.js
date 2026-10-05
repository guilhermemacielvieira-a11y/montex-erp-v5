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

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../api/supabaseClient';
import { baixarCorte, estornarCorte } from '../api/producaoRpc';

const PAGE_SIZE = 1000;

/**
 * Hook que fornece dados de corte da tabela materiais_corte do Supabase.
 *
 * @returns {object} { items, metrics, categorias, iniciarCorte, finalizarCorte,
 *                      resetarCorte, finalizarCorteEmLote, contarCortadasParaConjunto,
 *                      emAndamento (Set de ids com operação em curso), loading }
 */
export function useCorteSupabase(obraId) {
  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===== CARREGAR DADOS DO SUPABASE =====
  const fetchData = useCallback(async () => {
    if (!obraId) {
      setRawItems([]);
      setLoading(false);
      return;
    }
    try {
      // PAGINAÇÃO: PostgREST corta em 1000 linhas/req. Ordem estável
      // (marca, id) para não pular/duplicar linhas entre páginas.
      const all = [];
      for (let offset = 0, i = 0; i < 50; i++, offset += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('materiais_corte')
          .select('*')
          .eq('obra_id', obraId)
          .order('marca', { ascending: true })
          .order('id', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE_SIZE) break;
      }
      setRawItems(all);
    } catch (err) {
      console.error('[useCorteSupabase] Erro ao carregar materiais_corte:', err);
      setRawItems([]);
    } finally {
      setLoading(false);
    }
  }, [obraId]);

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
      maquina: p.maquina || null,
      funcionarioCorte: p.funcionario_corte || null
    }));
  }, [rawItems]);

  // ===== AÇÕES DE CORTE (com persistência Supabase) =====
  // A baixa/estorno de aço no estoque acontece NO BANCO, na mesma transação
  // da mudança de status: RPC baixar_corte/estornar_corte → trigger
  // tg_corte_baixa_estoque (estoque_aplicar_movimento). O kg efetivamente
  // deduzido fica em materiais_corte.baixa_estoque_kg e o estorno devolve
  // exatamente esse valor. As RPCs são idempotentes (compare-and-set): duplo
  // clique, duas abas ou retry não baixam duas vezes.
  //
  // Guarda de operação em andamento por id: a UI usa `emAndamento` para
  // desabilitar os botões e o hook recusa uma 2ª operação no mesmo corte.
  const inFlight = useRef(new Set());
  const [emAndamento, setEmAndamento] = useState(() => new Set());
  const marcar = useCallback((id, on) => {
    if (on) inFlight.current.add(id); else inFlight.current.delete(id);
    setEmAndamento(new Set(inFlight.current));
  }, []);
  const comGuarda = useCallback(async (id, fn) => {
    if (inFlight.current.has(id)) return { ok: false, emAndamento: true };
    marcar(id, true);
    try {
      return await fn();
    } finally {
      marcar(id, false);
    }
  }, [marcar]);

  const iniciarCorte = useCallback(async (id, funcionarioId = null) => {
    try {
      const r = await comGuarda(id, async () => {
        const agora = new Date().toISOString();
        const updateData = { status_corte: 'cortando', data_inicio: agora, updated_at: agora };
        if (funcionarioId) updateData.funcionario_corte = funcionarioId;
        // Só inicia se ainda não foi finalizado (não "desfinaliza" por engano)
        const { error } = await supabase
          .from('materiais_corte')
          .update(updateData)
          .eq('id', id)
          .not('status_corte', 'in', '("finalizado","cortado","concluido")');
        if (error) throw error;
        return { ok: true };
      });
      if (r?.emAndamento) return false;
      await fetchData();
      return true;
    } catch (err) {
      console.error('Erro ao iniciar corte:', err);
      return false;
    }
  }, [fetchData, comGuarda]);

  // Finaliza (inclusive direto de 'aguardando'): status + baixa de estoque
  // atômicos. Retorna o resultado da RPC ({ baixa_kg, ja_finalizado }) ou
  // false em erro. `funcionarioId` opcional (finalizar direto).
  const finalizarCorte = useCallback(async (id, funcionarioId = null) => {
    try {
      const r = await comGuarda(id, () => baixarCorte(id, { funcionario: funcionarioId }));
      if (r?.emAndamento) return false;
      await fetchData();
      return r || true;
    } catch (err) {
      console.error('Erro ao finalizar corte:', err);
      return false;
    }
  }, [fetchData, comGuarda]);

  const resetarCorte = useCallback(async (id) => {
    try {
      const r = await comGuarda(id, () => estornarCorte(id));
      if (r?.emAndamento) return false;
      await fetchData();
      return r || true;
    } catch (err) {
      console.error('Erro ao resetar corte:', err);
      return false;
    }
  }, [fetchData, comGuarda]);

  const finalizarCorteEmLote = useCallback(async (ids) => {
    let count = 0;
    // Sequencial: cada RPC trava o item de estoque do perfil, então rodar em
    // paralelo só geraria espera de lock.
    for (const id of ids) {
      const item = allItems.find(i => i.id === id);
      if (!item || item.status === 'finalizado') continue;
      try {
        const r = await comGuarda(id, () => baixarCorte(id));
        if (r && !r.emAndamento && !r.ja_finalizado) count++;
      } catch (err) {
        console.error('Erro ao finalizar ' + id + ':', err);
      }
    }
    await fetchData();
    return count;
  }, [allItems, fetchData, comGuarda]);

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
    emAndamento,
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
