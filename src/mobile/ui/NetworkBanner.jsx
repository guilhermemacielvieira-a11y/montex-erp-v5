// ============================================================
// DESIGN SYSTEM MOBILE — NetworkBanner
// ============================================================
// Barra de aviso quando há problema de rede/dados — evita a "falha
// silenciosa" (tela vazia sem explicação) no galpão com WiFi instável.
//   - Offline (navigator.onLine false): aviso âmbar, dados em cache.
//   - Falha de carga (dataSource === 'error'): aviso vermelho + recarregar.
// ============================================================
import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle, RotateCw } from 'lucide-react';

export default function NetworkBanner({ erro = false }) {
  const [online, setOnline] = useState(typeof navigator === 'undefined' || navigator.onLine !== false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online && !erro) return null;

  if (!online) {
    return (
      <div className="flex-shrink-0 bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-[12px] px-4 py-2 flex items-center gap-2">
        <WifiOff className="w-4 h-4 flex-shrink-0" /> Sem conexão — mostrando dados salvos
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 bg-red-500/15 border-b border-red-500/30 text-red-200 text-[12px] px-4 py-2 flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 min-w-0"><AlertTriangle className="w-4 h-4 flex-shrink-0" /> Falha ao carregar dados</span>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1 font-bold text-red-100 active:opacity-70 flex-shrink-0"
      >
        <RotateCw className="w-3.5 h-3.5" /> Tentar
      </button>
    </div>
  );
}
