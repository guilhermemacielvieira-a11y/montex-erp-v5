/**
 * MONTEX ERP - Hook Central de Analytics de Produção
 *
 * Agrega dados REAIS do Supabase para métricas por funcionário.
 * Separa funcionários COM e SEM dados de produção.
 * Calcula KG e unidades separadamente por etapa.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/api/supabaseClient';
import { useEquipes } from '@/contexts/ERPContext';
import {
  agregarPorEtapa,
  calcularTotais,
  agregarPorDia,
  calcularTendencia,
  calcularEficiencia,
  VALORES_ETAPA,
} from '@/utils/producaoCalculations';

/**
 * Hook principal de analytics de produção
 * @param {Object} options - { periodo: { inicio, fim }, etapaFiltro, equipeId }
 */
export function useProducaoAnalytics(options = {}) {
  const { periodo, etapaFiltro, equipeId } = options;

  const {
    funcionarios: ctxFuncionarios,
    equipes: ctxEquipes,
  } = useEquipes();

  const [loading, setLoading] = useState(true);
  const [historico, setHistorico] = useState([]);
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

    try {
      // Buscar histórico de produção no período
      let histQuery = supabase
        .from('producao_historico')
        .select('*')
        .gte('data_inicio', periodoEfetivo.inicio)
        .lte('data_inicio', periodoEfetivo.fim)
        .order('data_inicio', { ascending: false });

      // Filtro por etapa: usa etapa_de pois produção é contabilizada pela etapa CONCLUÍDA
      // Mapeamento: aguardando = corte (Kanban Corte usa "aguardando → finalizado")
      if (etapaFiltro) {
        if (etapaFiltro === 'corte') {
          histQuery = histQuery.in('etapa_de', ['corte', 'aguardando']);
        } else {
          histQuery = histQuery.eq('etapa_de', etapaFiltro);
        }
      }

      const { data: histData, error: histErr } = await histQuery;
      if (histErr) throw histErr;

      // Buscar peças (para peso/kg)
      const { data: pecasData, error: pecasErr } = await supabase
        .from('pecas_producao')
        .select('id, nome, marca, tipo, peso_total, peso_unitario, quantidade, etapa, funcionario_fabricacao, funcionario_solda, funcionario_pintura, funcionario_expedido')
        .limit(5000);
      if (pecasErr) throw pecasErr;

      setHistorico(histData || []);
      setPecas(pecasData || []);
    } catch (err) {
      console.error('[Analytics] Erro ao buscar dados:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [periodoEfetivo, etapaFiltro]);

  useEffect(() => {
    fetchDados();
  }, [fetchDados]);

  // ============ CLASSIFICAR FUNCIONÁRIOS ============
  // Identificar quem TEM dados de produção e quem NÃO tem
  const funcionariosClassificados = useMemo(() => {
    const funcionarios = ctxFuncionarios || [];
    const equipes = ctxEquipes || [];

    // IDs de funcionários que aparecem no histórico
    const idsComHistorico = new Set();
    historico.forEach(h => {
      if (h.funcionario_id) idsComHistorico.add(h.funcionario_id);
    });

    // IDs de funcionários que aparecem em peças (como responsáveis)
    pecas.forEach(p => {
      if (p.funcionario_fabricacao) idsComHistorico.add(p.funcionario_fabricacao);
      if (p.funcionario_solda) idsComHistorico.add(p.funcionario_solda);
      if (p.funcionario_pintura) idsComHistorico.add(p.funcionario_pintura);
      if (p.funcionario_expedido) idsComHistorico.add(p.funcionario_expedido);
    });

    // Classificar cada funcionário
    const comDados = [];
    const semDados = [];

    funcionarios.forEach(f => {
      const equipe = equipes.find(e => e.id === f.equipeId);

      // Filtrar por equipe se especificado
      if (equipeId && f.equipeId !== equipeId) return;

      const temDados = idsComHistorico.has(f.id);

      // Histórico deste funcionário
      const histFunc = historico.filter(h => h.funcionario_id === f.id);
      const porEtapa = agregarPorEtapa(histFunc, pecas);
      const totais = calcularTotais(porEtapa);
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
        ranking: 0, // será calculado depois
      };

      if (temDados) {
        comDados.push(dados);
      } else {
        semDados.push(dados);
      }
    });

    // Calcular ranking (por total de unidades, decrescente)
    comDados.sort((a, b) => b.totais.unidades - a.totais.unidades);
    comDados.forEach((f, i) => { f.ranking = i + 1; });

    return { comDados, semDados };
  }, [ctxFuncionarios, ctxEquipes, historico, pecas, equipeId]);

  // ============ KPIs GLOBAIS ============
  const kpis = useMemo(() => {
    const { comDados } = funcionariosClassificados;
    if (comDados.length === 0) {
      return {
        totalFuncionariosComDados: 0,
        totalFuncionariosSemDados: funcionariosClassificados.semDados.length,
        totalUnidades: 0,
        totalKg: 0,
        totalValor: 0,
        eficienciaMedia: 0,
        porEtapa: { corte: { un: 0, kg: 0 }, fabricacao: { un: 0, kg: 0 }, solda: { un: 0, kg: 0 }, pintura: { un: 0, kg: 0 } },
      };
    }

    let totalUnidades = 0;
    let totalKg = 0;
    let totalValor = 0;
    const porEtapa = {
      corte: { un: 0, kg: 0, valor: 0 },
      fabricacao: { un: 0, kg: 0, valor: 0 },
      solda: { un: 0, kg: 0, valor: 0 },
      pintura: { un: 0, kg: 0, valor: 0 },
    };

    comDados.forEach(f => {
      totalUnidades += f.totais.unidades;
      totalKg += f.totais.kg;
      totalValor += f.totais.valorTotal;

      Object.keys(porEtapa).forEach(etapa => {
        if (f.porEtapa[etapa]) {
          porEtapa[etapa].un += f.porEtapa[etapa].unidades;
          porEtapa[etapa].kg += f.porEtapa[etapa].kg;
          porEtapa[etapa].valor += f.porEtapa[etapa].valor || 0;
        }
      });
    });

    return {
      totalFuncionariosComDados: comDados.length,
      totalFuncionariosSemDados: funcionariosClassificados.semDados.length,
      totalUnidades,
      totalKg: Math.round(totalKg * 100) / 100,
      totalValor: Math.round(totalValor * 100) / 100,
      eficienciaMedia: 0, // Calculado se tivermos metas
      porEtapa,
    };
  }, [funcionariosClassificados]);

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
