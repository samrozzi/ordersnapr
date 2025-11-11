/**
 * NumberFieldInput - Input for number custom fields
 * Supports min, max, step, and display unit
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomField, NumberFieldConfig } from '@/types/custom-fields';

interface NumberFieldInputProps {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export function NumberFieldInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: NumberFieldInputProps) {
  const config = field.field_config as NumberFieldConfig;
  const numValue = value?.number ?? '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange({ number: null });
    } else {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        onChange({ number: num });
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field.field_key}>
        {field.field_name}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
        {config.unit && <span className="text-muted-foreground ml-1">({config.unit})</span>}
      </Label>
      <Input
        id={field.field_key}
        type="number"
        value={numValue}
        onChange={handleChange}
        min={config.min}
        max={config.max}
        step={config.step || 1}
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
