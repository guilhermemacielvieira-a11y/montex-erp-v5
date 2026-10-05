// ============================================================
// DRE — cálculo puro (testável) a partir de dados REAIS
// ============================================================
// Antes a DREPage lia `kpisGerais.faturamento` e `custoTotalGeral`, campos
// que useFinancialIntelligence não retorna → receita sempre 0; e aplicava
// constantes escondidas (impostos 12%, consumíveis 5%, depreciação 3%,
// IR 34%). Agora:
//   • Receita bruta = medições RECONHECIDAS (aprovada/faturada/paga) no
//     período (valor bruto) + receitas manuais faturadas/recebidas.
//   • Retenções = bruto − líquido das medições (quando informado).
//   • Custos = lancamentos_despesas no período (exceto cancelados),
//     agrupados por categoria.
//   • Impostos, depreciação e IR/CSLL são PREMISSAS explícitas (default 0)
//     exibidas e editáveis na tela, rotuladas como estimativa.
// ============================================================
import { parseLocalDate } from './financeiroCalc';
import { medicaoReconhecida, normalizeStatusReceita, normalizeStatusDespesa } from './financeiroStatus';

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const dentro = (dataStr, inicio, fim) => {
  const d = parseLocalDate(dataStr);
  if (!d || isNaN(d.getTime())) return false;
  if (inicio && d < inicio) return false;
  if (fim && d > fim) return false;
  return true;
};

// Grupos da DRE por categoria (texto livre das despesas, sem acento)
const RE_FINANCEIRA = /juro|emprestimo|financiamento|iof|tarifa|bancari|desconto de cheque|cheque especial|renegocia/;
const RE_CSP = /materia|material|aco|chapa|perfil|mao de obra|salario|folha|solda|pintura|tinta|galvaniz|consumive|terceiriz|equipament|combust|fabrica|producao|montagem|frete de material|insumo|eletrodo|gas/;

export function grupoDaCategoria(categoria) {
  const c = String(categoria || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (RE_FINANCEIRA.test(c)) return 'financeira';
  if (RE_CSP.test(c)) return 'csp';
  return 'operacional';
}

/** Intervalo [inicio, fim] (datas locais) para um período nomeado. */
export function intervaloDoPeriodo(periodo, hoje = new Date()) {
  const y = hoje.getFullYear();
  const m = hoje.getMonth();
  const fimDia = (d) => { d.setHours(23, 59, 59, 999); return d; };
  switch (periodo) {
    case 'mes_anterior': return { inicio: new Date(y, m - 1, 1), fim: fimDia(new Date(y, m, 0)) };
    case 'trimestre': {
      const t = Math.floor(m / 3) * 3;
      return { inicio: new Date(y, t, 1), fim: fimDia(new Date(y, t + 3, 0)) };
    }
    case 'ano': return { inicio: new Date(y, 0, 1), fim: fimDia(new Date(y, 11, 31)) };
    case 'tudo': return { inicio: null, fim: null };
    case 'mes_atual':
    default: return { inicio: new Date(y, m, 1), fim: fimDia(new Date(y, m + 1, 0)) };
  }
}

const temObra = (x) => !!(x?.obraId || x?.obra_id);
const noEscopo = (x, escopo) => (escopo === 'fabrica' ? !temObra(x) : escopo === 'obras' ? temObra(x) : true);

/**
 * @param {object} p
 * @param {Array} p.medicoes            medições (ERPContext)
 * @param {Array} p.receitasManuais     receitas manuais (formato app, status canônico)
 * @param {Array} p.despesas            lancamentos_despesas (ERPContext)
 * @param {Date|null} p.inicio / p.fim  intervalo (null = sem limite)
 * @param {'consolidado'|'fabrica'|'obras'} p.escopo
 * @param {object} p.premissas          { aliquotaImpostosPct, depreciacaoValor, aliquotaIRPct }
 */
export function calcularDRE({
  medicoes = [], receitasManuais = [], despesas = [],
  inicio = null, fim = null, escopo = 'consolidado',
  premissas = {},
} = {}) {
  const aliquotaImpostosPct = num(premissas.aliquotaImpostosPct);
  const depreciacaoValor = num(premissas.depreciacaoValor);
  const aliquotaIRPct = num(premissas.aliquotaIRPct);

  // ===== RECEITAS =====
  const medsPeriodo = (medicoes || []).filter((m) => {
    if (!medicaoReconhecida(m?.status)) return false;
    if (!noEscopo(m, escopo)) return false;
    const data = m.dataAprovacao || m.data_aprovacao || m.dataMedicao || m.data_medicao || m.dataReferencia || m.data_referencia;
    return dentro(data, inicio, fim);
  });
  let receitaMedicoes = 0;
  let retencoes = 0;
  medsPeriodo.forEach((m) => {
    const bruto = num(m.valorBruto ?? m.valor_bruto);
    const liquido = num(m.valorLiquido ?? m.valor_liquido);
    receitaMedicoes += bruto;
    if (liquido > 0 && liquido < bruto) retencoes += bruto - liquido;
  });

  const recManuais = (receitasManuais || []).filter((r) => {
    const st = normalizeStatusReceita(r?.status);
    if (st !== 'faturado' && st !== 'recebido') return false;
    if (!noEscopo(r, escopo)) return false;
    return dentro(r.data || r.vencimento, inicio, fim);
  });
  const receitaManual = recManuais.reduce((s, r) => s + num(r.valor), 0);

  const receitaBruta = receitaMedicoes + receitaManual;
  const impostos = receitaBruta * (aliquotaImpostosPct / 100);
  const deducoes = retencoes + impostos;
  const receitaLiquida = receitaBruta - deducoes;

  // ===== CUSTOS / DESPESAS =====
  const despPeriodo = (despesas || []).filter((l) => {
    if (l?.tipo === 'receita') return false;
    if (normalizeStatusDespesa(l?.status) === 'cancelado') return false;
    if (!noEscopo(l, escopo)) return false;
    return dentro(l.dataEmissao || l.data_emissao || l.data, inicio, fim);
  });
  const porCategoria = {};
  despPeriodo.forEach((l) => {
    const cat = l.categoria || 'Outros';
    if (!porCategoria[cat]) porCategoria[cat] = { categoria: cat, valor: 0, qtd: 0, grupo: grupoDaCategoria(cat) };
    porCategoria[cat].valor += num(l.valor);
    porCategoria[cat].qtd += 1;
  });
  const categorias = Object.values(porCategoria).sort((a, b) => b.valor - a.valor);
  const somaGrupo = (g) => categorias.filter((c) => c.grupo === g).reduce((s, c) => s + c.valor, 0);
  const cspTotal = somaGrupo('csp');
  const despesasOperacionaisTotal = somaGrupo('operacional');
  const despesasFinanceirasTotal = somaGrupo('financeira');

  const lucroBruto = receitaLiquida - cspTotal;
  const ebitda = lucroBruto - despesasOperacionaisTotal;
  const resultadoAntesIR = ebitda - depreciacaoValor - despesasFinanceirasTotal;
  const irCsll = resultadoAntesIR > 0 ? resultadoAntesIR * (aliquotaIRPct / 100) : 0;
  const lucroLiquido = resultadoAntesIR - irCsll;
  const pct = (v) => (receitaLiquida > 0 ? (v / receitaLiquida) * 100 : 0);

  return {
    receitaMedicoes, receitaManual, receitaBruta,
    retencoes, impostos, deducoes, receitaLiquida,
    categorias,
    cspTotal, lucroBruto,
    despesasOperacionaisTotal, ebitda,
    depreciacao: depreciacaoValor,
    despesasFinanceirasTotal,
    resultadoAntesIR, irCsll, lucroLiquido,
    margemBruta: pct(lucroBruto),
    margemOperacional: pct(ebitda),
    margemLiquida: pct(lucroLiquido),
    qtdMedicoes: medsPeriodo.length,
    qtdReceitasManuais: recManuais.length,
    qtdDespesas: despPeriodo.length,
    premissas: { aliquotaImpostosPct, depreciacaoValor, aliquotaIRPct },
  };
}
