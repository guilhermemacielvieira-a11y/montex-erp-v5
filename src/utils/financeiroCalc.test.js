/**
 * MONTEX ERP V5 — Testes da lógica de cálculo financeiro pura.
 * Cobre os cálculos críticos do PainelFinanceiroGlobal: cheque trocado,
 * operação financeira, score de saúde, alertas de vencimento e primitivos.
 */
import { describe, it, expect } from 'vitest';
import {
  parseLocalDate, formatDate, diasAteVencimento, ehCheque, ehPago, STATUS_QUITADO,
  calcChequeOp, calcOpFin, calcScoreSaude, calcAlertaVencimento,
} from '@/utils/financeiroCalc';

const HOJE = new Date(2026, 5, 8); // 2026-06-08 (mês 5 = junho), local

describe('parseLocalDate (timezone-safe)', () => {
  it('parseia YYYY-MM-DD como data LOCAL (sem shift de fuso)', () => {
    const d = parseLocalDate('2026-05-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4); // maio
    expect(d.getDate()).toBe(15); // não 14
  });
  it('retorna null para vazio/nulo', () => {
    expect(parseLocalDate('')).toBeNull();
    expect(parseLocalDate(null)).toBeNull();
  });
  it('passa Date adiante inalterado', () => {
    const orig = new Date(2026, 0, 1);
    expect(parseLocalDate(orig)).toBe(orig);
  });
});

describe('formatDate', () => {
  it('formata data válida', () => expect(formatDate('2026-05-15')).toBe('15/05/2026'));
  it('trata "-" e vazio', () => {
    expect(formatDate('-')).toBe('-');
    expect(formatDate('')).toBe('-');
  });
});

describe('diasAteVencimento', () => {
  it('0 para hoje', () => expect(diasAteVencimento('2026-06-08', HOJE)).toBe(0));
  it('positivo no futuro', () => expect(diasAteVencimento('2026-06-18', HOJE)).toBe(10));
  it('negativo no passado (vencido)', () => expect(diasAteVencimento('2026-06-01', HOJE)).toBe(-7));
  it('null para inválido', () => expect(diasAteVencimento('-', HOJE)).toBeNull());
});

describe('ehCheque', () => {
  it('detecta por formaPagto', () => expect(ehCheque({ formaPagto: 'Cheque' })).toBe(true));
  it('detecta por descrição "CH 12"', () => expect(ehCheque({ descricao: 'Pagto CH 12' })).toBe(true));
  it('falso quando não há cheque', () => expect(ehCheque({ descricao: 'Boleto', formaPagto: 'PIX' })).toBe(false));
  it('não quebra com campos ausentes', () => expect(ehCheque({})).toBe(false));
});

describe('ehPago / STATUS_QUITADO', () => {
  it('aceita variantes de receita e despesa', () => {
    ['pago', 'paga', 'recebido', 'faturado', 'confirmado'].forEach(s => expect(ehPago({ status: s })).toBe(true));
  });
  it('pendente/atrasado não são pagos', () => {
    expect(ehPago({ status: 'pendente' })).toBe(false);
    expect(ehPago({ status: 'atrasado' })).toBe(false);
  });
  it('robusto a mov nulo', () => expect(ehPago(null)).toBe(false));
  it('STATUS_QUITADO contém as 5 variantes', () => expect(STATUS_QUITADO).toHaveLength(5));
});

describe('calcChequeOp (cheque trocado)', () => {
  it('calcula face, juros, taxa e taxa anualizada', () => {
    // 3 cheques de 50k = 150k face; líquido 130k → juros 20k; taxa 13,33%
    const r = calcChequeOp({
      chequesList: [
        { valor: '50000', vencimento: '2026-07-08' }, // +30d
        { valor: '50000', vencimento: '2026-08-07' }, // +60d
        { valor: '50000', vencimento: '2026-09-06' }, // +90d
      ],
      valorLiquido: '130000',
      taxaAnualizadaMaxima: 50,
      hoje: HOJE,
    });
    expect(r.valorTotalFace).toBe(150000);
    expect(r.liquido).toBe(130000);
    expect(r.juros).toBe(20000);
    expect(r.taxaPct).toBeCloseTo(13.333, 2);
    // prazo médio ~60 dias = 2 meses → taxa anualizada ~ 13.333*12/2 = 80%
    expect(r.prazoMedioDias).toBeCloseTo(60, 0);
    expect(r.taxaAnualizada).toBeCloseTo(80, 0);
    expect(r.isCaro).toBe(true); // 80% > 50%
  });
  it('lista vazia → face 0, prazo default 30d, não caro', () => {
    const r = calcChequeOp({ chequesList: [], valorLiquido: '', hoje: HOJE });
    expect(r.valorTotalFace).toBe(0);
    expect(r.taxaPct).toBe(0);
    expect(r.prazoMedioDias).toBe(30);
    expect(r.isCaro).toBe(false);
  });
});

describe('calcOpFin (operação financeira)', () => {
  it('gera N parcelas com datas escalonadas e impacto no caixa', () => {
    const r = calcOpFin({
      opFin: { valorFace: '90000', valorLiquido: '81000', parcelas: 3, primeiroVencimento: '2026-07-08', intervaloDias: 30 },
      taxaAnualizadaMaxima: 50,
      futuro: { saldo30: 10000, saldo60: 20000, saldo90: 30000, receber30: 5000, pagar30: 8000 },
      hoje: HOJE,
    });
    expect(r.face).toBe(90000);
    expect(r.juros).toBe(9000);
    expect(r.taxaPct).toBeCloseTo(10, 5);
    expect(r.valorParcela).toBe(30000);
    expect(r.datasParcelas).toHaveLength(3);
    expect(r.datasParcelas[0].data).toBe('2026-07-08');
    expect(r.datasParcelas[2].data).toBe('2026-09-06');
    // depois.receber30 = antes.receber30 + liquido
    expect(r.depois.receber30).toBe(5000 + 81000);
    // 1ª parcela (+30d) entra em pagar30
    expect(r.depois.pagar30).toBe(8000 + 30000);
  });
  it('marca operação cara conforme taxa anualizada', () => {
    const r = calcOpFin({
      opFin: { valorFace: '100000', valorLiquido: '70000', parcelas: 2, primeiroVencimento: '2026-07-08', intervaloDias: 30 },
      taxaAnualizadaMaxima: 50, futuro: {}, hoje: HOJE,
    });
    expect(r.isCaro).toBe(true);
    expect(['leve', 'medio', 'grave']).toContain(r.nivelCaro);
  });
});

describe('calcScoreSaude', () => {
  it('cenário saudável → score alto', () => {
    const r = calcScoreSaude({
      metasReal: { margemReal: 30, receitaMes: 500000, despesaMes: 300000 },
      futuro: { receber30: 200000, pagar30: 100000 },
      metas: { receitaMinimaMensal: 405000, despesaTetoMensal: 350000, margemMinima: 25 },
      alertasCriticos: 0,
    });
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.nivel).toBe('Excelente');
    expect(r.componentes).toHaveLength(5);
  });
  it('cenário severo (margem negativa, despesa acima do teto, liquidez 0, muitos alertas) → score baixo', () => {
    const r = calcScoreSaude({
      // margem<0 → 0; receita 0 → 0; despesa 450k > teto*1.2 (420k) → 0;
      // pagar30>0 e receber30=0 → liquidez 0 → 0; 10 alertas críticos → 0
      metasReal: { margemReal: -18, receitaMes: 0, despesaMes: 450000 },
      futuro: { receber30: 0, pagar30: 100000 },
      metas: { receitaMinimaMensal: 405000, despesaTetoMensal: 350000, margemMinima: 25 },
      alertasCriticos: 10,
    });
    expect(r.score).toBeLessThan(20);
    expect(r.nivel).toBe('Severo');
    expect(r.cor).toBe('#7f1d1d');
  });

  it('cenário misto documenta a fórmula (despesa baixa pontua no eixo teto)', () => {
    // margem<0, receita 0, mas despesa MUITO abaixo do teto → eixo despesa=100;
    // liquidez default 1 → 50. total = 50*.25 + 100*.15 = 27.5 → 28 "Crítico"
    const r = calcScoreSaude({
      metasReal: { margemReal: -18, receitaMes: 0, despesaMes: 108730 },
      futuro: { receber30: 0, pagar30: 0 },
      metas: { receitaMinimaMensal: 405000, despesaTetoMensal: 350000, margemMinima: 25 },
      alertasCriticos: 10,
    });
    expect(r.score).toBe(28);
    expect(r.nivel).toBe('Crítico');
  });
  it('liquidez = 2 quando há a receber e nada a pagar', () => {
    const r = calcScoreSaude({
      metasReal: { margemReal: 0, receitaMes: 0, despesaMes: 0 },
      futuro: { receber30: 1000, pagar30: 0 },
      metas: { receitaMinimaMensal: 1, despesaTetoMensal: 1, margemMinima: 25 },
      alertasCriticos: 0,
    });
    expect(r.liquidez).toBe(2);
  });
});

describe('calcAlertaVencimento', () => {
  it('item vencido → nível "vencido" e urgência alta', () => {
    const r = calcAlertaVencimento({ dias: -5, valor: 10000 });
    expect(r.nivel).toBe('vencido');
    expect(r.urgenciaScore).toBe(1000 + 50); // 1000 + |−5|*10
  });
  it('crítico dentro de alertaCriticoDias', () => {
    const r = calcAlertaVencimento({ dias: 1, valor: 1000, alertaCriticoDias: 2, alertaAtencaoDias: 7 });
    expect(r.nivel).toBe('critico');
  });
  it('atenção entre crítico e atenção', () => {
    const r = calcAlertaVencimento({ dias: 5, valor: 1000, alertaCriticoDias: 2, alertaAtencaoDias: 7 });
    expect(r.nivel).toBe('atencao');
  });
  it('fora da janela → null', () => {
    expect(calcAlertaVencimento({ dias: 30, alertaAtencaoDias: 7 })).toBeNull();
    expect(calcAlertaVencimento({ dias: null })).toBeNull();
  });
  it('cheque + valor alto + op financeira somam boosts no score', () => {
    const base = calcAlertaVencimento({ dias: 1, valor: 1000 });
    const boosted = calcAlertaVencimento({ dias: 1, valor: 1000, ehCheque: true, valorAlto: true, ehOpFinanceira: true });
    expect(boosted.score).toBeCloseTo(base.score + 200 + 150 + 250, 5);
  });
});
