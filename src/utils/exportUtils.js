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

    // Logo M estilizado em teal (esquerda)
    doc.setFillColor(54, 135, 132);
    doc.triangle(margin + 2, y + 12, margin + 8, y + 2, margin + 14, y + 12, 'F');
    doc.triangle(margin + 10, y + 12, margin + 16, y + 2, margin + 22, y + 12, 'F');
    doc.triangle(margin + 18, y + 12, margin + 24, y + 2, margin + 30, y + 12, 'F');

    // "GRUPO MONTEX" ao lado do logo
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('GRUPO MONTEX', margin + 34, y + 7);

    // "SOLUÇÕES EM AÇO" abaixo do nome
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('SOLUÇÕES EM AÇO', margin + 34, y + 12);

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
