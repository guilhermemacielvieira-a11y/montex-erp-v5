// MONTEX ERP Premium - Obra Selector Global Component
// Integrado com ERPContext

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  ChevronDown,
  Check,
  Search,
  MapPin,
  Weight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ERPContext para dados reais
import { useObras } from '../contexts/ERPContext';

// Formatador de peso
const formatWeight = (value) => `${(value / 1000).toFixed(1)} ton`;

export default function ObraSelectorGlobal({
  selectedObra,
  onSelectObra,
  className
}) {
  // Dados reais do contexto
  const { obras } = useObras();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Usar dados reais do contexto
  const projetos = obras;

  const projetosAtivos = projetos.filter(p =>
    ['ativo', 'aprovado', 'em_fabricacao', 'em_montagem'].includes(p.status)
  );

  const projetosFiltrados = projetosAtivos.filter(p =>
    p.nome?.toLowerCase().includes(search.toLowerCase()) ||
    p.cliente?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status) => {
    const colors = {
      ativo: 'bg-green-500',
      aprovado: 'bg-blue-500',
      em_fabricacao: 'bg-orange-500',
      em_montagem: 'bg-emerald-500',
    };
    return colors[status] || 'bg-slate-500';
  };

  const getStatusLabel = (status) => {
    const labels = {
      ativo: 'Ativo',
      aprovado: 'Aprovado',
      em_fabricacao: 'Fabricação',
      em_montagem: 'Montagem',
    };
    return labels[status] || status;
  };

  const obraSelecionada = projetos.find(p => p.id === selectedObra);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl",
            "bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm",
            "hover:bg-slate-700/60 hover:border-slate-600/50 transition-all",
            "text-left min-w-[280px]",
            className
          )}
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Obra Selecionada</p>
            <p className="text-sm font-semibold text-white truncate">
              {obraSelecionada?.nome || 'Selecione uma obra'}
            </p>
          </div>
          <ChevronDown className={cn(
            "h-5 w-5 text-slate-400 transition-transform",
            open && "rotate-180"
          )} />
        </motion.button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[400px] p-0 bg-slate-900 border-slate-700 shadow-2xl"
        align="start"
      >
        {/* Search */}
        <div className="p-3 border-b border-slate-700/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar obra..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Lista de Obras */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          <AnimatePresence>
            {projetosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma obra encontrada</p>
              </div>
            ) : (
              projetosFiltrados.map((projeto, index) => (
                <motion.button
                  key={projeto.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => {
                    onSelectObra(projeto.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-xl text-left",
                    "hover:bg-slate-800/80 transition-colors group",
                    selectedObra === projeto.id && "bg-orange-500/10 border border-orange-500/30"
                  )}
                >
                  {/* Indicator */}
                  <div className={cn(
                    "w-1 h-full min-h-[60px] rounded-full",
                    getStatusColor(projeto.status)
                  )} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-white truncate group-hover:text-orange-400 transition-colors">
                        {projeto.nome}
                      </p>
                      {selectedObra === projeto.id && (
                        <Check className="h-4 w-4 text-orange-500 shrink-0" />
                      )}
                    </div>

                    <p className="text-sm text-slate-400 truncate mb-2">
                      {projeto.cliente}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs border-0",
                          projeto.status === 'ativo' && "bg-green-500/20 text-green-400",
                          projeto.status === 'aprovado' && "bg-blue-500/20 text-blue-400",
                          projeto.status === 'em_fabricacao' && "bg-orange-500/20 text-orange-400",
                          projeto.status === 'em_montagem' && "bg-emerald-500/20 text-emerald-400",
                        )}
                      >
                        {getStatusLabel(projeto.status)}
                      </Badge>

                      {projeto.peso_total && (
                        <span className="flex items-center gap-1">
                          <Weight className="h-3 w-3" />
                          {projeto.peso_total.toLocaleString('pt-BR')} kg
                        </span>
                      )}

                      {projeto.local && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {projeto.local}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700/50 bg-slate-800/50">
          <p className="text-xs text-slate-400 text-center">
            {projetosAtivos.length} obras ativas
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
