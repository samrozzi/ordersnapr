/**
 * FieldConfigEditor - Dynamic configuration editor for different field types
 * Renders appropriate config inputs based on field type
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { FieldType } from '@/types/custom-fields';
import { Plus, X } from 'lucide-react';

interface FieldConfigEditorProps {
  fieldType: FieldType;
  config: any;
  onChange: (config: any) => void;
}

export function FieldConfigEditor({ fieldType, config, onChange }: FieldConfigEditorProps) {
  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  // Text, Email, Phone, URL fields
  if (['text', 'email', 'phone', 'url'].includes(fieldType)) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="placeholder">Placeholder Text</Label>
          <Input
            id="placeholder"
            value={config.placeholder || ''}
            onChange={(e) => updateConfig('placeholder', e.target.value)}
            placeholder="e.g., Enter value..."
          />
        </div>

        {fieldType === 'text' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="maxLength">Maximum Length</Label>
              <Input
                id="maxLength"
                type="number"
                value={config.maxLength || ''}
                onChange={(e) => updateConfig('maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g., 100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pattern">Validation Pattern (Regex)</Label>
              <Input
                id="pattern"
                value={config.pattern || ''}
                onChange={(e) => updateConfig('pattern', e.target.value)}
                placeholder="e.g., ^[A-Z0-9]+$"
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="helpText">Help Text</Label>
          <Textarea
            id="helpText"
            value={config.helpText || ''}
            onChange={(e) => updateConfig('helpText', e.target.value)}
            placeholder="Additional guidance for users"
            rows={2}
          />
        </div>
      </div>
    );
  }

  // Textarea field
  if (fieldType === 'textarea') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="placeholder">Placeholder Text</Label>
          <Input
            id="placeholder"
            value={config.placeholder || ''}
            onChange={(e) => updateConfig('placeholder', e.target.value)}
            placeholder="e.g., Enter description..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rows">Number of Rows</Label>
          <Input
            id="rows"
            type="number"
            min="2"
            max="20"
            value={config.rows || 4}
            onChange={(e) => updateConfig('rows', parseInt(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxLength">Maximum Length</Label>
          <Input
            id="maxLength"
            type="number"
            value={config.maxLength || ''}
            onChange={(e) => updateConfig('maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="e.g., 500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="helpText">Help Text</Label>
          <Textarea
            id="helpText"
            value={config.helpText || ''}
            onChange={(e) => updateConfig('helpText', e.target.value)}
            placeholder="Additional guidance for users"
            rows={2}
          />
        </div>
      </div>
    );
  }

  // Number field
  if (fieldType === 'number') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="min">Minimum Value</Label>
            <Input
              id="min"
              type="number"
              value={config.min ?? ''}
              onChange={(e) => updateConfig('min', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="e.g., 0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max">Maximum Value</Label>
            <Input
              id="max"
              type="number"
              value={config.max ?? ''}
              onChange={(e) => updateConfig('max', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="e.g., 100"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="step">Step Increment</Label>
          <Input
            id="step"
            type="number"
            step="any"
            value={config.step ?? ''}
            onChange={(e) => updateConfig('step', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="e.g., 1 or 0.01"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">Display Unit</Label>
          <Input
            id="unit"
            value={config.unit || ''}
            onChange={(e) => updateConfig('unit', e.target.value)}
            placeholder="e.g., kg, hours, miles"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="helpText">Help Text</Label>
          <Textarea
            id="helpText"
            value={config.helpText || ''}
            onChange={(e) => updateConfig('helpText', e.target.value)}
            placeholder="Additional guidance for users"
            rows={2}
          />
        </div>
      </div>
    );
  }

  // Date/DateTime fields
  if (['date', 'datetime'].includes(fieldType)) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minDate">Minimum Date</Label>
            <Input
              id="minDate"
              type={fieldType === 'datetime' ? 'datetime-local' : 'date'}
              value={config.minDate || ''}
              onChange={(e) => updateConfig('minDate', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxDate">Maximum Date</Label>
            <Input
              id="maxDate"
              type={fieldType === 'datetime' ? 'datetime-local' : 'date'}
              value={config.maxDate || ''}
              onChange={(e) => updateConfig('maxDate', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="helpText">Help Text</Label>
          <Textarea
            id="helpText"
            value={config.helpText || ''}
            onChange={(e) => updateConfig('helpText', e.target.value)}
            placeholder="Additional guidance for users"
            rows={2}
          />
        </div>
      </div>
    );
  }

  // Dropdown field
  if (fieldType === 'dropdown') {
    const options = config.options || [];

    const addOption = () => {
      const newOptions = [...options, { label: '', value: '' }];
      updateConfig('options', newOptions);
    };

    const updateOption = (index: number, field: 'label' | 'value', value: string) => {
      const newOptions = [...options];
      newOptions[index] = { ...newOptions[index], [field]: value };
      updateConfig('options', newOptions);
    };

    const removeOption = (index: number) => {
      const newOptions = options.filter((_: any, i: number) => i !== index);
      updateConfig('options', newOptions);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Multiple Selection</Label>
            <p className="text-sm text-muted-foreground">Allow selecting multiple options</p>
          </div>
          <Switch
            checked={config.multiple || false}
            onCheckedChange={(checked) => updateConfig('multiple', checked)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Options</Label>
            <Button type="button" variant="outline" size="sm" onClick={addOption}>
              <Plus className="h-4 w-4 mr-1" />
              Add Option
            </Button>
          </div>

          <div className="space-y-2">
            {options.map((option: any, index: number) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Label (shown to users)"
                  value={option.label}
                  onChange={(e) => updateOption(index, 'label', e.target.value)}
                />
                <Input
                  placeholder="Value (stored in database)"
                  value={option.value}
                  onChange={(e) => updateOption(index, 'value', e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {options.length === 0 && (
            <p className="text-sm text-muted-foreground text-center p-4 border-2 border-dashed rounded">
              No options defined. Click "Add Option" to create dropdown choices.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="helpText">Help Text</Label>
          <Textarea
            id="helpText"
            value={config.helpText || ''}
            onChange={(e) => updateConfig('helpText', e.target.value)}
            placeholder="Additional guidance for users"
            rows={2}
          />
        </div>
      </div>
    );
  }

  // Checkbox field
  if (fieldType === 'checkbox') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="label">Checkbox Label</Label>
          <Input
            id="label"
            value={config.label || ''}
            onChange={(e) => updateConfig('label', e.target.value)}
            placeholder="e.g., I agree to the terms"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="helpText">Help Text</Label>
          <Textarea
            id="helpText"
            value={config.helpText || ''}
            onChange={(e) => updateConfig('helpText', e.target.value)}
            placeholder="Additional guidance for users"
            rows={2}
          />
        </div>
      </div>
    );
  }

  // File field
  if (fieldType === 'file') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="acceptedTypes">Accepted File Types</Label>
          <Input
            id="acceptedTypes"
            value={config.acceptedTypes || ''}
            onChange={(e) => updateConfig('acceptedTypes', e.target.value)}
            placeholder="e.g., .pdf,.doc,.docx or image/*"
          />
          <p className="text-sm text-muted-foreground">
            Comma-separated file extensions or MIME types
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxSize">Maximum File Size (MB)</Label>
          <Input
            id="maxSize"
            type="number"
            min="1"
            value={config.maxSize || ''}
            onChange={(e) => updateConfig('maxSize', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="e.g., 10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="helpText">Help Text</Label>
          <Textarea
            id="helpText"
            value={config.helpText || ''}
            onChange={(e) => updateConfig('helpText', e.target.value)}
            placeholder="Additional guidance for users"
            rows={2}
          />
        </div>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">No additional configuration needed for this field type.</p>
  );
}
