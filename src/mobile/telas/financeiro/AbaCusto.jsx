// ============================================================
// Financeiro > Custo/kg — versão nativa da aba Custo/kg do BI 360
// ============================================================
// Motor: useCustoKg(useBIData()) (biCustoKg). Custo = despesas SEM obra;
// produção = kg que entrou em pintura no histórico normalizado (regra 1e-bis).
// Margem por obra é ESTIMATIVA de fabricação; resultado oficial na GFO.
// ============================================================
import React from 'react';
import { AlertTriangle, Factory } from 'lucide-react';
import { useBIData } from '@/hooks/useBIData';
import { useCustoKg } from '@/hooks/useCustoKg';
import { Secao, Grupo, Linha, Metrica, Grade, Barra, Status, Vazio, Erro, Esqueleto } from '../../kit';
import { brl2, brlc, num, peso, pct } from '../../kit/fmt';
import { rotuloMes } from './comum';

const SITUACAO = {
  negativa: { tom: 'bad', rotulo: 'Negativa' },
  apertada: { tom: 'warn', rotulo: 'Apertada' },
  ok: { tom: 'ok', rotulo: 'Ok' },
  'sem dados': { tom: 'neutro', rotulo: 'Sem dados' },
};

const kgR = (v) => (v === null || v === undefined ? '—' : `${brl2(v)}/kg`);
const tMes = (v) => (v === null || v === undefined ? '—' : `${num(v, 1)} t/mês`);

function periodoMeses(meses = []) {
  if (!meses.length) return undefined;
  const rot = (k) => rotuloMes(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, true).replace('.', '');
  return meses.length === 1 ? `Média de ${rot(meses[0])}` : `Média de ${rot(meses[0])} a ${rot(meses[meses.length - 1])}`;
}

export default function AbaCusto() {
  const dados = useBIData({ empresa: true });
  const { analise: a, config } = useCustoKg(dados);
  const primeiraCarga = (dados.carregando && !dados.atualizadoEm) || !config.carregado;

  if (dados.erro && !a) return <Erro texto={dados.erro} onTentar={() => dados.recarregar()} />;
  if (primeiraCarga || !a) return <Esqueleto metricas={4} linhas={5} />;

  const semBase = a.custoKg === null;
  const preco = a.equilibrio.preco;
  const ocup = a.ocupacaoPct;

  return (
    <>
      {dados.erro && <Erro texto={`Histórico de produção não atualizado: ${dados.erro}`} onTentar={() => dados.recarregar()} />}

      <Secao titulo="Custo da fábrica" descricao={periodoMeses(a.base.meses)}>
        <Grade>
          <Metrica
            rotulo="Custo/kg hoje"
            valor={kgR(a.custoKg)}
            tom={a.custoKg === null ? undefined : a.custoKg > preco ? 'bad' : 'ok'}
            sub={`Preço de fabricação ${kgR(preco)}`}
          />
          <Metrica
            rotulo="Custo/kg 2027"
            valor={kgR(a.custoKg2027)}
            tom={a.custoKg2027 === null ? undefined : a.custoKg2027 > preco ? 'bad' : 'warn'}
            sub="Com reajustes previstos"
          />
          <Metrica
            rotulo="Equilíbrio"
            valor={tMes(a.equilibrio.t2026)}
            tom={a.equilibrio.t2026 !== null && a.base.tMes < a.equilibrio.t2026 ? 'bad' : undefined}
            sub={`2027: ${tMes(a.equilibrio.t2027)}`}
          />
          <Metrica
            rotulo="Ocupação"
            valor={pct(ocup)}
            tom={ocup === null ? undefined : ocup < 50 ? 'warn' : 'ok'}
            sub={`${num(a.base.tMes, 1)} de ${num(a.cfg.capacidadeTMes)} t/mês`}
          />
        </Grade>
        {ocup !== null && (
          <div className="mt-3 rounded-[14px] border border-mx-line/60 bg-mx-s1 p-3.5">
            <Barra
              valor={a.base.tMes}
              max={Number(a.cfg.capacidadeTMes) || 1}
              tom={ocup < 50 ? 'warn' : 'ok'}
              rotulo="Ocupação da fábrica"
              marcas={a.equilibrio.t2026 ? [{ em: a.equilibrio.t2026, rotulo: 'Equilíbrio' }] : []}
            />
            <p className="mt-2 text-[12px] text-mx-text3">
              {a.equilibrio.t2026 ? `Traço = equilíbrio em ${num(a.equilibrio.t2026, 1)} t/mês. ` : ''}
              Fixo {brlc(a.base.fixoMes)}/mês · variável {kgR(a.base.varKg)}
            </p>
          </div>
        )}
        {semBase && (
          <p className="mt-2 px-1 text-[13px] text-mx-warn">Sem produção apontada na janela; o custo por kg não pode ser calculado.</p>
        )}
      </Secao>

      <Secao titulo="Custo por volume" descricao="Quanto o custo/kg cai com mais toneladas por mês">
        <Grupo>
          {a.tabelaVolume.map((l) => (
            <Linha
              key={l.tMes}
              titulo={`${num(l.tMes, 1)} t/mês${l.atual ? ' · atual' : ''}`}
              destaque={l.atual}
              sub={`2026 ${kgR(l.custo2026)} · 2027 ${kgR(l.custo2027)}`}
              valor={l.resultadoMes2027 === null ? '—' : brlc(l.resultadoMes2027)}
              valorTom={l.resultadoMes2027 === null ? undefined : l.resultadoMes2027 < 0 ? 'bad' : 'ok'}
              valorSub={l.margemKg2027 === null ? undefined : `${kgR(l.margemKg2027)} em 2027`}
            />
          ))}
        </Grupo>
        {a.globalEquivalente && (
          <p className="mt-2 px-1 text-[12px] text-mx-text3">
            Preço global mínimo em 2027 no volume atual: {kgR(a.globalEquivalente.globalMin)} (aço {kgR(a.globalEquivalente.aco)}, montagem {kgR(a.globalEquivalente.montagem)}).
          </p>
        )}
      </Secao>

      <Secao titulo="Margem estimada por obra" descricao="Receita de fabricação/kg menos custo/kg atual">
        {a.obras.length === 0 ? (
          <Vazio icone={Factory} titulo="Nenhuma obra ativa" texto="Sem obras ativas no escopo selecionado." />
        ) : (
          <Grupo>
            {a.obras.map((o) => {
              const s = SITUACAO[o.situacao] || SITUACAO['sem dados'];
              return (
                <Linha
                  key={o.id}
                  titulo={o.nome}
                  sub={<Status tom={s.tom}>{s.rotulo} · resta {peso(o.kgRestante)}</Status>}
                  valor={o.margemKg === null ? '—' : kgR(o.margemKg)}
                  valorTom={s.tom === 'neutro' ? undefined : s.tom}
                  valorSub={o.receitaKg === null ? o.fonte : `receita ${kgR(o.receitaKg)}`}
                />
              );
            })}
          </Grupo>
        )}
        <p className="mt-2 px-1 text-[12px] text-mx-text3">
          Carteira a fabricar: {peso(a.carteira.kg)}
          {a.carteira.mesesNoRitmo !== null ? ` · ${num(a.carteira.mesesNoRitmo, 1)} meses no ritmo atual` : ''}. Resultado oficial de cada obra fica na gestão financeira da obra.
        </p>
      </Secao>

      {a.alertas.length > 0 && (
        <Secao titulo="Avisos sobre os dados">
          <Grupo>
            {a.alertas.map((al, i) => (
              <div key={`${al.tipo}-${i}`} className="flex gap-3 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-mx-warn" aria-hidden />
                <div className="min-w-0 text-[14px] text-mx-text">
                  {al.texto}
                  {al.itens?.length > 0 && <div className="mt-1 text-[12px] text-mx-text3">{al.itens.slice(0, 5).join(' · ')}</div>}
                </div>
              </div>
            ))}
          </Grupo>
        </Secao>
      )}

      <p className="mt-4 px-1 text-[12px] text-mx-text3">Premissas editáveis no BI 360 do computador.</p>
    </>
  );
}
