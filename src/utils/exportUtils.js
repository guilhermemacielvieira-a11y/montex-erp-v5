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

    // ---- CABEÇALHO COM BRANDING MONTEX ----
    // Fundo escuro do cabeçalho
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Linha accent teal
    doc.setFillColor(54, 135, 132); // #368784
    doc.rect(0, 42, pageWidth, 2, 'F');

    // Logo texto MONTEX
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('GRUPO MONTEX', margin + 2, 16);

    // Subtítulo
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Estruturas Metálicas | Sistema de Produção', margin + 2, 23);

    // Número do romaneio no canto direito
    doc.setTextColor(54, 135, 132); // teal
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    const romaneioNum = envio.numero || envio.romaneio || `ROM-${Date.now()}`;
    doc.text(romaneioNum, pageWidth - margin - 2, 16, { align: 'right' });

    // Data de emissão
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(148, 163, 184);
    const dataEmissao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Emissão: ${dataEmissao}`, pageWidth - margin - 2, 23, { align: 'right' });

    // Título ROMANEIO DE CARGA
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ROMANEIO DE CARGA', pageWidth / 2, 36, { align: 'center' });

    y = 50;

    // ---- SEÇÃO: DADOS DA OBRA / CLIENTE ----
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 32, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 32, 2, 2, 'S');

    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text('DADOS DA OBRA / CLIENTE', margin + 4, y + 5);

    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 4, y + 7, pageWidth - margin - 4, y + 7);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(30, 41, 59); // slate-800

    const obraNome = obra?.nome || envio.obra || envio.obraNome || '-';
    const clienteNome = obra?.cliente || envio.cliente || '-';
    const endereco = obra?.endereco || envio.endereco || '-';
    const cidade = obra?.cidade || '';

    // Coluna esquerda
    doc.setFont(undefined, 'bold');
    doc.text('Obra:', margin + 4, y + 13);
    doc.setFont(undefined, 'normal');
    doc.text(String(obraNome), margin + 18, y + 13);

    doc.setFont(undefined, 'bold');
    doc.text('Cliente:', margin + 4, y + 19);
    doc.setFont(undefined, 'normal');
    doc.text(String(clienteNome), margin + 22, y + 19);

    doc.setFont(undefined, 'bold');
    doc.text('Endereço:', margin + 4, y + 25);
    doc.setFont(undefined, 'normal');
    const enderecoCompleto = cidade ? `${endereco} - ${cidade}` : String(endereco);
    doc.text(enderecoCompleto, margin + 28, y + 25, { maxWidth: pageWidth - 2 * margin - 32 });

    // Coluna direita - datas
    const colDir = pageWidth / 2 + 10;
    doc.setFont(undefined, 'bold');
    doc.text('Data Carregamento:', colDir, y + 13);
    doc.setFont(undefined, 'normal');
    const dataCarreg = envio.dataCarregamento || envio.dataEnvio
      ? new Date(envio.dataCarregamento || envio.dataEnvio).toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR');
    doc.text(dataCarreg, colDir + 42, y + 13);

    doc.setFont(undefined, 'bold');
    doc.text('Previsão Entrega:', colDir, y + 19);
    doc.setFont(undefined, 'normal');
    const prevEntrega = envio.previsaoEntrega
      ? new Date(envio.previsaoEntrega).toLocaleDateString('pt-BR')
      : '-';
    doc.text(prevEntrega, colDir + 38, y + 19);

    y += 38;

    // ---- SEÇÃO: LISTA DE PEÇAS ----
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('LISTA DE PEÇAS / ITENS DO ENVIO', margin + 4, y + 5.5);

    const qtdTotal = pecas?.length || envio.qtdPecas || envio.volumes || 0;
    const pesoTotal = pecas?.reduce((a, p) => a + (p.peso || p.peso_total || 0), 0) || envio.pesoTotal || 0;
    doc.text(`${qtdTotal} peça(s) | ${(pesoTotal / 1000).toFixed(2)}t`, pageWidth - margin - 4, y + 5.5, { align: 'right' });

    y += 10;

    // Cabeçalho da tabela
    doc.setFillColor(226, 232, 240); // slate-200
    doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
    doc.setTextColor(51, 65, 85); // slate-700
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'bold');

    const colWidths = [10, 30, 35, 30, 28, 22, 31];
    const colX = [margin + 2];
    for (let i = 1; i < colWidths.length; i++) colX.push(colX[i - 1] + colWidths[i - 1]);

    const headers = ['#', 'Marca', 'Tipo', 'Categoria', 'Peso (kg)', 'Qtd', 'Status'];
    headers.forEach((h, i) => {
      doc.text(h, colX[i], y + 5);
    });

    y += 8;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);

    // Dados das peças
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);

    const listaPecas = pecas || envio.itens || [];
    let pesoAcumulado = 0;

    listaPecas.forEach((peca, idx) => {
      // Nova página se necessário
      if (y > pageHeight - 55) {
        // Rodapé na página atual
        _addRomaneioFooter(doc, pageWidth, pageHeight, margin, romaneioNum);
        doc.addPage();
        y = margin + 5;

        // Re-cabeçalho na nova página
        doc.setFillColor(226, 232, 240);
        doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(7.5);
        doc.setFont(undefined, 'bold');
        headers.forEach((h, i) => doc.text(h, colX[i], y + 5));
        y += 8;
        doc.setDrawColor(203, 213, 225);
        doc.line(margin, y, pageWidth - margin, y);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
      }

      // Linhas alternadas
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(margin, y, pageWidth - 2 * margin, 6.5, 'F');
      }

      doc.setTextColor(30, 41, 59);
      const pesoItem = peca.peso || peca.peso_total || 0;
      pesoAcumulado += pesoItem;

      doc.text(String(idx + 1), colX[0], y + 4.5);
      doc.text(String(peca.marca || peca.nome || peca.id || '-'), colX[1], y + 4.5);
      doc.text(String(peca.tipo || peca.tipo_peca || '-'), colX[2], y + 4.5);
      doc.text(String(peca.categoria || peca.etapa || '-'), colX[3], y + 4.5);
      doc.text(pesoItem ? pesoItem.toLocaleString('pt-BR') : '-', colX[4], y + 4.5);
      doc.text(String(peca.qtd || peca.quantidade || 1), colX[5], y + 4.5);

      // Status badge
      const status = peca.status || 'expedido';
      doc.setTextColor(16, 185, 129); // emerald
      doc.text(String(status).toUpperCase(), colX[6], y + 4.5);
      doc.setTextColor(30, 41, 59);

      y += 6.5;
    });

    // Linha final
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineWidth(0.2);

    y += 3;

    // ---- RESUMO TOTAIS ----
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 14, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 14, 2, 2, 'S');

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('RESUMO:', margin + 4, y + 5);

    doc.setFont(undefined, 'normal');
    doc.text(`Total de Peças: ${listaPecas.length}`, margin + 30, y + 5);
    doc.text(`Peso Total: ${(pesoAcumulado / 1000).toFixed(2)}t (${pesoAcumulado.toLocaleString('pt-BR')} kg)`, margin + 75, y + 5);

    if (envio.observacoes) {
      doc.setFontSize(8);
      doc.text(`Obs: ${envio.observacoes}`, margin + 4, y + 11, { maxWidth: pageWidth - 2 * margin - 8 });
    }

    y += 20;

    // ---- SEÇÃO: TRANSPORTE (se houver) ----
    if (envio.motorista || envio.placa) {
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 16, 2, 2, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 16, 2, 2, 'S');

      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('DADOS DO TRANSPORTE', margin + 4, y + 5);
      doc.line(margin + 4, y + 7, pageWidth - margin - 4, y + 7);

      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.setFont(undefined, 'bold');
      doc.text('Motorista:', margin + 4, y + 13);
      doc.setFont(undefined, 'normal');
      doc.text(String(envio.motorista || '-'), margin + 28, y + 13);

      doc.setFont(undefined, 'bold');
      doc.text('Placa:', colDir, y + 13);
      doc.setFont(undefined, 'normal');
      doc.text(String(envio.placa || '-'), colDir + 16, y + 13);

      if (envio.telefoneMotorista) {
        doc.setFont(undefined, 'bold');
        doc.text('Telefone:', margin + 90, y + 13);
        doc.setFont(undefined, 'normal');
        doc.text(String(envio.telefoneMotorista), margin + 112, y + 13);
      }

      y += 22;
    }

    // ---- SEÇÃO: ASSINATURAS ----
    // Garantir que assinaturas fiquem no final da página
    const assinaturaY = Math.max(y + 10, pageHeight - 55);

    doc.setDrawColor(51, 65, 85);
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('ASSINATURAS', margin + 4, assinaturaY);

    const lineY = assinaturaY + 20;
    const sigWidth = (pageWidth - 2 * margin - 20) / 3;

    // Assinatura 1 - Expedição
    doc.setDrawColor(148, 163, 184);
    doc.line(margin + 4, lineY, margin + 4 + sigWidth, lineY);
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Responsável Expedição', margin + 4 + sigWidth / 2, lineY + 4, { align: 'center' });
    doc.text('Nome / Data', margin + 4 + sigWidth / 2, lineY + 8, { align: 'center' });

    // Assinatura 2 - Motorista
    const sig2X = margin + 4 + sigWidth + 10;
    doc.line(sig2X, lineY, sig2X + sigWidth, lineY);
    doc.text('Motorista / Transportadora', sig2X + sigWidth / 2, lineY + 4, { align: 'center' });
    doc.text('Nome / Data', sig2X + sigWidth / 2, lineY + 8, { align: 'center' });

    // Assinatura 3 - Recebimento
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
    const filename = `romaneio-${romaneioNum}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);

    return true;
  } catch (error) {
    console.error('Erro ao gerar Romaneio PDF:', error);
    return false;
  }
}

// Helper: Rodapé do Romaneio
function _addRomaneioFooter(doc, pageWidth, pageHeight, margin, romaneioNum) {
  // Linha separadora
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

  // Texto rodapé
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
