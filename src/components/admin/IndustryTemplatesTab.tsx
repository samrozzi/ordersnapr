import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Download, CheckCircle2 } from "lucide-react";
import { INDUSTRY_TEMPLATES, type IndustryTemplate } from "@/lib/industry-templates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const IndustryTemplatesTab = () => {
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: organizations, isLoading: orgsLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, industry")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async ({
      orgId,
      template,
    }: {
      orgId: string;
      template: IndustryTemplate;
    }) => {
      // 1. Upsert features
      const featurePromises = Object.entries(template.features).map(
        ([module, { enabled, config }]) =>
          supabase.from("org_features").upsert({
            org_id: orgId,
            module,
            enabled,
            config,
          })
      );

      await Promise.all(featurePromises);

      // 2. Create pages and widgets
      for (const page of template.pages) {
        const { data: pageData, error: pageError } = await supabase
          .from("org_pages")
          .upsert({
            org_id: orgId,
            title: page.title,
            path: page.path,
            is_enabled: true,
          })
          .select()
          .single();

        if (pageError) throw pageError;

        // Delete existing widgets for this page
        await supabase
          .from("org_page_widgets")
          .delete()
          .eq("org_page_id", pageData.id);

        // Insert new widgets
        const widgetPromises = page.widgets.map((widget) =>
          supabase.from("org_page_widgets").insert({
            org_page_id: pageData.id,
            widget_type: widget.widget_type,
            position: widget.position,
            config: widget.config,
          })
        );

        await Promise.all(widgetPromises);
      }

      // 3. Update organization industry
      await supabase
        .from("organizations")
        .update({ industry: template.industry })
        .eq("id", orgId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-features"] });
      queryClient.invalidateQueries({ queryKey: ["org-pages"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Template applied successfully!");
      setSelectedTemplate("");
    },
    onError: (error) => {
      toast.error("Failed to apply template");
      console.error(error);
    },
  });

  const handleApplyTemplate = () => {
    if (!selectedOrgId || !selectedTemplate) return;

    const template = INDUSTRY_TEMPLATES.find((t) => t.industry === selectedTemplate);
    if (!template) return;

    applyTemplateMutation.mutate({ orgId: selectedOrgId, template });
  };

  if (orgsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Industry Templates</CardTitle>
          <CardDescription>
            Apply pre-configured feature sets and layouts based on industry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Organization</label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an organization..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} {org.industry && `(${org.industry})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Select Template</label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
                disabled={!selectedOrgId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_TEMPLATES.map((template) => (
                    <SelectItem key={template.industry} value={template.industry}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={!selectedOrgId || applyTemplateMutation.isPending}>
                    {applyTemplateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Apply Template
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apply Industry Template?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will overwrite the organization's current feature
                      settings and dashboard layout. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleApplyTemplate}>
                      Apply Template
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {INDUSTRY_TEMPLATES.map((template) => (
          <Card
            key={template.industry}
            className={
              selectedTemplate === template.industry
                ? "border-primary ring-2 ring-primary ring-offset-2"
                : ""
            }
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {selectedTemplate === template.industry && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Included Features:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(template.features)
                      .filter(([_, feature]) => feature.enabled)
                      .map(([module]) => (
                        <Badge key={module} variant="secondary">
                          {module.replace(/_/g, " ")}
                        </Badge>
                      ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Pages:</p>
                  <div className="flex flex-wrap gap-2">
                    {template.pages.map((page) => (
                      <Badge key={page.path} variant="outline">
                        {page.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
