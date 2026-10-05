// ============================================================
// BI 360 — Aba Suprimentos
// ============================================================
// Responde: "quanto dinheiro está parado em estoque, o que está em risco de
// faltar e onde concentrar o controle?" Fonte: services/estoqueAnalytics.
// ============================================================

import React, { useMemo } from 'react';
import {
  Boxes, AlertTriangle, ShieldAlert, Tag, PackageCheck, XCircle, AlertCircle, CheckCircle2, MinusCircle, Info,
} from 'lucide-react';
import { fmtBRL, fmtBRLc, fmtNum, fmtPct, fmtKg, KpiTile, ChartCard } from '@/components/bi/biUi';
import { SAUDE } from '@/services/estoqueAnalytics';
import { ResumoAba, BotaoCSV, baixarCSV } from './AbaExecutivo';
import { TagClasse } from './AbaFinanceiro';

const ICONE_SAUDE = {
  zerado: XCircle, critico: XCircle, baixo: AlertTriangle, atencao: AlertCircle,
  excesso: Info, saudavel: CheckCircle2, entregue: CheckCircle2, sem_minimo: MinusCircle,
};

const nomeItem = (it) => it.descricao || it.codigo || it.perfil || it.material || it.id || '—';

export default function AbaSuprimentos({ dados }) {
  const { suprimentos } = dados;
  const k = suprimentos.kpis;
  const abc = suprimentos.abc;

  const saude = useMemo(() => (
    Object.values(SAUDE).sort((a, b) => a.prioridade - b.prioridade)
      .map((s) => ({ ...s, n: k.porSaude?.[s.key] || 0 }))
  ), [k.porSaude]);
  const maxSaude = Math.max(1, ...saude.map((s) => s.n));

  const frases = useMemo(() => {
    const out = [];
    if (!k.nItens) return out;
    out.push({ tom: 'info', texto: `${fmtNum(k.nItens)} item(ns) somando ${fmtBRLc(k.valorTotal)} em estoque${k.pesoTotal > 0 ? ` (${fmtKg(k.pesoTotal)})` : ''}.` });
    if (k.alertas > 0) out.push({ tom: 'serio', texto: `${k.alertas} item(ns) zerados ou abaixo do mínimo — ${fmtBRLc(k.valorEmRisco)} em itens com risco de faltar.` });
    else if (k.nItens - k.semMinimo > 0) out.push({ tom: 'bom', texto: 'Nenhum item com mínimo cadastrado está abaixo do ponto de reposição.' });
    if (abc.resumo.A.n > 0 && abc.total > 0) {
      out.push({ tom: 'info', texto: `${abc.resumo.A.n} item(ns) (classe A) concentram ${fmtNum((abc.resumo.A.valor / abc.total) * 100, 0)}% do valor — foco do inventário rotativo.` });
    }
    const semMinPct = (k.semMinimo / k.nItens) * 100;
    if (k.semMinimo > 0) out.push({ tom: semMinPct > 50 ? 'atencao' : 'info', texto: `${k.semMinimo} item(ns) sem estoque mínimo (${fmtNum(semMinPct, 0)}%) — a saúde desses itens não pode ser avaliada.` });
    if (k.semPreco > 0) out.push({ tom: 'atencao', texto: `${k.semPreco} item(ns) sem preço — o valor em estoque está subestimado.` });
    if (k.coberturaPct !== null && k.coberturaPct !== undefined) {
      out.push({ tom: k.coberturaPct >= 95 ? 'bom' : k.coberturaPct >= 70 ? 'atencao' : 'serio', texto: `Material de obra: ${fmtPct(k.coberturaPct, 0)} do necessário já chegou (${k.itensComFalta} item(ns) com falta).` });
    }
    return out;
  }, [k, abc]);

  const exportarABC = () => baixarCSV('bi360_estoque_abc', [
    { chave: 'codigo', rotulo: 'Código' }, { chave: 'nome', rotulo: 'Item', csv: nomeItem },
    { chave: 'quantidade', rotulo: 'Quantidade' }, { chave: 'unidade', rotulo: 'Unidade' },
    { chave: '_valor', rotulo: 'Valor' }, { chave: '_pct', rotulo: '%' }, { chave: '_acumPct', rotulo: '% acumulado' }, { chave: '_classe', rotulo: 'Classe' },
  ], abc.rows);

  if (!k.nItens) {
    return (
      <ChartCard titulo="Suprimentos" vazio mensagemVazio="Nenhum item de estoque no escopo. Cadastre itens no módulo de Estoque." />
    );
  }

  return (
    <div className="space-y-4">
      <ResumoAba frases={frases} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <KpiTile icone={Boxes} rotulo="Valor em estoque" valor={fmtBRLc(k.valorTotal)} sub={`${fmtNum(k.nItens)} item(ns)`} ajuda="Quantidade × preço unitário cadastrado." />
        <KpiTile icone={AlertTriangle} rotulo="Itens em alerta" valor={fmtNum(k.alertas)} sub="zerados, críticos ou baixos" />
        <KpiTile icone={ShieldAlert} rotulo="Valor em risco" valor={fmtBRLc(k.valorEmRisco)} sub="valor dos itens em alerta" />
        <KpiTile icone={Tag} rotulo="Cadastro incompleto" valor={`${fmtNum(k.semPreco)} / ${fmtNum(k.semMinimo)}`} sub="sem preço / sem mínimo" />
        <KpiTile
          icone={PackageCheck}
          rotulo="Cobertura material de obra"
          valor={k.coberturaPct !== null && k.coberturaPct !== undefined ? fmtPct(k.coberturaPct, 0) : '—'}
          sub={k.itensComNecessidade ? `${k.itensComFalta} de ${k.itensComNecessidade} item(ns) com falta` : 'sem necessidade cadastrada'}
          ajuda="Necessário (pedido) × já chegou (comprado), limitado ao necessário."
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard
          titulo="Saúde do estoque"
          subtitulo="Quantos itens estão em risco de faltar? Classificação pelo saldo × mínimo/máximo."
        >
          <ul className="space-y-2">
            {saude.map((s) => {
              const I = ICONE_SAUDE[s.key] || MinusCircle;
              return (
                <li key={s.key} className="grid grid-cols-[120px_1fr_44px] items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-slate-200 whitespace-nowrap">
                    <I className="h-3.5 w-3.5 shrink-0" style={{ color: s.cor }} aria-hidden /> {s.label}
                  </span>
                  <span className="h-3 rounded-sm bg-slate-800 overflow-hidden" aria-hidden>
                    <span className="block h-full rounded-sm" style={{ width: `${(s.n / maxSaude) * 100}%`, background: s.cor }} />
                  </span>
                  <span className="text-right tabular-nums text-slate-200">{fmtNum(s.n)}</span>
                </li>
              );
            })}
          </ul>
        </ChartCard>

        <ChartCard
          className="xl:col-span-2"
          titulo="Curva ABC do estoque (por valor)"
          subtitulo="Onde está o dinheiro parado? Poucos itens A concentram a maior parte do valor — controle-os de perto."
          vazio={!abc.rows.length}
          mensagemVazio="Nenhum item com preço e saldo para calcular a curva ABC."
          acao={<BotaoCSV onClick={exportarABC} disabled={!abc.rows.length} />}
        >
          <div className="grid grid-cols-3 gap-2 mb-3">
            {['A', 'B', 'C'].map((c) => (
              <div key={c} className="rounded-lg border border-slate-800 p-2">
                <div className="flex items-center gap-2 text-xs text-slate-400"><TagClasse classe={c} /> Classe {c}</div>
                <div className="mt-1 text-sm font-semibold text-white tabular-nums">{fmtBRLc(abc.resumo[c].valor)}</div>
                <div className="text-[11px] text-slate-400 tabular-nums">
                  {fmtNum(abc.resumo[c].n)} item(ns) · {abc.total > 0 ? fmtPct((abc.resumo[c].valor / abc.total) * 100, 0) : '—'} do valor
                </div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left font-medium px-2 py-1.5">#</th>
                  <th className="text-left font-medium px-2 py-1.5">Item</th>
                  <th className="text-right font-medium px-2 py-1.5">Saldo</th>
                  <th className="text-right font-medium px-2 py-1.5">Valor</th>
                  <th className="text-right font-medium px-2 py-1.5">%</th>
                  <th className="text-right font-medium px-2 py-1.5">% acum.</th>
                  <th className="text-center font-medium px-2 py-1.5">Classe</th>
                </tr>
              </thead>
              <tbody>
                {abc.rows.slice(0, 15).map((it, i) => (
                  <tr key={it.id || i} className="border-b border-slate-800/70 text-slate-200">
                    <td className="px-2 py-1.5 text-slate-500 tabular-nums">{i + 1}</td>
                    <td className="px-2 py-1.5 max-w-[260px]">
                      <div className="truncate" title={nomeItem(it)}>
                        {it.codigo && it.descricao ? <span className="font-mono text-slate-400">{it.codigo} · </span> : null}{nomeItem(it)}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">{fmtNum(it.quantidade, 2)} {it.unidade || ''}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtBRL(it._valor)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtPct(it._pct, 1)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-400">{fmtPct(it._acumPct, 0)}</td>
                    <td className="px-2 py-1.5 text-center"><TagClasse classe={it._classe} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {abc.rows.length > 15 && <p className="mt-2 text-[11px] text-slate-500">+ {abc.rows.length - 15} item(ns) no CSV.</p>}
        </ChartCard>
      </div>
    </div>
  );
}
