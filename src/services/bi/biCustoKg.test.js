import { describe, it, expect } from 'vitest';
import {
  chaveCategoria, classeCategoria, kgPinturaPorMes, serieFabrica, ajustarAtipicos,
  custoKgEmVolume, pontoEquilibrio, base2027, margemObras, analiseCustoKg, configCusto, PADRAO_CUSTO,
} from './biCustoKg';

const d = (s) => new Date(`${s}T12:00:00`);

describe('categorias', () => {
  it('normaliza acento, caixa e underscore', () => {
    expect(chaveCategoria('Matéria Prima')).toBe('materia prima');
    expect(chaveCategoria('mao_de_obra_fabrica')).toBe('mao de obra fabrica');
    expect(chaveCategoria(null)).toBe('outros');
  });
  it('classifica por classe de custo', () => {
    expect(classeCategoria('Mão de Obra')).toBe('maoDeObra');
    expect(classeCategoria('Matéria Prima')).toBe('variavel');
    expect(classeCategoria('Impostos')).toBe('variavel');
    expect(classeCategoria('Montagem Campo')).toBe('fora');
    expect(classeCategoria('Transporte')).toBe('fixo');
    expect(classeCategoria('Outros')).toBe('fixo');
  });
});

describe('kgPinturaPorMes', () => {
  const pecas = [{ id: 'P1', quantidade: 2 }, { id: 'P2', quantidade: 1 }];
  it('conta a entrada em pintura (ou além) uma vez por unidade', () => {
    const t = [
      { pecaId: 'P1', de: 'solda', para: 'pintura', data: d('2026-09-10'), qtd: 1, kg: 100 },
      { pecaId: 'P1', de: 'solda', para: 'pintura', data: d('2026-10-02'), qtd: 1, kg: 100 },
      // refeito por outro caminho: não pode passar da quantidade da peça
      { pecaId: 'P1', de: 'fabricacao', para: 'expedido', data: d('2026-10-03'), qtd: 2, kg: 200 },
      // sair da pintura não é produção nova
      { pecaId: 'P1', de: 'pintura', para: 'expedido', data: d('2026-10-04'), qtd: 2, kg: 200 },
      // pula direto da fabricação para expedido = entrou pintado
      { pecaId: 'P2', de: 'fabricacao', para: 'expedido', data: d('2026-10-05'), qtd: 1, kg: 50 },
    ];
    const m = kgPinturaPorMes(t, pecas);
    expect(m.get('2026-09')).toBe(100);
    expect(m.get('2026-10')).toBe(150);
  });
});

describe('serieFabrica e atípicos', () => {
  const despesas = [
    { categoria: 'Mão de Obra', valor: 200000, dataEmissao: '2026-09-05', status: 'pago' },
    { categoria: 'Mão de Obra', valor: 210000, dataEmissao: '2026-10-05', status: 'pago' },
    { categoria: 'Outros', valor: 10000, dataEmissao: '2026-09-07', status: 'pago' },
    { categoria: 'Outros', valor: 300000, dataEmissao: '2026-10-07', status: 'pago' },
    { categoria: 'Outros', valor: 12000, dataEmissao: '2026-08-07', status: 'pago' },
    { categoria: 'Matéria Prima', valor: 30000, dataEmissao: '2026-10-08', status: 'pago' },
    { categoria: 'Transporte', valor: 5000, dataEmissao: '2026-10-08', status: 'cancelado' },
    { categoria: 'material_estrutura', valor: 999999, dataEmissao: '2026-10-08', obraId: 'obra-1', status: 'pago' },
  ];
  it('separa classes, ignora cancelado e despesa de obra', () => {
    const s = serieFabrica({ despesas, hoje: d('2026-10-28'), meses: 3 });
    const out = s.find((l) => l.mes === '2026-10');
    expect(out.maoDeObra).toBe(210000);
    expect(out.fixo).toBe(300000);
    expect(out.variavel).toBe(30000);
  });
  it('troca valor atípico pela mediana e registra o ajuste', () => {
    const s = serieFabrica({ despesas, hoje: d('2026-10-28'), meses: 3 });
    const { serie, ajustes } = ajustarAtipicos(s);
    expect(ajustes).toHaveLength(1);
    expect(ajustes[0]).toMatchObject({ mes: '2026-10', categoria: 'Outros', valor: 300000 });
    expect(serie.find((l) => l.mes === '2026-10').fixo).toBe(ajustes[0].usado);
  });
});

describe('custo × volume', () => {
  const base = { fixoMes: 330000, varKg: 1.37, maoDeObraMes: 222000, outrosFixosMes: 108000 };
  it('custo por kg cai com o volume', () => {
    expect(custoKgEmVolume(base, 50)).toBeCloseTo(7.97, 2);
    expect(custoKgEmVolume(base, 120)).toBeCloseTo(4.12, 2);
    expect(custoKgEmVolume(base, 0)).toBeNull();
  });
  it('ponto de equilíbrio em t/mês', () => {
    expect(pontoEquilibrio(base, 8)).toBeCloseTo(49.8, 1);
    expect(pontoEquilibrio(base, 1)).toBeNull();
  });
  it('2027 aplica reajustes por classe', () => {
    const b = base2027(base, PADRAO_CUSTO);
    expect(b.maoDeObraMes).toBeCloseTo(239760, 0);
    expect(b.outrosFixosMes).toBeCloseTo(113400, 0);
    expect(b.varKg).toBeCloseTo(1.47, 2);
  });
});

describe('margemObras', () => {
  const pecas = [
    { id: 'A1', obraId: 'o1', etapa: 'expedido', pesoTotal: 40000 },
    { id: 'A2', obraId: 'o1', etapa: 'fabricacao', pesoTotal: 60000 },
    { id: 'B1', obraId: 'o2', etapa: 'aguardando', pesoTotal: 10000 },
  ];
  const obras = [
    { id: 'o1', nome: 'Global', status: 'ativo', contratoValorTotal: 2200000, contratoPesoTotal: 100000 },
    { id: 'o2', nome: 'Só fabricação', status: 'ativo', valorKgFabricacao: 2.8, contratoValorTotal: 28000, contratoPesoTotal: 10000 },
    { id: 'o3', nome: 'Encerrada', status: 'concluido' },
  ];
  it('estima receita do global e usa valor informado quando existe', () => {
    const l = margemObras({ obras, pecas, custoKg: 6, custoKg2027: 6.5, cfg: configCusto() });
    expect(l).toHaveLength(2);
    const g = l.find((o) => o.id === 'o1');
    expect(g.receitaKg).toBeCloseTo(22 - 8 - 3.5, 2);
    expect(g.fonte).toBe('estimado do global');
    expect(g.kgRestante).toBe(60000);
    expect(g.situacao).toBe('ok');
    const f = l.find((o) => o.id === 'o2');
    expect(f.fonte).toBe('informado');
    expect(f.margemKg).toBeCloseTo(-3.2, 2);
    expect(f.situacao).toBe('negativa');
  });
});

describe('analiseCustoKg', () => {
  it('monta base, curva, equilíbrio e alertas sem quebrar com dados vazios', () => {
    const a = analiseCustoKg({ hoje: d('2026-10-28') });
    expect(a.custoKg).toBeNull();
    expect(a.curva.length).toBeGreaterThan(0);
    expect(Array.isArray(a.alertas)).toBe(true);
  });
  it('calcula custo/kg real na janela', () => {
    const pecas = [{ id: 'P', obraId: 'o1', quantidade: 1, pesoTotal: 50000, etapa: 'expedido' }];
    const transicoes = [{ pecaId: 'P', de: 'solda', para: 'pintura', data: d('2026-10-10'), qtd: 1, kg: 50000 }];
    const despesas = [
      { categoria: 'Mão de Obra', valor: 300000, dataEmissao: '2026-10-05', status: 'pago' },
      { categoria: 'Matéria Prima', valor: 50000, dataEmissao: '2026-10-06', status: 'pago' },
    ];
    const a = analiseCustoKg({ transicoes, pecas, despesas, hoje: d('2026-10-28'), cfg: { janelaMeses: 1 } });
    expect(a.base.tMes).toBe(50);
    expect(a.base.varKg).toBe(1);
    expect(a.custoKg).toBe(7);
    expect(a.equilibrio.t2026).toBeCloseTo(42.9, 1);
  });
});

describe('passagens "não se aplica" contam como entrada em pintura', () => {
  it('normalizarHistorico devolve a passagem física e o custo/kg a usa', async () => {
    const { normalizarHistorico } = await import('./biProducao');
    const pecas = [{ id: 'T1', obraId: 'o1', quantidade: 10, pesoTotal: 1000, etapa: 'expedido' }];
    const historico = [
      { id: 'h1', peca_id: 'T1', etapa_de: 'fabricacao', etapa_para: 'solda', data_inicio: '2026-10-01T12:00:00', observacoes: '' },
      { id: 'h2', peca_id: 'T1', etapa_de: 'solda', etapa_para: 'pintura', data_inicio: '2026-10-02T12:00:00', observacoes: '[NA] [QTD:10/10]' },
      { id: 'h3', peca_id: 'T1', etapa_de: 'solda', etapa_para: 'pintura', data_inicio: '2026-10-02T12:00:00', observacoes: '[NA] [QTD:10/10]' },
    ];
    const { transicoes, passagensNA } = normalizarHistorico(historico, pecas);
    expect(passagensNA).toHaveLength(1);
    expect(passagensNA[0].kg).toBe(1000);
    const m = kgPinturaPorMes([...transicoes, ...passagensNA], pecas);
    expect(m.get('2026-10')).toBe(1000);
  });
});
