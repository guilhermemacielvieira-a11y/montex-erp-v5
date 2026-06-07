// ============================================================
// DESIGN SYSTEM MOBILE — Guarda de rede para escrita
// ============================================================
// Ações que exigem rede (e não têm fallback local) devem checar antes:
//   if (!ensureOnline()) return;
// Evita request fadado ao fracasso e dá feedback claro no galpão offline.
// (Montagem NÃO usa: degrada para localStorage e sincroniza depois.)
// ============================================================
import { toast } from 'react-hot-toast';

export function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

export function ensureOnline(msg = 'Sem conexão — ação não realizada. Tente quando reconectar.') {
  if (!isOnline()) {
    toast.error(msg);
    return false;
  }
  return true;
}
