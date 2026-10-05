import { describe, it, expect } from 'vitest';
import { calcularDRE, intervaloDoPeriodo, grupoDaCategoria } from '@/utils/dreCalc';

const HOJE = new Date(2026, 9, 5); // 05/10/2026
const { inicio, fim } = intervaloDoPeriodo('mes_atual', HOJE);

const medicoes = [
  { id: 'm1', obraId: 'obra-001', status: 'paga', dataMedicao: '2026-10-02', valorBruto: 100000, valorLiquido: 95000 },
  { id: 'm2', obraId: 'obra-001', status: 'aprovada', dataMedicao: '2026-10-10', valorBruto: 50000 },
  { id: 'm3', obraId: 'obra-001', status: 'aguardando', dataMedicao: '2026-10-11', valorBruto: 999999 }, // prevista: fora
  { id: 'm4', obraId: 'obra-002', status: 'rejeitada', dataMedicao: '2026-10-11', valorBruto: 888888 },  // fora
  { id: 'm5', obraId: 'obra-002', status: 'paga', dataMedicao: '2026-09-30', valorBruto: 777777 },      // outro mês
];
const receitasManuais = [
  { id: 'r1', status: 'recebido', data: '2026-10-03', valor: 2000 },
  { id: 'r2', status: 'aberto', data: '2026-10-03', valor: 5000 },   // aberto: fora
  { id: 'r3', status: 'faturado', data: '2026-10-04', valor: 1000, obraId: 'obra-001' },
];
const despesas = [
  { id: 'd1', categoria: 'Matéria Prima', dataEmissao: '2026-10-01', valor: 40000, status: 'pago', obraId: 'obra-001' },
  { id: 'd2', categoria: 'Mão de Obra', dataEmissao: '2026-10-01', valor: 30000, status: 'pendente' },
  { id: 'd3', categoria: 'Administrativo', dataEmissao: '2026-10-02', valor: 10000, status: 'pago' },
  { id: 'd4', categoria: 'Juros de Cheque', dataEmissao: '2026-10-02', valor: 1000, status: 'pago' },
  { id: 'd5', categoria: 'Administrativo', dataEmissao: '2026-10-02', valor: 5000, status: 'cancelado' }, // fora
  { id: 'd6', categoria: 'Administrativo', dataEmissao: '2026-09-02', valor: 5000, status: 'pago' },      // outro mês
];

describe('intervaloDoPeriodo', () => {
  it('mês atual', () => {
    expect(inicio).toEqual(new Date(2026, 9, 1));
    expect(fim.getDate()).toBe(31);
  });
  it('trimestre e tudo', () => {
    expect(intervaloDoPeriodo('trimestre', HOJE).inicio).toEqual(new Date(2026, 9, 1));
    expect(intervaloDoPeriodo('tudo', HOJE)).toEqual({ inicio: null, fim: null });
  });
});

describe('grupoDaCategoria', () => {
  it('classifica', () => {
    expect(grupoDaCategoria('Matéria Prima')).toBe('csp');
    expect(grupoDaCategoria('Mão de Obra')).toBe('csp');
    expect(grupoDaCategoria('Juros de Cheque')).toBe('financeira');
    expect(grupoDaCategoria('Administrativo')).toBe('operacional');
  });
});

describe('calcularDRE', () => {
  const dre = calcularDRE({ medicoes, receitasManuais, despesas, inicio, fim, escopo: 'consolidado' });
  it('receita bruta só com medições reconhecidas + manuais faturadas/recebidas', () => {
    expect(dre.receitaMedicoes).toBe(150000);
    expect(dre.receitaManual).toBe(3000);
    expect(dre.receitaBruta).toBe(153000);
  });
  it('retenções = bruto − líquido', () => expect(dre.retencoes).toBe(5000));
  it('sem premissas → sem impostos/IR/depreciação inventados', () => {
    expect(dre.impostos).toBe(0);
    expect(dre.irCsll).toBe(0);
    expect(dre.depreciacao).toBe(0);
  });
  it('custos por grupo, excluindo cancelados e fora do período', () => {
    expect(dre.cspTotal).toBe(70000);
    expect(dre.despesasOperacionaisTotal).toBe(10000);
    expect(dre.despesasFinanceirasTotal).toBe(1000);
    expect(dre.qtdDespesas).toBe(4);
  });
  it('resultado', () => {
    expect(dre.receitaLiquida).toBe(148000);
    expect(dre.lucroBruto).toBe(78000);
    expect(dre.ebitda).toBe(68000);
    expect(dre.lucroLiquido).toBe(67000);
  });
  it('premissas explícitas', () => {
    const d = calcularDRE({ medicoes, receitasManuais, despesas, inicio, fim,
      escopo: 'consolidado', premissas: { aliquotaImpostosPct: 10, depreciacaoValor: 2000, aliquotaIRPct: 34 } });
    expect(d.impostos).toBeCloseTo(15300);
    expect(d.resultadoAntesIR).toBeCloseTo(153000 - 5000 - 15300 - 70000 - 10000 - 2000 - 1000);
    expect(d.irCsll).toBeCloseTo(d.resultadoAntesIR * 0.34);
  });
  it('escopo fábrica exclui itens de obra', () => {
    const d = calcularDRE({ medicoes, receitasManuais, despesas, inicio, fim, escopo: 'fabrica' });
    expect(d.receitaBruta).toBe(2000);
    expect(d.cspTotal).toBe(30000);
  });
  it('escopo obras', () => {
    const d = calcularDRE({ medicoes, receitasManuais, despesas, inicio, fim, escopo: 'obras' });
    expect(d.receitaBruta).toBe(151000);
    expect(d.cspTotal).toBe(40000);
  });
  it('escopo empresa (padrão): receitas pelo total, despesas lançadas na obra ficam fora', () => {
    const d = calcularDRE({ medicoes, receitasManuais, despesas, inicio, fim });
    const consolidado = calcularDRE({ medicoes, receitasManuais, despesas, inicio, fim, escopo: 'consolidado' });
    expect(d.receitaBruta).toBe(consolidado.receitaBruta);
    expect(d.cspTotal).toBe(30000); // só despesas sem obra
  });
});
