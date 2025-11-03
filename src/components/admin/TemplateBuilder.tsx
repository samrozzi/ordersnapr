import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Field {
  id: string;
  type: string;
  label: string;
  key: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  items?: Array<{ label: string }>;
}

interface Section {
  id: string;
  title: string;
  fields: Field[];
  collapsed?: boolean;
}

interface TemplateBuilderProps {
  schema: any;
  onSchemaChange: (schema: any) => void;
  initialSchema?: any;
}

export const TemplateBuilder = ({ schema, onSchemaChange, initialSchema }: TemplateBuilderProps) => {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>(
    initialSchema?.sections || [
      {
        id: crypto.randomUUID(),
        title: "Section 1",
        fields: [],
      },
    ]
  );

  const [requireSignature, setRequireSignature] = useState(initialSchema?.require_signature || false);

  // Auto-update parent schema when local state changes
  const updateParentSchema = (newSections: Section[], newRequireSignature: boolean) => {
    const newSchema = {
      sections: newSections.map((s) => ({
        title: s.title,
        fields: s.fields.map((f) => {
          const baseField: any = {
            type: f.type,
            label: f.label,
            key: f.key,
            required: f.required,
          };

          if (f.placeholder) baseField.placeholder = f.placeholder;
          if (f.options && f.options.length > 0) baseField.options = f.options;
          if (f.type === "checklist" && f.items) baseField.items = f.items;

          return baseField;
        }),
      })),
      require_signature: newRequireSignature,
    };
    onSchemaChange(newSchema);
  };

  const addSection = () => {
    const newSections = [
      ...sections,
      {
        id: crypto.randomUUID(),
        title: `Section ${sections.length + 1}`,
        fields: [],
      },
    ];
    setSections(newSections);
    updateParentSchema(newSections, requireSignature);
  };

  const removeSection = (sectionId: string) => {
    const newSections = sections.filter((s) => s.id !== sectionId);
    setSections(newSections);
    updateParentSchema(newSections, requireSignature);
  };

  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    const newSections = sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s));
    setSections(newSections);
    updateParentSchema(newSections, requireSignature);
  };

  const toggleSectionCollapse = (sectionId: string) => {
    setSections(
      sections.map((s) => (s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s))
    );
  };

  const addField = (sectionId: string) => {
    const newSections = sections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            fields: [
              ...s.fields,
              {
                id: crypto.randomUUID(),
                type: "text",
                label: "New Field",
                key: `field_${s.fields.length + 1}`,
                required: false,
              },
            ],
          }
        : s
    );
    setSections(newSections);
    updateParentSchema(newSections, requireSignature);
  };

  const removeField = (sectionId: string, fieldId: string) => {
    const newSections = sections.map((s) =>
      s.id === sectionId ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) } : s
    );
    setSections(newSections);
    updateParentSchema(newSections, requireSignature);
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<Field>) => {
    const newSections = sections.map((s) =>
      s.id === sectionId
        ? { ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)) }
        : s
    );
    setSections(newSections);
    updateParentSchema(newSections, requireSignature);
  };

  const generateKey = (label: string) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Template Builder</h3>
        <div className="flex items-center gap-2">
          <Label htmlFor="signature-toggle">Require Signature</Label>
          <Switch
            id="signature-toggle"
            checked={requireSignature}
            onCheckedChange={(checked) => {
              setRequireSignature(checked);
              updateParentSchema(sections, checked);
            }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <Card key={section.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                <Input
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  className="font-semibold flex-1"
                  placeholder="Section Title"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSectionCollapse(section.id)}
                >
                  {section.collapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSection(section.id)}
                  disabled={sections.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {!section.collapsed && (
              <CardContent className="space-y-4">
                {section.fields.map((field) => (
                  <Card key={field.id} className="bg-muted/30">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab mt-2" />
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Field Type</Label>
                              <Select
                                value={field.type}
                                onValueChange={(value) =>
                                  updateField(section.id, field.id, { type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="textarea">Text Area</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="select">Select</SelectItem>
                                  <SelectItem value="radio">Radio</SelectItem>
                                  <SelectItem value="checkbox">Checkbox</SelectItem>
                                  <SelectItem value="checklist">Checklist</SelectItem>
                                  <SelectItem value="file">File Upload</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <Label>Required</Label>
                                <div className="flex items-center h-10">
                                  <Switch
                                    checked={field.required}
                                    onCheckedChange={(checked) =>
                                      updateField(section.id, field.id, { required: checked })
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <Label>Field Label</Label>
                            <Input
                              value={field.label}
                              onChange={(e) => {
                                const newLabel = e.target.value;
                                updateField(section.id, field.id, {
                                  label: newLabel,
                                  key: generateKey(newLabel),
                                });
                              }}
                              placeholder="e.g., Customer Name"
                            />
                          </div>

                          <div>
                            <Label>Field Key (auto-generated)</Label>
                            <Input value={field.key} disabled className="bg-muted" />
                          </div>

                          {field.type !== "checklist" && field.type !== "file" && (
                            <div>
                              <Label>Placeholder (optional)</Label>
                              <Input
                                value={field.placeholder || ""}
                                onChange={(e) =>
                                  updateField(section.id, field.id, {
                                    placeholder: e.target.value,
                                  })
                                }
                                placeholder="Enter placeholder text"
                              />
                            </div>
                          )}

                          {(field.type === "select" ||
                            field.type === "radio" ||
                            field.type === "checkbox") && (
                            <div>
                              <Label>Options (comma-separated)</Label>
                              <Input
                                value={(field.options || []).join(", ")}
                                onChange={(e) =>
                                  updateField(section.id, field.id, {
                                    options: e.target.value.split(",").map((o) => o.trim()),
                                  })
                                }
                                placeholder="Option 1, Option 2, Option 3"
                              />
                            </div>
                          )}

                          {field.type === "checklist" && (
                            <div>
                              <Label>Checklist Items (one per line)</Label>
                              <Textarea
                                value={(field.items || []).map((i) => i.label).join("\n")}
                                onChange={(e) => {
                                  const items = e.target.value
                                    .split("\n")
                                    .filter((line) => line.trim())
                                    .map((label) => ({ label: label.trim() }));
                                  updateField(section.id, field.id, { items });
                                }}
                                placeholder="Item 1&#10;Item 2&#10;Item 3"
                                rows={5}
                              />
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeField(section.id, field.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addField(section.id)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={addSection} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Section
      </Button>
    </div>
  );
};
