import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Globe, Building2, Lock, User } from "lucide-react";
import { useFormTemplates } from "@/hooks/use-form-templates";
import { useDeleteTemplate } from "@/hooks/use-form-templates";
import { TemplateForm } from "./TemplateForm";
import { FormTemplate } from "@/hooks/use-form-templates";
import { format } from "date-fns";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { FavoriteButton } from "@/components/FavoriteButton";

interface TemplateManagerProps {
  orgId: string | null;
}

export function TemplateManager({ orgId }: TemplateManagerProps) {
  const [sheetMode, setSheetMode] = useState<"create" | "edit" | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useFormTemplates(orgId);
  const { data: permissions } = useUserPermissions();
  const deleteMutation = useDeleteTemplate();

  const canEditTemplate = (template: FormTemplate) => {
    if (!permissions) return false;
    const scope = (template as any).scope;
    const createdBy = (template as any).created_by;
    
    // Super admins can edit all templates
    if (permissions.isSuperAdmin) return true;
    
    // Org admins can edit organization templates in their org
    if (permissions.isOrgAdmin && scope === "organization" && template.org_id === permissions.organizationId) {
      return true;
    }
    
    // Users can edit their own personal templates
    if (scope === "user" && createdBy === permissions.userId) return true;
    
    return false;
  };

  const handleEdit = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setSheetMode("edit");
  };

  const handleDelete = async () => {
    if (templateToDelete) {
      await deleteMutation.mutateAsync(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleSuccess = () => {
    setSheetMode(null);
    setSelectedTemplate(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Form Templates</h2>
          <p className="text-muted-foreground">Create and manage form templates</p>
        </div>
        <Button onClick={() => setSheetMode("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto touch-pan-x">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No templates found
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    {template.category && (
                      <Badge variant="outline">{template.category}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {(template as any).scope === 'global' ? (
                          <>
                            <Globe className="h-3 w-3" />
                            <span className="text-xs">Global</span>
                          </>
                        ) : (template as any).scope === 'organization' ? (
                          <>
                            <Building2 className="h-3 w-3" />
                            <span className="text-xs">Organization</span>
                          </>
                        ) : (
                          <>
                            <User className="h-3 w-3" />
                            <span className="text-xs">Personal</span>
                          </>
                        )}
                      </div>
                      {!canEditTemplate(template) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View only</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(template.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <FavoriteButton
                        entityType="form_template"
                        entityId={template.id}
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(template)}
                                disabled={!canEditTemplate(template)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TooltipTrigger>
                          {!canEditTemplate(template) && (
                            <TooltipContent>
                              <p>You don't have permission to edit this template</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setTemplateToDelete(template.id);
                                  setDeleteDialogOpen(true);
                                }}
                                disabled={!canEditTemplate(template)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TooltipTrigger>
                          {!canEditTemplate(template) && (
                            <TooltipContent>
                              <p>You don't have permission to delete this template</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetMode !== null} onOpenChange={(open) => !open && setSheetMode(null)}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {sheetMode === "create" ? "Create Template" : "Edit Template"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <TemplateForm
              template={selectedTemplate || undefined}
              orgId={orgId}
              onSuccess={handleSuccess}
              onCancel={() => setSheetMode(null)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template. Existing submissions using this template will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
