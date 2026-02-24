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
        .select('etapa, status, peso_total, peso_unitario, quantidade, quantidade_produzida');
      if (error) throw error;

      const items = data || [];
      const fabricacao = items.filter(i => i.etapa === 'fabricacao' || !i.etapa);
      const solda = items.filter(i => i.etapa === 'solda');
      const pintura = items.filter(i => i.etapa === 'pintura');
      const expedicao = items.filter(i => i.etapa === 'expedicao' || i.etapa === 'expedido');
      const finalizado = items.filter(i => i.etapa === 'finalizado');

      const pesoTotal = items.reduce((s, i) => s + (parseFloat(i.peso_total) || 0), 0);
      const pesoExpedido = [...expedicao, ...finalizado].reduce((s, i) => s + (parseFloat(i.peso_total) || 0), 0);

      // Progresso baseado em etapas avançadas (solda+pintura+expedicao+finalizado)
      const avancados = solda.length + pintura.length + expedicao.length + finalizado.length;
      const movidasHoje = avancados; // sem updated_at, usamos total avançado

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
        .select('quantidade, minimo, tipo, categoria, localizacao, preco, comprado, updated_at');
      if (error) throw error;

      const items = data || [];
      const totalItens = items.length;
      // Classificar por nível de estoque
      const critico = items.filter(i => (parseFloat(i.quantidade) || 0) === 0).length;
      const baixo = items.filter(i => {
        const qty = parseFloat(i.quantidade) || 0;
        const min = parseFloat(i.minimo) || 0;
        return qty > 0 && min > 0 && qty <= min;
      }).length;
      const normal = totalItens - critico - baixo;
      // Calcular valor total do estoque (quantidade * preço)
      const valorTotalCalc = items.reduce((s, i) => s + ((parseFloat(i.quantidade) || 0) * (parseFloat(i.preco) || 0)), 0);

      // Movimentações de hoje
      const hoje = new Date().toISOString().slice(0, 10);
      let entradas = 0;
      let saidas = 0;
      try {
        const { data: movHoje } = await supabase
          .from('movimentacoes_estoque')
          .select('tipo, quantidade')
          .gte('data', hoje + 'T00:00:00')
          .lte('data', hoje + 'T23:59:59');
        entradas = (movHoje || []).filter(m => m.tipo === 'entrada').length;
        saidas = (movHoje || []).filter(m => m.tipo === 'saida' || m.tipo === 'corte').length;
      } catch (movErr) {
        // movimentacoes_estoque pode não existir ainda
      }

      return {
        totalItens,
        valorTotal: Math.round(valorTotalCalc),
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
      // Colunas reais: id, obra_id, numero_romaneio, data_expedicao, status, transportadora, motorista, placa, peso_total, pecas, destino, observacoes, created_at, updated_at
      const { data: expedicoes } = await supabase
        .from('expedicoes')
        .select('status, peso_total, pecas, data_expedicao, created_at');

      const items = expedicoes || [];
      const enviados = items.filter(i => i.status === 'enviado' || i.status === 'entregue');
      const pendentes = items.filter(i => i.status === 'pendente' || i.status === 'preparando');

      const pesoEnviado = enviados.reduce((s, i) => s + (parseFloat(i.peso_total) || 0), 0);
      // pecas pode ser integer ou jsonb - tratar ambos
      const pecasEnviadas = enviados.reduce((s, i) => {
        if (typeof i.pecas === 'number') return s + i.pecas;
        if (Array.isArray(i.pecas)) return s + i.pecas.length;
        return s + (parseInt(i.pecas) || 0);
      }, 0);

      const hoje = new Date().toISOString().slice(0, 10);
      const enviosHoje = items.filter(i => (i.data_expedicao || i.created_at || '').slice(0, 10) === hoje).length;

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
