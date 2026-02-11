import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

/**
 * Hook para paginação server-side com Supabase .range()
 * @param {string} table - Nome da tabela
 * @param {object} options - Opções de configuração
 * @param {number} options.pageSize - Itens por página (default: 25)
 * @param {string} options.orderBy - Coluna para ordenação (default: 'created_at')
 * @param {boolean} options.ascending - Ordem ascendente (default: false)
 * @param {object} options.filters - Filtros { coluna: valor }
 * @param {string} options.search - Texto de busca (busca em 'nome')
 * @param {string} options.searchColumn - Coluna de busca (default: 'nome')
 */
export function usePagination(table, options = {}) {
  const {
    pageSize = 25,
    orderBy = 'created_at',
    ascending = false,
    filters = {},
    search = '',
    searchColumn = 'nome',
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const totalPages = Math.ceil(totalCount / pageSize);

  const fetchPage = useCallback(async (pageNum) => {
    setLoading(true);
    setError(null);

    try {
      const from = pageNum * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from(table)
        .select('*', { count: 'exact' })
        .order(orderBy, { ascending })
        .range(from, to);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'todos' && value !== 'todas') {
          query = query.eq(key, value);
        }
      });

      // Apply search
      if (search && search.trim()) {
        query = query.ilike(searchColumn, `%${search.trim()}%`);
      }

      const { data: result, error: queryError, count } = await query;

      if (queryError) throw queryError;

      setData(result || []);
      setTotalCount(count || 0);
      setHasMore((pageNum + 1) * pageSize < (count || 0));
      setPage(pageNum);
    } catch (err) {
      console.error(`Erro ao buscar ${table}:`, err);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [table, pageSize, orderBy, ascending, JSON.stringify(filters), search, searchColumn]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchPage(0);
  }, [fetchPage]);

  const nextPage = useCallback(() => {
    if (hasMore) fetchPage(page + 1);
  }, [page, hasMore, fetchPage]);

  const prevPage = useCallback(() => {
    if (page > 0) fetchPage(page - 1);
  }, [page, fetchPage]);

  const goToPage = useCallback((p) => {
    if (p >= 0 && p < totalPages) fetchPage(p);
  }, [totalPages, fetchPage]);

  const refresh = useCallback(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  return {
    data,
    loading,
    error,
    page,
    totalCount,
    totalPages,
    hasMore,
    pageSize,
    nextPage,
    prevPage,
    goToPage,
    refresh,
  };
}
