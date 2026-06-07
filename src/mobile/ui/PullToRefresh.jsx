// ============================================================
// DESIGN SYSTEM MOBILE — PullToRefresh (puxar para atualizar)
// ============================================================
// Gesto nativo de "puxar para atualizar" no topo da lista. No chão de
// fábrica os dados mudam o tempo todo (outros usuários lançam produção/
// montagem); o operador precisa recarregar sem fechar o app.
// É o container de scroll (substitui o overflow do <main>). Chama onRefresh
// quando o usuário puxa além do limiar.
// ============================================================
import React, { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 64;

export default function PullToRefresh({ onRefresh, children }) {
  const scrollerRef = useRef(null);
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e) => {
    const el = scrollerRef.current;
    startY.current = (el && el.scrollTop <= 0 && !refreshing) ? e.touches[0].clientY : null;
  };

  const onTouchMove = (e) => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPull(Math.min(dy * 0.5, 80)); // resistência
    else setPull(0);
  };

  const finish = async () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try { await onRefresh?.(); } catch { /* erro tratado a montante */ }
      setRefreshing(false);
      setPull(0);
    } else {
      setPull(0);
    }
  };

  const idle = startY.current == null;

  return (
    <div
      ref={scrollerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={finish}
      onTouchCancel={finish}
      className="h-full overflow-y-auto overflow-x-hidden overscroll-contain"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Indicador — sua altura empurra o conteúdo para baixo durante o pull */}
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{ height: refreshing ? THRESHOLD : pull, transition: idle ? 'height .22s ease' : 'none' }}
        aria-hidden={pull === 0 && !refreshing}
      >
        <RefreshCw
          className={`w-5 h-5 text-amber-400 ${refreshing ? 'animate-spin' : ''}`}
          style={{ opacity: Math.min((refreshing ? THRESHOLD : pull) / THRESHOLD, 1), transform: refreshing ? 'none' : `rotate(${pull * 3}deg)` }}
        />
      </div>
      {children}
    </div>
  );
}
