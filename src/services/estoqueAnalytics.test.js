// ============================================================
// Testes do Estoque Analytics
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  saudeItem, valorItem, pesoItem, kpisEstoque, curvaABC,
  agregadoCategoria, filtrarEstoque, ordenarEstoque,
  necessarioItem, chegouItem, faltaItem, temNecessidade,
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
  it('kpis agregam necessário/chegou/falta e cobertura', () => {
    const k = kpisEstoque(obra);
    expect(k.itensComNecessidade).toBe(3);
    expect(k.itensComFalta).toBe(2);
    expect(k.totalNecessario).toBe(97116.9);
    expect(k.totalChegou).toBe(10186);
    expect(k.totalFalta).toBe(86976.6);
    expect(k.coberturaPct).toBeCloseTo(10.5, 1);
  });
  it('sem itens de obra, campos de faltante ficam zerados/null', () => {
    const k = kpisEstoque([{ quantidade: 10, minimo: 5, preco: 2 }]);
    expect(k.itensComNecessidade).toBe(0);
    expect(k.totalFalta).toBe(0);
    expect(k.coberturaPct).toBeNull();
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
