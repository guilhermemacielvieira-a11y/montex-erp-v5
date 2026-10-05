import React, { useMemo, useState } from 'react';
import { Pencil, Trash2, Building2, UserRound, Clock, Link2, History, MessageSquare, Tag } from 'lucide-react';
import { STATUS_TAREFA } from '@/api/colaboracaoApi';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ChatMensagens from './ChatMensagens';
import {
  StatusBadge, PrioridadeBadge, PrazoInfo, OrigemBadge, BarraProgresso, STATUS_UI, ORIGEM_UI,
  fmtData, fmtDataHora, nomeObraDe, depsDe, tagsDe, CLS_TRIGGER, CLS_CONTENT, CLS_ITEM, CLS_BTN, CLS_BTN_PERIGO,
} from './tarefasUi';

function Linha({ Icone, rotulo, children }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
      <span className="w-24 shrink-0 text-slate-400">{rotulo}</span>
      <span className="min-w-0 flex-1 break-words text-slate-200">{children}</span>
    </div>
  );
}

export default function TarefaDetalhe({ tarefa, obras, todasTarefas, autorNome, onFechar, onEditar, onExcluir, onMudarStatus, onAbrir }) {
  const [confirmar, setConfirmar] = useState(false);
  const porId = useMemo(() => new Map((todasTarefas || []).map((t) => [String(t.id), t])), [todasTarefas]);
  const aberto = !!tarefa;
  const t = tarefa || {};
  const deps = depsDe(t);
  const dependentes = useMemo(() => (tarefa ? (todasTarefas || []).filter((x) => depsDe(x).includes(String(tarefa.id))) : []), [todasTarefas, tarefa]);
  const temp = String(t.id || '').startsWith('tmp-');

  return (
    <Sheet open={aberto} onOpenChange={(v) => { if (!v) onFechar(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto border-slate-700 bg-slate-950 text-slate-100 sm:max-w-xl">
        {aberto && (
          <div className="space-y-4">
            <SheetHeader className="space-y-2 pr-6 text-left">
              <SheetTitle className="break-words text-base text-white">{t.titulo}</SheetTitle>
              <SheetDescription asChild>
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge status={t.status} />
                  <PrioridadeBadge prioridade={t.prioridade} />
                  <OrigemBadge origem={t.origem} />
                </div>
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-44">
                <Select value={STATUS_TAREFA.includes(t.status) ? t.status : 'pendente'} onValueChange={(v) => onMudarStatus(t, v)} disabled={temp}>
                  <SelectTrigger className={CLS_TRIGGER} aria-label="Alterar status"><SelectValue /></SelectTrigger>
                  <SelectContent className={CLS_CONTENT}>
                    {STATUS_TAREFA.map((s) => <SelectItem key={s} value={s} className={CLS_ITEM}>{STATUS_UI[s].rotulo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <button type="button" className={CLS_BTN} onClick={() => onEditar(t)} disabled={temp}>
                <Pencil className="h-4 w-4" aria-hidden /> Editar
              </button>
              <button type="button" className={CLS_BTN_PERIGO} onClick={() => setConfirmar(true)} disabled={temp}>
                <Trash2 className="h-4 w-4" aria-hidden /> Excluir
              </button>
            </div>

            {t.descricao && <p className="whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-200">{t.descricao}</p>}

            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <Linha Icone={Building2} rotulo="Obra">{nomeObraDe(obras, t.obra_id)}</Linha>
              <Linha Icone={UserRound} rotulo="Responsável">{t.responsavel || '—'}</Linha>
              <Linha Icone={Clock} rotulo="Período">{fmtData(t.data_inicio)} → {fmtData(t.data_fim)}</Linha>
              <div className="pl-[7.5rem]"><PrazoInfo tarefa={t} /></div>
              <Linha Icone={Clock} rotulo="Horas">
                {t.horas_realizadas ?? '—'} realizadas / {t.horas_estimadas ?? '—'} estimadas
              </Linha>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-[7.5rem] shrink-0 pl-[1.4rem] text-slate-400">Progresso</span>
                <BarraProgresso valor={t.percentual} className="flex-1" />
              </div>
              {tagsDe(t).length > 0 && (
                <Linha Icone={Tag} rotulo="Tags">
                  <span className="flex flex-wrap gap-1">{tagsDe(t).map((g) => <span key={g} className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px]">#{g}</span>)}</span>
                </Linha>
              )}
            </div>

            {(deps.length > 0 || dependentes.length > 0) && (
              <section className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-200"><Link2 className="h-4 w-4" aria-hidden /> Dependências</h4>
                {deps.map((id) => {
                  const d = porId.get(String(id));
                  return (
                    <div key={id} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">depende de</span>
                      {d ? (
                        <button type="button" onClick={() => onAbrir(d)} className="min-w-0 flex-1 truncate text-left text-sky-200 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded">{d.titulo}</button>
                      ) : <span className="flex-1 text-slate-500">tarefa {id} (fora do escopo ou removida)</span>}
                      {d && <StatusBadge status={d.status} />}
                    </div>
                  );
                })}
                {dependentes.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">bloqueia</span>
                    <button type="button" onClick={() => onAbrir(d)} className="min-w-0 flex-1 truncate text-left text-sky-200 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded">{d.titulo}</button>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </section>
            )}

            {t.observacoes && (
              <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <h4 className="mb-1 text-xs font-semibold text-slate-200">Observações</h4>
                <p className="whitespace-pre-wrap break-words text-xs text-slate-300">{t.observacoes}</p>
              </section>
            )}

            <section className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-200"><History className="h-4 w-4" aria-hidden /> Histórico</h4>
              <ul className="space-y-1 text-[11px] text-slate-300">
                <li>Criada em {fmtDataHora(t.created_at)}{t.criado_por ? ` por ${t.criado_por}` : ''}</li>
                <li>Atualizada em {fmtDataHora(t.updated_at)}</li>
                {t.data_conclusao && <li>Concluída em {fmtData(t.data_conclusao)}</li>}
                <li>
                  Origem: {(ORIGEM_UI[t.origem] || ORIGEM_UI.manual).rotulo}
                  {t.origem === 'automacao' && ' (gerada pelo motor de automações)'}
                  {t.origem === 'alerta' && ' (criada a partir de um alerta do Radar)'}
                  {t.origem_ref ? ` · ref. ${t.origem_ref}` : ''}
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-200"><MessageSquare className="h-4 w-4" aria-hidden /> Comentários</h4>
              {temp ? (
                <p className="text-[11px] text-slate-500">Aguardando a tarefa ser salva…</p>
              ) : (
                <ChatMensagens key={t.id} tarefaId={t.id} obraId={t.obra_id || null} autorNome={autorNome} vazio="Nenhum comentário nesta tarefa." alturaMax="max-h-[40vh]" />
              )}
            </section>
          </div>
        )}

        <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
          <AlertDialogContent className="border-slate-700 bg-slate-900 text-slate-100">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir esta tarefa?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">&quot;{t.titulo}&quot; será removida. Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700">Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={() => onExcluir(t)}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
