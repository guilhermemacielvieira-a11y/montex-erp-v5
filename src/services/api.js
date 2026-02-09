import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Importações de dados locais para fallback
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
 *
 * @typedef {Object} ObrasService
 * @property {Function} getAll - Obtém todas as obras
 * @property {Function} getById - Obtém uma obra por ID
 * @property {Function} update - Atualiza uma obra existente
 */
export const obrasService = {
  /**
   * Obtém todas as obras do banco de dados
   *
   * @returns {Promise<Array>} Array com todas as obras
   * @throws {Error} Se houver erro ao consultar Supabase
   * @example
   * const obras = await obrasService.getAll();
   */
  async getAll() {
    if (!isSupabaseConfigured()) {
      return [OBRA_MODELO];
    }
    const { data, error } = await supabase.from('obras').select('*');
    if (error) throw error;
    return data;
  },

  /**
   * Obtém uma obra específica pelo ID
   *
   * @param {string|number} id - ID da obra a ser recuperada
   * @returns {Promise<Object>} Objeto com os dados da obra
   * @throws {Error} Se a obra não existir ou houver erro ao consultar Supabase
   * @example
   * const obra = await obrasService.getById('obra-123');
   */
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

  /**
   * Atualiza uma obra existente
   *
   * @param {string|number} id - ID da obra a ser atualizada
   * @param {Object} updates - Objeto contendo os campos a serem atualizados
   * @returns {Promise<Object>} Objeto com os dados da obra atualizada
   * @throws {Error} Se Supabase não estiver configurado ou houver erro na atualização
   * @example
   * const obraAtualizada = await obrasService.update('obra-123', {
   *   status: 'em_progresso',
   *   dataFim: '2024-12-31'
   * });
   */
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
 *
 * @typedef {Object} FuncionariosService
 * @property {Function} getAll - Obtém todos os funcionários
 * @property {Function} getById - Obtém um funcionário por ID
 * @property {Function} create - Cria um novo funcionário
 * @property {Function} update - Atualiza um funcionário existente
 * @property {Function} delete - Deleta um funcionário
 * @property {Function} getAtivos - Obtém apenas funcionários ativos
 */
export const funcionariosService = {
  /**
   * Obtém todos os funcionários cadastrados
   *
   * @returns {Promise<Array>} Array com todos os funcionários, incluindo dados de equipe
   * @throws {Error} Se houver erro ao consultar Supabase
   * @example
   * const funcionarios = await funcionariosService.getAll();
   */
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

  /**
   * Obtém um funcionário específico pelo ID
   *
   * @param {string|number} id - ID do funcionário a ser recuperado
   * @returns {Promise<Object>} Objeto com os dados do funcionário
   * @throws {Error} Se o funcionário não existir ou houver erro ao consultar Supabase
   * @example
   * const funcionario = await funcionariosService.getById('func-001');
   */
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

  /**
   * Cria um novo funcionário no banco de dados
   *
   * @param {Object} funcionario - Objeto com os dados do novo funcionário
   * @param {string} funcionario.nome - Nome do funcionário
   * @param {string} funcionario.email - Email do funcionário
   * @param {string} funcionario.cargo - Cargo do funcionário
   * @param {boolean} [funcionario.ativo=true] - Status ativo/inativo do funcionário
   * @returns {Promise<Object>} Objeto com os dados do funcionário criado, incluindo ID gerado
   * @throws {Error} Se Supabase não estiver configurado ou houver erro na inserção
   * @example
   * const novoFuncionario = await funcionariosService.create({
   *   nome: 'João Silva',
   *   email: 'joao@email.com',
   *   cargo: 'Encarregado',
   *   ativo: true
   * });
   */
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

  /**
   * Atualiza um funcionário existente
   *
   * @param {string|number} id - ID do funcionário a ser atualizado
   * @param {Object} updates - Objeto contendo os campos a serem atualizados
   * @returns {Promise<Object>} Objeto com os dados do funcionário atualizado
   * @throws {Error} Se Supabase não estiver configurado ou houver erro na atualização
   * @example
   * const funcionarioAtualizado = await funcionariosService.update('func-001', {
   *   cargo: 'Supervisor',
   *   ativo: false
   * });
   */
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

  /**
   * Deleta um funcionário do banco de dados
   *
   * @param {string|number} id - ID do funcionário a ser deletado
   * @returns {Promise<void>}
   * @throws {Error} Se Supabase não estiver configurado ou houver erro na deleção
   * @example
   * await funcionariosService.delete('func-001');
   */
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

  /**
   * Obtém apenas os funcionários ativos
   *
   * @returns {Promise<Array>} Array com funcionários que têm status ativo = true
   * @throws {Error} Se houver erro ao consultar Supabase
   * @example
   * const funcionariosAtivos = await funcionariosService.getAtivos();
   */
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
 * Permite consultar equipes e seus membros
 *
 * @typedef {Object} EquipesService
 * @property {Function} getAll - Obtém todas as equipes
 * @property {Function} getById - Obtém uma equipe por ID com seus membros
 */
export const equipesService = {
  /**
   * Obtém todas as equipes cadastradas
   *
   * @returns {Promise<Array>} Array com todas as equipes e referência aos membros
   * @throws {Error} Se houver erro ao consultar Supabase
   * @example
   * const equipes = await equipesService.getAll();
   */
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

  /**
   * Obtém uma equipe específica pelo ID com todos os seus membros
   *
   * @param {string|number} id - ID da equipe a ser recuperada
   * @returns {Promise<Object>} Objeto com dados da equipe e lista detalhada de membros
   * @throws {Error} Se a equipe não existir ou houver erro ao consultar Supabase
   * @example
   * const equipe = await equipesService.getById('equipe-001');
   */
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
 * Permite criar, consultar e atualizar despesas associadas às obras
 *
 * @typedef {Object} LancamentosService
 * @property {Function} getAll - Obtém todos os lançamentos, opcionalmente filtrados por obra
 * @property {Function} create - Cria um novo lançamento de despesa
 * @property {Function} update - Atualiza um lançamento existente
 * @property {Function} getPagos - Obtém apenas lançamentos com status pago
 * @property {Function} getTotalPago - Calcula o total de despesas pagas
 */
export const lancamentosService = {
  /**
   * Obtém todos os lançamentos de despesas, opcionalmente filtrados por obra
   *
   * @param {string|number} [obraId] - ID opcional da obra para filtrar lançamentos
   * @returns {Promise<Array>} Array com todos os lançamentos ordenados por data decrescente
   * @throws {Error} Se houver erro ao consultar Supabase
   * @example
   * const lancamentos = await lancamentosService.getAll('obra-123');
   * const todosPagamentos = await lancamentosService.getAll();
   */
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

  /**
   * Cria um novo lançamento de despesa no banco de dados
   *
   * @param {Object} lancamento - Objeto com os dados do novo lançamento
   * @param {string|number} lancamento.obra_id - ID da obra associada
   * @param {string} lancamento.descricao - Descrição da despesa
   * @param {number} lancamento.valor - Valor da despesa
   * @param {string} lancamento.data_emissao - Data de emissão (YYYY-MM-DD)
   * @param {string} [lancamento.status='pendente'] - Status (pendente, pago, cancelado)
   * @returns {Promise<Object>} Objeto com os dados do lançamento criado, incluindo ID gerado
   * @throws {Error} Se Supabase não estiver configurado ou houver erro na inserção
   * @example
   * const novoLancamento = await lancamentosService.create({
   *   obra_id: 'obra-123',
   *   descricao: 'Materiais de construção',
   *   valor: 5000.00,
   *   data_emissao: '2024-02-09',
   *   status: 'pendente'
   * });
   */
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

  /**
   * Atualiza um lançamento de despesa existente
   *
   * @param {string|number} id - ID do lançamento a ser atualizado
   * @param {Object} updates - Objeto contendo os campos a serem atualizados
   * @returns {Promise<Object>} Objeto com os dados do lançamento atualizado
   * @throws {Error} Se Supabase não estiver configurado ou houver erro na atualização
   * @example
   * const lancamentoAtualizado = await lancamentosService.update('lanc-001', {
   *   status: 'pago',
   *   valor: 5200.00
   * });
   */
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

  /**
   * Obtém apenas os lançamentos com status "pago"
   *
   * @param {string|number} obraId - ID da obra para filtrar lançamentos pagos
   * @returns {Promise<Array>} Array com todos os lançamentos pagos da obra
   * @throws {Error} Se houver erro ao consultar Supabase
   * @example
   * const despesasPagas = await lancamentosService.getPagos('obra-123');
   */
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

  /**
   * Calcula o total de despesas pagas para uma obra específica
   * Utiliza função RPC do Supabase para melhor performance em grandes volumes
   *
   * @param {string|number} obraId - ID da obra
   * @returns {Promise<number>} Valor total de despesas pagas
   * @throws {Error} Se houver erro ao consultar Supabase
   * @example
   * const totalPago = await lancamentosService.getTotalPago('obra-123');
   */
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
 * Permite criar e consultar medições associadas às obras
 *
 * @typedef {Object} MedicoesService
 * @property {Function} getAll - Obtém todas as medições, opcionalmente filtradas por obra
 * @property {Function} create - Cria uma nova medição de receita
 */
export const medicoesService = {
  /**
   * Obtém todas as medições de receitas, opcionalmente filtradas por obra
   *
   * @param {string|number} [obraId] - ID opcional da obra para filtrar medições
   * @returns {Promise<Array>} Array com todas as medições ordenadas por data de criação decrescente
   * @throws {Error} Se houver erro ao consultar Supabase
   * @example
   * const medicoes = await medicoesService.getAll('obra-123');
   * const todasMedicoes = await medicoesService.getAll();
   */
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

  /**
   * Cria uma nova medição de receita no banco de dados
   *
   * @param {Object} medicao - Objeto com os dados da nova medição
   * @param {string|number} medicao.obra_id - ID da obra associada
   * @param {string} medicao.descricao - Descrição da medição
   * @param {number} medicao.valor_medido - Valor medido na receita
   * @param {string} medicao.data_medicao - Data da medição (YYYY-MM-DD)
   * @returns {Promise<Object>} Objeto com os dados da medição criada, incluindo ID gerado
   * @throws {Error} Se Supabase não estiver configurado ou houver erro na inserção
   * @example
   * const novaMedicao = await medicoesService.create({
   *   obra_id: 'obra-123',
   *   descricao: 'Medição parcial - Estrutura 40%',
   *   valor_medido: 432000.00,
   *   data_medicao: '2024-02-09'
   * });
   */
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

/**
 * Serviço para gerenciar operações relacionadas à composição do contrato
 * Fornece informações sobre a estrutura e distribuição de valores do contrato
 *
 * @typedef {Object} ComposicaoService
 * @property {Function} get - Obtém a composição do contrato de uma obra
 */
export const composicaoService = {
  /**
   * Obtém a composição do contrato de uma obra específica
   * Retorna categorias e distribuição percentual de valores
   *
   * @param {string|number} obraId - ID da obra
   * @returns {Promise<Object>} Objeto com valorTotal e array de categorias ordenadas por percentual
   * @returns {Promise<Object>} .obraId - ID da obra
   * @returns {Promise<Object>} .valorTotal - Valor total do contrato
   * @returns {Promise<Object>} .categorias - Array com categorias de despesa e seus percentuais
   * @throws {Error} Se houver erro ao consultar Supabase
   * @example
   * const composicao = await composicaoService.get('obra-123');
   * console.log(composicao.valorTotal, composicao.categorias);
   */
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

/**
 * Serviço para gerenciar operações relacionadas a pedidos pré-aprovados
 * Fornece acesso aos pedidos que já foram aprovados para compra
 *
 * @typedef {Object} PedidosService
 * @property {Function} getAll - Obtém todos os pedidos pré-aprovados
 */
export const pedidosService = {
  /**
   * Obtém todos os pedidos pré-aprovados, opcionalmente filtrados por obra
   *
   * @param {string|number} [obraId] - ID opcional da obra para filtrar pedidos
   * @returns {Promise<Array>} Array com todos os pedidos pré-aprovados
   * @throws {Error} Se houver erro ao consultar Supabase
   * @example
   * const pedidos = await pedidosService.getAll('obra-123');
   * const todosPedidos = await pedidosService.getAll();
   */
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

/**
 * Serviço para gerenciar operações relacionadas ao diário de produção
 * Permite consultar e criar registros diários de atividades e produção
 *
 * @typedef {Object} DiarioService
 * @property {Function} getByDate - Obtém registros do diário para uma data específica
 * @property {Function} create - Cria um novo registro no diário de produção
 */
export const diarioService = {
  /**
   * Obtém todos os registros do diário de produção para uma data específica
   *
   * @param {string} data - Data no formato YYYY-MM-DD
   * @returns {Promise<Array>} Array com registros do diário para a data informada
   * @throws {Error} Se houver erro ao consultar Supabase
   * @example
   * const registros = await diarioService.getByDate('2024-02-09');
   */
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

  /**
   * Cria um novo registro no diário de produção
   *
   * @param {Object} registro - Objeto com os dados do novo registro
   * @param {string} registro.data - Data do registro (YYYY-MM-DD)
   * @param {string|number} registro.obra_id - ID da obra associada
   * @param {string} registro.descricao - Descrição das atividades do dia
   * @param {number} [registro.horas_trabalhadas] - Horas totais trabalhadas
   * @param {string} [registro.observacoes] - Observações adicionais
   * @returns {Promise<Object>} Objeto com os dados do registro criado, incluindo ID gerado
   * @throws {Error} Se Supabase não estiver configurado ou houver erro na inserção
   * @example
   * const novoRegistro = await diarioService.create({
   *   data: '2024-02-09',
   *   obra_id: 'obra-123',
   *   descricao: 'Escavação da fundação - Etapa 2',
   *   horas_trabalhadas: 8,
   *   observacoes: 'Clima favorável, trabalho dentro do cronograma'
   * });
   */
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

/**
 * Serviço para gerenciar operações relacionadas ao dashboard resumido
 * Fornece dados agregados para visualização rápida do status das obras
 *
 * @typedef {Object} DashboardService
 * @property {Function} getResumo - Obtém resumo financeiro e operacional de uma obra
 */
export const dashboardService = {
  /**
   * Obtém resumo geral de uma obra com dados financeiros e operacionais
   * Útil para painéis de controle e dashboards executivos
   *
   * @param {string|number} obraId - ID da obra
   * @returns {Promise<Object>} Objeto com resumo da obra
   * @returns {Promise<Object>} .valorContrato - Valor total do contrato
   * @returns {Promise<Object>} .despesasPagas - Total de despesas já pagas
   * @returns {Promise<Object>} .saldoRestante - Valor disponível (contrato - despesas)
   * @returns {Promise<Object>} .totalLancamentos - Quantidade total de lançamentos
   * @returns {Promise<Object>} .funcionariosAtivos - Quantidade de funcionários ativos na obra
   * @returns {Promise<Object>} .equipesAtivas - Quantidade de equipes ativas na obra
   * @throws {Error} Se houver erro ao consultar Supabase
   * @example
   * const resumo = await dashboardService.getResumo('obra-123');
   * console.log(`Saldo: R$ ${resumo.saldoRestante}`);
   */
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
