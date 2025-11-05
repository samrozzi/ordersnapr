import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChecklistSection } from "@/components/ChecklistSection";
import { PhotoUpload, PhotoWithCaption } from "@/components/PhotoUpload";
import { SmartFormImport } from "@/components/SmartFormImport";
import { FavoriteButton } from "@/components/FavoriteButton";
import { FileText, ChevronDown, Save } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadialShareButton } from "@/components/RadialShareButton";
import { generateJobAuditPDF } from "@/lib/job-audit-pdf-generator";

interface JobAuditProps {
  draftToLoad?: any;
  onDraftLoaded?: () => void;
}

const ADMIN_TESTING_ITEMS = [
  "Conducted all proper required testing (Including Fiber / Copper TRUE Test)",
  "Detailed, accurate close out narrative provided, in addition to correct disposition / cause codes",
  "Bad Plant Condition (BPC) filled out properly and submitted",
  "Damage claim properly submitted (Non-Drop Related)",
  "Wi-Fi / Consultation",
  "Wi-Fi / Assessment for RG placement",
  "Wi-Fi / Assessment results and extender discussion",
  "Wi-Fi / SHM customer login and touchpoints (Do not handle customer's device)",
  "Other",
];

const CUSTOMER_EXPERIENCE_ITEMS = [
  "Time Management",
  "No trouble after visit",
  "Tech visited prem first and closed job with customer",
  "Initiated proper customer contact (pre and post work); reviewed work request with customer; covered Service Promise with customer",
  "Introduced self; showed ATT ID; greeted customer by name",
  "Proper apparel and booties worn",
  "Confirmed all existing customer equipment working prior to job start",
  "Recommended additional products & services, as appropriate (you Refer)",
  "Verfied all services were working properly (upon job completion); provided customer education",
  "General housekeeping (inside & outside the home); respect the customer's premises",
  "Other",
];

const DROP_AUDIT_ITEMS = [
  "Buried drop properly placed in aerial plant",
  "BDR Submitted with Accurate Information (Bore/Held/Estimated Length/Terminal Address/etc.)",
  "BDR photos provided (Sidekick)",
  "Closure/Handhole/Terminal closed and secured, including hardware",
  "Drop properly dug in at Closure/Handhole/Terminal and/or Conduit at pole",
  "Drop properly tagged at Terminal (House/Unit Number)",
  "Copper drop bonded correctly (Terminal/Pedestal/NID)",
  "Proper drop type in buried plant (Tracer, 2Pair)",
  "Shortest fiber drop utilized for chosen route (Length Label or Observed)",
  "Drop properly flagged for safety and proposed route marked",
  "Proper drop route taken; accounting for obstacles, property lines and easements",
  "Drop properly temped over hard surface (Driveway, Sidewalk)",
  "Drop has sufficient slack",
  "Cutover avoided",
  "Appropriate drop guard placed, secured and dug in at premise",
  "No Tools / Material / Hardware / Debris left at job site (Terminal to Premise)",
  "CTC/NID properly placed and secured",
  "CTC/NID cleaned, appropriate grommet(s) placed, sealed with approved sealant",
  "Proper routing and termination of wiring inside of CTC/NID",
  "CTC/NID properly tagged with CALL 811 sticker",
  "Order/Circuit information clearly marked inside CTC/NID",
  "Fiber Tracer/Tone wire is isolated and capped, no exposed metal (NID/Handhole/Terminal)",
  "CTC/NID properly grounded to approved ground source; ground tag placed",
  "Appropriate IW, properly attached to customers premise between NID and entry point; sealed with approved sealant",
  "Damage claim properly submitted (Drop Related)",
  "No unused drops left at the Terminal/FST/Pole",
  "Aerial drop properly attached including proper hardware",
  "Drop enters aerial terminal correctly",
  "Correct Cable ID tag; writing legible; locate decal / stencil; graffiti addressed (at terminal)",
  "Drop channel plugged (sealing foam not acceptable)",
  "Sufficient gravel level",
  "Pole numbers correct and legible",
  "Defective pole / guy wire / strand, lashing reported and marked",
  "Terminal / Cable / Drops bonded, grounded and tagged correctly",
  "General Housekeeping; Insects and / or rodents treated; closure brushed out; no loose lugs",
  "No bare copper or exposed ends on spare pair; protector tight, not missing and correct type",
  "Splice tray has cover and has been placed back into the FST securely",
  "Verify the BP / Port at the terminal / FST matches facility assignments",
  "Closure / terminal secured and / or closed properly",
];

const JobAudit = ({ draftToLoad, onDraftLoaded }: JobAuditProps = {}) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [photos, setPhotos] = useState<PhotoWithCaption[]>([]);
  const [observations, setObservations] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [ban, setBan] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [address, setAddress] = useState("");
  const [reportedBy, setReportedBy] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [canBeReached, setCanBeReached] = useState("");
  const [adminChecklist, setAdminChecklist] = useState<Record<number, string>>({});
  const [customerChecklist, setCustomerChecklist] = useState<Record<number, string>>({});
  const [dropChecklist, setDropChecklist] = useState<Record<number, string>>({});
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (draftToLoad) {
      handleLoadDraft(draftToLoad);
      onDraftLoaded?.();
    }
  }, [draftToLoad]);

  const generatePDF = async (returnInstance = false) => {
    const photoUrls = await Promise.all(
      photos.map(async (photo) => ({
        url: photo.preview,
        name: photo.file.name,
        caption: photo.caption
      }))
    );

    const pdf = await generateJobAuditPDF({
      technicianName,
      ban,
      serviceDate,
      address,
      customerName,
      contactPhone: canBeReached,
      reportDate: new Date(),
      reportBy: reportedBy || session?.user?.email || "Unknown",
      observations,
      adminChecklist,
      adminChecklistItems: ADMIN_TESTING_ITEMS,
      customerChecklist,
      customerChecklistItems: CUSTOMER_EXPERIENCE_ITEMS,
      dropChecklist,
      dropChecklistItems: DROP_AUDIT_ITEMS,
      photos: photoUrls
    });

    return pdf;
  };

  const handleGenerateReport = async () => {
    const doc = await generatePDF(false);
    const filename = `JobAudit_${technicianName || 'Report'}_${serviceDate || new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    toast.success("Inspection report generated successfully!");
  };

  const handleSaveFiles = async () => {
    try {
      toast.info("Preparing files for download...");
      
      // Check if Web Share API is available and supports files
      if (navigator.share && navigator.canShare) {
        try {
          // Generate PDF as blob
          const doc = await generatePDF(true);
          const pdfBlob = doc.output('blob');
          const pdfFileName = `JobAudit_${technicianName || 'Report'}_${serviceDate || new Date().toISOString().split('T')[0]}.pdf`;
          const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });
          
          // Convert photos to files
          const photoFiles = await Promise.all(
            photos.map(async (photo, index) => {
              const response = await fetch(photo.preview);
              const blob = await response.blob();
              const sanitizedCaption = photo.caption ? photo.caption.replace(/[^a-z0-9]/gi, '_').substring(0, 30) : 'unnamed';
              return new File([blob], `Photo_${index + 1}_${sanitizedCaption}.jpg`, { type: 'image/jpeg' });
            })
          );
          
          const allFiles = [pdfFile, ...photoFiles];
          
          if (navigator.canShare({ files: allFiles })) {
            await navigator.share({
              files: allFiles,
              title: 'Job Quality Inspection Report',
              text: `Report for ${technicianName || 'Technician'}`
            });
            toast.success("Files shared successfully!");
            return;
          }
        } catch (shareError) {
          console.log("Web Share API not available or failed, using ZIP fallback");
        }
      }
      
      // Fallback: Create ZIP file
      const zip = new JSZip();
      
      // Add PDF to ZIP
      const doc = await generatePDF(true);
      const pdfBlob = doc.output('blob');
      const pdfFileName = `JobAudit_${technicianName || 'Report'}_${serviceDate || new Date().toISOString().split('T')[0]}.pdf`;
      zip.file(pdfFileName, pdfBlob);
      
      // Add photos to ZIP
      for (let index = 0; index < photos.length; index++) {
        const photo = photos[index];
        const response = await fetch(photo.preview);
        const blob = await response.blob();
        const sanitizedCaption = photo.caption ? photo.caption.replace(/[^a-z0-9]/gi, '_').substring(0, 30) : 'unnamed';
        zip.file(`Photo_${index + 1}_${sanitizedCaption}.jpg`, blob);
      }
      
      // Generate ZIP and download
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const zipLink = document.createElement('a');
      zipLink.href = zipUrl;
      zipLink.download = `JobAudit_${technicianName || 'Report'}_${serviceDate || new Date().toISOString().split('T')[0]}.zip`;
      zipLink.click();
      
      toast.success(`ZIP file downloaded with 1 PDF and ${photos.length} photo(s)`);
    } catch (error) {
      console.error("Error saving files:", error);
      toast.error("Failed to save files");
    }
  };

  const handleEmailDraft = async () => {
    try {
      toast.info("Preparing email draft...");
      
      // Create ZIP file with all attachments
      const zip = new JSZip();
      
      // Add PDF to ZIP
      const doc = await generatePDF(true);
      const pdfBlob = doc.output('blob');
      const pdfFileName = `JobAudit_${technicianName || 'Report'}_${serviceDate || new Date().toISOString().split('T')[0]}.pdf`;
      zip.file(pdfFileName, pdfBlob);
      
      // Add photos to ZIP
      for (let index = 0; index < photos.length; index++) {
        const photo = photos[index];
        const response = await fetch(photo.preview);
        const blob = await response.blob();
        const sanitizedCaption = photo.caption ? photo.caption.replace(/[^a-z0-9]/gi, '_').substring(0, 30) : 'unnamed';
        zip.file(`Photo_${index + 1}_${sanitizedCaption}.jpg`, blob);
      }
      
      // Generate ZIP and download
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const zipLink = document.createElement('a');
      zipLink.href = zipUrl;
      zipLink.download = `JobAudit_${technicianName || 'Report'}_${serviceDate || new Date().toISOString().split('T')[0]}.zip`;
      zipLink.click();
      
      // Prepare email content
      const subject = `Job Quality Inspection Report - ${technicianName || 'Technician'}`;
      
      const bodyText = `Job Quality Inspection Report\n\n` +
        `Report Created By: ${reportedBy}\n` +
        `Technician: ${technicianName}\n` +
        `Customer: ${customerName}\n` +
        `Address: ${address}\n` +
        `BAN: ${ban}\n` +
        `Service Date: ${serviceDate}\n\n` +
        `Observations:\n${observations}\n\n` +
        `A ZIP file containing the PDF report and ${photos.length} photo(s) has been downloaded to your Downloads folder.\n` +
        `Please attach this ZIP file to your email.\n\n` +
        `This report was generated from OrderSnapr.`;
      
      // Small delay to ensure ZIP download starts
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Open email client with pre-filled content
      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
      window.location.href = mailtoLink;
      
      toast.success("ZIP downloaded and email draft opened!", {
        duration: 5000,
      });
    } catch (error) {
      console.error("Error opening email draft:", error);
      toast.error("Failed to open email draft");
    }
  };

  const handleEmailReport = async () => {
    if (!recipientEmail) {
      toast.error("Please enter a recipient email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSendingEmail(true);

    try {
      // Generate PDF
      const doc = await generatePDF();
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const filename = `inspection-report-${new Date().toISOString().split('T')[0]}.pdf`;

      // Convert photos to base64
      const photosBase64 = await Promise.all(
        photos.map(async (photo, index) => {
          try {
            const response = await fetch(photo.preview);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
              };
              reader.readAsDataURL(blob);
            });
            return {
              filename: `photo-${index + 1}.jpg`,
              content: base64,
              caption: photo.caption
            };
          } catch (err) {
            console.error(`Error converting photo ${index + 1}:`, err);
            return null;
          }
        })
      );

      const validPhotos = photosBase64.filter(photo => photo !== null);

      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to send emails');
        return;
      }

      // Call edge function to send email with auth header
      const { data, error } = await supabase.functions.invoke('send-report-email', {
        body: {
          recipientEmail,
          reportType: 'job-audit',
          pdfBase64,
          fileName: filename,
          photos: validPhotos,
          formData: {
            technicianName,
            customerName,
            address,
            ban,
            date: serviceDate,
            reportedBy,
            observations,
          }
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast.success(`Report emailed successfully to ${recipientEmail}`);
      setEmailDialogOpen(false);
      setRecipientEmail("");
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!session?.user) return;
    
    if (!technicianName && !ban && !address && !customerName) {
      toast.error("Please fill out at least some form data before saving a draft");
      return;
    }

    try {
      const formData = {
        photos,
        observations,
        technicianName,
        ban,
        serviceDate,
        address,
        reportedBy,
        customerName,
        canBeReached,
        adminChecklist,
        customerChecklist,
        dropChecklist
      };

      const draftName = `Job Audit - ${technicianName || 'Unnamed'} - ${new Date().toLocaleDateString()}`;

      const { error } = await supabase
        .from('form_drafts')
        .insert({
          user_id: session.user.id,
          form_type: 'job-audit',
          draft_name: draftName,
          form_data: formData
        } as any);

      if (error) throw error;

      toast.success("Draft saved successfully!");
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft");
    }
  };

  const handleLoadDraft = async (draftData: any) => {
    if (!draftData) return;
    
    // Handle photos restoration
    if (draftData.photos && Array.isArray(draftData.photos)) {
      const restoredPhotos = await Promise.all(
        draftData.photos.map(async (photo: any) => {
          // If photo has preview URL, fetch and recreate File object
          if (photo.preview) {
            try {
              const response = await fetch(photo.preview);
              const blob = await response.blob();
              const file = new File([blob], photo.file?.name || 'image.jpg', { type: 'image/jpeg' });
              return {
                file,
                caption: photo.caption || "",
                preview: photo.preview
              };
            } catch (err) {
              console.error("Error restoring photo:", err);
              return null;
            }
          }
          return null;
        })
      );
      setPhotos(restoredPhotos.filter(p => p !== null) as PhotoWithCaption[]);
    }
    
    if (draftData.observations) setObservations(draftData.observations);
    if (draftData.technicianName) setTechnicianName(draftData.technicianName);
    if (draftData.ban) setBan(draftData.ban);
    if (draftData.serviceDate) setServiceDate(draftData.serviceDate);
    if (draftData.address) setAddress(draftData.address);
    if (draftData.reportedBy) setReportedBy(draftData.reportedBy);
    if (draftData.customerName) setCustomerName(draftData.customerName);
    if (draftData.canBeReached) setCanBeReached(draftData.canBeReached);
    if (draftData.adminChecklist) setAdminChecklist(draftData.adminChecklist);
    if (draftData.customerChecklist) setCustomerChecklist(draftData.customerChecklist);
    if (draftData.dropChecklist) setDropChecklist(draftData.dropChecklist);
    
    toast.success("Draft loaded successfully!");
  };

  const handleDataExtracted = (data: any) => {
    if (data.technicianName) setTechnicianName(data.technicianName);
    if (data.accountNumber) setBan(data.accountNumber);
    if (data.serviceDate) setServiceDate(data.serviceDate);
    if (data.address) setAddress(data.address);
    if (data.customerName) setCustomerName(data.customerName);
    if (data.canBeReached) setCanBeReached(data.canBeReached);
    if (data.observations) setObservations(data.observations);
    if (data.reportedBy) setReportedBy(data.reportedBy);
    toast.success("Form data extracted and populated!");
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Job Quality Inspection
              </CardTitle>
              {draftToLoad && <FavoriteButton entityType="form_draft" entityId={draftToLoad.id} />}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
              <Button 
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={!technicianName && !ban && !address && !customerName}
                className="w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <SmartFormImport 
                formType="job-audit"
                onDataExtracted={handleDataExtracted}
              />
            </div>
            <CardDescription>
              Document job quality issues and observations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="technicianName">Technician Name</Label>
                <Input
                  id="technicianName"
                  placeholder="Enter technician name"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ban">BAN</Label>
                <Input
                  id="ban"
                  type="tel"
                  placeholder="Enter BAN"
                  value={ban}
                  onChange={(e) => setBan(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceDate">Service Date</Label>
                <Input
                  id="serviceDate"
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter service address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="canBeReached">Can Be Reached</Label>
                <Input
                  id="canBeReached"
                  placeholder="Phone, email, or contact method"
                  value={canBeReached}
                  onChange={(e) => setCanBeReached(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observations & Notes</Label>
              <Textarea
                id="observations"
                placeholder="Enter your observations about the job..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportedBy">Report by</Label>
              <Select value={reportedBy} onValueChange={setReportedBy}>
                <SelectTrigger id="reportedBy">
                  <SelectValue placeholder="Select inspector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sam Rozzi - sr3333">Sam Rozzi - sr3333</SelectItem>
                  <SelectItem value="Josh Ghebremichael - jg008d">Josh Ghebremichael - jg008d</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <PhotoUpload photos={photos} onPhotosChange={setPhotos} />
          </CardContent>
        </Card>

        <Collapsible defaultOpen={false}>
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-70 transition-opacity">
                <CardTitle className="text-lg">Administrative/Testing</CardTitle>
                <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ChecklistSection
                  title=""
                  items={ADMIN_TESTING_ITEMS}
                  checklist={adminChecklist}
                  onChecklistChange={setAdminChecklist}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible defaultOpen={false} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-70 transition-opacity">
                <CardTitle className="text-lg">Customer Experience</CardTitle>
                <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ChecklistSection
                  title=""
                  items={CUSTOMER_EXPERIENCE_ITEMS}
                  checklist={customerChecklist}
                  onChecklistChange={setCustomerChecklist}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible defaultOpen={false} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-70 transition-opacity">
                <CardTitle className="text-lg">MAIN FOCUS/BSW AUDIT - Drop</CardTitle>
                <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ChecklistSection
                  title=""
                  items={DROP_AUDIT_ITEMS}
                  checklist={dropChecklist}
                  onChecklistChange={setDropChecklist}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="pointer-events-auto">
            <RadialShareButton
              onGeneratePDF={handleGenerateReport}
              onSendEmail={() => setEmailDialogOpen(true)}
              onSaveFiles={handleSaveFiles}
              onEmailDraft={handleEmailDraft}
            />
            
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Email Report</DialogTitle>
                  <DialogDescription>
                    Send this inspection report as a PDF attachment via email.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Recipient Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="recipient@example.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && recipientEmail) {
                          handleEmailReport();
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEmailDialogOpen(false)}
                      disabled={isSendingEmail}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleEmailReport}
                      disabled={isSendingEmail || !recipientEmail}
                    >
                      {isSendingEmail ? "Sending..." : "Send Email"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </main>
    </div>
  );
};

export default JobAudit;
