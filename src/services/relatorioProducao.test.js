import { describe, it, expect } from 'vitest';
import {
  ETAPAS_REL, etapaPeca, qtdPeca, pesoPeca,
  resumoProducao, porFuncionario, pecasPorEtapa, bloqueioFabricacao, fabricabilidadePecas,
  estadoProducao,
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

describe('estadoProducao (estados consolidados)', () => {
  const e = estadoProducao(pecas);
  it('consolida etapas em estados de produção', () => {
    expect(e.naoIniciado.peso).toBe(100);        // aguardando
    expect(e.emFabricacao.peso).toBe(300);        // fabricacao
    expect(e.acabamento.peso).toBe(150);          // solda + pintura
    expect(e.entregue.peso).toBe(900);
  });
  it('agregados: já fabricado (Solda+) e em processo', () => {
    expect(e.jaFabricado.peso).toBe(150 + 900);   // solda + entregue
    expect(e.emProcesso.peso).toBe(300 + 150);    // fabricacao + solda
  });
  it('% sobre o peso total e estados macro somam o total', () => {
    expect(e.entregue.pct).toBeCloseTo(900 / 1450 * 100, 1);
    const somaEstados = e.estados.reduce((s, x) => s + x.peso, 0);
    expect(somaEstados).toBe(e.totalPeso);
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

describe('fabricabilidadePecas (desconta já fabricado do entregue → consegue × não consegue)', () => {
  // resumoMaterialObra.linhas: { perfil, entregue, falta, status }
  const material = [
    { perfil: 'W200X19.3', entregue: 1200, falta: 0, status: 'entregue' },
    { perfil: 'HP250X62', entregue: 0, falta: 500, status: 'faltando' },
    { perfil: 'UE250X85X25X2', entregue: 300, falta: 200, status: 'parcial' },
    { perfil: 'CHAPARIA', entregue: 1000, falta: 0, status: 'entregue' },
  ];
  const pcs = [
    { marca: 'V1', perfil: 'W200X19.3', quantidade: 1, pesoTotal: 900, etapa: 'aguardando' },   // não (só sobra 201)
    { marca: 'V2', perfil: 'W200X19.3', quantidade: 1, pesoTotal: 300, etapa: 'fabricacao' },   // não (só sobra 201)
    { marca: 'C1', perfil: 'HP250X62', quantidade: 2, pesoTotal: 500, etapa: 'aguardando' },     // não (0 entregue)
    { marca: 'U1', perfil: 'UE250X85X25X2', quantidade: 1, pesoTotal: 200, etapa: 'aguardando' }, // consegue (cabe em 300)
    { marca: 'U2', perfil: 'UE250X85X25X2', quantidade: 1, pesoTotal: 200, etapa: 'aguardando' }, // não (só sobra 100)
    { marca: 'CH1', perfil: 'CH8X130', quantidade: 1, pesoTotal: 400, etapa: 'aguardando' },     // consegue (via CHAPARIA)
    { marca: 'X1', perfil: 'FOO123', quantidade: 1, pesoTotal: 50, etapa: 'aguardando' },         // sem info
    { marca: 'Z1', perfil: 'W200X19.3', quantidade: 1, pesoTotal: 999, etapa: 'solda' },          // já fabricada → consome 999
  ];
  const f = fabricabilidadePecas(pcs, material);
  it('desconta o já consumido: W200 já fabricou 999, sobra 201 → V1/V2 não cabem', () => {
    expect(f.fabricaveis.map((x) => x.marca).sort()).toEqual(['CH1', 'U1']);
    expect(f.naoFabricaveis.map((x) => x.marca).sort()).toEqual(['C1', 'U2', 'V1', 'V2']);
    expect(f.semInfo.map((x) => x.marca)).toEqual(['X1']);
  });
  it('chapas (CH…) puxam do estoque de CHAPARIA', () => {
    expect(f.fabricaveis.find((x) => x.marca === 'CH1')).toBeTruthy();
  });
  it('peças já fabricadas (Solda+) não entram em consegue/não consegue', () => {
    const todas = [...f.fabricaveis, ...f.naoFabricaveis, ...f.semInfo];
    expect(todas.find((x) => x.marca === 'Z1')).toBeUndefined();
  });
  it('contabiliza "já fabricado" (produção atual, Solda em diante)', () => {
    expect(f.resumo.pesoJaFabricado).toBe(999);
    expect(f.resumo.nJaFabricado).toBe(1);
    expect(f.resumo.qtdJaFabricado).toBe(1);
    // total viável com o material entregue = já fabricado + consegue (ainda)
    expect(f.resumo.pesoViavelEntregue).toBe(999 + 600);
  });
  it('marca perfil parcialmente coberto (inclui W200 após o desconto)', () => {
    expect(f.perfisParciais).toContain('UE250X85X25X2');
    expect(f.perfisParciais).toContain('W200X19.3');
  });
  it('resumo com pesos e percentuais corretos', () => {
    expect(f.resumo.pesoFabricavel).toBe(600);          // 200 (U1) + 400 (CH1)
    expect(f.resumo.pesoNaoFabricavel).toBe(1900);       // 900+300+500+200
    expect(f.resumo.pesoSemInfo).toBe(50);
    expect(f.resumo.pesoTotal).toBe(2550);
    expect(f.resumo.pctFabricavel).toBeCloseTo(600 / 2550 * 100, 1);
    expect(f.naoFabricaveis.find((x) => x.marca === 'C1').faltaComprar).toBe(500);
  });
});

describe('fabricabilidadePecas — peso de peça ≠ peso de perfil (fator BOM) e lotes parciais', () => {
  // Caso real (obra 2025-36): vigas-mestras "W200X19.3" pesam 23.602 kg no
  // total, mas o BOM só usa 11.352 kg desse perfil (o resto é diagonal/chapa).
  // Material 100% entregue (falta 0) → NADA pode ficar "não consegue".
  const materialBOM = [
    { perfil: 'W200X19.3', necessario: 11352.3, entregue: 11352.3, entregueBruto: 11862, falta: 0, status: 'entregue' },
    { perfil: 'UE250X85X25X2', necessario: 1000, entregue: 800, entregueBruto: 800, falta: 200, status: 'parcial' },
  ];
  const pcs = [
    { marca: 'VM8A', perfil: 'W200X19.3', quantidade: 1, pesoTotal: 13399.1, etapa: 'enviado' },   // já fabricada (consome × fator)
    { marca: 'VM10A', perfil: 'W200X19.3', quantidade: 1, pesoTotal: 5000, etapa: 'aguardando' },
    { marca: 'VM16A', perfil: 'W200X19.3', quantidade: 2, pesoTotal: 5202.9, etapa: 'aguardando' },
    // UE250: 1.000 kg de perfil p/ peças que pesam 1.000 kg (fator 1), 800 entregues,
    // lote de 10 un × 100 kg → 8 cabem, 2 não (parcial), coerente com falta 200.
    { marca: 'TC88C', perfil: 'UE250X85X25X2', quantidade: 10, pesoTotal: 1000, etapa: 'aguardando' },
  ];
  const f = fabricabilidadePecas(pcs, materialBOM);
  it('material 100% entregue → todas as peças do perfil conseguem (mesmo com peso de peça > kg do perfil)', () => {
    expect(f.naoFabricaveis.filter((x) => x.perfil === 'W200X19.3')).toHaveLength(0);
    expect(f.fabricaveis.map((x) => x.marca).sort()).toEqual(['TC88C', 'VM10A', 'VM16A']);
  });
  it('fator = necessário ÷ Σ peso das peças do perfil (≤ 1)', () => {
    const w = f.porPerfil.find((g) => g.perfil === 'W200X19.3');
    expect(w.fator).toBeCloseTo(11352.3 / 23602, 2);
    expect(w.consumido).toBeCloseTo(13399.1 * (11352.3 / 23602), 0);
    expect(w.entregue).toBe(11862); // bruto: o que está no pátio
    expect(w.status).toBe('ok');
  });
  it('lote parcial: aloca por UNIDADE — 8 de 10 cabem, 2 não (≈ falta de perfil)', () => {
    const ok = f.fabricaveis.find((x) => x.marca === 'TC88C');
    const nao = f.naoFabricaveis.find((x) => x.marca === 'TC88C');
    expect(ok.quantidade).toBe(8); expect(ok.peso).toBe(800); expect(ok.parcial).toBe(true);
    expect(nao.quantidade).toBe(2); expect(nao.peso).toBe(200); expect(nao.quantidadeLote).toBe(10);
    expect(nao.faltaPerfil).toBe(200);
    expect(f.resumo.faltaPerfilNaoFabricavel).toBe(200);
  });
  it('"falta comprar" = só perfis com peças pendentes (mesma base do card) e o total geral à parte', () => {
    expect(f.resumo.faltaComprarTotal).toBe(200);
    expect(f.resumo.faltaComprarTodosPerfis).toBe(200);
    const f2 = fabricabilidadePecas(pcs, [...materialBOM, { perfil: 'HP250X62', necessario: 2578, entregue: 0, entregueBruto: 0, falta: 2578, status: 'faltando' }]);
    expect(f2.resumo.faltaComprarTotal).toBe(200);          // HP sem peça pendente não entra
    expect(f2.resumo.faltaComprarTodosPerfis).toBe(2778);
  });
  it('resumo por perfil ordena pelo peso "não consegue"', () => {
    expect(f.porPerfil[0].perfil).toBe('UE250X85X25X2');
    expect(f.porPerfil[0].pesoNaoFabricavel).toBe(200);
    expect(f.porPerfil[0].qtdNaoFabricavel).toBe(2);
    expect(f.resumo.nPerfisNaoFabricaveis).toBe(1);
  });
  it('sem BOM (linha só com entregue/falta) → fator 1, comportamento antigo', () => {
    const g = fabricabilidadePecas(
      [{ marca: 'A', perfil: 'X1', quantidade: 1, pesoTotal: 100, etapa: 'aguardando' }],
      [{ perfil: 'X1', entregue: 50, falta: 50, status: 'parcial' }],
    );
    expect(g.porPerfil[0].fator).toBe(1);
    expect(g.naoFabricaveis).toHaveLength(1);
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
