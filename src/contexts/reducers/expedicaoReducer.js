/**
 * MONTEX ERP Premium - Reducer de Expedição
 *
 * Gerencia operações relacionadas a expedição:
 * - Adição de romaneios/expedições
 * - Atualização de status de expedição
 */

import { ACTIONS } from '../actions';

export function expedicaoReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ADD_EXPEDICAO:
      return {
        ...state,
        expedicoes: [...state.expedicoes, action.payload]
      };

    case ACTIONS.UPDATE_EXPEDICAO:
      return {
        ...state,
        expedicoes: state.expedicoes.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload.data } : e
        )
      };

    default:
      return state;
  }
}
