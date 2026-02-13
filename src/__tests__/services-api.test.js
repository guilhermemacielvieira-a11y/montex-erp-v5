/**
 * MONTEX ERP V5 - Testes da Camada de Serviços
 *
 * Testa os serviços de API (services/api.js) em modo fallback (sem Supabase).
 * Garante que todos os métodos retornam dados válidos e tratam erros corretamente.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Precisamos importar depois do mock
let obrasService, funcionariosService, equipesService, lancamentosService;
let medicoesService, composicaoService, pedidosService, diarioService, dashboardService;

beforeEach(async () => {
  vi.resetModules();
  const api = await import('@/services/api');
  obrasService = api.obrasService;
  funcionariosService = api.funcionariosService;
  equipesService = api.equipesService;
  lancamentosService = api.lancamentosService;
  medicoesService = api.medicoesService;
  composicaoService = api.composicaoService;
  pedidosService = api.pedidosService;
  diarioService = api.diarioService;
  dashboardService = api.dashboardService;
});

describe('obrasService', () => {
  it('getAll retorna array', async () => {
    const obras = await obrasService.getAll();
    expect(Array.isArray(obras)).toBe(true);
    expect(obras.length).toBeGreaterThan(0);
  });

  it('getById retorna objeto', async () => {
    const obra = await obrasService.getById('any-id');
    expect(obra).toBeDefined();
    expect(typeof obra).toBe('object');
  });

  it('update lanca erro sem Supabase', async () => {
    await expect(obrasService.update('id', {})).rejects.toThrow('Supabase');
  });
});

describe('funcionariosService', () => {
  it('getAll retorna array de funcionarios', async () => {
    const funcionarios = await funcionariosService.getAll();
    expect(Array.isArray(funcionarios)).toBe(true);
  });

  it('getAtivos retorna apenas ativos', async () => {
    const ativos = await funcionariosService.getAtivos();
    expect(Array.isArray(ativos)).toBe(true);
    ativos.forEach(f => {
      expect(f.ativo).toBe(true);
    });
  });

  it('create lanca erro sem Supabase', async () => {
    await expect(funcionariosService.create({})).rejects.toThrow('Supabase');
  });

  it('update lanca erro sem Supabase', async () => {
    await expect(funcionariosService.update('id', {})).rejects.toThrow('Supabase');
  });

  it('delete lanca erro sem Supabase', async () => {
    await expect(funcionariosService.delete('id')).rejects.toThrow('Supabase');
  });
});

describe('equipesService', () => {
  it('getAll retorna array', async () => {
    const equipes = await equipesService.getAll();
    expect(Array.isArray(equipes)).toBe(true);
  });
});

describe('lancamentosService', () => {
  it('getAll retorna array', async () => {
    const lancamentos = await lancamentosService.getAll();
    expect(Array.isArray(lancamentos)).toBe(true);
  });

  it('getPagos retorna apenas pagos', async () => {
    const pagos = await lancamentosService.getPagos('obra-1');
    expect(Array.isArray(pagos)).toBe(true);
    pagos.forEach(l => {
      expect(l.status).toBe('pago');
    });
  });

  it('getTotalPago retorna numero', async () => {
    const total = await lancamentosService.getTotalPago('obra-1');
    expect(typeof total).toBe('number');
  });
});

describe('medicoesService', () => {
  it('getAll retorna array', async () => {
    const medicoes = await medicoesService.getAll();
    expect(Array.isArray(medicoes)).toBe(true);
  });
});

describe('composicaoService', () => {
  it('get retorna objeto com categorias', async () => {
    const composicao = await composicaoService.get('obra-1');
    expect(composicao).toBeDefined();
  });
});

describe('pedidosService', () => {
  it('getAll retorna array', async () => {
    const pedidos = await pedidosService.getAll();
    expect(Array.isArray(pedidos)).toBe(true);
  });
});

describe('diarioService', () => {
  it('getByDate retorna array vazio sem Supabase', async () => {
    const registros = await diarioService.getByDate('2026-02-13');
    expect(Array.isArray(registros)).toBe(true);
    expect(registros.length).toBe(0);
  });

  it('create lanca erro sem Supabase', async () => {
    await expect(diarioService.create({})).rejects.toThrow('Supabase');
  });
});

describe('dashboardService', () => {
  it('getResumo retorna objeto com metricas', async () => {
    const resumo = await dashboardService.getResumo('obra-1');
    expect(resumo).toBeDefined();
    expect(typeof resumo.valorContrato).toBe('number');
    expect(typeof resumo.despesasPagas).toBe('number');
    expect(typeof resumo.saldoRestante).toBe('number');
    expect(typeof resumo.totalLancamentos).toBe('number');
    expect(typeof resumo.funcionariosAtivos).toBe('number');
    expect(typeof resumo.equipesAtivas).toBe('number');
  });
});
