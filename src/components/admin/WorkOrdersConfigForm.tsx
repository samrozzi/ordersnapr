import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WorkOrdersConfig {
  display_name?: string;
  types?: string[];
  statuses?: string[];
  required_fields?: string[];
  custom_fields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'date';
    options?: string[];
  }>;
}

interface WorkOrdersConfigFormProps {
  config: WorkOrdersConfig;
  onSave: (config: WorkOrdersConfig) => void;
}

const AVAILABLE_FIELDS = [
  'title', 'customer', 'type', 'status', 'scheduled_date', 
  'assigned_to', 'address', 'notes'
];

const DEFAULT_TYPES = ['Install', 'Service', 'Estimate', 'Repair'];
const DEFAULT_STATUSES = ['New', 'Scheduled', 'In Progress', 'Complete', 'Cancelled'];

export function WorkOrdersConfigForm({ config, onSave }: WorkOrdersConfigFormProps) {
  const [displayName, setDisplayName] = useState(config.display_name || 'Jobs');
  const [types, setTypes] = useState<string[]>(config.types || DEFAULT_TYPES);
  const [statuses, setStatuses] = useState<string[]>(config.statuses || DEFAULT_STATUSES);
  const [requiredFields, setRequiredFields] = useState<string[]>(config.required_fields || ['title', 'customer']);
  const [customFields, setCustomFields] = useState<WorkOrdersConfig['custom_fields']>(config.custom_fields || []);
  const [newType, setNewType] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const addType = () => {
    if (newType.trim() && !types.includes(newType.trim())) {
      setTypes([...types, newType.trim()]);
      setNewType('');
    }
  };

  const addStatus = () => {
    if (newStatus.trim() && !statuses.includes(newStatus.trim())) {
      setStatuses([...statuses, newStatus.trim()]);
      setNewStatus('');
    }
  };

  const addCustomField = () => {
    setCustomFields([
      ...(customFields || []),
      { key: '', label: '', type: 'text' }
    ]);
  };

  const updateCustomField = (index: number, field: Partial<WorkOrdersConfig['custom_fields'][0]>) => {
    const updated = [...(customFields || [])];
    updated[index] = { ...updated[index], ...field };
    setCustomFields(updated);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields?.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({
      display_name: displayName,
      types,
      statuses,
      required_fields: requiredFields,
      custom_fields: customFields?.filter(f => f.key && f.label),
    });
  };

  return (
    <div className="space-y-6">
      {/* Display Name */}
      <div className="space-y-2">
        <Label>Display Name</Label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Jobs"
        />
        <p className="text-xs text-muted-foreground">
          This name will appear in the navigation menu
        </p>
      </div>

      {/* Types */}
      <div className="space-y-2">
        <Label>Job Types</Label>
        <div className="flex gap-2 flex-wrap">
          {types.map((type) => (
            <Badge key={type} variant="secondary" className="gap-1">
              {type}
              <button
                onClick={() => setTypes(types.filter((t) => t !== type))}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addType()}
            placeholder="Add new type..."
          />
          <Button type="button" onClick={addType} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Statuses */}
      <div className="space-y-2">
        <Label>Statuses</Label>
        <div className="flex gap-2 flex-wrap">
          {statuses.map((status) => (
            <Badge key={status} variant="outline" className="gap-1">
              {status}
              <button
                onClick={() => setStatuses(statuses.filter((s) => s !== status))}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addStatus()}
            placeholder="Add new status..."
          />
          <Button type="button" onClick={addStatus} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Required Fields */}
      <div className="space-y-2">
        <Label>Required Fields</Label>
        <div className="flex gap-2 flex-wrap">
          {AVAILABLE_FIELDS.map((field) => (
            <Badge
              key={field}
              variant={requiredFields.includes(field) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() =>
                setRequiredFields(
                  requiredFields.includes(field)
                    ? requiredFields.filter((f) => f !== field)
                    : [...requiredFields, field]
                )
              }
            >
              {field.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      </div>

      {/* Custom Fields */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Custom Fields</Label>
          <Button type="button" onClick={addCustomField} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>
        <div className="space-y-2">
          {customFields?.map((field, index) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="flex gap-2 items-start">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    <Input
                      placeholder="key"
                      value={field.key}
                      onChange={(e) => updateCustomField(index, { key: e.target.value })}
                    />
                    <Input
                      placeholder="Label"
                      value={field.label}
                      onChange={(e) => updateCustomField(index, { label: e.target.value })}
                    />
                    <Select
                      value={field.type}
                      onValueChange={(value) => updateCustomField(index, { type: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomField(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} className="w-full">
        Save Configuration
      </Button>
    </div>
  );
}
