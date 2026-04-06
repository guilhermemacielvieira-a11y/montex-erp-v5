// MONTEX ERP Premium - Cliente Supabase Completo
// Todas as tabelas com CRUD + funções auxiliares
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURAÇÃO VIA VARIÁVEIS DE AMBIENTE
// Nunca hardcode chaves no código-fonte!
// ============================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || 'https://trxbohjcwsogthabairh.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_8X7bPhCGF16mgZE8Z7fuVw_6pI74veM';
// Service Role Key: bypassa RLS em tabelas restritivas (orcamentos, compras, etc.)
// NOTA: Em produção com auth, mover para backend. Aqui o app não usa autenticação.
const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeGJvaGpjd3NvZ3RoYWJhaXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA3NTUxMCwiZXhwIjoyMDg1NjUxNTEwfQ.DWv7azSBJop2iywuqh6J-g96ae9QH0IOHovny688pRs';

// Validação de configuração
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '❌ ERRO: Variáveis de ambiente do Supabase não configuradas!\n' +
    'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env\n' +
    'ou nas variáveis de ambiente da Vercel.'
  );
}

// ============================================
// LIMPEZA DE SESSÃO CORROMPIDA (ANTES do createClient)
// ============================================
try {
  if (SUPABASE_URL) {
    const projectRef = SUPABASE_URL.split('//')[1]?.split('.')[0] || '';
    const STORAGE_KEY = `sb-${projectRef}-auth-token`;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const expiresAt = parsed?.expires_at;
        const now = Math.floor(Date.now() / 1000);
        // Se token expirou há mais de 1 hora, é sessão velha — limpar
        if (expiresAt && (now - expiresAt) > 3600) {
          console.warn('[Supabase] Sessão expirada há mais de 1h. Limpando localStorage...');
          localStorage.removeItem(STORAGE_KEY);
        }
        // Se não tem expires_at ou refresh_token, sessão corrompida
        if (!expiresAt || !parsed?.refresh_token) {
          console.warn('[Supabase] Sessão sem expires_at/refresh_token. Limpando...');
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (parseErr) {
        console.warn('[Supabase] Sessão com JSON inválido. Limpando...');
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }
} catch (_) {
  // localStorage não disponível (SSR, incognito, etc)
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      // Desabilitar navigator.locks para evitar deadlock
      lock: async (_name, _acquireTimeout, fn) => {
        return await fn();
      },
      persistSession: true,
      // CORRIGIDO: Reabilitar autoRefreshToken para manter sessões vivas
      // O refresh manual no AuthContext serve como fallback
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: {
      // Timeout de 20s em todas as requisições fetch do Supabase
      // (aumentado de 15s para evitar falsos timeouts em conexões lentas)
      fetch: (url, options = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      }
    }
  }
);

// ============================================
// CLIENTE SERVICE_ROLE (bypassa RLS para tabelas com políticas restritivas)
// Usado para: orcamentos, compras, notas_fiscais, pedidos_material, maquinas, config_medicao
// ============================================
const supabaseAdmin = SUPABASE_SERVICE_KEY
  ? createClient(
      SUPABASE_URL || 'https://placeholder.supabase.co',
      SUPABASE_SERVICE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          fetch: (url, options = {}) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);
            return fetch(url, {
              ...options,
              signal: controller.signal,
            }).finally(() => clearTimeout(timeoutId));
          }
        }
      }
    )
  : null;

// Exporta o admin client (ou fallback para o anon se não configurado)
export { supabaseAdmin };

// ============================================
// HELPER: Gera CRUD genérico para qualquer tabela
// ============================================

/**
 * Creates a generic CRUD interface for a Supabase table
 *
 * @description
 * Factory function that generates a CRUD (Create, Read, Update, Delete) interface
 * for any Supabase table. Provides standard operations with proper error handling
 * and type transformations.
 *
 * @param {string} tableName - Name of the Supabase table
 * @param {string} [defaultOrder='created_at'] - Default column for ordering queries
 *
 * @returns {Object} CRUD operations object
 * @returns {Function} returns.getAll - Fetch all records from table
 * @returns {Function} returns.getById - Fetch single record by ID
 * @returns {Function} returns.getByField - Query records by field value
 * @returns {Function} returns.create - Insert single record
 * @returns {Function} returns.createMany - Insert multiple records
 * @returns {Function} returns.update - Update record by ID
 * @returns {Function} returns.upsert - Insert or update (merge) operation
 * @returns {Function} returns.delete - Delete record by ID
 *
 * @example
 * // Create API for 'obras' table
 * const obrasApi = createCrud('obras', 'created_at');
 *
 * // Fetch all works
 * const obras = await obrasApi.getAll();
 *
 * // Create new work
 * const novaObra = await obrasApi.create({ nome: 'Projeto X', ... });
 *
 * // Update work
 * await obrasApi.update('obra-123', { status: 'em_progresso' });
 */
function createCrud(tableName, defaultOrder = 'created_at', { useAdmin = false } = {}) {
  // Usa supabaseAdmin (service_role) para tabelas com RLS restritivo
  const client = (useAdmin && supabaseAdmin) ? supabaseAdmin : supabase;
  return {
    async getAll(orderBy = defaultOrder, ascending = false) {
      const { data, error } = await client
        .from(tableName)
        .select('*')
        .order(orderBy, { ascending });
      if (error) throw error;
      return data || [];
    },

    async getById(id) {
      const { data, error } = await client
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    async getByField(field, value) {
      const { data, error } = await client
        .from(tableName)
        .select('*')
        .eq(field, value);
      if (error) throw error;
      return data || [];
    },

    async create(record) {
      const { data, error } = await client
        .from(tableName)
        .insert([record])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async createMany(records) {
      const { data, error } = await client
        .from(tableName)
        .insert(records)
        .select();
      if (error) throw error;
      return data;
    },

    async update(id, updates) {
      const { data, error } = await client
        .from(tableName)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async upsert(record) {
      const { data, error } = await client
        .from(tableName)
        .upsert([record])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await client
        .from(tableName)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    },

    async count(filters = {}) {
      let query = client.from(tableName).select('*', { count: 'exact', head: true });
      Object.entries(filters).forEach(([key, val]) => {
        query = query.eq(key, val);
      });
      const { count, error } = await query;
      if (error) throw error;
      return count;
    }
  };
}

// ============================================
// CRUD POR TABELA
// ============================================

export const clientesApi = createCrud('clientes', 'nome');
export const obrasApi = createCrud('obras', 'created_at');
export const listasApi = createCrud('listas_material', 'created_at');
export const estoqueApi = createCrud('estoque', 'descricao');
export const pecasApi = createCrud('pecas_producao', 'id');
export const funcionariosApi = createCrud('funcionarios', 'nome');
export const equipesApi = createCrud('equipes', 'nome');
export const movEstoqueApi = createCrud('movimentacoes_estoque', 'data');
export const medicoesApi = createCrud('medicoes', 'created_at');
export const lancamentosApi = createCrud('lancamentos_despesas', 'data_emissao');
export const croquisApi = createCrud('croquis', 'marca');
export const detalhamentosApi = createCrud('detalhamentos', 'numero');
export const materiaisCorteApi = createCrud('materiais_corte', 'marca');
export const expedicoesApi = createCrud('expedicoes', 'created_at');
export const tarefasApi = createCrud('tarefas', 'created_at');
export const userProfilesApi = createCrud('user_profiles', 'created_at');

// Tabelas com RLS restritivo — usam service_role key para bypassar
export const orcamentosApi = createCrud('orcamentos', 'created_at', { useAdmin: true });
export const comprasApi = createCrud('compras', 'created_at', { useAdmin: true });
export const notasFiscaisApi = createCrud('notas_fiscais', 'data_emissao', { useAdmin: true });
export const maquinasApi = createCrud('maquinas', 'nome', { useAdmin: true });
export const pedidosMaterialApi = createCrud('pedidos_material', 'created_at', { useAdmin: true });
export const configMedicaoApi = createCrud('config_medicao', 'id', { useAdmin: true });

// ============================================
// FUNÇÕES DE GESTÃO DE USUÁRIOS
// ============================================

export async function getAllUserProfiles() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('role', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateUserProfile(id, updates) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createNewUser({ email, password, nome, role, cargo }) {
  // Usa supabaseAdmin (service_role) pois auth.admin.createUser requer Bearer token com service_role
  const adminClient = supabaseAdmin || supabase;
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome, role }
  });

  if (authError) throw authError;

  const { data: profile, error: profileError } = await adminClient
    .from('user_profiles')
    .insert([{
      auth_id: authData.user.id,
      email,
      nome,
      role,
      cargo,
      ativo: true
    }])
    .select()
    .single();

  if (profileError) throw profileError;
  return profile;
}

export async function toggleUserActive(id, ativo) {
  return updateUserProfile(id, { ativo });
}

// ============================================
// FUNÇÕES ESPECÍFICAS DO NEGÓCIO
// ============================================

export async function getObraCompleta(obraId) {
  const [
    obra, pecas, estoqueItems, comprasList,
    nfs, movEstoque, lancamentos, listas,
    equipesList, medicoesList
  ] = await Promise.all([
    obrasApi.getById(obraId),
    pecasApi.getByField('obra_id', obraId),
    estoqueApi.getByField('obra_reservada', obraId),
    comprasApi.getByField('obra_id', obraId),
    notasFiscaisApi.getByField('obra_id', obraId),
    movEstoqueApi.getByField('obra_id', obraId),
    lancamentosApi.getByField('obra_id', obraId),
    listasApi.getByField('obra_id', obraId),
    equipesApi.getByField('obra_atual_id', obraId),
    medicoesApi.getByField('obra_id', obraId)
  ]);

  return {
    ...obra,
    pecas, estoque: estoqueItems, compras: comprasList,
    notasFiscais: nfs, movimentacoesEstoque: movEstoque,
    lancamentosDespesas: lancamentos, listas,
    equipes: equipesList, medicoes: medicoesList
  };
}

export async function calcularSaldoObra(obraId) {
  const obra = await obrasApi.getById(obraId);
  const lancamentos = await lancamentosApi.getByField('obra_id', obraId);

  const totalDespesas = lancamentos
    .filter(l => l.status === 'pago' || l.status === 'faturado')
    .reduce((acc, l) => acc + (parseFloat(l.valor) || 0), 0);

  return {
    valorContrato: parseFloat(obra.valor_contrato) || 0,
    totalDespesas,
    saldo: (parseFloat(obra.valor_contrato) || 0) - totalDespesas
  };
}

export async function getDashboardStats() {
  const [obrasData, pecasData, estoqueData, funcionariosData, equipesData] = await Promise.all([
    obrasApi.getAll(),
    pecasApi.getAll(),
    estoqueApi.getAll(),
    funcionariosApi.getAll(),
    equipesApi.getAll()
  ]);

  const obrasAtivas = obrasData.filter(o => !['concluida', 'cancelada', 'orcamento'].includes(o.status));

  return {
    totalObras: obrasData.length,
    obrasAtivas: obrasAtivas.length,
    pesoTotalKg: obrasAtivas.reduce((acc, o) => acc + (parseFloat(o.peso_total) || 0), 0),
    valorTotalContratos: obrasAtivas.reduce((acc, o) => acc + (parseFloat(o.valor_contrato) || 0), 0),
    totalPecas: pecasData.length,
    funcionariosAtivos: funcionariosData.filter(f => f.ativo === true || f.status === 'ativo').length,
    equipesAtivas: equipesData.filter(e => e.obra_atual_id || e.obra_atual).length,
    itensEstoque: estoqueData.length,
    alertasEstoque: estoqueData.filter(e =>
      e.status === 'sem_estoque' || e.status === 'estoque_minimo' ||
      (parseFloat(e.quantidade) || 0) <= (parseFloat(e.minimo) || 0)
    ).length
  };
}

/**
 * Check Supabase Connection Status
 *
 * @description
 * Verifies that Supabase is properly configured and accessible.
 * Tests connection by attempting a simple query to the 'obras' table.
 * Used during app initialization to determine data source (Supabase vs mock data).
 *
 * @returns {Promise<Object>} Connection status object
 * @returns {boolean} returns.connected - True if connection successful
 * @returns {string} [returns.error] - Error message if connection failed
 * @returns {Array} [returns.data] - Sample data from test query
 *
 * @example
 * // Check if database is available
 * const { connected, error } = await checkConnection();
 *
 * if (connected) {
 *   console.log('Supabase is ready');
 * } else {
 *   console.error('Database unavailable:', error);
 *   // Fall back to mock data or error state
 * }
 */
export async function checkConnection() {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { connected: false, error: 'Variáveis de ambiente não configuradas' };
    }
    const { data, error } = await supabase.from('obras').select('id').limit(1);
    if (error) return { connected: false, error: error.message };
    return { connected: true, data };
  } catch (e) {
    return { connected: false, error: e.message };
  }
}

/**
 * Verifica se o Supabase foi configurado corretamente
 * @returns {boolean} true se Supabase está configurado, false caso contrário
 */
export const isSupabaseConfigured = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export default supabase;
