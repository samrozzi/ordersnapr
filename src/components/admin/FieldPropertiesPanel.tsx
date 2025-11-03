import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { Field } from "./FormCanvas";
import { fieldTypes } from "./FieldPalette";

interface FieldPropertiesPanelProps {
  open: boolean;
  field: Field | null;
  onOpenChange: (open: boolean) => void;
  onFieldUpdate: (field: Field) => void;
}

export function FieldPropertiesPanel({
  open,
  field,
  onOpenChange,
  onFieldUpdate,
}: FieldPropertiesPanelProps) {
  const [editedField, setEditedField] = useState<Field | null>(null);

  useEffect(() => {
    if (field) {
      setEditedField({ ...field });
    }
  }, [field]);

  if (!editedField) return null;

  const handleSave = () => {
    onFieldUpdate(editedField);
    onOpenChange(false);
  };

  const generateKey = (label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  };

  const handleLabelChange = (label: string) => {
    setEditedField({ ...editedField, label });
  };

  const addOption = () => {
    const options = editedField.options || [];
    setEditedField({ ...editedField, options: [...options, ""] });
  };

  const updateOption = (index: number, value: string) => {
    const options = [...(editedField.options || [])];
    options[index] = value;
    setEditedField({ ...editedField, options });
  };

  const removeOption = (index: number) => {
    const options = (editedField.options || []).filter((_, i) => i !== index);
    setEditedField({ ...editedField, options });
  };

  const fieldDef = fieldTypes.find((ft) => ft.type === editedField.type);
  const needsOptions = ["select", "radio", "checklist"].includes(editedField.type);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle>Field Settings</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="settings" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4 mt-4">
            {/* Field Type */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Field Type</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                {fieldDef && (
                  <>
                    <fieldDef.icon className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{fieldDef.label}</span>
                  </>
                )}
              </div>
            </div>

            {/* Label */}
            <div className="space-y-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                value={editedField.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="e.g. Customer Name"
              />
            </div>

            {/* Placeholder */}
            <div className="space-y-2">
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input
                id="placeholder"
                value={editedField.placeholder || ""}
                onChange={(e) =>
                  setEditedField({ ...editedField, placeholder: e.target.value })
                }
                placeholder="e.g. Enter customer name"
              />
            </div>

            {/* Field Key (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="key" className="text-xs text-muted-foreground">
                Field Key (auto-generated)
              </Label>
              <Input
                id="key"
                value={generateKey(editedField.label)}
                readOnly
                className="bg-muted"
              />
            </div>

            {/* Options (for select, radio, checklist) */}
            {needsOptions && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Options</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editedField.options || []).map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(!editedField.options || editedField.options.length === 0) && (
                    <p className="text-xs text-muted-foreground">
                      No options yet. Click "Add Option" to create one.
                    </p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="validation" className="space-y-4 mt-4">
            {/* Required */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="required">Required Field</Label>
                <p className="text-xs text-muted-foreground">
                  User must fill this field before submitting
                </p>
              </div>
              <Switch
                id="required"
                checked={editedField.required}
                onCheckedChange={(checked) =>
                  setEditedField({ ...editedField, required: checked })
                }
              />
            </div>

            {/* File restrictions (for file upload) */}
            {editedField.type === "file" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="maxSize">Max File Size (MB)</Label>
                  <Input
                    id="maxSize"
                    type="number"
                    placeholder="e.g. 5"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fileTypes">Allowed File Types</Label>
                  <Input
                    id="fileTypes"
                    placeholder="e.g. .jpg, .png, .pdf"
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-6 mt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} className="flex-1">
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
