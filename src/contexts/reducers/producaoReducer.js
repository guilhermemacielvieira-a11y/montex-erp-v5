/**
 * MONTEX ERP Premium - Reducer de Produção
 *
 * Gerencia operações relacionadas à produção:
 * - Atualização de peças
 * - Movimentação de peças entre etapas
 * - Status de corte
 * - Adição de peças em produção
 * - Recarga de peças do Supabase
 */

import { ACTIONS } from '../actions';
import { ETAPAS_PRODUCAO, STATUS_CORTE } from '../../data/database';

export function producaoReducer(state, action) {
  switch (action.type) {
    case ACTIONS.UPDATE_PECA:
      return {
        ...state,
        pecas: state.pecas.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload.data } : p
        )
      };

    case ACTIONS.MOVER_PECA_ETAPA: {
      const { pecaId, novaEtapa, funcionarioId } = action.payload;
      const now = new Date().toISOString();

      return {
        ...state,
        pecas: state.pecas.map(p =>
          p.id === pecaId
            ? {
                ...p,
                etapa: novaEtapa,
                [`data${novaEtapa.charAt(0).toUpperCase() + novaEtapa.slice(1)}`]: now,
                [`funcionario${novaEtapa.charAt(0).toUpperCase() + novaEtapa.slice(1)}`]: funcionarioId
              }
            : p
        )
      };
    }

    case ACTIONS.UPDATE_STATUS_CORTE: {
      const { pecaId, novoStatus, maquinaId, funcionarioId } = action.payload;
      return {
        ...state,
        pecas: state.pecas.map(p =>
          p.id === pecaId
            ? {
                ...p,
                statusCorte: novoStatus,
                maquinaCorte: maquinaId || p.maquinaCorte,
                funcionarioCorte: funcionarioId || p.funcionarioCorte,
                dataCorte: novoStatus === STATUS_CORTE.LIBERADO ? new Date().toISOString().split('T')[0] : p.dataCorte
              }
            : p
        )
      };
    }

    case ACTIONS.ADD_PECAS:
      return {
        ...state,
        pecas: [...state.pecas, ...action.payload]
      };

    case 'RELOAD_PECAS':
      return {
        ...state,
        pecas: action.payload
      };

    default:
      return state;
  }
}
