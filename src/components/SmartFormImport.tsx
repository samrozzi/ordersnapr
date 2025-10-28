import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, Upload, Sparkles, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ExtractedFormData {
  technicianName?: string;
  accountNumber?: string;
  serviceDate?: string;
  address?: string;
  customerName?: string;
  canBeReached?: string;
  observerName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

interface SmartFormImportProps {
  formType: "job-audit" | "ride-along";
  onDataExtracted: (data: ExtractedFormData) => void;
}

export const SmartFormImport = ({ formType, onDataExtracted }: SmartFormImportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedFormData | null>(null);
  const [showReview, setShowReview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Compress image to reduce AI costs by 65-90%
  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      img.onload = () => {
        // Calculate dimensions (max 1024px on longest side)
        const maxDimension = 1024;
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > maxDimension) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress to JPEG (80% quality)
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.8);
        
        console.log(`Image compressed: ${Math.round(file.size/1024)}KB → ${Math.round(compressed.length*0.75/1024)}KB`);
        resolve(compressed);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setShowReview(false);

    try {
      // Compress image first
      const compressed = await compressImage(file);
      setImagePreview(compressed);

      // Call edge function with compressed image
      const { data, error } = await supabase.functions.invoke('extract-form-data', {
        body: {
          image: compressed,
          formType
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Failed to process image. Please try again.');
        setIsProcessing(false);
        return;
      }

      if (!data.success) {
        toast.error(data.error || 'Could not extract data from image');
        setIsProcessing(false);
        return;
      }

      // Filter out null values
      const cleanedData = Object.fromEntries(
        Object.entries(data.data).filter(([_, value]) => value !== null && value !== '')
      );

      setExtractedData(cleanedData);
      setShowReview(true);
      setIsProcessing(false);

      if (Object.keys(cleanedData).length === 0) {
        toast.error('No data could be extracted from the image');
      } else {
        toast.success(`Found ${Object.keys(cleanedData).length} fields`);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image');
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error('Image too large. Maximum size is 20MB');
        return;
      }
      processImage(file);
    }
  };

  const handleApplyData = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
      toast.success('Form data imported successfully!');
      handleClose();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setImagePreview(null);
    setExtractedData(null);
    setShowReview(false);
    setIsProcessing(false);
  };

  const getFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
      technicianName: 'Technician Name',
      accountNumber: 'Account Number',
      serviceDate: 'Service Date',
      address: 'Address',
      customerName: 'Customer Name',
      canBeReached: 'Can Be Reached',
      observerName: 'Observer Name',
      date: 'Date',
      startTime: 'Start Time',
      endTime: 'End Time'
    };
    return labels[key] || key;
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        <Camera className="h-4 w-4" />
        Smart Import
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Smart Form Import
            </DialogTitle>
            <DialogDescription>
              Upload or capture a photo of your work order to automatically fill form fields
            </DialogDescription>
          </DialogHeader>

          {!imagePreview && !isProcessing && (
            <div className="grid grid-cols-2 gap-4 py-6">
              <Button
                variant="outline"
                className="h-32 flex-col gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-8 w-8" />
                <span>Take Photo</span>
              </Button>
              <Button
                variant="outline"
                className="h-32 flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8" />
                <span>Upload Image</span>
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing image with AI...</p>
            </div>
          )}

          {imagePreview && showReview && extractedData && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-48 object-contain rounded border"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImagePreview(null);
                    setExtractedData(null);
                    setShowReview(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="max-h-[400px] pr-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Extracted Data (Review & Edit)</h4>
                  <div className="grid gap-3">
                    {Object.entries(extractedData).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <Label htmlFor={`extracted-${key}`} className="text-xs">
                          {getFieldLabel(key)}
                        </Label>
                        <Input
                          id={`extracted-${key}`}
                          value={value as string}
                          onChange={(e) => {
                            setExtractedData({
                              ...extractedData,
                              [key]: e.target.value
                            });
                          }}
                          className="h-9"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleApplyData} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Apply to Form
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
