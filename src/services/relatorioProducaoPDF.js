// ============================================================
// Relatório de Produção em PDF (para envio ao CLIENTE)
// ============================================================
// Foco no cliente: KPIs, gráficos (progresso geral + peso por etapa) e o
// detalhe das peças por etapa. Sem dados internos de funcionários. Puro (sem
// React); usa jsPDF. Agregações em services/relatorioProducao.js (testado).
// ============================================================
import { jsPDF } from 'jspdf';
import { resumoProducao, pecasPorEtapa, bloqueioFabricacao, estadoProducao } from './relatorioProducao';
import { resumoMaterialObra } from './estoqueAnalytics';

const STATUS_MAT = {
  entregue: { txt: 'Entregue', cor: '#22c55e' },
  parcial: { txt: 'Parcial', cor: '#f59e0b' },
  faltando: { txt: 'Faltando', cor: '#ef4444' },
};

const fmtNum = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
// Peso SEMPRE em kg (sem conversão para toneladas) — padronizado com a planilha.
const fmtPeso = (kg) => (Number(kg) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg';
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

// Fatia de pizza (para o donut de estados de produção).
function pieSlice(doc, cx, cy, r, a0, a1, cor) {
  const [R, G, B] = hexRgb(cor); doc.setFillColor(R, G, B);
  const steps = Math.max(2, Math.round((a1 - a0) / 0.12));
  const pts = [[cx, cy]];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const start = pts[0];
  const rel = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
  doc.lines(rel, start[0], start[1], [1, 1], 'F', true);
}
function drawDonut(doc, cx, cy, r, segs) {
  const total = segs.reduce((s, x) => s + x.v, 0) || 1;
  let a = -Math.PI / 2;
  segs.forEach((s) => { if (s.v <= 0) return; const a1 = a + (s.v / total) * Math.PI * 2; pieSlice(doc, cx, cy, r, a, a1, s.cor); a = a1; });
  doc.setFillColor(255, 255, 255); doc.circle(cx, cy, r * 0.55, 'F');
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
  const estado = estadoProducao(pecas);
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

  // ===== Estado da Produção (consolidado) — donut + cards =====
  doc.setTextColor(15, 23, 42); doc.setFontSize(11); doc.setFont(undefined, 'bold');
  doc.text('Estado da produção', M, y); y += 2; doc.setFont(undefined, 'normal');
  doc.setFontSize(8); doc.setTextColor(100, 116, 139);
  doc.text('Consolida as etapas por estado. Já fabricado = Solda em diante · Em processo = Fabricação/Solda/Pintura.', M, y + 4);
  const yEst = y + 8;
  // Donut à esquerda
  drawDonut(doc, M + 20, yEst + 18, 16, estado.estados.map((e) => ({ v: e.peso, cor: e.cor })));
  // Legenda dos estados macro (à direita do donut)
  let ly = yEst + 3;
  estado.estados.forEach((e) => {
    const [r, g, b] = hexRgb(e.cor); doc.setFillColor(r, g, b); doc.rect(M + 42, ly - 2.4, 3, 3, 'F');
    doc.setTextColor(51, 65, 85); doc.setFontSize(7.8);
    doc.text(`${e.label}: ${fmtPeso(e.peso)} · ${e.pct}%`, M + 47, ly); ly += 5;
  });
  // Cards de recorte executivo (à direita)
  const cards = [
    ['Não iniciado', fmtPeso(estado.naoIniciado.peso), `${fmtNum(estado.naoIniciado.pecas)} pç · ${estado.naoIniciado.pct}%`, '#64748b'],
    ['Em processo', fmtPeso(estado.emProcesso.peso), `${fmtNum(estado.emProcesso.pecas)} pç · ${estado.emProcesso.pct}%`, '#3b82f6'],
    ['Já fabricado', fmtPeso(estado.jaFabricado.peso), `${fmtNum(estado.jaFabricado.pecas)} pç · ${estado.jaFabricado.pct}%`, '#14b8a6'],
    ['Entregue', fmtPeso(estado.entregue.peso), `${fmtNum(estado.entregue.pecas)} pç · ${estado.entregue.pct}%`, '#22c55e'],
  ];
  const cx0 = M + 108, cw = (W - 108) / 2, ch = 15;
  cards.forEach((c, i) => {
    const cx = cx0 + (i % 2) * cw, cy = yEst + Math.floor(i / 2) * (ch + 2);
    const [r, g, b] = hexRgb(c[3]);
    doc.setDrawColor(203, 213, 225); doc.setFillColor(248, 250, 252); doc.roundedRect(cx + 1, cy, cw - 2, ch, 1.5, 1.5, 'FD');
    doc.setTextColor(r, g, b); doc.setFontSize(7); doc.setFont(undefined, 'bold'); doc.text(c[0], cx + 4, cy + 4.5);
    doc.setTextColor(15, 23, 42); doc.setFontSize(10); doc.text(c[1], cx + 4, cy + 10);
    doc.setTextColor(100, 116, 139); doc.setFontSize(6.5); doc.setFont(undefined, 'normal'); doc.text(c[2], cx + 4, cy + 13.5);
  });
  y = Math.max(ly, yEst + 2 * (ch + 2)) + 4;

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
    // Colunas separadas (Falta / Cobertura / Status não colidem mais).
    const colsM = [
      { k: 'perfil', label: 'Perfil', x: M, w: 42 },
      { k: 'material', label: 'Material', x: M + 42, w: 26 },
      { k: 'nec', label: 'Necessário', x: M + 68, w: 26, align: 'right' },
      { k: 'ent', label: 'Entregue', x: M + 94, w: 24, align: 'right' },
      { k: 'fal', label: 'Falta', x: M + 118, w: 22, align: 'right' },
      { k: 'cob', label: 'Cobertura', x: M + 142, w: 20, align: 'right' },
      { k: 'st', label: 'Status', x: M + 164, w: 26 },
    ];
    y = drawTable(doc, colsM, material.linhas.map((l) => ({
      perfil: l.perfil, material: l.material,
      nec: fmtPeso(l.necessario), ent: fmtPeso(l.entregue), fal: fmtPeso(l.falta),
      cob: `${l.coberturaPct}%`,
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
    // ===== Painel analítico: 4 indicadores da realidade geral =====
    const pesoImpactado = bloqueio.pesoBloqueado + bloqueio.pesoParcial;
    const pctImpacto = resumo.totalPeso > 0 ? Math.round((pesoImpactado / resumo.totalPeso) * 100) : 0;
    const painel = [
      ['Não fabricável', `${fmtPeso(bloqueio.pesoBloqueado)}`, `${fmtNum(bloqueio.nBloqueadas)} pç · ${fmtNum(bloqueio.nPerfisFaltando)} perfis`, [220, 38, 38]],
      ['Material parcial', `${fmtPeso(bloqueio.pesoParcial)}`, `${fmtNum(bloqueio.nParciais)} pç · ${fmtNum(bloqueio.nPerfisParciais)} perfis`, [180, 83, 9]],
      ['Falta comprar', `${fmtPeso(bloqueio.faltaComprarTotal)}`, 'total por perfil', [37, 99, 235]],
      ['% peso impactado', `${pctImpacto}%`, `de ${fmtPeso(resumo.totalPeso)}`, [15, 23, 42]],
    ];
    const pw = W / painel.length;
    painel.forEach((k, i) => {
      const x = M + i * pw;
      doc.setDrawColor(203, 213, 225); doc.setFillColor(248, 250, 252); doc.roundedRect(x + 1, y, pw - 2, 17, 1.5, 1.5, 'FD');
      doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); doc.text(k[0], x + 4, y + 5);
      doc.setTextColor(k[3][0], k[3][1], k[3][2]); doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(k[1], x + 4, y + 11.5);
      doc.setTextColor(100, 116, 139); doc.setFontSize(6.8); doc.setFont(undefined, 'normal'); doc.text(k[2], x + 4, y + 15.5);
    });
    y += 22;

    // ===== Tabela ANALÍTICA por perfil (material faltante → impacto em peças) =====
    doc.setFontSize(10.5); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
    doc.text('Material faltante × peças impactadas (por perfil)', M, y); y += 3; doc.setFont(undefined, 'normal');
    const colsP = [
      { k: 'perfil', label: 'Perfil', x: M, w: 40, colorFn: corDe, bold: true },
      { k: 'material', label: 'Material', x: M + 40, w: 26 },
      { k: 'st', label: 'Situação', x: M + 66, w: 30, colorFn: corDe, boldFn: () => true },
      { k: 'nPecas', label: 'Peças', x: M + 96, w: 18, align: 'right' },
      { k: 'peso', label: 'Peso travado', x: M + 114, w: 32, align: 'right', colorFn: corDe, bold: true },
      { k: 'falta', label: 'Falta comprar', x: M + 146, w: 44, align: 'right', colorFn: corDe, bold: true },
    ];
    y = drawTable(doc, colsP, bloqueio.porPerfil.slice(0, cap).map((g) => ({
      perfil: g.perfil, material: g.material,
      st: g.status === 'parcial' ? '⚠ Parcial' : '✗ Sem material',
      nPecas: fmtNum(g.nPecas), peso: fmtPeso(g.peso), falta: fmtPeso(g.faltaComprar),
      _st: g.status,
    })), y);
    doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
    doc.text('Peso travado = peso das peças (Aguardando/Fabricação) que dependem do perfil. Falta comprar = kg do perfil ainda por chegar.', M, y + 1);
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
