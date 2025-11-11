/**
 * CheckboxFieldInput - Input for checkbox custom fields
 */

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CustomField, CheckboxFieldConfig } from '@/types/custom-fields';

interface CheckboxFieldInputProps {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export function CheckboxFieldInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: CheckboxFieldInputProps) {
  const config = field.field_config as CheckboxFieldConfig;
  const checked = value?.boolean ?? false;

  const handleChange = (checked: boolean) => {
    onChange({ boolean: checked });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id={field.field_key}
          checked={checked}
          onCheckedChange={handleChange}
          disabled={disabled}
        />
        <Label
          htmlFor={field.field_key}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {config.label || field.field_name}
          {field.is_required && <span className="text-destructive ml-1">*</span>}
        </Label>
      </div>
      {config.helpText && (
        <p className="text-sm text-muted-foreground ml-6">{config.helpText}</p>
      )}
      {error && (
        <p className="text-sm text-destructive ml-6">{error}</p>
      )}
    </div>
  );
}
