/**
 * StatusBar - Barra de status do sistema na base do dashboard
 *
 * Props:
 *   - items: array de { icon: IconComponent, label: string, status: 'online' | 'warning' | 'offline' }
 *   - clock: mostrar relógio em tempo real (default: true)
 *   - className: classes Tailwind adicionais
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { PulseIndicator } from './KPICard';
import { cn } from '@/lib/utils';

export default function StatusBar({ items = [], clock = true, className = '' }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (!clock) return;
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [clock]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'fixed bottom-0 left-0 right-0 p-3 bg-slate-950/95 border-t border-slate-700/50 backdrop-blur-xl',
        'flex items-center justify-between text-xs',
        className
      )}
    >
      {/* Items à esquerda */}
      <div className="flex items-center gap-4">
        {items.length === 0 ? (
          <span className="text-slate-500">Sistema operacional</span>
        ) : (
          items.map((item, idx) => {
            const Icon = item.icon;
            const statusColors = {
              online: '#22c55e',
              warning: '#f59e0b',
              offline: '#ef4444',
            };
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 rounded border border-slate-700/30"
              >
                {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
                <span className="text-slate-400">{item.label}</span>
                <PulseIndicator status={item.status} size={2.5} />
              </motion.div>
            );
          })
        )}
      </div>

      {/* Clock à direita */}
      {clock && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 rounded border border-slate-700/30"
        >
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-slate-300">{formatTime(time)}</span>
        </motion.div>
      )}
    </motion.div>
  );
}
