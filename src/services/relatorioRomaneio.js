// ============================================================
// RELATÓRIO DO ROMANEIO (envio) — dados, HTML e PDF
// ============================================================
// Usado no app (detalhe do romaneio → "Relatório"): HTML para abrir/
// imprimir/compartilhar e PDF (jsPDF, carregado sob demanda).
// Quantidade por item = qtd_enviada do romaneio (envio parcial) ou a
// quantidade da linha da peça; peso proporcional ao peso unitário.
// Puro (exceto o PDF, que só importa o jsPDF) e testado em
// src/services/relatorioRomaneio.test.js.
// ============================================================
import { itensDoRomaneio, escapeHtml, normalizarStatusRomaneio } from './romaneio';

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const campo = (o, ...ks) => { for (const k of ks) if (o?.[k] != null && o[k] !== '') return o[k]; return undefined; };

const ROTULO_STATUS = {
  preparando: 'Preparando', aguardando_transporte: 'Aguardando transporte',
  em_transito: 'Em trânsito', entregue: 'Entregue', problema: 'Problema',
};

const fmtKg = (v) => `${n(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
const fmtData = (iso) => {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
};
const agoraTexto = (d = new Date()) => `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

/**
 * Monta os dados do relatório.
 * @param {object} romaneio  expedição (camelCase ou snake_case)
 * @param {Map|object} pecasById  id → peça (pecas_producao)
 * @param {string} obraNome
 */
export function dadosRelatorioRomaneio(romaneio, pecasById, obraNome) {
  const get = (id) => (pecasById instanceof Map ? pecasById.get(String(id)) : pecasById?.[String(id)]);
  const itens = itensDoRomaneio(romaneio).map((it) => {
    const p = get(it.id) || {};
    const qtdLinha = Math.max(1, parseInt(campo(p, 'quantidade'), 10) || 1);
    const qtd = Math.max(1, parseInt(campo(it, 'qtd_enviada', 'qtdEnviada', 'qtd'), 10) || qtdLinha);
    const pesoLinha = n(campo(p, 'pesoTotal', 'peso_total', 'peso')) || n(campo(p, 'pesoUnitario', 'peso_unitario')) * qtdLinha;
    const pesoUnit = qtdLinha > 0 ? pesoLinha / qtdLinha : 0;
    return {
      id: String(it.id),
      marca: campo(p, 'marca', 'nome', 'codigo') || String(it.id),
      tipo: String(campo(p, 'tipo', 'perfil', 'descricao') || '—'),
      perfil: campo(p, 'perfil') || '',
      qtd,
      pesoUnit,
      peso: pesoUnit * qtd,
    };
  });
  const status = normalizarStatusRomaneio(romaneio?.status) || 'preparando';
  return {
    numero: campo(romaneio, 'numeroRomaneio', 'numero_romaneio', 'numero') || romaneio?.id || '—',
    data: fmtData(campo(romaneio, 'dataExpedicao', 'data_expedicao', 'dataEnvio', 'data_envio')),
    status: ROTULO_STATUS[status] || status,
    obra: obraNome || campo(romaneio, 'destino', 'obraNome', 'obra_nome') || '—',
    destino: campo(romaneio, 'destino') || '',
    transportadora: campo(romaneio, 'transportadora') || '—',
    motorista: campo(romaneio, 'motorista') || '—',
    placa: campo(romaneio, 'placa') || '—',
    observacoes: campo(romaneio, 'observacoes') || '',
    itens,
    totalPecas: itens.length,
    totalUn: itens.reduce((s, i) => s + i.qtd, 0),
    totalKg: itens.reduce((s, i) => s + i.peso, 0),
    geradoEm: agoraTexto(),
  };
}

/** Nome de arquivo seguro: Romaneio_<numero>_<data>. */
export function nomeArquivoRomaneio(d, ext) {
  const base = `Romaneio_${String(d.numero).replace(/[^\w.-]+/g, '-')}_${String(d.data).replace(/\//g, '-')}`;
  return `${base}.${ext}`;
}

/**
 * HTML autocontido (abre em qualquer navegador e imprime em A4), com a
 * identidade Montex: logo oficial, teal #006666, Arial, faixa de rodapé.
 * @param {{ logo?: string }} opts  logo = data URL (LOGO_FULL_B64)
 */
export function htmlRelatorioRomaneio(d, { logo } = {}) {
  const e = escapeHtml;
  const linhas = d.itens.map((i, k) => `<tr>
      <td class="c">${k + 1}</td>
      <td><strong>${e(i.marca)}</strong></td>
      <td>${e(i.tipo.toUpperCase())}</td>
      <td class="c">${i.qtd}</td>
      <td class="r">${e(fmtKg(i.pesoUnit))}</td>
      <td class="r"><strong>${e(fmtKg(i.peso))}</strong></td>
      <td class="c chk">☐</td>
    </tr>`).join('');
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Romaneio ${e(d.numero)}</title>
<style>
  @page{size:A4;margin:14mm}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:Arial,Helvetica,sans-serif;color:#1f2629;margin:0 auto;padding:24px;max-width:900px;background:#fff}
  header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding-bottom:14px;border-bottom:3px solid #006666}
  header img{height:54px;width:auto;display:block}
  .marca-txt{font-size:20px;font-weight:700;letter-spacing:.12em;color:#006666}
  .doc{text-align:right}
  .doc .rot{font-size:11px;font-weight:700;letter-spacing:.14em;color:#006666}
  .doc h1{margin:2px 0 6px;font-size:24px;color:#1f2629}
  .pill{display:inline-block;padding:3px 10px;border-radius:999px;background:#e3f0f0;color:#006666;font-size:12px;font-weight:600}
  .obra{margin:12px 0 0;font-size:15px;font-weight:600;color:#1f2629}
  .info{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 24px;margin:16px 0;padding:12px 14px;background:#f2f6f6;border-radius:8px;font-size:13px}
  .info b{color:#3d4a4e;font-weight:600}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#006666;color:#fff;padding:7px 8px;text-align:left;font-weight:600}
  td{padding:6px 8px;border-bottom:1px solid #dde5e6}
  tr:nth-child(even) td{background:#f8fafa}
  .c{text-align:center}.r{text-align:right;white-space:nowrap}.chk{font-size:16px;color:#5b6b70}
  .tot{display:flex;gap:24px;justify-content:flex-end;margin-top:12px;padding:10px 14px;border-left:4px solid #006666;background:#eef5f5;font-size:14px}
  .obs{margin-top:12px;font-size:13px}
  .ass{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:56px;font-size:12px;color:#5b6b70;text-align:center}
  .ass div{border-top:1px solid #8a969b;padding-top:6px}
  footer{margin-top:28px;padding:10px 14px;border-radius:6px;background:#006666;color:#fff;font-size:11px;display:flex;justify-content:space-between;gap:12px}
  .acoes{margin-top:20px}.acoes button{padding:10px 18px;background:#006666;color:#fff;border:0;border-radius:6px;font-size:14px;cursor:pointer}
  @media print{.acoes{display:none}body{padding:0}}
</style></head><body>
<header>
  ${logo ? `<img src="${e(logo)}" alt="Montex — estruturas metálicas">` : '<div class="marca-txt">GRUPO MONTEX</div>'}
  <div class="doc"><div class="rot">ROMANEIO DE EMBARQUE</div><h1>${e(d.numero)}</h1><span class="pill">${e(d.status)}</span></div>
</header>
<p class="obra">${e(d.obra)}</p>
<section class="info">
  <div><b>Data:</b> ${e(d.data)}</div>
  <div><b>Peso total:</b> ${e(fmtKg(d.totalKg))}</div>
  <div><b>Transportadora:</b> ${e(d.transportadora)}</div>
  <div><b>Motorista:</b> ${e(d.motorista)}</div>
  <div><b>Placa:</b> ${e(d.placa)}</div>
  <div><b>Peças:</b> ${d.totalPecas} marca(s) · ${d.totalUn} un</div>
</section>
<table>
  <thead><tr><th class="c" style="width:32px">#</th><th>Marca</th><th>Tipo / perfil</th><th class="c" style="width:48px">Qtd</th><th class="r" style="width:90px">Peso un.</th><th class="r" style="width:100px">Peso total</th><th class="c" style="width:56px">Conf.</th></tr></thead>
  <tbody>${linhas}</tbody>
</table>
<div class="tot"><span><b>${d.totalPecas}</b> marca(s)</span><span><b>${d.totalUn}</b> unidade(s)</span><span>Peso total: <b>${e(fmtKg(d.totalKg))}</b></span></div>
${d.observacoes ? `<p class="obs"><b>Observações:</b> ${e(d.observacoes)}</p>` : ''}
<div class="ass"><div>Expedição (conferente)</div><div>Motorista</div><div>Recebimento na obra</div></div>
<footer><span>Grupo Montex · soluções em aço</span><span>Gerado pelo Montex ERP em ${e(d.geradoEm)}</span></footer>
<div class="acoes"><button onclick="window.print()">Imprimir / salvar em PDF</button></div>
</body></html>`;
}

/** PDF A4 com a identidade Montex (jsPDF sob demanda). Devolve um Blob. */
export async function pdfRelatorioRomaneio(d, { logo } = {}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 14, TEAL = [0, 102, 102];
  let y = 16;

  const cabecalhoTabela = () => {
    doc.setFillColor(...TEAL);
    doc.rect(M, y, W - 2 * M, 7, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text('#', M + 3, y + 4.8);
    doc.text('Marca', M + 10, y + 4.8);
    doc.text('Tipo / perfil', M + 52, y + 4.8);
    doc.text('Qtd', M + 116, y + 4.8, { align: 'right' });
    doc.text('Peso un.', M + 140, y + 4.8, { align: 'right' });
    doc.text('Peso total', M + 166, y + 4.8, { align: 'right' });
    doc.text('Conf.', W - M - 2, y + 4.8, { align: 'right' });
    y += 7;
    doc.setTextColor(31, 38, 41); doc.setFont('helvetica', 'normal');
  };

  // Cabeçalho: logo oficial à esquerda, documento à direita, filete teal
  let logoOk = false;
  if (logo) {
    try { doc.addImage(logo, 'PNG', M, 10, 62, 13.5); logoOk = true; } catch { /* logo inválido: segue com o texto */ }
  }
  if (!logoOk) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...TEAL);
    doc.text('GRUPO MONTEX', M, 19);
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...TEAL);
  doc.text('ROMANEIO DE EMBARQUE', W - M, 12.5, { align: 'right' });
  doc.setFontSize(15); doc.setTextColor(31, 38, 41);
  doc.text(String(d.numero), W - M, 19, { align: 'right' });
  doc.setFontSize(8);
  const pill = String(d.status);
  const pw = doc.getTextWidth(pill) + 6;
  doc.setFillColor(227, 240, 240); doc.roundedRect(W - M - pw, 21.2, pw, 5, 2.5, 2.5, 'F');
  doc.setTextColor(...TEAL); doc.text(pill, W - M - pw / 2, 24.6, { align: 'center' });
  doc.setDrawColor(...TEAL); doc.setLineWidth(0.9); doc.line(M, 29, W - M, 29);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(31, 38, 41);
  doc.text(doc.splitTextToSize(String(d.obra), W - 2 * M)[0], M, 35);
  doc.setFont('helvetica', 'normal');
  y = 39;

  doc.setFillColor(242, 246, 246); doc.roundedRect(M, y, W - 2 * M, 20, 2, 2, 'F');
  doc.setFontSize(9); doc.setTextColor(31, 38, 41);
  const info = [
    [`Data: ${d.data}`, `Peso total: ${fmtKg(d.totalKg)}`],
    [`Transportadora: ${d.transportadora}`, `Motorista: ${d.motorista}`],
    [`Placa: ${d.placa}`, `Peças: ${d.totalPecas} marca(s) · ${d.totalUn} un`],
  ];
  info.forEach((par, k) => {
    doc.text(doc.splitTextToSize(par[0], 85)[0], M + 4, y + 6 + k * 5.5);
    doc.text(doc.splitTextToSize(par[1], 85)[0], M + 95, y + 6 + k * 5.5);
  });
  y += 25;

  cabecalhoTabela();
  doc.setFontSize(8.5);
  d.itens.forEach((i, k) => {
    if (y > 270) { doc.addPage(); y = 16; cabecalhoTabela(); doc.setFontSize(8.5); }
    if (k % 2 === 1) { doc.setFillColor(248, 250, 250); doc.rect(M, y, W - 2 * M, 6.5, 'F'); }
    doc.text(String(k + 1), M + 3, y + 4.5);
    doc.setFont('helvetica', 'bold'); doc.text(doc.splitTextToSize(String(i.marca), 40)[0], M + 10, y + 4.5);
    doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(i.tipo.toUpperCase(), 52)[0], M + 52, y + 4.5);
    doc.text(String(i.qtd), M + 116, y + 4.5, { align: 'right' });
    doc.text(fmtKg(i.pesoUnit), M + 140, y + 4.5, { align: 'right' });
    doc.text(fmtKg(i.peso), M + 166, y + 4.5, { align: 'right' });
    doc.setDrawColor(138, 150, 155); doc.setLineWidth(0.2); doc.rect(W - M - 6, y + 1.5, 3.2, 3.2);
    doc.setDrawColor(221, 229, 230); doc.line(M, y + 6.5, W - M, y + 6.5);
    y += 6.5;
  });

  if (y > 240) { doc.addPage(); y = 16; }
  y += 4;
  doc.setFillColor(238, 245, 245); doc.rect(M, y, W - 2 * M, 9, 'F');
  doc.setFillColor(...TEAL); doc.rect(M, y, 1.2, 9, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text(`${d.totalPecas} marca(s)   ·   ${d.totalUn} unidade(s)   ·   Peso total: ${fmtKg(d.totalKg)}`, W - M - 3, y + 6, { align: 'right' });
  y += 14;
  if (d.observacoes) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const linhas = doc.splitTextToSize(`Observações: ${d.observacoes}`, W - 2 * M);
    doc.text(linhas, M, y); y += linhas.length * 4.5 + 2;
  }

  y = Math.max(y + 18, 255);
  if (y > 272) { doc.addPage(); y = 40; }
  doc.setDrawColor(138, 150, 155); doc.setLineWidth(0.3); doc.setFontSize(8.5); doc.setTextColor(91, 107, 112);
  ['Expedição (conferente)', 'Motorista', 'Recebimento na obra'].forEach((t, k) => {
    const x = M + k * 62;
    doc.line(x, y, x + 54, y);
    doc.text(t, x + 27, y + 4.5, { align: 'center' });
  });
  // Rodapé com a identidade em todas as páginas
  const paginas = doc.getNumberOfPages();
  for (let pg = 1; pg <= paginas; pg += 1) {
    doc.setPage(pg);
    doc.setFillColor(...TEAL); doc.rect(0, 287, W, 10, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(255);
    doc.text('Grupo Montex · soluções em aço', M, 293);
    doc.text(`Romaneio ${d.numero} · gerado em ${d.geradoEm} · página ${pg}/${paginas}`, W - M, 293, { align: 'right' });
  }
  return doc.output('blob');
}
