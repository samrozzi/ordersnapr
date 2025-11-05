import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Upload, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";
import { format } from "date-fns";

interface AppleHealthImportProps {
  orgId: string;
  onImportComplete?: (data: any) => void;
}

export function AppleHealthImport({ orgId, onImportComplete }: AppleHealthImportProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file size (max 250MB)
    const maxSize = 250 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error("File too large. Maximum size is 250MB.");
      return;
    }

    // Check file type
    const isZip = selectedFile.type === "application/zip" ||
                  selectedFile.type === "application/x-zip-compressed" ||
                  selectedFile.name.endsWith(".zip");
    const isXml = selectedFile.type === "application/xml" ||
                  selectedFile.type === "text/xml" ||
                  selectedFile.name.endsWith(".xml");

    if (!isZip && !isXml) {
      toast.error("Please select a ZIP or XML file from Apple Health export.");
      return;
    }

    setFile(selectedFile);
    toast.success(`Selected: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`);
  };

  const parseHealthData = async (xmlContent: string, filterDate?: Date): Promise<any> => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

      // Check for parsing errors
      const parseError = xmlDoc.querySelector("parsererror");
      if (parseError) {
        throw new Error("Invalid XML format");
      }

      const records = xmlDoc.querySelectorAll("Record");
      const healthData: any[] = [];

      let processedCount = 0;
      const totalRecords = records.length;

      records.forEach((record, index) => {
        const recordDate = record.getAttribute("startDate");
        const recordType = record.getAttribute("type");
        const value = record.getAttribute("value");
        const unit = record.getAttribute("unit");

        // Filter by date if specified
        if (filterDate && recordDate) {
          const recDate = new Date(recordDate);
          if (recDate < filterDate) {
            return; // Skip records before the filter date
          }
        }

        healthData.push({
          type: recordType,
          value: value,
          unit: unit,
          date: recordDate,
          sourceName: record.getAttribute("sourceName"),
          device: record.getAttribute("device"),
        });

        // Update progress every 1000 records
        processedCount++;
        if (processedCount % 1000 === 0) {
          const progress = Math.round((processedCount / totalRecords) * 100);
          setUploadProgress(progress);
        }
      });

      setUploadProgress(100);
      return healthData;
    } catch (error) {
      console.error("Error parsing health data:", error);
      throw new Error("Failed to parse health data. Please ensure this is a valid Apple Health export file.");
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file first.");
      return;
    }

    if (!selectedDate) {
      toast.error("Please select a start date for filtering data.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Upload file to storage
      toast.info("Uploading file...");
      const fileName = `health-import-${Date.now()}-${file.name}`;
      const filePath = `orgs/${orgId}/health-imports/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('form-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setUploadProgress(30);

      // Step 2: Process the file
      setUploading(false);
      setProcessing(true);
      toast.info("Processing health data...");

      let xmlContent: string;

      if (file.name.endsWith('.zip')) {
        // Extract XML from ZIP
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);

        // Find the export.xml file
        const exportFile = zipContent.file("apple_health_export/export.xml") ||
                          zipContent.file("export.xml");

        if (!exportFile) {
          throw new Error("Could not find export.xml in the ZIP file. Please ensure this is a valid Apple Health export.");
        }

        toast.info("Extracting and parsing health data...");
        xmlContent = await exportFile.async("string");
      } else {
        // Read XML directly
        xmlContent = await file.text();
      }

      setUploadProgress(50);

      // Parse the health data with date filter
      toast.info(`Parsing health records from ${format(selectedDate, "MMM dd, yyyy")} onwards...`);
      const healthData = await parseHealthData(xmlContent, selectedDate);

      toast.success(`Successfully processed ${healthData.length.toLocaleString()} health records!`);

      // Call the callback with parsed data
      if (onImportComplete) {
        onImportComplete({
          fileName: file.name,
          filePath: uploadData.path,
          recordCount: healthData.length,
          filterDate: selectedDate,
          data: healthData,
        });
      }

      // Reset form
      setFile(null);
      setSelectedDate(undefined);
      setUploadProgress(0);
      setOpen(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import health data');
    } finally {
      setUploading(false);
      setProcessing(false);
      setUploadProgress(0);
    }
  };

  const isProcessing = uploading || processing;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import Apple Health Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Apple Health Data</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Select Apple Health Export File</Label>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.xml,application/zip,application/x-zip-compressed,application/xml,text/xml"
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="hidden"
                id="health-file-input"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {file ? file.name : "Choose File (ZIP or XML)"}
              </Button>
              {file && (
                <p className="text-sm text-muted-foreground">
                  File size: {(file.size / 1024 / 1024).toFixed(2)}MB
                </p>
              )}
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Filter Data From Date</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Only import health records from this date onwards to reduce processing time.
            </p>
            <div className="border rounded-md p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isProcessing}
                className="mx-auto"
              />
            </div>
            {selectedDate && (
              <p className="text-sm font-medium">
                Selected: {format(selectedDate, "MMMM dd, yyyy")}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {uploading ? "Uploading..." : "Processing..."}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Import Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={!file || !selectedDate || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploading ? "Uploading..." : "Processing..."}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Health Data
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </div>

          {/* Instructions */}
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <p className="font-medium">How to export your Apple Health data:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Open the Health app on your iPhone</li>
              <li>Tap your profile picture in the top right</li>
              <li>Scroll down and tap "Export All Health Data"</li>
              <li>The export will be saved as a ZIP file</li>
              <li>Transfer the file to this device and upload it here</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
