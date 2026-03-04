// ============================================
// USE COMMAND CENTER - Hook Central de Métricas em Tempo Real v3
// ============================================
// Agrega dados de: Corte, Produção, Estoque, Financeiro, Campo, Histórico
// Supabase realtime subscriptions para atualizações em tempo real
// Dados reais dos módulos Kanban Corte, Kanban Produção e Expedição
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../api/supabaseClient';

const SNAPSHOT_KEY = 'montex_daily_snapshot';

// Helper: datas para filtros de período
function getDateRange(periodo) {
  const now = new Date();
  const hoje = now.toISOString().slice(0, 10);
  if (periodo === 'dia') {
    return { start: hoje + 'T00:00:00', end: hoje + 'T23:59:59', startDate: hoje };
  }
  if (periodo === 'semana') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay()); // domingo
    return { start: d.toISOString().slice(0, 10) + 'T00:00:00', end: hoje + 'T23:59:59', startDate: d.toISOString().slice(0, 10) };
  }
  // mes
  const startMonth = hoje.slice(0, 7) + '-01';
  return { start: startMonth + 'T00:00:00', end: hoje + 'T23:59:59', startDate: startMonth };
}

export function useCommandCenter() {
  const [corte, setCorte] = useState(null);
  const [producao, setProducao] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [estoque, setEstoque] = useState(null);
  const [financeiro, setFinanceiro] = useState(null);
  const [campo, setCampo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [snapshotOntem, setSnapshotOntem] = useState(null);
  const channelRef = useRef(null);

  // ===== CARREGAR DADOS DE CORTE (Kanban Corte) =====
  const fetchCorte = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('materiais_corte')
        .select('id, status_corte, peso_teorico, quantidade, peca, marca, perfil, material, comprimento_mm, funcionario_corte, maquina, data_inicio, data_fim, updated_at, created_at');
      if (error) throw error;

      const items = data || [];
      const aguardando = items.filter(i => !i.status_corte || i.status_corte === 'aguardando' || i.status_corte === 'programacao');
      const cortando = items.filter(i => i.status_corte === 'cortando' || i.status_corte === 'em_corte');
      const finalizado = items.filter(i => i.status_corte === 'finalizado' || i.status_corte === 'liberado');

      const pesoTotal = items.reduce((s, i) => s + (parseFloat(i.peso_teorico) || 0), 0);
      const pesoFinalizado = finalizado.reduce((s, i) => s + (parseFloat(i.peso_teorico) || 0), 0);

      const hoje = new Date().toISOString().slice(0, 10);
      const cortadasHoje = finalizado.filter(i => (i.data_fim || i.updated_at || '').slice(0, 10) === hoje);

      // Por funcionário de corte
      const porFuncionario = {};
      finalizado.forEach(i => {
        const func = i.funcionario_corte || 'Não atribuído';
        if (!porFuncionario[func]) porFuncionario[func] = { qtd: 0, peso: 0, pecas: [], maquinas: new Set() };
        porFuncionario[func].qtd++;
        porFuncionario[func].peso += parseFloat(i.peso_teorico) || 0;
        porFuncionario[func].pecas.push({ marca: i.marca || '-', peca: i.peca || '-', perfil: i.perfil || '', peso: parseFloat(i.peso_teorico) || 0 });
        if (i.maquina) porFuncionario[func].maquinas.add(i.maquina);
      });
      // Converter Sets para arrays
      Object.values(porFuncionario).forEach(f => { f.maquinas = [...f.maquinas]; });

      // Peças por tipo/peça
      const porConjunto = {};
      items.forEach(i => {
        const conj = i.peca || i.marca || 'Outros';
        if (!porConjunto[conj]) porConjunto[conj] = { total: 0, cortadas: 0, peso: 0 };
        porConjunto[conj].total++;
        porConjunto[conj].peso += parseFloat(i.peso_teorico) || 0;
        if (i.status_corte === 'finalizado' || i.status_corte === 'liberado') porConjunto[conj].cortadas++;
      });

      return {
        total: items.length,
        aguardando: aguardando.length,
        cortando: cortando.length,
        finalizado: finalizado.length,
        pesoTotal: Math.round(pesoTotal * 10) / 10,
        pesoFinalizado: Math.round(pesoFinalizado * 10) / 10,
        progressoPeso: pesoTotal > 0 ? Math.round((pesoFinalizado / pesoTotal) * 100) : 0,
        progressoPecas: items.length > 0 ? Math.round((finalizado.length / items.length) * 100) : 0,
        cortadasHoje: cortadasHoje.length,
        cortadasHojeItens: cortadasHoje,
        porFuncionario,
        porConjunto,
        items
      };
    } catch (e) {
      console.warn('[CommandCenter] Erro corte:', e.message);
      return null;
    }
  }, []);

  // ===== CARREGAR DADOS DE PRODUÇÃO (Kanban Produção) =====
  const fetchProducao = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pecas_producao')
        .select('id, etapa, status, peso_total, peso_unitario, quantidade, quantidade_produzida, nome, marca, tipo, perfil, responsavel, equipe_id, obra_id, obra_nome, updated_at, created_at');
      if (error) throw error;

      const items = data || [];
      const fabricacao = items.filter(i => i.etapa === 'fabricacao' || !i.etapa);
      const solda = items.filter(i => i.etapa === 'solda');
      const pintura = items.filter(i => i.etapa === 'pintura');
      const expedicao = items.filter(i => i.etapa === 'expedicao' || i.etapa === 'expedido');
      const finalizado = items.filter(i => i.etapa === 'finalizado');
      const entregue = items.filter(i => i.etapa === 'entregue');

      const pesoTotal = items.reduce((s, i) => s + (parseFloat(i.peso_total) || 0), 0);
      const pesoExpedido = [...expedicao, ...finalizado, ...entregue].reduce((s, i) => s + (parseFloat(i.peso_total) || 0), 0);
      const avancados = solda.length + pintura.length + expedicao.length + finalizado.length + entregue.length;

      // Por setor com identificação completa de peças
      const mapPeca = i => ({
        id: i.id,
        nome: i.nome || i.marca || '-',
        marca: i.marca || '-',
        tipo: i.tipo || '-',
        perfil: i.perfil || '',
        peso: parseFloat(i.peso_total) || 0,
        resp: i.responsavel || 'Não atribuído',
        updatedAt: i.updated_at,
      });

      // Peças pós-pintura prontas para envio (etapa pintura com status finalizado/concluido, ou etapa expedicao)
      const prontasEnvio = items.filter(i => {
        const etapa = i.etapa || '';
        const status = (i.status || '').toLowerCase();
        // Peças já na expedição
        if (etapa === 'expedicao' || etapa === 'expedido') return true;
        // Peças na pintura que já foram finalizadas (prontas para envio)
        if (etapa === 'pintura' && (status === 'finalizado' || status === 'concluido' || status === 'pronto')) return true;
        return false;
      });

      const porSetor = {
        fabricacao: fabricacao.map(mapPeca),
        solda: solda.map(mapPeca),
        pintura: pintura.map(mapPeca),
        expedicao: prontasEnvio.map(mapPeca),
        entregue: entregue.map(mapPeca),
      };

      // Por responsável com detalhamento
      const porFuncionario = {};
      items.forEach(i => {
        const resp = i.responsavel || 'Não atribuído';
        if (!porFuncionario[resp]) porFuncionario[resp] = { total: 0, fabricacao: 0, solda: 0, pintura: 0, expedicao: 0, entregue: 0, peso: 0, pecas: [] };
        porFuncionario[resp].total++;
        porFuncionario[resp].peso += parseFloat(i.peso_total) || 0;
        porFuncionario[resp].pecas.push({ nome: i.nome || i.marca || '-', etapa: i.etapa || 'fabricacao' });
        const etapa = i.etapa || 'fabricacao';
        if (etapa === 'fabricacao' || !i.etapa) porFuncionario[resp].fabricacao++;
        else if (etapa === 'solda') porFuncionario[resp].solda++;
        else if (etapa === 'pintura') porFuncionario[resp].pintura++;
        else if (etapa === 'expedicao' || etapa === 'expedido') porFuncionario[resp].expedicao++;
        else if (etapa === 'entregue') porFuncionario[resp].entregue++;
      });

      return {
        total: items.length,
        fabricacao: fabricacao.length,
        solda: solda.length,
        pintura: pintura.length,
        expedicao: expedicao.length,
        finalizado: finalizado.length,
        entregue: entregue.length,
        pesoTotal: Math.round(pesoTotal * 10) / 10,
        pesoExpedido: Math.round(pesoExpedido * 10) / 10,
        progressoGeral: pesoTotal > 0 ? Math.round((pesoExpedido / pesoTotal) * 100) : 0,
        movidasHoje: avancados,
        porSetor,
        porFuncionario,
        items
      };
    } catch (e) {
      console.warn('[CommandCenter] Erro produção:', e.message);
      return null;
    }
  }, []);

  // ===== CARREGAR HISTÓRICO DE PRODUÇÃO (movimentações reais) =====
  const fetchHistorico = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('producao_historico')
        .select('id, peca_id, etapa_de, etapa_para, funcionario_id, funcionario_nome, data_inicio, data_fim, observacoes, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        // Tabela pode não existir
        console.warn('[CommandCenter] producao_historico:', error.message);
        return { movimentacoes: [], porFuncionario: {}, porDia: {}, porEtapa: {} };
      }

      const items = data || [];
      const hoje = new Date().toISOString().slice(0, 10);

      // Movimentações de hoje
      const movHoje = items.filter(i => (i.created_at || '').slice(0, 10) === hoje);

      // Por funcionário (histórico real)
      const porFuncionario = {};
      items.forEach(i => {
        const func = i.funcionario_nome || 'Não identificado';
        if (!porFuncionario[func]) porFuncionario[func] = { total: 0, hoje: 0, etapas: {} };
        porFuncionario[func].total++;
        if ((i.created_at || '').slice(0, 10) === hoje) porFuncionario[func].hoje++;
        const etapa = i.etapa_para || 'outro';
        porFuncionario[func].etapas[etapa] = (porFuncionario[func].etapas[etapa] || 0) + 1;
      });

      // Por dia (últimos 7 dias)
      const porDia = {};
      items.forEach(i => {
        const dia = (i.created_at || '').slice(0, 10);
        if (!dia) return;
        if (!porDia[dia]) porDia[dia] = { total: 0, etapas: {} };
        porDia[dia].total++;
        const etapa = i.etapa_para || 'outro';
        porDia[dia].etapas[etapa] = (porDia[dia].etapas[etapa] || 0) + 1;
      });

      // Por etapa destino
      const porEtapa = {};
      items.forEach(i => {
        const etapa = i.etapa_para || 'outro';
        porEtapa[etapa] = (porEtapa[etapa] || 0) + 1;
      });

      return {
        movimentacoes: items,
        movHoje,
        totalHoje: movHoje.length,
        porFuncionario,
        porDia,
        porEtapa
      };
    } catch (e) {
      console.warn('[CommandCenter] Erro histórico:', e.message);
      return { movimentacoes: [], porFuncionario: {}, porDia: {}, porEtapa: {} };
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
      const critico = items.filter(i => (parseFloat(i.quantidade) || 0) === 0).length;
      const baixo = items.filter(i => {
        const qty = parseFloat(i.quantidade) || 0;
        const min = parseFloat(i.minimo) || 0;
        return qty > 0 && min > 0 && qty <= min;
      }).length;
      const normal = totalItens - critico - baixo;
      const valorTotalCalc = items.reduce((s, i) => s + ((parseFloat(i.quantidade) || 0) * (parseFloat(i.preco) || 0)), 0);

      const hoje = new Date().toISOString().slice(0, 10);
      let entradas = 0, saidas = 0;
      try {
        const { data: movHoje } = await supabase
          .from('movimentacoes_estoque')
          .select('tipo, quantidade')
          .gte('data', hoje + 'T00:00:00')
          .lte('data', hoje + 'T23:59:59');
        entradas = (movHoje || []).filter(m => m.tipo === 'entrada').length;
        saidas = (movHoje || []).filter(m => m.tipo === 'saida' || m.tipo === 'corte').length;
      } catch (movErr) { /* tabela pode não existir */ }

      return { totalItens, valorTotal: Math.round(valorTotalCalc), normal, baixo, critico, entradasHoje: entradas, saidasHoje: saidas, alertas: baixo + critico };
    } catch (e) {
      console.warn('[CommandCenter] Erro estoque:', e.message);
      return null;
    }
  }, []);

  // ===== CARREGAR DADOS FINANCEIROS =====
  const fetchFinanceiro = useCallback(async () => {
    try {
      const { data: lancamentos } = await supabase
        .from('lancamentos_despesas')
        .select('valor, tipo, status, categoria, data_emissao, obra_id');
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

      const porCategoria = {};
      lancs.forEach(l => {
        const cat = l.categoria || 'outros';
        porCategoria[cat] = (porCategoria[cat] || 0) + (parseFloat(l.valor) || 0);
      });

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

  // ===== CARREGAR DADOS DE EXPEDIÇÃO (módulo Envios completo) =====
  const fetchCampo = useCallback(async () => {
    try {
      const { data: expedicoes } = await supabase
        .from('expedicoes')
        .select('id, numero_romaneio, obra_id, status, peso_total, pecas, data_expedicao, transportadora, motorista, placa, destino, observacoes, created_at, updated_at');

      const items = expedicoes || [];
      const enviados = items.filter(i => {
        const st = (i.status || '').toUpperCase();
        return st === 'ENVIADO' || st === 'ENTREGUE' || st === 'EM_TRANSITO';
      });
      const entregues = items.filter(i => (i.status || '').toUpperCase() === 'ENTREGUE');
      const emTransito = items.filter(i => (i.status || '').toUpperCase() === 'EM_TRANSITO');
      const pendentes = items.filter(i => {
        const st = (i.status || '').toUpperCase();
        return st === 'PENDENTE' || st === 'PREPARANDO' || st === 'AGUARDANDO_TRANSPORTE';
      });

      const pesoEnviado = enviados.reduce((s, i) => s + (parseFloat(i.peso_total) || 0), 0);
      const pesoTotal = items.reduce((s, i) => s + (parseFloat(i.peso_total) || 0), 0);

      const pecasEnviadas = enviados.reduce((s, i) => {
        if (typeof i.pecas === 'number') return s + i.pecas;
        if (Array.isArray(i.pecas)) return s + i.pecas.length;
        return s + (parseInt(i.pecas) || 0);
      }, 0);

      const hoje = new Date().toISOString().slice(0, 10);
      const enviosHoje = items.filter(i => (i.data_expedicao || i.created_at || '').slice(0, 10) === hoje);

      // Lista detalhada de envios para o dashboard
      const enviosDetalhados = items
        .sort((a, b) => (b.data_expedicao || b.created_at || '').localeCompare(a.data_expedicao || a.created_at || ''))
        .slice(0, 10)
        .map(i => ({
          id: i.id,
          numero: i.numero_romaneio || '-',
          status: (i.status || 'pendente').toUpperCase(),
          peso: parseFloat(i.peso_total) || 0,
          pecas: typeof i.pecas === 'number' ? i.pecas : (Array.isArray(i.pecas) ? i.pecas.length : parseInt(i.pecas) || 0),
          data: i.data_expedicao || i.created_at || '',
          transportadora: i.transportadora || '-',
          motorista: i.motorista || '-',
          placa: i.placa || '-',
          destino: i.destino || '-',
        }));

      return {
        totalEnvios: items.length,
        enviados: enviados.length,
        entregues: entregues.length,
        emTransito: emTransito.length,
        pendentes: pendentes.length,
        pesoEnviado: Math.round(pesoEnviado * 10) / 10,
        pesoTotal: Math.round(pesoTotal * 10) / 10,
        pecasEnviadas,
        enviosHoje: enviosHoje.length,
        enviosDetalhados,
        items
      };
    } catch (e) {
      console.warn('[CommandCenter] Erro campo:', e.message);
      return null;
    }
  }, []);

  // ===== CARREGAR TUDO =====
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [c, p, h, e, f, ca] = await Promise.all([
      fetchCorte(),
      fetchProducao(),
      fetchHistorico(),
      fetchEstoque(),
      fetchFinanceiro(),
      fetchCampo()
    ]);
    setCorte(c);
    setProducao(p);
    setHistorico(h);
    setEstoque(e);
    setFinanceiro(f);
    setCampo(ca);
    setLastUpdate(new Date());
    setLoading(false);

    saveSnapshot({ corte: c, producao: p, estoque: e, financeiro: f, campo: ca });
  }, [fetchCorte, fetchProducao, fetchHistorico, fetchEstoque, fetchFinanceiro, fetchCampo]);

  // ===== SNAPSHOT =====
  const saveSnapshot = useCallback((data) => {
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const stored = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}');
      stored[hoje] = { ...data, timestamp: new Date().toISOString() };
      const keys = Object.keys(stored).sort().reverse();
      if (keys.length > 7) keys.slice(7).forEach(k => delete stored[k]);
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(stored));
    } catch (e) { /* localStorage indisponível */ }
  }, []);

  const loadSnapshotOntem = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}');
      const keys = Object.keys(stored).sort().reverse();
      if (keys.length >= 2) setSnapshotOntem(stored[keys[1]]);
    } catch (e) { /* fallback */ }
  }, []);

  // ===== REALTIME =====
  useEffect(() => {
    fetchAll();
    loadSnapshotOntem();

    const channel = supabase
      .channel('command-center-realtime-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materiais_corte' }, () => {
        fetchCorte().then(c => { setCorte(c); setLastUpdate(new Date()); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pecas_producao' }, () => {
        fetchProducao().then(p => { setProducao(p); setLastUpdate(new Date()); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'producao_historico' }, () => {
        fetchHistorico().then(h => { setHistorico(h); setLastUpdate(new Date()); });
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
    const interval = setInterval(fetchAll, 60000);

    return () => {
      clearInterval(interval);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchAll, fetchCorte, fetchProducao, fetchHistorico, fetchEstoque, fetchFinanceiro, fetchCampo, loadSnapshotOntem]);

  // ===== COMPARAÇÃO DIÁRIA =====
  const comparacaoDiaria = useCallback(() => {
    if (!snapshotOntem) return null;
    const diff = (a, b) => (a != null && b != null) ? a - b : null;
    return {
      corte: {
        finalizadasDiff: diff(corte?.finalizado, snapshotOntem.corte?.finalizado),
        progressoDiff: diff(corte?.progressoPecas, snapshotOntem.corte?.progressoPecas),
      },
      producao: {
        expedicaoDiff: diff(producao?.expedicao, snapshotOntem.producao?.expedicao),
        progressoDiff: diff(producao?.progressoGeral, snapshotOntem.producao?.progressoGeral),
      },
      estoque: { alertasDiff: diff(estoque?.alertas, snapshotOntem.estoque?.alertas) },
      financeiro: {
        despesasDiff: diff(financeiro?.totalDespesas, snapshotOntem.financeiro?.totalDespesas),
        saldoDiff: diff(financeiro?.saldoObra, snapshotOntem.financeiro?.saldoObra),
      }
    };
  }, [corte, producao, estoque, financeiro, snapshotOntem]);

  return {
    corte,
    producao,
    historico,
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
