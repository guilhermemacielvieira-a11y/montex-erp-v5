import { describe, it, expect } from 'vitest';
import { normalizarHistorico, qtdMovida, produtividadeFuncionarios } from './biProducao';
import {
  eventosProducao, intervaloPeriodo, resumoSetores, serieTemporal, agrupar, produtividadePessoas,
  perfilDiaSemana, progressoObras, diasUteis, variacaoPct,
} from './biAnaliseProducao';

const pecas = [
  { id: 'P1', obra_id: 'o1', etapa: 'expedido', peso_total: 200, quantidade: 2, marca: 'C1', tipo: 'COLUNA' },
  { id: 'P2', obra_id: 'o1', etapa: 'solda', peso_total: 100, quantidade: 1, marca: 'V1', tipo: 'VIGA' },
  { id: 'P3', obra_id: 'o2', etapa: 'aguardando', peso_total: 50, quantidade: 1, marca: 'T1', tipo: 'TERCA' },
];
const h = (peca, de, para, data, func, obs = '') => ({ peca_id: peca, etapa_de: de, etapa_para: para, data_inicio: `${data}T00:00:00+00:00`, funcionario_nome: func, observacoes: obs });
const historico = [
  h('P1', 'fabricacao', 'solda', '2026-10-05', 'Ana', '[QTD:2/2]'),
  h('P1', 'fabricacao', 'solda', '2026-10-05', 'Ana', '[QTD:2/2]'), // duplicata exata
  h('P1', 'fabricacao', 'solda', '2026-10-05', 'Ana', '[QTD:2/2]'), // duplicata exata
  h('P1', 'solda', 'pintura', '2026-10-06', 'Bia', '[QTD:1/2]'), // parcial
  h('P1', 'solda', 'pintura', '2026-10-07', 'Bia', '[QTD:1/1]'),
  h('P1', 'solda', 'pintura', '2026-10-08', 'Bia', '[QTD:1/1]'), // excede a quantidade da peça
  h('P1', 'pintura', 'expedido', '2026-10-09', 'Caio', ''),
  h('P2', 'fabricacao', 'solda', '2026-10-10', 'Ana', ''),
  h('P2', 'solda', 'fabricacao', '2026-10-11', 'Ana', ''), // retrocesso
  h('P2', 'fabricacao', 'solda', '2026-10-12', 'Ana', ''), // conclui de novo → excedente
  h('PX', 'fabricacao', 'solda', '2026-10-12', 'Ana', ''), // órfã
];
const expedicoes = [
  { id: 'r1', obra_id: 'o1', status: 'entregue', peso_total: 180, data_saida: '2026-10-09' },
  { id: 'r2', obra_id: 'o1', status: 'PREPARANDO', peso_total: 999, data_saida: '2026-10-09' },
  { id: 'r3', obra_id: 'o1', status: 'entregue', peso_total: 50, data_saida: '2026-10-09', deleted_at: '2026-10-10' },
];
const hoje = new Date(2026, 9, 15);

describe('normalizarHistorico', () => {
  it('lê [QTD:x/y]', () => {
    expect(qtdMovida('[QTD:3/10] ok')).toBe(3);
    expect(qtdMovida('sem')).toBeNull();
  });

  it('remove duplicatas, usa quantidade parcial e limita à quantidade da peça', () => {
    const { transicoes, diag } = normalizarHistorico(historico, pecas);
    expect(diag.brutos).toBe(11);
    expect(diag.orfaos).toBe(1);
    expect(diag.duplicados).toBe(2);
    expect(diag.retrocessos).toBe(1);
    expect(diag.excedentes).toBe(2); // 3ª pintura de P1 e 2ª fabricação de P2
    const fabP1 = transicoes.filter((t) => t.pecaId === 'P1' && t.de === 'fabricacao');
    expect(fabP1).toHaveLength(1);
    expect(fabP1[0].kg).toBe(200);
    const soldaP1 = transicoes.filter((t) => t.pecaId === 'P1' && t.de === 'solda').map((t) => t.kg);
    expect(soldaP1).toEqual([100, 100, 0]);
    const fabP2 = transicoes.filter((t) => t.pecaId === 'P2' && t.de === 'fabricacao' && t.para === 'solda').map((t) => t.kg);
    expect(fabP2).toEqual([100, 0]);
  });

  it('ranking de funcionários ignora excedentes', () => {
    const { transicoes } = normalizarHistorico(historico, pecas);
    const r = produtividadeFuncionarios(transicoes, { hoje, dias: 30 });
    expect(r.find((x) => x.funcionario === 'Ana')).toMatchObject({ kg: 300, pecas: 2 });
  });
});

describe('biAnaliseProducao', () => {
  const { transicoes } = normalizarHistorico(historico, pecas);
  const ev = eventosProducao(transicoes, expedicoes);

  it('eventos por setor (sem retrocesso, excedente nem romaneio em preparo/excluído)', () => {
    const kg = (s) => ev.filter((e) => e.setor === s).reduce((a, e) => a + e.kg, 0);
    expect(kg('fabricacao')).toBe(300);
    expect(kg('solda')).toBe(200);
    expect(kg('pintura')).toBe(200);
    expect(kg('expedicao')).toBe(180);
  });

  it('intervalos e período anterior', () => {
    const p7 = intervaloPeriodo('7d', { hoje });
    expect(p7.dias).toBe(7);
    expect(p7.ini).toEqual(new Date(2026, 9, 9));
    expect(p7.fimAnt).toEqual(new Date(2026, 9, 8));
    expect(p7.iniAnt).toEqual(new Date(2026, 9, 2));
    const pm = intervaloPeriodo('mesAnterior', { hoje });
    expect(pm.ini).toEqual(new Date(2026, 8, 1));
    expect(pm.fim).toEqual(new Date(2026, 8, 30));
    expect(pm.iniAnt).toEqual(new Date(2026, 7, 1));
    const pc = intervaloPeriodo('custom', { hoje, ini: '2026-10-10', fim: '2026-10-01' });
    expect(pc.ini).toEqual(new Date(2026, 9, 1));
  });

  it('dias úteis e variação', () => {
    expect(diasUteis(new Date(2026, 9, 5), new Date(2026, 9, 11), hoje)).toBe(5);
    expect(variacaoPct(150, 100)).toBe(50);
    expect(variacaoPct(10, 0)).toBeNull();
  });

  it('resumo por setor no período', () => {
    const r = resumoSetores(ev, { ini: new Date(2026, 9, 1), fim: hoje, hoje });
    const solda = r.find((x) => x.setor === 'solda');
    expect(solda.kg).toBe(200);
    expect(solda.diasComProducao).toBe(2);
    expect(solda.melhorDia.kg).toBe(100);
    expect(solda.mediaDiaUtil).toBe(r1(200 / 11));
  });

  it('série diária contínua e mensal', () => {
    const s = serieTemporal(ev, { ini: new Date(2026, 9, 4), fim: new Date(2026, 9, 10), granularidade: 'dia' });
    expect(s).toHaveLength(7);
    expect(s.find((x) => x.chave === '2026-10-05').fabricacao).toBe(200);
    expect(s.find((x) => x.chave === '2026-10-04').fimDeSemana).toBe(true);
    const m = serieTemporal(ev, { ini: new Date(2026, 8, 1), fim: hoje, granularidade: 'mes' });
    expect(m.map((x) => x.chave)).toEqual(['2026-09', '2026-10']);
    expect(m[1].expedicao).toBe(180);
  });

  it('agrupamentos e pessoas', () => {
    const porObra = agrupar(ev, (e) => e.obraId);
    expect(porObra[0]).toMatchObject({ chave: 'o1', total: 880 });
    const pessoas = produtividadePessoas(ev);
    expect(pessoas.find((p) => p.chave === 'Bia')).toMatchObject({ solda: 200, setorPrincipal: 'solda', dias: 2, kgDia: 100 });
    const dow = perfilDiaSemana(ev, { ini: new Date(2026, 9, 5), fim: new Date(2026, 9, 11) });
    expect(dow[0]).toMatchObject({ dia: 'Seg', fabricacao: 200 });
  });

  it('progresso e previsão por obra', () => {
    const r = progressoObras({ obras: [{ id: 'o1', nome: 'Obra 1' }, { id: 'o2', nome: 'Obra 2' }, { id: 'o3' }], pecas, eventos: ev, hoje });
    expect(r).toHaveLength(2);
    const o1 = r.find((x) => x.id === 'o1');
    expect(o1).toMatchObject({ pesoTotal: 300, pronto: 200, restante: 100, ritmoKgSemana: 50, semanasRestantes: 2 });
    expect(o1.previsaoTermino).toEqual(new Date(2026, 9, 29));
  });
});

function r1(v) { return Math.round(v * 10) / 10; }
