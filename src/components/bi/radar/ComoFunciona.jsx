import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REGRAS } from '@/services/bi/radarAlertas';

/** Critérios das regras em linguagem simples (espelham services/bi/radarAlertas.js). */
const CRITERIOS = {
  peca_parada: 'Peça parada numa etapa de fábrica (fabricação, solda ou pintura) por mais tempo que o normal: acima do tempo de 90% das peças que já passaram pela etapa (p90), com mínimo de 14 dias. Agrupado por obra e etapa.',
  ritmo_queda: 'Peças prontas (pintura concluída) nas últimas 2 semanas abaixo de 60% da média das 6 semanas anteriores.',
  obra_atraso: 'Obra ativa cujo término previsto (kg restante ÷ ritmo das últimas semanas) cai depois do prazo cadastrado — ou prazo já vencido com saldo a produzir.',
  gap_fisico_financeiro: 'Diferença de 15 pontos percentuais ou mais entre o % físico (kg pronto) e o % financeiro (medido) da obra.',
  receber_vencido: 'Medição ou receita sem recebimento há mais de 30 dias do vencimento.',
  despesa_vencida: 'Contas a pagar em aberto com vencimento já passado (agrupadas).',
  despesa_vence_7d: 'Contas a pagar em aberto que vencem nos próximos 7 dias (agrupadas).',
  custo_fora_curva: 'Despesa dos últimos 90 dias muito acima do padrão da própria categoria: z ≥ 3 (média + 3 desvios-padrão), exigindo ao menos 8 lançamentos na categoria.',
  estoque_critico: 'Itens de estoque com mínimo cadastrado e quantidade igual ou abaixo do mínimo.',
  dado_incompleto: 'Cadastro incompleto: obra ativa sem valor de contrato ou sem prazo de término; peças sem peso.',
};

export default function ComoFunciona() {
  const [aberto, setAberto] = useState(false);
  return (
    <section className="rounded-xl border border-slate-700/60 bg-slate-900/60">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls="radar-como-funciona"
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-xl"
      >
        <HelpCircle className="h-4 w-4 text-slate-400" aria-hidden />
        Como o Radar funciona
        <ChevronDown className={cn('ml-auto h-4 w-4 text-slate-400 transition-transform', aberto && 'rotate-180')} aria-hidden />
      </button>
      {aberto && (
        <div id="radar-como-funciona" className="border-t border-slate-700/60 px-4 py-3 text-xs text-slate-300 space-y-3">
          <p className="text-slate-400">
            O Radar analisa automaticamente os dados reais do ERP (produção, obras, financeiro, estoque) no escopo escolhido no
            seletor do topo e aponta o que saiu do normal. Cada anomalia tem um identificador estável: se você marcar como
            resolvida ou ignorada, a marcação continua valendo enquanto a mesma situação for detectada. Um alerta resolvido há
            mais de 7 dias que continua aparecendo recebe o selo <strong className="text-slate-200">Reincidente</strong> e volta
            para a lista de abertos.
          </p>
          <ul className="grid gap-2 md:grid-cols-2">
            {Object.entries(REGRAS).map(([chave, r]) => (
              <li key={chave} className="rounded-lg border border-slate-700/50 bg-slate-950/30 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-100">{r.rotulo}</span>
                  <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[11px] text-slate-400">{r.area}</span>
                </div>
                <p className="mt-1 text-slate-400">{CRITERIOS[chave] || 'Regra automática do Radar.'}</p>
              </li>
            ))}
          </ul>
          <p className="text-slate-500">
            Severidade: considera o tamanho do desvio (dias de atraso, kg envolvidos, valor) — Crítico pede ação imediata,
            Baixo é informativo.
          </p>
        </div>
      )}
    </section>
  );
}
