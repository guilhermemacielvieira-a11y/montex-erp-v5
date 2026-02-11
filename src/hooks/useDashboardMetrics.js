/**
 * MONTEX ERP V5 - Centralized Dashboard Metrics Hook
 *
 * Single source of truth for all KPI calculations across dashboards.
 * Consolidates metrics from multiple ERPContext hooks and data sources.
 *
 * This hook eliminates inconsistencies by computing all metrics once and
 * sharing them across DashboardPremium, DashboardFuturista, and DashboardERPIntegrado.
 *
 * @returns {Object} Centralized metrics object with all KPI sections
 */

import { useMemo } from 'react';
import {
  useObras,
  useProducao,
  useEstoque,
  useMedicoes,
  useExpedicao,
  useEquipes
} from '@/contexts/ERPContext';
import { DRE_OBRA } from '@/data/obraFinanceiraDatabase';
import { commandCenterData } from '@/data/commandCenterData';

/**
 * Centralized KPI Calculation Hook
 * @returns {Object} Complete metrics object with all KPI sections
 */
export function useDashboardMetrics() {
  // Import all required data from ERPContext
  const { obras, obraAtualData, updateProgressoObra } = useObras();
  const { pecas, maquinas } = useProducao();
  const { estoque, alertasEstoque } = useEstoque();
  const { medicoes } = useMedicoes();
  const { expedicoes } = useExpedicao();
  const { equipes, funcionarios } = useEquipes();

  // Import external data
  const {
    maquinasStatus = [],
    kpisIndustriais = {},
    fluxoFinanceiro = {},
    qualidadeMetricas = {},
    alertasInteligentes = []
  } = commandCenterData || {};

  // ===== SEÇÃO 1: PROJETOS =====
  const projetos = useMemo(() => {
    const statusAtivos = ['em_andamento', 'em_fabricacao', 'em_montagem', 'aprovado', 'em_producao', 'em_projeto', 'aprovada'];
    const ativos = obras.filter(o => statusAtivos.includes(o.status)).length;
    const total = obras.length;

    // Trend: compare active vs total ratio
    const trend = total > 0 ? ((ativos / total) * 100) : 0;

    return {
      ativos: ativos || 1,
      total: total || 1,
      trend: Math.round(trend),
    };
  }, [obras]);

  // ===== SEÇÃO 2: PRODUÇÃO =====
  const producao = useMemo(() => {
    const totalPecas = pecas.length;

    // Count pieces by stage
    const pecasAguardando = pecas.filter(p => p.etapa === 'aguardando').length;
    const pecasCorte = pecas.filter(p => p.etapa === 'corte').length;
    const pecasFabricacao = pecas.filter(p => p.etapa === 'fabricacao').length;
    const pecasSolda = pecas.filter(p => p.etapa === 'solda').length;
    const pecasPintura = pecas.filter(p => p.etapa === 'pintura').length;
    const pecasExpedicao = pecas.filter(p => p.etapa === 'expedido').length;
    const pecasFinalizadas = pecasExpedicao;

    // Calculate overall progress
    const pecasProcessadas = totalPecas - pecasAguardando;
    const progressoGeral = totalPecas > 0 ? Math.round((pecasProcessadas / totalPecas) * 100) : 0;

    return {
      totalPecas,
      pecasFinalizadas,
      progressoGeral,
      pecasPorEtapa: {
        corte: pecasCorte,
        fabricacao: pecasFabricacao,
        solda: pecasSolda,
        pintura: pecasPintura,
        expedicao: pecasExpedicao,
        montagem: 0, // If not tracked in etapa
      },
    };
  }, [pecas]);

  // ===== SEÇÃO 3: FINANCEIRO =====
  const financeiro = useMemo(() => {
    // Base values from works and DRE_OBRA
    const valorTotal = obras.reduce((acc, o) => acc + (o.valor || 0), 0);

    // Use DRE_OBRA for financial data
    const receitas = DRE_OBRA?.receitas?.totalRealizado || DRE_OBRA?.receitas?.totalGeral || 0;
    const despesas = DRE_OBRA?.custos?.totalDiretosRealizado || 0;
    const lucro = receitas - despesas;

    // Calculate margin (only if receitas > 0)
    const margemLucro = receitas > 0 ? Math.round((lucro / receitas) * 100) : 0;

    // Format valor in millions
    const valorEmMilhoes = (valorTotal / 1000000).toFixed(1);
    const valorMilhoes = `R$ ${valorEmMilhoes}M`;

    return {
      valorTotal: Math.round(valorTotal / 1000000),
      valorMilhoes,
      receitas: Math.round(receitas / 1000000),
      despesas: Math.round(despesas / 1000000),
      lucro: Math.round(lucro / 1000000),
      margemLucro,
    };
  }, [obras]);

  // ===== SEÇÃO 4: ESTOQUE =====
  const estoqueMetrics = useMemo(() => {
    const totalItens = estoque.length;

    // Calculate total weight in tons
    const totalKg = estoque.reduce((sum, item) => {
      const quantidade = item.quantidadeAtual || item.quantidade || 0;
      const peso = item.peso || item.pesoUnitario || 0;
      return sum + (peso * quantidade);
    }, 0);
    const totalToneladas = Math.round(totalKg / 1000);

    // Count items by status
    const disponiveis = estoque.filter(e => {
      const qtd = e.quantidadeAtual || e.quantidade || 0;
      return qtd > 0;
    }).length;

    const reservados = estoque.filter(e => e.status === 'reservado').length;
    const alertas = alertasEstoque?.length || 0;

    return {
      totalItens,
      totalToneladas,
      disponiveis,
      reservados,
      alertas,
    };
  }, [estoque, alertasEstoque]);

  // ===== SEÇÃO 5: MÁQUINAS =====
  const maquinasMetrics = useMemo(() => {
    // Use maquinasStatus from commandCenterData if available, otherwise from context
    const machineList = maquinasStatus?.length > 0 ? maquinasStatus : maquinas || [];
    const total = machineList.length || 0;

    const operando = machineList.filter(m => m.status === 'operando').length;

    // Calculate average efficiency
    let eficienciaMedia = 0;
    if (operando > 0) {
      const totalEficiencia = machineList.reduce((acc, m) => acc + (m.eficiencia || 0), 0);
      eficienciaMedia = Math.round(totalEficiencia / operando);
    }

    return {
      operando,
      total: total || 1,
      eficienciaMedia,
      lista: machineList,
    };
  }, [maquinasStatus, maquinas]);

  // ===== SEÇÃO 6: EXPEDIÇÃO =====
  const expedicaoMetrics = useMemo(() => {
    const ativas = expedicoes.filter(e => e.status !== 'entregue').length;
    const totalExpedicoes = expedicoes.length;

    // Calculate total weight delivered
    const pesoEntregue = expedicoes
      .filter(e => e.status === 'entregue')
      .reduce((sum, e) => sum + (e.pesoTotal || 0), 0);

    return {
      ativas,
      pesoEntregue: Math.round(pesoEntregue / 1000), // Convert to tons
      totalExpedicoes,
    };
  }, [expedicoes]);

  // ===== SEÇÃO 7: EQUIPES =====
  const equipesMetrics = useMemo(() => {
    const total = equipes.length;

    return {
      total: total || 1,
      lista: equipes,
    };
  }, [equipes]);

  // ===== SEÇÃO 8: PERFORMANCE (Radar Chart) =====
  const performance = useMemo(() => {
    // Production: based on overall progress
    const producaoScore = producao.progressoGeral || 0;

    // Quality: from qualidadeMetricas if available
    const qualidadeScore = qualidadeMetricas?.taxaAprovacao ||
                          qualidadeMetricas?.conformidade || 50;

    // Timeline/Delivery: based on expediction rate
    const prazoDados = expedicaoMetrics.totalExpedicoes > 0
      ? Math.round((expedicaoMetrics.ativas / expedicaoMetrics.totalExpedicoes) * 100)
      : 50;
    const prazoScore = Math.max(0, 100 - prazoDados); // Lower active expeditions = better delivery

    // Cost: from financial data (margin)
    const custoScore = Math.min(100, Math.abs(financeiro.margemLucro || 0));

    // Safety: from alertasInteligentes
    const alertaCriticos = alertasInteligentes?.filter(a => a.tipo === 'critico').length || 0;
    const segurancaScore = Math.max(0, 100 - (alertaCriticos * 10));

    // Innovation: fixed baseline
    const inovacaoScore = 65;

    return {
      producao: Math.round(producaoScore),
      qualidade: Math.round(qualidadeScore),
      prazo: Math.round(prazoScore),
      custo: Math.round(custoScore),
      seguranca: Math.round(segurancaScore),
      inovacao: inovacaoScore,
    };
  }, [producao, financeiro, expedicaoMetrics, qualidadeMetricas, alertasInteligentes]);

  // ===== SEÇÃO 9: CHART DATA (Pre-computed) =====
  const chartData = useMemo(() => {
    // Production by stage
    const productionByEtapa = [
      { name: 'Corte', value: producao.pecasPorEtapa.corte },
      { name: 'Fabricação', value: producao.pecasPorEtapa.fabricacao },
      { name: 'Solda', value: producao.pecasPorEtapa.solda },
      { name: 'Pintura', value: producao.pecasPorEtapa.pintura },
      { name: 'Expedição', value: producao.pecasPorEtapa.expedicao },
      { name: 'Montagem', value: producao.pecasPorEtapa.montagem },
    ].filter(d => d.value > 0);

    // Production trend by stage
    const productionTrend = [
      { mes: 'Corte', fabricado: producao.pecasPorEtapa.corte, planejado: Math.ceil(producao.totalPecas / 6) },
      { mes: 'Fabricação', fabricado: producao.pecasPorEtapa.fabricacao, planejado: Math.ceil(producao.totalPecas / 6) },
      { mes: 'Solda', fabricado: producao.pecasPorEtapa.solda, planejado: Math.ceil(producao.totalPecas / 6) },
      { mes: 'Pintura', fabricado: producao.pecasPorEtapa.pintura, planejado: Math.ceil(producao.totalPecas / 6) },
      { mes: 'Expedição', fabricado: producao.pecasPorEtapa.expedicao, planejado: Math.ceil(producao.totalPecas / 6) },
      { mes: 'Montagem', fabricado: producao.pecasPorEtapa.montagem, planejado: Math.ceil(producao.totalPecas / 6) },
    ];

    // Project status
    const projectStatus = [
      { name: 'Aprovado', value: obras.filter(o => o.status === 'aprovado').length, color: '#60a5fa' },
      { name: 'Fabricação', value: obras.filter(o => o.status === 'em_fabricacao').length, color: '#22d3ee' },
      { name: 'Montagem', value: obras.filter(o => o.status === 'em_montagem').length, color: '#34d399' },
      { name: 'Concluído', value: obras.filter(o => o.status === 'concluido').length, color: '#c084fc' },
    ].filter(d => d.value > 0);

    // Radar data
    const radarData = [
      { subject: 'Produção', value: performance.producao, fullMark: 100 },
      { subject: 'Qualidade', value: performance.qualidade, fullMark: 100 },
      { subject: 'Prazo', value: performance.prazo, fullMark: 100 },
      { subject: 'Custo', value: performance.custo, fullMark: 100 },
      { subject: 'Segurança', value: performance.seguranca, fullMark: 100 },
      { subject: 'Inovação', value: performance.inovacao, fullMark: 100 },
    ];

    // Financial flow (daily cash)
    const fluxoFinanceiroData = (fluxoFinanceiro?.receitasPorDia || []).length > 0
      ? fluxoFinanceiro.receitasPorDia.map(f => ({
          dia: f.dia,
          receita: Math.round((f.valor || 0) / 1000)
        }))
      : [];

    return {
      productionByEtapa,
      productionTrend,
      projectStatus,
      radarData,
      fluxoFinanceiro: fluxoFinanceiroData,
    };
  }, [producao, obras, performance, fluxoFinanceiro]);

  // ===== SEÇÃO 10: RAW DATA ACCESS =====
  const raw = useMemo(() => ({
    obras,
    pecas,
    estoque,
    medicoes,
    expedicoes,
    equipes,
  }), [obras, pecas, estoque, medicoes, expedicoes, equipes]);

  // ===== FINAL RETURN OBJECT =====
  return useMemo(() => ({
    // Projetos
    projetos,

    // Produção
    producao,

    // Financeiro
    financeiro,

    // Estoque
    estoque: estoqueMetrics,

    // Máquinas
    maquinas: maquinasMetrics,

    // Expedição
    expedicao: expedicaoMetrics,

    // Equipes
    equipes: equipesMetrics,

    // Performance (Radar)
    performance,

    // Chart Data (pre-computed)
    chartData,

    // Raw data access
    raw,
  }), [
    projetos,
    producao,
    financeiro,
    estoqueMetrics,
    maquinasMetrics,
    expedicaoMetrics,
    equipesMetrics,
    performance,
    chartData,
    raw,
  ]);
}

export default useDashboardMetrics;
