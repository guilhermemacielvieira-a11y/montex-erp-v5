import { describe, it, expect } from 'vitest';
import { caminhoDeepLink } from '../deepLink';

describe('caminhoDeepLink', () => {
  it('esquema próprio montex://m/...', () => {
    expect(caminhoDeepLink('montex://m/aprovacoes')).toBe('/m/aprovacoes');
    expect(caminhoDeepLink('montex://m')).toBe('/m');
    expect(caminhoDeepLink('montex://m/financeiro?aba=pagar')).toBe('/m/financeiro?aba=pagar');
  });
  it('link universal https', () => {
    expect(caminhoDeepLink('https://montex-erp-v5.vercel.app/m/obras/obra-001')).toBe('/m/obras/obra-001');
    expect(caminhoDeepLink('https://montex-erp-v5.vercel.app/m/')).toBe('/m');
  });
  it('caminho pronto (push)', () => {
    expect(caminhoDeepLink('/m/alertas')).toBe('/m/alertas');
    expect(caminhoDeepLink('/m/financeiro?aba=custo')).toBe('/m/financeiro?aba=custo');
  });
  it('recusa rotas fora do app', () => {
    expect(caminhoDeepLink('/mais')).toBeNull();
    expect(caminhoDeepLink('https://montex-erp-v5.vercel.app/Dashboard')).toBeNull();
    expect(caminhoDeepLink('montex://outra/coisa')).toBeNull();
    expect(caminhoDeepLink('nada')).toBeNull();
    expect(caminhoDeepLink(null)).toBeNull();
  });
});
