/**
 * MONTEX ERP Premium - Reducer de Financeiro
 *
 * Gerencia operações relacionadas a finanças:
 * - Lançamentos de despesas
 * - Atualização de lançamentos
 * - Materiais em estoque (controle por peso)
 * - Registro de entrega de materiais
 * - Atualização de materiais
 */

import { ACTIONS } from '../actions';

export function financeiroReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ADD_LANCAMENTO:
      return {
        ...state,
        lancamentosDespesas: [...state.lancamentosDespesas, action.payload]
      };

    case ACTIONS.UPDATE_LANCAMENTO:
      return {
        ...state,
        lancamentosDespesas: state.lancamentosDespesas.map(l =>
          l.id === action.payload.id ? { ...l, ...action.payload.data } : l
        )
      };

    case ACTIONS.IMPORTAR_MATERIAIS:
      return {
        ...state,
        materiaisEstoque: [...state.materiaisEstoque, ...action.payload]
      };

    case ACTIONS.REGISTRAR_ENTREGA_MATERIAL: {
      const { materialId, entrega } = action.payload;
      return {
        ...state,
        materiaisEstoque: state.materiaisEstoque.map(mat => {
          if (mat.id === materialId) {
            const novoPesoRecebido = mat.pesoRecebido + entrega.pesoKg;
            const novoPesoFalta = Math.max(0, mat.pesoPedido - novoPesoRecebido);
            const novoPercentual = Math.min(100, Math.round((novoPesoRecebido / mat.pesoPedido) * 100));
            const novoStatus = novoPesoRecebido >= mat.pesoPedido
              ? 'completo'
              : novoPesoRecebido > 0
                ? 'parcial'
                : 'pendente';

            return {
              ...mat,
              pesoRecebido: novoPesoRecebido,
              pesoFalta: novoPesoFalta,
              percentualRecebido: novoPercentual,
              status: novoStatus,
              entregas: [...mat.entregas, {
                id: `ENT-${Date.now()}`,
                ...entrega,
                registradoEm: new Date().toISOString()
              }]
            };
          }
          return mat;
        })
      };
    }

    case ACTIONS.UPDATE_MATERIAL:
      return {
        ...state,
        materiaisEstoque: state.materiaisEstoque.map(m =>
          m.id === action.payload.id ? { ...m, ...action.payload.data } : m
        )
      };

    default:
      return state;
  }
}
