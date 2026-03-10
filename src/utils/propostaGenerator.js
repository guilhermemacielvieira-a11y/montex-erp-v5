import JSZip from 'jszip';

/**
 * Gerador de Proposta Comercial DOCX - Grupo Montex
 * Usa o template MODELO PROPOSTA 2026.docx armazenado no Supabase Storage
 * e injeta dados dinâmicos do simulador de orçamento.
 *
 * v3 - Tabelas separadas por setor com análise R$/m² e R$/kg por setor
 */

const TEMPLATE_URL = 'https://trxbohjcwsogthabairh.supabase.co/storage/v1/object/public/templates/proposta-modelo-2026.docx';

const formatCurrencyBR = (value) => {
  if (!value || isNaN(value)) return 'R$ 0,00';
  return 'R$ ' + Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatNumberBR = (value) => {
  if (!value || isNaN(value)) return '0';
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
};

// Helper: escape XML special characters
function escXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Build a table cell XML with enhanced styling
function cellXml(text, opts = {}) {
  const { bold = false, color = '333333', fill = '', sz = 18, align = 'left', italic = false, vAlign = 'center' } = opts;
  const jc = align === 'right' ? '<w:jc w:val="right"/>' : align === 'center' ? '<w:jc w:val="center"/>' : '';
  const shadingXml = fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : '';
  const boldXml = bold ? '<w:b/><w:bCs/>' : '';
  const italicXml = italic ? '<w:i/><w:iCs/>' : '';
  return `<w:tc>
  <w:tcPr>
    <w:vAlign w:val="${vAlign}"/>
    <w:tcBorders>
      <w:top w:val="single" w:sz="2" w:space="0" w:color="D1D5DB"/>
      <w:left w:val="single" w:sz="2" w:space="0" w:color="D1D5DB"/>
      <w:bottom w:val="single" w:sz="2" w:space="0" w:color="D1D5DB"/>
      <w:right w:val="single" w:sz="2" w:space="0" w:color="D1D5DB"/>
    </w:tcBorders>
    ${shadingXml}
    <w:tcMar>
      <w:top w:w="50" w:type="dxa"/>
      <w:left w:w="80" w:type="dxa"/>
      <w:bottom w:w="50" w:type="dxa"/>
      <w:right w:w="80" w:type="dxa"/>
    </w:tcMar>
  </w:tcPr>
  <w:p><w:pPr>${jc}<w:spacing w:before="20" w:after="20"/></w:pPr><w:r><w:rPr>${boldXml}${italicXml}<w:color w:val="${color}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${escXml(text)}</w:t></w:r></w:p>
</w:tc>`;
}

// Build a table cell with colspan
function cellXmlSpan(text, colspan, opts = {}) {
  const { bold = false, color = '333333', fill = '', sz = 18, align = 'center', italic = false } = opts;
  const jc = align === 'right' ? '<w:jc w:val="right"/>' : align === 'center' ? '<w:jc w:val="center"/>' : '';
  const boldXml = bold ? '<w:b/><w:bCs/>' : '';
  const italicXml = italic ? '<w:i/><w:iCs/>' : '';
  return `<w:tc>
  <w:tcPr>
    <w:gridSpan w:val="${colspan}"/>
    <w:vAlign w:val="center"/>
    <w:tcBorders>
      <w:top w:val="single" w:sz="2" w:space="0" w:color="D1D5DB"/>
      <w:left w:val="single" w:sz="2" w:space="0" w:color="D1D5DB"/>
      <w:bottom w:val="single" w:sz="2" w:space="0" w:color="D1D5DB"/>
      <w:right w:val="single" w:sz="2" w:space="0" w:color="D1D5DB"/>
    </w:tcBorders>
    ${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}
    <w:tcMar>
      <w:top w:w="50" w:type="dxa"/>
      <w:left w:w="80" w:type="dxa"/>
      <w:bottom w:w="50" w:type="dxa"/>
      <w:right w:w="80" w:type="dxa"/>
    </w:tcMar>
  </w:tcPr>
  <w:p><w:pPr>${jc}<w:spacing w:before="20" w:after="20"/></w:pPr><w:r><w:rPr>${boldXml}${italicXml}<w:color w:val="${color}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${escXml(text)}</w:t></w:r></w:p>
</w:tc>`;
}

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

// Build the dynamic budget table XML - separated by setor with analysis
function buildBudgetTableXml(setores, precoFinal, totalWeight, totalArea) {
  const headerFill = '006666';
  const headerColor = 'FFFFFF';
  const setorFill = '0F4C5C';
  const setorColor = 'FFFFFF';
  const subtotalFill = 'E8F5F3';
  const analysisFill = 'F0F9FF';
  const grandTotalFill = '006666';
  const altRowFill = 'F8FAFB';

  // Main header row
  let rows = `<w:tr>
    ${cellXml('ITEM / DESCRIÇÃO', { bold: true, color: headerColor, fill: headerFill, align: 'center', sz: 17 })}
    ${cellXml('QTDE', { bold: true, color: headerColor, fill: headerFill, align: 'center', sz: 17 })}
    ${cellXml('UN', { bold: true, color: headerColor, fill: headerFill, align: 'center', sz: 17 })}
    ${cellXml('UNIT. (R$)', { bold: true, color: headerColor, fill: headerFill, align: 'center', sz: 17 })}
    ${cellXml('TOTAL (R$)', { bold: true, color: headerColor, fill: headerFill, align: 'center', sz: 17 })}
  </w:tr>`;

  let itemCounter = 0;

  // Data rows per setor
  setores.forEach((setor, sIdx) => {
    const metrics = calcSetorMetrics(setor);

    // Setor header row (dark background, full width)
    rows += `<w:tr>
      ${cellXmlSpan(`${sIdx + 1}. ${setor.nome.toUpperCase()}`, 4, { bold: true, color: setorColor, fill: setorFill, align: 'left', sz: 19 })}
      ${cellXml(formatCurrencyBR(metrics.total), { bold: true, color: setorColor, fill: setorFill, align: 'right', sz: 19 })}
    </w:tr>`;

    // Item rows
    setor.itens.forEach((item, iIdx) => {
      itemCounter++;
      const total = (item.quantidade || 0) * (item.preco || 0);
      const rowFill = iIdx % 2 === 0 ? '' : altRowFill;
      rows += `<w:tr>
        ${cellXml(`   ${item.descricao}`, { fill: rowFill, sz: 17 })}
        ${cellXml(formatNumberBR(item.quantidade), { align: 'center', fill: rowFill, sz: 17 })}
        ${cellXml(item.unidade, { align: 'center', fill: rowFill, sz: 17 })}
        ${cellXml(formatCurrencyBR(item.preco), { align: 'right', fill: rowFill, sz: 17 })}
        ${cellXml(formatCurrencyBR(total), { bold: true, align: 'right', fill: rowFill, sz: 17 })}
      </w:tr>`;
    });

    // Setor subtotal row
    rows += `<w:tr>
      ${cellXmlSpan(`Subtotal - ${setor.nome}`, 4, { bold: true, fill: subtotalFill, align: 'right', color: '006666', sz: 17 })}
      ${cellXml(formatCurrencyBR(metrics.total), { bold: true, color: '006666', fill: subtotalFill, align: 'right', sz: 18 })}
    </w:tr>`;

    // Setor analysis row (metrics per setor)
    const analysisTexts = [];
    if (metrics.peso > 0) {
      analysisTexts.push(`Peso: ${formatNumberBR(metrics.peso)} kg`);
      analysisTexts.push(`R$/kg: ${formatCurrencyBR(metrics.valorKg)}`);
    }
    if (metrics.area > 0) {
      analysisTexts.push(`Área: ${formatNumberBR(metrics.area)} m²`);
      analysisTexts.push(`R$/m²: ${formatCurrencyBR(metrics.valorM2)}`);
    }

    if (analysisTexts.length > 0) {
      rows += `<w:tr>
        ${cellXmlSpan(`Análise: ${analysisTexts.join('  |  ')}`, 5, { italic: true, color: '475569', fill: analysisFill, align: 'center', sz: 16 })}
      </w:tr>`;
    }

    // Spacer row between setores (empty thin row)
    if (sIdx < setores.length - 1) {
      rows += `<w:tr>
        ${cellXmlSpan(' ', 5, { sz: 6 })}
      </w:tr>`;
    }
  });

  // Grand total row
  rows += `<w:tr>
    ${cellXmlSpan('INVESTIMENTO TOTAL DA OBRA', 4, { bold: true, color: headerColor, fill: grandTotalFill, align: 'right', sz: 20 })}
    ${cellXml(formatCurrencyBR(precoFinal), { bold: true, color: 'FFFFFF', fill: grandTotalFill, align: 'right', sz: 22 })}
  </w:tr>`;

  // Summary analysis row
  const precoKg = totalWeight > 0 ? precoFinal / totalWeight : 0;
  const precoM2 = totalArea > 0 ? precoFinal / totalArea : 0;
  const summaryParts = [];
  if (totalWeight > 0) summaryParts.push(`Peso Total: ${formatNumberBR(totalWeight)} kg  |  Preço Médio: ${formatCurrencyBR(precoKg)}/kg`);
  if (totalArea > 0) summaryParts.push(`Área Total: ${formatNumberBR(totalArea)} m²  |  Preço Médio: ${formatCurrencyBR(precoM2)}/m²`);

  if (summaryParts.length > 0) {
    rows += `<w:tr>
      ${cellXmlSpan(summaryParts.join('   ·   '), 5, { bold: true, italic: true, color: '006666', fill: 'E8F5F3', align: 'center', sz: 17 })}
    </w:tr>`;
  }

  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="9026" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="006666"/>
        <w:left w:val="single" w:sz="6" w:space="0" w:color="006666"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="006666"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="006666"/>
        <w:insideH w:val="single" w:sz="2" w:space="0" w:color="D1D5DB"/>
        <w:insideV w:val="single" w:sz="2" w:space="0" w:color="D1D5DB"/>
      </w:tblBorders>
      <w:tblCellMar>
        <w:left w:w="10" w:type="dxa"/>
        <w:right w:w="10" w:type="dxa"/>
      </w:tblCellMar>
      <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
    </w:tblPr>
    <w:tblGrid>
      <w:gridCol w:w="3200"/>
      <w:gridCol w:w="1200"/>
      <w:gridCol w:w="700"/>
      <w:gridCol w:w="1400"/>
      <w:gridCol w:w="2526"/>
    </w:tblGrid>
    ${rows}
  </w:tbl>`;
}

// Build cronograma phases table XML
function buildCronogramaTableXml(totalWeight, totalArea, prazo) {
  const hFill = '006666';
  const hColor = 'FFFFFF';
  const tealColor = '1a7a6d';
  const phases = [
    ['1. Detalhamento', '30 dias', 'Projeto executivo, modelagem 3D e compatibilização'],
    ['2. Materiais', '30 dias', 'Aquisição de chapas ASTM A36 e perfis U Civil 300'],
    ['3. Fabricação', '60 dias', 'Corte, solda e montagem das peças na fábrica'],
    ['4. Pintura', '30 dias', 'Jateamento DS 2,5 + 2 demãos de 60 micras'],
    ['5. Transporte', '15 dias', 'Logística via BR-381 até o canteiro de obras'],
    ['6. Montagem', '55 dias', 'Instalação com munck/guindaste e equipe especializada'],
  ];

  let phaseRows = phases.map(p =>
    `<w:tr>
      ${cellXml(p[0])}
      ${cellXml(p[1], { bold: true, color: tealColor, align: 'center' })}
      ${cellXml(p[2])}
    </w:tr>`
  ).join('');

  const phasesTable = `<w:tbl>
    <w:tblPr><w:tblW w:w="9026" w:type="dxa"/><w:tblBorders>
      <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    </w:tblBorders></w:tblPr>
    <w:tblGrid><w:gridCol w:w="2500"/><w:gridCol w:w="1500"/><w:gridCol w:w="5026"/></w:tblGrid>
    <w:tr>
      ${cellXml('FASE', { bold: true, color: hColor, fill: hFill })}
      ${cellXml('PRAZO', { bold: true, color: hColor, fill: hFill, align: 'center' })}
      ${cellXml('DESCRIÇÃO', { bold: true, color: hColor, fill: hFill })}
    </w:tr>
    ${phaseRows}
  </w:tbl>`;

  // Summary row
  const summaryTable = `<w:tbl>
    <w:tblPr><w:tblW w:w="9026" w:type="dxa"/><w:tblBorders>
      <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    </w:tblBorders></w:tblPr>
    <w:tblGrid><w:gridCol w:w="2256"/><w:gridCol w:w="2257"/><w:gridCol w:w="2256"/><w:gridCol w:w="2257"/></w:tblGrid>
    <w:tr>
      ${cellXml(`${formatNumberBR(totalWeight)} kg`, { bold: true, color: tealColor, align: 'center' })}
      ${cellXml(`${formatNumberBR(totalArea)} m²`, { bold: true, color: tealColor, align: 'center' })}
      ${cellXml(`${prazo} dias`, { bold: true, color: tealColor, align: 'center' })}
      ${cellXml('44h/semana', { bold: true, color: tealColor, align: 'center' })}
    </w:tr>
  </w:tbl>`;

  return { phasesTable, summaryTable };
}

export async function generatePropostaDOCX(data) {
  const { project, setores, calculations, unitCosts, propostaNumber, prazoExecucao, condicoesPagamento } = data;

  const prazo = prazoExecucao || 150;
  const pagamento = condicoesPagamento || { assinatura: 10, projeto: 5, medicoes: 85 };

  // Calculate totals (same logic as SimuladorOrcamento)
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

  // Material vs Instalação
  const margemPct = calculations?.margemPct || 18;
  const impostosPct = calculations?.impostosPct || 12;
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
  const precoKg = totalWeight > 0 ? precoFinal / totalWeight : 0;

  // 1. Fetch template from Supabase Storage
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) throw new Error('Falha ao carregar template da proposta');
  const templateBlob = await response.arrayBuffer();

  // 2. Open with JSZip
  const zip = await JSZip.loadAsync(templateBlob);
  let docXml = await zip.file('word/document.xml').async('string');

  // 3. Replace the budget table (between "DETALHAMENTO DOS CUSTOS:" text and </w:tbl>)
  const tableStartMarker = '<w:t>DETALHAMENTO DOS CUSTOS:</w:t>';
  const tableStartIdx = docXml.indexOf(tableStartMarker);
  if (tableStartIdx > -1) {
    // Find the <w:tbl> after this marker
    const tblStart = docXml.indexOf('<w:tbl>', tableStartIdx);
    const tblEnd = docXml.indexOf('</w:tbl>', tblStart) + '</w:tbl>'.length;
    if (tblStart > -1 && tblEnd > -1) {
      const newTable = buildBudgetTableXml(setores, precoFinal, totalWeight, totalArea);
      docXml = docXml.substring(0, tblStart) + newTable + docXml.substring(tblEnd);
    }
  }

  // 4. Replace ECONOMIA text
  const econEstMatch = /Até R\$ [\d.,]+ em relação à média de mercado \(R\$[\d.,]+\/kg\)/;
  const econPremMatch = /Até R\$ [\d.,]+ em relação a concorrentes premium \(R\$[\d.,]+\/kg\)/;
  const mercadoKg = precoKg * 1.17;
  const premiumKg = precoKg * 1.46;
  const econEst = `Até ${formatCurrencyBR((mercadoKg - precoKg) * totalWeight)} em relação à média de mercado (${formatCurrencyBR(mercadoKg)}/kg)`;
  const econPrem = `Até ${formatCurrencyBR((premiumKg - precoKg) * totalWeight)} em relação a concorrentes premium (${formatCurrencyBR(premiumKg)}/kg)`;
  docXml = docXml.replace(econEstMatch, escXml(econEst));
  docXml = docXml.replace(econPremMatch, escXml(econPrem));

  // 5. Replace cronograma tables
  const cronFasesMarker = 'DETALHAMENTO DAS FASES:';
  const cronIdx = docXml.indexOf(cronFasesMarker);
  if (cronIdx > -1) {
    let tbl1Start = docXml.indexOf('<w:tbl>', cronIdx);
    let tbl1End = docXml.indexOf('</w:tbl>', tbl1Start) + '</w:tbl>'.length;
    let tbl2Start = docXml.indexOf('<w:tbl>', tbl1End);
    let tbl2End = docXml.indexOf('</w:tbl>', tbl2Start) + '</w:tbl>'.length;

    if (tbl1Start > -1 && tbl2End > -1) {
      const { phasesTable, summaryTable } = buildCronogramaTableXml(totalWeight, totalArea, prazo);
      const between = docXml.substring(tbl1End, tbl2Start);
      docXml = docXml.substring(0, tbl1Start) + phasesTable + between + summaryTable + docXml.substring(tbl2End);
    }
  }

  // 6. Replace summary values
  docXml = docXml.replace(/262\.240 kg/g, `${formatNumberBR(totalWeight)} kg`);
  docXml = docXml.replace(/262\.240/g, formatNumberBR(totalWeight));
  docXml = docXml.replace(/3\.130 m²/g, `${formatNumberBR(totalArea)} m²`);
  docXml = docXml.replace(/3\.130/g, formatNumberBR(totalArea));

  // 7. Replace precoFinal and precoKg values
  docXml = docXml.replace(/R\$ 6\.794\.560,00/g, formatCurrencyBR(precoFinal));
  docXml = docXml.replace(/R\$ 6\.293\.760,00/g, formatCurrencyBR(totalGeral));
  docXml = docXml.replace(/R\$ 500\.800,00/g, formatCurrencyBR(totalArea > 0 ? totalArea * 160 : 0));
  docXml = docXml.replace(/R\$ 24,00/g, formatCurrencyBR(precoKg));
  docXml = docXml.replace(/R\$ 160,00/g, formatCurrencyBR(totalArea > 0 ? (precoFinal - (totalWeight * precoKg)) / totalArea : 0));

  // 8. Replace "INVESTIMENTO TOTAL: R$ ..."
  docXml = docXml.replace(
    /INVESTIMENTO TOTAL: R\$ [\d.,]+/g,
    `INVESTIMENTO TOTAL: ${formatCurrencyBR(precoFinal)}`
  );

  // 9. Replace "Por que escolher" section values
  const precoKgStr = formatCurrencyBR(precoKg);
  docXml = docXml.replace(/R\$24\/kg/g, `${precoKgStr}/kg`);
  docXml = docXml.replace(/R\$28\/kg/g, `${formatCurrencyBR(mercadoKg)}/kg`);
  docXml = docXml.replace(/R\$35\/kg/g, `${formatCurrencyBR(premiumKg)}/kg`);

  // Replace economy savings
  docXml = docXml.replace(
    /R\$1\.049\.600,00/g,
    formatCurrencyBR((mercadoKg - precoKg) * totalWeight)
  );

  // 10. Replace payment conditions text
  docXml = docXml.replace(
    /10% assinatura \| 5% entrega projeto \| 85% medições/g,
    `${pagamento.assinatura}% assinatura | ${pagamento.projeto}% entrega projeto | ${pagamento.medicoes}% medições`
  );

  // 11. Replace prazo
  docXml = docXml.replace(/150 DIAS/g, `${prazo} DIAS`);
  docXml = docXml.replace(/150 dias/g, `${prazo} dias`);

  // 12. Put the modified XML back
  zip.file('word/document.xml', docXml);

  // 13. Generate and return blob
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return blob;
}
