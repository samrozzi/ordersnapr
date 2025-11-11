/**
 * Custom Fields System Types
 *
 * Defines TypeScript interfaces for the custom fields system that allows
 * organizations to extend entities with custom data fields.
 */

// ============================================================================
// Entity Types
// ============================================================================

export type EntityType = 'work_orders' | 'customers' | 'properties' | 'invoices';

// ============================================================================
// Field Types
// ============================================================================

export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'datetime'
  | 'dropdown'
  | 'checkbox'
  | 'textarea'
  | 'file'
  | 'email'
  | 'phone'
  | 'url';

// ============================================================================
// Field Configuration Types
// ============================================================================

export interface TextFieldConfig {
  placeholder?: string;
  maxLength?: number;
  pattern?: string; // Regex pattern for validation
  helpText?: string;
}

export interface NumberFieldConfig {
  min?: number;
  max?: number;
  step?: number;
  unit?: string; // Display unit (e.g., "BTU", "lbs", "$")
  helpText?: string;
}

export interface DropdownOption {
  value: string;
  label: string;
  color?: string; // Optional color for visual distinction
}

export interface DropdownFieldConfig {
  options: DropdownOption[];
  allowMultiple?: boolean;
  allowCustom?: boolean; // Allow users to add new options on the fly
  helpText?: string;
}

export interface DateFieldConfig {
  minDate?: string; // ISO date string
  maxDate?: string; // ISO date string
  includeTime?: boolean;
  helpText?: string;
}

export interface CheckboxFieldConfig {
  label?: string;
  defaultValue?: boolean;
  helpText?: string;
}

export interface FileFieldConfig {
  allowedTypes?: string[]; // MIME types, e.g., ["image/*", "application/pdf"]
  maxSize?: number; // Max file size in bytes
  maxFiles?: number; // Max number of files
  helpText?: string;
}

export interface TextareaFieldConfig {
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  helpText?: string;
}

export interface EmailFieldConfig {
  placeholder?: string;
  helpText?: string;
}

export interface PhoneFieldConfig {
  placeholder?: string;
  format?: string; // e.g., "(###) ###-####"
  helpText?: string;
}

export interface UrlFieldConfig {
  placeholder?: string;
  helpText?: string;
}

// Union type for all field configs
export type FieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | DropdownFieldConfig
  | DateFieldConfig
  | CheckboxFieldConfig
  | FileFieldConfig
  | TextareaFieldConfig
  | EmailFieldConfig
  | PhoneFieldConfig
  | UrlFieldConfig;

// ============================================================================
// Custom Field Definition
// ============================================================================

export interface CustomField {
  id: string;
  org_id: string;
  entity_type: EntityType;
  field_name: string; // Display name
  field_key: string; // Internal key (lowercase, underscores)
  field_type: FieldType;
  field_config: FieldConfig;
  display_order: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// ============================================================================
// Custom Field Values
// ============================================================================

export interface FileValue {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

// Value types for different field types
export type FieldValue =
  | { text: string } // text, textarea, email, phone, url
  | { number: number }
  | { date: string } // ISO date string
  | { datetime: string } // ISO datetime string
  | { boolean: boolean }
  | { selected: string } // dropdown single
  | { selected: string[] } // dropdown multiple
  | { files: FileValue[] };

export interface CustomFieldValue {
  id: string;
  custom_field_id: string;
  entity_type: EntityType;
  entity_id: string;
  value: FieldValue;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Combined View (Field + Value)
// ============================================================================

export interface CustomFieldWithValue extends CustomField {
  value?: FieldValue;
}

// ============================================================================
// Form Field Props
// ============================================================================

export interface CustomFieldInputProps {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationError {
  fieldKey: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// Helper Types
// ============================================================================

// Simplified values map for form state
export type CustomFieldValues = Record<string, any>;

// Field group for organizing fields in UI
export interface FieldGroup {
  name: string;
  fields: CustomField[];
  collapsed?: boolean;
}

// ============================================================================
// Database function return types
// ============================================================================

export interface EntityCustomFieldsRow {
  field_id: string;
  field_name: string;
  field_key: string;
  field_type: FieldType;
  field_config: FieldConfig;
  is_required: boolean;
  display_order: number;
  value: FieldValue | null;
}
