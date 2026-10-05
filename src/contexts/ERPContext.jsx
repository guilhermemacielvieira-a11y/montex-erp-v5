/**
 * MONTEX ERP Premium - Context Global (Refactored)
 *
 * Gerencia todo o estado da aplicação com interligação entre módulos.
 * Em PRODUÇÃO: dados vêm exclusivamente do Supabase. Sem fallback para mock data.
 * Em DESENVOLVIMENTO: mock data carregado apenas se Supabase não estiver configurado.
 *
 * REFACTORING: 5 domain contexts com memoization por domínio para performance optimization.
 * Cada contexto é memoizado com apenas suas state slices, reduzindo re-renders desnecessários.
 */

import { OBRA_GERAL, escopoValido, obraIdUnica, obraIdsDoEscopo } from '../lib/escopoObra';
import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect, useState, useRef } from 'react';

// Constantes de negócio (sempre importadas - não são mock data)
import {
  STATUS_OBRA,
  ETAPAS_PRODUCAO,
  STATUS_CORTE,
  STATUS_EXPEDICAO,
} from '../data/constants';

// Tipos de ações, transformadores e reducer combinado
import { ACTIONS } from './actions';
import {
  transformRecord,
  transformArray,
  transformEstoqueArray,
  transformPecaArray,
  transformPecaRecord,
  pecaToSupabase,
  reverseTransformRecord,
  lancamentoToSupabase,
  orcamentoToSupabase,
  transformOrcamentoArray,
  transformObraArray,
  calcularProgressoObra,
  STATUS_MAP_SUPABASE
} from './transforms';
import { erpReducer } from './reducers';
import { retryWithBackoff } from '../utils/retryWithBackoff';
import { toast } from 'sonner';

// Mock data importado APENAS em desenvolvimento via lazy import
let mockDataModule = null;
async function loadMockData() {
  if (!mockDataModule && !import.meta.env.PROD) {
    mockDataModule = await import('../data/database');
  }
  return mockDataModule;
}

import {
  clientesApi,
  obrasApi,
  orcamentosApi,
  listasApi,
  estoqueApi,
  pecasApi,
  funcionariosApi,
  equipesApi,
  comprasApi,
  notasFiscaisApi,
  movEstoqueApi,
  maquinasApi,
  medicoesApi,
  lancamentosApi,
  pedidosMaterialApi,
  expedicoesApi,
  configMedicaoApi,
  checkConnection
} from '@/api/supabaseClient';
import { matchEstoqueItem, montarNovoItemEstoque } from '@/services/abastecimento';
import { validarTransicao } from '@/services/fluxoEtapas';
import { moverEtapa as moverEtapaRpc, movimentarEstoque } from '@/api/producaoRpc';
import { criarRomaneio, despacharRomaneio, excluirRomaneio } from '@/api/expedicaoRpc';
import { montarPayloadCriarRomaneio, normalizarStatusRomaneio, hojeLocalISO, STATUS_ROMANEIO } from '@/services/romaneio';

// ========================================
// TABELAS CARREGADAS SOB DEMANDA (fora do boot)
// Grandes e usadas por poucas páginas — cada página chama
// ensureLoaded('<chave>') (ou o hook useEnsureLoaded) ao montar.
// Chave = nome da fatia no estado (o shape do contexto não muda).
// ========================================
const LAZY_TABLES = {
  movimentacoesEstoque: { fetch: () => movEstoqueApi.getAll(), operationName: 'movimentacoesEstoque' }, // EstoquePageV2
  notasFiscais: { fetch: () => notasFiscaisApi.getAll(), operationName: 'notasFiscais' },               // ComprasPage, MateriaisPage
  materiaisEstoque: { fetch: () => pedidosMaterialApi.getAll(), operationName: 'pedidosMaterial' },     // ComprasPage, ImportRomaneioPage
  listas: { fetch: () => listasApi.getAll(), operationName: 'listas' },                                 // sem consumidores diretos hoje
};
const LAZY_TABLE_ALIASES = {
  movimentacoes: 'movimentacoesEstoque',
  movimentacoes_estoque: 'movimentacoesEstoque',
  notas: 'notasFiscais',
  notas_fiscais: 'notasFiscais',
  pedidos: 'materiaisEstoque',
  pedidosMaterial: 'materiaisEstoque',
  pedidos_material: 'materiaisEstoque',
};

// ========================================
// PRODUÇÃO: ESTADO VAZIO (sem mock data)
// Em produção, dados vêm exclusivamente do Supabase
// ========================================
const IS_PRODUCTION = import.meta.env.PROD || import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co');

const emptyState = {
  clientes: [],
  obras: [],
  orcamentos: [],
  listas: [],
  estoque: [],
  pecas: [],
  expedicoes: [],
  funcionarios: [],
  equipes: [],
  medicoes: [],
  compras: [],
  configMedicao: {},
  maquinas: [],
  materiaisEstoque: [],
  lancamentosDespesas: [],
  notasFiscais: [],
  movimentacoesEstoque: [],
  obraAtual: null,
  filtros: { obra: 'todas', periodo: 'mes_atual', setor: 'todos' },
  loading: false,
  notificacoes: []
};

// ========================================
// ESTADO INICIAL - Sempre vazio. Dados carregados do Supabase via useEffect.
// Mock data só é carregado em dev se Supabase não estiver configurado.
// ========================================

const initialState = emptyState;


// ========================================
// 5 DOMAIN CONTEXTS (Memoized)
// ========================================

const ERPCoreContext = createContext(null);
const ObrasContext = createContext(null);
const ProducaoContext = createContext(null);
const SupplyContext = createContext(null);
const OperacoesContext = createContext(null);

// Legacy default export for backward compatibility
const ERPContext = ERPCoreContext;

export function ERPProvider({ children }) {
  const [state, dispatch] = useReducer(erpReducer, initialState);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [dataSource, setDataSource] = useState('loading'); // 'loading' | 'supabase' | 'mock_dev' | 'error'
  const [connectionError, setConnectionError] = useState(null);

  // ===== CARGA SOB DEMANDA — portão do boot =====
  // ensureLoaded() espera o boot terminar (para saber se a fonte é Supabase)
  // antes de buscar tabelas adiadas. Ver LAZY_TABLES e ensureLoaded abaixo.
  const bootGateRef = useRef(null);
  if (!bootGateRef.current) {
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    bootGateRef.current = { promise, resolve, supabase: false };
  }
  const lazyLoadsRef = useRef({});

  // ===== CARREGAR DADOS DO SUPABASE =====
  useEffect(() => {
    async function loadFromSupabase() {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Em PRODUÇÃO: Supabase é obrigatório
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        if (import.meta.env.PROD) {
          console.error('❌ ERRO CRÍTICO: Supabase não configurado em produção!');
          setConnectionError('Supabase não configurado. Configure VITE_SUPABASE_URL nas variáveis de ambiente.');
          setDataSource('error');
          return;
        }
        // Em dev: carregar mock data via lazy import
        console.log('📦 [DEV] Supabase não configurado — carregando mock data');
        const mockData = await loadMockData();
        if (mockData) {
          dispatch({ type: ACTIONS.INIT_FROM_SUPABASE, payload: {
            clientes: mockData.clientes || [],
            obras: mockData.obras || [],
            orcamentos: mockData.orcamentos || [],
            listas: mockData.listasMaterial || [],
            estoque: mockData.estoque || [],
            pecas: mockData.pecasProducao || [],
            expedicoes: mockData.expedicoes || [],
            funcionarios: mockData.funcionarios || [],
            equipes: mockData.equipes || [],
            medicoes: mockData.medicoes || [],
            compras: mockData.compras || [],
            configMedicao: mockData.configMedicao || {},
            maquinas: mockData.maquinas || [],
            materiaisEstoque: [],
            lancamentosDespesas: [],
            notasFiscais: [],
            movimentacoesEstoque: []
          }});
          setDataSource('mock_dev');
        }
        return;
      }

      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      console.log('[ERP] loadFromSupabase: iniciando...');

      try {
        console.log('[ERP] Verificando conexão com Supabase...');
        const conn = await checkConnection();
        if (!conn.connected) {
          if (import.meta.env.PROD) {
            console.error('❌ Supabase indisponível em produção:', conn.error);
            setConnectionError(`Não foi possível conectar ao banco de dados: ${conn.error}`);
            setDataSource('error');
          } else {
            console.warn('⚠️ [DEV] Supabase indisponível:', conn.error);
            setDataSource('mock_dev');
          }
          dispatch({ type: ACTIONS.SET_LOADING, payload: false });
          return;
        }

        setSupabaseConnected(true);
        bootGateRef.current.supabase = true;
        console.log('🔌 Conectado ao Supabase — carregando 13 tabelas do boot em paralelo...');

        // Carregar tabelas do boot em paralelo. Tabelas grandes/raras
        // (movimentacoes_estoque, notas_fiscais, listas, pedidos_material)
        // são carregadas sob demanda via ensureLoaded() — ver LAZY_TABLES.
        const [
          clientesData,
          obrasData,
          orcamentosData,
          estoqueData,
          pecasData,
          funcionariosData,
          equipesData,
          comprasData,
          maquinasData,
          medicoesData,
          expData,
          configMedData,
          lancamentosData
        ] = await Promise.all([
          retryWithBackoff(() => clientesApi.getAll(), { operationName: 'clientes' }).catch(() => []),
          retryWithBackoff(() => obrasApi.getAll(), { operationName: 'obras' }).catch(() => []),
          retryWithBackoff(() => orcamentosApi.getAll(), { operationName: 'orcamentos' }).catch(() => []),
          retryWithBackoff(() => estoqueApi.getAll(), { operationName: 'estoque' }).catch(() => []),
          retryWithBackoff(() => pecasApi.getAll('id', true), { operationName: 'pecas' }).catch(() => []),
          retryWithBackoff(() => funcionariosApi.getAll(), { operationName: 'funcionarios' }).catch(() => []),
          retryWithBackoff(() => equipesApi.getAll(), { operationName: 'equipes' }).catch(() => []),
          retryWithBackoff(() => comprasApi.getAll(), { operationName: 'compras' }).catch(() => []),
          retryWithBackoff(() => maquinasApi.getAll(), { operationName: 'maquinas' }).catch(() => []),
          retryWithBackoff(() => medicoesApi.getAll(), { operationName: 'medicoes' }).catch(() => []),
          retryWithBackoff(() => expedicoesApi.getAll(), { operationName: 'expedicoes' }).catch(() => []),
          retryWithBackoff(() => configMedicaoApi.getAll(), { operationName: 'configMedicao' }).catch(() => []),
          retryWithBackoff(() => lancamentosApi.getAll(), { operationName: 'lancamentos' }).catch(() => [])
        ]);

        // Se tem dados no Supabase, usar eles
        if (obrasData.length > 0 || pecasData.length > 0) {
          // Transformar snake_case → camelCase
          const pecasTransformadas = transformPecaArray(pecasData);
          const obrasTransformadas = transformObraArray(obrasData);
          // Calcular progresso real baseado nas peças
          const obrasComProgresso = calcularProgressoObra(obrasTransformadas, pecasTransformadas);

          const payload = {
            clientes: transformArray(clientesData),
            obras: obrasComProgresso,
            orcamentos: transformOrcamentoArray(orcamentosData),
            // listas, materiaisEstoque, notasFiscais, movimentacoesEstoque:
            // fora do payload de boot (sob demanda) — o spread do
            // INIT_FROM_SUPABASE preserva o que já estiver no estado.
            estoque: transformArray(estoqueData),
            pecas: pecasTransformadas,
            funcionarios: transformArray(funcionariosData),
            equipes: transformArray(equipesData),
            compras: transformArray(comprasData),
            maquinas: transformArray(maquinasData),
            medicoes: transformArray(medicoesData),
            expedicoes: transformArray(expData),
            lancamentosDespesas: transformArray(lancamentosData)
          };

          // configMedicao é um objeto, não array
          if (configMedData.length > 0) {
            payload.configMedicao = transformRecord(configMedData[0]);
          }

          // Escopo de obra (filtro único do topo): localStorage > 'geral'.
          // state.obraAtual guarda o ESCOPO bruto ('geral' | grupo | obraId);
          // os consumidores recebem obraAtual = id só quando é UMA obra.
          {
            const savedObra = localStorage.getItem('montex_obra_atual');
            payload.obraAtual = escopoValido(savedObra, obrasData) && savedObra ? savedObra : OBRA_GERAL;
          }

          // Calcular progresso das obras baseado nas pecas
          payload.obras = calcularProgressoObra(payload.obras, payload.pecas);

          dispatch({ type: ACTIONS.INIT_FROM_SUPABASE, payload });
          setDataSource('supabase');

          console.log('✅ Dados carregados do Supabase:', {
            clientes: clientesData.length,
            obras: obrasData.length,
            pecas: pecasData.length,
            estoque: estoqueData.length,
            funcionarios: funcionariosData.length,
            lancamentos: lancamentosData.length,
            obraAtual: payload.obraAtual || 'nenhuma'
          });
        } else {
          console.log('📦 Supabase conectado mas sem dados.');
          setDataSource('supabase');
          dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        }
      } catch (err) {
        console.error('❌ Erro ao carregar do Supabase:', err.message);
        if (import.meta.env.PROD) {
          setConnectionError(`Erro ao carregar dados: ${err.message}`);
          setDataSource('error');
        }
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      }
    }

    // Libera ensureLoaded() quando o boot termina (sucesso, mock ou erro).
    loadFromSupabase().finally(() => bootGateRef.current.resolve());
  }, []);

  // ===== CARGA SOB DEMANDA (tabelas fora do boot) =====
  // ensureLoaded('movimentacoesEstoque') / ensureLoaded(['notasFiscais', 'materiaisEstoque'])
  // - Idempotente: cada tabela é buscada uma vez por sessão (promise em cache).
  //   { force: true } refaz a busca.
  // - Em modo mock/erro (sem Supabase) não faz nada.
  // - Falha não fica em cache: a próxima chamada tenta de novo.
  const ensureLoaded = useCallback(async (keys, opts = {}) => {
    const lista = (Array.isArray(keys) ? keys : [keys])
      .map((k) => LAZY_TABLE_ALIASES[k] || k)
      .filter((k) => LAZY_TABLES[k]);
    if (!lista.length) return;
    await bootGateRef.current.promise;
    if (!bootGateRef.current.supabase) return;
    const cache = lazyLoadsRef.current;
    await Promise.all(lista.map((key) => {
      if (cache[key] && !opts.force) return cache[key];
      const { fetch, operationName } = LAZY_TABLES[key];
      cache[key] = retryWithBackoff(fetch, { operationName })
        .then((rows) => {
          dispatch({ type: ACTIONS.LAZY_TABLE_LOADED, payload: { key, rows: transformArray(rows || []) } });
          console.log(`✅ [ERP] ${key} carregado sob demanda: ${(rows || []).length}`);
        })
        .catch((err) => {
          delete cache[key];
          console.warn(`⚠️ [ERP] Falha ao carregar ${key} sob demanda:`, err?.message || err);
        });
      return cache[key];
    }));
  }, []);

  // ===== AÇÕES - OBRAS =====
  // Aceita 'geral', id de grupo (GRUPOS_OBRAS) ou id de obra.
  const setObraAtual = useCallback((escopo) => {
    const valor = escopo || OBRA_GERAL;
    dispatch({ type: ACTIONS.SET_OBRA_ATUAL, payload: valor });
    // Persistir selecao de obra no localStorage
    try { localStorage.setItem('montex_obra_atual', valor); } catch(e) {}
  }, []);

  const updateObra = useCallback(async (id, data) => {
    dispatch({ type: ACTIONS.UPDATE_OBRA, payload: { id, data } });
    if (dataSource === 'supabase') {
      try {
        const snakeData = reverseTransformRecord(data);
        delete snakeData.id;
        delete snakeData.created_at;
        delete snakeData.updated_at;
        await obrasApi.update(id, snakeData);
        console.log(`✅ Obra ${id} atualizada no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao atualizar obra no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  const addObra = useCallback(async (obra) => {
    dispatch({ type: ACTIONS.ADD_OBRA, payload: obra });
    if (dataSource === 'supabase') {
      try {
        const record = reverseTransformRecord(obra);
        await obrasApi.create(record);
        console.log(`✅ Obra ${obra.id} criada no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao criar obra no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  // Progresso é computado a partir das peças — não precisa persistir separadamente
  const updateProgressoObra = useCallback((obraId, progresso) => {
    dispatch({ type: ACTIONS.UPDATE_PROGRESSO_OBRA, payload: { obraId, progresso } });
  }, []);

  // ===== AÇÕES - ORÇAMENTOS =====
  const aprovarOrcamento = useCallback(async (orcamentoId, obraId) => {
    dispatch({ type: ACTIONS.APROVAR_ORCAMENTO, payload: { orcamentoId, obraId } });
    dispatch({
      type: ACTIONS.ADD_NOTIFICACAO,
      payload: { tipo: 'sucesso', mensagem: 'Orçamento aprovado! Obra iniciada.' }
    });

    if (dataSource === 'supabase') {
      try {
        await orcamentosApi.update(orcamentoId, {
          status: 'aprovado',
          data_aprovacao: new Date().toISOString().split('T')[0]
        });
        await obrasApi.update(obraId, { status: 'aprovada' });
        console.log(`✅ Orçamento ${orcamentoId} aprovado no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao aprovar orçamento no Supabase:', err.message);
        throw err;
      }
    }

    // Add persistent notification
    if (window.__notificationDispatch) {
      window.__notificationDispatch({
        type: 'success',
        title: `Orçamento ${orcamentoId} aprovado`,
        message: `A obra ${obraId} foi iniciada com sucesso e está pronta para produção.`,
        icon: 'CheckCircle'
      });
    }
  }, [dataSource]);

  const addOrcamento = useCallback(async (orcamento) => {
    dispatch({ type: ACTIONS.ADD_ORCAMENTO, payload: orcamento });
    if (dataSource === 'supabase') {
      try {
        const record = orcamentoToSupabase(orcamento);
        await orcamentosApi.create(record);
        console.log(`✅ Orçamento ${orcamento.id} criado no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao criar orçamento no Supabase:', err.message);
        toast.error(`Erro ao salvar orçamento: ${err.message}`);
        throw err;
      }
    }
  }, [dataSource]);

  const updateOrcamento = useCallback(async (orcamentoId, updates) => {
    dispatch({ type: ACTIONS.UPDATE_ORCAMENTO, payload: { id: orcamentoId, data: updates } });
    if (dataSource === 'supabase') {
      try {
        const record = orcamentoToSupabase(updates);
        delete record.id; // Não enviar ID no update
        await orcamentosApi.update(orcamentoId, record);
        console.log(`✅ Orçamento ${orcamentoId} atualizado no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao atualizar orçamento no Supabase:', err.message);
        toast.error(`Erro ao atualizar orçamento: ${err.message}`);
        throw err;
      }
    }
  }, [dataSource]);

  const deleteOrcamento = useCallback(async (orcamentoId) => {
    dispatch({ type: ACTIONS.DELETE_ORCAMENTO, payload: { orcamentoId } });
    if (dataSource === 'supabase') {
      try {
        await orcamentosApi.delete(orcamentoId);
        console.log(`✅ Orçamento ${orcamentoId} deletado do Supabase`);
      } catch (err) {
        console.error('❌ Erro ao deletar orçamento no Supabase:', err.message);
        toast.error(`Erro ao deletar orçamento: ${err.message}`);
        throw err;
      }
    }
  }, [dataSource]);

  // ===== AÇÕES - ESTOQUE =====
  // Saldo de estoque: delta ATÔMICO no banco via RPC `movimentar_estoque`
  // (UPDATE quantidade = quantidade + delta com lock + movimentação na mesma
  // transação). Antes era read-modify-write absoluto com o saldo da TELA →
  // duas saídas simultâneas perdiam uma (lost update). Em erro, desfaz o
  // otimista e relança. Saída que deixaria saldo negativo é rejeitada no banco.
  const aplicarSaldoServidor = useCallback((itemId, res) => {
    if (res?.item) {
      dispatch({ type: ACTIONS.UPDATE_ESTOQUE, payload: { id: itemId, data: { quantidade: Number(res.item.quantidade) || 0, pesoKg: res.item.peso_kg } } });
    }
  }, []);

  const consumirEstoque = useCallback(async (itemId, quantidade, obraId, opts = {}) => {
    const qtd = Math.abs(Number(quantidade) || 0);
    if (!qtd) return null;
    dispatch({ type: ACTIONS.CONSUMIR_ESTOQUE, payload: { itemId, quantidade: qtd, obraId } });
    if (dataSource === 'supabase') {
      try {
        const res = await movimentarEstoque(itemId, -qtd, {
          tipo: 'saida',
          origem: opts.origem || 'manual',
          motivo: opts.motivo || 'Saída de estoque',
          responsavel: opts.responsavel,
          obraId,
          ref: opts.ref,
        });
        aplicarSaldoServidor(itemId, res);
        console.log(`✅ Estoque ${itemId} consumido no Supabase (saldo ${res?.saldo_novo})`);
        return res;
      } catch (err) {
        dispatch({ type: ACTIONS.ADICIONAR_ESTOQUE, payload: { itemId, quantidade: qtd } }); // rollback
        console.error('❌ Erro ao consumir estoque no Supabase:', err.message);
        throw err;
      }
    }
    return null;
  }, [dataSource, aplicarSaldoServidor]);

  const adicionarEstoque = useCallback(async (itemId, quantidade, compraId, opts = {}) => {
    const qtd = Math.abs(Number(quantidade) || 0);
    if (!qtd) return null;
    dispatch({ type: ACTIONS.ADICIONAR_ESTOQUE, payload: { itemId, quantidade: qtd, compraId } });
    if (dataSource === 'supabase') {
      try {
        const res = await movimentarEstoque(itemId, qtd, {
          tipo: 'entrada',
          origem: opts.origem || (compraId ? 'compra' : 'manual'),
          motivo: opts.motivo || (compraId ? `Entrada compra ${compraId}` : 'Entrada de estoque'),
          responsavel: opts.responsavel,
          ref: compraId || opts.ref,
          contaComprado: opts.contaComprado ?? !!compraId,
        });
        aplicarSaldoServidor(itemId, res);
        console.log(`✅ Estoque ${itemId} adicionado no Supabase (saldo ${res?.saldo_novo})`);
        return res;
      } catch (err) {
        dispatch({ type: ACTIONS.CONSUMIR_ESTOQUE, payload: { itemId, quantidade: qtd } }); // rollback
        console.error('❌ Erro ao adicionar estoque no Supabase:', err.message);
        throw err;
      }
    }
    return null;
  }, [dataSource, aplicarSaldoServidor]);

  const reservarEstoque = useCallback(async (itemId, quantidade, obraId) => {
    dispatch({ type: ACTIONS.RESERVAR_ESTOQUE, payload: { itemId, quantidade, obraId } });
    if (dataSource === 'supabase') {
      try {
        const item = state.estoque.find(e => e.id === itemId);
        if (item) {
          await estoqueApi.update(itemId, {
            reservado: (item.reservado || 0) + quantidade,
            obra_reservada: obraId
          });
          console.log(`✅ Estoque ${itemId} reservado no Supabase`);
        }
      } catch (err) {
        console.error('❌ Erro ao reservar estoque no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource, state.estoque]);

  // ===== AÇÕES - PRODUÇÃO =====
  // Move a peça INTEIRA de etapa. Persistência ATÔMICA via RPC `mover_etapa`
  // (valida o fluxo no banco: 1 etapa por vez; voltar só com opts.force;
  // enviado/entregue só via Expedição). Otimista com ROLLBACK: se o banco
  // rejeitar, a peça volta ao estado anterior, mostra toast.error e relança.
  // opts: { force, etapaFuncionario, data, silencioso, etapaAtual }
  const moverPecaEtapa = useCallback(async (pecaId, novaEtapa, funcionarioId, opts = {}) => {
    const anterior = state.pecas.find(p => p.id === pecaId) || null;
    if (anterior) {
      // opts.etapaAtual: etapa já confirmada pelo banco num passo anterior
      // (a closure de state.pecas pode estar defasada em passos encadeados).
      const check = validarTransicao(opts.etapaAtual ?? anterior.etapa, novaEtapa, { force: !!opts.force });
      if (!check.ok) {
        if (!opts.silencioso) toast.error(check.motivo);
        const e = new Error(check.motivo);
        e.code = 'TRANSICAO_INVALIDA';
        throw e;
      }
    }

    dispatch({ type: ACTIONS.MOVER_PECA_ETAPA, payload: { pecaId, novaEtapa, funcionarioId } });

    if (dataSource === 'supabase') {
      try {
        const res = await moverEtapaRpc(pecaId, novaEtapa, {
          funcionario: funcionarioId,
          force: !!opts.force,
          etapaFuncionario: opts.etapaFuncionario,
          data: opts.data,
        });
        // Reconcilia com a linha devolvida pelo banco (fonte de verdade)
        if (res?.peca) {
          const [fresca] = transformPecaArray([res.peca]);
          if (fresca) dispatch({ type: ACTIONS.UPDATE_PECA, payload: { id: pecaId, data: fresca } });
        }
        console.log(`✅ Peça ${pecaId} → ${novaEtapa} (func: ${funcionarioId || 'N/A'}) salva no Supabase`);
      } catch (err) {
        // Offline: mantém o otimista (o chamador enfileira p/ sincronizar).
        if (typeof navigator !== 'undefined' && navigator.onLine === false) throw err;
        // ROLLBACK do otimista
        if (anterior) {
          dispatch({ type: 'RESTORE_PECA', payload: anterior });
        }
        console.error('❌ Erro ao salvar etapa no Supabase:', err.message);
        if (!opts.silencioso) toast.error(`Não foi possível mover a peça: ${err.message}`);
        throw err;
      }
    }

    // Atualiza progresso da obra automaticamente
    const peca = state.pecas.find(p => p.id === pecaId);
    if (peca) {
      const pecasObra = state.pecas.filter(p => p.obraId === peca.obraId);
      const totalPecas = pecasObra.length;
      const etapas = Object.values(ETAPAS_PRODUCAO);

      const progresso = {};
      etapas.forEach(etapa => {
        const pecasNaEtapaOuAdiante = pecasObra.filter(p => {
          const idxAtual = etapas.indexOf(p.etapa);
          const idxEtapa = etapas.indexOf(etapa);
          return idxAtual >= idxEtapa;
        }).length;
        progresso[etapa] = Math.round((pecasNaEtapaOuAdiante / totalPecas) * 100);
      });

      dispatch({ type: ACTIONS.UPDATE_PROGRESSO_OBRA, payload: { obraId: peca.obraId, progresso } });

      // Add notification for production stage change
      const stageLabels = {
        'corte': 'Corte',
        'montagem': 'Montagem',
        'soldagem': 'Soldagem',
        'pintura': 'Pintura',
        'empacotamento': 'Empacotamento',
        'expedido': 'Expedido'
      };

      if (window.__notificationDispatch) {
        window.__notificationDispatch({
          type: 'production',
          title: `Peça ${peca.id} avançou`,
          message: `A peça ${peca.id} passou com sucesso para a etapa de ${stageLabels[novaEtapa] || novaEtapa}.`,
          icon: 'Scissors'
        });
      }
    }
  }, [state.pecas, dataSource]);

  const updateStatusCorte = useCallback(async (pecaId, novoStatus, maquinaId, funcionarioId) => {
    dispatch({ type: ACTIONS.UPDATE_STATUS_CORTE, payload: { pecaId, novoStatus, maquinaId, funcionarioId } });

    // Persistir no Supabase (status + funcionário + timestamp)
    if (dataSource === 'supabase') {
      try {
        const updateData = { status_corte: novoStatus };
        if (funcionarioId) {
          updateData.responsavel = funcionarioId;
        }
        if (novoStatus === 'em_corte' || novoStatus === 'cortando') {
          updateData.data_inicio = new Date().toISOString();
        }
        // Filtrar apenas campos validos antes de enviar ao Supabase
        const safeData = pecaToSupabase({ id: pecaId, ...updateData });
        await pecasApi.update(pecaId, safeData);
        console.log(`✅ Status corte ${pecaId} → ${novoStatus} (func: ${funcionarioId || 'N/A'}) salvo no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao salvar status corte no Supabase:', err.message);
        throw err;
      }
    }

    // Add notification for cutting status change
    if (window.__notificationDispatch && novoStatus === STATUS_CORTE.LIBERADO) {
      window.__notificationDispatch({
        type: 'production',
        title: `Peça ${pecaId} liberada para corte`,
        message: `Peça ${pecaId} foi aprovada e está pronta para ser cortada na máquina.`,
        icon: 'Scissors'
      });
    }
  }, [dataSource]);

  const addPecas = useCallback(async (pecas) => {
    dispatch({ type: ACTIONS.ADD_PECAS, payload: pecas });

    // Persistir no Supabase
    if (dataSource === 'supabase') {
      try {
        const records = pecas.map(p => {
          const rec = pecaToSupabase(p);
          // Garantir campo nome obrigatório
          if (!rec.nome) {
            rec.nome = `${rec.tipo || 'PEÇA'} ${rec.marca || ''}`.trim();
          }
          return rec;
        });
        await pecasApi.createMany(records);
        console.log(`✅ ${pecas.length} peças adicionadas no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao adicionar peças no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  // Atualizar uma peça (com persistência no Supabase)
  const updatePeca = useCallback(async (pecaId, data) => {
    dispatch({ type: ACTIONS.UPDATE_PECA, payload: { id: pecaId, data } });

    // Persistir no Supabase
    if (dataSource === 'supabase') {
      try {
        const snakeData = pecaToSupabase(data);
        // Remover campos que não devem ser atualizados
        delete snakeData.id;
        delete snakeData.created_at;
        delete snakeData.updated_at;
        await pecasApi.update(pecaId, snakeData);
        console.log(`✅ Peça ${pecaId} atualizada no Supabase`, snakeData);
      } catch (err) {
        console.error('❌ Erro ao atualizar peça no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  // Recarregar peças do Supabase
  const reloadPecas = useCallback(async () => {
    if (dataSource !== 'supabase') return;
    try {
      const pecasData = await pecasApi.getAll('id', true);
      const pecasTransformadas = transformPecaArray(pecasData);
      dispatch({ type: 'RELOAD_PECAS', payload: pecasTransformadas });
      console.log(`🔄 ${pecasTransformadas.length} peças recarregadas do Supabase`);
    } catch (err) {
      console.error('❌ Erro ao recarregar peças:', err.message);
    }
  }, [dataSource]);

  // Recarrega lançamentos do Supabase (sincronização cross-device/cross-user).
  // Necessário porque os dados são carregados UMA vez no boot; sem isto, um
  // lançamento criado por OUTRO usuário/dispositivo só aparecia após reload total.
  const reloadLancamentos = useCallback(async () => {
    if (dataSource !== 'supabase') return;
    try {
      const data = await lancamentosApi.getAll();
      dispatch({ type: 'RELOAD_LANCAMENTOS', payload: transformArray(data) });
    } catch (err) {
      console.error('❌ Erro ao recarregar lançamentos:', err.message);
    }
  }, [dataSource]);

  // Recarrega medições do Supabase (mesma sincronização cross-device).
  const reloadMedicoes = useCallback(async () => {
    if (dataSource !== 'supabase') return;
    try {
      const data = await medicoesApi.getAll();
      dispatch({ type: 'RELOAD_MEDICOES', payload: transformArray(data) });
    } catch (err) {
      console.error('❌ Erro ao recarregar medições:', err.message);
    }
  }, [dataSource]);

  // Recarrega estoque do Supabase (pull-to-refresh / sync cross-device).
  const reloadEstoque = useCallback(async () => {
    if (dataSource !== 'supabase') return null;
    try {
      const data = await estoqueApi.getAll();
      const fresh = transformArray(data);
      dispatch({ type: 'RELOAD_ESTOQUE', payload: fresh });
      return fresh; // devolve o estoque fresco p/ quem precisa gerar já com o online
    } catch (err) {
      console.error('❌ Erro ao recarregar estoque:', err.message);
      return null;
    }
  }, [dataSource]);

  // Recarrega romaneios/expedições do Supabase (pull-to-refresh / sync cross-device).
  const reloadExpedicoes = useCallback(async () => {
    if (dataSource !== 'supabase') return;
    try {
      const data = await expedicoesApi.getAll();
      dispatch({ type: 'RELOAD_EXPEDICOES', payload: transformArray(data) });
    } catch (err) {
      console.error('❌ Erro ao recarregar expedições:', err.message);
    }
  }, [dataSource]);

  // SINCRONIZAÇÃO CROSS-DEVICE: ao voltar o foco/visibilidade da aba, recarrega
  // os dados colaborativos (lançamentos, medições, peças) com throttle de 15s.
  // Resolve o sintoma "dados lançados por outro usuário não aparecem/persistem".
  useEffect(() => {
    if (dataSource !== 'supabase') return;
    let lastSync = 0;
    const sync = () => {
      const now = Date.now();
      if (now - lastSync < 15000) return; // throttle
      lastSync = now;
      reloadLancamentos();
      reloadMedicoes();
      reloadPecas();
    };
    const onVisible = () => { if (document.visibilityState === 'visible') sync(); };
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [dataSource, reloadLancamentos, reloadMedicoes, reloadPecas]);

  // ===== AÇÕES - EXPEDIÇÃO =====
  // REGRA DO FLUXO (migração 2026100530_expedicao_romaneio_transacional.sql):
  //  • Criar romaneio NÃO move peças: continuam 'expedido' (Fila de Embarque),
  //    reservadas no romaneio; envio parcial vira split próprio (ainda 'expedido').
  //  • Despacho (em_transito/entregue) → peças 'enviado' (Em Obra / Auto-Pull da
  //    MontagemPage). Voltar para preparando/aguardando/problema → 'expedido'.
  //  • Tudo via RPC transacional: sem estado otimista, sem erro engolido. Em
  //    sucesso recarrega peças + romaneios do banco; em falha lança o erro (a
  //    página mostra o toast com a mensagem).
  const addExpedicao = useCallback(async (expedicao) => {
    const detalhes = expedicao.pecas_detalhes || expedicao.pecasDetalhes
      || (expedicao.pecas || expedicao.pecas_ids || []).map(id => ({ id }));
    const payload = montarPayloadCriarRomaneio({
      id: expedicao.id || null,
      numero: expedicao.numero || expedicao.numero_romaneio || expedicao.numeroRomaneio,
      data: expedicao.data_envio || expedicao.dataEnvio || expedicao.data_expedicao || hojeLocalISO(),
      status: expedicao.status || 'preparando',
      transportadora: expedicao.transportadora,
      motorista: expedicao.motorista,
      placa: expedicao.placa,
      observacoes: expedicao.observacoes,
      destino: expedicao.obra_nome || expedicao.obraNome || null,
      itens: detalhes.map(d => ({
        id: typeof d === 'object' ? d.id : d,
        qtd: typeof d === 'object' ? (d.qtd ?? d.qtd_enviada ?? d.qtdEnviada) : undefined,
      })),
    });

    if (dataSource !== 'supabase') {
      // Modo local/mock: só registra o romaneio (peças continuam 'expedido').
      const local = {
        ...expedicao,
        id: payload.id || `EXP-${Date.now()}`,
        numeroRomaneio: payload.numero_romaneio,
        dataExpedicao: payload.data_expedicao,
        status: payload.status,
        pecas: payload.pecas.map(p => ({ id: p.id, qtd_enviada: p.qtd, qtd_total: p.qtd })),
      };
      dispatch({ type: ACTIONS.ADD_EXPEDICAO, payload: local });
      return { expedicao: local, splits: [] };
    }

    const result = await criarRomaneio(payload);
    await Promise.all([reloadPecas(), reloadExpedicoes()]);
    console.log(`✅ Romaneio ${result?.expedicao?.id} criado (${result?.splits?.length || 0} split(s) parciais)`);

    if (window.__notificationDispatch) {
      const numPecas = payload.pecas.length;
      window.__notificationDispatch({
        type: 'shipping',
        title: `Romaneio ${result?.expedicao?.numero_romaneio || result?.expedicao?.id || ''} criado`,
        message: `${numPecas} peça${numPecas !== 1 ? 's' : ''} reservada${numPecas !== 1 ? 's' : ''} para ${result?.expedicao?.destino || result?.expedicao?.obra_id || 'obra'}. Peças seguem na Fila de Embarque até o despacho.`,
        icon: 'Truck'
      });
    }
    return result;
  }, [dataSource, reloadPecas, reloadExpedicoes]);

  const updateExpedicao = useCallback(async (id, data = {}) => {
    const { status, motivoProblema, motivo_problema, ...resto } = data || {};
    const novoStatus = status != null ? normalizarStatusRomaneio(status) : null;
    if (novoStatus != null && !STATUS_ROMANEIO.includes(novoStatus)) {
      throw new Error(`Status de romaneio inválido: ${status}`);
    }

    if (dataSource !== 'supabase') {
      dispatch({ type: ACTIONS.UPDATE_EXPEDICAO, payload: { id, data: { ...resto, ...(novoStatus ? { status: novoStatus } : {}) } } });
      return;
    }

    // 1) Campos cadastrais (número, data, transportadora, motorista, placa, obs).
    //    Status/peças/datas de despacho/soft-delete NUNCA vão por aqui — só pelas RPCs.
    const snakeData = reverseTransformRecord(resto);
    ['id', 'status', 'pecas', 'pecas_ids', 'pecas_detalhes', 'obra_id', 'peso_total',
      'deleted_at', 'data_saida', 'data_entrega', 'created_at', 'updated_at'].forEach(k => delete snakeData[k]);
    if (Object.keys(snakeData).length > 0) {
      await expedicoesApi.update(id, snakeData);
    }

    // 2) Status → RPC de despacho (move as peças na mesma transação)
    if (novoStatus) {
      const res = await despacharRomaneio(id, novoStatus, motivoProblema ?? motivo_problema ?? null);
      console.log(`✅ Romaneio ${id} → ${novoStatus} (${res?.pecas_movidas ?? 0} peça(s) movida(s))`);
      await Promise.all([reloadPecas(), reloadExpedicoes()]);
    } else {
      await reloadExpedicoes();
    }
  }, [dataSource, reloadPecas, reloadExpedicoes]);

  const deleteExpedicao = useCallback(async (id) => {
    if (dataSource !== 'supabase') {
      dispatch({ type: ACTIONS.DELETE_EXPEDICAO, payload: id });
      return;
    }
    const res = await excluirRomaneio(id);
    console.log(`✅ Romaneio ${id} excluído (${res?.pecas_retornadas ?? 0} peça(s) de volta à fila, ${res?.splits_reunidos ?? 0} split(s) reunido(s))`);
    await Promise.all([reloadPecas(), reloadExpedicoes()]);
    return res;
  }, [dataSource, reloadPecas, reloadExpedicoes]);

  // ===== AÇÕES - COMPRAS =====
  const addCompra = useCallback(async (compra) => {
    dispatch({ type: ACTIONS.ADD_COMPRA, payload: compra });
    if (dataSource === 'supabase') {
      try {
        const record = reverseTransformRecord(compra);
        await comprasApi.create(record);
        console.log(`✅ Compra ${compra.id} criada no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao criar compra no Supabase:', err.message);
        toast.error(`Erro ao salvar compra: ${err.message}`);
        throw err;
      }
    }
  }, [dataSource]);

  const updateCompra = useCallback(async (id, data) => {
    dispatch({ type: ACTIONS.UPDATE_COMPRA, payload: { id, data } });
    if (dataSource === 'supabase') {
      try {
        await comprasApi.update(id, reverseTransformRecord(data));
        console.log(`✅ Compra ${id} atualizada no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao atualizar compra no Supabase:', err.message);
        toast.error(`Erro ao atualizar compra: ${err.message}`);
        throw err;
      }
    }
  }, [dataSource]);

  const receberCompra = useCallback(async (compraId, itensRecebidos) => {
    dispatch({ type: ACTIONS.RECEBER_COMPRA, payload: { compraId, itensRecebidos } });
    dispatch({
      type: ACTIONS.ADD_NOTIFICACAO,
      payload: { tipo: 'sucesso', mensagem: 'Compra recebida! Estoque atualizado.' }
    });

    if (dataSource === 'supabase') {
      try {
        await comprasApi.update(compraId, {
          status: 'entregue',
          data_entrega: new Date().toISOString().split('T')[0]
        });
        console.log(`✅ Compra ${compraId} recebida no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao receber compra no Supabase:', err.message);
        throw err;
      }

      // INTEGRAÇÃO COMPRAS → ESTOQUE (loop fechado): por item recebido,
      // registra uma ENTRADA COM perfil/material/custo, ATUALIZA o saldo do
      // item de estoque casado pelo perfil (mesma regra do abastecimento) e
      // grava saldo_anterior/novo. Assim o aço recebido: (1) aparece no saldo
      // e (2) alimenta o histórico de preços do Abastecimento Automático
      // (últimos valores lançados). Best-effort: falha aqui não desfaz o
      // recebimento.
      try {
        const compra = state.compras.find(c => c.id === compraId);
        const itens = Array.isArray(itensRecebidos) && itensRecebidos.length > 0
          ? itensRecebidos
          : (Array.isArray(compra?.itens) ? compra.itens : []);
        const estoqueAtual = await estoqueApi.getAll().catch(() => []);
        const now = new Date().toISOString();
        const hoje = now.split('T')[0];

        for (const item of itens) {
          const perfil = item.perfil || item.material_perfil || '';
          const material = item.material || item.descricao || null;
          const qtd = Number(item.quantidade) || 0;
          const custo = Number(item.precoUnitario ?? item.custo_unitario ?? item.valorUnit) || 0;
          const unidade = item.unidade || 'kg';

          // Casa item de estoque: 1º pelo item_id explícito (ex.: reposição
          // referencia o item exato), senão pelo perfil (abastecimento). Assim
          // o saldo sobe também p/ consumíveis sem perfil.
          let itemId = item.item_id || item.itemId || null;
          const est = (itemId ? estoqueAtual.find((e) => e.id === itemId) : null)
            || (perfil ? matchEstoqueItem(estoqueAtual, perfil) : null);
          const nf = compra?.notaFiscal || compra?.documentoOrigem || null;
          const motivo = `Recebimento compra ${compraId} — ${item.descricao || material || ''}`.trim();
          if (est) {
            if (!(qtd > 0)) continue;
            // Item existente: delta ATÔMICO (saldo + comprado/falta + movimentação
            // na MESMA transação) — sem read-modify-write do saldo da tela.
            try {
              await movimentarEstoque(est.id, qtd, {
                tipo: 'entrada',
                origem: 'compra',
                setor: 'suprimentos',
                motivo,
                notaFiscal: nf,
                custoUnitario: custo,
                obraId: compra?.obraId || null,
                contaComprado: true,
                materialPerfil: perfil || undefined,
                material: material || undefined,
                peso: item.peso || qtd,
              });
              est.quantidade = (Number(est.quantidade) || 0) + qtd; // p/ próximos itens do lote
            } catch (e) {
              console.error('⚠️ Falha ao dar entrada no estoque:', e.message);
              toast.error(`Entrada de ${item.descricao || perfil || 'item'} no estoque falhou: ${e.message}`);
            }
            continue;
          }

          let saldoAnterior = null, saldoNovo = null;
          if (perfil || material) {
            // Perfil NOVO (sem item no estoque): cria o item de fábrica para o
            // material recebido aparecer no saldo. Best-effort.
            const novoItem = montarNovoItemEstoque(item, compra, { hoje, nowISO: now });
            if (novoItem) {
              try {
                // Item novo já nasce com comprado = quantidade recebida.
                const criado = await estoqueApi.create({ ...novoItem, comprado: novoItem.comprado ?? novoItem.quantidade ?? qtd });
                itemId = criado?.id || itemId;
                saldoAnterior = 0;
                saldoNovo = qtd;
                // Disponibiliza p/ próximos itens do MESMO perfil neste recebimento
                estoqueAtual.push({ ...novoItem, id: itemId });
              } catch (e) {
                console.error('⚠️ Falha ao criar item de estoque novo:', e.message);
              }
            }
          }

          await movEstoqueApi.create({
            item_id: itemId,
            tipo: 'entrada',
            quantidade: qtd,
            peso: item.peso || qtd,
            unidade,
            material_perfil: perfil || null,
            material,
            custo_unitario: custo || null,
            motivo,
            nota_fiscal: nf,
            obra_id: compra?.obraId || null,
            setor: 'suprimentos',
            origem: 'compra',
            ...(saldoAnterior != null ? { saldo_anterior: saldoAnterior, saldo_novo: saldoNovo } : {}),
            data: now,
          });
        }
        if (itens.length > 0) {
          console.log(`✅ ${itens.length} entradas registradas (compra ${compraId}) com perfil/material/custo`);
        }
      } catch (err) {
        console.error('⚠️ Recebimento ok, mas falhou ao registrar movimentação de estoque:', err.message);
      }
    }

    // Add persistent notification
    if (window.__notificationDispatch) {
      const numItens = itensRecebidos?.length || 0;
      const totalKg = itensRecebidos?.reduce((acc, item) => acc + (item.quantidade || 0), 0) || 0;
      window.__notificationDispatch({
        type: 'success',
        title: `Compra ${compraId} confirmada`,
        message: `${numItens} item${numItens !== 1 ? 'ns' : ''} recebido${numItens !== 1 ? 's' : ''} (${totalKg.toLocaleString('pt-BR')} kg). Estoque atualizado com sucesso.`,
        icon: 'Package'
      });
    }
  }, [dataSource, state.compras]);

  // ===== AÇÕES - MEDIÇÕES =====
  // Helper: sanitizar dados de medição para colunas válidas do Supabase
  const sanitizeMedicaoForSupabase = (record) => {
    // Colunas válidas da tabela medicoes
    const VALID_COLS = new Set([
      'id', 'obra_id', 'tipo', 'data_medicao', 'responsavel', 'peso_medido',
      'area_medida', 'percentual', 'observacoes', 'numero', 'setor', 'etapa',
      'valor_bruto', 'valor_liquido', 'valor_total', 'retencoes', 'detalhamento',
      'data_referencia', 'status', 'descricao', 'is_avulsa'
    ]);
    const clean = {};
    for (const [key, value] of Object.entries(record)) {
      // Corrigir 'observacao' → 'observacoes'
      const fixedKey = key === 'observacao' ? 'observacoes' : key;
      if (!VALID_COLS.has(fixedKey)) continue;
      // Serializar objetos para JSON string (retencoes, detalhamento)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        clean[fixedKey] = JSON.stringify(value);
      } else {
        clean[fixedKey] = value;
      }
    }
    return clean;
  };

  const addMedicao = useCallback(async (medicao) => {
    dispatch({ type: ACTIONS.ADD_MEDICAO, payload: medicao });
    if (dataSource === 'supabase') {
      try {
        const record = reverseTransformRecord(medicao);
        const cleanRecord = sanitizeMedicaoForSupabase(record);
        await medicoesApi.create(cleanRecord);
        console.log(`✅ Medição ${medicao.id} criada no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao criar medição no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  const updateMedicao = useCallback(async (id, dados) => {
    dispatch({ type: ACTIONS.UPDATE_MEDICAO, payload: { id, dados } });
    if (dataSource === 'supabase') {
      try {
        const snakeData = reverseTransformRecord(dados);
        const cleanData = sanitizeMedicaoForSupabase(snakeData);
        await medicoesApi.update(id, cleanData);
        console.log(`✅ Medição ${id} atualizada no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao atualizar medição no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  const deleteMedicao = useCallback(async (id) => {
    dispatch({ type: ACTIONS.DELETE_MEDICAO, payload: id });
    if (dataSource === 'supabase') {
      try {
        await medicoesApi.delete(id);
        console.log(`✅ Medição ${id} removida do Supabase`);
      } catch (err) {
        console.error('❌ Erro ao remover medição no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  const updateConfigMedicao = useCallback(async (tipo, etapa, config) => {
    dispatch({ type: ACTIONS.UPDATE_CONFIG_MEDICAO, payload: { tipo, etapa, config } });
    if (dataSource === 'supabase') {
      try {
        const record = { tipo, etapa, config: JSON.stringify(config) };
        await configMedicaoApi.create(record);
        console.log(`✅ Config medição ${tipo}/${etapa} salva no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao salvar config medição:', err.message);
        toast.error(`Erro ao salvar configuração de medição: ${err.message}`);
        throw err;
      }
    }
  }, [dataSource]);

  // ===== AÇÕES - LANÇAMENTOS / DESPESAS =====
  const addLancamento = useCallback(async (lancamento) => {
    const lancamentoComId = { ...lancamento, id: lancamento.id || `lanc-${Date.now()}` };
    dispatch({ type: ACTIONS.ADD_LANCAMENTO, payload: lancamentoComId });
    if (dataSource === 'supabase') {
      try {
        const record = lancamentoToSupabase(lancamentoComId);
        await lancamentosApi.create(record);
        console.log(`✅ Lançamento ${lancamentoComId.id} criado no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao criar lançamento no Supabase:', err.message);
        // Re-propaga: a falha NÃO pode ser silenciosa. Sem isto a UI mostrava
        // "Lançamento salvo!" mesmo quando o INSERT falhava (ex: RLS bloqueando
        // o role anon), e o dado não persistia para outros usuários/dispositivos.
        throw err;
      }
    }
  }, [dataSource]);

  const updateLancamento = useCallback(async (id, data) => {
    dispatch({ type: ACTIONS.UPDATE_LANCAMENTO, payload: { id, data } });
    if (dataSource === 'supabase') {
      try {
        const snakeData = lancamentoToSupabase(data);
        await lancamentosApi.update(id, snakeData);
        console.log(`✅ Lançamento ${id} atualizado no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao atualizar lançamento no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  const deleteLancamento = useCallback(async (id) => {
    dispatch({ type: ACTIONS.REMOVE_LANCAMENTO, payload: id });
    if (dataSource === 'supabase') {
      try {
        await lancamentosApi.delete(id);
        console.log('Lancamento ' + id + ' removido do Supabase');
      } catch (err) {
        console.error('Erro ao remover lancamento do Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  // ===== AÇÕES - EQUIPES =====
  const alocarEquipe = useCallback(async (equipeId, obraId) => {
    dispatch({ type: ACTIONS.ALOCAR_EQUIPE, payload: { equipeId, obraId } });
    if (dataSource === 'supabase') {
      try {
        await equipesApi.update(equipeId, { obra_atual_id: obraId });
        console.log(`✅ Equipe ${equipeId} alocada à obra ${obraId} no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao alocar equipe no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  // ===== AÇÕES - FUNCIONÁRIOS CRUD =====
  const addFuncionario = useCallback(async (funcionario) => {
    dispatch({ type: ACTIONS.ADD_FUNCIONARIO, payload: funcionario });
    if (dataSource === 'supabase') {
      try {
        const snakeData = reverseTransformRecord(funcionario);
        await funcionariosApi.upsert(snakeData);
        console.log(`✅ Funcionário ${funcionario.nome} criado no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao criar funcionário no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  const updateFuncionario = useCallback(async (id, data) => {
    dispatch({ type: ACTIONS.UPDATE_FUNCIONARIO, payload: { id, data } });
    if (dataSource === 'supabase') {
      try {
        const snakeData = reverseTransformRecord(data);
        delete snakeData.id;
        await funcionariosApi.update(id, snakeData);
        console.log(`✅ Funcionário ${id} atualizado no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao atualizar funcionário no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  const deleteFuncionario = useCallback(async (id) => {
    dispatch({ type: ACTIONS.DELETE_FUNCIONARIO, payload: id });
    if (dataSource === 'supabase') {
      try {
        await funcionariosApi.delete(id);
        console.log(`✅ Funcionário ${id} removido do Supabase`);
      } catch (err) {
        console.error('❌ Erro ao remover funcionário no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  // ===== AÇÕES - EQUIPES CRUD =====
  const addEquipe = useCallback(async (equipe) => {
    dispatch({ type: ACTIONS.ADD_EQUIPE, payload: equipe });
    if (dataSource === 'supabase') {
      try {
        const snakeData = reverseTransformRecord(equipe);
        await equipesApi.upsert(snakeData);
        console.log(`✅ Equipe ${equipe.nome} criada no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao criar equipe no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  const updateEquipe = useCallback(async (id, data) => {
    dispatch({ type: ACTIONS.UPDATE_EQUIPE, payload: { id, data } });
    if (dataSource === 'supabase') {
      try {
        const snakeData = reverseTransformRecord(data);
        delete snakeData.id;
        await equipesApi.update(id, snakeData);
        console.log(`✅ Equipe ${id} atualizada no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao atualizar equipe no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  const deleteEquipe = useCallback(async (id) => {
    dispatch({ type: ACTIONS.DELETE_EQUIPE, payload: id });
    if (dataSource === 'supabase') {
      try {
        await equipesApi.delete(id);
        console.log(`✅ Equipe ${id} removida do Supabase`);
      } catch (err) {
        console.error('❌ Erro ao remover equipe no Supabase:', err.message);
        throw err;
      }
    }
  }, [dataSource]);

  // ===== AÇÕES - MÁQUINAS =====
  const updateMaquina = useCallback(async (id, data) => {
    dispatch({ type: ACTIONS.UPDATE_MAQUINA, payload: { id, data } });
    if (dataSource === 'supabase') {
      try {
        const snakeData = reverseTransformRecord(data);
        delete snakeData.id;
        await maquinasApi.update(id, snakeData);
        console.log(`✅ Máquina ${id} atualizada no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao atualizar máquina no Supabase:', err.message);
        toast.error(`Erro ao atualizar máquina: ${err.message}`);
        throw err;
      }
    }
  }, [dataSource]);

  // ===== AÇÕES - LISTAS =====
  const importarLista = useCallback(async (lista) => {
    dispatch({ type: ACTIONS.IMPORTAR_LISTA, payload: lista });
    dispatch({
      type: ACTIONS.ADD_NOTIFICACAO,
      payload: { tipo: 'sucesso', mensagem: `Lista ${lista.tipo} importada com sucesso!` }
    });

    // Persistir no Supabase
    if (dataSource === 'supabase') {
      try {
        const record = reverseTransformRecord(lista);
        if (record.itens && typeof record.itens !== 'string') {
          record.itens = JSON.stringify(record.itens);
        }
        await listasApi.create(record);
        console.log(`✅ Lista ${lista.tipo} salva no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao salvar lista no Supabase:', err.message);
        throw err;
      }
    }

    if (window.__notificationDispatch) {
      window.__notificationDispatch({
        type: 'success',
        title: `Lista ${lista.tipo} importada`,
        message: `${lista.itens?.length || 0} itens foram adicionados ao sistema com sucesso.`,
        icon: 'Package'
      });
    }
  }, [dataSource]);

  // ===== AÇÕES - MATERIAIS (Controle de Estoque em Peso KG) =====
  const importarMateriais = useCallback(async (materiais) => {
    dispatch({ type: ACTIONS.IMPORTAR_MATERIAIS, payload: materiais });
    const pesoTotal = materiais.reduce((acc, m) => acc + (m.pesoPedido || 0), 0);
    dispatch({
      type: ACTIONS.ADD_NOTIFICACAO,
      payload: { tipo: 'sucesso', mensagem: `${materiais.length} materiais importados (${pesoTotal.toLocaleString()} kg)` }
    });

    // Persistir no Supabase — SANITIZADO para as colunas reais de
    // pedidos_material (peso_previsto/peso_comprado/peso_entregue/peso_falta;
    // não existem peso_pedido/peso_recebido — verificado em prod)
    if (dataSource === 'supabase') {
      const PM_VALID = new Set([
        'id', 'obra_id', 'descricao', 'material', 'perfil', 'quantidade',
        'unidade', 'peso_previsto', 'peso_comprado', 'peso_entregue',
        'peso_falta', 'fornecedor', 'status', 'data_pedido', 'data_entrega',
        'nota_fiscal', 'observacoes', 'created_at', 'updated_at'
      ]);
      const PM_ALIAS = {
        peso_pedido: 'peso_previsto',
        peso_recebido: 'peso_entregue',
        peso_falta_entregar: 'peso_falta',
      };
      try {
        const records = materiais.map(m => {
          const raw = reverseTransformRecord(m);
          const clean = {};
          for (const [k, v] of Object.entries(raw)) {
            const key = PM_ALIAS[k] || k;
            if (PM_VALID.has(key) && clean[key] === undefined) clean[key] = v;
          }
          return clean;
        });
        for (const rec of records) {
          await pedidosMaterialApi.create(rec);
        }
        console.log(`✅ ${materiais.length} materiais salvos no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao salvar materiais no Supabase:', err.message);
        toast.error(`Erro ao salvar materiais: ${err.message}`);
      }
    }

    if (window.__notificationDispatch) {
      window.__notificationDispatch({
        type: 'info',
        title: `${materiais.length} materiais importados`,
        message: `Total de ${pesoTotal.toLocaleString('pt-BR')} kg em materiais foi adicionado ao sistema.`,
        icon: 'Package'
      });
    }
  }, [dataSource]);

  const registrarEntregaMaterial = useCallback(async (materialId, entrega) => {
    dispatch({ type: ACTIONS.REGISTRAR_ENTREGA_MATERIAL, payload: { materialId, entrega } });
    dispatch({
      type: ACTIONS.ADD_NOTIFICACAO,
      payload: { tipo: 'sucesso', mensagem: `Entrega de ${entrega.pesoKg.toLocaleString()} kg registrada!` }
    });

    // Persistir no Supabase
    if (dataSource === 'supabase') {
      try {
        const entregaData = reverseTransformRecord(entrega);
        entregaData.material_id = materialId;
        await pedidosMaterialApi.update(materialId, {
          peso_entregue: entrega.pesoKg,
          data_entrega: entrega.data || new Date().toISOString(),
          status: 'entregue'
        });
        console.log(`✅ Entrega material ${materialId} salva no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao salvar entrega no Supabase:', err.message);
        throw err;
      }
    }

    if (window.__notificationDispatch) {
      window.__notificationDispatch({
        type: 'success',
        title: 'Entrega de material registrada',
        message: `${entrega.pesoKg.toLocaleString('pt-BR')} kg foram recebidos do fornecedor.`,
        icon: 'CheckCircle'
      });
    }
  }, [dataSource]);

  const updateMaterial = useCallback(async (id, data) => {
    dispatch({ type: ACTIONS.UPDATE_MATERIAL, payload: { id, data } });
    if (dataSource === 'supabase') {
      try {
        const snakeData = reverseTransformRecord(data);
        delete snakeData.id;
        await pedidosMaterialApi.update(id, snakeData);
        console.log(`✅ Material ${id} atualizado no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao atualizar material no Supabase:', err.message);
        toast.error(`Erro ao atualizar material: ${err.message}`);
        throw err;
      }
    }
  }, [dataSource]);

  // ===== AÇÕES - UI =====
  const setFiltros = useCallback((filtros) => {
    dispatch({ type: ACTIONS.SET_FILTROS, payload: filtros });
  }, []);

  const addNotificacao = useCallback((notificacao) => {
    dispatch({ type: ACTIONS.ADD_NOTIFICACAO, payload: notificacao });
    // Remove automaticamente após 5 segundos
    setTimeout(() => {
      dispatch({ type: ACTIONS.REMOVE_NOTIFICACAO, payload: notificacao.id });
    }, 5000);
  }, []);

  const removeNotificacao = useCallback((id) => {
    dispatch({ type: ACTIONS.REMOVE_NOTIFICACAO, payload: id });
  }, []);

  // ===== SELETORES =====
  // ESCOPO GLOBAL (filtro único do topo — ver src/lib/escopoObra.js)
  //   escopoObra   = 'geral' | grupo | obraId (valor bruto do seletor)
  //   obraIdAtiva  = id SÓ quando o escopo é uma obra (senão null)
  //   obraIdsEscopo= lista de obras do escopo (null = todas)
  // Sem fallback para obras[0]: "Geral" nunca vira silenciosamente a 1ª obra.
  const escopoObra = state.obraAtual || OBRA_GERAL;
  const obraIdAtiva = obraIdUnica(escopoObra);
  const obraIdsEscopo = useMemo(() => obraIdsDoEscopo(escopoObra), [escopoObra]);

  const obraAtualData = useMemo(() => {
    if (!obraIdAtiva) return null;
    return state.obras.find(o => o.id === obraIdAtiva) || null;
  }, [state.obras, obraIdAtiva]);

  const noEscopo = useCallback((obraId) => !obraIdsEscopo || obraIdsEscopo.includes(obraId), [obraIdsEscopo]);

  const pecasObraAtual = useMemo(() => {
    if (!obraIdsEscopo) return state.pecas; // Geral → todas
    return state.pecas.filter(p => noEscopo(p.obraId));
  }, [state.pecas, obraIdsEscopo, noEscopo]);

  const estoqueObraAtual = useMemo(() => {
    if (!obraIdsEscopo) return state.estoque;
    return state.estoque.filter(e => noEscopo(e.obraReservada) || !e.obraReservada);
  }, [state.estoque, obraIdsEscopo, noEscopo]);

  const expedicoesObraAtual = useMemo(() => {
    if (!obraIdsEscopo) return state.expedicoes;
    return state.expedicoes.filter(e => noEscopo(e.obraId));
  }, [state.expedicoes, obraIdsEscopo, noEscopo]);

  const comprasObraAtual = useMemo(() => {
    if (!obraIdsEscopo) return state.compras;
    return state.compras.filter(c => noEscopo(c.obraId));
  }, [state.compras, obraIdsEscopo, noEscopo]);

  const medicoesObraAtual = useMemo(() => {
    if (!obraIdsEscopo) return state.medicoes;
    return state.medicoes.filter(m => noEscopo(m.obraId));
  }, [state.medicoes, obraIdsEscopo, noEscopo]);

  // Antes chamava getEstatisticasGerais() de data/database (calculado sobre
  // os dados MOCK e arrastando ~350 KB de mock para o bundle inicial).
  // Mesmo shape, agora a partir do estado real.
  const estatisticasGerais = useMemo(() => {
    const obras = state.obras || [];
    const estoque = state.estoque || [];
    const obrasAtivas = obras.filter(o => ![STATUS_OBRA.CONCLUIDA, STATUS_OBRA.CANCELADA, STATUS_OBRA.ORCAMENTO].includes(o.status));
    return {
      totalObras: obras.length,
      obrasAtivas: obrasAtivas.length,
      pesoTotalKg: obrasAtivas.reduce((acc, o) => acc + (Number(o.pesoTotal) || 0), 0),
      valorTotalContratos: obrasAtivas.reduce((acc, o) => acc + (Number(o.valorContrato) || 0), 0),
      funcionariosAtivos: (state.funcionarios || []).filter(f => f.ativo).length,
      equipesAtivas: (state.equipes || []).filter(e => e.obraAtual).length,
      itensEstoque: estoque.length,
      alertasEstoque: estoque.filter(e => (e.quantidadeAtual ?? e.quantidade ?? 0) <= (e.quantidadeMinima ?? e.minimo ?? 0)).length,
    };
  }, [state.obras, state.funcionarios, state.equipes, state.estoque]);

  const alertasEstoque = useMemo(() => {
    return state.estoque.filter(e => {
      const qtd = e.quantidadeAtual ?? e.quantidade ?? 0;
      const min = e.quantidadeMinima ?? e.minimo ?? 0;
      return qtd <= min;
    });
  }, [state.estoque]);

  // ===== MEMOIZED DOMAIN CONTEXTS =====

  // 1. ERPCoreContext: connection/loading state
  const coreValue = useMemo(() => ({
    supabaseConnected,
    dataSource,
    connectionError,
    loading: state.loading,
    // obraAtual = id da obra SÓ quando o escopo é uma obra; null em Geral/grupo
    obraAtual: obraIdAtiva,
    escopoObra,
    obraIdsEscopo,
    obraAtualData,
    setObraAtual,
    filtros: state.filtros,
    setFiltros,
    notificacoes: state.notificacoes,
    addNotificacao,
    removeNotificacao,
    ensureLoaded
  }), [
    supabaseConnected,
    dataSource,
    connectionError,
    state.loading,
    obraIdAtiva,
    escopoObra,
    obraIdsEscopo,
    obraAtualData,
    setObraAtual,
    state.filtros,
    setFiltros,
    state.notificacoes,
    addNotificacao,
    removeNotificacao,
    ensureLoaded
  ]);

  // 2. ObrasContext: obras + orcamentos + clientes
  const obrasValue = useMemo(() => ({
    obras: state.obras,
    clientes: state.clientes,
    orcamentos: state.orcamentos,
    addObra,
    updateObra,
    updateProgressoObra,
    aprovarOrcamento,
    addOrcamento,
    updateOrcamento,
    deleteOrcamento
  }), [
    state.obras,
    state.clientes,
    state.orcamentos,
    addObra,
    updateObra,
    updateProgressoObra,
    aprovarOrcamento,
    addOrcamento,
    updateOrcamento,
    deleteOrcamento
  ]);

  // 3. ProducaoContext: pecas + maquinas
  const producaoValue = useMemo(() => ({
    pecas: state.pecas,
    pecasObraAtual,
    maquinas: state.maquinas,
    moverPecaEtapa,
    updateStatusCorte,
    addPecas,
    updatePeca,
    reloadPecas,
    updateMaquina
  }), [
    state.pecas,
    pecasObraAtual,
    state.maquinas,
    moverPecaEtapa,
    updateStatusCorte,
    addPecas,
    updatePeca,
    reloadPecas,
    updateMaquina
  ]);

  // 4. SupplyContext: estoque + compras + materiais + listas
  const supplyValue = useMemo(() => ({
    estoque: state.estoque,
    estoqueObraAtual,
    alertasEstoque,
    consumirEstoque,
    adicionarEstoque,
    reservarEstoque,
    reloadEstoque,
    compras: state.compras,
    comprasObraAtual,
    addCompra,
    updateCompra,
    receberCompra,
    materiaisEstoque: state.materiaisEstoque,
    importarMateriais,
    registrarEntregaMaterial,
    updateMaterial,
    listas: state.listas,
    importarLista,
    notasFiscais: state.notasFiscais,
    movimentacoesEstoque: state.movimentacoesEstoque
  }), [
    state.estoque,
    estoqueObraAtual,
    alertasEstoque,
    consumirEstoque,
    adicionarEstoque,
    reservarEstoque,
    reloadEstoque,
    state.compras,
    comprasObraAtual,
    addCompra,
    updateCompra,
    receberCompra,
    state.materiaisEstoque,
    importarMateriais,
    registrarEntregaMaterial,
    updateMaterial,
    state.listas,
    importarLista,
    state.notasFiscais,
    state.movimentacoesEstoque
  ]);

  // 5. OperacoesContext: expedição + medições + lançamentos + equipes
  const operacoesValue = useMemo(() => ({
    expedicoes: state.expedicoes,
    expedicoesObraAtual,
    addExpedicao,
    updateExpedicao, deleteExpedicao,
    reloadExpedicoes,
    medicoes: state.medicoes,
    medicoesObraAtual,
    configMedicao: state.configMedicao,
    addMedicao,
    updateMedicao,
    deleteMedicao,
    updateConfigMedicao,
    lancamentosDespesas: state.lancamentosDespesas,
    addLancamento,
    updateLancamento,
    deleteLancamento,
    funcionarios: state.funcionarios,
    equipes: state.equipes,
    alocarEquipe,
    addFuncionario,
    updateFuncionario,
    deleteFuncionario,
    addEquipe,
    updateEquipe,
    deleteEquipe
  }), [
    state.expedicoes,
    expedicoesObraAtual,
    addExpedicao,
    updateExpedicao, deleteExpedicao,
    reloadExpedicoes,
    state.medicoes,
    medicoesObraAtual,
    state.configMedicao,
    addMedicao,
    updateMedicao,
    deleteMedicao,
    updateConfigMedicao,
    state.lancamentosDespesas,
    addLancamento,
    updateLancamento,
    state.funcionarios,
    state.equipes,
    alocarEquipe,
    addFuncionario,
    updateFuncionario,
    deleteFuncionario,
    addEquipe,
    updateEquipe,
    deleteEquipe
  ]);

  // Legacy unified value for backward compatibility
  const unifiedValue = useMemo(() => ({
    // Estado
    ...state,

    // Conexão
    supabaseConnected,
    dataSource,
    connectionError,

    // Seletores computados
    obraAtualData,
    pecasObraAtual,
    estoqueObraAtual,
    expedicoesObraAtual,
    comprasObraAtual,
    medicoesObraAtual,
    estatisticasGerais,
    alertasEstoque,

    // Ações - Obras
    setObraAtual,
    updateObra,
    addObra,
    updateProgressoObra,

    // Ações - Orçamentos
    aprovarOrcamento,
    addOrcamento,

    // Ações - Estoque
    consumirEstoque,
    adicionarEstoque,
    reservarEstoque,

    // Ações - Produção
    moverPecaEtapa,
    updateStatusCorte,
    addPecas,
    updatePeca,
    reloadPecas,

    // Ações - Expedição
    addExpedicao,
    updateExpedicao, deleteExpedicao,

    // Ações - Compras
    addCompra,
    updateCompra,
    receberCompra,

    // Ações - Medições
    addMedicao,
    updateMedicao,
    deleteMedicao,
    updateConfigMedicao,

    // Ações - Lançamentos / Despesas
    addLancamento,
    updateLancamento,

    // Ações - Equipes / Funcionários
    alocarEquipe,
    addFuncionario,
    updateFuncionario,
    deleteFuncionario,
    addEquipe,
    updateEquipe,
    deleteEquipe,

    // Ações - Máquinas
    updateMaquina,

    // Ações - Listas
    importarLista,

    // Ações - Materiais
    importarMateriais,
    registrarEntregaMaterial,
    updateMaterial,

    // Ações - UI
    setFiltros,
    addNotificacao,
    removeNotificacao
  }), [
    state,
    supabaseConnected,
    dataSource,
    connectionError,
    obraAtualData,
    obraIdAtiva,
    pecasObraAtual,
    estoqueObraAtual,
    expedicoesObraAtual,
    comprasObraAtual,
    medicoesObraAtual,
    estatisticasGerais,
    alertasEstoque,
    setObraAtual,
    updateObra,
    addObra,
    updateProgressoObra,
    aprovarOrcamento,
    addOrcamento,
    consumirEstoque,
    adicionarEstoque,
    reservarEstoque,
    moverPecaEtapa,
    updateStatusCorte,
    addPecas,
    updatePeca,
    reloadPecas,
    addExpedicao,
    updateExpedicao, deleteExpedicao,
    addCompra,
    updateCompra,
    receberCompra,
    addMedicao,
    updateMedicao,
    deleteMedicao,
    updateConfigMedicao,
    addLancamento,
    updateLancamento,
    alocarEquipe,
    addFuncionario,
    updateFuncionario,
    deleteFuncionario,
    addEquipe,
    updateEquipe,
    deleteEquipe,
    updateMaquina,
    importarLista,
    importarMateriais,
    registrarEntregaMaterial,
    updateMaterial,
    setFiltros,
    addNotificacao,
    removeNotificacao
  ]);

  return (
    <ERPCoreContext.Provider value={coreValue}>
      <ObrasContext.Provider value={obrasValue}>
        <ProducaoContext.Provider value={producaoValue}>
          <SupplyContext.Provider value={supplyValue}>
            <OperacoesContext.Provider value={operacoesValue}>
              {children}
            </OperacoesContext.Provider>
          </SupplyContext.Provider>
        </ProducaoContext.Provider>
      </ObrasContext.Provider>
    </ERPCoreContext.Provider>
  );
}

// ===== HOOK CUSTOMIZADO =====
// useERP() now aggregates all domain contexts for backward compatibility

/**
 * Central ERP Context Hook
 *
 * @description
 * Provides access to all ERP domain contexts aggregated into a single hook.
 * Includes obras, produção, estoque, operações, and core features.
 * Recommended: Use specific hooks (useObras, useProducao, etc.) for better performance.
 *
 * @throws {Error} Must be used within ERPProvider
 *
 * @returns {Object} Aggregated ERP state and actions from all domains
 * @returns {Array} returns.obras - All projects/works
 * @returns {Array} returns.pecas - All pieces in production
 * @returns {Array} returns.estoque - All stock items
 * @returns {Array} returns.equipes - All teams and employees
 * @returns {string} returns.obraAtual - Currently selected work/project ID
 * @returns {Object} returns.obraAtualData - Full data of current work
 * @returns {Function} returns.setObraAtual - Switch current work
 * @returns {Function} returns.addObra - Create new work
 * @returns {Function} returns.updateObra - Update existing work
 *
 * @example
 * // Access ERP context (legacy approach - use specific hooks instead)
 * const { obras, pecas, estoque, setObraAtual } = useERP();
 *
 * // Better: use specific hooks for performance
 * const { obras, setObraAtual } = useObras();
 * const { pecas } = useProducao();
 * const { estoque } = useEstoque();
 */
export function useERP() {
  const core = useContext(ERPCoreContext);
  const obras = useContext(ObrasContext);
  const producao = useContext(ProducaoContext);
  const supply = useContext(SupplyContext);
  const operacoes = useContext(OperacoesContext);

  if (!core || !obras || !producao || !supply || !operacoes) {
    throw new Error('useERP deve ser usado dentro de um ERPProvider');
  }

  // Aggregate all contexts into unified value for backward compatibility
  return {
    ...core,
    ...obras,
    ...producao,
    ...supply,
    ...operacoes
  };
}

/**
 * Garante que tabelas carregadas sob demanda (fora do boot) estejam no estado.
 * Uso numa página: `useEnsureLoaded('movimentacoesEstoque')` ou
 * `useEnsureLoaded('notasFiscais', 'materiaisEstoque')`. Idempotente.
 */
export function useEnsureLoaded(...keys) {
  const core = useContext(ERPCoreContext);
  const ensureLoaded = core?.ensureLoaded;
  const assinatura = keys.join('|');
  useEffect(() => {
    if (ensureLoaded && assinatura) ensureLoaded(assinatura.split('|'));
  }, [ensureLoaded, assinatura]);
}

// ===== HOOKS ESPECÍFICOS (Domain-based) =====
// Each hook now reads from its specific domain context for better performance

/**
 * Works/Projects Hook
 *
 * @description
 * Manages project and work information including clients and budgets.
 * Provides CRUD operations and project selection functionality.
 *
 * @throws {Error} Must be used within ERPProvider
 *
 * @returns {Object} Works management interface
 * @returns {Array} returns.obras - List of all projects
 * @returns {Array} returns.clientes - List of all clients
 * @returns {Array} returns.orcamentos - List of all budgets/quotes
 * @returns {string} returns.obraAtual - Currently selected project ID
 * @returns {Object} returns.obraAtualData - Full data of current project
 * @returns {Function} returns.setObraAtual - Switch to a different project
 * @returns {Function} returns.addObra - Create new project
 * @returns {Function} returns.updateObra - Update project details
 * @returns {Function} returns.updateProgressoObra - Update project progress
 * @returns {Function} returns.aprovarOrcamento - Approve a budget
 * @returns {Function} returns.addOrcamento - Create new budget
 *
 * @example
 * const { obras, obraAtual, setObraAtual, addObra } = useObras();
 *
 * // Switch to a different project
 * const handleSelectProject = (projectId) => setObraAtual(projectId);
 *
 * // Create new project
 * const newProject = await addObra({ nome: 'Novo Projeto', cliente_id: 'cli-123' });
 */
export function useObras() {
  const context = useContext(ObrasContext);
  if (!context) {
    throw new Error('useObras deve ser usado dentro de um ERPProvider');
  }
  const core = useContext(ERPCoreContext);
  return {
    obras: context.obras,
    clientes: context.clientes,
    orcamentos: context.orcamentos,
    obraAtual: core.obraAtual,
    escopoObra: core.escopoObra,
    obraIdsEscopo: core.obraIdsEscopo,
    obraAtualData: core.obraAtualData,
    setObraAtual: core.setObraAtual,
    updateObra: context.updateObra,
    addObra: context.addObra,
    updateProgressoObra: context.updateProgressoObra,
    aprovarOrcamento: context.aprovarOrcamento,
    addOrcamento: context.addOrcamento
  };
}

/**
 * Stock/Inventory Hook
 *
 * @description
 * Manages inventory operations including stock tracking, alerts, and movements.
 * Handles stock consumption, additions, and reservations for projects.
 * Tracks low-stock alerts for critical materials.
 *
 * @throws {Error} Must be used within ERPProvider
 *
 * @returns {Object} Stock management interface
 * @returns {Array} returns.estoque - All stock items with quantities
 * @returns {Array} returns.estoqueObraAtual - Stock allocated to current project
 * @returns {Array} returns.alertasEstoque - Low-stock alerts
 * @returns {Array} returns.movimentacoesEstoque - Stock movement history
 * @returns {Function} returns.adicionarEstoque - Add stock to inventory
 * @returns {Function} returns.consumirEstoque - Remove stock (consumed in production)
 * @returns {Function} returns.reservarEstoque - Reserve stock for a project
 *
 * @example
 * const { estoque, alertasEstoque, consumirEstoque } = useEstoque();
 *
 * // Consume stock when piece is produced
 * await consumirEstoque(itemId, quantityUsed);
 *
 * // Check for alerts
 * if (alertasEstoque.length > 0) {
 *   console.log('Low stock items:', alertasEstoque);
 * }
 */
export function useEstoque() {
  const context = useContext(SupplyContext);
  if (!context) {
    throw new Error('useEstoque deve ser usado dentro de um ERPProvider');
  }
  return {
    estoque: context.estoque,
    estoqueObraAtual: context.estoqueObraAtual,
    alertasEstoque: context.alertasEstoque,
    consumirEstoque: context.consumirEstoque,
    adicionarEstoque: context.adicionarEstoque,
    reservarEstoque: context.reservarEstoque,
    reloadEstoque: context.reloadEstoque,
    movimentacoesEstoque: context.movimentacoesEstoque
  };
}

/**
 * Production Hook
 *
 * @description
 * Manages all production-related data including pieces, machines, and kanban workflow.
 * Handles piece movement through production stages (corte, fabricação, solda, pintura, expedição).
 *
 * @throws {Error} Must be used within ERPProvider
 *
 * @returns {Object} Production management interface
 * @returns {Array} returns.pecas - All production pieces
 * @returns {Array} returns.pecasObraAtual - Pieces for current project only
 * @returns {Array} returns.maquinas - Available machines and their status
 * @returns {Function} returns.addPecas - Create new pieces
 * @returns {Function} returns.updatePeca - Update piece details
 * @returns {Function} returns.moverPecaEtapa - Move piece to next stage
 * @returns {Function} returns.updateStatusCorte - Update cutting stage status
 * @returns {Function} returns.updateMaquina - Update machine status
 * @returns {Function} returns.reloadPecas - Reload pieces from database
 *
 * @example
 * const { pecas, pecasObraAtual, moverPecaEtapa } = useProducao();
 *
 * // Move piece through kanban stages
 * const handleMovePiece = async (pieceId, nextStage) => {
 *   await moverPecaEtapa(pieceId, nextStage);
 * };
 *
 * // Get pieces for specific project
 * const currentProjectPieces = pecasObraAtual;
 */
export function useProducao() {
  const context = useContext(ProducaoContext);
  if (!context) {
    throw new Error('useProducao deve ser usado dentro de um ERPProvider');
  }
  return {
    pecas: context.pecas,
    pecasObraAtual: context.pecasObraAtual,
    maquinas: context.maquinas,
    moverPecaEtapa: context.moverPecaEtapa,
    updateStatusCorte: context.updateStatusCorte,
    addPecas: context.addPecas,
    updatePeca: context.updatePeca,
    reloadPecas: context.reloadPecas,
    updateMaquina: context.updateMaquina
  };
}

export function useExpedicao() {
  const context = useContext(OperacoesContext);
  if (!context) {
    throw new Error('useExpedicao deve ser usado dentro de um ERPProvider');
  }
  return {
    expedicoes: context.expedicoes,
    expedicoesObraAtual: context.expedicoesObraAtual,
    addExpedicao: context.addExpedicao,
    updateExpedicao: context.updateExpedicao,
    deleteExpedicao: context.deleteExpedicao
  };
}

export function useMedicoes() {
  const context = useContext(OperacoesContext);
  if (!context) {
    throw new Error('useMedicoes deve ser usado dentro de um ERPProvider');
  }
  return {
    medicoes: context.medicoes,
    medicoesObraAtual: context.medicoesObraAtual,
    configMedicao: context.configMedicao,
    addMedicao: context.addMedicao,
    updateMedicao: context.updateMedicao,
    deleteMedicao: context.deleteMedicao,
    updateConfigMedicao: context.updateConfigMedicao
  };
}

export function useLancamentos() {
  const context = useContext(OperacoesContext);
  if (!context) {
    throw new Error('useLancamentos deve ser usado dentro de um ERPProvider');
  }
  return {
    lancamentosDespesas: context.lancamentosDespesas,
    addLancamento: context.addLancamento,
    updateLancamento: context.updateLancamento,
    deleteLancamento: context.deleteLancamento
  };
}

export function useEquipes() {
  const context = useContext(OperacoesContext);
  if (!context) {
    throw new Error('useEquipes deve ser usado dentro de um ERPProvider');
  }
  return {
    equipes: context.equipes,
    funcionarios: context.funcionarios,
    alocarEquipe: context.alocarEquipe,
    addFuncionario: context.addFuncionario,
    updateFuncionario: context.updateFuncionario,
    deleteFuncionario: context.deleteFuncionario,
    addEquipe: context.addEquipe,
    updateEquipe: context.updateEquipe,
    deleteEquipe: context.deleteEquipe,
  };
}

export function useCompras() {
  const context = useContext(SupplyContext);
  if (!context) {
    throw new Error('useCompras deve ser usado dentro de um ERPProvider');
  }
  return {
    compras: context.compras,
    comprasObraAtual: context.comprasObraAtual,
    addCompra: context.addCompra,
    updateCompra: context.updateCompra,
    receberCompra: context.receberCompra
  };
}

export function useOrcamentos() {
  const context = useContext(ObrasContext);
  if (!context) {
    throw new Error('useOrcamentos deve ser usado dentro de um ERPProvider');
  }
  return {
    orcamentos: context.orcamentos,
    aprovarOrcamento: context.aprovarOrcamento,
    addOrcamento: context.addOrcamento,
    updateOrcamento: context.updateOrcamento,
    deleteOrcamento: context.deleteOrcamento
  };
}

export function useMateriais() {
  const { materiaisEstoque, importarMateriais, registrarEntregaMaterial, updateMaterial, obraAtual } = useERP();

  // Estatísticas calculadas (FOCO EM PESO KG)
  const estatisticasEstoque = React.useMemo(() => {
    const total = materiaisEstoque.length;
    const pendentes = materiaisEstoque.filter(m => m.status === 'pendente').length;
    const parciais = materiaisEstoque.filter(m => m.status === 'parcial').length;
    const completos = materiaisEstoque.filter(m => m.status === 'completo').length;

    // MÉTRICAS PRINCIPAIS EM PESO (KG) — fallback p/ colunas reais do banco
    const pesoPedido = materiaisEstoque.reduce((acc, m) => acc + (m.pesoPedido || m.pesoPrevisto || 0), 0);
    const pesoRecebido = materiaisEstoque.reduce((acc, m) => acc + (m.pesoRecebido || m.pesoEntregue || 0), 0);
    const pesoFalta = materiaisEstoque.reduce((acc, m) => acc + (m.pesoFalta || 0), 0);
    const percentualGeral = pesoPedido > 0 ? Math.round((pesoRecebido / pesoPedido) * 100) : 0;

    return {
      total,
      pendentes,
      parciais,
      completos,
      pesoPedido,
      pesoRecebido,
      pesoFalta,
      percentualGeral
    };
  }, [materiaisEstoque]);

  // Materiais da obra atual
  const materiaisObraAtual = React.useMemo(() => {
    return materiaisEstoque.filter(m => m.obraId === obraAtual);
  }, [materiaisEstoque, obraAtual]);

  return {
    materiaisEstoque,
    materiaisObraAtual,
    estatisticasEstoque,
    importarMateriais,
    registrarEntregaMaterial,
    updateMaterial
  };
}

export default ERPContext;
