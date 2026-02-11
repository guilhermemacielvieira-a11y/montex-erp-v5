/**
 * MONTEX ERP Premium - Reducer de Estoque
 *
 * Gerencia operações relacionadas a estoque:
 * - Atualização de quantidade em estoque
 * - Consumo de estoque para produção
 * - Adição de estoque (recebimento de compras)
 * - Reserva de estoque para obras
 */

import { ACTIONS } from '../actions';

export function estoqueReducer(state, action) {
  switch (action.type) {
    case ACTIONS.UPDATE_ESTOQUE:
      return {
        ...state,
        estoque: state.estoque.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload.data } : e
        )
      };

    case ACTIONS.CONSUMIR_ESTOQUE: {
      const { itemId, quantidade, obraId } = action.payload;
      return {
        ...state,
        estoque: state.estoque.map(e =>
          e.id === itemId
            ? {
                ...e,
                quantidade: e.quantidade - quantidade,
                reservado: Math.max(0, (e.reservado || 0) - quantidade)
              }
            : e
        )
      };
    }

    case ACTIONS.ADICIONAR_ESTOQUE: {
      const { itemId, quantidade, compraId } = action.payload;
      return {
        ...state,
        estoque: state.estoque.map(e =>
          e.id === itemId ? { ...e, quantidade: e.quantidade + quantidade } : e
        )
      };
    }

    case ACTIONS.RESERVAR_ESTOQUE: {
      const { itemId, quantidade, obraId } = action.payload;
      return {
        ...state,
        estoque: state.estoque.map(e =>
          e.id === itemId
            ? { ...e, reservado: (e.reservado || 0) + quantidade, obraReservada: obraId }
            : e
        )
      };
    }

    default:
      return state;
  }
}
