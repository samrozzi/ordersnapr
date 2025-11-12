/**
 * CustomFieldDialog - Dialog for creating/editing custom field definitions
 * Handles field configuration based on field type
 */

import { useState, useEffect } from 'react';
import { useCustomFields } from '@/hooks/use-custom-fields';
import { EntityType, FieldType, CustomField } from '@/types/custom-fields';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { FieldConfigEditor } from './FieldConfigEditor';

interface CustomFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  orgId?: string;
  fieldId?: string | null;
  onClose: () => void;
}

const FIELD_TYPES: { value: FieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Single line text input' },
  { value: 'textarea', label: 'Text Area', description: 'Multi-line text input' },
  { value: 'number', label: 'Number', description: 'Numeric input with validation' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'datetime', label: 'Date & Time', description: 'Date and time picker' },
  { value: 'dropdown', label: 'Dropdown', description: 'Select from predefined options' },
  { value: 'checkbox', label: 'Checkbox', description: 'Boolean yes/no field' },
  { value: 'email', label: 'Email', description: 'Email address with validation' },
  { value: 'phone', label: 'Phone', description: 'Phone number input' },
  { value: 'url', label: 'URL', description: 'Web address with validation' },
  { value: 'file', label: 'File', description: 'File upload' },
];

export function CustomFieldDialog({
  open,
  onOpenChange,
  entityType,
  orgId,
  fieldId,
  onClose,
}: CustomFieldDialogProps) {
  const { fields, createField, updateField } = useCustomFields({ entityType, orgId });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [fieldName, setFieldName] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('text');
  const [isRequired, setIsRequired] = useState(false);
  const [fieldConfig, setFieldConfig] = useState<any>({});

  // Load existing field if editing
  useEffect(() => {
    if (fieldId && fields.length > 0) {
      const field = fields.find((f) => f.id === fieldId);
      if (field) {
        setFieldName(field.field_name);
        setFieldKey(field.field_key);
        setFieldType(field.field_type as FieldType);
        setIsRequired(field.is_required);
        setFieldConfig(field.field_config || {});
      }
    } else if (!fieldId) {
      // Reset form for new field
      setFieldName('');
      setFieldKey('');
      setFieldType('text');
      setIsRequired(false);
      setFieldConfig({});
    }
  }, [fieldId, fields, open]);

  // Auto-generate field key from name
  useEffect(() => {
    if (!fieldId && fieldName) {
      const key = fieldName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setFieldKey(key);
    }
  }, [fieldName, fieldId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgId) return;

    setIsSubmitting(true);

    try {
      const fieldData = {
        org_id: orgId,
        entity_type: entityType,
        field_name: fieldName,
        field_key: fieldKey,
        field_type: fieldType,
        is_required: isRequired,
        field_config: fieldConfig,
      };

      if (fieldId) {
        await updateField({ id: fieldId, updates: fieldData as Partial<CustomField> });
      } else {
        await createField({
          ...fieldData,
          display_order: 0,
          is_active: true,
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving field:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{fieldId ? 'Edit Custom Field' : 'Create Custom Field'}</DialogTitle>
          <DialogDescription>
            {fieldId
              ? 'Update the field configuration below.'
              : 'Configure a new custom field for this entity type.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Field Name */}
            <div className="space-y-2">
              <Label htmlFor="field-name">
                Field Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="field-name"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="e.g., Equipment Serial Number"
                required
              />
              <p className="text-sm text-muted-foreground">
                The display name shown in forms and views
              </p>
            </div>

            {/* Field Key */}
            <div className="space-y-2">
              <Label htmlFor="field-key">
                Field Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="field-key"
                value={fieldKey}
                onChange={(e) => setFieldKey(e.target.value)}
                placeholder="e.g., equipment_serial_number"
                pattern="^[a-z][a-z0-9_]*$"
                required
                disabled={!!fieldId}
              />
              <p className="text-sm text-muted-foreground">
                Unique identifier (lowercase, underscores only). Cannot be changed after creation.
              </p>
            </div>

            {/* Field Type */}
            <div className="space-y-2">
              <Label htmlFor="field-type">
                Field Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={fieldType}
                onValueChange={(v) => setFieldType(v as FieldType)}
                disabled={!!fieldId}
              >
                <SelectTrigger id="field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldId && (
                <p className="text-sm text-muted-foreground">
                  Field type cannot be changed after creation
                </p>
              )}
            </div>

            {/* Required Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is-required">Required Field</Label>
                <p className="text-sm text-muted-foreground">
                  Users must provide a value for this field
                </p>
              </div>
              <Switch
                id="is-required"
                checked={isRequired}
                onCheckedChange={setIsRequired}
              />
            </div>

            {/* Field Configuration */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-4">Field Configuration</h4>
              <FieldConfigEditor
                fieldType={fieldType}
                config={fieldConfig}
                onChange={setFieldConfig}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {fieldId ? 'Update Field' : 'Create Field'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
