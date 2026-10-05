import { describe, it, expect } from 'vitest';
import { erpReducer } from './index';
import { ACTIONS } from '../actions';

describe('LAZY_TABLE_LOADED', () => {
  it('substitui pela carga do banco mantendo itens locais ainda não persistidos', () => {
    const state = { materiaisEstoque: [{ id: 'm1', nome: 'local-antigo' }, { id: 'm9', nome: 'local-novo' }], loading: false };
    const next = erpReducer(state, {
      type: ACTIONS.LAZY_TABLE_LOADED,
      payload: { key: 'materiaisEstoque', rows: [{ id: 'm1', nome: 'banco' }, { id: 'm2', nome: 'banco2' }] },
    });
    expect(next.materiaisEstoque.map(m => m.id)).toEqual(['m1', 'm2', 'm9']);
    expect(next.materiaisEstoque[0].nome).toBe('banco');
    expect(next.loading).toBe(false);
  });

  it('INIT_FROM_SUPABASE sem a chave preserva a tabela carregada sob demanda', () => {
    const state = { movimentacoesEstoque: [{ id: 'x' }], obras: [], loading: true };
    const next = erpReducer(state, { type: ACTIONS.INIT_FROM_SUPABASE, payload: { obras: [{ id: 'obra-001' }] } });
    expect(next.movimentacoesEstoque).toEqual([{ id: 'x' }]);
  });
});
