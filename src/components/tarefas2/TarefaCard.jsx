import React from 'react';
import { ChevronLeft, ChevronRight, Building2, UserRound, Link2, GripVertical, Loader2 } from 'lucide-react';
import { STATUS_TAREFA } from '@/api/colaboracaoApi';
import { cn } from '@/lib/utils';
import {
  PrioridadeBadge, PrazoInfo, OrigemBadge, BarraProgresso, STATUS_UI, nomeObraDe, depsDe, tagsDe, situacaoPrazo,
} from './tarefasUi';

/** Cartão do Quadro (arrastável + botões mover para teclado/touch). */
export default function TarefaCard({ tarefa, obras, onAbrir, onMover, onDragStart, onDragEnd, arrastando }) {
  const idx = STATUS_TAREFA.indexOf(tarefa.status);
  const anterior = idx > 0 ? STATUS_TAREFA[idx - 1] : null;
  const proximo = idx >= 0 && idx < STATUS_TAREFA.length - 1 ? STATUS_TAREFA[idx + 1] : null;
  const deps = depsDe(tarefa);
  const tags = tagsDe(tarefa);
  const atrasada = situacaoPrazo(tarefa).tipo === 'atrasada';
  const pendente = !!tarefa._pendente;

  return (
    <article
      draggable={!pendente}
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(tarefa.id)); e.dataTransfer.effectAllowed = 'move'; onDragStart?.(tarefa.id); }}
      onDragEnd={() => onDragEnd?.()}
      className={cn(
        'group rounded-lg border bg-slate-900/80 p-3 shadow-sm transition-colors min-w-0',
        atrasada ? 'border-red-500/50' : 'border-slate-700/70',
        'hover:border-slate-500',
        arrastando && 'opacity-40',
        pendente && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-slate-600 group-hover:text-slate-400" aria-hidden />
        <button
          type="button"
          onClick={() => onAbrir?.(tarefa)}
          className="min-w-0 flex-1 text-left text-sm font-medium text-slate-100 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
          aria-label={`Abrir detalhes da tarefa ${tarefa.titulo}`}
        >
          <span className="line-clamp-2 break-words">{tarefa.titulo}</span>
        </button>
        {pendente && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" aria-label="Salvando" />}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PrioridadeBadge prioridade={tarefa.prioridade} />
        <OrigemBadge origem={tarefa.origem} />
      </div>

      <div className="mt-2 space-y-1 text-[11px] text-slate-400">
        <PrazoInfo tarefa={tarefa} />
        <div className="flex items-center gap-1 min-w-0">
          <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{nomeObraDe(obras, tarefa.obra_id)}</span>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{tarefa.responsavel || 'Sem responsável'}</span>
        </div>
        {deps.length > 0 && (
          <div className="flex items-center gap-1">
            <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden /> {deps.length} dependência(s)
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.slice(0, 4).map((t) => (
            <span key={t} className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300">#{t}</span>
          ))}
          {tags.length > 4 && <span className="text-[11px] text-slate-500">+{tags.length - 4}</span>}
        </div>
      )}

      <BarraProgresso valor={tarefa.percentual} className="mt-2" />

      <div className="mt-2 flex items-center justify-between gap-1">
        <button
          type="button"
          disabled={!anterior || pendente}
          onClick={() => onMover?.(tarefa, anterior)}
          className="inline-flex items-center gap-0.5 rounded px-1.5 py-1 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:invisible focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          aria-label={anterior ? `Mover para ${STATUS_UI[anterior].rotulo}` : undefined}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> {anterior ? STATUS_UI[anterior].rotulo : ''}
        </button>
        <button
          type="button"
          disabled={!proximo || pendente}
          onClick={() => onMover?.(tarefa, proximo)}
          className="inline-flex items-center gap-0.5 rounded px-1.5 py-1 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:invisible focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          aria-label={proximo ? `Mover para ${STATUS_UI[proximo].rotulo}` : undefined}
        >
          {proximo ? STATUS_UI[proximo].rotulo : ''} <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </article>
  );
}
