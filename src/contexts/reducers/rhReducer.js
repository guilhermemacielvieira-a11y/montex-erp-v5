/**
 * MONTEX ERP Premium - Reducer de RH (Recursos Humanos)
 *
 * Gerencia operações CRUD de:
 * - Funcionários (add, update, delete)
 * - Equipes (add, update, delete, alocar)
 * - Máquinas (equipamentos)
 */

import { ACTIONS } from '../actions';

export function rhReducer(state, action) {
  switch (action.type) {
    // ====== FUNCIONÁRIOS ======
    case ACTIONS.ADD_FUNCIONARIO:
      return {
        ...state,
        funcionarios: [...state.funcionarios, action.payload]
      };

    case ACTIONS.UPDATE_FUNCIONARIO:
      return {
        ...state,
        funcionarios: state.funcionarios.map(f =>
          f.id === action.payload.id ? { ...f, ...action.payload.data } : f
        )
      };

    case ACTIONS.DELETE_FUNCIONARIO:
      return {
        ...state,
        funcionarios: state.funcionarios.filter(f => f.id !== action.payload)
      };

    // ====== EQUIPES ======
    case ACTIONS.ADD_EQUIPE:
      return {
        ...state,
        equipes: [...state.equipes, action.payload]
      };

    case ACTIONS.UPDATE_EQUIPE:
      return {
        ...state,
        equipes: state.equipes.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload.data } : e
        )
      };

    case ACTIONS.DELETE_EQUIPE:
      return {
        ...state,
        equipes: state.equipes.filter(e => e.id !== action.payload)
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

    // ====== MÁQUINAS ======
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
