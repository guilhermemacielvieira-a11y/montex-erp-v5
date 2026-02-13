/**
 * MONTEX ERP V5 - Camada de Serviços (API Service Layer)
 *
 * Encapsula todas as operações de banco de dados (Supabase) em serviços reutilizáveis.
 * Cada serviço implementa o padrão fallback: usa Supabase se disponível, senão retorna dados locais.
 *
 * Serviços disponíveis:
 * - obrasService: CRUD de obras/projetos
 * - funcionariosService: CRUD de funcionários
 * - equipesService: Consulta de equipes e membros
 * - lancamentosService: Lançamentos de despesas
 * - medicoesService: Medições de receitas
 * - composicaoService: Composição do contrato
 * - pedidosService: Pedidos pré-aprovados
 * - diarioService: Diário de produção
 * - dashboardService: Resumo financeiro/operacional
 *
 * @module services/api
 * @version 5.2.0
 * @since 2026-02-13
 */

import { supabase, isSupabaseConfigured } from '@/api/supabaseClient';

// Importações de dados locais para fallback (desenvolvimento apenas)
import {
  OBRA_MODELO,
  LANCAMENTOS_DESPESAS,
  MEDICOES_RECEITAS,
  COMPOSICAO_CONTRATO,
  PEDIDOS_PRE_APROVADOS
} from '@/data/obraFinanceiraDatabase';
import {
  funcionarios as localFuncionarios,
  equipes as localEquipes
} from '@/data/database';

// ========== OBRAS ==========

/**
 * Serviço para gerenciar operações relacionadas a obras
 * Implementa padrão fallback: usa Supabase se disponível, senão retorna dados locais
 */
export const obrasService = {
  async getAll() {
    if (!isSupabaseConfigured()) {
      return [OBRA_MODELO];
    }
    const { data, error } = await supabase.from('obras').select('*');
    if (error) throw error;
    return data;
  },

  async getById(id) {
    if (!isSupabaseConfigured()) {
      return OBRA_MODELO;
    }
    const { data, error } = await supabase
      .from('obras')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase não configurado');
    }
    const { data, error } = await supabase
      .from('obras')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ========== FUNCIONÁRIOS ==========

/**
 * Serviço para gerenciar operações relacionadas a funcionários
 * Oferece CRUD completo com suporte a dados locais como fallback
 */
export const funcionariosService = {
  async getAll() {
    if (!isSupabaseConfigured()) {
      return localFuncionarios;
    }
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*, equipes(nome)')
      .order('nome');
    if (error) throw error;
    return data;
  },

  async getById(id) {
    if (!isSupabaseConfigured()) {
      return localFuncionarios.find(f => f.id === id);
    }
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(funcionario) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase não configurado');
    }
    const { data, error } = await supabase
      .from('funcionarios')
      .insert(funcionario)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase não configurado');
    }
    const { data, error } = await supabase
      .from('funcionarios')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase não configurado');
    }
    const { error } = await supabase
      .from('funcionarios')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getAtivos() {
    if (!isSupabaseConfigured()) {
      return localFuncionarios.filter(f => f.ativo);
    }
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('ativo', true);
    if (error) throw error;
    return data;
  }
};

// ========== EQUIPES ==========

/**
 * Serviço para gerenciar operações relacionadas a equipes
 */
export const equipesService = {
  async getAll() {
    if (!isSupabaseConfigured()) {
      return localEquipes;
    }
    const { data, error } = await supabase
      .from('equipes')
      .select('*, equipe_membros(funcionario_id)');
    if (error) throw error;
    return data;
  },

  async getById(id) {
    if (!isSupabaseConfigured()) {
      return localEquipes.find(e => e.id === id);
    }
    const { data, error } = await supabase
      .from('equipes')
      .select('*, equipe_membros(funcionario_id, funcionarios(*))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
};

// ========== LANÇAMENTOS (DESPESAS) ==========

/**
 * Serviço para gerenciar operações relacionadas a lançamentos de despesas
 */
export const lancamentosService = {
  async getAll(obraId) {
    if (!isSupabaseConfigured()) {
      return LANCAMENTOS_DESPESAS.filter(l => !obraId || l.obraId === obraId);
    }
    let query = supabase
      .from('lancamentos_despesas')
      .select('*')
      .order('data_emissao', { ascending: false });
    if (obraId) query = query.eq('obra_id', obraId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(lancamento) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase não configurado');
    }
    const { data, error } = await supabase
      .from('lancamentos_despesas')
      .insert(lancamento)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase não configurado');
    }
    const { data, error } = await supabase
      .from('lancamentos_despesas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getPagos(obraId) {
    if (!isSupabaseConfigured()) {
      return LANCAMENTOS_DESPESAS.filter(
        l => l.status === 'pago' && (!obraId || l.obraId === obraId)
      );
    }
    const { data, error } = await supabase
      .from('lancamentos_despesas')
      .select('*')
      .eq('status', 'pago')
      .eq('obra_id', obraId);
    if (error) throw error;
    return data;
  },

  async getTotalPago(obraId) {
    if (!isSupabaseConfigured()) {
      return LANCAMENTOS_DESPESAS.filter(
        l => l.status === 'pago' && l.obraId === obraId
      ).reduce((sum, l) => sum + l.valor, 0);
    }
    const { data, error } = await supabase.rpc('get_total_despesas_pagas', {
      p_obra_id: obraId
    });
    if (error) throw error;
    return data;
  }
};

// ========== MEDIÇÕES (RECEITAS) ==========

/**
 * Serviço para gerenciar operações relacionadas a medições de receitas
 */
export const medicoesService = {
  async getAll(obraId) {
    if (!isSupabaseConfigured()) {
      return MEDICOES_RECEITAS.filter(m => !obraId || m.obraId === obraId);
    }
    let query = supabase
      .from('medicoes_receitas')
      .select('*')
      .order('created_at', { ascending: false });
    if (obraId) query = query.eq('obra_id', obraId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(medicao) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase não configurado');
    }
    const { data, error } = await supabase
      .from('medicoes_receitas')
      .insert(medicao)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ========== COMPOSIÇÃO DO CONTRATO ==========

export const composicaoService = {
  async get(obraId) {
    if (!isSupabaseConfigured()) {
      return COMPOSICAO_CONTRATO;
    }
    const { data, error } = await supabase
      .from('composicao_contrato')
      .select('*')
      .eq('obra_id', obraId)
      .order('percentual', { ascending: false });
    if (error) throw error;
    return {
      obraId,
      valorTotal: 2700000,
      categorias: data
    };
  }
};

// ========== PEDIDOS PRÉ-APROVADOS ==========

export const pedidosService = {
  async getAll(obraId) {
    if (!isSupabaseConfigured()) {
      return PEDIDOS_PRE_APROVADOS.filter(
        p => !obraId || p.obraId === obraId
      );
    }
    let query = supabase.from('pedidos_pre_aprovados').select('*');
    if (obraId) query = query.eq('obra_id', obraId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};

// ========== DIÁRIO DE PRODUÇÃO ==========

export const diarioService = {
  async getByDate(data) {
    if (!isSupabaseConfigured()) {
      return [];
    }
    const { data: registros, error } = await supabase
      .from('diario_producao')
      .select('*')
      .eq('data', data);
    if (error) throw error;
    return registros;
  },

  async create(registro) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase não configurado');
    }
    const { data, error } = await supabase
      .from('diario_producao')
      .insert(registro)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ========== DASHBOARD RESUMO ==========

export const dashboardService = {
  async getResumo(obraId) {
    if (!isSupabaseConfigured()) {
      const despesasPagas = LANCAMENTOS_DESPESAS.filter(
        l => l.status === 'pago' && l.obraId === obraId
      ).reduce((sum, l) => sum + l.valor, 0);
      return {
        valorContrato: OBRA_MODELO.contrato.valorTotal,
        despesasPagas,
        saldoRestante: OBRA_MODELO.contrato.valorTotal - despesasPagas,
        totalLancamentos: LANCAMENTOS_DESPESAS.length,
        funcionariosAtivos: localFuncionarios.filter(f => f.ativo).length,
        equipesAtivas: localEquipes.length
      };
    }
    const { data, error } = await supabase.rpc('get_dashboard_resumo', {
      p_obra_id: obraId
    });
    if (error) throw error;
    return data;
  }
};
