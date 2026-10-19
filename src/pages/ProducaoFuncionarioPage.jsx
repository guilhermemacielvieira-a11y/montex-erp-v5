// ============================================================
// PRODUÇÃO POR FUNCIONÁRIO — produtividade individual e de equipe
// ============================================================
// Motor puro e testado: services/bi/biFuncionarios.js sobre o histórico
// NORMALIZADO (biProducao.normalizarHistorico — sem duplicatas, [QTD:x/y],
// teto por peça). Pessoa = funcionario_id do apontamento ligado ao cadastro.
// "Produção" = kg que a pessoa CONCLUIU na etapa (mesmo conceito do BI 360 e
// da Análise de Produção). Escopo = seletor ÚNICO do topo.
// A aba "Lançamentos por obra" (grava produção) fica em
// components/producao/LancamentosObraTab.jsx.
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import {
  Users, RefreshCw, TrendingUp, TrendingDown, Minus, Trophy, Clock, AlertTriangle, CheckCircle2,
  Download, Building2, CalendarDays, User, Grid3X3, ClipboardList, ShieldCheck, Search, Factory, Scissors, Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useObras, useProducao, useEquipes } from '@/contexts/ERPContext';
import { rotuloEscopo } from '@/lib/escopoObra';
import { buscarHistorico } from '@/hooks/useBIData';
import { normalizarHistorico } from '@/services/bi/biProducao';
import { PERIODOS, eventosProducao, intervaloPeriodo, serieTemporal, agrupar } from '@/services/bi/biAnaliseProducao';
import {
  resumoPessoas, resumoEquipes, mapaCalor, eventosDaPessoa, qualidadeCadastro,
} from '@/services/bi/biFuncionarios';
import { isoLocal, somaDias, noEscopo } from '@/services/bi/biCore';
import { eventosCorte, coerenciaProducao } from '@/services/bi/biCorte';
import { supabase } from '@/api/supabaseClient';
import CoerenciaProducao from '@/components/producao/CoerenciaProducao';
import LancamentosObraTab from '@/components/producao/LancamentosObraTab';
import DesempenhoIndividual from '@/components/producao/DesempenhoIndividual';
import { useRotasProducao } from '@/hooks/useRotasProducao';
import { aplicarRotas, calibrarRitmos, desempenhoPessoas, resumoFamilias, familiaDe } from '@/services/bi/biDesempenho';

const SETORES_FAB = [
  { key: 'fabricacao', label: 'Fabricação', cor: '#3b82f6' },
  { key: 'solda', label: 'Solda', cor: '#f97316' },
  { key: 'pintura', label: 'Pintura', cor: '#a855f7' },
];
const ROT = { ...Object.fromEntries(SETORES_FAB.map((s) => [s.key, s.label])), corte: 'Corte' };
const COR = { ...Object.fromEntries(SETORES_FAB.map((s) => [s.key, s.cor])), corte: '#eab308' };

// Corte = material (materiais_corte), paginado (PostgREST 1000 linhas)
async function buscarCortes() {
  const out = [];
  for (let de = 0; de < 50000; de += 1000) {
    const { data, error } = await supabase.from('materiais_corte')
      .select('id, obra_id, peca_id, marca, peca, perfil, quantidade, peso_teorico, status_corte, data_fim, funcionario_corte')
      .order('id', { ascending: true }).range(de, de + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
const kg = (v) => `${(Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;
const n0 = (v) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const pct = (v) => `${(Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const dataBR = (d) => (d ? (d instanceof Date ? d : new Date(`${d}T12:00:00`)).toLocaleDateString('pt-BR') : '—');
const TOOLTIP = { contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }, labelStyle: { color: '#e2e8f0' } };
const nomeCurto = (nome) => { const p = String(nome || '').split(' ').filter((x) => x && !/^(de|da|do|dos|das|e)$/i.test(x)); return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : (p[0] || '—'); };
const iniciais = (nome) => String(nome || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

function Variacao({ v }) {
  if (v == null) return <span className="text-xs text-slate-600">—</span>;
  const I = v > 0 ? TrendingUp : v < 0 ? TrendingDown : Minus;
  return <span className={cn('inline-flex items-center gap-1 text-xs', v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-slate-400')}><I className="h-3 w-3" />{v > 0 ? '+' : ''}{v.toLocaleString('pt-BR')}%</span>;
}

function Painel({ titulo, sub, acao, children, className }) {
  return (
    <div className={cn('bg-slate-800/50 border border-slate-700 rounded-xl', className)}>
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-3">
        <div><h3 className="text-white font-semibold">{titulo}</h3>{sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}</div>
        {acao}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

function Kpi({ label, valor, sub, icone: I, cor = '#22c55e' }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{label}</p>
        <span className="p-1.5 rounded-lg" style={{ background: `${cor}22` }}><I className="h-4 w-4" style={{ color: cor }} /></span>
      </div>
      <p className="text-2xl font-bold text-white mt-1 truncate">{valor}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function baixarCSV(nome, colunas, linhas) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [colunas.map((c) => esc(c[1])).join(';'), ...linhas.map((l) => colunas.map((c) => esc(typeof c[0] === 'function' ? c[0](l) : l[c[0]])).join(';'))].join('\n');
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function ProducaoFuncionarioPage() {
  const { obras = [], escopoObra, obraIdsEscopo } = useObras();
  const { pecas = [] } = useProducao();
  const { funcionarios = [] } = useEquipes();
  const rotas = useRotasProducao();

  const [historico, setHistorico] = useState([]);
  const [cortes, setCortes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [atualizadoEm, setAtualizadoEm] = useState(null);
  const [periodo, setPeriodo] = useState('30d');
  const [custom, setCustom] = useState({ ini: '', fim: '' });
  const [aba, setAba] = useState('desempenho');
  const [filtroSetor, setFiltroSetor] = useState('todos');
  const [busca, setBusca] = useState('');
  const [mostrarZerados, setMostrarZerados] = useState(false);
  const [pessoaSel, setPessoaSel] = useState('');
  const [gran, setGran] = useState('dia');

  const carregar = useCallback(async (forcar) => {
    setCarregando(true);
    try {
      const [h, c] = await Promise.all([buscarHistorico({ forcar }), buscarCortes()]);
      setHistorico(h); setCortes(c); setErro(null); setAtualizadoEm(new Date());
    }
    catch (e) { setErro(e?.message || 'Falha ao carregar o histórico de produção'); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { carregar(false); }, [carregar]);

  const hoje = useMemo(() => new Date(), [atualizadoEm]);
  const obraIds = obraIdsEscopo || null;
  const nomeObra = useCallback((id) => obras.find((o) => o.id === id)?.nome || id || '—', [obras]);

  // Base: histórico normalizado → eventos da fábrica no escopo
  // Corte entra como etapa à parte (kg de material), com coluna própria
  const base = useMemo(() => {
    const { transicoes, diag, naoAplica } = normalizarHistorico(historico, pecas);
    const esc = obraIds ? transicoes.filter((t) => obraIds.includes(t.obraId)) : transicoes;
    const corte = eventosCorte(noEscopo(cortes, obraIds), historico);
    // Rotas por família: solda de família "sem solda" (terça) não é produção
    const foraDaRota = (p, etapa) => etapa === 'solda' && rotas.cfg.semSolda.has(familiaDe(p.tipo));
    const coerencia = coerenciaProducao({ pecas: noEscopo(pecas, obraIds), transicoes: esc, corte, naoAplica, foraDaRota });
    const { eventos: evFab, removidos } = aplicarRotas(eventosProducao(esc, []), rotas.cfg);
    // Ritmo observado (todas as obras) — só comparação com o modelo de horas-padrão
    const calib = calibrarRitmos(aplicarRotas(eventosProducao(transicoes, []), rotas.cfg).eventos, funcionarios, { minDias: rotas.cfg.minDias });
    return { eventos: [...evFab, ...corte.eventos], diag, corte, coerencia, removidos, calib };
  }, [historico, pecas, cortes, obraIds, rotas.cfg, funcionarios]);

  const per = useMemo(() => intervaloPeriodo(periodo, { hoje, ...custom }), [periodo, custom, hoje]);
  const desempenho = useMemo(
    () => desempenhoPessoas(base.eventos, funcionarios, { ini: per.ini, fim: per.fim, iniAnt: per.iniAnt, fimAnt: per.fimAnt, hoje, cfg: rotas.cfg }),
    [base, funcionarios, per, hoje, rotas.cfg],
  );
  const familias = useMemo(() => resumoFamilias(base.eventos, { ini: per.ini, fim: per.fim }), [base.eventos, per]);
  const pessoas = useMemo(
    () => resumoPessoas(base.eventos, funcionarios, { ini: per.ini, fim: per.fim, iniAnt: per.iniAnt, fimAnt: per.fimAnt, hoje }),
    [base.eventos, funcionarios, per, hoje],
  );
  const produtivas = pessoas.filter((p) => p.total > 0 || p.corte > 0);
  const corteKg = produtivas.reduce((s, p) => s + p.corte, 0);
  const corteSemPessoaPer = base.corte.eventos.filter((e) => e.data && e.data >= per.ini && e.data <= per.fim && !e.funcionarioId && !e.funcionario).reduce((s, e) => s + e.kg, 0);
  const totalKg = produtivas.reduce((s, p) => s + p.total, 0);
  const pessoaDias = produtivas.reduce((s, p) => s + p.diasTrabalhados, 0);
  const presencaMedia = produtivas.length ? produtivas.reduce((s, p) => s + p.presencaPct, 0) / produtivas.length : 0;

  const lista = useMemo(() => {
    let l = mostrarZerados ? pessoas : produtivas;
    if (filtroSetor !== 'todos') l = l.filter((p) => p[filtroSetor] > 0).sort((a, b) => b[filtroSetor] - a[filtroSetor]);
    else l = l.filter((p) => mostrarZerados || p.total > 0 || p.corte > 0);
    if (busca) { const q = busca.toLowerCase(); l = l.filter((p) => p.nome.toLowerCase().includes(q) || p.cargo.toLowerCase().includes(q)); }
    return l;
  }, [pessoas, produtivas, mostrarZerados, filtroSetor, busca]);

  const top12 = useMemo(() => produtivas.slice(0, 12).map((p) => ({ ...p, curto: nomeCurto(p.nome) })).reverse(), [produtivas]);
  const equipes = useMemo(() => resumoEquipes(pessoas), [pessoas]);
  const calor = useMemo(() => {
    const ini = per.dias > 31 ? somaDias(per.fim, -30) : per.ini;
    return mapaCalor(base.eventos, funcionarios, { ini, fim: per.fim });
  }, [base.eventos, funcionarios, per]);
  const qualidade = useMemo(() => qualidadeCadastro(funcionarios, base.eventos, { hoje, dias: 30 }), [funcionarios, base.eventos, hoje]);

  // ===== Pessoa =====
  useEffect(() => { if (!pessoaSel && produtivas[0]) setPessoaSel(produtivas[0].id); }, [produtivas, pessoaSel]);
  const pessoa = pessoas.find((p) => p.id === pessoaSel) || null;
  const evPessoa = useMemo(() => (pessoaSel ? eventosDaPessoa(base.eventos, funcionarios, pessoaSel) : []), [base.eventos, funcionarios, pessoaSel]);
  const evPessoaPer = useMemo(() => evPessoa.filter((e) => e.data >= per.ini && e.data <= per.fim), [evPessoa, per]);
  const granEf = per.dias > 400 && gran === 'dia' ? 'semana' : gran;
  const seriePessoa = useMemo(() => serieTemporal(evPessoa.filter((e) => e.setor !== 'corte'), { ini: per.ini, fim: per.fim, granularidade: granEf }), [evPessoa, per, granEf]);
  const obrasPessoa = useMemo(() => agrupar(evPessoaPer, (e) => e.obraId, { setores: ['fabricacao', 'solda', 'pintura'] }), [evPessoaPer]);
  const tiposPessoa = useMemo(() => agrupar(evPessoaPer, (e) => e.tipo, { setores: ['fabricacao', 'solda', 'pintura'] }), [evPessoaPer]);

  const abrirPessoa = (id) => { setPessoaSel(id); setAba('pessoa'); };
  const rotPeriodo = `${periodo === 'custom' ? 'Personalizado' : PERIODOS.find((p) => p.key === periodo)?.label} · ${dataBR(per.ini)} a ${dataBR(per.fim)}`;

  const exportarRanking = () => baixarCSV(`producao_funcionarios_${isoLocal(per.ini)}_${isoLocal(per.fim)}.csv`, [
    ['nome', 'Funcionário'], ['cargo', 'Cargo'], ['equipe', 'Equipe'], [(p) => ROT[p.setorPrincipal] || '', 'Setor principal'],
    ['fabricacao', 'Fabricação kg'], ['solda', 'Solda kg'], ['pintura', 'Pintura kg'], ['total', 'Total kg'],
    ['participacaoPct', '% do total'], ['variacaoPct', 'Variação % vs anterior'], ['diasTrabalhados', 'Dias com apontamento'],
    ['kgDia', 'kg/dia trabalhado'], ['presencaPct', 'Presença % (dias úteis)'], ['pecas', 'Peças'], [(p) => dataBR(p.ultimo), 'Último apontamento'],
  ], lista);

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Users className="h-7 w-7 text-emerald-500" />Produção por Funcionário</h1>
          <p className="text-slate-400 text-sm mt-1">Quanto cada pessoa concluiu por etapa — kg apontados no Kanban, sem duplicatas.</p>
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

      {erro && <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{erro}</div>}

      {/* Período */}
      {aba !== 'lancamentos' && (
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
          <span className="text-xs text-slate-500 shrink-0">{rotPeriodo}</span>
        </div>
      )}

      {/* KPIs */}
      {aba !== 'lancamentos' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
          <Kpi label="Pessoas produzindo" valor={`${produtivas.length} / ${pessoas.filter((p) => p.ativo && !p.foraDoCadastro).length}`} sub="com apontamento / ativas no cadastro" icone={Users} cor="#22c55e" />
          <Kpi label="Concluído pela equipe" valor={kg(totalKg)} sub="fabricação + solda + pintura" icone={Factory} cor="#3b82f6" />
          <Kpi label="kg por pessoa-dia" valor={kg(pessoaDias ? totalKg / pessoaDias : 0)} sub={`${n0(pessoaDias)} dias-pessoa apontados`} icone={TrendingUp} cor="#f97316" />
          <Kpi label="Maior produção" valor={produtivas[0] ? nomeCurto(produtivas[0].nome) : '—'} sub={produtivas[0] ? `${kg(produtivas[0].total)} · ${pct(produtivas[0].participacaoPct)} do total` : ''} icone={Trophy} cor="#eab308" />
          <Kpi label="Presença média" valor={pct(presencaMedia)} sub="dias com apontamento ÷ dias úteis" icone={Clock} cor="#a855f7" />
          <Kpi label="Corte (material)" valor={kg(corteKg)} sub={corteSemPessoaPer > 0 ? `+ ${kg(corteSemPessoaPer)} sem responsável` : `último corte: ${base.corte.diag.ultimo ? dataBR(base.corte.diag.ultimo) : '—'}`} icone={Scissors} cor="#eab308" />
        </div>
      )}

      <Tabs value={aba} onValueChange={setAba} className="space-y-4">
        <TabsList className="bg-slate-800/60 border border-slate-700 flex flex-wrap h-auto">
          <TabsTrigger value="desempenho"><Scale className="h-4 w-4 mr-1.5" />Desempenho</TabsTrigger>
          <TabsTrigger value="ranking"><Trophy className="h-4 w-4 mr-1.5" />Ranking</TabsTrigger>
          <TabsTrigger value="pessoa"><User className="h-4 w-4 mr-1.5" />Por pessoa</TabsTrigger>
          <TabsTrigger value="equipes"><Grid3X3 className="h-4 w-4 mr-1.5" />Equipes e dia a dia</TabsTrigger>
          <TabsTrigger value="lancamentos"><ClipboardList className="h-4 w-4 mr-1.5" />Lançamentos por obra</TabsTrigger>
          <TabsTrigger value="coerencia"><Scale className="h-4 w-4 mr-1.5" />Coerência</TabsTrigger>
          <TabsTrigger value="dados"><ShieldCheck className="h-4 w-4 mr-1.5" />Qualidade dos dados</TabsTrigger>
        </TabsList>

        {/* ===== RANKING ===== */}
        <TabsContent value="desempenho" className="space-y-4">
          <DesempenhoIndividual pessoas={desempenho} removidos={base.removidos} familias={familias} calib={base.calib}
            cfg={rotas.cfg} cfgBruta={rotas.bruta} onSalvarCfg={rotas.salvar} salvando={rotas.salvando} rotPeriodo={rotPeriodo} />
        </TabsContent>

        <TabsContent value="ranking" className="space-y-4">
          <Painel titulo="Maiores produções do período" sub="kg concluídos por etapa (12 primeiros)">
            <div style={{ height: Math.max(180, top12.length * 30 + 40) }}>
              <ResponsiveContainer>
                <BarChart data={top12} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}t` : v)} />
                  <YAxis type="category" dataKey="curto" width={150} tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                  <Tooltip {...TOOLTIP} formatter={(v, n) => [kg(v), n]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {SETORES_FAB.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.cor} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Painel>

          <Painel titulo="Ranking completo" sub={`${rotPeriodo} · clique numa pessoa para ver o detalhe`}
            acao={<Button size="sm" variant="ghost" className="text-slate-300" onClick={exportarRanking}><Download className="h-4 w-4 mr-1" />CSV</Button>}>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pessoa ou cargo" className="h-8 w-56 pl-8 bg-slate-900 border-slate-700 text-white text-xs" />
              </div>
              <div className="flex rounded-lg border border-slate-700 overflow-hidden">
                {[['todos', 'Todos'], ['corte', 'Corte'], ...SETORES_FAB.map((s) => [s.key, s.label])].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setFiltroSetor(k)} className={cn('px-3 py-1.5 text-xs', filtroSetor === k ? 'bg-slate-600 text-white' : 'text-slate-300 hover:bg-slate-700/50')}>{l}</button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-400 ml-1">
                <input type="checkbox" checked={mostrarZerados} onChange={(e) => setMostrarZerados(e.target.checked)} className="accent-emerald-500" />
                Mostrar ativos sem produção
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-700">
                    {['#', 'Funcionário', 'Fabricação', 'Solda', 'Pintura', 'Total peças', 'Corte (material)', '% do total', 'vs anterior', 'Dias', 'kg/dia', 'Presença', 'Peças', 'Último'].map((h, i) => (
                      <th key={h} className={cn('py-2 px-2 font-medium whitespace-nowrap', i > 1 ? 'text-right' : 'text-left')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.length ? lista.map((p, i) => (
                    <tr key={p.id} onClick={() => abrirPessoa(p.id)} className="border-b border-slate-800 hover:bg-slate-700/30 cursor-pointer">
                      <td className="py-2 px-2 text-slate-500">{i + 1}</td>
                      <td className="py-2 px-2 min-w-[220px]">
                        <div className="flex items-center gap-2.5">
                          <span className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ background: p.setorPrincipal ? COR[p.setorPrincipal] : '#475569' }}>{iniciais(p.nome)}</span>
                          <div className="min-w-0">
                            <p className="text-white truncate">{p.nome}{p.foraDoCadastro && <span className="ml-1.5 text-[10px] text-amber-400">fora do cadastro</span>}</p>
                            <p className="text-xs text-slate-500 truncate">{[p.cargo, p.equipe].filter(Boolean).join(' · ') || '—'}</p>
                          </div>
                        </div>
                      </td>
                      {SETORES_FAB.map((s) => <td key={s.key} className="py-2 px-2 text-right tabular-nums text-slate-300">{p[s.key] ? n0(p[s.key]) : <span className="text-slate-600">—</span>}</td>)}
                      <td className="py-2 px-2 text-right tabular-nums text-white font-semibold">{n0(p.total)}</td>
                      <td className="py-2 px-2 text-right tabular-nums" title="kg de material cortado — não soma no total de peças">{p.corte ? <span className="text-amber-300">{n0(p.corte)}<span className="text-xs text-slate-500"> · {p.cortes}</span></span> : <span className="text-slate-600">—</span>}</td>
                      <td className="py-2 px-2 text-right">
                        <div className="inline-flex items-center gap-2"><div className="w-14 h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, p.participacaoPct * 3)}%` }} /></div><span className="text-xs text-slate-300 tabular-nums w-10">{pct(p.participacaoPct)}</span></div>
                      </td>
                      <td className="py-2 px-2 text-right"><Variacao v={p.variacaoPct} /></td>
                      <td className="py-2 px-2 text-right tabular-nums text-slate-300">{p.diasTrabalhados}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-slate-300">{n0(p.kgDia)}</td>
                      <td className="py-2 px-2 text-right tabular-nums"><span className={p.presencaPct >= 70 ? 'text-emerald-400' : p.presencaPct >= 40 ? 'text-amber-400' : 'text-slate-400'}>{pct(p.presencaPct)}</span></td>
                      <td className="py-2 px-2 text-right tabular-nums text-slate-300">{p.pecas}</td>
                      <td className="py-2 px-2 text-right text-xs text-slate-400 whitespace-nowrap">{p.ultimo ? p.ultimo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}</td>
                    </tr>
                  )) : <tr><td colSpan={14} className="py-8 text-center text-slate-500">{carregando ? 'Carregando…' : 'Nenhum apontamento no período.'}</td></tr>}
                </tbody>
              </table>
            </div>
          </Painel>
        </TabsContent>

        {/* ===== POR PESSOA ===== */}
        <TabsContent value="pessoa" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select value={pessoaSel} onChange={(e) => setPessoaSel(e.target.value)} className="h-9 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm px-3 min-w-[260px]">
              {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.total ? ` — ${kg(p.total)}` : ''}</option>)}
            </select>
            <div className="flex rounded-lg border border-slate-700 overflow-hidden">
              {[['dia', 'Diário'], ['semana', 'Semanal'], ['mes', 'Mensal']].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setGran(k)} className={cn('px-3 py-1.5 text-xs', granEf === k ? 'bg-slate-600 text-white' : 'text-slate-300 hover:bg-slate-700/50')}>{l}</button>
              ))}
            </div>
          </div>
          {pessoa ? (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                <Kpi label="Concluído no período" valor={kg(pessoa.total)} sub={<Variacao v={pessoa.variacaoPct} />} icone={Factory} cor={pessoa.setorPrincipal ? COR[pessoa.setorPrincipal] : '#64748b'} />
                <Kpi label="Setor principal" valor={ROT[pessoa.setorPrincipal] || '—'} sub={[pessoa.cargo, pessoa.equipe].filter(Boolean).join(' · ')} icone={User} cor="#22c55e" />
                <Kpi label="kg por dia trabalhado" valor={kg(pessoa.kgDia)} sub={`${pessoa.diasTrabalhados} dias com apontamento`} icone={TrendingUp} cor="#f97316" />
                <Kpi label="Presença" valor={pct(pessoa.presencaPct)} sub="dias com apontamento ÷ dias úteis" icone={Clock} cor="#a855f7" />
                <Kpi label="Peças concluídas" valor={n0(pessoa.pecas)} sub={`${pessoa.obras} obra(s) · média ${kg(pessoa.kgPeca)}/peça`} icone={Trophy} cor="#eab308" />
              </div>
              <Painel titulo={`Produção ${granEf === 'mes' ? 'mensal' : granEf === 'semana' ? 'semanal' : 'diária'} — ${pessoa.nome}`} sub={rotPeriodo}>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={seriePessoa} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="rotulo" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={14} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} width={48} />
                      <Tooltip {...TOOLTIP} formatter={(v, n) => [kg(v), n]} />
                      {SETORES_FAB.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.cor} />)}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Painel>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Painel titulo="Por obra" sub={rotPeriodo}>
                  <TabelaSimples colunas={[['Obra', (o) => nomeObra(o.chave), 'text-white wrap'], ...SETORES_FAB.map((s) => [s.label, (o) => (o[s.key] ? n0(o[s.key]) : '—'), 'r']), ['Peças', (o) => o.pecas, 'r']]} linhas={obrasPessoa} />
                </Painel>
                <Painel titulo="Por tipo de peça" sub={rotPeriodo}>
                  <TabelaSimples colunas={[['Tipo', (t) => t.chave, 'text-white'], ['Total', (t) => n0(t.total), 'r'], ['Peças', (t) => t.pecas, 'r'], ['kg/peça', (t) => n0(t.pecas ? t.total / t.pecas : 0), 'r']]} linhas={tiposPessoa} />
                </Painel>
              </div>
              <Painel titulo="Apontamentos no período" sub="Mais recentes primeiro">
                <div className="max-h-96 overflow-y-auto">
                  <TabelaSimples colunas={[
                    ['Data', (e) => dataBR(e.data)], ['Peça', (e) => e.marca, 'text-white'], ['Obra', (e) => nomeObra(e.obraId), 'wrap'],
                    ['Etapa', (e) => <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COR[e.setor] }} />{ROT[e.setor]}</span>],
                    ['Qtd', (e) => n0(e.qtd), 'r'], ['Peso', (e) => kg(e.kg), 'r'],
                  ]} linhas={[...evPessoaPer].reverse()} />
                </div>
              </Painel>
            </>
          ) : <p className="text-slate-500 text-sm">Selecione uma pessoa.</p>}
        </TabsContent>

        {/* ===== EQUIPES E DIA A DIA ===== */}
        <TabsContent value="equipes" className="space-y-4">
          <Painel titulo="Por equipe (cadastro)" sub={rotPeriodo}>
            <TabelaSimples colunas={[
              ['Equipe', (e) => e.equipe, 'text-white'], ['Pessoas', (e) => `${e.ativos} / ${e.pessoas}`, 'r'],
              ...SETORES_FAB.map((s) => [s.label, (e) => (e[s.key] ? n0(e[s.key]) : '—'), 'r']),
              ['Total kg', (e) => n0(e.total), 'r text-white font-semibold'], ['kg/pessoa-dia', (e) => n0(e.kgPessoaDia), 'r'],
            ]} linhas={equipes} />
          </Painel>
          <Painel titulo="Mapa diário pessoa × dia (kg)" sub={`${calor.dias.length} dias${per.dias > 31 ? ' (últimos 31 do período)' : ''} · quanto mais forte, mais kg concluídos no dia`}>
            <div className="overflow-x-auto">
              <table className="text-xs border-separate" style={{ borderSpacing: 2 }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-slate-800 text-left text-slate-400 font-medium pr-3 min-w-[170px]">Pessoa</th>
                    {calor.dias.map((d) => {
                      const dt = new Date(`${d}T12:00:00`); const fds = dt.getDay() === 0 || dt.getDay() === 6;
                      return <th key={d} className={cn('font-normal w-8 text-center', fds ? 'text-slate-600' : 'text-slate-400')}>{dt.getDate()}</th>;
                    })}
                    <th className="text-right text-slate-400 font-medium pl-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {calor.linhas.map((l) => (
                    <tr key={l.id}>
                      <td className="sticky left-0 bg-slate-800 text-slate-200 pr-3 truncate max-w-[200px] cursor-pointer hover:text-white" onClick={() => abrirPessoa(l.id)}>{l.nome}</td>
                      {calor.dias.map((d) => {
                        const v = l.dias[d] || 0; const a = v ? 0.15 + 0.85 * (v / calor.max) : 0;
                        return <td key={d} title={v ? `${dataBR(d)} · ${kg(v)}` : dataBR(d)} className="w-8 h-7 rounded text-center text-[10px]" style={{ background: v ? `rgba(34,197,94,${a})` : 'rgba(51,65,85,0.35)', color: a > 0.55 ? '#052e16' : '#cbd5e1' }}>{v >= 1000 ? `${(v / 1000).toFixed(1)}t` : v ? Math.round(v) : ''}</td>;
                      })}
                      <td className="text-right text-white tabular-nums pl-2">{n0(l.total)}</td>
                    </tr>
                  ))}
                  {!calor.linhas.length && <tr><td colSpan={calor.dias.length + 2} className="py-6 text-center text-slate-500">Sem apontamentos no período.</td></tr>}
                </tbody>
              </table>
            </div>
          </Painel>
        </TabsContent>

        {/* ===== COERÊNCIA ===== */}
        <TabsContent value="coerencia" className="space-y-4">
          <CoerenciaProducao coerencia={base.coerencia} corteDiag={base.corte.diag} nomeObra={nomeObra} />
        </TabsContent>

        {/* ===== LANÇAMENTOS ===== */}
        <TabsContent value="lancamentos">
          <LancamentosObraTab refetch={() => carregar(true)} />
        </TabsContent>

        {/* ===== QUALIDADE ===== */}
        <TabsContent value="dados" className="space-y-4">
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
            <Painel titulo="Apontamentos" sub="Histórico de produção (todas as obras), já limpo antes de qualquer número.">
              <TabelaSimples colunas={[['Item', (l) => <span className="inline-flex items-center gap-2">{l.alerta ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}{l.d}</span>], ['Quantidade', (l) => l.v, 'r text-white']]} linhas={[
                { d: 'Registros no histórico', v: n0(base.diag.brutos) },
                { d: 'Duplicatas exatas removidas', v: n0(base.diag.duplicados), alerta: base.diag.duplicados > 0 },
                { d: 'Movimentos acima da quantidade da peça (0 kg)', v: n0(base.diag.excedentes), alerta: base.diag.excedentes > 0 },
                { d: 'Apontamentos sem pessoa (ex.: reversão manual)', v: n0(qualidade.semPessoa) },
                { d: 'Nomes apontados fora do cadastro', v: qualidade.foraDoCadastro.length ? qualidade.foraDoCadastro.join(', ') : 'nenhum', alerta: qualidade.foraDoCadastro.length > 0 },
              ]} />
            </Painel>
            <Painel titulo="Cadastro de funcionários" sub="Pontos que atrapalham o vínculo pessoa × produção.">
              <TabelaSimples colunas={[['Item', (l) => <span className="inline-flex items-center gap-2">{l.alerta ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}{l.d}</span>], ['Detalhe', (l) => l.v, 'text-slate-300 whitespace-normal']]} linhas={[
                { d: 'Nomes com espaços sobrando', v: qualidade.espacos.length ? qualidade.espacos.map((n) => `"${n}"`).join(', ') : 'nenhum', alerta: qualidade.espacos.length > 0 },
                { d: 'Possíveis cadastros duplicados', v: qualidade.duplicados.length ? qualidade.duplicados.map(([a, b]) => `${a} × ${b}`).join('; ') : 'nenhum', alerta: qualidade.duplicados.length > 0 },
                { d: 'Ativos sem apontamento nos últimos 30 dias', v: n0(qualidade.ativosSemApont.length), alerta: false },
              ]} />
              {qualidade.ativosSemApont.length > 0 && (
                <p className="text-xs text-slate-500 mt-3">
                  {qualidade.ativosSemApont.map((p) => p.nome).join(' · ')}
                  <br />Inclui cargos que não apontam no Kanban (administrativo, montagem de campo, alumínio).
                </p>
              )}
            </Painel>
          </div>
          <Painel titulo="Como os números são calculados">
            <ul className="text-sm text-slate-300 space-y-1.5 list-disc pl-5">
              <li><b>Produção da pessoa</b>: kg das peças que ela <b>concluiu</b> em Fabricação, Solda ou Pintura (quem apontou a saída da etapa no Kanban ou na aba Lançamentos), na data do apontamento.</li>
              <li><b>Movimento parcial</b> <code className="text-xs bg-slate-900 px-1 rounded">[QTD:x/y]</code> e conjuntos: contam x unidades × peso unitário. Duplicatas são removidas e uma peça nunca conta mais que a sua quantidade.</li>
              <li><b>Pessoa</b> = id do funcionário gravado no apontamento (não depende da grafia do nome).</li>
              <li><b>Presença</b> = dias com algum apontamento ÷ dias úteis (seg–sex) do período. <b>kg/dia</b> = kg ÷ dias com apontamento.</li>
              <li>Mesmo motor da <b>Análise de Produção</b> e do <b>BI 360</b>: o total por pessoa fecha com o total por setor dessas telas.</li>
            </ul>
          </Painel>
        </TabsContent>
      </Tabs>

      <p className="text-[11px] text-slate-600 text-right">
        {n0(base.eventos.length)} apontamentos no escopo · {obraIds ? `${obraIds.length} obra(s)` : 'todas as obras'}
        {atualizadoEm ? ` · atualizado ${atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
      </p>
    </div>
  );
}

function TabelaSimples({ colunas, linhas, vazio = 'Sem dados no período.' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-slate-400 text-xs border-b border-slate-700">
          {colunas.map(([h, , c]) => <th key={h} className={cn('py-2 px-2 font-medium whitespace-nowrap', /\br\b/.test(c || '') ? 'text-right' : 'text-left')}>{h}</th>)}
        </tr></thead>
        <tbody>
          {linhas.length ? linhas.map((l, i) => (
            <tr key={l.id ?? l.chave ?? l.equipe ?? i} className="border-b border-slate-800">
              {colunas.map(([h, f, c]) => <td key={h} className={cn('py-2 px-2', /\bwrap\b/.test(c || '') ? 'whitespace-normal min-w-[180px]' : 'whitespace-nowrap', /\br\b/.test(c || '') ? 'text-right tabular-nums' : '', (c || '').replace(/\b(r|wrap)\b/g, ''))}>{f(l)}</td>)}
            </tr>
          )) : <tr><td colSpan={colunas.length} className="py-6 text-center text-slate-500">{vazio}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
