import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Search } from 'lucide-react';
import { STATUS_TAREFA, PRIORIDADES } from '@/api/colaboracaoApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  STATUS_UI, PRIORIDADE_UI, CLS_TRIGGER, CLS_CONTENT, CLS_ITEM, CLS_INPUT, CLS_BTN, CLS_BTN_PRIM,
  soData, tagsDe, depsDe, normalizar, nomeObraDe,
} from './tarefasUi';

const SEM_OBRA = 'sem_obra';

const vazio = (obraSugerida) => ({
  titulo: '', descricao: '', obra_id: obraSugerida || SEM_OBRA, responsavel: '', prioridade: 'media', status: 'pendente',
  data_inicio: '', data_fim: '', horas_estimadas: '', horas_realizadas: '', percentual: 0, tags: [], dependencias: [], observacoes: '',
});

const deTarefa = (t) => ({
  titulo: t.titulo || '', descricao: t.descricao || '', obra_id: t.obra_id || SEM_OBRA, responsavel: t.responsavel || '',
  prioridade: PRIORIDADES.includes(t.prioridade) ? t.prioridade : 'media',
  status: STATUS_TAREFA.includes(t.status) ? t.status : 'pendente',
  data_inicio: soData(t.data_inicio), data_fim: soData(t.data_fim),
  horas_estimadas: t.horas_estimadas ?? '', horas_realizadas: t.horas_realizadas ?? '',
  percentual: Number(t.percentual) || 0, tags: tagsDe(t), dependencias: depsDe(t), observacoes: t.observacoes || '',
});

const numOuNull = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

function Campo({ id, rotulo, erro, children, className }) {
  return (
    <div className={cn('space-y-1 min-w-0', className)}>
      <label htmlFor={id} className="block text-xs font-medium text-slate-300">{rotulo}</label>
      {children}
      {erro && <p role="alert" className="text-[11px] text-red-300">{erro}</p>}
    </div>
  );
}

/**
 * Criar/editar tarefa. `tarefa` null = nova.
 * onSalvar(dados) deve lançar erro em falha (o dialog continua aberto).
 */
export default function TarefaFormDialog({ aberto, onFechar, tarefa, obras, obraSugerida, todasTarefas, responsaveis, onSalvar }) {
  const [form, setForm] = useState(() => vazio(obraSugerida));
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [tagNova, setTagNova] = useState('');
  const [buscaDep, setBuscaDep] = useState('');

  useEffect(() => {
    if (!aberto) return;
    setForm(tarefa ? deTarefa(tarefa) : vazio(obraSugerida));
    setErros({}); setTagNova(''); setBuscaDep('');
  }, [aberto, tarefa, obraSugerida]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const obraIdForm = form.obra_id === SEM_OBRA ? null : form.obra_id;

  // Dependências possíveis: outras tarefas da MESMA obra (ou sem obra)
  const candidatasDep = useMemo(() => {
    const q = normalizar(buscaDep);
    return (todasTarefas || [])
      .filter((t) => t.id !== tarefa?.id && !String(t.id).startsWith('tmp-') && (t.obra_id || null) === obraIdForm)
      .filter((t) => !q || normalizar(t.titulo).includes(q))
      .slice(0, 200);
  }, [todasTarefas, tarefa, obraIdForm, buscaDep]);

  const porId = useMemo(() => new Map((todasTarefas || []).map((t) => [String(t.id), t])), [todasTarefas]);

  const trocarObra = (v) => setForm((f) => ({ ...f, obra_id: v, dependencias: [] }));

  const addTag = (txt) => {
    const novas = String(txt || '').split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean);
    if (!novas.length) return;
    setForm((f) => ({ ...f, tags: [...new Set([...f.tags, ...novas])] }));
    setTagNova('');
  };

  const alternarDep = (id) => setForm((f) => {
    const s = String(id);
    return { ...f, dependencias: f.dependencias.includes(s) ? f.dependencias.filter((x) => x !== s) : [...f.dependencias, s] };
  });

  const validar = () => {
    const e = {};
    if (!form.titulo.trim()) e.titulo = 'Informe o título.';
    if (form.data_inicio && form.data_fim && form.data_fim < form.data_inicio) e.data_fim = 'O prazo não pode ser antes do início.';
    const he = numOuNull(form.horas_estimadas); const hr = numOuNull(form.horas_realizadas);
    if (form.horas_estimadas !== '' && (he === null || he < 0)) e.horas_estimadas = 'Número inválido.';
    if (form.horas_realizadas !== '' && (hr === null || hr < 0)) e.horas_realizadas = 'Número inválido.';
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async (ev) => {
    ev.preventDefault();
    if (!validar()) return;
    // Tag digitada e não confirmada também entra
    const tags = tagNova.trim() ? [...new Set([...form.tags, ...tagNova.split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean)])] : form.tags;
    const dados = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      obra_id: obraIdForm,
      responsavel: form.responsavel.trim() || null,
      prioridade: form.prioridade || 'media',
      status: form.status || 'pendente', // preserva a escolha do usuário (CLAUDE.md #2)
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      horas_estimadas: numOuNull(form.horas_estimadas),
      horas_realizadas: numOuNull(form.horas_realizadas),
      percentual: Math.max(0, Math.min(100, Math.round(Number(form.percentual) || 0))),
      tags,
      dependencias: form.dependencias,
      observacoes: form.observacoes.trim() || null,
    };
    setSalvando(true);
    try {
      await onSalvar(dados);
      onFechar();
    } catch {
      // toast já exibido pelo hook; mantém o formulário aberto
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v && !salvando) onFechar(); }}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto border-slate-700 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle>{tarefa ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
          <DialogDescription className="text-slate-400">Campos com * são obrigatórios. Datas no fuso local.</DialogDescription>
        </DialogHeader>

        <form onSubmit={salvar} className="space-y-4" noValidate>
          <Campo id="tf-titulo" rotulo="Título *" erro={erros.titulo}>
            <input id="tf-titulo" className={CLS_INPUT} value={form.titulo} onChange={(e) => set('titulo', e.target.value)}
              aria-invalid={!!erros.titulo} autoFocus maxLength={300} />
          </Campo>

          <Campo id="tf-desc" rotulo="Descrição">
            <textarea id="tf-desc" rows={3} className={cn(CLS_INPUT, 'h-auto py-2')} value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
          </Campo>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo id="tf-obra" rotulo="Obra">
              <Select value={form.obra_id} onValueChange={trocarObra}>
                <SelectTrigger id="tf-obra" className={CLS_TRIGGER}><SelectValue /></SelectTrigger>
                <SelectContent className={cn(CLS_CONTENT, 'max-h-72')}>
                  <SelectItem value={SEM_OBRA} className={CLS_ITEM}>Sem obra</SelectItem>
                  {(obras || []).map((o) => <SelectItem key={o.id} value={o.id} className={CLS_ITEM}>{nomeObraDe(obras, o.id)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Campo>
            <Campo id="tf-resp" rotulo="Responsável">
              <input id="tf-resp" className={CLS_INPUT} value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)}
                list="tf-resp-sugestoes" autoComplete="off" placeholder="Nome do responsável" />
              <datalist id="tf-resp-sugestoes">
                {(responsaveis || []).map((r) => <option key={r} value={r} />)}
              </datalist>
            </Campo>
            <Campo id="tf-prio" rotulo="Prioridade">
              <Select value={form.prioridade} onValueChange={(v) => set('prioridade', v)}>
                <SelectTrigger id="tf-prio" className={CLS_TRIGGER}><SelectValue /></SelectTrigger>
                <SelectContent className={CLS_CONTENT}>
                  {PRIORIDADES.map((p) => <SelectItem key={p} value={p} className={CLS_ITEM}>{PRIORIDADE_UI[p].rotulo}</SelectItem>)}
                </SelectContent>
              </Select>
            </Campo>
            <Campo id="tf-status" rotulo="Status">
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v, percentual: v === 'concluida' ? 100 : f.percentual }))}>
                <SelectTrigger id="tf-status" className={CLS_TRIGGER}><SelectValue /></SelectTrigger>
                <SelectContent className={CLS_CONTENT}>
                  {STATUS_TAREFA.map((s) => <SelectItem key={s} value={s} className={CLS_ITEM}>{STATUS_UI[s].rotulo}</SelectItem>)}
                </SelectContent>
              </Select>
            </Campo>
            <Campo id="tf-ini" rotulo="Início">
              <input id="tf-ini" type="date" className={cn(CLS_INPUT, '[color-scheme:dark]')} value={form.data_inicio} onChange={(e) => set('data_inicio', e.target.value)} />
            </Campo>
            <Campo id="tf-fim" rotulo="Prazo" erro={erros.data_fim}>
              <input id="tf-fim" type="date" min={form.data_inicio || undefined} className={cn(CLS_INPUT, '[color-scheme:dark]')} value={form.data_fim}
                onChange={(e) => set('data_fim', e.target.value)} aria-invalid={!!erros.data_fim} />
            </Campo>
            <Campo id="tf-he" rotulo="Horas estimadas" erro={erros.horas_estimadas}>
              <input id="tf-he" type="number" min="0" step="0.5" inputMode="decimal" className={CLS_INPUT} value={form.horas_estimadas} onChange={(e) => set('horas_estimadas', e.target.value)} />
            </Campo>
            <Campo id="tf-hr" rotulo="Horas realizadas" erro={erros.horas_realizadas}>
              <input id="tf-hr" type="number" min="0" step="0.5" inputMode="decimal" className={CLS_INPUT} value={form.horas_realizadas} onChange={(e) => set('horas_realizadas', e.target.value)} />
            </Campo>
          </div>

          <Campo id="tf-pct" rotulo={`Percentual concluído: ${form.percentual}%`}>
            <div className="flex items-center gap-3">
              <input id="tf-pct" type="range" min="0" max="100" step="5" value={form.percentual}
                onChange={(e) => set('percentual', Number(e.target.value))} className="flex-1 accent-sky-500" />
              <input type="number" min="0" max="100" aria-label="Percentual (número)" className={cn(CLS_INPUT, 'w-20')} value={form.percentual}
                onChange={(e) => set('percentual', Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
            </div>
          </Campo>

          <Campo id="tf-tags" rotulo="Tags">
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/60 p-1.5">
              {form.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200">
                  #{t}
                  <button type="button" onClick={() => set('tags', form.tags.filter((x) => x !== t))} aria-label={`Remover tag ${t}`}
                    className="rounded text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </span>
              ))}
              <input id="tf-tags" value={tagNova} onChange={(e) => setTagNova(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagNova); }
                  if (e.key === 'Backspace' && !tagNova && form.tags.length) set('tags', form.tags.slice(0, -1));
                }}
                onBlur={() => addTag(tagNova)}
                placeholder={form.tags.length ? '' : 'Digite e tecle Enter'}
                className="min-w-[120px] flex-1 bg-transparent px-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none" />
            </div>
          </Campo>

          <fieldset className="space-y-1.5">
            <legend className="text-xs font-medium text-slate-300">
              Dependências ({form.dependencias.length}) — tarefas da mesma obra que precisam terminar antes
            </legend>
            {form.dependencias.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.dependencias.map((id) => (
                  <span key={id} className="inline-flex max-w-full items-center gap-1 rounded bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-100">
                    <span className="truncate">{porId.get(String(id))?.titulo || `Tarefa ${id}`}</span>
                    <button type="button" onClick={() => alternarDep(id)} aria-label="Remover dependência"
                      className="rounded text-sky-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" aria-hidden />
              <input value={buscaDep} onChange={(e) => setBuscaDep(e.target.value)} placeholder="Buscar tarefa da mesma obra…"
                aria-label="Buscar dependência" className={cn(CLS_INPUT, 'pl-8')} />
            </div>
            <div className="max-h-40 overflow-y-auto rounded-md border border-slate-800 bg-slate-900/50">
              {candidatasDep.length === 0 ? (
                <p className="px-3 py-3 text-[11px] text-slate-500">Nenhuma outra tarefa {obraIdForm ? 'nesta obra' : 'sem obra'}.</p>
              ) : candidatasDep.map((t) => (
                <label key={t.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800/70">
                  <input type="checkbox" className="h-4 w-4 accent-sky-500" checked={form.dependencias.includes(String(t.id))} onChange={() => alternarDep(t.id)} />
                  <span className="min-w-0 flex-1 truncate">{t.titulo}</span>
                  <span className="text-[11px] text-slate-500">{STATUS_UI[t.status]?.rotulo || t.status}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <Campo id="tf-obs" rotulo="Observações">
            <textarea id="tf-obs" rows={2} className={cn(CLS_INPUT, 'h-auto py-2')} value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} />
          </Campo>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-800 pt-3 sm:flex-row sm:justify-end">
            <button type="button" className={CLS_BTN} onClick={onFechar} disabled={salvando}>Cancelar</button>
            <button type="submit" className={CLS_BTN_PRIM} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {tarefa ? 'Salvar alterações' : 'Criar tarefa'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
