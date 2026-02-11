/**
 * MONTEX ERP Premium - Reducer de Medições
 *
 * Gerencia operações relacionadas a medições:
 * - Adição de medições
 * - Atualização de configuração de medição
 */

import { ACTIONS } from '../actions';

export function medicoesReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ADD_MEDICAO:
      return {
        ...state,
        medicoes: [...state.medicoes, action.payload]
      };

    case ACTIONS.UPDATE_CONFIG_MEDICAO:
      return {
        ...state,
        configMedicao: {
          ...state.configMedicao,
          [action.payload.tipo]: {
            ...state.configMedicao[action.payload.tipo],
            [action.payload.etapa]: action.payload.config
          }
        }
      };

    default:
      return state;
  }
}
