import { useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';

/**
 * Hook especializado para operações de Produção
 */
export function useProducao() {
  const { state, updatePeca, moverPecaEtapa, updateStatusCorte, addPecas, reloadPecas } = useERP();

  const pecasPorObra = useMemo(() => {
    if (!state.obraAtual) return state.pecas;
    return state.pecas.filter(p => p.obraId === state.obraAtual || p.obra_id === state.obraAtual);
  }, [state.pecas, state.obraAtual]);

  const estatisticasProducao = useMemo(() => {
    const pecas = pecasPorObra;
    const total = pecas.length;
    const pendentes = pecas.filter(p => p.status === 'pendente' || !p.status).length;
    const emProducao = pecas.filter(p => p.status === 'em_producao' || p.etapa === 'producao').length;
    const prontas = pecas.filter(p => p.status === 'pronto' || p.status === 'concluido').length;
    const pesoTotal = pecas.reduce((sum, p) => sum + (Number(p.pesoTotal || p.peso || 0)), 0);
    const pesoProduzido = prontas.reduce((sum, p) => sum + (Number(p.pesoTotal || p.peso || 0)), 0);
    return {
      total,
      pendentes,
      emProducao,
      prontas,
      pesoTotal,
      pesoProduzido,
      percentual: pesoTotal > 0 ? Math.round((pesoProduzido / pesoTotal) * 100) : 0,
    };
  }, [pecasPorObra]);

  return {
    pecas: state.pecas,
    pecasPorObra,
    estatisticasProducao,
    funcionarios: state.funcionarios,
    equipes: state.equipes,
    maquinas: state.maquinas,
    expedicoes: state.expedicoes,
    loading: state.loading,
    updatePeca,
    moverPecaEtapa,
    updateStatusCorte,
    addPecas,
    reloadPecas,
  };
}
