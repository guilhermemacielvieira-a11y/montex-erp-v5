// ============================================================
// BI 360 — Aba Custo/kg (também usada no mobile em /m/custo)
// ============================================================
// Responde: "quanto custa fabricar 1 kg hoje e em 2027, a partir de que
// volume a fábrica empata, e quais obras pagam o custo?"
// Custo = despesas da FÁBRICA (sem obra). Produção = kg que entrou em
// pintura (histórico normalizado). Motor: services/bi/biCustoKg.js.
// A margem por obra é ESTIMATIVA de fabricação (receita/kg − custo/kg no
// volume atual) — o resultado oficial de cada obra continua na GFO.
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import {
  Calculator, Factory, Scale, Gauge, Boxes, AlertTriangle, Settings2, Save, RotateCcw, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SERIES, STATUS, NEUTRO, GRID, fmtBRL, fmtBRLc, fmtNum, fmtPct, fmtKg, tooltipProps, eixoProps, KpiTile, ChartCard, Legenda,
} from '@/components/bi/biUi';
import { ResumoAba, BotaoCSV, baixarCSV, rotuloMes } from './AbaExecutivo';
import { useCustoKg } from '@/hooks/useCustoKg';
import { PADRAO_CUSTO } from '@/services/bi/biCustoKg';

const COR = { c2026: SERIES[0], c2027: SERIES[1], preco: SERIES[2], volume: SERIES[3] };
const brl2 = (v) => (v === null || v === undefined ? '—' : fmtBRL(v, 2));
const SIT = {
  negativa: { rotulo: 'Abaixo do custo', cor: STATUS.critico },
  apertada: { rotulo: 'Margem apertada', cor: STATUS.atencao },
  ok: { rotulo: 'Cobre o custo', cor: STATUS.bom },
  'sem dados': { rotulo: 'Sem preço', cor: NEUTRO },
};

function Situacao({ s }) {
  const x = SIT[s] || SIT['sem dados'];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
      <span className="h-2 w-2 rounded-full" style={{ background: x.cor }} aria-hidden />
      {x.rotulo}
    </span>
  );
}

function Campo({ rotulo, valor, onChange, sufixo, passo = 0.1, ajuda }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-300 min-w-0">
      <span className="flex items-center gap-1 truncate">
        {rotulo}
        {ajuda && <span title={ajuda}><Info className="h-3 w-3 text-slate-500" aria-label={ajuda} /></span>}
      </span>
      <span className="flex items-center rounded-md border border-slate-700 bg-slate-950 focus-within:border-slate-500">
        <input
          type="number"
          inputMode="decimal"
          step={passo}
          value={valor ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full min-w-0 bg-transparent px-2 py-1.5 text-sm text-white tabular-nums outline-none"
        />
        {sufixo && <span className="pr-2 text-slate-500 whitespace-nowrap">{sufixo}</span>}
      </span>
    </label>
  );
}

function Premissas({ config }) {
  const { cfg, salvar, salvando, erro } = config;
  const [form, setForm] = useState(cfg);
  const [aberto, setAberto] = useState(false);
  const [ok, setOk] = useState(false);
  useEffect(() => { setForm(cfg); }, [cfg]);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setRj = (k) => (v) => setForm((f) => ({ ...f, reajuste2027: { ...f.reajuste2027, [k]: v } }));
  const gravar = async () => {
    const limpo = { ...form };
    ['capacidadeTMes', 'precoFabricacaoKg', 'acoKg', 'montagemKg', 'janelaMeses'].forEach((k) => { limpo[k] = Number(limpo[k]) || PADRAO_CUSTO[k]; });
    Object.keys(limpo.reajuste2027).forEach((k) => { limpo.reajuste2027[k] = Number(limpo.reajuste2027[k]) || 0; });
    try { await salvar(limpo); setOk(true); setTimeout(() => setOk(false), 2500); } catch { /* erro exibido abaixo */ }
  };
  return (
    <section className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
      <button type="button" onClick={() => setAberto((a) => !a)} className="flex w-full items-center justify-between gap-2 text-left" aria-expanded={aberto}>
        <span className="flex items-center gap-2 text-sm font-semibold text-white"><Settings2 className="h-4 w-4 text-slate-400" aria-hidden /> Premissas do cálculo</span>
        <span className="text-xs text-slate-400">
          Fabricação {brl2(cfg.precoFabricacaoKg)}/kg · capacidade {fmtNum(cfg.capacidadeTMes)} t/mês · janela {cfg.janelaMeses} meses
        </span>
      </button>
      {aberto && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Campo rotulo="Preço de fabricação" sufixo="R$/kg" valor={form.precoFabricacaoKg} onChange={set('precoFabricacaoKg')} ajuda="O que a Montex fatura por kg só pela fabricação (sem aço e sem montagem)." />
            <Campo rotulo="Capacidade da fábrica" sufixo="t/mês" passo={5} valor={form.capacidadeTMes} onChange={set('capacidadeTMes')} />
            <Campo rotulo="Aço (para abrir o global)" sufixo="R$/kg" valor={form.acoKg} onChange={set('acoKg')} ajuda="Usado para estimar a receita de fabricação de obras com preço global." />
            <Campo rotulo="Montagem terceirizada" sufixo="R$/kg" valor={form.montagemKg} onChange={set('montagemKg')} />
            <Campo rotulo="Janela da média" sufixo="meses" passo={1} valor={form.janelaMeses} onChange={set('janelaMeses')} />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">Reajustes previstos para 2027 (% sobre hoje)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Campo rotulo="Mão de obra" sufixo="%" passo={0.5} valor={form.reajuste2027.maoDeObra} onChange={setRj('maoDeObra')} />
              <Campo rotulo="Demais fixos" sufixo="%" passo={0.5} valor={form.reajuste2027.fixos} onChange={setRj('fixos')} />
              <Campo rotulo="Consumíveis e impostos" sufixo="%" passo={0.5} valor={form.reajuste2027.variaveis} onChange={setRj('variaveis')} />
              <Campo rotulo="Aço" sufixo="%" passo={0.5} valor={form.reajuste2027.aco} onChange={setRj('aco')} />
              <Campo rotulo="Montagem" sufixo="%" passo={0.5} valor={form.reajuste2027.montagem} onChange={setRj('montagem')} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!form.incluirMesAtual} onChange={(e) => set('incluirMesAtual')(e.target.checked)} /> Incluir o mês atual (parcial)</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!form.ajustarAtipicos} onChange={(e) => set('ajustarAtipicos')(e.target.checked)} /> Trocar lançamentos atípicos pela mediana</label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={gravar} disabled={salvando} className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-white disabled:opacity-60">
              <Save className="h-3.5 w-3.5" aria-hidden /> {salvando ? 'Salvando…' : 'Salvar premissas'}
            </button>
            <button type="button" onClick={() => setForm(PADRAO_CUSTO)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Padrões
            </button>
            {ok && <span className="text-xs text-emerald-400">Salvo — vale para todos os dispositivos.</span>}
            {erro && <span className="text-xs text-rose-400">Não foi possível salvar: {erro}</span>}
          </div>
        </div>
      )}
    </section>
  );
}

export default function AbaCustoKg({ dados }) {
  const { analise: a, config } = useCustoKg(dados);
  const [verTodasObras, setVerTodasObras] = useState(false);

  const mensal = useMemo(() => (a?.serie || []).map((l) => {
    const custo = l.kg > 0 ? (l.maoDeObra + l.fixo + l.variavel) / l.kg : null;
    return { ...l, rotulo: rotuloMes(l.mes), t: Math.round(l.kg / 100) / 10, custoKg: custo !== null && custo < 60 ? Math.round(custo * 100) / 100 : null, naJanela: a.base.meses.includes(l.mes) };
  }).filter((l) => l.kg > 0 || l.maoDeObra + l.fixo + l.variavel > 0), [a]);

  const frases = useMemo(() => {
    if (!a || a.custoKg === null) return [];
    const out = [];
    const preco = a.cfg.precoFabricacaoKg;
    out.push({
      tom: a.custoKg <= preco ? 'bom' : 'serio',
      texto: `Média de ${a.base.meses.length} meses: ${fmtNum(a.base.tMes, 1)} t/mês fabricadas a ${brl2(a.custoKg)}/kg de custo — ${a.custoKg <= preco ? 'abaixo' : 'acima'} do preço de fabricação de ${brl2(preco)}/kg.`,
    });
    if (a.custoKg2027 !== null) {
      out.push({
        tom: a.custoKg2027 <= preco ? 'atencao' : 'critico',
        texto: `Em 2027, no mesmo volume, o custo sobe para ${brl2(a.custoKg2027)}/kg (${fmtPct(((a.custoKg2027 / a.custoKg) - 1) * 100)}).`,
      });
    }
    if (a.equilibrio.t2027 !== null) {
      out.push({ tom: a.equilibrio.t2027 <= a.base.tMes ? 'bom' : 'serio', texto: `A ${brl2(preco)}/kg a fábrica empata com ${fmtNum(a.equilibrio.t2026, 1)} t/mês hoje e ${fmtNum(a.equilibrio.t2027, 1)} t/mês em 2027.` });
    }
    const negativas = a.obras.filter((o) => o.situacao === 'negativa');
    if (negativas.length) {
      out.push({ tom: 'critico', texto: `${negativas.length} obra(s) com receita de fabricação abaixo do custo/kg atual: ${negativas.map((o) => o.nome).slice(0, 3).join(', ')}${negativas.length > 3 ? '…' : ''}.` });
    }
    if (a.carteira.mesesNoRitmo !== null) {
      out.push({ tom: 'info', texto: `Carteira a fabricar: ${fmtKg(a.carteira.kg)} — ${fmtNum(a.carteira.mesesNoRitmo, 1)} meses no ritmo atual ou ${fmtNum(a.carteira.mesesNaCapacidade, 1)} na capacidade.` });
    }
    return out;
  }, [a]);

  if (!a) return null;
  if (a.custoKg === null) {
    return (
      <div className="space-y-4">
        <ChartCard titulo="Custo por kg" vazio mensagemVazio="Sem produção (entrada em pintura) na janela escolhida para calcular o custo por kg." />
        <Premissas config={config} />
      </div>
    );
  }

  const obrasVisiveis = verTodasObras ? a.obras : a.obras.slice(0, 8);
  const preco = a.cfg.precoFabricacaoKg;

  return (
    <div className="space-y-4 min-w-0">
      <ResumoAba frases={frases} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile icone={Calculator} rotulo="Custo/kg hoje" valor={brl2(a.custoKg)} sub={`${fmtNum(a.base.tMes, 1)} t/mês · ${a.base.meses.length} meses`} ajuda="Despesas da fábrica (sem obra) ÷ kg que entrou em pintura, média da janela." />
        <KpiTile icone={Calculator} rotulo="Custo/kg 2027" valor={brl2(a.custoKg2027)} sub="mesmo volume, com reajustes" tendencia={((a.custoKg2027 / a.custoKg) - 1) * 100} tendenciaBoa="baixa" />
        <KpiTile icone={Scale} rotulo={`Equilíbrio a ${brl2(preco)}/kg`} valor={a.equilibrio.t2027 === null ? '—' : `${fmtNum(a.equilibrio.t2027, 1)} t/mês`} sub={a.equilibrio.t2026 === null ? '' : `hoje: ${fmtNum(a.equilibrio.t2026, 1)} t/mês`} ajuda="Volume mensal em que o preço de fabricação cobre todos os custos da fábrica (2027)." />
        <KpiTile icone={Gauge} rotulo="Ocupação da fábrica" valor={fmtPct(a.ocupacaoPct, 0)} sub={`de ${fmtNum(a.cfg.capacidadeTMes)} t/mês`} />
        <KpiTile icone={Boxes} rotulo="Carteira a fabricar" valor={fmtKg(a.carteira.kg)} sub={a.carteira.mesesNoRitmo === null ? '' : `${fmtNum(a.carteira.mesesNoRitmo, 1)} meses no ritmo atual`} className="col-span-2 lg:col-span-1" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-3"
          titulo="Custo por kg conforme o volume"
          subtitulo="Quanto mais toneladas por mês, menor o custo fixo em cada kg."
          acao={<BotaoCSV onClick={() => baixarCSV('custo_kg_volume', [
            { chave: 'tMes', rotulo: 't/mês' }, { chave: 'custo2026', rotulo: 'Custo 2026 R$/kg' }, { chave: 'custo2027', rotulo: 'Custo 2027 R$/kg' }, { chave: 'preco', rotulo: 'Preço fabricação R$/kg' },
          ], a.curva)} />}
        >
          <Legenda itens={[{ rotulo: 'Custo hoje', cor: COR.c2026 }, { rotulo: 'Custo 2027', cor: COR.c2027 }, { rotulo: 'Preço de fabricação', cor: COR.preco, tracejado: true }, { rotulo: 'Volume atual', cor: COR.volume, tracejado: true }]} />
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={a.curva} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="tMes" type="number" domain={['dataMin', 'dataMax']} {...eixoProps} tickFormatter={(v) => `${v} t`} />
                <YAxis {...eixoProps} width={48} tickFormatter={(v) => `R$ ${fmtNum(v)}`} domain={[0, 'auto']} />
                <Tooltip {...tooltipProps} labelFormatter={(v) => `${fmtNum(v, 1)} t/mês`} formatter={(v, n) => [brl2(v), n]} />
                <ReferenceLine y={preco} stroke={COR.preco} strokeDasharray="5 4" />
                <ReferenceLine x={a.base.tMes} stroke={COR.volume} strokeDasharray="3 3" />
                <Line type="monotone" dataKey="custo2026" name="Custo hoje" stroke={COR.c2026} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="custo2027" name="Custo 2027" stroke={COR.c2027} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard className="xl:col-span-2" titulo="Resultado da fábrica por volume (2027)" subtitulo={`Faturando ${brl2(preco)}/kg de fabricação.`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400">
                  <th className="py-1.5 text-left font-medium">Volume</th>
                  <th className="py-1.5 text-right font-medium">Custo hoje</th>
                  <th className="py-1.5 text-right font-medium">Custo 2027</th>
                  <th className="py-1.5 text-right font-medium">Resultado/mês</th>
                </tr>
              </thead>
              <tbody>
                {a.tabelaVolume.map((l) => (
                  <tr key={l.tMes} className={cn('border-t border-slate-800 text-slate-200', l.atual && 'bg-slate-800/50')}>
                    <td className="py-1.5 whitespace-nowrap">{fmtNum(l.tMes, 1)} t{l.atual ? ' (atual)' : ''}</td>
                    <td className="py-1.5 text-right tabular-nums">{brl2(l.custo2026)}</td>
                    <td className="py-1.5 text-right tabular-nums font-medium">{brl2(l.custo2027)}</td>
                    <td className="py-1.5 text-right tabular-nums" style={{ color: l.resultadoMes2027 >= 0 ? STATUS.bom : STATUS.critico }}>{fmtBRLc(l.resultadoMes2027)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {a.globalEquivalente && (
            <p className="mt-3 text-xs text-slate-400">
              Preço global mínimo em 2027 no volume atual: <b className="text-slate-200">{brl2(a.globalEquivalente.globalMin)}/kg</b>
              {' '}(aço {brl2(a.globalEquivalente.aco)} + montagem {brl2(a.globalEquivalente.montagem)} + fabricação {brl2(a.globalEquivalente.fabricacaoMin)}), sem lucro.
            </p>
          )}
        </ChartCard>
      </div>

      <ChartCard titulo="Produção e custo por kg mês a mês" subtitulo="Barras: t que entraram em pintura. Linha: custo da fábrica ÷ kg do mês." vazio={!mensal.length}>
        <Legenda itens={[{ rotulo: 't fabricadas', cor: COR.c2026 }, { rotulo: 'Custo/kg do mês', cor: COR.c2027 }]} />
        <div className="mt-2 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={mensal} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="rotulo" {...eixoProps} />
              <YAxis yAxisId="t" {...eixoProps} width={36} tickFormatter={(v) => `${v}`} />
              <YAxis yAxisId="c" orientation="right" {...eixoProps} width={44} tickFormatter={(v) => `R$${fmtNum(v)}`} />
              <Tooltip {...tooltipProps} formatter={(v, n) => (n === 't fabricadas' ? [`${fmtNum(v, 1)} t`, n] : [brl2(v), n])} />
              <Bar yAxisId="t" dataKey="t" name="t fabricadas" fill={COR.c2026} radius={[3, 3, 0, 0]} maxBarSize={36} />
              <Line yAxisId="c" type="monotone" dataKey="custoKg" name="Custo/kg do mês" stroke={COR.c2027} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-800/50 p-2"><div className="text-slate-400">Mão de obra/mês</div><div className="tabular-nums text-sm text-white">{fmtBRLc(a.base.maoDeObraMes)}</div></div>
          <div className="rounded-lg bg-slate-800/50 p-2"><div className="text-slate-400">Demais fixos/mês</div><div className="tabular-nums text-sm text-white">{fmtBRLc(a.base.outrosFixosMes)}</div></div>
          <div className="rounded-lg bg-slate-800/50 p-2"><div className="text-slate-400">Variável por kg</div><div className="tabular-nums text-sm text-white">{brl2(a.base.varKg)}</div></div>
          <div className="rounded-lg bg-slate-800/50 p-2"><div className="text-slate-400">Fora da fábrica/mês</div><div className="tabular-nums text-sm text-white">{fmtBRLc(a.base.foraMes)}</div></div>
        </div>
      </ChartCard>

      <ChartCard
        titulo="Margem estimada de fabricação por obra"
        subtitulo={`Receita de fabricação/kg − custo/kg no volume atual (${brl2(a.custoKg)}). Resultado oficial da obra fica na GFO.`}
        vazio={!a.obras.length}
        acao={<BotaoCSV onClick={() => baixarCSV('margem_fabricacao_obras', [
          { chave: 'codigo', rotulo: 'Código' }, { chave: 'nome', rotulo: 'Obra' }, { chave: 'kgRestante', rotulo: 'kg a fabricar' },
          { chave: 'globalKg', rotulo: 'Global R$/kg' }, { chave: 'receitaKg', rotulo: 'Receita fabricação R$/kg' }, { chave: 'fonte', rotulo: 'Fonte' },
          { chave: 'margemKg', rotulo: 'Margem R$/kg hoje' }, { chave: 'margemKg2027', rotulo: 'Margem R$/kg 2027' }, { chave: 'margemRestante', rotulo: 'Margem no saldo R$' },
        ], a.obras)} />}
      >
        {/* Mobile: cartões */}
        <ul className="space-y-2 md:hidden">
          {obrasVisiveis.map((o) => (
            <li key={o.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-white">{o.nome}</span>
                <Situacao s={o.situacao} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div><div className="text-slate-400">A fabricar</div><div className="tabular-nums text-slate-100">{fmtKg(o.kgRestante)}</div></div>
                <div><div className="text-slate-400">Receita fab.</div><div className="tabular-nums text-slate-100">{brl2(o.receitaKg)}</div></div>
                <div><div className="text-slate-400">Margem/kg</div><div className="tabular-nums" style={{ color: (o.margemKg ?? 0) >= 0 ? STATUS.bom : STATUS.critico }}>{brl2(o.margemKg)}</div></div>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">{o.fonte}{o.globalKg ? ` · global ${brl2(o.globalKg)}/kg` : ''}</div>
            </li>
          ))}
        </ul>
        {/* Desktop: tabela */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400">
                <th className="py-1.5 text-left font-medium">Obra</th>
                <th className="py-1.5 text-right font-medium">A fabricar</th>
                <th className="py-1.5 text-right font-medium">Global/kg</th>
                <th className="py-1.5 text-right font-medium">Receita fab./kg</th>
                <th className="py-1.5 text-right font-medium">Margem/kg hoje</th>
                <th className="py-1.5 text-right font-medium">Margem/kg 2027</th>
                <th className="py-1.5 text-right font-medium">Margem no saldo</th>
                <th className="py-1.5 pl-3 text-left font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {obrasVisiveis.map((o) => (
                <tr key={o.id} className="border-t border-slate-800 text-slate-200">
                  <td className="py-1.5 pr-2 max-w-[280px]"><div className="truncate" title={o.nome}>{o.nome}</div><div className="text-[11px] text-slate-500">{o.fonte}</div></td>
                  <td className="py-1.5 text-right tabular-nums whitespace-nowrap">{fmtKg(o.kgRestante)}</td>
                  <td className="py-1.5 text-right tabular-nums">{brl2(o.globalKg)}</td>
                  <td className="py-1.5 text-right tabular-nums">{brl2(o.receitaKg)}</td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: (o.margemKg ?? 0) >= 0 ? undefined : STATUS.critico }}>{brl2(o.margemKg)}</td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: (o.margemKg2027 ?? 0) >= 0 ? undefined : STATUS.critico }}>{brl2(o.margemKg2027)}</td>
                  <td className="py-1.5 text-right tabular-nums">{o.margemRestante === null ? '—' : fmtBRLc(o.margemRestante)}</td>
                  <td className="py-1.5 pl-3"><Situacao s={o.situacao} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {a.obras.length > 8 && (
          <button type="button" onClick={() => setVerTodasObras((v) => !v)} className="mt-2 text-xs text-slate-300 underline-offset-2 hover:underline">
            {verTodasObras ? 'Mostrar menos' : `Ver todas (${a.obras.length})`}
          </button>
        )}
      </ChartCard>

      {a.alertas.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4" aria-label="Qualidade dos dados">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200"><AlertTriangle className="h-4 w-4" aria-hidden /> Dados que distorcem o custo</h3>
          <ul className="space-y-1.5 text-[13px] text-slate-200">
            {a.alertas.map((al, i) => (
              <li key={i}>
                {al.texto}
                {al.itens?.length > 0 && <div className="mt-0.5 text-xs text-slate-400">{al.itens.join(' · ')}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Premissas config={config} />

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <Factory className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Custo da fábrica = despesas sem obra (mão de obra, administrativo, transporte, energia, manutenção, consumíveis e impostos). Montagem em campo e material lançado na obra ficam fora.
        Produção = kg que entrou em pintura, já sem duplicatas do histórico.
      </p>
    </div>
  );
}
