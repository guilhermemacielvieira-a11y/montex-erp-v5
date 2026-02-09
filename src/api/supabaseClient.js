// MONTEX ERP Premium - Cliente Supabase Completo
// Todas as tabelas com CRUD + funções auxiliares
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase não configurado. Usando modo offline.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
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

export const clientesApi = createCrud('clientes', 'razao_social');
export const obrasApi = createCrud('obras', 'created_at');
export const orcamentosApi = createCrud('orcamentos', 'created_at');
export const listasApi = createCrud('listas_material', 'created_at');
export const estoqueApi = createCrud('estoque', 'material');
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
    equipesApi.getByField('obra_atual', obraId),
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
    funcionariosAtivos: funcionariosData.filter(f => f.status === 'ativo').length,
    equipesAtivas: equipesData.filter(e => e.obra_atual).length,
    itensEstoque: estoqueData.length,
    alertasEstoque: estoqueData.filter(e => e.status === 'sem_estoque' || e.status === 'estoque_minimo').length
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
