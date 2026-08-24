import { describe, it, expect } from 'vitest';
import {
  ETAPAS_REL, etapaPeca, qtdPeca, pesoPeca,
  resumoProducao, porFuncionario, pecasPorEtapa, bloqueioFabricacao, fabricabilidadePecas,
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
    { perfil: 'HP250X62', status: 'faltando', falta: 2578.3 },      // zerado
    { perfil: 'W200X19.3', status: 'entregue', falta: 0 },
    { perfil: 'UE250X85X25X2', status: 'parcial', falta: 33510.1 }, // chegou parte
  ];
  const pecasT = [
    { marca: 'C1', perfil: 'HP250X62', material: 'A572', quantidade: 2, pesoTotal: 500, etapa: 'aguardando' },  // bloqueada (faltando)
    { marca: 'C2', perfil: 'HP250X62', material: 'A572', quantidade: 1, pesoTotal: 250, etapa: 'solda' },        // já em solda → ignora
    { marca: 'V1', perfil: 'W200X19.3', material: 'A572', quantidade: 3, pesoTotal: 900, etapa: 'aguardando' },  // ok (entregue)
    { marca: 'U1', perfil: 'UE250X85X25X2', material: 'CIVIL', quantidade: 1, pesoTotal: 300, etapa: 'fabricacao' }, // parcial (amarelo)
  ];
  const b = bloqueioFabricacao(pecasT, material);
  it('marca faltando (bloqueada) e parcial em etapa inicial', () => {
    expect(b.nBloqueadas).toBe(1);
    expect(b.bloqueadas[0].marca).toBe('C1');
    expect(b.pesoBloqueado).toBe(500);
    expect(b.perfisFaltando).toEqual(['HP250X62']);
    expect(b.nParciais).toBe(1);
    expect(b.parciais[0].marca).toBe('U1');
    expect(b.perfisParciais).toEqual(['UE250X85X25X2']);
  });
  it('mostra quanto falta comprar por perfil em cada peça', () => {
    expect(b.bloqueadas[0].faltaComprar).toBe(2578.3);
    expect(b.parciais[0].faltaComprar).toBe(33510.1);
  });
  it('ordena faltando antes de parcial', () => {
    expect(b.itens[0].status).toBe('faltando');
  });
  it('sem material → nada bloqueado', () => {
    expect(bloqueioFabricacao(pecasT, []).nBloqueadas).toBe(0);
  });
  it('agrega porPerfil (material faltante → impacto em peças)', () => {
    // 2 peças C1/C2 de HP250X62 estão em etapas diferentes: só C1 (aguardando) conta.
    const mat2 = [
      { perfil: 'HP250X62', status: 'faltando', falta: 2578.3 },
      { perfil: 'UE250X85X25X2', status: 'parcial', falta: 33510.1 },
    ];
    const pcs2 = [
      { marca: 'C1', perfil: 'HP250X62', quantidade: 2, pesoTotal: 500, etapa: 'aguardando' },
      { marca: 'C1b', perfil: 'HP250X62', quantidade: 1, pesoTotal: 250, etapa: 'fabricacao', tipo: 'COLUNA' },
      { marca: 'U1', perfil: 'UE250X85X25X2', quantidade: 1, pesoTotal: 300, etapa: 'aguardando', tipo: 'TERÇA' },
    ];
    const b = bloqueioFabricacao(pcs2, mat2);
    expect(b.porPerfil.length).toBe(2);
    const hp = b.porPerfil.find((g) => g.perfil === 'HP250X62');
    expect(hp.status).toBe('faltando');
    expect(hp.nPecas).toBe(2);          // C1 + C1b (ambas em etapa inicial)
    expect(hp.qtd).toBe(3);             // 2 + 1
    expect(hp.peso).toBe(750);          // 500 + 250
    expect(hp.faltaComprar).toBe(2578.3);
    expect(b.nPerfisFaltando).toBe(1);
    expect(b.nPerfisParciais).toBe(1);
    // faltando vem antes de parcial na ordenação
    expect(b.porPerfil[0].status).toBe('faltando');
  });
  it('NÃO colide variantes de espessura (…X2 vs …X2.25) no falta comprar', () => {
    const mat = [
      { perfil: 'UE250X85X25X2', status: 'faltando', falta: 80029.3 },
      { perfil: 'UE250X85X25X2.25', status: 'faltando', falta: 2364.3 },
    ];
    const pcs = [
      { marca: 'T1', perfil: 'UE250X85X25X2', quantidade: 1, pesoTotal: 100, etapa: 'aguardando' },
      { marca: 'S1', perfil: 'UE250X85X25X2.25', quantidade: 1, pesoTotal: 50, etapa: 'aguardando' },
    ];
    const b = bloqueioFabricacao(pcs, mat);
    const t1 = b.itens.find((i) => i.marca === 'T1');
    const s1 = b.itens.find((i) => i.marca === 'S1');
    expect(t1.faltaComprar).toBe(80029.3);   // não pode herdar o 2364.3 da variante .25
    expect(s1.faltaComprar).toBe(2364.3);
    expect(b.perfisFaltando).toEqual(['UE250X85X25X2', 'UE250X85X25X2.25']);
  });
});

describe('fabricabilidadePecas (aloca material entregue → consegue × não consegue)', () => {
  // resumoMaterialObra.linhas: { perfil, entregue, falta, status }
  const material = [
    { perfil: 'W200X19.3', entregue: 1200, falta: 0, status: 'entregue' },
    { perfil: 'HP250X62', entregue: 0, falta: 500, status: 'faltando' },
    { perfil: 'UE250X85X25X2', entregue: 300, falta: 200, status: 'parcial' },
    { perfil: 'CHAPARIA', entregue: 1000, falta: 0, status: 'entregue' },
  ];
  const pcs = [
    { marca: 'V1', perfil: 'W200X19.3', quantidade: 1, pesoTotal: 900, etapa: 'aguardando' },   // consegue
    { marca: 'V2', perfil: 'W200X19.3', quantidade: 1, pesoTotal: 300, etapa: 'fabricacao' },   // consegue
    { marca: 'C1', perfil: 'HP250X62', quantidade: 2, pesoTotal: 500, etapa: 'aguardando' },     // não (0 entregue)
    { marca: 'U1', perfil: 'UE250X85X25X2', quantidade: 1, pesoTotal: 200, etapa: 'aguardando' }, // consegue (cabe em 300)
    { marca: 'U2', perfil: 'UE250X85X25X2', quantidade: 1, pesoTotal: 200, etapa: 'aguardando' }, // não (só sobra 100)
    { marca: 'CH1', perfil: 'CH8X130', quantidade: 1, pesoTotal: 400, etapa: 'aguardando' },     // consegue (via CHAPARIA)
    { marca: 'X1', perfil: 'FOO123', quantidade: 1, pesoTotal: 50, etapa: 'aguardando' },         // sem info
    { marca: 'Z1', perfil: 'W200X19.3', quantidade: 1, pesoTotal: 999, etapa: 'solda' },          // já fabricada → ignora
  ];
  const f = fabricabilidadePecas(pcs, material);
  it('aloca material entregue: cabe → consegue; excede → não consegue', () => {
    expect(f.fabricaveis.map((x) => x.marca).sort()).toEqual(['CH1', 'U1', 'V1', 'V2']);
    expect(f.naoFabricaveis.map((x) => x.marca).sort()).toEqual(['C1', 'U2']);
    expect(f.semInfo.map((x) => x.marca)).toEqual(['X1']);
  });
  it('chapas (CH…) puxam do estoque de CHAPARIA', () => {
    expect(f.fabricaveis.find((x) => x.marca === 'CH1')).toBeTruthy();
  });
  it('ignora peças já fabricadas (além de aguardando/fabricação)', () => {
    const todas = [...f.fabricaveis, ...f.naoFabricaveis, ...f.semInfo];
    expect(todas.find((x) => x.marca === 'Z1')).toBeUndefined();
  });
  it('marca perfil parcialmente coberto', () => {
    expect(f.perfisParciais).toContain('UE250X85X25X2');
  });
  it('resumo com pesos e percentuais corretos', () => {
    expect(f.resumo.pesoFabricavel).toBe(1800);        // 900+300+200+400
    expect(f.resumo.pesoNaoFabricavel).toBe(700);       // 500+200
    expect(f.resumo.pesoSemInfo).toBe(50);
    expect(f.resumo.pesoTotal).toBe(2550);
    expect(f.resumo.pctFabricavel).toBeCloseTo(1800 / 2550 * 100, 1);
    expect(f.naoFabricaveis.find((x) => x.marca === 'C1').faltaComprar).toBe(500);
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
