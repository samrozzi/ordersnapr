/**
 * FileFieldInput - Input for file upload custom fields
 * Full implementation with Supabase Storage integration
 */

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomField, FileFieldConfig, FileValue } from '@/types/custom-fields';
import { X, Upload, FileIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { compressImage } from '@/lib/image-compression';
import { useActiveOrg } from '@/hooks/use-active-org';

interface FileFieldInputProps {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export function FileFieldInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: FileFieldInputProps) {
  const config = field.field_config as FileFieldConfig;
  const files: FileValue[] = value?.files || [];
  const [isUploading, setIsUploading] = useState(false);
  const { activeOrgId } = useActiveOrg();

  const validateFile = (file: File): string | null => {
    // Validate file size
    if (config.maxSize && file.size > config.maxSize) {
      return `File "${file.name}" exceeds maximum size of ${formatFileSize(config.maxSize)}`;
    }

    // Validate file type
    if (config.allowedTypes && config.allowedTypes.length > 0) {
      const isAllowed = config.allowedTypes.some(allowedType => {
        // Handle wildcards like "image/*"
        if (allowedType.endsWith('/*')) {
          const typePrefix = allowedType.slice(0, -2);
          return file.type.startsWith(typePrefix);
        }
        return file.type === allowedType;
      });

      if (!isAllowed) {
        return `File type "${file.type}" is not allowed`;
      }
    }

    return null;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Validate file count
    if (config.maxFiles && files.length + selectedFiles.length > config.maxFiles) {
      toast.error(`Maximum ${config.maxFiles} file(s) allowed`);
      e.target.value = '';
      return;
    }

    // Validate each file
    const filesToUpload: File[] = [];
    for (const file of Array.from(selectedFiles)) {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        e.target.value = '';
        return;
      }
      filesToUpload.push(file);
    }

    setIsUploading(true);

    try {
      const uploadedFiles: FileValue[] = [];

      for (const file of filesToUpload) {
        // Compress image files before upload to reduce storage costs
        const fileToUpload = await compressImage(file);

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `orgs/${activeOrgId || 'personal'}/custom-fields/${field.entity_type}/${field.field_key}/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('custom-field-files')
          .upload(filePath, fileToUpload);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload ${file.name}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('custom-field-files')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          id: uploadData.path, // Use storage path as ID for easy deletion
          name: file.name,
          url: urlData.publicUrl,
          size: fileToUpload.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        });
      }

      onChange({ files: [...files, ...uploadedFiles] });
      toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
    } catch (error: any) {
      console.error('File upload error:', error);
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = async (fileId: string) => {
    try {
      // Delete from Supabase Storage
      const { error: deleteError } = await supabase.storage
        .from('custom-field-files')
        .remove([fileId]);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw new Error('Failed to delete file');
      }

      // Remove from state
      const newFiles = files.filter((f) => f.id !== fileId);
      onChange({ files: newFiles });
      toast.success('File removed successfully');
    } catch (error: any) {
      console.error('File removal error:', error);
      toast.error(error.message || 'Failed to remove file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      <Label>
        {field.field_name}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileIcon className="h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(file.id)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {(!config.maxFiles || files.length < config.maxFiles) && (
        <div>
          <Input
            id={field.field_key}
            type="file"
            onChange={handleFileSelect}
            accept={config.allowedTypes?.join(',')}
            multiple={!config.maxFiles || config.maxFiles > 1}
            disabled={disabled || isUploading}
            className="hidden"
          />
          <Label
            htmlFor={field.field_key}
            className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
              error ? 'border-destructive' : ''
            } ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Upload className="h-4 w-4" />
            <span className="text-sm">
              {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
            </span>
          </Label>
        </div>
      )}

      {config.helpText && (
        <p className="text-sm text-muted-foreground">{config.helpText}</p>
      )}
      {config.maxSize && (
        <p className="text-xs text-muted-foreground">
          Max file size: {formatFileSize(config.maxSize)}
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
