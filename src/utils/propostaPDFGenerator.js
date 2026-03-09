/**
 * Gerador de Proposta Comercial em PDF - Grupo Montex
 * Usa jsPDF diretamente (sem html2pdf/html2canvas) para máxima confiabilidade
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
const DARK = [30, 41, 59];
const WHITE = [255, 255, 255];
const LIGHT_GRAY = [241, 245, 249];
const MEDIUM_GRAY = [100, 116, 139];
const GREEN_BG = [240, 253, 244];
const GREEN_BORDER = [16, 185, 129];
const RED_TEXT = [153, 27, 27];

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
  const totalWeight = setores.reduce((sum, s) => sum + s.itens.reduce((is, item) => is + ((item.unidade === 'KG') ? item.quantidade : 0), 0), 0);
  const totalArea = setores.reduce((sum, s) => sum + s.itens.reduce((is, item) => is + ((item.unidade === 'M2') ? item.quantidade : 0), 0), 0);
  const precoFinal = calculations?.precoFinal || totalGeral;
  const margemPct = calculations?.margemPct || 18;
  const impostosPct = calculations?.impostosPct || 12;
  const custoBase = totalGeral;
  const margem = custoBase * (margemPct / 100);
  const subtotal = custoBase + margem;
  const impostos = subtotal * (impostosPct / 100);

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

  // ========== PAGE 1: COVER ==========
  // Background gradient simulation
  doc.setFillColor(15, 32, 39);
  doc.rect(0, 0, pageW, 80, 'F');
  doc.setFillColor(32, 58, 67);
  doc.rect(0, 80, pageW, 40, 'F');
  doc.setFillColor(44, 83, 100);
  doc.rect(0, 120, pageW, 20, 'F');

  // Logo M text
  doc.setFontSize(48);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('M', pageW / 2, 50, { align: 'center' });

  doc.setFontSize(22);
  doc.text('GRUPO MONTEX', pageW / 2, 70, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(148, 210, 189);
  doc.text('SOLUÇÕES EM AÇO', pageW / 2, 80, { align: 'center' });

  // Separator
  doc.setDrawColor(200, 169, 81); // gold
  doc.setLineWidth(1);
  doc.line(60, 100, pageW - 60, 100);

  // Proposal info
  doc.setFontSize(14);
  doc.setTextColor(148, 210, 189);
  doc.text('PROPOSTA COMERCIAL', pageW / 2, 115, { align: 'center' });

  doc.setFontSize(18);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text(`Nº ${propNum}`, pageW / 2, 128, { align: 'center' });

  // Project details on white area
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

  // Date at bottom
  doc.setFontSize(10);
  doc.setTextColor(...MEDIUM_GRAY);
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  doc.text(`${months[new Date().getMonth()]} / ${new Date().getFullYear()}`, pageW / 2, 260, { align: 'center' });

  doc.setFontSize(8);
  doc.text(`Emissão: ${dataEmissao} | Validade: ${dataValidade}`, pageW / 2, 270, { align: 'center' });

  // ========== PAGE 2: PROJECT DATA + COSTS ==========
  doc.addPage();
  currentY = 20;

  // Header bar on each page
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

  // ========== ORÇAMENTO DETALHADO ==========
  drawSectionTitle(`Orçamento Detalhado - ${setores.length} setores`);

  setores.forEach((setor) => {
    checkPage(20);

    // Setor header
    const setorTotal = setor.itens.reduce((sum, item) => sum + (item.quantidade * item.preco), 0);
    doc.setFillColor(...DARK);
    doc.rect(margin, currentY, contentW, 7, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(setor.nome, margin + 3, currentY + 5);
    doc.text(formatCurrencyBR(setorTotal), pageW - margin - 3, currentY + 5, { align: 'right' });
    currentY += 8;

    // Table header
    doc.setFillColor(71, 85, 105);
    doc.rect(margin, currentY, contentW, 6, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    const cols = [margin + 2, margin + 75, margin + 95, margin + 120, margin + 145];
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

      const desc = item.descricao.length > 40 ? item.descricao.substring(0, 40) + '...' : item.descricao;
      doc.text(desc, cols[0], currentY + 3);
      doc.text(item.unidade || '-', cols[1], currentY + 3);
      doc.text(formatNumberBR(item.quantidade), cols[2], currentY + 3);
      doc.text(formatCurrencyBR(item.preco), cols[3], currentY + 3);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrencyBR(item.quantidade * item.preco), cols[4], currentY + 3);
      currentY += 6;
    });

    currentY += 3;
  });

  // Grand total
  checkPage(12);
  doc.setFillColor(...TEAL);
  doc.roundedRect(margin, currentY, contentW, 10, 1, 1, 'F');
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL GERAL', margin + 4, currentY + 7);
  doc.text(formatCurrencyBR(totalGeral), pageW - margin - 4, currentY + 7, { align: 'right' });
  currentY += 15;

  // ========== RESUMO QUANTITATIVO ==========
  checkPage(30);
  drawSectionTitle('Resumo Quantitativo');

  drawField('Peso Total Estimado', `${formatNumberBR(totalWeight)} kg`, margin + 4, currentY + 5);
  drawField('Área Total', `${formatNumberBR(totalArea)} m²`, pageW / 2, currentY + 5);
  drawField('Preço Médio/kg', totalWeight > 0 ? formatCurrencyBR(totalGeral / totalWeight) : '-', margin + 4, currentY + 11);
  drawField('Prazo de Execução', `${prazo} dias corridos`, pageW / 2, currentY + 11);

  doc.setDrawColor(...LIGHT_GRAY);
  doc.roundedRect(margin, currentY, contentW, 15, 1, 1, 'S');
  currentY += 20;

  // ========== COMPOSIÇÃO DO INVESTIMENTO ==========
  checkPage(50);
  drawSectionTitle('Composição do Investimento');

  doc.setFillColor(...GREEN_BG);
  doc.setDrawColor(...GREEN_BORDER);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, currentY, contentW, 45, 2, 2, 'FD');

  const investRows = [
    ['Custo Base (Materiais + Serviços)', formatCurrencyBR(custoBase)],
    [`Margem (${margemPct}%)`, formatCurrencyBR(margem)],
    ['Subtotal', formatCurrencyBR(subtotal)],
    [`Impostos (${impostosPct}%)`, formatCurrencyBR(impostos)],
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

  // Grand total box
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

    // Top border
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

  // Projeto bar
  doc.setFillColor(59, 130, 246); // blue
  doc.roundedRect(margin, currentY, projW, 10, 1, 1, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text(`Projeto (${projDias}d)`, margin + projW / 2, currentY + 7, { align: 'center' });

  // Fabricação bar
  doc.setFillColor(245, 158, 11); // amber
  doc.roundedRect(margin + projW, currentY, fabW, 10, 1, 1, 'F');
  doc.text(`Fabricação (${fabDias}d)`, margin + projW + fabW / 2, currentY + 7, { align: 'center' });

  // Montagem bar
  doc.setFillColor(16, 185, 129); // green
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

  // Left signature
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

  // Right signature
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
    if (i > 1) { // skip cover page
      addFooter();
    }
  }

  return doc.output('blob');
}
