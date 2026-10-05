/**
 * MONTEX ERP Premium - Notification Context
 *
 * Sino de notificações do topo com dados REAIS:
 *  - Persistidas: tabela `notificacoes` (motor de automações, relatórios
 *    agendados etc.) via listarNotificacoes() + realtime (ouvirTabela).
 *    Leitura gravada em `notificacoes_lidas` via marcarLidas() (otimista,
 *    com rollback em erro). "Remover"/"Limpar" só OCULTAM localmente
 *    (nunca apagam do banco) — ids ocultos ficam no localStorage por usuário.
 *  - Locais: avisos efêmeros em memória disparados pelo ERPContext via
 *    window.__notificationDispatch / addNotification (perdem-se ao recarregar).
 *
 * IMPORTANTE: este Provider fica ACIMA do AuthProvider/Router (src/main.jsx),
 * então não pode chamar useAuth() aqui. A identidade do usuário é informada
 * pelo NotificationCenter (que está dentro do AuthProvider) através de
 * `definirUsuario({ id, authId, role })`. Sem usuário → nada é carregado.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { listarNotificacoes, marcarLidas, ouvirTabela } from '@/api/colaboracaoApi';

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

// Severidade persistida → tipo visual + ícone + rótulo
export const SEVERIDADE_VISUAL = {
  critico: { type: NOTIFICATION_TYPES.ERROR, icon: 'AlertTriangle', label: 'Crítico' },
  alto: { type: NOTIFICATION_TYPES.WARNING, icon: 'AlertTriangle', label: 'Alto' },
  medio: { type: NOTIFICATION_TYPES.WARNING, icon: 'Clock', label: 'Médio' },
  info: { type: NOTIFICATION_TYPES.INFO, icon: 'Info', label: 'Info' }
};

const MAX_LOCAIS = 100;
const MAX_OCULTAS = 500;
const chaveOcultas = (uid) => `montex_notif_ocultas_${uid || 'anon'}`;

function lerOcultas(uid) {
  try {
    const raw = localStorage.getItem(chaveOcultas(uid));
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function gravarOcultas(uid, set) {
  try {
    localStorage.setItem(chaveOcultas(uid), JSON.stringify([...set].slice(-MAX_OCULTAS)));
  } catch { /* quota/privado: oculta só nesta sessão */ }
}

/** Notificação persistida (linha do banco) → formato do sino. */
function mapearPersistida(n) {
  const vis = SEVERIDADE_VISUAL[n.severidade] || SEVERIDADE_VISUAL.info;
  return {
    id: `db-${n.id}`,
    dbId: n.id,
    persistida: true,
    type: vis.type,
    icon: vis.icon,
    severidade: n.severidade || 'info',
    severidadeLabel: vis.label,
    title: n.titulo || 'Notificação',
    message: n.mensagem || '',
    link: n.link || null,
    obraId: n.obra_id || null,
    origem: n.origem || null,
    timestamp: n.created_at ? new Date(n.created_at) : new Date(),
    read: !!n.lida
  };
}

/** Destino: destino_role null ou = role do usuário; destino_user null ou = id do usuário. */
function visivelPara(n, usuario) {
  if (n.destino_role && n.destino_role !== usuario.role) return false;
  const du = n.destino_user;
  if (du && du !== usuario.id && du !== usuario.authId) return false;
  return true;
}

// ========================================
// CONTEXTO
// ========================================

const NotificationContext = createContext(null);

// ========================================
// PROVIDER
// ========================================

export function NotificationProvider({ children }) {
  // Avisos locais (efêmeros, em memória)
  const [locais, setLocais] = useState([]);
  // Linhas cruas do banco (sem filtro de destino)
  const [persistidasRaw, setPersistidasRaw] = useState([]);
  // Ids de persistidas lidas de forma otimista (ainda não confirmadas)
  const [lidasOtimistas, setLidasOtimistas] = useState(() => new Set());
  // Ids de persistidas ocultas localmente
  const [ocultas, setOcultas] = useState(() => new Set());
  // Identidade (informada pelo NotificationCenter, que tem acesso ao useAuth)
  const [usuario, setUsuario] = useState(null);

  const uid = usuario?.authId || usuario?.id || null;

  const definirUsuario = useCallback((u) => {
    setUsuario((prev) => {
      const novo = u && (u.id || u.authId) ? { id: u.id || null, authId: u.authId || null, role: u.role || null } : null;
      if (!prev && !novo) return prev;
      if (prev && novo && prev.id === novo.id && prev.authId === novo.authId && prev.role === novo.role) return prev;
      return novo;
    });
  }, []);

  // Carrega ids ocultos do usuário atual
  useEffect(() => {
    setOcultas(uid ? lerOcultas(uid) : new Set());
  }, [uid]);

  // Carga + realtime das persistidas (somente com usuário logado)
  const avisouFalha = useRef(false);
  useEffect(() => {
    if (!uid) {
      setPersistidasRaw([]);
      return undefined;
    }
    let ativo = true;
    let timer = null;

    const carregar = async () => {
      try {
        const lista = await listarNotificacoes({ limite: 100 });
        if (!ativo) return;
        setPersistidasRaw(Array.isArray(lista) ? lista : []);
        avisouFalha.current = false;
      } catch (err) {
        // Sem sessão / RLS / rede: fica vazio, sem toast (evita spam). Loga 1x.
        if (!ativo) return;
        if (!avisouFalha.current) {
          console.warn('[Notificações] não foi possível carregar:', err?.message || err);
          avisouFalha.current = true;
        }
      }
    };

    carregar();

    let desligar = () => {};
    try {
      desligar = ouvirTabela('notificacoes', () => {
        // debounce: rajadas do motor de automações viram 1 recarga
        clearTimeout(timer);
        timer = setTimeout(carregar, 600);
      });
    } catch (err) {
      console.warn('[Notificações] realtime indisponível:', err?.message || err);
    }

    return () => {
      ativo = false;
      clearTimeout(timer);
      try { desligar(); } catch { /* noop */ }
    };
  }, [uid]);

  // Persistidas visíveis para este usuário, já mapeadas
  const persistidas = useMemo(() => {
    if (!usuario) return [];
    return persistidasRaw
      .filter((n) => visivelPara(n, usuario))
      .map(mapearPersistida)
      .filter((n) => !ocultas.has(String(n.dbId)))
      .map((n) => (lidasOtimistas.has(n.dbId) ? { ...n, read: true } : n));
  }, [persistidasRaw, usuario, ocultas, lidasOtimistas]);

  const notifications = useMemo(() => {
    const todas = [...persistidas, ...locais];
    todas.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return todas;
  }, [persistidas, locais]);

  // Ref para os handlers lerem o estado atual sem re-criar callbacks
  const notifsRef = useRef(notifications);
  notifsRef.current = notifications;

  // Add notification (aviso local efêmero)
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      read: false,
      ...notification,
      persistida: false
    };
    setLocais((prev) => [newNotification, ...prev].slice(0, MAX_LOCAIS));
    return newNotification.id;
  }, []);

  // Marca persistidas como lidas (otimista + rollback)
  const marcarPersistidas = useCallback(async (dbIds) => {
    if (!dbIds.length) return;
    setLidasOtimistas((prev) => {
      const s = new Set(prev);
      dbIds.forEach((id) => s.add(id));
      return s;
    });
    try {
      await marcarLidas(dbIds);
      // Confirmado: grava no raw e libera o otimista
      const set = new Set(dbIds);
      setPersistidasRaw((prev) => prev.map((n) => (set.has(n.id) ? { ...n, lida: true } : n)));
    } catch (err) {
      console.warn('[Notificações] falha ao marcar como lida:', err?.message || err);
    } finally {
      // Sucesso: raw já tem lida=true; erro: rollback (volta a não lida)
      setLidasOtimistas((prev) => {
        const s = new Set(prev);
        dbIds.forEach((id) => s.delete(id));
        return s;
      });
    }
  }, []);

  const markAsRead = useCallback((id) => {
    const alvo = notifsRef.current.find((n) => n.id === id);
    if (alvo?.persistida) {
      if (!alvo.read) marcarPersistidas([alvo.dbId]);
      return;
    }
    setLocais((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, [marcarPersistidas]);

  const markAllAsRead = useCallback(() => {
    const ids = notifsRef.current.filter((n) => n.persistida && !n.read).map((n) => n.dbId);
    marcarPersistidas(ids);
    setLocais((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
  }, [marcarPersistidas]);

  const ocultar = useCallback((dbIds) => {
    if (!dbIds.length) return;
    setOcultas((prev) => {
      const s = new Set(prev);
      dbIds.forEach((id) => s.add(String(id)));
      gravarOcultas(uid, s);
      return s;
    });
  }, [uid]);

  // Remove: local some; persistida só é ocultada (não apaga do banco)
  const removeNotification = useCallback((id) => {
    const alvo = notifsRef.current.find((n) => n.id === id);
    if (alvo?.persistida) {
      ocultar([alvo.dbId]);
      return;
    }
    setLocais((prev) => prev.filter((n) => n.id !== id));
  }, [ocultar]);

  const clearAll = useCallback(() => {
    ocultar(notifsRef.current.filter((n) => n.persistida).map((n) => n.dbId));
    setLocais([]);
  }, [ocultar]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  // Agrupa por dia (fuso local)
  const groupedNotifications = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const groups = { today: [], yesterday: [], earlier: [] };

    notifications.forEach((notif) => {
      const d = new Date(notif.timestamp);
      const dia = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      if (dia === today.getTime()) groups.today.push(notif);
      else if (dia === yesterday.getTime()) groups.yesterday.push(notif);
      else groups.earlier.push(notif);
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
    clearAll,
    definirUsuario,
    usuarioNotificacoes: usuario
  }), [notifications, unreadCount, groupedNotifications, addNotification, markAsRead, markAllAsRead, removeNotification, clearAll, definirUsuario, usuario]);

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
