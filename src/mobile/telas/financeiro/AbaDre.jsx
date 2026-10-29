// ============================================================
// Financeiro > DRE — mesma conta da DREPage (escopo empresa)
// ============================================================
// calcularDRE + intervaloDoPeriodo; premissas lidas do mesmo localStorage
// (montex_dre_premissas) que a DREPage grava. Edição das premissas só no
// computador.
// ============================================================
import React, { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { useLancamentos, useMedicoes } from '@/contexts/ERPContext';
import { useReceitasManuais } from '@/utils/receitasSync';
import { calcularDRE, intervaloDoPeriodo } from '@/utils/dreCalc';
import { parseValorBR } from '@/utils/financeiroCalc';
import { Secao, Grupo, Linha, Metrica, Grade, Abas, Vazio, Erro, Esqueleto } from '../../kit';
import { brlc, brl, pct, data as fmtData } from '../../kit/fmt';
import { useEstadoERP } from './comum';

const PREMISSAS_KEY = 'montex_dre_premissas';
const PREMISSAS_PADRAO = { aliquotaImpostosPct: '0', depreciacaoValor: '0', aliquotaIRPct: '0' };
const lerPremissas = () => {
  try {
    const v = localStorage.getItem(PREMISSAS_KEY);
    return v ? { ...PREMISSAS_PADRAO, ...JSON.parse(v) } : PREMISSAS_PADRAO;
  } catch { return PREMISSAS_PADRAO; }
};

const PERIODOS = [
  { id: 'mes_atual', rotulo: 'Mês atual' },
  { id: 'mes_anterior', rotulo: 'Mês anterior' },
  { id: 'trimestre', rotulo: 'Trimestre' },
  { id: 'ano', rotulo: 'Ano' },
];

const tomDe = (v) => (v < 0 ? 'bad' : v > 0 ? 'ok' : undefined);

export default function AbaDre() {
  const { carregando, erro } = useEstadoERP();
  const { lancamentosDespesas = [] } = useLancamentos();
  const { medicoes = [] } = useMedicoes();
  const { receitas: receitasManuais = [] } = useReceitasManuais();
  const [periodo, setPeriodo] = useState('mes_atual');
  const [premissas] = useState(lerPremissas);

  const intervalo = useMemo(() => intervaloDoPeriodo(periodo), [periodo]);
  const dre = useMemo(() => calcularDRE({
    medicoes,
    receitasManuais,
    despesas: lancamentosDespesas,
    inicio: intervalo.inicio,
    fim: intervalo.fim,
    escopo: 'empresa',
    premissas: {
      aliquotaImpostosPct: parseValorBR(premissas.aliquotaImpostosPct),
      depreciacaoValor: parseValorBR(premissas.depreciacaoValor),
      aliquotaIRPct: parseValorBR(premissas.aliquotaIRPct),
    },
  }), [medicoes, receitasManuais, lancamentosDespesas, intervalo, premissas]);

  if (erro) return <Erro texto={erro} />;
  if (carregando) return <Esqueleto metricas={2} linhas={8} />;

  const semDados = dre.qtdMedicoes + dre.qtdReceitasManuais + dre.qtdDespesas === 0;
  const m = (v) => (dre.receitaLiquida > 0 ? `${pct(v, 1)} da receita líquida` : undefined);
  const p = dre.premissas;

  return (
    <>
      <Abas className="mt-4 px-0" itens={PERIODOS} valor={periodo} onChange={setPeriodo} />
      <p className="px-1 text-[13px] text-mx-text3">
        {intervalo.inicio ? `${fmtData(intervalo.inicio, { ano: true })} a ${fmtData(intervalo.fim, { ano: true })}` : 'Todo o período'} · resultado da empresa
      </p>

      {semDados ? (
        <Vazio icone={BarChart3} titulo="Sem lançamentos no período" texto="Nenhuma medição reconhecida, receita faturada ou despesa da fábrica neste período." />
      ) : (
        <>
          <Grade className="mt-4">
            <Metrica rotulo="Receita líquida" valor={brlc(dre.receitaLiquida)} sub={`${dre.qtdMedicoes} medição(ões) · ${dre.qtdReceitasManuais} receita(s)`} />
            <Metrica rotulo="Lucro líquido" valor={brlc(dre.lucroLiquido)} tom={tomDe(dre.lucroLiquido)} sub={dre.receitaLiquida > 0 ? `Margem ${pct(dre.margemLiquida, 1)}` : 'Sem receita no período'} />
          </Grade>

          <Secao titulo="Demonstração do resultado">
            <Grupo>
              <Linha titulo="Receita bruta" valor={brl(dre.receitaBruta)} sub={`Medições ${brlc(dre.receitaMedicoes)} · manuais ${brlc(dre.receitaManual)}`} destaque />
              <Linha
                titulo="Deduções"
                sub={`Retenções ${brlc(dre.retencoes)} · impostos ${brlc(dre.impostos)} (${p.aliquotaImpostosPct}%, estimativa)`}
                valor={dre.deducoes ? `− ${brl(dre.deducoes)}` : brl(0)}
              />
              <Linha titulo="Receita líquida" valor={brl(dre.receitaLiquida)} destaque />
              <Linha titulo="Custo dos serviços" valor={dre.cspTotal ? `− ${brl(dre.cspTotal)}` : brl(0)} sub="Material, mão de obra e produção" />
              <Linha titulo="Lucro bruto" valor={brl(dre.lucroBruto)} valorTom={tomDe(dre.lucroBruto)} valorSub={m(dre.margemBruta)} destaque />
              <Linha titulo="Despesas operacionais" valor={dre.despesasOperacionaisTotal ? `− ${brl(dre.despesasOperacionaisTotal)}` : brl(0)} sub="Administrativas e comerciais" />
              <Linha titulo="EBITDA" valor={brl(dre.ebitda)} valorTom={tomDe(dre.ebitda)} valorSub={m(dre.margemOperacional)} destaque />
              {(dre.depreciacao > 0 || dre.despesasFinanceirasTotal > 0) && (
                <Linha
                  titulo="Depreciação e financeiras"
                  sub={`Depreciação ${brlc(dre.depreciacao)} · financeiras ${brlc(dre.despesasFinanceirasTotal)}`}
                  valor={`− ${brl(dre.depreciacao + dre.despesasFinanceirasTotal)}`}
                />
              )}
              <Linha titulo="Resultado antes do IR" valor={brl(dre.resultadoAntesIR)} valorTom={tomDe(dre.resultadoAntesIR)} destaque />
              <Linha titulo="IR/CSLL" sub={`Estimativa ${p.aliquotaIRPct}%`} valor={dre.irCsll ? `− ${brl(dre.irCsll)}` : brl(0)} />
              <Linha titulo="Lucro líquido" valor={brl(dre.lucroLiquido)} valorTom={tomDe(dre.lucroLiquido)} valorSub={m(dre.margemLiquida)} destaque />
            </Grupo>
          </Secao>

          {dre.categorias.length > 0 && (
            <Secao titulo="Maiores despesas do período">
              <Grupo>
                {dre.categorias.slice(0, 6).map((c) => (
                  <Linha
                    key={c.categoria}
                    titulo={c.categoria}
                    sub={`${c.grupo === 'csp' ? 'Custo dos serviços' : c.grupo === 'financeira' ? 'Financeira' : 'Operacional'} · ${c.qtd} lançamento(s)`}
                    valor={brlc(c.valor)}
                  />
                ))}
              </Grupo>
            </Secao>
          )}

          <p className="mt-4 px-1 text-[12px] text-mx-text3">
            Material lançado na obra não entra no resultado da empresa. Premissas de impostos, depreciação e IR editáveis na DRE do computador.
          </p>
        </>
      )}
    </>
  );
}
