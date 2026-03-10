import React from 'react';
import { Loader2 } from 'lucide-react';

// Skeleton pulse animation
const Pulse = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-700/50 rounded ${className}`} />
);

// Full page loading skeleton
export function PageLoadingSkeleton({ title = 'Carregando...' }) {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Pulse className="h-8 w-48" />
          <Pulse className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Pulse className="h-10 w-24" />
          <Pulse className="h-10 w-32" />
        </div>
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-900/60 rounded-xl border border-slate-700/50 p-5 space-y-3">
            <div className="flex justify-between">
              <Pulse className="h-11 w-11 rounded-xl" />
              <Pulse className="h-4 w-12" />
            </div>
            <Pulse className="h-4 w-24" />
            <Pulse className="h-7 w-32" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-700/50 p-6 space-y-4">
        <div className="flex gap-2">
          <Pulse className="h-10 w-24" />
          <Pulse className="h-10 w-24" />
          <Pulse className="h-10 w-24" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            <Pulse className="h-4 w-16" />
            <Pulse className="h-4 w-48" />
            <Pulse className="h-4 w-24" />
            <Pulse className="h-4 w-20" />
            <Pulse className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* Centered loading indicator */}
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
        <span className="ml-2 text-slate-400 text-sm">{title}</span>
      </div>
    </div>
  );
}

// Inline loading for sections
export function SectionLoadingSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <Pulse className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

// Card grid loading
export function CardGridSkeleton({ cards = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(cards)].map((_, i) => (
        <div key={i} className="bg-slate-900/60 rounded-xl border border-slate-700/50 p-5 space-y-3">
          <Pulse className="h-5 w-32" />
          <Pulse className="h-4 w-48" />
          <Pulse className="h-8 w-full" />
          <div className="flex justify-between">
            <Pulse className="h-4 w-16" />
            <Pulse className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default PageLoadingSkeleton;
