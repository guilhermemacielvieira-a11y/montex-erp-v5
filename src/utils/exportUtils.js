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

    // Logo GRUPO MONTEX real (PNG embutido)
    const logoMontex = 'data:image/png;base64,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';
    try {
      doc.addImage(logoMontex, 'PNG', margin, y, 22, 14);
    } catch(e) {
      // fallback se addImage falhar
      doc.setFillColor(54, 135, 132);
      doc.rect(margin, y + 2, 20, 10, 'F');
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
