import React, { useMemo, useState } from 'react';
import { STATUS_TAREFA } from '@/api/colaboracaoApi';
import { cn } from '@/lib/utils';
import TarefaCard from './TarefaCard';
import { STATUS_UI, PRIORIDADE_UI, diasAte } from './tarefasUi';

const LIMITE_INICIAL = 40;

/** Ordem no quadro: atrasadas/prazo mais próximo primeiro, depois prioridade. */
function ordemQuadro(a, b) {
  const da = a.data_fim ? diasAte(a.data_fim) : 99999;
  const db = b.data_fim ? diasAte(b.data_fim) : 99999;
  if (da !== db) return da - db;
  return (PRIORIDADE_UI[b.prioridade]?.peso ?? 1) - (PRIORIDADE_UI[a.prioridade]?.peso ?? 1);
}

export default function QuadroView({ tarefas, obras, onAbrir, onMover }) {
  const [arrastandoId, setArrastandoId] = useState(null);
  const [alvo, setAlvo] = useState(null);
  const [limites, setLimites] = useState({});

  const colunas = useMemo(() => {
    const m = Object.fromEntries(STATUS_TAREFA.map((s) => [s, []]));
    tarefas.forEach((t) => { (m[t.status] || m.pendente).push(t); });
    Object.keys(m).forEach((s) => {
      m[s].sort(s === 'concluida'
        ? (a, b) => String(b.data_conclusao || b.updated_at || '').localeCompare(String(a.data_conclusao || a.updated_at || ''))
        : ordemQuadro);
    });
    return m;
  }, [tarefas]);

  const soltar = (e, status) => {
    e.preventDefault();
    setAlvo(null);
    const id = e.dataTransfer.getData('text/plain') || arrastandoId;
    setArrastandoId(null);
    const t = tarefas.find((x) => String(x.id) === String(id));
    if (t && t.status !== status) onMover(t, status);
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {STATUS_TAREFA.map((s) => {
        const ui = STATUS_UI[s];
        const Ic = ui.Icone;
        const lista = colunas[s];
        const limite = limites[s] || LIMITE_INICIAL;
        return (
          <section
            key={s}
            aria-label={`Coluna ${ui.rotulo}`}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (alvo !== s) setAlvo(s); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setAlvo(null); }}
            onDrop={(e) => soltar(e, s)}
            className={cn(
              'flex min-w-0 flex-col rounded-xl border bg-slate-900/40 transition-colors',
              alvo === s ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700/60',
            )}
          >
            <header className="flex items-center gap-2 border-b border-slate-700/60 px-3 py-2" style={{ boxShadow: `inset 0 3px 0 ${ui.cor}` }}>
              <Ic className="h-4 w-4" style={{ color: ui.cor }} aria-hidden />
              <h3 className="text-sm font-semibold text-slate-100">{ui.rotulo}</h3>
              <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[11px] tabular-nums text-slate-300">{lista.length}</span>
            </header>
            <div className="flex max-h-[70vh] min-h-[120px] flex-col gap-2 overflow-y-auto p-2">
              {lista.length === 0 && (
                <p className="py-6 text-center text-[11px] text-slate-500">Arraste uma tarefa para cá</p>
              )}
              {lista.slice(0, limite).map((t) => (
                <TarefaCard
                  key={t.id}
                  tarefa={t}
                  obras={obras}
                  onAbrir={onAbrir}
                  onMover={onMover}
                  arrastando={arrastandoId === t.id}
                  onDragStart={setArrastandoId}
                  onDragEnd={() => { setArrastandoId(null); setAlvo(null); }}
                />
              ))}
              {lista.length > limite && (
                <button
                  type="button"
                  onClick={() => setLimites((l) => ({ ...l, [s]: limite + LIMITE_INICIAL }))}
                  className="rounded-md border border-dashed border-slate-600 py-2 text-[11px] text-slate-300 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  Mostrar mais {Math.min(LIMITE_INICIAL, lista.length - limite)} de {lista.length - limite} restantes
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
