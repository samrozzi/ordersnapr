import { useState } from "react";
import { Upload, FileImage, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compression";
import { toast } from "sonner";

interface ExtractedField {
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  description?: string;
}

interface ExtractedSection {
  title: string;
  fields: ExtractedField[];
}

interface ExtractedFormStructure {
  sections: ExtractedSection[];
  requireSignature?: boolean;
}

interface FormImporterProps {
  onImportComplete: (schema: any) => void;
}

export function FormImporter({ onImportComplete }: FormImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedFormStructure | null>(null);
  const [error, setError] = useState<string>("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Unsupported file format. Please upload JPG, PNG, or WEBP.");
      return;
    }

    // Validate file size (20MB)
    if (selectedFile.size > 20 * 1024 * 1024) {
      setError("File too large (max 20MB). Please use a smaller file.");
      return;
    }

    setFile(selectedFile);
    setError("");
    setExtractedData(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const processImage = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError("");

    try {
      // Compress image
      const compressedFile = await compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      });

      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(compressedFile);
      const imageData = await base64Promise;

      console.log("Calling extract-form-structure function");

      // Call edge function
      const { data, error: functionError } = await supabase.functions.invoke('extract-form-structure', {
        body: { imageData, fileName: file.name }
      });

      if (functionError) {
        console.error("Function error:", functionError);
        throw new Error(functionError.message || "Failed to analyze form");
      }

      if (!data || !data.sections || data.sections.length === 0) {
        throw new Error("Could not detect form fields. Please ensure the image is clear and shows a complete form.");
      }

      console.log("Extracted form structure:", data);
      setExtractedData(data);
      toast.success("Form structure extracted successfully!");

    } catch (err) {
      console.error("Error processing image:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to process image";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFieldUpdate = (sectionIdx: number, fieldIdx: number, key: string, value: any) => {
    if (!extractedData) return;

    const newData = { ...extractedData };
    newData.sections[sectionIdx].fields[fieldIdx] = {
      ...newData.sections[sectionIdx].fields[fieldIdx],
      [key]: value
    };
    setExtractedData(newData);
  };

  const handleApply = () => {
    if (!extractedData) return;

    // Transform to TemplateBuilderV2 format
    const schema = {
      sections: extractedData.sections.map(section => ({
        title: section.title,
        collapsed: false,
        fields: section.fields.map(field => ({
          type: field.type,
          label: field.label,
          key: field.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          required: field.required || false,
          placeholder: field.placeholder || "",
          options: field.options || [],
          description: field.description || ""
        }))
      })),
      use_org_theme: false,
      require_signature: extractedData.requireSignature || false
    };

    onImportComplete(schema);
    toast.success("Template structure loaded into builder!");
  };

  const handleReset = () => {
    setFile(null);
    setPreview("");
    setExtractedData(null);
    setError("");
  };

  if (extractedData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Form structure detected</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Upload Different Form
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Preview</h4>
            <img src={preview} alt="Form preview" className="w-full h-auto border rounded-lg" />
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Detected Fields (Review & Edit)</h4>
            <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
              {extractedData.sections.map((section, sectionIdx) => (
                <Card key={sectionIdx} className="p-4">
                  <Input
                    value={section.title}
                    onChange={(e) => {
                      const newData = { ...extractedData };
                      newData.sections[sectionIdx].title = e.target.value;
                      setExtractedData(newData);
                    }}
                    className="font-semibold mb-3"
                  />
                  <div className="space-y-3">
                    {section.fields.map((field, fieldIdx) => (
                      <div key={fieldIdx} className="space-y-2 p-2 border rounded">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Type</Label>
                            <Select
                              value={field.type}
                              onValueChange={(value) => handleFieldUpdate(sectionIdx, fieldIdx, 'type', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="select">Select</SelectItem>
                                <SelectItem value="radio">Radio</SelectItem>
                                <SelectItem value="checkbox">Checkbox</SelectItem>
                                <SelectItem value="textarea">Textarea</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="phone">Phone</SelectItem>
                                <SelectItem value="address">Address</SelectItem>
                                <SelectItem value="file">File</SelectItem>
                                <SelectItem value="signature">Signature</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Label</Label>
                            <Input
                              value={field.label}
                              onChange={(e) => handleFieldUpdate(sectionIdx, fieldIdx, 'label', e.target.value)}
                              className="h-8"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={field.required}
                            onCheckedChange={(checked) => handleFieldUpdate(sectionIdx, fieldIdx, 'required', checked)}
                          />
                          <Label className="text-xs">Required</Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset}>Cancel</Button>
          <Button onClick={handleApply}>Apply to Template Builder</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Import Form from Image</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload an image of an existing form and AI will automatically detect fields and structure
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
          <XCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {!file ? (
        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-12 h-12 mb-3 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP (max 20MB)</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-start gap-4">
              <FileImage className="h-8 w-8 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {preview && (
              <img src={preview} alt="Preview" className="mt-4 w-full h-auto max-h-64 object-contain border rounded" />
            )}
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleReset} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={processImage} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing form...
                </>
              ) : (
                "Analyze Form"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
