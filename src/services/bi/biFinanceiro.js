// ============================================================
// BI — Financeiro: faturado × recebido × pago por mês, aging,
// fluxo de caixa projetado e curva ABC de fornecedores
// ============================================================
// Escopo (CLAUDE.md 1b/1c):
//   - Geral  → caixa da EMPRESA: receitas pelo total (medições + receitas
//              manuais) e despesas SEM obra (material de obra fica fora).
//   - Obra/grupo → só aquela(s) obra(s): medições + receitas manuais da
//              obra × despesas (material) lançadas na obra.
// ============================================================

import {
  medicaoReconhecida, medicaoRecebida, receitaRecebida, receitaCancelada,
  despesaPaga, despesaCancelada,
} from '../../utils/financeiroStatus';
import { num, r2, dataLocal, diasEntre, somaDias, chaveMes, chaveSemana, semanasEntre, obraDe } from './biCore';

/** Normaliza receitas/despesas do escopo em movimentos comparáveis. */
export function movimentosDoEscopo({ medicoes = [], receitasManuais = [], despesas = [], obraIds = null }) {
  const naObra = (x) => !obraIds || obraIds.includes(obraDe(x));
  const receitas = [];
  (medicoes || []).filter(naObra).forEach((m) => {
    if (!medicaoReconhecida(m.status)) return; // previstas/rejeitadas fora
    receitas.push({
      id: m.id, origem: 'medicao', obraId: obraDe(m),
      data: dataLocal(m.dataMedicao ?? m.data_medicao),
      vencimento: dataLocal(m.dataVencimento ?? m.data_vencimento ?? m.dataMedicao ?? m.data_medicao),
      valor: num(m.valorBruto ?? m.valor_bruto), recebido: medicaoRecebida(m.status),
      descricao: m.descricao || `Medição #${m.numero ?? '?'}`,
    });
  });
  (receitasManuais || []).filter((r) => (obraIds ? naObra(r) : true)).forEach((r) => {
    if (receitaCancelada(r.status) || String(r.status) === 'aberto') return;
    receitas.push({
      id: r.id, origem: 'receita_manual', obraId: obraDe(r),
      data: dataLocal(r.data ?? r.dataEmissao), vencimento: dataLocal(r.vencimento ?? r.data),
      valor: num(r.valor), recebido: receitaRecebida(r.status), descricao: r.descricao || 'Receita',
    });
  });
  const desp = (despesas || [])
    .filter((d) => (obraIds ? naObra(d) : !obraDe(d))) // Geral = só despesas da empresa (sem obra)
    .filter((d) => !despesaCancelada(d.status))
    .map((d) => ({
      id: d.id, obraId: obraDe(d), categoria: d.categoria || 'Outros', fornecedor: (d.fornecedor || '').trim() || 'Sem fornecedor',
      data: dataLocal(d.dataEmissao ?? d.data_emissao ?? d.data),
      vencimento: dataLocal(d.dataVencimento ?? d.data_vencimento ?? d.vencimento ?? d.dataEmissao ?? d.data_emissao),
      pagamento: dataLocal(d.dataPagamento ?? d.data_pagamento),
      valor: num(d.valor), pago: despesaPaga(d.status), descricao: d.descricao || '-',
    }));
  return { receitas, despesas: desp };
}

/** Série mensal (últimos N meses): faturado, recebido, despesas, pago, resultado. */
export function serieMensal({ receitas = [], despesas = [] }, { hoje = new Date(), meses = 12 } = {}) {
  const chaves = [];
  for (let i = meses - 1; i >= 0; i -= 1) chaves.push(chaveMes(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)));
  const linhas = new Map(chaves.map((k) => [k, { mes: k, faturado: 0, recebido: 0, despesas: 0, pago: 0 }]));
  receitas.forEach((r) => {
    if (!r.data) return;
    const l = linhas.get(chaveMes(r.data));
    if (!l) return;
    l.faturado += r.valor;
    if (r.recebido) l.recebido += r.valor;
  });
  despesas.forEach((d) => {
    if (!d.data) return;
    const l = linhas.get(chaveMes(d.data));
    if (!l) return;
    l.despesas += d.valor;
    if (d.pago) l.pago += d.valor;
  });
  return chaves.map((k) => {
    const l = linhas.get(k);
    return { ...l, faturado: r2(l.faturado), recebido: r2(l.recebido), despesas: r2(l.despesas), pago: r2(l.pago), resultado: r2(l.faturado - l.despesas) };
  });
}

const FAIXAS = [
  { chave: 'a_vencer', rotulo: 'A vencer', min: -Infinity, max: 0 },
  { chave: '1_30', rotulo: '1–30 dias', min: 1, max: 30 },
  { chave: '31_60', rotulo: '31–60 dias', min: 31, max: 60 },
  { chave: '61_90', rotulo: '61–90 dias', min: 61, max: 90 },
  { chave: '90_mais', rotulo: '+90 dias', min: 91, max: Infinity },
];

/** Aging de contas a receber e a pagar em aberto (dias de atraso). */
export function aging({ receitas = [], despesas = [] }, { hoje = new Date() } = {}) {
  const faixa = (venc) => {
    const atraso = venc ? diasEntre(venc, hoje) : 0;
    return FAIXAS.find((f) => atraso >= f.min && atraso <= f.max) || FAIXAS[0];
  };
  const base = () => FAIXAS.map((f) => ({ faixa: f.chave, rotulo: f.rotulo, receber: 0, pagar: 0 }));
  const linhas = base();
  const idx = (k) => linhas.findIndex((l) => l.faixa === k);
  receitas.filter((r) => !r.recebido).forEach((r) => { linhas[idx(faixa(r.vencimento).chave)].receber += r.valor; });
  despesas.filter((d) => !d.pago).forEach((d) => { linhas[idx(faixa(d.vencimento).chave)].pagar += d.valor; });
  const out = linhas.map((l) => ({ ...l, receber: r2(l.receber), pagar: r2(l.pagar) }));
  const vencido = (k) => out.filter((l) => l.faixa !== 'a_vencer').reduce((s, l) => s + l[k], 0);
  return { faixas: out, receberVencido: r2(vencido('receber')), pagarVencido: r2(vencido('pagar')) };
}

/**
 * Fluxo de caixa projetado (próximas N semanas) a partir dos vencimentos em
 * aberto. Vencidos entram na 1ª semana (cobrança/pagamento imediato).
 */
export function fluxoProjetado({ receitas = [], despesas = [] }, { hoje = new Date(), semanas = 8 } = {}) {
  const chaves = semanasEntre(hoje, somaDias(hoje, 7 * (semanas - 1)));
  const linhas = new Map(chaves.map((k) => [k, { semana: k, entradas: 0, saidas: 0 }]));
  const k0 = chaves[0];
  const alvo = (d) => {
    if (!d) return k0;
    const k = chaveSemana(d);
    return k < k0 ? k0 : k;
  };
  receitas.filter((r) => !r.recebido).forEach((r) => { const l = linhas.get(alvo(r.vencimento)); if (l) l.entradas += r.valor; });
  despesas.filter((d) => !d.pago).forEach((d) => { const l = linhas.get(alvo(d.vencimento)); if (l) l.saidas += d.valor; });
  let acum = 0;
  return chaves.map((k) => {
    const l = linhas.get(k);
    acum += l.entradas - l.saidas;
    return { semana: k, entradas: r2(l.entradas), saidas: r2(l.saidas), saldo: r2(l.entradas - l.saidas), acumulado: r2(acum) };
  });
}

/** Curva ABC de fornecedores (despesas no período). A ≤ 80%, B ≤ 95%, C resto. */
export function abcFornecedores(despesas = [], { hoje = new Date(), dias = 365 } = {}) {
  const ini = somaDias(hoje, -dias);
  const mapa = new Map();
  despesas.forEach((d) => {
    if (d.data && d.data < ini) return;
    mapa.set(d.fornecedor, (mapa.get(d.fornecedor) || 0) + d.valor);
  });
  const total = [...mapa.values()].reduce((s, v) => s + v, 0);
  let acum = 0;
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]).map(([fornecedor, valor]) => {
    acum += valor;
    const pctAcum = total > 0 ? (acum / total) * 100 : 0;
    return { fornecedor, valor: r2(valor), pct: total > 0 ? r2((valor / total) * 100) : 0, pctAcum: r2(pctAcum), classe: pctAcum <= 80 ? 'A' : pctAcum <= 95 ? 'B' : 'C' };
  });
}

/** Despesas por categoria (período). */
export function despesasPorCategoria(despesas = [], { hoje = new Date(), dias = 365 } = {}) {
  const ini = somaDias(hoje, -dias);
  const mapa = new Map();
  despesas.forEach((d) => {
    if (d.data && d.data < ini) return;
    mapa.set(d.categoria, (mapa.get(d.categoria) || 0) + d.valor);
  });
  return [...mapa.entries()].map(([categoria, valor]) => ({ categoria, valor: r2(valor) })).sort((a, b) => b.valor - a.valor);
}
