import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function PaginationControls({ page, totalPages, totalCount, pageSize, onPrev, onNext, onGoToPage, loading }) {
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalCount);

  if (totalCount === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50 bg-slate-800/50">
      <div className="text-sm text-slate-400">
        Mostrando <span className="font-medium text-slate-200">{from}</span> a{' '}
        <span className="font-medium text-slate-200">{to}</span> de{' '}
        <span className="font-medium text-slate-200">{totalCount}</span> registros
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onGoToPage(0)}
          disabled={page === 0 || loading}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Primeira página"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onPrev}
          disabled={page === 0 || loading}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 py-1 text-sm text-slate-300">
          {page + 1} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1 || loading}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onGoToPage(totalPages - 1)}
          disabled={page >= totalPages - 1 || loading}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Última página"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
