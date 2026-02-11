import { useState, useCallback, useEffect, useMemo, useContext } from 'react';
import { usePagination } from './usePagination';
// Import the ERPContext directly to access it
import ERPContext from '@/contexts/ERPContext';

/**
 * Hook que fornece paginação inteligente com suporte a Supabase (server-side) e mock data (client-side)
 *
 * @param {string} tableName - Nome da tabela no Supabase (ex: 'pecas_producao', 'estoque')
 * @param {array} contextData - Dados carregados do ERPContext (para modo client-side)
 * @param {object} options - Opções de configuração
 * @param {number} options.pageSize - Itens por página (default: 25)
 * @param {string} options.orderBy - Coluna para ordenação (default: 'created_at')
 * @param {boolean} options.ascending - Ordem ascendente (default: false)
 * @param {object} options.filters - Filtros { coluna: valor }
 * @param {string} options.search - Texto de busca
 * @param {string} options.searchColumn - Coluna de busca (default: 'nome')
 * @param {function} options.customFilter - Função de filtro customizado para client-side
 *
 * @returns {object} { data, loading, page, totalCount, totalPages, hasMore,
 *                      nextPage, prevPage, goToPage, refresh, isServerSide }
 */
export function useSmartPagination(tableName, contextData = [], options = {}) {
  const {
    pageSize = 25,
    orderBy = 'createdAt',
    ascending = false,
    filters = {},
    search = '',
    searchColumn = 'nome',
    customFilter = null,
  } = options;

  // Obter dataSource do ERPContext (default export é o ERPCoreContext)
  const erpContext = useContext(ERPContext);
  const dataSource = erpContext?.dataSource || 'loading';

  // Estado para modo client-side
  const [page, setPage] = useState(0);
  const [clientData, setClientData] = useState([]);
  const [clientLoading, setClientLoading] = useState(false);

  // Usar usePagination para Supabase (server-side)
  const serverPagination = usePagination(tableName, {
    pageSize,
    orderBy,
    ascending,
    filters,
    search,
    searchColumn,
  });

  // Determinar se está em modo server-side
  const isServerSide = dataSource === 'supabase';

  // ===== MODO CLIENT-SIDE (quando dataSource !== 'supabase') =====
  const clientPaginatedData = useMemo(() => {
    let filtered = [...(contextData || [])];

    // Aplicar filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'todos' && value !== 'todas') {
        filtered = filtered.filter(item => {
          // Normalizar snake_case para camelCase
          const normalizedKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
          return item[normalizedKey] === value;
        });
      }
    });

    // Aplicar busca
    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      // Normalizar searchColumn snake_case para camelCase
      const normalizedSearchCol = searchColumn.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
      filtered = filtered.filter(item => {
        const fieldValue = String(item[normalizedSearchCol] || '').toLowerCase();
        return fieldValue.includes(searchLower);
      });
    }

    // Aplicar filtro customizado se fornecido
    if (customFilter && typeof customFilter === 'function') {
      filtered = filtered.filter(customFilter);
    }

    // Ordenação
    const orderByNormalized = orderBy.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    filtered.sort((a, b) => {
      const aVal = a[orderByNormalized];
      const bVal = b[orderByNormalized];

      if (aVal === undefined || aVal === null) return ascending ? -1 : 1;
      if (bVal === undefined || bVal === null) return ascending ? 1 : -1;

      if (typeof aVal === 'string') {
        return ascending
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return ascending
        ? aVal - bVal
        : bVal - aVal;
    });

    return {
      allData: filtered,
      totalCount: filtered.length,
      totalPages: Math.ceil(filtered.length / pageSize),
    };
  }, [contextData, filters, search, searchColumn, orderBy, ascending, customFilter, pageSize]);

  // Atualizar page quando necessário
  useEffect(() => {
    if (!isServerSide) {
      // Em modo client-side, inicializar com página 0
      setPage(0);
    }
  }, [isServerSide, JSON.stringify(filters), search]);

  // Calcular dados paginados para client-side
  const pagedClientData = useMemo(() => {
    const start = page * pageSize;
    const end = start + pageSize;
    return clientPaginatedData.allData.slice(start, end);
  }, [clientPaginatedData, page, pageSize]);

  // ===== RETORNO UNIFICADO =====

  // Em modo server-side, usar dados do usePagination
  if (isServerSide) {
    return {
      data: serverPagination.data || [],
      loading: serverPagination.loading,
      page: serverPagination.page,
      totalCount: serverPagination.totalCount,
      totalPages: serverPagination.totalPages,
      hasMore: serverPagination.hasMore,
      pageSize: serverPagination.pageSize,
      nextPage: serverPagination.nextPage,
      prevPage: serverPagination.prevPage,
      goToPage: serverPagination.goToPage,
      refresh: serverPagination.refresh,
      isServerSide: true,
    };
  }

  // Em modo client-side
  const nextPage = useCallback(() => {
    if (page < clientPaginatedData.totalPages - 1) {
      setPage(page + 1);
    }
  }, [page, clientPaginatedData.totalPages]);

  const prevPage = useCallback(() => {
    if (page > 0) {
      setPage(page - 1);
    }
  }, [page]);

  const goToPage = useCallback((p) => {
    if (p >= 0 && p < clientPaginatedData.totalPages) {
      setPage(p);
    }
  }, [clientPaginatedData.totalPages]);

  const refresh = useCallback(() => {
    // Em client-side, recarregar é apenas resetar página
    setPage(0);
  }, []);

  return {
    data: pagedClientData,
    loading: clientLoading,
    page,
    totalCount: clientPaginatedData.totalCount,
    totalPages: clientPaginatedData.totalPages,
    hasMore: page < clientPaginatedData.totalPages - 1,
    pageSize,
    nextPage,
    prevPage,
    goToPage,
    refresh,
    isServerSide: false,
  };
}
