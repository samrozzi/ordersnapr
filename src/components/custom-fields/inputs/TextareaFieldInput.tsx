/**
 * TextareaFieldInput - Input for textarea custom fields
 */

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CustomField, TextareaFieldConfig } from '@/types/custom-fields';

interface TextareaFieldInputProps {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export function TextareaFieldInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: TextareaFieldInputProps) {
  const config = field.field_config as TextareaFieldConfig;
  const textValue = value?.text || '';

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ text: e.target.value });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field.field_key}>
        {field.field_name}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Textarea
        id={field.field_key}
        value={textValue}
        onChange={handleChange}
        placeholder={config.placeholder}
        maxLength={config.maxLength}
        rows={config.rows || 4}
        disabled={disabled}
        className={error ? 'border-destructive' : ''}
      />
      {config.helpText && (
        <p className="text-sm text-muted-foreground">{config.helpText}</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
