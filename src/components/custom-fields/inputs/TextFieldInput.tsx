/**
 * TextFieldInput - Input for text-based custom fields
 * Supports text, email, phone, and url field types
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomField, TextFieldConfig } from '@/types/custom-fields';

interface TextFieldInputProps {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export function TextFieldInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: TextFieldInputProps) {
  const config = field.field_config as TextFieldConfig;
  const textValue = value?.text || '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ text: e.target.value });
  };

  // Determine input type based on field type
  const inputType = field.field_type === 'email' ? 'email'
    : field.field_type === 'phone' ? 'tel'
    : field.field_type === 'url' ? 'url'
    : 'text';

  return (
    <div className="space-y-2">
      <Label htmlFor={field.field_key}>
        {field.field_name}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={field.field_key}
        type={inputType}
        value={textValue}
        onChange={handleChange}
        placeholder={config.placeholder}
        maxLength={config.maxLength}
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
