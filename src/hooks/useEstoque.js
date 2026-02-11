import { useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';

/**
 * Hook especializado para operações de Estoque
 */
export function useEstoque() {
  const { state, updateEstoque, consumirEstoque, adicionarEstoque, reservarEstoque, importarMateriais, registrarEntregaMaterial, updateMaterial } = useERP();

  const itensAbaixoMinimo = useMemo(() => {
    return state.estoque.filter(e => {
      const qtd = Number(e.quantidade || 0);
      const min = Number(e.quantidadeMinima || e.estoqueMinimo || 0);
      return min > 0 && qtd <= min;
    });
  }, [state.estoque]);

  const resumoEstoque = useMemo(() => {
    const total = state.estoque.length;
    const abaixo = itensAbaixoMinimo.length;
    const valorTotal = state.estoque.reduce((sum, e) =>
      sum + (Number(e.quantidade || 0) * Number(e.precoUnitario || e.valorUnitario || 0)), 0
    );
    return { total, abaixoMinimo: abaixo, valorTotal };
  }, [state.estoque, itensAbaixoMinimo]);

  return {
    estoque: state.estoque,
    materiaisEstoque: state.materiaisEstoque,
    movimentacoesEstoque: state.movimentacoesEstoque,
    itensAbaixoMinimo,
    resumoEstoque,
    loading: state.loading,
    updateEstoque,
    consumirEstoque,
    adicionarEstoque,
    reservarEstoque,
    importarMateriais,
    registrarEntregaMaterial,
    updateMaterial,
  };
}
