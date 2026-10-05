import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, ChevronRight } from 'lucide-react';
import { GATILHOS } from '@/api/colaboracaoApi';
import { MODELOS } from './automacoesUtils';

/** Lista de modelos prontos; ao escolher, abre o editor pré-preenchido. */
export default function ModelosDialog({ open, onOpenChange, onEscolher }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-yellow-400" aria-hidden />Modelos prontos</DialogTitle>
          <DialogDescription className="text-slate-400">Escolha um ponto de partida. Você revisa e ajusta tudo antes de salvar.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {MODELOS.map((m) => (
            <li key={m.chave}>
              <button type="button" onClick={() => onEscolher(m.dados)}
                className="w-full text-left rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-blue-500/60 p-3 flex items-center gap-3 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-100">{m.titulo}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{m.resumo}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Gatilho: {GATILHOS[m.dados.gatilho]?.rotulo} · {GATILHOS[m.dados.gatilho]?.area}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
