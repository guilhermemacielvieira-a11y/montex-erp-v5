// ============================================================
// PAINEL FINANCEIRO (diretoria) — rota /m/painel/financeiro
// ============================================================
// Caixa e resultado da EMPRESA (regra 1b): mesma base do Painel Financeiro
// Global (useFinanceiroGlobal + futuroDe). Material/despesa lançado na obra
// (GFO) não entra; resultado por obra fica na GFO. Atrasos (aging) e curva
// de fornecedores vêm do motor do BI no escopo empresa.
// Interações: período 3/6/12 meses; toque numa barra mostra o mês;
// legenda liga/desliga receitas e despesas.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts';
import { Wallet, AlertTriangle } from 'lucide-react';
import { useFinanceiroGlobal } from '@/hooks/useFinanceiroGlobal';
import { useBIData } from '@/hooks/useBIData';
import { useCustoKg } from '@/hooks/useCustoKg';
import { futuroDe } from '../../usePainelGlobal';
import { periodoFinanceiro, despesasPor, topComOutros, chavesMeses } from '@/services/bi/painelDiretoria';
import { Tela, Abas, Grade, Metrica, Vazio, Esqueleto, Etiqueta } from '../../kit';
import { tap } from '../../ui/haptics';
import { brl2 } from '../../kit/fmt';
import { cn } from '@/lib/utils';
import { useEstadoERP } from '../financeiro/comum';
import {
  COR, EIXO, GRADE, Cartao, Variacao, LegendaSeries, Dica, Mini, BarraRanking, brlCurto, brlEixo,
} from './graficos';

const PERIODOS = [
  { id: 3, rotulo: '3 meses' },
  { id: 6, rotulo: '6 meses' },
  { id: 12, rotulo: '12 meses' },
];
const SERIES = [
  { key: 'receitas', rotulo: 'Receitas', cor: COR.receita },
  { key: 'despesas', rotulo: 'Despesas', cor: COR.despesa },
];
const pctTxt = (v) => (v == null || !Number.isFinite(v) ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);

export default function PainelFinanceiro() {
  const { carregando: carregandoERP } = useEstadoERP();
  const fin = useFinanceiroGlobal();
  const bi = useBIData({ empresa: true });
  const { analise: custo } = useCustoKg(bi);

  const [meses, setMeses] = useState(6);
  const [ativas, setAtivas] = useState(SERIES.map((s) => s.key));
  const [verFornecedores, setVerFornecedores] = useState(false);

  const per = useMemo(() => periodoFinanceiro(fin.evolucaoMensal || [], { meses }), [fin.evolucaoMensal, meses]);
  const desde = useMemo(() => chavesMeses(meses)[0], [meses]);
  const categorias = useMemo(() => topComOutros(despesasPor(fin.todasMovs || [], 'categoria', { desde }), 7), [fin.todasMovs, desde]);
  const fornecedores = useMemo(() => despesasPor(fin.todasMovs || [], 'fornecedor', { desde }), [fin.todasMovs, desde]);
  const saldoMinimo = Number(fin.metas?.saldoMinimo) || 50000;
  const futuro = useMemo(() => futuroDe(fin.todasMovs || [], saldoMinimo), [fin.todasMovs, saldoMinimo]);
  const aging = bi.financeiro?.aging;

  const { atual, variacao } = per;
  const positivo = atual.resultado >= 0;
  const alternar = (k) => {
    tap('light');
    setAtivas((a) => (a.includes(k) ? (a.length > 1 ? a.filter((x) => x !== k) : a) : [...a, k]));
  };

  const carregando = carregandoERP && !(fin.todasMovs || []).length;
  const leituraMeses = (() => {
    const s = per.serie;
    if (!s.length) return null;
    const melhor = s.reduce((m, x) => (x.resultado > m.resultado ? x : m), s[0]);
    const negativos = s.filter((x) => x.resultado < 0).length;
    return `Melhor mês: ${melhor.rotulo} (${brlCurto(melhor.resultado)})${negativos ? ` · ${negativos} ${negativos === 1 ? 'mês' : 'meses'} no vermelho` : ''}`;
  })();
  const semanasRisco = futuro.semanasCriticas || 0;

  return (
    <Tela
      titulo="Painel financeiro"
      subtitulo="Caixa e resultado da empresa"
      voltar="/m"
      onRefresh={() => bi.recarregar()}
      cabecalhoExtra={<Abas itens={PERIODOS} valor={meses} onChange={(v) => { tap('light'); setMeses(v); }} className="pt-1" />}
    >
      {carregando ? <div className="pt-4"><Esqueleto metricas={4} linhas={4} /></div> : (
        <>
          {/* ---------- Destaque: resultado ---------- */}
          <section className="mt-4 overflow-hidden rounded-[18px] border border-mx-line/60 bg-mx-s1">
            <div className="p-4 pb-1">
              <p className="text-[13px] text-mx-text2">Resultado · últimos {meses} meses</p>
              <div className={cn('mx-num mt-1 text-[36px] leading-none', positivo ? 'text-mx-text' : 'text-mx-bad')}>{brlCurto(atual.resultado)}</div>
              <div className="mt-1.5"><Variacao valor={variacao.resultado} /></div>
              <div className="mt-3 grid grid-cols-3 gap-3 border-t border-mx-line/60 pt-3 text-[12px]">
                <div><div className="text-mx-text3">Receitas</div><div className="mx-tab text-[15px] font-semibold text-mx-text">{brlCurto(atual.receitas)}</div><Variacao valor={variacao.receitas} compacto /></div>
                <div><div className="text-mx-text3">Despesas</div><div className="mx-tab text-[15px] font-semibold text-mx-text">{brlCurto(atual.despesas)}</div><Variacao valor={variacao.despesas} inverso compacto /></div>
                <div><div className="text-mx-text3">Margem</div><div className="mx-tab text-[15px] font-semibold text-mx-text">{pctTxt(atual.margem)}</div></div>
              </div>
            </div>
            <Mini dados={per.serie} chave="resultado" cor={positivo ? COR.receita : COR.despesa} altura={52} />
          </section>

          {/* ---------- Próximos 30 dias + atrasos ---------- */}
          <Grade className="mt-3">
            <Metrica rotulo="A receber · 30 dias" valor={brlCurto(futuro.receber30)} sub={`90 dias: ${brlCurto(futuro.receber90)}`} to="/m/financeiro?aba=receber" />
            <Metrica rotulo="A pagar · 30 dias" valor={brlCurto(futuro.pagar30)} sub={`90 dias: ${brlCurto(futuro.pagar90)}`} tom={futuro.pagar30 > futuro.receber30 ? 'warn' : undefined} to="/m/financeiro?aba=pagar" />
            <Metrica rotulo="Recebível vencido" valor={brlCurto(aging?.receberVencido)} sub="cobrar" tom={aging?.receberVencido > 0 ? 'warn' : undefined} to="/m/financeiro?aba=receber" />
            <Metrica rotulo="Contas vencidas" valor={brlCurto(aging?.pagarVencido)} sub="pagar" tom={aging?.pagarVencido > 0 ? 'bad' : undefined} to="/m/financeiro?aba=pagar" />
          </Grade>

          {/* ---------- Receitas × despesas ---------- */}
          <Cartao titulo="Receitas e despesas por mês" leitura={leituraMeses}>
            <LegendaSeries series={SERIES} ativas={ativas} onAlternar={alternar} />
            <div className="mt-2 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={per.serie} margin={{ top: 8, right: 6, left: -6, bottom: 0 }} barGap={2} barCategoryGap={meses > 6 ? '18%' : '28%'}>
                  <CartesianGrid {...GRADE} />
                  <XAxis dataKey="rotulo" {...EIXO} interval={meses > 6 ? 1 : 0} />
                  <YAxis {...EIXO} tickFormatter={brlEixo} width={48} />
                  <Tooltip
                    cursor={{ fill: '#ffffff08' }}
                    content={<Dica formatar={(v) => brlCurto(v)} extra={(p) => `Resultado: ${brlCurto(p[0]?.payload?.resultado)}`} />}
                  />
                  {SERIES.filter((s) => ativas.includes(s.key)).map((s) => (
                    <Bar key={s.key} dataKey={s.key} name={s.rotulo} fill={s.cor} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Cartao>

          {/* ---------- Resultado mensal ---------- */}
          <Cartao titulo="Resultado mês a mês" leitura="Receitas menos despesas da empresa; abaixo da linha = prejuízo no mês">
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={per.serie} margin={{ top: 8, right: 6, left: -6, bottom: 0 }}>
                  <CartesianGrid {...GRADE} />
                  <XAxis dataKey="rotulo" {...EIXO} interval={meses > 6 ? 1 : 0} />
                  <YAxis {...EIXO} tickFormatter={brlEixo} width={48} />
                  <ReferenceLine y={0} stroke={COR.eixo} />
                  <Tooltip cursor={{ fill: '#ffffff08' }} content={<Dica formatar={(v) => brlCurto(v)} />} />
                  <Bar dataKey="resultado" name="Resultado" isAnimationActive={false}>
                    {per.serie.map((m) => (
                      <Cell key={m.key} fill={m.resultado >= 0 ? COR.receita : COR.despesa} radius={m.resultado >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Cartao>

          {/* ---------- Caixa projetado ---------- */}
          <Cartao
            titulo="Caixa projetado · 13 semanas"
            leitura={semanasRisco
              ? `${semanasRisco} semana(s) abaixo do saldo mínimo de ${brlCurto(saldoMinimo)}`
              : `Saldo acumulado das contas em aberto (a receber − a pagar)`}
          >
            {semanasRisco > 0 && (
              <div className="mb-2 flex items-start gap-2 rounded-xl border border-mx-warn/30 bg-mx-warn/10 p-2.5 text-[13px] text-mx-text">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-mx-warn" aria-hidden />
                <span>Antecipe recebimentos ou renegocie pagamentos dessas semanas.</span>
              </div>
            )}
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={futuro.semanas} margin={{ top: 8, right: 6, left: -6, bottom: 0 }}>
                  <defs>
                    <linearGradient id="caixaProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COR.destaque} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={COR.destaque} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRADE} />
                  <XAxis dataKey="label" {...EIXO} interval={1} />
                  <YAxis {...EIXO} tickFormatter={brlEixo} width={48} />
                  <ReferenceLine y={saldoMinimo} stroke="#E0A33A" strokeDasharray="4 4" label={{ value: 'mínimo', position: 'insideTopRight', fill: '#E0A33A', fontSize: 10 }} />
                  <ReferenceLine y={0} stroke={COR.eixo} />
                  <Tooltip
                    cursor={{ stroke: COR.eixo, strokeDasharray: '3 3' }}
                    content={<Dica
                      titulo={(l) => `Semana ${String(l).replace('S', '')}`}
                      formatar={(v) => brlCurto(v)}
                      extra={(p) => `Entram ${brlCurto(p[0]?.payload?.receitas)} · saem ${brlCurto(p[0]?.payload?.despesas)}`}
                    />}
                  />
                  <Area type="monotone" dataKey="saldoAcumulado" name="Saldo acumulado" stroke={COR.destaque} strokeWidth={2} fill="url(#caixaProj)" isAnimationActive={false} activeDot={{ r: 4, stroke: COR.superficie, strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Cartao>

          {/* ---------- Previsão de recebimentos ---------- */}
          {fin.forecast?.meses?.length > 0 && (
            <Cartao titulo="Recebimentos previstos · 6 meses" leitura={`${brlCurto(fin.forecast.totalForecast)} em ${fin.forecast.qtd} receita(s) ainda não recebida(s)`}>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fin.forecast.meses.map((m) => ({ ...m, mes: String(m.mes).replace('.', '').replace(' de ', '/') }))} margin={{ top: 8, right: 6, left: -6, bottom: 0 }}>
                    <CartesianGrid {...GRADE} />
                    <XAxis dataKey="mes" {...EIXO} />
                    <YAxis {...EIXO} tickFormatter={brlEixo} width={48} />
                    <Tooltip cursor={{ fill: '#ffffff08' }} content={<Dica formatar={(v) => brlCurto(v)} />} />
                    <Bar dataKey="forecast" name="Previsto" fill={COR.receita} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Cartao>
          )}

          {/* ---------- Atrasos ---------- */}
          {aging?.faixas?.length > 0 && (
            <Cartao titulo="Em aberto por atraso" leitura="Quanto está a receber e a pagar em cada faixa de atraso">
              <div className="h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aging.faixas} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }} barGap={2}>
                    <CartesianGrid stroke={COR.grade} strokeDasharray="3 4" horizontal={false} />
                    <XAxis type="number" {...EIXO} tickFormatter={brlEixo} />
                    <YAxis type="category" dataKey="rotulo" {...EIXO} width={84} />
                    <Tooltip cursor={{ fill: '#ffffff08' }} content={<Dica formatar={(v) => brlCurto(v)} />} />
                    <Bar dataKey="receber" name="A receber" fill={COR.receita} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                    <Bar dataKey="pagar" name="A pagar" fill={COR.despesa} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 flex gap-3 text-[12px] text-mx-text2">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COR.receita }} />A receber</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COR.despesa }} />A pagar</span>
              </div>
            </Cartao>
          )}

          {/* ---------- Para onde vai o dinheiro ---------- */}
          <Cartao titulo="Para onde vai o dinheiro" leitura={`Despesas da empresa por categoria · últimos ${meses} meses`}>
            {categorias.length === 0 ? <Vazio icone={Wallet} titulo="Sem despesas no período" /> : categorias.map((c) => (
              <BarraRanking
                key={c.nome}
                rotulo={c.nome}
                valor={c.valor}
                texto={`${brlCurto(c.valor)} · ${pctTxt(c.pct)}`}
                max={categorias[0]?.valor || 1}
                cor={c.outros ? COR.eixo : COR.despesa}
              />
            ))}
          </Cartao>

          {/* ---------- Fornecedores ---------- */}
          <Cartao titulo="Maiores fornecedores" leitura={fornecedores.length ? `Os 5 maiores somam ${pctTxt(fornecedores.slice(0, 5).reduce((s, f) => s + f.pct, 0))} das despesas` : null}>
            {fornecedores.length === 0 ? <Vazio icone={Wallet} titulo="Sem despesas no período" /> : (verFornecedores ? fornecedores.slice(0, 20) : fornecedores.slice(0, 6)).map((f, i) => (
              <BarraRanking
                key={f.nome}
                rotulo={`${i + 1}. ${f.nome}`}
                valor={f.valor}
                texto={`${brlCurto(f.valor)} · ${pctTxt(f.pct)}`}
                max={fornecedores[0]?.valor || 1}
                cor={COR.despesa}
              />
            ))}
            {fornecedores.length > 6 && (
              <button type="button" onClick={() => setVerFornecedores((v) => !v)} className="mt-1 text-[13px] font-medium text-mx-tealhi">
                {verFornecedores ? 'Mostrar menos' : `Ver mais (${Math.min(20, fornecedores.length)})`}
              </button>
            )}
          </Cartao>

          {/* ---------- Custo por kg ---------- */}
          {custo?.custoKg != null && (
            <Cartao titulo="Custo por kg da fábrica" leitura="Custo da empresa ÷ kg que entrou em pintura (critério da diretoria)" acao={<Link to="/m/financeiro?aba=custo" className="shrink-0 text-[13px] font-medium text-mx-tealhi">Detalhar</Link>}>
              <Grade>
                <Metrica
                  rotulo="Custo/kg hoje"
                  valor={brl2(custo.custoKg)}
                  tom={custo.cfg?.precoFabricacaoKg && custo.custoKg > custo.cfg.precoFabricacaoKg ? 'bad' : undefined}
                  sub={custo.cfg?.precoFabricacaoKg ? `preço ${brl2(custo.cfg.precoFabricacaoKg)}` : undefined}
                />
                <Metrica
                  rotulo="Equilíbrio"
                  valor={custo.equilibrio?.t2026 != null ? `${Number(custo.equilibrio.t2026).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} t/mês` : '—'}
                  sub={custo.base?.tMes != null ? `produzindo ${Number(custo.base.tMes).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} t/mês` : undefined}
                  tom={custo.equilibrio?.t2026 != null && custo.base?.tMes < custo.equilibrio.t2026 ? 'bad' : undefined}
                />
              </Grade>
            </Cartao>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2 px-1 text-[12px] text-mx-text3">
            <Etiqueta tom="neutro">Painel Global</Etiqueta>
            <span>Caixa da empresa: despesas lançadas na obra (GFO) ficam fora. Resultado por obra está na GFO.</span>
          </div>
        </>
      )}
    </Tela>
  );
}
