import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/api/supabaseClient';
import { toDateParam, splitPeca, moverEtapa, movimentarEstoque, baixarCorte } from './producaoRpc';

describe('producaoRpc', () => {
  beforeEach(() => { supabase.rpc.mockReset(); });

  it('toDateParam não sofre shift de fuso', () => {
    expect(toDateParam('2026-05-15')).toBe('2026-05-15');
    expect(toDateParam('2026-05-15T00:00:00.000Z')).toBe('2026-05-15');
    expect(toDateParam(new Date(2026, 4, 15))).toBe('2026-05-15');
    expect(toDateParam(null)).toBeUndefined();
    expect(toDateParam('lixo')).toBeUndefined();
  });

  it('split_peca envia parâmetros e omite opcionais vazios', async () => {
    supabase.rpc.mockResolvedValue({ data: { ok: true }, error: null });
    await splitPeca('PEC-1', '3', 'solda', { funcionario: 'F1', data: '2026-05-15' });
    expect(supabase.rpc).toHaveBeenCalledWith('split_peca', {
      p_id: 'PEC-1', p_qtd: 3, p_nova_etapa: 'solda', p_funcionario: 'F1', p_data: '2026-05-15',
    });
  });

  it('lança erro quando o RPC devolve error', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'Transição inválida', code: '22023' } });
    await expect(moverEtapa('PEC-1', 'pintura')).rejects.toThrow('Transição inválida');
  });

  it('movimentar_estoque usa delta e flags', async () => {
    supabase.rpc.mockResolvedValue({ data: { ok: true, saldo_novo: 5 }, error: null });
    const r = await movimentarEstoque('EST-1', -2, { tipo: 'saida', origem: 'manual', motivo: 'x' });
    expect(r.saldo_novo).toBe(5);
    expect(supabase.rpc).toHaveBeenCalledWith('movimentar_estoque', {
      p_item_id: 'EST-1', p_delta_kg: -2, p_tipo: 'saida', p_origem: 'manual', p_motivo: 'x',
    });
  });

  it('baixar_corte', async () => {
    supabase.rpc.mockResolvedValue({ data: { ok: true, baixa_kg: 40 }, error: null });
    const r = await baixarCorte('MC-1', { funcionario: 'F1' });
    expect(r.baixa_kg).toBe(40);
    expect(supabase.rpc).toHaveBeenCalledWith('baixar_corte', { p_corte_id: 'MC-1', p_funcionario: 'F1' });
  });
});
