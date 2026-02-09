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
