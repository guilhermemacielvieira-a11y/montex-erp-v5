import { describe, it, expect } from 'vitest';
import { granularidadeAuto, kpisSetores, chavesMeses, periodoFinanceiro, despesasPor, topComOutros, rotuloChaveMes } from './painelDiretoria';

describe('painelDiretoria', () => {
  it('granularidade pelo período', () => {
    expect(granularidadeAuto(7)).toBe('dia');
    expect(granularidadeAuto(90)).toBe('semana');
    expect(granularidadeAuto(365)).toBe('mes');
  });

  it('KPIs de setor com variação', () => {
    const k = kpisSetores([{ setor: 'pintura', kg: 120 }, { setor: 'solda', kg: 50 }], [{ setor: 'pintura', kg: 100 }]);
    expect(k[0].variacao).toBe(20);
    expect(k[1].variacao).toBeNull();
  });

  it('chaves e rótulos de meses', () => {
    const hoje = new Date(2026, 9, 29);
    expect(chavesMeses(3, hoje)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(chavesMeses(3, hoje, 3)).toEqual(['2026-05', '2026-06', '2026-07']);
    expect(rotuloChaveMes('2026-10')).toBe('out/26');
  });

  it('período financeiro com meses vazios e comparação', () => {
    const hoje = new Date(2026, 9, 29);
    const evo = [
      { key: '2026-10', receitas: 300, despesas: 100 },
      { key: '2026-09', receitas: 100, despesas: 150 },
      { key: '2026-07', receitas: 200, despesas: 100 },
    ];
    const p = periodoFinanceiro(evo, { meses: 3, hoje });
    expect(p.serie.map((s) => s.key)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(p.serie[0].receitas).toBe(0);
    expect(p.atual).toMatchObject({ receitas: 400, despesas: 250, resultado: 150 });
    expect(p.atual.margem).toBeCloseTo(37.5);
    expect(p.anterior.resultado).toBe(100);
    expect(p.variacao.receitas).toBe(100);
    expect(p.variacao.resultado).toBe(50);
  });

  it('despesas por categoria no período e "Outros"', () => {
    const movs = [
      { tipo: 'despesa', categoria: 'Aço', valor: 500, data: '2026-10-01' },
      { tipo: 'despesa', categoria: 'Aço', valor: 100, data: '2026-01-01' },
      { tipo: 'despesa', categoria: 'Folha', valor: 300, data: '2026-10-05' },
      { tipo: 'despesa', categoria: 'Energia', valor: 100, data: '2026-10-05' },
      { tipo: 'despesa', categoria: '', valor: 100, data: '2026-10-05' },
      { tipo: 'receita', categoria: 'Medição', valor: 999, data: '2026-10-05' },
    ];
    const cats = despesasPor(movs, 'categoria', { desde: '2026-08' });
    expect(cats.map((c) => c.nome)).toEqual(['Aço', 'Folha', 'Energia', 'Outros']);
    expect(cats[0].pct).toBeCloseTo(50);
    const top = topComOutros(cats, 3);
    expect(top).toHaveLength(3);
    expect(top[2]).toMatchObject({ nome: 'Outros (2)', valor: 200, outros: true });
  });
});
