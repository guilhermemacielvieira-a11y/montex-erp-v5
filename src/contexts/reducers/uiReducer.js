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

    // Tabela carregada sob demanda (ERPContext.ensureLoaded). Mescla por id:
    // linhas do banco + itens adicionados localmente antes da carga terminar
    // (ex.: IMPORTAR_MATERIAIS/IMPORTAR_LISTA) que ainda não vieram do banco.
    case ACTIONS.LAZY_TABLE_LOADED: {
      const { key, rows } = action.payload || {};
      if (!key) return state;
      const fromDb = Array.isArray(rows) ? rows : [];
      const ids = new Set(fromDb.map(r => r && r.id).filter(Boolean));
      const locais = (state[key] || []).filter(r => r && r.id && !ids.has(r.id));
      return { ...state, [key]: [...fromDb, ...locais] };
    }

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
