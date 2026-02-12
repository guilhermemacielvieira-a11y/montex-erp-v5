/**
 * MONTEX ERP Premium - Seletor de Obra Global
 *
 * Componente para selecionar a obra ativa em toda a aplicação
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  ChevronDown,
  Check,
  AlertCircle,
  Clock,
  Hammer,
  Truck,
  CheckCircle2,
  Factory
} from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { useObras } from '../../contexts/ERPContext';
import { STATUS_OBRA } from '../../data/database';

const statusConfig = {
  [STATUS_OBRA.ORCAMENTO]: { label: 'Orçamento', color: 'text-gray-400', bg: 'bg-gray-500/20', icon: Clock },
  [STATUS_OBRA.APROVADA]: { label: 'Aprovada', color: 'text-green-400', bg: 'bg-green-500/20', icon: Check },
  [STATUS_OBRA.EM_PROJETO]: { label: 'Em Projeto', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Building2 },
  [STATUS_OBRA.AGUARDANDO_MATERIAL]: { label: 'Aguard. Material', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: AlertCircle },
  [STATUS_OBRA.EM_PRODUCAO]: { label: 'Em Produção', color: 'text-orange-400', bg: 'bg-orange-500/20', icon: Factory },
  [STATUS_OBRA.EM_EXPEDICAO]: { label: 'Em Expedição', color: 'text-cyan-400', bg: 'bg-cyan-500/20', icon: Truck },
  [STATUS_OBRA.EM_MONTAGEM]: { label: 'Em Montagem', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Hammer },
  [STATUS_OBRA.CONCLUIDA]: { label: 'Concluída', color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: CheckCircle2 },
  [STATUS_OBRA.CANCELADA]: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertCircle },
  // Aliases para status do Supabase
  'ativo': { label: 'Em Produção', color: 'text-orange-400', bg: 'bg-orange-500/20', icon: Factory },
  'concluido': { label: 'Concluída', color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: CheckCircle2 },
  'pausado': { label: 'Pausada', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: AlertCircle },
  'cancelado': { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertCircle },
};

export default function SeletorObra({ compact = false }) {
  const { obras, obraAtual, obraAtualData, setObraAtual } = useObras();

  const obrasAtivas = obras.filter(o => o.status !== STATUS_OBRA.CANCELADA);

  const StatusIcon = obraAtualData ? statusConfig[obraAtualData.status]?.icon || Building2 : Building2;
  const statusInfo = obraAtualData ? statusConfig[obraAtualData.status] : null;

  if (compact) {
    return (
      <Select.Root value={obraAtual} onValueChange={setObraAtual}>
        <Select.Trigger className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors outline-none">
          <Building2 className="w-4 h-4 text-orange-400" />
          <Select.Value>
            <span className="text-sm text-white font-medium truncate max-w-[150px]">
              {obraAtualData?.codigo || 'Selecionar'}
            </span>
          </Select.Value>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </Select.Trigger>

        <Select.Portal>
          <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
            <Select.Viewport className="p-2">
              {obrasAtivas.map(obra => {
                const Icon = statusConfig[obra.status]?.icon || Building2;
                return (
                  <Select.Item
                    key={obra.id}
                    value={obra.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-700/50 outline-none data-[highlighted]:bg-slate-700/50"
                  >
                    <Icon className={`w-4 h-4 ${statusConfig[obra.status]?.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">{obra.codigo}</div>
                      <div className="text-xs text-slate-400 truncate">{obra.nome}</div>
                    </div>
                    <Select.ItemIndicator>
                      <Check className="w-4 h-4 text-orange-400" />
                    </Select.ItemIndicator>
                  </Select.Item>
                );
              })}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-xl ${statusInfo?.bg || 'bg-slate-700/50'}`}>
          <StatusIcon className={`w-5 h-5 ${statusInfo?.color || 'text-slate-400'}`} />
        </div>
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Obra Ativa</div>
          <div className={`text-xs font-medium ${statusInfo?.color || 'text-slate-400'}`}>
            {statusInfo?.label || 'Nenhuma'}
          </div>
        </div>
      </div>

      <Select.Root value={obraAtual} onValueChange={setObraAtual}>
        <Select.Trigger className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl hover:bg-slate-800/50 transition-colors outline-none group">
          <div className="flex-1 text-left min-w-0">
            <div className="text-lg font-bold text-white truncate">
              {obraAtualData?.codigo || 'Selecione uma obra'}
            </div>
            <div className="text-sm text-slate-400 truncate">
              {obraAtualData?.nome || 'Nenhuma obra selecionada'}
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
        </Select.Trigger>

        <Select.Portal>
          <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[320px]">
            <Select.Viewport className="p-2 max-h-[400px]">
              {obrasAtivas.map(obra => {
                const Icon = statusConfig[obra.status]?.icon || Building2;
                const info = statusConfig[obra.status];
                const progressoTotal = Object.values(obra.progresso || {}).reduce((a, b) => a + b, 0) / 6;

                return (
                  <Select.Item
                    key={obra.id}
                    value={obra.id}
                    className="flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer hover:bg-slate-700/50 outline-none data-[highlighted]:bg-slate-700/50 mb-1"
                  >
                    <div className={`p-2 rounded-lg ${info?.bg}`}>
                      <Icon className={`w-5 h-5 ${info?.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-white">{obra.codigo}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${info?.bg} ${info?.color}`}>
                          {info?.label}
                        </span>
                      </div>
                      <div className="text-sm text-slate-300 truncate mt-0.5">{obra.nome}</div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span>{(obra.pesoTotal / 1000).toFixed(1)}t</span>
                        <span>•</span>
                        <span>R$ {(obra.valorContrato / 1000000).toFixed(2)}M</span>
                        <span>•</span>
                        <span>{progressoTotal.toFixed(0)}% concluído</span>
                      </div>
                      {/* Barra de progresso */}
                      <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressoTotal}%` }}
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                        />
                      </div>
                    </div>
                    <Select.ItemIndicator className="flex items-center">
                      <Check className="w-5 h-5 text-orange-400" />
                    </Select.ItemIndicator>
                  </Select.Item>
                );
              })}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      {/* Info da obra selecionada */}
      {obraAtualData && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-white">
              {(obraAtualData.pesoTotal / 1000).toFixed(1)}t
            </div>
            <div className="text-xs text-slate-400">Peso Total</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-emerald-400">
              {((obraAtualData.pesoTotal || 0) * ((obraAtualData.progresso?.pintura || 0) / 100) / 1000).toFixed(1)}t
            </div>
            <div className="text-xs text-slate-400">Produzido (Pintado)</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-amber-400">
              {((obraAtualData.pesoTotal || 0) * (Math.max(0, ((obraAtualData.progresso?.corte || 0) - (obraAtualData.progresso?.pintura || 0))) / 100) / 1000).toFixed(1)}t
            </div>
            <div className="text-xs text-slate-400">Em Processo</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-white">
              {Object.values(obraAtualData.progresso || {}).reduce((a, b) => a + b, 0) / 6 | 0}%
            </div>
            <div className="text-xs text-slate-400">Progresso</div>
          </div>
        </div>
      )}
    </div>
  );
}
