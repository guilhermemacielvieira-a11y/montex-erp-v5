/**
 * MONTEX ERP Premium - Reducer de RH (Recursos Humanos)
 *
 * Gerencia operações relacionadas a recursos humanos:
 * - Atualização de funcionários
 * - Atualização de equipes
 * - Alocação de equipes a obras
 * - Atualização de máquinas (equipamentos)
 */

import { ACTIONS } from '../actions';

export function rhReducer(state, action) {
  switch (action.type) {
    case ACTIONS.UPDATE_FUNCIONARIO:
      return {
        ...state,
        funcionarios: state.funcionarios.map(f =>
          f.id === action.payload.id ? { ...f, ...action.payload.data } : f
        )
      };

    case ACTIONS.UPDATE_EQUIPE:
      return {
        ...state,
        equipes: state.equipes.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload.data } : e
        )
      };

    case ACTIONS.ALOCAR_EQUIPE: {
      const { equipeId, obraId } = action.payload;
      return {
        ...state,
        equipes: state.equipes.map(e =>
          e.id === equipeId ? { ...e, obraAtual: obraId } : e
        )
      };
    }

    case ACTIONS.UPDATE_MAQUINA:
      return {
        ...state,
        maquinas: state.maquinas.map(m =>
          m.id === action.payload.id ? { ...m, ...action.payload.data } : m
        )
      };

    default:
      return state;
  }
}
