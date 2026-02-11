/**
 * TeamPanel - Painel de equipes/RH mostrando times com produtividade
 *
 * Props:
 *   - equipes: array de { id, nome, membros, setor, produtividade }
 *     membros: array de { id, nome, avatar?, status? }
 *   - variant: 'default' | 'compact' (default: 'default')
 *   - className: classes Tailwind adicionais
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const getInitials = (name) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function TeamPanel({ equipes = [], variant = 'default', className = '' }) {
  const getProdutividadeColor = (prod) => {
    if (prod >= 80) return '#10b981';
    if (prod >= 60) return '#f59e0b';
    return '#ef4444';
  };

  if (equipes.length === 0) {
    return (
      <div
        className={cn(
          'p-4 rounded-xl backdrop-blur-xl bg-slate-900/80 border',
          className
        )}
        style={{
          borderColor: '#22d3ee30',
          boxShadow: '0 0 20px rgba(34,211,238,0.08)'
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-white">EQUIPES</span>
        </div>
        <div className="text-center py-8 text-slate-500 text-sm">
          Nenhuma equipe cadastrada
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'p-4 rounded-lg backdrop-blur-xl bg-slate-900/80 border',
          className
        )}
        style={{
          borderColor: '#22d3ee30',
          boxShadow: '0 0 15px rgba(34,211,238,0.06)'
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">EQUIPES</span>
          </div>
          <span className="text-xs text-slate-400">{equipes.length} equipes</span>
        </div>
        <div className="space-y-1">
          {equipes.slice(0, 3).map((equipe, idx) => (
            <div key={equipe.id || idx} className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 truncate">{equipe.nome}</span>
              <span
                className="font-mono"
                style={{ color: getProdutividadeColor(equipe.produtividade) }}
              >
                {equipe.produtividade}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-xl backdrop-blur-xl bg-slate-900/80 border',
        className
      )}
      style={{
        borderColor: '#22d3ee30',
        boxShadow: '0 0 20px rgba(34,211,238,0.08)'
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-bold text-white">EQUIPES</span>
      </div>

      <div className="space-y-4">
        {equipes.map((equipe, idx) => (
          <motion.div
            key={equipe.id || idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white">{equipe.nome}</h4>
                {equipe.setor && (
                  <p className="text-[10px] text-slate-500">{equipe.setor}</p>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" style={{ color: getProdutividadeColor(equipe.produtividade) }} />
                  <span
                    className="text-sm font-bold font-mono"
                    style={{ color: getProdutividadeColor(equipe.produtividade) }}
                  >
                    {equipe.produtividade}%
                  </span>
                </div>
              </div>
            </div>

            {/* Membros */}
            {equipe.membros && equipe.membros.length > 0 && (
              <div className="flex items-center gap-1.5 mb-3">
                <div className="flex items-center -space-x-1.5">
                  {equipe.membros.slice(0, 4).map((membro, midx) => (
                    <motion.div
                      key={membro.id || midx}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold border border-slate-700 bg-slate-700"
                      style={{
                        backgroundColor: membro.avatar || '#475569',
                        zIndex: 10 - midx,
                      }}
                      whileHover={{ scale: 1.15 }}
                      title={membro.nome}
                    >
                      {getInitials(membro.nome || 'M')}
                    </motion.div>
                  ))}
                  {equipe.membros.length > 4 && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold border border-slate-700 bg-slate-600/60">
                      +{equipe.membros.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">
                  {equipe.membros.length} membro{equipe.membros.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Barra de produtividade */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: getProdutividadeColor(equipe.produtividade) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${equipe.produtividade}%` }}
                  transition={{ delay: idx * 0.05 + 0.2, duration: 0.8 }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
                {equipe.produtividade}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {equipes.length > 5 && (
        <div className="mt-4 pt-4 border-t border-slate-700/30">
          <p className="text-xs text-slate-400 text-center">
            +{equipes.length - 5} equipe{equipes.length - 5 !== 1 ? 's' : ''} não exibida{equipes.length - 5 !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
