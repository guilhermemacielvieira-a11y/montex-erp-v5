// MONTEX ERP Premium - Kanban Producao Component
// Integrado com ERPContext

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  AlertTriangle,
  Weight,
  MoreHorizontal,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ERPContext para dados reais
import { useProducao, useObras } from '../../contexts/ERPContext';
import { ETAPAS_PRODUCAO } from '../../data/database';

const colunas = [
  {
    id: 'aguardando',
    title: 'Aguardando',
    icon: Clock,
    color: 'from-slate-500 to-slate-600',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
  },
  {
    id: 'em_corte',
    title: 'Em Corte',
    icon: Package,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'em_fabricacao',
    title: 'Em Fabricação',
    icon: Package,
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  {
    id: 'em_pintura',
    title: 'Em Pintura',
    icon: Package,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'concluido',
    title: 'Concluído',
    icon: CheckCircle2,
    color: 'from-emerald-500 to-green-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  {
    id: 'expedido',
    title: 'Expedido',
    icon: Truck,
    color: 'from-cyan-500 to-teal-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
];

export default function KanbanProducao({ obraId }) {
  // ERPContext - dados reais
  const { pecas, moverPecaEtapa } = useProducao();
  const { obras } = useObras();

  const [search, setSearch] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [localItens, setLocalItens] = useState([]);

  // Sincronizar com context
  React.useEffect(() => {
    if (pecas && pecas.length > 0) {
      // Mapear peças do contexto para formato do Kanban
      const itensFormatados = pecas.map(p => ({
        ...p,
        codigo: p.marca,
        descricao: p.descricao || `${p.tipo || p.perfil} - MK-${p.marca}`,
        peso: p.peso || 0,
        status: p.etapa || ETAPAS_PRODUCAO.AGUARDANDO,
        projeto_id: p.obraId
      }));
      setLocalItens(itensFormatados);
    }
  }, [pecas]);

  // Use local state for itens
  const itensProducao = localItens;

  // Filtrar por obra se especificada
  const itensFiltrados = useMemo(() => {
    let itens = obraId
      ? itensProducao.filter(i => i.projeto_id === obraId || i.obraId === obraId)
      : itensProducao;

    if (search) {
      itens = itens.filter(i =>
        i.codigo?.toLowerCase().includes(search.toLowerCase()) ||
        i.descricao?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return itens;
  }, [itensProducao, obraId, search]);

  // Agrupar por status
  const itensPorColuna = useMemo(() => {
    const grupos = {};
    colunas.forEach(col => {
      grupos[col.id] = itensFiltrados.filter(i => i.status === col.id);
    });
    return grupos;
  }, [itensFiltrados]);

  // Calcular totais
  const totais = useMemo(() => {
    const total = itensFiltrados.length;
    const concluidos = itensFiltrados.filter(i =>
      ['concluido', 'expedido'].includes(i.status)
    ).length;
    const pesoTotal = itensFiltrados.reduce((acc, i) =>
      acc + ((i.peso_unitario || 0) * (i.quantidade || 1)), 0
    );

    return { total, concluidos, pesoTotal };
  }, [itensFiltrados]);

  const handleDragStart = (item) => {
    setDraggedItem(item);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = (colunaId) => {
    if (draggedItem && draggedItem.status !== colunaId) {
      // Update local state
      setLocalItens(prev =>
        prev.map(item =>
          item.id === draggedItem.id
            ? { ...item, status: colunaId }
            : item
        )
      );
    }
    setDraggedItem(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="h-6 w-6 text-orange-500" />
            Kanban de Produção
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {totais.total} itens • {totais.concluidos} concluídos • {totais.pesoTotal.toLocaleString('pt-BR')} kg
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar peça..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64 bg-slate-800/60 border-slate-700 text-white"
            />
          </div>
          <Button variant="outline" className="border-slate-700 text-white">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Progresso Geral</span>
          <span className="text-sm font-semibold text-white">
            {totais.total > 0 ? Math.round((totais.concluidos / totais.total) * 100) : 0}%
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${totais.total > 0 ? (totais.concluidos / totais.total) * 100 : 0}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 rounded-full"
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {colunas.map((coluna) => {
          const Icon = coluna.icon;
          const itensColuna = itensPorColuna[coluna.id] || [];

          return (
            <motion.div
              key={coluna.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(coluna.id)}
              className={cn(
                "flex-shrink-0 w-[300px] rounded-xl border",
                coluna.bgColor,
                coluna.borderColor,
                draggedItem && "border-dashed"
              )}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-slate-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      `bg-gradient-to-br ${coluna.color}`
                    )}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-white">{coluna.title}</span>
                  </div>
                  <Badge variant="outline" className="bg-slate-800/50 border-slate-600 text-white">
                    {itensColuna.length}
                  </Badge>
                </div>
              </div>

              {/* Column Body */}
              <div className="p-2 max-h-[500px] overflow-y-auto space-y-2">
                <AnimatePresence>
                  {itensColuna.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.02 }}
                      draggable
                      onDragStart={() => handleDragStart(item)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "p-3 rounded-lg bg-slate-800/80 border border-slate-700/50",
                        "hover:bg-slate-700/80 hover:border-slate-600/50",
                        "cursor-grab active:cursor-grabbing transition-all group",
                        draggedItem?.id === item.id && "opacity-50"
                      )}
                    >
                      {/* Item Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-mono text-sm text-orange-400">{item.codigo}</p>
                          <p className="text-sm text-white truncate max-w-[200px]">
                            {item.descricao || 'Sem descrição'}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                            <DropdownMenuItem className="text-white hover:bg-slate-700">
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-white hover:bg-slate-700">
                              Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Item Footer */}
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Weight className="h-3 w-3" />
                            {((item.peso_unitario || 0) * (item.quantidade || 1)).toFixed(1)} kg
                          </span>
                          <span>×{item.quantidade || 1}</span>
                        </div>
                        {item.prioridade === 'alta' && (
                          <Badge className="bg-red-500/20 text-red-400 text-xs h-5">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Urgente
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {itensColuna.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum item</p>
                  </div>
                )}
              </div>

              {/* Add Button */}
              <div className="p-2 border-t border-slate-700/30">
                <Button
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-white hover:bg-slate-700/50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
