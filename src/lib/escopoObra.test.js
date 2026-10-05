import { describe, it, expect } from 'vitest';
import {
  OBRA_GERAL, obraIdUnica, obraIdsDoEscopo, pertenceAoEscopo, escopoValido, isEscopoGeral,
} from '@/lib/escopoObra';

const obras = [{ id: 'obra-001' }, { id: 'obra-004' }, { id: 'obra-005' }];

describe('escopoObra', () => {
  it('geral = todas', () => {
    expect(isEscopoGeral(OBRA_GERAL)).toBe(true);
    expect(isEscopoGeral(null)).toBe(true);
    expect(obraIdsDoEscopo(OBRA_GERAL)).toBeNull();
    expect(obraIdUnica(OBRA_GERAL)).toBeNull();
    expect(pertenceAoEscopo('obra-001', OBRA_GERAL)).toBe(true);
    expect(pertenceAoEscopo(null, OBRA_GERAL)).toBe(true);
  });
  it('grupo TEMEC = duas obras, sem obra única', () => {
    expect(obraIdsDoEscopo('temec')).toEqual(['obra-004', 'obra-005']);
    expect(obraIdUnica('temec')).toBeNull();
    expect(pertenceAoEscopo('obra-005', 'temec')).toBe(true);
    expect(pertenceAoEscopo('obra-001', 'temec')).toBe(false);
  });
  it('obra única', () => {
    expect(obraIdUnica('obra-001')).toBe('obra-001');
    expect(pertenceAoEscopo('obra-001', 'obra-001')).toBe(true);
    expect(pertenceAoEscopo(null, 'obra-001')).toBe(false);
  });
  it('validação do valor salvo', () => {
    expect(escopoValido('geral', obras)).toBe(true);
    expect(escopoValido('temec', obras)).toBe(true);
    expect(escopoValido('obra-001', obras)).toBe(true);
    expect(escopoValido('obra-999', obras)).toBe(false);
  });
});
