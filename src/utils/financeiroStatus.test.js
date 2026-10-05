import { describe, it, expect } from 'vitest';
import {
  normalizeStatusReceita, normalizeStatusDespesa,
  receitaRecebida, despesaPaga, despesaCancelada, receitaCancelada,
  medicaoReconhecida, medicaoPrevista,
} from '@/utils/financeiroStatus';

describe('normalizeStatusReceita', () => {
  it('variantes de recebido', () => {
    ['recebido', 'Recebida', 'PAGO', 'paga', 'confirmado', 'quitado'].forEach(s =>
      expect(normalizeStatusReceita(s)).toBe('recebido'));
  });
  it('faturado/aprovada são faturado (não recebido)', () => {
    ['faturado', 'FATURADA', 'aprovada', 'emitido'].forEach(s =>
      expect(normalizeStatusReceita(s)).toBe('faturado'));
    expect(receitaRecebida('faturado')).toBe(false);
  });
  it('previstas/aguardando/pendentes são aberto', () => {
    ['prevista', 'aguardando', 'em_analise', 'em análise', 'pendente', 'ATRASADO', '', null, undefined, 'xyz'].forEach(s =>
      expect(normalizeStatusReceita(s)).toBe('aberto'));
  });
  it('cancelado/rejeitada', () => {
    ['cancelado', 'Cancelada', 'rejeitada'].forEach(s => expect(normalizeStatusReceita(s)).toBe('cancelado'));
    expect(receitaCancelada('rejeitada')).toBe(true);
  });
});

describe('normalizeStatusDespesa', () => {
  it('variantes de pago', () => {
    ['pago', 'PAGA', 'quitado', 'liquidado'].forEach(s => expect(normalizeStatusDespesa(s)).toBe('pago'));
    expect(despesaPaga('Paga')).toBe(true);
  });
  it('aprovado / pré-aprovado / faturado', () => {
    ['aprovado', 'APROVADA', 'pre_aprovado', 'pre-aprovado', 'faturado'].forEach(s =>
      expect(normalizeStatusDespesa(s)).toBe('aprovado'));
    expect(despesaPaga('faturado')).toBe(false);
  });
  it('pendente default', () => {
    ['pendente', 'futuro', 'atrasado', '', null, 'qualquer'].forEach(s =>
      expect(normalizeStatusDespesa(s)).toBe('pendente'));
  });
  it('cancelado', () => {
    expect(normalizeStatusDespesa('CANCELADO')).toBe('cancelado');
    expect(despesaCancelada('cancelada')).toBe(true);
  });
});

describe('medições', () => {
  it('reconhecida: aprovada/faturada/paga', () => {
    ['aprovada', 'faturada', 'paga', 'PAGA', 'recebido'].forEach(s => expect(medicaoReconhecida(s)).toBe(true));
  });
  it('não reconhecida: prevista/aguardando/rejeitada', () => {
    ['prevista', 'aguardando', 'em_analise', 'rejeitada', '', null].forEach(s => expect(medicaoReconhecida(s)).toBe(false));
  });
  it('prevista inclui aguardando/em análise e vazio, não rejeitada', () => {
    expect(medicaoPrevista('aguardando')).toBe(true);
    expect(medicaoPrevista('em_analise')).toBe(true);
    expect(medicaoPrevista(undefined)).toBe(true);
    expect(medicaoPrevista('rejeitada')).toBe(false);
    expect(medicaoPrevista('paga')).toBe(false);
  });
});
