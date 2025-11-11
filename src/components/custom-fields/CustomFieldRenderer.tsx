/**
 * CustomFieldRenderer - Dynamically renders custom fields in forms
 * Handles field loading, validation, and value management
 */

import { useCustomFields } from '@/hooks/use-custom-fields';
import { CustomFieldInput } from './CustomFieldInput';
import { EntityType, CustomFieldValues } from '@/types/custom-fields';
import { Loader2 } from 'lucide-react';

interface CustomFieldRendererProps {
  entityType: EntityType;
  orgId?: string;
  values: CustomFieldValues;
  onChange: (fieldKey: string, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function CustomFieldRenderer({
  entityType,
  orgId,
  values,
  onChange,
  errors = {},
  disabled = false,
}: CustomFieldRendererProps) {
  const { fields, isLoading } = useCustomFields({ entityType, orgId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fields.length === 0) {
    return null; // No custom fields defined
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <CustomFieldInput
          key={field.id}
          field={field}
          value={values[field.field_key]}
          onChange={(value) => onChange(field.field_key, value)}
          error={errors[field.field_key]}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
