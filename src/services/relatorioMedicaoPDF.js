// ============================================================
// Pleito de Medição em PDF (para envio ao CLIENTE)
// ============================================================
// Mesmo padrão visual dos relatórios de Produção/Estoque: faixa azul-marinho
// com logo, cards de indicadores, tabelas e rodapé "GRUPO MONTEX".
// Conteúdo vem de modeloPleito() (services/relatorioMedicao.js).
// ============================================================
import { jsPDF } from 'jspdf';

const M = 10;
const W = 190;
const BOTTOM = 280;

const hexRgb = (hex) => {
  const h = String(hex || '#64748b').replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

function cabecalho(doc, mod, logoDataUrl) {
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 24, 'F');
  if (logoDataUrl) {
    try { const h = 12, w = h * 1.341; doc.addImage(logoDataUrl, 'PNG', 200 - w, 4, w, h); } catch { /* logo inválido */ }
  }
  doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont(undefined, 'bold');
  doc.text(`MONTEX — ${mod.titulo}`, M, 11);
  doc.setFontSize(9); doc.setFont(undefined, 'normal');
  doc.text(`Obra: ${mod.obraTxt}`, M, 17);
  doc.text([mod.cliente ? `Cliente: ${mod.cliente}` : '', `Data-base: ${mod.dataTxt}`].filter(Boolean).join('   ·   '), M, 21.5);
}

// Título de seção: deixa 4 mm de respiro acima e devolve o y logo abaixo.
function titulo(doc, txt, y) {
  y += 4;
  doc.setTextColor(15, 23, 42); doc.setFontSize(11); doc.setFont(undefined, 'bold');
  doc.text(txt, M, y); doc.setFont(undefined, 'normal');
  return y + 3;
}

function garantir(doc, y, altura) {
  if (y + altura > 286) { doc.addPage(); return M + 4; }
  return y;
}

function tabela(doc, cols, rows, y, { estiloLinha } = {}) {
  const rowH = 6.2, headH = 7;
  const header = () => {
    doc.setFillColor(30, 41, 59); doc.rect(M, y, W, headH, 'F');
    doc.setTextColor(226, 232, 240); doc.setFontSize(8); doc.setFont(undefined, 'bold');
    cols.forEach((c) => doc.text(String(c.label), c.align === 'right' ? c.x + c.w - 1 : c.x + 1, y + 4.8, { align: c.align === 'right' ? 'right' : 'left' }));
    doc.setFont(undefined, 'normal');
    y += headH;
  };
  header();
  rows.forEach((row, i) => {
    if (y + rowH > BOTTOM) { doc.addPage(); y = M + 4; header(); }
    const est = (estiloLinha && estiloLinha(row)) || {};
    if (est.fill) { const [r, g, b] = est.fill; doc.setFillColor(r, g, b); doc.rect(M, y, W, rowH, 'F'); }
    else if (i % 2) { doc.setFillColor(241, 245, 249); doc.rect(M, y, W, rowH, 'F'); }
    doc.setFontSize(8); doc.setFont(undefined, est.bold ? 'bold' : 'normal');
    cols.forEach((c) => {
      const raw = row[c.k] == null ? '' : String(row[c.k]);
      const txt = doc.splitTextToSize(raw, c.w - 2)[0] || '';
      const cor = est.cor || [15, 23, 42];
      doc.setTextColor(cor[0], cor[1], cor[2]);
      doc.text(txt, c.align === 'right' ? c.x + c.w - 1 : c.x + 1, y + 4.2, { align: c.align === 'right' ? 'right' : 'left' });
    });
    doc.setFont(undefined, 'normal');
    y += rowH;
  });
  return y + 3;
}

export function montarPleitoMedicaoDoc(mod, { logoDataUrl } = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  cabecalho(doc, mod, logoDataUrl);
  let y = 31;

  // Subtítulo + texto de solicitação
  doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont(undefined, 'bold');
  doc.text(mod.subtitulo, M, y); y += 5;
  doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(51, 65, 85);
  const intro = doc.splitTextToSize(mod.intro, W);
  doc.text(intro, M, y); y += intro.length * 4.2 + 3;

  // Destaque: valor pleiteado
  doc.setDrawColor(22, 163, 74); doc.setLineWidth(0.6); doc.setFillColor(240, 253, 244);
  doc.roundedRect(M, y, W, 20, 2, 2, 'FD'); doc.setLineWidth(0.2);
  doc.setTextColor(21, 128, 61); doc.setFontSize(8.5); doc.setFont(undefined, 'bold');
  doc.text('VALOR PLEITEADO PARA AUTORIZAÇÃO', M + 5, y + 6.5);
  doc.setTextColor(15, 23, 42); doc.setFontSize(20);
  doc.text(mod.destaque.valor, M + 5, y + 15.5);
  doc.setFontSize(9.5); doc.setFont(undefined, 'normal'); doc.setTextColor(51, 65, 85);
  doc.text(mod.destaque.formula, M + W - 5, y + 15.5, { align: 'right' });
  y += 25;

  // KPIs
  const kw = W / mod.kpis.length;
  mod.kpis.forEach((k, i) => {
    const x = M + i * kw;
    doc.setDrawColor(203, 213, 225); doc.setFillColor(248, 250, 252); doc.roundedRect(x + 1, y, kw - 2, 18, 1.5, 1.5, 'FD');
    doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.text(k.label, x + 4, y + 5);
    doc.setTextColor(15, 23, 42); doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text(k.valor, x + 4, y + 11.5);
    doc.setFont(undefined, 'normal'); doc.setTextColor(100, 116, 139); doc.setFontSize(6.8); doc.text(k.sub || '', x + 4, y + 15.8);
  });
  y += 24;

  // Barra do contrato
  y = titulo(doc, 'Situação do contrato', y) + 1;
  let x = M;
  mod.barra.forEach((b) => {
    const w = (b.pct / 100) * W;
    if (w <= 0.05) return;
    const [r, g, bl] = hexRgb(b.cor); doc.setFillColor(r, g, bl); doc.rect(x, y, w, 7, 'F');
    x += w;
  });
  doc.setDrawColor(203, 213, 225); doc.rect(M, y, W, 7);
  y += 11;
  let lx = M;
  mod.barra.forEach((b) => {
    const [r, g, bl] = hexRgb(b.cor); doc.setFillColor(r, g, bl); doc.rect(lx, y - 2.6, 3, 3, 'F');
    doc.setTextColor(51, 65, 85); doc.setFontSize(7.5);
    const t = `${b.label}: ${b.valorTxt} (${b.pctTxt})`;
    doc.text(t, lx + 4.5, y);
    lx += 4.5 + doc.getTextWidth(t) + 6;
  });
  y += 6;

  // Memória de cálculo
  y = garantir(doc, y, 60);
  y = titulo(doc, 'Memória de cálculo', y);
  y = tabela(doc, [
    { k: 'label', label: 'Descrição', x: M, w: 100 },
    { k: 'pecas', label: 'Peças', x: M + 100, w: 20, align: 'right' },
    { k: 'medida', label: 'Quantidade', x: M + 120, w: 36, align: 'right' },
    { k: 'valor', label: 'Valor', x: M + 156, w: 34, align: 'right' },
  ], mod.memoria, y, {
    estiloLinha: (r) => (r.tipo === 'total' ? { fill: [220, 252, 231], bold: true, cor: [21, 128, 61] }
      : r.tipo === 'subtotal' ? { fill: [226, 232, 240], bold: true }
      : r.tipo === 'deducao' ? { cor: [185, 28, 28] } : null),
  });
  doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
  if (mod.naoConsiderado.length) { doc.text(`Não considerado neste pleito: ${mod.naoConsiderado.join(' · ')}.`, M, y); y += 4; }
  if (mod.avisoExcedente) { doc.setTextColor(185, 28, 28); doc.text(mod.avisoExcedente, M, y); y += 4; }
  y += 2;

  // Histórico
  if (mod.historico.length) {
    y = garantir(doc, y, 25);
    y = titulo(doc, 'Medições anteriores', y);
    y = tabela(doc, [
      { k: 'numero', label: 'Nº', x: M, w: 12 },
      { k: 'data', label: 'Data', x: M + 12, w: 22 },
      { k: 'descricao', label: 'Descrição', x: M + 34, w: 66 },
      { k: 'medida', label: 'Quantidade', x: M + 100, w: 30, align: 'right' },
      { k: 'valor', label: 'Valor', x: M + 130, w: 34, align: 'right' },
      { k: 'situacao', label: 'Situação', x: M + 164, w: 26 },
    ], mod.historico, y, { estiloLinha: (r) => (r.adiantamento ? { cor: [100, 116, 139] } : null) });
  }

  if (mod.observacao) {
    y = garantir(doc, y, 18);
    y = titulo(doc, 'Observações', y) + 2;
    doc.setFontSize(8.5); doc.setTextColor(51, 65, 85);
    const obs = doc.splitTextToSize(mod.observacao, W);
    doc.text(obs, M, y); y += obs.length * 4 + 3;
  }

  // Aprovação
  y = garantir(doc, y, 42);
  y = titulo(doc, 'Autorização do cliente', y) + 2;
  doc.setFontSize(8.5); doc.setTextColor(51, 65, 85);
  doc.text('(   ) Autorizado          (   ) Autorizado com ressalvas          (   ) Não autorizado', M, y + 2);
  y += 6;
  const bw = (W - 6) / 2;
  [['GRUPO MONTEX', 'Responsável pela medição'], [mod.cliente || 'CLIENTE', 'Aprovação']].forEach(([nome, papel], i) => {
    const bx = M + i * (bw + 6);
    doc.setDrawColor(203, 213, 225); doc.setFillColor(248, 250, 252); doc.roundedRect(bx, y, bw, 25, 1.5, 1.5, 'FD');
    doc.setTextColor(15, 23, 42); doc.setFontSize(8.5); doc.setFont(undefined, 'bold'); doc.text(nome, bx + 4, y + 5.5);
    doc.setFont(undefined, 'normal'); doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.text(papel, bx + 4, y + 9.5);
    doc.setDrawColor(148, 163, 184);
    doc.line(bx + 4, y + 18, bx + bw - 4, y + 18);
    doc.text('Nome / Assinatura', bx + 4, y + 21.5);
    doc.text('Data: ____/____/______', bx + bw - 4, y + 21.5, { align: 'right' });
  });
  y += 29;

  // Anexo: peças ainda na fábrica que compõem o pleito
  if (mod.itens.length) {
    doc.addPage(); y = M + 4;
    y = titulo(doc, `Anexo — Peças fabricadas ainda na fábrica (${mod.itensTotal} · ${mod.itensPeso})`, y);
    doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
    doc.text('Peças aguardando carga ou em processo final incluídas no pleito. As já entregues constam nos romaneios de expedição.', M, y + 1.5);
    y += 5;
    y = tabela(doc, [
      { k: 'marca', label: 'Marca', x: M, w: 36 },
      { k: 'perfil', label: 'Perfil', x: M + 36, w: 54 },
      { k: 'situacao', label: 'Situação', x: M + 90, w: 40 },
      { k: 'qtd', label: 'Qtd', x: M + 130, w: 20, align: 'right' },
      { k: 'peso', label: 'Peso', x: M + 150, w: 40, align: 'right' },
    ], mod.itens, y);
    if (mod.itensTotal > mod.itens.length) {
      doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
      doc.text(`… mostrando as ${mod.itens.length} peças de maior peso, de ${mod.itensTotal}.`, M, y + 1);
    }
  }

  // Rodapé
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.2); doc.line(M, 289, 200, 289);
    doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.setFont(undefined, 'bold');
    doc.text('GRUPO MONTEX', M, 293);
    doc.setFont(undefined, 'normal'); doc.setTextColor(148, 163, 184);
    const meio = doc.splitTextToSize(`São Joaquim de Bicas/MG · ${mod.titulo} · ${mod.obraTxt}`, 140)[0] || '';
    doc.text(meio, M + 25, 293);
    doc.text(`Página ${p}/${total}`, 200, 293, { align: 'right' });
  }
  return { doc, paginas: total, nome: `${mod.nomeArquivo}.pdf` };
}

export function gerarPleitoMedicaoPDF(mod, opts = {}) {
  const { doc, paginas, nome } = montarPleitoMedicaoDoc(mod, opts);
  doc.save(nome);
  return { paginas, nome };
}
