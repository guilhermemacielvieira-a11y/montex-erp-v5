/**
 * MONTEX ERP Premium - Sistema de Notificações
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { useERP } from '../../contexts/ERPContext';

const tipoConfig = {
  sucesso: {
    icon: CheckCircle2,
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/50',
    iconColor: 'text-emerald-400',
    textColor: 'text-emerald-100'
  },
  erro: {
    icon: AlertCircle,
    bg: 'bg-red-500/20',
    border: 'border-red-500/50',
    iconColor: 'text-red-400',
    textColor: 'text-red-100'
  },
  aviso: {
    icon: AlertTriangle,
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/50',
    iconColor: 'text-yellow-400',
    textColor: 'text-yellow-100'
  },
  info: {
    icon: Info,
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/50',
    iconColor: 'text-blue-400',
    textColor: 'text-blue-100'
  }
};

export default function Notificacoes() {
  const { notificacoes, removeNotificacao } = useERP();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
      <AnimatePresence mode="popLayout">
        {notificacoes.map(notif => {
          const config = tipoConfig[notif.tipo] || tipoConfig.info;
          const Icon = config.icon;

          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              className={`${config.bg} ${config.border} border backdrop-blur-xl rounded-xl p-4 shadow-2xl flex items-start gap-3`}
            >
              <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
              <p className={`${config.textColor} text-sm flex-1`}>{notif.mensagem}</p>
              <button
                onClick={() => removeNotificacao(notif.id)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
