// ============================================================
// DESIGN SYSTEM MOBILE — InstallPrompt (Adicionar à Tela de Início)
// ============================================================
// iOS não mostra prompt automático de instalação de PWA. Este banner
// guia o operador a instalar o app (Compartilhar → Adicionar à Tela de
// Início), aparecendo só no iOS Safari ainda não instalado, dispensável
// (lembra a escolha). Para testar fora do iOS: localStorage
// montex_a2hs_force='1'.
// ============================================================
import React, { useState, useEffect } from 'react';
import { Share, X, Plus } from 'lucide-react';

const LS_DISMISS = 'montex_a2hs_dismissed';

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
}
function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false, force = false;
    try { dismissed = localStorage.getItem(LS_DISMISS) === '1'; } catch { /* noop */ }
    try { force = localStorage.getItem('montex_a2hs_force') === '1'; } catch { /* noop */ }
    if (force || (isIOS() && !isStandalone() && !dismissed)) {
      const t = setTimeout(() => setShow(true), 1200); // não atrapalha o carregamento
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(LS_DISMISS, '1'); } catch { /* noop */ }
    setShow(false);
  };

  if (!show) return null;
  return (
    <div className="fixed left-0 right-0 z-40 px-3" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3 shadow-xl shadow-black/40 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 flex-shrink-0">M</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">Instale o MONTEX</div>
          <div className="text-[12px] text-slate-300 mt-0.5 leading-snug">
            Toque em <Share className="inline w-3.5 h-3.5 -mt-0.5 text-blue-400" /> Compartilhar e em <span className="font-semibold text-slate-100">"Adicionar à Tela de Início"</span> <Plus className="inline w-3.5 h-3.5 -mt-0.5" />.
          </div>
        </div>
        <button onClick={dismiss} aria-label="Dispensar" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 active:bg-slate-700 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
