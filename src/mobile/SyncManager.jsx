// ============================================================
// SYNC MANAGER — esvazia a fila de escrita offline ao reconectar
// ============================================================
// Roda dentro do ERPProvider. Ao montar (app aberto online com fila
// pendente) e a cada evento 'online', replica as operações enfileiradas
// chamando os métodos do ERPContext (idempotentes). Remove cada op em
// caso de sucesso; em falha (ainda offline/erro) para e mantém o resto.
// ============================================================
import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useERP } from '@/contexts/ERPContext';
import { getQueue, dequeue, QUEUE_EVENT } from './ui/offlineQueue';

export default function SyncManager() {
  const erp = useERP() || {};
  const flushing = useRef(false);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const q = getQueue();
    if (!q.length) return;

    // Apenas ações idempotentes são enfileiradas (ver offlineQueue.js).
    const methods = {
      moverPecaEtapa: erp.moverPecaEtapa,
      updateExpedicao: erp.updateExpedicao,
    };

    flushing.current = true;
    let done = 0;
    for (const op of q) {
      const fn = methods[op.action];
      if (!fn) { dequeue(op.id); continue; } // ação desconhecida → descarta
      try {
        await fn(...op.args);
        dequeue(op.id);
        done++;
      } catch {
        break; // voltou a falhar (offline/erro) → mantém o restante p/ depois
      }
    }
    flushing.current = false;
    if (done) toast.success(`${done} ação(ões) sincronizada(s)`);
  }, [erp]);

  useEffect(() => {
    flush();
    const onOnline = () => flush();
    const onQueue = () => flush();
    window.addEventListener('online', onOnline);
    window.addEventListener(QUEUE_EVENT, onQueue);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener(QUEUE_EVENT, onQueue);
    };
  }, [flush]);

  return null;
}
