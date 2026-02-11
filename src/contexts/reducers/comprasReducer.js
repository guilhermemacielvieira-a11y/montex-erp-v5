/**
 * MONTEX ERP Premium - Reducer de Compras
 *
 * Gerencia operações relacionadas a compras:
 * - Adição de pedidos de compra
 * - Atualização de pedidos de compra
 * - Recebimento de compras
 */

import { ACTIONS } from '../actions';

export function comprasReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ADD_COMPRA:
      return {
        ...state,
        compras: [...state.compras, action.payload]
      };

    case ACTIONS.UPDATE_COMPRA:
      return {
        ...state,
        compras: state.compras.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload.data } : c
        )
      };

    case ACTIONS.RECEBER_COMPRA:
      return {
        ...state,
        compras: state.compras.map(c =>
          c.id === action.payload.id
            ? { ...c, status: 'recebido', dataRecebimento: action.payload.dataRecebimento }
            : c
        )
      };

    default:
      return state;
  }
}
