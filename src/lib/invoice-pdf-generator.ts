import type { jsPDF } from "jspdf";

interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate_cents: number;
  amount_cents: number;
}

interface InvoicePDFData {
  // Invoice details
  number: string;
  issue_date: string;
  due_date: string | null;
  status: string;

  // Amounts
  line_items: InvoiceLineItem[];
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;

  // Payment info
  paid_at: string | null;
  paid_amount_cents: number | null;

  // Customer info
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: any;

  // Organization info
  organization_name?: string;
  organization_logo?: string;

  // Additional
  notes?: string;
  terms?: string;
}

const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const generateInvoicePDF = async (data: InvoicePDFData): Promise<jsPDF> => {
  // Lazy load jsPDF and autotable
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPos = 20;

  // Primary color (purple)
  const primaryColor: [number, number, number] = [102, 126, 234];
  const textColor: [number, number, number] = [26, 26, 26];
  const mutedColor: [number, number, number] = [107, 114, 128];

  // === HEADER SECTION ===

  // Organization name or OrderSnapr
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.organization_name || "OrderSnapr", 20, yPos);
  yPos += 10;

  // Invoice title on the right
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text("INVOICE", pageWidth - 20, 20, { align: "right" });

  // Invoice number below title
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);
  doc.text(data.number, pageWidth - 20, 30, { align: "right" });

  yPos = 45;

  // === BILL TO SECTION ===

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...mutedColor);
  doc.text("BILL TO", 20, yPos);
  yPos += 6;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text(data.customer_name, 20, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);

  if (data.customer_email) {
    doc.text(data.customer_email, 20, yPos);
    yPos += 5;
  }

  if (data.customer_phone) {
    doc.text(data.customer_phone, 20, yPos);
    yPos += 5;
  }

  if (data.customer_address) {
    const addressLines: string[] = [];
    if (data.customer_address.street) addressLines.push(data.customer_address.street);
    if (data.customer_address.city || data.customer_address.state || data.customer_address.zip) {
      const cityStateZip = [
        data.customer_address.city,
        data.customer_address.state,
        data.customer_address.zip
      ].filter(Boolean).join(', ');
      if (cityStateZip) addressLines.push(cityStateZip);
    }

    addressLines.forEach(line => {
      doc.text(line, 20, yPos);
      yPos += 5;
    });
  }

  // === INVOICE DETAILS (RIGHT SIDE) ===

  const detailsX = pageWidth - 80;
  let detailsY = 45;

  const addDetail = (label: string, value: string, bold: boolean = false) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...mutedColor);
    doc.text(label, detailsX, detailsY);

    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...textColor);
    doc.text(value, pageWidth - 20, detailsY, { align: "right" });
    detailsY += 6;
  };

  addDetail("Issue Date:", formatDate(data.issue_date));

  if (data.due_date) {
    const isOverdue = data.status !== 'paid' && new Date(data.due_date) < new Date();
    if (isOverdue) {
      doc.setTextColor(220, 38, 38); // Red for overdue
    }
    addDetail("Due Date:", formatDate(data.due_date));
    doc.setTextColor(...textColor);
  }

  // Status badge
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const statusText = data.status.toUpperCase();
  const statusWidth = doc.getTextWidth(statusText) + 8;
  const statusX = pageWidth - 20 - statusWidth;

  // Status color
  let statusColor: [number, number, number] = [107, 114, 128]; // gray
  if (data.status === 'paid') statusColor = [34, 197, 94]; // green
  else if (data.status === 'sent') statusColor = [59, 130, 246]; // blue
  else if (data.status === 'overdue') statusColor = [220, 38, 38]; // red

  doc.setFillColor(...statusColor);
  doc.roundedRect(statusX, detailsY - 4, statusWidth, 6, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(statusText, pageWidth - 20, detailsY, { align: "right" });
  detailsY += 10;

  doc.setTextColor(...textColor);

  // === LINE ITEMS TABLE ===

  yPos = Math.max(yPos, detailsY) + 10;

  const tableData = data.line_items.map(item => [
    item.description,
    item.quantity.toString(),
    formatCurrency(item.rate_cents),
    formatCurrency(item.amount_cents),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Qty', 'Rate', 'Amount']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [249, 250, 251],
      textColor: [107, 114, 128],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      textColor: [26, 26, 26],
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'right' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  // Get Y position after table
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // === TOTALS SECTION ===

  const totalsX = pageWidth - 85;
  const totalsLabelX = totalsX - 5;
  const totalsValueX = pageWidth - 20;

  const addTotal = (label: string, amount: number, bold: boolean = false) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(bold ? ...textColor : ...mutedColor);
    doc.text(label, totalsLabelX, yPos, { align: "right" });
    doc.text(formatCurrency(amount), totalsValueX, yPos, { align: "right" });
    yPos += 6;
  };

  // Subtotal
  addTotal("Subtotal:", data.subtotal_cents);

  // Tax
  if (data.tax_cents > 0) {
    addTotal("Tax:", data.tax_cents);
  }

  // Discount
  if (data.discount_cents > 0) {
    doc.setTextColor(220, 38, 38); // Red for discount
    addTotal("Discount:", -data.discount_cents);
    doc.setTextColor(...textColor);
  }

  // Divider line
  doc.setLineWidth(0.5);
  doc.setDrawColor(...mutedColor);
  doc.line(totalsLabelX - 45, yPos, totalsValueX, yPos);
  yPos += 6;

  // Total
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("Total:", totalsLabelX, yPos, { align: "right" });
  doc.text(formatCurrency(data.total_cents), totalsValueX, yPos, { align: "right" });
  yPos += 10;

  doc.setTextColor(...textColor);

  // === PAYMENT INFO (if paid) ===

  if (data.status === 'paid' && data.paid_at) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 197, 94); // Green
    doc.text("PAID", totalsLabelX, yPos, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(
      formatCurrency(data.paid_amount_cents || data.total_cents),
      totalsValueX,
      yPos,
      { align: "right" }
    );
    yPos += 5;

    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.text(
      formatDate(data.paid_at),
      totalsValueX,
      yPos,
      { align: "right" }
    );
    yPos += 10;

    doc.setTextColor(...textColor);
  }

  // === NOTES & TERMS ===

  if (data.notes || data.terms) {
    yPos += 5;

    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    if (data.notes) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...mutedColor);
      doc.text("Notes", 20, yPos);
      yPos += 6;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textColor);
      const notesLines = doc.splitTextToSize(data.notes, pageWidth - 40);
      doc.text(notesLines, 20, yPos);
      yPos += notesLines.length * 5 + 10;
    }

    if (data.terms) {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...mutedColor);
      doc.text("Payment Terms", 20, yPos);
      yPos += 6;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textColor);
      const termsLines = doc.splitTextToSize(data.terms, pageWidth - 40);
      doc.text(termsLines, 20, yPos);
      yPos += termsLines.length * 5;
    }
  }

  // === FOOTER ===

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);
  doc.text(
    `Generated by ${data.organization_name || "OrderSnapr"}`,
    pageWidth / 2,
    pageHeight - 15,
    { align: "center" }
  );

  doc.text(
    `Invoice ${data.number} • ${formatDate(data.issue_date)}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  return doc;
};
