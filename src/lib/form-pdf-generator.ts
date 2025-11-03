import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FormSubmission } from "@/hooks/use-form-submissions";

interface PDFOptions {
  includePhotos?: boolean;
  includeSignature?: boolean;
}

export const generateFormPDF = async (
  submission: FormSubmission,
  options: PDFOptions = { includePhotos: true, includeSignature: true }
): Promise<jsPDF> => {
  const pdf = new jsPDF();
  let yPos = 20;
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;

  // Helper to check if we need a new page
  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Add professional header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(0, 10, pageWidth, 15, "F");
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(40, 40, 40);
  pdf.text(submission.form_templates?.name || "Form Submission Report", pageWidth / 2, yPos, { align: "center" });
  yPos += 20;

  // Add Job Details section header
  pdf.setFillColor(50, 50, 50);
  pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, "F");
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text("Job Details", margin + 2, yPos);
  pdf.setTextColor(40, 40, 40);
  yPos += 10;

  // Extract key metadata fields and display them
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  
  const metadataFields: Array<{ label: string; value: string }> = [
    { label: "Status", value: submission.status.toUpperCase() },
    { label: "Service Date", value: submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : "N/A" },
    { label: "Created", value: new Date(submission.created_at).toLocaleDateString() },
  ];

  metadataFields.forEach(field => {
    checkPageBreak(6);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${field.label}:`, margin, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(field.value, margin + 35, yPos);
    yPos += 6;
  });

  yPos += 8;

  // Extract and display Observations prominently if exists
  let observationsText = "";
  let observationsField: any = null;
  
  if (submission.form_templates?.schema?.sections) {
    for (const section of submission.form_templates.schema.sections) {
      for (const field of section.fields) {
        if (field.key?.toLowerCase().includes("observation") || 
            field.key?.toLowerCase().includes("notes") ||
            field.label?.toLowerCase().includes("general observation")) {
          const value = submission.answers?.[field.key];
          if (value && typeof value === "string") {
            observationsText = value;
            observationsField = field;
            break;
          }
        }
      }
      if (observationsText) break;
    }
  }

  if (observationsText) {
    checkPageBreak(20);
    pdf.setFillColor(50, 50, 50);
    pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, "F");
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text("Observations:", margin + 2, yPos);
    pdf.setTextColor(40, 40, 40);
    yPos += 10;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const lines = pdf.splitTextToSize(observationsText, pageWidth - 2 * margin - 10);
    lines.forEach((line: string) => {
      checkPageBreak(6);
      pdf.text(line, margin + 5, yPos);
      yPos += 6;
    });
    yPos += 10;
  }

  // Add sections and fields
  if (submission.form_templates?.schema?.sections) {
    for (const section of submission.form_templates.schema.sections) {
      checkPageBreak(12);
      
      // Section header with background
      pdf.setFillColor(50, 50, 50);
      pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, "F");
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text(section.title, margin + 2, yPos);
      pdf.setTextColor(40, 40, 40);
      yPos += 10;

      // Field details
      for (const field of section.fields) {
        const answer = submission.answers?.[field.key];
        
        if (!answer) continue;

        // Skip observations field since we already displayed it
        if (observationsField && field.key === observationsField.key) {
          continue;
        }

        checkPageBreak(10);

        if (field.type === "checklist" && Array.isArray(answer)) {
          // Render checklist as professional table
          const tableData = answer.map((item: any) => [
            item.label,
            item.checked ? (item.status || "OK") : "N/A"
          ]);

          autoTable(pdf, {
            startY: yPos,
            head: [[field.label, "Status"]],
            body: tableData,
            theme: "striped",
            headStyles: {
              fillColor: [240, 240, 240],
              textColor: [40, 40, 40],
              fontStyle: "bold",
              fontSize: 10,
            },
            bodyStyles: {
              fontSize: 9,
            },
            columnStyles: {
              0: { cellWidth: pageWidth - 2 * margin - 40 },
              1: { cellWidth: 30, halign: "center" },
            },
            margin: { left: margin, right: margin },
          });

          yPos = (pdf as any).lastAutoTable.finalY + 8;
        } else if (field.type === "file" && Array.isArray(answer)) {
          // Photos will be added at the end
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "italic");
          pdf.text(`(${answer.length} photo${answer.length !== 1 ? 's' : ''} attached - see end of report)`, margin + 5, yPos);
          yPos += 8;
        } else {
          // Regular text field - render with label
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text(`${field.label}:`, margin + 5, yPos);
          yPos += 5;

          pdf.setFont("helvetica", "normal");
          const lines = pdf.splitTextToSize(String(answer), pageWidth - margin - 20);
          lines.forEach((line: string) => {
            checkPageBreak(5);
            pdf.text(line, margin + 10, yPos);
            yPos += 5;
          });
          yPos += 5;
        }
      }
      
      yPos += 5;
    }
  }

  // Add photos section at the end
  if (options.includePhotos && submission.form_templates?.schema?.sections) {
    const allPhotos: Array<{ url: string; name: string; caption?: string }> = [];
    
    for (const section of submission.form_templates.schema.sections) {
      for (const field of section.fields) {
        if (field.type === "file") {
          const value = submission.answers[field.key];
          if (Array.isArray(value) && value.length > 0) {
            allPhotos.push(...value);
          }
        }
      }
    }

    if (allPhotos.length > 0) {
      checkPageBreak(20);
      
      // Photos section header
      pdf.setFillColor(50, 50, 50);
      pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, "F");
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("Photos", margin + 2, yPos);
      pdf.setTextColor(40, 40, 40);
      yPos += 15;

      for (const photo of allPhotos) {
        try {
          checkPageBreak(80);
          
          // Fetch and compress image
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

                // Calculate dimensions to fit in PDF (2 per row)
                const maxImgWidth = (pageWidth - 3 * margin) / 2;
                const maxImgHeight = 70;
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
  }

  // Add signature if present
  if (options.includeSignature && submission.signature) {
    checkPageBreak(60);
    pdf.setFillColor(50, 50, 50);
    pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, "F");
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text("Signature", margin + 2, yPos);
    pdf.setTextColor(40, 40, 40);
    yPos += 15;

    try {
      pdf.addImage(submission.signature, "PNG", margin, yPos, 80, 40);
      yPos += 45;
    } catch (error) {
      console.error("Error adding signature:", error);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "italic");
      pdf.text("Signature image unavailable", margin, yPos);
      yPos += 10;
    }
  }

  return pdf;
};
