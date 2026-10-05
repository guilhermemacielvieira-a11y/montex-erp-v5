import { describe, it, expect } from 'vitest';
import {
  normalizarStatusRomaneio, isStatusRomaneioValido, isRomaneioDespachado,
  hojeLocalISO, escapeHtml, planejarRomaneio, calcularReservasRomaneios,
  montarPayloadCriarRomaneio, itensDoRomaneio,
} from './romaneio';

describe('normalizarStatusRomaneio', () => {
  it('converte maiúsculas/acentos/espaços para o valor canônico', () => {
    expect(normalizarStatusRomaneio('ENTREGUE')).toBe('entregue');
    expect(normalizarStatusRomaneio('EM_TRANSITO')).toBe('em_transito');
    expect(normalizarStatusRomaneio('Em Trânsito')).toBe('em_transito');
    expect(normalizarStatusRomaneio(' Aguardando Transporte ')).toBe('aguardando_transporte');
    expect(normalizarStatusRomaneio('PREPARANDO')).toBe('preparando');
    expect(normalizarStatusRomaneio(null)).toBe('');
    expect(normalizarStatusRomaneio('')).toBe('');
  });
  it('valida e identifica despacho', () => {
    expect(isStatusRomaneioValido('PROBLEMA')).toBe(true);
    expect(isStatusRomaneioValido('enviado')).toBe(false);
    expect(isRomaneioDespachado('ENTREGUE')).toBe(true);
    expect(isRomaneioDespachado('em_transito')).toBe(true);
    expect(isRomaneioDespachado('preparando')).toBe(false);
    expect(isRomaneioDespachado('problema')).toBe(false);
  });
});

describe('hojeLocalISO', () => {
  it('usa a data local (não UTC)', () => {
    // 23h30 local de 15/05 — toISOString poderia virar 16/05 em UTC-3
    expect(hojeLocalISO(new Date(2026, 4, 15, 23, 30))).toBe('2026-05-15');
    expect(hojeLocalISO(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });
});

describe('escapeHtml', () => {
  it('escapa caracteres perigosos', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(escapeHtml("A & B's")).toBe('A &amp; B&#39;s');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(12)).toBe('12');
  });
});

describe('planejarRomaneio', () => {
  const pecas = [
    { id: 'PEC-0001', marca: 'C1A', quantidade: 10, obra_id: 'obra-001' },
    { id: 'PEC-0002', marca: 'VM50A', quantidade: 2, obraId: 'obra-001' },
  ];
  it('deriva a obra das peças e marca parciais', () => {
    const r = planejarRomaneio(pecas, { 'PEC-0001': 4 });
    expect(r.ok).toBe(true);
    expect(r.obraId).toBe('obra-001');
    expect(r.itens).toEqual([
      { id: 'PEC-0001', qtd: 4, qtdDisponivel: 10, parcial: true },
      { id: 'PEC-0002', qtd: 2, qtdDisponivel: 2, parcial: false },
    ]);
  });
  it('bloqueia mistura de obras', () => {
    const r = planejarRomaneio([...pecas, { id: 'PEC-0003', quantidade: 1, obra_id: 'obra-002' }]);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/misturar obras/);
  });
  it('bloqueia peça sem obra, lista vazia, qtd inválida e acima do disponível', () => {
    expect(planejarRomaneio([]).ok).toBe(false);
    expect(planejarRomaneio([{ id: 'X', quantidade: 1 }]).erro).toMatch(/sem obra/);
    expect(planejarRomaneio(pecas, { 'PEC-0001': 0 }).ok).toBe(false);
    expect(planejarRomaneio(pecas, { 'PEC-0001': 11 }).erro).toMatch(/maior que a disponível/);
    expect(planejarRomaneio([pecas[0], pecas[0]]).erro).toMatch(/repetida/);
  });
});

describe('calcularReservasRomaneios', () => {
  it('reserva tudo que está em romaneio ativo e separa parciais legados despachados', () => {
    const exps = [
      { id: 'A', status: 'preparando', pecas: [{ id: 'P1__split_enviado_A', qtd_enviada: 4, qtd_total: 4 }, { id: 'P2', qtd_enviada: 2, qtd_total: 2 }] },
      { id: 'L', status: 'ENTREGUE', pecas: [{ id: 'P3', qtd_enviada: 3, qtd_total: 10 }] },
      { id: 'OLD', status: 'entregue', pecas: ['P4'] },
      { id: 'DEL', status: 'preparando', deleted_at: '2026-10-01', pecas: [{ id: 'P5', qtd_enviada: 1, qtd_total: 1 }] },
    ];
    const { reservada, enviadaLegado } = calcularReservasRomaneios(exps);
    expect(reservada['P1__split_enviado_A']).toBe(4);
    expect(reservada.P2).toBe(2);
    expect(reservada.P3).toBe(3);
    expect(reservada.P4).toBe(Infinity);
    expect(reservada.P5).toBeUndefined();
    expect(enviadaLegado).toEqual({ P3: 3 });
  });
});

describe('itensDoRomaneio / montarPayloadCriarRomaneio', () => {
  it('aceita ids soltos e objetos', () => {
    expect(itensDoRomaneio({ pecas: ['A', { id: 'B', qtd_enviada: 1 }, null] })).toEqual([{ id: 'A' }, { id: 'B', qtd_enviada: 1 }]);
  });
  it('monta payload com status minúsculo e data local', () => {
    const p = montarPayloadCriarRomaneio({ numero: 'ENV-1', status: 'PREPARANDO', itens: [{ id: 'P1', qtd: '3' }], data: '2026-10-05' });
    expect(p).toMatchObject({ numero_romaneio: 'ENV-1', status: 'preparando', data_expedicao: '2026-10-05', pecas: [{ id: 'P1', qtd: 3 }] });
    expect(p.id).toBeUndefined();
  });
});
