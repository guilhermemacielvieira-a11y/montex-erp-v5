// MONTEX ERP Premium - Pivot Table Component
// Integrado com ERPContext

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Download,
  Maximize2,
  GripVertical
} from 'lucide-react';

// Formatador de moeda
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const PivotTable = ({ data, title = "Análise de Dados" }) => {
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [groupBy, setGroupBy] = useState('status');

  const groupByOptions = [
    { value: 'status', label: 'Status' },
    { value: 'responsavel', label: 'Responsável' },
    { value: 'tipo', label: 'Tipo de Projeto' },
    { value: 'mes', label: 'Mês' },
  ];

  // Process data for pivot
  const pivotData = useMemo(() => {
    const groups = {};

    data.forEach(item => {
      let groupKey;
      switch (groupBy) {
        case 'status':
          groupKey = item.status || 'Sem status';
          break;
        case 'responsavel':
          groupKey = item.responsavel || 'Não atribuído';
          break;
        case 'tipo':
          groupKey = item.tipo || 'Outros';
          break;
        case 'mes':
          const date = new Date(item.data_inicio || item.data_criacao || new Date());
          groupKey = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
          break;
        default:
          groupKey = 'Geral';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          items: [],
          totalValor: 0,
          totalPeso: 0,
          count: 0,
          progressoMedio: 0
        };
      }

      groups[groupKey].items.push(item);
      groups[groupKey].totalValor += item.valor_total || 0;
      groups[groupKey].totalPeso += item.peso_total || 0;
      groups[groupKey].count += 1;
      groups[groupKey].progressoMedio += item.progresso || 0;
    });

    // Calculate averages
    Object.values(groups).forEach(group => {
      group.progressoMedio = group.count > 0 ? group.progressoMedio / group.count : 0;
    });

    return Object.values(groups).sort((a, b) => {
      if (sortConfig.key) {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (sortConfig.direction === 'asc') {
          return aVal > bVal ? 1 : -1;
        }
        return aVal < bVal ? 1 : -1;
      }
      return 0;
    });
  }, [data, groupBy, sortConfig]);

  const totals = useMemo(() => {
    return pivotData.reduce(
      (acc, group) => ({
        totalValor: acc.totalValor + group.totalValor,
        totalPeso: acc.totalPeso + group.totalPeso,
        count: acc.count + group.count,
      }),
      { totalValor: 0, totalPeso: 0, count: 0 }
    );
  }, [pivotData]);

  const toggleRow = (key) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const statusColors = {
    'aprovado': 'text-blue-400',
    'em_fabricacao': 'text-amber-400',
    'em_montagem': 'text-emerald-400',
    'concluido': 'text-purple-400',
  };

  const statusLabels = {
    'aprovado': 'Aprovado',
    'em_fabricacao': 'Em Fabricação',
    'em_montagem': 'Em Montagem',
    'concluido': 'Concluído',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <Table className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{title}</h3>
            <p className="text-slate-400 text-xs">{totals.count} registros agrupados</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Group By Selector */}
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          >
            {groupByOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white">
            <Download className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-8">
                {/* Expand */}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                {groupByOptions.find(o => o.value === groupBy)?.label}
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort('count')}
              >
                <div className="flex items-center justify-end gap-1">
                  Quantidade
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort('totalValor')}
              >
                <div className="flex items-center justify-end gap-1">
                  Valor Total
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort('totalPeso')}
              >
                <div className="flex items-center justify-end gap-1">
                  Peso (ton)
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort('progressoMedio')}
              >
                <div className="flex items-center justify-end gap-1">
                  Progresso
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {pivotData.map((group, idx) => {
              const isExpanded = expandedRows.has(group.key);
              const statusColor = statusColors[group.key] || 'text-slate-400';

              return (
                <React.Fragment key={group.key}>
                  {/* Group Row */}
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-700/30 cursor-pointer transition-colors"
                    onClick={() => toggleRow(group.key)}
                  >
                    <td className="px-4 py-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${statusColor}`}>
                        {statusLabels[group.key] || group.key}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-white font-mono">{group.count}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-emerald-400 font-mono">
                        {formatCurrency(group.totalValor)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-cyan-400 font-mono">
                        {(group.totalPeso / 1000).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${group.progressoMedio}%` }}
                          />
                        </div>
                        <span className="text-white font-mono text-sm">
                          {group.progressoMedio.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>

                  {/* Expanded Items */}
                  {isExpanded && group.items.map((item, itemIdx) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-slate-900/30"
                    >
                      <td className="px-4 py-2">
                        <GripVertical className="w-3 h-3 text-slate-600" />
                      </td>
                      <td className="px-4 py-2 pl-8">
                        <span className="text-slate-300 text-sm">{item.nome}</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="text-slate-400 text-sm">1</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="text-slate-300 text-sm font-mono">
                          {formatCurrency(item.valor_total || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="text-slate-300 text-sm font-mono">
                          {((item.peso_total || 0) / 1000).toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="text-slate-300 text-sm font-mono">
                          {item.progresso || 0}%
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </React.Fragment>
              );
            })}

            {/* Totals Row */}
            <tr className="bg-slate-900/70 font-semibold">
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-white">TOTAL</td>
              <td className="px-4 py-3 text-right text-white font-mono">{totals.count}</td>
              <td className="px-4 py-3 text-right text-emerald-400 font-mono">
                {formatCurrency(totals.totalValor)}
              </td>
              <td className="px-4 py-3 text-right text-cyan-400 font-mono">
                {(totals.totalPeso / 1000).toFixed(1)}
              </td>
              <td className="px-4 py-3 text-right text-slate-400">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default PivotTable;
