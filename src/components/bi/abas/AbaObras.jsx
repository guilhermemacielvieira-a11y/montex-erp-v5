// ============================================================
// BI 360 — Aba Obras
// ============================================================
// Responde: "as obras estão produzindo e faturando no mesmo passo? vão
// terminar no prazo?" — matriz físico × financeiro, curva S do escopo e
// tabela completa ordenável (com drill-down para a GFO).
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ReferenceLine,
  LineChart, Line,
} from 'recharts';
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SERIES, NEUTRO, GRID, fmtBRL, fmtBRLc, fmtKg, fmtPct, fmtNum, fmtData, tooltipProps, eixoProps, ChartCard, Legenda,
} from '@/components/bi/biUi';
import {
  ResumoAba, BotaoCSV, BotaoTabela, TabelaDados, baixarCSV, SituacaoObra, GapObra, situacaoObra, rotuloSemana,
} from './AbaExecutivo';

const COLUNAS = [
  { chave: 'nome', rotulo: 'Obra', tipo: 'texto' },
  { chave: 'kgTotal', rotulo: 'kg total', fmt: fmtKg },
  { chave: 'kgPronto', rotulo: 'Pronto', fmt: fmtKg },
  { chave: 'kgEmObra', rotulo: 'Em obra', fmt: fmtKg },
  { chave: 'kgRestante', rotulo: 'Restante', fmt: fmtKg },
  { chave: 'fisicoPct', rotulo: 'Físico', fmt: (v) => fmtPct(v, 0) },
  { chave: 'valorContrato', rotulo: 'Contrato', fmt: (v, l) => (l.semContrato ? '—' : fmtBRLc(v)) },
  { chave: 'medido', rotulo: 'Medido', fmt: fmtBRLc },
  { chave: 'financeiroPct', rotulo: 'Financeiro', fmt: (v) => fmtPct(v, 0) },
  { chave: 'gapPp', rotulo: 'Gap', tipo: 'gap' },
  { chave: 'recebido', rotulo: 'Recebido', fmt: fmtBRLc },
  { chave: 'aReceber', rotulo: 'A receber', fmt: fmtBRLc },
  { chave: 'material', rotulo: 'Material', fmt: fmtBRLc },
  { chave: 'ritmoKgSemana', rotulo: 'Ritmo/sem', fmt: fmtKg },
  { chave: 'previsaoFim', rotulo: 'Previsão', fmt: fmtData },
  { chave: 'prazo', rotulo: 'Prazo', fmt: fmtData },
  { chave: 'atrasoDias', rotulo: 'Atraso', tipo: 'situacao' },
];

function DicaScatter({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={tooltipProps.contentStyle} className="px-3 py-2 space-y-0.5">
      <div className="font-semibold text-slate-100">{p.codigo ? `${p.codigo} · ` : ''}{p.nome}</div>
      <div>Físico: {fmtPct(p.fisicoPct, 0)} · Financeiro: {fmtPct(p.financeiroPct, 0)}</div>
      <div>Gap: {p.gapPp > 0 ? '+' : ''}{fmtNum(p.gapPp, 0)} pp</div>
      <div>Contrato: {fmtBRLc(p.valorContrato)}</div>
    </div>
  );
}

export default function AbaObras({ dados, obraDestacada, onDestacarObra, onAbrirGFO }) {
  const { obras } = dados;
  const [soAtivas, setSoAtivas] = useState(true);
  const [ordem, setOrdem] = useState({ chave: 'valorContrato', dir: 'desc' });
  const [tabelaCurva, setTabelaCurva] = useState(false);
  const linhaRef = useRef(null);

  const base = useMemo(() => obras.indicadores.filter((i) => !soAtivas || i.ativa || i.id === obraDestacada), [obras.indicadores, soAtivas, obraDestacada]);

  const linhas = useMemo(() => {
    const { chave, dir } = ordem;
    const sinal = dir === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      const va = a[chave];
      const vb = b[chave];
      if (va === null || va === undefined) return 1; // nulos sempre no fim
      if (vb === null || vb === undefined) return -1;
      if (typeof va === 'string') return va.localeCompare(vb, 'pt-BR') * sinal;
      return (va - vb) * sinal;
    });
  }, [base, ordem]);

  const pontos = useMemo(() => base.filter((i) => i.fisicoPct !== null && i.financeiroPct !== null), [base]);
  const foraMatriz = useMemo(() => base.filter((i) => i.fisicoPct === null || i.financeiroPct === null), [base]);
  const yMax = useMemo(() => Math.max(100, ...pontos.map((p) => Math.ceil(p.financeiroPct / 10) * 10)), [pontos]);

  const curva = useMemo(() => (obras.curva.pontos || []).map((p) => ({ ...p, rotulo: rotuloSemana(p.semana) })), [obras.curva.pontos]);
  const temCurva = curva.some((p) => p.realizado !== null && p.realizado > 0) || obras.curva.temPlano;
  const ultimoReal = useMemo(() => [...curva].reverse().find((p) => p.realizado !== null), [curva]);

  useEffect(() => {
    // Rola até a obra destacada (drill-down vindo do Executivo/matriz).
    if (obraDestacada) linhaRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [obraDestacada]);

  const frases = useMemo(() => {
    const out = [];
    const ativas = obras.indicadores.filter((i) => i.ativa);
    const semMedir = ativas.filter((i) => i.gapPp !== null && i.gapPp <= -15);
    const adiant = ativas.filter((i) => i.gapPp !== null && i.gapPp >= 15);
    if (semMedir.length) {
      const pior = [...semMedir].sort((a, b) => a.gapPp - b.gapPp)[0];
      out.push({ tom: 'serio', texto: `${semMedir.length} obra(s) produziram ≥ 15 pp além do medido — dinheiro parado na fábrica. Maior: ${pior.nome} (${fmtNum(pior.gapPp, 0)} pp).` });
    }
    if (adiant.length) {
      out.push({ tom: 'atencao', texto: `${adiant.length} obra(s) com medição ≥ 15 pp à frente da produção — risco de entrega sem caixa.` });
    }
    if (ativas.length && !semMedir.length && !adiant.length) {
      out.push({ tom: 'bom', texto: 'Físico e financeiro das obras ativas andam juntos (gaps abaixo de 15 pp).' });
    }
    const atrasadas = ativas.filter((i) => (i.atrasoDias || 0) > 0);
    if (atrasadas.length) out.push({ tom: 'serio', texto: `${atrasadas.length} de ${ativas.length} obra(s) ativa(s) com previsão após o prazo.` });
    const semPrazo = ativas.filter((i) => !i.prazo).length;
    if (semPrazo) out.push({ tom: 'info', texto: `${semPrazo} obra(s) sem prazo cadastrado — não entram na análise de atraso nem na curva planejada.` });
    const semRitmo = ativas.filter((i) => i.kgRestante > 0 && !i.ritmoKgSemana).length;
    if (semRitmo) out.push({ tom: 'atencao', texto: `${semRitmo} obra(s) com saldo a produzir e nenhuma peça pronta nas últimas 4 semanas.` });
    if (ultimoReal && obras.curva.temPlano) {
      const desvio = ultimoReal.planejado ? ((ultimoReal.realizado - ultimoReal.planejado) / ultimoReal.planejado) * 100 : null;
      if (desvio !== null) out.push({ tom: desvio >= -5 ? 'bom' : desvio >= -15 ? 'atencao' : 'serio', texto: `Curva S do escopo: realizado ${fmtNum(Math.abs(desvio), 0)}% ${desvio >= 0 ? 'acima' : 'abaixo'} do planejado linear.` });
    }
    return out;
  }, [obras.indicadores, obras.curva.temPlano, ultimoReal]);

  const alternarOrdem = (chave) => setOrdem((o) => (o.chave === chave ? { chave, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { chave, dir: chave === 'nome' ? 'asc' : 'desc' }));

  const exportar = () => baixarCSV('bi360_obras', [
    { chave: 'codigo', rotulo: 'Código' }, { chave: 'nome', rotulo: 'Obra' }, { chave: 'status', rotulo: 'Status' },
    { chave: 'kgTotal', rotulo: 'kg total' }, { chave: 'kgPronto', rotulo: 'kg pronto' }, { chave: 'kgEmObra', rotulo: 'kg em obra' },
    { chave: 'kgRestante', rotulo: 'kg restante' }, { chave: 'fisicoPct', rotulo: 'Físico %' },
    { chave: 'valorContrato', rotulo: 'Contrato R$' }, { chave: 'medido', rotulo: 'Medido R$' }, { chave: 'financeiroPct', rotulo: 'Financeiro %' },
    { chave: 'gapPp', rotulo: 'Gap pp' }, { chave: 'recebido', rotulo: 'Recebido R$' }, { chave: 'aReceber', rotulo: 'A receber R$' },
    { chave: 'saldoAMedir', rotulo: 'Saldo a medir R$' }, { chave: 'material', rotulo: 'Material R$' },
    { chave: 'ritmoKgSemana', rotulo: 'Ritmo kg/sem' }, { chave: 'previsaoFim', rotulo: 'Previsão' }, { chave: 'prazo', rotulo: 'Prazo' },
    { chave: 'atrasoDias', rotulo: 'Atraso (dias)' }, { chave: 'sit', rotulo: 'Situação', csv: (l) => situacaoObra(l).rotulo },
  ], linhas);

  return (
    <div className="space-y-4">
      <ResumoAba frases={frases} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          titulo="Matriz físico × financeiro"
          subtitulo="Cada obra está medindo no mesmo passo em que produz? Acima da diagonal: mediu mais do que produziu; abaixo: produziu sem medir. Tamanho = valor do contrato."
          vazio={!pontos.length}
          mensagemVazio="Nenhuma obra com contrato e peso cadastrados no escopo."
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis type="number" dataKey="fisicoPct" name="Físico" domain={[0, 100]} unit="%" {...eixoProps}
                  label={{ value: 'Físico (fábrica) %', position: 'insideBottom', offset: -4, fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="number" dataKey="financeiroPct" name="Financeiro" domain={[0, yMax]} unit="%" width={48} {...eixoProps} />
                <ZAxis type="number" dataKey="valorContrato" range={[60, 600]} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke={NEUTRO} strokeDasharray="4 4" ifOverflow="extendDomain" />
                <Tooltip content={<DicaScatter />} cursor={{ strokeDasharray: '3 3', stroke: '#334155' }} />
                <Scatter
                  data={pontos}
                  fill={SERIES[0]}
                  fillOpacity={0.75}
                  onClick={(p) => onDestacarObra?.(p?.payload?.id ?? p?.id)}
                  className="cursor-pointer"
                  shape={(props) => {
                    const { cx, cy, size, payload } = props;
                    const r = Math.max(4, Math.sqrt(size || 60) / 1.6);
                    const dest = payload.id === obraDestacada;
                    return <circle cx={cx} cy={cy} r={r} fill={SERIES[0]} fillOpacity={dest ? 1 : 0.7} stroke={dest ? '#f8fafc' : '#0f172a'} strokeWidth={dest ? 2.5 : 1} />;
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          {foraMatriz.length > 0 && (
            <div className="mt-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1"><Info className="h-3.5 w-3.5" aria-hidden /> Fora da matriz (sem contrato ou sem peso):</span>{' '}
              {foraMatriz.map((i, idx) => (
                <button key={i.id} type="button" onClick={() => onDestacarObra?.(i.id)} className="text-slate-300 hover:text-white underline-offset-2 hover:underline">
                  {i.nome}{idx < foraMatriz.length - 1 ? ', ' : ''}
                </button>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard
          titulo="Curva S do escopo (kg prontos acumulados)"
          subtitulo={obras.curva.temPlano
            ? 'A produção acumulada está acompanhando o plano? Planejado = avanço linear entre início e prazo das obras ativas.'
            : 'Quanto já ficou pronto ao longo do tempo? (sem curva planejada)'}
          vazio={!temCurva}
          mensagemVazio="Sem histórico de produção nas obras ativas do escopo."
          acao={<BotaoTabela tabela={tabelaCurva} onClick={() => setTabelaCurva((v) => !v)} />}
        >
          {!obras.curva.temPlano && (
            <p className="mb-2 text-xs text-amber-300/90 inline-flex items-center gap-1">
              <Info className="h-3.5 w-3.5" aria-hidden /> Cadastre prazo e peso de contrato de todas as obras ativas para ver a curva planejada.
            </p>
          )}
          {obras.curva.temPlano && <div className="mb-2"><Legenda itens={[{ rotulo: 'Realizado', cor: SERIES[0] }, { rotulo: 'Planejado (linear)', cor: SERIES[1], tracejado: true }]} /></div>}
          {tabelaCurva ? (
            <TabelaDados
              colunas={[
                { chave: 'rotulo', rotulo: 'Semana', alinhar: 'esq' },
                { chave: 'realizado', rotulo: 'Realizado', fmt: (v) => (v === null ? '—' : fmtKg(v)) },
                ...(obras.curva.temPlano ? [{ chave: 'planejado', rotulo: 'Planejado', fmt: (v) => (v === null ? '—' : fmtKg(v)) }] : []),
              ]}
              linhas={curva}
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curva} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="rotulo" {...eixoProps} minTickGap={24} />
                  <YAxis {...eixoProps} width={56} tickFormatter={fmtKg} />
                  <Tooltip {...tooltipProps} formatter={(v, n) => [v === null ? '—' : fmtKg(v), n]} labelFormatter={(l) => `Semana de ${l}`} />
                  {obras.curva.kgTotal > 0 && <ReferenceLine y={obras.curva.kgTotal} stroke={NEUTRO} strokeDasharray="2 4" />}
                  <Line type="monotone" dataKey="realizado" name="Realizado" stroke={SERIES[0]} strokeWidth={2} dot={false} activeDot={{ r: 5 }} connectNulls={false} />
                  {obras.curva.temPlano && (
                    <Line type="linear" dataKey="planejado" name="Planejado" stroke={SERIES[1]} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 5 }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {obras.curva.kgTotal > 0 && <p className="mt-1 text-[11px] text-slate-500">Linha pontilhada horizontal = peso contratual total ({fmtKg(obras.curva.kgTotal)}).</p>}
        </ChartCard>
      </div>

      <ChartCard
        titulo="Todas as obras"
        subtitulo="Onde está cada obra em peso, dinheiro e prazo? Clique no cabeçalho para ordenar; na linha para destacar."
        vazio={!linhas.length}
        mensagemVazio="Nenhuma obra no escopo."
        acao={(
          <div className="flex items-center gap-2 shrink-0">
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input type="checkbox" checked={soAtivas} onChange={(e) => setSoAtivas(e.target.checked)} className="accent-slate-400" />
              Só ativas
            </label>
            <BotaoCSV onClick={exportar} disabled={!linhas.length} />
          </div>
        )}
      >
        <div className="overflow-x-auto max-h-[560px] overflow-y-auto rounded-lg border border-slate-800">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900 z-10">
              <tr className="text-slate-400">
                {COLUNAS.map((c) => {
                  const ativo = ordem.chave === c.chave;
                  const I = !ativo ? ArrowUpDown : ordem.dir === 'asc' ? ArrowUp : ArrowDown;
                  return (
                    <th key={c.chave} className={cn('px-2 py-2 font-medium whitespace-nowrap', c.tipo === 'texto' ? 'text-left' : 'text-right')}
                      aria-sort={ativo ? (ordem.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" onClick={() => alternarOrdem(c.chave)} className={cn('inline-flex items-center gap-1 hover:text-white', ativo && 'text-white')}>
                        {c.rotulo} <I className="h-3 w-3" aria-hidden />
                      </button>
                    </th>
                  );
                })}
                <th className="px-2 py-2" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const dest = l.id === obraDestacada;
                return (
                  <tr
                    key={l.id}
                    ref={dest ? linhaRef : null}
                    onClick={() => onDestacarObra?.(dest ? null : l.id)}
                    className={cn('border-t border-slate-800 cursor-pointer', dest ? 'bg-sky-500/10 outline outline-1 outline-sky-400/60' : 'hover:bg-slate-800/40', !l.ativa && 'opacity-70')}
                  >
                    {COLUNAS.map((c) => (
                      <td key={c.chave} className={cn('px-2 py-1.5 tabular-nums whitespace-nowrap text-slate-200', c.tipo === 'texto' ? 'text-left max-w-[240px]' : 'text-right')}>
                        {c.tipo === 'texto' && (
                          <div className="truncate" title={l.nome}>
                            {l.codigo ? <span className="text-slate-400">{l.codigo} · </span> : null}{l.nome}
                            {!l.ativa && <span className="ml-1 text-slate-500">({l.status})</span>}
                          </div>
                        )}
                        {c.tipo === 'gap' && <GapObra gap={l.gapPp} />}
                        {c.tipo === 'situacao' && <SituacaoObra ind={l} />}
                        {!c.tipo && c.fmt(l[c.chave], l)}
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onAbrirGFO?.(l.id); }}
                        title="Abrir a Gestão Financeira desta obra (o seletor do topo passa para esta obra)"
                        className="inline-flex items-center gap-1 rounded border border-slate-700 px-1.5 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800"
                      >
                        GFO <ExternalLink className="h-3 w-3" aria-hidden />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Físico = kg pintado (expedido, em obra ou concluído) ÷ peso de contrato. Financeiro = medições reconhecidas ÷ contrato.
          Previsão = kg restante ÷ ritmo das últimas 4 semanas. Material = despesas lançadas na obra (GFO). Total de contratos listados: {fmtBRL(linhas.reduce((s, l) => s + (l.valorContrato || 0), 0))}.
        </p>
      </ChartCard>
    </div>
  );
}
