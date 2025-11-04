import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChecklistField } from "./ChecklistField";
import { SignatureField } from "./SignatureField";
import { FormSubmission } from "@/hooks/use-form-submissions";
import { Calendar, User, FileText, Download, Mail, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { generateFormPDF } from "@/lib/form-pdf-generator";
import { generateFormDOCX } from "@/lib/form-docx-generator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FormSubmissionViewerProps {
  submission: FormSubmission;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function FormSubmissionViewer({
  submission,
  onEdit,
  onDelete,
}: FormSubmissionViewerProps) {
  const schema = submission.form_templates?.schema;
  const canEdit = onEdit; // Allow editing for all submissions if callback provided
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingDOCX, setIsGeneratingDOCX] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [themeColor, setThemeColor] = useState<string | null>(null);

  // Fetch organization theme color
  useEffect(() => {
    const fetchThemeColor = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        if (!profileData?.organization_id) return;

        const { data: settingsData } = await supabase
          .from("organization_settings")
          .select("custom_theme_color")
          .eq("organization_id", profileData.organization_id)
          .maybeSingle();

        if (settingsData?.custom_theme_color) {
          setThemeColor(settingsData.custom_theme_color);
        }
      } catch (error) {
        console.error("Error fetching theme color:", error);
      }
    };

    fetchThemeColor();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "submitted":
        return "default";
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Always use the generic generator for form submissions
      // Job Audit forms from the JobAudit page use their own specialized generator
      const pdf = await generateFormPDF(submission, { 
        includePhotos: true, 
        includeSignature: true,
        themeColor: themeColor || undefined
      });
      const fileName = `${schema?.title || 'form'}-${submission.id.slice(0, 8)}.pdf`;
      
      // Create blob and download link (same pattern as DOCX)
      const blob = pdf.output('blob');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("PDF ready for download");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadDOCX = async () => {
    setIsGeneratingDOCX(true);
    try {
      const docBlob = await generateFormDOCX(submission);
      const fileName = `${schema?.title || 'form'}-${submission.id.slice(0, 8)}.docx`;
      
      // Create download link
      const url = window.URL.createObjectURL(docBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Word document downloaded successfully");
    } catch (error) {
      console.error("Error generating DOCX:", error);
      toast.error("Failed to generate Word document");
    } finally {
      setIsGeneratingDOCX(false);
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      toast.error("Please enter a recipient email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSendingEmail(true);

    try {
      // Generate PDF
      const pdf = await generateFormPDF(submission, {
        includePhotos: true,
        includeSignature: true,
        themeColor: themeColor || undefined
      });
      const pdfBase64 = pdf.output("dataurlstring").split(",")[1];
      const fileName = `${schema?.title || 'form'}-${submission.id.slice(0, 8)}.pdf`;

      // Collect photos
      const photos: Array<{ filename: string; content: string; caption?: string }> = [];
      
      if (schema?.sections) {
        for (const section of schema.sections) {
          for (const field of section.fields) {
            if (field.type === "file") {
              const fileValue = submission.answers[field.key];
              if (Array.isArray(fileValue) && fileValue.length > 0) {
                for (const file of fileValue) {
                  try {
                    const response = await fetch(file.url);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    
                    await new Promise((resolve, reject) => {
                      reader.onload = () => {
                        const base64 = (reader.result as string).split(",")[1];
                        photos.push({
                          filename: file.name,
                          content: base64,
                          caption: file.caption,
                        });
                        resolve(null);
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
          }
        }
      }

      // Extract general observations field
      let generalObservations = "";
      if (schema?.sections) {
        for (const section of schema.sections) {
          for (const field of section.fields) {
            if (field.key.toLowerCase().includes("observation") || 
                field.key.toLowerCase().includes("general") ||
                field.label.toLowerCase().includes("observation")) {
              const value = submission.answers[field.key];
              if (value) {
                generalObservations = value;
                break;
              }
            }
          }
          if (generalObservations) break;
        }
      }

      // Call edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("send-report-email", {
        body: {
          recipientEmail,
          reportType: "form-submission",
          pdfBase64,
          fileName,
          photos,
          formData: {
            formTitle: schema?.title,
            submissionId: submission.id,
            status: submission.status,
            submittedAt: submission.submitted_at,
            observations: generalObservations,
          },
        },
      });

      if (response.error) {
        throw response.error;
      }

      toast.success("Email sent successfully");
      setIsEmailDialogOpen(false);
      setRecipientEmail("");
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const renderFieldValue = (field: any) => {
    const value = submission.answers[field.key];

    if (!value && value !== 0) return <p className="text-muted-foreground">—</p>;

    switch (field.type) {
      case "repeating_group":
        // Handle repeating groups with proper rendering
        if (!Array.isArray(value) || value.length === 0) {
          return <p className="text-muted-foreground">No entries</p>;
        }
        return (
          <div className="space-y-3">
            {value.map((entry: any, idx: number) => (
              <div key={idx} className="border rounded-lg p-3 bg-muted/30">
                {submission.metadata?.entryLabelPreferences?.[field.key] && (
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Entry {idx + 1}</p>
                )}
                <div className="space-y-2">
                  {(field.fields || []).map((subField: any) => {
                    const subValue = entry[subField.key];
                    if (!subValue && subValue !== 0) return null;
                    return (
                      <div key={subField.key} className="text-sm">
                        {!subField.hideLabel && <span className="font-medium">{subField.label}: </span>}
                        <span>{String(subValue)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );

      case "checklist":
        const checklistValue = value as Record<number, string>;
        return (
          <ChecklistField
            items={field.items || field.options || []}
            options={field.responseOptions || ["OK", "DEV", "N/A"]}
            value={checklistValue}
            onChange={() => {}}
            readOnly
          />
        );

      case "file":
        if (!Array.isArray(value) || value.length === 0) {
          return <p className="text-muted-foreground">No files attached</p>;
        }
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {value.map((file: any, index: number) => (
              <div key={index} className="border rounded-lg overflow-hidden bg-card">
                {file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img 
                    src={file.url} 
                    alt={file.name || 'Attachment'} 
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      console.error('Failed to load image:', file.url);
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.querySelector('.fallback-icon')?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className="fallback-icon hidden w-full h-32 flex items-center justify-center bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                {!file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                  <div className="w-full h-32 flex items-center justify-center bg-muted">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{file.name || 'Attachment'}</p>
                  {file.caption && (
                    <p className="text-xs text-muted-foreground mt-1">{file.caption}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case "textarea":
        return (
          <div className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-lg">
            {value}
          </div>
        );

      default:
        // Safety check: if value is an array or object, don't crash
        if (Array.isArray(value)) {
          return (
            <div className="space-y-1">
              {value.map((item, idx) => (
                <p key={idx} className="text-sm">
                  {idx + 1}. {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                </p>
              ))}
            </div>
          );
        }
        if (typeof value === 'object') {
          return (
            <div className="text-xs bg-muted p-2 rounded font-mono">
              {JSON.stringify(value, null, 2)}
            </div>
          );
        }
        return <p className="text-sm">{String(value)}</p>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">{schema?.title}</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>Created by User</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(submission.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
          </div>
        </div>
        <Badge variant={getStatusColor(submission.status)}>
          {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
        </Badge>
      </div>

      {submission.submitted_at && (
        <div className="text-sm text-muted-foreground">
          Submitted on {format(new Date(submission.submitted_at), "MMMM d, yyyy 'at' h:mm a")}
        </div>
      )}

      <Separator />

      {/* Sections */}
      {schema?.sections && Array.isArray(schema.sections) ? (
        schema.sections.map((section: any, idx: number) => {
          try {
            return (
              <Card key={idx}>
                {!section.hideTitle && section.title && (
                  <CardHeader>
                    <CardTitle>{section.title}</CardTitle>
                  </CardHeader>
                )}
                <CardContent className="space-y-6">
                  {section.fields?.map((field: any) => (
                    <div key={field.key || field.id || idx} className="space-y-2">
                      {!field.hideLabel && <h4 className="font-medium text-sm">{field.label}</h4>}
                      {renderFieldValue(field)}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          } catch (error) {
            console.error("Error rendering section:", section, error);
            return (
              <div key={idx} className="p-4 border border-destructive rounded-lg bg-destructive/10">
                <p className="text-sm text-destructive">Error rendering section: {section?.title || `Section ${idx + 1}`}</p>
              </div>
            );
          }
        })
      ) : (
        <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
          <p className="text-sm text-destructive">Error: Invalid form schema. This form may be using an outdated format.</p>
          <p className="text-xs text-muted-foreground mt-2">Please contact your administrator to update this form template.</p>
        </div>
      )}

      {submission.signature && (
        <Card>
          <CardHeader>
            <CardTitle>Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <SignatureField
              value={submission.signature}
              onChange={() => {}}
              readOnly
            />
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-background/80 supports-[backdrop-filter]:bg-background/60 backdrop-blur border-t flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
        {onDelete && (
          <Button variant="destructive" onClick={onDelete} className="w-full sm:w-auto">
            Delete
          </Button>
        )}
        {canEdit && (
          <Button onClick={onEdit} className="w-full sm:w-auto">
            Edit
          </Button>
        )}
        <Button variant="outline" onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="w-full sm:w-auto">
          {isGeneratingPDF ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="ml-2">Download PDF</span>
        </Button>
        <Button variant="outline" onClick={handleDownloadDOCX} disabled={isGeneratingDOCX} className="w-full sm:w-auto">
          {isGeneratingDOCX ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          <span className="ml-2">Download Word Doc</span>
        </Button>
        <Button variant="outline" onClick={() => setIsEmailDialogOpen(true)} className="w-full sm:w-auto">
          <Mail className="h-4 w-4" />
          <span className="ml-2">Share via Email</span>
        </Button>
      </div>

      <AlertDialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Share via Email</AlertDialogTitle>
            <AlertDialogDescription>
              Send this form submission as a PDF with photos attached. The general observations will be included in the email body.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="recipient-email">Recipient Email</Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="email@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              disabled={isSendingEmail}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSendingEmail}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendEmail} disabled={isSendingEmail}>
              {isSendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
