import type { jsPDF } from "jspdf";
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
  
  // Lazy load jsPDF and autoTable only when needed
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  
  // Access autoTable from the imported module
  const autoTable = (autoTableModule as any).default;
  
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

  // Helper to parse fontSize string to number
  const parseFontSize = (fontSize?: string): number => {
    if (!fontSize) return 10; // default
    const match = fontSize.match(/(\d+)pt/);
    return match ? parseInt(match[1]) : 10;
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
          
          // Consistent typography and spacing for repeating group entries
          const ENTRY_FONT_SIZE = 10;
          const TOP_PAD = 4;
          const SPACING_AFTER = 4;
          
          // Helper to normalize time format
          const normalizeTime = (value: string): string => {
            // Handle 12h formats like "1:32pm" or "1:32 pm" -> "1:32 PM"
            const m12h = value.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
            if (m12h) {
              return `${m12h[1]}:${m12h[2]} ${m12h[3].toUpperCase()}`;
            }
            // Handle 24h format -> 12h AM/PM
            const m24h = value.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
            if (m24h) {
              let h = parseInt(m24h[1], 10);
              const ampm = h >= 12 ? 'PM' : 'AM';
              h = h % 12 || 12;
              return `${h}:${m24h[2]} ${ampm}`;
            }
            return value;
          };
          
          // Helper to format date
          const formatDate = (value: string): string => {
            const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (dateMatch) {
              const [, year, month, day] = dateMatch;
              const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
              return `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
            }
            return value;
          };
          
          // Helper to measure entry height
          const measureEntryHeight = (entry: any, entryIdx: number): number => {
            let height = 0;
            
            // Entry label height if enabled
            if (submission.metadata?.entryLabelPreferences?.[field.key]) {
              height += 6;
            }
            
            // Measure each subfield
            (field.fields || []).forEach((subField: any) => {
              const subValue = entry[subField.key];
              if (subValue !== null && subValue !== undefined && subValue !== "") {
                // Set correct font size for accurate measurement
                const fontSize = parseFontSize(subField.fontSize);
                pdf.setFontSize(fontSize);
                console.log(`[PDF] Measuring subfield "${subField.label}" with fontSize: ${fontSize}pt`);
                
                let displayValue = typeof subValue === 'boolean' 
                  ? (subValue ? 'Yes' : 'No')
                  : (subField.type === 'table_layout' && typeof subValue === 'object')
                    ? Object.entries(subValue)
                        .map(([cellKey, cellValue]) => {
                          const label = cellKey
                            .replace(/^cell_/, '')
                            .replace(/_/g, ' ')
                            .split(' ')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ');
                          return `${label}: ${cellValue}`;
                        })
                        .join(' | ')
                  : String(subValue);
                
                // Apply formatting
                if (subField?.type === 'time' || /time/i.test(subField?.label || '') || /time/i.test(subField?.key || '')) {
                  displayValue = normalizeTime(displayValue);
                }
                if (subField?.type === 'date' || /date/i.test(subField?.label || '') || /date/i.test(subField?.key || '')) {
                  displayValue = formatDate(displayValue);
                }
                
                const text = subField.hideLabel ? displayValue : `${subField.label}: ${displayValue}`;
                const lines = pdf.splitTextToSize(text, pageWidth - margin - 25);
                height += lines.length * 5;
              }
            });
            
            return height;
          };
          
          answer.forEach((entry: any, idx: number) => {
            // Measure entry height first (measureEntryHeight will set appropriate font sizes)
            const entryHeight = measureEntryHeight(entry, idx);
            checkPageBreak(entryHeight + TOP_PAD + SPACING_AFTER);
            
            const yStart = yPos;
            
            // Check if alternating background should be applied
            const applyAltBg = ((((field as any).alternatingBackground) || (submission.form_templates?.schema as any)?.alternating_background || (submission.form_templates?.schema as any)?.alternatingBackground) && idx % 2 === 1 && options.themeColor);
            
            // Draw single background rectangle for entire entry BEHIND content
            if (applyAltBg) {
              const altRGB = getMutedColorRGB(options.themeColor!, 0.10);
              pdf.setFillColor(altRGB[0], altRGB[1], altRGB[2]);
              pdf.rect(margin, yPos - TOP_PAD, pageWidth - 2 * margin, entryHeight + SPACING_AFTER, 'F');
              console.log(`[PDF] Alternating BG drawn for entry ${idx + 1} at y=${yPos}, height=${entryHeight}`, { color: options.themeColor, altRGB });
            }
            
            // Show entry label if preference is enabled
            if (submission.metadata?.entryLabelPreferences?.[field.key]) {
              pdf.setFontSize(10);
              pdf.setFont("helvetica", "bold");
              pdf.text(`Entry ${idx + 1}:`, margin + 8, yPos);
              yPos += 6;
            }
            
            // Render subfields
            (field.fields || []).forEach((subField: any) => {
              const subValue = entry[subField.key];
              if (subValue !== null && subValue !== undefined && subValue !== "") {
                // Special handling for table_layout - render as actual table
                if (subField.type === 'table_layout' && typeof subValue === 'object') {
                  checkPageBreak(30);
                  
                  // Show label if not hidden
                  if (!subField.hideLabel && subField.label) {
                    pdf.setFontSize(10);
                    pdf.setFont("helvetica", "bold");
                    pdf.text(subField.label, margin + 12, yPos);
                    yPos += 6;
                  }
                  
                  // Build table from table_layout data
                  const rows = subField.rows || [];
                  const columns = subField.columns || [];
                  
                  if (rows.length > 0 && columns.length > 0) {
                    const tableData: any[][] = [];
                    
                    rows.forEach((row: any, rowIndex: number) => {
                      const rowData: any[] = [];
                      columns.forEach((col: any, colIndex: number) => {
                        const cellKey = `${rowIndex}-${colIndex}`;
                        rowData.push(subValue[cellKey] || '');
                      });
                      tableData.push(rowData);
                    });
                    
                    const headers = columns.map((col: any) => col.label || col.key || '');
                    
                    (pdf as any).autoTable({
                      head: [headers],
                      body: tableData,
                      startY: yPos,
                      theme: 'grid',
                      styles: { fontSize: 9, cellPadding: 3 },
                      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
                      margin: { left: margin + 12, right: margin },
                    });
                    
                    yPos = (pdf as any).lastAutoTable.finalY + 6;
                  }
                } else {
                  // Regular field rendering
                  const fontStyle = subField.boldText ? "bold" : "normal";
                  const fontSize = parseFontSize(subField.fontSize);
                  console.log(`[PDF] Rendering subfield "${subField.label}" with fontSize: ${fontSize}pt, bold: ${subField.boldText}`);
                  pdf.setFont("helvetica", fontStyle);
                  pdf.setFontSize(fontSize);
                  
                  let displayValue = typeof subValue === 'boolean' 
                    ? (subValue ? 'Yes' : 'No')
                    : String(subValue);
                  
                  // Apply formatting
                  if (subField?.type === 'time' || /time/i.test(subField?.label || '') || /time/i.test(subField?.key || '')) {
                    displayValue = normalizeTime(displayValue);
                  }
                  if (subField?.type === 'date' || /date/i.test(subField?.label || '') || /date/i.test(subField?.key || '')) {
                    displayValue = formatDate(displayValue);
                  }
                  
                  // Build text with or without label
                  const text = subField.hideLabel ? displayValue : `${subField.label}: ${displayValue}`;
                  const lines = pdf.splitTextToSize(text, pageWidth - margin - 25);
                  
                  lines.forEach((line: string) => {
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
            
            yPos += SPACING_AFTER;
            console.log(`[PDF] Entry ${idx + 1} rendered from y=${yStart} to y=${yPos}, measured=${entryHeight}`);
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
          const fontSize = parseFontSize(field.fontSize);
          console.log(`[PDF] Rendering regular field "${field.label}" with fontSize: ${fontSize}pt, bold: ${field.boldText}`);
          pdf.setFont("helvetica", fontStyle);
          pdf.setFontSize(fontSize);
           let valueRaw = typeof answer === 'string' ? answer : String(answer);
           
           // Convert 24h time to 12h AM/PM when appropriate
           const needs12h = field?.type === 'time' || /time/i.test(field?.label || '') || /time/i.test(field?.key || '');
           if (needs12h) {
             const m = valueRaw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
             if (m) {
               let h = parseInt(m[1], 10);
               const ampm = h >= 12 ? 'PM' : 'AM';
               h = h % 12 || 12;
               valueRaw = `${h}:${m[2]} ${ampm}`;
             }
           }
           
           // Format dates as "Month Day, Year" (e.g., "November 6, 2025")
           const needsDateFormat = field?.type === 'date' || /date/i.test(field?.label || '') || /date/i.test(field?.key || '');
           if (needsDateFormat) {
             const dateMatch = valueRaw.match(/^(\d{4})-(\d{2})-(\d{2})/);
             if (dateMatch) {
               const [, year, month, day] = dateMatch;
               const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
               const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
               valueRaw = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
             }
           }
           
           const lines = pdf.splitTextToSize(valueRaw, pageWidth - margin - 20);
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
