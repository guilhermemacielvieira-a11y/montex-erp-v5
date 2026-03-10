import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Data Table Component
 *
 * Reusable table component with search, sorting, filtering, and pagination.
 * Flexible columns configuration and row actions support.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Array<Object>} props.data - Array of row data objects
 * @param {Array<Object>} props.columns - Column definitions
 * @param {string} columns[].key - Data key (for column.render, or direct object property)
 * @param {string} columns[].label - Column header label
 * @param {Function} [columns[].render] - Custom render function(value, row, index)
 * @param {string} [columns[].align='left'] - Text alignment: 'left', 'center', 'right'
 * @param {string} [columns[].width] - CSS width (e.g., '100px', '20%')
 * @param {boolean} [columns[].sortable=false] - Enable sorting for column
 * @param {Array<Object>} [props.rowActions=[]] - Row action buttons
 * @param {string} rowActions[].label - Button label
 * @param {Function} rowActions[].onClick - Click handler(row)
 * @param {boolean} [props.showSearch=true] - Show search input
 * @param {number} [props.pageSize=10] - Rows per page
 * @param {boolean} [props.loading=false] - Show loading state
 * @param {string} [props.emptyMessage='Nenhum dado'] - Empty state message
 * @param {string} [props.className] - Additional CSS classes
 *
 * @returns {React.ReactElement} Data table component
 *
 * @example
 * <DataTable
 *   data={pecas}
 *   columns={[
 *     { key: 'nome', label: 'Peça', sortable: true },
 *     { key: 'etapa', label: 'Etapa', sortable: true },
 *     {
 *       key: 'peso',
 *       label: 'Peso (kg)',
 *       align: 'right',
 *       render: (value) => value.toFixed(2)
 *     }
 *   ]}
 *   rowActions={[
 *     { label: 'Editar', onClick: (row) => editPeca(row) }
 *   ]}
 *   pageSize={15}
 * />
 */
export default function DataTable({
  data = [],
  columns = [],
  rowActions = [],
  showSearch = true,
  pageSize = 10,
  loading = false,
  emptyMessage = 'Nenhum dado',
  className = ''
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Filter data
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter(row =>
      columns.some(col => {
        const value = row[col.key];
        return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('space-y-4', className)}
    >
      {/* Search Bar */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar na tabela..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full">
          <thead className="bg-slate-900/50 border-b border-slate-800">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    'px-4 py-3 text-left text-sm font-semibold text-slate-300',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right'
                  )}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="hover:text-white transition-colors"
                    >
                      {col.label}
                      {sortConfig.key === col.key && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
              {rowActions.length > 0 && (
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (rowActions.length > 0 ? 1 : 0)} className="px-4 py-8 text-center">
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-6 bg-slate-800 rounded animate-pulse" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (rowActions.length > 0 ? 1 : 0)} className="px-4 py-8 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-900/30 transition-colors">
                  {columns.map(col => (
                    <td
                      key={`${rowIdx}-${col.key}`}
                      style={{ width: col.width }}
                      className={cn(
                        'px-4 py-3 text-sm text-slate-200',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right'
                      )}
                    >
                      {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                    </td>
                  ))}
                  {rowActions.length > 0 && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {rowActions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => action.onClick(row)}
                            className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded transition-colors"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4">
          <span className="text-sm text-slate-400">
            Página {currentPage} de {totalPages} ({sortedData.length} registros)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              const show = totalPages <= 7 || Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
              if (!show) return null;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'px-3 py-1 rounded text-sm transition-colors',
                    page === currentPage
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'hover:bg-slate-800 text-slate-400'
                  )}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
