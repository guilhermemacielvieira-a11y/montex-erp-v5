// MONTEX ERP Premium - Cliente Supabase Completo
// Todas as tabelas com CRUD + funções auxiliares
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURAÇÃO VIA VARIÁVEIS DE AMBIENTE
// Nunca hardcode chaves no código-fonte!
// ============================================
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL
  || 'https://trxbohjcwsogthabairh.supabase.co').trim();
// .trim() defensivo: uma quebra de linha/espaco no valor da env var quebrava o
// Realtime (apikey terminava em %0A no WebSocket). Trim elimina esse bug.
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_8X7bPhCGF16mgZE8Z7fuVw_6pI74veM').trim();
// Service Role Key: NÃO existe mais no cliente (achado S1). Toda var VITE_* é
// inlinada no bundle pelo Vite, então a service_role vazaria → CRUD total no
// banco. As operações privilegiadas migraram para a Edge Function `admin-users`
// (servidor), onde a chave nunca sai do ambiente. Ver invokeAdminFunction().

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
// CLIENTE SERVICE_ROLE — REMOVIDO DO CLIENTE (achado S1)
// ============================================
// A service_role key NUNCA pode existir no bundle do cliente: ela bypassa
// toda a RLS e dá CRUD total no banco. Antes era criada aqui a partir de
// VITE_SUPABASE_SERVICE_KEY (que o Vite inlina no bundle) — vazamento crítico.
//
// Agora `supabaseAdmin` é SEMPRE null. As operações que exigiam service_role
// foram movidas para a Edge Function `admin-users` (servidor), onde a chave
// nunca sai do ambiente. Ver invokeAdminFunction() e supabase/functions/admin-users.
//
// O export permanece (= null) para compatibilidade: os consumidores usam o
// padrão `supabaseAdmin || supabase`, que agora cai no cliente anon. As tabelas
// "restritas" (orcamentos, compras, etc.) já são acessíveis pelo anon (RLS v10),
// então continuam funcionando. user_profiles e auth.admin → via Edge Function.
const supabaseAdmin = null;
export { supabaseAdmin };

/**
 * Chama a Edge Function `admin-users` para operações privilegiadas.
 * A service_role vive só no servidor; o cliente envia apenas a anon key.
 * @param {string} action - list_profiles | create_user | update_profile | reset_password
 * @param {object} [payload]
 * @returns {Promise<object>} corpo JSON retornado pela função
 */
export async function invokeAdminFunction(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...payload },
  });
  // functions.invoke devolve `error` para status != 2xx; o corpo (com a msg
  // detalhada da função) vem em error.context quando disponível.
  if (error) {
    let detail = error.message;
    try {
      const body = await error.context?.json?.();
      if (body?.error) detail = body.error;
    } catch (_) { /* mantém error.message */ }
    throw new Error(`admin-users/${action}: ${detail}`);
  }
  if (data?.error) throw new Error(`admin-users/${action}: ${data.error}`);
  return data || {};
}

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
      // 🔧 PAGINAÇÃO: PostgREST tem limite padrão de 1000 linhas/req.
      // Se a tabela tiver > 1000 registros (ex: pecas_producao tem 1062),
      // precisamos iterar com range() até pegar tudo. Senão peças somem
      // silenciosamente do Kanban / Analytics / Medições.
      const PAGE_SIZE = 1000;
      const allData = [];
      let offset = 0;
      // Loop de segurança: máximo 50 páginas (= 50k linhas)
      for (let i = 0; i < 50; i++) {
        const { data, error } = await client
          .from(tableName)
          .select('*')
          .order(orderBy, { ascending })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < PAGE_SIZE) break; // última página
        offset += PAGE_SIZE;
      }
      return allData;
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
      // 🔧 PAGINAÇÃO: igual ao getAll, para evitar cap de 1000 linhas
      const PAGE_SIZE = 1000;
      const allData = [];
      let offset = 0;
      for (let i = 0; i < 50; i++) {
        const { data, error } = await client
          .from(tableName)
          .select('*')
          .eq(field, value)
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
      return allData;
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

    // 🔧 Atualiza VÁRIOS registros com os MESMOS valores numa única query
    // (PATCH ... WHERE id IN (...)). Substitui loops de N updates sequenciais,
    // que eram lentos (~1 req por peça) e propensos a perda de gravação se a
    // página fosse recarregada no meio do loop. Faz chunking por segurança de
    // tamanho de URL.
    async updateMany(ids, updates) {
      const list = (ids || []).map(v => (typeof v === 'object' ? (v.id ?? v) : v)).filter(Boolean);
      if (list.length === 0) return [];
      const CHUNK = 300;
      const out = [];
      for (let i = 0; i < list.length; i += CHUNK) {
        const slice = list.slice(i, i + CHUNK);
        const { data, error } = await client
          .from(tableName)
          .update({ ...updates, updated_at: new Date().toISOString() })
          .in('id', slice)
          .select();
        if (error) throw error;
        if (data) out.push(...data);
      }
      return out;
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

// user_profiles tem RLS por auth.uid()/role (v5) e NÃO é acessível pelo anon.
// Como o serviço roda com service_role, estas operações vão pela Edge Function
// `admin-users` (servidor) — o cliente não carrega mais a service key.

export async function getAllUserProfiles() {
  const { profiles } = await invokeAdminFunction('list_profiles');
  return profiles || [];
}

export async function updateUserProfile(id, updates) {
  const { profile } = await invokeAdminFunction('update_profile', { id, updates });
  if (!profile) throw new Error('Update não retornou dados (admin-users/update_profile)');
  return profile;
}

export async function createNewUser({ email, password, nome, role, cargo }) {
  const { profile } = await invokeAdminFunction('create_user', { email, password, nome, role, cargo });
  return profile;
}

export async function resetUserPassword(authId, password) {
  const { user } = await invokeAdminFunction('reset_password', { authId, password });
  return user;
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
