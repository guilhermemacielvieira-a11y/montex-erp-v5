// ============================================================
// Coerência produzido × identificado por funcionário
// ============================================================
// Para cada etapa (Corte, Fabricação, Solda, Pintura): do peso que JÁ PASSOU
// da etapa, quanto tem funcionário apontado (com data), quanto só tem o
// responsável gravado na peça e quanto não tem ninguém. Motor:
// services/bi/biCorte.js (coerenciaProducao / eventosCorte).
// ============================================================
import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Scissors, Factory, Flame, Paintbrush, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const ETAPAS = [
  { key: 'corte', label: 'Corte', sub: 'kg de material cortado', icone: Scissors, cor: '#eab308' },
  { key: 'fabricacao', label: 'Fabricação', sub: 'peso de peças', icone: Factory, cor: '#3b82f6' },
  { key: 'solda', label: 'Solda', sub: 'peso de peças', icone: Flame, cor: '#f97316' },
  { key: 'pintura', label: 'Pintura', sub: 'peso de peças', icone: Paintbrush, cor: '#a855f7' },
];
const ROT = Object.fromEntries(ETAPAS.map((e) => [e.key, e.label]));
const kg = (v) => `${(Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;
const pct = (v) => (v == null ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
const corPct = (v) => (v == null ? 'text-slate-500' : v >= 95 ? 'text-emerald-400' : v >= 70 ? 'text-amber-400' : 'text-red-400');
const dataBR = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

function Painel({ titulo, sub, children }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl">
      <div className="px-4 pt-4 pb-2"><h3 className="text-white font-semibold">{titulo}</h3>{sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}</div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

export default function CoerenciaProducao({ coerencia, corteDiag, nomeObra }) {
  const [etapaLista, setEtapaLista] = useState('todas');
  const linhas = coerencia?.linhas || [];
  const semDono = useMemo(() => (coerencia?.semDono || []).filter((x) => etapaLista === 'todas' || x.etapa === etapaLista), [coerencia, etapaLista]);
  const obras = useMemo(() => [...(coerencia?.porObra || [])].sort((a, b) => b.fabricacao.produzido - a.fabricacao.produzido), [coerencia]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-400 flex gap-2">
        <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
        <span>
          Compara o que a fábrica <b className="text-slate-200">já produziu</b> (peso que passou de cada etapa, pelo Kanban) com o que está
          <b className="text-slate-200"> identificado por funcionário</b>. <span className="text-emerald-400">Apontado</span> = apontamento com pessoa e data;
          <span className="text-amber-400"> só responsável</span> = pessoa gravada na peça, sem data (não entra nos números por período);
          <span className="text-red-400"> sem dono</span> = ninguém identificado. O <b className="text-slate-200">corte</b> é medido à parte, em kg de
          material (perfis e chapas), e não soma com a produção de peças.
        </span>
      </div>

      {/* Cards por etapa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3">
        {ETAPAS.map((e) => {
          const l = linhas.find((x) => x.etapa === e.key);
          if (!l) return null;
          const tot = l.produzido || 1;
          const I = e.icone;
          return (
            <div key={e.key} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-white font-semibold">{e.label}</p><p className="text-[11px] text-slate-500">{e.sub}</p></div>
                <span className="p-1.5 rounded-lg" style={{ background: `${e.cor}22` }}><I className="h-4 w-4" style={{ color: e.cor }} /></span>
              </div>
              <p className="text-xs text-slate-400 mt-3">Produzido (já passou da etapa)</p>
              <p className="text-xl font-bold text-white">{kg(l.produzido)}</p>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-700 mt-2">
                <div className="bg-emerald-500" style={{ width: `${(l.apontado / tot) * 100}%` }} />
                <div className="bg-amber-500" style={{ width: `${(l.soResponsavel / tot) * 100}%` }} />
                <div className="bg-red-500/80" style={{ width: `${(l.semDono / tot) * 100}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-1 mt-2 text-[11px]">
                <div><p className="text-emerald-400">Apontado</p><p className="text-slate-200">{kg(l.apontado)}</p></div>
                <div><p className="text-amber-400">Só resp.</p><p className="text-slate-200">{kg(l.soResponsavel)}</p></div>
                <div><p className="text-red-400">Sem dono</p><p className="text-slate-200">{kg(l.semDono)}</p></div>
              </div>
              <p className={cn('text-sm font-semibold mt-2', corPct(l.pctIdentificado))}>{pct(l.pctIdentificado)} identificado</p>
            </div>
          );
        })}
      </div>

      {/* Corte: diagnóstico */}
      {corteDiag && (
        <Painel titulo="Corte — situação dos apontamentos" sub="Tabela de corte (materiais_corte). Só entram por período e por pessoa os cortes com data de conclusão e responsável.">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
            {[
              ['Finalizado', `${kg(corteDiag.kgFinalizado)} · ${corteDiag.finalizados} cortes`, 'text-white'],
              ['Sem data de conclusão', `${kg(corteDiag.kgSemData)} · ${corteDiag.semData}`, corteDiag.semData ? 'text-amber-400' : 'text-slate-200'],
              ['Sem responsável', `${kg(corteDiag.kgSemPessoa)} · ${corteDiag.semPessoa}`, corteDiag.semPessoa ? 'text-red-400' : 'text-slate-200'],
              ['Em corte / aguardando', `${kg(corteDiag.kgEmCorte)} / ${kg(corteDiag.kgAguardando)}`, 'text-slate-200'],
              ['Último corte apontado', dataBR(corteDiag.ultimo), 'text-slate-200'],
            ].map(([t, v, c]) => (
              <div key={t} className="rounded-lg bg-slate-900/50 p-3"><p className="text-xs text-slate-400">{t}</p><p className={cn('font-semibold mt-0.5', c)}>{v}</p></div>
            ))}
          </div>
          {corteDiag.semData > 0 && (
            <p className="text-xs text-slate-500 mt-3 flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              Cortes finalizados sem data/responsável foram marcados como concluídos em lote (fora do Kanban de Corte). Para contar por pessoa,
              finalize o corte pelo Kanban de Corte escolhendo o funcionário, ou lance a etapa Corte na aba Lançamentos.</p>
          )}
        </Painel>
      )}

      {/* Por obra */}
      <Painel titulo="Identificação por obra" sub="% do peso que passou da etapa com funcionário identificado (apontado + só responsável).">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-slate-400 text-xs border-b border-slate-700">
              <th className="py-2 px-2 text-left font-medium">Obra</th>
              {['fabricacao', 'solda', 'pintura'].map((e) => <th key={e} className="py-2 px-2 text-right font-medium">{ROT[e]}</th>)}
              <th className="py-2 px-2 text-right font-medium">Sem dono (fabricação)</th>
            </tr></thead>
            <tbody>
              {obras.filter((o) => o.fabricacao.produzido > 0).map((o) => (
                <tr key={o.obraId} className="border-b border-slate-800">
                  <td className="py-2 px-2 text-white min-w-[200px]">{nomeObra(o.obraId)}</td>
                  {['fabricacao', 'solda', 'pintura'].map((e) => (
                    <td key={e} className="py-2 px-2 text-right whitespace-nowrap">
                      <span className={cn('font-semibold', corPct(o[e].pctIdentificado))}>{pct(o[e].pctIdentificado)}</span>
                      <span className="text-xs text-slate-500"> de {kg(o[e].produzido)}</span>
                    </td>
                  ))}
                  <td className="py-2 px-2 text-right text-slate-300 tabular-nums">{o.fabricacao.semDono ? kg(o.fabricacao.semDono) : '—'}</td>
                </tr>
              ))}
              {!obras.length && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Sem peças no escopo.</td></tr>}
            </tbody>
          </table>
        </div>
      </Painel>

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        <Painel titulo="Peças produzidas sem funcionário identificado" sub="Maiores primeiro. Lance o responsável na aba Lançamentos por obra.">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[['todas', 'Todas'], ['fabricacao', 'Fabricação'], ['solda', 'Solda'], ['pintura', 'Pintura']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setEtapaLista(k)} className={cn('px-2.5 py-1 rounded-md text-xs border', etapaLista === k ? 'bg-slate-600 border-slate-500 text-white' : 'border-slate-700 text-slate-300')}>{l}</button>
            ))}
          </div>
          <ListaPecas itens={semDono.slice(0, 60)} total={semDono.length} nomeObra={nomeObra} vazio="Todas as peças produzidas têm funcionário identificado." />
        </Painel>
        <Painel titulo="Apontado, mas a peça não avançou" sub="O histórico diz que a etapa foi concluída, mas a peça está hoje antes dela Peças marcadas 'dividida' são normais (a parte que avançou virou outra peça); as demais são retorno de etapa ou apontamento indevido.">
          <ListaPecas itens={(coerencia?.apontadoSemAvanco || []).slice(0, 60)} total={(coerencia?.apontadoSemAvanco || []).length} nomeObra={nomeObra} mostrarAtual vazio="Nenhuma divergência." />
        </Painel>
      </div>
    </div>
  );
}

function ListaPecas({ itens, total, nomeObra, mostrarAtual, vazio }) {
  if (!itens.length) return <p className="text-sm text-emerald-400 flex items-center gap-2 py-4"><CheckCircle2 className="h-4 w-4" />{vazio}</p>;
  return (
    <div className="max-h-96 overflow-y-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-slate-400 text-xs border-b border-slate-700">
          <th className="py-2 px-2 text-left font-medium">Peça</th><th className="py-2 px-2 text-left font-medium">Obra</th>
          <th className="py-2 px-2 text-left font-medium">Etapa</th>{mostrarAtual && <th className="py-2 px-2 text-left font-medium">Etapa atual</th>}
          <th className="py-2 px-2 text-right font-medium">Peso</th>
        </tr></thead>
        <tbody>
          {itens.map((x, i) => (
            <tr key={`${x.id}-${x.etapa}-${i}`} className="border-b border-slate-800">
              <td className="py-1.5 px-2 text-white">{x.marca}{x.dividida && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300" title="Peça dividida: a parte que avançou virou outra peça e herdou o histórico">dividida</span>}</td>
              <td className="py-1.5 px-2 text-slate-300">{nomeObra(x.obraId)}</td>
              <td className="py-1.5 px-2 text-slate-300">{ROT[x.etapa] || x.etapa}</td>
              {mostrarAtual && <td className="py-1.5 px-2 text-amber-400">{x.etapaAtual}</td>}
              <td className="py-1.5 px-2 text-right tabular-nums text-slate-200">{kg(x.kg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {total > itens.length && <p className="text-xs text-slate-500 mt-2">Mostrando {itens.length} de {total}.</p>}
    </div>
  );
}
