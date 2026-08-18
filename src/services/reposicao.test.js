// ============================================================
// Testes da reposição de estoque (ponto de compra proativo)
// ============================================================
import { describe, it, expect } from 'vitest';
import { calcularReposicao, severidadeItem, linhaParaItemCompra, itensSemPonto, validarPontos, sugerirPontos } from './reposicao';

// Amostra com os casos-chave: crítico (0), abaixo do mínimo, atenção, ok e
// sem mínimo definido.
const estoque = [
  { id: 'EST-1', codigo: 'DISCO-7', descricao: 'Disco de corte 7"', quantidade: 0, minimo: 20, maximo: 100, preco: 8, unidade: 'UN', fornecedor: 'WB' },       // crítico
  { id: 'EST-2', codigo: 'ELETRODO', descricao: 'Eletrodo 6013', quantidade: 15, minimo: 30, maximo: 120, preco: 25, unidade: 'KG', fornecedor: 'GERDAU' },     // abaixo do mínimo
  { id: 'EST-3', codigo: 'TINTA-PU', descricao: 'Tinta PU cinza', quantidade: 34, minimo: 30, maximo: 60, preco: 40, unidade: 'L', fornecedor: '' },            // atenção (34 <= 36)
  { id: 'EST-4', codigo: 'PARAF-M12', descricao: 'Parafuso M12', quantidade: 500, minimo: 100, maximo: 800, preco: 1.2, unidade: 'UN' },                        // ok (acima)
  { id: 'EST-5', codigo: 'SUCATA', descricao: 'Sucata diversa', quantidade: 0, minimo: 0, maximo: 0, preco: 0, unidade: 'KG' },                                 // sem mínimo → ignora
];

describe('severidadeItem', () => {
  it('saldo zero → crítico', () => expect(severidadeItem(0, 20)).toBe('critico'));
  it('saldo ≤ mínimo → baixo', () => expect(severidadeItem(15, 30)).toBe('baixo'));
  it('saldo na faixa de atenção (≤ mín×1.2) → atencao', () => expect(severidadeItem(34, 30)).toBe('atencao'));
  it('saldo acima da faixa → null', () => expect(severidadeItem(500, 100)).toBeNull());
});

describe('calcularReposicao', () => {
  const r = calcularReposicao(estoque);

  it('ignora itens sem mínimo definido e os que já cobrem o alvo', () => {
    expect(r.linhas.find((l) => l.codigo === 'SUCATA')).toBeUndefined();
    expect(r.linhas.find((l) => l.codigo === 'PARAF-M12')).toBeUndefined();
    expect(r.itens).toBe(3);
  });
  it('conta os críticos', () => expect(r.criticos).toBe(1));
  it('sugere repor até o máximo (crítico: 100 − 0 = 100)', () => {
    const l = r.linhas.find((x) => x.codigo === 'DISCO-7');
    expect(l.sugestao).toBe(100);
    expect(l.custoEstimado).toBe(800);
    expect(l.severidade).toBe('critico');
  });
  it('abaixo do mínimo repõe até o máximo (120 − 15 = 105)', () => {
    const l = r.linhas.find((x) => x.codigo === 'ELETRODO');
    expect(l.sugestao).toBe(105);
    expect(l.custoEstimado).toBe(2625);
  });
  it('ordena por severidade (crítico primeiro) e depois custo desc', () => {
    expect(r.linhas[0].codigo).toBe('DISCO-7'); // único crítico vem primeiro
    expect(r.linhas.map((l) => l.severidade)).toEqual(['critico', 'baixo', 'atencao']);
  });
  it('total de custo soma as sugestões', () => {
    expect(r.totalCusto).toBe(800 + 2625 + (60 - 34) * 40); // 800 + 2625 + 1040
  });
  it('incluirAtencao=false remove a faixa de atenção', () => {
    const r2 = calcularReposicao(estoque, { incluirAtencao: false });
    expect(r2.linhas.find((l) => l.severidade === 'atencao')).toBeUndefined();
    expect(r2.itens).toBe(2);
  });
  it('sem preço entra em semPreco', () => {
    const r3 = calcularReposicao([{ id: 'X', codigo: 'X', quantidade: 0, minimo: 5, maximo: 10, preco: 0, unidade: 'UN' }]);
    expect(r3.semPreco).toBe(1);
    expect(r3.linhas[0].custoEstimado).toBe(0);
  });
});

describe('itensSemPonto', () => {
  it('lista só os itens sem mínimo definido, ordenados', () => {
    const semPonto = itensSemPonto(estoque);
    expect(semPonto.map((e) => e.codigo)).toEqual(['SUCATA']); // único com minimo 0
  });
});

describe('validarPontos', () => {
  it('aceita máximo 0 (sem teto)', () => expect(validarPontos({ minimo: 10, maximo: 0 }).ok).toBe(true));
  it('aceita máximo ≥ mínimo', () => expect(validarPontos({ minimo: 10, maximo: 50 }).ok).toBe(true));
  it('rejeita máximo < mínimo', () => expect(validarPontos({ minimo: 50, maximo: 10 }).ok).toBe(false));
  it('rejeita negativos', () => expect(validarPontos({ minimo: -1, maximo: 0 }).ok).toBe(false));
  it('normaliza (r2)', () => expect(validarPontos({ minimo: '10.555', maximo: 20 }).minimo).toBe(10.56));
});

describe('sugerirPontos', () => {
  it('saldo 0 → 0/0', () => expect(sugerirPontos(0)).toEqual({ minimo: 0, maximo: 0 }));
  it('saldo grande arredonda p/ dezenas', () => {
    const s = sugerirPontos(500); // 150 / 600
    expect(s.minimo).toBe(150);
    expect(s.maximo).toBe(600);
  });
  it('máximo ≥ mínimo sempre', () => {
    const s = sugerirPontos(37);
    expect(s.maximo).toBeGreaterThanOrEqual(s.minimo);
  });
});

describe('linhaParaItemCompra', () => {
  it('mapeia a linha para item de pedido (perfil/material/preço/valor)', () => {
    const r = calcularReposicao(estoque);
    const l = r.linhas.find((x) => x.codigo === 'DISCO-7');
    const item = linhaParaItemCompra(l);
    expect(item.quantidade).toBe(100);
    expect(item.precoUnitario).toBe(8);
    expect(item.valorTotal).toBe(800);
    expect(item.item_id).toBe('EST-1');
    expect(item.fornecedorSugerido).toBe('WB');
  });
});
