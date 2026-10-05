// ============================================================
// RADAR DE ALERTAS — central de anomalias do ERP
// ============================================================
// Detecção automática com dados REAIS (useBIData → services/bi/radarAlertas).
// Escopo vem do seletor do TOPO (CLAUDE.md 1c) — sem filtro de obra aqui.
// Status (novo / em tratamento / resolvido / ignorado) via useAlertasStatus
// (localStorage + entity_store 'radar_alertas_status').
// ============================================================

import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radar, RefreshCw, Download, Search, ShieldCheck, ChevronDown, List, Layers, Repeat, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBIData } from '@/hooks/useBIData';
import { useAlertasStatus, STATUS_ALERTA } from '@/hooks/useAlertasStatus';
import { useObras } from '@/contexts/ERPContext';
import { rotuloEscopo } from '@/lib/escopoObra';
import { REGRAS, SEVERIDADES } from '@/services/bi/radarAlertas';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AlertaCard from '@/components/bi/radar/AlertaCard';
import ComoFunciona from '@/components/bi/radar/ComoFunciona';
import { SEV_UI, ORDEM_SEV, AREAS, FILTROS_STATUS, ehReincidente, fmtDataHora } from '@/components/bi/radar/radarUi';

const CLS_TRIGGER = 'h-9 bg-slate-900/60 border-slate-700 text-slate-100 text-xs focus:ring-sky-400';
const CLS_CONTENT = 'bg-slate-900 border-slate-700 text-slate-100';
const CLS_ITEM = 'text-xs focus:bg-slate-800 focus:text-white';

const areaDe = (a) => REGRAS[a.regra]?.area || 'Outros';
const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function csvCampo(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function RadarAlertasPage() {
  const navigate = useNavigate();
  const { alertas = [], carregando, erro, recarregar, atualizadoEm, nomeObra } = useBIData();
  const { status, statusDe, definir } = useAlertasStatus();
  const { escopoObra, obras = [] } = useObras();

  const [fSev, setFSev] = useState('todas');
  const [fArea, setFArea] = useState('todas');
  const [fStatus, setFStatus] = useState('abertos');
  const [busca, setBusca] = useState('');
  const [modo, setModo] = useState('lista'); // 'lista' | 'area'
  const [areasFechadas, setAreasFechadas] = useState(() => new Set());

  // Enriquecimento: status atual + reincidência (resolvido > 7 dias e ainda detectado)
  const enriquecidos = useMemo(() => {
    const agora = Date.now();
    return alertas.map((a) => ({
      alerta: a,
      st: statusDe(a.id),
      registro: status[a.id] || null,
      reincidente: ehReincidente(status[a.id], agora),
      area: areaDe(a),
    }));
  }, [alertas, status, statusDe]);

  const passaStatus = useCallback((e) => {
    if (fStatus === 'todos') return true;
    if (fStatus === 'abertos') return e.st === 'novo' || e.st === 'reconhecido' || e.reincidente;
    return e.st === fStatus;
  }, [fStatus]);

  const passaBusca = useMemo(() => {
    const q = normalizar(busca.trim());
    if (!q) return () => true;
    return (e) => normalizar([
      e.alerta.titulo, e.alerta.detalhe, REGRAS[e.alerta.regra]?.rotulo, e.area,
      e.alerta.obraId ? nomeObra(e.alerta.obraId) : '', e.registro?.nota,
    ].join(' ')).includes(q);
  }, [busca, nomeObra]);

  // Base dos contadores: todos os filtros exceto severidade (os tiles filtram por severidade)
  const base = useMemo(
    () => enriquecidos.filter((e) => passaStatus(e) && (fArea === 'todas' || e.area === fArea) && passaBusca(e)),
    [enriquecidos, passaStatus, fArea, passaBusca],
  );

  const contagem = useMemo(() => {
    const c = { critico: 0, alto: 0, medio: 0, baixo: 0 };
    base.forEach((e) => { if (c[e.alerta.severidade] !== undefined) c[e.alerta.severidade] += 1; });
    return c;
  }, [base]);

  const filtrados = useMemo(() => {
    const l = fSev === 'todas' ? base : base.filter((e) => e.alerta.severidade === fSev);
    return [...l].sort((a, b) =>
      (SEVERIDADES[a.alerta.severidade]?.ordem ?? 9) - (SEVERIDADES[b.alerta.severidade]?.ordem ?? 9)
      || (Number(b.alerta.valor) || 0) - (Number(a.alerta.valor) || 0));
  }, [base, fSev]);

  const porArea = useMemo(() => {
    const m = new Map();
    filtrados.forEach((e) => { if (!m.has(e.area)) m.set(e.area, []); m.get(e.area).push(e); });
    const ordem = [...AREAS, 'Outros'];
    return [...m.entries()].sort((a, b) => ordem.indexOf(a[0]) - ordem.indexOf(b[0]));
  }, [filtrados]);

  const totalAbertos = useMemo(
    () => enriquecidos.filter((e) => e.st === 'novo' || e.st === 'reconhecido' || e.reincidente).length,
    [enriquecidos],
  );
  const totalReincidentes = useMemo(() => enriquecidos.filter((e) => e.reincidente).length, [enriquecidos]);

  const abrir = useCallback((link) => { if (link) navigate(link); }, [navigate]);
  const toggleArea = useCallback((area) => {
    setAreasFechadas((prev) => { const n = new Set(prev); if (n.has(area)) n.delete(area); else n.add(area); return n; });
  }, []);

  const exportarCSV = useCallback(() => {
    const cab = ['Severidade', 'Área', 'Regra', 'Título', 'Detalhe', 'Obra', 'Valor', 'Unidade', 'Status', 'Status definido em', 'Nota', 'Reincidente', 'Link', 'ID'];
    const linhas = filtrados.map(({ alerta: a, st, registro, reincidente, area }) => [
      SEV_UI[a.severidade]?.rotulo || a.severidade, area, REGRAS[a.regra]?.rotulo || a.regra, a.titulo, a.detalhe,
      a.obraId ? nomeObra(a.obraId) : '',
      a.valor === null || a.valor === undefined ? '' : String(a.valor).replace('.', ','), a.unidade || '',
      STATUS_ALERTA[st] || st, st !== 'novo' && registro?.em ? fmtDataHora(registro.em) : '',
      st !== 'novo' ? registro?.nota || '' : '', reincidente ? 'sim' : '', a.link || '', a.id,
    ]);
    const csv = '﻿' + [cab, ...linhas].map((l) => l.map(csvCampo).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const el = document.createElement('a');
    el.href = url;
    el.download = `radar-alertas_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.csv`;
    document.body.appendChild(el);
    el.click();
    el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [filtrados, nomeObra]);

  const limparFiltros = () => { setFSev('todas'); setFArea('todas'); setFStatus('abertos'); setBusca(''); };
  const filtrosAtivos = fSev !== 'todas' || fArea !== 'todas' || fStatus !== 'abertos' || busca.trim() !== '';

  const renderCard = (e) => (
    <li key={e.alerta.id}>
      <AlertaCard
        alerta={e.alerta}
        registro={e.registro}
        statusAtual={e.st}
        reincidente={e.reincidente}
        nomeObra={nomeObra}
        onDefinir={definir}
        onAbrir={abrir}
      />
    </li>
  );

  const rotuloStatusFiltro = FILTROS_STATUS.find((f) => f.valor === fStatus)?.rotulo || '';

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-[1400px] mx-auto min-w-0">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl md:text-2xl font-bold text-white">
            <Radar className="h-6 w-6 text-sky-400" aria-hidden />
            Radar de Alertas
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-3xl">
            Central de anomalias do ERP: o sistema varre produção, obras, financeiro e estoque e aponta automaticamente o que
            saiu do normal — com dados reais, no escopo do seletor do topo.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-0.5 font-medium text-sky-200">
              Escopo: {rotuloEscopo(escopoObra, obras)}
            </span>
            <span className="text-slate-400">
              {atualizadoEm ? `Atualizado às ${atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : carregando ? 'Carregando dados…' : 'Histórico indisponível'}
            </span>
            <span className="text-slate-400">· {totalAbertos} aberto(s){totalReincidentes ? ` · ${totalReincidentes} reincidente(s)` : ''}</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={exportarCSV}
            disabled={!filtrados.length}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700/70 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Download className="h-4 w-4" aria-hidden /> Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => recarregar(true)}
            disabled={carregando}
            className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/50 bg-sky-600/20 px-3 py-2 text-xs font-medium text-sky-100 hover:bg-sky-600/30 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <RefreshCw className={cn('h-4 w-4', carregando && 'animate-spin')} aria-hidden />
            {carregando ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>
      </header>

      {erro && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span>Não foi possível carregar o histórico de produção ({erro}). Alertas de produção podem estar incompletos.</span>
        </div>
      )}

      {/* Resumo por severidade (clicável = filtro) */}
      <section aria-label="Resumo por severidade" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {ORDEM_SEV.map((s) => {
          const ui = SEV_UI[s];
          const Ic = ui.Icone;
          const ativo = fSev === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={ativo}
              onClick={() => setFSev(ativo ? 'todas' : s)}
              className={cn(
                'rounded-xl border bg-slate-900/60 p-4 text-left transition-colors min-w-0',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
                ativo ? 'border-slate-300 bg-slate-800/80' : 'border-slate-700/60 hover:bg-slate-800/60',
              )}
              style={ativo ? { boxShadow: `inset 0 -3px 0 ${ui.cor}` } : undefined}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <Ic className="h-4 w-4" style={{ color: ui.cor }} aria-hidden />
                {ui.rotulo}
                {ativo && <span className="ml-auto text-[11px] text-slate-400">filtrando</span>}
              </div>
              <div className="mt-2 text-2xl font-semibold text-white tabular-nums">{contagem[s]}</div>
              <div className="mt-0.5 text-[11px] text-slate-400 truncate">{rotuloStatusFiltro.toLowerCase()}</div>
            </button>
          );
        })}
      </section>

      {/* Filtros (uma linha no desktop) */}
      <section aria-label="Filtros" className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
        <div className="w-[calc(50%-4px)] sm:w-40 shrink-0">
          <Select value={fSev} onValueChange={setFSev}>
            <SelectTrigger className={CLS_TRIGGER} aria-label="Severidade"><SelectValue /></SelectTrigger>
            <SelectContent className={CLS_CONTENT}>
              <SelectItem className={CLS_ITEM} value="todas">Todas as severidades</SelectItem>
              {ORDEM_SEV.map((s) => <SelectItem key={s} className={CLS_ITEM} value={s}>{SEV_UI[s].rotulo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[calc(50%-4px)] sm:w-44 shrink-0">
          <Select value={fArea} onValueChange={setFArea}>
            <SelectTrigger className={CLS_TRIGGER} aria-label="Área"><SelectValue /></SelectTrigger>
            <SelectContent className={CLS_CONTENT}>
              <SelectItem className={CLS_ITEM} value="todas">Todas as áreas</SelectItem>
              {AREAS.map((a) => <SelectItem key={a} className={CLS_ITEM} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[calc(50%-4px)] sm:w-40 shrink-0">
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger className={CLS_TRIGGER} aria-label="Status"><SelectValue /></SelectTrigger>
            <SelectContent className={CLS_CONTENT}>
              {FILTROS_STATUS.map((f) => <SelectItem key={f.valor} className={CLS_ITEM} value={f.valor}>{f.rotulo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <label className="relative w-full sm:w-auto sm:flex-1 min-w-0">
          <span className="sr-only">Buscar alertas</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, obra, marca, fornecedor…"
            className="h-9 w-full rounded-md border border-slate-700 bg-slate-900/60 pl-8 pr-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          />
        </label>
        <div role="group" aria-label="Modo de exibição" className="flex shrink-0 rounded-md border border-slate-700 bg-slate-900/60 p-0.5">
          {[{ v: 'lista', r: 'Por severidade', I: List }, { v: 'area', r: 'Por área', I: Layers }].map(({ v, r, I }) => (
            <button
              key={v}
              type="button"
              aria-pressed={modo === v}
              onClick={() => setModo(v)}
              className={cn(
                'inline-flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
                modo === v ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200',
              )}
            >
              <I className="h-3.5 w-3.5" aria-hidden />{r}
            </button>
          ))}
        </div>
      </section>

      {/* Lista */}
      <section aria-label="Alertas" aria-busy={carregando} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span aria-live="polite">
            {filtrados.length} alerta(s) {filtrosAtivos ? 'com os filtros atuais' : 'abertos'}
            {carregando && ' · atualizando…'}
          </span>
          {filtrosAtivos && (
            <button type="button" onClick={limparFiltros} className="text-sky-300 hover:text-sky-200 underline-offset-2 hover:underline">
              Limpar filtros
            </button>
          )}
        </div>

        {filtrados.length === 0 ? (
          carregando && !atualizadoEm ? (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-slate-500" aria-hidden />
              Analisando os dados do ERP…
            </div>
          ) : alertas.length === 0 || (!filtrosAtivos && totalAbertos === 0) ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
              <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-emerald-400" aria-hidden />
              <p className="text-sm font-semibold text-emerald-100">Nenhuma anomalia no escopo atual</p>
              <p className="mt-1 text-xs text-slate-400">
                {alertas.length === 0
                  ? 'Todas as regras do Radar foram verificadas e nada saiu do normal.'
                  : 'Os alertas detectados já foram resolvidos ou ignorados. Veja-os no filtro de status.'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
              Nenhum alerta com os filtros atuais.{' '}
              <button type="button" onClick={limparFiltros} className="text-sky-300 hover:underline">Limpar filtros</button>
            </div>
          )
        ) : modo === 'lista' ? (
          <ul className="space-y-3">{filtrados.map(renderCard)}</ul>
        ) : (
          <div className="space-y-3">
            {porArea.map(([area, itens]) => {
              const fechada = areasFechadas.has(area);
              const pior = ORDEM_SEV.find((s) => itens.some((e) => e.alerta.severidade === s)) || 'baixo';
              const PI = SEV_UI[pior].Icone;
              const idSec = `radar-area-${normalizar(area).replace(/\s+/g, '-')}`;
              return (
                <section key={area} className="rounded-xl border border-slate-700/60 bg-slate-950/30">
                  <button
                    type="button"
                    onClick={() => toggleArea(area)}
                    aria-expanded={!fechada}
                    aria-controls={idSec}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-xl"
                  >
                    <span className="text-sm font-semibold text-white">{area}</span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 tabular-nums">{itens.length}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <PI className="h-3.5 w-3.5" style={{ color: SEV_UI[pior].cor }} aria-hidden />
                      pior: {SEV_UI[pior].rotulo}
                    </span>
                    <ChevronDown className={cn('ml-auto h-4 w-4 text-slate-400 transition-transform', !fechada && 'rotate-180')} aria-hidden />
                  </button>
                  {!fechada && <ul id={idSec} className="space-y-3 px-3 pb-3">{itens.map(renderCard)}</ul>}
                </section>
              );
            })}
          </div>
        )}

        {totalReincidentes > 0 && fStatus !== 'abertos' && fStatus !== 'todos' && fStatus !== 'resolvido' && (
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Repeat className="h-3.5 w-3.5" aria-hidden />
            Há {totalReincidentes} alerta(s) reincidente(s) — veja em “Abertos”.
          </p>
        )}
      </section>

      <ComoFunciona />
    </div>
  );
}
