// ============================================================
// Testes do consumo automático de estoque na produção (baixa por corte)
// ============================================================
import { describe, it, expect } from 'vitest';
import { kgBaixaCorte, planejarBaixaCorte, planejarEstornoCorte } from './consumoProducao';

const estoque = [
  { id: 'EST-W', codigo: 'W200X19.3-12M', perfil: 'W200X19.3-12M', material: 'A572', descricao: 'Perfil W200X19.3', quantidade: 5000, preco: 7.69 },
  { id: 'EST-L', codigo: 'L64X64X6.4', perfil: 'L64X64X6.4', material: 'A36', descricao: 'Cantoneira', quantidade: 100, preco: 7.6 },
];

describe('kgBaixaCorte', () => {
  it('usa o peso teórico', () => expect(kgBaixaCorte({ peso_teorico: 154.3 })).toBe(154.3));
  it('cai para `peso` quando não há peso_teorico', () => expect(kgBaixaCorte({ peso: 80 })).toBe(80));
  it('sem peso → 0', () => expect(kgBaixaCorte({})).toBe(0));
});

describe('planejarBaixaCorte', () => {
  it('baixa o peso do corte no item casado pelo perfil', () => {
    const p = planejarBaixaCorte({ perfil: 'W200X19.3', material: 'A572', peso_teorico: 300 }, estoque);
    expect(p.itemId).toBe('EST-W');
    expect(p.kg).toBe(300);
    expect(p.saldoAnterior).toBe(5000);
    expect(p.saldoNovo).toBe(4700);
    expect(p.preco).toBe(7.69);
  });
  it('idempotência: já baixado (baixa_estoque_kg>0) → null', () => {
    expect(planejarBaixaCorte({ perfil: 'W200X19.3', peso_teorico: 300, baixa_estoque_kg: 300 }, estoque)).toBeNull();
  });
  it('sem perfil → null', () => {
    expect(planejarBaixaCorte({ perfil: '', peso_teorico: 300 }, estoque)).toBeNull();
  });
  it('perfil sem item no estoque → null', () => {
    expect(planejarBaixaCorte({ perfil: 'UE200X75', peso_teorico: 300 }, estoque)).toBeNull();
  });
  it('não deixa saldo negativo (clamp em 0)', () => {
    const p = planejarBaixaCorte({ perfil: 'L64X64X6.4', peso_teorico: 250 }, estoque);
    expect(p.saldoAnterior).toBe(100);
    expect(p.saldoNovo).toBe(0);
  });
});

describe('planejarEstornoCorte', () => {
  it('devolve o kg baixado ao item', () => {
    const p = planejarEstornoCorte({ perfil: 'W200X19.3', baixa_estoque_kg: 300 }, estoque);
    expect(p.itemId).toBe('EST-W');
    expect(p.kg).toBe(300);
    expect(p.saldoAnterior).toBe(5000);
    expect(p.saldoNovo).toBe(5300);
  });
  it('sem baixa registrada → null', () => {
    expect(planejarEstornoCorte({ perfil: 'W200X19.3', baixa_estoque_kg: 0 }, estoque)).toBeNull();
  });
  it('item não encontrado → itemId null mas ainda planeja (zera baixa no corte)', () => {
    const p = planejarEstornoCorte({ perfil: 'XPTO999', baixa_estoque_kg: 50 }, estoque);
    expect(p.itemId).toBeNull();
    expect(p.kg).toBe(50);
    expect(p.saldoNovo).toBeNull();
  });
});
