// ============================================================
// HistoricoConversas — lista de conversas do Copiloto MONTEX
// ============================================================

import React, { useState } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/** "agora", "há 5 min", "há 2 h", "ontem", "há 3 dias", "12/09". */
export function dataRelativa(iso, agora = new Date()) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const min = Math.floor((agora - d) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  const mesmoDia = d.toDateString() === agora.toDateString();
  if (mesmoDia) return `há ${h} h`;
  const ontem = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return 'ontem';
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioDia = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dias = Math.round((inicioHoje - inicioDia) / 86400000);
  if (dias < 7) return `há ${dias} dias`;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return d.getFullYear() === agora.getFullYear() ? `${dd}/${mm}` : `${dd}/${mm}/${d.getFullYear()}`;
}

export default function HistoricoConversas({ conversas, atualId, onNova, onAbrir, onExcluir, enviando, className }) {
  const [paraExcluir, setParaExcluir] = useState(null);
  const agora = new Date();

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <button
        type="button"
        onClick={onNova}
        disabled={enviando}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nova conversa
      </button>

      <h2 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Histórico</h2>
      {conversas.length === 0 ? (
        <p className="px-1 text-[12px] text-slate-500">Nenhuma conversa ainda. As conversas ficam salvas neste navegador.</p>
      ) : (
        <ul className="-mr-1 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Conversas anteriores">
          {conversas.map((c) => {
            const ativa = c.id === atualId;
            return (
              <li key={c.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onAbrir(c.id)}
                  disabled={enviando && !ativa}
                  aria-current={ativa ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-lg py-2 pl-2.5 pr-9 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50',
                    ativa ? 'bg-slate-800 text-white ring-1 ring-orange-500/40' : 'text-slate-300 hover:bg-slate-800/60',
                  )}
                >
                  <MessageSquare className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', ativa ? 'text-orange-400' : 'text-slate-500')} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px]">{c.titulo || 'Conversa'}</span>
                    <span className="block text-[11px] text-slate-500">{dataRelativa(c.atualizadaEm || c.criadaEm, agora)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setParaExcluir(c)}
                  disabled={enviando && ativa}
                  aria-label={`Excluir conversa ${c.titulo || ''}`}
                  title="Excluir conversa"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 opacity-100 transition-opacity hover:bg-red-500/15 hover:text-red-400 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-30 md:opacity-0 md:group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!paraExcluir} onOpenChange={(v) => { if (!v) setParaExcluir(null); }}>
        <AlertDialogContent className="max-h-[92vh] overflow-y-auto border-slate-700 bg-slate-900 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              “{paraExcluir?.titulo || 'Conversa'}” será removida deste navegador. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => { if (paraExcluir) onExcluir(paraExcluir.id); setParaExcluir(null); }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
