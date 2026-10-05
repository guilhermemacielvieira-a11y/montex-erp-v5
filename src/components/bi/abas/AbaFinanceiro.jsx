// ============================================================
// BI 360 — Aba Financeiro
// ============================================================
// Responde: "a empresa (ou a obra) fatura, recebe e paga em dia? o caixa
// aguenta as próximas semanas? para onde vai o dinheiro?"
// Escopo (CLAUDE.md 1b/1c): Geral = CAIXA DA EMPRESA (receitas pelo total,
// despesas sem obra — material de obra fica fora). Obra/grupo = só a obra.
// ============================================================

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
  ComposedChart, Line,
} from 'recharts';
import { Building2, HardHat, Receipt, HandCoins, TrendingDown, Scale, AlertTriangle, CalendarX } from 'lucide-react';
import {
  SERIES, STATUS, NEUTRO, GRID, fmtBRL, fmtBRLc, fmtNum, fmtPct, tooltipProps, eixoProps, KpiTile, ChartCard, Legenda,
} from '@/components/bi/biUi';
import { ResumoAba, BotaoCSV, BotaoTabela, TabelaDados, baixarCSV, rotuloSemana, rotuloMes } from './AbaExecutivo';

// Cor segue a entidade em toda a aba: entrada/receita = SERIES[0],
// recebido = SERIES[1], saída/despesa = SERIES[2], acumulado = SERIES[3].
const COR = { faturado: SERIES[0], recebido: SERIES[1], despesas: SERIES[2], acumulado: SERIES[3] };
const CLASSE_ABC = { A: 'bg-slate-200 text-slate-900', B: 'bg-slate-500 text-white', C: 'bg-slate-700 text-slate-200' };

export function TagClasse({ classe }) {
  return <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold ${CLASSE_ABC[classe] || ''}`}>{classe}</span>;
}

export default function AbaFinanceiro({ dados, rotuloEscopo }) {
  const { financeiro } = dados;
  const geral = financeiro.geralEmpresa;
  const [tabelaMensal, setTabelaMensal] = useState(false);
  const [tabelaFluxo, setTabelaFluxo] = useState(false);
  const [tabelaAging, setTabelaAging] = useState(false);

  const mensal = useMemo(() => financeiro.mensal.map((m) => ({ ...m, rotulo: rotuloMes(m.mes) })), [financeiro.mensal]);
  const fluxo = useMemo(() => financeiro.fluxo.map((f) => ({ ...f, rotulo: rotuloSemana(f.semana) })), [financeiro.fluxo]);
  const temMensal = mensal.some((m) => m.faturado || m.despesas);
  const temFluxo = fluxo.some((f) => f.entradas || f.saidas);
  const temAging = financeiro.aging.faixas.some((f) => f.receber || f.pagar);

  const tot = useMemo(() => {
    const s = (k) => financeiro.mensal.reduce((a, m) => a + (m[k] || 0), 0);
    return { faturado: s('faturado'), recebido: s('recebido'), despesas: s('despesas'), pago: s('pago'), resultado: s('resultado') };
  }, [financeiro.mensal]);

  const categorias = useMemo(() => {
    const top = financeiro.categorias.slice(0, 8);
    const resto = financeiro.categorias.slice(8).reduce((s, c) => s + c.valor, 0);
    return resto > 0 ? [...top, { categoria: `Outras (${financeiro.categorias.length - 8})`, valor: resto }] : top;
  }, [financeiro.categorias]);

  const totalCategorias = useMemo(() => financeiro.categorias.reduce((s, c) => s + c.valor, 0), [financeiro.categorias]);

  const frases = useMemo(() => {
    const out = [];
    if (tot.faturado || tot.despesas) {
      out.push({ tom: tot.resultado >= 0 ? 'bom' : 'serio', texto: `Últimos 12 meses: faturado ${fmtBRLc(tot.faturado)} × despesas ${fmtBRLc(tot.despesas)} → resultado ${fmtBRLc(tot.resultado)}${geral ? ' (caixa da empresa)' : ''}.` });
    }
    if (tot.faturado > 0) {
      const pct = (tot.recebido / tot.faturado) * 100;
      out.push({ tom: pct >= 90 ? 'bom' : pct >= 70 ? 'atencao' : 'serio', texto: `${fmtNum(pct, 0)}% do faturado em 12 meses já foi recebido.` });
    }
    const negMeses = financeiro.mensal.filter((m) => m.resultado < 0).length;
    if (negMeses) out.push({ tom: negMeses >= 4 ? 'serio' : 'atencao', texto: `${negMeses} de 12 meses fecharam com despesas acima do faturado.` });
    if (financeiro.aging.receberVencido > 0 || financeiro.aging.pagarVencido > 0) {
      out.push({ tom: 'serio', texto: `Vencidos em aberto: ${fmtBRLc(financeiro.aging.receberVencido)} a receber e ${fmtBRLc(financeiro.aging.pagarVencido)} a pagar.` });
    }
    const neg = financeiro.fluxo.find((f) => f.acumulado < 0);
    if (neg) out.push({ tom: 'critico', texto: `Pelos vencimentos em aberto, o saldo acumulado fica negativo na semana de ${rotuloSemana(neg.semana)} (${fmtBRLc(neg.acumulado)}).` });
    else if (temFluxo) out.push({ tom: 'bom', texto: `Saldo projetado das próximas 8 semanas: ${fmtBRLc(financeiro.fluxo[financeiro.fluxo.length - 1]?.acumulado || 0)} (sem semana negativa).` });
    const nA = financeiro.fornecedores.filter((f) => f.classe === 'A').length;
    if (nA) out.push({ tom: 'info', texto: `${nA} de ${financeiro.fornecedores.length} fornecedor(es) concentram ~80% das despesas do ano (classe A).` });
    if (financeiro.categorias.length && tot.despesas > 0) {
      const c = financeiro.categorias[0];
      out.push({ tom: 'info', texto: `Maior categoria de despesa: ${c.categoria} (${fmtBRLc(c.valor)}).` });
    }
    return out;
  }, [tot, geral, financeiro, temFluxo]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 text-xs text-slate-300">
        {geral ? <Building2 className="h-5 w-5 shrink-0 text-slate-400" aria-hidden /> : <HardHat className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />}
        <div>
          <p className="font-semibold text-slate-100">{geral ? 'Escopo Geral = caixa da EMPRESA' : `Escopo: ${rotuloEscopo} — somente esta(s) obra(s)`}</p>
          <p className="mt-0.5">
            {geral
              ? 'Receitas (medições reconhecidas + receitas manuais) pelo total; despesas apenas da fábrica (sem obra). Material lançado direto na obra (GFO) fica fora — o resultado por obra está na Gestão Financeira da Obra.'
              : 'Medições e receitas manuais da obra × despesas/material lançados na obra. Não é o caixa da empresa.'}
          </p>
        </div>
      </div>

      <ResumoAba frases={frases} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3">
        <KpiTile icone={Receipt} rotulo="Faturado 12 meses" valor={fmtBRLc(tot.faturado)} />
        <KpiTile icone={HandCoins} rotulo="Recebido 12 meses" valor={fmtBRLc(tot.recebido)} sub={tot.faturado > 0 ? `${fmtPct((tot.recebido / tot.faturado) * 100, 0)} do faturado` : undefined} />
        <KpiTile icone={TrendingDown} rotulo="Despesas 12 meses" valor={fmtBRLc(tot.despesas)} sub={`pago: ${fmtBRLc(tot.pago)}`} />
        <KpiTile icone={Scale} rotulo="Resultado 12 meses" valor={fmtBRLc(tot.resultado)} sub="faturado − despesas (competência)" />
        <KpiTile icone={AlertTriangle} rotulo="A receber vencido" valor={fmtBRLc(financeiro.aging.receberVencido)} />
        <KpiTile icone={CalendarX} rotulo="A pagar vencido" valor={fmtBRLc(financeiro.aging.pagarVencido)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard
          className="xl:col-span-2"
          titulo="Faturado × recebido × despesas por mês"
          subtitulo="O faturamento cobre as despesas e vira dinheiro no caixa? Mês da emissão/medição (12 meses)."
          vazio={!temMensal}
          acao={(
            <div className="flex gap-2">
              <BotaoTabela tabela={tabelaMensal} onClick={() => setTabelaMensal((v) => !v)} />
              <BotaoCSV onClick={() => baixarCSV('bi360_financeiro_mensal', [
                { chave: 'mes', rotulo: 'Mês' }, { chave: 'faturado', rotulo: 'Faturado' }, { chave: 'recebido', rotulo: 'Recebido' },
                { chave: 'despesas', rotulo: 'Despesas' }, { chave: 'pago', rotulo: 'Pago' }, { chave: 'resultado', rotulo: 'Resultado' },
              ], financeiro.mensal)} />
            </div>
          )}
        >
          <div className="mb-2"><Legenda itens={[{ rotulo: 'Faturado', cor: COR.faturado }, { rotulo: 'Recebido', cor: COR.recebido }, { rotulo: 'Despesas', cor: COR.despesas }]} /></div>
          {tabelaMensal ? (
            <TabelaDados
              colunas={[
                { chave: 'rotulo', rotulo: 'Mês', alinhar: 'esq' }, { chave: 'faturado', rotulo: 'Faturado', fmt: (v) => fmtBRL(v) },
                { chave: 'recebido', rotulo: 'Recebido', fmt: (v) => fmtBRL(v) }, { chave: 'despesas', rotulo: 'Despesas', fmt: (v) => fmtBRL(v) },
                { chave: 'resultado', rotulo: 'Resultado', fmt: (v) => fmtBRL(v) },
              ]}
              linhas={mensal}
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mensal} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={1}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="rotulo" {...eixoProps} interval="preserveStartEnd" />
                  <YAxis {...eixoProps} width={70} tickFormatter={fmtBRLc} />
                  <Tooltip {...tooltipProps} formatter={(v, n) => [fmtBRL(v), n]} />
                  <Bar dataKey="faturado" name="Faturado" fill={COR.faturado} radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="recebido" name="Recebido" fill={COR.recebido} radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="despesas" name="Despesas" fill={COR.despesas} radius={[4, 4, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          titulo="Resultado mensal"
          subtitulo="Em quais meses a operação deu lucro ou prejuízo? Faturado − despesas."
          vazio={!temMensal}
        >
          <div className="mb-2"><Legenda itens={[{ rotulo: '▲ Positivo', cor: STATUS.bom }, { rotulo: '▼ Negativo', cor: STATUS.critico }]} /></div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mensal} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="rotulo" {...eixoProps} interval="preserveStartEnd" />
                <YAxis {...eixoProps} width={70} tickFormatter={fmtBRLc} />
                <Tooltip {...tooltipProps} formatter={(v) => [`${v >= 0 ? '▲ ' : '▼ '}${fmtBRL(v)}`, v >= 0 ? 'Resultado positivo' : 'Resultado negativo']} />
                <ReferenceLine y={0} stroke={NEUTRO} />
                <Bar dataKey="resultado" maxBarSize={20}>
                  {mensal.map((m) => (
                    <Cell key={m.mes} fill={m.resultado >= 0 ? STATUS.bom : STATUS.critico} radius={m.resultado >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          titulo="Fluxo de caixa projetado — 8 semanas"
          subtitulo="O caixa aguenta as próximas semanas? Entradas e saídas pelos vencimentos em aberto (vencidos entram na 1ª semana); linha = saldo acumulado."
          vazio={!temFluxo}
          mensagemVazio="Nenhum recebimento ou pagamento em aberto."
          acao={<BotaoTabela tabela={tabelaFluxo} onClick={() => setTabelaFluxo((v) => !v)} />}
        >
          <div className="mb-2"><Legenda itens={[{ rotulo: 'Entradas', cor: COR.faturado }, { rotulo: 'Saídas', cor: COR.despesas }, { rotulo: 'Saldo acumulado', cor: COR.acumulado }]} /></div>
          {tabelaFluxo ? (
            <TabelaDados
              colunas={[
                { chave: 'rotulo', rotulo: 'Semana', alinhar: 'esq' }, { chave: 'entradas', rotulo: 'Entradas', fmt: (v) => fmtBRL(v) },
                { chave: 'saidas', rotulo: 'Saídas', fmt: (v) => fmtBRL(v) }, { chave: 'saldo', rotulo: 'Saldo', fmt: (v) => fmtBRL(v) },
                { chave: 'acumulado', rotulo: 'Acumulado', fmt: (v) => fmtBRL(v) },
              ]}
              linhas={fluxo}
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={fluxo} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={1}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="rotulo" {...eixoProps} />
                  <YAxis {...eixoProps} width={70} tickFormatter={fmtBRLc} />
                  <Tooltip {...tooltipProps} formatter={(v, n) => [fmtBRL(v), n]} labelFormatter={(l) => `Semana de ${l}`} />
                  <ReferenceLine y={0} stroke={NEUTRO} />
                  <Bar dataKey="entradas" name="Entradas" fill={COR.faturado} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="saidas" name="Saídas" fill={COR.despesas} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Line type="monotone" dataKey="acumulado" name="Saldo acumulado" stroke={COR.acumulado} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-1 text-[11px] text-slate-500">Projeção parte de saldo zero: mostra o descasamento entre o que vence a receber e a pagar, não o saldo bancário.</p>
        </ChartCard>

        <ChartCard
          titulo="Aging — a receber × a pagar em aberto"
          subtitulo="Quanto está atrasado e há quanto tempo? Valores em aberto por faixa de dias de atraso."
          vazio={!temAging}
          mensagemVazio="Nada em aberto."
          acao={<BotaoTabela tabela={tabelaAging} onClick={() => setTabelaAging((v) => !v)} />}
        >
          <div className="mb-2"><Legenda itens={[{ rotulo: 'A receber', cor: COR.faturado }, { rotulo: 'A pagar', cor: COR.despesas }]} /></div>
          {tabelaAging ? (
            <TabelaDados
              colunas={[{ chave: 'rotulo', rotulo: 'Faixa', alinhar: 'esq' }, { chave: 'receber', rotulo: 'A receber', fmt: (v) => fmtBRL(v) }, { chave: 'pagar', rotulo: 'A pagar', fmt: (v) => fmtBRL(v) }]}
              linhas={financeiro.aging.faixas}
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeiro.aging.faixas} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="rotulo" {...eixoProps} />
                  <YAxis {...eixoProps} width={70} tickFormatter={fmtBRLc} />
                  <Tooltip {...tooltipProps} formatter={(v, n) => [fmtBRL(v), n]} />
                  <Bar dataKey="receber" name="A receber" fill={COR.faturado} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="pagar" name="A pagar" fill={COR.despesas} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          titulo="Curva ABC de fornecedores — 12 meses"
          subtitulo="Com quem a empresa mais gasta? A = ~80% do valor, B = até 95%, C = restante. Top 15."
          vazio={!financeiro.fornecedores.length}
          mensagemVazio="Sem despesas nos últimos 12 meses."
          acao={<BotaoCSV onClick={() => baixarCSV('bi360_abc_fornecedores', [
            { chave: 'fornecedor', rotulo: 'Fornecedor' }, { chave: 'valor', rotulo: 'Valor' }, { chave: 'pct', rotulo: '%' },
            { chave: 'pctAcum', rotulo: '% acumulado' }, { chave: 'classe', rotulo: 'Classe' },
          ], financeiro.fornecedores)} />}
        >
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left font-medium px-2 py-1.5">#</th>
                  <th className="text-left font-medium px-2 py-1.5">Fornecedor</th>
                  <th className="text-right font-medium px-2 py-1.5">Valor</th>
                  <th className="text-right font-medium px-2 py-1.5">%</th>
                  <th className="text-right font-medium px-2 py-1.5">% acum.</th>
                  <th className="text-center font-medium px-2 py-1.5">Classe</th>
                </tr>
              </thead>
              <tbody>
                {financeiro.fornecedores.slice(0, 15).map((f, i) => (
                  <tr key={f.fornecedor} className="border-b border-slate-800/70 text-slate-200">
                    <td className="px-2 py-1.5 text-slate-500 tabular-nums">{i + 1}</td>
                    <td className="px-2 py-1.5 max-w-[220px]"><div className="truncate" title={f.fornecedor}>{f.fornecedor}</div></td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtBRL(f.valor)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtPct(f.pct, 1)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-400">{fmtPct(f.pctAcum, 0)}</td>
                    <td className="px-2 py-1.5 text-center"><TagClasse classe={f.classe} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {financeiro.fornecedores.length > 15 && <p className="mt-2 text-[11px] text-slate-500">+ {financeiro.fornecedores.length - 15} fornecedor(es) no CSV.</p>}
        </ChartCard>

        <ChartCard
          titulo="Despesas por categoria — 12 meses"
          subtitulo="Para onde vai o dinheiro? 8 maiores categorias + demais agrupadas."
          vazio={!categorias.length}
          mensagemVazio="Sem despesas nos últimos 12 meses."
          acao={<BotaoCSV onClick={() => baixarCSV('bi360_despesas_categoria', [{ chave: 'categoria', rotulo: 'Categoria' }, { chave: 'valor', rotulo: 'Valor' }], financeiro.categorias)} />}
        >
          <div style={{ height: Math.max(160, categorias.length * 32 + 20) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorias} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" {...eixoProps} tickFormatter={fmtBRLc} />
                <YAxis type="category" dataKey="categoria" {...eixoProps} width={130} tickFormatter={(v) => (String(v).length > 18 ? `${String(v).slice(0, 17)}…` : v)} />
                <Tooltip {...tooltipProps} formatter={(v) => [`${fmtBRL(v)}${totalCategorias > 0 ? ` (${fmtPct((v / totalCategorias) * 100, 1)})` : ''}`, 'Despesas']} />
                <Bar dataKey="valor" fill={COR.despesas} radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
