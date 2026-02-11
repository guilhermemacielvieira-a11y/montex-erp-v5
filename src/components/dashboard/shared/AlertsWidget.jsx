/**
 * AlertsWidget - Painel unificado de alertas
 * Substitui: EnhancedAlertsPanel, SmartAlerts (Futurista)
 *
 * Props:
 *   - alerts: array de { id, severity, title, description, timestamp }
 *   - maxItems: número máximo de alertas a exibir (default: 6)
 *   - variant: 'default' | 'hud' (default: 'default')
 *   - className: classes Tailwind adicionais
 */
import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY_CONFIG = {
  critical: { color: '#ef4444', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: AlertCircle },
  warning: { color: '#f59e0b', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', icon: AlertTriangle },
  info: { color: '#22d3ee', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30', icon: Info },
  success: { color: '#10b981', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', icon: CheckCircle },
};

export default function AlertsWidget({ alerts = [], maxItems = 6, variant = 'default', className = '' }) {
  const displayedAlerts = alerts.slice(0, maxItems);
  const severityCounts = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {});

  if (variant === 'hud') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'fixed top-4 right-4 w-96 max-h-96 overflow-y-auto rounded-lg backdrop-blur-xl',
          'bg-slate-900/95 border border-slate-700/50 p-4 z-50',
          className
        )}
      >
        <div className="space-y-2">
          {displayedAlerts.map((alert, idx) => {
            const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
            const Icon = config.icon;
            return (
              <motion.div
                key={alert.id || idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(config.bgColor, config.borderColor, 'border rounded-lg p-3')}
              >
                <div className="flex items-start gap-2">
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: config.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{alert.title}</p>
                    {alert.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{alert.description}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
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
          <AlertCircle className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-white">ALERTAS</span>
          {alerts.length > 0 && (
            <span className="text-xs text-slate-400 ml-2">
              {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
            </span>
          )}
        </div>
        {Object.keys(severityCounts).length > 0 && (
          <div className="flex items-center gap-2">
            {Object.entries(severityCounts).map(([severity, count]) => {
              const config = SEVERITY_CONFIG[severity];
              return (
                <span key={severity} className="text-xs text-slate-400 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                  {count}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {displayedAlerts.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          Nenhum alerta no momento
        </div>
      ) : (
        <div className="space-y-3">
          {displayedAlerts.map((alert, idx) => {
            const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
            const Icon = config.icon;
            return (
              <motion.div
                key={alert.id || idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(config.bgColor, config.borderColor, 'border rounded-lg p-3')}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: config.color }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{alert.title}</p>
                    {alert.description && (
                      <p className="text-xs text-slate-400 mt-1">{alert.description}</p>
                    )}
                    {alert.timestamp && (
                      <p className="text-[10px] text-slate-500 mt-2">
                        {new Date(alert.timestamp).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {alerts.length > maxItems && (
        <div className="mt-4 pt-4 border-t border-slate-700/30">
          <p className="text-xs text-slate-400">
            +{alerts.length - maxItems} {alerts.length - maxItems === 1 ? 'alerta' : 'alertas'} não exibido(s)
          </p>
        </div>
      )}
    </div>
  );
}
