// ============================================================
// Testes do Estoque Analytics
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  saudeItem, valorItem, pesoItem, kpisEstoque, curvaABC,
  agregadoCategoria, filtrarEstoque, ordenarEstoque,
  necessarioItem, chegouItem, faltaItem, temNecessidade, resumoMaterialObra,
  enriquecerNecessarioBOM,
} from './estoqueAnalytics';

const estoque = [
  { id: '1', codigo: 'W200', descricao: 'Viga W200', categoria: 'perfil', quantidade: 5000, minimo: 1000, maximo: 8000, preco: 7.69, peso_kg: 5000, unidade: 'KG', fornecedor: 'ACOFORTE' }, // saudável
  { id: '2', codigo: 'L64', descricao: 'Cantoneira', categoria: 'perfil', quantidade: 800, minimo: 1000, maximo: 5000, preco: 7.6, peso_kg: 800, unidade: 'KG' },   // baixo (<= min)
  { id: '3', codigo: 'CH8', descricao: 'Chapa 8mm', categoria: 'chapa', quantidade: 300, minimo: 1000, preco: 5.25, unidade: 'KG' },                                  // crítico (<= 50% min)
  { id: '4', codigo: 'DISCO', descricao: 'Disco corte', categoria: 'consumivel', quantidade: 0, minimo: 20, preco: 8, unidade: 'UN' },                                // zerado
  { id: '5', codigo: 'SUCATA', descricao: 'Sucata', categoria: 'outro', quantidade: 500, minimo: 0, preco: 0, unidade: 'KG' },                                        // sem_minimo + sem preço
];

describe('saudeItem', () => {
  it('classifica os estados corretamente', () => {
    expect(saudeItem(estoque[0])).toBe('saudavel');
    expect(saudeItem(estoque[1])).toBe('baixo');
    expect(saudeItem(estoque[2])).toBe('critico');
    expect(saudeItem(estoque[3])).toBe('zerado');
    expect(saudeItem(estoque[4])).toBe('sem_minimo');
  });
  it('atenção quando entre mínimo e 1.2× mínimo', () => {
    expect(saudeItem({ quantidade: 1100, minimo: 1000 })).toBe('atencao');
  });
  it('excesso quando acima do máximo', () => {
    expect(saudeItem({ quantidade: 9000, minimo: 1000, maximo: 8000 })).toBe('excesso');
  });
  it('entregue: item de obra (pedido>0) com falta 0 e saldo>0', () => {
    // chaparia entregue: pedido=comprado=quantidade, falta=0
    expect(saudeItem({ quantidade: 21093, pedido: 21093, comprado: 21093, falta: 0, minimo: 0 })).toBe('entregue');
    // perfil que chegou mais que o necessário
    expect(saudeItem({ quantidade: 852, pedido: 806.3, comprado: 852, minimo: 0 })).toBe('entregue');
  });
  it('obra ainda faltando NÃO é entregue', () => {
    expect(saudeItem({ quantidade: 0, pedido: 1000, comprado: 0, falta: 1000, minimo: 0 })).toBe('zerado');
  });
  it('item de fábrica (sem pedido) não vira entregue', () => {
    expect(saudeItem({ quantidade: 500, minimo: 0 })).toBe('sem_minimo');
  });
});

describe('valorItem / pesoItem', () => {
  it('valor = quantidade × preço', () => expect(valorItem(estoque[0])).toBe(38450));
  it('peso usa peso_kg quando existe', () => expect(pesoItem(estoque[0])).toBe(5000));
  it('peso cai para quantidade quando unidade é KG e não há peso_kg', () => expect(pesoItem(estoque[2])).toBe(300));
  it('peso 0 para item em UN sem peso_kg', () => expect(pesoItem(estoque[3])).toBe(0));
});

describe('kpisEstoque', () => {
  const k = kpisEstoque(estoque);
  it('conta itens e alertas (zerado+critico+baixo)', () => {
    expect(k.nItens).toBe(5);
    expect(k.alertas).toBe(3);
  });
  it('valor total soma todos', () => {
    expect(k.valorTotal).toBe(38450 + 6080 + 1575 + 0 + 0);
  });
  it('sem preço e sem mínimo', () => {
    expect(k.semPreco).toBe(1);   // SUCATA
    expect(k.semMinimo).toBe(1);  // SUCATA
  });
  it('valor em risco = itens em alerta', () => {
    expect(k.valorEmRisco).toBe(6080 + 1575 + 0); // baixo + critico + zerado
  });
});

describe('faltante (necessário/chegou/falta)', () => {
  const obra = [
    { id: 'o1', pedido: 16281.3, comprado: 9334, falta: 6947.3, quantidade: 9334, unidade: 'KG' },
    { id: 'o2', pedido: 80029.3, comprado: 0, falta: 80029.3, quantidade: 0, unidade: 'KG' },
    { id: 'o3', pedido: 806.3, comprado: 852, falta: 0, quantidade: 852, unidade: 'KG' }, // chegou mais que o previsto
  ];
  it('helpers por item', () => {
    expect(necessarioItem(obra[0])).toBe(16281.3);
    expect(chegouItem(obra[0])).toBe(9334);
    expect(faltaItem(obra[0])).toBe(6947.3);
    expect(temNecessidade(obra[0])).toBe(true);
    expect(temNecessidade({ pedido: 0 })).toBe(false);
  });
  it('falta cai para max(0, necessário-chegou) sem a coluna', () => {
    expect(faltaItem({ pedido: 100, comprado: 30 })).toBe(70);
    expect(faltaItem({ pedido: 100, comprado: 130 })).toBe(0);
  });
  it('kpis agregam necessário/chegou/falta e cobertura (chegou capado no necessário)', () => {
    const k = kpisEstoque(obra);
    expect(k.itensComNecessidade).toBe(3);
    expect(k.itensComFalta).toBe(2);
    expect(k.totalNecessario).toBe(97116.9);
    // o3 chegou 852 mas necessário 806.3 → conta só 806.3 (45.7 é EXCEDENTE, não entregue)
    expect(k.totalChegou).toBe(9334 + 0 + 806.3);
    expect(k.totalExcedente).toBeCloseTo(45.7, 1);
    expect(k.totalFalta).toBe(86976.6);
    expect(k.coberturaPct).toBeLessThanOrEqual(100);
  });
  it('sem itens de obra, campos de faltante ficam zerados/null', () => {
    const k = kpisEstoque([{ quantidade: 10, minimo: 5, preco: 2 }]);
    expect(k.itensComNecessidade).toBe(0);
    expect(k.totalFalta).toBe(0);
    expect(k.coberturaPct).toBeNull();
  });
});

describe('resumoMaterialObra (necessário × entregue)', () => {
  const est = [
    { perfil: 'UE250', material: 'CIVIL', pedido: 80000, comprado: 0, falta: 80000, quantidade: 0 },     // faltando
    { perfil: 'W200', material: 'A572', pedido: 15738, comprado: 2316, falta: 13422, quantidade: 2316 }, // parcial
    { perfil: 'CHAPARIA', material: 'A36', pedido: 25852, comprado: 25852, falta: 0, quantidade: 25852 }, // entregue
    { perfil: 'FABRICA', material: 'A36', quantidade: 500 },                                              // sem necessidade → fora
  ];
  const r = resumoMaterialObra(est);
  it('inclui só itens com necessidade e classifica status', () => {
    expect(r.linhas.length).toBe(3);
    expect(r.linhas.find((l) => l.perfil === 'UE250').status).toBe('faltando');
    expect(r.linhas.find((l) => l.perfil === 'W200').status).toBe('parcial');
    expect(r.linhas.find((l) => l.perfil === 'CHAPARIA').status).toBe('entregue');
  });
  it('totais e cobertura', () => {
    expect(r.totalNecessario).toBe(80000 + 15738 + 25852);
    expect(r.totalEntregue).toBe(0 + 2316 + 25852);
    expect(r.totalFalta).toBe(80000 + 13422 + 0);
    expect(r.coberturaPct).toBeCloseTo((2316 + 25852) / (80000 + 15738 + 25852) * 100, 1);
    expect(r.entregues).toBe(1); expect(r.parciais).toBe(1); expect(r.faltando).toBe(1);
  });
  it('ordena por necessário desc', () => {
    expect(r.linhas[0].perfil).toBe('UE250');
  });
});

describe('enriquecerNecessarioBOM (necessário derivado do BOM)', () => {
  const estoque = [
    { id: 'E1', descricao: 'Perfil UE250X85X25X2', codigo: 'UE250', comprado: 1000 },
    { id: 'E2', descricao: 'Chapa CH8', codigo: 'CH8', comprado: 500 },
    { id: 'E3', descricao: 'Consumível sem BOM', codigo: 'DISCO', pedido: 300, comprado: 200 },
  ];
  const bom = [
    { perfil: 'UE250X85X25X2', peso_teorico: 800 },
    { perfil: 'UE250X85X25X2', peso_teorico: 400 },
    { perfil: 'CH8', peso_teorico: 600 },
  ];
  const out = enriquecerNecessarioBOM(estoque, bom);
  it('soma peso_teorico do BOM no item casado e recalcula falta', () => {
    const e1 = out.find((i) => i.id === 'E1');
    expect(e1.pedido).toBe(1200);        // 800 + 400
    expect(e1.falta).toBe(200);          // 1200 - 1000
    const e2 = out.find((i) => i.id === 'E2');
    expect(e2.pedido).toBe(600);
    expect(e2.falta).toBe(100);
  });
  it('item sem BOM casado permanece inalterado (não zera seed existente)', () => {
    const e3 = out.find((i) => i.id === 'E3');
    expect(e3.pedido).toBe(300);         // mantém o valor original
    expect(e3.falta).toBeUndefined();    // não adiciona falta onde não havia
  });
  it('BOM vazio devolve o estoque como veio', () => {
    expect(enriquecerNecessarioBOM(estoque, [])).toBe(estoque);
  });
});

describe('curvaABC', () => {
  const { rows, resumo } = curvaABC(estoque);
  it('ignora itens sem valor e ordena desc', () => {
    expect(rows[0].codigo).toBe('W200');
    expect(rows.every((r, i) => i === 0 || r._valor <= rows[i - 1]._valor)).toBe(true);
  });
  it('classe A cobre o item dominante', () => {
    expect(rows[0]._classe).toBe('A');
    expect(resumo.A.n).toBeGreaterThanOrEqual(1);
  });
});

describe('agregadoCategoria', () => {
  const ag = agregadoCategoria(estoque);
  it('agrupa por categoria e ordena por valor', () => {
    expect(ag[0].categoria).toBe('perfil');
    expect(ag[0].nItens).toBe(2);
    expect(ag[0].valor).toBe(38450 + 6080);
  });
});

describe('filtrarEstoque', () => {
  it('filtra por saúde=alerta (zerado+critico+baixo)', () => {
    expect(filtrarEstoque(estoque, { saude: 'alerta' }).map((i) => i.codigo).sort()).toEqual(['CH8', 'DISCO', 'L64']);
  });
  it('filtra por categoria', () => {
    expect(filtrarEstoque(estoque, { categoria: 'perfil' }).length).toBe(2);
  });
  it('flag semPreco e semMinimo', () => {
    expect(filtrarEstoque(estoque, { semPreco: true }).map((i) => i.codigo)).toEqual(['SUCATA']);
    expect(filtrarEstoque(estoque, { semMinimo: true }).map((i) => i.codigo)).toEqual(['SUCATA']);
  });
  it('busca por texto (código/fornecedor)', () => {
    expect(filtrarEstoque(estoque, { busca: 'acoforte' }).map((i) => i.codigo)).toEqual(['W200']);
    expect(filtrarEstoque(estoque, { busca: 'cantoneira' }).map((i) => i.codigo)).toEqual(['L64']);
  });
});

describe('ordenarEstoque', () => {
  it('por valor desc (padrão)', () => {
    expect(ordenarEstoque(estoque, 'valor', 'desc')[0].codigo).toBe('W200');
  });
  it('por saúde asc coloca o mais urgente primeiro', () => {
    expect(ordenarEstoque(estoque, 'saude', 'asc')[0].codigo).toBe('DISCO'); // zerado prioridade 0
  });
  it('por código asc', () => {
    expect(ordenarEstoque(estoque, 'codigo', 'asc')[0].codigo).toBe('CH8');
  });
});
