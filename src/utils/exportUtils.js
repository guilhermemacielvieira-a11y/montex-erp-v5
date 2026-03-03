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
    // Criar novo workbook
    const wb = XLSXUtils.book_new();

    // Preparar dados com headers
    const headers = columns.map(col => col.header);
    const formattedData = data.map(row => {
      const formattedRow = {};
      columns.forEach(col => {
        formattedRow[col.header] = row[col.key];
      });
      return formattedRow;
    });

    // Criar worksheet
    const ws = XLSXUtils.json_to_sheet(formattedData);

    // Auto-ajustar largura das colunas
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

    // Adicionar worksheet ao workbook
    XLSXUtils.book_append_sheet(wb, ws, 'Dados');

    // Download
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

    // Header
    doc.setFillColor(30, 30, 30); // Dark background
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 30, 'F');

    // MONTEX Logo/Branding
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('MONTEX ERP Premium', margin + 5, yPosition + 12);

    // Title
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(title, margin + 5, yPosition + 22);

    // Date Generated
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    const dataGeracao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Data de Geração: ${dataGeracao}`, margin + 5, yPosition + 27);

    yPosition += 35;

    // Table
    const headers = columns.map(col => col.header);
    const rows = data.map(row =>
      columns.map(col => {
        const value = row[col.key];
        // Format large numbers
        if (typeof value === 'number') {
          return value.toLocaleString('pt-BR');
        }
        return String(value || '');
      })
    );

    // Calculate column widths
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

    // Header Row
    doc.setFillColor(75, 85, 99); // Slate header
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);

    let xPosition = margin;
    headers.forEach((header, idx) => {
      doc.text(header, xPosition + 2, yPosition + 7, { maxWidth: scaledWidths[idx] - 4 });
      xPosition += scaledWidths[idx];
    });

    // Separator
    yPosition += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);

    yPosition += 3;

    // Data Rows
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);

    const rowHeight = 6;
    const maxRowsPerPage = Math.floor((pageHeight - yPosition - 15) / rowHeight);

    rows.forEach((row, rowIdx) => {
      // Check if we need a new page
      if (rowIdx > 0 && rowIdx % maxRowsPerPage === 0) {
        // Footer with page number
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Página ${doc.internal.getCurrentPageInfo().pageNumber}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );

        // Add new page
        doc.addPage();
        yPosition = margin;

        // Repeat header on new page
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

      // Alternate row colors
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

    // Footer with page number on last page
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Página ${doc.internal.getCurrentPageInfo().pageNumber}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );

    // Save PDF
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

    // Capture element as canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    // Create PDF from canvas
    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
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
    // Create CSV content
    const headers = columns.map(col => `"${col.header}"`).join(',');

    const rows = data.map(row => {
      return columns.map(col => {
        const value = row[col.key];
        // Escape quotes and wrap in quotes
        const escapedValue = String(value || '').replace(/"/g, '""');
        return `"${escapedValue}"`;
      }).join(',');
    });

    const csvContent = [headers, ...rows].join('\n');

    // Create blob and download
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
// Logo MONTEX em base64 PNG (180x113px)
const MONTEX_LOGO_B64 = 'data:image/png;base64,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';

export function exportRomaneioPDF(envio, obra, pecas) {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const colDir = pageWidth / 2 + 10;
    let y = margin;
    const romaneioNum = envio.numero || envio.romaneio || `ROM-${Date.now()}`;

    // =============================================
    // CABEÇALHO COM LOGO + BRANDING MONTEX
    // =============================================
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, 44, 'F');
    doc.setFillColor(54, 135, 132); // teal #368784
    doc.rect(0, 44, pageWidth, 2.5, 'F');

    // Logo imagem
    try {
      doc.addImage(MONTEX_LOGO_B64, 'PNG', margin + 2, 6, 22, 14);
    } catch (_e) { /* fallback sem logo */ }

    // Texto GRUPO MONTEX ao lado do logo
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('GRUPO MONTEX', margin + 28, 16);

    doc.setFontSize(8.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Estruturas Metálicas | Sistema de Produção', margin + 28, 22);

    // Número do romaneio (direita)
    doc.setTextColor(54, 135, 132);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(romaneioNum, pageWidth - margin - 2, 14, { align: 'right' });

    doc.setFontSize(8.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(148, 163, 184);
    const dataEmissao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Emissão: ${dataEmissao}`, pageWidth - margin - 2, 21, { align: 'right' });

    // Título
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ROMANEIO DE CARGA', pageWidth / 2, 38, { align: 'center' });

    y = 52;

    // =============================================
    // DADOS DA OBRA / CLIENTE
    // =============================================
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 32, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 32, 2, 2, 'S');

    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('DADOS DA OBRA / CLIENTE', margin + 4, y + 5);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 4, y + 7, pageWidth - margin - 4, y + 7);

    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);

    const obraNome = obra?.nome || envio.obra_nome || envio.obraNome || '-';
    const clienteNome = obra?.cliente || envio.cliente || '-';
    const endereco = obra?.endereco || envio.endereco || '-';
    const cidade = obra?.cidade || '';

    doc.setFont(undefined, 'bold'); doc.text('Obra:', margin + 4, y + 13);
    doc.setFont(undefined, 'normal'); doc.text(String(obraNome), margin + 18, y + 13);
    doc.setFont(undefined, 'bold'); doc.text('Cliente:', margin + 4, y + 19);
    doc.setFont(undefined, 'normal'); doc.text(String(clienteNome), margin + 22, y + 19);
    doc.setFont(undefined, 'bold'); doc.text('Endereço:', margin + 4, y + 25);
    doc.setFont(undefined, 'normal');
    doc.text(cidade ? `${endereco} - ${cidade}` : String(endereco), margin + 28, y + 25, { maxWidth: 70 });

    // Datas (coluna direita)
    doc.setFont(undefined, 'bold'); doc.text('Data Carregamento:', colDir, y + 13);
    doc.setFont(undefined, 'normal');
    const dataSrc = envio.data_envio || envio.dataCarregamento || envio.dataEnvio;
    const dataCarreg = dataSrc ? new Date(dataSrc + 'T12:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
    doc.text(dataCarreg, colDir + 42, y + 13);

    doc.setFont(undefined, 'bold'); doc.text('Previsão Entrega:', colDir, y + 19);
    doc.setFont(undefined, 'normal');
    doc.text(envio.previsaoEntrega ? new Date(envio.previsaoEntrega).toLocaleDateString('pt-BR') : '-', colDir + 38, y + 19);

    doc.setFont(undefined, 'bold'); doc.text('Qtd Total:', colDir, y + 25);
    doc.setFont(undefined, 'normal');
    const qtdTotalEnvio = envio.quantidade_total || pecas?.length || 0;
    doc.text(String(qtdTotalEnvio) + ' un', colDir + 22, y + 25);

    y += 38;

    // =============================================
    // LISTA DE PEÇAS
    // =============================================
    const listaPecas = pecas || [];
    let pesoTotalCalc = 0;
    let qtdTotalCalc = 0;
    listaPecas.forEach(p => {
      const qty = p.qtdEnviada || parseInt(p.quantidade) || 1;
      const pesoUnit = parseFloat(p.peso) || parseFloat(p.pesoTotal) || parseFloat(p.pesoUnitario) || 0;
      const qtyOrig = parseInt(p.quantidade) || 1;
      const pesoUnitReal = qtyOrig > 0 ? pesoUnit / qtyOrig : pesoUnit;
      pesoTotalCalc += pesoUnitReal * qty;
      qtdTotalCalc += qty;
    });

    // Barra título
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('LISTA DE PEÇAS / ITENS DO ENVIO', margin + 4, y + 5.5);
    doc.text(`${qtdTotalCalc} un (${listaPecas.length} item) | ${(pesoTotalCalc / 1000).toFixed(2)}t`, pageWidth - margin - 4, y + 5.5, { align: 'right' });
    y += 10;

    // Cabeçalho tabela - COLUNAS SOLICITADAS
    const headers = ['#', 'Marca / Peça', 'Tipo', 'Qtd', 'Peso Unit. (kg)', 'Peso Total (kg)'];
    const colWidths = [10, 50, 40, 18, 34, 34];
    const colX = [margin + 2];
    for (let i = 1; i < colWidths.length; i++) colX.push(colX[i - 1] + colWidths[i - 1]);

    function _drawTableHeader() {
      doc.setFillColor(54, 135, 132); // teal header
      doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont(undefined, 'bold');
      headers.forEach((h, i) => doc.text(h, colX[i], y + 5));
      y += 8;
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y, pageWidth - margin, y);
    }
    _drawTableHeader();

    // Dados das peças
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);

    listaPecas.forEach((peca, idx) => {
      if (y > pageHeight - 55) {
        _addRomaneioFooter(doc, pageWidth, pageHeight, margin, romaneioNum);
        doc.addPage();
        y = margin + 5;
        _drawTableHeader();
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
      }

      // Zebra
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, pageWidth - 2 * margin, 6.5, 'F');
      }

      doc.setTextColor(30, 41, 59);
      const qty = peca.qtdEnviada || parseInt(peca.quantidade) || 1;
      const pesoTotal = parseFloat(peca.peso) || parseFloat(peca.pesoTotal) || parseFloat(peca.pesoUnitario) || 0;
      const qtyOrig = parseInt(peca.quantidade) || 1;
      const pesoUnitReal = qtyOrig > 0 ? pesoTotal / qtyOrig : pesoTotal;
      const pesoTotalItem = pesoUnitReal * qty;

      const marca = String(peca.marca || peca.nome || peca.codigo || peca.id || '-');
      const tipo = String(peca.tipo || peca.perfil || peca.tipoPeca || '-');

      doc.text(String(idx + 1), colX[0], y + 4.5);
      doc.setFont(undefined, 'bold');
      doc.text(marca.substring(0, 25), colX[1], y + 4.5);
      doc.setFont(undefined, 'normal');
      doc.text(tipo.substring(0, 20), colX[2], y + 4.5);
      doc.text(String(qty), colX[3], y + 4.5);
      doc.text(pesoUnitReal > 0 ? pesoUnitReal.toFixed(1) : '-', colX[4], y + 4.5);
      doc.setFont(undefined, 'bold');
      doc.text(pesoTotalItem > 0 ? pesoTotalItem.toFixed(1) : '-', colX[5], y + 4.5);
      doc.setFont(undefined, 'normal');

      y += 6.5;
    });

    // Linha de totais
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineWidth(0.2);
    y += 1;

    // Linha de TOTAL na tabela
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.5);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL', colX[1], y + 5);
    doc.text(String(qtdTotalCalc), colX[3], y + 5);
    doc.text(`${(pesoTotalCalc).toFixed(1)} kg`, colX[5], y + 5);
    doc.text(`${(pesoTotalCalc / 1000).toFixed(2)}t`, colX[4], y + 5);
    y += 11;

    // =============================================
    // OBSERVAÇÕES (se houver)
    // =============================================
    if (envio.observacoes) {
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 10, 2, 2, 'F');
      doc.setDrawColor(251, 191, 36);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 10, 2, 2, 'S');
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(146, 64, 14);
      doc.text('Obs:', margin + 4, y + 6);
      doc.setFont(undefined, 'normal');
      doc.text(String(envio.observacoes), margin + 16, y + 6, { maxWidth: pageWidth - 2 * margin - 20 });
      y += 14;
    }

    // =============================================
    // DADOS DO TRANSPORTE
    // =============================================
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 20, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 20, 2, 2, 'S');
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('DADOS DO TRANSPORTE', margin + 4, y + 5);
    doc.line(margin + 4, y + 7, pageWidth - margin - 4, y + 7);

    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.setFont(undefined, 'bold'); doc.text('Motorista:', margin + 4, y + 13);
    doc.setFont(undefined, 'normal'); doc.text(String(envio.motorista || '-'), margin + 28, y + 13);
    doc.setFont(undefined, 'bold'); doc.text('Placa:', colDir, y + 13);
    doc.setFont(undefined, 'normal'); doc.text(String(envio.placa || '-'), colDir + 16, y + 13);
    doc.setFont(undefined, 'bold'); doc.text('Transportadora:', margin + 4, y + 18);
    doc.setFont(undefined, 'normal'); doc.text(String(envio.transportadora || '-'), margin + 40, y + 18);

    y += 26;

    // =============================================
    // ASSINATURAS
    // =============================================
    const assinaturaY = Math.max(y + 5, pageHeight - 52);
    doc.setDrawColor(51, 65, 85);
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('ASSINATURAS', margin + 4, assinaturaY);

    const lineY = assinaturaY + 20;
    const sigWidth = (pageWidth - 2 * margin - 20) / 3;

    doc.setDrawColor(148, 163, 184);
    doc.setFontSize(7);

    // 1 - Expedição
    doc.line(margin + 4, lineY, margin + 4 + sigWidth, lineY);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Responsável Expedição', margin + 4 + sigWidth / 2, lineY + 4, { align: 'center' });
    doc.text('Nome / Data', margin + 4 + sigWidth / 2, lineY + 8, { align: 'center' });

    // 2 - Motorista
    const sig2X = margin + 4 + sigWidth + 10;
    doc.line(sig2X, lineY, sig2X + sigWidth, lineY);
    doc.text('Motorista / Transportadora', sig2X + sigWidth / 2, lineY + 4, { align: 'center' });
    doc.text('Nome / Data', sig2X + sigWidth / 2, lineY + 8, { align: 'center' });

    // 3 - Recebimento
    const sig3X = sig2X + sigWidth + 10;
    doc.line(sig3X, lineY, sig3X + sigWidth, lineY);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(54, 135, 132);
    doc.text('RECEBIDO POR', sig3X + sigWidth / 2, lineY + 4, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Nome / Data / Carimbo', sig3X + sigWidth / 2, lineY + 8, { align: 'center' });

    // Rodapé
    _addRomaneioFooter(doc, pageWidth, pageHeight, margin, romaneioNum);

    // Salvar
    doc.save(`romaneio-${romaneioNum}-${new Date().toISOString().split('T')[0]}.pdf`);
    return true;
  } catch (error) {
    console.error('Erro ao gerar Romaneio PDF:', error);
    return false;
  }
}

// Helper: Rodapé do Romaneio
function _addRomaneioFooter(doc, pageWidth, pageHeight, margin, romaneioNum) {
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.setFont(undefined, 'normal');
  doc.text('GRUPO MONTEX - Estruturas Metálicas | Documento gerado automaticamente pelo sistema MONTEX ERP', margin + 2, pageHeight - 8);
  doc.text(`${romaneioNum} | Pág. ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - margin - 2, pageHeight - 8, { align: 'right' });
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
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${kg.toLocaleString('pt-BR')} kg`;
}
