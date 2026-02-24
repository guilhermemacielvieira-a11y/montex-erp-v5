/**
 * MONTEX ERP - Hook de Histórico de Produção
 *
 * Registra e consulta transições de etapa na tabela producao_historico.
 * Cada movimentação no Kanban (Corte ou Produção) gera um registro
 * com funcionário, timestamps e etapas de origem/destino.
 */

import { useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/api/supabaseClient';

export function useProducaoHistorico() {

  // Registrar transição de etapa
  const registrarTransicao = useCallback(async (pecaId, etapaDe, etapaPara, funcionarioId, funcionarioNome, observacoes) => {
    // Sempre registrar no console para debug
    console.log(`[Histórico] ${pecaId}: ${etapaDe} → ${etapaPara} (${funcionarioNome || funcionarioId})`);

    if (!isSupabaseConfigured()) {
      console.warn('[Histórico] Supabase não configurado, registro apenas local');
      return true;
    }

    try {
      const { error } = await supabase
        .from('producao_historico')
        .insert({
          id: `HIST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          peca_id: pecaId,
          etapa_de: etapaDe,
          etapa_para: etapaPara,
          funcionario_id: funcionarioId || null,
          funcionario_nome: funcionarioNome || null,
          data_inicio: new Date().toISOString(),
          observacoes: observacoes || null,
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[Histórico] Erro ao registrar transição:', err);
      return false;
    }
  }, []);

  // Fechar data_fim da etapa anterior (quando peça avança)
  const fecharEtapaAnterior = useCallback(async (pecaId, etapaPara) => {
    if (!isSupabaseConfigured()) return;

    try {
      // Buscar último registro aberto desta peça
      const { data, error } = await supabase
        .from('producao_historico')
        .select('id')
        .eq('peca_id', pecaId)
        .is('data_fim', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        await supabase
          .from('producao_historico')
          .update({ data_fim: new Date().toISOString() })
          .eq('id', data[0].id);
      }
    } catch (err) {
      console.warn('[Histórico] Erro ao fechar etapa anterior:', err);
    }
  }, []);

  // Obter histórico completo de uma peça
  const obterHistoricoPeca = useCallback(async (pecaId) => {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('producao_historico')
        .select('*')
        .eq('peca_id', pecaId)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Histórico] Erro ao buscar histórico:', err);
      return [];
    }
  }, []);

  // Obter histórico por funcionário (para relatórios de produtividade)
  const obterHistoricoFuncionario = useCallback(async (funcionarioId, dataInicio, dataFim) => {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase
        .from('producao_historico')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .order('data_inicio', { ascending: false });

      if (dataInicio) query = query.gte('data_inicio', dataInicio);
      if (dataFim) query = query.lte('data_inicio', dataFim);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Histórico] Erro ao buscar por funcionário:', err);
      return [];
    }
  }, []);

  return {
    registrarTransicao,
    fecharEtapaAnterior,
    obterHistoricoPeca,
    obterHistoricoFuncionario,
  };
}
