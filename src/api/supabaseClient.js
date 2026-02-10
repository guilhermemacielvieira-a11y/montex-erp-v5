// MONTEX ERP Premium - Cliente Supabase Completo
// Todas as tabelas com CRUD + funções auxiliares
import { createClient } from '@supabase/supabase-js';

// URL e chave fixas — anon key é pública por design do Supabase
const SUPABASE_URL = 'https://trxbohjcwsogthabairh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeGJvaGpjd3NvZ3RoYWJhaXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzU1MTAsImV4cCI6MjA4NTY1MTUxMH0.QzEK1K0vQRpTBOWqNib-Mo1EEbTP6j21J1jWb07urxg';

// ============================================
// LIMPEZA DE SESSÃO CORROMPIDA (ANTES do createClient)
// O createClient com autoRefreshToken lê o localStorage imediatamente.
// Se houver tokens velhos/corrompidos, ele tenta refresh e falha.
// Solução: limpar ANTES de criar o client.
// ============================================
try {
  const STORAGE_KEY = 'sb-trxbohjcwsogthabairh-auth-token';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const expiresAt = parsed?.expires_at;
      const now = Math.floor(Date.now() / 1000);
      // Se token expirou há mais de 1 hora, é sessão velha — limpar
      if (expiresAt && (now - expiresAt) > 3600) {
        console.warn('[Supabase] Sessão expirada há mais de 1h detectada. Limpando localStorage...');
        localStorage.removeItem(STORAGE_KEY);
      }
      // Se não tem expires_at ou refresh_token, sessão corrompida
      if (!expiresAt || !parsed?.refresh_token) {
        console.warn('[Supabase] Sessão sem expires_at/refresh_token. Limpando...');
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (parseErr) {
      // JSON inválido — limpar
      console.warn('[Supabase] Sessão com JSON inválido. Limpando...');
      localStorage.removeItem(STORAGE_KEY);
    }
  }
} catch (_) {
  // localStorage não disponível (SSR, incognito, etc)
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      // Desabilitar navigator.locks para evitar deadlock
      lock: async (_name, _acquireTimeout, fn) => {
        return await fn();
      },
      persistSession: true,
      // DESABILITADO: autoRefreshToken causava "Failed to fetch" em background
      // quando refresh_token era inválido. Refresh é feito manualmente no AuthContext.
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      // Timeout de 15s em todas as requisições fetch do Supabase
      fetch: (url, options = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      }
    }
  }
);

// ============================================
// HELPER: Gera CRUD genérico para qualquer tabela
// ============================================
function createCrud(tableName, defaultOrder = 'created_at') {
  return {
    async getAll(orderBy = defaultOrder, ascending = false) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order(orderBy, { ascending });
      if (error) throw error;
      return data || [];
    },

    async getById(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    async getByField(field, value) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(field, value);
      if (error) throw error;
      return data || [];
    },

    async create(record) {
      const { data, error } = await supabase
        .from(tableName)
        .insert([record])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async createMany(records) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(records)
        .select();
      if (error) throw error;
      return data;
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async upsert(record) {
      const { data, error } = await supabase
        .from(tableName)
        .upsert([record])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    },

    async count(filters = {}) {
      let query = supabase.from(tableName).select('*', { count: 'exact', head: true });
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
export const orcamentosApi = createCrud('orcamentos', 'created_at');
export const listasApi = createCrud('listas_material', 'created_at');
export const estoqueApi = createCrud('estoque', 'descricao');
export const pecasApi = createCrud('pecas_producao', 'id');
export const funcionariosApi = createCrud('funcionarios', 'nome');
export const equipesApi = createCrud('equipes', 'nome');
export const comprasApi = createCrud('compras', 'created_at');
export const notasFiscaisApi = createCrud('notas_fiscais', 'data_emissao');
export const movEstoqueApi = createCrud('movimentacoes_estoque', 'data');
export const maquinasApi = createCrud('maquinas', 'nome');
export const medicoesApi = createCrud('medicoes', 'created_at');
export const lancamentosApi = createCrud('lancamentos_despesas', 'data_emissao');
export const pedidosMaterialApi = createCrud('pedidos_material', 'created_at');
export const croquisApi = createCrud('croquis', 'marca');
export const detalhamentosApi = createCrud('detalhamentos', 'numero');
export const expedicoesApi = createCrud('expedicoes', 'created_at');
export const configMedicaoApi = createCrud('config_medicao', 'id');
export const tarefasApi = createCrud('tarefas', 'created_at');
export const userProfilesApi = createCrud('user_profiles', 'created_at');

// ============================================
// FUNÇÕES DE GESTÃO DE USUÁRIOS
// ============================================

// Listar todos os perfis de usuários
export async function getAllUserProfiles() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('role', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Atualizar perfil do usuário (nome, cargo, role, ativo)
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

// Criar novo usuário (auth + profile)
export async function createNewUser({ email, password, nome, role, cargo }) {
  // 1. Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome, role }
  });

  if (authError) throw authError;

  // 2. Criar perfil na tabela user_profiles
  const { data: profile, error: profileError } = await supabase
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

// Desativar/Ativar usuário
export async function toggleUserActive(id, ativo) {
  return updateUserProfile(id, { ativo });
}

// ============================================
// FUNÇÕES ESPECÍFICAS DO NEGÓCIO
// ============================================

// Buscar tudo de uma obra
export async function getObraCompleta(obraId) {
  const [
    obra,
    pecas,
    estoqueItems,
    comprasList,
    nfs,
    movEstoque,
    lancamentos,
    listas,
    equipesList,
    medicoesList
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
    pecas,
    estoque: estoqueItems,
    compras: comprasList,
    notasFiscais: nfs,
    movimentacoesEstoque: movEstoque,
    lancamentosDespesas: lancamentos,
    listas,
    equipes: equipesList,
    medicoes: medicoesList
  };
}

// Calcular saldo da obra
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

// Estatísticas do dashboard
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

// Verificar conexão
export async function checkConnection() {
  try {
    const { data, error } = await supabase.from('obras').select('id').limit(1);
    if (error) return { connected: false, error: error.message };
    return { connected: true, data };
  } catch (e) {
    return { connected: false, error: e.message };
  }
}

export default supabase;
