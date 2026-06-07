// ============================================================
// DESIGN SYSTEM MOBILE — Skeleton (estado de carregamento)
// ============================================================
// Placeholder shimmer enquanto os dados do ERP carregam (Supabase).
// Evita a tela aparecer "vazia/zerada" em rede lenta de galpão/canteiro.
// ============================================================
import React from 'react';

export function SkeletonBox({ className = '' }) {
  return <div className={`animate-pulse bg-slate-800 rounded-xl ${className}`} />;
}

// Esqueleto genérico de página: barra + grade de cards + linhas de lista.
export default function MobilePageSkeleton() {
  return (
    <div className="px-4 pt-4" aria-busy="true" aria-label="Carregando">
      <SkeletonBox className="h-4 w-32 mb-3" />
      <SkeletonBox className="h-7 w-48 mb-5" />
      <div className="grid grid-cols-2 gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} className="h-24" />)}
      </div>
      <SkeletonBox className="h-4 w-24 mb-3" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonBox key={i} className="h-16" />)}
      </div>
    </div>
  );
}
