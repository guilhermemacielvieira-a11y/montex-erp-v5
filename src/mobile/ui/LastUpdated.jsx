// ============================================================
// DESIGN SYSTEM MOBILE — LastUpdated
// ============================================================
// Mostra "atualizado há X" no header. Lê o timestamp salvo
// (lastRefresh) e reavalia a cada 30s. O `tick` força releitura
// imediata após um pull-to-refresh.
// ============================================================
import React, { useState, useEffect } from 'react';
import { getLastRefresh, formatRelative } from './lastRefresh';

export default function LastUpdated({ tick = 0 }) {
  const [, bump] = useState(0);
  useEffect(() => {
    const t = setInterval(() => bump(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const ts = getLastRefresh();
  if (!ts) return null;
  // `tick` participa do render (releitura imediata após refresh)
  void tick;
  return (
    <span className="text-[10px] text-slate-400 whitespace-nowrap leading-none">{formatRelative(ts)}</span>
  );
}
