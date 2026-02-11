/**
 * MONTEX ERP Premium - Reducer de Orçamentos
 *
 * Gerencia operações relacionadas a orçamentos:
 * - Criação e atualização de orçamentos
 * - Aprovação de orçamentos
 */

import { ACTIONS } from '../actions';
import { STATUS_OBRA } from '../../data/database';

export function orcamentosReducer(state, action) {
  switch (action.type) {
    case ACTIONS.UPDATE_ORCAMENTO:
      return {
        ...state,
        orcamentos: state.orcamentos.map(o =>
          o.id === action.payload.id ? { ...o, ...action.payload.data } : o
        )
      };

    case ACTIONS.ADD_ORCAMENTO:
      return {
        ...state,
        orcamentos: [...state.orcamentos, action.payload]
      };

    case ACTIONS.APROVAR_ORCAMENTO: {
      const { orcamentoId, obraId } = action.payload;
      return {
        ...state,
        orcamentos: state.orcamentos.map(o =>
          o.id === orcamentoId
            ? { ...o, status: 'aprovado', dataAprovacao: new Date().toISOString().split('T')[0] }
            : o
        ),
        obras: state.obras.map(o =>
          o.id === obraId ? { ...o, status: STATUS_OBRA.APROVADA } : o
        )
      };
    }

    default:
      return state;
  }
}
