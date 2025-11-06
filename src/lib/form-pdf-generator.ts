import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FormSubmission } from "@/hooks/use-form-submissions";
import { hexToRGB, getMutedColorRGB } from "./color-utils";

interface PDFOptions {
  includePhotos?: boolean;
  includeSignature?: boolean;
  themeColor?: string; // hex color for header bar
}

export const generateFormPDF = async (
  submission: FormSubmission,
  options: PDFOptions = { includePhotos: true, includeSignature: true }
): Promise<jsPDF> => {
  console.log('[PDF] Generating PDF with options:', options);
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

  // Add professional header with theme color if available
  if (options.themeColor) {
    const [r, g, b] = hexToRGB(options.themeColor);
    pdf.setFillColor(r, g, b);
    pdf.setTextColor(255, 255, 255); // White text on colored background
  } else {
    pdf.setFillColor(240, 240, 240);
    pdf.setTextColor(40, 40, 40); // Dark text on grey background
  }
  pdf.rect(0, 10, pageWidth, 15, "F");
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(submission.form_templates?.name || "Form Submission Report", pageWidth / 2, yPos, { align: "center" });
  pdf.setTextColor(40, 40, 40); // Reset to dark text for body
  yPos += 20;

  // Add sections and fields
  if (submission.form_templates?.schema?.sections) {
    for (const section of submission.form_templates.schema.sections) {
      // Only render section title if not hidden
      if (!section.hideTitle) {
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
      }

      // Field details
      for (const field of section.fields) {
        const answer = submission.answers?.[field.key];
        
        if (!answer) continue;

        checkPageBreak(10);

        if (field.type === "checklist") {
          // Normalize checklist answers into a consistent table format
          // Supports two formats:
          // 1) Array of { label, checked, status }
          // 2) Record<number, string> with field.items[] providing labels
          type TableRow = [string, string];
          const tableRows: TableRow[] = [];

          const toStatus = (raw: any): string => {
            const s = String(raw || "N/A").toUpperCase();
            if (["OK", "YES"].includes(s)) return s === "YES" ? "Yes" : "OK";
            if (["DEV", "NO"].includes(s)) return s === "NO" ? "No" : "DEV";
            if (["N/A", "NA"].includes(s)) return "N/A";
            return String(raw || "N/A");
          };

          if (Array.isArray(answer)) {
            // Array format from older templates
            answer.forEach((item: any, idx: number) => {
              const label = item?.label ?? `Item ${idx + 1}`;
              const status = item?.checked ? toStatus(item?.status || "OK") : "N/A";
              tableRows.push([`${idx + 1}. ${label}`, status]);
            });
          } else if (answer && typeof answer === "object" && (Array.isArray((field as any).items) || Array.isArray((field as any).options))) {
            // Record format driven by field.items or field.options (new format)
            const questions = (field as any).items || (field as any).options || [];
            questions.forEach((label: string, idx: number) => {
              const statusRaw = (answer as Record<number, string>)[idx];
              const status = toStatus(statusRaw);
              tableRows.push([`${idx + 1}. ${label}`, status]);
            });
          }

          if (tableRows.length > 0) {
            autoTable(pdf, {
              startY: yPos,
              head: field.hideLabel ? undefined : [[field.label || "Checklist", "Status"]],
              body: tableRows,
              theme: "striped",
            headStyles: {
              fillColor: [240, 240, 240],
              textColor: [40, 40, 40],
              fontStyle: "bold",
              fontSize: 10,
              halign: "center",
            },
              bodyStyles: {
                fontSize: 9,
              },
              columnStyles: {
                0: { cellWidth: pageWidth - 2 * margin - 40 },
                1: { cellWidth: 30, halign: "center" },
              },
              margin: { left: margin, right: margin },
              didParseCell: (data) => {
                // Color-code the Status column
                if (data.section === 'body' && data.column.index === 1) {
                  const val = String(data.cell.raw || '').toUpperCase();
                  if (val === 'OK' || val === 'YES') {
                    data.cell.styles.textColor = [0, 128, 0]; // green
                  } else if (val === 'DEV' || val === 'NO') {
                    data.cell.styles.textColor = [239, 68, 68]; // red
                  } else if (val === 'N/A') {
                    data.cell.styles.textColor = [128, 128, 128]; // gray
                  }
                }
              },
            });

            yPos = (pdf as any).lastAutoTable.finalY + 8;
          }
        } else if (field.type === "file" && Array.isArray(answer)) {
          // Photos will be added at the end
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "italic");
          pdf.text(`(${answer.length} photo${answer.length !== 1 ? 's' : ''} attached - see end of report)`, margin + 5, yPos);
          yPos += 8;
        } else if (field.type === "repeating_group" && Array.isArray(answer) && answer.length > 0) {
          // Repeating group entries
          checkPageBreak(12);
          
          // Only show the field label if not hidden
          if (!field.hideLabel) {
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            pdf.text(field.label, margin + 5, yPos);
            yPos += 8;
          }
          
          answer.forEach((entry: any, idx: number) => {
            checkPageBreak(15);
            
            // Calculate entry height for background
            const startY = yPos;
            let entryHeight = 0;
            
            // If alternating backgrounds enabled, calculate and draw background for odd entries
            if ((field as any).alternatingBackground && idx % 2 === 1 && options.themeColor) {
              console.log(`[PDF] Applying alternating background for entry ${idx + 1}, theme color: ${options.themeColor}`);
              // Temporarily calculate height
              const tempY = yPos;
              let calculatedHeight = 0;
              
              if (submission.metadata?.entryLabelPreferences?.[field.key]) {
                calculatedHeight += 6;
              }
              
              (field.fields || []).forEach((subField: any) => {
                const subValue = entry[subField.key];
                if (subValue !== null && subValue !== undefined && subValue !== "") {
                  const displayValue = typeof subValue === 'boolean' 
                    ? (subValue ? 'Yes' : 'No') 
                    : String(subValue);
                  const text = !subField.hideLabel ? `${subField.label}: ${displayValue}` : displayValue;
                  const lines = pdf.splitTextToSize(text, pageWidth - margin - 25);
                  calculatedHeight += lines.length * 5;
                }
              });
              
              calculatedHeight += 3; // Extra spacing
              entryHeight = calculatedHeight;
              
              // Draw muted background (using 8% opacity for better visibility)
              const [r, g, b] = getMutedColorRGB(options.themeColor, 0.08);
              console.log(`[PDF] Background RGB: [${r}, ${g}, ${b}], height: ${entryHeight}`);
              pdf.setFillColor(r, g, b);
              pdf.rect(margin, startY - 2, pageWidth - 2 * margin, entryHeight, 'F');
            } else {
              console.log(`[PDF] NOT applying background for entry ${idx + 1}:`, {
                alternatingBackground: (field as any).alternatingBackground,
                isOddIndex: idx % 2 === 1,
                hasThemeColor: !!options.themeColor
              });
            }
            
            // Show entry label if preference is enabled
            if (submission.metadata?.entryLabelPreferences?.[field.key]) {
              pdf.setFontSize(10);
              pdf.setFont("helvetica", "bold");
              pdf.text(`Entry ${idx + 1}:`, margin + 8, yPos);
              yPos += 6;
            }
            
            (field.fields || []).forEach((subField: any) => {
              const subValue = entry[subField.key];
              if (subValue !== null && subValue !== undefined && subValue !== "") {
                // Apply text styling based on field properties
                const fontStyle = subField.boldText ? "bold" : "normal";
                
                // Only show sub-field label if not hidden
                if (!subField.hideLabel) {
                  const displayValue = typeof subValue === 'boolean' 
                    ? (subValue ? 'Yes' : 'No') 
                    : String(subValue);
                  pdf.setFont("helvetica", fontStyle);
                  const lines = pdf.splitTextToSize(`${subField.label}: ${displayValue}`, pageWidth - margin - 25);
                  lines.forEach((line: string) => {
                    checkPageBreak(5);
                    const xPosition = margin + 12;
                    pdf.text(line, xPosition, yPos);
                    
                    // Add underline if needed
                    if (subField.underlineText) {
                      const textWidth = pdf.getTextWidth(line);
                      pdf.setLineWidth(0.3);
                      pdf.line(xPosition, yPos + 0.5, xPosition + textWidth, yPos + 0.5);
                    }
                    
                    yPos += 5;
                  });
                } else {
                  // If label is hidden, just show the value
                  const displayValue = typeof subValue === 'boolean' 
                    ? (subValue ? 'Yes' : 'No') 
                    : String(subValue);
                  pdf.setFont("helvetica", fontStyle);
                  const lines = pdf.splitTextToSize(displayValue, pageWidth - margin - 25);
                  lines.forEach((line: string) => {
                    checkPageBreak(5);
                    const xPosition = margin + 12;
                    pdf.text(line, xPosition, yPos);
                    
                    // Add underline if needed
                    if (subField.underlineText) {
                      const textWidth = pdf.getTextWidth(line);
                      pdf.setLineWidth(0.3);
                      pdf.line(xPosition, yPos + 0.5, xPosition + textWidth, yPos + 0.5);
                    }
                    
                    yPos += 5;
                  });
                }
              }
            });
            
            yPos += 3;
          });
          
          yPos += 3;
        } else if (field.type === "address" && typeof answer === "object") {
          // Address field - format as multi-line address
          if (!field.hideLabel) {
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.text(`${field.label}:`, margin + 5, yPos);
            yPos += 5;
          }

          pdf.setFont("helvetica", "normal");
          const addr = answer as { street?: string; street2?: string; city?: string; state?: string; zip?: string; country?: string };
          const addressLines: string[] = [];
          
          if (addr.street) addressLines.push(addr.street);
          if (addr.street2) addressLines.push(addr.street2);
          if (addr.city || addr.state || addr.zip) {
            const cityStateZip = [addr.city, addr.state, addr.zip].filter(Boolean).join(' ');
            if (cityStateZip) addressLines.push(cityStateZip);
          }
          if (addr.country) addressLines.push(addr.country);
          
          addressLines.forEach((line: string) => {
            checkPageBreak(5);
            pdf.text(line, margin + 10, yPos);
            yPos += 5;
          });
          yPos += 5;
        } else {
          // Regular text field - render with label if not hidden
          if (!field.hideLabel) {
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.text(`${field.label}:`, margin + 5, yPos);
            yPos += 5;
          }

          // Apply text styling based on field properties
          const fontStyle = field.boldText ? "bold" : "normal";
          pdf.setFont("helvetica", fontStyle);
          const lines = pdf.splitTextToSize(String(answer), pageWidth - margin - 20);
          lines.forEach((line: string) => {
            checkPageBreak(5);
            const xPosition = margin + 10;
            pdf.text(line, xPosition, yPos);
            
            // Add underline if needed
            if (field.underlineText) {
              const textWidth = pdf.getTextWidth(line);
              pdf.setLineWidth(0.3);
              pdf.line(xPosition, yPos + 0.5, xPosition + textWidth, yPos + 0.5);
            }
            
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

      // 2-column grid layout tracking
      let columnIndex = 0;
      let currentRowMaxHeight = 0;
      const photosPerRow = 2;
      const columnSpacing = 10;
      const maxImgWidth = (pageWidth - 3 * margin) / 2;
      const maxImgHeight = 70;

      for (const photo of allPhotos) {
        try {
          // Fetch and compress image with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const response = await fetch(photo.url, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.warn(`Failed to fetch photo: ${photo.url}`);
            continue;
          }
          
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
                let imgWidth = img.width;
                let imgHeight = img.height;
                
                const ratio = Math.min(maxImgWidth / imgWidth, maxImgHeight / imgHeight);
                imgWidth *= ratio;
                imgHeight *= ratio;

                // Calculate caption height
                let captionHeight = 0;
                if (photo.caption) {
                  pdf.setFontSize(9);
                  const captionLines = pdf.splitTextToSize(photo.caption, maxImgWidth);
                  captionHeight = captionLines.length * 5 + 5; // 5 per line + 5 spacing
                }

                // Calculate total space needed for this photo
                const totalPhotoHeight = imgHeight + captionHeight + 8; // 8 for spacing

                // Check if starting a new column (first photo) and need new page
                if (columnIndex === 0) {
                  if (checkPageBreak(totalPhotoHeight)) {
                    // Page was added, reset row tracking
                    currentRowMaxHeight = 0;
                  }
                } else {
                  // Second column - check if we need to finish row and start new page
                  const remainingSpace = pageHeight - margin - yPos;
                  if (totalPhotoHeight > remainingSpace) {
                    // Finish current row and start new page
                    columnIndex = 0;
                    yPos += currentRowMaxHeight + 8;
                    pdf.addPage();
                    yPos = margin;
                    currentRowMaxHeight = 0;
                  }
                }

                // Calculate x position based on column
                const xPos = columnIndex === 0 
                  ? margin 
                  : margin + maxImgWidth + columnSpacing;

                // Add image at calculated position
                pdf.addImage(reader.result as string, "JPEG", xPos, yPos, imgWidth, imgHeight, undefined, "MEDIUM");

                // Track the maximum height in this row
                currentRowMaxHeight = Math.max(currentRowMaxHeight, imgHeight);

                // Handle caption if present
                if (photo.caption) {
                  pdf.setFont("helvetica", "italic");
                  pdf.setTextColor(100, 100, 100);
                  const captionLines = pdf.splitTextToSize(photo.caption, maxImgWidth);
                  captionLines.forEach((line: string, idx: number) => {
                    pdf.text(line, xPos, yPos + imgHeight + 5 + (idx * 5));
                  });
                  pdf.setTextColor(40, 40, 40);
                  currentRowMaxHeight = Math.max(currentRowMaxHeight, imgHeight + captionHeight);
                }

                // Move to next column or next row
                columnIndex++;
                if (columnIndex >= photosPerRow) {
                  // Move to next row
                  columnIndex = 0;
                  yPos += currentRowMaxHeight + 8;
                  currentRowMaxHeight = 0;
                }

                resolve(null);
              } catch (error) {
                console.error("Error processing image:", error);
                resolve(null);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (error: any) {
          console.error("Error loading photo:", error);
          // Add a placeholder text for failed photos
          if (error.name === 'AbortError') {
            console.warn(`Photo fetch timeout: ${photo.url}`);
          }
          // Continue with next photo instead of failing entire PDF
        }
      }

      // If we ended mid-row, increment yPos for the final row
      if (columnIndex > 0) {
        yPos += currentRowMaxHeight + 8;
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
