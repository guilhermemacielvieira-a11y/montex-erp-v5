/**
 * MONTEX ERP Premium - DataProvider
 *
 * Carrega todos os dados do Supabase e disponibiliza via Context
 * com a mesma interface que o antigo database.js (campos camelCase)
 *
 * Uso: const { obras, pecasProducao, estoque, ... } = useData();
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  supabase,
  obrasApi,
  clientesApi,
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
  checkConnection
} from '@/api/supabaseClient';

// ============================================
// TRANSFORMADORES: snake_case → camelCase
// ============================================

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function transformRecord(record) {
  if (!record) return record;
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    result[snakeToCamel(key)] = value;
  }
  return result;
}

function transformArray(records) {
  return (records || []).map(transformRecord);
}

// ============================================
// CONTEXT
// ============================================

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  // Todos os dados
  const [clientes, setClientes] = useState([]);
  const [obras, setObras] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [listasMaterial, setListasMaterial] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [pecasProducao, setPecasProducao] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [compras, setCompras] = useState([]);
  const [notasFiscais, setNotasFiscais] = useState([]);
  const [movimentacoesEstoque, setMovimentacoesEstoque] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [medicoes, setMedicoes] = useState([]);
  const [lancamentosDespesas, setLancamentosDespesas] = useState([]);
  const [pedidosMaterial, setPedidosMaterial] = useState([]);
  const [expedicoes, setExpedicoes] = useState([]);

  // Carregar todos os dados do Supabase
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const conn = await checkConnection();
      if (!conn.connected) {
        setConnected(false);
        setError('Sem conexão com o banco de dados');
        setLoading(false);
        return;
      }

      setConnected(true);

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
        nfsData,
        movData,
        maquinasData,
        medicoesData,
        lancData,
        pedMatData,
        expData
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
        notasFiscaisApi.getAll().catch(() => []),
        movEstoqueApi.getAll().catch(() => []),
        maquinasApi.getAll().catch(() => []),
        medicoesApi.getAll().catch(() => []),
        lancamentosApi.getAll().catch(() => []),
        pedidosMaterialApi.getAll().catch(() => []),
        expedicoesApi.getAll().catch(() => [])
      ]);

      // Transformar e setar (snake_case → camelCase)
      setClientes(transformArray(clientesData));
      setObras(transformArray(obrasData));
      setOrcamentos(transformArray(orcamentosData));
      setListasMaterial(transformArray(listasData));
      setEstoque(transformArray(estoqueData));
      setPecasProducao(transformArray(pecasData));
      setFuncionarios(transformArray(funcionariosData));
      setEquipes(transformArray(equipesData));
      setCompras(transformArray(comprasData));
      setNotasFiscais(transformArray(nfsData));
      setMovimentacoesEstoque(transformArray(movData));
      setMaquinas(transformArray(maquinasData));
      setMedicoes(transformArray(medicoesData));
      setLancamentosDespesas(transformArray(lancData));
      setPedidosMaterial(transformArray(pedMatData));
      setExpedicoes(transformArray(expData));

      console.log('✅ Dados carregados do Supabase:', {
        clientes: clientesData.length,
        obras: obrasData.length,
        pecas: pecasData.length,
        estoque: estoqueData.length,
        nfs: nfsData.length
      });
    } catch (err) {
      console.error('❌ Erro ao carregar dados:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar na montagem
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Funções utilitárias (compatível com database.js)
  const getObraById = useCallback((id) => obras.find(o => o.id === id), [obras]);
  const getClienteById = useCallback((id) => clientes.find(c => c.id === id), [clientes]);
  const getOrcamentoById = useCallback((id) => orcamentos.find(o => o.id === id), [orcamentos]);
  const getFuncionarioById = useCallback((id) => funcionarios.find(f => f.id === id), [funcionarios]);
  const getEquipeById = useCallback((id) => equipes.find(e => e.id === id), [equipes]);
  const getPecasByObra = useCallback((obraId) => pecasProducao.filter(p => p.obraId === obraId), [pecasProducao]);
  const getExpedicoesByObra = useCallback((obraId) => expedicoes.filter(e => e.obraId === obraId), [expedicoes]);
  const getEstoqueByObra = useCallback((obraId) => estoque.filter(e => e.obraReservada === obraId), [estoque]);
  const getComprasByObra = useCallback((obraId) => compras.filter(c => c.obraId === obraId), [compras]);
  const getNFsByObra = useCallback((obraId) => notasFiscais.filter(nf => nf.obraId === obraId), [notasFiscais]);
  const getMovimentacoesByObra = useCallback((obraId) => movimentacoesEstoque.filter(m => m.obraId === obraId), [movimentacoesEstoque]);
  const getListasByObra = useCallback((obraId) => listasMaterial.filter(l => l.obraId === obraId), [listasMaterial]);
  const getMedicoesByObra = useCallback((obraId) => medicoes.filter(m => m.obraId === obraId), [medicoes]);

  const value = {
    // Estado
    loading,
    connected,
    error,
    reload: loadData,

    // Dados
    clientes,
    obras,
    orcamentos,
    listasMaterial,
    estoque,
    pecasProducao,
    funcionarios,
    equipes,
    compras,
    notasFiscais,
    movimentacoesEstoque,
    maquinas,
    medicoes,
    lancamentosDespesas,
    pedidosMaterial,
    expedicoes,

    // Funções de busca
    getObraById,
    getClienteById,
    getOrcamentoById,
    getFuncionarioById,
    getEquipeById,
    getPecasByObra,
    getExpedicoesByObra,
    getEstoqueByObra,
    getComprasByObra,
    getNFsByObra,
    getMovimentacoesByObra,
    getListasByObra,
    getMedicoesByObra,

    // APIs diretas (para operações de escrita)
    api: {
      clientes: clientesApi,
      obras: obrasApi,
      orcamentos: orcamentosApi,
      listas: listasApi,
      estoque: estoqueApi,
      pecas: pecasApi,
      funcionarios: funcionariosApi,
      equipes: equipesApi,
      compras: comprasApi,
      notasFiscais: notasFiscaisApi,
      movEstoque: movEstoqueApi,
      maquinas: maquinasApi,
      medicoes: medicoesApi,
      lancamentos: lancamentosApi,
      pedidosMaterial: pedidosMaterialApi,
      expedicoes: expedicoesApi
    }
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData() deve ser usado dentro de <DataProvider>');
  }
  return ctx;
}

export default DataProvider;
