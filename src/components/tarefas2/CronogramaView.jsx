import React, { useMemo, useState } from 'react';
import { Link2, AlertTriangle, CalendarOff, Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  parseLocalDate, isoLocal, fmtData, nomeObraDe, depsDe, STATUS_UI, situacaoPrazo, estaConcluida, StatusBadge,
  CLS_TRIGGER, CLS_CONTENT, CLS_ITEM,
} from './tarefasUi';

const SEMANA_PX = 36;
const DIA_PX = SEMANA_PX / 7;
const DIA_MS = 86400000;
const MAX_SEMANAS = 156;

const JANELAS = [
  { valor: 'tudo', rotulo: 'Todo o período', antes: null, depois: null },
  { valor: '12', rotulo: '12 semanas (a partir de -2)', antes: 2, depois: 10 },
  { valor: '26', rotulo: '26 semanas (a partir de -4)', antes: 4, depois: 22 },
  { valor: '52', rotulo: '52 semanas (a partir de -8)', antes: 8, depois: 44 },
];

const segunda = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // 0 = segunda
  x.setDate(x.getDate() - dow);
  return x;
};
const dias = (a, b) => Math.round((b.getTime() - a.getTime()) / DIA_MS);

export default function CronogramaView({ tarefas, obras, onAbrir }) {
  const [janela, setJanela] = useState('tudo');

  const porId = useMemo(() => new Map(tarefas.map((t) => [String(t.id), t])), [tarefas]);

  const { itens, semDatas } = useMemo(() => {
    const com = []; const sem = [];
    tarefas.forEach((t) => {
      let ini = parseLocalDate(t.data_inicio) || parseLocalDate(t.data_fim);
      let fim = parseLocalDate(t.data_fim) || parseLocalDate(t.data_inicio);
      if (!ini || !fim) { sem.push(t); return; }
      if (fim < ini) [ini, fim] = [fim, ini];
      com.push({ t, ini, fim });
    });
    return { itens: com, semDatas: sem };
  }, [tarefas]);

  const hoje = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }, []);

  const faixa = useMemo(() => {
    const j = JANELAS.find((x) => x.valor === janela) || JANELAS[0];
    let inicio; let semanas;
    if (j.antes === null) {
      if (!itens.length) return null;
      const min = new Date(Math.min(...itens.map((i) => i.ini.getTime()), hoje.getTime()));
      const max = new Date(Math.max(...itens.map((i) => i.fim.getTime()), hoje.getTime()));
      inicio = segunda(min);
      semanas = Math.min(MAX_SEMANAS, Math.ceil((dias(inicio, max) + 1) / 7));
    } else {
      inicio = segunda(hoje);
      inicio.setDate(inicio.getDate() - j.antes * 7);
      semanas = j.antes + j.depois;
    }
    const fim = new Date(inicio); fim.setDate(fim.getDate() + semanas * 7 - 1);
    const lista = Array.from({ length: semanas }, (_, k) => { const d = new Date(inicio); d.setDate(d.getDate() + k * 7); return d; });
    return { inicio, fim, semanas: lista, largura: semanas * SEMANA_PX, cortado: j.antes === null && semanas === MAX_SEMANAS };
  }, [janela, itens, hoje]);

  const grupos = useMemo(() => {
    if (!faixa) return [];
    const m = new Map();
    itens
      .filter((i) => i.fim >= faixa.inicio && i.ini <= faixa.fim)
      .forEach((i) => {
        const k = i.t.obra_id || '__sem__';
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(i);
      });
    return [...m.entries()]
      .map(([k, lista]) => ({ obraId: k === '__sem__' ? null : k, nome: nomeObraDe(obras, k === '__sem__' ? null : k), lista: lista.sort((a, b) => a.ini - b.ini) }))
      .sort((a, b) => (a.obraId ? 0 : 1) - (b.obraId ? 0 : 1) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [itens, faixa, obras]);

  const foraDaJanela = faixa ? itens.length - grupos.reduce((s, g) => s + g.lista.length, 0) : 0;
  const hojeX = faixa && hoje >= faixa.inicio && hoje <= faixa.fim ? dias(faixa.inicio, hoje) * DIA_PX + DIA_PX / 2 : null;

  const barra = (ini, fim) => {
    const a = ini < faixa.inicio ? faixa.inicio : ini;
    const b = fim > faixa.fim ? faixa.fim : fim;
    return { left: dias(faixa.inicio, a) * DIA_PX, width: Math.max(6, (dias(a, b) + 1) * DIA_PX) };
  };

  const infoDeps = (i) => depsDe(i.t).map((id) => {
    const d = porId.get(String(id));
    if (!d) return { id, titulo: 'tarefa fora do escopo/removida', pendente: false, conflito: false };
    const fimDep = parseLocalDate(d.data_fim);
    return { id, titulo: d.titulo, pendente: !estaConcluida(d), conflito: !!fimDep && fimDep > i.ini && !estaConcluida(d) };
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-60">
          <Select value={janela} onValueChange={setJanela}>
            <SelectTrigger className={CLS_TRIGGER} aria-label="Janela do cronograma"><SelectValue /></SelectTrigger>
            <SelectContent className={CLS_CONTENT}>
              {JANELAS.map((j) => <SelectItem key={j.valor} value={j.valor} className={CLS_ITEM}>{j.rotulo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <span className="text-[11px] text-slate-400">
          {itens.length} com datas · {semDatas.length} sem datas
          {foraDaJanela > 0 && ` · ${foraDaJanela} fora da janela`}
          {faixa?.cortado && ` · exibindo as primeiras ${MAX_SEMANAS} semanas`}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          {Object.entries(STATUS_UI).map(([k, ui]) => (
            <span key={k} className="inline-flex items-center gap-1"><ui.Icone className="h-3 w-3" style={{ color: ui.cor }} aria-hidden />{ui.rotulo}</span>
          ))}
          <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-0.5 bg-red-500" aria-hidden />Hoje</span>
        </span>
      </div>

      {!faixa || grupos.length === 0 ? (
        <p className="rounded-xl border border-slate-700/60 bg-slate-900/40 py-8 text-center text-xs text-slate-500">
          Nenhuma tarefa com início/prazo {faixa ? 'nesta janela' : 'cadastrado'}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/40">
          <div style={{ width: faixa.largura + 240 }} className="relative">
            {/* Cabeçalho de semanas */}
            <div className="sticky top-0 z-10 flex border-b border-slate-700/60 bg-slate-900">
              <div className="sticky left-0 z-20 w-60 shrink-0 border-r border-slate-700/60 bg-slate-900 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Tarefa
              </div>
              <div className="relative flex" style={{ width: faixa.largura }}>
                {faixa.semanas.map((s, k) => {
                  const novoMes = k === 0 || s.getMonth() !== faixa.semanas[k - 1].getMonth();
                  return (
                    <div key={isoLocal(s)} className={cn('shrink-0 border-l py-1 text-center text-[11px] leading-tight', novoMes ? 'border-slate-500 text-slate-200' : 'border-slate-800 text-slate-500')} style={{ width: SEMANA_PX }}
                      title={`Semana de ${s.toLocaleDateString('pt-BR')}`}>
                      {novoMes && <div className="font-semibold">{s.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</div>}
                      <div>{String(s.getDate()).padStart(2, '0')}</div>
                    </div>
                  );
                })}
                {hojeX !== null && <div className="absolute bottom-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-red-500" style={{ left: hojeX }} aria-hidden />}
              </div>
            </div>

            {grupos.map((g) => (
              <div key={g.obraId || 'sem'} role="group" aria-label={`Obra ${g.nome}`}>
                <div className="flex border-b border-slate-800 bg-slate-800/60">
                  <div className="sticky left-0 z-[5] flex w-60 shrink-0 items-center gap-1.5 border-r border-slate-700/60 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-sky-300" aria-hidden />
                    <span className="truncate">{g.nome}</span>
                    <span className="ml-auto text-[11px] font-normal text-slate-400">{g.lista.length}</span>
                  </div>
                  <div style={{ width: faixa.largura }} />
                </div>
                {g.lista.map((i) => {
                  const ui = STATUS_UI[i.t.status] || STATUS_UI.pendente;
                  const pos = barra(i.ini, i.fim);
                  const atrasada = situacaoPrazo(i.t).tipo === 'atrasada';
                  const deps = infoDeps(i);
                  const pct = Math.max(0, Math.min(100, Number(i.t.percentual) || 0));
                  return (
                    <div key={i.t.id} className="flex border-b border-slate-800/80 hover:bg-slate-800/30">
                      <div className="sticky left-0 z-[5] w-60 shrink-0 border-r border-slate-700/60 bg-slate-900 px-3 py-1.5">
                        <button type="button" onClick={() => onAbrir(i.t)}
                          className="block w-full truncate text-left text-xs text-slate-100 hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
                          title={i.t.titulo}>
                          {i.t.titulo}
                        </button>
                        <div className="text-[11px] text-slate-500">{fmtData(isoLocal(i.ini))} → {fmtData(isoLocal(i.fim))}</div>
                        {deps.length > 0 && (
                          <div className={cn('mt-0.5 flex items-start gap-1 text-[11px]', deps.some((d) => d.conflito) ? 'text-amber-300' : 'text-slate-400')}>
                            {deps.some((d) => d.conflito)
                              ? <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                              : <Link2 className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />}
                            <span className="line-clamp-2" title={deps.map((d) => d.titulo).join(', ')}>
                              depende de {deps.map((d) => `${d.titulo}${d.pendente ? ' (pendente)' : ''}`).join(', ')}
                              {deps.some((d) => d.conflito) && ' — começa antes do fim da dependência'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="relative" style={{ width: faixa.largura, minHeight: 40 }}>
                        {hojeX !== null && <div className="absolute inset-y-0 w-0.5 bg-red-500/70" style={{ left: hojeX }} aria-hidden />}
                        <button
                          type="button"
                          onClick={() => onAbrir(i.t)}
                          className={cn('absolute top-2 h-5 overflow-hidden rounded border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400', atrasada && 'ring-1 ring-red-500')}
                          style={{ left: pos.left, width: pos.width, borderColor: ui.cor, backgroundColor: `${ui.cor}33` }}
                          aria-label={`${i.t.titulo}: ${ui.rotulo}, ${fmtData(isoLocal(i.ini))} a ${fmtData(isoLocal(i.fim))}, ${pct}%${atrasada ? ', atrasada' : ''}`}
                          title={`${i.t.titulo} · ${ui.rotulo} · ${pct}%`}
                        >
                          <span className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, backgroundColor: `${ui.cor}88` }} aria-hidden />
                          {pos.width > 60 && <span className="relative px-1 text-[11px] leading-5 text-white">{pct}%</span>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {semDatas.length > 0 && (
        <section aria-label="Tarefas sem datas" className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <CalendarOff className="h-4 w-4 text-slate-400" aria-hidden /> Sem início nem prazo ({semDatas.length})
          </h3>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {semDatas.slice(0, 60).map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => onAbrir(t)}
                  className="flex w-full items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-left hover:border-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{t.titulo}</span>
                  <StatusBadge status={t.status} />
                </button>
              </li>
            ))}
          </ul>
          {semDatas.length > 60 && <p className="mt-2 text-[11px] text-slate-500">+{semDatas.length - 60} tarefa(s) sem datas — veja na Lista.</p>}
        </section>
      )}
    </div>
  );
}
