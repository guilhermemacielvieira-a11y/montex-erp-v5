/**
 * MONTEX ERP Premium - Notification Context
 *
 * Context global para gerenciamento de notificações persistentes
 * com histórico, leitura e categorização
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// ========================================
// TIPOS DE NOTIFICAÇÕES
// ========================================

export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  SUCCESS: 'success',
  ERROR: 'error',
  PRODUCTION: 'production',
  SHIPPING: 'shipping',
  FINANCIAL: 'financial'
};

// ========================================
// CONTEXTO
// ========================================

const NotificationContext = createContext(null);

// ========================================
// MOCK INITIAL NOTIFICATIONS
// ========================================

const createMockNotifications = () => {
  const now = new Date();
  return [
    {
      id: 'notif-1',
      type: NOTIFICATION_TYPES.PRODUCTION,
      title: 'Corte da peça CL-001 concluído',
      message: 'A peça CL-001 passou com sucesso pela etapa de corte e está pronta para montagem.',
      timestamp: new Date(now.getTime() - 5 * 60000), // 5 min ago
      read: false,
      icon: 'Scissors',
      link: '/KanbanCortePage'
    },
    {
      id: 'notif-2',
      type: NOTIFICATION_TYPES.WARNING,
      title: 'Material pendente: Chapa 3/8"',
      message: 'Material com código CH-001 precisa de 2.500 kg e está com entrega prevista para hoje.',
      timestamp: new Date(now.getTime() - 15 * 60000), // 15 min ago
      read: false,
      icon: 'AlertTriangle',
      link: '/EstoquePage'
    },
    {
      id: 'notif-3',
      type: NOTIFICATION_TYPES.SHIPPING,
      title: 'Romaneio #45 expedido para obra SUPER LUNA',
      message: 'Carregamento de 45 peças foi despachado para a obra SUPER LUNA. Prazo de entrega: 2 dias.',
      timestamp: new Date(now.getTime() - 30 * 60000), // 30 min ago
      read: false,
      icon: 'Truck',
      link: '/ExpedicaoIntegrado'
    },
    {
      id: 'notif-4',
      type: NOTIFICATION_TYPES.FINANCIAL,
      title: 'Meta financeira de janeiro atingida',
      message: 'Sua meta financeira foi atingida! Total arrecadado em janeiro: R$ 450.000,00.',
      timestamp: new Date(now.getTime() - 1 * 3600000), // 1 hour ago
      read: true,
      icon: 'DollarSign',
      link: '/MetasFinanceirasPage'
    },
    {
      id: 'notif-5',
      type: NOTIFICATION_TYPES.WARNING,
      title: 'Equipe Alfa com 3 peças atrasadas',
      message: 'A equipe Alfa tem 3 peças em atraso na produção. Revisar cronograma.',
      timestamp: new Date(now.getTime() - 2 * 3600000), // 2 hours ago
      read: true,
      icon: 'AlertTriangle',
      link: '/ProducaoFuncionarioPage'
    },
    {
      id: 'notif-6',
      type: NOTIFICATION_TYPES.INFO,
      title: 'Novo orçamento recebido',
      message: 'Novo orçamento recebido para o projeto "Galpão Industrial" no valor de R$ 1.2M.',
      timestamp: new Date(now.getTime() - 4 * 3600000), // 4 hours ago
      read: true,
      icon: 'Package',
      link: '/OrcamentosPage'
    },
    {
      id: 'notif-7',
      type: NOTIFICATION_TYPES.SUCCESS,
      title: 'Compra PO-2024-001 confirmada',
      message: 'Sua compra de materiais foi confirmada pelo fornecedor. Data de entrega: 03/02/2024.',
      timestamp: new Date(now.getTime() - 6 * 3600000), // 6 hours ago
      read: true,
      icon: 'CheckCircle',
      link: '/EstoquePage'
    },
    {
      id: 'notif-8',
      type: NOTIFICATION_TYPES.PRODUCTION,
      title: 'Peça MN-045 passou na inspeção',
      message: 'Peça MN-045 passou na inspeção final de qualidade. Pronta para expedição.',
      timestamp: new Date(now.getTime() - 1 * 86400000), // 1 day ago
      read: true,
      icon: 'CheckCircle',
      link: '/ProducaoPage'
    },
    {
      id: 'notif-9',
      type: NOTIFICATION_TYPES.FINANCIAL,
      title: 'Fatura #INV-2024-0089 vencida',
      message: 'Fatura para o cliente ACME Corp está vencida há 2 dias. Valor: R$ 15.000,00.',
      timestamp: new Date(now.getTime() - 1 * 86400000), // 1 day ago
      read: true,
      icon: 'AlertTriangle',
      link: '/ReceitasPage'
    },
    {
      id: 'notif-10',
      type: NOTIFICATION_TYPES.INFO,
      title: 'Backup automático concluído',
      message: 'Backup dos dados foi concluído com sucesso. Próximo backup agendado para 06/02/2024.',
      timestamp: new Date(now.getTime() - 2 * 86400000), // 2 days ago
      read: true,
      icon: 'CheckCircle',
      link: null
    }
  ];
};

// ========================================
// PROVIDER
// ========================================

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(createMockNotifications());

  // Add notification
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: `notif-${Date.now()}`,
      timestamp: new Date(),
      read: false,
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 100)); // Keep last 100
    return newNotification.id;
  }, []);

  // Mark single notification as read
  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  // Remove single notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev =>
      prev.filter(n => n.id !== id)
    );
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Get unread count
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Group notifications by time
  const groupedNotifications = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);

    const groups = {
      today: [],
      yesterday: [],
      earlier: []
    };

    notifications.forEach(notif => {
      const notifDate = new Date(notif.timestamp);
      const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());

      if (notifDay.getTime() === today.getTime()) {
        groups.today.push(notif);
      } else if (notifDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(notif);
      } else {
        groups.earlier.push(notif);
      }
    });

    return groups;
  }, [notifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    groupedNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  }), [notifications, unreadCount, groupedNotifications, addNotification, markAsRead, markAllAsRead, removeNotification, clearAll]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// ========================================
// HOOK
// ========================================

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification deve ser usado dentro de um NotificationProvider');
  }
  return context;
}

export default NotificationContext;
