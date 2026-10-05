// ============================================================
// CENTRAL DE TAREFAS — substitui "Tarefas" e "Colaboração"
// ============================================================
// Dados reais da tabela `tarefas` (colaboracaoApi) no escopo do seletor do
// topo (filtro único — CLAUDE.md 1c). Visões Quadro / Lista / Cronograma +
// Mural da obra (quando o topo está em UMA obra). Ações otimistas com
// rollback e toast do erro real (useTarefas).
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ListTodo, Plus, RefreshCw, AlertTriangle, LayoutGrid, List, GanttChartSquare, MessagesSquare, Radar,
  CircleDot, CalendarX, AlarmClock, CalendarCheck, Loader2,
} from 'lucide-react';
import { useObras } from '@/contexts/ERPContext';
import { useAuth } from '@/lib/AuthContext';
import { rotuloEscopo } from '@/lib/escopoObra';
import { cn } from '@/lib/utils';
import { useTarefas } from '@/hooks/useTarefas';
import QuadroView from '@/components/tarefas2/QuadroView';
import ListaView from '@/components/tarefas2/ListaView';
import CronogramaView from '@/components/tarefas2/CronogramaView';
import MuralObra from '@/components/tarefas2/MuralObra';
import TarefaFormDialog from '@/components/tarefas2/TarefaFormDialog';
import TarefaDetalhe from '@/components/tarefas2/TarefaDetalhe';
import AlertasParaTarefas from '@/components/tarefas2/AlertasParaTarefas';
import FiltrosTarefas, { FILTROS_PADRAO } from '@/components/tarefas2/FiltrosTarefas';
import {
  normalizar, estaConcluida, estaAtrasada, venceEm7Dias, concluidaNoMes, tagsDe, depsDe, STATUS_UI,
  CLS_BTN, CLS_BTN_PRIM,
} from '@/components/tarefas2/tarefasUi';

const VISOES = [
  { valor: 'quadro', rotulo: 'Quadro', Icone: LayoutGrid },
  { valor: 'lista', rotulo: 'Lista', Icone: List },
  { valor: 'cronograma', rotulo: 'Cronograma', Icone: GanttChartSquare },
  { valor: 'mural', rotulo: 'Mural da obra', Icone: MessagesSquare },
];

export default function CentralTarefasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { obras = [], escopoObra, obraAtual } = useObras();
  const { user } = useAuth();
  const { tarefas, carregando, erro, recarregar, criar, atualizar, excluir, atualizarVarias, excluirVarias } = useTarefas();

  const [filtros, setFiltros] = useState(FILTROS_PADRAO);
  const [form, setForm] = useState({ aberto: false, tarefa: null });
  const [detalheId, setDetalheId] = useState(null);
  const [alertasAberto, setAlertasAberto] = useState(false);

  const autorNome = user?.nome || user?.name || user?.email || '';
  const nomeUsuario = normalizar(user?.nome || user?.name);

  // Visão sincronizada com ?visao=
  const visaoParam = searchParams.get('visao');
  const visao = VISOES.some((v) => v.valor === visaoParam) ? visaoParam : 'quadro';
  const trocarVisao = useCallback((v) => {
    setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set('visao', v); return p; }, { replace: true });
  }, [setSearchParams]);

  // Deep-link ?tarefa=<id> (ex.: links de notificação)
  const tarefaParam = searchParams.get('tarefa');
  useEffect(() => { if (tarefaParam) setDetalheId(tarefaParam); }, [tarefaParam]);
  const fecharDetalhe = useCallback(() => {
    setDetalheId(null);
    if (searchParams.get('tarefa')) {
      setSearchParams((prev) => { const p = new URLSearchParams(prev); p.delete('tarefa'); return p; }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const detalhe = useMemo(() => (detalheId ? tarefas.find((t) => String(t.id) === String(detalheId)) || null : null), [tarefas, detalheId]);

  // ---- Contadores (escopo inteiro, sem filtros) ----
  const contadores = useMemo(() => {
    const hoje = new Date();
    let abertas = 0; let atrasadas = 0; let vencendo = 0; let concluidasMes = 0;
    tarefas.forEach((t) => {
      if (!estaConcluida(t)) abertas += 1;
      if (estaAtrasada(t)) atrasadas += 1;
      if (venceEm7Dias(t)) vencendo += 1;
      if (concluidaNoMes(t, hoje)) concluidasMes += 1;
    });
    return { abertas, atrasadas, vencendo, concluidas_mes: concluidasMes };
  }, [tarefas]);

  const responsaveis = useMemo(() => {
    const m = new Map();
    tarefas.forEach((t) => { const r = String(t.responsavel || '').trim(); if (r && !m.has(normalizar(r))) m.set(normalizar(r), r); });
    return [...m.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [tarefas]);

  // ---- Filtragem ----
  const filtradas = useMemo(() => {
    const q = normalizar(filtros.busca);
    const hoje = new Date();
    return tarefas.filter((t) => {
      if (filtros.status !== 'todos' && t.status !== filtros.status) return false;
      if (filtros.prioridade !== 'todas' && (t.prioridade || 'media') !== filtros.prioridade) return false;
      if (filtros.origem !== 'todas' && (t.origem || 'manual') !== filtros.origem) return false;
      if (filtros.minhas) {
        if (!nomeUsuario || normalizar(t.responsavel) !== nomeUsuario) return false;
      } else if (filtros.responsavel === '__sem__') {
        if (String(t.responsavel || '').trim()) return false;
      } else if (filtros.responsavel !== 'todos' && normalizar(t.responsavel) !== normalizar(filtros.responsavel)) return false;
      if (filtros.prazo === 'abertas' && estaConcluida(t)) return false;
      if (filtros.prazo === 'atrasadas' && !estaAtrasada(t)) return false;
      if (filtros.prazo === 'vencendo' && !venceEm7Dias(t)) return false;
      if (filtros.prazo === 'concluidas_mes' && !concluidaNoMes(t, hoje)) return false;
      if (q) {
        const alvo = normalizar([t.titulo, t.descricao, t.responsavel, t.observacoes, ...tagsDe(t)].join(' '));
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [tarefas, filtros, nomeUsuario]);

  // ---- Ações ----
  const abrirNova = () => setForm({ aberto: true, tarefa: null });
  const abrirEditar = useCallback((t) => setForm({ aberto: true, tarefa: t }), []);
  const abrirDetalhe = useCallback((t) => setDetalheId(t.id), []);

  const salvarForm = useCallback(async (dados) => {
    const original = form.tarefa;
    if (original) {
      const mudancas = { ...dados };
      // Edição de tarefa já concluída mantém a data original de conclusão
      if (original.status === 'concluida' && dados.status === 'concluida' && original.data_conclusao) mudancas.data_conclusao = original.data_conclusao;
      await atualizar(original.id, mudancas);
      toast.success('Tarefa atualizada.');
    } else {
      await criar({ ...dados, origem: 'manual' });
      toast.success('Tarefa criada.');
    }
  }, [form.tarefa, atualizar, criar]);

  const mover = useCallback(async (t, status) => {
    if (!t || t.status === status || String(t.id).startsWith('tmp-')) return;
    if (status !== 'pendente') {
      const pend = depsDe(t).map((id) => tarefas.find((x) => String(x.id) === id)).filter((d) => d && !estaConcluida(d));
      if (pend.length) toast.warning(`Atenção: depende de "${pend[0].titulo}"${pend.length > 1 ? ` e mais ${pend.length - 1}` : ''}, ainda não concluída.`);
    }
    try {
      await atualizar(t.id, { status });
      toast.success(`"${t.titulo}" → ${STATUS_UI[status]?.rotulo || status}`);
    } catch { /* toast de erro já exibido; estado revertido */ }
  }, [atualizar, tarefas]);

  const excluirUma = useCallback(async (t) => {
    fecharDetalhe();
    try {
      await excluir(t.id);
      toast.success('Tarefa excluída.');
    } catch { /* revertido + toast no hook */ }
  }, [excluir, fecharDetalhe]);

  const cartoes = [
    { chave: 'abertas', rotulo: 'Abertas', valor: contadores.abertas, cor: '#3b82f6', Icone: CircleDot },
    { chave: 'atrasadas', rotulo: 'Atrasadas', valor: contadores.atrasadas, cor: '#ef4444', Icone: CalendarX },
    { chave: 'vencendo', rotulo: 'Vencendo em 7 dias', valor: contadores.vencendo, cor: '#eab308', Icone: AlarmClock },
    { chave: 'concluidas_mes', rotulo: 'Concluídas no mês', valor: contadores.concluidas_mes, cor: '#22c55e', Icone: CalendarCheck },
  ];

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-4 p-4 md:p-6">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold text-white md:text-2xl">
            <ListTodo className="h-6 w-6 text-sky-400" aria-hidden /> Central de Tarefas
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Tarefas das obras e da fábrica — manuais, importadas, criadas pelas automações ou a partir dos alertas do Radar.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-0.5 font-medium text-sky-200">
              Escopo: {rotuloEscopo(escopoObra, obras)}
            </span>
            <span className="text-slate-400">{carregando ? 'Carregando…' : `${tarefas.length} tarefa(s) no escopo · ${filtradas.length} exibida(s)`}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" className={CLS_BTN} onClick={() => setAlertasAberto(true)}>
            <Radar className="h-4 w-4" aria-hidden /> Criar tarefas a partir dos alertas
          </button>
          <button type="button" className={CLS_BTN} onClick={recarregar} disabled={carregando} aria-label="Recarregar tarefas">
            <RefreshCw className={cn('h-4 w-4', carregando && 'animate-spin')} aria-hidden />
          </button>
          <button type="button" className={CLS_BTN_PRIM} onClick={abrirNova}>
            <Plus className="h-4 w-4" aria-hidden /> Nova tarefa
          </button>
        </div>
      </header>

      {erro && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">Não foi possível carregar as tarefas: {erro}</span>
          <button type="button" onClick={recarregar} className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">Tentar de novo</button>
        </div>
      )}

      {/* Contadores (clicáveis = filtro de prazo) */}
      <section aria-label="Resumo das tarefas" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cartoes.map((c) => {
          const ativo = filtros.prazo === c.chave;
          return (
            <button
              key={c.chave}
              type="button"
              aria-pressed={ativo}
              onClick={() => setFiltros((f) => ({ ...f, prazo: ativo ? 'todos' : c.chave }))}
              className={cn(
                'min-w-0 rounded-xl border bg-slate-900/60 p-3 text-left transition-colors md:p-4',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
                ativo ? 'border-slate-300 bg-slate-800/80' : 'border-slate-700/60 hover:bg-slate-800/60',
              )}
              style={ativo ? { boxShadow: `inset 0 -3px 0 ${c.cor}` } : undefined}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <c.Icone className="h-4 w-4 shrink-0" style={{ color: c.cor }} aria-hidden />
                <span className="truncate">{c.rotulo}</span>
                {ativo && <span className="ml-auto text-[11px] text-slate-400">filtrando</span>}
              </div>
              <div className="mt-1.5 text-2xl font-semibold tabular-nums text-white">
                {carregando && !tarefas.length ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" aria-label="Carregando" /> : c.valor}
              </div>
            </button>
          );
        })}
      </section>

      {/* Visões */}
      <nav role="tablist" aria-label="Visões" className="flex flex-wrap gap-1 border-b border-slate-700/60">
        {VISOES.map((v) => {
          const ativo = visao === v.valor;
          return (
            <button
              key={v.valor}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => trocarVisao(v.valor)}
              className={cn(
                '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
                ativo ? 'border-sky-400 text-sky-100' : 'border-transparent text-slate-400 hover:text-slate-200',
              )}
            >
              <v.Icone className="h-4 w-4" aria-hidden /> {v.rotulo}
            </button>
          );
        })}
      </nav>

      {visao !== 'mural' && (
        <FiltrosTarefas filtros={filtros} setFiltros={setFiltros} responsaveis={responsaveis} temUsuario={!!nomeUsuario} />
      )}

      <div role="tabpanel" aria-label={VISOES.find((v) => v.valor === visao)?.rotulo}>
        {visao === 'quadro' && <QuadroView tarefas={filtradas} obras={obras} onAbrir={abrirDetalhe} onMover={mover} />}
        {visao === 'lista' && (
          <ListaView tarefas={filtradas} obras={obras} onAbrir={abrirDetalhe} atualizarVarias={atualizarVarias} excluirVarias={excluirVarias} />
        )}
        {visao === 'cronograma' && <CronogramaView tarefas={filtradas} obras={obras} onAbrir={abrirDetalhe} />}
        {visao === 'mural' && <MuralObra obraAtual={obraAtual} obras={obras} autorNome={autorNome} />}
      </div>

      <TarefaFormDialog
        aberto={form.aberto}
        tarefa={form.tarefa}
        onFechar={() => setForm({ aberto: false, tarefa: null })}
        obras={obras}
        obraSugerida={obraAtual || null}
        todasTarefas={tarefas}
        responsaveis={responsaveis}
        onSalvar={salvarForm}
      />

      <TarefaDetalhe
        tarefa={detalhe}
        obras={obras}
        todasTarefas={tarefas}
        autorNome={autorNome}
        onFechar={fecharDetalhe}
        onEditar={(t) => { fecharDetalhe(); abrirEditar(t); }}
        onExcluir={excluirUma}
        onMudarStatus={mover}
        onAbrir={abrirDetalhe}
      />

      <AlertasParaTarefas aberto={alertasAberto} onFechar={() => setAlertasAberto(false)} tarefas={tarefas} criar={criar} />
    </div>
  );
}
