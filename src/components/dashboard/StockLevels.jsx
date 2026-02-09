// MONTEX ERP Premium - Stock Levels Component
// Integrado com ERPContext

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Layers,
  Box,
  Droplet,
  Wrench,
  ChevronRight,
  Filter
} from 'lucide-react';

// ERPContext para dados reais
import { useEstoque } from '../../contexts/ERPContext';

// Formatador de moeda
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const StockLevels = () => {
  // Dados reais do contexto
  const { estoque: estoqueContext } = useEstoque();

  const [filter, setFilter] = useState('todos');
  const [showAll, setShowAll] = useState(false);

  const tipoIcons = {
    chapa: Layers,
    chapas: Layers,
    perfil: Box,
    perfis: Box,
    perfis_hp: Box,
    tubo: Package,
    tubos: Package,
    fixacao: Wrench,
    parafusos: Wrench,
    consumivel: Droplet,
    consumiveis: Droplet,
    pintura: Droplet,
    tintas: Droplet,
    gases: Droplet,
    cantoneiras: Box,
    barras: Box
  };

  const tipoLabels = {
    chapa: 'Chapas',
    chapas: 'Chapas',
    perfil: 'Perfis',
    perfis: 'Perfis',
    perfis_hp: 'Perfis HP',
    tubo: 'Tubos',
    tubos: 'Tubos',
    fixacao: 'Fixação',
    parafusos: 'Parafusos',
    consumivel: 'Consumíveis',
    consumiveis: 'Consumíveis',
    pintura: 'Pintura',
    tintas: 'Tintas',
    gases: 'Gases',
    cantoneiras: 'Cantoneiras',
    barras: 'Barras'
  };

  // Calcular status do estoque
  const getStockStatus = (item) => {
    const minimo = item.minimo || 1;
    const percentual = (item.quantidade / minimo) * 100;
    if (percentual < 100) return { status: 'critico', color: 'red', label: 'Crítico' };
    if (percentual < 120) return { status: 'baixo', color: 'amber', label: 'Baixo' };
    if (percentual > 200) return { status: 'alto', color: 'blue', label: 'Alto' };
    return { status: 'normal', color: 'emerald', label: 'Normal' };
  };

  // Usar dados do contexto
  const estoque = estoqueContext || [];

  // Filtrar estoque
  const estoqueProcessado = estoque
    .map(item => ({
      ...item,
      ...getStockStatus(item),
      percentual: Math.round((item.quantidade / item.maximo) * 100)
    }))
    .filter(item => {
      if (filter === 'todos') return true;
      if (filter === 'critico') return item.status === 'critico' || item.status === 'baixo';
      return item.tipo === filter;
    })
    .sort((a, b) => {
      // Ordenar por criticidade
      const ordem = { critico: 0, baixo: 1, normal: 2, alto: 3 };
      return ordem[a.status] - ordem[b.status];
    });

  const displayItems = showAll ? estoqueProcessado : estoqueProcessado.slice(0, 5);

  // Estatísticas
  const totalItens = estoque.length;
  const itensCriticos = estoque.filter(i => getStockStatus(i).status === 'critico').length;
  const itensBaixos = estoque.filter(i => getStockStatus(i).status === 'baixo').length;
  const valorTotal = estoque.reduce((acc, i) => acc + (i.quantidade * i.preco_kg), 0);

  const statusColors = {
    critico: { bg: 'bg-red-500/20', text: 'text-red-400', bar: 'bg-red-500' },
    baixo: { bg: 'bg-amber-500/20', text: 'text-amber-400', bar: 'bg-amber-500' },
    normal: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', bar: 'bg-emerald-500' },
    alto: { bg: 'bg-blue-500/20', text: 'text-blue-400', bar: 'bg-blue-500' }
  };

  const filters = [
    { id: 'todos', label: 'Todos' },
    { id: 'critico', label: 'Alertas' },
    { id: 'chapa', label: 'Chapas' },
    { id: 'perfil', label: 'Perfis' },
    { id: 'consumivel', label: 'Consumíveis' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Níveis de Estoque</h3>
              <p className="text-slate-400 text-xs">{totalItens} materiais cadastrados</p>
            </div>
          </div>
          {(itensCriticos > 0 || itensBaixos > 0) && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-400 text-xs font-medium">{itensCriticos + itensBaixos} alertas</span>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2 p-4 border-b border-slate-700/50">
        <div className="text-center p-2 bg-slate-700/30 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-red-400 text-lg font-bold">
            <TrendingDown className="w-4 h-4" />
            {itensCriticos}
          </div>
          <span className="text-slate-500 text-xs">Críticos</span>
        </div>
        <div className="text-center p-2 bg-slate-700/30 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-amber-400 text-lg font-bold">
            <AlertTriangle className="w-4 h-4" />
            {itensBaixos}
          </div>
          <span className="text-slate-500 text-xs">Baixos</span>
        </div>
        <div className="text-center p-2 bg-slate-700/30 rounded-lg">
          <div className="text-emerald-400 text-lg font-bold">
            {formatCurrency(valorTotal)}
          </div>
          <span className="text-slate-500 text-xs">Valor Total</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="p-3 border-b border-slate-700/50">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-slate-500 mr-1 flex-shrink-0" />
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                ${filter === f.id
                  ? 'bg-emerald-500/30 text-emerald-400'
                  : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'}
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Materiais */}
      <div className="p-4">
        <div className="space-y-3">
          {displayItems.map((item, index) => {
            const Icon = tipoIcons[item.tipo] || Package;
            const colors = statusColors[item.status];

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-all cursor-pointer">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg}`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium truncate pr-2">
                        {item.material}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        {item.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-slate-400 text-xs">
                        {item.quantidade.toLocaleString('pt-BR')} {item.unidade}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-500 text-xs">
                        Mín: {item.minimo.toLocaleString('pt-BR')}
                      </span>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="relative">
                      <div className="w-full h-1.5 bg-slate-600/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(item.percentual, 100)}%` }}
                          transition={{ duration: 0.5, delay: index * 0.05 }}
                          className={`h-full rounded-full ${colors.bar}`}
                        />
                      </div>
                      {/* Marcador do mínimo */}
                      <div
                        className="absolute top-0 w-0.5 h-1.5 bg-slate-400"
                        style={{ left: `${(item.minimo / item.maximo) * 100}%` }}
                      />
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mostrar mais */}
        {estoqueProcessado.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-4 py-2 text-emerald-400 text-sm font-medium hover:bg-emerald-500/10 rounded-lg transition-colors"
          >
            {showAll ? 'Mostrar menos' : `Ver mais ${estoqueProcessado.length - 5} itens`}
          </button>
        )}

        {/* Legenda */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-slate-500">Crítico</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-slate-500">Baixo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-500">Normal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-slate-500">Alto</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StockLevels;
