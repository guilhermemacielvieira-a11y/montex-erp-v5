// MONTEX ERP Premium - BI Filters Component
// Integrado com ERPContext

import React from 'react';
import { motion } from 'framer-motion';
import {
  Filter,
  Calendar,
  Building2,
  Users,
  Tag,
  X,
  ChevronDown,
  Check,
  RotateCcw
} from 'lucide-react';

// ERPContext para dados reais
import { useObras } from '../../contexts/ERPContext';

const BIFilters = ({ filters, onFilterChange, onReset }) => {
  const [openDropdown, setOpenDropdown] = React.useState(null);

  // Dados reais do contexto
  const { obras } = useObras();

  const statusOptions = [
    { value: 'todos', label: 'Todos os Status', color: 'slate' },
    { value: 'aprovado', label: 'Aprovado', color: 'blue' },
    { value: 'em_fabricacao', label: 'Em Fabricação', color: 'amber' },
    { value: 'em_montagem', label: 'Em Montagem', color: 'emerald' },
    { value: 'concluido', label: 'Concluído', color: 'purple' },
  ];

  const periodoOptions = [
    { value: '7d', label: 'Últimos 7 dias' },
    { value: '30d', label: 'Últimos 30 dias' },
    { value: '90d', label: 'Últimos 90 dias' },
    { value: '1y', label: 'Último ano' },
    { value: 'all', label: 'Todo período' },
  ];

  // Usar obras reais do contexto
  const projetoOptions = [
    { value: 'todos', label: 'Todos os Projetos' },
    ...obras.map(p => ({ value: p.id, label: p.nome.split(' - ')[0] }))
  ];

  // Responsáveis estáticos para esta obra
  const responsavelOptions = [
    { value: 'todos', label: 'Todos os Responsáveis' },
    { value: 'carlos', label: 'Carlos Silva' },
    { value: 'roberto', label: 'Roberto Santos' },
  ];

  const handleSelect = (filterKey, value) => {
    onFilterChange({ ...filters, [filterKey]: value });
    setOpenDropdown(null);
  };

  const FilterDropdown = ({ id, icon: Icon, label, options, value, filterKey }) => {
    const isOpen = openDropdown === id;
    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(isOpen ? null : id)}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all
            ${isOpen
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
              : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:border-slate-600'}
          `}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium">{selectedOption.label}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-2 max-h-64 overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(filterKey, option.value)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all
                    ${value === option.value
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-slate-300 hover:bg-slate-700/50'}
                  `}
                >
                  <span>{option.label}</span>
                  {value === option.value && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  const activeFilters = Object.entries(filters).filter(
    ([key, value]) => value !== 'todos' && value !== 'all'
  );

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="w-5 h-5" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>

        <FilterDropdown
          id="periodo"
          icon={Calendar}
          label="Período"
          options={periodoOptions}
          value={filters.periodo}
          filterKey="periodo"
        />

        <FilterDropdown
          id="status"
          icon={Tag}
          label="Status"
          options={statusOptions}
          value={filters.status}
          filterKey="status"
        />

        <FilterDropdown
          id="projeto"
          icon={Building2}
          label="Projeto"
          options={projetoOptions}
          value={filters.projeto}
          filterKey="projeto"
        />

        <FilterDropdown
          id="responsavel"
          icon={Users}
          label="Responsável"
          options={responsavelOptions}
          value={filters.responsavel}
          filterKey="responsavel"
        />

        {activeFilters.length > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Limpar filtros
          </button>
        )}
      </div>

      {/* Active Filters Tags */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Filtros ativos:</span>
          {activeFilters.map(([key, value]) => {
            let label = value;
            if (key === 'projeto') {
              const proj = obras.find(p => p.id === value);
              label = proj?.nome.split(' - ')[0] || value;
            }
            if (key === 'responsavel') {
              // Responsáveis estáticos
              const responsaveis = { 'carlos': 'Carlos Silva', 'roberto': 'Roberto Santos' };
              label = responsaveis[value] || value;
            }

            return (
              <span
                key={key}
                className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs"
              >
                {label}
                <button
                  onClick={() => handleSelect(key, key === 'periodo' ? 'all' : 'todos')}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Click outside handler */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  );
};

export default BIFilters;
