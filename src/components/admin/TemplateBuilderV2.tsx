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
  const [useOrgTheme, setUseOrgTheme] = useState(false);
  const [alternatingBackground, setAlternatingBackground] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedField, setSelectedField] = useState<{
    sectionId: string;
    fieldId: string;
    parentFieldId?: string;
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
        hideTitle: s.hideTitle ?? false,
        fields: (s.fields || []).map((f: any) => ({
          id: f.id || crypto.randomUUID(),
          key: f.key || generateKey(f.label || "untitled_field"),
          type: f.type === 'job_lookup' ? 'text' : (f.type || "text"),
          label: f.label || "Untitled Field",
          placeholder: f.placeholder,
          required: f.required || false,
          options: f.options || f.items,
          items: f.items,
          responseOptions: f.responseOptions || (f.type === "checklist" ? ["OK", "DEV", "N/A"] : undefined),
          maxLength: f.maxLength,
          min: f.min,
          max: f.max,
          accept: f.accept,
          maxFiles: f.maxFiles,
          allowCaptions: f.allowCaptions,
          default: f.default,
          hideLabel: f.hideLabel ?? false,
          boldText: f.boldText ?? false,
          underlineText: f.underlineText ?? false,
          fields: (f.fields || []).map((sf: any) => ({
            id: sf.id || crypto.randomUUID(),
            key: sf.key || generateKey(sf.label || "untitled_field"),
            type: sf.type || "text",
            label: sf.label || "Untitled Field",
            placeholder: sf.placeholder,
            required: sf.required || false,
            options: sf.options,
            maxLength: sf.maxLength,
            min: sf.min,
            max: sf.max,
            hideLabel: sf.hideLabel ?? false,
            boldText: sf.boldText ?? false,
            underlineText: sf.underlineText ?? false,
          })),
          minInstances: f.minInstances,
          maxInstances: f.maxInstances,
        })),
      }));
      setSections(loadedSections);
    }

    if (schema?.requireSignature || schema?.require_signature) {
      setRequireSignature(true);
    }
    
    if (schema?.useOrgTheme || schema?.use_org_theme) {
      setUseOrgTheme(true);
    }
    if (schema?.alternatingBackground || schema?.alternating_background) {
      setAlternatingBackground(true);
    }
  }, [schema, generateKey]);

  // Update parent schema when sections change
  useEffect(() => {
    if (sections.length === 0 && !requireSignature) return; // Don't update on initial empty state
    
    const newSchema = {
      sections: sections.map((s) => ({
        id: s.id,
        title: s.title,
        hideTitle: s.hideTitle,
        fields: s.fields.map((f) => ({
          id: f.id,
          key: f.key,
          type: f.type,
          label: f.label,
          placeholder: f.placeholder,
          required: f.required,
          options: f.options,
          items: f.items, // Preserve items for backwards compatibility
          responseOptions: f.responseOptions, // Save response options
          maxLength: f.maxLength,
          min: f.min,
          max: f.max,
          accept: f.accept,
          maxFiles: f.maxFiles,
          allowCaptions: f.allowCaptions,
          default: f.default,
          hideLabel: f.hideLabel ?? false, // Default to false if missing
          boldText: f.boldText ?? false,
          underlineText: f.underlineText ?? false,
          fields: f.fields ? f.fields.map((sf: any) => ({
            id: sf.id || crypto.randomUUID(),
            key: sf.key || generateKey(sf.label || "untitled_field"),
            type: sf.type || "text",
            label: sf.label || "Untitled Field",
            placeholder: sf.placeholder,
            required: sf.required || false,
            options: sf.options,
            maxLength: sf.maxLength,
            min: sf.min,
            max: sf.max,
            hideLabel: sf.hideLabel ?? false,
            boldText: sf.boldText ?? false,
            underlineText: sf.underlineText ?? false,
          })) : undefined,
          minInstances: (f as any).minInstances,
          maxInstances: (f as any).maxInstances,
        })),
      })),
      require_signature: requireSignature, // Use snake_case for consistency
      requireSignature, // Keep both for backwards compatibility
      use_org_theme: useOrgTheme, // Use snake_case for consistency
      useOrgTheme, // Keep both for backwards compatibility
      alternating_background: alternatingBackground, // Global alternating background toggle
      alternatingBackground, // Backwards compatibility
    };
    onSchemaChange(newSchema);
  }, [sections, requireSignature, useOrgTheme, alternatingBackground, onSchemaChange, generateKey]);

  const handleAddSection = () => {
    const newSection: Section = {
      id: crypto.randomUUID(),
      title: "New Section",
      fields: [],
      collapsed: false,
      hideTitle: false,
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
        hideTitle: false,
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
      responseOptions: type === "checklist" ? ["OK", "DEV", "N/A"] : undefined, // Default response options for checklist
      maxFiles: type === "file" ? 10 : undefined, // Default max files for file uploads
      accept: type === "file" ? ["image/*"] : undefined, // Default to images for file uploads
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

  const handleFieldClick = (sectionId: string, fieldId: string, parentFieldId?: string) => {
    setSelectedField({ sectionId, fieldId, parentFieldId });
    setPropertiesPanelOpen(true);
  };

  const handleFieldUpdate = (updatedField: Field) => {
    if (!selectedField) return;

    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== selectedField.sectionId) return section;

        if (selectedField.parentFieldId) {
          // Update nested field
          return {
            ...section,
            fields: section.fields.map((f) =>
              f.id === selectedField.parentFieldId && f.fields
                ? {
                    ...f,
                    fields: f.fields.map((sf) =>
                      sf.id === selectedField.fieldId ? updatedField : sf
                    ),
                  }
                : f
            ),
          };
        } else {
          // Update top-level field
          return {
            ...section,
            fields: section.fields.map((f) =>
              f.id === selectedField.fieldId ? updatedField : f
            ),
          };
        }
      })
    );

    toast.success("Field updated");
  };

  const currentField = selectedField
    ? (() => {
        const section = sections.find((s) => s.id === selectedField.sectionId);
        if (!section) return null;

        if (selectedField.parentFieldId) {
          const parentField = section.fields.find((f) => f.id === selectedField.parentFieldId);
          return parentField?.fields?.find((sf) => sf.id === selectedField.fieldId) || null;
        } else {
          return section.fields.find((f) => f.id === selectedField.fieldId) || null;
        }
      })()
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
          
          <div className="flex items-center gap-2">
            <Switch
              id="orgTheme"
              checked={useOrgTheme}
              onCheckedChange={setUseOrgTheme}
            />
            <Label htmlFor="orgTheme" className="text-sm">
              Use Organization Color Theme
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="alternatingBackground"
              checked={alternatingBackground}
              onCheckedChange={setAlternatingBackground}
            />
            <Label htmlFor="alternatingBackground" className="text-sm">
              Alternating Background (PDF/DOCX)
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
                    hideTitle: s.hideTitle,
                    fields: s.fields.map((f) => ({
                      id: f.id,
                      key: f.key,
                      type: f.type,
                      label: f.label,
                      placeholder: f.placeholder,
                      required: f.required,
                      options: f.options,
                      items: f.items,
                      responseOptions: f.responseOptions,
                      maxLength: f.maxLength,
                      min: f.min,
                      max: f.max,
                      accept: f.accept,
                      maxFiles: f.maxFiles,
                      allowCaptions: f.allowCaptions,
                      default: f.default,
                      hideLabel: f.hideLabel,
                      boldText: f.boldText,
                      underlineText: f.underlineText,
                      fields: f.fields?.map((sf) => ({
                        id: sf.id,
                        key: sf.key,
                        type: sf.type,
                        label: sf.label,
                        placeholder: sf.placeholder,
                        required: sf.required,
                        options: sf.options,
                        maxLength: sf.maxLength,
                        min: sf.min,
                        max: sf.max,
                        hideLabel: sf.hideLabel,
                        boldText: sf.boldText,
                        underlineText: sf.underlineText,
                      })),
                      minInstances: (f as any).minInstances,
                      maxInstances: (f as any).maxInstances,
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
