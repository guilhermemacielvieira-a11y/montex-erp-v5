// ============================================================
// BI 360 — Aba Executivo (+ helpers de UI compartilhados pelas abas)
// ============================================================
// Responde: "como está a empresa agora?" — carteira, ritmo, faturamento,
// inadimplência, obras em risco e os alertas mais graves.
// Os helpers exportados aqui (CSV, toggle de tabela, frases-resumo, status de
// obra) são usados pelas demais abas do BI 360.
// ============================================================

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import {
  Wallet, Weight, Gauge, Receipt, AlertTriangle, CalendarClock, Download, Table2, BarChart3,
  CheckCircle2, AlertCircle, XCircle, MinusCircle, Clock, Lightbulb, ArrowUpRight, ArrowDownRight,
  ChevronRight, Siren,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SERIES, STATUS, NEUTRO, GRID, fmtBRL, fmtBRLc, fmtKg, fmtPct, fmtNum, fmtData, tooltipProps, eixoProps,
  KpiTile, ChartCard,
} from '@/components/bi/biUi';
import { rotuloSemana, rotuloMes, ROTULO_ETAPA } from '@/services/bi/biCore';
import { SEVERIDADES, REGRAS } from '@/services/bi/radarAlertas';

// ============================================================
// Helpers compartilhados
// ============================================================

const numCSV = (v) => (typeof v === 'number' && Number.isFinite(v) ? String(v).replace('.', ',') : v);

/** Baixa CSV (separador ';', decimal vírgula, BOM UTF-8 — abre direto no Excel BR). */
export function baixarCSV(nomeArquivo, colunas, linhas) {
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(numCSV(v));
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cab = colunas.map((c) => esc(c.rotulo)).join(';');
  const corpo = (linhas || []).map((l) => colunas.map((c) => esc(c.csv ? c.csv(l) : l[c.chave])).join(';'));
  const blob = new Blob([`﻿${[cab, ...corpo].join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nomeArquivo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BotaoCSV({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Exportar CSV"
      className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 shrink-0"
    >
      <Download className="h-3.5 w-3.5" aria-hidden /> CSV
    </button>
  );
}

/** Alterna gráfico ↔ tabela (acessibilidade). */
export function BotaoTabela({ tabela, onClick }) {
  const Icone = tabela ? BarChart3 : Table2;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={tabela}
      className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 shrink-0"
    >
      <Icone className="h-3.5 w-3.5" aria-hidden /> {tabela ? 'Ver gráfico' : 'Ver tabela'}
    </button>
  );
}

/** Tabela simples (usada pelo "ver tabela" dos gráficos). colunas: [{chave, rotulo, fmt?, alinhar?}] */
export function TabelaDados({ colunas, linhas, maxH = 'max-h-80' }) {
  return (
    <div className={cn('overflow-auto rounded-lg border border-slate-800', maxH)}>
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-900">
          <tr className="text-slate-400">
            {colunas.map((c) => (
              <th key={c.chave} className={cn('px-2 py-1.5 font-medium whitespace-nowrap', c.alinhar === 'esq' ? 'text-left' : 'text-right')}>{c.rotulo}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="border-t border-slate-800 text-slate-200">
              {colunas.map((c) => (
                <td key={c.chave} className={cn('px-2 py-1 tabular-nums whitespace-nowrap', c.alinhar === 'esq' ? 'text-left' : 'text-right')}>
                  {c.fmt ? c.fmt(l[c.chave], l) : l[c.chave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Frases-resumo automáticas (regras sobre os números; sem LLM). frases: [{texto, tom:'bom'|'atencao'|'serio'|'critico'|'info'}] */
export function ResumoAba({ frases = [] }) {
  if (!frases.length) return null;
  const icone = { bom: CheckCircle2, atencao: AlertCircle, serio: AlertTriangle, critico: XCircle, info: Lightbulb };
  const cor = { bom: STATUS.bom, atencao: STATUS.atencao, serio: STATUS.serio, critico: STATUS.critico, info: NEUTRO };
  return (
    <section aria-label="Resumo automático" className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
      <ul className="grid gap-1.5 md:grid-cols-2">
        {frases.map((f, i) => {
          const I = icone[f.tom] || Lightbulb;
          return (
            <li key={i} className="flex items-start gap-2 text-[13px] text-slate-200">
              <I className="h-4 w-4 mt-0.5 shrink-0" style={{ color: cor[f.tom] || NEUTRO }} aria-hidden />
              <span>{f.texto}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Classificação de prazo de uma obra (sempre ícone + texto). */
export function situacaoObra(i) {
  if (!i) return { chave: 'na', rotulo: '—', cor: NEUTRO, icone: MinusCircle };
  if (i.kgRestante <= 0 && i.kgTotal > 0) return { chave: 'pronta', rotulo: 'Fábrica concluída', cor: STATUS.bom, icone: CheckCircle2 };
  if ((i.atrasoDias || 0) > 30) return { chave: 'critico', rotulo: `Atraso ${i.atrasoDias}d`, cor: STATUS.critico, icone: XCircle };
  if ((i.atrasoDias || 0) > 0) return { chave: 'serio', rotulo: `Atraso ${i.atrasoDias}d`, cor: STATUS.serio, icone: AlertTriangle };
  if (!i.prazo) return { chave: 'semprazo', rotulo: 'Sem prazo', cor: NEUTRO, icone: MinusCircle };
  if (!i.previsaoFim) return { chave: 'parada', rotulo: 'Sem ritmo', cor: STATUS.atencao, icone: Clock };
  return { chave: 'ok', rotulo: 'No prazo', cor: STATUS.bom, icone: CheckCircle2 };
}

export function SituacaoObra({ ind }) {
  const s = situacaoObra(ind);
  const I = s.icone;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-slate-200">
      <I className="h-3.5 w-3.5 shrink-0" style={{ color: s.cor }} aria-hidden />
      {s.rotulo}
    </span>
  );
}

/** Gap financeiro − físico com seta e texto. */
export function GapObra({ gap }) {
  if (gap === null || gap === undefined) return <span className="text-slate-500">—</span>;
  const I = gap >= 0 ? ArrowUpRight : ArrowDownRight;
  const forte = Math.abs(gap) >= 15;
  return (
    <span
      className="inline-flex items-center gap-0.5 tabular-nums whitespace-nowrap text-slate-200"
      title={gap >= 0 ? 'Financeiro à frente do físico (mediu mais do que produziu)' : 'Físico à frente do financeiro (produziu sem medir)'}
    >
      <I className="h-3.5 w-3.5" style={{ color: forte ? STATUS.serio : NEUTRO }} aria-hidden />
      {gap > 0 ? '+' : ''}{fmtNum(gap, 0)} pp
    </span>
  );
}

export function SeveridadeTag({ sev }) {
  const s = SEVERIDADES[sev] || SEVERIDADES.baixo;
  const I = sev === 'critico' ? XCircle : sev === 'alto' ? AlertTriangle : sev === 'medio' ? AlertCircle : MinusCircle;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-200 whitespace-nowrap">
      <I className="h-3.5 w-3.5" style={{ color: s.cor }} aria-hidden /> {s.rotulo}
    </span>
  );
}

export const mediaLista = (arr) => {
  const v = (arr || []).filter((x) => Number.isFinite(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};

// Rótulos usados por mais de uma aba
export { rotuloSemana, rotuloMes, ROTULO_ETAPA };

// ============================================================
// Aba Executivo
// ============================================================

function prioridadeRisco(i) {
  // Maior risco primeiro: atraso, depois descasamento físico × financeiro.
  return (i.atrasoDias > 0 ? 1000 + i.atrasoDias : 0) + Math.abs(i.gapPp || 0);
}

export default function AbaExecutivo({ dados, alertasAtivos = [], onAbrirObra, onIrAba }) {
  const { producao, obras, financeiro } = dados;
  const ex = obras.executivo;
  const tend = producao.tendencia;
  const [tabelaRitmo, setTabelaRitmo] = useState(false);

  const fat = useMemo(() => {
    const m = financeiro.mensal || [];
    const atual = m[m.length - 1];
    const anteriores = m.slice(0, -1);
    const comMov = anteriores.filter((x) => x.faturado > 0);
    return {
      atual: atual?.faturado || 0,
      mes: atual?.mes,
      media: mediaLista(anteriores.map((x) => x.faturado)),
      mesesComMov: comMov.length,
    };
  }, [financeiro.mensal]);

  const saude = useMemo(() => (
    obras.indicadores.filter((i) => i.ativa).sort((a, b) => prioridadeRisco(b) - prioridadeRisco(a))
  ), [obras.indicadores]);

  const ritmo = useMemo(() => producao.ritmo.map((r) => ({ ...r, rotulo: rotuloSemana(r.semana) })), [producao.ritmo]);
  const mediaRitmo = useMemo(() => mediaLista(producao.ritmo.map((r) => r.pintura)) || 0, [producao.ritmo]);
  const temRitmo = producao.ritmo.some((r) => r.pintura > 0);

  const frases = useMemo(() => {
    const out = [];
    if (tend.variacaoPct !== null) {
      const v = tend.variacaoPct;
      out.push({
        tom: v >= 0 ? 'bom' : v <= -20 ? 'serio' : 'atencao',
        texto: `Ritmo de peças prontas ${fmtPct(Math.abs(v), 0)} ${v >= 0 ? 'acima' : 'abaixo'} das 4 semanas anteriores (${fmtKg(tend.kgSemanaAtual)}/semana).`,
      });
    } else if (tend.kgSemanaAtual > 0) {
      out.push({ tom: 'info', texto: `Ritmo atual de ${fmtKg(tend.kgSemanaAtual)}/semana (sem base anterior para comparar).` });
    } else {
      out.push({ tom: 'atencao', texto: 'Nenhuma peça concluiu a pintura nas últimas 4 semanas.' });
    }
    if (ex.carteiraKg > 0) {
      out.push({
        tom: 'info',
        texto: ex.mesesCarteira !== null
          ? `Carteira de ${fmtKg(ex.carteiraKg)} a produzir ≈ ${fmtNum(ex.mesesCarteira, 1)} meses no ritmo atual.`
          : `Carteira de ${fmtKg(ex.carteiraKg)} a produzir, sem ritmo recente para estimar o prazo.`,
      });
    }
    const g = producao.gargalo;
    if (g.etapa) {
      const l = g.linhas.find((x) => x.etapa === g.etapa);
      out.push({
        tom: l?.travada ? 'critico' : 'serio',
        texto: l?.travada
          ? `Gargalo em ${ROTULO_ETAPA[g.etapa]}: ${fmtKg(l.wipKg)} parados e nenhuma saída nas últimas 4 semanas.`
          : `Gargalo em ${ROTULO_ETAPA[g.etapa]}: ${fmtNum(l?.semanasFila, 1)} semanas de fila no ritmo atual.`,
      });
    }
    const atrasadas = saude.filter((i) => (i.atrasoDias || 0) > 0);
    if (atrasadas.length) {
      const pior = [...atrasadas].sort((a, b) => b.atrasoDias - a.atrasoDias)[0];
      out.push({ tom: 'serio', texto: `${atrasadas.length} obra(s) com previsão além do prazo; maior atraso: ${pior.nome} (+${pior.atrasoDias} dias).` });
    } else if (saude.length) {
      out.push({ tom: 'bom', texto: 'Nenhuma obra ativa com previsão de término além do prazo.' });
    }
    if (financeiro.aging.receberVencido > 0) {
      out.push({ tom: 'serio', texto: `${fmtBRLc(financeiro.aging.receberVencido)} a receber já vencidos.` });
    }
    const neg = (financeiro.fluxo || []).find((f) => f.acumulado < 0);
    if (neg) {
      out.push({ tom: 'critico', texto: `Caixa projetado (vencimentos em aberto) fica negativo na semana de ${rotuloSemana(neg.semana)}: ${fmtBRLc(neg.acumulado)}.` });
    }
    return out;
  }, [tend, ex, producao.gargalo, saude, financeiro.aging, financeiro.fluxo]);

  const topAlertas = alertasAtivos.slice(0, 5);

  return (
    <div className="space-y-4">
      <ResumoAba frases={frases} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3">
        <KpiTile
          icone={Wallet}
          rotulo="Carteira a medir"
          valor={fmtBRLc(ex.carteiraValor)}
          sub={`${ex.obrasAtivas} obra(s) ativa(s)${ex.obrasSemContrato ? ` · ${ex.obrasSemContrato} sem contrato` : ''}`}
          ajuda="Soma de (valor do contrato − medições reconhecidas) das obras ativas."
        />
        <KpiTile
          icone={Weight}
          rotulo="Carteira em kg"
          valor={fmtKg(ex.carteiraKg)}
          sub={ex.mesesCarteira !== null ? `≈ ${fmtNum(ex.mesesCarteira, 1)} meses no ritmo atual` : 'sem ritmo recente p/ estimar'}
          ajuda="kg ainda não pintados das obras ativas ÷ ritmo médio de peças prontas (4 semanas)."
        />
        <KpiTile
          icone={Gauge}
          rotulo="Ritmo (peças prontas)"
          valor={`${fmtKg(tend.kgSemanaAtual)}/sem`}
          tendencia={tend.variacaoPct}
          sub="média 4 sem. vs 4 anteriores"
          ajuda="kg que concluíram a pintura por semana."
        />
        <KpiTile
          icone={Receipt}
          rotulo={`Faturado no mês${fat.mes ? ` (${rotuloMes(fat.mes)})` : ''}`}
          valor={fmtBRLc(fat.atual)}
          sub={fat.media !== null ? `${fat.media > 0 ? `${fmtNum((fat.atual / fat.media) * 100, 0)}% da ` : ''}média de 11 meses (${fmtBRLc(fat.media)}) · mês em curso` : 'sem histórico'}
          ajuda={financeiro.geralEmpresa ? 'Receitas da empresa (medições reconhecidas + receitas manuais). O mês atual ainda está em curso.' : 'Receitas da(s) obra(s) do escopo. O mês atual ainda está em curso.'}
        />
        <KpiTile
          icone={AlertTriangle}
          rotulo="A receber vencido"
          valor={fmtBRLc(financeiro.aging.receberVencido)}
          sub={`a pagar vencido: ${fmtBRLc(financeiro.aging.pagarVencido)}`}
        />
        <KpiTile
          icone={CalendarClock}
          rotulo="Obras em atraso"
          valor={`${ex.obrasEmAtraso} de ${ex.obrasAtivas}`}
          sub="previsão de término após o prazo"
          ajuda="Previsão = kg restante ÷ ritmo das últimas 4 semanas da obra."
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <ChartCard
          className="xl:col-span-3"
          titulo="Saúde das obras"
          subtitulo="Quais obras exigem atenção? Ranqueadas por atraso previsto e descasamento físico × financeiro. Clique para detalhar."
          vazio={!saude.length}
          mensagemVazio="Nenhuma obra ativa no escopo."
          acao={(
            <BotaoCSV onClick={() => baixarCSV('bi360_saude_obras', [
              { chave: 'codigo', rotulo: 'Código' }, { chave: 'nome', rotulo: 'Obra' },
              { chave: 'fisicoPct', rotulo: 'Físico %' }, { chave: 'financeiroPct', rotulo: 'Financeiro %' },
              { chave: 'gapPp', rotulo: 'Gap (pp)' }, { chave: 'previsaoFim', rotulo: 'Previsão' },
              { chave: 'prazo', rotulo: 'Prazo' }, { chave: 'atrasoDias', rotulo: 'Atraso (dias)' },
              { chave: 'sit', rotulo: 'Situação', csv: (l) => situacaoObra(l).rotulo },
            ], saude)}
            />
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left font-medium px-2 py-1.5">Obra</th>
                  <th className="text-right font-medium px-2 py-1.5">Físico</th>
                  <th className="text-right font-medium px-2 py-1.5">Financeiro</th>
                  <th className="text-right font-medium px-2 py-1.5">Gap</th>
                  <th className="text-right font-medium px-2 py-1.5 whitespace-nowrap">Previsão / prazo</th>
                  <th className="text-left font-medium px-2 py-1.5">Situação</th>
                </tr>
              </thead>
              <tbody>
                {saude.slice(0, 10).map((i) => (
                  <tr
                    key={i.id}
                    onClick={() => onAbrirObra?.(i.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onAbrirObra?.(i.id); }}
                    tabIndex={0}
                    className="border-b border-slate-800/70 hover:bg-slate-800/50 cursor-pointer focus:outline-none focus:bg-slate-800/60"
                  >
                    <td className="px-2 py-1.5 text-slate-100 max-w-[220px]">
                      <div className="truncate" title={i.nome}>{i.codigo ? <span className="text-slate-400">{i.codigo} · </span> : null}{i.nome}</div>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-200">{fmtPct(i.fisicoPct, 0)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-200">{i.semContrato ? <span className="text-slate-500">sem contrato</span> : fmtPct(i.financeiroPct, 0)}</td>
                    <td className="px-2 py-1.5 text-right"><GapObra gap={i.gapPp} /></td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-300 whitespace-nowrap">{fmtData(i.previsaoFim)} <span className="text-slate-500">/ {fmtData(i.prazo)}</span></td>
                    <td className="px-2 py-1.5"><SituacaoObra ind={i} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {saude.length > 10 && (
            <button type="button" onClick={() => onIrAba?.('obras')} className="mt-2 inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white">
              Ver todas as {saude.length} obras <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </ChartCard>

        <div className="xl:col-span-2 space-y-4 min-w-0">
          <ChartCard
            titulo="Ritmo de peças prontas — 12 semanas"
            subtitulo="A fábrica está acelerando ou freando? kg que concluíram a pintura por semana; linha = média do período."
            vazio={!temRitmo}
            mensagemVazio="Sem peças concluídas nas últimas 12 semanas."
            acao={<BotaoTabela tabela={tabelaRitmo} onClick={() => setTabelaRitmo((v) => !v)} />}
          >
            {tabelaRitmo ? (
              <TabelaDados
                maxH="max-h-48"
                colunas={[{ chave: 'rotulo', rotulo: 'Semana', alinhar: 'esq' }, { chave: 'pintura', rotulo: 'kg prontos', fmt: fmtKg }]}
                linhas={ritmo}
              />
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ritmo} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="rotulo" {...eixoProps} interval="preserveStartEnd" />
                    <YAxis {...eixoProps} width={52} tickFormatter={fmtKg} />
                    <Tooltip {...tooltipProps} formatter={(v) => [fmtKg(v), 'Peças prontas']} labelFormatter={(l) => `Semana de ${l}`} />
                    <ReferenceLine y={mediaRitmo} stroke={NEUTRO} strokeDasharray="4 4" />
                    <Bar dataKey="pintura" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard
            titulo="Alertas prioritários"
            subtitulo="O que precisa de ação hoje? Os 5 alertas abertos mais graves do Radar."
            vazio={!topAlertas.length}
            mensagemVazio="Nenhum alerta aberto no escopo."
            acao={(
              <Link to="/RadarAlertas" className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white shrink-0">
                <Siren className="h-3.5 w-3.5" aria-hidden /> Radar
              </Link>
            )}
          >
            <ul className="space-y-2">
              {topAlertas.map((a) => (
                <li key={a.id}>
                  <Link to={a.link || '/RadarAlertas'} className="block rounded-lg border border-slate-800 px-3 py-2 hover:bg-slate-800/50">
                    <div className="flex items-center justify-between gap-2">
                      <SeveridadeTag sev={a.severidade} />
                      <span className="text-[11px] text-slate-500 truncate">{REGRAS[a.regra]?.area || ''}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-100 line-clamp-2">{a.titulo}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        {financeiro.geralEmpresa
          ? 'Financeiro em Geral = caixa da empresa (despesas lançadas em obra ficam fora). Valores contratuais e carteira consideram todas as obras ativas.'
          : 'Escopo de obra: valores financeiros consideram somente a(s) obra(s) selecionada(s).'}
        {' '}Contratado das obras ativas: {fmtBRL(ex.contratado)} · medido: {fmtBRL(ex.medido)}.
      </p>
    </div>
  );
}
