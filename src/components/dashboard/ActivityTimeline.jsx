import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Package,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const activityIcons = {
  projeto: Building2,
  orcamento: FileText,
  producao: Package,
  financeiro: DollarSign,
  aprovacao: CheckCircle2,
  alerta: AlertTriangle,
  tarefa: Clock,
  usuario: User,
};

const activityColors = {
  projeto: 'from-blue-500 to-cyan-500',
  orcamento: 'from-orange-500 to-amber-500',
  producao: 'from-emerald-500 to-green-500',
  financeiro: 'from-purple-500 to-pink-500',
  aprovacao: 'from-green-500 to-emerald-500',
  alerta: 'from-red-500 to-orange-500',
  tarefa: 'from-indigo-500 to-purple-500',
  usuario: 'from-slate-500 to-slate-600',
};

export default function ActivityTimeline({ activities = [] }) {
  // Mock activities for demonstration
  const mockActivities = [
    {
      id: 1,
      type: 'projeto',
      title: 'Novo projeto criado',
      description: 'Shopping Center Aurora - 1.250 ton',
      user: 'Carlos Silva',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
    },
    {
      id: 2,
      type: 'aprovacao',
      title: 'Orçamento aprovado',
      description: 'Galpão Industrial Metalfrio - R$ 2.8M',
      user: 'Maria Santos',
      timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 min ago
    },
    {
      id: 3,
      type: 'producao',
      title: 'Produção atualizada',
      description: 'Lote #1247 - 85% concluído',
      user: 'João Pereira',
      timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2h ago
    },
    {
      id: 4,
      type: 'financeiro',
      title: 'Pagamento recebido',
      description: 'Medição #3 - Supermercado Atacadão',
      user: 'Sistema',
      timestamp: new Date(Date.now() - 1000 * 60 * 180), // 3h ago
    },
    {
      id: 5,
      type: 'alerta',
      title: 'Prazo próximo',
      description: 'Entrega Fase 2 - Centro Logístico em 5 dias',
      user: 'Sistema',
      timestamp: new Date(Date.now() - 1000 * 60 * 240), // 4h ago
    },
  ];

  const displayActivities = activities.length > 0 ? activities : mockActivities;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Atividades Recentes</h3>
            <p className="text-sm text-slate-400">Últimas atualizações do sistema</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-sm text-orange-400 hover:text-orange-300 font-medium"
          >
            Ver todas
          </motion.button>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4 space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
        {displayActivities.map((activity, index) => {
          const Icon = activityIcons[activity.type] || Clock;
          const gradient = activityColors[activity.type] || 'from-slate-500 to-slate-600';

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex gap-4 p-3 rounded-xl hover:bg-slate-800/50 transition-colors group"
            >
              {/* Timeline Line */}
              {index < displayActivities.length - 1 && (
                <div className="absolute left-[27px] top-14 w-0.5 h-[calc(100%-20px)] bg-gradient-to-b from-slate-700 to-transparent" />
              )}

              {/* Icon */}
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
                `bg-gradient-to-br ${gradient}`
              )}>
                <Icon className="h-5 w-5 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-orange-400 transition-colors">
                      {activity.title}
                    </p>
                    <p className="text-sm text-slate-400 truncate">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDistanceToNow(activity.timestamp, {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  por {activity.user}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </motion.div>
  );
}
