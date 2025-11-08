import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Search, FileText, Trash2 } from "lucide-react";
import { FormTemplate } from "@/hooks/use-form-templates";
import { useAuth } from "@/hooks/use-auth";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TemplateSelectorProps {
  templates: FormTemplate[];
  onSelect: (template: FormTemplate) => void;
}

export function TemplateSelector({ templates, onSelect }: TemplateSelectorProps) {
  const [search, setSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<FormTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();
  const { data: permissions } = useUserPermissions();
  const queryClient = useQueryClient();

  const canDeleteTemplate = (template: FormTemplate) => {
    if (!user) return false;
    
    // Super admin can delete anything
    if (permissions?.isSuperAdmin) return true;
    
    // User can delete their own personal templates
    if (template.scope === 'user' && template.created_by === user.id) return true;
    
    // Org admin can delete org templates
    if (template.scope === 'organization' && permissions?.isOrgAdmin && template.org_id === permissions.organizationId) return true;
    
    return false;
  };

  const handleDeleteClick = (template: FormTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("form_templates")
        .delete()
        .eq("id", templateToDelete.id);

      if (error) throw error;

      toast.success("Template deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    } finally {
      setIsDeleting(false);
    }
  };

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
                <div className="flex items-center gap-2 shrink-0">
                  {template.category && (
                    <Badge variant="outline">
                      {template.category}
                    </Badge>
                  )}
                  {canDeleteTemplate(template) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteClick(template, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
