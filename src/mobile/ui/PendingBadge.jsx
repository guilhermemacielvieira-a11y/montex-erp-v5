// ============================================================
// DESIGN SYSTEM MOBILE — PendingBadge
// ============================================================
// Mostra quantas ações estão aguardando sincronização (fila offline).
// Atualiza pelo evento da fila e por online/offline. Some quando vazia.
// ============================================================
import React, { useState, useEffect } from 'react';
import { CloudOff } from 'lucide-react';
import { queueSize, QUEUE_EVENT } from './offlineQueue';

export default function PendingBadge() {
  const [n, setN] = useState(() => queueSize());
  useEffect(() => {
    const update = () => setN(queueSize());
    update();
    window.addEventListener(QUEUE_EVENT, update);
    window.addEventListener('online', update);
    return () => {
      window.removeEventListener(QUEUE_EVENT, update);
      window.removeEventListener('online', update);
    };
  }, []);

  if (!n) return null;
  return (
    <span
      className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5 whitespace-nowrap"
      title={`${n} ação(ões) aguardando sincronização`}
    >
      <CloudOff className="w-3 h-3" /> {n}
    </span>
  );
}
