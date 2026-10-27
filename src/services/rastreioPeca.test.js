import { describe, it, expect } from 'vitest';
import { rastrearMarca, sugerirMarcas } from './rastreioPeca';

// Recorte real da TS55A da obra-003 (3 unidades, 2 divididas)
const pecas = [
  { id: 'PEC-36-TS55A', obra_id: 'o3', marca: 'TS55A', tipo: 'TESOURA', quantidade: 1, peso_total: 528.64, etapa: 'expedido', funcionario_fabricacao: 'F18', data_inicio_fabricacao: '2026-10-19 03:00:00+00', data_fim_real: '2026-10-27' },
  { id: 'PEC-36-TS55A__split_solda_1', obra_id: 'o3', marca: 'TS55A', tipo: 'TESOURA', quantidade: 1, peso_total: 528.63, etapa: 'enviado' },
  { id: 'PEC-36-TS55A__split_solda_2', obra_id: 'o3', marca: 'TS55A', tipo: 'TESOURA', quantidade: 1, peso_total: 528.64, etapa: 'enviado' },
  { id: 'PEC-0425', obra_id: 'o1', marca: 'TS55A', tipo: 'TESOURA', quantidade: 4, peso_total: 168.2, etapa: 'enviado' },
  { id: 'PEC-X', obra_id: 'o3', marca: 'TS5', tipo: 'TESOURA', quantidade: 2, peso_total: 10, etapa: 'aguardando' },
];
const h = (id, peca, de, para, dia, func, nome, obs, reg) => ({ id, peca_id: peca, etapa_de: de, etapa_para: para, data_inicio: `2026-${dia} 03:00:00+00`, funcionario_id: func, funcionario_nome: nome, observacoes: obs, created_at: reg ? `2026-${reg}T12:00:00Z` : undefined });
const historico = [
  // unidade 1 (virou split_1): mãe [QTD:1/3] e a dividida [QTD:1/1] no mesmo dia → 1 evento
  h('a', 'PEC-36-TS55A', 'fabricacao', 'solda', '08-24', 'F1', 'Flavio Pereira', '[QTD:1/3]', '08-27'),
  // solda da mãe: [1/3] registrada em 27/08 era da unidade dividida; a da unidade
  // que ficou na mãe foi registrada depois (20/10), com data de apontamento anterior
  h('s1', 'PEC-36-TS55A', 'solda', 'pintura', '08-25', 'F9', 'Gilmar', '[QTD:1/3]', '08-27'),
  h('s2', 'PEC-36-TS55A', 'solda', 'pintura', '08-19', 'F17', 'Luiz', '[QTD:1/1]', '10-20'),
  h('b', 'PEC-36-TS55A__split_solda_1', 'fabricacao', 'solda', '08-24', 'F1', 'Flavio Pereira', '[QTD:1/1]'),
  h('c', 'PEC-36-TS55A__split_solda_1', 'solda', 'pintura', '08-25', 'F9', 'Gilmar', '[QTD:1/1]'),
  h('d', 'PEC-36-TS55A__split_solda_1', 'pintura', 'expedido', '08-25', 'F8', 'Flavio Santos', '[QTD:1/1]'),
  // unidade restante: duplicata exata gravada 2×
  h('e', 'PEC-36-TS55A', 'fabricacao', 'solda', '10-19', 'F18', 'Ricardo', '[QTD:1/1]', '10-20'),
  h('f', 'PEC-36-TS55A', 'fabricacao', 'solda', '10-19', 'F18', 'Ricardo', '[QTD:1/1]', '10-27'),
  h('g', 'PEC-36-TS55A', 'pintura', 'expedido', '10-26', 'F8', 'Flavio Santos', '[QTD:1/1]', '10-27'),
];
const expedicoes = [
  { id: 'E1', obra_id: 'o3', numero_romaneio: 'CARGA 01', status: 'entregue', data_saida: '2026-08-26', data_entrega: '2026-08-26', motorista: 'DANIEL', transportadora: 'DANIEL TRANSPORTES', pecas: [{ id: 'PEC-36-TS55A__split_solda_1', qtd_total: 1, qtd_enviada: 1 }] },
  { id: 'E2', obra_id: 'o3', numero_romaneio: 'CARGA 13', status: 'entregue', data_saida: '2026-10-16', data_entrega: '2026-10-16', pecas: [{ id: 'PEC-36-TS55A__split_solda_2', qtd_total: 1, qtd_enviada: 1 }] },
  { id: 'E3', obra_id: 'o3', numero_romaneio: 'CARGA 99', status: 'entregue', deleted_at: '2026-10-20', data_saida: '2026-10-20', pecas: [{ id: 'PEC-36-TS55A', qtd_enviada: 1 }] },
];
const cortes = [
  { id: 'MC1', obra_id: 'o3', marca: 'TS55A', perfil: 'L64', quantidade: 3, peso_teorico: 100, status_corte: 'finalizado', data_fim: '2026-08-20T10:00:00', funcionario_corte: 'F30' },
  { id: 'MC2', obra_id: 'o3', marca: '501', perfil: 'CH8', quantidade: 6, peso_teorico: 20, status_corte: 'aguardando' },
];
const montagem = { 'PEC-36-TS55A__split_solda_1': { montadoEm: '2026-09-02T12:00:00+00:00', dataMontagem: '02/09' } };
const funcionarios = [{ id: 'F30', nome: 'Zé do Corte' }, { id: 'F18', nome: 'Ricardo' }];

describe('rastreioPeca', () => {
  it('sugere marcas pelo termo (prefixo e menor primeiro)', () => {
    const s = sugerirMarcas(pecas, 'ts5');
    expect(s.map((x) => x.marca)).toEqual(['TS5', 'TS55A']);
    expect(s[1]).toMatchObject({ qtd: 7, obras: 2 });
    expect(sugerirMarcas(pecas, '')).toEqual([]);
  });

  it('separa por obra e respeita o escopo', () => {
    expect(rastrearMarca({ marca: 'ts55a', pecas }).map((b) => b.obraId)).toEqual(['o1', 'o3']);
    expect(rastrearMarca({ marca: 'TS55A', pecas, obraIds: ['o3'] })).toHaveLength(1);
  });

  it('monta o fluxo completo: corte → fab → solda → pintura → carga → entrega → montagem', () => {
    const [b] = rastrearMarca({ marca: 'TS55A', pecas, historico, cortes, composicao: [{ obra_id: 'o3', marca: 'TS55A', pos: '501' }], expedicoes, montagem, funcionarios, obraIds: ['o3'], obras: [{ id: 'o3', nome: 'SPASSO' }] });
    expect(b).toMatchObject({ obraNome: 'SPASSO', qtdTotal: 3, porEtapa: { expedido: 1, enviado: 2 } });
    // duplicatas: 9 registros → 6 eventos (mãe+dividida no mesmo dia/funcionário viram 1; duplicata exata some)
    expect(b.apontamentos).toBe(6);
    expect(b.apontamentosBrutos).toBe(9);
    const u1 = b.unidades.find((u) => u.pecaId.endsWith('_1'));
    expect(u1.etapas.fabricacao).toMatchObject({ funcionario: 'Flavio Pereira', fonte: 'apontamento' });
    expect(u1.etapas.pintura.data).toEqual(new Date(2026, 7, 25));
    expect(u1.carga).toMatchObject({ numero: 'CARGA 01', motorista: 'DANIEL' });
    expect(u1.montado.texto).toBe('02/09');
    const mae = b.unidades[0];
    expect(mae.pecaId).toBe('PEC-36-TS55A');
    expect(mae.etapas.fabricacao.data).toEqual(new Date(2026, 9, 19));
    expect(mae.etapas.solda).toMatchObject({ funcionario: 'Luiz', data: new Date(2026, 7, 19) });
    expect(mae.carga).toBeNull(); // romaneio excluído não conta
    // corte: POS própria + POS da composição
    expect(b.corte.map((c) => c.pos)).toEqual(['TS55A', '501']);
    expect(b.corte[0]).toMatchObject({ status: 'cortado', funcionario: 'Zé do Corte' });
    // marcos
    expect(b.marcos.carregamento).toMatchObject({ feito: 2, total: 3, inicio: new Date(2026, 7, 26), fim: new Date(2026, 9, 16) });
    expect(b.marcos.montagem).toMatchObject({ feito: 1 });
    expect(b.marcos.pintura.fim).toEqual(new Date(2026, 9, 26));
    // linha do tempo em ordem
    const tipos = b.eventos.map((e) => e.tipo);
    expect(tipos).toContain('corte');
    expect(tipos).toContain('montagem');
    expect(b.eventos.filter((e) => e.tipo === 'carregamento').map((e) => e.titulo)).toEqual(['Carregada — romaneio CARGA 01', 'Carregada — romaneio CARGA 13']);
    for (let i = 1; i < b.eventos.length; i++) expect(b.eventos[i].data >= b.eventos[i - 1].data).toBe(true);
  });

  it('linha do tempo e fluxo separados por unidade', () => {
    const [b] = rastrearMarca({ marca: 'TS55A', pecas, historico, cortes, expedicoes, montagem, funcionarios, obraIds: ['o3'] });
    const [mae, u1, u2] = b.unidades;
    expect([mae.numero, u1.numero, u2.numero]).toEqual([1, 2, 3]);
    // registro na mãe [1/3] + na dividida no mesmo dia → é da dividida
    const tit = (u) => u.eventos.map((e) => `${e.data.getDate()}/${e.data.getMonth() + 1} ${e.tipo}`);
    expect(tit(u1)).toEqual(['20/8 corte', '24/8 fabricacao', '25/8 solda', '25/8 pintura', '26/8 carregamento', '26/8 entrega', '2/9 montagem']);
    expect(tit(mae)).toEqual(['19/8 solda', '20/8 corte', '19/10 fabricacao', '26/10 pintura']);
    expect(tit(u2)).toEqual(['20/8 corte', '16/10 carregamento', '16/10 entrega']);
    // fluxo da unidade, etapa a etapa
    const f = Object.fromEntries(u1.fluxo.map((x) => [x.key, x]));
    expect(f.fabricacao).toMatchObject({ feito: true, funcionario: 'Flavio Pereira' });
    expect(f.carregamento).toMatchObject({ feito: true, detalhe: 'CARGA 01 · DANIEL' });
    expect(f.montagem).toMatchObject({ feito: true, detalhe: 'planilha: 02/09' });
    expect(Object.fromEntries(mae.fluxo.map((x) => [x.key, x])).carregamento.feito).toBe(false);
    // todas as unidades juntas = linha do tempo da marca
    expect(b.eventos.every((e) => !e.pecaIds || e.pecaIds.length > 0)).toBe(true);
  });

  it('etapa "não se aplica" aparece como tal', () => {
    const p = [{ id: 'T1', obra_id: 'o', marca: 'TC1', tipo: 'TERÇA', quantidade: 1, etapa: 'pintura' }];
    const hh = [h('x', 'T1', 'fabricacao', 'solda', '09-01', 'F1', 'A', '[QTD:1/1]'), h('y', 'T1', 'solda', 'pintura', '09-01', null, null, '[NA] [QTD:1/1]')];
    const [b] = rastrearMarca({ marca: 'TC1', pecas: p, historico: hh });
    expect(b.unidades[0].etapas.solda).toEqual({ naoAplica: true });
    expect(b.eventos.map((e) => e.titulo)).toContain('Solda: não se aplica');
  });
});
