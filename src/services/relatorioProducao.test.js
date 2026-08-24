import { describe, it, expect } from 'vitest';
import {
  ETAPAS_REL, etapaPeca, qtdPeca, pesoPeca,
  resumoProducao, porFuncionario, pecasPorEtapa, bloqueioFabricacao,
} from './relatorioProducao';

// Mistura camel/snake de propósito.
const pecas = [
  { marca: 'C1A', perfil: 'W200X19.3', material: 'A572', quantidade: 2, pesoTotal: 300, etapa: 'fabricacao', funcionarioFabricacao: 'João' },
  { marca: 'C1B', perfil: 'W200X19.3', material: 'A572', quantidade: 1, peso_unitario: 150, etapa: 'solda', funcionario_fabricacao: 'João', funcionario_solda: 'Maria' },
  { marca: 'VM50', perfil: 'UE250', material: 'CIVIL', quantidade: 3, pesoTotal: 900, etapa: 'entregue', funcionarioExpedido: 'Pedro' },
  { marca: 'X', quantidade: 1, pesoTotal: 100, etapa: 'corte' }, // etapa desconhecida → aguardando
];

describe('helpers', () => {
  it('etapaPeca normaliza desconhecida para aguardando', () => {
    expect(etapaPeca(pecas[3])).toBe('aguardando');
    expect(etapaPeca(pecas[0])).toBe('fabricacao');
  });
  it('pesoPeca usa pesoTotal ou pesoUnitario×qtd', () => {
    expect(pesoPeca(pecas[0])).toBe(300);
    expect(pesoPeca(pecas[1])).toBe(150); // 150 × 1
    expect(qtdPeca(pecas[2])).toBe(3);
  });
});

describe('resumoProducao', () => {
  const r = resumoProducao(pecas);
  it('totais', () => {
    expect(r.totalPecas).toBe(4);
    expect(r.totalQtd).toBe(7);
    expect(r.totalPeso).toBe(1450);
  });
  it('por etapa (peso)', () => {
    const byKey = Object.fromEntries(r.porEtapa.map((e) => [e.key, e]));
    expect(byKey.fabricacao.peso).toBe(300);
    expect(byKey.solda.peso).toBe(150);
    expect(byKey.entregue.peso).toBe(900);
    expect(byKey.aguardando.peso).toBe(100);
  });
  it('progresso ponderado por peso', () => {
    // (300×1 + 150×2 + 900×6 + 100×0)/6 / 1450 = (300+300+5400)/6/1450
    expect(r.progressoPct).toBeCloseTo((300 * 1 + 150 * 2 + 900 * 6) / 6 / 1450 * 100, 1);
  });
  it('inclui todas as 7 etapas do fluxo', () => {
    expect(r.porEtapa.length).toBe(ETAPAS_REL.length);
  });
});

describe('porFuncionario', () => {
  const f = porFuncionario(pecas);
  it('agrega peso por funcionário e etapa', () => {
    const joao = f.find((x) => x.funcionario === 'João');
    expect(joao.porEtapa.fabricacao).toBe(450); // 300 + 150
    const maria = f.find((x) => x.funcionario === 'Maria');
    expect(maria.porEtapa.solda).toBe(150);
    const pedro = f.find((x) => x.funcionario === 'Pedro');
    expect(pedro.porEtapa.expedido).toBe(900);
  });
  it('ordena por peso desc', () => {
    expect(f[0].funcionario).toBe('Pedro'); // 900 (entregue) > João 450 > Maria 150
  });
});

describe('bloqueioFabricacao (peça × material faltante)', () => {
  const material = [
    { perfil: 'HP250X62', status: 'faltando' },      // zerado
    { perfil: 'W200X19.3', status: 'entregue' },
    { perfil: 'UE250X85X25X2', status: 'parcial' },
  ];
  const pecasT = [
    { marca: 'C1', perfil: 'HP250X62', material: 'A572', quantidade: 2, pesoTotal: 500, etapa: 'aguardando' },  // bloqueada (faltando)
    { marca: 'C2', perfil: 'HP250X62', material: 'A572', quantidade: 1, pesoTotal: 250, etapa: 'solda' },        // já em solda → ignora
    { marca: 'V1', perfil: 'W200X19.3', material: 'A572', quantidade: 3, pesoTotal: 900, etapa: 'aguardando' },  // ok (entregue)
    { marca: 'U1', perfil: 'UE250X85X25X2', material: 'CIVIL', quantidade: 1, pesoTotal: 300, etapa: 'fabricacao' }, // parcial → não bloqueia
  ];
  const b = bloqueioFabricacao(pecasT, material);
  it('marca só peças em etapa inicial com perfil faltando', () => {
    expect(b.nBloqueadas).toBe(1);
    expect(b.bloqueadas[0].marca).toBe('C1');
    expect(b.pesoBloqueado).toBe(500);
    expect(b.perfisFaltando).toEqual(['HP250X62']);
  });
  it('sem material → nada bloqueado', () => {
    expect(bloqueioFabricacao(pecasT, []).nBloqueadas).toBe(0);
  });
});

describe('pecasPorEtapa', () => {
  const g = pecasPorEtapa(pecas);
  it('agrupa por etapa e omite etapas vazias', () => {
    const keys = g.map((x) => x.key);
    expect(keys).toContain('fabricacao');
    expect(keys).toContain('entregue');
    expect(keys).not.toContain('pintura');
  });
});
