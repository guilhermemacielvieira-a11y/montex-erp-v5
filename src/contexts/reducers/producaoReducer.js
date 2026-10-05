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
import { ETAPAS_PRODUCAO, STATUS_CORTE } from '../../data/constants';

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
      if (!novaEtapa) return state;
      const now = new Date().toISOString();
      const sufixo = novaEtapa.charAt(0).toUpperCase() + novaEtapa.slice(1);

      return {
        ...state,
        pecas: state.pecas.map(p => {
          if (p.id !== pecaId) return p;
          const next = { ...p, etapa: novaEtapa, [`data${sufixo}`]: now };
          // Só sobrescreve o funcionário da etapa quando informado (antes
          // gravava `undefined` e apagava o responsável já registrado).
          if (funcionarioId) next[`funcionario${sufixo}`] = funcionarioId;
          return next;
        })
      };
    }

    // Restaura a peça inteira (rollback de atualização otimista que falhou no banco)
    case 'RESTORE_PECA': {
      const peca = action.payload;
      if (!peca?.id) return state;
      return {
        ...state,
        pecas: state.pecas.map(p => (p.id === peca.id ? peca : p))
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
