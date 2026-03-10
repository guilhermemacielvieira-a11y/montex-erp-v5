import React, { useState, useCallback } from 'react';
import { Search, Calendar, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Filter Bar Component
 *
 * Reusable filter interface with search, date range, and category selection.
 * Provides debounced search and easy filter state management.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onFiltersChange - Callback when filters change
 * @param {string} [props.searchPlaceholder='Buscar...'] - Search input placeholder
 * @param {Array<Object>} [props.categories=[]] - Category options [{id, label}]
 * @param {boolean} [props.showDateRange=false] - Show date range inputs
 * @param {boolean} [props.showSearch=true] - Show search input
 * @param {Object} [props.initialFilters={}] - Initial filter values
 * @param {string} [props.className] - Additional CSS classes
 *
 * @returns {React.ReactElement} Filter bar component
 *
 * @example
 * const [filters, setFilters] = useState({});
 *
 * <FilterBar
 *   onFiltersChange={setFilters}
 *   searchPlaceholder="Buscar peça..."
 *   categories={[
 *     { id: 'corte', label: 'Corte' },
 *     { id: 'fabricacao', label: 'Fabricação' }
 *   ]}
 *   showDateRange={true}
 * />
 *
 * // Apply filters to data
 * const filtered = pecas.filter(p =>
 *   p.nome.includes(filters.search) &&
 *   (!filters.category || p.etapa === filters.category)
 * );
 */
export default function FilterBar({
  onFiltersChange,
  searchPlaceholder = 'Buscar...',
  categories = [],
  showDateRange = false,
  showSearch = true,
  initialFilters = {},
  className = ''
}) {
  const [filters, setFilters] = useState({
    search: initialFilters.search || '',
    category: initialFilters.category || '',
    startDate: initialFilters.startDate || '',
    endDate: initialFilters.endDate || '',
    ...initialFilters
  });

  const [searchTimeout, setSearchTimeout] = useState(null);

  // Debounced search
  const handleSearchChange = useCallback((value) => {
    setFilters(prev => ({ ...prev, search: value }));

    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(
      setTimeout(() => {
        onFiltersChange({ ...filters, search: value });
      }, 300)
    );
  }, [filters, searchTimeout, onFiltersChange]);

  const handleFilterChange = useCallback((key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  const hasActiveFilters = filters.search || filters.category || filters.startDate || filters.endDate;

  const clearFilters = () => {
    const cleared = {
      search: '',
      category: '',
      startDate: '',
      endDate: ''
    };
    setFilters(cleared);
    onFiltersChange(cleared);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex flex-wrap items-center gap-3 mb-6 p-4 rounded-lg border border-slate-800 bg-slate-950/50',
        className
      )}
    >
      {/* Search Input */}
      {showSearch && (
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
          />
        </div>
      )}

      {/* Category Select */}
      {categories.length > 0 && (
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="">Todas as categorias</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.label}</option>
          ))}
        </select>
      )}

      {/* Date Range */}
      {showDateRange && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <span className="text-slate-500">até</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      )}

      {/* Clear Button */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          title="Limpar filtros"
        >
          <X className="h-4 w-4" />
          Limpar
        </button>
      )}
    </motion.div>
  );
}
