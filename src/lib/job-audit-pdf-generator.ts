import { jsPDF } from "jspdf";

interface ChecklistItem {
  label: string;
  status: string;
}

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

  // Helper to check if we need a new page
  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Title - centered, bold
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(40, 40, 40);
  pdf.text("Job Quality Inspection Report", pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  // Job Details section header with black background
  pdf.setFillColor(0, 0, 0);
  pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, "F");
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text("# Job Details", margin + 2, yPos);
  pdf.setTextColor(40, 40, 40);
  yPos += 10;

  // Metadata fields
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

  // Observations section (prominent)
  if (data.observations) {
    checkPageBreak(20);
    pdf.setFillColor(0, 0, 0);
    pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, "F");
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text("# Observations:", margin + 2, yPos);
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

  // Helper function to render checklist section
  const renderChecklistSection = (
    title: string,
    items: string[],
    checklist: Record<number, string>
  ) => {
    checkPageBreak(15);
    
    // Section header
    pdf.setFillColor(0, 0, 0);
    pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, "F");
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text(`# ${title}`, margin + 2, yPos);
    pdf.setTextColor(40, 40, 40);
    yPos += 10;

    // Individual checklist items
    items.forEach((item, index) => {
      checkPageBreak(15);
      
      // Item number and label
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(`# ${index + 1}. ${item}`, margin + 2, yPos);
      yPos += 8;

      // Status with color coding
      const status = checklist[index] || "N/A";
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      
      if (status === "OK") {
        pdf.setTextColor(0, 128, 0); // Green
      } else if (status === "N/A") {
        pdf.setTextColor(128, 128, 128); // Gray
      } else {
        pdf.setTextColor(40, 40, 40); // Black for other statuses
      }
      
      pdf.text(status, margin + 2, yPos);
      pdf.setTextColor(40, 40, 40); // Reset to black
      yPos += 10;
    });

    yPos += 5;
  };

  // Administrative/Testing section
  if (data.adminChecklistItems && data.adminChecklistItems.length > 0) {
    renderChecklistSection(
      "Administrative/Testing",
      data.adminChecklistItems,
      data.adminChecklist || {}
    );
  }

  // Customer Experience section
  if (data.customerChecklistItems && data.customerChecklistItems.length > 0) {
    renderChecklistSection(
      "Customer Experience",
      data.customerChecklistItems,
      data.customerChecklist || {}
    );
  }

  // MAIN FOCUS/BSW AUDIT - Drop section
  if (data.dropChecklistItems && data.dropChecklistItems.length > 0) {
    renderChecklistSection(
      "MAIN FOCUS/BSW AUDIT - Drop",
      data.dropChecklistItems,
      data.dropChecklist || {}
    );
  }

  // Photos section
  if (data.photos && data.photos.length > 0) {
    checkPageBreak(20);
    
    pdf.setFillColor(0, 0, 0);
    pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, "F");
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text("# Photos", margin + 2, yPos);
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
              
              await new Promise((imgResolve) => {
                img.onload = imgResolve;
              });

              // Calculate dimensions to fit in PDF
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
