import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCreateTemplate, useUpdateTemplate, FormTemplate } from "@/hooks/use-form-templates";
import { toast } from "sonner";

interface TemplateFormProps {
  template?: FormTemplate;
  orgId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TemplateForm({ template, orgId, onSuccess, onCancel }: TemplateFormProps) {
  const [name, setName] = useState(template?.name || "");
  const [category, setCategory] = useState(template?.category || "");
  const [description, setDescription] = useState(template?.schema?.description || "");
  const [isGlobal, setIsGlobal] = useState(template?.is_global || false);
  const [isActive, setIsActive] = useState(template?.is_active !== false);
  const [schemaJson, setSchemaJson] = useState(
    template ? JSON.stringify(template.schema, null, 2) : ""
  );

  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgId) {
      toast.error("Organization required");
      return;
    }

    let schema;
    try {
      schema = schemaJson ? JSON.parse(schemaJson) : { sections: [] };
      schema.description = description;
    } catch (error) {
      toast.error("Invalid JSON schema");
      return;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const data = {
      org_id: orgId,
      name,
      slug,
      category: category || null,
      schema,
      is_global: isGlobal,
      is_active: isActive,
    };

    try {
      if (template) {
        await updateMutation.mutateAsync({ id: template.id, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to save template:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Template Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Job Audit Form"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. AT&T"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this form template"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="schema">Schema (JSON)</Label>
        <Textarea
          id="schema"
          value={schemaJson}
          onChange={(e) => setSchemaJson(e.target.value)}
          placeholder='{"sections": [{"title": "Section 1", "fields": [...]}]}'
          rows={12}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Define form structure using JSON schema format
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              id="is_global"
              checked={isGlobal}
              onCheckedChange={setIsGlobal}
            />
            <Label htmlFor="is_global">Global Template</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Make available to all organizations
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          {template ? "Update" : "Create"} Template
        </Button>
      </div>
    </form>
  );
}
