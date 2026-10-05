// ============================================================
// Snapshot compacto do BI para a IA (Insights IA)
// ============================================================
// Resume o retorno de useBIData em poucos KB (números arredondados, listas
// limitadas) para a análise executiva — a IA só vê o que está aqui.
// ============================================================

import { isoLocal } from '../bi/biCore';

export function montarSnapshotBI(bi, { rotuloEscopo = 'Geral' } = {}) {
  if (!bi) return {};
  const { obras = {}, producao = {}, financeiro = {}, suprimentos = {}, alertas = [] } = bi;
  const ativas = (obras.indicadores || []).filter((i) => i.ativa);
  return {
    gerado_em: bi.hoje ? isoLocal(bi.hoje) : null,
    escopo: rotuloEscopo,
    regra_financeira: financeiro.geralEmpresa
      ? 'Caixa da empresa: receitas pelo total; despesas sem obra (material comprado na obra fica fora).'
      : 'Somente as obras do escopo: medições/receitas × material lançado na obra.',
    executivo: obras.executivo,
    obras_ativas: ativas.slice(0, 15).map((i) => ({
      obra: i.nome, fisico_pct: i.fisicoPct, financeiro_pct: i.financeiroPct, gap_pp: i.gapPp,
      contrato: i.valorContrato || null, medido: i.medido, recebido: i.recebido, a_receber: i.aReceber,
      material_na_obra: i.material, kg_restante: i.kgRestante, ritmo_kg_semana: i.ritmoKgSemana,
      previsao_fim: i.previsaoFim, prazo: i.prazo, atraso_dias: i.atrasoDias, sem_contrato: i.semContrato,
    })),
    producao: {
      kg_por_semana_ultimas_8: (producao.ritmo || []).slice(-8),
      tendencia: producao.tendencia,
      lead_time_dias: producao.leadTimes,
      em_processo: (producao.wip?.resumo || []).filter((w) => w.pecas > 0),
      gargalo: producao.gargalo,
      top5_funcionarios_30d: (producao.ranking || []).slice(0, 5).map((f) => ({ funcionario: f.funcionario, kg: f.kg })),
    },
    financeiro: {
      ultimos_6_meses: (financeiro.mensal || []).slice(-6),
      a_receber_vencido: financeiro.aging?.receberVencido,
      a_pagar_vencido: financeiro.aging?.pagarVencido,
      aging: financeiro.aging?.faixas,
      fluxo_8_semanas: financeiro.fluxo,
      top_fornecedores: (financeiro.fornecedores || []).slice(0, 8),
      categorias: (financeiro.categorias || []).slice(0, 8),
    },
    suprimentos: {
      itens: suprimentos.kpis?.nItens, valor_total: suprimentos.kpis?.valorTotal, em_alerta: suprimentos.kpis?.alertas,
      valor_em_risco: suprimentos.kpis?.valorEmRisco, sem_preco: suprimentos.kpis?.semPreco, abc: suprimentos.abc?.resumo,
    },
    alertas: alertas.slice(0, 20).map((a) => ({ severidade: a.severidade, area: a.regra, titulo: a.titulo, detalhe: a.detalhe })),
  };
}
