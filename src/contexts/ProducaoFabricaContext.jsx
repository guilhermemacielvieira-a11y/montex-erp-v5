/**
 * MONTEX ERP Premium - Contexto de Produção Fábrica
 *
 * Sincroniza dados entre:
 * - Kanban Produção Integrado (fluxo de peças)
 * - Medição Produção (medição por peso/etapa)
 *
 * Fluxo: FABRICAÇÃO → SOLDA → PINTURA → EXPEDIDO
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';

// ========================================
// CONSTANTES E CONFIGURAÇÕES
// ========================================

export const ETAPAS_PRODUCAO = {
  AGUARDANDO: 'aguardando',
  FABRICACAO: 'fabricacao',
  SOLDA: 'solda',
  PINTURA: 'pintura',
  EXPEDIDO: 'expedido'
};

export const VALORES_KG = {
  fabricacao: 2.50,
  solda: 3.00,
  pintura: 1.80,
  expedido: 0
};

// ========================================
// ACTIONS
// ========================================

const ACTIONS = {
  SET_PRODUCAO: 'SET_PRODUCAO',
  ADD_PECAS: 'ADD_PECAS',
  MOVER_PECA: 'MOVER_PECA',
  UPDATE_PECA: 'UPDATE_PECA',
  REMOVE_PECA: 'REMOVE_PECA',
  SET_ORDEM_ATUAL: 'SET_ORDEM_ATUAL',
  ADD_MEDICAO: 'ADD_MEDICAO',
  UPDATE_MEDICAO: 'UPDATE_MEDICAO',
  LIMPAR_PRODUCAO: 'LIMPAR_PRODUCAO'
};

// ========================================
// ESTADO INICIAL
// ========================================

const initialState = {
  // Peças em produção
  pecasProducao: [],

  // Ordem de produção atual
  ordemAtual: null,

  // Medições registradas
  medicoes: [],

  // Histórico de movimentações
  historico: [],

  // Configurações de valores
  valoresKg: VALORES_KG
};

// ========================================
// REDUCER
// ========================================

function producaoReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_PRODUCAO:
      return {
        ...state,
        pecasProducao: action.payload
      };

    case ACTIONS.ADD_PECAS:
      return {
        ...state,
        pecasProducao: [...state.pecasProducao, ...action.payload]
      };

    case ACTIONS.MOVER_PECA: {
      const { pecaId, novaEtapa, dadosAdicionais } = action.payload;
      const agora = new Date().toISOString();

      const pecasAtualizadas = state.pecasProducao.map(p => {
        if (p.id === pecaId) {
          return {
            ...p,
            etapa: novaEtapa,
            [`data${novaEtapa.charAt(0).toUpperCase() + novaEtapa.slice(1)}`]: agora,
            ...dadosAdicionais
          };
        }
        return p;
      });

      // Adicionar ao histórico
      const peca = state.pecasProducao.find(p => p.id === pecaId);
      const novoHistorico = [
        ...state.historico,
        {
          id: `MOV-${Date.now()}`,
          pecaId,
          marca: peca?.marca,
          tipo: peca?.tipo,
          peso: peca?.peso,
          etapaAnterior: peca?.etapa,
          novaEtapa,
          data: agora,
          obraId: peca?.obraId
        }
      ];

      return {
        ...state,
        pecasProducao: pecasAtualizadas,
        historico: novoHistorico
      };
    }

    case ACTIONS.UPDATE_PECA:
      return {
        ...state,
        pecasProducao: state.pecasProducao.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload.dados } : p
        )
      };

    case ACTIONS.REMOVE_PECA:
      return {
        ...state,
        pecasProducao: state.pecasProducao.filter(p => p.id !== action.payload)
      };

    case ACTIONS.SET_ORDEM_ATUAL:
      return {
        ...state,
        ordemAtual: action.payload
      };

    case ACTIONS.ADD_MEDICAO: {
      const novaMedicao = {
        ...action.payload,
        id: `MED-${Date.now()}`,
        dataCriacao: new Date().toISOString(),
        status: 'pendente'
      };
      return {
        ...state,
        medicoes: [...state.medicoes, novaMedicao]
      };
    }

    case ACTIONS.UPDATE_MEDICAO:
      return {
        ...state,
        medicoes: state.medicoes.map(m =>
          m.id === action.payload.id ? { ...m, ...action.payload.dados } : m
        )
      };

    case ACTIONS.LIMPAR_PRODUCAO:
      return {
        ...state,
        pecasProducao: [],
        ordemAtual: null,
        historico: []
      };

    default:
      return state;
  }
}

// ========================================
// CONTEXTO
// ========================================

const ProducaoFabricaContext = createContext(null);

// ========================================
// PROVIDER
// ========================================

export function ProducaoFabricaProvider({ children }) {
  // Carregar estado do localStorage
  const loadInitialState = () => {
    try {
      const saved = localStorage.getItem('montex_producao_fabrica');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...initialState,
          ...parsed
        };
      }
    } catch (e) {
      console.error('Erro ao carregar ProducaoFabricaContext:', e);
    }
    return initialState;
  };

  const [state, dispatch] = useReducer(producaoReducer, null, loadInitialState);

  // Persistir no localStorage
  useEffect(() => {
    try {
      localStorage.setItem('montex_producao_fabrica', JSON.stringify({
        pecasProducao: state.pecasProducao,
        ordemAtual: state.ordemAtual,
        medicoes: state.medicoes,
        historico: state.historico.slice(-500) // Manter últimos 500 registros
      }));
      console.log('💾 ProducaoFabrica salvo:', state.pecasProducao.length, 'peças');
    } catch (e) {
      console.error('Erro ao salvar ProducaoFabricaContext:', e);
    }
  }, [state.pecasProducao, state.ordemAtual, state.medicoes, state.historico]);

  // ========================================
  // AÇÕES
  // ========================================

  // Adicionar peças à produção
  const adicionarPecas = useCallback((pecas) => {
    dispatch({ type: ACTIONS.ADD_PECAS, payload: pecas });
  }, []);

  // Mover peça para próxima etapa
  const moverPeca = useCallback((pecaId, novaEtapa, dadosAdicionais = {}) => {
    dispatch({
      type: ACTIONS.MOVER_PECA,
      payload: { pecaId, novaEtapa, dadosAdicionais }
    });
  }, []);

  // Atualizar dados de uma peça
  const atualizarPeca = useCallback((id, dados) => {
    dispatch({ type: ACTIONS.UPDATE_PECA, payload: { id, dados } });
  }, []);

  // Remover peça
  const removerPeca = useCallback((pecaId) => {
    dispatch({ type: ACTIONS.REMOVE_PECA, payload: pecaId });
  }, []);

  // Definir ordem de produção atual
  const setOrdemAtual = useCallback((ordem) => {
    dispatch({ type: ACTIONS.SET_ORDEM_ATUAL, payload: ordem });
  }, []);

  // Registrar medição
  const registrarMedicao = useCallback((medicao) => {
    dispatch({ type: ACTIONS.ADD_MEDICAO, payload: medicao });
  }, []);

  // Atualizar medição
  const atualizarMedicao = useCallback((id, dados) => {
    dispatch({ type: ACTIONS.UPDATE_MEDICAO, payload: { id, dados } });
  }, []);

  // Limpar produção
  const limparProducao = useCallback(() => {
    dispatch({ type: ACTIONS.LIMPAR_PRODUCAO });
  }, []);

  // Importar peças de lista de conjuntos
  const importarListaConjuntos = useCallback((lista, obraId, obraNome) => {
    if (!lista?.itens) return;

    const pecasConvertidas = lista.itens.map((item, idx) => ({
      id: `PROD-${Date.now()}-${idx}`,
      obraId,
      obraNome,
      marca: item.conjunto,
      conjunto: item.conjunto,
      tipo: item.tipo,
      descricao: item.descricao,
      perfil: item.material,
      quantidade: item.quantidade || 1,
      peso: item.peso || 0,
      material: item.material,
      prioridade: item.prioridade || 'normal',
      etapa: ETAPAS_PRODUCAO.FABRICACAO, // Começa em Fabricação
      planilhaOrigem: lista.arquivo,
      dataImportacao: new Date().toISOString(),
      // Tracking de etapas
      dataFabricacao: null,
      dataSolda: null,
      dataPintura: null,
      dataExpedido: null,
      funcionarioFabricacao: null,
      funcionarioSolda: null,
      funcionarioPintura: null
    }));

    dispatch({ type: ACTIONS.ADD_PECAS, payload: pecasConvertidas });

    // Criar ordem de produção
    const novaOrdem = {
      id: `OP-${Date.now()}`,
      numero: `OP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      obraId,
      obraNome,
      planilha: lista.arquivo,
      totalPecas: pecasConvertidas.length,
      totalQuantidade: pecasConvertidas.reduce((sum, p) => sum + p.quantidade, 0),
      pesoTotal: pecasConvertidas.reduce((sum, p) => sum + p.peso, 0),
      dataGeracao: new Date().toISOString(),
      status: 'em_producao'
    };

    dispatch({ type: ACTIONS.SET_ORDEM_ATUAL, payload: novaOrdem });

    return novaOrdem;
  }, []);

  // ========================================
  // COMPUTED VALUES (KPIs)
  // ========================================

  // KPIs gerais
  const kpis = useMemo(() => {
    const pecas = state.pecasProducao;

    const porEtapa = {
      aguardando: pecas.filter(p => p.etapa === ETAPAS_PRODUCAO.AGUARDANDO),
      fabricacao: pecas.filter(p => p.etapa === ETAPAS_PRODUCAO.FABRICACAO),
      solda: pecas.filter(p => p.etapa === ETAPAS_PRODUCAO.SOLDA),
      pintura: pecas.filter(p => p.etapa === ETAPAS_PRODUCAO.PINTURA),
      expedido: pecas.filter(p => p.etapa === ETAPAS_PRODUCAO.EXPEDIDO)
    };

    const calcPeso = (arr) => arr.reduce((sum, p) => sum + (p.peso || 0), 0);
    const calcQtd = (arr) => arr.reduce((sum, p) => sum + (p.quantidade || 1), 0);

    const pesoTotal = calcPeso(pecas);
    const pesoExpedido = calcPeso(porEtapa.expedido);

    return {
      totalPecas: pecas.length,
      totalQuantidade: calcQtd(pecas),
      pesoTotal,

      // Por etapa
      aguardando: { qtd: porEtapa.aguardando.length, peso: calcPeso(porEtapa.aguardando) },
      fabricacao: { qtd: porEtapa.fabricacao.length, peso: calcPeso(porEtapa.fabricacao) },
      solda: { qtd: porEtapa.solda.length, peso: calcPeso(porEtapa.solda) },
      pintura: { qtd: porEtapa.pintura.length, peso: calcPeso(porEtapa.pintura) },
      expedido: { qtd: porEtapa.expedido.length, peso: calcPeso(porEtapa.expedido) },

      // Progresso
      progressoGeral: pesoTotal > 0 ? Math.round((pesoExpedido / pesoTotal) * 100) : 0,

      // Valores calculados para medição
      valorFabricacao: calcPeso(porEtapa.fabricacao) * state.valoresKg.fabricacao,
      valorSolda: calcPeso(porEtapa.solda) * state.valoresKg.solda,
      valorPintura: calcPeso(porEtapa.pintura) * state.valoresKg.pintura,

      // Total a medir (peças que passaram pela etapa)
      pesoFabricado: calcPeso([...porEtapa.solda, ...porEtapa.pintura, ...porEtapa.expedido]),
      pesoSoldado: calcPeso([...porEtapa.pintura, ...porEtapa.expedido]),
      pesoPintado: calcPeso(porEtapa.expedido),
      pesoExpedido
    };
  }, [state.pecasProducao, state.valoresKg]);

  // Dados para medição (agrupados por obra)
  const dadosMedicao = useMemo(() => {
    const pecas = state.pecasProducao;
    const porObra = {};

    pecas.forEach(p => {
      if (!porObra[p.obraId]) {
        porObra[p.obraId] = {
          obraId: p.obraId,
          obraNome: p.obraNome,
          pecas: [],
          pesoTotal: 0,
          pesoFabricado: 0,
          pesoSoldado: 0,
          pesoPintado: 0,
          pesoExpedido: 0
        };
      }

      porObra[p.obraId].pecas.push(p);
      porObra[p.obraId].pesoTotal += p.peso || 0;

      // Peso por etapa concluída
      if ([ETAPAS_PRODUCAO.SOLDA, ETAPAS_PRODUCAO.PINTURA, ETAPAS_PRODUCAO.EXPEDIDO].includes(p.etapa)) {
        porObra[p.obraId].pesoFabricado += p.peso || 0;
      }
      if ([ETAPAS_PRODUCAO.PINTURA, ETAPAS_PRODUCAO.EXPEDIDO].includes(p.etapa)) {
        porObra[p.obraId].pesoSoldado += p.peso || 0;
      }
      if (p.etapa === ETAPAS_PRODUCAO.EXPEDIDO) {
        porObra[p.obraId].pesoPintado += p.peso || 0;
        porObra[p.obraId].pesoExpedido += p.peso || 0;
      }
    });

    return Object.values(porObra);
  }, [state.pecasProducao]);

  // Histórico de hoje
  const movimentacoesHoje = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    return state.historico.filter(h => h.data.startsWith(hoje));
  }, [state.historico]);

  // ========================================
  // VALOR DO CONTEXTO
  // ========================================

  const value = {
    // Estado
    pecasProducao: state.pecasProducao,
    ordemAtual: state.ordemAtual,
    medicoes: state.medicoes,
    historico: state.historico,
    valoresKg: state.valoresKg,

    // Ações
    adicionarPecas,
    moverPeca,
    atualizarPeca,
    removerPeca,
    setOrdemAtual,
    registrarMedicao,
    atualizarMedicao,
    limparProducao,
    importarListaConjuntos,

    // KPIs
    kpis,
    dadosMedicao,
    movimentacoesHoje,

    // Constantes
    ETAPAS_PRODUCAO,
    VALORES_KG: state.valoresKg
  };

  return (
    <ProducaoFabricaContext.Provider value={value}>
      {children}
    </ProducaoFabricaContext.Provider>
  );
}

// ========================================
// HOOK
// ========================================

export function useProducaoFabrica() {
  const context = useContext(ProducaoFabricaContext);
  if (!context) {
    throw new Error('useProducaoFabrica deve ser usado dentro de ProducaoFabricaProvider');
  }
  return context;
}

export default ProducaoFabricaContext;
