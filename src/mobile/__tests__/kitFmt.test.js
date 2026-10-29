import { describe, it, expect } from 'vitest';
import { brlc, peso, data, quando, saudacao, primeiroNome, pct, brl2 } from '../kit/fmt';

describe('kit/fmt', () => {
  it('R$ compacto', () => {
    expect(brlc(940)).toBe('R$ 940');
    expect(brlc(31800)).toBe('R$ 31,8 mil');
    expect(brlc(318000)).toBe('R$ 318 mil');
    expect(brlc(1240000)).toBe('R$ 1,24 mi');
    expect(brlc(16000000)).toBe('R$ 16,0 mi');
  });
  it('peso executivo em t a partir de 10 t', () => {
    expect(peso(8125)).toBe('8.125 kg');
    expect(peso(47260)).toBe('47,3 t');
  });
  it('datas locais sem desvio de fuso', () => {
    expect(data('2026-10-28', { ano: false })).toBe('28/10');
    const hoje = new Date(2026, 9, 28, 22, 0);
    expect(quando('2026-10-28', hoje)).toBe('hoje');
    expect(quando('2026-10-29', hoje)).toBe('amanhã');
    expect(quando('2026-11-02', hoje)).toBe('em 5 dias');
    expect(quando('2026-10-20', hoje)).toBe('há 8 dias');
  });
  it('saudação e primeiro nome', () => {
    expect(saudacao(new Date(2026, 0, 1, 9))).toBe('Bom dia');
    expect(saudacao(new Date(2026, 0, 1, 15))).toBe('Boa tarde');
    expect(saudacao(new Date(2026, 0, 1, 21))).toBe('Boa noite');
    expect(primeiroNome({ nome: 'Guilherme Maciel Vieira' })).toBe('Guilherme');
    expect(primeiroNome({ email: 'diretoria@montex.com.br' })).toBe('diretoria');
  });
  it('valores ausentes viram travessão', () => {
    expect(pct(null)).toBe('—');
    expect(brl2(undefined)).toBe('—');
  });
});
