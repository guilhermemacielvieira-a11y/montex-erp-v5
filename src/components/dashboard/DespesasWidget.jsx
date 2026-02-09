// MONTEX ERP Premium - Despesas Widget Component
// Integrado com ERPContext

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Plus,
  CreditCard,
  Wallet,
  Receipt,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';



// Dados financeiros reais
import { LANCAMENTOS_DESPESAS, MEDICOES_RECEITAS } from '../../data/obraFinanceiraDatabase';

// Formatador de moeda
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const categoriasCores = {
  'material': 'from-blue-500 to-cyan-500',
  'mao_de_obra': 'from-orange-500 to-amber-500',
  'transporte': 'from-purple-500 to-pink-500',
  'equipamento': 'from-emerald-500 to-green-500',
  'administrativo': 'from-slate-500 to-slate-600',
  'outros': 'from-rose-500 to-red-500',
};

const categoriasIcones = {
  'material': Receipt,
  'mao_de_obra': Wallet,
  'transporte': CreditCard,
  'equipamento': Receipt,
  'administrativo': DollarSign,
  'outros': DollarSign,
};

export default function DespesasWidget({ obraId }) {
  const [periodo, setPeriodo] = useState('mes');

  // Usar dados financeiros reais
  const movimentacoes = useMemo(() => {
    const despesas = LANCAMENTOS_DESPESAS.map(d => ({
      ...d,
      tipo: 'despesa',
      projeto_id: 'SL001'
    }));
    const receitas = MEDICOES_RECEITAS.map(r => ({
      ...r,
      tipo: 'receita',
      projeto_id: 'SL001'
    }));
    return [...despesas, ...receitas];
  }, []);

  // Filtrar por obra se especificada
  const despesasFiltradas = obraId
    ? movimentacoes.filter(m => m.projeto_id === obraId && m.tipo === 'despesa')
    : movimentacoes.filter(m => m.tipo === 'despesa');

  // Calcular totais
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));

  const despesasMes = despesasFiltradas.filter(d => {
    const data = new Date(d.data || d.created_date);
    return data >= inicioMes;
  });

  const totalMes = despesasMes.reduce((acc, d) => acc + (d.valor || 0), 0);

  // Agrupar por categoria
  const porCategoria = despesasMes.reduce((acc, d) => {
    const cat = d.categoria || 'outros';
    acc[cat] = (acc[cat] || 0) + (d.valor || 0);
    return acc;
  }, {});

  // Últimas despesas
  const ultimasDespesas = despesasFiltradas.slice(0, 5);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-500" />
              Despesas
            </h3>
            <p className="text-sm text-slate-400">Controle financeiro</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 rounded-lg p-1">
              {['semana', 'mes', 'ano'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-all capitalize",
                    periodo === p
                      ? "bg-orange-500 text-white"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Total Card */}
      <div className="p-4">
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Total do Mês</p>
              <p className="text-3xl font-bold text-white mt-1">
                {formatCurrency(totalMes)}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingUp className="h-4 w-4 text-red-400" />
                <span className="text-red-400">+12% vs mês anterior</span>
              </div>
            </div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <ArrowDownRight className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        {/* Por Categoria */}
        <div className="mb-4">
          <p className="text-sm font-medium text-slate-400 mb-3">Por Categoria</p>
          <div className="space-y-2">
            {Object.entries(porCategoria).slice(0, 4).map(([categoria, valor]) => {
              const Icon = categoriasIcones[categoria] || DollarSign;
              const gradient = categoriasCores[categoria] || 'from-slate-500 to-slate-600';
              const porcentagem = totalMes > 0 ? (valor / totalMes) * 100 : 0;

              return (
                <div key={categoria} className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    `bg-gradient-to-br ${gradient}`
                  )}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white capitalize">
                        {categoria.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-medium text-white">
                        {formatCurrency(valor)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${porcentagem}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={cn("h-full rounded-full", `bg-gradient-to-r ${gradient}`)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Últimas Despesas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-400">Últimas Despesas</p>
            <Button variant="ghost" size="sm" className="text-orange-400 hover:text-orange-300 h-8 px-2">
              Ver todas
            </Button>
          </div>
          <div className="space-y-2">
            {ultimasDespesas.map((despesa, index) => {
              const Icon = categoriasIcones[despesa.categoria] || DollarSign;
              const gradient = categoriasCores[despesa.categoria] || 'from-slate-500 to-slate-600';

              return (
                <motion.div
                  key={despesa.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors group"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    `bg-gradient-to-br ${gradient}`
                  )}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{despesa.descricao || 'Despesa'}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(despesa.data || despesa.created_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-red-400">
                    -{formatCurrency(despesa.valor || 0)}
                  </span>
                </motion.div>
              );
            })}

            {ultimasDespesas.length === 0 && (
              <div className="text-center py-6 text-slate-400">
                <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma despesa registrada</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
