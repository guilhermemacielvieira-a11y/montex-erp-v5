// ============================================================
// Financeiro (app da diretoria) — rota /m/financeiro
// ============================================================
// Abas via ?aba=caixa|receber|pagar|dre|custo (padrão caixa).
//  • Caixa: caixa e resultado da EMPRESA (useFinanceiroGlobal — regra 1b)
//  • A receber: medições reconhecidas + receitas manuais em aberto
//  • A pagar: despesas da fábrica (sem obra) em aberto + nova despesa
//  • DRE: calcularDRE escopo empresa (mesmas premissas da DREPage)
//  • Custo/kg: motor do BI 360 (useCustoKg)
// ============================================================
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Tela, Abas, BotaoIcone } from '../../kit';
import AbaCaixa from './AbaCaixa';
import AbaReceber from './AbaReceber';
import AbaPagar from './AbaPagar';
import AbaDre from './AbaDre';
import AbaCusto from './AbaCusto';
import NovaDespesa from './NovaDespesa';
import { usePodeEditar } from './comum';

export const ABAS_FINANCEIRO = [
  { id: 'caixa', rotulo: 'Caixa' },
  { id: 'receber', rotulo: 'A receber' },
  { id: 'pagar', rotulo: 'A pagar' },
  { id: 'dre', rotulo: 'DRE' },
  { id: 'custo', rotulo: 'Custo/kg' },
];

const SUBTITULO = {
  caixa: 'Caixa e resultado da empresa',
  receber: 'Medições e receitas em aberto',
  pagar: 'Despesas da fábrica em aberto',
  dre: 'Demonstração do resultado',
  custo: 'Custo da fábrica por kg',
};

export default function Financeiro() {
  const [params, setParams] = useSearchParams();
  const pedida = params.get('aba');
  const aba = ABAS_FINANCEIRO.some((a) => a.id === pedida) ? pedida : 'caixa';
  const podeEditar = usePodeEditar();
  const [novaAberta, setNovaAberta] = useState(false);

  const trocarAba = (id) => {
    const p = new URLSearchParams(params);
    if (id === 'caixa') p.delete('aba'); else p.set('aba', id);
    setParams(p, { replace: true });
  };

  return (
    <Tela
      titulo="Financeiro"
      subtitulo={SUBTITULO[aba]}
      acoes={aba === 'pagar' && podeEditar ? (
        <BotaoIcone icone={Plus} rotulo="Nova despesa" onClick={() => setNovaAberta(true)} />
      ) : null}
      cabecalhoExtra={<Abas itens={ABAS_FINANCEIRO} valor={aba} onChange={trocarAba} />}
    >
      {aba === 'caixa' && <AbaCaixa />}
      {aba === 'receber' && <AbaReceber />}
      {aba === 'pagar' && <AbaPagar />}
      {aba === 'dre' && <AbaDre />}
      {aba === 'custo' && <AbaCusto />}
      {podeEditar && <NovaDespesa open={novaAberta} onClose={() => setNovaAberta(false)} />}
    </Tela>
  );
}
