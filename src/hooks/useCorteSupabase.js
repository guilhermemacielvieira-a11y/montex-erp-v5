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
import { supabase, estoqueApi, movEstoqueApi } from '../api/supabaseClient';
import { planejarBaixaCorte, planejarEstornoCorte } from '../services/consumoProducao';

/**
 * Hook que fornece dados de corte da tabela materiais_corte do Supabase.
 *
 * @returns {object} { items, metrics, categorias, iniciarCorte, finalizarCorte,
 *                      resetarCorte, finalizarCorteEmLote, contarCortadasParaConjunto, loading }
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
      const { data, error } = await supabase
        .from('materiais_corte')
        .select('*')
        .eq('obra_id', obraId)
        .order('marca', { ascending: true });

      if (error) throw error;
      setRawItems(data || []);
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

  // ===== CONSUMO AUTOMÁTICO DE ESTOQUE (baixa por corte) =====
  // Ao finalizar um corte, dá baixa no estoque (item casado pelo perfil) no peso
  // teórico do corte, registra a movimentação de saída e marca baixa_estoque_kg
  // (idempotência). Best-effort: falha aqui NÃO impede a finalização do corte.
  // `estoqueList` é mutado localmente p/ acumular baixas do mesmo perfil no lote.
  const baixarCorteNoEstoque = useCallback(async (rawCorte, estoqueList) => {
    const plano = planejarBaixaCorte(rawCorte, estoqueList);
    if (!plano) return;
    const now = new Date().toISOString();
    try {
      await estoqueApi.update(plano.itemId, { quantidade: plano.saldoNovo, ultima_saida: now.split('T')[0], updated_at: now });
      await movEstoqueApi.create({
        item_id: plano.itemId,
        tipo: 'saida',
        quantidade: plano.kg,
        peso: plano.kg,
        unidade: 'kg',
        material_perfil: plano.perfil,
        material: plano.material,
        custo_unitario: plano.preco || null,
        motivo: `Consumo produção — corte ${rawCorte.marca || rawCorte.id}`,
        obra_id: rawCorte.obra_id || null,
        peca_id: rawCorte.peca_id || rawCorte.id || null,
        setor: 'producao',
        origem: 'producao',
        saldo_anterior: plano.saldoAnterior,
        saldo_novo: plano.saldoNovo,
        data: now,
      });
      await supabase.from('materiais_corte').update({ baixa_estoque_kg: plano.kg, updated_at: now }).eq('id', rawCorte.id);
      const it = estoqueList.find((e) => e.id === plano.itemId);
      if (it) it.quantidade = plano.saldoNovo; // acumula p/ próximos cortes do mesmo perfil
    } catch (err) {
      console.error('⚠️ Falha na baixa de estoque do corte', rawCorte.id, err.message);
    }
  }, []);

  // Estorno: ao resetar um corte já baixado, devolve o kg ao estoque e zera a baixa.
  const estornarCorteNoEstoque = useCallback(async (rawCorte) => {
    if (Number(rawCorte?.baixa_estoque_kg) <= 0) return;
    const estoqueList = await estoqueApi.getAll().catch(() => []);
    const plano = planejarEstornoCorte(rawCorte, estoqueList);
    if (!plano) return;
    const now = new Date().toISOString();
    try {
      if (plano.itemId) {
        await estoqueApi.update(plano.itemId, { quantidade: plano.saldoNovo, ultima_entrada: now.split('T')[0], updated_at: now });
        await movEstoqueApi.create({
          item_id: plano.itemId,
          tipo: 'entrada',
          quantidade: plano.kg,
          peso: plano.kg,
          unidade: 'kg',
          material_perfil: plano.perfil,
          material: plano.material,
          motivo: `Estorno consumo produção — corte ${rawCorte.marca || rawCorte.id}`,
          obra_id: rawCorte.obra_id || null,
          peca_id: rawCorte.peca_id || rawCorte.id || null,
          setor: 'producao',
          origem: 'estorno_producao',
          saldo_anterior: plano.saldoAnterior,
          saldo_novo: plano.saldoNovo,
          data: now,
        });
      }
      await supabase.from('materiais_corte').update({ baixa_estoque_kg: 0, updated_at: now }).eq('id', rawCorte.id);
    } catch (err) {
      console.error('⚠️ Falha no estorno de estoque do corte', rawCorte.id, err.message);
    }
  }, []);

  // ===== AÇÕES DE CORTE (com persistência Supabase) =====

  const iniciarCorte = useCallback(async (id, funcionarioId = null) => {
    try {
      const agora = new Date().toISOString();
      const updateData = {
        status_corte: 'cortando',
        data_inicio: agora,
        updated_at: agora
      };
      if (funcionarioId) {
        updateData.funcionario_corte = funcionarioId;
      }
      const { error } = await supabase
        .from('materiais_corte')
        .update(updateData)
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
      // Baixa automática de estoque (best-effort, não bloqueia a finalização)
      const rawCorte = rawItems.find((r) => r.id === id);
      if (rawCorte) {
        const estoqueList = await estoqueApi.getAll().catch(() => []);
        await baixarCorteNoEstoque(rawCorte, estoqueList);
      }
      await fetchData();
      return true;
    } catch (err) {
      console.error('Erro ao finalizar corte:', err);
      return false;
    }
  }, [fetchData, rawItems, baixarCorteNoEstoque]);

  const resetarCorte = useCallback(async (id) => {
    try {
      // Estorna a baixa de estoque ANTES de zerar o corte (usa baixa_estoque_kg atual)
      const rawCorte = rawItems.find((r) => r.id === id);
      if (rawCorte) await estornarCorteNoEstoque(rawCorte);
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
  }, [fetchData, rawItems, estornarCorteNoEstoque]);

  const finalizarCorteEmLote = useCallback(async (ids) => {
    let count = 0;
    const dataFim = new Date().toISOString();
    // Carrega o estoque UMA vez; as baixas rodam em sequência para acumular
    // corretamente o saldo de itens do mesmo perfil.
    const estoqueList = await estoqueApi.getAll().catch(() => []);
    for (const id of ids) {
      const item = allItems.find(i => i.id === id);
      if (!item || item.status === 'finalizado') continue;
      try {
        const { error } = await supabase
          .from('materiais_corte')
          .update({ status_corte: 'finalizado', data_fim: dataFim, updated_at: dataFim })
          .eq('id', id);
        if (error) throw error;
        count++;
        const rawCorte = rawItems.find((r) => r.id === id);
        if (rawCorte) await baixarCorteNoEstoque(rawCorte, estoqueList);
      } catch (err) {
        console.error('Erro ao finalizar ' + id + ':', err);
      }
    }
    await fetchData();
    return count;
  }, [allItems, rawItems, fetchData, baixarCorteNoEstoque]);

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
