import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/image-compression";

interface FileItem {
  id: string;
  name: string;
  url: string;
  size: number;
  caption?: string;
}

interface FileUploadFieldProps {
  maxFiles: number;
  accept: string[];
  allowCaptions: boolean;
  value: FileItem[];
  onChange: (value: FileItem[]) => void;
  readOnly?: boolean;
  orgId: string;
  submissionId?: string;
  label?: string;
  onPrepare?: () => Promise<string | null>;
}

export function FileUploadField({
  maxFiles,
  accept,
  allowCaptions,
  value,
  onChange,
  readOnly = false,
  orgId,
  submissionId,
  label,
  onPrepare,
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = async () => {
    setPreparing(true);
    try {
      // Ensure we have a submission ID before opening file picker
      if (onPrepare && !submissionId) {
        await onPrepare();
      }
      
      // Trigger the hidden file input
      fileInputRef.current?.click();
    } finally {
      setPreparing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    if (!submissionId) {
      toast.error("Unable to upload files. Please try again.");
      if (e.target) e.target.value = '';
      return;
    }

    const files = Array.from(e.target.files);

    if (value.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      if (e.target) e.target.value = '';
      return;
    }

    setUploading(true);

    try {
      const uploadedFiles: FileItem[] = [];

      for (const file of files) {
        // Compress image files before upload to reduce storage and bandwidth costs
        const fileToUpload = await compressImage(file);

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `orgs/${orgId}/forms/${submissionId}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('form-attachments')
          .upload(filePath, fileToUpload);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('form-attachments')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          id: uploadData.path,
          name: file.name,
          url: urlData.publicUrl,
          size: fileToUpload.size, // Use compressed file size
        });
      }

      onChange([...value, ...uploadedFiles]);
      toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    try {
      await supabase.storage.from('form-attachments').remove([fileId]);
      onChange(value.filter(f => f.id !== fileId));
      toast.success('File removed');
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove file');
    }
  };

  const handleCaptionChange = (fileId: string, caption: string) => {
    onChange(value.map(f => f.id === fileId ? { ...f, caption } : f));
  };

  const acceptString = accept.join(',');

  return (
    <div className="space-y-4">
      {label && <Label>{label}</Label>}
      
      {!readOnly && value.length < maxFiles && (
        <div>
          <Input
            ref={fileInputRef}
            type="file"
            accept={acceptString}
            onChange={handleFileUpload}
            disabled={uploading || preparing}
            multiple
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading || preparing}
            className="w-full"
            onClick={handleUploadClick}
          >
            <Upload className="h-4 w-4 mr-2" />
            {preparing ? 'Preparing...' : uploading ? 'Uploading...' : `Upload Files (${value.length}/${maxFiles})`}
          </Button>
        </div>
      )}

      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {value.map((file) => {
            const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)($|\?)/i.test(file.url) || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name);
            
            return (
              <div key={file.id} className="relative border rounded-lg overflow-hidden bg-card">
                {isImage ? (
                  <div className="relative w-full h-32">
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        console.error('Image load error:', file.url);
                        setImageErrors(prev => new Set(prev).add(file.id));
                      }}
                      onLoad={() => {
                        setImageErrors(prev => {
                          const next = new Set(prev);
                          next.delete(file.id);
                          return next;
                        });
                      }}
                    />
                    {imageErrors.has(file.id) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground mt-1">Failed to load</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-32 flex items-center justify-center bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              
                {!readOnly && (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => handleRemoveFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              
                <div className="p-2 space-y-1">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  {allowCaptions && (
                    <Input
                      placeholder="Add caption..."
                      value={file.caption || ''}
                      onChange={(e) => handleCaptionChange(file.id, e.target.value)}
                      readOnly={readOnly}
                      className="text-xs h-7"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
