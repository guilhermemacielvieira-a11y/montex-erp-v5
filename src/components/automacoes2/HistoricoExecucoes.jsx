import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, RefreshCw, History, CalendarClock, Hand } from 'lucide-react';
import { StatusExecucao } from './AutomacaoCard';
import { dataHora, resumoAcoesFeitas } from './automacoesUtils';

const TODOS = 'todos';

function Origem({ origem }) {
  if (origem === 'manual') return <span className="inline-flex items-center gap-1 text-blue-300"><Hand className="h-3.5 w-3.5" aria-hidden />Manual</span>;
  return <span className="inline-flex items-center gap-1 text-slate-300"><CalendarClock className="h-3.5 w-3.5" aria-hidden />Agendada</span>;
}

function Detalhes({ log }) {
  const d = log.detalhes || {};
  const exemplos = Array.isArray(d.exemplos) ? d.exemplos : [];
  return (
    <div className="space-y-1.5 text-xs text-slate-300">
      <p>
        Ocorrências encontradas: <strong>{d.ocorrencias ?? '—'}</strong> · novas: <strong>{d.novas ?? log.disparos ?? 0}</strong>
        {resumoAcoesFeitas(d.acoes) && <> · ações: {resumoAcoesFeitas(d.acoes)}</>}
      </p>
      {exemplos.length > 0 && (
        <ul className="list-disc pl-5 space-y-0.5">
          {exemplos.map((ex, i) => <li key={i} className="break-words">{typeof ex === 'string' ? ex : (ex?.titulo || JSON.stringify(ex))}</li>)}
        </ul>
      )}
      {log.erro && <p className="text-red-300 break-words">Erro: {log.erro}</p>}
    </div>
  );
}

export default function HistoricoExecucoes({ logs, automacoes, carregando, erro, onRecarregar }) {
  const [filtroAuto, setFiltroAuto] = useState(TODOS);
  const [filtroStatus, setFiltroStatus] = useState(TODOS);
  const [abertos, setAbertos] = useState(() => new Set());

  const nomePorId = useMemo(() => Object.fromEntries((automacoes || []).map((a) => [a.id, a.nome])), [automacoes]);
  const filtrados = useMemo(() => (logs || []).filter((l) =>
    (filtroAuto === TODOS || l.automacao_id === filtroAuto) && (filtroStatus === TODOS || l.status === filtroStatus)), [logs, filtroAuto, filtroStatus]);

  const alternar = (id) => setAbertos((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const temDetalhe = (l) => !!l.erro || (l.detalhes && (Array.isArray(l.detalhes.exemplos) ? l.detalhes.exemplos.length : 0) > 0) || !!l.detalhes;

  return (
    <section className="space-y-3" aria-label="Histórico de execuções">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1 min-w-[200px] flex-1 sm:flex-none sm:w-64">
          <label htmlFor="hist-auto" className="text-[11px] uppercase text-slate-400">Automação</label>
          <Select value={filtroAuto} onValueChange={setFiltroAuto}>
            <SelectTrigger id="hist-auto" className="bg-slate-900 border-slate-700 text-slate-100"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas as automações</SelectItem>
              {(automacoes || []).map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-[160px] flex-1 sm:flex-none sm:w-48">
          <label htmlFor="hist-status" className="text-[11px] uppercase text-slate-400">Status</label>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger id="hist-status" className="bg-slate-900 border-slate-700 text-slate-100"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              <SelectItem value="ok">Disparou</SelectItem>
              <SelectItem value="sem_disparo">Sem disparo</SelectItem>
              <SelectItem value="erro">Erro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={onRecarregar} disabled={carregando}
          className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800">
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${carregando ? 'animate-spin' : ''}`} aria-hidden />Atualizar
        </Button>
        <span className="text-xs text-slate-400 sm:ml-auto">{filtrados.length} de {(logs || []).length} execuções (mais recentes)</span>
      </div>

      {erro && <div role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">Não foi possível carregar o histórico: {erro}</div>}

      {!erro && filtrados.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-10 text-center text-slate-400">
          <History className="h-8 w-8 mx-auto mb-2 text-slate-600" aria-hidden />
          {carregando ? 'Carregando…' : 'Nenhuma execução registrada com estes filtros.'}
        </div>
      ) : (
        <>
          {/* Tabela (telas médias+) */}
          <div className="hidden md:block rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-slate-900 text-[11px] uppercase text-slate-400">
                <tr>
                  <th scope="col" className="w-8" />
                  <th scope="col" className="text-left px-2 py-2 w-32">Data/hora</th>
                  <th scope="col" className="text-left px-2 py-2">Automação</th>
                  <th scope="col" className="text-left px-2 py-2 w-28">Origem</th>
                  <th scope="col" className="text-left px-2 py-2 w-32">Status</th>
                  <th scope="col" className="text-right px-2 py-2 w-20">Disparos</th>
                  <th scope="col" className="text-left px-2 py-2 w-1/4">Erro</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((l) => {
                  const aberto = abertos.has(l.id);
                  return (
                    <React.Fragment key={l.id}>
                      <tr className="border-t border-slate-800 hover:bg-slate-900/60">
                        <td className="px-1 py-1.5 text-center">
                          {temDetalhe(l) && (
                            <button type="button" onClick={() => alternar(l.id)} aria-expanded={aberto}
                              aria-label={aberto ? 'Ocultar detalhes' : 'Mostrar detalhes'} className="p-1 rounded hover:bg-slate-800 text-slate-400">
                              {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-slate-300 whitespace-nowrap">{dataHora(l.executada_em)}</td>
                        <td className="px-2 py-1.5 text-slate-100 truncate" title={nomePorId[l.automacao_id]}>{nomePorId[l.automacao_id] || <span className="text-slate-500">(removida)</span>}</td>
                        <td className="px-2 py-1.5 text-xs"><Origem origem={l.origem} /></td>
                        <td className="px-2 py-1.5 text-xs"><StatusExecucao status={l.status} /></td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-slate-200">{l.disparos ?? 0}</td>
                        <td className="px-2 py-1.5 text-xs text-red-300 truncate" title={l.erro || ''}>{l.erro || ''}</td>
                      </tr>
                      {aberto && (
                        <tr className="bg-slate-900/40">
                          <td />
                          <td colSpan={6} className="px-2 py-2"><Detalhes log={l} /></td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Lista (celular) */}
          <ul className="md:hidden space-y-2">
            {filtrados.map((l) => {
              const aberto = abertos.has(l.id);
              return (
                <li key={l.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-100 break-words">{nomePorId[l.automacao_id] || '(removida)'}</p>
                    <StatusExecucao status={l.status} className="text-xs shrink-0" />
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span>{dataHora(l.executada_em)}</span>
                    <Origem origem={l.origem} />
                    <span>{l.disparos ?? 0} disparo(s)</span>
                  </div>
                  {temDetalhe(l) && (
                    <button type="button" onClick={() => alternar(l.id)} aria-expanded={aberto} className="text-xs text-blue-300 inline-flex items-center gap-1">
                      {aberto ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden />}Detalhes
                    </button>
                  )}
                  {aberto && <Detalhes log={l} />}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
