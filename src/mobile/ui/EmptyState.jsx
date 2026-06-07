// ============================================================
// DESIGN SYSTEM MOBILE — EmptyState
// ============================================================
// Estado vazio padronizado: ícone + título + subtítulo + ação opcional
// (ex.: "Limpar busca"). Unifica o visual de "sem resultados" das telas.
// ============================================================
import React from 'react';

export default function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }) {
  return (
    <div className="text-center py-12 px-6 text-slate-400">
      {Icon && <Icon className="w-12 h-12 mx-auto mb-3 opacity-40" />}
      <div className="text-sm font-semibold text-slate-300">{title}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-semibold text-amber-400 active:scale-95 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
