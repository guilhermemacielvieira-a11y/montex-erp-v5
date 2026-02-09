// MONTEX ERP Premium - Hooks para Dados Mock
// Hooks React para facilitar o uso de dados mock nos componentes

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  mockProjetos,
  mockItensProducao,
  mockMovimentacoes,
  mockOrcamentos,
  mockAtividades,
  mockMetas,
  mockColaboradores,
  mockAlertas,
  mockDadosProducao,
  mockDadosFinanceiros,
} from '../data/mockData';

// Configuração: usar dados mock ou API real
const USE_MOCK_DATA = true; // Altere para false quando tiver backend

// Simular delay de rede
const simulateDelay = (data, delay = 300) => {
  return new Promise(resolve => setTimeout(() => resolve(data), delay));
};

// ============================================
// HOOK: PROJETOS
// ============================================
export function useProjetos() {
  return useQuery({
    queryKey: ['projetos'],
    queryFn: () => simulateDelay(mockProjetos),
    enabled: USE_MOCK_DATA,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useProjeto(id) {
  return useQuery({
    queryKey: ['projeto', id],
    queryFn: () => simulateDelay(mockProjetos.find(p => p.id === id)),
    enabled: USE_MOCK_DATA && !!id,
  });
}

export function useProjetosAtivos() {
  return useQuery({
    queryKey: ['projetosAtivos'],
    queryFn: () => simulateDelay(
      mockProjetos.filter(p => ['aprovado', 'em_fabricacao', 'em_montagem'].includes(p.status))
    ),
    enabled: USE_MOCK_DATA,
  });
}

// ============================================
// HOOK: ITENS DE PRODUÇÃO
// ============================================
export function useItensProducao(projetoId = null) {
  return useQuery({
    queryKey: ['itensProducao', projetoId],
    queryFn: () => {
      const itens = projetoId
        ? mockItensProducao.filter(i => i.projeto_id === projetoId)
        : mockItensProducao;
      return simulateDelay(itens);
    },
    enabled: USE_MOCK_DATA,
  });
}

export function useItensPorStatus(status) {
  return useQuery({
    queryKey: ['itensProducao', 'status', status],
    queryFn: () => simulateDelay(mockItensProducao.filter(i => i.status === status)),
    enabled: USE_MOCK_DATA && !!status,
  });
}

export function useUpdateItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, novoStatus }) => {
      // Simular atualização
      const item = mockItensProducao.find(i => i.id === itemId);
      if (item) {
        item.status = novoStatus;
      }
      return simulateDelay({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['itensProducao']);
    },
  });
}

// ============================================
// HOOK: MOVIMENTAÇÕES FINANCEIRAS
// ============================================
export function useMovimentacoes(projetoId = null) {
  return useQuery({
    queryKey: ['movimentacoes', projetoId],
    queryFn: () => {
      const movs = projetoId
        ? mockMovimentacoes.filter(m => m.projeto_id === projetoId)
        : mockMovimentacoes;
      return simulateDelay(movs);
    },
    enabled: USE_MOCK_DATA,
  });
}

export function useDespesas(projetoId = null) {
  return useQuery({
    queryKey: ['despesas', projetoId],
    queryFn: () => {
      let despesas = mockMovimentacoes.filter(m => m.tipo === 'despesa');
      if (projetoId) {
        despesas = despesas.filter(d => d.projeto_id === projetoId);
      }
      return simulateDelay(despesas);
    },
    enabled: USE_MOCK_DATA,
  });
}

export function useReceitas(projetoId = null) {
  return useQuery({
    queryKey: ['receitas', projetoId],
    queryFn: () => {
      let receitas = mockMovimentacoes.filter(m => m.tipo === 'receita');
      if (projetoId) {
        receitas = receitas.filter(r => r.projeto_id === projetoId);
      }
      return simulateDelay(receitas);
    },
    enabled: USE_MOCK_DATA,
  });
}

export function useResumoFinanceiro() {
  return useQuery({
    queryKey: ['resumoFinanceiro'],
    queryFn: () => {
      const receitas = mockMovimentacoes.filter(m => m.tipo === 'receita');
      const despesas = mockMovimentacoes.filter(m => m.tipo === 'despesa');

      const totalReceitas = receitas.reduce((acc, r) => acc + (r.valor || 0), 0);
      const totalDespesas = despesas.reduce((acc, d) => acc + (d.valor || 0), 0);

      return simulateDelay({
        totalReceitas,
        totalDespesas,
        lucro: totalReceitas - totalDespesas,
        margemLucro: totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0,
      });
    },
    enabled: USE_MOCK_DATA,
  });
}

// ============================================
// HOOK: ORÇAMENTOS
// ============================================
export function useOrcamentos() {
  return useQuery({
    queryKey: ['orcamentos'],
    queryFn: () => simulateDelay(mockOrcamentos),
    enabled: USE_MOCK_DATA,
  });
}

export function useOrcamentosPorStatus(status) {
  return useQuery({
    queryKey: ['orcamentos', 'status', status],
    queryFn: () => simulateDelay(mockOrcamentos.filter(o => o.status === status)),
    enabled: USE_MOCK_DATA && !!status,
  });
}

export function usePipelineOrcamentos() {
  return useQuery({
    queryKey: ['pipelineOrcamentos'],
    queryFn: () => {
      const pipeline = {
        rascunho: mockOrcamentos.filter(o => o.status === 'rascunho'),
        enviado: mockOrcamentos.filter(o => o.status === 'enviado'),
        em_analise: mockOrcamentos.filter(o => o.status === 'em_analise'),
        negociacao: mockOrcamentos.filter(o => o.status === 'negociacao'),
        aprovado: mockOrcamentos.filter(o => o.status === 'aprovado'),
      };

      const valorTotal = mockOrcamentos.reduce((acc, o) => {
        if (['enviado', 'em_analise', 'negociacao'].includes(o.status)) {
          return acc + (o.valor_total * (o.probabilidade / 100));
        }
        return acc;
      }, 0);

      return simulateDelay({ pipeline, valorPonderado: valorTotal });
    },
    enabled: USE_MOCK_DATA,
  });
}

// ============================================
// HOOK: ATIVIDADES
// ============================================
export function useAtividades(limite = 10) {
  return useQuery({
    queryKey: ['atividades', limite],
    queryFn: () => simulateDelay(mockAtividades.slice(0, limite)),
    enabled: USE_MOCK_DATA,
  });
}

// ============================================
// HOOK: METAS
// ============================================
export function useMetas() {
  return useQuery({
    queryKey: ['metas'],
    queryFn: () => simulateDelay(mockMetas),
    enabled: USE_MOCK_DATA,
  });
}

// ============================================
// HOOK: COLABORADORES
// ============================================
export function useColaboradores() {
  return useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => simulateDelay(mockColaboradores),
    enabled: USE_MOCK_DATA,
  });
}

// ============================================
// HOOK: ALERTAS
// ============================================
export function useAlertas() {
  return useQuery({
    queryKey: ['alertas'],
    queryFn: () => simulateDelay(mockAlertas),
    enabled: USE_MOCK_DATA,
  });
}

// ============================================
// HOOK: GRÁFICOS
// ============================================
export function useDadosProducaoGrafico() {
  return useQuery({
    queryKey: ['graficoProducao'],
    queryFn: () => simulateDelay(mockDadosProducao),
    enabled: USE_MOCK_DATA,
  });
}

export function useDadosFinanceirosGrafico() {
  return useQuery({
    queryKey: ['graficoFinanceiro'],
    queryFn: () => simulateDelay(mockDadosFinanceiros),
    enabled: USE_MOCK_DATA,
  });
}

// ============================================
// HOOK: ESTATÍSTICAS DASHBOARD
// ============================================
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => {
      // Calcular estatísticas gerais
      const totalProjetos = mockProjetos.length;
      const projetosAtivos = mockProjetos.filter(p =>
        ['aprovado', 'em_fabricacao', 'em_montagem'].includes(p.status)
      ).length;

      const pesoTotalProduzido = mockItensProducao
        .filter(i => ['concluido', 'expedido'].includes(i.status))
        .reduce((acc, i) => acc + ((i.peso_unitario || 0) * (i.quantidade || 1)), 0);

      const pesoTotalPendente = mockItensProducao
        .filter(i => !['concluido', 'expedido'].includes(i.status))
        .reduce((acc, i) => acc + ((i.peso_unitario || 0) * (i.quantidade || 1)), 0);

      const receitasMes = mockMovimentacoes
        .filter(m => m.tipo === 'receita')
        .reduce((acc, m) => acc + (m.valor || 0), 0);

      const despesasMes = mockMovimentacoes
        .filter(m => m.tipo === 'despesa')
        .reduce((acc, m) => acc + (m.valor || 0), 0);

      const orcamentosAbertos = mockOrcamentos.filter(o =>
        ['enviado', 'em_analise', 'negociacao'].includes(o.status)
      ).length;

      const valorOrcamentosAbertos = mockOrcamentos
        .filter(o => ['enviado', 'em_analise', 'negociacao'].includes(o.status))
        .reduce((acc, o) => acc + (o.valor_total || 0), 0);

      return simulateDelay({
        totalProjetos,
        projetosAtivos,
        pesoTotalProduzido,
        pesoTotalPendente,
        receitasMes,
        despesasMes,
        lucroMes: receitasMes - despesasMes,
        orcamentosAbertos,
        valorOrcamentosAbertos,
        itensEmProducao: mockItensProducao.filter(i =>
          ['em_corte', 'em_fabricacao', 'em_pintura'].includes(i.status)
        ).length,
      });
    },
    enabled: USE_MOCK_DATA,
    staleTime: 1000 * 60, // 1 minuto
  });
}

// ============================================
// HOOK: KPIs EXECUTIVOS
// ============================================
export function useKPIsExecutivos() {
  return useQuery({
    queryKey: ['kpisExecutivos'],
    queryFn: () => {
      const receitas = mockMovimentacoes.filter(m => m.tipo === 'receita');
      const despesas = mockMovimentacoes.filter(m => m.tipo === 'despesa');

      const totalReceitas = receitas.reduce((acc, r) => acc + (r.valor || 0), 0);
      const totalDespesas = despesas.reduce((acc, d) => acc + (d.valor || 0), 0);

      const pesoTotal = mockItensProducao.reduce((acc, i) =>
        acc + ((i.peso_unitario || 0) * (i.quantidade || 1)), 0
      );

      const pesoConcluido = mockItensProducao
        .filter(i => ['concluido', 'expedido'].includes(i.status))
        .reduce((acc, i) => acc + ((i.peso_unitario || 0) * (i.quantidade || 1)), 0);

      return simulateDelay([
        {
          titulo: 'Faturamento',
          valor: totalReceitas,
          variacao: 12.5,
          tipo: 'currency',
          cor: 'emerald',
        },
        {
          titulo: 'Produção',
          valor: pesoConcluido,
          meta: pesoTotal,
          variacao: 8.3,
          tipo: 'weight',
          cor: 'orange',
        },
        {
          titulo: 'Margem',
          valor: totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0,
          variacao: 2.1,
          tipo: 'percent',
          cor: 'blue',
        },
        {
          titulo: 'Obras Ativas',
          valor: mockProjetos.filter(p => ['em_fabricacao', 'em_montagem'].includes(p.status)).length,
          variacao: 0,
          tipo: 'number',
          cor: 'purple',
        },
      ]);
    },
    enabled: USE_MOCK_DATA,
  });
}

export default {
  useProjetos,
  useProjeto,
  useProjetosAtivos,
  useItensProducao,
  useItensPorStatus,
  useUpdateItemStatus,
  useMovimentacoes,
  useDespesas,
  useReceitas,
  useResumoFinanceiro,
  useOrcamentos,
  useOrcamentosPorStatus,
  usePipelineOrcamentos,
  useAtividades,
  useMetas,
  useColaboradores,
  useAlertas,
  useDadosProducaoGrafico,
  useDadosFinanceirosGrafico,
  useDashboardStats,
  useKPIsExecutivos,
};
