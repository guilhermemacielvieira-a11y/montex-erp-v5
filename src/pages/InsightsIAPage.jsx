// ============================================================
// INSIGHTS IA — análise executiva gerada por IA sobre dados reais
// ============================================================
// Substitui "Sugestões IA" e "Relatórios IA" (regras fixas / números
// aleatórios). Fluxo:
//   useBIData (escopo do TOPO, CLAUDE.md 1c) → montarSnapshotBI → gerarInsights
//   (Edge Function ia-copiloto; chave só no servidor) → resultado estruturado.
// Cada análise fica no histórico (useInsightsHistorico: localStorage +
// entity_store 'insights_ia_historico'), com status por recomendação.
// O bloco "Sinais automáticos (sem IA)" funciona mesmo sem IA configurada.
// Nada de resposta fingida: falhas mostram o erro real.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Sparkles, Loader2, AlertTriangle, Download, Copy, History, ThumbsUp, ShieldAlert, FileText, Filter, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBIData } from '@/hooks/useBIData';
import { useInsightsHistorico, MAX_ANALISES } from '@/hooks/useInsightsHistorico';
import { useObras } from '@/contexts/ERPContext';
import { useAuth } from '@/lib/AuthContext';
import { rotuloEscopo } from '@/lib/escopoObra';
import { gerarInsights } from '@/services/ia/iaClient';
import { montarSnapshotBI } from '@/services/ia/snapshotBI';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SinaisAutomaticos from '@/components/ia/insights/SinaisAutomaticos';
import RecomendacaoCard from '@/components/ia/insights/RecomendacaoCard';
import {
  FOCOS, focoDe, IMPACTO_UI, PRAZO_UI, STATUS_REC_UI, ORDEM_STATUS_REC, AREAS_REC, fmtDataHora,
} from '@/components/ia/insights/insightsUi';

const CLS_TRIGGER = 'h-9 bg-slate-900/60 border-slate-700 text-slate-100 text-xs focus:ring-sky-400';
const CLS_CONTENT = 'bg-slate-900 border-slate-700 text-slate-100';
const CLS_ITEM = 'text-xs focus:bg-slate-800 focus:text-white';
const CLS_BTN_SEC = 'inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/60 px-3 h-9 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400';

const lista = (v) => (Array.isArray(v) ? v.map((x) => String(x || '').trim()).filter(Boolean) : []);

/** Normaliza o JSON da IA e dá id estável às recomendações. */
function normalizarResultado(a = {}) {
  return {
    resumo: String(a.resumo || '').trim(),
    destaques: lista(a.destaques),
    riscos: lista(a.riscos),
    recomendacoes: (Array.isArray(a.recomendacoes) ? a.recomendacoes : []).map((r, i) => ({
      id: `r${i + 1}`,
      titulo: String(r?.titulo || 'Recomendação').trim(),
      detalhe: String(r?.detalhe || '').trim(),
      area: r?.area || 'Dados',
      impacto: IMPACTO_UI[r?.impacto] ? r.impacto : 'medio',
      prazo: PRAZO_UI[r?.prazo] ? r.prazo : 'este_mes',
    })),
  };
}

function csvCampo(v) {
  const s = String(v ?? '');
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function InsightsIAPage() {
  const bi = useBIData();
  const { escopoObra, obras = [] } = useObras();
  const { user, profile } = useAuth();
  const { analises, salvarAnalise, definirStatus } = useInsightsHistorico();

  const rotulo = useMemo(() => rotuloEscopo(escopoObra, obras), [escopoObra, obras]);
  const usuario = profile?.nome || user?.email || '';

  const [foco, setFoco] = useState('geral');
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(null);
  const [abertaId, setAbertaId] = useState(null);
  const [fStatus, setFStatus] = useState('todos');
  const [fArea, setFArea] = useState('todas');
  const [abaMobile, setAbaMobile] = useState('analise'); // analise | historico

  // Abre a mais recente por padrão (ou quando a aberta sai do histórico)
  useEffect(() => {
    if (!analises.length) { if (abertaId) setAbertaId(null); return; }
    if (!abertaId || !analises.some((a) => a.id === abertaId)) setAbertaId(analises[0].id);
  }, [analises, abertaId]);

  const aberta = useMemo(() => analises.find((a) => a.id === abertaId) || null, [analises, abertaId]);
  const resultado = aberta?.resultado;

  const nObras = bi?.obras?.executivo?.obrasAtivas ?? 0;
  const nAlertas = bi?.alertas?.length ?? 0;

  const gerar = useCallback(async () => {
    setGerando(true);
    setErro(null);
    try {
      const snapshot = montarSnapshotBI(bi, { rotuloEscopo: rotulo });
      const f = focoDe(foco);
      const r = await gerarInsights({ snapshot, foco: f.descricao });
      if (!r?.analise || typeof r.analise !== 'object') throw new Error('A IA não devolveu uma análise. Tente gerar de novo.');
      const id = `ins-${Date.now()}`;
      await salvarAnalise({
        id,
        criadoEm: new Date().toISOString(),
        escopo: rotulo,
        escopoObra: escopoObra || 'geral',
        foco: f.valor,
        focoRotulo: f.rotulo,
        modelo: r.modelo || '',
        usage: r.usage || null,
        por: usuario,
        resultado: normalizarResultado(r.analise),
        status: {},
      });
      setAbertaId(id);
      setFStatus('todos');
      setFArea('todas');
      setAbaMobile('analise');
      toast.success('Análise gerada e salva no histórico.');
    } catch (e) {
      const msg = e?.message || 'Falha ao gerar a análise.';
      setErro(msg);
      toast.error(msg);
    } finally {
      setGerando(false);
    }
  }, [bi, rotulo, foco, escopoObra, usuario, salvarAnalise]);

  const statusDe = useCallback((recId) => aberta?.status?.[recId]?.status || 'nova', [aberta]);

  const recsFiltradas = useMemo(() => {
    const recs = resultado?.recomendacoes || [];
    return recs
      .filter((r) => (fStatus === 'todos' || statusDe(r.id) === fStatus) && (fArea === 'todas' || r.area === fArea))
      .sort((a, b) =>
        (ORDEM_STATUS_REC.indexOf(statusDe(a.id)) >= 3) - (ORDEM_STATUS_REC.indexOf(statusDe(b.id)) >= 3)
        || IMPACTO_UI[a.impacto].ordem - IMPACTO_UI[b.impacto].ordem
        || PRAZO_UI[a.prazo].ordem - PRAZO_UI[b.prazo].ordem);
  }, [resultado, fStatus, fArea, statusDe]);

  const contagemStatus = useMemo(() => {
    const c = {};
    (resultado?.recomendacoes || []).forEach((r) => { const s = statusDe(r.id); c[s] = (c[s] || 0) + 1; });
    return c;
  }, [resultado, statusDe]);

  const areasPresentes = useMemo(() => {
    const s = new Set((resultado?.recomendacoes || []).map((r) => r.area));
    return [...AREAS_REC.filter((a) => s.has(a)), ...[...s].filter((a) => !AREAS_REC.includes(a))];
  }, [resultado]);

  const exportarCSV = useCallback(() => {
    if (!aberta || !resultado) return;
    const cab = ['Título', 'Área', 'Impacto', 'Prazo', 'Status', 'Nota', 'Detalhe', 'Atualizado em', 'Por'];
    const linhas = resultado.recomendacoes.map((r) => {
      const reg = aberta.status?.[r.id] || {};
      return [
        r.titulo, r.area, IMPACTO_UI[r.impacto]?.rotulo.replace('Impacto ', ''), PRAZO_UI[r.prazo]?.rotulo,
        STATUS_REC_UI[reg.status || 'nova']?.rotulo, reg.nota || '', r.detalhe, fmtDataHora(reg.em), reg.por || '',
      ];
    });
    const csv = '﻿' + [cab, ...linhas].map((l) => l.map(csvCampo).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const el = document.createElement('a');
    const d = new Date(aberta.criadoEm);
    const pad = (n) => String(n).padStart(2, '0');
    el.href = url;
    el.download = `insights-ia_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.csv`;
    document.body.appendChild(el);
    el.click();
    el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [aberta, resultado]);

  const copiarResumo = useCallback(async () => {
    if (!aberta || !resultado) return;
    const partes = [
      `Insights IA — ${aberta.focoRotulo || focoDe(aberta.foco).rotulo} · Escopo: ${aberta.escopo} · ${fmtDataHora(aberta.criadoEm)}`,
      '',
      'LEITURA EXECUTIVA',
      resultado.resumo,
    ];
    if (resultado.destaques.length) partes.push('', 'DESTAQUES', ...resultado.destaques.map((d) => `• ${d}`));
    if (resultado.riscos.length) partes.push('', 'RISCOS', ...resultado.riscos.map((d) => `• ${d}`));
    if (resultado.recomendacoes.length) {
      partes.push('', 'RECOMENDAÇÕES', ...resultado.recomendacoes.map((r) =>
        `• [${r.area} | ${IMPACTO_UI[r.impacto]?.rotulo} | ${PRAZO_UI[r.prazo]?.rotulo} | ${STATUS_REC_UI[statusDe(r.id)]?.rotulo}] ${r.titulo} — ${r.detalhe}`));
    }
    partes.push('', `Análise gerada por IA${aberta.modelo ? ` (modelo ${aberta.modelo})` : ''} a partir de um resumo dos dados do ERP; confira antes de decidir.`);
    try {
      await navigator.clipboard.writeText(partes.join('\n'));
      toast.success('Resumo copiado.');
    } catch {
      toast.error('Não foi possível copiar (permissão da área de transferência).');
    }
  }, [aberta, resultado, statusDe]);

  const mudarStatus = useCallback((recId, status) => {
    if (!aberta) return;
    definirStatus(aberta.id, recId, { status, por: usuario });
  }, [aberta, definirStatus, usuario]);

  const mudarNota = useCallback((recId, nota) => {
    if (!aberta) return;
    definirStatus(aberta.id, recId, { nota, por: usuario });
  }, [aberta, definirStatus, usuario]);

  // ---------- Histórico (lateral / aba no celular) ----------
  const historico = (
    <section className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3 min-w-0" aria-labelledby="hist-titulo">
      <h2 id="hist-titulo" className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
        <History className="h-4 w-4 text-sky-400" aria-hidden /> Análises anteriores
      </h2>
      <p className="text-[11px] text-slate-500 mb-2">Guardamos as {MAX_ANALISES} mais recentes, sincronizadas entre computadores.</p>
      {analises.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">Nenhuma análise gerada ainda.</p>
      ) : (
        <ul className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
          {analises.map((a) => {
            const recs = a.resultado?.recomendacoes || [];
            const feitas = recs.filter((r) => ['concluida', 'descartada'].includes(a.status?.[r.id]?.status)).length;
            const ativa = a.id === abertaId;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => { setAbertaId(a.id); setFStatus('todos'); setFArea('todas'); setAbaMobile('analise'); }}
                  aria-current={ativa ? 'true' : undefined}
                  aria-label={`Abrir análise de ${fmtDataHora(a.criadoEm)}, ${a.focoRotulo || ''}, escopo ${a.escopo}`}
                  className={cn(
                    'w-full text-left rounded-lg border px-2.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
                    ativa ? 'border-sky-500/60 bg-sky-500/10' : 'border-slate-800 hover:bg-slate-800/60',
                  )}
                >
                  <span className="block text-xs font-medium text-slate-100">{fmtDataHora(a.criadoEm)}</span>
                  <span className="block text-[11px] text-slate-400 truncate">{a.focoRotulo || focoDe(a.foco).rotulo} · {a.escopo}</span>
                  <span className="block text-[11px] text-slate-500">
                    {recs.length} recomendações · {feitas} tratadas{a.por ? ` · ${a.por}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-[1400px] mx-auto min-w-0">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl md:text-2xl font-bold text-white">
            <Sparkles className="h-6 w-6 text-sky-400" aria-hidden /> Insights IA
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-3xl">
            Leitura executiva, riscos e recomendações geradas por IA a partir dos números reais do BI 360 e do Radar de Alertas.
          </p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800/70 px-2.5 py-0.5 text-[11px] font-medium text-slate-200">
            Escopo: {rotulo}
            <span className="text-slate-500">(seletor do topo)</span>
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px]">
            <label htmlFor="foco-insights" className="block text-[11px] text-slate-400 mb-1">Foco da análise</label>
            <Select value={foco} onValueChange={setFoco} disabled={gerando}>
              <SelectTrigger id="foco-insights" className={cn(CLS_TRIGGER, 'w-full')} aria-label="Foco da análise">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={CLS_CONTENT}>
                {FOCOS.map((f) => <SelectItem key={f.valor} value={f.valor} className={CLS_ITEM}>{f.rotulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <button
            type="button"
            onClick={gerar}
            disabled={gerando || bi?.carregando}
            title={bi?.carregando ? 'Aguarde o carregamento dos dados' : undefined}
            aria-label="Gerar análise com IA"
            className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 h-9 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            {gerando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {gerando ? 'Gerando…' : 'Gerar análise'}
          </button>
        </div>
      </header>

      {/* Estados de geração */}
      {gerando && (
        <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
          <span>
            Analisando {nObras} {nObras === 1 ? 'obra' : 'obras'}, {nAlertas} {nAlertas === 1 ? 'alerta' : 'alertas'}, produção, caixa e suprimentos
            ({focoDe(foco).rotulo.toLowerCase()})… isso leva de 20 a 60 segundos.
          </span>
        </div>
      )}
      {erro && !gerando && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold">Não foi possível gerar a análise</p>
            <p className="text-red-200/90 break-words">{erro}</p>
          </div>
        </div>
      )}
      {bi?.erro && (
        <p className="flex items-center gap-2 text-xs text-yellow-300">
          <Info className="h-4 w-4" aria-hidden /> Histórico de produção indisponível ({bi.erro}); a análise usará os demais dados.
        </p>
      )}

      {/* Sinais automáticos (sempre) */}
      <SinaisAutomaticos bi={bi} />

      {/* Abas no celular */}
      <div className="flex gap-1 lg:hidden" role="tablist" aria-label="Seções">
        {[{ v: 'analise', r: 'Análise' }, { v: 'historico', r: `Análises anteriores (${analises.length})` }].map((t) => (
          <button
            key={t.v}
            type="button"
            role="tab"
            aria-selected={abaMobile === t.v}
            onClick={() => setAbaMobile(t.v)}
            className={cn(
              'flex-1 rounded-md border px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
              abaMobile === t.v ? 'border-sky-500/60 bg-sky-500/10 text-sky-100' : 'border-slate-700 text-slate-400',
            )}
          >
            {t.r}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
        {/* Análise aberta */}
        <div className={cn('space-y-4 min-w-0', abaMobile !== 'analise' && 'hidden lg:block')}>
          {!aberta ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-slate-500" aria-hidden />
              <p className="mt-2 text-sm text-slate-300">Nenhuma análise ainda.</p>
              <p className="text-xs text-slate-500 mt-1">
                Escolha o foco e clique em <strong className="text-slate-300">Gerar análise</strong>. A IA lê um resumo dos números do escopo atual.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-400 min-w-0">
                  <span className="text-slate-200 font-medium">{aberta.focoRotulo || focoDe(aberta.foco).rotulo}</span>
                  {' · '}gerada em {fmtDataHora(aberta.criadoEm)}{aberta.por ? ` por ${aberta.por}` : ''}
                  {' · '}escopo <span className={cn(aberta.escopo !== rotulo && 'text-yellow-300')}>{aberta.escopo}</span>
                  {aberta.escopo !== rotulo && ' (diferente do escopo atual)'}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={copiarResumo} className={CLS_BTN_SEC} aria-label="Copiar resumo da análise">
                    <Copy className="h-4 w-4" aria-hidden /> Copiar resumo
                  </button>
                  <button
                    type="button"
                    onClick={exportarCSV}
                    disabled={!resultado?.recomendacoes?.length}
                    className={CLS_BTN_SEC}
                    aria-label="Exportar recomendações em CSV"
                  >
                    <Download className="h-4 w-4" aria-hidden /> Exportar CSV
                  </button>
                </div>
              </div>

              {/* Leitura executiva */}
              <section className="rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-slate-900/60 p-4" aria-labelledby="resumo-titulo">
                <h2 id="resumo-titulo" className="flex items-center gap-2 text-sm font-semibold text-white">
                  <FileText className="h-4 w-4 text-sky-400" aria-hidden /> Leitura executiva
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-200 whitespace-pre-line">{resultado?.resumo || '—'}</p>
              </section>

              {/* Destaques e riscos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 min-w-0" aria-labelledby="destaques-titulo">
                  <h2 id="destaques-titulo" className="flex items-center gap-2 text-sm font-semibold text-white">
                    <ThumbsUp className="h-4 w-4 text-emerald-400" aria-hidden /> Destaques
                  </h2>
                  {resultado?.destaques?.length ? (
                    <ul className="mt-2 space-y-1.5">
                      {resultado.destaques.map((d, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-200">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />{d}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-2 text-xs text-slate-500">Sem destaques.</p>}
                </section>
                <section className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 min-w-0" aria-labelledby="riscos-titulo">
                  <h2 id="riscos-titulo" className="flex items-center gap-2 text-sm font-semibold text-white">
                    <ShieldAlert className="h-4 w-4 text-red-400" aria-hidden /> Riscos
                  </h2>
                  {resultado?.riscos?.length ? (
                    <ul className="mt-2 space-y-1.5">
                      {resultado.riscos.map((d, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-200">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" aria-hidden />{d}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-2 text-xs text-slate-500">Sem riscos apontados.</p>}
                </section>
              </div>

              {/* Recomendações */}
              <section className="space-y-3" aria-labelledby="recs-titulo">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div className="min-w-0">
                    <h2 id="recs-titulo" className="text-sm font-semibold text-white">
                      Recomendações ({resultado?.recomendacoes?.length || 0})
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      {ORDEM_STATUS_REC.filter((s) => contagemStatus[s]).map((s) => `${contagemStatus[s]} ${STATUS_REC_UI[s].rotulo.toLowerCase()}`).join(' · ') || '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" aria-hidden />
                    <Select value={fStatus} onValueChange={setFStatus}>
                      <SelectTrigger className={cn(CLS_TRIGGER, 'w-[150px]')} aria-label="Filtrar por status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={CLS_CONTENT}>
                        <SelectItem value="todos" className={CLS_ITEM}>Todos os status</SelectItem>
                        {ORDEM_STATUS_REC.map((s) => (
                          <SelectItem key={s} value={s} className={CLS_ITEM}>{STATUS_REC_UI[s].rotulo} ({contagemStatus[s] || 0})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={fArea} onValueChange={setFArea}>
                      <SelectTrigger className={cn(CLS_TRIGGER, 'w-[150px]')} aria-label="Filtrar por área">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={CLS_CONTENT}>
                        <SelectItem value="todas" className={CLS_ITEM}>Todas as áreas</SelectItem>
                        {areasPresentes.map((a) => <SelectItem key={a} value={a} className={CLS_ITEM}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {recsFiltradas.length === 0 ? (
                  <p className="rounded-xl border border-slate-800 p-6 text-center text-sm text-slate-500">
                    {resultado?.recomendacoes?.length ? 'Nenhuma recomendação com esses filtros.' : 'A IA não trouxe recomendações nesta análise.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {recsFiltradas.map((r) => (
                      <RecomendacaoCard
                        key={`${aberta.id}:${r.id}`}
                        rec={r}
                        registro={aberta.status?.[r.id]}
                        onStatus={(s) => mudarStatus(r.id, s)}
                        onNota={(n) => mudarNota(r.id, n)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <p className="border-t border-slate-800 pt-3 text-[11px] text-slate-500">
                Análise gerada por IA{aberta.modelo ? ` (modelo ${aberta.modelo})` : ''} a partir de um resumo dos dados do ERP; confira antes de decidir.
              </p>
            </>
          )}
        </div>

        {/* Histórico */}
        <aside className={cn('min-w-0 lg:sticky lg:top-4', abaMobile !== 'historico' && 'hidden lg:block')}>
          {historico}
        </aside>
      </div>
    </div>
  );
}
