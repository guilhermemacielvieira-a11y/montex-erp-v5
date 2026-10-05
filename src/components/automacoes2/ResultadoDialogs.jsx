import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FlaskConical, Play, ShieldCheck, AlertTriangle, CheckCircle2, MinusCircle } from 'lucide-react';
import { resumoAcoesFeitas } from './automacoesUtils';

const CLASSE = 'max-w-2xl max-h-[92vh] overflow-y-auto bg-slate-900 border-slate-700 text-slate-100';

/** Resultado do modo 'teste' — só simulação, nada enviado. */
export function TesteDialog({ estado, onClose }) {
  const aberto = !!estado;
  const r = estado?.resultado;
  const item = r?.automacoes?.[0];
  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className={CLASSE}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-blue-400" aria-hidden />Teste: {estado?.nome}</DialogTitle>
          <DialogDescription className="text-slate-400">Simulação com os dados de agora.</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <span>Nada foi enviado: nenhuma notificação, tarefa ou push foi criado. O teste também não conta para a deduplicação.</span>
        </div>

        {!item && <p className="text-sm text-slate-400">O motor não devolveu resultado para esta automação.</p>}
        {item?.erro && (
          <div role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />Erro ao avaliar: {item.erro}
          </div>
        )}
        {item && !item.erro && (
          <div className="space-y-3">
            <p className="text-2xl font-bold text-slate-100">
              {item.ocorrencias || 0} <span className="text-base font-normal text-slate-400">ocorrência(s) agora</span>
            </p>
            {(item.exemplos || []).length > 0 ? (
              <>
                <p className="text-xs text-slate-400">
                  {item.ocorrencias > (item.exemplos || []).length ? `Mostrando ${item.exemplos.length} de ${item.ocorrencias}. ` : ''}
                  Ocorrências já avisadas antes não serão repetidas quando o motor rodar.
                </p>
                <ul className="space-y-2">
                  {item.exemplos.map((ex, i) => (
                    <li key={i} className="rounded-md border border-slate-700 bg-slate-800/60 p-2.5">
                      <p className="text-sm font-medium text-slate-100 break-words">{ex.titulo}</p>
                      {ex.detalhe && <p className="text-xs text-slate-400 mt-0.5 break-words">{ex.detalhe}</p>}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-slate-400 flex items-center gap-1.5"><MinusCircle className="h-4 w-4" aria-hidden />Nenhuma situação dispara esta automação no momento.</p>
            )}
          </div>
        )}
        <DialogFooter><Button onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Confirmação + resultado do modo 'manual' (age de verdade). */
export function ExecutarDialog({ estado, executando, onConfirmar, onClose }) {
  const aberto = !!estado;
  const item = estado?.resultado?.automacoes?.[0];
  const feito = !!estado?.resultado;
  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v && !executando) onClose(); }}>
      <DialogContent className={CLASSE}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Play className="h-5 w-5 text-blue-400" aria-hidden />Executar agora: {estado?.automacao?.nome}</DialogTitle>
          {!feito && (
            <DialogDescription className="text-slate-300">
              Isto vai notificar / criar tarefas / enviar push de verdade para as ocorrências <strong>novas</strong> (as já avisadas antes são ignoradas).
              Use “Testar” se quiser só ver o que seria disparado.
            </DialogDescription>
          )}
        </DialogHeader>

        {feito && item?.erro && (
          <div role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />Erro na execução: {item.erro}
          </div>
        )}
        {feito && item && !item.erro && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
              <p className="text-[11px] uppercase text-slate-400">Ocorrências</p>
              <p className="text-xl font-bold">{item.ocorrencias || 0}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
              <p className="text-[11px] uppercase text-slate-400">Novas</p>
              <p className="text-xl font-bold text-emerald-300">{item.novas || 0}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
              <p className="text-[11px] uppercase text-slate-400">Ações feitas</p>
              <p className="text-sm font-medium">{resumoAcoesFeitas(item.acoes) || 'nenhuma'}</p>
            </div>
            <p className="col-span-3 text-sm text-slate-300 flex items-start gap-1.5">
              {item.novas
                ? <><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-400 shrink-0" aria-hidden />Ações executadas para {item.novas} ocorrência(s) nova(s). Registrado no histórico.</>
                : <><MinusCircle className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" aria-hidden />Nenhuma ocorrência nova — nada foi enviado. Registrado no histórico.</>}
            </p>
          </div>
        )}
        {feito && !item && <p className="text-sm text-slate-400">O motor não devolveu resultado para esta automação.</p>}

        <DialogFooter className="gap-2">
          {!feito ? (
            <>
              <Button variant="ghost" onClick={onClose} disabled={executando}>Cancelar</Button>
              <Button onClick={onConfirmar} disabled={executando} className="bg-blue-600 hover:bg-blue-500 text-white">
                {executando ? 'Executando…' : 'Sim, executar agora'}
              </Button>
            </>
          ) : <Button onClick={onClose}>Fechar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
