import { useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';

/**
 * Hook especializado para operações de Obras
 * Abstrai o ERPContext fornecendo apenas dados e ações de Obras
 */
export function useObras() {
  const { state, setObraAtual, updateObra, addObra } = useERP();

  const obraAtual = useMemo(() => {
    if (!state.obraAtual) return null;
    return state.obras.find(o => o.id === state.obraAtual) || null;
  }, [state.obraAtual, state.obras]);

  const obrasFiltradas = useMemo(() => {
    return state.obras.filter(o => o.status !== 'cancelada');
  }, [state.obras]);

  const estatisticas = useMemo(() => {
    const total = state.obras.length;
    const emAndamento = state.obras.filter(o => o.status === 'em_andamento' || o.status === 'em_producao').length;
    const concluidas = state.obras.filter(o => o.status === 'concluida' || o.status === 'entregue').length;
    const planejamento = state.obras.filter(o => o.status === 'planejamento').length;
    return { total, emAndamento, concluidas, planejamento };
  }, [state.obras]);

  return {
    obras: state.obras,
    obraAtual,
    obraAtualId: state.obraAtual,
    obrasFiltradas,
    estatisticas,
    loading: state.loading,
    setObraAtual,
    updateObra,
    addObra,
  };
}
