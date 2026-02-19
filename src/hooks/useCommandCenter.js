0// ============================================
// USE COMMAND CENTER - Hook Central de Métricas em Tempo Real
// ============================================
// Agrega dados de: Corte, Produção, Estoque, Financeiro, Campo
// Supabase realtime subscriptions para atualizações em tempo real
// Comparação diária automática
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../api/supabaseClient';

// Chave para snapshot diário no localStorage
const SNAPSHOT_KEY = 'montex_daily_snapshot';

export function useCommandCenter() {
  const [corte, setCorte] = useState(null);
  const [producao, setProducao] = useState(null);
  const [estoque, setEstoque] = useState(null);
  const [financeiro, setFinanceiro] = useState(null);
  const [campo, setCampo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [snapshotOntem, setSnapshotOntem] = useState(null);
  const channelRef = useRef(null);
  // ===== CARREGAR DADOS DE CORTE =====
  const fetchCorte = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('materiais_corte')
        .select('status_corte, peso_teorico, quantidade, peca, updated_at');
      if (error) throw error;

      const items = data || [];
      const aguardando = items.filter(i => !i.status_corte || i.status_corte === 'aguardando' || i.status_corte === 'programacao');
      const cortando = items.filter(i => i.status_corte === 'cortando' || i.status_corte === 'em_corte');
      const finalizado = items.filter(i => i.status_corte === 'finalizado' || i.status_corte === 'liberado');

      const pesoTotal = items.reduce((s, i) => s + (parseFloat(i.peso_teorico) || 0), 0);
      const pesoFinalizado = finalizado.reduce((s, i) => s + (parseFloat(i.peso_teorico) || 0), 0);

      // Hoje cortadas
      const hoje = new Date().toISOString().slice(0, 10);
      const cortadasHoje = finalizado.filter(i => i.updated_at && i.updated_at.slice(0, 10) === hoje).length;

      return {
        total: items.length,
        aguardando: aguardando.length,
        cortando: cortando.length,
        finalizado: finalizado.length,
        pesoTotal: Math.round(pesoTotal * 10) / 10,
        pesoFinalizado: Math.round(pesoFinalizado * 10) / 10,
        progressoPeso: pesoTotal > 0 ? Math.round((pesoFinalizado / pesoTotal) * 100) : 0,
        progressoPecas: items.length > 0 ? Math.round((finalizado.length / items.length) * 100) : 0,
        cortadasHoje
      };
    } catch (e) {
      console.warn('[CommandCenter] Erro corte:', e.message);
      return null;
    }
  }, []);

  // ===== CARREGAR DADOS DE PRODUÇÃO =====
  const fetchProducao = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pecas_producao')
        .select('etapa, status_corte, percentual_conclusao, peso, quantidade_produzida, updated_at');
      if (error) throw error;

      const items = data || [];
      const fabricacao = items.filter(i => i.etapa === 'fabricacao' || !i.etapa);
      const solda = items.filter(i => i.etapa === 'solda');
      const pintura = items.filter(i => i.etapa === 'pintura');
      const expedicao = items.filter(i => i.etapa === 'expedicao' || i.etapa === 'expedido');
      const finalizado = items.filter(i => i.etapa === 'finalizado');

      const pesoTotal = items.reduce((s, i) => s + (parseFloat(i.peso) || 0), 0);
      const pesoExpedido = [...expedicao, ...finalizado].reduce((s, i) => s + (parseFloat(i.peso) || 0), 0);

      // Hoje movidas
      const hoje = new Date().toISOString().slice(0, 10);
      const movidasHoje = items.filter(i => i.updated_at && i.updated_at.slice(0, 10) === hoje && i.etapa !== 'fabricacao').length;

      return {
        total: items.length,
        fabricacao: fabricacao.length,
        solda: solda.length,
        pintura: pintura.length,
        expedicao: expedicao.length,
        finalizado: finalizado.length,
        pesoTotal: Math.round(pesoTotal * 10) / 10,
        pesoExpedido: Math.round(pesoExpedido * 10) / 10,
        progressoGeral: pesoTotal > 0 ? Math.round((pesoExpedido / pesoTotal) * 100) : 0,
        movidasHoje
      };
    } catch (e) {
      console.warn('[CommandCenter] Erro produção:', e.message);
      return null;
    }
  }, []);

  // ===== CARREGAR DADOS DE ESTOQUE =====
  const fetchEstoque = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('estoque')
        .select('quantidade_atual, quantidade_minima, quantidade_reservada, valor_unitario, tipo, categoria, status');
      if (error) throw error;

      const items = data || [];
      const valorTotal = items.reduce((s, i) => s + ((parseFloat(i.quantidade_atual) || 0) * (parseFloat(i.valor_unitario) || 0)), 0);
      const normal = items.filter(i => !i.status || i.status === 'normal' || i.status === 'disponivel').length;
      const baixo = items.filter(i => i.status === 'baixo' || (i.quantidade_minima && (parseFloat(i.quantidade_atual) || 0) <= (parseFloat(i.quantidade_minima) || 0))).length;
      const critico = items.filter(i => i.status === 'critico' || (parseFloat(i.quantidade_atual) || 0) === 0).length;

      // Movimentações de hoje
      const hoje = new Date().toISOString().slice(0, 10);
      const { data: movHoje } = await supabase
        .from('movimentacoes_estoque')
        .select('tipo, quantidade')
        .gte('data', hoje + 'T00:00:00')
        .lte('data', hoje + 'T23:59:59');

      const entradas = (movHoje || []).filter(m => m.tipo === 'entrada').length;
      const saidas = (movHoje || []).filter(m => m.tipo === 'saida' || m.tipo === 'corte').length;

      return {
        totalItens: items.length,
        valorTotal: Math.round(valorTotal),
        normal,
        baixo,
        critico,
        entradasHoje: entradas,
        saidasHoje: saidas,
        alertas: baixo + critico
      };
    } catch (e) {
      console.warn('[CommandCenter] Erro estoque:', e.message);
      return null;
    }
  }, []);

  // ===== CARREGAR DADOS FINANCEIROS =====
  const fetchFinanceiro = useCallback(async () => {
    try {
      // Lançamentos de despesas
      const { data: lancamentos } = await supabase
        .from('lancamentos_despesas')
        .select('valor, tipo, status, categoria, data_emissao, obra_id');

      // Medições
      const { data: medicoes } = await supabase
        .from('medicoes')
        .select('valor_total, status, tipo, data_medicao');

      const lancs = lancamentos || [];
      const meds = medicoes || [];

      const totalDespesas = lancs.reduce((s, l) => s + (parseFloat(l.valor) || 0), 0);
      const despesasPagas = lancs.filter(l => l.status === 'pago').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0);
      const despesasPendentes = lancs.filter(l => l.status === 'pendente' || l.status === 'aprovado').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0);

      const totalMedicoes = meds.reduce((s, m) => s + (parseFloat(m.valor_total) || 0), 0);
      const medicoesAprovadas = meds.filter(m => m.status === 'aprovada' || m.status === 'faturada' || m.status === 'paga').reduce((s, m) => s + (parseFloat(m.valor_total) || 0), 0);

      // Por categoria
      const porCategoria = {};
      lancs.forEach(l => {
        const cat = l.categoria || 'outros';
        porCategoria[cat] = (porCategoria[cat] || 0) + (parseFloat(l.valor) || 0);
      });

      // Hoje
      const hoje = new Date().toISOString().slice(0, 10);
      const lancHoje = lancs.filter(l => l.data_emissao && l.data_emissao.slice(0, 10) === hoje);

      return {
        totalDespesas: Math.round(totalDespesas),
        despesasPagas: Math.round(despesasPagas),
        despesasPendentes: Math.round(despesasPendentes),
        totalMedicoes: Math.round(totalMedicoes),
        medicoesAprovadas: Math.round(medicoesAprovadas),
        saldoObra: Math.round(totalMedicoes - totalDespesas),
        lancamentosHoje: lancHoje.length,
        porCategoria,
        numLancamentos: lancs.length,
        numMedicoes: meds.length
      };
    } catch (e) {
      console.warn('[CommandCenter] Erro financeiro:', e.message);
      return null;
    }
  }, []);

  // ===== CARREGAR DADOS DE CAMPO (Expedição/Montagem) =====
  const fetchCampo = useCallback(async () => {
    try {
      const { data: expedicoes } = await supabase
        .from('expedicoes')
        .select('status, peso_total, quantidade_pecas, data_envio, created_at');

      const items = expedicoes || [];
      const enviados = items.filter(i => i.status === 'enviado' || i.status === 'entregue');
      const pendentes = items.filter(i => i.status === 'pendente' || i.status === 'preparando');

      const pesoEnviado = enviados.reduce((s, i) => s + (parseFloat(i.peso_total) || 0), 0);
      const pecasEnviadas = enviados.reduce((s, i) => s + (parseInt(i.quantidade_pecas) || 0), 0);

      const hoje = new Date().toISOString().slice(0, 10);
      const enviosHoje = items.filter(i => (i.data_envio || i.created_at || '').slice(0, 10) === hoje).length;

      return {
        totalEnvios: items.length,
        enviados: enviados.length,
        pendentes: pendentes.length,
        pesoEnviado: Math.round(pesoEnviado * 10) / 10,
        pecasEnviadas,
        enviosHoje
      };
    } catch (e) {
      console.warn('[CommandCenter] Erro campo:', e.message);
      return null;
    }
  }, []);

  // ===== CARREGAR TUDO =====
  const fetchAll = useCallback(async () => {
    const [c, p, e, f, ca] = await Promise.all([
      fetchCorte(),
      fetchProducao(),
      fetchEstoque(),
      fetchFinanceiro(),
      fetchCampo()
    ]);
    setCorte(c);
    setProducao(p);
    setEstoque(e);
    setFinanceiro(f);
    setCampo(ca);
    setLastUpdate(new Date());
    setLoading(false);

    // Salvar snapshot para comparação diária
    saveSnapshot({ corte: c, producao: p, estoque: e, financeiro: f, campo: ca });
  }, [fetchCorte, fetchProducao, fetchEstoque, fetchFinanceiro, fetchCampo]);

  // ===== SNAPSHOT DIÁRIO =====
  const saveSnapshot = useCallback((data) => {
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const stored = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}');
      // Salvar snapshot de hoje (sobrescreve ao longo do dia)
      stored[hoje] = { ...data, timestamp: new Date().toISOString() };
      // Manter apenas 7 dias
      const keys = Object.keys(stored).sort().reverse();
      if (keys.length > 7) {
        keys.slice(7).forEach(k => delete stored[k]);
      }
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(stored));
    } catch (e) { /* localStorage indisponível */ }
  }, []);

  const loadSnapshotOntem = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}');
      const keys = Object.keys(stored).sort().reverse();
      // Pegar o dia anterior (segundo key mais recente)
      if (keys.length >= 2) {
        setSnapshotOntem(stored[keys[1]]);
      }
    } catch (e) { /* fallback silencioso */ }
  }, []);

  // ===== SUPABASE REALTIME SUBSCRIPTIONS =====
  useEffect(() => {
    fetchAll();
    loadSnapshotOntem();

    // Subscription para mudanças em tempo real
    const channel = supabase
      .channel('command-center-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materiais_corte' }, () => {
        fetchCorte().then(c => { setCorte(c); setLastUpdate(new Date()); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pecas_producao' }, () => {
        fetchProducao().then(p => { setProducao(p); setLastUpdate(new Date()); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque' }, () => {
        fetchEstoque().then(e => { setEstoque(e); setLastUpdate(new Date()); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimentacoes_estoque' }, () => {
        fetchEstoque().then(e => { setEstoque(e); setLastUpdate(new Date()); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos_despesas' }, () => {
        fetchFinanceiro().then(f => { setFinanceiro(f); setLastUpdate(new Date()); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expedicoes' }, () => {
        fetchCampo().then(ca => { setCampo(ca); setLastUpdate(new Date()); });
      })
      .subscribe();

    channelRef.current = channel;

    // Refresh periódico a cada 60s como fallback
    const interval = setInterval(fetchAll, 60000);

    return () => {
      clearInterval(interval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchAll, fetchCorte, fetchProducao, fetchEstoque, fetchFinanceiro, fetchCampo, loadSnapshotOntem]);

  // ===== COMPARAÇÃO DIÁRIA =====
  const comparacaoDiaria = useCallback(() => {
    if (!snapshotOntem) return null;
    const diff = (atual, anterior) => {
      if (atual == null || anterior == null) return null;
      return atual - anterior;
    };
    return {
      corte: {
        finalizadasDiff: diff(corte?.finalizado, snapshotOntem.corte?.finalizado),
        progressoDiff: diff(corte?.progressoPecas, snapshotOntem.corte?.progressoPecas),
      },
      producao: {
        expedicaoDiff: diff(producao?.expedicao, snapshotOntem.producao?.expedicao),
        progressoDiff: diff(producao?.progressoGeral, snapshotOntem.producao?.progressoGeral),
      },
      estoque: {
        alertasDiff: diff(estoque?.alertas, snapshotOntem.estoque?.alertas),
      },
      financeiro: {
        despesasDiff: diff(financeiro?.totalDespesas, snapshotOntem.financeiro?.totalDespesas),
        saldoDiff: diff(financeiro?.saldoObra, snapshotOntem.financeiro?.saldoObra),
      }
    };
  }, [corte, producao, estoque, financeiro, snapshotOntem]);

  return {
    corte,
    producao,
    estoque,
    financeiro,
    campo,
    loading,
    lastUpdate,
    comparacaoDiaria: comparacaoDiaria(),
    snapshotOntem,
    refresh: fetchAll
  };
}
