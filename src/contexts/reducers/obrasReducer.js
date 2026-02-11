/**
 * MONTEX ERP Premium - Reducer de Obras (Projetos)
 *
 * Gerencia operações relacionadas a obras/projetos:
 * - Seleção de obra atual
 * - Atualização de dados da obra
 * - Criação de novas obras
 * - Progresso e status de produção
 */

import { ACTIONS } from '../actions';
import { STATUS_OBRA } from '../../data/database';

export function obrasReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_OBRA_ATUAL:
      return { ...state, obraAtual: action.payload };

    case ACTIONS.UPDATE_OBRA:
      return {
        ...state,
        obras: state.obras.map(o =>
          o.id === action.payload.id ? { ...o, ...action.payload.data } : o
        )
      };

    case ACTIONS.ADD_OBRA:
      return {
        ...state,
        obras: [...state.obras, action.payload]
      };

    case ACTIONS.UPDATE_PROGRESSO_OBRA:
      return {
        ...state,
        obras: state.obras.map(o =>
          o.id === action.payload.obraId
            ? { ...o, progresso: { ...o.progresso, ...action.payload.progresso } }
            : o
        )
      };

    default:
      return state;
  }
}
