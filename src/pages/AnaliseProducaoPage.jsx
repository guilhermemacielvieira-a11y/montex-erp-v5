// ============================================================
// ANÁLISE DE PRODUÇÃO — módulo analítico (dia / semana / mês, obra, setor,
// pessoas, fluxo e qualidade dos dados)
// ============================================================
// Motor puro e testado: services/bi/biAnaliseProducao.js + biProducao.js
// (o MESMO do BI 360 → números iguais entre módulos).
// "Produção de um setor" = kg que CONCLUÍRAM a etapa. Histórico limpo de
// duplicatas, com movimentos parciais [QTD:x/y] e teto pela quantidade da peça.
// Escopo = seletor ÚNICO do topo (Geral = todas as obras).
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  Activity, RefreshCw, TrendingUp, TrendingDown, Minus, Factory, Flame, Paintbrush, Truck,
  AlertTriangle, CheckCircle2, Download, Building2, Users, GitBranch, ShieldCheck, CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useObras, useProducao, useExpedicao } from '../contexts/ERPContext';
import { rotuloEscopo } from '../lib/escopoObra';
import { buscarHistorico } from '../hooks/useBIData';
import { normalizarHistorico, leadTimeEtapas, wipAtual, gargalo, ritmoSemanal, funilProducao } from '../services/bi/biProducao';
import {
  SETORES, PERIODOS, eventosProducao, intervaloPeriodo, resumoSetores, serieTemporal, agrupar,
  produtividadePessoas, perfilDiaSemana, progressoObras, variacaoPct, mediaMovel,
} from '../services/bi/biAnaliseProducao';
import { noEscopo, isoLocal, fabricaConcluida, pesoPeca, ROTULO_ETAPA, ETAPAS_FLUXO } from '../services/bi/biCore';
import { aplicarRotas } from '../services/bi/biDesempenho';
import { useRotasProducao } from '../hooks/useRotasProducao';

const ICONE_SETOR = { fabricacao: Factory, solda: Flame, pintura: Paintbrush, expedicao: Truck };
const COR = Object.fromEntries(SETORES.map((s) => [s.key, s.cor]));
const ROT = Object.fromEntries(SETORES.map((s) => [s.key, s.label]));
const kg = (v) => `${(Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;
const n0 = (v) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const dataBR = (d) => (d ? (d instanceof Date ? d : new Date(`${d}T12:00:00`)).toLocaleDateString('pt-BR') : '—');
const TOOLTIP = { contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }, labelStyle: { color: '#e2e8f0' } };

function Variacao({ pct }) {
  if (pct == null) return <span className="text-xs text-slate-500">sem base anterior</span>;
  const Icone = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', pct > 0 ? 'text-emerald-400' : pct < 0 ? 'text-red-400' : 'text-slate-400')}>
      <Icone className="h-3.5 w-3.5" />{pct > 0 ? '+' : ''}{pct.toLocaleString('pt-BR')}% vs anterior
    </span>
  );
}

function Painel({ titulo, sub, children, acao, className }) {
  return (
    <div className={cn('bg-slate-800/50 border border-slate-700 rounded-xl', className)}>
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold">{titulo}</h3>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
        {acao}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

function Tabela({ colunas, linhas, vazio = 'Sem dados no período.', rodape }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 text-xs border-b border-slate-700">
            {colunas.map((c) => <th key={c.k} className={cn('py-2 px-2 font-medium whitespace-nowrap', c.r ? 'text-right' : 'text-left')}>{c.l}</th>)}
          </tr>
        </thead>
        <tbody>
          {linhas.length ? linhas.map((l, i) => (
            <tr key={l._k ?? i} className="border-b border-slate-800 hover:bg-slate-800/40">
              {colunas.map((c) => <td key={c.k} className={cn('py-2 px-2', c.wrap ? 'whitespace-normal min-w-[200px]' : 'whitespace-nowrap', c.r ? 'text-right tabular-nums' : 'text-left', c.cls)}>{c.f ? c.f(l) : l[c.k]}</td>)}
            </tr>
          )) : <tr><td colSpan={colunas.length} className="py-8 text-center text-slate-500">{vazio}</td></tr>}
        </tbody>
        {rodape && linhas.length > 0 && (
          <tfoot><tr className="font-semibold text-white border-t border-slate-600">
            {colunas.map((c) => <td key={c.k} className={cn('py-2 px-2 whitespace-nowrap', c.r ? 'text-right tabular-nums' : '')}>{rodape[c.k] ?? ''}</td>)}
          </tr></tfoot>
        )}
      </table>
    </div>
  );
}

function baixarCSV(nome, colunas, linhas) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [colunas.map((c) => esc(c.l)).join(';'), ...linhas.map((l) => colunas.map((c) => esc(c.csv ? c.csv(l) : l[c.k])).join(';'))].join('\n');
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function AnaliseProducaoPage() {
  const { obras = [], escopoObra, obraIdsEscopo } = useObras();
  const { pecas = [] } = useProducao();
  const { expedicoes = [] } = useExpedicao();
  const rotas = useRotasProducao();

  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [atualizadoEm, setAtualizadoEm] = useState(null);
  const [periodo, setPeriodo] = useState('30d');
  const [custom, setCustom] = useState({ ini: '', fim: '' });
  const [gran, setGran] = useState('dia');

  const carregar = useCallback(async (forcar) => {
    setCarregando(true);
    try { setHistorico(await buscarHistorico({ forcar })); setErro(null); setAtualizadoEm(new Date()); }
    catch (e) { setErro(e?.message || 'Falha ao carregar o histórico de produção'); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { carregar(false); }, [carregar]);

  const hoje = useMemo(() => new Date(), [atualizadoEm]);
  const obraIds = obraIdsEscopo || null;
  const nomeObra = useCallback((id) => obras.find((o) => o.id === id)?.nome || id || '—', [obras]);

  // ===== Base (escopo do topo) =====
  const base = useMemo(() => {
    const { transicoes: todas, diag } = normalizarHistorico(historico, pecas);
    const transicoes = obraIds ? todas.filter((t) => obraIds.includes(t.obraId)) : todas;
    const exps = noEscopo(expedicoes, obraIds);
    // Rotas por família: solda de família "sem solda" (terça) não é produção
    const { eventos, removidos } = aplicarRotas(eventosProducao(transicoes, exps), rotas.cfg);
    const pecasEsc = noEscopo(pecas, obraIds);
    return { transicoes, diag, eventos, pecasEsc, removidos };
  }, [historico, pecas, expedicoes, obraIds, rotas.cfg]);

  // ===== Período =====
  const per = useMemo(() => intervaloPeriodo(periodo, { hoje, ...custom }), [periodo, custom, hoje]);
  const granEfetiva = per.dias > 400 && gran === 'dia' ? 'semana' : gran;

  const resumo = useMemo(() => resumoSetores(base.eventos, { ini: per.ini, fim: per.fim, hoje }), [base.eventos, per, hoje]);
  const resumoAnt = useMemo(() => resumoSetores(base.eventos, { ini: per.iniAnt, fim: per.fimAnt, hoje }), [base.eventos, per, hoje]);
  const serie = useMemo(() => {
    const s = serieTemporal(base.eventos, { ini: per.ini, fim: per.fim, granularidade: granEfetiva });
    const mm = mediaMovel(s.map((x) => x.pintura), granEfetiva === 'dia' ? 7 : 4);
    return s.map((x, i) => ({ ...x, mmPintura: mm[i] }));
  }, [base.eventos, per, granEfetiva]);
  const evPeriodo = useMemo(() => base.eventos.filter((e) => e.data >= per.ini && e.data <= per.fim), [base.eventos, per]);

  const porObraPeriodo = useMemo(() => agrupar(evPeriodo, (e) => e.obraId), [evPeriodo]);
  const progresso = useMemo(() => progressoObras({ obras: obraIds ? obras.filter((o) => obraIds.includes(o.id)) : obras, pecas: base.pecasEsc, eventos: base.eventos, hoje }), [obras, obraIds, base, hoje]);
  const pessoas = useMemo(() => produtividadePessoas(evPeriodo), [evPeriodo]);
  const porTipo = useMemo(() => agrupar(evPeriodo, (e) => e.tipo, { setores: ['fabricacao', 'solda', 'pintura'] }), [evPeriodo]);
  const dow = useMemo(() => perfilDiaSemana(base.eventos, { ini: per.ini, fim: per.fim }), [base.eventos, per]);

  // ===== Fluxo (fotografia atual) =====
  const fluxo = useMemo(() => {
    const ritmo = ritmoSemanal(base.transicoes, { hoje, semanas: 12 });
    const wip = wipAtual(base.pecasEsc, base.transicoes, { hoje });
    return { leadTimes: leadTimeEtapas(base.transicoes), wip, gargalo: gargalo(wip.resumo, ritmo), funil: funilProducao(base.pecasEsc) };
  }, [base, hoje]);

  // ===== Consistência com o Kanban =====
  const consistencia = useMemo(() => {
    const prontas = base.pecasEsc.filter((p) => fabricaConcluida(p.etapa));
    const comPintura = new Set(base.eventos.filter((e) => e.setor === 'pintura').map((e) => e.pecaId));
    const kgProntas = prontas.reduce((a, p) => a + pesoPeca(p), 0);
    const kgProntasComHist = prontas.filter((p) => comPintura.has(p.id)).reduce((a, p) => a + pesoPeca(p), 0);
    const kgPinturaHist = base.eventos.filter((e) => e.setor === 'pintura').reduce((a, e) => a + e.kg, 0);
    const kgTotal = base.pecasEsc.reduce((a, p) => a + pesoPeca(p), 0);
    return {
      kgTotal, kgProntas, kgProntasComHist, kgPinturaHist,
      cobertura: kgProntas > 0 ? (kgProntasComHist / kgProntas) * 100 : 0,
      primeiraData: base.eventos.find((e) => e.setor !== 'expedicao')?.data || null,
    };
  }, [base]);

  const totalPeriodo = resumo.find((r) => r.setor === 'pintura')?.kg || 0;
  const rotPeriodo = periodo === 'custom'
    ? `${dataBR(per.ini)} a ${dataBR(per.fim)}`
    : `${PERIODOS.find((p) => p.key === periodo)?.label} · ${dataBR(per.ini)} a ${dataBR(per.fim)}`;

  const colunasSerie = [
    { k: 'rotulo', l: granEfetiva === 'mes' ? 'Mês' : granEfetiva === 'semana' ? 'Semana de' : 'Dia', cls: 'text-slate-300' },
    ...SETORES.map((s) => ({ k: s.key, l: s.label, r: true, f: (l) => (l[s.key] ? n0(l[s.key]) : <span className="text-slate-600">—</span>), csv: (l) => l[s.key] })),
  ];

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Activity className="h-7 w-7 text-emerald-500" />Análise de Produção</h1>
          <p className="text-slate-400 text-sm mt-1">Produção por período, obra, setor e pessoa — kg que concluíram cada etapa, sem duplicatas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-slate-200" title="Altere a obra no seletor do topo">
            <Building2 className="h-4 w-4 text-slate-400" />{rotuloEscopo(escopoObra, obras)}
          </span>
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-200" onClick={() => carregar(true)} disabled={carregando}>
            <RefreshCw className={cn('h-4 w-4 mr-2', carregando && 'animate-spin')} />{carregando ? 'Carregando…' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {erro && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{erro}</div>
      )}

      {/* Período */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex flex-col xl:flex-row xl:items-center gap-3 xl:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          <CalendarDays className="h-4 w-4 text-slate-400 mr-1" />
          {PERIODOS.map((p) => (
            <button key={p.key} type="button" onClick={() => setPeriodo(p.key)}
              className={cn('px-3 py-1.5 rounded-lg text-xs border transition', periodo === p.key ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-700 text-slate-300 hover:bg-slate-700/50')}>
              {p.label}
            </button>
          ))}
          {periodo === 'custom' && (
            <div className="flex items-center gap-2 ml-1">
              <Input type="date" value={custom.ini} onChange={(e) => setCustom((c) => ({ ...c, ini: e.target.value }))} className="h-8 w-36 bg-slate-900 border-slate-600 text-white text-xs" />
              <span className="text-slate-500 text-xs">até</span>
              <Input type="date" value={custom.fim} onChange={(e) => setCustom((c) => ({ ...c, fim: e.target.value }))} className="h-8 w-36 bg-slate-900 border-slate-600 text-white text-xs" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <span className="text-xs text-slate-500">{rotPeriodo}</span>
          <div className="flex rounded-lg border border-slate-700 overflow-hidden shrink-0">
            {[['dia', 'Diário'], ['semana', 'Semanal'], ['mes', 'Mensal']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setGran(k)} className={cn('px-3 py-1.5 text-xs', granEfetiva === k ? 'bg-slate-600 text-white' : 'text-slate-300 hover:bg-slate-700/50')}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs por setor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {resumo.map((r) => {
          const ant = resumoAnt.find((x) => x.setor === r.setor);
          const Icone = ICONE_SETOR[r.setor];
          return (
            <div key={r.setor} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">{r.label}</p>
                <span className="p-1.5 rounded-lg" style={{ background: `${r.cor}22` }}><Icone className="h-4 w-4" style={{ color: r.cor }} /></span>
              </div>
              <p className="text-2xl font-bold text-white mt-1">{kg(r.kg)}</p>
              <Variacao pct={variacaoPct(r.kg, ant?.kg || 0)} />
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div><p className="text-slate-500">Média/dia útil</p><p className="text-slate-200 font-medium">{kg(r.mediaDiaUtil)}</p></div>
                <div><p className="text-slate-500">{r.setor === 'expedicao' ? 'Romaneios' : 'Peças'}</p><p className="text-slate-200 font-medium">{n0(r.setor === 'expedicao' ? r.eventos : r.pecas)}</p></div>
                <div className="col-span-2"><p className="text-slate-500">Melhor dia</p><p className="text-slate-200 font-medium">{r.melhorDia ? `${dataBR(r.melhorDia.data)} · ${kg(r.melhorDia.kg)}` : '—'}</p></div>
              </div>
            </div>
          );
        })}
      </div>

      <Tabs defaultValue="tempo" className="space-y-4">
        <TabsList className="bg-slate-800/60 border border-slate-700 flex flex-wrap h-auto">
          <TabsTrigger value="tempo"><Activity className="h-4 w-4 mr-1.5" />Linha do tempo</TabsTrigger>
          <TabsTrigger value="obras"><Building2 className="h-4 w-4 mr-1.5" />Por obra</TabsTrigger>
          <TabsTrigger value="pessoas"><Users className="h-4 w-4 mr-1.5" />Setores e pessoas</TabsTrigger>
          <TabsTrigger value="fluxo"><GitBranch className="h-4 w-4 mr-1.5" />Fluxo e gargalos</TabsTrigger>
          <TabsTrigger value="dados"><ShieldCheck className="h-4 w-4 mr-1.5" />Qualidade dos dados</TabsTrigger>
        </TabsList>

        {/* ===== LINHA DO TEMPO ===== */}
        <TabsContent value="tempo" className="space-y-4">
          <Painel titulo={`Produção ${granEfetiva === 'mes' ? 'mensal' : granEfetiva === 'semana' ? 'semanal' : 'diária'} por setor (kg)`}
            sub={`Linha = média móvel de peças prontas (${granEfetiva === 'dia' ? '7 dias' : '4 períodos'}).${gran === 'dia' && granEfetiva !== 'dia' ? ' Período longo: agrupado por semana.' : ''}`}>
            <div className="h-80">
              <ResponsiveContainer>
                <ComposedChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="rotulo" tick={{ fill: '#94a3b8', fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}t` : v)} width={48} />
                  <Tooltip {...TOOLTIP} formatter={(v, nome) => [kg(v), nome]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {SETORES.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.cor} radius={[3, 3, 0, 0]} maxBarSize={28} />)}
                  <Line type="monotone" dataKey="mmPintura" name="Média móvel (pronto)" stroke="#e2e8f0" strokeDasharray="4 3" dot={false} strokeWidth={1.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Painel>
          <Painel titulo="Detalhe do período" sub="Fins de semana em cinza no modo diário."
            acao={<Button size="sm" variant="ghost" className="text-slate-300" onClick={() => baixarCSV(`producao_${granEfetiva}_${isoLocal(per.ini)}_${isoLocal(per.fim)}.csv`, colunasSerie, serie)}><Download className="h-4 w-4 mr-1" />CSV</Button>}>
            <div className="max-h-96 overflow-y-auto">
              <Tabela colunas={colunasSerie.map((c, i) => (i === 0 ? { ...c, f: (l) => <span className={l.fimDeSemana ? 'text-slate-500' : 'text-slate-200'}>{l.rotulo}</span> } : c))}
                linhas={[...serie].reverse().map((l) => ({ ...l, _k: l.chave }))}
                rodape={{ rotulo: 'Total', ...Object.fromEntries(resumo.map((r) => [r.setor, n0(r.kg)])) }} />
            </div>
          </Painel>
        </TabsContent>

        {/* ===== POR OBRA ===== */}
        <TabsContent value="obras" className="space-y-4">
          <Painel titulo="Progresso e previsão por obra" sub="Fotografia atual do Kanban. Ritmo = peças prontas nas últimas 4 semanas; previsão = restante ÷ ritmo.">
            <Tabela linhas={progresso.map((o) => ({ ...o, _k: o.id }))} vazio="Nenhuma obra com peças no escopo." colunas={[
              { k: 'nome', l: 'Obra', wrap: true, f: (o) => <div><p className="text-white">{o.nome}</p><p className="text-xs text-slate-500">{o.codigo} · {n0(o.pecas)} peças</p></div> },
              { k: 'pesoTotal', l: 'Peso total', r: true, f: (o) => kg(o.pesoTotal) },
              { k: 'pctPronto', l: 'Pronto', f: (o) => (
                <div className="min-w-[140px]">
                  <div className="flex justify-between text-xs"><span className="text-slate-300">{kg(o.pronto)}</span><span className="text-white font-medium">{o.pctPronto.toLocaleString('pt-BR')}%</span></div>
                  <div className="h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, o.pctPronto)}%` }} /></div>
                </div>) },
              { k: 'emProcesso', l: 'Em processo', r: true, f: (o) => kg(o.emProcesso) },
              { k: 'naoIniciado', l: 'Não iniciado', r: true, f: (o) => kg(o.naoIniciado) },
              { k: 'ritmoKgSemana', l: 'Ritmo/semana', r: true, f: (o) => kg(o.ritmoKgSemana) },
              { k: 'prev', l: 'Previsão', r: true, f: (o) => (o.restante <= 0 ? <span className="text-emerald-400">Concluída</span> : o.pronto === 0 && o.emProcesso === 0 ? <span className="text-slate-500">não iniciada</span> : o.previsaoTermino ? `${dataBR(o.previsaoTermino)} (${o.semanasRestantes.toLocaleString('pt-BR')} sem)` : <span className="text-amber-400">sem ritmo</span>) },
              { k: 'parado', l: 'Últ. movimento', r: true, f: (o) => (o.diasSemMovimento == null ? '—' : <span className={o.diasSemMovimento > 7 && o.restante > 0 ? 'text-amber-400' : 'text-slate-300'}>{o.diasSemMovimento === 0 ? 'hoje' : `há ${o.diasSemMovimento} d`}</span>) },
            ]} />
          </Painel>
          <Painel titulo="Produção no período por obra" sub={rotPeriodo}>
            <Tabela linhas={porObraPeriodo.map((o) => ({ ...o, _k: o.chave }))} colunas={[
              { k: 'chave', l: 'Obra', wrap: true, f: (o) => <span className="text-white">{nomeObra(o.chave)}</span> },
              ...SETORES.map((s) => ({ k: s.key, l: s.label, r: true, f: (o) => (o[s.key] ? n0(o[s.key]) : <span className="text-slate-600">—</span>) })),
              { k: 'dias', l: 'Dias c/ produção', r: true },
            ]} rodape={{ chave: 'Total', ...Object.fromEntries(resumo.map((r) => [r.setor, n0(r.kg)])) }} />
          </Painel>
        </TabsContent>

        {/* ===== SETORES E PESSOAS ===== */}
        <TabsContent value="pessoas" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Painel titulo="Perfil por dia da semana" sub="Média de kg por ocorrência do dia no período.">
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={dow} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} width={48} />
                    <Tooltip {...TOOLTIP} formatter={(v, nome) => [kg(v), nome]} />
                    {SETORES.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.cor} stackId="a" />)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>
            <Painel titulo="Produção por tipo de peça" sub={`${rotPeriodo} · setores da fábrica`}>
              <div className="max-h-64 overflow-y-auto">
                <Tabela linhas={porTipo.map((t) => ({ ...t, _k: t.chave }))} colunas={[
                  { k: 'chave', l: 'Tipo', cls: 'text-white' },
                  ...['fabricacao', 'solda', 'pintura'].map((s) => ({ k: s, l: ROT[s].replace(' (peça pronta)', ''), r: true, f: (t) => (t[s] ? n0(t[s]) : '—') })),
                  { k: 'pecas', l: 'Peças', r: true },
                ]} />
              </div>
            </Painel>
          </div>
          <Painel titulo="Produtividade por pessoa" sub={`${rotPeriodo} · kg concluídos por quem apontou a etapa no Kanban`}
            acao={<Button size="sm" variant="ghost" className="text-slate-300" onClick={() => baixarCSV(`produtividade_${isoLocal(per.ini)}_${isoLocal(per.fim)}.csv`, [
              { k: 'chave', l: 'Funcionário' }, { k: 'setorPrincipal', l: 'Setor principal', csv: (p) => ROT[p.setorPrincipal] },
              { k: 'fabricacao', l: 'Fabricação kg' }, { k: 'solda', l: 'Solda kg' }, { k: 'pintura', l: 'Pintura kg' },
              { k: 'total', l: 'Total kg' }, { k: 'pecas', l: 'Peças' }, { k: 'dias', l: 'Dias' }, { k: 'kgDia', l: 'kg/dia' }], pessoas)}><Download className="h-4 w-4 mr-1" />CSV</Button>}>
            <Tabela linhas={pessoas.map((p, i) => ({ ...p, _k: p.chave, pos: i + 1 }))} colunas={[
              { k: 'pos', l: '#', cls: 'text-slate-500' },
              { k: 'chave', l: 'Funcionário', cls: 'text-white' },
              { k: 'setorPrincipal', l: 'Setor principal', f: (p) => <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COR[p.setorPrincipal] }} />{ROT[p.setorPrincipal].replace(' (peça pronta)', '')}</span> },
              { k: 'fabricacao', l: 'Fabricação', r: true, f: (p) => (p.fabricacao ? n0(p.fabricacao) : '—') },
              { k: 'solda', l: 'Solda', r: true, f: (p) => (p.solda ? n0(p.solda) : '—') },
              { k: 'pintura', l: 'Pintura', r: true, f: (p) => (p.pintura ? n0(p.pintura) : '—') },
              { k: 'total', l: 'Total kg', r: true, cls: 'text-white font-semibold', f: (p) => n0(p.total) },
              { k: 'pecas', l: 'Peças', r: true },
              { k: 'dias', l: 'Dias', r: true },
              { k: 'kgDia', l: 'kg/dia trab.', r: true, f: (p) => n0(p.kgDia) },
            ]} />
          </Painel>
        </TabsContent>

        {/* ===== FLUXO ===== */}
        <TabsContent value="fluxo" className="space-y-4">
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
            <Painel titulo="Onde está o peso agora" sub="Peso por etapa atual (Kanban).">
              <div className="space-y-2">
                {(() => {
                  const max = Math.max(1, ...fluxo.funil.map((f) => f.kg));
                  return fluxo.funil.map((f) => (
                    <div key={f.etapa}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-slate-300">{ROTULO_ETAPA[f.etapa]}</span><span className="text-white font-medium">{kg(f.kg)}</span></div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full rounded-full bg-sky-500" style={{ width: `${(f.kg / max) * 100}%` }} /></div>
                    </div>
                  ));
                })()}
              </div>
            </Painel>
            <Painel titulo="Gargalo e tempo de etapa" sub="Fila = peso parado na etapa ÷ saída média das últimas 4 semanas.">
              <Tabela linhas={fluxo.gargalo.linhas.map((g) => ({ ...g, _k: g.etapa, lt: fluxo.leadTimes.find((l) => l.etapa === g.etapa), wipE: fluxo.wip.resumo.find((w) => w.etapa === g.etapa) }))} colunas={[
                { k: 'etapa', l: 'Etapa', f: (g) => <span className={cn('font-medium', fluxo.gargalo.etapa === g.etapa ? 'text-red-400' : 'text-white')}>{ROTULO_ETAPA[g.etapa]}{fluxo.gargalo.etapa === g.etapa ? ' · gargalo' : ''}</span> },
                { k: 'wipKg', l: 'Em fila', r: true, f: (g) => kg(g.wipKg) },
                { k: 'saidaKgSemana', l: 'Saída/sem', r: true, f: (g) => kg(g.saidaKgSemana) },
                { k: 'semanasFila', l: 'Semanas de fila', r: true, f: (g) => (g.travada ? <span className="text-red-400">parada</span> : g.semanasFila != null ? g.semanasFila.toLocaleString('pt-BR') : '—') },
                { k: 'idade', l: 'Idade mediana', r: true, f: (g) => (g.wipE?.idadeMedianaDias != null ? `${g.wipE.idadeMedianaDias} d` : '—') },
                { k: 'lt', l: 'Passagem c/ fila (mediana · p90)', r: true, f: (g) => (g.lt?.medianaDias != null ? `${g.lt.medianaDias} d · ${g.lt.p90Dias} d` : '—') },
              ]} />
            </Painel>
          </div>
          <Painel titulo="Peças paradas há mais tempo" sub="Em fabricação, solda ou pintura, ordenadas pela idade na etapa.">
            <Tabela linhas={[...fluxo.wip.itens].filter((i) => i.idadeDias != null).sort((a, b) => b.idadeDias - a.idadeDias).slice(0, 25).map((i) => ({ ...i, _k: i.id }))}
              vazio="Nenhuma peça em processo." colunas={[
                { k: 'marca', l: 'Marca', cls: 'text-white', wrap: true },
                { k: 'obraId', l: 'Obra', wrap: true, f: (i) => nomeObra(i.obraId) },
                { k: 'etapa', l: 'Etapa', f: (i) => ROTULO_ETAPA[i.etapa] },
                { k: 'kg', l: 'Peso', r: true, f: (i) => kg(i.kg) },
                { k: 'desde', l: 'Desde', r: true, f: (i) => dataBR(i.desde) },
                { k: 'idadeDias', l: 'Dias', r: true, f: (i) => <span className={i.idadeDias > 14 ? 'text-red-400 font-semibold' : i.idadeDias > 7 ? 'text-amber-400' : 'text-slate-200'}>{i.idadeDias}</span> },
              ]} />
          </Painel>
        </TabsContent>

        {/* ===== QUALIDADE DOS DADOS ===== */}
        <TabsContent value="dados" className="space-y-4">
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
            <Painel titulo="Limpeza do histórico de produção" sub="Regras aplicadas antes de qualquer número desta tela (e do BI 360). Base: todas as obras.">
              <Tabela linhas={[
                { _k: 'b', d: 'Registros no histórico', v: n0(base.diag.brutos) },
                { _k: 'dup', d: 'Duplicatas exatas removidas', v: n0(base.diag.duplicados), alerta: base.diag.duplicados > 0 },
                { _k: 'exc', d: 'Movimentos acima da quantidade da peça (valem 0 kg)', v: `${n0(base.diag.excedentes)} · ${kg(base.diag.kgExcedente)}`, alerta: base.diag.excedentes > 0 },
                { _k: 'ret', d: 'Retrocessos de etapa (não contam como produção)', v: n0(base.diag.retrocessos) },
                { _k: 'rota', d: 'Solda de família sem solda (ex.: terça) — não conta na Solda', v: `${n0(base.removidos.eventos)} · ${kg(base.removidos.kg)}`, alerta: base.removidos.kg > 0 },
                { _k: 'na', d: 'Etapas marcadas "não se aplica" no lançamento', v: n0(base.diag.naoAplica || 0) },
                { _k: 'orf', d: 'Registros de peças inexistentes', v: n0(base.diag.orfaos) },
                { _k: 'val', d: 'Movimentos válidos usados', v: n0(base.diag.validos) },
              ]} colunas={[
                { k: 'd', l: 'Item', wrap: true, f: (l) => <span className="inline-flex items-center gap-2">{l.alerta ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}{l.d}</span> },
                { k: 'v', l: 'Quantidade', r: true, cls: 'text-white' },
              ]} />
            </Painel>
            <Painel titulo="Conferência com o Kanban" sub="Peso pronto hoje no Kanban × peso pronto registrado no histórico (escopo do topo).">
              <Tabela linhas={[
                { _k: 't', d: 'Peso total das peças', v: kg(consistencia.kgTotal) },
                { _k: 'p', d: 'Pronto agora no Kanban (fila de embarque em diante)', v: kg(consistencia.kgProntas) },
                { _k: 'h', d: 'Pronto com registro de pintura no histórico', v: kg(consistencia.kgProntasComHist) },
                { _k: 'c', d: 'Cobertura do histórico', v: `${consistencia.cobertura.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`, alerta: consistencia.cobertura < 90 },
                { _k: 'i', d: 'Primeiro registro do histórico', v: dataBR(consistencia.primeiraData) },
              ]} colunas={[
                { k: 'd', l: 'Item', wrap: true, f: (l) => <span className="inline-flex items-center gap-2">{l.alerta ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}{l.d}</span> },
                { k: 'v', l: 'Valor', r: true, cls: 'text-white' },
              ]} />
              <p className="text-xs text-slate-500 mt-3">
                Peças concluídas antes do início do histórico ou movidas sem apontamento não aparecem nos números por período,
                mas aparecem no progresso por obra (que usa a etapa atual). Cobertura abaixo de 90% indica apontamentos faltando.
              </p>
            </Painel>
          </div>
          <Painel titulo="Como cada número é calculado">
            <ul className="text-sm text-slate-300 space-y-1.5 list-disc pl-5">
              <li><b>Fabricação / Solda / Pintura</b>: kg das peças que <b>saíram</b> da etapa para uma etapa seguinte, na data do apontamento. Pintura concluída = peça pronta.</li>
              <li><b>Embarque</b>: peso dos romaneios pela data de saída (romaneios em preparação ou excluídos ficam fora).</li>
              <li><b>Movimento parcial</b> <code className="text-xs bg-slate-900 px-1 rounded">[QTD:x/y]</code>: conta x unidades × peso unitário da peça.</li>
              <li><b>Média/dia útil</b>: kg do período ÷ dias de segunda a sexta (até hoje). <b>Variação</b>: contra o período anterior de mesmo tamanho.</li>
              <li><b>Previsão por obra</b>: peso que falta ficar pronto ÷ ritmo de peças prontas das últimas 4 semanas.</li>
              <li>Mesmo motor do <b>BI 360</b>: os números de ritmo e ranking batem entre as duas telas.</li>
            </ul>
          </Painel>
        </TabsContent>
      </Tabs>

      {carregando && !historico.length && <p className="text-center text-sm text-slate-500">Carregando histórico de produção…</p>}
      {!carregando && totalPeriodo === 0 && base.eventos.length > 0 && (
        <p className="text-center text-xs text-slate-500">Sem peças prontas no período selecionado.</p>
      )}
      <p className="text-[11px] text-slate-600 text-right">
        {ETAPAS_FLUXO.length} etapas · {n0(base.eventos.length)} eventos no escopo · {obraIds ? `${obraIds.length} obra(s)` : 'todas as obras'}
        {atualizadoEm ? ` · atualizado ${atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
      </p>
    </div>
  );
}
