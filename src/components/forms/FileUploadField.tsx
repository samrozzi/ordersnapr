import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  submissionId: string;
  label?: string;
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
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    
    if (value.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);

    try {
      const uploadedFiles: FileItem[] = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `orgs/${orgId}/forms/${submissionId}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('form-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('form-attachments')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          id: uploadData.path,
          name: file.name,
          url: urlData.publicUrl,
          size: file.size,
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
            type="file"
            accept={acceptString}
            onChange={handleFileUpload}
            disabled={uploading}
            multiple
            className="hidden"
            id={`file-upload-${submissionId}`}
          />
          <label htmlFor={`file-upload-${submissionId}`}>
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              className="w-full cursor-pointer"
              asChild
            >
              <span>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : `Upload Files (${value.length}/${maxFiles})`}
              </span>
            </Button>
          </label>
        </div>
      )}

      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {value.map((file) => {
            const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name);
            
            return (
              <div key={file.id} className="relative border rounded-lg overflow-hidden bg-card">
                {isImage ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-32 object-cover"
                  />
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
