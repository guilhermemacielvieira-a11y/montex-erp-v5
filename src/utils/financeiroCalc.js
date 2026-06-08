// ============================================================
// FINANCEIRO — LÓGICA DE CÁLCULO PURA (testável)
// ============================================================
// Funções puras extraídas do PainelFinanceiroGlobal para permitir testes
// unitários determinísticos (Vitest) e remover duplicação. NÃO importa React,
// Supabase nem qualquer estado — recebe tudo por argumento. Datas "hoje" são
// injetáveis para os testes (default new Date()).
//
// Cobertas por src/utils/financeiroCalc.test.js
// ============================================================

// ===== PRIMITIVOS DE FORMATO / DATA / STATUS =====

export const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 0,
}).format(value || 0);

// FIX TIMEZONE: new Date('YYYY-MM-DD') vira UTC midnight → 21h do dia anterior
// no fuso BRT (UTC-3). Parseamos manualmente como data LOCAL.
export const parseLocalDate = (dataStr) => {
  if (!dataStr) return null;
  if (dataStr instanceof Date) return dataStr;
  const s = String(dataStr);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  }
  return new Date(s);
};

export const formatDate = (date) => {
  if (!date || date === '-') return '-';
  try {
    const d = parseLocalDate(date);
    if (!d || isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR');
  } catch { return '-'; }
};

export const diasAteVencimento = (dataStr, hoje = new Date()) => {
  if (!dataStr || dataStr === '-') return null;
  try {
    const venc = parseLocalDate(dataStr);
    if (!venc || isNaN(venc.getTime())) return null;
    const h = new Date(hoje); h.setHours(0, 0, 0, 0);
    venc.setHours(0, 0, 0, 0);
    return Math.round((venc - h) / (1000 * 60 * 60 * 24));
  } catch { return null; }
};

// Detecta se uma movimentação é/refere-se a cheque
export const ehCheque = (mov) => {
  const txt = `${mov?.formaPagto || ''} ${mov?.descricao || ''} ${mov?.categoria || ''} ${mov?.fornecedor || ''}`.toLowerCase();
  return /\bcheque\b|\bch[ \-]?\d+\b|\bch\.\s?\d+/i.test(txt) || (mov?.formaPagto || '').toLowerCase().includes('cheque');
};

// Definição ÚNICA de "quitado" (receita recebida OU despesa paga, com variantes)
export const STATUS_QUITADO = ['pago', 'paga', 'recebido', 'faturado', 'confirmado'];
export const ehPago = (mov) => STATUS_QUITADO.includes(mov?.status);

// ===== OPERAÇÃO DE CHEQUE TROCADO (preview no modal Nova Movimentação) =====
// chequesList: [{ valor, vencimento }], valorLiquido: string|number
export function calcChequeOp({ chequesList = [], valorLiquido, taxaAnualizadaMaxima = 50, hoje = new Date() }) {
  const valorTotalFace = chequesList.reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
  const liquido = parseFloat(valorLiquido) || 0;
  const juros = valorTotalFace - liquido;
  const taxaPct = valorTotalFace > 0 ? (juros / valorTotalFace * 100) : 0;
  const chequesComData = chequesList.filter(c => c.vencimento).map(c => ({ ...c, dataObj: parseLocalDate(c.vencimento) }));
  const h = new Date(hoje); h.setHours(0, 0, 0, 0);
  const prazoMedioDias = chequesComData.length > 0
    ? chequesComData.reduce((s, c) => s + Math.max(0, (c.dataObj - h) / 86400000), 0) / chequesComData.length
    : 30;
  const prazoMedioMeses = Math.max(0.1, prazoMedioDias / 30);
  const taxaAnualizada = prazoMedioMeses > 0 ? (taxaPct * 12 / prazoMedioMeses) : 0;
  const isCaro = taxaAnualizada > taxaAnualizadaMaxima;
  return { valorTotalFace, liquido, juros, taxaPct, prazoMedioDias, prazoMedioMeses, taxaAnualizada, isCaro };
}

// ===== OPERAÇÃO FINANCEIRA (cheques trocados / empréstimos) — preview =====
// opFin: { valorFace, valorLiquido, parcelas, primeiroVencimento, intervaloDias }
// futuro: { saldo30, saldo60, saldo90, receber30, pagar30 }
export function calcOpFin({ opFin, taxaAnualizadaMaxima = 50, futuro = {}, hoje = new Date() }) {
  const face = parseFloat(opFin.valorFace) || 0;
  const liquido = parseFloat(opFin.valorLiquido) || 0;
  const juros = face - liquido;
  const taxaPct = face > 0 ? (juros / face * 100) : 0;
  const valorParcela = opFin.parcelas > 0 ? face / opFin.parcelas : 0;

  const datasParcelas = [];
  if (opFin.primeiroVencimento) {
    const base = parseLocalDate(opFin.primeiroVencimento);
    for (let i = 0; i < opFin.parcelas; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (i * opFin.intervaloDias));
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      datasParcelas.push({
        numero: i + 1,
        data: `${yyyy}-${mm}-${dd}`,
        dataLabel: d.toLocaleDateString('pt-BR'),
        valor: valorParcela,
      });
    }
  }
  const prazoMedio = opFin.parcelas > 0 ? ((opFin.parcelas + 1) / 2) * (opFin.intervaloDias / 30) : 1;
  const taxaAnualizada = prazoMedio > 0 ? (taxaPct * 12 / prazoMedio) : 0;
  const isCaro = taxaAnualizada > taxaAnualizadaMaxima;
  const nivelCaro = !isCaro ? null
    : taxaAnualizada > taxaAnualizadaMaxima * 1.5 ? 'grave'
    : taxaAnualizada > taxaAnualizadaMaxima * 1.2 ? 'medio'
    : 'leve';

  const antes = {
    saldo30: futuro.saldo30 || 0,
    saldo60: futuro.saldo60 || 0,
    saldo90: futuro.saldo90 || 0,
    receber30: futuro.receber30 || 0,
    pagar30: futuro.pagar30 || 0,
  };
  const h = new Date(hoje); h.setHours(0, 0, 0, 0);
  let parcelas30 = 0, parcelas60 = 0, parcelas90 = 0;
  datasParcelas.forEach(p => {
    const d = parseLocalDate(p.data);
    const dias = Math.round((d - h) / 86400000);
    if (dias <= 30) parcelas30 += p.valor;
    if (dias <= 60) parcelas60 += p.valor;
    if (dias <= 90) parcelas90 += p.valor;
  });
  const depois = {
    saldo30: antes.saldo30 + liquido - parcelas30,
    saldo60: antes.saldo60 + liquido - parcelas60,
    saldo90: antes.saldo90 + liquido - parcelas90,
    receber30: antes.receber30 + liquido,
    pagar30: antes.pagar30 + parcelas30,
  };

  return {
    face, liquido, juros, taxaPct, valorParcela, datasParcelas,
    prazoMedio, taxaAnualizada, isCaro, nivelCaro,
    antes, depois,
    deltaSaldo30: depois.saldo30 - antes.saldo30,
    deltaSaldo90: depois.saldo90 - antes.saldo90,
  };
}

// ===== SCORE DE SAÚDE FINANCEIRA (0-100) =====
// metasReal: { margemReal, receitaMes, despesaMes }
// futuro: { receber30, pagar30 }
// metas: { receitaMinimaMensal, despesaTetoMensal, margemMinima }
// alertasCriticos: número de alertas nível crítico/vencido
export function calcScoreSaude({ metasReal, futuro, metas, alertasCriticos = 0 }) {
  const norm = (v, min, max) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  const scoreMargem = norm(metasReal.margemReal, 0, 25);
  const liquidez = futuro.pagar30 > 0 ? futuro.receber30 / futuro.pagar30 : (futuro.receber30 > 0 ? 2 : 1);
  const scoreLiquidez = norm(liquidez, 0.5, 1.5);
  const scoreReceita = norm(metasReal.receitaMes / Math.max(1, metas.receitaMinimaMensal), 0.5, 1.0);
  const scoreDespesa = 100 - norm(metasReal.despesaMes / Math.max(1, metas.despesaTetoMensal), 0.9, 1.2);
  const scoreAlertas = Math.max(0, 100 - alertasCriticos * 20);

  const total = (scoreMargem * 0.25) + (scoreLiquidez * 0.25) + (scoreReceita * 0.20) + (scoreDespesa * 0.15) + (scoreAlertas * 0.15);
  const score = Math.round(total);
  let nivel, cor;
  if (score >= 80) { nivel = 'Excelente'; cor = '#10b981'; }
  else if (score >= 60) { nivel = 'Saudável'; cor = '#3b82f6'; }
  else if (score >= 40) { nivel = 'Atenção'; cor = '#f59e0b'; }
  else if (score >= 20) { nivel = 'Crítico'; cor = '#ef4444'; }
  else { nivel = 'Severo'; cor = '#7f1d1d'; }

  return {
    score, nivel, cor,
    liquidez, alertasCriticos,
    componentes: [
      { nome: 'Margem Operacional', score: Math.round(scoreMargem), peso: 25, atual: `${metasReal.margemReal.toFixed(1)}%`, meta: `${metas.margemMinima}%` },
      { nome: 'Liquidez 30 dias', score: Math.round(scoreLiquidez), peso: 25, atual: `${liquidez.toFixed(2)}x`, meta: '≥ 1.5x' },
      { nome: 'Receita vs Meta', score: Math.round(scoreReceita), peso: 20, atual: formatCurrency(metasReal.receitaMes), meta: formatCurrency(metas.receitaMinimaMensal) },
      { nome: 'Despesa vs Teto', score: Math.round(scoreDespesa), peso: 15, atual: formatCurrency(metasReal.despesaMes), meta: `≤ ${formatCurrency(metas.despesaTetoMensal)}` },
      { nome: 'Alertas Críticos', score: Math.round(scoreAlertas), peso: 15, atual: `${alertasCriticos} alerta(s)`, meta: '0' },
    ],
  };
}

// ===== SCORE/NÍVEL DE ALERTA DE VENCIMENTO =====
// Calcula urgência+score+nível de um item a vencer. Retorna null se fora da
// janela (nem vencido, nem dentro de crítico/atenção).
export function calcAlertaVencimento({ dias, valor = 0, ehCheque: _ehCheque = false, valorAlto = false, ehOpFinanceira = false, alertaCriticoDias = 2, alertaAtencaoDias = 7 }) {
  if (dias === null || dias === undefined) return null;

  let urgenciaScore = 0;
  if (dias < 0) urgenciaScore = 1000 + Math.abs(dias) * 10; // já vencido
  else if (dias <= alertaCriticoDias) urgenciaScore = 800 - dias * 50;
  else if (dias <= alertaAtencaoDias) urgenciaScore = 400 - dias * 20;

  if (urgenciaScore === 0) return null; // fora da janela

  const score = urgenciaScore
    + Math.log10(Math.max(1, valor)) * 100
    + (_ehCheque ? 200 : 0)
    + (valorAlto ? 150 : 0)
    + (ehOpFinanceira ? 250 : 0);

  let nivel;
  if (dias < 0) nivel = 'vencido';
  else if (dias <= alertaCriticoDias) nivel = 'critico';
  else nivel = 'atencao';

  return { urgenciaScore, score, nivel };
}
