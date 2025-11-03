import jsPDF from "jspdf";
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
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - 2 * margin;
  let yPos = margin;

  const schema = submission.form_templates?.schema;

  // Helper to check if we need a new page
  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Helper to add text with word wrap
  const addWrappedText = (text: string, fontSize: number, fontStyle: string = "normal") => {
    pdf.setFontSize(fontSize);
    pdf.setFont("helvetica", fontStyle);
    const lines = pdf.splitTextToSize(text, maxWidth);
    
    for (const line of lines) {
      checkPageBreak(fontSize * 0.5);
      pdf.text(line, margin, yPos);
      yPos += fontSize * 0.5;
    }
  };

  // Header
  pdf.setFillColor(59, 130, 246); // Primary blue
  pdf.rect(0, 0, pageWidth, 35, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text(schema?.title || "Form Submission", margin, 20);
  
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  const statusBadge = submission.status.charAt(0).toUpperCase() + submission.status.slice(1);
  pdf.text(`Status: ${statusBadge}`, pageWidth - margin - 40, 20);
  
  yPos = 45;
  pdf.setTextColor(0, 0, 0);

  // Metadata
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Submitted: ${submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'N/A'}`, margin, yPos);
  yPos += 7;
  pdf.text(`Created: ${new Date(submission.created_at).toLocaleString()}`, margin, yPos);
  yPos += 12;

  pdf.setTextColor(0, 0, 0);

  // Form sections
  if (schema?.sections) {
    for (const section of schema.sections) {
      checkPageBreak(20);
      
      // Section header
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPos - 5, maxWidth, 10, "F");
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(section.title, margin + 2, yPos + 2);
      yPos += 15;

      // Section fields
      for (const field of section.fields) {
        const value = submission.answers[field.key];
        
        checkPageBreak(15);

        // Field label
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text(field.label, margin, yPos);
        yPos += 6;

        // Field value
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);

        if (!value && value !== 0) {
          pdf.setTextColor(150, 150, 150);
          pdf.text("—", margin + 5, yPos);
          yPos += 8;
          pdf.setTextColor(0, 0, 0);
        } else if (field.type === "checklist") {
          // Render checklist as table
          Object.keys(value).forEach((itemKey) => {
            checkPageBreak(8);
            const itemValue = value[itemKey];
            const status = itemValue?.status || "Not Checked";
            const notes = itemValue?.notes || "";
            
            pdf.text(`• ${itemKey}: ${status}`, margin + 5, yPos);
            yPos += 6;
            
            if (notes) {
              pdf.setTextColor(100, 100, 100);
              const notesLines = pdf.splitTextToSize(`  Notes: ${notes}`, maxWidth - 10);
              notesLines.forEach((line: string) => {
                checkPageBreak(5);
                pdf.text(line, margin + 10, yPos);
                yPos += 5;
              });
              pdf.setTextColor(0, 0, 0);
            }
          });
          yPos += 4;
        } else if (field.type === "file" && options.includePhotos && Array.isArray(value) && value.length > 0) {
          // Photos will be added at the end
          pdf.text(`${value.length} photo(s) - see attachments below`, margin + 5, yPos);
          yPos += 8;
        } else if (field.type === "textarea") {
          const lines = pdf.splitTextToSize(value.toString(), maxWidth - 10);
          lines.forEach((line: string) => {
            checkPageBreak(6);
            pdf.text(line, margin + 5, yPos);
            yPos += 6;
          });
          yPos += 4;
        } else {
          const lines = pdf.splitTextToSize(value.toString(), maxWidth - 10);
          lines.forEach((line: string) => {
            checkPageBreak(6);
            pdf.text(line, margin + 5, yPos);
            yPos += 6;
          });
          yPos += 4;
        }
      }

      yPos += 8;
    }
  }

  // Add photos if included
  if (options.includePhotos) {
    const allPhotos: Array<{ url: string; name: string; caption?: string }> = [];
    
    if (schema?.sections) {
      for (const section of schema.sections) {
        for (const field of section.fields) {
          if (field.type === "file") {
            const value = submission.answers[field.key];
            if (Array.isArray(value) && value.length > 0) {
              allPhotos.push(...value);
            }
          }
        }
      }
    }

    if (allPhotos.length > 0) {
      checkPageBreak(20);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Photos", margin, yPos);
      yPos += 10;

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

                // Calculate dimensions to fit in PDF
                const maxImgWidth = maxWidth;
                const maxImgHeight = 80;
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
                  const captionLines = pdf.splitTextToSize(photo.caption, maxWidth);
                  captionLines.forEach((line: string) => {
                    checkPageBreak(5);
                    pdf.text(line, margin, yPos);
                    yPos += 5;
                  });
                  pdf.setTextColor(0, 0, 0);
                }

                yPos += 5;
                resolve(null);
              } catch (error) {
                console.error("Error processing image:", error);
                resolve(null);
              }
            };
            reader.onerror = reject;
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
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Signature", margin, yPos);
    yPos += 10;

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
