import { jsPDF } from "jspdf";

interface JobAuditPDFData {
  technicianName?: string;
  ban?: string;
  serviceDate?: string;
  address?: string;
  customerName?: string;
  contactPhone?: string;
  reportDate?: Date;
  reportBy?: string;
  observations?: string;
  adminChecklist?: Record<number, string>;
  adminChecklistItems?: string[];
  customerChecklist?: Record<number, string>;
  customerChecklistItems?: string[];
  dropChecklist?: Record<number, string>;
  dropChecklistItems?: string[];
  photos?: Array<{ url: string; name: string; caption?: string }>;
}

export const generateJobAuditPDF = async (data: JobAuditPDFData): Promise<jsPDF> => {
  const pdf = new jsPDF();
  let yPos = 20;
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const lineHeight = 6;

  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Title
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(40, 40, 40);
  pdf.text("Job Quality Inspection Report", pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  // Job Details header (simple, no #)
  pdf.setFillColor(0, 0, 0);
  pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, "F");
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text("Job Details", margin + 2, yPos);
  pdf.setTextColor(40, 40, 40);
  yPos += 10;

  // Metadata
  pdf.setFontSize(10);
  const metadata = [
    { label: "Technician:", value: data.technicianName || "" },
    { label: "BAN:", value: data.ban || "" },
    { label: "Service Date:", value: data.serviceDate || "" },
    { label: "Address:", value: data.address || "" },
    { label: "Customer:", value: data.customerName || "" },
    { label: "Can Be Reached:", value: data.contactPhone || "" },
    { label: "Report Date:", value: data.reportDate ? data.reportDate.toLocaleDateString() : new Date().toLocaleDateString() },
    { label: "Report by:", value: data.reportBy || "" }
  ];

  metadata.forEach(field => {
    if (field.value) {
      checkPageBreak(6);
      pdf.setFont("helvetica", "bold");
      pdf.text(field.label, margin + 2, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(field.value, margin + 40, yPos);
      yPos += lineHeight;
    }
  });

  yPos += 8;

  // Observations
  if (data.observations) {
    checkPageBreak(20);
    pdf.setFillColor(0, 0, 0);
    pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, "F");
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text("Observations:", margin + 2, yPos);
    pdf.setTextColor(40, 40, 40);
    yPos += 10;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const obsLines = pdf.splitTextToSize(data.observations, pageWidth - 2 * margin - 4);
    obsLines.forEach((line: string) => {
      checkPageBreak(6);
      pdf.text(line, margin + 2, yPos);
      yPos += lineHeight;
    });
    yPos += 10;
  }

  // Helper to normalize and color status; and show as Yes/No/N/A
  const renderStatusRightAligned = (raw: string) => {
    const norm = (raw || "").toUpperCase();
    let label = "N/A";
    let color: [number, number, number] = [128, 128, 128]; // gray

    if (norm === "OK" || norm === "YES") {
      label = "Yes";
      color = [0, 128, 0]; // green
    } else if (norm === "DEV" || norm === "NO") {
      label = "No";
      color = [239, 68, 68]; // red-500
    } else if (norm === "N/A" || norm === "NA") {
      label = "N/A";
      color = [128, 128, 128];
    } else if (norm) {
      // Any custom text shown as-is in dark gray
      label = raw;
      color = [60, 60, 60];
    }

    pdf.setTextColor(...color);
    const rightX = pageWidth - margin - 10;
    pdf.text(label, rightX, yPos);
    pdf.setTextColor(40, 40, 40);
  };

  // Checklist section renderer (items listed, status right side on same line)
  const renderChecklistSection = (
    title: string,
    items: string[] = [],
    checklist: Record<number, string> = {}
  ) => {
    if (!items.length) return;

    checkPageBreak(15);
    pdf.setFillColor(0, 0, 0);
    pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, "F");
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text(title, margin + 2, yPos);
    pdf.setTextColor(40, 40, 40);
    yPos += 10;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    items.forEach((item, index) => {
      checkPageBreak(10);

      const bullet = `${index + 1}. ${item}`;
      const maxTextWidth = pageWidth - 2 * margin - 50; // keep room for status at right
      const lines = pdf.splitTextToSize(bullet, maxTextWidth);

      // Draw item text
      pdf.text(lines, margin + 2, yPos);

      // Draw status on first line right side
      renderStatusRightAligned(checklist[index] || "N/A");

      // Advance y by number of lines
      yPos += lines.length * lineHeight + 4;
    });

    yPos += 4;
  };

  // Render sections in desired order
  renderChecklistSection("Administrative/Testing", data.adminChecklistItems, data.adminChecklist);
  renderChecklistSection("Customer Experience", data.customerChecklistItems, data.customerChecklist);
  renderChecklistSection("MAIN FOCUS/BSW AUDIT - Drop", data.dropChecklistItems, data.dropChecklist);

  // Photos
  if (data.photos && data.photos.length > 0) {
    checkPageBreak(20);
    pdf.setFillColor(0, 0, 0);
    pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, "F");
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text("Photos", margin + 2, yPos);
    pdf.setTextColor(40, 40, 40);
    yPos += 15;

    for (const photo of data.photos) {
      try {
        checkPageBreak(80);

        const response = await fetch(photo.url);
        const blob = await response.blob();
        const reader = new FileReader();

        await new Promise((resolve, reject) => {
          reader.onload = async () => {
            try {
              const img = new Image();
              img.src = reader.result as string;
              await new Promise((r) => { img.onload = r; });

              const maxImgWidth = pageWidth - 2 * margin;
              const maxImgHeight = 100;
              let imgWidth = img.width;
              let imgHeight = img.height;
              const ratio = Math.min(maxImgWidth / imgWidth, maxImgHeight / imgHeight);
              imgWidth *= ratio;
              imgHeight *= ratio;

              pdf.addImage(reader.result as string, "JPEG", margin, yPos, imgWidth, imgHeight, undefined, "MEDIUM");
              yPos += imgHeight + 5;

              if (photo.caption) {
                pdf.setFontSize(9);
                pdf.setFont("helvetica", "italic");
                pdf.setTextColor(100, 100, 100);
                const captionLines = pdf.splitTextToSize(photo.caption, maxImgWidth);
                captionLines.forEach((line: string) => {
                  checkPageBreak(5);
                  pdf.text(line, margin, yPos);
                  yPos += 5;
                });
                pdf.setTextColor(40, 40, 40);
              }

              yPos += 8;
              resolve(null);
            } catch (error) {
              console.error("Error processing image:", error);
              resolve(null);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error("Error loading photo:", error);
      }
    }
  }

  return pdf;
};
