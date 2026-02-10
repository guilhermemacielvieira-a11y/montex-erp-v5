// MONTEX ERP Premium V5 - Base44 Client com Supabase Real
// Substituição do mock por integração real com Supabase
// Mantém a mesma interface para compatibilidade com todos os 67+ componentes

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const mockUser = {
  id: 'local-user-001',
  email: 'guilherme.maciel.vieira@gmail.com',
  name: 'Guilherme Maciel',
  role: 'admin'
};

// ============================
// MAPEAMENTO DE ENTIDADES → TABELAS SUPABASE
// ============================
// Entidades com tabelas específicas no Supabase
const ENTITY_TABLE_MAP = {
  // Tabelas do schema.sql original
  Projeto: 'obras',
  Cliente: 'clientes',
  Funcionario: 'funcionarios',
  Despesa: 'lancamentos_despesas',
  Receita: 'medicoes_receitas',
  User: 'usuarios',
  Material: 'estoque',
  // Tabelas criadas na migration_v3
  Orcamento: 'orcamentos',
  ItemProducao: 'pecas_producao',
  Tarefa: 'tarefas',
  LancamentoProducao: 'diario_producao',
};

// Mapeamento de nomes de colunas de ordenação por tabela
const SORT_COLUMN_MAP = {
  obras: { created_date: 'created_at' },
  funcionarios: { created_date: 'created_at' },
  lancamentos_despesas: { created_date: 'created_at' },
  medicoes_receitas: { created_date: 'created_at' },
  usuarios: { created_date: 'created_at' },
  estoque: { created_date: 'created_at' },
  orcamentos: { created_date: 'created_at' },
  pecas_producao: { created_date: 'created_at' },
  tarefas: { created_date: 'created_at' },
  diario_producao: { created_date: 'created_at' },
};

/**
 * Resolve o nome real da coluna para uma tabela específica
 */
const resolveColumnName = (tableName, columnName) => {
  const tableMap = SORT_COLUMN_MAP[tableName];
  if (tableMap && tableMap[columnName]) {
    return tableMap[columnName];
  }
  return columnName;
};

/**
 * Cria um serviço de entidade conectado ao Supabase
 * Para entidades com tabela específica: usa a tabela diretamente
 * Para entidades sem tabela: usa a tabela genérica 'entity_store'
 */
const createSupabaseEntity = (entityName) => {
  const specificTable = ENTITY_TABLE_MAP[entityName];
  const useGenericStore = !specificTable;
  const tableName = specificTable || 'entity_store';

  return {
    /**
     * Lista todos os registros da entidade
     * @param {string} [sortField] - Campo para ordenação. Prefixo '-' = descendente
     * @param {number} [limit] - Número máximo de registros
     */
    list: async (sortField, limit) => {
      if (!isSupabaseConfigured()) return [];

      try {
        let query = supabase.from(tableName).select('*');

        // Para entity_store, filtrar por tipo
        if (useGenericStore) {
          query = query.eq('entity_type', entityName);
        }

        // Processar campo de ordenação
        if (sortField && typeof sortField === 'string') {
          const ascending = !sortField.startsWith('-');
          const rawField = sortField.replace(/^-/, '');
          const resolvedField = useGenericStore
            ? 'created_date'
            : resolveColumnName(tableName, rawField);
          query = query.order(resolvedField, { ascending });
        } else {
          // Ordenação padrão: mais recente primeiro
          const defaultSort = useGenericStore
            ? 'created_date'
            : resolveColumnName(tableName, 'created_date');
          query = query.order(defaultSort, { ascending: false });
        }

        if (limit && typeof limit === 'number') {
          query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) {
          console.warn(`[base44] Erro ao listar ${entityName}:`, error.message);
          return [];
        }

        // Transformar dados do entity_store para formato plano
        if (useGenericStore) {
          return (data || []).map(row => ({
            id: row.id,
            ...(row.data || {}),
            created_date: row.created_date,
            updated_at: row.updated_at
          }));
        }

        return data || [];
      } catch (err) {
        console.warn(`[base44] Erro ao listar ${entityName}:`, err);
        return [];
      }
    },

    /**
     * Filtra registros por condições
     * @param {Object} conditions - Objeto com pares campo:valor para filtrar
     */
    filter: async (conditions) => {
      if (!isSupabaseConfigured()) return [];

      try {
        let query = supabase.from(tableName).select('*');

        if (useGenericStore) {
          query = query.eq('entity_type', entityName);
          const { data, error } = await query;
          if (error) return [];

          const results = (data || []).map(row => ({
            id: row.id,
            ...(row.data || {}),
            created_date: row.created_date
          }));

          // Aplicar filtros em JavaScript para entity_store (JSONB)
          if (conditions && typeof conditions === 'object') {
            return results.filter(item =>
              Object.entries(conditions).every(([key, value]) => item[key] === value)
            );
          }
          return results;
        }

        // Para tabelas específicas, aplicar filtros via Supabase
        if (conditions && typeof conditions === 'object') {
          Object.entries(conditions).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              query = query.in(key, value);
            } else {
              query = query.eq(key, value);
            }
          });
        }

        const { data, error } = await query;
        if (error) {
          console.warn(`[base44] Erro ao filtrar ${entityName}:`, error.message);
          return [];
        }
        return data || [];
      } catch (err) {
        console.warn(`[base44] Erro ao filtrar ${entityName}:`, err);
        return [];
      }
    },

    /**
     * Obtém um registro pelo ID
     * @param {number|string} id - ID do registro
     */
    get: async (id) => {
      if (!isSupabaseConfigured()) return null;

      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();

        if (error) return null;

        if (useGenericStore && data) {
          return { id: data.id, ...(data.data || {}), created_date: data.created_date };
        }

        return data;
      } catch (err) {
        return null;
      }
    },

    /**
     * Cria um novo registro
     * @param {Object} payload - Dados do registro a ser criado
     */
    create: async (payload) => {
      if (!isSupabaseConfigured()) {
        return { id: `${entityName}-${Date.now()}`, ...payload };
      }

      try {
        let insertData;
        if (useGenericStore) {
          insertData = {
            entity_type: entityName,
            data: payload
          };
        } else {
          insertData = { ...payload };
        }

        const { data, error } = await supabase
          .from(tableName)
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error(`[base44] Erro ao criar ${entityName}:`, error.message);
          // Fallback para não quebrar a UI
          return { id: `${entityName}-${Date.now()}`, ...payload };
        }

        if (useGenericStore) {
          return { id: data.id, ...(data.data || {}), created_date: data.created_date };
        }

        return data;
      } catch (err) {
        console.error(`[base44] Erro ao criar ${entityName}:`, err);
        return { id: `${entityName}-${Date.now()}`, ...payload };
      }
    },

    /**
     * Cria múltiplos registros de uma vez (batch insert)
     * @param {Array<Object>} items - Array de objetos a serem criados
     * @returns {Array<Object>} Array de registros criados
     */
    bulkCreate: async (items) => {
      if (!isSupabaseConfigured() || !items || items.length === 0) {
        return items.map((item, i) => ({ id: `${entityName}-bulk-${Date.now()}-${i}`, ...item }));
      }

      try {
        let insertData;
        if (useGenericStore) {
          insertData = items.map(item => ({
            entity_type: entityName,
            data: item
          }));
        } else {
          insertData = items;
        }

        const { data, error } = await supabase
          .from(tableName)
          .insert(insertData)
          .select();

        if (error) {
          console.error(`[base44] Erro ao bulkCreate ${entityName}:`, error.message);
          return items.map((item, i) => ({ id: `${entityName}-bulk-${Date.now()}-${i}`, ...item }));
        }

        if (useGenericStore) {
          return (data || []).map(row => ({
            id: row.id,
            ...(row.data || {}),
            created_date: row.created_date
          }));
        }

        return data || [];
      } catch (err) {
        console.error(`[base44] Erro ao bulkCreate ${entityName}:`, err);
        return items.map((item, i) => ({ id: `${entityName}-bulk-${Date.now()}-${i}`, ...item }));
      }
    },

    /**
     * Atualiza um registro existente
     * @param {number|string} id - ID do registro
     * @param {Object} updates - Campos a serem atualizados
     */
    update: async (id, updates) => {
      if (!isSupabaseConfigured()) {
        return { id, ...updates };
      }

      try {
        if (useGenericStore) {
          // Obter dados existentes e mesclar
          const { data: existing } = await supabase
            .from(tableName)
            .select('data')
            .eq('id', id)
            .single();

          const mergedData = { ...(existing?.data || {}), ...updates };

          const { data, error } = await supabase
            .from(tableName)
            .update({ data: mergedData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return { id: data.id, ...(data.data || {}) };
        }

        const { data, error } = await supabase
          .from(tableName)
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error(`[base44] Erro ao atualizar ${entityName}:`, err);
        return { id, ...updates };
      }
    },

    /**
     * Deleta um registro pelo ID
     * @param {number|string} id - ID do registro
     */
    delete: async (id) => {
      if (!isSupabaseConfigured()) return true;

      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);

        if (error) {
          console.error(`[base44] Erro ao deletar ${entityName}:`, error.message);
        }
        return true;
      } catch (err) {
        console.error(`[base44] Erro ao deletar ${entityName}:`, err);
        return true;
      }
    },

    /**
     * Inscreve-se para atualizações em tempo real
     * @param {Function} callback - Função chamada quando há mudanças
     * @returns {Function} Função para cancelar a inscrição
     */
    subscribe: (callback) => {
      if (!isSupabaseConfigured()) return () => {};

      try {
        const channel = supabase
          .channel(`${entityName}_changes`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: tableName,
            ...(useGenericStore ? { filter: `entity_type=eq.${entityName}` } : {})
          }, (payload) => {
            if (callback) callback(payload);
          })
          .subscribe();

        // Retorna função de unsubscribe
        return () => {
          supabase.removeChannel(channel);
        };
      } catch (err) {
        return () => {};
      }
    }
  };
};

// ============================
// EXPORTAÇÃO DO CLIENTE BASE44
// ============================
export const base44 = {
  auth: {
    me: async () => mockUser,
    logout: (redirectUrl) => {
      if (redirectUrl) window.location.href = redirectUrl;
    },
    redirectToLogin: (redirectUrl) => {
      window.location.reload();
    }
  },
  entities: {
    Tarefa: createSupabaseEntity('Tarefa'),
    ItemProducao: createSupabaseEntity('ItemProducao'),
    LancamentoProducao: createSupabaseEntity('LancamentoProducao'),
    Projeto: createSupabaseEntity('Projeto'),
    Orcamento: createSupabaseEntity('Orcamento'),
    Cliente: createSupabaseEntity('Cliente'),
    Funcionario: createSupabaseEntity('Funcionario'),
    Despesa: createSupabaseEntity('Despesa'),
    Receita: createSupabaseEntity('Receita'),
    Relatorio: createSupabaseEntity('Relatorio'),
    MovimentacaoFinanceira: createSupabaseEntity('MovimentacaoFinanceira'),
    Automacao: createSupabaseEntity('Automacao'),
    FluxoAprovacao: createSupabaseEntity('FluxoAprovacao'),
    SolicitacaoAprovacao: createSupabaseEntity('SolicitacaoAprovacao'),
    User: createSupabaseEntity('User'),
    MensagemProjeto: createSupabaseEntity('MensagemProjeto'),
    AlocacaoRecurso: createSupabaseEntity('AlocacaoRecurso'),
    AgendamentoRelatorio: createSupabaseEntity('AgendamentoRelatorio'),
    AgendamentoRelatorioRecorrente: createSupabaseEntity('AgendamentoRelatorioRecorrente'),
    MapeamentoPredefinido: createSupabaseEntity('MapeamentoPredefinido'),
    Material: createSupabaseEntity('Material'),
    ConsumoDeMaterial: createSupabaseEntity('ConsumoDeMaterial'),
    Custo: createSupabaseEntity('Custo'),
    CustoProducao: createSupabaseEntity('CustoProducao'),
    FiltroPersonalizado: createSupabaseEntity('FiltroPersonalizado'),
    HistoricoRelatorio: createSupabaseEntity('HistoricoRelatorio'),
    LogAutomacao: createSupabaseEntity('LogAutomacao'),
    ModeloRelatorio: createSupabaseEntity('ModeloRelatorio'),
    Notificacao: createSupabaseEntity('Notificacao'),
    OrcamentoDetalhado: createSupabaseEntity('OrcamentoDetalhado'),
    AlocacaoDespesa: createSupabaseEntity('AlocacaoDespesa'),
  },
  storage: {
    upload: async (file) => {
      if (!isSupabaseConfigured()) {
        return { url: URL.createObjectURL(file), name: file.name };
      }

      try {
        const fileName = `${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from('uploads')
          .upload(fileName, file);

        if (error) {
          console.warn('[base44] Erro no upload, usando URL local:', error.message);
          return { url: URL.createObjectURL(file), name: file.name };
        }

        const { data: urlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(fileName);

        return { url: urlData.publicUrl, name: file.name };
      } catch (err) {
        return { url: URL.createObjectURL(file), name: file.name };
      }
    },
    delete: async (url) => true
  }
};

export default base44;
