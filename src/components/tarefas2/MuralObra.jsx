import React from 'react';
import { MessagesSquare, MapPin } from 'lucide-react';
import ChatMensagens from './ChatMensagens';
import { nomeObraDe } from './tarefasUi';

/** Mural da obra: só existe quando o topo está em UMA obra (obraAtual). */
export default function MuralObra({ obraAtual, obras, autorNome }) {
  if (!obraAtual) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-12 text-center">
        <MapPin className="h-8 w-8 text-slate-500" aria-hidden />
        <p className="text-sm font-medium text-slate-200">Escolha uma obra no topo para ver o mural</p>
        <p className="max-w-md text-xs text-slate-400">O mural reúne os recados e anexos de uma obra. Use o seletor de obra no topo da tela (Geral e grupos mostram várias obras).</p>
      </div>
    );
  }
  return (
    <section aria-label="Mural da obra" className="space-y-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 md:p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        <MessagesSquare className="h-4 w-4 text-sky-400" aria-hidden /> Mural — {nomeObraDe(obras, obraAtual)}
      </h2>
      <ChatMensagens key={obraAtual} obraId={obraAtual} autorNome={autorNome} permitirAnexo vazio="Nenhum recado no mural desta obra ainda." alturaMax="max-h-[60vh]" />
    </section>
  );
}
