/**
 * MONTEX ERP Premium - Notification Center
 *
 * Sino do topo: notificações REAIS (tabela `notificacoes`, via
 * NotificationContext) mescladas com avisos locais efêmeros do ERP.
 * Este componente está dentro do AuthProvider/Router — informa a identidade
 * do usuário ao contexto (que fica acima do AuthProvider em main.jsx).
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  AlertTriangle,
  Info,
  CheckCircle,
  Package,
  Truck,
  DollarSign,
  Users,
  Clock,
  Scissors
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification, SEVERIDADE_VISUAL } from '@/contexts/NotificationContext';
import { useAuth } from '@/lib/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Icon mapping for notification types
const ICON_MAP = {
  Bell,
  Check,
  CheckCheck,
  X,
  AlertTriangle,
  Info,
  CheckCircle,
  Package,
  Truck,
  DollarSign,
  Users,
  Clock,
  Scissors
};

// Notification type colors
const TYPE_CONFIG = {
  info: {
    bg: 'dark:bg-blue-500/10 bg-blue-50',
    border: 'dark:border-blue-500/30 border-blue-200',
    icon: 'text-blue-500 dark:text-blue-400',
    badge: 'dark:bg-blue-500/20 dark:text-blue-300 bg-blue-100 text-blue-700'
  },
  warning: {
    bg: 'dark:bg-yellow-500/10 bg-yellow-50',
    border: 'dark:border-yellow-500/30 border-yellow-200',
    icon: 'text-yellow-500 dark:text-yellow-400',
    badge: 'dark:bg-yellow-500/20 dark:text-yellow-300 bg-yellow-100 text-yellow-700'
  },
  success: {
    bg: 'dark:bg-emerald-500/10 bg-emerald-50',
    border: 'dark:border-emerald-500/30 border-emerald-200',
    icon: 'text-emerald-500 dark:text-emerald-400',
    badge: 'dark:bg-emerald-500/20 dark:text-emerald-300 bg-emerald-100 text-emerald-700'
  },
  error: {
    bg: 'dark:bg-red-500/10 bg-red-50',
    border: 'dark:border-red-500/30 border-red-200',
    icon: 'text-red-500 dark:text-red-400',
    badge: 'dark:bg-red-500/20 dark:text-red-300 bg-red-100 text-red-700'
  },
  production: {
    bg: 'dark:bg-orange-500/10 bg-orange-50',
    border: 'dark:border-orange-500/30 border-orange-200',
    icon: 'text-orange-500 dark:text-orange-400',
    badge: 'dark:bg-orange-500/20 dark:text-orange-300 bg-orange-100 text-orange-700'
  },
  shipping: {
    bg: 'dark:bg-cyan-500/10 bg-cyan-50',
    border: 'dark:border-cyan-500/30 border-cyan-200',
    icon: 'text-cyan-500 dark:text-cyan-400',
    badge: 'dark:bg-cyan-500/20 dark:text-cyan-300 bg-cyan-100 text-cyan-700'
  },
  financial: {
    bg: 'dark:bg-emerald-500/10 bg-emerald-50',
    border: 'dark:border-emerald-500/30 border-emerald-200',
    icon: 'text-emerald-500 dark:text-emerald-400',
    badge: 'dark:bg-emerald-500/20 dark:text-emerald-300 bg-emerald-100 text-emerald-700'
  }
};

// Rótulo legível do tipo (avisos locais) — persistidas usam a severidade
const TYPE_LABEL = {
  info: 'Info',
  warning: 'Atenção',
  success: 'Sucesso',
  error: 'Erro',
  production: 'Produção',
  shipping: 'Expedição',
  financial: 'Financeiro'
};

function tempoRelativo(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

function NotificationItem({ notification, onMarkAsRead, onRemove, onNavigate }) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info;
  const IconComponent = ICON_MAP[notification.icon] || Bell;

  const rotulo = notification.persistida
    ? (notification.severidadeLabel || SEVERIDADE_VISUAL[notification.severidade]?.label || 'Info')
    : (TYPE_LABEL[notification.type] || notification.type || 'Info');
  const dataAbs = (() => {
    const d = new Date(notification.timestamp);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR');
  })();

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    if (notification.link) {
      onNavigate(notification.link);
    }
  };

  return (
    <motion.div
      key={notification.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`border-b last:border-0 transition-all duration-200 ${notification.read ? 'opacity-60' : ''}`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`${notification.read ? '' : 'Não lida: '}${notification.title}${notification.link ? ' — abrir' : ''}`}
        className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {/* Icon Container */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg} border ${config.border}`}>
          <IconComponent className={`h-5 w-5 ${config.icon}`} aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`font-semibold text-sm break-words ${notification.read ? 'dark:text-slate-400 text-slate-500' : 'dark:text-white text-slate-900'}`}>
                  {notification.title}
                </p>
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" aria-hidden="true" />
                )}
              </div>
              <p className="text-sm dark:text-slate-400 text-slate-600 mt-1 line-clamp-2">
                {notification.message}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={config.badge}>
                  {rotulo}
                </Badge>
              </div>
            </div>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0 dark:hover:bg-slate-700 hover:bg-slate-200"
              aria-label={notification.persistida ? 'Ocultar notificação' : 'Remover notificação'}
              title={notification.persistida ? 'Ocultar (não apaga do sistema)' : 'Remover'}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(notification.id);
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-1 mt-2">
            <Clock className="h-3 w-3 dark:text-slate-500 text-slate-400" aria-hidden="true" />
            <time className="text-xs dark:text-slate-500 text-slate-400" dateTime={dataAbs ? new Date(notification.timestamp).toISOString() : undefined} title={dataAbs}>
              {tempoRelativo(notification.timestamp)}
            </time>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NotificationGroup({ title, notifications, onMarkAsRead, onRemove, onNavigate }) {
  if (notifications.length === 0) return null;

  return (
    <div>
      <div className="px-4 py-2 sticky top-0 dark:bg-slate-800/50 bg-slate-100/50 backdrop-blur-sm z-10">
        <p className="text-xs font-semibold dark:text-slate-400 text-slate-600 uppercase tracking-wider">
          {title}
        </p>
      </div>
      <AnimatePresence mode="popLayout">
        {notifications.map((notif) => (
          <NotificationItem
            key={notif.id}
            notification={notif}
            onMarkAsRead={onMarkAsRead}
            onRemove={onRemove}
            onNavigate={onNavigate}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, groupedNotifications, markAsRead, markAllAsRead, removeNotification, clearAll, definirUsuario } = useNotification();
  const [open, setOpen] = React.useState(false);

  // Informa ao contexto quem é o usuário (filtro destino_role/destino_user e
  // gatilho da carga). Sem usuário → contexto não consulta o banco.
  React.useEffect(() => {
    definirUsuario(user ? { id: user.id, authId: user.authId, role: user.role } : null);
  }, [user?.id, user?.authId, user?.role, definirUsuario]);

  const handleNavigate = (link) => {
    if (!link) return;
    setOpen(false);
    const destino = String(link).startsWith('/') ? String(link) : `/${link}`;
    navigate(destino);
  };

  const groupLabels = {
    today: 'Hoje',
    yesterday: 'Ontem',
    earlier: 'Anteriormente'
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          aria-label={unreadCount > 0 ? `Notificações: ${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}` : 'Notificações'}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              aria-hidden="true"
              className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <span className="text-xs font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </motion.div>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[420px] max-w-[calc(100vw-1rem)] p-0 dark:border-slate-700 border-slate-200"
        align="end"
      >
        <Card className="border-0 shadow-2xl dark:bg-slate-800 dark:text-white">
          {/* Header */}
          <CardHeader className="border-b dark:border-slate-700 border-slate-200 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">Notificações</CardTitle>
                {unreadCount > 0 && (
                  <Badge className="dark:bg-orange-500/20 dark:text-orange-300 bg-orange-100 text-orange-700">
                    {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          {/* Content */}
          <CardContent className="p-0">
            <div aria-live="polite" className="max-h-[min(550px,70vh)] overflow-y-auto scrollbar-thin dark:scrollbar-thumb-slate-600 dark:scrollbar-track-slate-800 scrollbar-thumb-slate-300 scrollbar-track-slate-100">
              {notifications.length === 0 ? (
                // Empty State
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-12 text-center"
                >
                  <div className="flex justify-center mb-3">
                    <Bell className="h-12 w-12 dark:text-slate-500 text-slate-300" />
                  </div>
                  <p className="dark:text-slate-400 text-slate-500 text-sm font-medium">
                    Nenhuma notificação
                  </p>
                  <p className="dark:text-slate-500 text-slate-400 text-xs mt-1">
                    Avisos do sistema e das automações aparecem aqui
                  </p>
                </motion.div>
              ) : (
                // Notifications Groups
                <AnimatePresence mode="popLayout">
                  {groupedNotifications.today.length > 0 && (
                    <NotificationGroup
                      key="today"
                      title={groupLabels.today}
                      notifications={groupedNotifications.today}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                      onNavigate={handleNavigate}
                    />
                  )}
                  {groupedNotifications.yesterday.length > 0 && (
                    <NotificationGroup
                      key="yesterday"
                      title={groupLabels.yesterday}
                      notifications={groupedNotifications.yesterday}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                      onNavigate={handleNavigate}
                    />
                  )}
                  {groupedNotifications.earlier.length > 0 && (
                    <NotificationGroup
                      key="earlier"
                      title={groupLabels.earlier}
                      notifications={groupedNotifications.earlier}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                      onNavigate={handleNavigate}
                    />
                  )}
                </AnimatePresence>
              )}
            </div>
          </CardContent>

          {/* Footer Actions */}
          {notifications.length > 0 && (
            <div className="border-t dark:border-slate-700 border-slate-200 p-3 flex gap-2">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={markAllAsRead}
                  className="flex-1 dark:text-slate-300 dark:hover:bg-slate-700 text-slate-600 hover:bg-slate-100 h-8"
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-2" aria-hidden="true" />
                  Marcar todas como lidas
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={clearAll}
                title="Oculta da lista (não apaga do sistema)"
                className="flex-1 dark:text-slate-300 dark:hover:bg-slate-700 text-slate-600 hover:bg-slate-100 h-8"
              >
                <X className="h-3.5 w-3.5 mr-2" aria-hidden="true" />
                Limpar lista
              </Button>
            </div>
          )}
        </Card>
      </PopoverContent>
    </Popover>
  );
}
