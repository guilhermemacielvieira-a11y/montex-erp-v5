// ============================================================
// Testes do abastecimento automático — ancorados em DADOS REAIS
// (perfis e preços extraídos da obra-009 / SPASSO NOVAAGRO 040)
// ============================================================
import { describe, it, expect } from 'vitest';
import { construirHistoricoPrecos, estimarPreco, montarAbastecimento, precoReferencia, agruparPorFornecedor, normalizar, matchEstoqueItem, montarNovoItemEstoque } from './abastecimento';

// Amostra fiel do estoque real (base de preços R$/kg de aço) + fornecedor
const estoque = [
  { perfil: 'L64X64X6.4', material: 'A36', descricao: 'CANTONEIRA 2.1/2X1/4 - 6.000 MM', codigo: 'L64X64X6.4', preco: 7.6, peso_kg: 5124, fornecedor: 'GERDAU' },
  { perfil: 'W200X19.3-12M', material: 'A572', descricao: 'Perfil W200X19.3 12M - A572', codigo: 'W200X19.3-12M', preco: 7.69, peso_kg: 0, fornecedor: 'ACOFORTE' },
  { perfil: 'HP250X62', material: 'A572-GR.50', descricao: 'VIGA HP A572 W250X62 - 12.000 MM', codigo: 'HP250X62', preco: 8.45, peso_kg: 1488, fornecedor: 'WB' },
  { perfil: 'CH-8X1500X6000', material: 'A36', descricao: 'Chapa A36 8mm 1500x6000', codigo: 'CH-8X1500X6000', preco: 5.25, peso_kg: 0, fornecedor: null },
];

// Amostra fiel do BOM real (materiais_corte agregado)
const bom = [
  { perfil: 'L64X64X6.4', material: 'A36', quantidade: 936, peso_teorico: 11329.3 },
  { perfil: 'W200X19.3', material: 'A572-GR.50', quantidade: 102, peso_teorico: 15738.3 },
  { perfil: 'HP250X62', material: 'A572-GR.50', quantidade: 34, peso_teorico: 2881.1 },
  { perfil: 'UE200X75X25X4.25', material: 'CIVIL 300', quantidade: 408, peso_teorico: 35197 },
];

const historico = construirHistoricoPrecos({ estoque });
const linha = (r, perfil) => r.linhas.find((l) => l.perfil === perfil);

describe('estimarPreco — match ponderado por perfil (anti cross-match)', () => {
  it('W200X19.3 casa com o perfil W (7,69) e NÃO com a viga HP (8,45)', () => {
    const e = estimarPreco(historico, 'W200X19.3 A572-GR.50');
    expect(e).toBeTruthy();
    expect(e.valorUnit).toBe(7.69);
  });
  it('HP250X62 casa com a viga HP (8,45)', () => {
    expect(estimarPreco(historico, 'HP250X62 A572-GR.50').valorUnit).toBe(8.45);
  });
  it('L64X64X6.4 casa com a cantoneira (7,60)', () => {
    expect(estimarPreco(historico, 'L64X64X6.4 A36').valorUnit).toBe(7.6);
  });
  it('perfil sem base retorna null (cai no fallback depois)', () => {
    expect(estimarPreco(historico, 'UE200X75X25X4.25 CIVIL 300')).toBeNull();
  });
});

describe('precoReferencia — média por material e geral (só estoque, sem NF)', () => {
  const ref = precoReferencia({ estoque });
  it('média geral do aço ~7,25 R$/kg', () => expect(ref.geral).toBeCloseTo(7.25, 2));
  it('média por família A36', () => expect(ref.mediasMaterial.get(normalizar('A36'))).toBeCloseTo(6.43, 2));
});

describe('montarAbastecimento — cruza BOM × estoque e estima', () => {
  const r = montarAbastecimento({ bom, estoque, historico });

  it('desconta o estoque disponível (L64: 11329,3 − 5124 = 6205,3)', () => {
    expect(linha(r, 'L64X64X6.4').pesoFalta).toBeCloseTo(6205.3, 1);
  });
  it('HP250X62: falta = 2881,1 − 1488 = 1393,1 a 8,45', () => {
    const l = linha(r, 'HP250X62');
    expect(l.pesoFalta).toBeCloseTo(1393.1, 1);
    expect(l.precoKg).toBe(8.45);
  });
  it('W200X19.3: sem estoque → falta cheia a 7,69', () => {
    const l = linha(r, 'W200X19.3');
    expect(l.pesoFalta).toBeCloseTo(15738.3, 1);
    expect(l.precoKg).toBe(7.69);
    expect(l.valorEstimado).toBeCloseTo(121027.53, 0);
  });
  it('UE (sem match) usa média geral do estoque como fallback', () => {
    const l = linha(r, 'UE200X75X25X4.25');
    expect(l.fonte).toBe('media_geral');
    expect(l.precoKg).toBeCloseTo(7.25, 2);
  });
  it('nenhum item fica SEM preço (fallback cobre tudo)', () => {
    expect(r.semPreco).toBe(0);
  });
  it('total estimado é positivo e coerente com o peso a comprar', () => {
    expect(r.itensAComprar).toBe(4);
    expect(r.totalValor).toBeGreaterThan(400000);
    expect(r.totalPesoFalta).toBeCloseTo(6205.3 + 15738.3 + 1393.1 + 35197, 0);
  });
});

describe('estratégia de preço: último × média × menor', () => {
  // L64 com 2 preços: estoque 7,60 e uma entrada 8,00 (mais recente)
  const movimentacoes = [
    { tipo: 'entrada', material: 'A36', material_perfil: 'L64X64X6.4', custo_unitario: 8.0, data: '2026-09-01', fornecedor: 'GERDAU' },
  ];
  const hist2 = construirHistoricoPrecos({ estoque, movimentacoes });
  const precoL64 = (estrategia) => montarAbastecimento({ bom, estoque, historico: hist2, estrategia }).linhas.find((l) => l.perfil === 'L64X64X6.4').precoKg;

  it('último = 8,00 (entrada mais recente)', () => expect(precoL64('ultimo')).toBe(8));
  it('média = 7,80', () => expect(precoL64('media')).toBe(7.8));
  it('menor = 7,60', () => expect(precoL64('menor')).toBe(7.6));
});

describe('matchEstoqueItem — casa perfil ↔ item de estoque (recebimento de compra)', () => {
  it('casa o perfil exato pela chave normalizada', () => {
    const m = matchEstoqueItem(estoque, 'L64X64X6.4');
    expect(m).toBeTruthy();
    expect(m.codigo).toBe('L64X64X6.4');
  });
  it('casa o perfil W mesmo com sufixo -12M no item de estoque', () => {
    expect(matchEstoqueItem(estoque, 'W200X19.3').codigo).toBe('W200X19.3-12M');
  });
  it('perfil inexistente no estoque → null', () => {
    expect(matchEstoqueItem(estoque, 'UE200X75X25X4.25')).toBeNull();
  });
  it('perfil vazio → null', () => {
    expect(matchEstoqueItem(estoque, '')).toBeNull();
  });
});

describe('montarNovoItemEstoque — cria item p/ perfil novo no recebimento', () => {
  const item = { perfil: 'UE200X75X25X4.25', material: 'CIVIL 300', descricao: 'UE200X75X25X4.25 — CIVIL 300', quantidade: 35197, unidade: 'kg', precoUnitario: 7.25, fornecedorSugerido: '' };
  const compra = { obraId: 'obra-009', fornecedor: 'ACOFORTE' };

  it('deriva codigo/descricao/perfil/material e usa o peso como saldo inicial', () => {
    const novo = montarNovoItemEstoque(item, compra, { hoje: '2026-08-12' });
    expect(novo.codigo).toBe('UE200X75X25X4.25');
    expect(novo.perfil).toBe('UE200X75X25X4.25');
    expect(novo.material).toBe('CIVIL 300');
    expect(novo.quantidade).toBe(35197);
    expect(novo.peso_kg).toBe(35197);
    expect(novo.preco).toBe(7.25);
    expect(novo.unidade).toBe('kg');
    expect(novo.ultima_entrada).toBe('2026-08-12');
  });
  it('item de fábrica (obra_id null) — aço fungível, casável globalmente', () => {
    expect(montarNovoItemEstoque(item, compra).obra_id).toBeNull();
  });
  it('usa o fornecedor da compra quando o item não sugere um', () => {
    expect(montarNovoItemEstoque(item, compra).fornecedor).toBe('ACOFORTE');
  });
  it('trunca codigo em 40 chars', () => {
    const longo = montarNovoItemEstoque({ perfil: 'X'.repeat(60), quantidade: 1 }, {});
    expect(longo.codigo.length).toBe(40);
  });
  it('sem identificação mínima → null', () => {
    expect(montarNovoItemEstoque({ quantidade: 10 }, {})).toBeNull();
  });
  it('o item criado é casável pelo matchEstoqueItem (loop de dedup no recebimento)', () => {
    const novo = { ...montarNovoItemEstoque(item, compra), id: 'EST-novo' };
    expect(matchEstoqueItem([novo], 'UE200X75X25X4.25')?.id).toBe('EST-novo');
  });
});

describe('fornecedor sugerido + agrupamento por fornecedor', () => {
  const r = montarAbastecimento({ bom, estoque, historico });

  it('sugere o fornecedor do preço casado', () => {
    expect(linha(r, 'HP250X62').fornecedorSugerido).toBe('WB');
    expect(linha(r, 'W200X19.3').fornecedorSugerido).toBe('ACOFORTE');
    expect(linha(r, 'UE200X75X25X4.25').fornecedorSugerido).toBe(''); // fallback: sem fornecedor
  });
  it('agrupa por fornecedor (sem base → "A definir")', () => {
    const grupos = agruparPorFornecedor(r.linhas);
    const nomes = grupos.map((g) => g.fornecedor);
    expect(nomes).toContain('WB');
    expect(nomes).toContain('A definir');
    const wb = grupos.find((g) => g.fornecedor === 'WB');
    expect(wb.linhas.some((l) => l.perfil === 'HP250X62')).toBe(true);
    // soma dos grupos = total a comprar
    const somaGrupos = grupos.reduce((s, g) => s + g.valor, 0);
    expect(somaGrupos).toBeCloseTo(r.totalValor, 0);
  });
});
