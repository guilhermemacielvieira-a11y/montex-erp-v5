// ============================================================
// BI 360 — Aba Produção
// ============================================================
// Responde: "quanto a fábrica entrega por semana, onde trava e quem produz?"
// Fonte: producao_historico (transições de etapa) + pecas_producao.
// ============================================================

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { Gauge, Layers, Timer, Activity, XCircle, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SERIES, STATUS, GRID, fmtKg, fmtNum, fmtData, tooltipProps, eixoProps, KpiTile, ChartCard, Legenda,
} from '@/components/bi/biUi';
import { isoLocal } from '@/services/bi/biCore';
import {
  ResumoAba, BotaoCSV, BotaoTabela, TabelaDados, baixarCSV, rotuloSemana, ROTULO_ETAPA, mediaLista,
} from './AbaExecutivo';

const ETAPAS = ['fabricacao', 'solda', 'pintura'];
// Cor segue a etapa em toda a aba (SERIES em ordem fixa).
const COR_ETAPA = { fabricacao: SERIES[0], solda: SERIES[1], pintura: SERIES[2] };
const ROTULO_CONCLUIU = { fabricacao: 'Fabricação concluída', solda: 'Solda concluída', pintura: 'Pintura concluída (pronta)' };

function statusFila(l) {
  if (l.travada) return { rotulo: 'Travada', cor: STATUS.critico, icone: XCircle };
  if (l.semanasFila === null || l.semanasFila === 0) return { rotulo: 'Sem fila', cor: STATUS.bom, icone: CheckCircle2 };
  if (l.semanasFila > 4) return { rotulo: 'Fila longa', cor: STATUS.serio, icone: AlertTriangle };
  if (l.semanasFila > 2) return { rotulo: 'Atenção', cor: STATUS.atencao, icone: AlertCircle };
  return { rotulo: 'Fluindo', cor: STATUS.bom, icone: CheckCircle2 };
}

export default function AbaProducao({ dados }) {
  const { producao, nomeObra } = dados;
  const [tabelaRitmo, setTabelaRitmo] = useState(false);
  const [tabelaFunil, setTabelaFunil] = useState(false);

  const ritmo = useMemo(() => producao.ritmo.map((r) => ({ ...r, rotulo: rotuloSemana(r.semana) })), [producao.ritmo]);
  const temRitmo = ritmo.some((r) => r.fabricacao || r.solda || r.pintura);

  const funil = useMemo(() => producao.funil.map((f) => {
    const w = producao.wip.resumo.find((x) => x.etapa === f.etapa);
    return { ...f, rotulo: ROTULO_ETAPA[f.etapa] || f.etapa, pecas: w?.pecas || 0 };
  }), [producao.funil, producao.wip.resumo]);
  const temFunil = funil.some((f) => f.kg > 0);

  const lead = useMemo(() => producao.leadTimes.map((l) => ({ ...l, rotulo: ROTULO_ETAPA[l.etapa] })), [producao.leadTimes]);
  const temLead = lead.some((l) => l.amostras > 0);

  const wipFabrica = useMemo(() => producao.wip.resumo.filter((r) => ETAPAS.includes(r.etapa)), [producao.wip.resumo]);
  const wipKg = wipFabrica.reduce((s, r) => s + r.kg, 0);
  const wipPecas = wipFabrica.reduce((s, r) => s + r.pecas, 0);
  const leadTotal = lead.every((l) => l.medianaDias !== null) ? lead.reduce((s, l) => s + l.medianaDias, 0) : null;

  const envelhecido = useMemo(() => (
    producao.wip.itens.filter((i) => i.idadeDias !== null).sort((a, b) => b.idadeDias - a.idadeDias).slice(0, 15)
      .map((i) => ({ ...i, obra: nomeObra(i.obraId), desdeIso: i.desde ? isoLocal(i.desde) : null }))
  ), [producao.wip.itens, nomeObra]);

  const ranking = useMemo(() => producao.ranking.slice(0, 10).map((r) => ({
    funcionario: r.funcionario, kg: r.kg, pecas: r.pecas,
    fabricacao: Math.round(r.etapas.fabricacao || 0), solda: Math.round(r.etapas.solda || 0), pintura: Math.round(r.etapas.pintura || 0),
  })), [producao.ranking]);

  const frases = useMemo(() => {
    const out = [];
    const t = producao.tendencia;
    if (t.variacaoPct !== null) {
      out.push({ tom: t.variacaoPct >= 0 ? 'bom' : t.variacaoPct <= -20 ? 'serio' : 'atencao', texto: `Peças prontas: ${fmtKg(t.kgSemanaAtual)}/semana, ${fmtNum(Math.abs(t.variacaoPct), 0)}% ${t.variacaoPct >= 0 ? 'acima' : 'abaixo'} das 4 semanas anteriores.` });
    }
    const g = producao.gargalo;
    if (g.etapa) {
      const l = g.linhas.find((x) => x.etapa === g.etapa);
      out.push({
        tom: l.travada ? 'critico' : 'serio',
        texto: l.travada
          ? `Gargalo em ${ROTULO_ETAPA[g.etapa]}: ${fmtKg(l.wipKg)} em fila sem nenhuma saída em 4 semanas.`
          : `Gargalo em ${ROTULO_ETAPA[g.etapa]}: ${fmtNum(l.semanasFila, 1)} semanas de fila (${fmtKg(l.wipKg)} ÷ ${fmtKg(l.saidaKgSemana)}/sem).`,
      });
    }
    const lentos = lead.filter((l) => l.medianaDias !== null).sort((a, b) => b.medianaDias - a.medianaDias);
    if (lentos.length) out.push({ tom: 'info', texto: `Etapa mais demorada: ${lentos[0].rotulo} — metade das peças leva até ${fmtNum(lentos[0].medianaDias, 1)} dias (10% passam de ${fmtNum(lentos[0].p90Dias, 1)}).` });
    const velhos = producao.wip.itens.filter((i) => (i.idadeDias || 0) > 30);
    if (velhos.length) out.push({ tom: 'atencao', texto: `${velhos.length} peça(s) há mais de 30 dias na mesma etapa (${fmtKg(velhos.reduce((s, i) => s + i.kg, 0))}).` });
    if (producao.ranking.length) {
      const totalKg = producao.ranking.reduce((s, r) => s + r.kg, 0);
      const top3 = producao.ranking.slice(0, 3).reduce((s, r) => s + r.kg, 0);
      if (totalKg > 0) out.push({ tom: 'info', texto: `Nos últimos 30 dias, os 3 mais produtivos responderam por ${fmtNum((top3 / totalKg) * 100, 0)}% dos kg concluídos (${producao.ranking.length} funcionário(s) com registro).` });
    }
    if (!producao.transicoes) out.push({ tom: 'atencao', texto: 'Nenhuma movimentação de etapa registrada no histórico para o escopo.' });
    return out;
  }, [producao, lead]);

  const exportarWip = () => baixarCSV('bi360_wip_envelhecido', [
    { chave: 'marca', rotulo: 'Marca' }, { chave: 'obra', rotulo: 'Obra' },
    { chave: 'etapa', rotulo: 'Etapa', csv: (l) => ROTULO_ETAPA[l.etapa] }, { chave: 'kg', rotulo: 'kg' },
    { chave: 'idadeDias', rotulo: 'Dias na etapa' }, { chave: 'desdeIso', rotulo: 'Desde' },
  ], producao.wip.itens.filter((i) => i.idadeDias !== null).sort((a, b) => b.idadeDias - a.idadeDias)
    .map((i) => ({ ...i, obra: nomeObra(i.obraId), desdeIso: i.desde ? isoLocal(i.desde) : null })));

  return (
    <div className="space-y-4">
      <ResumoAba frases={frases} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiTile icone={Gauge} rotulo="Peças prontas / semana" valor={fmtKg(producao.tendencia.kgSemanaAtual)} tendencia={producao.tendencia.variacaoPct} sub="média 4 sem. vs 4 anteriores" />
        <KpiTile icone={Layers} rotulo="WIP na fábrica" valor={fmtKg(wipKg)} sub={`${fmtNum(wipPecas)} peça(s) em fabricação, solda ou pintura`} />
        <KpiTile icone={Timer} rotulo="Lead time típico" valor={leadTotal !== null ? `${fmtNum(leadTotal, 1)} dias` : '—'} sub="soma das medianas das 3 etapas" ajuda="Tempo entre entrar e sair de cada etapa, por peça (mediana)." />
        <KpiTile icone={Activity} rotulo="Movimentações analisadas" valor={fmtNum(producao.transicoes)} sub="transições de etapa no histórico" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard
          className="xl:col-span-2"
          titulo="Ritmo semanal por etapa concluída"
          subtitulo="Quantos kg cada etapa entrega por semana? A diferença entre as barras mostra onde o fluxo represa."
          vazio={!temRitmo}
          mensagemVazio="Sem movimentações nas últimas 12 semanas."
          acao={<BotaoTabela tabela={tabelaRitmo} onClick={() => setTabelaRitmo((v) => !v)} />}
        >
          <div className="mb-2"><Legenda itens={ETAPAS.map((e) => ({ rotulo: ROTULO_CONCLUIU[e], cor: COR_ETAPA[e] }))} /></div>
          {tabelaRitmo ? (
            <TabelaDados
              colunas={[{ chave: 'rotulo', rotulo: 'Semana', alinhar: 'esq' }, ...ETAPAS.map((e) => ({ chave: e, rotulo: ROTULO_ETAPA[e], fmt: fmtKg }))]}
              linhas={ritmo}
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ritmo} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={1}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="rotulo" {...eixoProps} interval="preserveStartEnd" />
                  <YAxis {...eixoProps} width={56} tickFormatter={fmtKg} />
                  <Tooltip {...tooltipProps} formatter={(v, n) => [fmtKg(v), n]} labelFormatter={(l) => `Semana de ${l}`} />
                  {ETAPAS.map((e) => <Bar key={e} dataKey={e} name={ROTULO_ETAPA[e]} fill={COR_ETAPA[e]} radius={[4, 4, 0, 0]} maxBarSize={14} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          titulo="Funil — kg por etapa atual"
          subtitulo="Onde está o peso hoje, do aguardando ao concluído?"
          vazio={!temFunil}
          acao={<BotaoTabela tabela={tabelaFunil} onClick={() => setTabelaFunil((v) => !v)} />}
        >
          {tabelaFunil ? (
            <TabelaDados
              colunas={[{ chave: 'rotulo', rotulo: 'Etapa', alinhar: 'esq' }, { chave: 'pecas', rotulo: 'Peças', fmt: (v) => fmtNum(v) }, { chave: 'kg', rotulo: 'kg', fmt: fmtKg }]}
              linhas={funil}
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funil} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis type="number" {...eixoProps} tickFormatter={fmtKg} />
                  <YAxis type="category" dataKey="rotulo" {...eixoProps} width={104} />
                  <Tooltip {...tooltipProps} formatter={(v, n, p) => [`${fmtKg(v)} · ${fmtNum(p?.payload?.pecas)} peça(s)`, 'Peso']} />
                  <Bar dataKey="kg" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          titulo="Gargalo — semanas de fila por etapa"
          subtitulo="Qual etapa segura a fábrica? Semanas de fila = kg em WIP ÷ saída média (4 semanas). Faixas: até 2 fluindo, 2–4 atenção, acima de 4 fila longa."
          vazio={!producao.gargalo.linhas.some((l) => l.wipKg > 0 || l.saidaKgSemana > 0)}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left font-medium px-2 py-1.5">Etapa</th>
                  <th className="text-right font-medium px-2 py-1.5">WIP</th>
                  <th className="text-right font-medium px-2 py-1.5">Saída/sem</th>
                  <th className="text-right font-medium px-2 py-1.5">Semanas de fila</th>
                  <th className="text-left font-medium px-2 py-1.5">Situação</th>
                </tr>
              </thead>
              <tbody>
                {producao.gargalo.linhas.map((l) => {
                  const s = statusFila(l);
                  const I = s.icone;
                  const eh = producao.gargalo.etapa === l.etapa;
                  return (
                    <tr key={l.etapa} className={cn('border-b border-slate-800/70', eh && 'bg-slate-800/60')}>
                      <td className="px-2 py-2 text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_ETAPA[l.etapa] }} aria-hidden />
                          {ROTULO_ETAPA[l.etapa]}
                          {eh && <span className="rounded border border-slate-600 px-1 text-[11px] text-slate-200">gargalo</span>}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-200">{fmtKg(l.wipKg)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-200">{fmtKg(l.saidaKgSemana)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-100 font-medium">{l.travada ? '∞' : fmtNum(l.semanasFila, 1)}</td>
                      <td className="px-2 py-2">
                        <span className="inline-flex items-center gap-1 text-slate-200"><I className="h-3.5 w-3.5" style={{ color: s.cor }} aria-hidden /> {s.rotulo}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard
          titulo="Lead time por etapa (dias)"
          subtitulo="Quanto tempo uma peça fica em cada etapa? Mediana = caso típico; P90 = 9 em cada 10 peças saem até aqui."
          vazio={!temLead}
          mensagemVazio="Histórico insuficiente para medir tempos por etapa."
        >
          <div className="mb-2"><Legenda itens={[{ rotulo: 'Mediana', cor: SERIES[0] }, { rotulo: 'P90', cor: SERIES[3] }]} /></div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lead} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" {...eixoProps} tickFormatter={(v) => `${fmtNum(v)} d`} />
                <YAxis type="category" dataKey="rotulo" {...eixoProps} width={84} />
                <Tooltip {...tooltipProps} formatter={(v, n, p) => [v === null ? '—' : `${fmtNum(v, 1)} dias (${fmtNum(p?.payload?.amostras)} amostras)`, n]} />
                <Bar dataKey="medianaDias" name="Mediana" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={16} />
                <Bar dataKey="p90Dias" name="P90" fill={SERIES[3]} radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          titulo="WIP envelhecido — 15 peças mais antigas"
          subtitulo="Quais peças estão esquecidas no chão de fábrica? Dias desde que entraram na etapa atual."
          vazio={!envelhecido.length}
          mensagemVazio="Nenhuma peça em fabricação, solda ou pintura."
          acao={<BotaoCSV onClick={exportarWip} disabled={!envelhecido.length} />}
        >
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left font-medium px-2 py-1.5">Marca</th>
                  <th className="text-left font-medium px-2 py-1.5">Obra</th>
                  <th className="text-left font-medium px-2 py-1.5">Etapa</th>
                  <th className="text-right font-medium px-2 py-1.5">kg</th>
                  <th className="text-right font-medium px-2 py-1.5">Dias</th>
                  <th className="text-right font-medium px-2 py-1.5">Desde</th>
                </tr>
              </thead>
              <tbody>
                {envelhecido.map((i) => (
                  <tr key={i.id} className="border-b border-slate-800/70 text-slate-200">
                    <td className="px-2 py-1.5 font-mono">{i.marca}</td>
                    <td className="px-2 py-1.5 max-w-[180px]"><div className="truncate" title={i.obra}>{i.obra}</div></td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: COR_ETAPA[i.etapa] }} aria-hidden />{ROTULO_ETAPA[i.etapa]}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtKg(i.kg)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-medium text-slate-100">{fmtNum(i.idadeDias)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-400">{fmtData(i.desdeIso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Sem histórico de entrada na etapa, a idade usa a última atualização da peça (aproximação).</p>
        </ChartCard>

        <ChartCard
          titulo="Produtividade por funcionário — 30 dias"
          subtitulo="Quem mais concluiu etapas no último mês? kg concluídos por etapa (top 10)."
          vazio={!ranking.length}
          mensagemVazio="Sem movimentações com funcionário registrado nos últimos 30 dias."
          acao={<BotaoCSV disabled={!producao.ranking.length} onClick={() => baixarCSV('bi360_produtividade_30d', [
            { chave: 'funcionario', rotulo: 'Funcionário' }, { chave: 'kg', rotulo: 'kg total' }, { chave: 'pecas', rotulo: 'Etapas concluídas' },
            ...ETAPAS.map((e) => ({ chave: e, rotulo: `kg ${ROTULO_ETAPA[e]}`, csv: (l) => Math.round(l.etapas[e] || 0) })),
          ], producao.ranking)} />}
        >
          <div className="mb-2"><Legenda itens={ETAPAS.map((e) => ({ rotulo: ROTULO_ETAPA[e], cor: COR_ETAPA[e] }))} /></div>
          <div style={{ height: Math.max(160, ranking.length * 30 + 20) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ranking} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" {...eixoProps} tickFormatter={fmtKg} />
                <YAxis type="category" dataKey="funcionario" {...eixoProps} width={120} tickFormatter={(v) => (String(v).length > 16 ? `${String(v).slice(0, 15)}…` : v)} />
                <Tooltip {...tooltipProps} formatter={(v, n) => [fmtKg(v), n]} />
                {ETAPAS.map((e, idx) => (
                  <Bar key={e} dataKey={e} name={ROTULO_ETAPA[e]} stackId="f" fill={COR_ETAPA[e]} maxBarSize={18} radius={idx === ETAPAS.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {mediaLista(ranking.map((r) => r.kg)) !== null && (
            <p className="mt-1 text-[11px] text-slate-500">Média do top 10: {fmtKg(mediaLista(ranking.map((r) => r.kg)))} por funcionário. Etapas registradas pelo nome do funcionário no histórico.</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
