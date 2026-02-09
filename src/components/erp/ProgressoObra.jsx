/**
 * MONTEX ERP Premium - Progresso da Obra
 *
 * Visualização do progresso em todas as etapas
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Scissors,
  Wrench,
  Zap,
  Paintbrush,
  Truck,
  Building2
} from 'lucide-react';
import { useObras } from '../../contexts/ERPContext';

const etapasConfig = [
  { key: 'corte', label: 'Corte', icon: Scissors, color: 'from-red-500 to-orange-500' },
  { key: 'fabricacao', label: 'Fabricação', icon: Wrench, color: 'from-blue-500 to-cyan-500' },
  { key: 'solda', label: 'Solda', icon: Zap, color: 'from-purple-500 to-pink-500' },
  { key: 'pintura', label: 'Pintura', icon: Paintbrush, color: 'from-pink-500 to-rose-500' },
  { key: 'expedicao', label: 'Expedição', icon: Truck, color: 'from-cyan-500 to-teal-500' },
  { key: 'montagem', label: 'Montagem', icon: Building2, color: 'from-emerald-500 to-green-500' }
];

export default function ProgressoObra({ compact = false }) {
  const { obraAtualData } = useObras();

  if (!obraAtualData) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 text-center text-slate-500">
        Selecione uma obra para ver o progresso
      </div>
    );
  }

  const progresso = obraAtualData.progresso || {};

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {etapasConfig.map(etapa => {
          const valor = progresso[etapa.key] || 0;
          const Icon = etapa.icon;
          return (
            <div
              key={etapa.key}
              className="relative group"
              title={`${etapa.label}: ${valor}%`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${valor > 0 ? 'bg-slate-700' : 'bg-slate-800/50'}`}>
                <Icon className={`w-4 h-4 ${valor >= 100 ? 'text-emerald-400' : valor > 0 ? 'text-slate-300' : 'text-slate-600'}`} />
              </div>
              {valor > 0 && valor < 100 && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-b-lg"
                  style={{ width: `${valor}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Progresso da Produção</h3>
        <span className="text-xs text-slate-400">{obraAtualData.codigo}</span>
      </div>

      <div className="space-y-4">
        {etapasConfig.map((etapa, idx) => {
          const valor = progresso[etapa.key] || 0;
          const Icon = etapa.icon;

          return (
            <div key={etapa.key} className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br ${etapa.color} bg-opacity-20`}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm text-slate-300">{etapa.label}</span>
                </div>
                <span className={`text-sm font-bold ${valor >= 100 ? 'text-emerald-400' : 'text-white'}`}>
                  {valor}%
                </span>
              </div>

              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${valor}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                  className={`h-full bg-gradient-to-r ${etapa.color} rounded-full`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Progresso total */}
      <div className="mt-5 pt-4 border-t border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Progresso Total</span>
          <span className="text-lg font-bold text-white">
            {Math.round(Object.values(progresso).reduce((a, b) => a + b, 0) / 6)}%
          </span>
        </div>
        <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Object.values(progresso).reduce((a, b) => a + b, 0) / 6}%` }}
            transition={{ duration: 1 }}
            className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
