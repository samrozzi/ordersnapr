/**
 * Report Export Utilities
 * Export reports to various formats (CSV, Excel, PDF)
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportResults } from '@/lib/report-builder-types';

// ============================================================================
// CSV Export
// ============================================================================

export function exportToCSV(results: ReportResults): void {
  const { data, configuration } = results;

  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Get column headers
  const headers = Object.keys(data[0]);

  // Build CSV content
  const csvRows = [];

  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      // Escape values that contain commas or quotes
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${configuration.name || 'report'}.csv`);
}

// ============================================================================
// Excel Export
// ============================================================================

export function exportToExcel(results: ReportResults): void {
  const { data, configuration } = results;

  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Create worksheet from data
  const ws = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const columnWidths = Object.keys(data[0]).map((key) => {
    const maxLength = Math.max(
      key.length,
      ...data.map((row) => String(row[key] || '').length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  ws['!cols'] = columnWidths;

  // Add metadata sheet
  const metadata = {
    'Report Name': configuration.name || 'Untitled Report',
    'Description': configuration.description || '',
    'Generated At': new Date(results.generatedAt).toLocaleString(),
    'Total Rows': results.totalRows,
    'Execution Time': results.executionTime ? `${results.executionTime}ms` : 'N/A',
    'Data Source': configuration.entity,
    'Chart Type': configuration.chartType,
  };

  const metadataWs = XLSX.utils.json_to_sheet([metadata]);
  metadataWs['!cols'] = [{ wch: 20 }, { wch: 50 }];

  // Add worksheets to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.utils.book_append_sheet(wb, metadataWs, 'Info');

  // Generate Excel file
  XLSX.writeFile(wb, `${configuration.name || 'report'}.xlsx`);
}

// ============================================================================
// PDF Export
// ============================================================================

export function exportToPDF(results: ReportResults, includeChart?: boolean): void {
  const { data, configuration } = results;

  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Create PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(configuration.name || 'Report', margin, margin);

  // Add description if available
  let yPos = margin + 10;
  if (configuration.description) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const descLines = doc.splitTextToSize(configuration.description, pageWidth - 2 * margin);
    doc.text(descLines, margin, yPos);
    yPos += descLines.length * 5 + 5;
  }

  // Add metadata
  doc.setFontSize(9);
  doc.setTextColor(128);
  doc.text(`Generated: ${new Date(results.generatedAt).toLocaleString()}`, margin, yPos);
  yPos += 5;
  doc.text(`Total Rows: ${results.totalRows}`, margin, yPos);
  yPos += 10;

  // Prepare table data
  const headers = Object.keys(data[0]);
  const tableData = data.map((row) =>
    headers.map((header) => formatCellValue(row[header]))
  );

  // Add table
  autoTable(doc, {
    head: [headers.map(formatHeaderName)],
    body: tableData,
    startY: yPos,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [14, 165, 233], // sky-500
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    tableWidth: 'auto',
    columnStyles: headers.reduce((acc, header, index) => {
      // Auto-size columns based on content
      const maxLength = Math.max(
        header.length,
        ...data.map((row) => String(row[header] || '').length)
      );
      const width = Math.min(maxLength * 2, 40);
      acc[index] = { cellWidth: width };
      return acc;
    }, {} as Record<number, { cellWidth: number }>),
  });

  // Add footer with page numbers
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
    doc.text(
      configuration.name || 'Report',
      margin,
      pageHeight - 10,
      { align: 'left' }
    );
  }

  // Save PDF
  doc.save(`${configuration.name || 'report'}.pdf`);
}

// ============================================================================
// Enhanced PDF Export with Chart
// ============================================================================

export async function exportToPDFWithChart(
  results: ReportResults,
  chartCanvas?: HTMLCanvasElement
): Promise<void> {
  const { data, configuration } = results;

  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(configuration.name || 'Report', margin, margin);

  let yPos = margin + 10;

  // Add description
  if (configuration.description) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const descLines = doc.splitTextToSize(configuration.description, pageWidth - 2 * margin);
    doc.text(descLines, margin, yPos);
    yPos += descLines.length * 5 + 5;
  }

  // Add chart if provided
  if (chartCanvas && configuration.chartType !== 'table') {
    try {
      const chartImage = chartCanvas.toDataURL('image/png');
      const chartWidth = pageWidth - 2 * margin;
      const chartHeight = (chartCanvas.height / chartCanvas.width) * chartWidth;

      doc.addImage(chartImage, 'PNG', margin, yPos, chartWidth, Math.min(chartHeight, 100));
      yPos += Math.min(chartHeight, 100) + 10;

      // Add new page for table if needed
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = margin;
      }
    } catch (error) {
      console.error('Failed to add chart to PDF:', error);
    }
  }

  // Add metadata
  doc.setFontSize(9);
  doc.setTextColor(128);
  doc.text(`Generated: ${new Date(results.generatedAt).toLocaleString()}`, margin, yPos);
  yPos += 5;
  doc.text(`Total Rows: ${results.totalRows}`, margin, yPos);
  yPos += 10;

  // Prepare table data
  const headers = Object.keys(data[0]);
  const tableData = data.map((row) =>
    headers.map((header) => formatCellValue(row[header]))
  );

  // Add table
  autoTable(doc, {
    head: [headers.map(formatHeaderName)],
    body: tableData,
    startY: yPos,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [14, 165, 233],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  // Add footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, {
      align: 'right',
    });
    doc.text(configuration.name || 'Report', margin, pageHeight - 10, { align: 'left' });
  }

  doc.save(`${configuration.name || 'report'}.pdf`);
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  return String(value);
}

function formatHeaderName(header: string): string {
  return header
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
