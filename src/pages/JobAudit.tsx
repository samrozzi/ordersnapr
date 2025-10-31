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
import { FileText, ChevronDown, Save, Mail } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

  const generatePDF = async () => {
    const doc = new jsPDF();
    let yPos = 20;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Job Quality Inspection Report", 20, yPos);
    yPos += 15;

    // Job details
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Job Details", 20, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    if (technicianName) {
      doc.text(`Technician: ${technicianName}`, 20, yPos);
      yPos += 5;
    }
    if (ban) {
      doc.text(`BAN: ${ban}`, 20, yPos);
      yPos += 5;
    }
    if (serviceDate) {
      doc.text(`Service Date: ${serviceDate}`, 20, yPos);
      yPos += 5;
    }
    if (address) {
      doc.text(`Address: ${address}`, 20, yPos);
      yPos += 5;
    }
    if (customerName) {
      doc.text(`Customer: ${customerName}`, 20, yPos);
      yPos += 5;
    }
    if (canBeReached) {
      doc.text(`Can Be Reached: ${canBeReached}`, 20, yPos);
      yPos += 5;
    }
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 5;
    if (reportedBy) {
      doc.text(`Report by ${reportedBy}`, 20, yPos);
      yPos += 5;
    }
    yPos += 5;

    // Observations
    if (observations) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Observations:", 20, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const obsLines = doc.splitTextToSize(observations, 170);
      doc.text(obsLines, 20, yPos);
      yPos += obsLines.length * lineHeight + 5;
    }

    // Helper function to add section
    const addSection = (title: string, items: string[], checklist: Record<number, string>) => {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(title, 20, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      items.forEach((item, index) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }

        const status = checklist[index] || "N/A";
        const itemText = `${index + 1}. ${item}`;
        const lines = doc.splitTextToSize(itemText, 140);
        
        doc.text(lines, 20, yPos);
        doc.setFont("helvetica", "bold");
        
        if (status === "OK") {
          doc.setTextColor(34, 197, 94);
        } else if (status === "DEV") {
          doc.setTextColor(239, 68, 68);
        } else {
          doc.setTextColor(156, 163, 175);
        }
        
        doc.text(status, 165, yPos);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        
        yPos += lines.length * lineHeight;
      });

      yPos += 5;
    };

    addSection("Administrative/Testing", ADMIN_TESTING_ITEMS, adminChecklist);
    addSection("Customer Experience", CUSTOMER_EXPERIENCE_ITEMS, customerChecklist);
    addSection("MAIN FOCUS/BSW AUDIT - Drop", DROP_AUDIT_ITEMS, dropChecklist);

    // Photos
    if (photos.length > 0) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Inspection Photos", 20, yPos);
      yPos += 10;

      const imgSize = 85;
      const margin = 10;
      const captionHeight = 10;
      let photoCount = 0;

      for (const photo of photos) {
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = (e) => {
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
              
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              canvas.width = img.width;
              canvas.height = img.height;
              
              ctx?.drawImage(img, 0, 0);
              
              const correctedImageData = canvas.toDataURL('image/jpeg', 0.9);
              
              const aspectRatio = img.width / img.height;
              let drawWidth = imgSize;
              let drawHeight = imgSize;
              
              if (aspectRatio > 1) {
                drawHeight = imgSize / aspectRatio;
              } else {
                drawWidth = imgSize * aspectRatio;
              }
              
              doc.addImage(
                correctedImageData, 
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
              
              if (photoCount % 4 === 0) {
                yPos += (imgSize * 2) + (margin * 2) + captionHeight;
              }
              
              resolve(null);
            };
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(photo.file);
        });
      }
    }

    return doc;
  };

  const handleGenerateReport = async () => {
    const doc = await generatePDF();
    const filename = `inspection-report-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    toast.success("Inspection report generated successfully!");
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

  const handleLoadDraft = (draftData: any) => {
    if (!draftData) return;
    
    if (draftData.photos) setPhotos(draftData.photos);
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
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5" />
              Job Quality Inspection
            </CardTitle>
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

        <div className="sticky bottom-4 left-0 right-0 z-50 flex justify-center px-4 mt-6">
          <div className="flex gap-3 bg-background/80 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
            <Button onClick={handleGenerateReport} size="lg" className="shadow-lg">
              Generate PDF Report
            </Button>
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  size="lg"
                  className="shadow-lg border-2 border-primary hover:bg-primary/10"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email Report
                </Button>
              </DialogTrigger>
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
