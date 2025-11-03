import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateTemplate, useUpdateTemplate, FormTemplate } from "@/hooks/use-form-templates";
import { TemplateBuilder } from "./TemplateBuilder";
import { TemplateBuilderV2 } from "./TemplateBuilderV2";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [schema, setSchema] = useState(template?.schema || { sections: [] });
  const [schemaJson, setSchemaJson] = useState(
    template ? JSON.stringify(template.schema, null, 2) : ""
  );
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual");
  const [userId, setUserId] = useState<string | null>(null);

  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    fetchUser();
  }, []);

  const handleSchemaChange = (newSchema: any) => {
    setSchema(newSchema);
    setSchemaJson(JSON.stringify(newSchema, null, 2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgId) {
      toast.error("Organization required");
      return;
    }

    let finalSchema = schema;
    
    // If in JSON mode, parse the JSON
    if (viewMode === "json") {
      try {
        finalSchema = schemaJson ? JSON.parse(schemaJson) : { sections: [] };
      } catch (error) {
        toast.error("Invalid JSON schema");
        return;
      }
    }

    finalSchema.description = description;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const data = {
      org_id: orgId,
      name,
      slug,
      category: category || null,
      schema: finalSchema,
      is_global: isGlobal,
      is_active: isActive,
      created_by: userId,
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
      <div className="space-y-4">
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. AT&T"
            />
          </div>

          <div className="space-y-2 flex items-end">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_global"
                  checked={isGlobal}
                  onCheckedChange={setIsGlobal}
                />
                <Label htmlFor="is_global" className="text-sm">Global</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="is_active" className="text-sm">Active</Label>
              </div>
            </div>
          </div>
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
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "visual" | "json")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visual">Visual Builder</TabsTrigger>
          <TabsTrigger value="json">JSON Editor</TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="mt-4">
          <TemplateBuilderV2
            schema={schema}
            onSchemaChange={handleSchemaChange}
          />
        </TabsContent>

        <TabsContent value="json" className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schema">Schema (JSON)</Label>
            <Textarea
              id="schema"
              value={schemaJson}
              onChange={(e) => setSchemaJson(e.target.value)}
              placeholder='{"sections": [{"title": "Section 1", "fields": [...]}]}'
              rows={16}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Define form structure using JSON schema format
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 pt-4 border-t">
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
