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
import { Progress } from "@/components/ui/progress";
import { PhotoUpload, PhotoWithCaption } from "@/components/PhotoUpload";
import { SmartFormImport } from "@/components/SmartFormImport";
import { FavoriteButton } from "@/components/FavoriteButton";
import { FileText, ChevronDown, Check, X, Minus, Save } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadialShareButton } from "@/components/RadialShareButton";

const PRE_CALL_ITEMS = [
  "Introduce yourself",
  "Verify appointment",
  "Verify service to be installed",
  "Share ETA"
];

const DRIVE_ITEMS = [
  "Did the technician drive directly to the premises?"
];

const MEET_GREET_ITEMS = [
  "Hold initial conversation at the door to set expectations",
  "Congratulate customer & explain benefits of fiber",
  "Explain install process & expected time",
  "Remind customer to download Smart Home Manager (SHM)",
  "Explain Wi-Fi Assessment"
];

const TRUE_TEST_ITEMS = [
  "In Buried Plant, locate CFST and place VFL on adjacent port",
  "Qualify fiber at PFP",
  "Qualify fiber at terminal",
  "Correct cable ID tag",
  "Drop channel sealed",
  "Gravel level sufficient",
  "No abandoned hardware",
  "Pole numbers legible",
  "Drop enters terminal correctly",
  "Defective pole/guy wire reported",
  "Cabinet/closure secured",
  "Excavation addressed",
  "No tools/materials left",
  "Pole steps tagged",
  "BPC filled out properly"
];

const WIFI_ASSESSMENT_ITEMS = [
  "Visual inspection of roadblocks/hazards",
  "Survey customer on broadband usage",
  "Perform Wi-Fi assessment w/ powered gateway",
  "Review all variables to determine optimal equipment placement",
  "If poor coverage exists, offer EWCS solution",
  "Upload Wi-Fi assessment results",
  "Proper apparel and booties worn",
  "Was ETC updated and accurate?"
];

const EXTEND_HOME_ITEMS = [
  "Place and secure Slack NID in optimal location",
  "Proper placement of drop",
  "Scope and clean at Slack NID",
  "Check light level from drop"
];

const GATEWAY_ITEMS = [
  "Route and secure IW to fiber jack",
  "Install fiber jack",
  "Scope & clean all connections",
  "Upload fiber jack photo",
  "Perform TRUE test toward splitter",
  "Plug SFP into gateway & connect shuttered jumper",
  "Activate ONT gateway",
  "Validate registration via quality check"
];

const SPEED_TEST_ITEMS = [
  "Install & activate extenders (if recommended)",
  "Confirm SHM login (customer's device only)",
  "Did customer navigate to My Wi-Fi?",
  "Did customer perform RG & Device Speed Test?",
  "Did customer open Virtual Assistant Help?",
  "Was SHM Notifications enabled?",
  "Was Active Armor enabled and discussed?",
  "Was Wi-Fi customization or transfer done?",
  "Validate connected devices via quality check",
  "General housekeeping & respect of premises",
  "Recommended products/services (youRefer)"
];

const CLOSE_OUT_ITEMS = [
  "Close job from premises",
  "Did final quality check pass?",
  "Accurate close-out narrative provided",
  "Damage claim submitted if needed",
  "No debris or tools left at job site",
  "Time management satisfactory",
  "No trouble after visit",
  "Resolve any customer concerns (VOC)",
  "Offer to show drop routing/NID placement",
  "Confirm satisfaction and thank customer"
];

interface ChecklistSectionProps {
  items: string[];
  checklist: Record<number, string>;
  onChecklistChange: (checklist: Record<number, string>) => void;
}

const RideAlongChecklistSection = ({ items, checklist, onChecklistChange }: ChecklistSectionProps) => {
  const handleStatusChange = (index: number, value: string) => {
    onChecklistChange({
      ...checklist,
      [index]: value
    });
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="space-y-2">
          <p className="text-sm font-medium">{item}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={checklist[index] === "Yes" ? "default" : "outline"}
              size="sm"
              onClick={() => handleStatusChange(index, "Yes")}
              className={cn(
                "flex-1",
                checklist[index] === "Yes" && "bg-green-600 hover:bg-green-700"
              )}
            >
              <Check className="h-4 w-4 mr-1" />
              Yes
            </Button>
            <Button
              type="button"
              variant={checklist[index] === "No" ? "default" : "outline"}
              size="sm"
              onClick={() => handleStatusChange(index, "No")}
              className={cn(
                "flex-1",
                checklist[index] === "No" && "bg-red-600 hover:bg-red-700"
              )}
            >
              <X className="h-4 w-4 mr-1" />
              No
            </Button>
            <Button
              type="button"
              variant={checklist[index] === "N/A" ? "default" : "outline"}
              size="sm"
              onClick={() => handleStatusChange(index, "N/A")}
              className={cn(
                "flex-1",
                checklist[index] === "N/A" && "bg-gray-600 hover:bg-gray-700"
              )}
            >
              <Minus className="h-4 w-4 mr-1" />
              N/A
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

interface RideAlongProps {
  draftToLoad?: any;
  onDraftLoaded?: () => void;
}

const RideAlong = ({ draftToLoad, onDraftLoaded }: RideAlongProps = {}) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [photos, setPhotos] = useState<PhotoWithCaption[]>([]);
  const [accountNumber, setAccountNumber] = useState("");
  const [address, setAddress] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [observerName, setObserverName] = useState("Sam Rozzi");
  const [canBeReached, setCanBeReached] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [overallNotes, setOverallNotes] = useState("");
  
  const [preCallChecklist, setPreCallChecklist] = useState<Record<number, string>>({});
  const [driveChecklist, setDriveChecklist] = useState<Record<number, string>>({});
  const [meetGreetChecklist, setMeetGreetChecklist] = useState<Record<number, string>>({});
  const [trueTestChecklist, setTrueTestChecklist] = useState<Record<number, string>>({});
  const [wifiChecklist, setWifiChecklist] = useState<Record<number, string>>({});
  const [extendHomeChecklist, setExtendHomeChecklist] = useState<Record<number, string>>({});
  const [gatewayChecklist, setGatewayChecklist] = useState<Record<number, string>>({});
  const [speedTestChecklist, setSpeedTestChecklist] = useState<Record<number, string>>({});
  const [closeOutChecklist, setCloseOutChecklist] = useState<Record<number, string>>({});
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

  const calculateProgress = () => {
    const allChecklists = [
      preCallChecklist,
      driveChecklist,
      meetGreetChecklist,
      trueTestChecklist,
      wifiChecklist,
      extendHomeChecklist,
      gatewayChecklist,
      speedTestChecklist,
      closeOutChecklist
    ];

    const totalItems = 
      PRE_CALL_ITEMS.length +
      DRIVE_ITEMS.length +
      MEET_GREET_ITEMS.length +
      TRUE_TEST_ITEMS.length +
      WIFI_ASSESSMENT_ITEMS.length +
      EXTEND_HOME_ITEMS.length +
      GATEWAY_ITEMS.length +
      SPEED_TEST_ITEMS.length +
      CLOSE_OUT_ITEMS.length;

    const completedItems = allChecklists.reduce((acc, checklist) => {
      return acc + Object.keys(checklist).length;
    }, 0);

    return (completedItems / totalItems) * 100;
  };

  const generatePDF = async (returnInstance = false) => {
    const doc = new jsPDF();
    let yPos = 20;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;

    // Helper function to compress and resize images
    const compressImage = async (file: File, maxWidth = 800, quality = 0.5): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx?.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Ride-Along Observation Form", 20, yPos);
    yPos += 15;

    // Form details
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Form Details", 20, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    if (accountNumber) {
      doc.text(`Account Number: ${accountNumber}`, 20, yPos);
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
    if (technicianName) {
      doc.text(`Technician: ${technicianName}`, 20, yPos);
      yPos += 5;
    }
    if (observerName) {
      doc.text(`Observer: ${observerName}`, 20, yPos);
      yPos += 5;
    }
    if (canBeReached) {
      doc.text(`Can Be Reached: ${canBeReached}`, 20, yPos);
      yPos += 5;
    }
    if (date) {
      doc.text(`Date: ${date}`, 20, yPos);
      yPos += 5;
    }
    if (startTime) {
      doc.text(`Start Time: ${startTime}`, 20, yPos);
      yPos += 5;
    }
    if (endTime) {
      doc.text(`End Time: ${endTime}`, 20, yPos);
      yPos += 5;
    }
    yPos += 5;

    // Overall Notes
    if (overallNotes) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Overall Notes:", 20, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const notesLines = doc.splitTextToSize(overallNotes, 170);
      doc.text(notesLines, 20, yPos);
      yPos += notesLines.length * lineHeight + 5;
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
        
        if (status === "Yes") {
          doc.setTextColor(34, 197, 94);
        } else if (status === "No") {
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

    addSection("Section 1: Pre-Call", PRE_CALL_ITEMS, preCallChecklist);
    addSection("Section 2: Drive To Prem", DRIVE_ITEMS, driveChecklist);
    addSection("Section 3: Meet and Greet", MEET_GREET_ITEMS, meetGreetChecklist);
    addSection("Section 4: True Test (To ONT)", TRUE_TEST_ITEMS, trueTestChecklist);
    addSection("Section 5: Wi-Fi Assessment", WIFI_ASSESSMENT_ITEMS, wifiChecklist);
    addSection("Section 6: Extend to Home", EXTEND_HOME_ITEMS, extendHomeChecklist);
    addSection("Section 7: Connect to Gateway", GATEWAY_ITEMS, gatewayChecklist);
    addSection("Section 8: Speed Test & SHM", SPEED_TEST_ITEMS, speedTestChecklist);
    addSection("Section 9: Close-Out at Prem", CLOSE_OUT_ITEMS, closeOutChecklist);

    // Photos
    if (photos.length > 0) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Observation Photos", 20, yPos);
      yPos += 10;

      const imgSize = 85;
      const margin = 10;
      const captionHeight = 10;
      let photoCount = 0;

      for (const photo of photos) {
        try {
          // Compress image before adding to PDF
          const compressedDataUrl = await compressImage(photo.file, 800, 0.5);
          
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
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
                compressedDataUrl, 
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
              
              resolve();
            };
            img.onerror = reject;
            img.src = compressedDataUrl;
          });
        } catch (error) {
          console.error("Error processing photo:", error);
          // Continue with next photo
        }
      }
    }

    if (returnInstance) {
      return doc;
    }
    
    return doc;
  };

  const handleGenerateReport = async () => {
    const doc = await generatePDF(false);
    const filename = `RideAlong_${technicianName || 'Report'}_${date || new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    toast.success("Ride-along report generated successfully!");
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
          const pdfFileName = `RideAlong_${technicianName || 'Report'}_${date || new Date().toISOString().split('T')[0]}.pdf`;
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
              title: 'Ride-Along Observation Report',
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
      const pdfFileName = `RideAlong_${technicianName || 'Report'}_${date || new Date().toISOString().split('T')[0]}.pdf`;
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
      zipLink.download = `RideAlong_${technicianName || 'Report'}_${date || new Date().toISOString().split('T')[0]}.zip`;
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
      const pdfFileName = `RideAlong_${technicianName || 'Report'}_${date || new Date().toISOString().split('T')[0]}.pdf`;
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
      zipLink.download = `RideAlong_${technicianName || 'Report'}_${date || new Date().toISOString().split('T')[0]}.zip`;
      zipLink.click();
      
      // Prepare email content
      const subject = `Ride-Along Observation Report - ${technicianName || 'Technician'}`;
      
      const bodyText = `Ride-Along Observation Report\n\n` +
        `Observer: ${observerName}\n` +
        `Technician: ${technicianName}\n` +
        `Customer: ${customerName}\n` +
        `Address: ${address}\n` +
        `Account Number: ${accountNumber}\n` +
        `Date: ${date}\n\n` +
        `Overall Notes:\n${overallNotes}\n\n` +
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
      const filename = `ride-along-${date || new Date().toISOString().split('T')[0]}.pdf`;

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
          reportType: 'ride-along',
          pdfBase64,
          fileName: filename,
          photos: validPhotos,
          formData: {
            technicianName,
            customerName,
            address,
            accountNumber,
            date,
            observerName,
            overallNotes,
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
    
    if (!technicianName && !accountNumber && !address && !customerName) {
      toast.error("Please fill out at least some form data before saving a draft");
      return;
    }

    try {
      const formData = {
        accountNumber,
        address,
        customerName,
        technicianName,
        observerName,
        canBeReached,
        date,
        startTime,
        endTime,
        photos,
        overallNotes,
        preCallChecklist,
        driveChecklist,
        meetGreetChecklist,
        trueTestChecklist,
        wifiChecklist,
        extendHomeChecklist,
        gatewayChecklist,
        speedTestChecklist,
        closeOutChecklist
      };

      const draftName = `Ride Along - ${technicianName || 'Unnamed'} - ${new Date().toLocaleDateString()}`;

      const { error } = await supabase
        .from('form_drafts')
        .insert({
          user_id: session.user.id,
          form_type: 'ride-along',
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
    
    if (draftData.accountNumber) setAccountNumber(draftData.accountNumber);
    if (draftData.address) setAddress(draftData.address);
    if (draftData.customerName) setCustomerName(draftData.customerName);
    if (draftData.technicianName) setTechnicianName(draftData.technicianName);
    // Observer name is always "Sam Rozzi" - don't load from draft
    if (draftData.canBeReached) setCanBeReached(draftData.canBeReached);
    if (draftData.date) setDate(draftData.date);
    if (draftData.startTime) setStartTime(draftData.startTime);
    if (draftData.endTime) setEndTime(draftData.endTime);
    if (draftData.photos) setPhotos(draftData.photos);
    if (draftData.overallNotes) setOverallNotes(draftData.overallNotes);
    if (draftData.preCallChecklist) setPreCallChecklist(draftData.preCallChecklist);
    if (draftData.driveChecklist) setDriveChecklist(draftData.driveChecklist);
    if (draftData.meetGreetChecklist) setMeetGreetChecklist(draftData.meetGreetChecklist);
    if (draftData.trueTestChecklist) setTrueTestChecklist(draftData.trueTestChecklist);
    if (draftData.wifiChecklist) setWifiChecklist(draftData.wifiChecklist);
    if (draftData.extendHomeChecklist) setExtendHomeChecklist(draftData.extendHomeChecklist);
    if (draftData.gatewayChecklist) setGatewayChecklist(draftData.gatewayChecklist);
    if (draftData.speedTestChecklist) setSpeedTestChecklist(draftData.speedTestChecklist);
    if (draftData.closeOutChecklist) setCloseOutChecklist(draftData.closeOutChecklist);
    
    toast.success("Draft loaded successfully!");
  };

  const handleDataExtracted = (data: any) => {
    if (data.accountNumber) setAccountNumber(data.accountNumber);
    if (data.address) setAddress(data.address);
    if (data.customerName) setCustomerName(data.customerName);
    if (data.technicianName) setTechnicianName(data.technicianName);
    if (data.canBeReached) setCanBeReached(data.canBeReached);
    if (data.date) setDate(data.date);
    if (data.startTime) setStartTime(data.startTime);
    if (data.endTime) setEndTime(data.endTime);
    // Observer name is always "Sam Rozzi" and not imported
  };

  if (!session) {
    return null;
  }

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ride-Along Observation Form
              </CardTitle>
              {draftToLoad && <FavoriteButton entityType="form_draft" entityId={draftToLoad.id} />}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
              <Button 
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={!technicianName && !accountNumber && !address && !customerName}
                className="w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <SmartFormImport 
                formType="ride-along"
                onDataExtracted={handleDataExtracted}
              />
            </div>
            <CardDescription>
              Document technician performance and adherence to procedures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  placeholder="Enter account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
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
                <Label htmlFor="observerName">Observer Name</Label>
                <Input
                  id="observerName"
                  value="Sam Rozzi"
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="canBeReached">Can Be Reached</Label>
                <Input
                  id="canBeReached"
                  placeholder="Phone, email, or contact method"
                  value={canBeReached}
                  onChange={(e) => setCanBeReached(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="overallNotes">Overall Notes & Observations</Label>
              <Textarea
                id="overallNotes"
                placeholder="Enter your overall notes and observations..."
                value={overallNotes}
                onChange={(e) => setOverallNotes(e.target.value)}
                rows={4}
              />
            </div>

            <PhotoUpload photos={photos} onPhotosChange={setPhotos} />
          </CardContent>
        </Card>

        <Collapsible defaultOpen={false}>
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-70 transition-opacity">
                <CardTitle className="text-lg">Section 1: Pre-Call</CardTitle>
                <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <RideAlongChecklistSection
                  items={PRE_CALL_ITEMS}
                  checklist={preCallChecklist}
                  onChecklistChange={setPreCallChecklist}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible defaultOpen={false} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-70 transition-opacity">
                <CardTitle className="text-lg">Section 2: Drive To Prem</CardTitle>
                <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <RideAlongChecklistSection
                  items={DRIVE_ITEMS}
                  checklist={driveChecklist}
                  onChecklistChange={setDriveChecklist}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible defaultOpen={false} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-70 transition-opacity">
                <CardTitle className="text-lg">Section 3: Meet and Greet</CardTitle>
                <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <RideAlongChecklistSection
                  items={MEET_GREET_ITEMS}
                  checklist={meetGreetChecklist}
                  onChecklistChange={setMeetGreetChecklist}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible defaultOpen={false} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-70 transition-opacity">
                <CardTitle className="text-lg">Section 4: True Test (To ONT)</CardTitle>
                <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <RideAlongChecklistSection
                  items={TRUE_TEST_ITEMS}
                  checklist={trueTestChecklist}
                  onChecklistChange={setTrueTestChecklist}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible defaultOpen={false} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-70 transition-opacity">
                <CardTitle className="text-lg">Section 5: Wi-Fi Assessment</CardTitle>
                <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <RideAlongChecklistSection
                  items={WIFI_ASSESSMENT_ITEMS}
                  checklist={wifiChecklist}
                  onChecklistChange={setWifiChecklist}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible defaultOpen={false} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-70 transition-opacity">
                <CardTitle className="text-lg">Section 6: Extend to Home</CardTitle>
                <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <RideAlongChecklistSection
                  items={EXTEND_HOME_ITEMS}
                  checklist={extendHomeChecklist}
                  onChecklistChange={setExtendHomeChecklist}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible defaultOpen={false} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-70 transition-opacity">
                <CardTitle className="text-lg">Section 7: Connect to Gateway</CardTitle>
                <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <RideAlongChecklistSection
                  items={GATEWAY_ITEMS}
                  checklist={gatewayChecklist}
                  onChecklistChange={setGatewayChecklist}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible defaultOpen={false} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-70 transition-opacity">
                <CardTitle className="text-lg">Section 8: Speed Test & Smart Home Manager</CardTitle>
                <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <RideAlongChecklistSection
                  items={SPEED_TEST_ITEMS}
                  checklist={speedTestChecklist}
                  onChecklistChange={setSpeedTestChecklist}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible defaultOpen={false} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-70 transition-opacity">
                <CardTitle className="text-lg">Section 9: Close-Out at Prem</CardTitle>
                <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <RideAlongChecklistSection
                  items={CLOSE_OUT_ITEMS}
                  checklist={closeOutChecklist}
                  onChecklistChange={setCloseOutChecklist}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
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
                    Send this ride-along report as a PDF attachment via email.
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

export default RideAlong;
