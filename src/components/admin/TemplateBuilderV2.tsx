import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Plus } from "lucide-react";
import { FieldPalette, type FieldType } from "./FieldPalette";
import { FormCanvas, type Section, type Field } from "./FormCanvas";
import { FieldPropertiesPanel } from "./FieldPropertiesPanel";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { toast } from "sonner";

interface TemplateBuilderV2Props {
  schema: any;
  onSchemaChange: (schema: any) => void;
}

export function TemplateBuilderV2({ schema, onSchemaChange }: TemplateBuilderV2Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [requireSignature, setRequireSignature] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedField, setSelectedField] = useState<{
    sectionId: string;
    fieldId: string;
  } | null>(null);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);

  const generateKey = useCallback((label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  }, []);

  // Load initial schema
  useEffect(() => {
    if (schema?.sections) {
      const loadedSections: Section[] = schema.sections.map((s: any) => ({
        id: s.id || crypto.randomUUID(),
        title: s.title || "Untitled Section",
        collapsed: false,
        fields: (s.fields || []).map((f: any) => ({
          id: f.id || crypto.randomUUID(),
          key: f.key || generateKey(f.label || "untitled_field"),
          type: f.type || "text",
          label: f.label || "Untitled Field",
          placeholder: f.placeholder,
          required: f.required || false,
          options: f.options,
          maxLength: f.maxLength,
          min: f.min,
          max: f.max,
          accept: f.accept,
          maxFiles: f.maxFiles,
          allowCaptions: f.allowCaptions,
          default: f.default,
          hideLabel: f.hideLabel || false,
        })),
      }));
      setSections(loadedSections);
    }

    if (schema?.requireSignature) {
      setRequireSignature(true);
    }
  }, [schema, generateKey]);

  // Update parent schema when sections change
  useEffect(() => {
    if (sections.length === 0 && !requireSignature) return; // Don't update on initial empty state
    
    const newSchema = {
      sections: sections.map((s) => ({
        id: s.id,
        title: s.title,
        fields: s.fields.map((f) => ({
          id: f.id,
          key: f.key,
          type: f.type,
          label: f.label,
          placeholder: f.placeholder,
          required: f.required,
          options: f.options,
          maxLength: f.maxLength,
          min: f.min,
          max: f.max,
          accept: f.accept,
          maxFiles: f.maxFiles,
          allowCaptions: f.allowCaptions,
          default: f.default,
          hideLabel: f.hideLabel,
        })),
      })),
      requireSignature,
    };
    onSchemaChange(newSchema);
  }, [sections, requireSignature, onSchemaChange]);

  const handleAddSection = () => {
    const newSection: Section = {
      id: crypto.randomUUID(),
      title: "New Section",
      fields: [],
      collapsed: false,
    };
    setSections([...sections, newSection]);
  };

  const handleFieldSelect = (type: FieldType) => {
    if (sections.length === 0) {
      // Auto-create first section
      const newSection: Section = {
        id: crypto.randomUUID(),
        title: "Section 1",
        fields: [],
        collapsed: false,
      };
      setSections([newSection]);
      setTargetSectionId(newSection.id);
    }

    // Determine which section to add the field to
    const targetId = targetSectionId || sections[sections.length - 1]?.id;
    if (!targetId) return;

    const label = `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`;
    const newField: Field = {
      id: crypto.randomUUID(),
      key: generateKey(label),
      type,
      label,
      placeholder: "",
      required: false,
      options: type === "select" || type === "radio" || type === "checklist" ? ["Option 1"] : undefined,
    };

    setSections((prev) =>
      prev.map((section) =>
        section.id === targetId
          ? { ...section, fields: [...section.fields, newField] }
          : section
      )
    );

    toast.success("Field added");
  };

  const handleFieldClick = (sectionId: string, fieldId: string) => {
    setSelectedField({ sectionId, fieldId });
    setPropertiesPanelOpen(true);
  };

  const handleFieldUpdate = (updatedField: Field) => {
    if (!selectedField) return;

    setSections((prev) =>
      prev.map((section) =>
        section.id === selectedField.sectionId
          ? {
              ...section,
              fields: section.fields.map((f) =>
                f.id === selectedField.fieldId ? updatedField : f
              ),
            }
          : section
      )
    );

    toast.success("Field updated");
  };

  const currentField = selectedField
    ? sections
        .find((s) => s.id === selectedField.sectionId)
        ?.fields.find((f) => f.id === selectedField.fieldId) || null
    : null;

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="signature"
              checked={requireSignature}
              onCheckedChange={setRequireSignature}
            />
            <Label htmlFor="signature" className="text-sm">
              Require Signature
            </Label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? "Builder" : "Preview"}
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      {!previewMode ? (
        <div className="grid grid-cols-12 gap-4">
          {/* Left: Field Palette */}
          <div className="col-span-12 md:col-span-3 lg:col-span-2 space-y-4">
            {sections.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Add Field To:</Label>
                <Select
                  value={targetSectionId || sections[sections.length - 1]?.id || ""}
                  onValueChange={setTargetSectionId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <FieldPalette onFieldSelect={handleFieldSelect} />
          </div>

          {/* Center: Canvas */}
          <div className="col-span-12 md:col-span-9 lg:col-span-10">
            <FormCanvas
              sections={sections}
              onSectionsChange={setSections}
              onFieldClick={handleFieldClick}
              onAddSection={handleAddSection}
            />
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border bg-card p-6">
            <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground text-center">
                Preview Mode - Form submission is disabled
              </p>
            </div>
            <FormRenderer
              template={{
                id: "preview",
                org_id: null,
                is_global: false,
                name: "Form Preview",
                slug: "preview",
                category: null,
                is_active: true,
                version: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                schema: {
                  sections: sections.map((s) => ({
                    id: s.id,
                    title: s.title,
                    fields: s.fields.map((f) => ({
                      id: f.id,
                      key: f.key,
                      type: f.type,
                      label: f.label,
                      placeholder: f.placeholder,
                      required: f.required,
                      options: f.options,
                      maxLength: f.maxLength,
                      min: f.min,
                      max: f.max,
                      accept: f.accept,
                      maxFiles: f.maxFiles,
                      allowCaptions: f.allowCaptions,
                      default: f.default,
                      hideLabel: f.hideLabel,
                    })),
                  })),
                  require_signature: requireSignature,
                },
              }}
              previewMode={true}
              onSuccess={() => {}}
              onCancel={() => setPreviewMode(false)}
            />
          </div>
        </div>
      )}

      {/* Field Properties Panel */}
      <FieldPropertiesPanel
        open={propertiesPanelOpen}
        field={currentField}
        onOpenChange={setPropertiesPanelOpen}
        onFieldUpdate={handleFieldUpdate}
      />
    </div>
  );
}
