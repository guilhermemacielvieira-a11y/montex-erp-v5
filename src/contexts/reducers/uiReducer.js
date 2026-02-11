/**
 * MONTEX ERP Premium - Reducer de UI (Interface de Usuário)
 *
 * Gerencia operações relacionadas à interface:
 * - Filtros de dados
 * - Estado de carregamento
 * - Notificações
 * - Listas de materiais importadas
 * - Inicialização do Supabase
 */

import { ACTIONS } from '../actions';

export function uiReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_FILTROS:
      return {
        ...state,
        filtros: { ...state.filtros, ...action.payload }
      };

    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case ACTIONS.ADD_NOTIFICACAO:
      return {
        ...state,
        notificacoes: [...state.notificacoes, { id: Date.now(), ...action.payload }]
      };

    case ACTIONS.REMOVE_NOTIFICACAO:
      return {
        ...state,
        notificacoes: state.notificacoes.filter(n => n.id !== action.payload)
      };

    case ACTIONS.IMPORTAR_LISTA:
      return {
        ...state,
        listas: [...state.listas, action.payload]
      };

    case ACTIONS.INIT_FROM_SUPABASE:
      return {
        ...state,
        ...action.payload,
        loading: false
      };

    default:
      return state;
  }
}
