/**
 * DateFieldInput - Input for date/datetime custom fields
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomField, DateFieldConfig } from '@/types/custom-fields';

interface DateFieldInputProps {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export function DateFieldInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: DateFieldInputProps) {
  const config = field.field_config as DateFieldConfig;
  const isDateTime = field.field_type === 'datetime';
  const dateValue = isDateTime ? value?.datetime || '' : value?.date || '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (isDateTime) {
      onChange({ datetime: val });
    } else {
      onChange({ date: val });
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field.field_key}>
        {field.field_name}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={field.field_key}
        type={isDateTime ? 'datetime-local' : 'date'}
        value={dateValue}
        onChange={handleChange}
        min={config.minDate}
        max={config.maxDate}
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
