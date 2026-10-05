import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, ListTodo, Smartphone, FlaskConical, Play, Pencil, Trash2, Clock, Building2, Zap, Loader2, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { GATILHOS } from '@/api/colaboracaoApi';
import { cn } from '@/lib/utils';
import { descreverParametros, descreverAcao, tempoRelativo, dataHora } from './automacoesUtils';

const ICONE_ACAO = { notificar: Bell, criar_tarefa: ListTodo, push: Smartphone };
const AREA_COR = {
  Financeiro: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  'Produção': 'text-orange-300 bg-orange-500/10 border-orange-500/30',
  Obras: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30',
  Suprimentos: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
};

export function StatusExecucao({ status, className }) {
  if (status === 'ok') return <span className={cn('inline-flex items-center gap-1 text-emerald-300', className)}><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />Disparou</span>;
  if (status === 'erro') return <span className={cn('inline-flex items-center gap-1 text-red-300', className)}><XCircle className="h-3.5 w-3.5" aria-hidden />Erro</span>;
  if (status === 'sem_disparo') return <span className={cn('inline-flex items-center gap-1 text-slate-400', className)}><MinusCircle className="h-3.5 w-3.5" aria-hidden />Sem disparo</span>;
  return <span className={cn('text-slate-400', className)}>{status || '—'}</span>;
}

export default function AutomacaoCard({ automacao: a, nomeObra, ultimoLog, ocupado, onToggle, onTestar, onExecutar, onEditar, onExcluir }) {
  const g = GATILHOS[a.gatilho];
  const acoes = Array.isArray(a.acoes) ? a.acoes : [];
  const switchId = `auto-ativa-${a.id}`;

  return (
    <article className={cn(
      'rounded-xl border p-4 flex flex-col gap-3 transition-colors',
      a.ativa ? 'border-slate-700 bg-slate-900/70' : 'border-slate-800 bg-slate-900/30 opacity-80',
    )} aria-label={`Automação ${a.nome}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-100 leading-tight break-words flex items-center gap-2">
            <Zap className={cn('h-4 w-4 shrink-0', a.ativa ? 'text-yellow-400' : 'text-slate-500')} aria-hidden />
            {a.nome}
          </h3>
          {a.descricao && <p className="mt-1 text-xs text-slate-400 break-words">{a.descricao}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor={switchId} className={cn('text-[11px] font-medium', a.ativa ? 'text-emerald-300' : 'text-slate-500')}>
            {a.ativa ? 'Ativa' : 'Inativa'}
          </label>
          <Switch id={switchId} checked={!!a.ativa} disabled={ocupado === 'toggle'} onCheckedChange={(v) => onToggle(a, v)}
            aria-label={a.ativa ? `Desativar ${a.nome}` : `Ativar ${a.nome}`} />
        </div>
      </header>

      <div className="space-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500">Quando:</span>
          <span className="font-medium text-slate-200">{g?.rotulo || a.gatilho}</span>
          {g?.area && <span className={cn('rounded border px-1.5 py-0.5 text-[11px]', AREA_COR[g.area] || 'text-slate-300 border-slate-600')}>{g.area}</span>}
        </div>
        <p className="text-slate-400">{descreverParametros(a.gatilho, a.parametros)}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500">Então:</span>
          {acoes.length === 0 && <span className="text-orange-300">nenhuma ação configurada</span>}
          {acoes.map((ac, i) => {
            const Icone = ICONE_ACAO[ac.tipo] || Bell;
            return (
              <span key={i} className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200">
                <Icone className="h-3 w-3 text-blue-300" aria-hidden />{descreverAcao(ac)}
              </span>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400">
          <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" aria-hidden />{a.obra_id ? (nomeObra || a.obra_id) : 'Todas'}</span>
          <span className="inline-flex items-center gap-1" title={dataHora(a.ultima_execucao)}>
            <Clock className="h-3.5 w-3.5" aria-hidden />Última execução: {tempoRelativo(a.ultima_execucao)}
          </span>
          {ultimoLog && <StatusExecucao status={ultimoLog.status} className="text-[11px]" />}
        </div>
      </div>

      <footer className="flex flex-wrap gap-2 pt-1 border-t border-slate-800">
        <Button size="sm" variant="outline" onClick={() => onTestar(a)} disabled={!!ocupado}
          className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800" aria-label={`Testar ${a.nome} sem enviar nada`}>
          {ocupado === 'teste' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" aria-hidden /> : <FlaskConical className="h-3.5 w-3.5 mr-1" aria-hidden />}Testar
        </Button>
        <Button size="sm" onClick={() => onExecutar(a)} disabled={!!ocupado} className="bg-blue-600 hover:bg-blue-500 text-white"
          aria-label={`Executar ${a.nome} agora`}>
          {ocupado === 'manual' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" aria-hidden /> : <Play className="h-3.5 w-3.5 mr-1" aria-hidden />}Executar agora
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onEditar(a)} disabled={!!ocupado} className="text-slate-300 hover:bg-slate-800" aria-label={`Editar ${a.nome}`}>
          <Pencil className="h-3.5 w-3.5 mr-1" aria-hidden />Editar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onExcluir(a)} disabled={!!ocupado} className="text-red-300 hover:text-red-200 hover:bg-red-500/10 ml-auto" aria-label={`Excluir ${a.nome}`}>
          <Trash2 className="h-3.5 w-3.5 mr-1" aria-hidden />Excluir
        </Button>
      </footer>
    </article>
  );
}
