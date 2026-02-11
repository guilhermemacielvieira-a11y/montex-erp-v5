/**
 * ObraProgressWidget - Progresso por obra com 6 etapas de produção
 * Extraído do DashboardERPIntegrado - mostra barras por etapa (corte, fab, solda, pintura, exp, montagem)
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';

const ETAPA_COLORS = {
  corte: '#ef4444',
  fabricacao: '#3b82f6',
  solda: '#8b5cf6',
  pintura: '#ec4899',
  expedicao: '#06b6d4',
  montagem: '#10b981',
};

const ETAPA_LABELS = {
  corte: 'Corte',
  fabricacao: 'Fabricação',
  solda: 'Solda',
  pintura: 'Pintura',
  expedicao: 'Expedição',
  montagem: 'Montagem',
};

export default function ObraProgressWidget({ obras = [], maxItems = 4, className = '' }) {
  if (obras.length === 0) return null;

  return (
    <div className={`p-4 rounded-xl backdrop-blur-xl bg-slate-900/80 border border-cyan-500/20 ${className}`}
      style={{ boxShadow: '0 0 20px rgba(34,211,238,0.08)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-bold text-white">PROGRESSO POR OBRA</span>
      </div>

      <div className="space-y-4">
        {obras.slice(0, maxItems).map((obra, idx) => {
          const progresso = obra.progresso || {};
          const total = Object.values(progresso).reduce((a, b) => a + (b || 0), 0) / 6;

          return (
            <motion.div
              key={obra.codigo || idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white">{obra.codigo || obra.nome || `Obra ${idx + 1}`}</span>
                <span className="text-[10px] text-slate-400">{obra.cliente}</span>
                <span className="text-xs font-mono text-cyan-400">{Math.round(total)}%</span>
              </div>
              <div className="space-y-1">
                {Object.entries(ETAPA_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 w-16 truncate">{label}</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: ETAPA_COLORS[key] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progresso[key] || 0}%` }}
                        transition={{ delay: idx * 0.1 + 0.2, duration: 0.8 }}
                      />
                    </div>
                    <span className="text-[9px] font-mono w-8 text-right" style={{ color: ETAPA_COLORS[key] }}>
                      {progresso[key] || 0}%
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-700/30">
        {Object.entries(ETAPA_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded" style={{ backgroundColor: ETAPA_COLORS[key] }} />
            <span className="text-[9px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
