// ============================================================
// Relatório de FABRICABILIDADE por Obra (para produção/PCP)
// ============================================================
// Cruza o estoque da obra (necessário × entregue) com as peças ainda não
// fabricadas (aguardando/fabricação) e responde, por MARCA/PEÇA:
//   ✓ CONSEGUE fabricar (material entregue)
//   ⚠ PARCIAL (material incompleto)
//   ✗ NÃO CONSEGUE fabricar (falta material) — com o quanto falta comprar
// Puro (sem React); usa jsPDF. Classificação em services/relatorioProducao.js.
// ============================================================
import { jsPDF } from 'jspdf';
import { fabricabilidadePecas } from './relatorioProducao';
import { resumoMaterialObra } from './estoqueAnalytics';

const fmtNum = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const fmtPeso = (kg) => (Number(kg) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg';
export const DETALHE_CAP = 60;
const hexRgb = (hex) => {
  const h = String(hex || '#64748b').replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

function drawTable(doc, cols, rows, y, { margin = 10, width = 190, bottom = 285, headColor = [30, 41, 59] } = {}) {
  const rowH = 6, headH = 7;
  const header = () => {
    doc.setFillColor(headColor[0], headColor[1], headColor[2]); doc.rect(margin, y, width, headH, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont(undefined, 'bold');
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
      const col = c.color || [15, 23, 42];
      doc.setTextColor(col[0], col[1], col[2]);
      if (c.bold) doc.setFont(undefined, 'bold');
      doc.text(txt, c.align === 'right' ? c.x + c.w : c.x, y + 4.1, { align: c.align === 'right' ? 'right' : 'left' });
      if (c.bold) doc.setFont(undefined, 'normal');
    });
    y += rowH;
  });
  return y + 3;
}

// Seção de peças com título colorido + tabela (cap com aviso de truncamento).
function secao(doc, y, M, W, { titulo, sub, cor, cols, rows, cap }) {
  if (y > 250) { doc.addPage(); y = M; }
  const [r, g, b] = hexRgb(cor);
  doc.setFillColor(r, g, b); doc.rect(M, y, W, 9, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont(undefined, 'bold');
  doc.text(titulo, M + 3, y + 6);
  doc.setFontSize(9); doc.text(`${fmtNum(rows.length)} marca(s)`, M + W - 3, y + 6, { align: 'right' });
  doc.setFont(undefined, 'normal'); y += 13;
  if (sub) { doc.setFontSize(8.5); doc.setTextColor(100, 116, 139); doc.text(sub, M, y); y += 5; }
  y = drawTable(doc, cols, rows.slice(0, cap), y, { margin: M, width: W, headColor: [r, g, b] });
  if (rows.length > cap) {
    doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text(`… mostrando as ${cap} de maior peso, de ${fmtNum(rows.length)} marcas.`, M, y + 2); y += 6;
  }
  return y + 2;
}

export function montarRelatorioFabricabilidadeDoc(pecas, obra, { data, cliente, estoque, logoDataUrl, detalheCap } = {}) {
  const material = resumoMaterialObra(estoque || []);
  const fab = fabricabilidadePecas(pecas, material.linhas);
  const R = fab.resumo;
  const cap = Number.isFinite(detalheCap) ? detalheCap : DETALHE_CAP;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const M = 10, W = 190;
  const hoje = data || new Date().toLocaleString('pt-BR');
  let y = M;

  // Cabeçalho
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 24, 'F');
  if (logoDataUrl) { try { const h = 12, w = h * 1.341; doc.addImage(logoDataUrl, 'PNG', 200 - w, 4, w, h); } catch (_) { /* ignora */ } }
  doc.setTextColor(255, 255, 255); doc.setFontSize(15); doc.setFont(undefined, 'bold');
  doc.text('MONTEX — Fabricabilidade por Obra', M, 11);
  doc.setFontSize(9); doc.setFont(undefined, 'normal');
  const obraTxt = obra ? `Obra: ${obra.codigo ? obra.codigo + ' · ' : ''}${obra.nome || ''}` : 'Todas as obras';
  doc.text(obraTxt, M, 17);
  const cli = cliente || obra?.cliente;
  doc.text([cli ? `Cliente: ${cli}` : '', `Gerado em ${hoje}`].filter(Boolean).join('   ·   '), M, 21.5);
  y = 30;

  // Introdução
  doc.setTextColor(100, 116, 139); doc.setFontSize(8.5);
  doc.text('Do material recebido no estoque da obra (entregue), desconta o que a produção atual já consumiu (Solda', M, y);
  doc.text('em diante = já fabricado) e aloca o restante às peças pendentes (Aguardando/Fabricação). As que cabem', M, y + 4);
  doc.text('CONSEGUEM ser fabricadas; o restante NÃO consegue.', M, y + 8);
  y += 15;

  // KPIs (já fabricado / consegue / não consegue / a comprar)
  const kpis = [
    ['Já fabricado', fmtPeso(R.pesoJaFabricado), `${fmtNum(R.nJaFabricado)} marcas · ${fmtNum(R.qtdJaFabricado)} un`, '#14b8a6'],
    ['✓ Consegue (ainda)', fmtPeso(R.pesoFabricavel), `${fmtNum(R.nFabricaveis)} marcas · ${R.pctFabricavel}%`, '#22c55e'],
    ['✗ Não consegue', fmtPeso(R.pesoNaoFabricavel), `${fmtNum(R.nNaoFabricaveis)} marcas · ${R.pctNaoFabricavel}%`, '#ef4444'],
    ['A comprar (total)', fmtPeso(R.faltaComprarTotal), `${fmtNum(R.nPerfisParciais)} perfis parciais`, '#0ea5e9'],
  ];
  const kw = W / kpis.length;
  kpis.forEach((kp, i) => {
    const x = M + i * kw; const [r, g, b] = hexRgb(kp[3]);
    doc.setDrawColor(r, g, b); doc.setFillColor(248, 250, 252); doc.roundedRect(x + 1, y, kw - 2, 20, 1.5, 1.5, 'FD');
    doc.setTextColor(r, g, b); doc.setFontSize(8.5); doc.setFont(undefined, 'bold'); doc.text(kp[0], x + 4, y + 5.5);
    doc.setTextColor(15, 23, 42); doc.setFontSize(13); doc.text(kp[1], x + 4, y + 12.5);
    doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); doc.text(kp[2], x + 4, y + 17.5);
  });
  y += 25;

  // Barra empilhada (consegue × não consegue × sem info)
  const total = R.pesoTotal || 1;
  const segs = [
    { v: R.pesoFabricavel, c: '#22c55e' }, { v: R.pesoNaoFabricavel, c: '#ef4444' }, { v: R.pesoSemInfo, c: '#94a3b8' },
  ];
  let xb = M;
  doc.setFillColor(226, 232, 240); doc.roundedRect(M, y, W, 7, 1.5, 1.5, 'F');
  segs.forEach((s) => { const w = (s.v / total) * W; if (w > 0.3) { const [r, g, b] = hexRgb(s.c); doc.setFillColor(r, g, b); doc.rect(xb, y, w, 7, 'F'); xb += w; } });
  doc.setTextColor(15, 23, 42); doc.setFontSize(8); doc.setFont(undefined, 'bold');
  doc.text(`Fabricável agora: ${R.pctFabricavel}% do peso pendente (${fmtPeso(R.pesoFabricavel)} de ${fmtPeso(total)})`, M, y + 12);
  doc.setFont(undefined, 'normal'); doc.setTextColor(100, 116, 139);
  doc.text(`Com o material entregue: já fabricado ${fmtPeso(R.pesoJaFabricado)} + ainda dá p/ fabricar ${fmtPeso(R.pesoFabricavel)} = ${fmtPeso(R.pesoViavelEntregue)}.`, M, y + 16);
  y += 21;

  // ===== NÃO CONSEGUE FABRICAR =====
  if (fab.naoFabricaveis.length) {
    const red = [220, 38, 38];
    y = secao(doc, y, M, W, {
      titulo: '✗ NÃO consegue fabricar — falta material', cor: '#ef4444',
      sub: 'Marcas cujo perfil está zerado no estoque da obra. Comprar o material para liberar a fabricação.',
      cap,
      cols: [
        { k: 'marca', label: 'Marca', x: M, w: 26, bold: true, color: red },
        { k: 'perfil', label: 'Perfil (faltante)', x: M + 26, w: 36, bold: true, color: red },
        { k: 'material', label: 'Material', x: M + 62, w: 26 },
        { k: 'tipo', label: 'Tipo', x: M + 88, w: 26 },
        { k: 'qtd', label: 'Qtd', x: M + 114, w: 14, align: 'right' },
        { k: 'peso', label: 'Peso', x: M + 128, w: 26, align: 'right' },
        { k: 'falta', label: 'Falta comprar', x: M + 154, w: 36, align: 'right', bold: true, color: red },
      ],
      rows: fab.naoFabricaveis.map((p) => ({ marca: p.marca, perfil: p.perfil, material: p.material, tipo: p.tipo, qtd: fmtNum(p.quantidade), peso: fmtPeso(p.peso), falta: fmtPeso(p.faltaComprar) })),
    });
  }

  // Nota sobre perfis parcialmente cobertos (parte das peças do perfil dá, parte não)
  if ((fab.perfisParciais || []).length) {
    if (y > 255) { doc.addPage(); y = M; }
    doc.setFontSize(8.5); doc.setFont(undefined, 'bold'); doc.setTextColor(180, 83, 9);
    doc.text(`Perfis com material PARCIAL (parte das peças dá, parte não): ${fab.perfisParciais.length}`, M, y);
    doc.setFont(undefined, 'normal'); doc.setTextColor(120, 130, 145); doc.setFontSize(8);
    doc.splitTextToSize(fab.perfisParciais.join(', '), W).slice(0, 2).forEach((ln, i) => doc.text(ln, M, y + 5 + i * 4));
    y += 14;
  }

  // ===== CONSEGUE FABRICAR =====
  if (fab.fabricaveis.length) {
    const green = [22, 163, 74];
    y = secao(doc, y, M, W, {
      titulo: '✓ CONSEGUE fabricar — material disponível', cor: '#22c55e',
      sub: 'Marcas cujo material do perfil está entregue no estoque da obra. Liberadas para fabricar.',
      cap,
      cols: [
        { k: 'marca', label: 'Marca', x: M, w: 30, bold: true, color: green },
        { k: 'perfil', label: 'Perfil', x: M + 30, w: 40 },
        { k: 'material', label: 'Material', x: M + 70, w: 34 },
        { k: 'tipo', label: 'Tipo', x: M + 104, w: 34 },
        { k: 'qtd', label: 'Qtd', x: M + 138, w: 16, align: 'right' },
        { k: 'peso', label: 'Peso', x: M + 154, w: 36, align: 'right' },
      ],
      rows: fab.fabricaveis.map((p) => ({ marca: p.marca, perfil: p.perfil, material: p.material, tipo: p.tipo, qtd: fmtNum(p.quantidade), peso: fmtPeso(p.peso) })),
    });
  }

  // ===== SEM INFO =====
  if (fab.semInfo.length) {
    if (y > 250) { doc.addPage(); y = M; }
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(100, 116, 139);
    doc.text(`Sem info de material: ${fmtNum(fab.semInfo.length)} marca(s) sem perfil cadastrado no estoque (a verificar) · ${fmtPeso(fab.resumo.pesoSemInfo)}`, M, y);
    doc.setFont(undefined, 'normal'); doc.setFontSize(8); doc.setTextColor(120, 130, 145);
    const perfisSem = [...new Set(fab.semInfo.map((p) => p.perfil).filter(Boolean))].slice(0, 12).join(', ');
    doc.splitTextToSize(`Perfis: ${perfisSem}`, W).slice(0, 2).forEach((ln, i) => doc.text(ln, M, y + 5 + i * 4));
  }

  // Rodapé
  const totalPg = doc.getNumberOfPages();
  for (let p = 1; p <= totalPg; p++) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.2); doc.line(M, 289, 200, 289);
    doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.setFont(undefined, 'bold');
    doc.text('GRUPO MONTEX', M, 293);
    doc.setFont(undefined, 'normal'); doc.setTextColor(148, 163, 184);
    doc.text(`São Joaquim de Bicas/MG · ${obraTxt}`, M + 25, 293);
    doc.text(`Página ${p}/${totalPg}`, 200, 293, { align: 'right' });
  }

  const nome = `fabricabilidade_${(obra?.codigo || 'geral').toString().replace(/[^\w.-]+/g, '_')}.pdf`;
  return { doc, paginas: totalPg, fab, nome };
}

export function gerarRelatorioFabricabilidadePDF(pecas, obra, opts = {}) {
  const { doc, paginas, fab, nome } = montarRelatorioFabricabilidadeDoc(pecas, obra, opts);
  doc.save(nome);
  return { paginas, fab };
}
