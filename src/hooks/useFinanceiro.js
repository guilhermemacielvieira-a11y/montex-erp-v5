import { useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';

/**
 * Hook especializado para operações Financeiras
 */
export function useFinanceiro() {
  const { state, addLancamento, updateLancamento } = useERP();

  const lancamentosPorObra = useMemo(() => {
    if (!state.obraAtual) return state.lancamentosDespesas;
    return state.lancamentosDespesas.filter(l => l.obraId === state.obraAtual || l.obra_id === state.obraAtual);
  }, [state.lancamentosDespesas, state.obraAtual]);

  const resumoFinanceiro = useMemo(() => {
    const receitas = state.lancamentosDespesas.filter(l => l.tipo === 'receita');
    const despesas = state.lancamentosDespesas.filter(l => l.tipo === 'despesa');
    const totalReceitas = receitas.reduce((sum, l) => sum + (Number(l.valor) || 0), 0);
    const totalDespesas = despesas.reduce((sum, l) => sum + (Number(l.valor) || 0), 0);
    return {
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas - totalDespesas,
      countReceitas: receitas.length,
      countDespesas: despesas.length,
    };
  }, [state.lancamentosDespesas]);

  return {
    lancamentos: state.lancamentosDespesas,
    lancamentosPorObra,
    notasFiscais: state.notasFiscais,
    resumoFinanceiro,
    loading: state.loading,
    addLancamento,
    updateLancamento,
  };
}
