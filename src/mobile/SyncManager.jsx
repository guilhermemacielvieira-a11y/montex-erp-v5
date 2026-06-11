// ============================================================
// SYNC MANAGER — esvazia a fila de escrita offline ao reconectar
// ============================================================
// Roda dentro do ERPProvider. Ao montar (app aberto online com fila
// pendente) e a cada evento 'online', replica as operações enfileiradas
// chamando os métodos do ERPContext (idempotentes).
//
// ROBUSTEZ (PR4):
// • Falha ONLINE não bloqueia a fila: a op falha (markFailed) e o flush
//   SEGUE para a próxima — na 5ª falha a op vai p/ dead-letter (visível
//   em Configurações, com Tentar/Descartar). Antes, um erro permanente
//   (ex.: peça apagada) travava a fila inteira para sempre.
// • OFFLINE no meio do flush → para e mantém o restante (sem consumir
//   tentativas: sem rede não é culpa da op).
// • Backoff exponencial: sobrou item na fila estando online → re-tenta
//   em 5s, 15s, 45s… (teto 5min). Zera ao esvaziar/enfileirar.
// ============================================================
import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useERP } from '@/contexts/ERPContext';
import { getQueue, dequeue, markFailed, QUEUE_EVENT, MAX_ATTEMPTS } from './ui/offlineQueue';
import { logSync } from './ui/syncLog';

const BACKOFF_BASE_MS = 5000;
const BACKOFF_MAX_MS = 5 * 60 * 1000;

export default function SyncManager() {
  const erp = useERP() || {};
  const flushing = useRef(false);
  const timerRef = useRef(null);
  const backoffRef = useRef(0); // nº de flushes seguidos que sobraram itens

  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

  const flush = useCallback(async () => {
    if (flushing.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    clearTimer();
    const q = getQueue();
    if (!q.length) { backoffRef.current = 0; return; }

    // Apenas ações idempotentes são enfileiradas (ver offlineQueue.js).
    const methods = {
      moverPecaEtapa: erp.moverPecaEtapa,
      updateExpedicao: erp.updateExpedicao,
    };

    flushing.current = true;
    let done = 0;
    let mortas = 0;
    for (const op of q) {
      // Caiu offline no meio do flush → para sem consumir tentativas.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) break;
      const fn = methods[op.action];
      if (!fn) { dequeue(op.id); continue; } // ação desconhecida → descarta
      try {
        await fn(...op.args);
        dequeue(op.id);
        logSync(op.label); // registra no histórico de sincronização
        done++;
      } catch (err) {
        // Erro ONLINE: conta tentativa e SEGUE para a próxima op
        // (uma op envenenada não pode travar a fila inteira).
        if (markFailed(op.id, err?.message)) mortas++;
      }
    }
    flushing.current = false;

    if (done) toast.success(`${done} ação(ões) sincronizada(s)`);
    if (mortas) toast.error(`${mortas} ação(ões) falhou(aram) ${MAX_ATTEMPTS}x — revise em Configurações`, { duration: 6000 });

    // Sobrou item (falhas transitórias) estando online → re-tenta com backoff.
    const resto = getQueue().length;
    if (resto > 0 && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
      backoffRef.current += 1;
      const delay = Math.min(BACKOFF_BASE_MS * Math.pow(3, backoffRef.current - 1), BACKOFF_MAX_MS);
      timerRef.current = setTimeout(() => { timerRef.current = null; flush(); }, delay);
    } else {
      backoffRef.current = 0;
    }
  }, [erp]);

  useEffect(() => {
    flush();
    const onOnline = () => { backoffRef.current = 0; flush(); };
    const onQueue = () => flush();
    window.addEventListener('online', onOnline);
    window.addEventListener(QUEUE_EVENT, onQueue);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener(QUEUE_EVENT, onQueue);
      clearTimer();
    };
  }, [flush]);

  return null;
}
