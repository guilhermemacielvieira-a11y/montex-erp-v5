/**
 * Gerador de Proposta Comercial em PDF - Grupo Montex
 * v3 - Tabelas separadas por setor com análise R$/m² e R$/kg por setor
 * Usa jsPDF diretamente (sem html2pdf/html2canvas)
 */

const formatCurrencyBR = (value) => {
  if (!value || isNaN(value)) return 'R$ 0,00';
  return 'R$ ' + Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatNumberBR = (value) => {
  if (!value || isNaN(value)) return '0';
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
};

// Colors
const TEAL = [26, 122, 109];
const TEAL_DARK = [0, 102, 102];
const DARK = [30, 41, 59];
const DARK_HEADER = [15, 32, 39];
const WHITE = [255, 255, 255];
const LIGHT_GRAY = [241, 245, 249];
const MEDIUM_GRAY = [100, 116, 139];
const GREEN_BG = [240, 253, 244];
const GREEN_BORDER = [16, 185, 129];
const RED_TEXT = [153, 27, 27];
const ANALYSIS_BG = [240, 249, 255];
const SUBTOTAL_BG = [232, 245, 243];

// Calculate setor-level metrics
function calcSetorMetrics(setor) {
  let setorTotal = 0;
  let setorWeight = 0;
  let setorArea = 0;
  const gruposPorBase = {};

  (setor.itens || []).forEach(item => {
    const total = (item.quantidade || 0) * (item.preco || 0);
    setorTotal += total;
    if (item.unidade === 'KG') {
      const base = (item.descricao || '').split(' - ')[0].trim() || item.descricao || 'item';
      if (!gruposPorBase[base] || (item.quantidade || 0) > gruposPorBase[base]) {
        gruposPorBase[base] = item.quantidade || 0;
      }
    }
    if (item.unidade === 'M2') {
      setorArea += item.quantidade || 0;
    }
  });

  setorWeight = Object.values(gruposPorBase).reduce((s, qty) => s + qty, 0);

  return {
    total: setorTotal,
    peso: setorWeight,
    area: setorArea,
    valorKg: setorWeight > 0 ? setorTotal / setorWeight : 0,
    valorM2: setorArea > 0 ? setorTotal / setorArea : 0,
  };
}

export async function generatePropostaPDF(data) {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = 210;
  const pageH = 297;
  const margin = 20;
  const contentW = pageW - margin * 2;

  const { project, setores, calculations, unitCosts, propostaNumber, prazoExecucao, condicoesPagamento } = data;

  const propNum = propostaNumber || `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}`;
  const prazo = prazoExecucao || 150;
  const pagamento = condicoesPagamento || { assinatura: 10, projeto: 5, medicoes: 85 };
  const dataEmissao = new Date().toLocaleDateString('pt-BR');
  const dataValidade = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('pt-BR');

  // Totals
  const totalGeral = setores.reduce((sum, s) => sum + s.itens.reduce((is, item) => is + (item.quantidade * item.preco), 0), 0);

  // Peso real: agrupa itens KG por nome base
  let totalWeight = 0;
  setores.forEach(s => {
    const gruposPorBase = {};
    (s.itens || []).forEach(item => {
      if (item.unidade === 'KG') {
        const base = (item.descricao || '').split(' - ')[0].trim() || item.descricao || 'item';
        if (!gruposPorBase[base] || (item.quantidade || 0) > gruposPorBase[base]) {
          gruposPorBase[base] = item.quantidade || 0;
        }
      }
    });
    totalWeight += Object.values(gruposPorBase).reduce((s2, qty) => s2 + qty, 0);
  });

  const totalArea = setores.reduce((sum, s) => sum + s.itens.reduce((is, item) => is + ((item.unidade === 'M2') ? item.quantidade : 0), 0), 0);
  const margemPct = calculations?.margemPct || 18;
  const impostosPct = calculations?.impostosPct || 12;

  // Separar Material vs Instalação
  let custoMaterial = 0;
  let custoInstalacao = 0;
  setores.forEach(s => {
    (s.itens || []).forEach(item => {
      const total = (item.quantidade || 0) * (item.preco || 0);
      const parts = (item.descricao || '').split(' - ');
      const sufixo = parts.length >= 2 ? parts[parts.length - 1].trim().toLowerCase() : '';
      if (sufixo === 'material') {
        custoMaterial += total;
      } else {
        custoInstalacao += total;
      }
    });
  });

  const margemInstalacao = custoInstalacao * (margemPct / 100);
  const subtotalInstalacao = custoInstalacao + margemInstalacao;
  const impostosInstalacao = subtotalInstalacao * (impostosPct / 100);
  const precoFinal = calculations?.precoFinal || (custoMaterial + subtotalInstalacao + impostosInstalacao);

  // Helper functions
  let currentY = 0;

  function checkPage(needed = 20) {
    if (currentY + needed > pageH - 20) {
      addFooter();
      doc.addPage();
      currentY = 20;
      return true;
    }
    return false;
  }

  function addFooter() {
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 15, pageW - margin, pageH - 15);
    doc.setFontSize(7);
    doc.setTextColor(...MEDIUM_GRAY);
    doc.text('GRUPO MONTEX - Soluções em Aço', margin, pageH - 10);
    doc.text(`Proposta ${propNum} | ${dataEmissao}`, pageW - margin, pageH - 10, { align: 'right' });
  }

  function drawSectionTitle(title) {
    checkPage(14);
    doc.setFillColor(...TEAL);
    doc.roundedRect(margin, currentY, contentW, 8, 1, 1, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin + 4, currentY + 5.5);
    doc.setTextColor(...DARK);
    currentY += 10;
  }

  function drawField(label, value, x, y) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MEDIUM_GRAY);
    doc.text(label + ':', x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(String(value || '-'), x + doc.getTextWidth(label + ': '), y);
  }

  function drawPageHeader(title) {
    doc.setFillColor(...TEAL);
    doc.rect(0, 0, pageW, 14, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text('GRUPO MONTEX', margin, 9);
    doc.text(title, pageW - margin, 9, { align: 'right' });
    doc.setTextColor(...DARK);
    currentY = 22;
  }

  // ========== PAGE 1: COVER ==========
  doc.setFillColor(15, 32, 39);
  doc.rect(0, 0, pageW, 80, 'F');
  doc.setFillColor(32, 58, 67);
  doc.rect(0, 80, pageW, 40, 'F');
  doc.setFillColor(44, 83, 100);
  doc.rect(0, 120, pageW, 20, 'F');

  doc.setFontSize(48);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('M', pageW / 2, 50, { align: 'center' });

  doc.setFontSize(22);
  doc.text('GRUPO MONTEX', pageW / 2, 70, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(148, 210, 189);
  doc.text('SOLUÇÕES EM AÇO', pageW / 2, 80, { align: 'center' });

  doc.setDrawColor(200, 169, 81);
  doc.setLineWidth(1);
  doc.line(60, 100, pageW - 60, 100);

  doc.setFontSize(14);
  doc.setTextColor(148, 210, 189);
  doc.text('PROPOSTA COMERCIAL', pageW / 2, 115, { align: 'center' });

  doc.setFontSize(18);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text(`Nº ${propNum}`, pageW / 2, 128, { align: 'center' });

  currentY = 160;
  doc.setFillColor(...WHITE);
  doc.roundedRect(margin + 10, currentY, contentW - 20, 50, 3, 3, 'F');

  doc.setFontSize(18);
  doc.setTextColor(...TEAL);
  doc.setFont('helvetica', 'bold');
  doc.text((project?.nome || 'PROJETO').toUpperCase(), pageW / 2, currentY + 18, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'normal');
  doc.text(project?.cliente || 'Cliente', pageW / 2, currentY + 30, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(...MEDIUM_GRAY);
  doc.text(`${project?.tipo || 'Galpão Industrial'} | ${(project?.regiao || 'Sudeste').toUpperCase()}`, pageW / 2, currentY + 40, { align: 'center' });

  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  doc.setFontSize(10);
  doc.setTextColor(...MEDIUM_GRAY);
  doc.text(`${months[new Date().getMonth()]} / ${new Date().getFullYear()}`, pageW / 2, 260, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`Emissão: ${dataEmissao} | Validade: ${dataValidade}`, pageW / 2, 270, { align: 'center' });

  // ========== PAGE 2: PROJECT DATA + COSTS ==========
  doc.addPage();
  drawPageHeader('DADOS DO PROJETO');

  drawSectionTitle('Dados do Projeto');
  drawField('Projeto', project?.nome || '-', margin + 4, currentY + 5);
  drawField('Cliente', project?.cliente || '-', margin + 4, currentY + 11);
  drawField('Tipo', project?.tipo || 'Galpão Industrial', pageW / 2, currentY + 5);
  drawField('Região', (project?.regiao || 'Sudeste').toUpperCase(), pageW / 2, currentY + 11);

  doc.setDrawColor(...LIGHT_GRAY);
  doc.roundedRect(margin, currentY, contentW, 15, 1, 1, 'S');
  currentY += 20;

  // Custos Unitários
  drawSectionTitle('Custos Unitários de Referência');

  const custosList = [
    ['Estrutura - Material', `R$ ${(unitCosts?.estrutura?.material || 0).toFixed(2)}/kg`],
    ['Estrutura - Fabricação', `R$ ${(unitCosts?.estrutura?.fabricacao || 0).toFixed(2)}/kg`],
    ['Estrutura - Pintura', `R$ ${(unitCosts?.estrutura?.pintura || 0).toFixed(2)}/kg`],
    ['Estrutura - Transporte', `R$ ${(unitCosts?.estrutura?.transporte || 0).toFixed(2)}/kg`],
    ['Estrutura - Montagem', `R$ ${(unitCosts?.estrutura?.montagem || 0).toFixed(2)}/kg`],
    ['Cobertura - Material', `R$ ${(unitCosts?.cobertura?.material || 0).toFixed(2)}/m²`],
    ['Cobertura - Montagem', `R$ ${(unitCosts?.cobertura?.montagem || 0).toFixed(2)}/m²`],
    ['Fechamento - Material', `R$ ${(unitCosts?.fechamento?.material || 0).toFixed(2)}/m²`],
    ['Fechamento - Montagem', `R$ ${(unitCosts?.fechamento?.montagem || 0).toFixed(2)}/m²`],
    ['Steel Deck - Material', `R$ ${(unitCosts?.steelDeck?.material || 0).toFixed(2)}/m²`],
    ['Steel Deck - Montagem', `R$ ${(unitCosts?.steelDeck?.montagem || 0).toFixed(2)}/m²`],
  ];

  const colW = contentW / 2;
  custosList.forEach((row, i) => {
    const col = i % 2;
    const rowIdx = Math.floor(i / 2);
    if (col === 0) checkPage(7);

    const x = margin + 4 + col * colW;
    const y = currentY + rowIdx * 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MEDIUM_GRAY);
    doc.text(row[0] + ':', x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(row[1], x + 50, y);
  });
  currentY += Math.ceil(custosList.length / 2) * 6 + 5;

  // ========== ORÇAMENTO DETALHADO POR SETOR ==========
  drawSectionTitle(`Orçamento Detalhado - ${setores.length} setores`);

  const cols = [margin + 2, margin + 78, margin + 96, margin + 122, margin + 148];

  setores.forEach((setor, sIdx) => {
    const metrics = calcSetorMetrics(setor);
    checkPage(25);

    // Setor header with number circle
    doc.setFillColor(...DARK_HEADER);
    doc.roundedRect(margin, currentY, contentW, 8, 1, 1, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sIdx + 1}. ${setor.nome}`, margin + 3, currentY + 5.5);
    doc.setTextColor(148, 210, 189);
    doc.text(formatCurrencyBR(metrics.total), pageW - margin - 3, currentY + 5.5, { align: 'right' });
    currentY += 9;

    // Table header
    doc.setFillColor(71, 85, 105);
    doc.rect(margin, currentY, contentW, 6, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIÇÃO', cols[0], currentY + 4);
    doc.text('UN', cols[1], currentY + 4);
    doc.text('QTD', cols[2], currentY + 4);
    doc.text('PREÇO UNIT.', cols[3], currentY + 4);
    doc.text('TOTAL', cols[4], currentY + 4);
    currentY += 7;

    // Items
    setor.itens.forEach((item, idx) => {
      checkPage(7);
      if (idx % 2 === 0) {
        doc.setFillColor(...LIGHT_GRAY);
        doc.rect(margin, currentY - 1, contentW, 6, 'F');
      }
      doc.setFontSize(8);
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'normal');

      const desc = item.descricao.length > 42 ? item.descricao.substring(0, 42) + '...' : item.descricao;
      doc.text(desc, cols[0], currentY + 3);
      doc.text(item.unidade || '-', cols[1], currentY + 3);
      doc.text(formatNumberBR(item.quantidade), cols[2], currentY + 3);
      doc.text(formatCurrencyBR(item.preco), cols[3], currentY + 3);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrencyBR(item.quantidade * item.preco), cols[4], currentY + 3);
      currentY += 6;
    });

    // Subtotal row
    checkPage(8);
    doc.setFillColor(...SUBTOTAL_BG);
    doc.rect(margin, currentY, contentW, 6, 'F');
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, margin + contentW, currentY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEAL_DARK);
    doc.text(`Subtotal - ${setor.nome}`, cols[3] - 2, currentY + 4, { align: 'right' });
    doc.text(formatCurrencyBR(metrics.total), cols[4], currentY + 4);
    currentY += 7;

    // Analysis row (metrics per setor)
    const analysisParts = [];
    if (metrics.peso > 0) {
      analysisParts.push(`Peso: ${formatNumberBR(metrics.peso)} kg`);
      analysisParts.push(`R$/kg: ${formatCurrencyBR(metrics.valorKg)}`);
    }
    if (metrics.area > 0) {
      analysisParts.push(`Área: ${formatNumberBR(metrics.area)} m²`);
      analysisParts.push(`R$/m²: ${formatCurrencyBR(metrics.valorM2)}`);
    }

    if (analysisParts.length > 0) {
      checkPage(7);
      doc.setFillColor(...ANALYSIS_BG);
      doc.rect(margin, currentY, contentW, 5.5, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(71, 85, 105);
      doc.text(`Análise: ${analysisParts.join('  |  ')}`, margin + contentW / 2, currentY + 3.8, { align: 'center' });
      currentY += 6.5;
    }

    currentY += 4;
  });

  // Grand total bar
  checkPage(14);
  doc.setFillColor(...TEAL_DARK);
  doc.roundedRect(margin, currentY, contentW, 12, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('INVESTIMENTO TOTAL DA OBRA', margin + 5, currentY + 8);
  doc.setFontSize(13);
  doc.text(formatCurrencyBR(precoFinal), pageW - margin - 5, currentY + 8, { align: 'right' });
  currentY += 15;

  // Summary metrics row
  checkPage(12);
  const precoKgTotal = totalWeight > 0 ? precoFinal / totalWeight : 0;
  const precoM2Total = totalArea > 0 ? precoFinal / totalArea : 0;
  doc.setFillColor(...SUBTOTAL_BG);
  doc.roundedRect(margin, currentY, contentW, 8, 1, 1, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEAL_DARK);
  const summaryParts = [];
  if (totalWeight > 0) summaryParts.push(`Peso Total: ${formatNumberBR(totalWeight)} kg  |  Preço Médio: ${formatCurrencyBR(precoKgTotal)}/kg`);
  if (totalArea > 0) summaryParts.push(`Área Total: ${formatNumberBR(totalArea)} m²  |  Preço Médio: ${formatCurrencyBR(precoM2Total)}/m²`);
  if (summaryParts.length > 0) {
    doc.text(summaryParts.join('   ·   '), margin + contentW / 2, currentY + 5.5, { align: 'center' });
  }
  currentY += 14;

  // ========== COMPOSIÇÃO DO INVESTIMENTO ==========
  checkPage(50);
  drawSectionTitle('Composição do Investimento');

  doc.setFillColor(...GREEN_BG);
  doc.setDrawColor(...GREEN_BORDER);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, currentY, contentW, 45, 2, 2, 'FD');

  const investRows = [
    ['Material (s/ margem/impostos)', formatCurrencyBR(custoMaterial)],
    ['Instalação (Fab/Pint/Transp/Mont)', formatCurrencyBR(custoInstalacao)],
    [`Margem (${margemPct}%) s/ instalação`, formatCurrencyBR(margemInstalacao)],
    [`Impostos (${impostosPct}%) s/ instalação`, formatCurrencyBR(impostosInstalacao)],
  ];

  investRows.forEach((row, i) => {
    const y = currentY + 6 + i * 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(row[0], margin + 5, y);
    doc.setFont('helvetica', 'bold');
    doc.text(row[1], margin + contentW / 2 - 5, y, { align: 'right' });
  });

  doc.setFontSize(8);
  doc.setTextColor(...MEDIUM_GRAY);
  doc.text('VALOR TOTAL DA PROPOSTA', margin + contentW / 2 + 15, currentY + 12);
  doc.setFontSize(20);
  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrencyBR(precoFinal), margin + contentW / 2 + 15, currentY + 28);

  currentY += 50;

  // ========== CONDIÇÕES DE PAGAMENTO ==========
  checkPage(40);
  drawSectionTitle('Condições de Pagamento');

  const condCards = [
    { pct: pagamento.assinatura, label: 'Na Assinatura do Contrato', val: precoFinal * pagamento.assinatura / 100 },
    { pct: pagamento.projeto, label: 'Aprovação do Projeto', val: precoFinal * pagamento.projeto / 100 },
    { pct: pagamento.medicoes, label: 'Medições Mensais', val: precoFinal * pagamento.medicoes / 100 },
  ];

  const cardW = (contentW - 10) / 3;
  condCards.forEach((card, i) => {
    const x = margin + i * (cardW + 5);
    doc.setDrawColor(...LIGHT_GRAY);
    doc.setFillColor(...WHITE);
    doc.roundedRect(x, currentY, cardW, 28, 2, 2, 'FD');
    doc.setFillColor(...TEAL);
    doc.rect(x, currentY, cardW, 2, 'F');

    doc.setFontSize(18);
    doc.setTextColor(...TEAL);
    doc.setFont('helvetica', 'bold');
    doc.text(`${card.pct}%`, x + cardW / 2, currentY + 12, { align: 'center' });

    doc.setFontSize(7);
    doc.setTextColor(...MEDIUM_GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(card.label, x + cardW / 2, currentY + 18, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrencyBR(card.val), x + cardW / 2, currentY + 24, { align: 'center' });
  });
  currentY += 33;

  // ========== CRONOGRAMA ==========
  checkPage(30);
  drawSectionTitle(`Cronograma Estimado (${prazo} dias)`);

  const fabDias = Math.ceil((totalWeight / 1000) * 1.5) || 45;
  const montDias = Math.ceil((totalWeight / 1000) * 2) || 30;
  const projDias = 10;
  const totalDias = projDias + fabDias + montDias;

  const timelineW = contentW;
  const projW = (projDias / totalDias) * timelineW;
  const fabW = (fabDias / totalDias) * timelineW;
  const montW = (montDias / totalDias) * timelineW;

  doc.setFillColor(59, 130, 246);
  doc.roundedRect(margin, currentY, projW, 10, 1, 1, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text(`Projeto (${projDias}d)`, margin + projW / 2, currentY + 7, { align: 'center' });

  doc.setFillColor(245, 158, 11);
  doc.roundedRect(margin + projW, currentY, fabW, 10, 1, 1, 'F');
  doc.text(`Fabricação (${fabDias}d)`, margin + projW + fabW / 2, currentY + 7, { align: 'center' });

  doc.setFillColor(16, 185, 129);
  doc.roundedRect(margin + projW + fabW, currentY, montW, 10, 1, 1, 'F');
  doc.text(`Montagem (${montDias}d)`, margin + projW + fabW + montW / 2, currentY + 7, { align: 'center' });

  currentY += 15;

  // ========== ESCOPO ==========
  checkPage(40);
  drawSectionTitle('Escopo de Fornecimento');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('INCLUSO:', margin + 4, currentY + 4);
  doc.setFont('helvetica', 'normal');
  const inclusoText = 'Projeto executivo de estrutura metálica; Fabricação completa em fábrica; Tratamento superficial e pintura; Transporte até a obra; Montagem completa com equipamentos; Acompanhamento técnico; Garantia de 5 anos.';
  const inclusoLines = doc.splitTextToSize(inclusoText, contentW - 8);
  doc.text(inclusoLines, margin + 4, currentY + 10);
  currentY += 10 + inclusoLines.length * 4;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED_TEXT);
  doc.text('NÃO INCLUSO:', margin + 4, currentY + 4);
  doc.setFont('helvetica', 'normal');
  const naoInclusoText = 'Fundações e bases de concreto; Instalações elétricas e hidráulicas; Licenças e alvarás; Terraplenagem e preparação do terreno.';
  const naoInclusoLines = doc.splitTextToSize(naoInclusoText, contentW - 8);
  doc.text(naoInclusoLines, margin + 4, currentY + 10);
  currentY += 10 + naoInclusoLines.length * 4 + 5;

  // ========== OBRIGAÇÕES ==========
  checkPage(30);
  drawSectionTitle('Obrigações do Contratante');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  const obrigText = 'Disponibilizar acesso ao local da obra; Fornecer ponto de energia elétrica e água; Garantir fundações conforme projeto; Aprovar o projeto executivo em até 10 dias úteis; Efetuar os pagamentos nas datas acordadas.';
  const obrigLines = doc.splitTextToSize(obrigText, contentW - 8);
  doc.text(obrigLines, margin + 4, currentY + 4);
  currentY += obrigLines.length * 4 + 10;

  // ========== ASSINATURAS ==========
  checkPage(40);
  drawSectionTitle('Assinaturas');

  currentY += 25;
  const sigW = (contentW - 20) / 2;

  doc.setDrawColor(...MEDIUM_GRAY);
  doc.line(margin, currentY, margin + sigW, currentY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('GRUPO MONTEX', margin + sigW / 2, currentY + 5, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MEDIUM_GRAY);
  doc.text('Guilherme Maciel Vieira - Diretor Comercial', margin + sigW / 2, currentY + 10, { align: 'center' });

  doc.line(margin + sigW + 20, currentY, pageW - margin, currentY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('CONTRATANTE', margin + sigW + 20 + sigW / 2, currentY + 5, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MEDIUM_GRAY);
  doc.text(project?.cliente || '___________________________', margin + sigW + 20 + sigW / 2, currentY + 10, { align: 'center' });

  // Add footers to all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (i > 1) {
      addFooter();
    }
  }

  return doc.output('blob');
}
