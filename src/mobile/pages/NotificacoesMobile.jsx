// ============================================================
// NOTIFICAÇÕES MOBILE - alertas operacionais derivados dos dados
// ============================================================
// Lista os alertas de useAlertas() (fonte única, compartilhada com o
// badge do sino). Cada card faz deep link para a tela relevante.
// ============================================================
import React from 'react';
import { Link } from 'react-router-dom';
import { BellOff, ChevronRight } from 'lucide-react';
import MobileLayout from '../MobileLayout';
import { useAlertas } from '../useAlertas';

const COLORS = {
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'text-red-400' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-400' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: 'text-emerald-400' },
};

export default function NotificacoesMobile() {
  const notifs = useAlertas();

  return (
    <MobileLayout title="Notificações" back obraFilter>
      {notifs.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <BellOff className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <div className="text-sm font-semibold text-slate-300">Tudo em dia</div>
          <div className="text-xs text-slate-400 mt-1">Sem alertas no momento</div>
        </div>
      ) : (
        <div className="px-4 pt-3 space-y-2">
          {notifs.map(n => {
            const Icon = n.icon; const c = COLORS[n.color] || COLORS.amber;
            return (
              <Link key={n.id} to={n.to} className={`flex items-center gap-3 rounded-2xl border ${c.bg} ${c.border} p-3.5 active:scale-[.99] transition`}>
                <div className={`w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${c.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{n.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">{n.sub}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </MobileLayout>
  );
}
