// ============================================================
// RADAR DE ALERTAS — detecção de anomalias com dados reais
// ============================================================
// Cada regra é pura e devolve alertas no formato:
//   { id, regra, severidade: 'critico'|'alto'|'medio'|'baixo', obraId,
//     titulo, detalhe, valor, unidade, link, criadoEm }
// O `id` é estável (mesma anomalia → mesmo id) para o status
// (reconhecido / resolvido / ignorado) persistir entre recargas.
// ============================================================

import { despesaCancelada } from '../../utils/financeiroStatus';
import { num, r1, r2, dataLocal, diasEntre, media, desvioPadrao, ROTULO_ETAPA, isoLocal } from './biCore';

export const SEVERIDADES = {
  critico: { rotulo: 'Crítico', ordem: 0, cor: '#ef4444' },
  alto: { rotulo: 'Alto', ordem: 1, cor: '#f97316' },
  medio: { rotulo: 'Médio', ordem: 2, cor: '#eab308' },
  baixo: { rotulo: 'Baixo', ordem: 3, cor: '#64748b' },
};

export const REGRAS = {
  peca_parada: { rotulo: 'Peças paradas', area: 'Produção' },
  ritmo_queda: { rotulo: 'Queda de ritmo', area: 'Produção' },
  obra_atraso: { rotulo: 'Obra com previsão de atraso', area: 'Obras' },
  gap_fisico_financeiro: { rotulo: 'Físico × financeiro descasado', area: 'Obras' },
  receber_vencido: { rotulo: 'Recebimento em atraso', area: 'Financeiro' },
  despesa_vencida: { rotulo: 'Conta a pagar vencida', area: 'Financeiro' },
  despesa_vence_7d: { rotulo: 'Contas vencendo em 7 dias', area: 'Financeiro' },
  custo_fora_curva: { rotulo: 'Despesa fora da curva', area: 'Financeiro' },
  estoque_critico: { rotulo: 'Estoque abaixo do mínimo', area: 'Suprimentos' },
  dado_incompleto: { rotulo: 'Cadastro incompleto', area: 'Qualidade de dados' },
};

const brl = (v) => num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const kg = (v) => `${Math.round(num(v)).toLocaleString('pt-BR')} kg`;

/** Peças paradas numa etapa de fábrica além do normal (p90 histórico, mín. 14 dias). */
export function regraPecasParadas({ wipItens = [], leadTimes = [], nomeObra = (id) => id }) {
  const limite = {};
  leadTimes.forEach((l) => { limite[l.etapa] = Math.max(14, num(l.p90Dias)); });
  const grupos = new Map();
  wipItens.forEach((i) => {
    const lim = limite[i.etapa] ?? 14;
    if (i.idadeDias === null || i.idadeDias <= lim) return;
    const k = `${i.obraId}|${i.etapa}`;
    if (!grupos.has(k)) grupos.set(k, { obraId: i.obraId, etapa: i.etapa, lim, itens: [] });
    grupos.get(k).itens.push(i);
  });
  return [...grupos.values()].map((g) => {
    const totalKg = g.itens.reduce((s, i) => s + i.kg, 0);
    const maisAntiga = Math.max(...g.itens.map((i) => i.idadeDias));
    const sev = maisAntiga > g.lim * 3 || totalKg > 20000 ? 'critico' : maisAntiga > g.lim * 2 || totalKg > 5000 ? 'alto' : 'medio';
    const exemplos = g.itens.sort((a, b) => b.idadeDias - a.idadeDias).slice(0, 5).map((i) => `${i.marca} (${i.idadeDias}d)`).join(', ');
    return {
      id: `peca_parada:${g.obraId}:${g.etapa}`, regra: 'peca_parada', severidade: sev, obraId: g.obraId,
      titulo: `${g.itens.length} peça(s) parada(s) em ${ROTULO_ETAPA[g.etapa]} — ${nomeObra(g.obraId)}`,
      detalhe: `${kg(totalKg)} há mais de ${Math.round(g.lim)} dias (normal da etapa). Mais antigas: ${exemplos}.`,
      valor: r1(totalKg), unidade: 'kg', link: '/KanbanProducaoIntegrado',
    };
  });
}

/** Queda de ritmo: últimas 2 semanas < 60% da média das 6 anteriores. */
export function regraRitmo({ ritmo = [] }) {
  const v = ritmo.map((r) => r.pintura);
  if (v.length < 8) return [];
  const rec = media(v.slice(-2)) || 0;
  const base = media(v.slice(-8, -2)) || 0;
  if (base <= 0 || rec >= base * 0.6) return [];
  const queda = (1 - rec / base) * 100;
  return [{
    id: `ritmo_queda:${ritmo[ritmo.length - 1].semana}`, regra: 'ritmo_queda', severidade: queda > 70 ? 'critico' : 'alto', obraId: null,
    titulo: `Ritmo de peças prontas caiu ${Math.round(queda)}%`,
    detalhe: `Últimas 2 semanas: ${kg(rec)}/semana. Média das 6 anteriores: ${kg(base)}/semana.`,
    valor: r1(queda), unidade: '%', link: '/BI360?aba=producao',
  }];
}

/** Obras com previsão de término depois do prazo, ou prazo vencido com saldo. */
export function regraAtrasoObras({ indicadores = [] }) {
  return indicadores.filter((i) => i.ativa && (i.atrasoDias || 0) > 0).map((i) => ({
    id: `obra_atraso:${i.id}`, regra: 'obra_atraso', severidade: i.atrasoDias > 60 ? 'critico' : i.atrasoDias > 15 ? 'alto' : 'medio', obraId: i.id,
    titulo: `${i.nome}: previsão ${i.atrasoDias} dias após o prazo`,
    detalhe: i.previsaoFim
      ? `Faltam ${kg(i.kgRestante)} no ritmo de ${kg(i.ritmoKgSemana)}/semana → término previsto ${i.previsaoFim} (prazo ${i.prazo}).`
      : `Prazo ${i.prazo} vencido com ${kg(i.kgRestante)} a produzir e sem ritmo nas últimas 4 semanas.`,
    valor: i.atrasoDias, unidade: 'dias', link: '/BI360?aba=obras',
  }));
}

/** Gap físico × financeiro acima de 15 pontos. */
export function regraGap({ indicadores = [] }) {
  return indicadores.filter((i) => i.ativa && i.gapPp !== null && Math.abs(i.gapPp) >= 15).map((i) => {
    const adiantado = i.gapPp > 0;
    return {
      id: `gap:${i.id}:${adiantado ? 'fin' : 'fis'}`, regra: 'gap_fisico_financeiro', severidade: Math.abs(i.gapPp) >= 30 ? 'alto' : 'medio', obraId: i.id,
      titulo: adiantado ? `${i.nome}: medição ${r1(i.gapPp)} pp à frente da produção` : `${i.nome}: produção ${r1(-i.gapPp)} pp à frente da medição`,
      detalhe: `Físico ${i.fisicoPct}% × financeiro ${i.financeiroPct}%. ${adiantado ? 'Risco de faturar sem entregar.' : 'Há produção pronta que ainda não foi medida (dinheiro a faturar).'}`,
      valor: r1(i.gapPp), unidade: 'pp', link: '/GestaoFinanceiraObra',
    };
  });
}

/** Recebimentos (medições/receitas reconhecidas) não pagos há mais de 30 dias. */
export function regraReceber({ receitas = [], hoje = new Date(), nomeObra = (id) => id }) {
  return receitas.filter((r) => !r.recebido && r.vencimento && diasEntre(r.vencimento, hoje) > 30).map((r) => {
    const atraso = diasEntre(r.vencimento, hoje);
    return {
      id: `receber:${r.id}`, regra: 'receber_vencido', severidade: atraso > 90 ? 'critico' : atraso > 60 ? 'alto' : 'medio', obraId: r.obraId,
      titulo: `${r.descricao} — ${brl(r.valor)} sem recebimento há ${atraso} dias`,
      detalhe: `${r.obraId ? nomeObra(r.obraId) + ' · ' : ''}vencimento/medição em ${isoLocal(r.vencimento)}.`,
      valor: r2(r.valor), unidade: 'R$', link: '/ReceitasPage',
    };
  });
}

/** Contas a pagar vencidas e vencendo em 7 dias (agrupadas). */
export function regraPagar({ despesas = [], hoje = new Date() }) {
  const abertas = despesas.filter((d) => !d.pago && d.vencimento);
  const vencidas = abertas.filter((d) => diasEntre(d.vencimento, hoje) > 0);
  const semana = abertas.filter((d) => { const x = diasEntre(hoje, d.vencimento); return x >= 0 && x <= 7; });
  const out = [];
  if (vencidas.length) {
    const total = vencidas.reduce((s, d) => s + d.valor, 0);
    const maisAntiga = Math.max(...vencidas.map((d) => diasEntre(d.vencimento, hoje)));
    out.push({
      id: `despesa_vencida:${isoLocal(hoje)}`, regra: 'despesa_vencida', severidade: maisAntiga > 30 || total > 50000 ? 'critico' : 'alto', obraId: null,
      titulo: `${vencidas.length} conta(s) a pagar vencida(s) — ${brl(total)}`,
      detalhe: `Mais antiga com ${maisAntiga} dias. Maiores: ${vencidas.sort((a, b) => b.valor - a.valor).slice(0, 3).map((d) => `${d.fornecedor} ${brl(d.valor)}`).join(', ')}.`,
      valor: r2(total), unidade: 'R$', link: '/DespesasPage',
    });
  }
  if (semana.length) {
    const total = semana.reduce((s, d) => s + d.valor, 0);
    out.push({
      id: `despesa_vence_7d:${isoLocal(hoje)}`, regra: 'despesa_vence_7d', severidade: 'baixo', obraId: null,
      titulo: `${semana.length} conta(s) vencem nos próximos 7 dias — ${brl(total)}`,
      detalhe: semana.sort((a, b) => a.vencimento - b.vencimento).slice(0, 4).map((d) => `${isoLocal(d.vencimento)} ${d.fornecedor} ${brl(d.valor)}`).join(' · '),
      valor: r2(total), unidade: 'R$', link: '/DespesasPage',
    });
  }
  return out;
}

/**
 * Despesa fora da curva: valor > média + 3σ da própria categoria (mín. 8
 * lançamentos na categoria) nos últimos 90 dias.
 */
export function regraCustoForaCurva({ despesasBrutas = [], hoje = new Date() }) {
  const porCat = new Map();
  despesasBrutas.filter((d) => !despesaCancelada(d.status)).forEach((d) => {
    const c = d.categoria || 'Outros';
    if (!porCat.has(c)) porCat.set(c, []);
    porCat.get(c).push(d);
  });
  const out = [];
  porCat.forEach((lista, cat) => {
    if (lista.length < 8) return;
    const vals = lista.map((d) => num(d.valor));
    const m = media(vals); const sd = desvioPadrao(vals);
    if (!sd) return;
    lista.forEach((d) => {
      const data = dataLocal(d.dataEmissao ?? d.data_emissao ?? d.data);
      if (!data || diasEntre(data, hoje) > 90) return;
      const z = (num(d.valor) - m) / sd;
      if (z < 3) return;
      out.push({
        id: `custo:${d.id}`, regra: 'custo_fora_curva', severidade: z > 5 ? 'alto' : 'medio', obraId: d.obraId ?? d.obra_id ?? null,
        titulo: `${cat}: ${brl(d.valor)} é ${r1(num(d.valor) / m)}× a média da categoria`,
        detalhe: `${d.descricao || '-'} · ${d.fornecedor || 'sem fornecedor'} · ${isoLocal(data)}. Média da categoria ${brl(m)} (z = ${r1(z)}). Confira valor/categoria.`,
        valor: r2(d.valor), unidade: 'R$', link: '/DespesasPage',
      });
    });
  });
  return out;
}

/** Estoque abaixo do mínimo (agrupado). */
export function regraEstoque({ estoque = [] }) {
  const criticos = estoque.filter((e) => num(e.minimo) > 0 && num(e.quantidade) <= num(e.minimo));
  if (!criticos.length) return [];
  const zerados = criticos.filter((e) => num(e.quantidade) <= 0).length;
  return [{
    id: `estoque_critico:${criticos.length}:${zerados}`, regra: 'estoque_critico', severidade: zerados > 0 ? 'alto' : 'medio', obraId: null,
    titulo: `${criticos.length} item(ns) de estoque no mínimo ou abaixo${zerados ? ` (${zerados} zerado[s])` : ''}`,
    detalhe: criticos.slice(0, 6).map((e) => `${e.descricao || e.nome || e.codigo}: ${num(e.quantidade)} ${e.unidade || ''} (mín ${num(e.minimo)})`).join(' · '),
    valor: criticos.length, unidade: 'itens', link: '/EstoquePageV2',
  }];
}

/** Qualidade de dados: obras ativas sem valor de contrato / prazo; peças sem peso. */
export function regraDados({ indicadores = [], pecas = [] }) {
  const out = [];
  const semContrato = indicadores.filter((i) => i.ativa && i.semContrato);
  if (semContrato.length) {
    out.push({
      id: `dados:contrato:${semContrato.map((i) => i.id).join(',')}`, regra: 'dado_incompleto', severidade: 'medio', obraId: null,
      titulo: `${semContrato.length} obra(s) ativa(s) sem valor de contrato`,
      detalhe: `${semContrato.map((i) => i.nome).join(', ')}. Sem o valor não há % financeiro, carteira nem margem.`,
      valor: semContrato.length, unidade: 'obras', link: '/GestaoObrasPage',
    });
  }
  const semPrazo = indicadores.filter((i) => i.ativa && !i.prazo);
  if (semPrazo.length) {
    out.push({
      id: `dados:prazo:${semPrazo.map((i) => i.id).join(',')}`, regra: 'dado_incompleto', severidade: 'baixo', obraId: null,
      titulo: `${semPrazo.length} obra(s) ativa(s) sem prazo de término`,
      detalhe: `${semPrazo.map((i) => i.nome).join(', ')}. Sem prazo não há curva S planejada nem alerta de atraso.`,
      valor: semPrazo.length, unidade: 'obras', link: '/GestaoObrasPage',
    });
  }
  const semPeso = pecas.filter((p) => !(num(p.pesoTotal ?? p.peso_total) > 0) && !(num(p.pesoUnitario ?? p.peso_unitario) > 0));
  if (semPeso.length) {
    out.push({
      id: `dados:peso:${semPeso.length}`, regra: 'dado_incompleto', severidade: 'baixo', obraId: null,
      titulo: `${semPeso.length} peça(s) sem peso cadastrado`,
      detalhe: 'Peças sem peso não entram em kg produzido, curva S nem previsão de término.',
      valor: semPeso.length, unidade: 'peças', link: '/KanbanProducaoIntegrado',
    });
  }
  return out;
}

/** Roda todas as regras e ordena por severidade. */
export function gerarAlertas(ctx) {
  const lista = [
    ...regraPecasParadas(ctx),
    ...regraRitmo(ctx),
    ...regraAtrasoObras(ctx),
    ...regraGap(ctx),
    ...regraReceber(ctx),
    ...regraPagar(ctx),
    ...regraCustoForaCurva(ctx),
    ...regraEstoque(ctx),
    ...regraDados(ctx),
  ];
  return lista.sort((a, b) => SEVERIDADES[a.severidade].ordem - SEVERIDADES[b.severidade].ordem || num(b.valor) - num(a.valor));
}

