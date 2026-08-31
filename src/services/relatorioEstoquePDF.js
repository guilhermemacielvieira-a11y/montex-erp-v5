// ============================================================
// Relatório de ESTOQUE por Obra (PDF) — 3 páginas
// ============================================================
// 1) Resumo: KPIs (necessário/entregue/falta/cobertura/nº perfis), barra de
//    cobertura, donut de situação, cobertura por perfil (barra proporcional ao
//    volume) e resumo por tipo de aço.
// 2) Detalhe por perfil: necessário, entregue, falta, cobertura, status.
// 3) Falta comprar: só pendentes (maior→menor) + lista de compra e excedentes.
// Mesmo padrão visual do relatório de Produção. Puro (sem React); usa jsPDF.
// ============================================================
import { jsPDF } from 'jspdf';
import { resumoMaterialObra, kpisEstoque } from './estoqueAnalytics';

const STATUS = {
  entregue: { txt: 'Entregue', cor: '#22c55e' },
  parcial: { txt: 'Parcial', cor: '#f59e0b' },
  faltando: { txt: 'Faltando', cor: '#ef4444' },
};
const fmtNum = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const fmtPeso = (kg) => (Number(kg) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg';
const fmtPct = (v) => (v == null ? '—' : `${Math.round(v)}%`);
const hexRgb = (hex) => {
  const h = String(hex || '#64748b').replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

function drawTable(doc, cols, rows, y, { margin = 10, width = 190, bottom = 284, headColor = [30, 41, 59] } = {}) {
  const rowH = 6, headH = 7;
  const header = () => {
    doc.setFillColor(headColor[0], headColor[1], headColor[2]); doc.rect(margin, y, width, headH, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont(undefined, 'bold');
    cols.forEach((c) => doc.text(String(c.label), c.align === 'right' ? c.x + c.w : c.x, y + 4.8, { align: c.align === 'right' ? 'right' : 'left' }));
    y += headH;
  };
  header(); doc.setFont(undefined, 'normal');
  rows.forEach((row, i) => {
    if (y > bottom) { doc.addPage(); y = margin; header(); doc.setFont(undefined, 'normal'); }
    if (row._total) { doc.setFillColor(226, 232, 240); doc.rect(margin, y, width, rowH, 'F'); }
    else if (i % 2) { doc.setFillColor(241, 245, 249); doc.rect(margin, y, width, rowH, 'F'); }
    doc.setFontSize(8);
    cols.forEach((c) => {
      // pill de status
      if (c.pill && row[c.k]) {
        const [r, g, b] = hexRgb(row._cor || '#64748b');
        const txt = String(row[c.k]); const w = doc.getTextWidth(txt) + 4;
        doc.setFillColor(r, g, b); doc.roundedRect(c.x, y + 1, Math.min(w, c.w), 4.2, 1, 1, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont(undefined, 'bold'); doc.setFontSize(7);
        doc.text(txt, c.x + 2, y + 4); doc.setFont(undefined, 'normal'); doc.setFontSize(8);
        return;
      }
      const raw = row[c.k] == null ? '' : String(row[c.k]);
      const t = doc.splitTextToSize(raw, c.w - 1)[0] || '';
      const col = (c.colorFn && c.colorFn(row)) || c.color || (row._total ? [15, 23, 42] : [15, 23, 42]);
      doc.setTextColor(col[0], col[1], col[2]);
      if (c.bold || row._total) doc.setFont(undefined, 'bold');
      doc.text(t, c.align === 'right' ? c.x + c.w : c.x, y + 4.1, { align: c.align === 'right' ? 'right' : 'left' });
      if (c.bold || row._total) doc.setFont(undefined, 'normal');
    });
    y += rowH;
  });
  return y + 3;
}

function drawProgress(doc, pct, y, { margin = 10, width = 190, cor = '#22c55e' } = {}) {
  doc.setFillColor(226, 232, 240); doc.roundedRect(margin, y, width, 7, 1.5, 1.5, 'F');
  const w = Math.max(1, Math.min(100, pct) / 100 * width);
  const [r, g, b] = hexRgb(cor); doc.setFillColor(r, g, b); doc.roundedRect(margin, y, w, 7, 1.5, 1.5, 'F');
  doc.setTextColor(15, 23, 42); doc.setFontSize(8.5); doc.setFont(undefined, 'bold');
  doc.text(`${Math.round(pct)}%`, margin + width - 2, y + 5, { align: 'right' });
  doc.setFont(undefined, 'normal');
  return y + 11;
}

// Fatia de pizza (polígono central + arco) para o donut.
function pieSlice(doc, cx, cy, r, a0, a1, cor) {
  const [R, G, B] = hexRgb(cor); doc.setFillColor(R, G, B);
  const steps = Math.max(2, Math.round((a1 - a0) / 0.12));
  const pts = [[cx, cy]];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  // jsPDF lines: relativo ao ponto inicial
  const start = pts[0];
  const rel = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
  doc.lines(rel, start[0], start[1], [1, 1], 'F', true);
}

function drawDonut(doc, cx, cy, r, segs) {
  const total = segs.reduce((s, x) => s + x.v, 0) || 1;
  let a = -Math.PI / 2;
  segs.forEach((s) => {
    if (s.v <= 0) return;
    const a1 = a + (s.v / total) * Math.PI * 2;
    pieSlice(doc, cx, cy, r, a, a1, s.cor); a = a1;
  });
  // furo (donut)
  doc.setFillColor(255, 255, 255); doc.circle(cx, cy, r * 0.55, 'F');
}

function header(doc, obra, logoDataUrl, hoje) {
  const M = 10;
  doc.setFillColor(15, 23, 41); doc.rect(0, 0, 210, 24, 'F');
  if (logoDataUrl) { try { const h = 12, w = h * 1.341; doc.addImage(logoDataUrl, 'PNG', 200 - w, 4, w, h); } catch (_) { /* ignora */ } }
  doc.setTextColor(255, 255, 255); doc.setFontSize(15); doc.setFont(undefined, 'bold');
  doc.text('MONTEX — Relatório de Estoque', M, 11);
  doc.setFontSize(9); doc.setFont(undefined, 'normal');
  const obraTxt = obra ? `Obra: ${obra.codigo ? obra.codigo + ' · ' : ''}${obra.nome || ''}` : 'Todas as obras';
  doc.text(obraTxt, M, 17);
  const cli = obra?.cliente;
  doc.text([cli ? `Cliente: ${cli}` : '', `Gerado em ${hoje}`].filter(Boolean).join('   ·   '), M, 21.5);
  return obraTxt;
}

export function montarRelatorioEstoqueDoc(estoque, obra, { data, logoDataUrl } = {}) {
  const mat = resumoMaterialObra(estoque || []);
  const k = kpisEstoque(estoque || []);
  const linhas = [...mat.linhas];
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const M = 10, W = 190;
  const hoje = data || new Date().toLocaleString('pt-BR');
  const obraTxt = header(doc, obra, logoDataUrl, hoje);
  let y = 30;

  // ===== PÁGINA 1 — RESUMO =====
  const kpis = [
    ['Necessário', fmtPeso(mat.totalNecessario), '#3b82f6'],
    ['Entregue', fmtPeso(mat.totalEntregue), '#22c55e'],
    ['Falta', fmtPeso(mat.totalFalta), '#f59e0b'],
    ['Cobertura', mat.coberturaPct != null ? `${mat.coberturaPct}%` : '—', '#06b6d4'],
    ['Perfis', fmtNum(linhas.length), '#a855f7'],
  ];
  const kw = W / kpis.length;
  kpis.forEach((kp, i) => {
    const x = M + i * kw; const [r, g, b] = hexRgb(kp[2]);
    doc.setDrawColor(203, 213, 225); doc.setFillColor(248, 250, 252); doc.roundedRect(x + 1, y, kw - 2, 16, 1.5, 1.5, 'FD');
    doc.setTextColor(r, g, b); doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); doc.text(kp[0], x + 4, y + 5);
    doc.setTextColor(15, 23, 42); doc.setFontSize(11); doc.text(kp[1], x + 4, y + 12); doc.setFont(undefined, 'normal');
  });
  y += 22;

  // Cobertura geral
  doc.setTextColor(15, 23, 42); doc.setFontSize(11); doc.setFont(undefined, 'bold');
  doc.text('Cobertura geral do material', M, y); y += 3; doc.setFont(undefined, 'normal');
  y = drawProgress(doc, mat.coberturaPct || 0, y, { cor: (mat.coberturaPct || 0) >= 80 ? '#22c55e' : (mat.coberturaPct || 0) >= 40 ? '#f59e0b' : '#ef4444' });
  y += 3;

  // Situação dos perfis: donut + legenda
  const yDonut = y;
  doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Situação dos perfis', M, y); y += 4; doc.setFont(undefined, 'normal');
  const segs = [
    { label: 'Entregue', v: mat.entregues, cor: '#22c55e' },
    { label: 'Parcial', v: mat.parciais, cor: '#f59e0b' },
    { label: 'Faltando', v: mat.faltando, cor: '#ef4444' },
  ];
  drawDonut(doc, M + 22, y + 18, 16, segs);
  let ly = y + 6;
  segs.forEach((s) => {
    const [r, g, b] = hexRgb(s.cor); doc.setFillColor(r, g, b); doc.rect(M + 46, ly - 2.6, 3, 3, 'F');
    doc.setTextColor(51, 65, 85); doc.setFontSize(9);
    doc.text(`${s.label}: ${fmtNum(s.v)} perfil(is)`, M + 51, ly); ly += 6;
  });
  // Resumo por tipo de aço (à direita)
  const porMat = {};
  linhas.forEach((l) => { const m = l.material || '—'; if (!porMat[m]) porMat[m] = { nec: 0, ent: 0 }; porMat[m].nec += l.necessario; porMat[m].ent += l.entregue; });
  const mats = Object.entries(porMat).map(([m, v]) => ({ m, ...v, cob: v.nec > 0 ? Math.round((v.ent / v.nec) * 100) : 0 })).sort((a, b) => b.nec - a.nec).slice(0, 6);
  const xR = M + 100;
  doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42); doc.text('Por tipo de aço', xR, yDonut + 4); doc.setFont(undefined, 'normal');
  let ry = yDonut + 9;
  mats.forEach((mm) => {
    doc.setTextColor(51, 65, 85); doc.setFontSize(8);
    doc.text(doc.splitTextToSize(mm.m, 34)[0] || '', xR, ry);
    doc.text(`${fmtPeso(mm.ent)} / ${fmtPeso(mm.nec)}`, xR + 88, ry, { align: 'right' });
    ry += 4.4;
  });
  y = Math.max(ly, ry) + 4;

  // Cobertura por perfil (barras proporcionais ao volume)
  doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
  doc.text('Cobertura por perfil (barra proporcional ao volume)', M, y); y += 5; doc.setFont(undefined, 'normal');
  const top = [...linhas].sort((a, b) => b.necessario - a.necessario).slice(0, 14);
  const maxNec = Math.max(1, ...top.map((l) => l.necessario));
  const labelW = 42, barW = 108, rowH = 7;
  top.forEach((l) => {
    if (y > 275) return;
    doc.setTextColor(51, 65, 85); doc.setFontSize(7.5);
    doc.text(doc.splitTextToSize(l.perfil, labelW - 2)[0] || '', M, y + 4);
    const wNec = Math.max(0.5, (l.necessario / maxNec) * barW);
    doc.setFillColor(226, 232, 240); doc.roundedRect(M + labelW, y + 1, wNec, 5, 1, 1, 'F');
    const wEnt = Math.max(0, (l.entregue / maxNec) * barW);
    const cor = STATUS[l.status]?.cor || '#64748b'; const [r, g, b] = hexRgb(cor);
    if (wEnt > 0) { doc.setFillColor(r, g, b); doc.roundedRect(M + labelW, y + 1, Math.min(wEnt, wNec), 5, 1, 1, 'F'); }
    doc.setTextColor(15, 23, 42); doc.setFontSize(7.5); doc.setFont(undefined, 'bold');
    doc.text(`${l.coberturaPct}%`, M + labelW + barW + 34, y + 4, { align: 'right' }); doc.setFont(undefined, 'normal');
    y += rowH;
  });

  // ===== PÁGINA 2 — DETALHE POR PERFIL =====
  doc.addPage(); y = M;
  doc.setTextColor(15, 23, 42); doc.setFontSize(13); doc.setFont(undefined, 'bold');
  doc.text('Detalhe do material por perfil', M, y); y += 5;
  doc.setFontSize(8.5); doc.setFont(undefined, 'normal'); doc.setTextColor(100, 116, 139);
  doc.text('Necessário = previsto no projeto (peso teórico). Entregue = recebido na fábrica. Falta = ainda por chegar.', M, y); y += 6;
  const cols = [
    { k: 'perfil', label: 'Perfil', x: M, w: 40, bold: true },
    { k: 'material', label: 'Material', x: M + 40, w: 26 },
    { k: 'nec', label: 'Necessário', x: M + 66, w: 24, align: 'right' },
    { k: 'ent', label: 'Entregue', x: M + 90, w: 24, align: 'right' },
    { k: 'fal', label: 'Falta', x: M + 114, w: 22, align: 'right' },
    { k: 'cob', label: 'Cobertura', x: M + 136, w: 22, align: 'right' },
    { k: 'st', label: 'Situação', x: M + 160, w: 30, pill: true },
  ];
  const ordenadas = [...linhas].sort((a, b) => b.necessario - a.necessario);
  const rows = ordenadas.map((l) => ({
    perfil: l.perfil, material: l.material,
    nec: fmtPeso(l.necessario), ent: fmtPeso(l.entregue), fal: fmtPeso(l.falta),
    cob: `${l.coberturaPct}%`, st: (STATUS[l.status] || {}).txt || l.status, _cor: STATUS[l.status]?.cor,
  }));
  rows.push({
    _total: true, perfil: 'TOTAL', material: '',
    nec: fmtPeso(mat.totalNecessario), ent: fmtPeso(mat.totalEntregue), fal: fmtPeso(mat.totalFalta),
    cob: mat.coberturaPct != null ? `${mat.coberturaPct}%` : '—', st: '',
  });
  y = drawTable(doc, cols, rows, y);

  // ===== PÁGINA 3 — FALTA COMPRAR =====
  doc.addPage(); y = M;
  doc.setFillColor(239, 68, 68); doc.rect(M, y, W, 9, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont(undefined, 'bold');
  doc.text('Falta comprar — lista de compra', M + 3, y + 6); doc.setFont(undefined, 'normal'); y += 13;
  const pendentes = ordenadas.filter((l) => l.falta > 0).sort((a, b) => b.falta - a.falta);
  const excedentes = ordenadas.filter((l) => (l.excedente || 0) > 0.5);
  const totalComprar = pendentes.reduce((s, l) => s + l.falta, 0);
  doc.setTextColor(185, 28, 28); doc.setFontSize(10); doc.setFont(undefined, 'bold');
  doc.text(`${fmtNum(pendentes.length)} perfil(is) a comprar · total ${fmtPeso(totalComprar)}`, M, y); y += 6;
  doc.setFont(undefined, 'normal');
  if (pendentes.length === 0) {
    doc.setTextColor(22, 163, 74); doc.setFontSize(11);
    doc.text('Material 100% coberto — nada a comprar.', M, y + 4); y += 12;
  } else {
    const red = [220, 38, 38];
    const colsC = [
      { k: 'perfil', label: 'Perfil', x: M, w: 44, bold: true, color: red },
      { k: 'material', label: 'Material', x: M + 44, w: 30 },
      { k: 'nec', label: 'Necessário', x: M + 74, w: 26, align: 'right' },
      { k: 'ent', label: 'Entregue', x: M + 100, w: 26, align: 'right' },
      { k: 'fal', label: 'Comprar', x: M + 126, w: 30, align: 'right', bold: true, color: red },
      { k: 'st', label: 'Situação', x: M + 156, w: 34, pill: true },
    ];
    const rowsC = pendentes.map((l) => ({
      perfil: l.perfil, material: l.material, nec: fmtPeso(l.necessario), ent: fmtPeso(l.entregue),
      fal: fmtPeso(l.falta), st: (STATUS[l.status] || {}).txt || l.status, _cor: STATUS[l.status]?.cor,
    }));
    rowsC.push({ _total: true, perfil: 'SUBTOTAL A COMPRAR', material: '', nec: '', ent: '', fal: fmtPeso(totalComprar), st: '' });
    y = drawTable(doc, colsC, rowsC, y);
  }
  if (excedentes.length) {
    y += 2; doc.setFontSize(8.5); doc.setFont(undefined, 'bold'); doc.setTextColor(100, 116, 139);
    const exTot = excedentes.reduce((s, l) => s + (l.excedente || 0), 0);
    doc.text(`Nota: ${fmtNum(excedentes.length)} perfil(is) com material EXCEDENTE (recebido além do necessário — não conta como entregue) — total ${fmtPeso(exTot)}.`, M, y);
    doc.setFont(undefined, 'normal'); doc.setTextColor(120, 130, 145); doc.setFontSize(8);
    doc.text(doc.splitTextToSize(excedentes.slice(0, 10).map((l) => `${l.perfil} (+${fmtPeso(l.excedente || 0)})`).join(', '), W).slice(0, 2).join('  '), M, y + 4);
  }

  // Rodapé em todas as páginas
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
  const nome = `relatorio_estoque_${(obra?.codigo || 'geral').toString().replace(/[^\w.-]+/g, '_')}.pdf`;
  return { doc, paginas: total, mat, k, nome };
}

export function gerarRelatorioEstoquePDF(estoque, obra, opts = {}) {
  const { doc, paginas, nome } = montarRelatorioEstoqueDoc(estoque, obra, opts);
  doc.save(nome);
  return { paginas };
}
