/**
 * MONTEX ERP - Hook Central de Analytics de Produção
 *
 * Agrega dados REAIS do Supabase para métricas por funcionário.
 * Separa funcionários COM e SEM dados de produção.
 * Calcula KG e unidades separadamente por etapa.
 *
 * FONTES DE DADOS (em ordem de prioridade):
 *   1. producao_historico  — registros de movimentação no Kanban
 *   2. entity_store (producao_lancamento) — lançamentos via LancamentoProducaoModal
 *   3. pecas_producao.funcionario_X — vínculos diretos nas peças
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/api/supabaseClient';
import { useEquipes } from '@/contexts/ERPContext';
import {
  agregarPorEtapa,
  calcularTotais,
  agregarPorDia,
  calcularTendencia,
  calcularEficiencia,
  contabilizarCumulativo,
  VALORES_ETAPA,
} from '@/utils/producaoCalculations';

/**
 * Converter um registro entity_store (producao_lancamento) em formato compatível com producao_historico
 */
function lancamentoParaHistorico(lan) {
  const etapa = lan.etapa || '';
  const etapaParaMap = {
    corte: 'fabricacao',
    fabricacao: 'solda',
    solda: 'pintura',
    pintura: 'expedido',
    montagem: 'entregue',
    expedido: 'entregue',
  };
  const etapaDeMap = {
    corte: 'aguardando',
    fabricacao: 'fabricacao',
    solda: 'solda',
    pintura: 'pintura',
    montagem: 'montagem',
    expedido: 'expedido',
  };
  return {
    id:              `LANC-${lan.peca_id}-${etapa}`,
    peca_id:         lan.peca_id,
    etapa_de:        etapaDeMap[etapa] || etapa,
    etapa_para:      etapaParaMap[etapa] || etapa,
    funcionario_id:  lan.funcionario_id,
    funcionario_nome: lan.funcionario_nome,
    data_inicio:     lan.data_producao ? new Date(lan.data_producao).toISOString() : new Date().toISOString(),
    observacoes:     lan.observacoes || '',
    _source:         'entity_store',
  };
}

/**
 * Hook principal de analytics de produção
 * @param {Object} options - { periodo: { inicio, fim }, etapaFiltro, equipeId, obraId, obraIds }
 *   - obraId: filtro por uma obra
 *   - obraIds: array para filtrar por múltiplas obras (grupo consolidado)
 */
export function useProducaoAnalytics(options = {}) {
  const { periodo, etapaFiltro, equipeId, obraId, obraIds } = options;
  // Normaliza: se obraIds vier, usa ele; senão usa obraId
  const obrasFiltro = Array.isArray(obraIds) && obraIds.length > 0
    ? obraIds
    : (obraId ? [obraId] : null);
  const obrasFiltroKey = obrasFiltro ? obrasFiltro.slice().sort().join(',') : '';

  const {
    funcionarios: ctxFuncionarios,
    equipes: ctxEquipes,
  } = useEquipes();

  const [loading, setLoading] = useState(true);
  const [historicoBase, setHistoricoBase] = useState([]);
  const [lancamentosStore, setLancamentosStore] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [error, setError] = useState(null);

  // Período padrão: mês atual
  const periodoEfetivo = useMemo(() => {
    if (periodo?.inicio && periodo?.fim) return periodo;
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59).toISOString();
    return { inicio: inicioMes, fim: fimMes };
  }, [periodo]);

  // Buscar dados do Supabase
  const fetchDados = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const client = supabaseAdmin || supabase;

    try {
      // 1. Buscar histórico de produção no período
      let histQuery = supabase
        .from('producao_historico')
        .select('*')
        .gte('data_inicio', periodoEfetivo.inicio)
        .lte('data_inicio', periodoEfetivo.fim)
        .order('data_inicio', { ascending: false });

      if (etapaFiltro) {
        if (etapaFiltro === 'corte') {
          histQuery = histQuery.in('etapa_de', ['corte', 'aguardando']);
        } else {
          histQuery = histQuery.eq('etapa_de', etapaFiltro);
        }
      }

      const { data: histData, error: histErr } = await histQuery;
      if (histErr) console.warn('[Analytics] producao_historico:', histErr.message);

      // 2. Buscar lançamentos do entity_store (producao_lancamento)
      // Esses registros contêm vínculos explícitos peca × etapa × funcionário
      const { data: storeData, error: storeErr } = await client
        .from('entity_store')
        .select('id, data, created_date')
        .eq('entity_type', 'producao_lancamento')
        .not('data->>funcionario_id', 'is', null)
        .order('created_date', { ascending: false });

      if (storeErr) console.warn('[Analytics] entity_store:', storeErr.message);

      // 3. Buscar peças (para peso/kg) — suporta filtro por uma ou múltiplas obras
      let pecasQuery = supabase
        .from('pecas_producao')
        .select('id, nome, marca, tipo, peso_total, peso_unitario, quantidade, etapa, obra_id, obra_nome, funcionario_fabricacao, funcionario_solda, funcionario_pintura, funcionario_expedido')
        .limit(5000);
      if (obrasFiltro && obrasFiltro.length > 0) {
        pecasQuery = pecasQuery.in('obra_id', obrasFiltro);
      }
      const { data: pecasData, error: pecasErr } = await pecasQuery;

      if (pecasErr) console.warn('[Analytics] pecas_producao:', pecasErr.message);

      // Filtrar histórico pelas peças da obra (quando filtro de obra ativo)
      let histFiltrado = histData || [];
      if (obrasFiltro && Array.isArray(pecasData) && pecasData.length > 0) {
        const idsObra = new Set(pecasData.map(p => p.id));
        histFiltrado = histFiltrado.filter(h => idsObra.has(h.peca_id));
      }

      setHistoricoBase(histFiltrado);
      setLancamentosStore(storeData || []);
      setPecas(pecasData || []);
    } catch (err) {
      console.error('[Analytics] Erro ao buscar dados:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [periodoEfetivo, etapaFiltro, obrasFiltroKey]);

  useEffect(() => {
    fetchDados();
  }, [fetchDados]);

  // Mesclar historico + entity_store lancamentos em uma fonte única
  // entity_store serve de fallback: se já existe registro em producao_historico para aquele (peca_id, etapa_de), não duplicar
  const historico = useMemo(() => {
    const base = historicoBase || [];
    const store = lancamentosStore || [];

    if (store.length === 0) return base;

    // Conjunto de chaves já presentes no histórico base
    const chavesExistentes = new Set(base.map(h => `${h.peca_id}__${h.etapa_de}`));

    // Filtrar lancamentos store que ainda não estão no histórico base
    // e que têm funcionario_id preenchido
    const storeConvertido = store
      .map(row => {
        const d = row.data || {};
        if (!d.peca_id || !d.funcionario_id || !d.etapa) return null;
        return lancamentoParaHistorico(d);
      })
      .filter(Boolean)
      .filter(h => !chavesExistentes.has(`${h.peca_id}__${h.etapa_de}`));

    return [...base, ...storeConvertido];
  }, [historicoBase, lancamentosStore]);

  // ============ CLASSIFICAR FUNCIONÁRIOS ============
  // 🔑 NOVA LÓGICA DE ATRIBUIÇÃO DIRETA:
  // Cada peça já tem funcionario_fabricacao, funcionario_solda, etc.
  // Uma peça em etapa "expedido" tem 4 funcionários atribuídos (um por etapa).
  // Aqui contamos: para cada etapa X, soma de qtd das peças onde:
  //   - p[funcionario_X] === f.id
  //   - peça já AVANÇOU dessa etapa (etapa_atual > X)
  // Assim cada peça é atribuída a UM funcionário por etapa.
  const ORDEM_ETAPAS = ['aguardando', 'corte', 'fabricacao', 'solda', 'pintura', 'expedido', 'enviado', 'entregue', 'montagem'];
  const ETAPAS_PRODUCAO = ['corte', 'fabricacao', 'solda', 'pintura'];
  // Para considerar "fez a etapa", peça deve estar em etapa >= próxima etapa
  const PROXIMA_ETAPA = { corte: 'fabricacao', fabricacao: 'solda', solda: 'pintura', pintura: 'expedido' };

  function porEtapaDireto(funcId) {
    const result = {};
    ETAPAS_PRODUCAO.forEach(e => { result[e] = { unidades: 0, kg: 0, valor: 0 }; });
    const pecasPorEtapa = {};
    ETAPAS_PRODUCAO.forEach(e => { pecasPorEtapa[e] = new Set(); });

    for (const etapa of ETAPAS_PRODUCAO) {
      // Pula etapas que não interessam quando há filtroEtapa ativo
      if (etapaFiltro && etapaFiltro !== etapa) continue;
      const campo = `funcionario_${etapa}`;
      const proxima = PROXIMA_ETAPA[etapa];
      const minIdx = ORDEM_ETAPAS.indexOf(proxima);
      pecas.forEach(p => {
        if (p[campo] !== funcId) return;
        const idx = ORDEM_ETAPAS.indexOf(p.etapa);
        if (idx < minIdx) return; // peça ainda não avançou desta etapa
        const qtd = parseInt(p.quantidade) || 1;
        const peso = parseFloat(p.peso_total) || 0;
        result[etapa].unidades += qtd;
        result[etapa].kg += peso;
        pecasPorEtapa[etapa].add(p.id);
      });
    }
    return { result, pecasPorEtapa };
  }

  const funcionariosClassificados = useMemo(() => {
    const funcionarios = ctxFuncionarios || [];
    const equipes = ctxEquipes || [];

    // IDs de funcionários que aparecem como responsáveis em alguma peça
    const idsComAtribuicao = new Set();
    pecas.forEach(p => {
      ETAPAS_PRODUCAO.forEach(e => {
        const campo = `funcionario_${e}`;
        if (p[campo]) idsComAtribuicao.add(p[campo]);
      });
      if (p.funcionario_expedido) idsComAtribuicao.add(p.funcionario_expedido);
    });
    // Também incluir os do histórico (compat)
    historico.forEach(h => {
      if (h.funcionario_id) idsComAtribuicao.add(h.funcionario_id);
    });

    const comDados = [];
    const semDados = [];

    funcionarios.forEach(f => {
      const equipe = equipes.find(e => e.id === f.equipeId);
      if (equipeId && f.equipeId !== equipeId) return;
      const temDados = idsComAtribuicao.has(f.id);

      // === ATRIBUIÇÃO DIRETA pelas peças ===
      const { result: porEtapa, pecasPorEtapa } = porEtapaDireto(f.id);

      // Totais (unidades únicas no time deste funcionário)
      const pecasUnicasIds = new Set();
      ETAPAS_PRODUCAO.forEach(e => {
        pecasPorEtapa[e].forEach(id => pecasUnicasIds.add(id));
      });
      // Soma qtd das peças únicas atribuídas a esse funcionário (em qualquer etapa)
      let unidadesUnicas = 0;
      let pesoUnicasKg = 0;
      pecasUnicasIds.forEach(pid => {
        const p = pecas.find(pp => pp.id === pid);
        if (p) {
          unidadesUnicas += parseInt(p.quantidade) || 1;
          pesoUnicasKg += parseFloat(p.peso_total) || 0;
        }
      });
      // Soma total de "tarefas" (cada etapa conta separadamente)
      const totalUnidadesTarefas = ETAPAS_PRODUCAO.reduce((s, e) => s + (porEtapa[e]?.unidades || 0), 0);
      const totalKgTarefas       = ETAPAS_PRODUCAO.reduce((s, e) => s + (porEtapa[e]?.kg || 0), 0);

      const totais = {
        unidades:      totalUnidadesTarefas,       // soma de tarefas (1 peça em 4 etapas = 4)
        unidadesUnicas,                            // peças únicas trabalhadas pelo funcionário
        pecasUnicas:   pecasUnicasIds.size,
        pesoUnicasKg:  Math.round(pesoUnicasKg * 100) / 100,
        kg:            Math.round(totalKgTarefas * 100) / 100,
        valorTotal:    0,
      };

      // Histórico de movimentação (para tendência diária)
      const histFunc = historico.filter(h => h.funcionario_id === f.id);
      const dadosDiarios = agregarPorDia(histFunc);
      const tendencia = calcularTendencia(dadosDiarios);

      const dados = {
        ...f,
        equipeNome: equipe?.nome || f.equipeNome || f.equipe || '-',
        temDadosProducao: temDados,
        porEtapa,
        totais,
        dadosDiarios,
        tendencia,
        pecasVinculadas: pecasUnicasIds.size,
        ranking: 0,
      };

      if (temDados && (unidadesUnicas > 0 || totalUnidadesTarefas > 0)) {
        comDados.push(dados);
      } else {
        semDados.push(dados);
      }
    });

    // Calcular ranking (por peças únicas trabalhadas, decrescente)
    // Usa unidadesUnicas (sem duplicar peças que passaram por várias etapas)
    comDados.sort((a, b) => (b.totais.unidadesUnicas || b.totais.unidades) - (a.totais.unidadesUnicas || a.totais.unidades));
    comDados.forEach((f, i) => { f.ranking = i + 1; });

    return { comDados, semDados };
  }, [ctxFuncionarios, ctxEquipes, historico, pecas, equipeId, etapaFiltro]);

  // ============ KPIs GLOBAIS (CUMULATIVO) ============
  const kpis = useMemo(() => {
    const { comDados } = funcionariosClassificados;

    // KPIs cumulativos baseados no status atual das peças
    const cumulativo = contabilizarCumulativo(pecas);

    // KPIs por funcionário (do historico mesclado): usados para "atribuídos"
    const porEtapaAtribuido = {
      corte: { un: 0, kg: 0 },
      fabricacao: { un: 0, kg: 0 },
      solda: { un: 0, kg: 0 },
      pintura: { un: 0, kg: 0 },
    };

    comDados.forEach(f => {
      Object.keys(porEtapaAtribuido).forEach(etapa => {
        if (f.porEtapa[etapa]) {
          porEtapaAtribuido[etapa].un += f.porEtapa[etapa].unidades;
          porEtapaAtribuido[etapa].kg += f.porEtapa[etapa].kg;
        }
      });
    });

    // Por etapa: usar o MAIOR entre cumulativo e historico
    const porEtapa = {};
    Object.keys(cumulativo).forEach(etapa => {
      porEtapa[etapa] = {
        un: Math.max(cumulativo[etapa].unidades, porEtapaAtribuido[etapa]?.un || 0),
        kg: Math.max(cumulativo[etapa].kg, porEtapaAtribuido[etapa]?.kg || 0),
        atribuidoUn: porEtapaAtribuido[etapa]?.un || 0,
        atribuidoKg: porEtapaAtribuido[etapa]?.kg || 0,
        valor: 0,
      };
    });

    // Totais ÚNICOS: peças que já passaram por alguma etapa de produção
    const ETAPAS_EM_PRODUCAO = ['fabricacao', 'solda', 'pintura', 'expedido', 'entregue', 'enviado', 'montagem'];
    let totalConjuntos = 0;
    let totalUnidades = 0;
    let totalKg = 0;

    pecas.forEach(p => {
      const etapa = p.etapa;
      if (!etapa) return;
      if (ETAPAS_EM_PRODUCAO.includes(etapa)) {
        totalConjuntos += 1;
        totalUnidades += (p.quantidade || 1);
        totalKg += (p.peso_total || p.peso_unitario || 0);
      }
    });

    // Percentual atribuído (tem funcionário vinculado)
    const totalComFuncionario = pecas.filter(p =>
      p.funcionario_fabricacao || p.funcionario_solda || p.funcionario_pintura || p.funcionario_expedido
    ).length;
    const percAtribuido = pecas.length > 0 ? Math.round((totalComFuncionario / pecas.length) * 100) : 0;

    return {
      totalFuncionariosComDados: comDados.length,
      totalFuncionariosSemDados: funcionariosClassificados.semDados.length,
      totalConjuntos,
      totalUnidades,
      totalKg: Math.round(totalKg * 100) / 100,
      totalValor: 0,
      eficienciaMedia: 0,
      percAtribuido,
      totalComFuncionario,
      porEtapa,
    };
  }, [funcionariosClassificados, pecas]);

  // ============ TOP PERFORMERS ============
  const topPerformers = useMemo(() => {
    return funcionariosClassificados.comDados.slice(0, 10);
  }, [funcionariosClassificados]);

  return {
    loading,
    error,
    funcionariosComDados: funcionariosClassificados.comDados,
    funcionariosSemDados: funcionariosClassificados.semDados,
    kpis,
    topPerformers,
    historico,
    pecas,
    periodoEfetivo,
    refetch: fetchDados,
  };
}
