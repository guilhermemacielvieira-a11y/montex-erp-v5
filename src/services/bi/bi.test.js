import { describe, it, expect } from 'vitest';
import { chaveSemana, etapaCanonica, fabricaConcluida, mediana, percentil } from './biCore';
import { transicoesComPeca, ritmoSemanal, leadTimeEtapas, wipAtual, gargalo, tendenciaRitmo } from './biProducao';
import { indicadoresObras, curvaS, kpisExecutivos } from './biObras';
import { movimentosDoEscopo, serieMensal, aging, fluxoProjetado, abcFornecedores } from './biFinanceiro';
import { gerarAlertas, regraCustoForaCurva } from './radarAlertas';

const HOJE = new Date(2026, 9, 5); // seg 05/10/2026

const obras = [
  { id: 'o1', nome: 'Obra 1', status: 'ativo', contratoValorTotal: 1000000, contratoPesoTotal: 10000, dataInicio: '2026-08-03', dataPrevistaFim: '2026-10-12' },
  { id: 'o2', nome: 'Obra 2', status: 'ativo', contratoValorTotal: null, contratoPesoTotal: 2000, dataInicio: '2026-09-01', dataPrevistaFim: null },
];
const pecas = [
  { id: 'p1', obraId: 'o1', etapa: 'expedido', pesoTotal: 3000, marca: 'C1' },
  { id: 'p2', obraId: 'o1', etapa: 'enviado', pesoTotal: 2000, marca: 'C2' },
  { id: 'p3', obraId: 'o1', etapa: 'solda', pesoTotal: 1000, marca: 'V1' },
  { id: 'p4', obraId: 'o2', etapa: 'aguardando', pesoTotal: 2000, marca: 'X1' },
];
const historico = [
  { peca_id: 'p1', etapa_de: 'fabricacao', etapa_para: 'solda', data_inicio: '2026-09-01T00:00:00+00' },
  { peca_id: 'p1', etapa_de: 'solda', etapa_para: 'pintura', data_inicio: '2026-09-05' },
  { peca_id: 'p1', etapa_de: 'pintura', etapa_para: 'expedido', data_inicio: '2026-09-28', funcionario_nome: 'Ana' },
  { peca_id: 'p2', etapa_de: 'pintura', etapa_para: 'expedido', data_inicio: '2026-09-21', funcionario_nome: 'Ana' },
  { peca_id: 'p2', etapa_de: 'expedido', etapa_para: 'enviado', data_inicio: '2026-09-25' },
  { peca_id: 'p3', etapa_de: 'fabricacao', etapa_para: 'solda', data_inicio: '2026-08-01' },
  { peca_id: 'orfa', etapa_de: 'fabricacao', etapa_para: 'solda', data_inicio: '2026-09-01' },
];

describe('biCore', () => {
  it('semana começa na segunda e datas são locais', () => {
    expect(chaveSemana(new Date(2026, 9, 7))).toBe('2026-10-05');
    expect(chaveSemana(new Date(2026, 9, 4))).toBe('2026-09-28');
  });
  it('etapas canônicas', () => {
    expect(etapaCanonica('finalizado')).toBe('entregue');
    expect(etapaCanonica('fabricacao+solda')).toBe('solda');
    expect(etapaCanonica('corte')).toBe('aguardando');
    expect(fabricaConcluida('expedido')).toBe(true);
    expect(fabricaConcluida('pintura')).toBe(false);
  });
  it('estatística', () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([1, 2, 3, 4])).toBe(2.5);
    expect(percentil([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9);
  });
});

describe('biProducao', () => {
  const trs = transicoesComPeca(historico, pecas);
  it('ignora transições de peças inexistentes e usa data_inicio local', () => {
    expect(trs).toHaveLength(6);
    expect(trs[0].data).toEqual(new Date(2026, 7, 1));
  });
  it('ritmo semanal conta kg que concluíram cada etapa', () => {
    const r = ritmoSemanal(trs, { hoje: HOJE, semanas: 6 });
    expect(r).toHaveLength(6);
    const s0928 = r.find((x) => x.semana === '2026-09-28');
    expect(s0928.pintura).toBe(3000);
    const s0921 = r.find((x) => x.semana === '2026-09-21');
    expect(s0921.pintura).toBe(2000);
    const s0831 = r.find((x) => x.semana === '2026-08-31');
    expect(s0831.fabricacao).toBe(3000); // p1 fab→solda em 01/09
  });
  it('lead time por etapa (entrada → saída)', () => {
    const lt = leadTimeEtapas(trs);
    const solda = lt.find((l) => l.etapa === 'solda');
    expect(solda.medianaDias).toBe(4); // p1: 01/09 → 05/09
    const pintura = lt.find((l) => l.etapa === 'pintura');
    expect(pintura.medianaDias).toBe(23); // 05/09 → 28/09
  });
  it('WIP com idade e gargalo', () => {
    const w = wipAtual(pecas, trs, { hoje: HOJE });
    const soldaItem = w.itens.find((i) => i.id === 'p3');
    expect(soldaItem.idadeDias).toBe(65); // desde 01/08
    expect(w.resumo.find((x) => x.etapa === 'solda').kg).toBe(1000);
    const r = ritmoSemanal(trs, { hoje: HOJE, semanas: 6 });
    const g = gargalo(w.resumo, r);
    expect(g.etapa).toBe('solda'); // tem WIP e não saiu nada nas últimas 4 semanas
  });
  it('tendência', () => {
    const t = tendenciaRitmo([{ pintura: 100 }, { pintura: 100 }, { pintura: 200 }, { pintura: 200 }], 2);
    expect(t.variacaoPct).toBe(100);
  });
});

describe('biObras', () => {
  const trs = transicoesComPeca(historico, pecas);
  const meds = [
    { id: 'm1', obraId: 'o1', status: 'paga', valorBruto: 300000, dataMedicao: '2026-09-01' },
    { id: 'm2', obraId: 'o1', status: 'aprovada', valorBruto: 100000, dataMedicao: '2026-09-20' },
    { id: 'm3', obraId: 'o1', status: 'prevista', valorBruto: 999999, dataMedicao: '2026-09-25' },
  ];
  const ind = indicadoresObras({ obras, pecas, medicoes: meds, despesas: [], transicoes: trs, hoje: HOJE });
  const o1 = ind.find((i) => i.id === 'o1');
  it('avanço físico × financeiro', () => {
    expect(o1.kgPronto).toBe(5000);
    expect(o1.fisicoPct).toBe(50);
    expect(o1.financeiroPct).toBe(40); // previstas fora
    expect(o1.gapPp).toBe(-10);
    expect(o1.recebido).toBe(300000);
    expect(o1.aReceber).toBe(100000);
  });
  it('previsão de término pelo ritmo das últimas 4 semanas', () => {
    expect(o1.ritmoKgSemana).toBe(1250); // 5000 kg / 4 semanas
    expect(o1.kgRestante).toBe(5000);
    expect(o1.previsaoFim).toBe('2026-11-02'); // 4 semanas
    expect(o1.atrasoDias).toBe(21); // prazo 12/10
  });
  it('obra sem contrato é sinalizada', () => {
    expect(ind.find((i) => i.id === 'o2').semContrato).toBe(true);
  });
  it('curva S com plano', () => {
    const c = curvaS({ obras: [obras[0]], transicoes: trs, hoje: HOJE });
    expect(c.temPlano).toBe(true);
    const ult = c.pontos.filter((p) => p.realizado !== null).pop();
    expect(ult.realizado).toBe(5000);
    expect(c.pontos[c.pontos.length - 1].planejado).toBe(10000);
  });
  it('KPIs executivos (carteira)', () => {
    const k = kpisExecutivos(ind, { ritmoKgSemana: 1000 });
    expect(k.carteiraValor).toBe(600000);
    expect(k.carteiraKg).toBe(7000);
    expect(k.obrasEmAtraso).toBe(1);
    expect(k.obrasSemContrato).toBe(1);
  });
});

describe('biFinanceiro', () => {
  const medicoes = [
    { id: 'm1', obraId: 'o1', status: 'paga', valorBruto: 100, dataMedicao: '2026-09-10' },
    { id: 'm2', obraId: 'o1', status: 'aprovada', valorBruto: 50, dataMedicao: '2026-07-01' },
    { id: 'm3', obraId: 'o2', status: 'aguardando', valorBruto: 999, dataMedicao: '2026-09-10' },
  ];
  const despesas = [
    { id: 'd1', obraId: null, valor: 40, status: 'pago', dataEmissao: '2026-09-02', fornecedor: 'A' },
    { id: 'd2', obraId: 'o1', valor: 70, status: 'pendente', dataEmissao: '2026-09-03', dataVencimento: '2026-09-20', fornecedor: 'B' },
    { id: 'd3', obraId: null, valor: 10, status: 'pendente', dataEmissao: '2026-10-01', dataVencimento: '2026-10-09', fornecedor: 'A' },
  ];
  it('Geral = empresa: receitas pelo total, material de obra fora', () => {
    const mv = movimentosDoEscopo({ medicoes, despesas, obraIds: null });
    expect(mv.receitas.map((r) => r.id).sort()).toEqual(['m1', 'm2']);
    expect(mv.despesas.map((d) => d.id).sort()).toEqual(['d1', 'd3']);
  });
  it('Obra = só a obra', () => {
    const mv = movimentosDoEscopo({ medicoes, despesas, obraIds: ['o1'] });
    expect(mv.despesas.map((d) => d.id)).toEqual(['d2']);
  });
  it('série mensal, aging e fluxo projetado', () => {
    const mv = movimentosDoEscopo({ medicoes, despesas, obraIds: null });
    const s = serieMensal(mv, { hoje: HOJE, meses: 4 });
    expect(s.find((x) => x.mes === '2026-09')).toMatchObject({ faturado: 100, recebido: 100, despesas: 40, pago: 40 });
    const a = aging(mv, { hoje: HOJE });
    expect(a.faixas.find((f) => f.faixa === '90_mais').receber).toBe(50); // m2 de 01/07
    expect(a.receberVencido).toBe(50);
    const f = fluxoProjetado(mv, { hoje: HOJE, semanas: 2 });
    expect(f[0].entradas).toBe(50); // vencido cai na 1ª semana
    expect(f[0].saidas).toBe(10);
    expect(f[1].acumulado).toBe(40);
  });
  it('ABC de fornecedores', () => {
    const mv = movimentosDoEscopo({ medicoes, despesas, obraIds: ['o1'] });
    const abc = abcFornecedores(mv.despesas, { hoje: HOJE });
    expect(abc[0]).toMatchObject({ fornecedor: 'B', classe: 'C', pct: 100 });
  });
});

describe('radarAlertas', () => {
  it('gera alertas de peça parada, atraso, receber e pagar', () => {
    const trs = transicoesComPeca(historico, pecas);
    const ind = indicadoresObras({ obras, pecas, medicoes: [], despesas: [], transicoes: trs, hoje: HOJE });
    const w = wipAtual(pecas, trs, { hoje: HOJE });
    const mv = movimentosDoEscopo({
      medicoes: [{ id: 'm9', obraId: 'o1', status: 'aprovada', valorBruto: 5000, dataMedicao: '2026-06-01', descricao: 'Medição 9' }],
      despesas: [{ id: 'd9', valor: 800, status: 'pendente', dataEmissao: '2026-09-01', dataVencimento: '2026-09-20', fornecedor: 'Aço SA' }],
      obraIds: null,
    });
    const alertas = gerarAlertas({
      wipItens: w.itens, leadTimes: [], indicadores: ind, ritmo: [], receitas: mv.receitas, despesas: mv.despesas,
      despesasBrutas: [], estoque: [{ descricao: 'Chapa', quantidade: 0, minimo: 5, unidade: 'un' }], pecas, hoje: HOJE,
    });
    const regras = alertas.map((a) => a.regra);
    expect(regras).toContain('peca_parada');
    expect(regras).toContain('obra_atraso');
    expect(regras).toContain('receber_vencido');
    expect(regras).toContain('despesa_vencida');
    expect(regras).toContain('estoque_critico');
    expect(regras).toContain('dado_incompleto');
    // ordenado por severidade
    const ordem = { critico: 0, alto: 1, medio: 2, baixo: 3 };
    alertas.reduce((prev, a) => { expect(ordem[a.severidade]).toBeGreaterThanOrEqual(prev); return ordem[a.severidade]; }, 0);
    // ids estáveis
    const de_novo = gerarAlertas({ wipItens: w.itens, leadTimes: [], indicadores: ind, ritmo: [], receitas: mv.receitas, despesas: mv.despesas, despesasBrutas: [], estoque: [], pecas, hoje: HOJE });
    expect(de_novo.find((a) => a.regra === 'obra_atraso').id).toBe(alertas.find((a) => a.regra === 'obra_atraso').id);
  });
  it('despesa fora da curva (z ≥ 3)', () => {
    const base = Array.from({ length: 12 }, (_, i) => ({ id: `x${i}`, categoria: 'Energia', valor: 1000 + i * 10, status: 'pago', dataEmissao: '2026-09-01' }));
    const out = regraCustoForaCurva({ despesasBrutas: [...base, { id: 'big', categoria: 'Energia', valor: 50000, status: 'pago', dataEmissao: '2026-09-20' }], hoje: HOJE });
    expect(out.map((a) => a.id)).toEqual(['custo:big']);
  });
});
