import { describe, it, expect } from 'vitest';
import { receitaAppToRow, receitaRowToApp, receitasLegadasPendentes } from '@/utils/receitasManuaisModel';

describe('receitaAppToRow', () => {
  it('converte receita legada do localStorage', () => {
    const row = receitaAppToRow({
      id: 'REC-1', descricao: 'Venda sucata', cliente: '-', categoria: 'Venda Material',
      valor: '1.234,56', status: 'paga', formaPagto: 'PIX',
      data: '2026-05-10', vencimento: '15/05/2026',
    }, { hoje: '2026-06-01' });
    expect(row).toMatchObject({
      id: 'REC-1', descricao: 'Venda sucata', cliente: null, categoria: 'Venda Material',
      valor_bruto: 1234.56, valor_liquido: null, status: 'recebido', forma_pagto: 'PIX',
      data_emissao: '2026-05-10', data_vencimento: '2026-05-15', data_recebimento: '2026-05-15',
      obra_id: null,
    });
  });
  it('recebido sem vencimento passado usa hoje como data de recebimento', () => {
    const row = receitaAppToRow({ id: 'x', valor: 10, status: 'recebido', vencimento: '2026-12-01' }, { hoje: '2026-06-01' });
    expect(row.data_recebimento).toBe('2026-06-01');
  });
  it('status não-recebido zera data_recebimento; faturado continua faturado', () => {
    const row = receitaAppToRow({ id: 'x', valor: 10, status: 'faturado', dataRecebimento: '2026-01-01' });
    expect(row.status).toBe('faturado');
    expect(row.data_recebimento).toBeNull();
  });
  it('pendente/atrasado legado viram aberto; obraId preservado', () => {
    const row = receitaAppToRow({ id: 'x', valor: 5, status: 'atrasado', obraId: 'obra-001' });
    expect(row.status).toBe('aberto');
    expect(row.obra_id).toBe('obra-001');
  });
});

describe('receitaRowToApp', () => {
  it('converte linha do banco', () => {
    const app = receitaRowToApp({
      id: 'R1', obra_id: null, descricao: 'Adiantamento', cliente: 'ACME', categoria: 'Adiantamento',
      valor_bruto: '1000.50', valor_liquido: null, data_emissao: '2026-05-01', data_vencimento: '2026-05-20',
      data_recebimento: null, status: 'aberto', forma_pagto: null, observacoes: null,
    });
    expect(app).toMatchObject({
      id: 'R1', valor: 1000.5, valorLiquido: 1000.5, status: 'aberto', data: '2026-05-01',
      vencimento: '2026-05-20', cliente: 'ACME', formaPagto: '-', origemObra: false,
    });
  });
  it('null → null', () => expect(receitaRowToApp(null)).toBeNull());
  it('ida e volta preserva os campos principais', () => {
    const original = { id: 'R2', descricao: 'd', cliente: 'c', categoria: 'Outros', valor: 99.9, status: 'recebido',
      formaPagto: 'Boleto', data: '2026-02-01', vencimento: '2026-02-10', dataRecebimento: '2026-02-11', obraId: 'obra-002' };
    const volta = receitaRowToApp(receitaAppToRow(original));
    expect(volta).toMatchObject({ id: 'R2', valor: 99.9, status: 'recebido', vencimento: '2026-02-10',
      dataRecebimento: '2026-02-11', obraId: 'obra-002', formaPagto: 'Boleto' });
  });
});

describe('receitasLegadasPendentes', () => {
  it('ignora já importadas, tombstones, duplicadas, sem id e de obra', () => {
    const legadas = [
      { id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'a' }, { descricao: 'sem id' }, { id: 'm1', origemObra: true }, null,
    ];
    const res = receitasLegadasPendentes(legadas, ['b'], ['c']);
    expect(res.map(r => r.id)).toEqual(['a']);
  });
});
