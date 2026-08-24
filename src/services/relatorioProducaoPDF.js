// ============================================================
// Relatório de Produção em PDF (para envio ao CLIENTE)
// ============================================================
// Foco no cliente: KPIs, gráficos (progresso geral + peso por etapa) e o
// detalhe das peças por etapa. Sem dados internos de funcionários. Puro (sem
// React); usa jsPDF. Agregações em services/relatorioProducao.js (testado).
// ============================================================
import { jsPDF } from 'jspdf';
import { resumoProducao, pecasPorEtapa, bloqueioFabricacao } from './relatorioProducao';
import { resumoMaterialObra } from './estoqueAnalytics';

const STATUS_MAT = {
  entregue: { txt: 'Entregue', cor: '#22c55e' },
  parcial: { txt: 'Parcial', cor: '#f59e0b' },
  faltando: { txt: 'Faltando', cor: '#ef4444' },
};

const fmtNum = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const fmtPeso = (kg) => {
  const n = Number(kg) || 0;
  return n >= 1000 ? (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' t'
                   : n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg';
};
export const DETALHE_CAP = 40; // limite padrão de peças por etapa no detalhe
const hexRgb = (hex) => {
  const h = String(hex || '#64748b').replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

function drawTable(doc, cols, rows, y, { margin = 10, width = 190, bottom = 285 } = {}) {
  const rowH = 6, headH = 7;
  const header = () => {
    doc.setFillColor(30, 41, 59); doc.rect(margin, y, width, headH, 'F');
    doc.setTextColor(226, 232, 240); doc.setFontSize(8); doc.setFont(undefined, 'bold');
    cols.forEach((c) => doc.text(String(c.label), c.align === 'right' ? c.x + c.w : c.x, y + 4.8, { align: c.align === 'right' ? 'right' : 'left' }));
    y += headH;
  };
  header();
  doc.setFont(undefined, 'normal');
  rows.forEach((row, i) => {
    if (y > bottom) { doc.addPage(); y = margin; header(); doc.setFont(undefined, 'normal'); }
    if (i % 2) { doc.setFillColor(241, 245, 249); doc.rect(margin, y, width, rowH, 'F'); }
    doc.setFontSize(8);
    cols.forEach((c) => {
      const raw = row[c.k] == null ? '' : String(row[c.k]);
      const txt = doc.splitTextToSize(raw, c.w - 2)[0] || '';
      const col = (c.colorFn && c.colorFn(row)) || c.color || [15, 23, 42];
      doc.setTextColor(col[0], col[1], col[2]);
      const bold = c.bold || (c.boldFn && c.boldFn(row));
      if (bold) doc.setFont(undefined, 'bold');
      doc.text(txt, c.align === 'right' ? c.x + c.w : c.x, y + 4.1, { align: c.align === 'right' ? 'right' : 'left' });
      if (bold) doc.setFont(undefined, 'normal');
    });
    y += rowH;
  });
  return y + 3;
}

// Gráfico de barras horizontais: itens [{label, value, valueTxt, cor}].
function drawBarChart(doc, itens, y, { margin = 10, labelW = 58, barW = 96, valW = 34 } = {}) {
  const maxVal = Math.max(1, ...itens.map((i) => i.value));
  const rowH = 8;
  itens.forEach((it) => {
    doc.setTextColor(51, 65, 85); doc.setFontSize(8); doc.setFont(undefined, 'normal');
    doc.text(doc.splitTextToSize(it.label, labelW - 2)[0] || '', margin, y + 4.2);
    // trilho
    doc.setFillColor(226, 232, 240); doc.roundedRect(margin + labelW, y + 1, barW, 5, 1, 1, 'F');
    // barra
    const w = Math.max(0.5, (it.value / maxVal) * barW);
    const [r, g, b] = hexRgb(it.cor); doc.setFillColor(r, g, b);
    doc.roundedRect(margin + labelW, y + 1, w, 5, 1, 1, 'F');
    // valor
    doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
    doc.text(it.valueTxt, margin + labelW + barW + valW, y + 4.2, { align: 'right' });
    doc.setFont(undefined, 'normal');
    y += rowH;
  });
  return y + 2;
}

function drawProgress(doc, pct, y, { margin = 10, width = 190 } = {}) {
  doc.setFillColor(226, 232, 240); doc.roundedRect(margin, y, width, 7, 1.5, 1.5, 'F');
  const w = Math.max(1, Math.min(100, pct) / 100 * width);
  doc.setFillColor(34, 197, 94); doc.roundedRect(margin, y, w, 7, 1.5, 1.5, 'F');
  doc.setTextColor(15, 23, 42); doc.setFontSize(8.5); doc.setFont(undefined, 'bold');
  doc.text(`${pct}%`, margin + width - 2, y + 5, { align: 'right' });
  doc.setFont(undefined, 'normal');
  return y + 11;
}

export function montarRelatorioProducaoDoc(pecas, obra, { data, cliente, estoque, logoDataUrl, detalheCap } = {}) {
  const resumo = resumoProducao(pecas);
  const grupos = pecasPorEtapa(pecas);
  const material = resumoMaterialObra(estoque || []);
  const bloqueio = bloqueioFabricacao(pecas, material.linhas);
  const cap = Number.isFinite(detalheCap) ? detalheCap : DETALHE_CAP;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const M = 10; const W = 190;
  const hoje = data || new Date().toLocaleString('pt-BR');
  let y = M;

  // Cabeçalho
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 24, 'F');
  // Logo (opcional) — canto superior direito
  if (logoDataUrl) {
    try { const h = 12, w = h * 1.341; doc.addImage(logoDataUrl, 'PNG', 200 - w, 4, w, h); } catch (_) { /* ignora logo inválido */ }
  }
  doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont(undefined, 'bold');
  doc.text('MONTEX — Relatório de Produção', M, 11);
  doc.setFontSize(9); doc.setFont(undefined, 'normal');
  const obraTxt = obra ? `Obra: ${obra.codigo ? obra.codigo + ' · ' : ''}${obra.nome || ''}` : 'Todas as obras';
  doc.text(obraTxt, M, 17);
  const cli = cliente || obra?.cliente;
  const linha2 = [cli ? `Cliente: ${cli}` : '', `Gerado em ${hoje}`].filter(Boolean).join('   ·   ');
  doc.text(linha2, M, 21.5);
  y = 30;

  // KPIs
  const kpis = [
    ['Peças', fmtNum(resumo.totalPecas)],
    ['Quantidade', fmtNum(resumo.totalQtd)],
    ['Peso total', fmtPeso(resumo.totalPeso)],
    ['Concluído', fmtPeso(resumo.pesoConcluido)],
    ['Progresso', `${resumo.progressoPct}%`],
  ];
  const kw = W / kpis.length;
  kpis.forEach((k, i) => {
    const x = M + i * kw;
    doc.setDrawColor(203, 213, 225); doc.setFillColor(248, 250, 252); doc.roundedRect(x + 1, y, kw - 2, 16, 1.5, 1.5, 'FD');
    doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.text(k[0], x + 4, y + 5);
    doc.setTextColor(15, 23, 42); doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text(k[1], x + 4, y + 12);
    doc.setFont(undefined, 'normal');
  });
  y += 22;

  // Progresso geral (gráfico)
  doc.setTextColor(15, 23, 42); doc.setFontSize(11); doc.setFont(undefined, 'bold');
  doc.text('Progresso geral da produção', M, y); y += 3; doc.setFont(undefined, 'normal');
  y = drawProgress(doc, resumo.progressoPct, y);
  y += 3;

  // Gráfico: peso por etapa
  doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Peso por etapa', M, y); y += 4; doc.setFont(undefined, 'normal');
  y = drawBarChart(doc, resumo.porEtapa.map((e) => ({
    label: e.label, value: e.peso, valueTxt: `${fmtPeso(e.peso)} · ${e.pct}%`, cor: e.cor,
  })), y);
  y += 2;

  // Tabela por etapa
  doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Resumo por etapa', M, y); y += 3; doc.setFont(undefined, 'normal');
  const colsEtapa = [
    { k: 'etapa', label: 'Etapa', x: M, w: 62 },
    { k: 'pecas', label: 'Peças', x: M + 62, w: 22, align: 'right' },
    { k: 'qtd', label: 'Qtd', x: M + 84, w: 26, align: 'right' },
    { k: 'peso', label: 'Peso', x: M + 110, w: 45, align: 'right' },
    { k: 'pct', label: '% peso', x: M + 155, w: 35, align: 'right' },
  ];
  y = drawTable(doc, colsEtapa, resumo.porEtapa.map((e) => ({
    etapa: e.label, pecas: fmtNum(e.pecas), qtd: fmtNum(e.qtd), peso: fmtPeso(e.peso), pct: `${e.pct}%`,
  })), y);

  // ===== Material da obra — Necessário × Entregue =====
  if (material.linhas.length) {
    doc.addPage(); y = M;
    doc.setTextColor(15, 23, 42); doc.setFontSize(13); doc.setFont(undefined, 'bold');
    doc.text('Material da Obra — Necessário × Entregue', M, y); y += 5;
    doc.setFontSize(8.5); doc.setFont(undefined, 'normal'); doc.setTextColor(100, 116, 139);
    doc.text('Necessário = material previsto no projeto (peso teórico). Entregue = já recebido na fábrica. Falta = ainda por chegar.', M, y); y += 6;

    // Resumo do material
    const kpisM = [
      ['Necessário', fmtPeso(material.totalNecessario)],
      ['Entregue', fmtPeso(material.totalEntregue)],
      ['Falta', fmtPeso(material.totalFalta)],
      ['Cobertura', material.coberturaPct != null ? `${material.coberturaPct}%` : '—'],
    ];
    const kwm = W / kpisM.length;
    kpisM.forEach((k, i) => {
      const x = M + i * kwm;
      doc.setDrawColor(203, 213, 225); doc.setFillColor(248, 250, 252); doc.roundedRect(x + 1, y, kwm - 2, 15, 1.5, 1.5, 'FD');
      doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.text(k[0], x + 4, y + 5);
      doc.setTextColor(15, 23, 42); doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text(k[1], x + 4, y + 11.5);
      doc.setFont(undefined, 'normal');
    });
    y += 19;
    doc.setFontSize(8.5); doc.setTextColor(51, 65, 85);
    doc.text(`Perfis: ${material.entregues} entregues · ${material.parciais} parciais · ${material.faltando} faltando`, M, y); y += 5;

    // Cobertura geral (barra)
    y = drawProgress(doc, material.coberturaPct || 0, y); y += 2;

    // Gráfico: entregue × necessário por perfil (top 12 por necessário)
    doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
    doc.text('Entregue × Necessário por perfil (maiores)', M, y); y += 4; doc.setFont(undefined, 'normal');
    const maxNec = Math.max(1, ...material.linhas.map((l) => l.necessario));
    const labelW = 46, barW = 108, rowH = 7.5;
    material.linhas.slice(0, 12).forEach((l) => {
      doc.setTextColor(51, 65, 85); doc.setFontSize(7.5);
      doc.text(doc.splitTextToSize(l.perfil, labelW - 2)[0] || '', M, y + 4);
      // trilho = necessário
      const wNec = Math.max(0.5, (l.necessario / maxNec) * barW);
      doc.setFillColor(226, 232, 240); doc.roundedRect(M + labelW, y + 1, wNec, 5, 1, 1, 'F');
      // preenchido = entregue (verde)
      const wEnt = Math.max(0, (l.entregue / maxNec) * barW);
      if (wEnt > 0) { doc.setFillColor(34, 197, 94); doc.roundedRect(M + labelW, y + 1, Math.min(wEnt, wNec), 5, 1, 1, 'F'); }
      doc.setTextColor(15, 23, 42); doc.setFontSize(7.5); doc.setFont(undefined, 'bold');
      doc.text(`${l.coberturaPct}%`, M + labelW + barW + 34, y + 4, { align: 'right' });
      doc.setFont(undefined, 'normal');
      y += rowH;
    });
    y += 2;

    // Tabela completa
    doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Detalhe do material por perfil', M, y); y += 3; doc.setFont(undefined, 'normal');
    const colsM = [
      { k: 'perfil', label: 'Perfil', x: M, w: 46 },
      { k: 'material', label: 'Material', x: M + 46, w: 30 },
      { k: 'nec', label: 'Necessário', x: M + 76, w: 30, align: 'right' },
      { k: 'ent', label: 'Entregue', x: M + 106, w: 28, align: 'right' },
      { k: 'fal', label: 'Falta', x: M + 134, w: 26, align: 'right' },
      { k: 'st', label: 'Status', x: M + 160, w: 30 },
    ];
    y = drawTable(doc, colsM, material.linhas.map((l) => ({
      perfil: l.perfil, material: l.material,
      nec: fmtPeso(l.necessario), ent: fmtPeso(l.entregue), fal: fmtPeso(l.falta),
      st: (STATUS_MAT[l.status] || {}).txt || l.status,
    })), y);
  }

  // ===== Peças com pendência de material — sem material (vermelho) / parcial (amarelo) =====
  if (bloqueio.itens.length > 0) {
    const red = [220, 38, 38];
    const amber = [180, 83, 9];
    const corDe = (row) => (row._st === 'parcial' ? amber : red);
    doc.addPage(); y = M;
    doc.setFillColor(239, 68, 68); doc.rect(M, y, W, 9, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont(undefined, 'bold');
    doc.text('⚠ Peças com pendência de material', M + 3, y + 6);
    doc.setFont(undefined, 'normal'); y += 13;
    doc.setFontSize(8.5); doc.setTextColor(100, 116, 139);
    doc.text('Peças em Aguardando/Fabricação cujo perfil ainda não chegou (integralmente) no estoque.', M, y); y += 5;
    // Legenda
    doc.setFillColor(220, 38, 38); doc.rect(M, y - 2.6, 3, 3, 'F');
    doc.setTextColor(51, 65, 85); doc.setFontSize(8);
    doc.text('Vermelho = sem material (não é possível fabricar)', M + 5, y);
    doc.setFillColor(217, 119, 6); doc.rect(M + 95, y - 2.6, 3, 3, 'F');
    doc.text('Amarelo = material parcial (parte já chegou)', M + 100, y); y += 6;
    // KPI
    doc.setTextColor(185, 28, 28); doc.setFontSize(10); doc.setFont(undefined, 'bold');
    doc.text(`Bloqueadas: ${fmtNum(bloqueio.nBloqueadas)} peça(s) · ${fmtNum(bloqueio.qtdBloqueada)} un · ${fmtPeso(bloqueio.pesoBloqueado)}`, M, y); y += 5;
    if (bloqueio.nParciais > 0) {
      doc.setTextColor(180, 83, 9);
      doc.text(`Parciais: ${fmtNum(bloqueio.nParciais)} peça(s) · ${fmtPeso(bloqueio.pesoParcial)}`, M, y); y += 5;
    }
    doc.setFont(undefined, 'normal'); doc.setTextColor(51, 65, 85); doc.setFontSize(8);
    if (bloqueio.perfisFaltando.length) {
      const l1 = doc.splitTextToSize(`Perfis sem material: ${bloqueio.perfisFaltando.join(', ')}`, W);
      l1.slice(0, 2).forEach((ln) => { doc.text(ln, M, y); y += 4; });
    }
    if (bloqueio.perfisParciais.length) {
      const l2 = doc.splitTextToSize(`Perfis parciais: ${bloqueio.perfisParciais.join(', ')}`, W);
      l2.slice(0, 2).forEach((ln) => { doc.text(ln, M, y); y += 4; });
    }
    y += 2;
    const colsB = [
      { k: 'marca', label: 'Marca', x: M, w: 24 },
      { k: 'perfil', label: 'Perfil', x: M + 24, w: 32, colorFn: corDe, bold: true },
      { k: 'material', label: 'Material', x: M + 56, w: 24 },
      { k: 'tipo', label: 'Tipo', x: M + 80, w: 22 },
      { k: 'qtd', label: 'Qtd', x: M + 102, w: 14, align: 'right' },
      { k: 'peso', label: 'Peso', x: M + 116, w: 22, align: 'right' },
      { k: 'falta', label: 'Falta comprar', x: M + 138, w: 26, align: 'right', colorFn: corDe, bold: true },
      { k: 'st', label: 'Status', x: M + 164, w: 26, colorFn: corDe, boldFn: () => true },
    ];
    y = drawTable(doc, colsB, bloqueio.itens.slice(0, cap).map((b) => ({
      marca: b.marca, perfil: b.perfil, material: b.material, tipo: b.tipo,
      qtd: fmtNum(b.quantidade), peso: fmtPeso(b.peso),
      falta: fmtPeso(b.faltaComprar),
      st: b.status === 'parcial' ? '⚠ Parcial' : '✗ Sem mat.',
      _st: b.status,
    })), y);
    if (bloqueio.itens.length > cap) {
      doc.setFontSize(8); doc.setTextColor(100, 116, 139);
      doc.text(`… mostrando as ${cap} de maior peso, de ${fmtNum(bloqueio.itens.length)} peças com pendência.`, M, y + 2);
    }
  }

  // Detalhe por etapa (dados de produção)
  const colsD = [
    { k: 'marca', label: 'Marca', x: M, w: 30 },
    { k: 'perfil', label: 'Perfil', x: M + 30, w: 36 },
    { k: 'material', label: 'Material', x: M + 66, w: 30 },
    { k: 'tipo', label: 'Tipo', x: M + 96, w: 34 },
    { k: 'qtd', label: 'Qtd', x: M + 130, w: 20, align: 'right' },
    { k: 'peso', label: 'Peso', x: M + 150, w: 40, align: 'right' },
  ];
  grupos.forEach((g) => {
    doc.addPage(); y = M;
    doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
    doc.text(`Peças — ${g.label}  (${fmtNum(g.itens.length)} · ${fmtPeso(g.itens.reduce((s, i) => s + i.peso, 0))})`, M, y);
    y += 4; doc.setFont(undefined, 'normal');
    const itens = g.itens.slice(0, cap);
    y = drawTable(doc, colsD, itens.map((it) => ({
      marca: it.marca, perfil: it.perfil, material: it.material, tipo: it.tipo,
      qtd: fmtNum(it.quantidade), peso: fmtPeso(it.peso),
    })), y);
    if (g.itens.length > cap) {
      doc.setFontSize(8); doc.setTextColor(100, 116, 139);
      doc.text(`… mostrando as ${cap} peças de maior peso, de ${fmtNum(g.itens.length)} nesta etapa.`, M, y + 2);
    }
  });

  // Rodapé (linha divisória + branding + paginação)
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.2); doc.line(M, 289, 200, 289);
    doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.setFont(undefined, 'bold');
    doc.text('GRUPO MONTEX', M, 293);
    doc.setFont(undefined, 'normal'); doc.setTextColor(148, 163, 184);
    doc.text(`São Joaquim de Bicas/MG · ${obraTxt}`, M + 25, 293);
    doc.text(`Página ${p}/${total}`, 200, 293, { align: 'right' });
  }

  const nome = `relatorio_producao_${(obra?.codigo || 'geral').toString().replace(/[^\w.-]+/g, '_')}.pdf`;
  return { doc, paginas: total, resumo, nome };
}

export function gerarRelatorioProducaoPDF(pecas, obra, opts = {}) {
  const { doc, paginas, resumo, nome } = montarRelatorioProducaoDoc(pecas, obra, opts);
  doc.save(nome);
  return { paginas, resumo };
}
