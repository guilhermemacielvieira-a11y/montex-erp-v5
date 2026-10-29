// ============================================================
// Financeiro > Caixa — caixa e resultado da EMPRESA (regra 1b)
// ============================================================
// Fonte: useFinanceiroGlobal() (mesma base do Painel Financeiro Global).
// Material lançado na obra (GFO) não entra; receitas entram pelo total.
// ============================================================
import React, { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import { useFinanceiroGlobal } from '@/hooks/useFinanceiroGlobal';
import { futuroDe } from '../../usePainelGlobal';
import { Secao, Grupo, Linha, Metrica, Grade, Barra, Status, Vazio, Erro, Esqueleto } from '../../kit';
import { brlc, brl, pct, data as fmtData } from '../../kit/fmt';
import { useEstadoERP, rotuloMes, sinalPct, diaISO } from './comum';

/** Últimos 6 meses (inclui o atual), preenchendo meses sem movimento com zero. */
function ultimos6(evolucao) {
  const porChave = new Map((evolucao || []).map((m) => [m.key, m]));
  const hoje = new Date();
  const out = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const m = porChave.get(key);
    out.push({ key, rotulo: rotuloMes(d.getFullYear(), d.getMonth()), receitas: m?.receitas || 0, despesas: m?.despesas || 0 });
  }
  return out;
}

function GraficoMeses({ meses }) {
  const max = Math.max(1, ...meses.flatMap((m) => [m.receitas, m.despesas]));
  const L = 320; const A = 132; const base = 112; const alturaUtil = 100;
  const larg = L / meses.length;
  const bw = Math.min(16, larg / 3);
  return (
    <div className="rounded-[18px] border border-mx-line/60 bg-mx-s1 px-3 pb-3 pt-4">
      <svg viewBox={`0 0 ${L} ${A}`} className="h-[150px] w-full" role="img" aria-label="Receitas e despesas dos últimos 6 meses">
        <line x1="0" x2={L} y1={base} y2={base} className="stroke-mx-line" strokeWidth="1" />
        {meses.map((m, i) => {
          const cx = i * larg + larg / 2;
          const hr = (m.receitas / max) * alturaUtil;
          const hd = (m.despesas / max) * alturaUtil;
          return (
            <g key={m.key}>
              <rect x={cx - bw - 1} y={base - hr} width={bw} height={hr} rx="3" className="fill-mx-tealhi">
                <title>{`${m.rotulo}: receitas ${brl(m.receitas)}`}</title>
              </rect>
              <rect x={cx + 1} y={base - hd} width={bw} height={hd} rx="3" className="fill-mx-text3">
                <title>{`${m.rotulo}: despesas ${brl(m.despesas)}`}</title>
              </rect>
              <text x={cx} y={A - 4} textAnchor="middle" className="fill-mx-text3" fontSize="11">{m.rotulo}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex items-center gap-4 px-1 text-[12px] text-mx-text2">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-mx-tealhi" aria-hidden />Receitas</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-mx-text3" aria-hidden />Despesas</span>
      </div>
    </div>
  );
}

export default function AbaCaixa() {
  const { carregando, erro } = useEstadoERP();
  const { comparativo, evolucaoMensal, custosPorCategoria, todasMovs, metas } = useFinanceiroGlobal();

  const meses = useMemo(() => ultimos6(evolucaoMensal), [evolucaoMensal]);
  const futuro = useMemo(() => futuroDe(todasMovs || [], Number(metas?.saldoMinimo) || 50000), [todasMovs, metas?.saldoMinimo]);
  const criticas = useMemo(() => futuro.semanas
    .map((s, i) => ({ ...s, inicio: diaISO(i * 7), fim: diaISO(i * 7 + 6) }))
    .filter((s) => s.abaixoMinimo), [futuro]);
  const top5 = (custosPorCategoria || []).slice(0, 5);
  const maxCat = top5[0]?.valor || 0;

  if (erro) return <Erro texto={erro} />;
  if (carregando) return <Esqueleto metricas={4} linhas={4} />;

  const { atual, anterior, deltaReceitas, deltaDespesas } = comparativo;
  const deltaMargem = atual.margem - anterior.margem;
  const semMovimento = !(todasMovs || []).length;

  if (semMovimento) {
    return <Vazio titulo="Sem movimentos financeiros" texto="Nenhuma receita ou despesa da empresa foi lançada ainda." />;
  }

  return (
    <>
      <Secao titulo="Este mês" descricao="Comparado ao mês anterior">
        <Grade>
          <Metrica rotulo="Receitas" valor={brlc(atual.receitas)} sub={`${sinalPct(deltaReceitas)} vs ${brlc(anterior.receitas)}`} />
          <Metrica rotulo="Despesas" valor={brlc(atual.despesas)} sub={`${sinalPct(deltaDespesas)} vs ${brlc(anterior.despesas)}`} />
          <Metrica
            rotulo="Resultado"
            valor={brlc(atual.lucro)}
            tom={atual.lucro < 0 ? 'bad' : 'ok'}
            sub={`Anterior ${brlc(anterior.lucro)}`}
          />
          <Metrica
            rotulo="Margem"
            valor={atual.receitas > 0 ? pct(atual.margem) : '—'}
            tom={atual.receitas > 0 ? (atual.margem < 0 ? 'bad' : atual.margem < (Number(metas?.margemMinima) || 0) ? 'warn' : 'ok') : undefined}
            sub={anterior.receitas > 0 ? `${deltaMargem >= 0 ? '+' : '−'}${Math.abs(Math.round(deltaMargem))} p.p. vs ${pct(anterior.margem)}` : 'Sem base no mês anterior'}
          />
        </Grade>
      </Secao>

      <Secao titulo="Últimos 6 meses">
        <GraficoMeses meses={meses} />
      </Secao>

      <Secao titulo="Projeção" descricao="Lançamentos em aberto com vencimento nos próximos dias">
        <Grupo>
          {[30, 60, 90].map((d) => (
            <Linha
              key={d}
              titulo={`Próximos ${d} dias`}
              sub={`Receber ${brlc(futuro[`receber${d}`])} · pagar ${brlc(futuro[`pagar${d}`])}`}
              valor={brlc(futuro[`saldo${d}`])}
              valorTom={futuro[`saldo${d}`] < 0 ? 'bad' : 'ok'}
              valorSub="saldo"
            />
          ))}
        </Grupo>
      </Secao>

      <Secao titulo="Semanas críticas" descricao={`Saldo projetado abaixo do mínimo de ${brlc(Number(metas?.saldoMinimo) || 50000)}`}>
        {criticas.length === 0 ? (
          <Grupo><Linha titulo={<Status tom="ok">Nenhuma semana abaixo do mínimo</Status>} sub="Próximas 13 semanas" /></Grupo>
        ) : (
          <Grupo>
            {criticas.slice(0, 6).map((s) => (
              <Linha
                key={s.label}
                icone={CalendarClock}
                iconeTom="bad"
                titulo={`${fmtData(s.inicio)} a ${fmtData(s.fim)}`}
                sub={<Status tom="bad">Abaixo do mínimo</Status>}
                valor={brlc(s.saldoAcumulado)}
                valorTom="bad"
                valorSub="saldo acumulado"
              />
            ))}
            {criticas.length > 6 && <Linha titulo={`Mais ${criticas.length - 6} semana(s) críticas`} sub="Veja o Painel Global no computador" />}
          </Grupo>
        )}
      </Secao>

      <Secao titulo="Maiores categorias de despesa" descricao="Histórico consolidado da empresa">
        {top5.length === 0 ? (
          <Grupo><Linha titulo="Nenhuma despesa registrada" /></Grupo>
        ) : (
          <Grupo>
            {top5.map((c) => (
              <div key={c.nome} className="px-4 py-3">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] text-mx-text">{c.nome}</span>
                  <span className="mx-tab shrink-0 text-[15px] font-semibold text-mx-text">{brlc(c.valor)}</span>
                </div>
                <Barra valor={c.valor} max={maxCat} tom="teal" altura={6} rotulo={c.nome} />
                <div className="mx-tab mt-1 text-[12px] text-mx-text3">{pct(c.percentual, 1)} do total</div>
              </div>
            ))}
          </Grupo>
        )}
      </Secao>
    </>
  );
}
