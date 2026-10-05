import React from 'react';
import { Search, UserCheck, X } from 'lucide-react';
import { STATUS_TAREFA, PRIORIDADES } from '@/api/colaboracaoApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { STATUS_UI, PRIORIDADE_UI, ORIGEM_UI, CLS_TRIGGER, CLS_CONTENT, CLS_ITEM, CLS_INPUT } from './tarefasUi';

export const FILTROS_PADRAO = { busca: '', status: 'todos', prioridade: 'todas', responsavel: 'todos', origem: 'todas', prazo: 'todos', minhas: false };

export const ROTULOS_PRAZO = {
  abertas: 'Abertas',
  atrasadas: 'Atrasadas',
  vencendo: 'Vencendo em 7 dias',
  concluidas_mes: 'Concluídas no mês',
};

export default function FiltrosTarefas({ filtros, setFiltros, responsaveis, temUsuario }) {
  const set = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));
  const ativos = Object.keys(FILTROS_PADRAO).some((k) => filtros[k] !== FILTROS_PADRAO[k]);

  return (
    <section aria-label="Filtros de tarefas" className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64 sm:flex-none">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" aria-hidden />
        <input type="search" value={filtros.busca} onChange={(e) => set('busca', e.target.value)} placeholder="Buscar título, descrição, tag…"
          aria-label="Buscar tarefas" className={cn(CLS_INPUT, 'pl-8')} />
      </div>
      <div className="w-[calc(50%-4px)] sm:w-40">
        <Select value={filtros.status} onValueChange={(v) => set('status', v)}>
          <SelectTrigger className={CLS_TRIGGER} aria-label="Filtrar por status"><SelectValue /></SelectTrigger>
          <SelectContent className={CLS_CONTENT}>
            <SelectItem value="todos" className={CLS_ITEM}>Todos os status</SelectItem>
            {STATUS_TAREFA.map((s) => <SelectItem key={s} value={s} className={CLS_ITEM}>{STATUS_UI[s].rotulo}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="w-[calc(50%-4px)] sm:w-40">
        <Select value={filtros.prioridade} onValueChange={(v) => set('prioridade', v)}>
          <SelectTrigger className={CLS_TRIGGER} aria-label="Filtrar por prioridade"><SelectValue /></SelectTrigger>
          <SelectContent className={CLS_CONTENT}>
            <SelectItem value="todas" className={CLS_ITEM}>Todas as prioridades</SelectItem>
            {PRIORIDADES.map((p) => <SelectItem key={p} value={p} className={CLS_ITEM}>{PRIORIDADE_UI[p].rotulo}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="w-[calc(50%-4px)] sm:w-44">
        <Select value={filtros.responsavel} onValueChange={(v) => set('responsavel', v)} disabled={filtros.minhas}>
          <SelectTrigger className={CLS_TRIGGER} aria-label="Filtrar por responsável"><SelectValue /></SelectTrigger>
          <SelectContent className={cn(CLS_CONTENT, 'max-h-72')}>
            <SelectItem value="todos" className={CLS_ITEM}>Todos os responsáveis</SelectItem>
            <SelectItem value="__sem__" className={CLS_ITEM}>Sem responsável</SelectItem>
            {responsaveis.map((r) => <SelectItem key={r} value={r} className={CLS_ITEM}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="w-[calc(50%-4px)] sm:w-40">
        <Select value={filtros.origem} onValueChange={(v) => set('origem', v)}>
          <SelectTrigger className={CLS_TRIGGER} aria-label="Filtrar por origem"><SelectValue /></SelectTrigger>
          <SelectContent className={CLS_CONTENT}>
            <SelectItem value="todas" className={CLS_ITEM}>Todas as origens</SelectItem>
            {Object.entries(ORIGEM_UI).map(([k, ui]) => <SelectItem key={k} value={k} className={CLS_ITEM}>{ui.rotulo}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <button
        type="button"
        aria-pressed={filtros.minhas}
        disabled={!temUsuario}
        title={temUsuario ? 'Tarefas em que você é o responsável' : 'Usuário sem nome no perfil'}
        onClick={() => set('minhas', !filtros.minhas)}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50',
          filtros.minhas ? 'border-sky-400 bg-sky-500/20 text-sky-100' : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800',
        )}
      >
        <UserCheck className="h-4 w-4" aria-hidden /> Minhas
      </button>
      {filtros.prazo !== 'todos' && (
        <span className="inline-flex h-9 items-center gap-1 rounded-md border border-amber-500/50 bg-amber-500/10 px-2 text-xs text-amber-100">
          {ROTULOS_PRAZO[filtros.prazo]}
          <button type="button" onClick={() => set('prazo', 'todos')} aria-label="Remover filtro de prazo" className="rounded hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      )}
      {ativos && (
        <button type="button" onClick={() => setFiltros(FILTROS_PADRAO)} className="h-9 rounded-md px-2 text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
          Limpar filtros
        </button>
      )}
    </section>
  );
}
