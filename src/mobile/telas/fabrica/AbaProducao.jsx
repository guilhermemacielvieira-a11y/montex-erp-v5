// ============================================================
// Fábrica · Produção — ritmo, gargalo, lead time, WIP e ranking
// ============================================================
// Fonte única: useBIData().producao (histórico normalizado — CLAUDE.md 1e).
// Nunca soma producao_historico bruto. "Peça pronta" = saiu da pintura.
// Recebe `bi` (resultado de useBIData) da tela Fábrica.
// ============================================================
import React, { useMemo } from 'react';
import { Activity, Timer, Users, AlertTriangle } from 'lucide-react';
import { rotuloSemana } from '@/services/bi/biCore';
import { Secao, Grupo, Linha, Metrica, Grade, Status, Vazio, Erro, Esqueleto, Barra } from '../../kit';
import { num, kg, peso, pct } from '../../kit/fmt';

const ROTULO = {
  aguardando: 'Aguardando corte',
  fabricacao: 'Fabricação',
  solda: 'Solda',
  pintura: 'Pintura',
  expedido: 'Fila de embarque',
  enviado: 'Em obra',
  entregue: 'Entregue',
};

const dias = (v) => (v === null || v === undefined ? '—' : `${num(v, v < 10 ? 1 : 0)} ${v === 1 ? 'dia' : 'dias'}`);

/** Barras das últimas semanas (kg de peças prontas). SVG puro com tokens. */
function GraficoRitmo({ semanas, media }) {
  const max = Math.max(1, ...semanas.map((s) => s.kg), media || 0);
  const W = 320, H = 120, base = 100, larg = W / semanas.length;
  const yMedia = base - (media / max) * (base - 8);
  return (
    <div className="rounded-[18px] border border-mx-line/60 bg-mx-s1 px-3 pb-2 pt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[132px] w-full" role="img" aria-label="Peças prontas por semana, últimas 8 semanas">
        {semanas.map((s, i) => {
          const h = (s.kg / max) * (base - 8);
          const atual = i === semanas.length - 1;
          return (
            <g key={s.semana}>
              <rect
                x={i * larg + larg * 0.18}
                y={base - h}
                width={larg * 0.64}
                height={Math.max(h, s.kg > 0 ? 2 : 0)}
                rx={3}
                className={atual ? 'fill-mx-tealhi/50' : 'fill-mx-tealhi'}
              />
              <text x={i * larg + larg / 2} y={H - 4} textAnchor="middle" className="fill-mx-text3" style={{ fontSize: 10 }}>
                {rotuloSemana(s.semana)}
              </text>
            </g>
          );
        })}
        {media > 0 && (
          <line x1={0} x2={W} y1={yMedia} y2={yMedia} className="stroke-mx-warn" strokeWidth={1} strokeDasharray="4 3" />
        )}
        <line x1={0} x2={W} y1={base} y2={base} className="stroke-mx-line" strokeWidth={1} />
      </svg>
      <div className="flex items-center gap-4 px-1 pb-1 text-[12px] text-mx-text3">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-mx-tealhi" aria-hidden />kg prontos na semana</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 bg-mx-warn" aria-hidden />média de 4 semanas</span>
      </div>
    </div>
  );
}

export default function AbaProducao({ bi }) {
  const { producao, carregando, erro, recarregar } = bi;

  const v = useMemo(() => {
    const ritmo = producao?.ritmo || [];
    const ult = ritmo[ritmo.length - 1];
    const semanas = ritmo.slice(-8).map((r) => ({ semana: r.semana, kg: r.pintura }));
    const wip = (producao?.wip?.resumo || []).filter((w) => ['aguardando', 'fabricacao', 'solda', 'pintura', 'expedido'].includes(w.etapa));
    const wipMax = Math.max(1, ...wip.map((w) => w.kg));
    return {
      semanaAtual: ult?.pintura || 0,
      semanas,
      wip,
      wipMax,
      gargaloLinha: producao?.gargalo?.etapa ? producao.gargalo.linhas.find((l) => l.etapa === producao.gargalo.etapa) : null,
      ranking: (producao?.ranking || []).slice(0, 5),
    };
  }, [producao]);

  if (erro) return <Erro texto={`Não foi possível carregar o histórico de produção. ${erro}`} onTentar={() => recarregar(true)} />;
  if (carregando && !producao?.transicoes) return <Esqueleto metricas={4} linhas={4} />;

  const t = producao.tendencia || {};
  const variacao = t.variacaoPct;
  const g = v.gargaloLinha;

  return (
    <>
      <Secao titulo="Ritmo de peças prontas" descricao="kg que saíram da pintura">
        <Grade>
          <Metrica rotulo="Esta semana" valor={peso(v.semanaAtual)} sub="semana em andamento" />
          <Metrica
            rotulo="Média de 4 semanas"
            valor={peso(t.kgSemanaAtual)}
            sub={variacao === null || variacao === undefined ? 'sem base anterior' : `${variacao >= 0 ? '+' : '−'}${pct(Math.abs(variacao))} vs 4 anteriores`}
            tom={variacao === null || variacao === undefined ? undefined : variacao >= 0 ? 'ok' : 'bad'}
          />
        </Grade>
        <div className="mt-2.5">
          {v.semanas.some((s) => s.kg > 0)
            ? <GraficoRitmo semanas={v.semanas} media={t.kgSemanaAtual || 0} />
            : <Grupo><Vazio icone={Activity} titulo="Sem produção apontada" texto="Nenhuma peça saiu da pintura nas últimas 8 semanas." /></Grupo>}
        </div>
      </Secao>

      <Secao titulo="Gargalo" descricao="semanas de fila = kg parado ÷ saída semanal">
        <Grupo>
          {g ? (
            <Linha
              icone={AlertTriangle}
              iconeTom={g.travada ? 'bad' : 'warn'}
              titulo={ROTULO[g.etapa]}
              sub={g.travada ? `${peso(g.wipKg)} parados sem saída nas últimas 4 semanas` : `${peso(g.wipKg)} na etapa · saída de ${peso(g.saidaKgSemana)}/semana`}
              direita={<Status tom={g.travada ? 'bad' : 'warn'}>{g.travada ? 'Travada' : `${num(g.semanasFila, 1)} sem.`}</Status>}
            />
          ) : (
            <Linha icone={Activity} iconeTom="ok" titulo="Sem gargalo" sub="Nenhuma etapa da fábrica com fila acumulada" />
          )}
          {(producao.gargalo?.linhas || []).filter((l) => l.etapa !== g?.etapa).map((l) => (
            <Linha
              key={l.etapa}
              titulo={ROTULO[l.etapa]}
              sub={`${peso(l.wipKg)} na etapa · saída ${peso(l.saidaKgSemana)}/semana`}
              valor={l.travada ? 'Travada' : l.semanasFila === null ? '—' : `${num(l.semanasFila, 1)} sem.`}
              valorTom={l.travada ? 'bad' : undefined}
            />
          ))}
        </Grupo>
      </Secao>

      <Secao titulo="Lead time por etapa" descricao="tempo entre entrar e sair da etapa (inclui espera)">
        <Grupo>
          {(producao.leadTimes || []).map((l) => (
            <Linha
              key={l.etapa}
              icone={Timer}
              iconeTom="teal"
              titulo={ROTULO[l.etapa]}
              sub={l.amostras ? `${num(l.amostras)} passagens medidas · 90% em até ${dias(l.p90Dias)}` : 'Sem passagens medidas'}
              valor={dias(l.medianaDias)}
              valorSub="mediana"
            />
          ))}
        </Grupo>
      </Secao>

      <Secao titulo="Em processo agora" descricao="peças por etapa e idade mediana na etapa">
        <Grupo>
          {v.wip.map((w) => (
            <div key={w.etapa} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] text-mx-text">{ROTULO[w.etapa]}</span>
                <span className="mx-tab text-[15px] font-semibold text-mx-text">{kg(w.kg)}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-3 text-[13px] text-mx-text2">
                <span>{num(w.pecas)} {w.pecas === 1 ? 'marca' : 'marcas'}</span>
                {w.idadeMedianaDias !== null && <span className="mx-tab text-mx-text3">há {dias(w.idadeMedianaDias)}</span>}
              </div>
              <div className="mt-2"><Barra valor={w.kg} max={v.wipMax} tom={w.etapa === 'expedido' ? 'warn' : w.etapa === 'aguardando' ? 'neutro' : 'teal'} altura={6} rotulo={ROTULO[w.etapa]} /></div>
            </div>
          ))}
        </Grupo>
      </Secao>

      <Secao titulo="Quem mais produziu" descricao="kg concluídos nos últimos 30 dias">
        <Grupo>
          {v.ranking.length === 0 ? (
            <Vazio icone={Users} titulo="Sem apontamentos" texto="Nenhum funcionário com produção apontada nos últimos 30 dias." />
          ) : v.ranking.map((r, i) => {
            const principal = Object.entries(r.etapas || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
            return (
              <Linha
                key={r.funcionario}
                titulo={`${i + 1}. ${r.funcionario}`}
                sub={`${num(r.pecas)} ${r.pecas === 1 ? 'movimento' : 'movimentos'}${principal ? ` · mais em ${ROTULO[principal].toLowerCase()}` : ''}`}
                valor={kg(r.kg)}
              />
            );
          })}
        </Grupo>
        {v.ranking.length > 0 && (
          <p className="mt-2 px-1 text-[12px] text-mx-text3">
            Kg puro não mede desempenho individual. A régua de horas-padrão está na Produção por funcionário, no computador.
          </p>
        )}
      </Secao>
    </>
  );
}
