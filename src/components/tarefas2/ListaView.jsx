import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, Trash2, X } from 'lucide-react';
import { STATUS_TAREFA } from '@/api/colaboracaoApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  StatusBadge, PrioridadeBadge, PrazoInfo, OrigemBadge, BarraProgresso, STATUS_UI, PRIORIDADE_UI,
  nomeObraDe, CLS_TRIGGER, CLS_CONTENT, CLS_ITEM, CLS_BTN, CLS_BTN_PRIM, CLS_BTN_PERIGO,
} from './tarefasUi';

const POR_PAGINA = 100;

const COLUNAS = [
  { chave: 'titulo', rotulo: 'Tarefa' },
  { chave: 'obra', rotulo: 'Obra', cls: 'hidden lg:table-cell' },
  { chave: 'responsavel', rotulo: 'Responsável', cls: 'hidden md:table-cell' },
  { chave: 'prioridade', rotulo: 'Prioridade', cls: 'hidden sm:table-cell' },
  { chave: 'status', rotulo: 'Status' },
  { chave: 'data_fim', rotulo: 'Prazo', cls: 'hidden md:table-cell' },
  { chave: 'percentual', rotulo: '%', cls: 'hidden xl:table-cell' },
];

export default function ListaView({ tarefas, obras, onAbrir, atualizarVarias, excluirVarias }) {
  const [ordem, setOrdem] = useState({ chave: 'data_fim', asc: true });
  const [selecao, setSelecao] = useState(() => new Set());
  const [limite, setLimite] = useState(POR_PAGINA);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  // Seleção só de tarefas ainda visíveis
  useEffect(() => {
    setSelecao((prev) => {
      const ids = new Set(tarefas.map((t) => t.id));
      const prox = new Set([...prev].filter((id) => ids.has(id)));
      return prox.size === prev.size ? prev : prox;
    });
  }, [tarefas]);

  const ordenadas = useMemo(() => {
    const { chave, asc } = ordem;
    const val = (t) => {
      switch (chave) {
        case 'obra': return nomeObraDe(obras, t.obra_id).toLowerCase();
        case 'prioridade': return PRIORIDADE_UI[t.prioridade]?.peso ?? 1;
        case 'status': return STATUS_TAREFA.indexOf(t.status);
        case 'percentual': return Number(t.percentual) || 0;
        case 'data_fim': return t.data_fim ? String(t.data_fim).slice(0, 10) : null;
        default: return String(t[chave] || '').toLowerCase();
      }
    };
    return [...tarefas].sort((a, b) => {
      const va = val(a); const vb = val(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1; // vazios sempre no fim
      if (vb === null) return -1;
      const r = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt-BR');
      return asc ? r : -r;
    });
  }, [tarefas, ordem, obras]);

  const visiveis = ordenadas.slice(0, limite);
  const todasMarcadas = visiveis.length > 0 && visiveis.every((t) => selecao.has(t.id));

  const alternar = (id) => setSelecao((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const alternarTodas = () => setSelecao(todasMarcadas ? new Set() : new Set(visiveis.map((t) => t.id)));
  const ordenarPor = (chave) => setOrdem((o) => (o.chave === chave ? { chave, asc: !o.asc } : { chave, asc: true }));

  const ids = [...selecao].filter((id) => !String(id).startsWith('tmp-'));

  const emMassa = async (fn) => {
    setOcupado(true);
    try { await fn(); setSelecao(new Set()); } finally { setOcupado(false); }
  };

  return (
    <div className="space-y-2">
      {selecao.size > 0 && (
        <div role="toolbar" aria-label="Ações em massa" className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2">
          <span className="text-xs font-medium text-sky-100">{selecao.size} selecionada(s)</span>
          <button type="button" className={CLS_BTN_PRIM} disabled={ocupado || !ids.length}
            onClick={() => emMassa(() => atualizarVarias(ids, { status: 'concluida' }))}>
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Concluir
          </button>
          <div className="w-44">
            <Select value="mudar" onValueChange={(v) => { if (v !== 'mudar') emMassa(() => atualizarVarias(ids, { status: v })); }} disabled={ocupado || !ids.length}>
              <SelectTrigger className={CLS_TRIGGER} aria-label="Mudar status das selecionadas"><SelectValue /></SelectTrigger>
              <SelectContent className={CLS_CONTENT}>
                <SelectItem value="mudar" className={CLS_ITEM} disabled>Mudar status para…</SelectItem>
                {STATUS_TAREFA.map((s) => <SelectItem key={s} value={s} className={CLS_ITEM}>{STATUS_UI[s].rotulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <button type="button" className={CLS_BTN_PERIGO} disabled={ocupado || !ids.length} onClick={() => setConfirmarExcluir(true)}>
            <Trash2 className="h-4 w-4" aria-hidden /> Excluir
          </button>
          <button type="button" className={cn(CLS_BTN, 'ml-auto')} onClick={() => setSelecao(new Set())}>
            <X className="h-4 w-4" aria-hidden /> Limpar seleção
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/40">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-700/60 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th scope="col" className="w-10 px-3 py-2">
                <input type="checkbox" checked={todasMarcadas} onChange={alternarTodas} aria-label="Selecionar todas as visíveis" className="h-4 w-4 accent-sky-500" />
              </th>
              {COLUNAS.map((c) => {
                const ativa = ordem.chave === c.chave;
                const Ic = ativa ? (ordem.asc ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th key={c.chave} scope="col" className={cn('px-3 py-2 font-medium', c.cls)}
                    aria-sort={ativa ? (ordem.asc ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" onClick={() => ordenarPor(c.chave)}
                      className="inline-flex items-center gap-1 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded">
                      {c.rotulo} <Ic className={cn('h-3 w-3', ativa ? 'text-sky-300' : 'text-slate-600')} aria-hidden />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {visiveis.map((t) => (
              <tr key={t.id} className={cn('hover:bg-slate-800/50', selecao.has(t.id) && 'bg-sky-500/5')}>
                <td className="px-3 py-2 align-top">
                  <input type="checkbox" checked={selecao.has(t.id)} onChange={() => alternar(t.id)}
                    aria-label={`Selecionar ${t.titulo}`} className="h-4 w-4 accent-sky-500" />
                </td>
                <td className="max-w-[320px] px-3 py-2 align-top">
                  <button type="button" onClick={() => onAbrir(t)}
                    className="text-left font-medium text-slate-100 hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded">
                    <span className="line-clamp-2 break-words">{t.titulo}</span>
                  </button>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <OrigemBadge origem={t.origem} />
                    <span className="lg:hidden text-[11px] text-slate-500 truncate">{nomeObraDe(obras, t.obra_id)}</span>
                  </div>
                </td>
                <td className="hidden max-w-[200px] truncate px-3 py-2 align-top text-slate-300 lg:table-cell">{nomeObraDe(obras, t.obra_id)}</td>
                <td className="hidden max-w-[160px] truncate px-3 py-2 align-top text-slate-300 md:table-cell">{t.responsavel || '—'}</td>
                <td className="hidden px-3 py-2 align-top sm:table-cell"><PrioridadeBadge prioridade={t.prioridade} /></td>
                <td className="px-3 py-2 align-top"><StatusBadge status={t.status} /></td>
                <td className="hidden px-3 py-2 align-top md:table-cell"><PrazoInfo tarefa={t} /></td>
                <td className="hidden w-32 px-3 py-2 align-top xl:table-cell"><BarraProgresso valor={t.percentual} /></td>
              </tr>
            ))}
            {visiveis.length === 0 && (
              <tr><td colSpan={COLUNAS.length + 1} className="px-3 py-8 text-center text-slate-500">Nenhuma tarefa com os filtros atuais.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {ordenadas.length > limite && (
        <div className="flex justify-center">
          <button type="button" className={CLS_BTN} onClick={() => setLimite((l) => l + POR_PAGINA)}>
            Mostrar mais ({ordenadas.length - limite} restantes)
          </button>
        </div>
      )}

      <AlertDialog open={confirmarExcluir} onOpenChange={setConfirmarExcluir}>
        <AlertDialogContent className="border-slate-700 bg-slate-900 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {ids.length} tarefa(s)?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Esta ação não pode ser desfeita. Os comentários vinculados às tarefas também podem ser perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => emMassa(() => excluirVarias(ids))}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
