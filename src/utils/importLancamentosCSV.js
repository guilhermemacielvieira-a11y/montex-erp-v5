// ============================================================
// IMPORTAÇÃO CSV DE LANÇAMENTOS (GFO) — lógica pura, testável
// ============================================================
// Antes (GestaoFinanceiraObra.handleImportCSV):
//   • '1.234,56' virava 1.234 (replace(',', '.') sem remover o milhar)
//   • datas dd/mm/yyyy iam cruas para o banco
//   • status era sempre 'pendente' (ignorava a coluna do arquivo)
//   • sem deduplicação contra lançamentos já existentes
// ============================================================
import { parseValorBR, parseDataBR, hojeLocalISO } from './financeiroCalc';
import { normalizeStatusDespesa } from './financeiroStatus';

const semAcento = (s) => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .trim().toLowerCase();

/** Divide uma linha CSV respeitando aspas ("a;b" fica num campo só). */
export function splitCSVLine(line, sep) {
  const out = [];
  let cur = '';
  let aspas = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (aspas && line[i + 1] === '"') { cur += '"'; i++; }
      else aspas = !aspas;
    } else if (ch === sep && !aspas) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Chave de deduplicação: mesma data + valor + descrição. */
export function chaveLancamento(l) {
  const data = parseDataBR(l?.dataEmissao || l?.data || '') || '';
  const valor = (Number(l?.valor) || 0).toFixed(2);
  const desc = semAcento(l?.descricao).replace(/\s+/g, ' ');
  return `${data}|${valor}|${desc}`;
}

/**
 * Converte o texto de um CSV (separador ';' ou ',') em lançamentos.
 * Colunas reconhecidas (cabeçalho, sem acento/maiúsculas): descricao/historico,
 * valor/debito, data/dt_lancamento/data_emissao, vencimento/data_vencimento,
 * tipo, categoria, fornecedor, nota_fiscal/nf, observacao, forma_pagto/pagamento,
 * setor, status/situacao.
 */
export function parseCSVLancamentos(text, { hoje = hojeLocalISO(), idPrefix = `IMP-${Date.now()}` } = {}) {
  const linhas = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length < 2) return [];
  const sep = linhas[0].includes(';') ? ';' : ',';
  const headers = splitCSVLine(linhas[0], sep).map(semAcento);
  return linhas.slice(1).map((line, idx) => {
    const cols = splitCSVLine(line, sep);
    const o = {};
    headers.forEach((h, i) => { o[h] = cols[i] || ''; });
    const statusBruto = o.status || o.situacao || '';
    const data = parseDataBR(o.data || o.dt_lancamento || o.data_emissao) || hoje;
    return {
      id: `${idPrefix}-${idx}`,
      descricao: o.descricao || o.historico || '',
      valor: Math.abs(parseValorBR(o.valor || o.debito || '0')),
      data,
      dataEmissao: data,
      dataVencimento: parseDataBR(o.vencimento || o.data_vencimento) || '',
      tipo: semAcento(o.tipo).includes('receita') ? 'receita' : 'despesa',
      categoria: o.categoria || 'outros',
      fornecedor: o.fornecedor || '',
      notaFiscal: o.nota_fiscal || o.nf || '',
      observacao: o.observacao || '',
      formaPagto: o.forma_pagto || o.pagamento || '',
      setor: o.setor || '',
      // Preserva o status do arquivo quando presente (canônico); senão pendente
      status: statusBruto ? normalizeStatusDespesa(statusBruto) : 'pendente',
    };
  }).filter((r) => r.descricao && r.valor > 0);
}

/** Separa novos × duplicados (contra existentes e dentro do próprio arquivo). */
export function deduplicarLancamentos(novos, existentes = []) {
  const vistos = new Set((existentes || []).map(chaveLancamento));
  const unicos = [];
  const duplicados = [];
  (novos || []).forEach((l) => {
    const k = chaveLancamento(l);
    if (vistos.has(k)) duplicados.push(l);
    else { vistos.add(k); unicos.push(l); }
  });
  return { unicos, duplicados };
}
