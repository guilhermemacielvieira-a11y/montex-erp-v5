/**
 * MONTEX ERP Premium - Context Global
 *
 * Gerencia todo o estado da aplicação com interligação entre módulos
 * Carrega dados do Supabase quando disponível, fallback para mock data
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect, useState } from 'react';
import {
  clientes as clientesIniciais,
  obras as obrasIniciais,
  orcamentos as orcamentosIniciais,
  listasMaterial as listasIniciais,
  estoque as estoqueInicial,
  pecasProducao as pecasIniciais,
  expedicoes as expedicoesIniciais,
  funcionarios as funcionariosIniciais,
  equipes as equipesIniciais,
  medicoes as medicoesIniciais,
  compras as comprasIniciais,
  configMedicao as configMedicaoInicial,
  maquinas as maquinasIniciais,
  STATUS_OBRA,
  ETAPAS_PRODUCAO,
  STATUS_CORTE,
  STATUS_EXPEDICAO,
  getEstatisticasGerais
} from '../data/database';

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
// TRANSFORMADOR: snake_case → camelCase
// ========================================
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function transformRecord(record) {
  if (!record || typeof record !== 'object') return record;
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    result[snakeToCamel(key)] = value;
  }
  return result;
}

function transformArray(records) {
  return (records || []).map(transformRecord);
}

// Transformar peças com aliases (peso_total → peso para compatibilidade com mock)
function transformPecaRecord(record) {
  const base = transformRecord(record);
  if (base) {
    // Aliases para compatibilidade com código que usa nomes do mock
    if (base.pesoTotal !== undefined && base.peso === undefined) {
      base.peso = base.pesoTotal;
    }
    if (base.pesoUnitario !== undefined && base.pesoUnit === undefined) {
      base.pesoUnit = base.pesoUnitario;
    }
  }
  return base;
}

function transformPecaArray(records) {
  return (records || []).map(transformPecaRecord);
}

// ========================================
// TRANSFORMADOR: camelCase → snake_case
// ========================================
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Mapeamento especial de campos do código → colunas reais do Supabase
const PECAS_FIELD_MAP = {
  peso: 'peso_total',
  pesoUnit: 'peso_unitario',
  pesoTotal: 'peso_total',
  pesoUnitario: 'peso_unitario',
  obraId: 'obra_id',
  obraNome: 'obra_nome',
  statusCorte: 'status_corte',
  percentualConclusao: 'percentual_conclusao',
  quantidadeProduzida: 'quantidade_produzida',
  equipeId: 'equipe_id',
  dataInicio: 'data_inicio',
  dataFimPrevista: 'data_fim_prevista',
  dataFimReal: 'data_fim_real',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Colunas válidas na tabela pecas_producao
const PECAS_VALID_COLUMNS = new Set([
  'id', 'nome', 'obra_id', 'obra_nome', 'marca', 'tipo', 'perfil',
  'comprimento', 'quantidade', 'material', 'peso_total', 'peso_unitario',
  'etapa', 'status_corte', 'status', 'percentual_conclusao',
  'quantidade_produzida', 'responsavel', 'equipe_id', 'codigo',
  'data_inicio', 'data_fim_prevista', 'data_fim_real', 'observacoes'
]);

function pecaToSupabase(record) {
  if (!record || typeof record !== 'object') return record;
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith('_')) continue;
    // Usar mapeamento especial ou fallback para camelToSnake genérico
    const snakeKey = PECAS_FIELD_MAP[key] || camelToSnake(key);
    // Só incluir colunas que existem na tabela
    if (PECAS_VALID_COLUMNS.has(snakeKey)) {
      result[snakeKey] = value;
    }
  }
  return result;
}

function reverseTransformRecord(record) {
  if (!record || typeof record !== 'object') return record;
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith('_')) continue;
    result[camelToSnake(key)] = value;
  }
  return result;
}

// ========================================
// TIPOS DE AÇÕES
// ========================================

const ACTIONS = {
  // Obras
  SET_OBRA_ATUAL: 'SET_OBRA_ATUAL',
  UPDATE_OBRA: 'UPDATE_OBRA',
  ADD_OBRA: 'ADD_OBRA',
  UPDATE_PROGRESSO_OBRA: 'UPDATE_PROGRESSO_OBRA',

  // Orçamentos
  UPDATE_ORCAMENTO: 'UPDATE_ORCAMENTO',
  ADD_ORCAMENTO: 'ADD_ORCAMENTO',
  APROVAR_ORCAMENTO: 'APROVAR_ORCAMENTO',

  // Estoque
  UPDATE_ESTOQUE: 'UPDATE_ESTOQUE',
  CONSUMIR_ESTOQUE: 'CONSUMIR_ESTOQUE',
  ADICIONAR_ESTOQUE: 'ADICIONAR_ESTOQUE',
  RESERVAR_ESTOQUE: 'RESERVAR_ESTOQUE',

  // Peças/Produção
  UPDATE_PECA: 'UPDATE_PECA',
  MOVER_PECA_ETAPA: 'MOVER_PECA_ETAPA',
  UPDATE_STATUS_CORTE: 'UPDATE_STATUS_CORTE',
  ADD_PECAS: 'ADD_PECAS',

  // Expedição
  ADD_EXPEDICAO: 'ADD_EXPEDICAO',
  UPDATE_EXPEDICAO: 'UPDATE_EXPEDICAO',

  // Compras
  ADD_COMPRA: 'ADD_COMPRA',
  UPDATE_COMPRA: 'UPDATE_COMPRA',
  RECEBER_COMPRA: 'RECEBER_COMPRA',

  // Medições
  ADD_MEDICAO: 'ADD_MEDICAO',
  UPDATE_CONFIG_MEDICAO: 'UPDATE_CONFIG_MEDICAO',

  // Funcionários e Equipes
  UPDATE_FUNCIONARIO: 'UPDATE_FUNCIONARIO',
  UPDATE_EQUIPE: 'UPDATE_EQUIPE',
  ALOCAR_EQUIPE: 'ALOCAR_EQUIPE',

  // Máquinas
  UPDATE_MAQUINA: 'UPDATE_MAQUINA',

  // Listas
  IMPORTAR_LISTA: 'IMPORTAR_LISTA',

  // Materiais (Controle de Estoque em Peso KG)
  IMPORTAR_MATERIAIS: 'IMPORTAR_MATERIAIS',
  REGISTRAR_ENTREGA_MATERIAL: 'REGISTRAR_ENTREGA_MATERIAL',
  UPDATE_MATERIAL: 'UPDATE_MATERIAL',

  // Inicialização Supabase
  INIT_FROM_SUPABASE: 'INIT_FROM_SUPABASE',

  // UI
  SET_FILTROS: 'SET_FILTROS',
  SET_LOADING: 'SET_LOADING',
  ADD_NOTIFICACAO: 'ADD_NOTIFICACAO',
  REMOVE_NOTIFICACAO: 'REMOVE_NOTIFICACAO'
};

// ========================================
// ESTADO INICIAL
// ========================================

const initialState = {
  // Dados principais
  clientes: clientesIniciais,
  obras: obrasIniciais,
  orcamentos: orcamentosIniciais,
  listas: listasIniciais,
  estoque: estoqueInicial,
  pecas: pecasIniciais,
  expedicoes: expedicoesIniciais,
  funcionarios: funcionariosIniciais,
  equipes: equipesIniciais,
  medicoes: medicoesIniciais,
  compras: comprasIniciais,
  configMedicao: configMedicaoInicial,
  maquinas: maquinasIniciais,

  // Materiais importados (controle de estoque em peso KG)
  materiaisEstoque: [],

  // Dados financeiros e NFs
  lancamentosDespesas: [],
  notasFiscais: [],
  movimentacoesEstoque: [],

  // Estado da UI
  obraAtual: null, // Será auto-detectado ao carregar do Supabase
  filtros: {
    obra: 'todas',
    periodo: 'mes_atual',
    setor: 'todos'
  },
  loading: false,
  notificacoes: []
};

// ========================================
// REDUCER
// ========================================

function erpReducer(state, action) {
  switch (action.type) {
    // ===== OBRA ATUAL =====
    case ACTIONS.SET_OBRA_ATUAL:
      return { ...state, obraAtual: action.payload };

    case ACTIONS.UPDATE_OBRA:
      return {
        ...state,
        obras: state.obras.map(o =>
          o.id === action.payload.id ? { ...o, ...action.payload.data } : o
        )
      };

    case ACTIONS.ADD_OBRA:
      return {
        ...state,
        obras: [...state.obras, action.payload]
      };

    case ACTIONS.UPDATE_PROGRESSO_OBRA:
      return {
        ...state,
        obras: state.obras.map(o =>
          o.id === action.payload.obraId
            ? { ...o, progresso: { ...o.progresso, ...action.payload.progresso } }
            : o
        )
      };

    // ===== ORÇAMENTOS =====
    case ACTIONS.UPDATE_ORCAMENTO:
      return {
        ...state,
        orcamentos: state.orcamentos.map(o =>
          o.id === action.payload.id ? { ...o, ...action.payload.data } : o
        )
      };

    case ACTIONS.ADD_ORCAMENTO:
      return {
        ...state,
        orcamentos: [...state.orcamentos, action.payload]
      };

    case ACTIONS.APROVAR_ORCAMENTO: {
      const { orcamentoId, obraId } = action.payload;
      return {
        ...state,
        orcamentos: state.orcamentos.map(o =>
          o.id === orcamentoId
            ? { ...o, status: 'aprovado', dataAprovacao: new Date().toISOString().split('T')[0] }
            : o
        ),
        obras: state.obras.map(o =>
          o.id === obraId ? { ...o, status: STATUS_OBRA.APROVADA } : o
        )
      };
    }

    // ===== ESTOQUE =====
    case ACTIONS.UPDATE_ESTOQUE:
      return {
        ...state,
        estoque: state.estoque.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload.data } : e
        )
      };

    case ACTIONS.CONSUMIR_ESTOQUE: {
      const { itemId, quantidade, obraId } = action.payload;
      return {
        ...state,
        estoque: state.estoque.map(e =>
          e.id === itemId
            ? {
                ...e,
                quantidade: e.quantidade - quantidade,
                reservado: Math.max(0, (e.reservado || 0) - quantidade)
              }
            : e
        )
      };
    }

    case ACTIONS.ADICIONAR_ESTOQUE: {
      const { itemId, quantidade, compraId } = action.payload;
      return {
        ...state,
        estoque: state.estoque.map(e =>
          e.id === itemId ? { ...e, quantidade: e.quantidade + quantidade } : e
        )
      };
    }

    case ACTIONS.RESERVAR_ESTOQUE: {
      const { itemId, quantidade, obraId } = action.payload;
      return {
        ...state,
        estoque: state.estoque.map(e =>
          e.id === itemId
            ? { ...e, reservado: (e.reservado || 0) + quantidade, obraReservada: obraId }
            : e
        )
      };
    }

    // ===== PEÇAS/PRODUÇÃO =====
    case ACTIONS.UPDATE_PECA:
      return {
        ...state,
        pecas: state.pecas.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload.data } : p
        )
      };

    case ACTIONS.MOVER_PECA_ETAPA: {
      const { pecaId, novaEtapa, funcionarioId } = action.payload;
      const now = new Date().toISOString();

      return {
        ...state,
        pecas: state.pecas.map(p =>
          p.id === pecaId
            ? {
                ...p,
                etapa: novaEtapa,
                [`data${novaEtapa.charAt(0).toUpperCase() + novaEtapa.slice(1)}`]: now,
                [`funcionario${novaEtapa.charAt(0).toUpperCase() + novaEtapa.slice(1)}`]: funcionarioId
              }
            : p
        )
      };
    }

    case ACTIONS.UPDATE_STATUS_CORTE: {
      const { pecaId, novoStatus, maquinaId, funcionarioId } = action.payload;
      return {
        ...state,
        pecas: state.pecas.map(p =>
          p.id === pecaId
            ? {
                ...p,
                statusCorte: novoStatus,
                maquinaCorte: maquinaId || p.maquinaCorte,
                funcionarioCorte: funcionarioId || p.funcionarioCorte,
                dataCorte: novoStatus === STATUS_CORTE.LIBERADO ? new Date().toISOString().split('T')[0] : p.dataCorte
              }
            : p
        )
      };
    }

    case ACTIONS.ADD_PECAS:
      return {
        ...state,
        pecas: [...state.pecas, ...action.payload]
      };

    case 'RELOAD_PECAS':
      return {
        ...state,
        pecas: action.payload
      };

    // ===== EXPEDIÇÃO =====
    case ACTIONS.ADD_EXPEDICAO:
      return {
        ...state,
        expedicoes: [...state.expedicoes, action.payload]
      };

    case ACTIONS.UPDATE_EXPEDICAO:
      return {
        ...state,
        expedicoes: state.expedicoes.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload.data } : e
        )
      };

    // ===== COMPRAS =====
    case ACTIONS.ADD_COMPRA:
      return {
        ...state,
        compras: [...state.compras, action.payload]
      };

    case ACTIONS.UPDATE_COMPRA:
      return {
        ...state,
        compras: state.compras.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload.data } : c
        )
      };

    case ACTIONS.RECEBER_COMPRA: {
      const { compraId, itensRecebidos } = action.payload;
      let novoEstoque = [...state.estoque];

      // Atualiza estoque com itens recebidos
      itensRecebidos.forEach(item => {
        const idx = novoEstoque.findIndex(e => e.codigo === item.material);
        if (idx >= 0) {
          novoEstoque[idx] = {
            ...novoEstoque[idx],
            quantidade: novoEstoque[idx].quantidade + item.quantidade
          };
        }
      });

      return {
        ...state,
        compras: state.compras.map(c =>
          c.id === compraId
            ? { ...c, status: 'entregue', dataEntrega: new Date().toISOString().split('T')[0] }
            : c
        ),
        estoque: novoEstoque
      };
    }

    // ===== MEDIÇÕES =====
    case ACTIONS.ADD_MEDICAO:
      return {
        ...state,
        medicoes: [...state.medicoes, action.payload]
      };

    case ACTIONS.UPDATE_CONFIG_MEDICAO:
      return {
        ...state,
        configMedicao: {
          ...state.configMedicao,
          [action.payload.tipo]: {
            ...state.configMedicao[action.payload.tipo],
            [action.payload.etapa]: action.payload.config
          }
        }
      };

    // ===== FUNCIONÁRIOS E EQUIPES =====
    case ACTIONS.UPDATE_FUNCIONARIO:
      return {
        ...state,
        funcionarios: state.funcionarios.map(f =>
          f.id === action.payload.id ? { ...f, ...action.payload.data } : f
        )
      };

    case ACTIONS.UPDATE_EQUIPE:
      return {
        ...state,
        equipes: state.equipes.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload.data } : e
        )
      };

    case ACTIONS.ALOCAR_EQUIPE: {
      const { equipeId, obraId } = action.payload;
      return {
        ...state,
        equipes: state.equipes.map(e =>
          e.id === equipeId ? { ...e, obraAtual: obraId } : e
        )
      };
    }

    // ===== MÁQUINAS =====
    case ACTIONS.UPDATE_MAQUINA:
      return {
        ...state,
        maquinas: state.maquinas.map(m =>
          m.id === action.payload.id ? { ...m, ...action.payload.data } : m
        )
      };

    // ===== LISTAS =====
    case ACTIONS.IMPORTAR_LISTA:
      return {
        ...state,
        listas: [...state.listas, action.payload]
      };

    // ===== MATERIAIS (Controle de Estoque em Peso KG) =====
    case ACTIONS.IMPORTAR_MATERIAIS:
      return {
        ...state,
        materiaisEstoque: [...state.materiaisEstoque, ...action.payload]
      };

    case ACTIONS.REGISTRAR_ENTREGA_MATERIAL: {
      const { materialId, entrega } = action.payload;
      return {
        ...state,
        materiaisEstoque: state.materiaisEstoque.map(mat => {
          if (mat.id === materialId) {
            const novoPesoRecebido = mat.pesoRecebido + entrega.pesoKg;
            const novoPesoFalta = Math.max(0, mat.pesoPedido - novoPesoRecebido);
            const novoPercentual = Math.min(100, Math.round((novoPesoRecebido / mat.pesoPedido) * 100));
            const novoStatus = novoPesoRecebido >= mat.pesoPedido
              ? 'completo'
              : novoPesoRecebido > 0
                ? 'parcial'
                : 'pendente';

            return {
              ...mat,
              pesoRecebido: novoPesoRecebido,
              pesoFalta: novoPesoFalta,
              percentualRecebido: novoPercentual,
              status: novoStatus,
              entregas: [...mat.entregas, {
                id: `ENT-${Date.now()}`,
                ...entrega,
                registradoEm: new Date().toISOString()
              }]
            };
          }
          return mat;
        })
      };
    }

    case ACTIONS.UPDATE_MATERIAL:
      return {
        ...state,
        materiaisEstoque: state.materiaisEstoque.map(m =>
          m.id === action.payload.id ? { ...m, ...action.payload.data } : m
        )
      };

    // ===== UI =====
    case ACTIONS.SET_FILTROS:
      return {
        ...state,
        filtros: { ...state.filtros, ...action.payload }
      };

    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case ACTIONS.ADD_NOTIFICACAO:
      return {
        ...state,
        notificacoes: [...state.notificacoes, { id: Date.now(), ...action.payload }]
      };

    case ACTIONS.REMOVE_NOTIFICACAO:
      return {
        ...state,
        notificacoes: state.notificacoes.filter(n => n.id !== action.payload)
      };

    // ===== INICIALIZAÇÃO DO SUPABASE =====
    case ACTIONS.INIT_FROM_SUPABASE:
      return {
        ...state,
        ...action.payload,
        loading: false
      };

    default:
      return state;
  }
}

// ========================================
// CONTEXTO
// ========================================

const ERPContext = createContext(null);

export function ERPProvider({ children }) {
  const [state, dispatch] = useReducer(erpReducer, initialState);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [dataSource, setDataSource] = useState('mock'); // 'mock' | 'supabase'

  // ===== CARREGAR DADOS DO SUPABASE =====
  useEffect(() => {
    async function loadFromSupabase() {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        console.log('📦 Supabase não configurado — usando dados mock');
        return;
      }

      dispatch({ type: ACTIONS.SET_LOADING, payload: true });

      try {
        const conn = await checkConnection();
        if (!conn.connected) {
          console.warn('⚠️ Supabase indisponível — usando dados mock');
          dispatch({ type: ACTIONS.SET_LOADING, payload: false });
          return;
        }

        setSupabaseConnected(true);
        console.log('🔌 Conectado ao Supabase — carregando dados...');

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
            obras: transformArray(obrasData),
            orcamentos: transformArray(orcamentosData),
            listas: transformArray(listasData),
            estoque: transformArray(estoqueData),
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
          console.log('📦 Supabase vazio — usando dados mock');
          dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        }
      } catch (err) {
        console.error('❌ Erro ao carregar do Supabase:', err.message);
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
        // Mapear etapa final para status
        if (novaEtapa === 'expedido') {
          updateData.status = 'concluido';
        } else if (novaEtapa !== 'aguardando') {
          updateData.status = 'em_producao';
        }
        await pecasApi.update(pecaId, updateData);
        console.log(`✅ Peça ${pecaId} → ${novaEtapa} salva no Supabase`);
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

    // Persistir no Supabase (apenas colunas válidas)
    if (dataSource === 'supabase') {
      try {
        const updateData = { status_corte: novoStatus };
        await pecasApi.update(pecaId, updateData);
        console.log(`✅ Status corte ${pecaId} → ${novoStatus} salvo no Supabase`);
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

  const updateConfigMedicao = useCallback((tipo, etapa, config) => {
    dispatch({ type: ACTIONS.UPDATE_CONFIG_MEDICAO, payload: { tipo, etapa, config } });
  }, []);

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
  const importarLista = useCallback((lista) => {
    dispatch({ type: ACTIONS.IMPORTAR_LISTA, payload: lista });
    dispatch({
      type: ACTIONS.ADD_NOTIFICACAO,
      payload: { tipo: 'sucesso', mensagem: `Lista ${lista.tipo} importada com sucesso!` }
    });

    // Add persistent notification
    if (window.__notificationDispatch) {
      window.__notificationDispatch({
        type: 'success',
        title: `Lista ${lista.tipo} importada`,
        message: `${lista.itens?.length || 0} itens foram adicionados ao sistema com sucesso.`,
        icon: 'Package'
      });
    }
  }, []);

  // ===== AÇÕES - MATERIAIS (Controle de Estoque em Peso KG) =====
  const importarMateriais = useCallback((materiais) => {
    dispatch({ type: ACTIONS.IMPORTAR_MATERIAIS, payload: materiais });
    const pesoTotal = materiais.reduce((acc, m) => acc + (m.pesoPedido || 0), 0);
    dispatch({
      type: ACTIONS.ADD_NOTIFICACAO,
      payload: { tipo: 'sucesso', mensagem: `${materiais.length} materiais importados (${pesoTotal.toLocaleString()} kg)` }
    });

    // Add persistent notification
    if (window.__notificationDispatch) {
      window.__notificationDispatch({
        type: 'info',
        title: `${materiais.length} materiais importados`,
        message: `Total de ${pesoTotal.toLocaleString('pt-BR')} kg em materiais foi adicionado ao sistema.`,
        icon: 'Package'
      });
    }
  }, []);

  const registrarEntregaMaterial = useCallback((materialId, entrega) => {
    dispatch({ type: ACTIONS.REGISTRAR_ENTREGA_MATERIAL, payload: { materialId, entrega } });
    dispatch({
      type: ACTIONS.ADD_NOTIFICACAO,
      payload: { tipo: 'sucesso', mensagem: `Entrega de ${entrega.pesoKg.toLocaleString()} kg registrada!` }
    });

    // Add persistent notification
    if (window.__notificationDispatch) {
      window.__notificationDispatch({
        type: 'success',
        title: 'Entrega de material registrada',
        message: `${entrega.pesoKg.toLocaleString('pt-BR')} kg foram recebidos do fornecedor.`,
        icon: 'CheckCircle'
      });
    }
  }, []);

  const updateMaterial = useCallback((id, data) => {
    dispatch({ type: ACTIONS.UPDATE_MATERIAL, payload: { id, data } });
  }, []);

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

  // ===== VALOR DO CONTEXTO =====
  const value = useMemo(() => ({
    // Estado
    ...state,

    // Conexão
    supabaseConnected,
    dataSource,

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

    // Ações - Equipes
    alocarEquipe,

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
    alocarEquipe,
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
    <ERPContext.Provider value={value}>
      {children}
    </ERPContext.Provider>
  );
}

// ===== HOOK CUSTOMIZADO =====
export function useERP() {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP deve ser usado dentro de um ERPProvider');
  }
  return context;
}

// ===== HOOKS ESPECÍFICOS =====
export function useObras() {
  const { obras, obraAtual, obraAtualData, setObraAtual, updateObra, addObra, updateProgressoObra } = useERP();
  return { obras, obraAtual, obraAtualData, setObraAtual, updateObra, addObra, updateProgressoObra };
}

export function useEstoque() {
  const { estoque, estoqueObraAtual, alertasEstoque, consumirEstoque, adicionarEstoque, reservarEstoque } = useERP();
  return { estoque, estoqueObraAtual, alertasEstoque, consumirEstoque, adicionarEstoque, reservarEstoque };
}

export function useProducao() {
  const { pecas, pecasObraAtual, maquinas, moverPecaEtapa, updateStatusCorte, addPecas, updatePeca, reloadPecas, updateMaquina } = useERP();
  return { pecas, pecasObraAtual, maquinas, moverPecaEtapa, updateStatusCorte, addPecas, updatePeca, reloadPecas, updateMaquina };
}

export function useExpedicao() {
  const { expedicoes, expedicoesObraAtual, addExpedicao, updateExpedicao } = useERP();
  return { expedicoes, expedicoesObraAtual, addExpedicao, updateExpedicao };
}

export function useMedicoes() {
  const { medicoes, medicoesObraAtual, configMedicao, addMedicao, updateConfigMedicao } = useERP();
  return { medicoes, medicoesObraAtual, configMedicao, addMedicao, updateConfigMedicao };
}

export function useEquipes() {
  const { equipes, funcionarios, alocarEquipe } = useERP();
  return { equipes, funcionarios, alocarEquipe };
}

export function useCompras() {
  const { compras, comprasObraAtual, addCompra, receberCompra } = useERP();
  return { compras, comprasObraAtual, addCompra, receberCompra };
}

export function useOrcamentos() {
  const { orcamentos, aprovarOrcamento, addOrcamento } = useERP();
  return { orcamentos, aprovarOrcamento, addOrcamento };
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
