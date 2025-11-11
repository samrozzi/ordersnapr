/**
 * FileFieldInput - Input for file upload custom fields
 * Note: This is a simplified version. Full implementation would need file upload to Supabase storage
 */

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomField, FileFieldConfig, FileValue } from '@/types/custom-fields';
import { X, Upload, FileIcon } from 'lucide-react';

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Validate file count
    if (config.maxFiles && files.length + selectedFiles.length > config.maxFiles) {
      // TODO: Show error toast
      return;
    }

    setIsUploading(true);

    try {
      // TODO: Upload to Supabase storage
      // For now, just create mock FileValue objects
      const newFiles: FileValue[] = Array.from(selectedFiles).map((file) => ({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        url: URL.createObjectURL(file), // Temporary URL
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      }));

      onChange({ files: [...files, ...newFiles] });
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (fileId: string) => {
    const newFiles = files.filter((f) => f.id !== fileId);
    onChange({ files: newFiles });
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
