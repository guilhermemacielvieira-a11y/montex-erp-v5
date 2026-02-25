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

import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect, useState } from 'react';

// Constantes de negócio (sempre importadas - não são mock data)
import {
  STATUS_OBRA,
  ETAPAS_PRODUCAO,
  STATUS_CORTE,
  STATUS_EXPEDICAO,
  getEstatisticasGerais
} from '../data/database';

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
  transformObraArray,
  calcularProgressoObra,
  STATUS_MAP_SUPABASE
} from './transforms';
import { erpReducer } from './reducers';

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
        console.log('🔌 Conectado ao Supabase — carregando 17 tabelas em paralelo...');

        // Carregar tudo em paralelo
        const [
          clientesData,
          obrasData,
          orcamentosData,
          listasData,
          estoqueData,
          pecasData,
          funcionariosData,
          equipesData,
          comprasData,
          maquinasData,
          medicoesData,
          expData,
          configMedData,
          pedidosMatData,
          lancamentosData,
          notasFiscaisData,
          movEstoqueData
        ] = await Promise.all([
          clientesApi.getAll().catch(() => []),
          obrasApi.getAll().catch(() => []),
          orcamentosApi.getAll().catch(() => []),
          listasApi.getAll().catch(() => []),
          estoqueApi.getAll().catch(() => []),
          pecasApi.getAll('id', true).catch(() => []),
          funcionariosApi.getAll().catch(() => []),
          equipesApi.getAll().catch(() => []),
          comprasApi.getAll().catch(() => []),
          maquinasApi.getAll().catch(() => []),
          medicoesApi.getAll().catch(() => []),
          expedicoesApi.getAll().catch(() => []),
          configMedicaoApi.getAll().catch(() => []),
          pedidosMaterialApi.getAll().catch(() => []),
          lancamentosApi.getAll().catch(() => []),
          notasFiscaisApi.getAll().catch(() => []),
          movEstoqueApi.getAll().catch(() => [])
        ]);

        // Se tem dados no Supabase, usar eles
        if (obrasData.length > 0 || pecasData.length > 0) {
          // Transformar snake_case → camelCase
          const payload = {
            clientes: transformArray(clientesData),
            obras: transformObraArray(obrasData),
            orcamentos: transformArray(orcamentosData),
            listas: transformArray(listasData),
            estoque: transformEstoqueArray(estoqueData),
            pecas: transformPecaArray(pecasData),
            funcionarios: transformArray(funcionariosData),
            equipes: transformArray(equipesData),
            compras: transformArray(comprasData),
            maquinas: transformArray(maquinasData),
            medicoes: transformArray(medicoesData),
            expedicoes: transformArray(expData),
            materiaisEstoque: transformArray(pedidosMatData),
            lancamentosDespesas: transformArray(lancamentosData),
            notasFiscais: transformArray(notasFiscaisData),
            movimentacoesEstoque: transformArray(movEstoqueData)
          };

          // configMedicao é um objeto, não array
          if (configMedData.length > 0) {
            payload.configMedicao = transformRecord(configMedData[0]);
          }

          // Auto-detectar obraAtual da primeira obra no Supabase
          if (obrasData.length > 0) {
            payload.obraAtual = obrasData[0].id;
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
            pedidosMaterial: pedidosMatData.length,
            lancamentos: lancamentosData.length,
            notasFiscais: notasFiscaisData.length,
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

    loadFromSupabase();
  }, []);

  // ===== AÇÕES - OBRAS =====
  const setObraAtual = useCallback((obraId) => {
    dispatch({ type: ACTIONS.SET_OBRA_ATUAL, payload: obraId });
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
        const record = reverseTransformRecord(orcamento);
        await orcamentosApi.create(record);
        console.log(`✅ Orçamento ${orcamento.id} criado no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao criar orçamento no Supabase:', err.message);
      }
    }
  }, [dataSource]);

  // ===== AÇÕES - ESTOQUE =====
  const consumirEstoque = useCallback(async (itemId, quantidade, obraId) => {
    dispatch({ type: ACTIONS.CONSUMIR_ESTOQUE, payload: { itemId, quantidade, obraId } });
    if (dataSource === 'supabase') {
      try {
        const item = state.estoque.find(e => e.id === itemId);
        if (item) {
          await estoqueApi.update(itemId, {
            quantidade: (item.quantidade || 0) - quantidade,
            reservado: Math.max(0, (item.reservado || 0) - quantidade)
          });
          console.log(`✅ Estoque ${itemId} consumido no Supabase`);
        }
      } catch (err) {
        console.error('❌ Erro ao consumir estoque no Supabase:', err.message);
      }
    }
  }, [dataSource, state.estoque]);

  const adicionarEstoque = useCallback(async (itemId, quantidade, compraId) => {
    dispatch({ type: ACTIONS.ADICIONAR_ESTOQUE, payload: { itemId, quantidade, compraId } });
    if (dataSource === 'supabase') {
      try {
        const item = state.estoque.find(e => e.id === itemId);
        if (item) {
          await estoqueApi.update(itemId, {
            quantidade: (item.quantidade || 0) + quantidade
          });
          console.log(`✅ Estoque ${itemId} adicionado no Supabase`);
        }
      } catch (err) {
        console.error('❌ Erro ao adicionar estoque no Supabase:', err.message);
      }
    }
  }, [dataSource, state.estoque]);

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
      }
    }
  }, [dataSource, state.estoque]);

  // ===== AÇÕES - PRODUÇÃO =====
  const moverPecaEtapa = useCallback(async (pecaId, novaEtapa, funcionarioId) => {
    dispatch({ type: ACTIONS.MOVER_PECA_ETAPA, payload: { pecaId, novaEtapa, funcionarioId } });

    // Persistir no Supabase
    if (dataSource === 'supabase') {
      try {
        const updateData = { etapa: novaEtapa };
        const agora = new Date().toISOString();
        // Mapear etapa final para status
        if (novaEtapa === 'expedido') {
          updateData.status = 'concluido';
          updateData.data_fim_real = agora;
        } else if (novaEtapa !== 'aguardando') {
          updateData.status = 'em_producao';
          // Registrar data de início na primeira vez que entra em produção
          const pecaAtual = state.pecas.find(p => p.id === pecaId);
          if (pecaAtual && !pecaAtual.dataInicio) {
            updateData.data_inicio = agora;
          }
        }
        if (funcionarioId) {
          updateData.responsavel = funcionarioId;
          // Salvar funcionário específico da etapa
          const funcField = `funcionario_${novaEtapa}`;
          updateData[funcField] = funcionarioId;
        }
        // Salvar timestamp de início da etapa
        const dataInicioField = `data_inicio_${novaEtapa}`;
        updateData[dataInicioField] = agora;

        await pecasApi.update(pecaId, updateData);
        console.log(`✅ Peça ${pecaId} → ${novaEtapa} (func: ${funcionarioId || 'N/A'}) salva no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao salvar etapa no Supabase:', err.message);
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
          updateData.funcionario_corte = funcionarioId;
        }
        if (novoStatus === 'em_corte' || novoStatus === 'cortando') {
          updateData.data_inicio = new Date().toISOString();
        }
        await pecasApi.update(pecaId, updateData);
        console.log(`✅ Status corte ${pecaId} → ${novoStatus} (func: ${funcionarioId || 'N/A'}) salvo no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao salvar status corte no Supabase:', err.message);
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

  // ===== AÇÕES - EXPEDIÇÃO =====
  const addExpedicao = useCallback(async (expedicao) => {
    dispatch({ type: ACTIONS.ADD_EXPEDICAO, payload: expedicao });

    // Atualiza etapa das peças para EXPEDIDO
    expedicao.pecas.forEach(pecaId => {
      dispatch({
        type: ACTIONS.UPDATE_PECA,
        payload: { id: pecaId, data: { etapa: ETAPAS_PRODUCAO.EXPEDIDO } }
      });
    });

    // Persistir no Supabase
    if (dataSource === 'supabase') {
      try {
        const record = reverseTransformRecord(expedicao);
        await expedicoesApi.create(record);
        // Atualizar etapa das peças no Supabase
        for (const pecaId of (expedicao.pecas || [])) {
          await pecasApi.update(pecaId, { etapa: 'expedido', status: 'concluido' }).catch(() => {});
        }
        console.log(`✅ Expedição ${expedicao.id} criada no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao criar expedição no Supabase:', err.message);
      }
    }

    // Add notification for shipment
    if (window.__notificationDispatch) {
      const numPecas = expedicao.pecas?.length || 0;
      window.__notificationDispatch({
        type: 'shipping',
        title: `Romaneio #${expedicao.id} expedido`,
        message: `${numPecas} peça${numPecas !== 1 ? 's' : ''} foram despachadas para ${expedicao.obraId || 'obra'}. Prazo: 2-3 dias úteis.`,
        icon: 'Truck'
      });
    }
  }, [dataSource]);

  const updateExpedicao = useCallback(async (id, data) => {
    dispatch({ type: ACTIONS.UPDATE_EXPEDICAO, payload: { id, data } });
    if (dataSource === 'supabase') {
      try {
        const snakeData = reverseTransformRecord(data);
        delete snakeData.id;
        await expedicoesApi.update(id, snakeData);
        console.log(`✅ Expedição ${id} atualizada no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao atualizar expedição no Supabase:', err.message);
      }
    }
  }, [dataSource]);

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
  }, [dataSource]);

  // ===== AÇÕES - MEDIÇÕES =====
  const addMedicao = useCallback(async (medicao) => {
    dispatch({ type: ACTIONS.ADD_MEDICAO, payload: medicao });
    if (dataSource === 'supabase') {
      try {
        const record = reverseTransformRecord(medicao);
        await medicoesApi.create(record);
        console.log(`✅ Medição ${medicao.id} criada no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao criar medição no Supabase:', err.message);
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

    // Persistir no Supabase
    if (dataSource === 'supabase') {
      try {
        const records = materiais.map(m => reverseTransformRecord(m));
        for (const rec of records) {
          await pedidosMaterialApi.create(rec);
        }
        console.log(`✅ ${materiais.length} materiais salvos no Supabase`);
      } catch (err) {
        console.error('❌ Erro ao salvar materiais no Supabase:', err.message);
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
  const obraAtualData = useMemo(() => {
    if (!state.obraAtual) return state.obras[0] || null;
    return state.obras.find(o => o.id === state.obraAtual) || state.obras[0] || null;
  }, [state.obras, state.obraAtual]);

  // Se obraAtual for null, usar a primeira obra disponível para filtros
  const obraIdAtiva = state.obraAtual || (state.obras[0]?.id) || null;

  const pecasObraAtual = useMemo(() => {
    if (!obraIdAtiva) return state.pecas; // Sem obra selecionada → mostrar todas
    return state.pecas.filter(p => p.obraId === obraIdAtiva);
  }, [state.pecas, obraIdAtiva]);

  const estoqueObraAtual = useMemo(() => {
    if (!obraIdAtiva) return state.estoque;
    return state.estoque.filter(e => e.obraReservada === obraIdAtiva || !e.obraReservada);
  }, [state.estoque, obraIdAtiva]);

  const expedicoesObraAtual = useMemo(() => {
    if (!obraIdAtiva) return state.expedicoes;
    return state.expedicoes.filter(e => e.obraId === obraIdAtiva);
  }, [state.expedicoes, obraIdAtiva]);

  const comprasObraAtual = useMemo(() => {
    if (!obraIdAtiva) return state.compras;
    return state.compras.filter(c => c.obraId === obraIdAtiva);
  }, [state.compras, obraIdAtiva]);

  const medicoesObraAtual = useMemo(() => {
    if (!obraIdAtiva) return state.medicoes;
    return state.medicoes.filter(m => m.obraId === obraIdAtiva);
  }, [state.medicoes, obraIdAtiva]);

  const estatisticasGerais = useMemo(() => {
    return getEstatisticasGerais();
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
    obraAtual: state.obraAtual,
    obraAtualData,
    setObraAtual,
    filtros: state.filtros,
    setFiltros,
    notificacoes: state.notificacoes,
    addNotificacao,
    removeNotificacao
  }), [
    supabaseConnected,
    dataSource,
    connectionError,
    state.loading,
    state.obraAtual,
    obraAtualData,
    setObraAtual,
    state.filtros,
    setFiltros,
    state.notificacoes,
    addNotificacao,
    removeNotificacao
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
    addOrcamento
  }), [
    state.obras,
    state.clientes,
    state.orcamentos,
    addObra,
    updateObra,
    updateProgressoObra,
    aprovarOrcamento,
    addOrcamento
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
    compras: state.compras,
    comprasObraAtual,
    addCompra,
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
    state.compras,
    comprasObraAtual,
    addCompra,
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
    updateExpedicao,
    medicoes: state.medicoes,
    medicoesObraAtual,
    configMedicao: state.configMedicao,
    addMedicao,
    updateConfigMedicao,
    lancamentosDespesas: state.lancamentosDespesas,
    addLancamento,
    updateLancamento,
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
    updateExpedicao,
    state.medicoes,
    medicoesObraAtual,
    state.configMedicao,
    addMedicao,
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
    updateExpedicao,

    // Ações - Compras
    addCompra,
    receberCompra,

    // Ações - Medições
    addMedicao,
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
    updateExpedicao,
    addCompra,
    receberCompra,
    addMedicao,
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

// ===== HOOKS ESPECÍFICOS (Domain-based) =====
// Each hook now reads from its specific domain context for better performance

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
    obraAtualData: core.obraAtualData,
    setObraAtual: core.setObraAtual,
    updateObra: context.updateObra,
    addObra: context.addObra,
    updateProgressoObra: context.updateProgressoObra,
    aprovarOrcamento: context.aprovarOrcamento,
    addOrcamento: context.addOrcamento
  };
}

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
    movimentacoesEstoque: context.movimentacoesEstoque
  };
}

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
    updateExpedicao: context.updateExpedicao
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
    updateLancamento: context.updateLancamento
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
    addOrcamento: context.addOrcamento
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

    // MÉTRICAS PRINCIPAIS EM PESO (KG)
    const pesoPedido = materiaisEstoque.reduce((acc, m) => acc + (m.pesoPedido || 0), 0);
    const pesoRecebido = materiaisEstoque.reduce((acc, m) => acc + (m.pesoRecebido || 0), 0);
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
