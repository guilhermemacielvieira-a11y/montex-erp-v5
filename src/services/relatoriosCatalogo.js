// ============================================================
// Central de Relatórios — lógica pura (catálogo, agendamento, dados)
// ============================================================
// Sem React. Usado por src/pages/CentralRelatoriosPage.jsx e pelos
// componentes em src/components/relatorios2/.
//
// - CATALOGO: relatórios REAIS que a central sabe gerar.
// - proximaExecucao(): replica a regra do motor (Edge Function
//   motor-automacoes → devidoAgora): hora de Brasília (UTC-3, sem horário
//   de verão), dia da semana 1=seg…7=dom, dia do mês EXATO (se o mês não
//   tiver o dia, o mês é pulado) e no máximo 1 execução por dia.
// - Montagem de linhas (XLSX/CSV), resumo numérico e PDF executivo.
// ============================================================

import { ROTULO_ETAPA, etapaCanonica, rotuloMes, rotuloSemana, isoLocal } from './bi/biCore';
import { SEVERIDADES, REGRAS } from './bi/radarAlertas';

// ------------------------------------------------------------
// Catálogo
// ------------------------------------------------------------
export const CATALOGO = [
  {
    id: 'producao', titulo: 'Produção da obra', formatos: ['pdf'], exigeObra: true, area: 'Produção',
    descricao: 'PDF para o cliente: progresso geral, peso por etapa, materiais e o detalhe das peças por etapa da obra selecionada no topo.',
  },
  {
    id: 'fabricabilidade', titulo: 'Fabricabilidade', formatos: ['pdf'], exigeObra: true, area: 'Produção',
    descricao: 'PDF com as marcas que já podem ser fabricadas e as que estão travadas por falta de material (necessário × entregue no estoque da obra).',
  },
  {
    id: 'estoque', titulo: 'Estoque', formatos: ['pdf'], exigeObra: false, area: 'Suprimentos',
    descricao: 'PDF do estoque no escopo do topo: necessário × entregue, cobertura, itens em alerta e valor em estoque.',
  },
  {
    id: 'executivo', titulo: 'Resumo executivo (BI 360)', formatos: ['pdf'], exigeObra: false, area: 'Diretoria',
    descricao: 'PDF com KPIs executivos, obras (físico × financeiro, previsão × prazo), produção (ritmo e gargalo), financeiro (aging e fluxo de 8 semanas) e principais alertas.',
  },
  {
    id: 'financeiro', titulo: 'Financeiro', formatos: ['xlsx'], exigeObra: false, area: 'Financeiro',
    descricao: 'Planilha com receitas e despesas normalizadas, série mensal (12 meses), aging e fluxo projetado.',
  },
  {
    id: 'alertas', titulo: 'Radar de alertas', formatos: ['csv'], exigeObra: false, area: 'Gestão',
    descricao: 'CSV com todos os alertas atuais do Radar (severidade, área, obra, detalhe e valor).',
  },
];

export const catalogoPorId = (id) => CATALOGO.find((c) => c.id === id) || null;

/** Regra do financeiro dita ao usuário (CLAUDE.md 1b). */
export function regraFinanceiro(escopoGeral) {
  return escopoGeral
    ? 'Escopo Geral = caixa da EMPRESA: receitas pelo total (medições e recebimentos) e só despesas da fábrica (sem obra). Material lançado na obra fica de fora.'
    : 'Escopo de obra = só a(s) obra(s) do topo: medições e receitas da obra × despesas lançadas na obra.';
}

/** Tipo do agendamento → relatório sob demanda equivalente. */
export const TIPO_AGENDADO_PARA_CATALOGO = { executivo: 'executivo', producao: 'producao', financeiro: 'financeiro', estoque: 'estoque' };

export const TIPOS_AGENDAMENTO = [
  { id: 'executivo', rotulo: 'Resumo executivo (produção + financeiro + estoque)' },
  { id: 'producao', rotulo: 'Produção' },
  { id: 'financeiro', rotulo: 'Financeiro' },
  { id: 'estoque', rotulo: 'Estoque' },
];
export const rotuloTipo = (t) => (
  catalogoPorId(t)?.titulo || TIPOS_AGENDAMENTO.find((x) => x.id === t)?.rotulo || t || '—'
);

export const DIAS_SEMANA = [
  { v: 1, rotulo: 'Segunda' }, { v: 2, rotulo: 'Terça' }, { v: 3, rotulo: 'Quarta' }, { v: 4, rotulo: 'Quinta' },
  { v: 5, rotulo: 'Sexta' }, { v: 6, rotulo: 'Sábado' }, { v: 7, rotulo: 'Domingo' },
];
export const FREQUENCIAS = [
  { id: 'diaria', rotulo: 'Diária' }, { id: 'semanal', rotulo: 'Semanal' }, { id: 'mensal', rotulo: 'Mensal' },
];

// ------------------------------------------------------------
// Agendamento
// ------------------------------------------------------------
const BRT_MS = 3 * 3600 * 1000; // Brasília = UTC-3 (sem horário de verão desde 2019)
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const isoUTC = (d) => d.toISOString().slice(0, 10);

/**
 * Próxima execução de um agendamento (instante real, Date) ou null se
 * inativo / sem data possível em ~400 dias. Mesma regra do motor.
 */
export function proximaExecucao(ag, agora = new Date()) {
  if (!ag || !ag.ativo) return null;
  const hora = Math.min(23, Math.max(0, Math.trunc(num(ag.hora ?? 7))));
  const brtAgora = new Date(agora.getTime() - BRT_MS); // campos UTC = relógio de Brasília
  const ultimaDia = ag.ultima_execucao ? isoUTC(new Date(Date.parse(ag.ultima_execucao) - BRT_MS)) : null;
  for (let i = 0; i <= 400; i += 1) {
    const dia = new Date(Date.UTC(brtAgora.getUTCFullYear(), brtAgora.getUTCMonth(), brtAgora.getUTCDate() + i));
    const dow = ((dia.getUTCDay() + 6) % 7) + 1; // 1=seg
    if (ag.frequencia === 'semanal' && num(ag.dia_semana || 1) !== dow) continue;
    if (ag.frequencia === 'mensal' && num(ag.dia_mes || 1) !== dia.getUTCDate()) continue;
    if (ultimaDia && isoUTC(dia) <= ultimaDia) continue; // já rodou neste dia
    const instante = new Date(dia.getTime() + hora * 3600 * 1000 + BRT_MS);
    // A hora cheia do dia de hoje ainda vale se não passou (o cron roda ~hora cheia).
    if (i === 0 && brtAgora.getUTCHours() > hora) continue;
    if (instante.getTime() + 3600 * 1000 <= agora.getTime()) continue;
    return instante;
  }
  return null;
}

/** "Toda segunda às 07h" etc. */
export function descreverFrequencia(ag) {
  const h = `${String(Math.trunc(num(ag?.hora ?? 7))).padStart(2, '0')}h`;
  if (ag?.frequencia === 'diaria') return `Todo dia às ${h}`;
  if (ag?.frequencia === 'semanal') {
    const d = DIAS_SEMANA.find((x) => x.v === num(ag.dia_semana || 1))?.rotulo || '—';
    return `Toda ${d.toLowerCase()} às ${h}`;
  }
  if (ag?.frequencia === 'mensal') return `Todo dia ${num(ag.dia_mes || 1)} do mês às ${h}`;
  return '—';
}

/** Formata um instante no relógio de Brasília (dd/mm/aaaa hh:mm). */
export function fmtDataHoraBRT(v) {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const b = new Date(d.getTime() - BRT_MS);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(b.getUTCDate())}/${p(b.getUTCMonth() + 1)}/${b.getUTCFullYear()} ${p(b.getUTCHours())}:${p(b.getUTCMinutes())}`;
}

/** Valida o formulário de agendamento; devolve { ok, erros: {campo: msg} }. */
export function validarAgendamento(f = {}) {
  const erros = {};
  if (!String(f.nome || '').trim()) erros.nome = 'Informe um nome.';
  if (!TIPOS_AGENDAMENTO.some((t) => t.id === f.tipo)) erros.tipo = 'Escolha o tipo.';
  if (!FREQUENCIAS.some((x) => x.id === f.frequencia)) erros.frequencia = 'Escolha a frequência.';
  const h = Number(f.hora);
  if (!Number.isInteger(h) || h < 0 || h > 23) erros.hora = 'Hora entre 0 e 23.';
  if (f.frequencia === 'semanal') {
    const d = Number(f.dia_semana);
    if (!Number.isInteger(d) || d < 1 || d > 7) erros.dia_semana = 'Escolha o dia da semana.';
  }
  if (f.frequencia === 'mensal') {
    const d = Number(f.dia_mes);
    if (!Number.isInteger(d) || d < 1 || d > 28) erros.dia_mes = 'Dia do mês entre 1 e 28 (para rodar em todos os meses).';
  }
  return { ok: Object.keys(erros).length === 0, erros };
}

/** Normaliza o formulário para salvarAgendamento (campos que não se aplicam vão null). */
export function normalizarAgendamento(f = {}) {
  return {
    ...(f.id ? { id: f.id } : {}),
    nome: String(f.nome || '').trim(),
    tipo: f.tipo,
    obra_id: f.obra_id && f.obra_id !== 'geral' ? f.obra_id : null,
    frequencia: f.frequencia,
    dia_semana: f.frequencia === 'semanal' ? Number(f.dia_semana) : null,
    dia_mes: f.frequencia === 'mensal' ? Number(f.dia_mes) : null,
    hora: Number(f.hora),
    ativo: !!f.ativo,
    destino_role: f.destino_role && f.destino_role !== 'todos' ? f.destino_role : null,
  };
}

// ------------------------------------------------------------
// Financeiro (XLSX) — linhas a partir de useBIData().financeiro
// ------------------------------------------------------------
const dataBR = (d) => (d instanceof Date && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : '');

/** Movimentos (receitas + despesas) em linhas planas, ordenadas por data. */
export function linhasMovimentos(financeiro = {}, nomeObra = (id) => id || '') {
  const rec = (financeiro.receitas || []).map((r) => ({
    tipo: 'Receita', origem: r.origem === 'medicao' ? 'Medição' : 'Receita manual',
    data: r.data, vencimento: r.vencimento, descricao: r.descricao || '', categoria: '', fornecedor: '',
    obra: r.obraId ? nomeObra(r.obraId) : 'Fábrica (sem obra)', valor: num(r.valor), situacao: r.recebido ? 'Recebido' : 'A receber',
  }));
  const desp = (financeiro.despesas || []).map((d) => ({
    tipo: 'Despesa', origem: 'Lançamento', data: d.data, vencimento: d.vencimento, descricao: d.descricao || '',
    categoria: d.categoria || '', fornecedor: d.fornecedor || '',
    obra: d.obraId ? nomeObra(d.obraId) : 'Fábrica (sem obra)', valor: -num(d.valor), situacao: d.pago ? 'Pago' : 'A pagar',
  }));
  return [...rec, ...desp]
    .sort((a, b) => (a.data?.getTime?.() || 0) - (b.data?.getTime?.() || 0))
    .map((l) => ({ ...l, data: dataBR(l.data), vencimento: dataBR(l.vencimento) }));
}

/** Planilhas (nome → AOA) do relatório financeiro. */
export function planilhasFinanceiro(financeiro = {}, { nomeObra, escopoRotulo = '', geradoEm = new Date() } = {}) {
  const mov = linhasMovimentos(financeiro, nomeObra);
  const cab = (titulo) => [[titulo], [`Escopo: ${escopoRotulo}`], [regraFinanceiro(!!financeiro.geralEmpresa)], [`Gerado em ${geradoEm.toLocaleString('pt-BR')}`], []];
  return {
    Movimentos: [
      ...cab('Movimentos financeiros — MONTEX'),
      ['Tipo', 'Origem', 'Data', 'Vencimento', 'Descrição', 'Categoria', 'Fornecedor', 'Obra', 'Valor (R$)', 'Situação'],
      ...mov.map((l) => [l.tipo, l.origem, l.data, l.vencimento, l.descricao, l.categoria, l.fornecedor, l.obra, l.valor, l.situacao]),
    ],
    Mensal: [
      ...cab('Série mensal (12 meses)'),
      ['Mês', 'Faturado', 'Recebido', 'Despesas', 'Pago', 'Resultado'],
      ...(financeiro.mensal || []).map((m) => [rotuloMes(m.mes), m.faturado, m.recebido, m.despesas, m.pago, m.resultado]),
    ],
    Aging: [
      ...cab('Aging — contas em aberto por atraso'),
      ['Faixa', 'A receber (R$)', 'A pagar (R$)'],
      ...((financeiro.aging?.faixas) || []).map((f) => [f.rotulo, f.receber, f.pagar]),
      ['Vencido (total)', financeiro.aging?.receberVencido || 0, financeiro.aging?.pagarVencido || 0],
    ],
    'Fluxo 8 semanas': [
      ...cab('Fluxo de caixa projetado (vencidos entram na 1ª semana)'),
      ['Semana de', 'Entradas', 'Saídas', 'Saldo', 'Acumulado'],
      ...(financeiro.fluxo || []).map((f) => [rotuloSemana(f.semana), f.entradas, f.saidas, f.saldo, f.acumulado]),
    ],
  };
}

// ------------------------------------------------------------
// Alertas (CSV)
// ------------------------------------------------------------
const csvCampo = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV (separador ";" e BOM — abre direto no Excel pt-BR). */
export function csvAlertas(alertas = [], nomeObra = (id) => id || '', statusDe = null) {
  const cab = ['Severidade', 'Área', 'Regra', 'Obra', 'Título', 'Detalhe', 'Valor', 'Unidade', 'Detectado em', ...(statusDe ? ['Situação'] : [])];
  const linhas = (alertas || []).map((a) => [
    SEVERIDADES[a.severidade]?.rotulo || a.severidade,
    REGRAS[a.regra]?.area || '',
    REGRAS[a.regra]?.rotulo || a.regra || '',
    a.obraId ? nomeObra(a.obraId) : '',
    a.titulo || '', a.detalhe || '',
    a.valor === null || a.valor === undefined ? '' : String(a.valor).replace('.', ','),
    a.unidade || '',
    a.criadoEm ? String(a.criadoEm).slice(0, 10) : '',
    ...(statusDe ? [statusDe(a)] : []),
  ]);
  return '﻿' + [cab, ...linhas].map((l) => l.map(csvCampo).join(';')).join('\r\n');
}

export function contarAlertas(alertas = []) {
  const c = { total: (alertas || []).length, critico: 0, alto: 0, medio: 0, baixo: 0 };
  (alertas || []).forEach((a) => { if (c[a.severidade] !== undefined) c[a.severidade] += 1; });
  return c;
}

// ------------------------------------------------------------
// Resumo numérico do BI (histórico + prompt da IA + PDF)
// ------------------------------------------------------------
export function resumoExecutivo(dados = {}) {
  const ex = dados.obras?.executivo || {};
  const p = dados.producao || {};
  const f = dados.financeiro || {};
  const s = dados.suprimentos?.kpis || {};
  const fluxo = f.fluxo || [];
  return {
    executivo: {
      obras_ativas: ex.obrasAtivas || 0, carteira_valor: ex.carteiraValor || 0, carteira_kg: ex.carteiraKg || 0,
      meses_carteira: ex.mesesCarteira ?? null, contratado: ex.contratado || 0, medido: ex.medido || 0,
      a_receber: ex.aReceber || 0, obras_em_atraso: ex.obrasEmAtraso || 0,
    },
    producao: {
      kg_semana_atual: p.tendencia?.kgSemanaAtual || 0, kg_semana_anterior: p.tendencia?.kgSemanaAnterior || 0,
      variacao_pct: p.tendencia?.variacaoPct ?? null,
      gargalo: p.gargalo?.etapa ? (ROTULO_ETAPA[p.gargalo.etapa] || p.gargalo.etapa) : null,
    },
    financeiro: {
      regra: f.geralEmpresa ? 'caixa da empresa' : 'somente a(s) obra(s)',
      receber_vencido: f.aging?.receberVencido || 0, pagar_vencido: f.aging?.pagarVencido || 0,
      saldo_8_semanas: fluxo.length ? fluxo[fluxo.length - 1].acumulado : 0,
    },
    estoque: { itens: s.nItens || 0, em_alerta: s.alertas || 0, valor_total: s.valorTotal || 0 },
    alertas: contarAlertas(dados.alertas),
  };
}

/** Prompt curto para a IA comentar o resumo (só números, sem dados pessoais). */
export function promptLeituraIA(resumo, escopoRotulo) {
  return [
    'Você é o analista da diretoria da MONTEX (estruturas metálicas).',
    `Escreva uma leitura executiva em português, em até 8 frases curtas e objetivas, sem markdown, sobre o escopo "${escopoRotulo}".`,
    'Aponte os 3 pontos de maior atenção e 1 ponto positivo. Use apenas os números abaixo; não invente dados.',
    JSON.stringify(resumo),
  ].join('\n');
}

// ------------------------------------------------------------
// Resumo de agendamento (relatorios_historico.formato = 'resumo')
// ------------------------------------------------------------
/** Converte o JSON do motor em seções legíveis. */
export function secoesResumoAgendado(resumo = {}) {
  const r = resumo || {};
  const secoes = [];
  if (r.producao) {
    const porEtapa = Object.entries(r.producao.por_etapa || {}).map(([etapa, v]) => ({
      etapa, rotulo: ROTULO_ETAPA[etapaCanonica(etapa)] || etapa, pecas: num(v?.pecas), kg: num(v?.kg),
    }));
    const ordem = ['aguardando', 'fabricacao', 'solda', 'pintura', 'expedido', 'enviado', 'entregue'];
    porEtapa.sort((a, b) => ordem.indexOf(etapaCanonica(a.etapa)) - ordem.indexOf(etapaCanonica(b.etapa)));
    secoes.push({
      id: 'producao', titulo: 'Produção',
      itens: [
        { rotulo: 'kg prontos (7 dias)', valor: num(r.producao.kg_prontos_7d), tipo: 'kg' },
        { rotulo: 'Movimentações (7 dias)', valor: num(r.producao.movimentacoes_7d), tipo: 'num' },
        { rotulo: 'Peças no escopo', valor: porEtapa.reduce((s, e) => s + e.pecas, 0), tipo: 'num' },
        { rotulo: 'Peso total', valor: porEtapa.reduce((s, e) => s + e.kg, 0), tipo: 'kg' },
      ],
      porEtapa,
    });
  }
  if (r.financeiro) {
    secoes.push({
      id: 'financeiro', titulo: 'Financeiro', nota: r.financeiro.regra ? `Regra: ${r.financeiro.regra}` : null,
      itens: [
        { rotulo: 'A pagar vencido', valor: num(r.financeiro.a_pagar_vencido), tipo: 'brl', alerta: num(r.financeiro.a_pagar_vencido) > 0 },
        { rotulo: 'Contas vencidas', valor: num(r.financeiro.qtd_vencidas), tipo: 'num', alerta: num(r.financeiro.qtd_vencidas) > 0 },
        { rotulo: 'A pagar em 7 dias', valor: num(r.financeiro.a_pagar_7d), tipo: 'brl' },
        { rotulo: 'A receber (medições)', valor: num(r.financeiro.a_receber_medicoes), tipo: 'brl' },
        { rotulo: 'Faturado no mês', valor: num(r.financeiro.faturado_mes), tipo: 'brl' },
      ],
    });
  }
  if (r.estoque) {
    secoes.push({
      id: 'estoque', titulo: 'Estoque',
      itens: [
        { rotulo: 'Itens', valor: num(r.estoque.itens), tipo: 'num' },
        { rotulo: 'Em alerta (≤ mínimo)', valor: num(r.estoque.em_alerta), tipo: 'num', alerta: num(r.estoque.em_alerta) > 0 },
        { rotulo: 'Zerados', valor: num(r.estoque.zerados), tipo: 'num', alerta: num(r.estoque.zerados) > 0 },
        { rotulo: 'Valor em estoque', valor: num(r.estoque.valor_total), tipo: 'brl' },
      ],
    });
  }
  return secoes;
}

/** Nome de arquivo seguro com data local. */
export function nomeArquivo(base, escopoRotulo, ext, hoje = new Date()) {
  const slug = String(escopoRotulo || 'geral').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'geral';
  return `${base}_${slug}_${isoLocal(hoje)}.${ext}`;
}

// ------------------------------------------------------------
// PDF — Resumo executivo BI 360 (jsPDF carregado sob demanda)
// ------------------------------------------------------------
const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const kgTxt = (v) => `${Math.round(Number(v) || 0).toLocaleString('pt-BR')} kg`;
const pct = (v) => (v === null || v === undefined ? '—' : `${(Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
const dataTxt = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'; };
const corRGB = (hex) => { const h = String(hex || '#64748b').replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };

/**
 * Monta o PDF executivo. Recebe o retorno de useBIData().
 * @returns {Promise<{doc, paginas, nome}>}
 */
export async function montarResumoExecutivoPDF(dados, { escopoRotulo = 'Geral', leituraIA = null, logoDataUrl = null, geradoPor = '', hoje = new Date() } = {}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const M = 10, W = 190, BOTTOM = 282;
  let y = 0;

  const cabecalho = () => {
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 26, 'F');
    if (logoDataUrl) { try { doc.addImage(logoDataUrl, 'PNG', M, 4, 18, 18); } catch { /* sem logo */ } }
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.text('Resumo executivo — BI 360', M + (logoDataUrl ? 22 : 0), 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(203, 213, 225);
    doc.text(`Escopo: ${escopoRotulo}   ·   Gerado em ${hoje.toLocaleString('pt-BR')}${geradoPor ? `   ·   por ${geradoPor}` : ''}`, M + (logoDataUrl ? 22 : 0), 19);
    y = 33;
  };
  const novaPagina = () => { doc.addPage(); cabecalho(); };
  const garantir = (h) => { if (y + h > BOTTOM) novaPagina(); };
  const titulo = (t, sub) => {
    garantir(14);
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(t, M, y);
    if (sub) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text(doc.splitTextToSize(sub, W)[0], M, y + 4.5); y += 4.5; }
    y += 4;
  };
  const tabela = (cols, linhas, { vazio = 'Sem dados no escopo.' } = {}) => {
    const rowH = 6, headH = 7;
    const larguras = cols.map((c) => c.w);
    const head = () => {
      doc.setFillColor(30, 41, 59); doc.rect(M, y, W, headH, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      let x = M;
      cols.forEach((c, i) => { doc.text(c.t, c.dir ? x + larguras[i] - 1.5 : x + 1.5, y + 4.8, { align: c.dir ? 'right' : 'left' }); x += larguras[i]; });
      y += headH;
    };
    garantir(headH + rowH); head();
    if (!linhas.length) {
      doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.text(vazio, M + 1.5, y + 4.3); y += rowH + 2; return;
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    linhas.forEach((l, li) => {
      if (y + rowH > BOTTOM) { novaPagina(); head(); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); }
      if (li % 2 === 0) { doc.setFillColor(241, 245, 249); doc.rect(M, y, W, rowH, 'F'); }
      let x = M;
      l.forEach((v, i) => {
        const c = cols[i];
        const cor = l.cores?.[i];
        if (cor) doc.setTextColor(...corRGB(cor)); else doc.setTextColor(30, 41, 59);
        const txt = doc.splitTextToSize(String(v ?? ''), larguras[i] - 3)[0] || '';
        doc.text(txt, c.dir ? x + larguras[i] - 1.5 : x + 1.5, y + 4.2, { align: c.dir ? 'right' : 'left' });
        x += larguras[i];
      });
      y += rowH;
    });
    y += 4;
  };
  const kpis = (lista) => {
    const n = lista.length, gap = 3, cw = (W - gap * (n - 1)) / n, h = 17;
    garantir(h + 4);
    lista.forEach(([rot, val, cor], i) => {
      const x = M + i * (cw + gap);
      doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240); doc.roundedRect(x, y, cw, h, 1.5, 1.5, 'FD');
      doc.setFillColor(...corRGB(cor)); doc.rect(x, y, 1.2, h, 'F');
      doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(rot, x + 3, y + 5);
      doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
      doc.text(doc.splitTextToSize(String(val), cw - 4)[0], x + 3, y + 12);
    });
    y += h + 5;
  };

  cabecalho();
  const ex = dados?.obras?.executivo || {};
  const prod = dados?.producao || {};
  const fin = dados?.financeiro || {};
  const sup = dados?.suprimentos?.kpis || {};
  const alertas = dados?.alertas || [];
  const ca = contarAlertas(alertas);

  // ---- KPIs executivos ----
  titulo('Indicadores executivos', 'Obras ativas do escopo. Carteira = saldo a medir; meses de carteira pelo ritmo atual de peças prontas.');
  kpis([
    ['Obras ativas', String(ex.obrasAtivas || 0), '#3b82f6'],
    ['Carteira (a medir)', brl(ex.carteiraValor), '#3b82f6'],
    ['Carteira (kg)', kgTxt(ex.carteiraKg), '#3b82f6'],
    ['Meses de carteira', ex.mesesCarteira === null || ex.mesesCarteira === undefined ? '—' : String(ex.mesesCarteira).replace('.', ','), '#3b82f6'],
  ]);
  kpis([
    ['Contratado', brl(ex.contratado), '#22c55e'],
    ['Medido', brl(ex.medido), '#22c55e'],
    ['A receber', brl(ex.aReceber), '#eab308'],
    ['Obras c/ previsão de atraso', String(ex.obrasEmAtraso || 0), (ex.obrasEmAtraso || 0) > 0 ? '#ef4444' : '#22c55e'],
  ]);

  // ---- Leitura da IA ----
  if (leituraIA) {
    titulo('Leitura da IA', 'Texto gerado automaticamente a partir dos números deste relatório — confira antes de decidir.');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 41, 59);
    doc.splitTextToSize(String(leituraIA), W).forEach((linha) => { garantir(5); doc.text(linha, M, y); y += 4.6; });
    y += 4;
  }

  // ---- Obras ----
  titulo('Obras — físico × financeiro e previsão × prazo', 'Físico = kg com fabricação concluída ÷ peso do contrato. Financeiro = medido ÷ valor do contrato. Gap em pontos percentuais.');
  const ind = (dados?.obras?.indicadores || []).filter((o) => o.ativa);
  tabela(
    [{ t: 'Obra', w: 50 }, { t: 'Contrato', w: 26, dir: true }, { t: 'Físico', w: 16, dir: true }, { t: 'Financ.', w: 16, dir: true },
      { t: 'Gap', w: 14, dir: true }, { t: 'Ritmo/sem', w: 20, dir: true }, { t: 'Previsão', w: 16, dir: true }, { t: 'Prazo', w: 16, dir: true }, { t: 'Atraso', w: 16, dir: true }],
    ind.map((o) => {
      const l = [`${o.codigo ? `${o.codigo} ` : ''}${o.nome}`, o.semContrato ? 'sem contrato' : brl(o.valorContrato), pct(o.fisicoPct), pct(o.financeiroPct),
        o.gapPp === null ? '—' : `${o.gapPp > 0 ? '+' : ''}${String(o.gapPp).replace('.', ',')}`, kgTxt(o.ritmoKgSemana), dataTxt(o.previsaoFim), dataTxt(o.prazo),
        o.atrasoDias > 0 ? `${o.atrasoDias} d` : (o.atrasoDias === null || o.atrasoDias === undefined ? '—' : 'no prazo')];
      l.cores = { 8: o.atrasoDias > 0 ? '#ef4444' : null };
      return l;
    }),
    { vazio: 'Nenhuma obra ativa no escopo.' },
  );

  // ---- Produção ----
  titulo('Produção — ritmo e gargalo', 'Ritmo = kg que saíram da pintura por semana (média de 4 semanas). Gargalo = etapa com mais semanas de fila.');
  const t = prod.tendencia || {};
  kpis([
    ['Ritmo atual (kg/sem)', kgTxt(t.kgSemanaAtual), '#22c55e'],
    ['4 semanas anteriores', kgTxt(t.kgSemanaAnterior), '#64748b'],
    ['Variação', t.variacaoPct === null || t.variacaoPct === undefined ? '—' : pct(t.variacaoPct), (t.variacaoPct || 0) < 0 ? '#ef4444' : '#22c55e'],
    ['Gargalo', prod.gargalo?.etapa ? (ROTULO_ETAPA[prod.gargalo.etapa] || prod.gargalo.etapa) : 'nenhum', prod.gargalo?.etapa ? '#f97316' : '#22c55e'],
  ]);
  tabela(
    [{ t: 'Etapa', w: 50 }, { t: 'Em fila (kg)', w: 45, dir: true }, { t: 'Saída média (kg/sem)', w: 50, dir: true }, { t: 'Semanas de fila', w: 45, dir: true }],
    (prod.gargalo?.linhas || []).map((g) => [ROTULO_ETAPA[g.etapa] || g.etapa, kgTxt(g.wipKg), kgTxt(g.saidaKgSemana), g.travada ? 'travada' : (g.semanasFila === null ? '—' : String(g.semanasFila).replace('.', ','))]),
  );
  const wip = (prod.wip?.resumo || []).filter((w) => w.pecas > 0);
  if (wip.length) {
    tabela(
      [{ t: 'Etapa atual', w: 70 }, { t: 'Peças', w: 40, dir: true }, { t: 'Peso', w: 40, dir: true }, { t: 'Idade mediana', w: 40, dir: true }],
      wip.map((w) => [ROTULO_ETAPA[w.etapa] || w.etapa, (w.pecas || 0).toLocaleString('pt-BR'), kgTxt(w.kg), w.idadeMedianaDias === null ? '—' : `${String(w.idadeMedianaDias).replace('.', ',')} d`]),
    );
  }

  // ---- Financeiro ----
  titulo('Financeiro — aging e fluxo de 8 semanas', regraFinanceiro(!!fin.geralEmpresa));
  kpis([
    ['A receber vencido', brl(fin.aging?.receberVencido), (fin.aging?.receberVencido || 0) > 0 ? '#ef4444' : '#22c55e'],
    ['A pagar vencido', brl(fin.aging?.pagarVencido), (fin.aging?.pagarVencido || 0) > 0 ? '#ef4444' : '#22c55e'],
    ['Saldo projetado (8 sem)', brl((fin.fluxo || []).slice(-1)[0]?.acumulado || 0), ((fin.fluxo || []).slice(-1)[0]?.acumulado || 0) < 0 ? '#ef4444' : '#22c55e'],
  ]);
  tabela(
    [{ t: 'Faixa de atraso', w: 70 }, { t: 'A receber', w: 60, dir: true }, { t: 'A pagar', w: 60, dir: true }],
    (fin.aging?.faixas || []).map((f) => [f.rotulo, brl(f.receber), brl(f.pagar)]),
  );
  tabela(
    [{ t: 'Semana de', w: 38 }, { t: 'Entradas', w: 38, dir: true }, { t: 'Saídas', w: 38, dir: true }, { t: 'Saldo', w: 38, dir: true }, { t: 'Acumulado', w: 38, dir: true }],
    (fin.fluxo || []).map((f) => {
      const l = [rotuloSemana(f.semana), brl(f.entradas), brl(f.saidas), brl(f.saldo), brl(f.acumulado)];
      l.cores = { 4: f.acumulado < 0 ? '#ef4444' : null };
      return l;
    }),
  );

  // ---- Estoque ----
  titulo('Estoque');
  kpis([
    ['Itens', (sup.nItens || 0).toLocaleString('pt-BR'), '#3b82f6'],
    ['Em alerta', (sup.alertas || 0).toLocaleString('pt-BR'), (sup.alertas || 0) > 0 ? '#f97316' : '#22c55e'],
    ['Valor em estoque', brl(sup.valorTotal), '#3b82f6'],
  ]);

  // ---- Alertas ----
  titulo('Principais alertas', `${ca.total} alerta(s): ${ca.critico} crítico(s), ${ca.alto} alto(s), ${ca.medio} médio(s), ${ca.baixo} baixo(s). Lista completa no Radar de Alertas.`);
  tabela(
    [{ t: 'Severidade', w: 22 }, { t: 'Área', w: 26 }, { t: 'Alerta', w: 142 }],
    alertas.slice(0, 15).map((a) => {
      const l = [SEVERIDADES[a.severidade]?.rotulo || a.severidade, REGRAS[a.regra]?.area || '', `${a.titulo}${a.detalhe ? ` — ${a.detalhe}` : ''}`];
      l.cores = { 0: SEVERIDADES[a.severidade]?.cor || null };
      return l;
    }),
    { vazio: 'Nenhum alerta ativo no escopo.' },
  );

  // ---- Rodapé ----
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240); doc.line(M, 287, M + W, 287);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
    doc.text(`MONTEX · Resumo executivo · ${escopoRotulo}`, M, 291.5);
    doc.text(`Página ${p}/${total}`, M + W, 291.5, { align: 'right' });
  }
  return { doc, paginas: total, nome: nomeArquivo('resumo_executivo', escopoRotulo, 'pdf', hoje) };
}
