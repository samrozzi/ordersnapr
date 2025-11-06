import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ImageRun } from "docx";
import { FormSubmission } from "@/hooks/use-form-submissions";
import { getMutedColorHex } from "./color-utils";

interface DOCXOptions {
  includePhotos?: boolean;
  includeSignature?: boolean;
  themeColor?: string; // hex color for alternating backgrounds
}

export const generateFormDOCX = async (
  submission: FormSubmission,
  options: DOCXOptions = { includePhotos: true, includeSignature: true }
): Promise<Blob> => {
  const sections: any[] = [];

  // Document title
  sections.push(
    new Paragraph({
      text: submission.form_templates?.name || "Form Submission Report",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Process form sections and fields
  if (submission.form_templates?.schema?.sections) {
    for (const section of submission.form_templates.schema.sections) {
      // Section header (if not hidden)
      if (!section.hideTitle) {
        sections.push(
          new Paragraph({
            text: section.title,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
            shading: {
              fill: "323232",
            },
            border: {
              bottom: {
                color: "323232",
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
          })
        );
      }

      // Process fields
      for (const field of section.fields) {
        const answer = submission.answers?.[field.key];
        
        if (!answer) continue;

        if (field.type === "checklist") {
          // Create checklist table
          const tableRows: TableRow[] = [];
          
          // Normalize checklist format
          const toStatus = (raw: any): string => {
            const s = String(raw || "N/A").toUpperCase();
            if (["OK", "YES"].includes(s)) return s === "YES" ? "Yes" : "OK";
            if (["DEV", "NO"].includes(s)) return s === "NO" ? "No" : "DEV";
            if (["N/A", "NA"].includes(s)) return "N/A";
            return String(raw || "N/A");
          };

          const items: Array<[string, string]> = [];

          if (Array.isArray(answer)) {
            // Array format
            answer.forEach((item: any, idx: number) => {
              const label = item?.label ?? `Item ${idx + 1}`;
              const status = item?.checked ? toStatus(item?.status || "OK") : "N/A";
              items.push([`${idx + 1}. ${label}`, status]);
            });
          } else if (answer && typeof answer === "object" && (Array.isArray((field as any).items) || Array.isArray((field as any).options))) {
            // Record format
            const questions = (field as any).items || (field as any).options || [];
            questions.forEach((label: string, idx: number) => {
              const statusRaw = (answer as Record<number, string>)[idx];
              const status = toStatus(statusRaw);
              items.push([`${idx + 1}. ${label}`, status]);
            });
          }

          // Add header row if label is not hidden
          if (!field.hideLabel) {
            tableRows.push(
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: field.label || "Checklist",
                            bold: true,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    shading: { fill: "F0F0F0" },
                    width: { size: 75, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Status",
                            bold: true,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    shading: { fill: "F0F0F0" },
                    width: { size: 25, type: WidthType.PERCENTAGE },
                  }),
                ],
              })
            );
          }

          // Add data rows
          items.forEach(([label, status]) => {
            const statusUpper = status.toUpperCase();
            let statusColor = "000000"; // black
            
            if (statusUpper === "OK" || statusUpper === "YES") {
              statusColor = "008000"; // green
            } else if (statusUpper === "DEV" || statusUpper === "NO") {
              statusColor = "EF4444"; // red
            } else if (statusUpper === "N/A") {
              statusColor = "808080"; // gray
            }

            tableRows.push(
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: label })],
                    width: { size: 75, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: status,
                            color: statusColor,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: { size: 25, type: WidthType.PERCENTAGE },
                  }),
                ],
              })
            );
          });

          if (tableRows.length > 0) {
            sections.push(
              new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
                margins: {
                  top: 100,
                  bottom: 100,
                  left: 100,
                  right: 100,
                },
              })
            );
            sections.push(new Paragraph({ text: "", spacing: { after: 200 } }));
          }
        } else if (field.type === "file" && Array.isArray(answer)) {
          // Photos placeholder
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: !field.hideLabel ? `${field.label}: ` : "",
                  bold: true,
                }),
                new TextRun({
                  text: `(${answer.length} photo${answer.length !== 1 ? 's' : ''} attached - see end of report)`,
                  italics: true,
                }),
              ],
              spacing: { after: 200 },
            })
          );
        } else if (field.type === "repeating_group" && Array.isArray(answer) && answer.length > 0) {
          // Repeating group entries
          if (!field.hideLabel) {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: field.label,
                    bold: true,
                    size: 22,
                  }),
                ],
                spacing: { before: 200, after: 100 },
              })
            );
          }
          
          answer.forEach((entry: any, idx: number) => {
            // Determine if this entry should have a background (using 8% opacity for better visibility)
            const shouldApplyBackground = (field as any).alternatingBackground && idx % 2 === 1 && options.themeColor;
            const backgroundColor = shouldApplyBackground ? getMutedColorHex(options.themeColor!, 0.08) : undefined;
            
            console.log(`[DOCX] Entry ${idx + 1}:`, {
              alternatingBackground: (field as any).alternatingBackground,
              isOddIndex: idx % 2 === 1,
              hasThemeColor: !!options.themeColor,
              backgroundColor
            });
            
            // Show entry label if preference is enabled
            if (submission.metadata?.entryLabelPreferences?.[field.key]) {
              sections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Entry ${idx + 1}:`,
                      bold: true,
                    }),
                  ],
                  spacing: { before: 100, after: 50 },
                  shading: backgroundColor ? { fill: backgroundColor } : undefined,
                })
              );
            }
            
            (field.fields || []).forEach((subField: any) => {
              const subValue = entry[subField.key];
              if (subValue !== null && subValue !== undefined && subValue !== "") {
                let displayValue = typeof subValue === 'boolean' 
                  ? (subValue ? 'Yes' : 'No') 
                  : String(subValue);
                
                // Convert 24h time to 12h AM/PM when appropriate
                if (subField?.type === 'time' || /time/i.test(subField?.label || '') || /time/i.test(subField?.key || '')) {
                  const m = displayValue.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
                  if (m) {
                    let h = parseInt(m[1], 10);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    h = h % 12 || 12;
                    displayValue = `${h}:${m[2]} ${ampm}`;
                  }
                }
                
                // Format dates as "Month Day, Year" (e.g., "November 6, 2025")
                if (subField?.type === 'date' || /date/i.test(subField?.label || '') || /date/i.test(subField?.key || '')) {
                  const dateMatch = displayValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
                  if (dateMatch) {
                    const [, year, month, day] = dateMatch;
                    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    displayValue = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
                  }
                }
                
                if (!subField.hideLabel) {
                  sections.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `${subField.label}: `,
                          bold: true,
                        }),
                        new TextRun({
                          text: displayValue,
                          bold: subField.boldText || false,
                          underline: subField.underlineText ? {} : undefined,
                        }),
                      ],
                      spacing: { after: 50 },
                      shading: backgroundColor ? { fill: backgroundColor } : undefined,
                    })
                  );
                } else {
                  // If label is hidden, just show the value
                  sections.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: displayValue,
                          bold: subField.boldText || false,
                          underline: subField.underlineText ? {} : undefined,
                        }),
                      ],
                      spacing: { after: 50 },
                      shading: backgroundColor ? { fill: backgroundColor } : undefined,
                    })
                  );
                }
              }
            });
          });
          
          sections.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        } else if (field.type === "address" && typeof answer === "object") {
          // Address field - format as multi-line address
          if (!field.hideLabel) {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${field.label}:`,
                    bold: true,
                  }),
                ],
                spacing: { after: 100 },
              })
            );
          }
          
          const addr = answer as { street?: string; street2?: string; city?: string; state?: string; zip?: string; country?: string };
          const addressLines: string[] = [];
          
          if (addr.street) addressLines.push(addr.street);
          if (addr.street2) addressLines.push(addr.street2);
          if (addr.city || addr.state || addr.zip) {
            const cityStateZip = [addr.city, addr.state, addr.zip].filter(Boolean).join(' ');
            if (cityStateZip) addressLines.push(cityStateZip);
          }
          if (addr.country) addressLines.push(addr.country);
          
          sections.push(
            new Paragraph({
              text: addressLines.join('\n'),
              spacing: { after: 200 },
            })
          );
        } else {
          // Regular text field
          if (!field.hideLabel) {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${field.label}:`,
                    bold: true,
                  }),
                ],
                spacing: { after: 100 },
              })
            );
          }
          
          let displayValue = String(answer);
          
          // Convert 24h time to 12h AM/PM when appropriate
          if (field?.type === 'time' || /time/i.test(field?.label || '') || /time/i.test(field?.key || '')) {
            const m = displayValue.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
            if (m) {
              let h = parseInt(m[1], 10);
              const ampm = h >= 12 ? 'PM' : 'AM';
              h = h % 12 || 12;
              displayValue = `${h}:${m[2]} ${ampm}`;
            }
          }
          
          // Format dates as "Month Day, Year" (e.g., "November 6, 2025")
          if (field?.type === 'date' || /date/i.test(field?.label || '') || /date/i.test(field?.key || '')) {
            const dateMatch = displayValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (dateMatch) {
              const [, year, month, day] = dateMatch;
              const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
              displayValue = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
            }
          }
          
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: displayValue,
                  bold: field.boldText || false,
                  underline: field.underlineText ? {} : undefined,
                }),
              ],
              spacing: { after: 200 },
            })
          );
        }
      }
      
      // Add spacing after section
      sections.push(new Paragraph({ text: "", spacing: { after: 200 } }));
    }
  }

  // Add photos section
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
      // Add page break before photos section to ensure they start on a fresh page
      sections.push(
        new Paragraph({
          text: "",
          pageBreakBefore: true,
        })
      );
      
      sections.push(
        new Paragraph({
          text: "Photos",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
          shading: {
            fill: "323232",
          },
        })
      );

      let photoCount = 0;
      for (const photo of allPhotos) {
        // Add page break every 3 photos to prevent overflow
        if (photoCount > 0 && photoCount % 3 === 0) {
          sections.push(
            new Paragraph({
              text: "",
              pageBreakBefore: true,
            })
          );
        }
        photoCount++;
        try {
          // Fetch image with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch(photo.url, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.warn(`Failed to fetch photo: ${photo.url}`);
            continue;
          }
          
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          
          // Add image
          sections.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: new Uint8Array(arrayBuffer),
                  transformation: {
                    width: 400,
                    height: 300,
                  },
                  type: "png",
                }),
              ],
              spacing: { after: 100 },
            })
          );

          // Add caption if present
          if (photo.caption) {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: photo.caption,
                    italics: true,
                    color: "646464",
                    size: 18,
                  }),
                ],
                spacing: { after: 200 },
              })
            );
          }
        } catch (error: any) {
          console.error("Error loading photo:", error);
          if (error.name === 'AbortError') {
            console.warn(`Photo fetch timeout: ${photo.url}`);
          }
          // Continue with next photo
        }
      }
    }
  }

  // Add signature
  if (options.includeSignature && submission.signature) {
    sections.push(
      new Paragraph({
        text: "Signature",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
        shading: {
          fill: "323232",
        },
      })
    );

    try {
      // Convert base64 signature to buffer
      const base64Data = submission.signature.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      sections.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: bytes,
              transformation: {
                width: 300,
                height: 150,
              },
              type: "png",
            }),
          ],
        })
      );
    } catch (error) {
      console.error("Error adding signature:", error);
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Signature image unavailable",
              italics: true,
            }),
          ],
        })
      );
    }
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  });

  // Generate blob
  return await Packer.toBlob(doc);
};
