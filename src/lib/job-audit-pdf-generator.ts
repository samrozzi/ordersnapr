import type { jsPDF } from "jspdf";

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
  // Lazy load jsPDF only when needed
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  let yPos = 20;
  const lineHeight = 7;
  const pageHeight = doc.internal.pageSize.height;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Job Quality Inspection Report", 20, yPos);
  yPos += 15;

  // Job Details header
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("# Job Details", 20, yPos);
  yPos += 7;
  
  // Metadata
  doc.setFont("helvetica", "normal");
  if (data.technicianName) {
    doc.text(`Technician: ${data.technicianName}`, 20, yPos);
    yPos += 5;
  }
  if (data.ban) {
    doc.text(`BAN: ${data.ban}`, 20, yPos);
    yPos += 5;
  }
  if (data.serviceDate) {
    doc.text(`Service Date: ${data.serviceDate}`, 20, yPos);
    yPos += 5;
  }
  if (data.address) {
    doc.text(`Address: ${data.address}`, 20, yPos);
    yPos += 5;
  }
  if (data.customerName) {
    doc.text(`Customer: ${data.customerName}`, 20, yPos);
    yPos += 5;
  }
  if (data.contactPhone) {
    doc.text(`Can Be Reached: ${data.contactPhone}`, 20, yPos);
    yPos += 5;
  }
  doc.text(`Report Date: ${data.reportDate ? data.reportDate.toLocaleDateString() : new Date().toLocaleDateString()}`, 20, yPos);
  yPos += 5;
  if (data.reportBy) {
    doc.text(`Report by: ${data.reportBy}`, 20, yPos);
    yPos += 5;
  }
  yPos += 5;

  // Observations
  if (data.observations) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("# Observations:", 20, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const obsLines = doc.splitTextToSize(data.observations, 170);
    doc.text(obsLines, 20, yPos);
    yPos += obsLines.length * lineHeight + 5;
  }

  // Helper function to add checklist section
  const addSection = (title: string, items: string[], checklist: Record<number, string>) => {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`# ${title}`, 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    items.forEach((item, index) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }

      // Item number and text
      doc.setFont("helvetica", "bold");
      const itemText = `# ${index + 1}. ${item}`;
      const lines = doc.splitTextToSize(itemText, 170);
      doc.text(lines, 20, yPos);
      yPos += lines.length * lineHeight;

      // Status with color
      const status = checklist[index] || "N/A";
      doc.setFont("helvetica", "normal");
      
      if (status === "OK") {
        doc.setTextColor(0, 128, 0); // Green
      } else if (status === "DEV") {
        doc.setTextColor(239, 68, 68); // Red
      } else {
        doc.setTextColor(128, 128, 128); // Gray
      }
      
      doc.text(status, 20, yPos);
      doc.setTextColor(0, 0, 0); // Reset to black
      yPos += 8;
    });

    yPos += 5;
  };

  // Add all checklist sections
  if (data.adminChecklistItems && data.adminChecklistItems.length > 0) {
    addSection("Administrative/Testing", data.adminChecklistItems, data.adminChecklist || {});
  }

  if (data.customerChecklistItems && data.customerChecklistItems.length > 0) {
    addSection("Customer Experience", data.customerChecklistItems, data.customerChecklist || {});
  }

  if (data.dropChecklistItems && data.dropChecklistItems.length > 0) {
    addSection("MAIN FOCUS/BSW AUDIT - Drop", data.dropChecklistItems, data.dropChecklist || {});
  }

  // Photos
  if (data.photos && data.photos.length > 0) {
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("# Photos", 20, yPos);
    yPos += 10;

    const imgSize = 85;
    const margin = 10;
    let photoCount = 0;

    for (const photo of data.photos) {
      try {
        const response = await fetch(photo.url);
        const blob = await response.blob();
        
        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              const col = photoCount % 2;
              const row = Math.floor((photoCount % 4) / 2);
              
              if (photoCount > 0 && photoCount % 4 === 0) {
                doc.addPage();
                yPos = 20;
              }
              
              const xPos = 20 + col * (imgSize + margin);
              const yPosition = yPos + row * (imgSize + margin);
              
              const aspectRatio = img.width / img.height;
              let drawWidth = imgSize;
              let drawHeight = imgSize;
              
              if (aspectRatio > 1) {
                drawHeight = imgSize / aspectRatio;
              } else {
                drawWidth = imgSize * aspectRatio;
              }
              
              doc.addImage(
                reader.result as string,
                "JPEG",
                xPos,
                yPosition,
                drawWidth,
                drawHeight
              );
              
              if (photo.caption) {
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 100, 100);
                const captionLines = doc.splitTextToSize(photo.caption, imgSize);
                doc.text(captionLines, xPos, yPosition + drawHeight + 3);
                doc.setTextColor(0, 0, 0);
              }
              
              photoCount++;
              resolve();
            };
            img.onerror = reject;
            img.src = reader.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error("Error processing photo:", error);
      }
    }
  }

  return doc;
};
