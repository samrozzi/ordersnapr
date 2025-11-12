import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import type { Field } from "./FormCanvas";
import { fieldTypes } from "./FieldPalette";
import { TableFieldEditor } from "./TableFieldEditor";

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
    if (open && field) {
      setEditedField({ ...field });
    }
  }, [open, field?.id]);

  if (!editedField) return null;

  const handleSave = () => {
    // Auto-generate key from label before saving
    const fieldWithKey = {
      ...editedField,
      key: generateKey(editedField.label),
    };
    onFieldUpdate(fieldWithKey);
    onOpenChange(false);
  };

  const generateKey = (label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  };

  const handleLabelChange = (label: string) => {
    setEditedField((prev) => (prev ? { ...prev, label } : prev));
  };

  const addOption = () => {
    setEditedField((prev) => (
      prev ? { ...prev, options: [...(prev.options || []), ""] } : prev
    ));
  };

  const updateOption = (index: number, value: string) => {
    setEditedField((prev) => {
      if (!prev) return prev;
      const options = [...(prev.options || [])];
      options[index] = value;
      return { ...prev, options };
    });
  };

  const removeOption = (index: number) => {
    setEditedField((prev) => {
      if (!prev) return prev;
      const options = (prev.options || []).filter((_, i) => i !== index);
      return { ...prev, options };
    });
  };

  const addResponseOption = () => {
    setEditedField((prev) => (
      prev ? { ...prev, responseOptions: [...(prev.responseOptions || []), ""] } : prev
    ));
  };

  const updateResponseOption = (index: number, value: string) => {
    setEditedField((prev) => {
      if (!prev) return prev;
      const responseOptions = [...(prev.responseOptions || [])];
      responseOptions[index] = value;
      return { ...prev, responseOptions };
    });
  };

  const removeResponseOption = (index: number) => {
    setEditedField((prev) => {
      if (!prev) return prev;
      const responseOptions = (prev.responseOptions || []).filter((_, i) => i !== index);
      return { ...prev, responseOptions };
    });
  };

  const fieldDef = fieldTypes.find((ft) => ft.type === editedField.type);
  const needsOptions = ["select", "radio", "checklist"].includes(editedField.type);
  const isRepeatingGroup = editedField.type === "repeating_group";
  const isTableLayout = editedField.type === "table_layout";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto" side="right" onKeyDownCapture={(e) => e.stopPropagation()}>
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
              <Label htmlFor="field-label">Label *</Label>
              <Input
                id="field-label"
                value={editedField.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="Field label text"
              />
            </div>

            {/* Placeholder */}
            <div className="space-y-2">
              <Label htmlFor="field-placeholder">Placeholder</Label>
              <Input
                id="field-placeholder"
                value={editedField.placeholder || ""}
                  onChange={(e) =>
                    setEditedField((prev) => (prev ? { ...prev, placeholder: e.target.value } : prev))
                  }
                placeholder="Placeholder hint text"
              />
            </div>

            {/* Hide Label */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="hideLabel">Hide Label</Label>
                <p className="text-xs text-muted-foreground">
                  Hide the label in form display
                </p>
              </div>
              <Switch
                id="hideLabel"
                checked={editedField.hideLabel || false}
                onCheckedChange={(checked) =>
                  setEditedField((prev) => (prev ? { ...prev, hideLabel: checked } : prev))
                }
              />
            </div>

            {/* Font Size Selector - Available for ALL field types */}
            <div className="space-y-2">
              <Label htmlFor="fontSize">Font Size</Label>
              <Select
                value={editedField.fontSize || "default"}
                onValueChange={(value) =>
                  setEditedField((prev) => (prev ? { ...prev, fontSize: value === "default" ? undefined : value } : prev))
                }
              >
                <SelectTrigger id="fontSize">
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="8pt">8pt</SelectItem>
                  <SelectItem value="9pt">9pt</SelectItem>
                  <SelectItem value="10pt">10pt</SelectItem>
                  <SelectItem value="11pt">11pt</SelectItem>
                  <SelectItem value="12pt">12pt</SelectItem>
                  <SelectItem value="14pt">14pt</SelectItem>
                  <SelectItem value="16pt">16pt</SelectItem>
                  <SelectItem value="18pt">18pt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Text Styling - Bold (Available for ALL field types) */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="boldText">Bold Text</Label>
                <p className="text-xs text-muted-foreground">
                  Display text in bold font weight
                </p>
              </div>
              <Switch
                id="boldText"
                checked={editedField.boldText || false}
                onCheckedChange={(checked) =>
                  setEditedField((prev) => (prev ? { ...prev, boldText: checked } : prev))
                }
              />
            </div>

            {/* Text Styling - Underline (Available for ALL field types) */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="underlineText">Underline Text</Label>
                <p className="text-xs text-muted-foreground">
                  Display text with underline decoration
                </p>
              </div>
              <Switch
                id="underlineText"
                checked={editedField.underlineText || false}
                onCheckedChange={(checked) =>
                  setEditedField((prev) => (prev ? { ...prev, underlineText: checked } : prev))
                }
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

            {/* Options for select and radio */}
            {needsOptions && editedField.type !== "checklist" && (
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

            {/* Repeating Group Configuration */}
            {isRepeatingGroup && (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">
                    Repeating groups allow users to dynamically add multiple entries with the same fields.
                    Configure min/max instances below.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor="minInstances">Min Instances</Label>
                      <Input
                        id="minInstances"
                        type="number"
                        value={(editedField as any).minInstances || 1}
                        onChange={(e) =>
                          setEditedField((prev) => (
                            prev ? { ...prev, minInstances: parseInt(e.target.value) || 1 } : prev
                          ))
                        }
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxInstances">Max Instances</Label>
                      <Input
                        id="maxInstances"
                        type="number"
                        value={(editedField as any).maxInstances || 20}
                        onChange={(e) =>
                          setEditedField((prev) => (
                            prev ? { ...prev, maxInstances: parseInt(e.target.value) || 20 } : prev
                          ))
                        }
                        min="1"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Alternating Background Toggle */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="alternatingBackground">Alternating Background</Label>
                    <p className="text-xs text-muted-foreground">
                      Apply subtle alternating backgrounds to entries in PDF/DOCX
                    </p>
                  </div>
                  <Switch
                    id="alternatingBackground"
                    checked={(editedField as any).alternatingBackground || false}
                    onCheckedChange={(checked) =>
                      setEditedField((prev) => (
                        prev ? { ...prev, alternatingBackground: checked } : prev
                      ))
                    }
                  />
                </div>
                
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Adding Sub-fields
                  </p>
                  <p className="text-xs text-muted-foreground">
                    To add fields to this repeating group, simply <strong>drag any field from the palette</strong> and drop it onto this repeating group container in the canvas. You can also drag existing fields into the group.
                  </p>
                </div>
              </div>
            )}

            {/* Table Layout Configuration */}
            {isTableLayout && (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">
                    Create a table to organize fields into rows and columns. Fields can be arranged side-by-side for compact layouts.
                  </p>
                </div>
                <TableFieldEditor
                  field={editedField}
                  onFieldUpdate={(updatedField) => setEditedField(updatedField)}
                />
              </div>
            )}

            {/* Checklist specific - Questions AND Response Options */}
            {editedField.type === "checklist" && (
              <div className="space-y-6">
                {/* Questions Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Questions/Items</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOption}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Question
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    These are the questions or items that appear on the left side of each row
                  </p>
                  <div className="space-y-2">
                    {(editedField.options || []).map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Question ${index + 1}`}
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
                        No questions yet. Click "Add Question" to create one.
                      </p>
                    )}
                  </div>
                </div>

                {/* Response Options Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Response Options</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addResponseOption}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Response Option
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    These are the answer choices that appear as buttons on the right (e.g., OK, DEV, N/A)
                  </p>
                  <div className="space-y-2">
                    {(editedField.responseOptions || []).map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={option}
                          onChange={(e) => updateResponseOption(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeResponseOption(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!editedField.responseOptions || editedField.responseOptions.length === 0) && (
                      <p className="text-xs text-muted-foreground">
                        No response options yet. Click "Add Response Option" to create one.
                      </p>
                    )}
                  </div>
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
                  setEditedField((prev) => (prev ? { ...prev, required: checked } : prev))
                }
              />
            </div>

            {/* Text/Textarea Length */}
            {(editedField.type === "text" || editedField.type === "textarea") && (
              <div className="space-y-2">
                <Label htmlFor="maxLength">Max Length (characters)</Label>
                <Input
                  id="maxLength"
                  type="number"
                  value={editedField.maxLength || ""}
                  onChange={(e) =>
                    setEditedField((prev) => (
                      prev ? { ...prev, maxLength: parseInt(e.target.value) || undefined } : prev
                    ))
                  }
                  placeholder="e.g. 100"
                  min="1"
                />
              </div>
            )}

            {/* Number Min/Max */}
            {editedField.type === "number" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="min">Minimum Value</Label>
                  <Input
                    id="min"
                    type="number"
                    value={editedField.min ?? ""}
                    onChange={(e) =>
                      setEditedField((prev) => (
                        prev ? { ...prev, min: e.target.value ? parseInt(e.target.value) : undefined } : prev
                      ))
                    }
                    placeholder="e.g. 0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max">Maximum Value</Label>
                  <Input
                    id="max"
                    type="number"
                    value={editedField.max ?? ""}
                    onChange={(e) =>
                      setEditedField((prev) => (
                        prev ? { ...prev, max: e.target.value ? parseInt(e.target.value) : undefined } : prev
                      ))
                    }
                    placeholder="e.g. 100"
                  />
                </div>
              </>
            )}

            {/* File restrictions (for file upload) */}
            {editedField.type === "file" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="maxFiles">Max Number of Files</Label>
                  <Input
                    id="maxFiles"
                    type="number"
                    value={editedField.maxFiles || 10}
                    onChange={(e) =>
                      setEditedField((prev) => (
                        prev ? { ...prev, maxFiles: parseInt(e.target.value) || 10 } : prev
                      ))
                    }
                    placeholder="e.g. 5"
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fileTypes">Allowed File Types</Label>
                  <Input
                    id="fileTypes"
                    value={(editedField.accept || []).join(", ")}
                    onChange={(e) =>
                      setEditedField((prev) => (
                        prev
                          ? {
                              ...prev,
                              accept: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            }
                          : prev
                      ))
                    }
                    placeholder="e.g. .jpg, .png, .pdf"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowCaptions">Allow Captions</Label>
                    <p className="text-xs text-muted-foreground">
                      Let users add captions to uploaded files
                    </p>
                  </div>
                  <Switch
                    id="allowCaptions"
                    checked={editedField.allowCaptions || false}
                    onCheckedChange={(checked) =>
                      setEditedField((prev) => (prev ? { ...prev, allowCaptions: checked } : prev))
                    }
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
