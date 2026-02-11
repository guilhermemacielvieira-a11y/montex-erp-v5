/**
 * MachineStatusGrid - Grid mostrando status das máquinas
 *
 * Props:
 *   - machines: array de { id, nome, status, eficiencia }
 *     status: 'operando' | 'standby' | 'manutencao' | 'offline'
 *   - variant: 'default' | 'compact' (default: 'default')
 *   - className: classes Tailwind adicionais
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, AlertCircle } from 'lucide-react';
import { PulseIndicator } from './KPICard';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  operando: { color: '#10b981', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', label: 'Operando' },
  standby: { color: '#f59e0b', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', label: 'Standby' },
  manutencao: { color: '#f59e0b', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', label: 'Manutenção' },
  offline: { color: '#ef4444', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', label: 'Offline' },
};

export default function MachineStatusGrid({ machines = [], variant = 'default', className = '' }) {
  const operando = machines.filter(m => m.status === 'operando').length;
  const total = machines.length;

  if (machines.length === 0) {
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
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-white">MÁQUINAS</span>
        </div>
        <div className="text-center py-8 text-slate-500 text-sm">
          Nenhuma máquina cadastrada
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">MÁQUINAS</span>
          </div>
          <span className="text-xs font-mono text-emerald-400">
            {operando}/{total} operando
          </span>
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-white">MÁQUINAS</span>
        </div>
        <span className="text-xs font-mono text-emerald-400">
          {operando}/{total} operando
        </span>
      </div>

      {/* Status overview */}
      <div className="flex gap-2 mb-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = machines.filter(m => m.status === status).length;
          return (
            <div
              key={status}
              className="text-center flex-1 p-2 rounded bg-slate-800/40"
            >
              <div className="text-xs font-mono" style={{ color: config.color }}>
                {count}
              </div>
              <div className="text-[9px] text-slate-500">{config.label}</div>
            </div>
          );
        })}
      </div>

      {/* Grid de máquinas */}
      <div className="grid grid-cols-2 gap-2">
        {machines.map((machine, idx) => {
          const config = STATUS_CONFIG[machine.status] || STATUS_CONFIG.offline;
          return (
            <motion.div
              key={machine.id || idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(config.bgColor, config.borderColor, 'border rounded-lg p-3')}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-semibold text-white truncate">
                  {machine.nome || `Máquina ${idx + 1}`}
                </span>
                <PulseIndicator status={machine.status} size={2.5} />
              </div>

              {machine.eficiencia !== undefined && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-slate-400">Eficiência</span>
                    <span
                      className="text-[9px] font-mono"
                      style={{ color: config.color }}
                    >
                      {machine.eficiencia}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full"
                      style={{ backgroundColor: config.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${machine.eficiencia}%` }}
                      transition={{ delay: idx * 0.05 + 0.2, duration: 0.6 }}
                    />
                  </div>
                </div>
              )}

              <div className="text-[9px] text-slate-500 mt-2">
                {config.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Alertas se houver offline */}
      {machines.filter(m => m.status === 'offline').length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700/30 flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-[10px] text-red-300">
            {machines.filter(m => m.status === 'offline').length} máquina(s) offline
          </span>
        </div>
      )}
    </div>
  );
}
