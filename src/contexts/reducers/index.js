/**
 * MONTEX ERP Premium - Reducer Combinado
 *
 * Combina todos os reducers de domínio em um único reducer para o contexto.
 * Cada domínio gerencia sua própria fatia do estado global.
 */

import { ACTIONS } from '../actions';
import { obrasReducer } from './obrasReducer';
import { orcamentosReducer } from './orcamentosReducer';
import { estoqueReducer } from './estoqueReducer';
import { producaoReducer } from './producaoReducer';
import { expedicaoReducer } from './expedicaoReducer';
import { comprasReducer } from './comprasReducer';
import { medicoesReducer } from './medicoesReducer';
import { financeiroReducer } from './financeiroReducer';
import { rhReducer } from './rhReducer';
import { uiReducer } from './uiReducer';

/**
 * Reducer principal que combina todos os reducers de domínio
 * Despacha cada ação para o(s) reducer(es) apropriado(s)
 */
export function erpReducer(state, action) {
  // Alguns domínios podem processar a mesma ação (ex: APROVAR_ORCAMENTO afeta obras)
  // Então executamos todos os reducers e combinamos os resultados

  let newState = state;

  // Reducers que sempre executam
  newState = obrasReducer(newState, action);
  newState = orcamentosReducer(newState, action);
  newState = estoqueReducer(newState, action);
  newState = producaoReducer(newState, action);
  newState = expedicaoReducer(newState, action);
  newState = comprasReducer(newState, action);
  newState = medicoesReducer(newState, action);
  newState = financeiroReducer(newState, action);
  newState = rhReducer(newState, action);
  newState = uiReducer(newState, action);

  return newState;
}
