/**
 * DropdownFieldInput - Input for dropdown custom fields
 * Supports single and multiple selection
 */

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CustomField, DropdownFieldConfig } from '@/types/custom-fields';

interface DropdownFieldInputProps {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export function DropdownFieldInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: DropdownFieldInputProps) {
  const config = field.field_config as DropdownFieldConfig;

  if (config.allowMultiple) {
    // Multiple selection with checkboxes
    const selectedValues = value?.selected || [];

    const handleToggle = (optionValue: string) => {
      const newSelected = selectedValues.includes(optionValue)
        ? selectedValues.filter((v: string) => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange({ selected: newSelected });
    };

    return (
      <div className="space-y-2">
        <Label>
          {field.field_name}
          {field.is_required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="space-y-2 border rounded-md p-3">
          {config.options.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`${field.field_key}-${option.value}`}
                checked={selectedValues.includes(option.value)}
                onCheckedChange={() => handleToggle(option.value)}
                disabled={disabled}
              />
              <Label
                htmlFor={`${field.field_key}-${option.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </div>
        {config.helpText && (
          <p className="text-sm text-muted-foreground">{config.helpText}</p>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }

  // Single selection with Select component
  const selectedValue = value?.selected || '';

  const handleChange = (val: string) => {
    onChange({ selected: val });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field.field_key}>
        {field.field_name}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select value={selectedValue} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger id={field.field_key} className={error ? 'border-destructive' : ''}>
          <SelectValue placeholder="Select an option..." />
        </SelectTrigger>
        <SelectContent>
          {config.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {config.helpText && (
        <p className="text-sm text-muted-foreground">{config.helpText}</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
