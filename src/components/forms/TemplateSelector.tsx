import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Search, FileText } from "lucide-react";
import { FormTemplate } from "@/hooks/use-form-templates";

interface TemplateSelectorProps {
  templates: FormTemplate[];
  onSelect: (template: FormTemplate) => void;
}

export function TemplateSelector({ templates, onSelect }: TemplateSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(search.toLowerCase()) ||
    template.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:border-primary transition-colors cursor-pointer" onClick={() => onSelect(template)}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </div>
                  <CardDescription>{template.schema.description || "No description"}</CardDescription>
                </div>
                {template.category && (
                  <Badge variant="outline" className="shrink-0">
                    {template.category}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => onSelect(template)}>
                Use Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No templates found</p>
        </div>
      )}
    </div>
  );
}
