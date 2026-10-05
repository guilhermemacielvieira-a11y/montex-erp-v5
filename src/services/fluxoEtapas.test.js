import { describe, it, expect } from 'vitest';
import {
  normalizarEtapa, ordemEtapa, proximaEtapaProducao, etapaAnterior,
  validarTransicao, validarSplit, statusDaEtapa,
} from './fluxoEtapas';

describe('fluxoEtapas', () => {
  it('normaliza corte/vazio para aguardando', () => {
    expect(normalizarEtapa('corte')).toBe('aguardando');
    expect(normalizarEtapa('')).toBe('aguardando');
    expect(normalizarEtapa(' Solda ')).toBe('solda');
    expect(ordemEtapa('fabricacao')).toBe(1);
    expect(ordemEtapa('xyz')).toBe(-1);
  });

  it('próxima etapa de produção para em expedido', () => {
    expect(proximaEtapaProducao('aguardando')).toBe('fabricacao');
    expect(proximaEtapaProducao('pintura')).toBe('expedido');
    expect(proximaEtapaProducao('expedido')).toBeNull();
    expect(etapaAnterior('solda')).toBe('fabricacao');
    expect(etapaAnterior('aguardando')).toBeNull();
  });

  it('aceita avanço de 1 etapa e no-op', () => {
    expect(validarTransicao('aguardando', 'fabricacao').ok).toBe(true);
    expect(validarTransicao('corte', 'fabricacao').ok).toBe(true);
    expect(validarTransicao('pintura', 'expedido').ok).toBe(true);
    expect(validarTransicao('solda', 'solda').ok).toBe(true);
  });

  it('rejeita saltos e destino enviado/entregue', () => {
    expect(validarTransicao('fabricacao', 'pintura').ok).toBe(false);
    expect(validarTransicao('expedido', 'enviado').ok).toBe(false);
    expect(validarTransicao('expedido', 'entregue', { force: true }).ok).toBe(false);
    expect(validarTransicao('solda', 'xyz').ok).toBe(false);
  });

  it('retorno de 1 etapa só com force', () => {
    expect(validarTransicao('solda', 'fabricacao').ok).toBe(false);
    expect(validarTransicao('solda', 'fabricacao', { force: true }).ok).toBe(true);
    expect(validarTransicao('enviado', 'expedido', { force: true }).ok).toBe(true);
    expect(validarTransicao('pintura', 'fabricacao', { force: true }).ok).toBe(false);
  });

  it('valida split', () => {
    expect(validarSplit(10, 3, 'solda', 'fabricacao').ok).toBe(true);
    expect(validarSplit(10, 10, 'solda', 'fabricacao').ok).toBe(false);
    expect(validarSplit(10, 0, 'solda', 'fabricacao').ok).toBe(false);
    expect(validarSplit(10, 2, 'enviado', 'pintura').ok).toBe(false);
    expect(validarSplit(10, 2, 'enviado', 'expedido').ok).toBe(true);
    expect(validarSplit(10, 2, 'entregue', 'expedido').ok).toBe(false);
  });

  it('status coerente com a etapa', () => {
    expect(statusDaEtapa('expedido')).toBe('concluido');
    expect(statusDaEtapa('solda')).toBe('em_producao');
    expect(statusDaEtapa('aguardando', 'pendente')).toBe('pendente');
    expect(statusDaEtapa('aguardando')).toBe('pendente');
  });
});
