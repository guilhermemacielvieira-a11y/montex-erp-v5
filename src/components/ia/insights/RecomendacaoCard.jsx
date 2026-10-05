// ============================================================
// Insights IA — cartão de uma recomendação (status + nota)
// ============================================================

import React, { useEffect, useState } from 'react';
import { CalendarClock, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IMPACTO_UI, PRAZO_UI, STATUS_REC_UI, ORDEM_STATUS_REC, fmtDataHora } from './insightsUi';

export default function RecomendacaoCard({ rec, registro, onStatus, onNota }) {
  const status = registro?.status || 'nova';
  const imp = IMPACTO_UI[rec.impacto] || IMPACTO_UI.medio;
  const prazo = PRAZO_UI[rec.prazo]?.rotulo || rec.prazo || '—';
  const [editando, setEditando] = useState(false);
  const [nota, setNota] = useState(registro?.nota || '');

  useEffect(() => { if (!editando) setNota(registro?.nota || ''); }, [registro?.nota, editando]);

  const salvarNota = () => {
    setEditando(false);
    if ((registro?.nota || '') !== nota.trim()) onNota(nota.trim());
  };

  const esmaecida = status === 'descartada' || status === 'concluida';

  return (
    <article
      className={cn('rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 min-w-0', esmaecida && 'opacity-75')}
      style={{ borderLeft: `4px solid ${imp.cor}` }}
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-md border border-slate-600 bg-slate-800 px-2 py-0.5 font-medium text-slate-200">{rec.area || 'Geral'}</span>
        <span className="inline-flex items-center gap-1 font-medium" style={{ color: imp.cor }}>
          <imp.Icone className="h-3.5 w-3.5" aria-hidden /> {imp.rotulo}
        </span>
        <span className="inline-flex items-center gap-1 text-slate-300">
          <CalendarClock className="h-3.5 w-3.5 text-slate-400" aria-hidden /> Prazo: {prazo}
        </span>
        <span className={cn('ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium', STATUS_REC_UI[status]?.cls)}>
          {STATUS_REC_UI[status]?.rotulo || status}
        </span>
      </div>

      <h4 className={cn('mt-2 text-sm font-semibold text-white', status === 'descartada' && 'line-through decoration-slate-500')}>{rec.titulo}</h4>
      <p className="mt-1 text-sm text-slate-300 whitespace-pre-line">{rec.detalhe}</p>

      {/* Status */}
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={`Status da recomendação: ${rec.titulo}`}>
        {ORDEM_STATUS_REC.map((s) => {
          const ui = STATUS_REC_UI[s];
          const ativo = s === status;
          return (
            <button
              key={s}
              type="button"
              onClick={() => !ativo && onStatus(s)}
              aria-pressed={ativo}
              aria-label={`Marcar como ${ui.rotulo}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
                ativo ? ui.cls : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200',
              )}
            >
              <ui.Icone className="h-3.5 w-3.5" aria-hidden /> {ui.rotulo}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setEditando((v) => !v)}
          aria-expanded={editando}
          aria-label={registro?.nota ? 'Editar nota' : 'Adicionar nota'}
          className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <StickyNote className="h-3.5 w-3.5" aria-hidden /> {registro?.nota ? 'Nota' : 'Adicionar nota'}
        </button>
      </div>

      {editando ? (
        <div className="mt-2">
          <label className="sr-only" htmlFor={`nota-${rec.id}`}>Nota da recomendação</label>
          <textarea
            id={`nota-${rec.id}`}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            onBlur={salvarNota}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) salvarNota(); if (e.key === 'Escape') { setNota(registro?.nota || ''); setEditando(false); } }}
            rows={2}
            autoFocus
            placeholder="Ex.: responsável, decisão tomada, próximo passo… (Ctrl+Enter salva)"
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
      ) : registro?.nota ? (
        <p className="mt-2 rounded-md bg-slate-800/60 px-2 py-1.5 text-xs text-slate-300 whitespace-pre-line">
          <span className="text-slate-500">Nota: </span>{registro.nota}
        </p>
      ) : null}

      {registro?.em && (
        <p className="mt-1.5 text-[11px] text-slate-500">
          Atualizado {fmtDataHora(registro.em)}{registro.por ? ` por ${registro.por}` : ''}
        </p>
      )}
    </article>
  );
}
