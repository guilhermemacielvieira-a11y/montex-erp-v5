import jsPDF from 'jspdf';
import { utils as XLSXUtils, write as XLSXWrite } from 'xlsx';
import html2canvas from 'html2canvas';

// ========================================
// EXCEL EXPORT
// ========================================
export function exportToExcel(data, columns, filename) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  try {
    const wb = XLSXUtils.book_new();
    const headers = columns.map(col => col.header);
    const formattedData = data.map(row => {
      const formattedRow = {};
      columns.forEach(col => {
        formattedRow[col.header] = row[col.key];
      });
      return formattedRow;
    });
    const ws = XLSXUtils.json_to_sheet(formattedData);
    const columnWidths = columns.map(col => {
      const maxLength = Math.max(
        col.header.length,
        Math.max(...data.map(row => {
          const value = row[col.key];
          return String(value || '').length;
        }))
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    ws['!cols'] = columnWidths;
    XLSXUtils.book_append_sheet(wb, ws, 'Dados');
    const filenameWithExt = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSXWrite(wb, { bookType: 'xlsx', type: 'binary', filename: filenameWithExt });
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
}

// ========================================
// PDF EXPORT (Table-based)
// ========================================
export function exportToPDF(data, columns, title, filename) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    let yPosition = margin;

    doc.setFillColor(30, 30, 30);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('MONTEX ERP Premium', margin + 5, yPosition + 12);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(title, margin + 5, yPosition + 22);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    const dataGeracao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Data de Geração: ${dataGeracao}`, margin + 5, yPosition + 27);
    yPosition += 35;

    const headers = columns.map(col => col.header);
    const rows = data.map(row =>
      columns.map(col => {
        const value = row[col.key];
        if (typeof value === 'number') return value.toLocaleString('pt-BR');
        return String(value || '');
      })
    );

    const columnWidths = columns.map((col, idx) => {
      const maxLength = Math.max(
        headers[idx].length,
        Math.max(...rows.map(row => String(row[idx]).length))
      );
      return (maxLength + 2) * 1.2;
    });

    const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
    const scaleFactor = (pageWidth - 2 * margin) / totalWidth;
    const scaledWidths = columnWidths.map(w => w * scaleFactor);

    doc.setFillColor(75, 85, 99);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);

    let xPosition = margin;
    headers.forEach((header, idx) => {
      doc.text(header, xPosition + 2, yPosition + 7, { maxWidth: scaledWidths[idx] - 4 });
      xPosition += scaledWidths[idx];
    });

    yPosition += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 3;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);

    const rowHeight = 6;
    const maxRowsPerPage = Math.floor((pageHeight - yPosition - 15) / rowHeight);

    rows.forEach((row, rowIdx) => {
      if (rowIdx > 0 && rowIdx % maxRowsPerPage === 0) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
        doc.addPage();
        yPosition = margin;
        doc.setFillColor(75, 85, 99);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        xPosition = margin;
        headers.forEach((header, idx) => {
          doc.text(header, xPosition + 2, yPosition + 7, { maxWidth: scaledWidths[idx] - 4 });
          xPosition += scaledWidths[idx];
        });
        yPosition += 10;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 3;
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
      }

      if (rowIdx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, rowHeight, 'F');
      }

      xPosition = margin;
      row.forEach((cell, idx) => {
        doc.text(cell, xPosition + 2, yPosition + 2, { maxWidth: scaledWidths[idx] - 4 });
        xPosition += scaledWidths[idx];
      });
      yPosition += rowHeight;
    });

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth / 2, pageHeight - 5, { align: 'center' });

    const filenameWithExt = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    doc.save(filenameWithExt);
    return true;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    return false;
  }
}

// ========================================
// PDF EXPORT (Element/Screenshot)
// ========================================
export async function exportElementToPDF(elementId, filename) {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element with id "${elementId}" not found`);
      return false;
    }
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    const filenameWithExt = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    doc.save(filenameWithExt);
    return true;
  } catch (error) {
    console.error('Error exporting element to PDF:', error);
    return false;
  }
}

// ========================================
// CSV EXPORT
// ========================================
export function exportToCSV(data, columns, filename) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }
  try {
    const headers = columns.map(col => `"${col.header}"`).join(',');
    const rows = data.map(row => {
      return columns.map(col => {
        const value = row[col.key];
        const escapedValue = String(value || '').replace(/"/g, '""');
        return `"${escapedValue}"`;
      }).join(',');
    });
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const filenameWithExt = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    link.setAttribute('download', filenameWithExt);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    return false;
  }
}

// ========================================
// ROMANEIO PDF EXPORT (Profissional)
// ========================================
export function exportRomaneioPDF(envio, obra, pecas) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    let y = margin;

    const romaneioNum = envio.numero || envio.romaneio || `ENV-${Date.now()}`;
    const statusEnvio = (envio.status || 'PREPARANDO').toUpperCase().replace(/_/g, ' ');

    // =============================================
    // CABEÇALHO — FUNDO BRANCO, LAYOUT ESQUERDA/DIREITA
    // =============================================

    // Logo GRUPO MONTEX — SVG embutido como imagem
    const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1900 1200" width="200" height="127"><path fill="#368784" d="M572.163 0L583.837 0C590.269 2.4 602.143.735 609.264 1.81 617.731 3.087 626.181 4.908 634.594 6.57 680.355 15.61 721.355 41.84 750.502 78.024 763.354 93.979 774.583 111.151 783.94 129.414 827.253 214.835 868.585 301.243 910.79 387.213 912.883 391.477 914.938 395.947 917.163 400.118 929.564 380.248 943.58 363.127 954.394 342.333 978.907 295.197 1001.57 246.481 1025.84 199.307 1047.46 157.276 1069.93 108.268 1101.81 73.73 1131.05 41.432 1169.55 18.957 1212.05 9.38 1271.72-4.412 1339.42 3.095 1392 36.044 1440.79 66.614 1462.32 105.451 1487.42 154.543L1520.77 219.852 1630.71 436.974C1676.34 527.348 1721.51 617.95 1766.23 708.777L1803.65 784.77C1819.18 816.436 1832.8 841.003 1840.8 875.839 1854.5 934.32 1844.33 995.852 1812.54 1046.81 1775.07 1106.27 1711.7 1143.65 1643.31 1152.74 1639.2 1153.29 1631.1 1153.94 1627.41 1155L1602.16 1155C1599.55 1153.8 1583.34 1152.93 1578.62 1151.9 1569.55 1149.92 1561.28 1147.9 1552.32 1145.11 1513.94 1132.96 1479.56 1110.64 1452.86 1080.51 1419.74 1043.75 1385.66 973.319 1361.89 927.491L1270.85 751.243C1258.08 772.266 1244.19 798.909 1232.36 820.675 1206.55 868.128 1181.19 915.825 1156.29 963.761 1145.14 985.4 1134.41 1008.01 1123.55 1029.04 1089.84 1094.29 1031.74 1140.68 958.566 1152.22 951.652 1153.31 938.844 1152.9 932.837 1155L908.163 1155C904.758 1153.42 886.42 1152.86 880.952 1151.86 870.385 1149.92 860.671 1147.98 850.269 1144.89 811.453 1133.54 776.728 1111.25 750.249 1080.68 720.559 1046.68 711.236 1020.92 692.623 981.458 683.058 961.343 673.276 941.331 663.278 921.426 634.416 863.533 604.515 806.164 573.587 749.348 541.47 812.012 510.73 875.141 477.157 937.1 428.151 1027.54 379.593 1123.27 268.5 1144.66 209.032 1155.73 147.602 1142.71 97.742 1108.46 54.118 1078.54 22.461 1034.18 8.355 983.194 4.059 967.559 2.912 954.943 0 939.414L0 902.586C1.003 898.987 1.437 893.281 2.054 889.382 12.318 824.592 47.35 764.777 76.251 706.456L181.889 494.232 315.667 226.965C332.112 194.391 348.856 161.389 365.025 128.745 399.237 58.295 461.82 11.331 540.098 2.565 547.51 1.734 566.141 2.171 572.163 0Z"/></svg>`;
    try {
      const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(logoSvg)));
      doc.addImage(svgDataUrl, 'SVG', margin, y, 22, 14);
    } catch(e1) {
      // fallback: desenhar M estilizado com paths simples
      try {
        doc.setFillColor(54, 135, 132);
        // Desenhar formas que se assemelham ao M da logo
        const lx = margin + 1;
        const ly = y + 1;
        const s = 0.55; // escala
        // Perna esquerda do M
        doc.triangle(lx + 4*s, ly + 20*s, lx + 10*s, ly, lx + 16*s, ly + 20*s, 'F');
        // Perna central do M
        doc.triangle(lx + 9*s, ly + 20*s, lx + 15*s, ly, lx + 21*s, ly + 20*s, 'F');
        // V do meio
        doc.triangle(lx + 14*s, ly + 20*s, lx + 20*s, ly, lx + 26*s, ly + 20*s, 'F');
        // Perna direita do M
        doc.triangle(lx + 19*s, ly + 20*s, lx + 25*s, ly, lx + 31*s, ly + 20*s, 'F');
        // Sobreposição central
        doc.setFillColor(255, 255, 255);
        doc.triangle(lx + 7*s, ly + 20*s, lx + 12.5*s, ly + 6*s, lx + 18*s, ly + 20*s, 'F');
        doc.triangle(lx + 17*s, ly + 20*s, lx + 22.5*s, ly + 6*s, lx + 28*s, ly + 20*s, 'F');
        doc.setFillColor(54, 135, 132);
        doc.triangle(lx + 10*s, ly + 20*s, lx + 12.5*s, ly + 12*s, lx + 15*s, ly + 20*s, 'F');
        doc.triangle(lx + 20*s, ly + 20*s, lx + 22.5*s, ly + 12*s, lx + 25*s, ly + 20*s, 'F');
      } catch(e2) {
        doc.setFillColor(54, 135, 132);
        doc.rect(margin, y + 2, 20, 10, 'F');
      }
    }

    // "GRUPO MONTEX" ao lado do logo
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('GRUPO MONTEX', margin + 25, y + 7);

    // "SOLUÇÕES EM AÇO" abaixo do nome
    doc.setTextColor(54, 135, 132);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('SOLUÇÕES EM AÇO', margin + 25, y + 12);

    // "ROMANEIO DE EXPEDIÇÃO" (direita, grande e bold)
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('ROMANEIO DE EXPEDIÇÃO', pageWidth - margin, y + 4, { align: 'right' });

    // Número do envio (direita, bold)
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(romaneioNum, pageWidth - margin, y + 11, { align: 'right' });

    // Emissão (direita, pequeno)
    const dataEmissao = new Date().toLocaleDateString('pt-BR');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Emissão: ${dataEmissao}`, pageWidth - margin, y + 16, { align: 'right' });

    // Status em verde (direita)
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`Status: ${statusEnvio}`, pageWidth - margin, y + 21, { align: 'right' });

    y += 26;

    // Linha separadora fina
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // =============================================
    // DADOS DA OBRA / DESTINO
    // =============================================
    // Box com borda
    const boxY = y;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, boxY, pageWidth - 2 * margin, 28, 2, 2, 'FD');

    // Título da seção
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('DADOS DA OBRA / DESTINO', margin + 4, boxY + 5);

    // Linha abaixo do título
    doc.setDrawColor(220, 225, 232);
    doc.line(margin, boxY + 7, pageWidth - margin, boxY + 7);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(30, 41, 59);

    const obraNome = obra?.nome || envio.obra_nome || envio.destino || 'N/A';
    const obraCliente = obra?.cliente || envio.cliente || '-';
    const obraCodigo = obra?.codigo || obra?.numero || '-';
    const dataCarreg = dataEmissao;
    const qtdTotal = (pecas || []).reduce((sum, p) => sum + (parseInt(p.qtdEnviada || p.quantidade) || 1), 0);

    // Coluna esquerda
    doc.setFont(undefined, 'bold');
    doc.text('Obra:', margin + 4, boxY + 13);
    doc.setFont(undefined, 'normal');
    doc.text(obraNome, margin + 20, boxY + 13);

    doc.setFont(undefined, 'bold');
    doc.text('Cliente:', margin + 4, boxY + 18);
    doc.setFont(undefined, 'normal');
    doc.text(obraCliente, margin + 20, boxY + 18);

    doc.setFont(undefined, 'bold');
    doc.text('Código:', margin + 4, boxY + 23);
    doc.setFont(undefined, 'normal');
    doc.text(String(obraCodigo), margin + 20, boxY + 23);

    // Coluna direita
    const rightCol = pageWidth / 2 + 10;
    doc.setFont(undefined, 'bold');
    doc.text('Data Carregamento:', rightCol, boxY + 13);
    doc.setFont(undefined, 'normal');
    doc.text(dataCarreg, rightCol + 38, boxY + 13);

    doc.setFont(undefined, 'bold');
    doc.text('Qtd Total:', rightCol, boxY + 18);
    doc.setFont(undefined, 'normal');
    doc.text(`${qtdTotal} un`, rightCol + 38, boxY + 18);

    y = boxY + 32;

    // =============================================
    // TABELA DE PEÇAS (match modelo)
    // =============================================

    // Barra de título da tabela (fundo escuro)
    const tableHeaderBarY = y;
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin, tableHeaderBarY, pageWidth - 2 * margin, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('LISTA DE PEÇAS / ITENS DO ENVIO', margin + 4, tableHeaderBarY + 5.5);

    // Resumo à direita
    let pesoTotalCalc = 0;
    let qtdTotalCalc = 0;
    (pecas || []).forEach(p => {
      const qty = parseInt(p.qtdEnviada || p.quantidade) || 1;
      const qtyOrig = parseInt(p.quantidade) || 1;
      const pesoRaw = parseFloat(p.peso) || 0;
      const pesoUnit = qtyOrig > 0 ? pesoRaw / qtyOrig : pesoRaw;
      pesoTotalCalc += pesoUnit * qty;
      qtdTotalCalc += qty;
    });
    doc.setFontSize(7);
    doc.text(`${qtdTotalCalc} un (${(pecas || []).length} itens) | ${pesoTotalCalc.toFixed(2)}kg`, pageWidth - margin - 4, tableHeaderBarY + 5.5, { align: 'right' });
    y = tableHeaderBarY + 10;

    // Cabeçalho de colunas (fundo slate)
    const colWidths = [12, 42, 42, 20, 32, 38];
    const colHeaders = ['#', 'Marca / Peça', 'Tipo / Perfil', 'Qtd', 'Peso Unit. (kg)', 'Peso Total (kg)'];
    const colAligns = ['left', 'left', 'left', 'center', 'right', 'right'];

    doc.setFillColor(71, 85, 99);
    doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');

    let xPos = margin;
    colHeaders.forEach((h, i) => {
      const align = colAligns[i] === 'right' ? 'right' : 'left';
      const xText = align === 'right' ? xPos + colWidths[i] - 2 : xPos + 2;
      doc.text(h, xText, y + 4.2, { align });
      xPos += colWidths[i];
    });
    y += 7;

    // Linhas de dados
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    const rowH = 7;

    (pecas || []).forEach((peca, idx) => {
      // Verificar se precisa nova página
      if (y + rowH > pageHeight - 25) {
        _addRomaneioFooter(doc, pageWidth, pageHeight, margin, romaneioNum);
        doc.addPage();
        y = margin;
      }

      // Fundo alternado
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 1, pageWidth - 2 * margin, rowH, 'F');
      }

      // Linha separadora
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, y + rowH - 1.5, pageWidth - margin, y + rowH - 1.5);

      const qty = parseInt(peca.qtdEnviada || peca.quantidade) || 1;
      const qtyOrig = parseInt(peca.quantidade) || 1;
      const pesoRaw = parseFloat(peca.peso) || 0;
      const pesoUnit = qtyOrig > 0 ? pesoRaw / qtyOrig : pesoRaw;
      const pesoTot = pesoUnit * qty;
      const marca = peca.marca || peca.nome || peca.codigo || '-';
      const tipo = (peca.tipo || peca.perfil || peca.descricao || '-').toUpperCase();

      doc.setTextColor(50, 50, 50);
      xPos = margin;

      // #
      doc.setFont(undefined, 'normal');
      doc.text(String(idx + 1), xPos + 2, y + 4);
      xPos += colWidths[0];

      // Marca (bold)
      doc.setFont(undefined, 'bold');
      doc.text(marca, xPos + 2, y + 4, { maxWidth: colWidths[1] - 4 });
      xPos += colWidths[1];

      // Tipo
      doc.setFont(undefined, 'normal');
      doc.text(tipo, xPos + 2, y + 4, { maxWidth: colWidths[2] - 4 });
      xPos += colWidths[2];

      // Qtd (center)
      doc.text(String(qty), xPos + colWidths[3] / 2, y + 4, { align: 'center' });
      xPos += colWidths[3];

      // Peso Unit (right)
      doc.text(pesoUnit.toFixed(1), xPos + colWidths[4] - 2, y + 4, { align: 'right' });
      xPos += colWidths[4];

      // Peso Total (right, bold)
      doc.setFont(undefined, 'bold');
      doc.text(pesoTot.toFixed(1), xPos + colWidths[5] - 2, y + 4, { align: 'right' });

      y += rowH;
    });

    // Linha TOTAL
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y - 1, pageWidth - 2 * margin, rowH + 1, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    xPos = margin + colWidths[0];
    doc.text('TOTAL', xPos + 2, y + 4.5);
    xPos += colWidths[1] + colWidths[2];
    doc.text(String(qtdTotalCalc), xPos + colWidths[3] / 2, y + 4.5, { align: 'center' });
    xPos += colWidths[3] + colWidths[4];
    doc.text(`${pesoTotalCalc.toFixed(2)} kg`, xPos + colWidths[5] - 2, y + 4.5, { align: 'right' });
    y += rowH + 4;

    // =============================================
    // DADOS DO TRANSPORTE
    // =============================================
    if (y + 30 > pageHeight - 25) {
      _addRomaneioFooter(doc, pageWidth, pageHeight, margin, romaneioNum);
      doc.addPage();
      y = margin;
    }

    const transBoxY = y;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, transBoxY, pageWidth - 2 * margin, 20, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('DADOS DO TRANSPORTE', margin + 4, transBoxY + 5);
    doc.setDrawColor(220, 225, 232);
    doc.line(margin, transBoxY + 7, pageWidth - margin, transBoxY + 7);

    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.setFont(undefined, 'bold');
    doc.text('Motorista:', margin + 4, transBoxY + 12);
    doc.setFont(undefined, 'normal');
    doc.text(envio.motorista || '-', margin + 24, transBoxY + 12);

    doc.setFont(undefined, 'bold');
    doc.text('Transportadora:', margin + 4, transBoxY + 17);
    doc.setFont(undefined, 'normal');
    doc.text(envio.transportadora || '-', margin + 32, transBoxY + 17);

    doc.setFont(undefined, 'bold');
    doc.text('Placa:', rightCol, transBoxY + 12);
    doc.setFont(undefined, 'normal');
    doc.text(envio.placa || '-', rightCol + 14, transBoxY + 12);

    y = transBoxY + 24;

    // =============================================
    // ASSINATURAS
    // =============================================
    if (y + 35 > pageHeight - 20) {
      _addRomaneioFooter(doc, pageWidth, pageHeight, margin, romaneioNum);
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('ASSINATURAS', margin, y + 4);
    y += 8;

    const sigWidth = (pageWidth - 2 * margin - 20) / 3;
    const sigLabels = ['Responsável Carregamento', 'Motorista / Transportadora', 'Recebimento no Destino'];
    sigLabels.forEach((label, i) => {
      const sx = margin + i * (sigWidth + 10);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      doc.line(sx, y + 18, sx + sigWidth, y + 18);
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(label, sx + sigWidth / 2, y + 22, { align: 'center' });
      doc.setFont(undefined, 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Data: ___/___/______', sx + sigWidth / 2, y + 26, { align: 'center' });
    });

    // =============================================
    // RODAPÉ
    // =============================================
    _addRomaneioFooter(doc, pageWidth, pageHeight, margin, romaneioNum);

    const filenameWithExt = `ROMANEIO_${romaneioNum}_${Date.now()}.pdf`;
    doc.save(filenameWithExt);
    return true;
  } catch (error) {
    console.error('Error exporting ROMANEIO to PDF:', error);
    return false;
  }
}

// ========================================
// HELPER: Rodapé do Romaneio
// ========================================
function _addRomaneioFooter(doc, pageWidth, pageHeight, margin, romaneioNum, pageNum) {
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.setFont(undefined, 'normal');
  doc.text('GRUPO MONTEX - Soluções em Aço', margin + 2, pageHeight - 8);
  doc.text(`${romaneioNum} | Pág ${pageNum || doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - margin - 2, pageHeight - 8, { align: 'right' });
}

// ========================================
// HELPER: Format Date
// ========================================
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
}

// ========================================
// HELPER: Format Number
// ========================================
export function formatNumber(value) {
  if (typeof value !== 'number') return value;
  return value.toLocaleString('pt-BR');
}

// ========================================
// HELPER: Format Weight
// ========================================
export function formatWeight(kg) {
  if (!kg || isNaN(kg)) return '0 kg';
  return `${kg.toLocaleString('pt-BR')} kg`;
}
