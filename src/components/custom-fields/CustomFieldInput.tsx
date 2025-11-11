/**
 * CustomFieldInput - Main dispatcher component for custom field inputs
 * Renders the appropriate input component based on field type
 */

import { CustomField } from '@/types/custom-fields';
import { TextFieldInput } from './inputs/TextFieldInput';
import { NumberFieldInput } from './inputs/NumberFieldInput';
import { DateFieldInput } from './inputs/DateFieldInput';
import { DropdownFieldInput } from './inputs/DropdownFieldInput';
import { CheckboxFieldInput } from './inputs/CheckboxFieldInput';
import { TextareaFieldInput } from './inputs/TextareaFieldInput';
import { FileFieldInput } from './inputs/FileFieldInput';

interface CustomFieldInputProps {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export function CustomFieldInput({
  field,
  value,
  onChange,
  error,
  disabled = false,
}: CustomFieldInputProps) {
  // Render the appropriate input based on field type
  switch (field.field_type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
      return (
        <TextFieldInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    case 'number':
      return (
        <NumberFieldInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    case 'date':
    case 'datetime':
      return (
        <DateFieldInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    case 'dropdown':
      return (
        <DropdownFieldInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    case 'checkbox':
      return (
        <CheckboxFieldInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    case 'textarea':
      return (
        <TextareaFieldInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    case 'file':
      return (
        <FileFieldInput
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    default:
      return (
        <div className="text-sm text-muted-foreground">
          Unsupported field type: {field.field_type}
        </div>
      );
  }
}
