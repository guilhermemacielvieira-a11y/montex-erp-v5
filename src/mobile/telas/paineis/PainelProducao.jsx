// ============================================================
// PAINEL DE PRODUÇÃO (diretoria) — rota /m/painel/producao
// ============================================================
// Escopo = seletor de obra do app (Geral ou uma obra). Período: 7/30/90
// dias, mês ou ano, comparado com o período anterior de mesma duração.
// Motor: histórico NORMALIZADO (regra 1e) + rotas por família (terça sem
// solda), igual à Análise de Produção do desktop:
//   produção do setor = kg que CONCLUÍRAM a etapa; Pintura = peça pronta;
//   Embarque = romaneios pela data de saída.
// Interações: toque no setor isola a série; legenda liga/desliga séries;
// toque numa obra filtra o painel inteiro por ela.
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts';
import { Factory, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useBIData } from '@/hooks/useBIData';
import { useRotasProducao } from '@/hooks/useRotasProducao';
import { useExpedicao, useProducao } from '@/contexts/ERPContext';
import { noEscopo } from '@/services/bi/biCore';
import {
  SETORES, eventosProducao, intervaloPeriodo, resumoSetores, serieTemporal, agrupar,
  produtividadePessoas, perfilDiaSemana, progressoObras,
} from '@/services/bi/biAnaliseProducao';
import { aplicarRotas } from '@/services/bi/biDesempenho';
import { granularidadeAuto, kpisSetores } from '@/services/bi/painelDiretoria';
import { useObraFiltro } from '../../ObraContext';
import ObraSelector from '../../components/ObraSelector';
import { Tela, Abas, Erro, Esqueleto, Vazio, Etiqueta } from '../../kit';
import { tap } from '../../ui/haptics';
import { cn } from '@/lib/utils';
import {
  COR, EIXO, GRADE, Cartao, Variacao, LegendaSeries, Dica, Mini, BarraRanking, kgCurto, tEixo,
} from './graficos';

const PERIODOS = [
  { id: '7d', rotulo: '7 dias' },
  { id: '30d', rotulo: '30 dias' },
  { id: '90d', rotulo: '90 dias' },
  { id: 'mes', rotulo: 'Mês atual' },
  { id: 'ano', rotulo: 'Ano' },
];
const ROTULO_SETOR = { fabricacao: 'Fabricação', solda: 'Solda', pintura: 'Peças prontas', expedicao: 'Embarque' };
const SERIES = SETORES.map((s) => ({ key: s.key, rotulo: ROTULO_SETOR[s.key], cor: COR[s.key] }));
const ROTULO_ETAPA = { aguardando: 'Corte / aguardando', fabricacao: 'Fabricação', solda: 'Solda', pintura: 'Pintura', expedido: 'Fila de embarque', enviado: 'Em obra' };
const dataBR = (d) => (d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—');

export default function PainelProducao() {
  const dados = useBIData();
  const { expedicoes = [] } = useExpedicao() || {};
  const { pecas = [] } = useProducao() || {};
  const rotas = useRotasProducao();
  const { isTodas, obraSelecionada, setObraFiltro } = useObraFiltro();

  const [periodo, setPeriodo] = useState('30d');
  // Embarque chega em cargas (picos) e achata a escala: começa desligado.
  const [ativas, setAtivas] = useState(['fabricacao', 'solda', 'pintura']);
  const [ordemPessoas, setOrdemPessoas] = useState('total');
  const [verTodasObras, setVerTodasObras] = useState(false);

  const obraIds = dados.obraIds;
  const hoje = dados.hoje;

  const base = useMemo(() => {
    const todas = dados.bruto?.transicoes || [];
    const transicoes = obraIds ? todas.filter((t) => obraIds.includes(t.obraId)) : todas;
    const exps = noEscopo(expedicoes, obraIds);
    const { eventos } = aplicarRotas(eventosProducao(transicoes, exps), rotas.cfg);
    return { eventos, pecasEsc: noEscopo(pecas, obraIds) };
  }, [dados.bruto, obraIds, expedicoes, pecas, rotas.cfg]);

  const per = useMemo(() => intervaloPeriodo(periodo, { hoje }), [periodo, hoje]);
  const gran = granularidadeAuto(per.dias);
  const kpis = useMemo(() => kpisSetores(
    resumoSetores(base.eventos, { ini: per.ini, fim: per.fim, hoje }),
    resumoSetores(base.eventos, { ini: per.iniAnt, fim: per.fimAnt, hoje }),
  ), [base.eventos, per, hoje]);
  const serie = useMemo(() => serieTemporal(base.eventos, { ini: per.ini, fim: per.fim, granularidade: gran }), [base.eventos, per, gran]);
  const evPeriodo = useMemo(() => base.eventos.filter((e) => e.data >= per.ini && e.data <= per.fim), [base.eventos, per]);
  const familias = useMemo(() => agrupar(evPeriodo, (e) => e.tipo, { setores: ['fabricacao', 'solda', 'pintura'] }).slice(0, 8), [evPeriodo]);
  const pessoas = useMemo(() => {
    const l = produtividadePessoas(evPeriodo);
    return [...l].sort((a, b) => (ordemPessoas === 'dia' ? b.kgDia - a.kgDia : b.total - a.total)).slice(0, 8);
  }, [evPeriodo, ordemPessoas]);
  const semana = useMemo(() => perfilDiaSemana(base.eventos, { ini: per.ini, fim: per.fim }).filter((d) => d.dia !== 'Dom'), [base.eventos, per]);
  const obras = useMemo(() => (isTodas
    ? progressoObras({ obras: dados.bruto?.obras || [], pecas: base.pecasEsc, eventos: base.eventos, hoje })
    : []), [isTodas, dados.bruto, base, hoje]);

  const pronto = kpis.find((k) => k.setor === 'pintura');
  const embarque = kpis.find((k) => k.setor === 'expedicao');
  const { ritmo = [], tendencia = {}, wip, gargalo, leadTimes = [] } = dados.producao || {};
  const mediaRitmo = ritmo.length ? ritmo.reduce((s, r) => s + r.pintura, 0) / ritmo.length : 0;
  const wipFabrica = (wip?.resumo || []).filter((r) => ['aguardando', 'fabricacao', 'solda', 'pintura', 'expedido'].includes(r.etapa));
  const maxWip = Math.max(1, ...wipFabrica.map((r) => r.kg));
  const linhaGargalo = gargalo?.etapa ? gargalo.linhas?.find((l) => l.etapa === gargalo.etapa) : null;

  const alternar = (k) => {
    tap('light');
    setAtivas((a) => (a.includes(k) ? (a.length > 1 ? a.filter((x) => x !== k) : a) : [...a, k]));
  };
  const isolar = (k) => {
    tap('light');
    setAtivas((a) => (a.length === 1 && a[0] === k ? SERIES.map((s) => s.key) : [k]));
  };
  const filtrarObra = (id) => { tap('medium'); setObraFiltro(id); };

  const carregando = dados.carregando && !dados.atualizadoEm;
  const nomePeriodo = PERIODOS.find((p) => p.id === periodo)?.rotulo.toLowerCase();
  const subtitulo = isTodas ? 'Geral · todas as obras' : (obraSelecionada?.nome || 'Obra');

  // Leitura do gráfico principal (uma frase)
  const leituraSerie = (() => {
    if (!pronto) return null;
    const melhor = pronto.melhorDia ? ` · melhor dia ${pronto.melhorDia.data.split('-').reverse().slice(0, 2).join('/')} (${kgCurto(pronto.melhorDia.kg)})` : '';
    return `${kgCurto(pronto.mediaDiaUtil)} de peças prontas por dia útil${melhor}`;
  })();

  return (
    <Tela
      titulo="Painel de produção"
      subtitulo={subtitulo}
      voltar="/m"
      onRefresh={() => dados.recarregar()}
      cabecalhoExtra={(
        <>
          <ObraSelector />
          <Abas itens={PERIODOS} valor={periodo} onChange={(v) => { tap('light'); setPeriodo(v); }} className="pt-2" />
        </>
      )}
    >
      {dados.erro && <Erro texto="Não foi possível carregar o histórico de produção." onTentar={() => dados.recarregar()} />}
      {carregando ? <div className="pt-4"><Esqueleto metricas={4} linhas={4} /></div> : (
        <>
          {!isTodas && (
            <button type="button" onClick={() => filtrarObra('todas')} className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-mx-tealhi">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar ao Geral
            </button>
          )}

          {/* ---------- Destaque: peças prontas ---------- */}
          <section className="mt-4 overflow-hidden rounded-[18px] border border-mx-line/60 bg-mx-s1">
            <div className="p-4 pb-1">
              <p className="text-[13px] text-mx-text2">Peças prontas · {nomePeriodo}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="mx-num text-[38px] leading-none text-mx-text">{kgCurto(pronto?.kg)}</span>
              </div>
              <div className="mt-1.5"><Variacao valor={pronto?.variacao} /></div>
              <div className="mt-3 grid grid-cols-3 gap-3 border-t border-mx-line/60 pt-3 text-[12px]">
                <div><div className="text-mx-text3">Por dia útil</div><div className="mx-tab text-[15px] font-semibold text-mx-text">{kgCurto(pronto?.mediaDiaUtil)}</div></div>
                <div><div className="text-mx-text3">Peças</div><div className="mx-tab text-[15px] font-semibold text-mx-text">{(pronto?.pecas || 0).toLocaleString('pt-BR')}</div></div>
                <div><div className="text-mx-text3">Embarcado</div><div className="mx-tab text-[15px] font-semibold text-mx-text">{kgCurto(embarque?.kg)}</div></div>
              </div>
            </div>
            <Mini dados={serie} chave="pintura" cor={COR.pintura} altura={52} />
          </section>

          {/* ---------- Setores (toque isola no gráfico) ---------- */}
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {kpis.map((k) => {
              const so = ativas.length === 1 && ativas[0] === k.setor;
              return (
                <button
                  key={k.setor}
                  type="button"
                  onClick={() => isolar(k.setor)}
                  aria-pressed={so}
                  className={cn('rounded-[14px] border bg-mx-s1 p-3 text-left transition-colors active:bg-mx-s2', so ? 'border-mx-tealhi' : 'border-mx-line/60')}
                >
                  <div className="flex items-center gap-1.5 text-[13px] text-mx-text2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COR[k.setor] }} aria-hidden />
                    {ROTULO_SETOR[k.setor]}
                  </div>
                  <div className="mx-num mt-1 text-[21px] leading-tight text-mx-text">{kgCurto(k.kg)}</div>
                  <div className="mt-0.5"><Variacao valor={k.variacao} compacto /></div>
                </button>
              );
            })}
          </div>

          {/* ---------- Série temporal ---------- */}
          <Cartao
            titulo={`Produção por ${gran === 'dia' ? 'dia' : gran === 'semana' ? 'semana' : 'mês'}`}
            leitura={leituraSerie}
          >
            <LegendaSeries series={SERIES} ativas={ativas} onAlternar={alternar} />
            <div className="mt-2 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serie} margin={{ top: 8, right: 6, left: -14, bottom: 0 }}>
                  <CartesianGrid {...GRADE} />
                  <XAxis dataKey="rotulo" {...EIXO} interval="preserveStartEnd" minTickGap={22} />
                  <YAxis {...EIXO} tickFormatter={tEixo} width={44} />
                  <Tooltip
                    cursor={{ stroke: COR.eixo, strokeDasharray: '3 3' }}
                    content={<Dica formatar={(v) => kgCurto(v)} />}
                  />
                  {SERIES.filter((s) => ativas.includes(s.key)).map((s) => (
                    <Line key={s.key} type="linear" dataKey={s.key} name={s.rotulo} stroke={s.cor} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: COR.superficie, strokeWidth: 2 }} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Cartao>

          {/* ---------- Fluxo agora ---------- */}
          <Cartao
            titulo="Fluxo agora"
            leitura={linhaGargalo
              ? `Gargalo em ${ROTULO_ETAPA[gargalo.etapa]}: ${linhaGargalo.travada ? 'sem saída nas últimas semanas' : `${String(linhaGargalo.semanasFila).replace('.', ',')} semanas de fila`}`
              : 'Material parado em cada etapa (fotografia de hoje)'}
          >
            {linhaGargalo && (
              <div className="mb-2 flex items-start gap-2 rounded-xl border border-mx-warn/30 bg-mx-warn/10 p-2.5 text-[13px] text-mx-text">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-mx-warn" aria-hidden />
                <span>{kgCurto(linhaGargalo.wipKg)} em {ROTULO_ETAPA[gargalo.etapa].toLowerCase()} · saída de {kgCurto(linhaGargalo.saidaKgSemana)}/semana.</span>
              </div>
            )}
            {wipFabrica.map((r) => {
              const lt = leadTimes.find((l) => l.etapa === r.etapa);
              const sub = [
                `${r.pecas.toLocaleString('pt-BR')} peças`,
                r.idadeMedianaDias != null ? `paradas há ${String(r.idadeMedianaDias).replace('.', ',')} dias (mediana)` : null,
                lt?.medianaDias != null ? `passagem típica ${String(lt.medianaDias).replace('.', ',')} d` : null,
              ].filter(Boolean).join(' · ');
              return (
                <BarraRanking
                  key={r.etapa}
                  rotulo={ROTULO_ETAPA[r.etapa]}
                  sub={sub}
                  valor={r.kg}
                  texto={kgCurto(r.kg)}
                  max={maxWip}
                  cor={r.etapa === gargalo?.etapa ? '#E0A33A' : COR.destaque}
                />
              );
            })}
          </Cartao>

          {/* ---------- Ritmo 12 semanas ---------- */}
          <Cartao
            titulo="Ritmo de peças prontas · 12 semanas"
            leitura={tendencia.variacaoPct != null
              ? `Últimas 4 semanas: ${kgCurto(tendencia.kgSemanaAtual)}/semana (${tendencia.variacaoPct > 0 ? '+' : ''}${String(tendencia.variacaoPct).replace('.', ',')}% vs 4 anteriores)`
              : `${kgCurto(tendencia.kgSemanaAtual)}/semana nas últimas 4 semanas`}
          >
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ritmo} margin={{ top: 8, right: 6, left: -14, bottom: 0 }}>
                  <CartesianGrid {...GRADE} />
                  <XAxis dataKey="semana" {...EIXO} tickFormatter={(k) => String(k).slice(5).split('-').reverse().join('/')} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis {...EIXO} tickFormatter={tEixo} width={44} />
                  <Tooltip cursor={{ fill: '#ffffff08' }} content={<Dica formatar={(v) => kgCurto(v)} titulo={(k) => `Semana de ${String(k).slice(5).split('-').reverse().join('/')}`} />} />
                  <ReferenceLine y={mediaRitmo} stroke={COR.eixo} strokeDasharray="4 4" label={{ value: 'média', position: 'insideTopRight', fill: COR.eixo, fontSize: 10 }} />
                  <Bar dataKey="pintura" name="Peças prontas" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {ritmo.map((r, i) => <Cell key={r.semana} fill={COR.pintura} fillOpacity={i === ritmo.length - 1 ? 0.55 : 1} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-[12px] text-mx-text3">A última barra é a semana em andamento.</p>
          </Cartao>

          {/* ---------- Obras (só no Geral) ---------- */}
          {isTodas && obras.length > 0 && (
            <Cartao
              titulo="Avanço por obra"
              leitura="Peso pronto sobre o total da obra. Toque para ver o painel só dela."
            >
              {(verTodasObras ? obras : obras.slice(0, 6)).map((o) => (
                <BarraRanking
                  key={o.id}
                  rotulo={o.nome}
                  sub={[
                    `${kgCurto(o.pronto)} de ${kgCurto(o.pesoTotal)}`,
                    o.ritmoKgSemana > 0 ? `${kgCurto(o.ritmoKgSemana)}/sem` : 'sem ritmo recente',
                    o.previsaoTermino ? `término ~${dataBR(o.previsaoTermino)}` : null,
                  ].filter(Boolean).join(' · ')}
                  valor={o.pctPronto}
                  texto={`${String(o.pctPronto).replace('.', ',')}%`}
                  max={100}
                  cor={COR.destaque}
                  onClick={() => filtrarObra(o.id)}
                />
              ))}
              {obras.length > 6 && (
                <button type="button" onClick={() => setVerTodasObras((v) => !v)} className="mt-1 text-[13px] font-medium text-mx-tealhi">
                  {verTodasObras ? 'Mostrar menos' : `Ver todas (${obras.length})`}
                </button>
              )}
            </Cartao>
          )}

          {/* ---------- Famílias ---------- */}
          <Cartao titulo="Por família de peça" leitura={`Fabricação + solda + pintura concluídas · ${nomePeriodo}`}>
            {familias.length === 0 ? <Vazio icone={Factory} titulo="Sem produção no período" /> : familias.map((f) => (
              <BarraRanking
                key={f.chave}
                rotulo={f.chave}
                sub={`${f.pecas.toLocaleString('pt-BR')} peças · fab ${kgCurto(f.fabricacao)} · solda ${kgCurto(f.solda)} · pintura ${kgCurto(f.pintura)}`}
                valor={f.total}
                texto={kgCurto(f.total)}
                max={familias[0]?.total || 1}
                cor={COR.destaque}
              />
            ))}
          </Cartao>

          {/* ---------- Equipe ---------- */}
          <Cartao
            titulo="Equipe"
            leitura="Quem mais concluiu etapas no período (apontamentos)"
            acao={(
              <div className="flex shrink-0 rounded-lg border border-mx-line p-0.5 text-[12px]" role="group" aria-label="Ordenar equipe">
                {[['total', 'kg'], ['dia', 'kg/dia']].map(([id, r]) => (
                  <button key={id} type="button" aria-pressed={ordemPessoas === id} onClick={() => setOrdemPessoas(id)}
                    className={cn('rounded-md px-2 py-1', ordemPessoas === id ? 'bg-mx-s3 text-mx-text' : 'text-mx-text3')}>{r}</button>
                ))}
              </div>
            )}
          >
            {pessoas.length === 0 ? <Vazio icone={Factory} titulo="Sem apontamentos no período" /> : pessoas.map((p) => (
              <BarraRanking
                key={p.chave}
                rotulo={p.chave}
                sub={`${ROTULO_SETOR[p.setorPrincipal] || p.setorPrincipal} · ${p.dias} dia(s) · ${kgCurto(p.kgDia)}/dia`}
                valor={ordemPessoas === 'dia' ? p.kgDia : p.total}
                texto={ordemPessoas === 'dia' ? `${kgCurto(p.kgDia)}/dia` : kgCurto(p.total)}
                max={ordemPessoas === 'dia' ? (pessoas[0]?.kgDia || 1) : (pessoas[0]?.total || 1)}
                cor={COR[p.setorPrincipal] || COR.destaque}
              />
            ))}
            <p className="mt-2 text-[12px] text-mx-text3">Volume não mede desempenho sozinho: a régua de horas-padrão fica na tela Produção por funcionário, no computador.</p>
          </Cartao>

          {/* ---------- Dia da semana ---------- */}
          <Cartao titulo="Média por dia da semana" leitura="Quanto cada setor conclui, em média, em cada dia">
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={semana} margin={{ top: 8, right: 6, left: -14, bottom: 0 }}>
                  <CartesianGrid {...GRADE} />
                  <XAxis dataKey="dia" {...EIXO} />
                  <YAxis {...EIXO} tickFormatter={tEixo} width={44} />
                  <Tooltip cursor={{ fill: '#ffffff08' }} content={<Dica formatar={(v) => kgCurto(v)} />} />
                  {['fabricacao', 'solda', 'pintura'].filter((k) => ativas.includes(k)).map((k, i, arr) => (
                    <Bar key={k} dataKey={k} name={ROTULO_SETOR[k]} stackId="d" fill={COR[k]} stroke={COR.superficie} strokeWidth={2}
                      radius={i === arr.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-[12px] text-mx-text2">
              {['fabricacao', 'solda', 'pintura'].filter((k) => ativas.includes(k)).map((k) => (
                <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COR[k] }} aria-hidden />{ROTULO_SETOR[k]}</span>
              ))}
            </div>
          </Cartao>

          <div className="mt-5 flex flex-wrap items-center gap-2 px-1 text-[12px] text-mx-text3">
            <Etiqueta tom="neutro">Histórico normalizado</Etiqueta>
            <span>Produção do setor = kg que concluíram a etapa. Terça não conta na solda.</span>
          </div>
        </>
      )}
    </Tela>
  );
}
