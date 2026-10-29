// ============================================================
// Painéis da diretoria (app) — composição pura sobre o motor do BI
// ============================================================
// Produção: biAnaliseProducao (setores, série, obras, pessoas) — mesmo motor
// da Análise de Produção do desktop (regra 1e: histórico normalizado).
// Financeiro: série do Painel Global (useFinanceiroGlobal) — caixa e
// resultado da EMPRESA (regra 1b: material/despesa de obra fica fora).
// Testado em src/services/bi/painelDiretoria.test.js.
// ============================================================
import { variacaoPct } from './biAnaliseProducao';

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Granularidade do gráfico pelo tamanho do período. */
export function granularidadeAuto(dias) {
  if (dias <= 35) return 'dia';
  if (dias <= 150) return 'semana';
  return 'mes';
}

/** KPIs por setor com variação vs período anterior (mesma duração). */
export function kpisSetores(resumo = [], resumoAnt = []) {
  const ant = new Map((resumoAnt || []).map((r) => [r.setor, r]));
  return (resumo || []).map((r) => ({
    ...r,
    kgAnterior: ant.get(r.setor)?.kg || 0,
    variacao: variacaoPct(r.kg, ant.get(r.setor)?.kg || 0),
  }));
}

/** Chave 'AAAA-MM' de N meses terminando no mês de `hoje` (mais antigo primeiro). */
export function chavesMeses(meses, hoje = new Date(), deslocamento = 0) {
  const out = [];
  for (let i = meses - 1 + deslocamento; i >= deslocamento; i -= 1) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export const rotuloChaveMes = (k) => {
  const [a, m] = String(k).split('-').map(Number);
  return `${MESES[(m || 1) - 1]}/${String(a).slice(-2)}`;
};

/**
 * Período financeiro (últimos `meses`, incluindo o atual) vs os `meses`
 * anteriores, a partir de evolucaoMensal ({ key, receitas, despesas }).
 */
export function periodoFinanceiro(evolucao = [], { meses = 6, hoje = new Date() } = {}) {
  const porChave = new Map((evolucao || []).map((m) => [m.key, m]));
  const linha = (k) => {
    const m = porChave.get(k);
    const receitas = n(m?.receitas), despesas = n(m?.despesas);
    return { key: k, rotulo: rotuloChaveMes(k), receitas, despesas, resultado: receitas - despesas };
  };
  const serie = chavesMeses(meses, hoje).map(linha);
  const anterior = chavesMeses(meses, hoje, meses).map(linha);
  const soma = (lista) => {
    const receitas = lista.reduce((s, l) => s + l.receitas, 0);
    const despesas = lista.reduce((s, l) => s + l.despesas, 0);
    const resultado = receitas - despesas;
    return { receitas, despesas, resultado, margem: receitas > 0 ? (resultado / receitas) * 100 : null };
  };
  const atual = soma(serie), ant = soma(anterior);
  return {
    serie, atual, anterior: ant,
    variacao: {
      receitas: variacaoPct(atual.receitas, ant.receitas),
      despesas: variacaoPct(atual.despesas, ant.despesas),
      resultado: ant.resultado !== 0 ? Math.round(((atual.resultado - ant.resultado) / Math.abs(ant.resultado)) * 1000) / 10 : null,
    },
  };
}

/** Despesas do período por uma chave (categoria/fornecedor), maiores primeiro. */
export function despesasPor(movs = [], chave, { desde } = {}) {
  const mapa = new Map();
  (movs || []).forEach((m) => {
    if (m.tipo !== 'despesa') return;
    const k = String(m.data || '').slice(0, 7);
    if (desde && k && k < desde) return;
    const nome = String(m[chave] || '').trim() || (chave === 'fornecedor' ? 'Sem fornecedor' : 'Outros');
    mapa.set(nome, (mapa.get(nome) || 0) + n(m.valor));
  });
  const total = [...mapa.values()].reduce((s, v) => s + v, 0);
  return [...mapa.entries()]
    .map(([nome, valor]) => ({ nome, valor, pct: total > 0 ? (valor / total) * 100 : 0 }))
    .sort((a, b) => b.valor - a.valor);
}

/** Mantém os `max` maiores e soma o resto em "Outros". */
export function topComOutros(lista = [], max = 6, { valor = 'valor', nome = 'nome' } = {}) {
  if ((lista || []).length <= max) return lista || [];
  const topo = lista.slice(0, max - 1);
  const resto = lista.slice(max - 1);
  const somaV = resto.reduce((s, x) => s + n(x[valor]), 0);
  const somaP = resto.reduce((s, x) => s + n(x.pct), 0);
  return [...topo, { [nome]: `Outros (${resto.length})`, [valor]: somaV, pct: somaP, outros: true }];
}
