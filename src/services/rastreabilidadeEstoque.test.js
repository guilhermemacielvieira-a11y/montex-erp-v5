// ============================================================
// Testes da rastreabilidade de estoque (extrato por item)
// ============================================================
import { describe, it, expect } from 'vitest';
import { historicoDoItem, resumoRastreabilidade, normalizarMov, rotuloOrigem, linhasParaExport } from './rastreabilidadeEstoque';

const item = { id: 'EST-L', codigo: 'L64X64X6.4', perfil: 'L64X64X6.4' };

// Mistura camelCase (contexto) e snake_case (banco) de propósito.
const movs = [
  { id: 'M1', itemId: 'EST-L', tipo: 'entrada', quantidade: 5000, origem: 'compra', data: '2026-08-01', custoUnitario: 7.6 },
  { id: 'M2', item_id: 'EST-L', tipo: 'saida', quantidade: 300, origem: 'producao', data: '2026-08-05', peca_id: 'PEC-1' },
  { id: 'M3', itemId: 'EST-L', tipo: 'entrada', quantidade: 300, origem: 'estorno_producao', data: '2026-08-06' },
  { id: 'M4', itemId: 'EST-OUTRO', tipo: 'saida', quantidade: 999, origem: 'producao', data: '2026-08-07' }, // outro item
  { id: 'M5', material_perfil: 'L64X64X6.4 A36', tipo: 'saida', quantidade: 120, origem: 'manual', data: '2026-07-20' }, // legado sem item_id → casa por perfil
];

describe('historicoDoItem', () => {
  const h = historicoDoItem(movs, item);
  it('inclui só as movimentações do item (por id ou perfil legado)', () => {
    expect(h.map((m) => m.id).sort()).toEqual(['M1', 'M2', 'M3', 'M5']);
  });
  it('exclui movimentação de outro item', () => {
    expect(h.find((m) => m.id === 'M4')).toBeUndefined();
  });
  it('ordena da mais recente para a mais antiga', () => {
    expect(h.map((m) => m.data)).toEqual(['2026-08-06', '2026-08-05', '2026-08-01', '2026-07-20']);
  });
  it('normaliza campos snake→camel (peca_id)', () => {
    expect(h.find((m) => m.id === 'M2').pecaId).toBe('PEC-1');
  });
});

describe('resumoRastreabilidade', () => {
  const r = resumoRastreabilidade(historicoDoItem(movs, item));
  it('soma entradas e saídas', () => {
    expect(r.entradas).toBe(5300);      // 5000 compra + 300 estorno
    expect(r.saidas).toBe(420);         // 300 produção + 120 manual
    expect(r.saldoLiquido).toBe(4880);
  });
  it('quebra por origem', () => {
    const compra = r.porOrigem.find((o) => o.origem === 'compra');
    const prod = r.porOrigem.find((o) => o.origem === 'producao');
    expect(compra.entradas).toBe(5000);
    expect(prod.saidas).toBe(300);
    expect(prod.count).toBe(1);
  });
});

describe('linhasParaExport', () => {
  const rows = linhasParaExport(historicoDoItem(movs, item));
  it('gera uma linha por movimentação com colunas planas', () => {
    expect(rows.length).toBe(4);
    expect(Object.keys(rows[0])).toEqual(['Data', 'Tipo', 'Origem', 'Quantidade', 'Unidade', 'Saldo após', 'Custo/un', 'Peça', 'NF', 'Motivo']);
  });
  it('rotula tipo e origem em pt-BR', () => {
    const saida = rows.find((r) => r.Quantidade === 300 && r.Tipo === 'Saída');
    expect(saida.Origem).toBe('Produção');
  });
});

describe('normalizarMov / rotuloOrigem', () => {
  it('normalizarMov tolera snake e camel', () => {
    const n = normalizarMov({ tipo: 'ENTRADA', saldo_anterior: 10, saldoNovo: 20, custo_unitario: 5 });
    expect(n.tipo).toBe('entrada');
    expect(n.saldoAnterior).toBe(10);
    expect(n.saldoNovo).toBe(20);
    expect(n.custoUnitario).toBe(5);
  });
  it('rotuloOrigem mapeia conhecidos e cai no cru', () => {
    expect(rotuloOrigem('producao')).toBe('Produção');
    expect(rotuloOrigem('estorno_producao')).toBe('Estorno produção');
    expect(rotuloOrigem('xyz')).toBe('xyz');
  });
});
