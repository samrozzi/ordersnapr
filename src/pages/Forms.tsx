import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { useFormTemplates } from "@/hooks/use-form-templates";
import { useFormSubmissions, useDeleteSubmission, FormSubmission } from "@/hooks/use-form-submissions";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { FormSubmissionViewer } from "@/components/forms/FormSubmissionViewer";
import { TemplateForm } from "@/components/admin/TemplateForm";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Forms() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");
  const [sheetMode, setSheetMode] = useState<"select-template" | "create-submission" | "create-template" | "view" | "edit-submission" | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase.from("profiles").select("organization_id, is_org_admin").eq("id", user.id).single();
        if (profile) {
          setOrgId(profile.organization_id);
          setIsOrgAdmin(profile.is_org_admin || false);
        }
      }
    };
    fetchUser();
  }, []);

  const { data: templates = [] } = useFormTemplates(orgId);
  const submissionFilter = activeTab === "mine" ? { createdBy: userId || "" } : activeTab === "drafts" ? { status: "draft" } : activeTab === "submitted" ? { status: "submitted" } : undefined;
  const { data: submissions = [], isLoading: submissionsLoading } = useFormSubmissions(orgId, submissionFilter);
  const deleteMutation = useDeleteSubmission();

  // Handle opening form draft from URL parameter (e.g., from favorites)
  useEffect(() => {
    const draftId = searchParams.get('draft');
    if (draftId && submissions.length > 0 && templates.length > 0) {
      const draftToOpen = submissions.find(s => s.id === draftId);
      if (draftToOpen) {
        setSelectedSubmission(draftToOpen);
        setSelectedTemplate(templates.find(t => t.id === draftToOpen.form_template_id));
        setSheetMode('edit-submission');
        // Clear the URL parameter
        setSearchParams({});
      }
    }
  }, [searchParams, submissions, templates, setSearchParams]);

  const canDeleteSubmission = (submission: FormSubmission) => {
    return submission.status === "draft" && (submission.created_by === userId || isOrgAdmin);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "secondary";
      case "submitted": return "default";
      case "approved": return "default";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Forms</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-6">
        <Button onClick={() => setSheetMode('select-template')} size="sm" className="md:h-10">
          <Plus className="md:mr-2 h-4 w-4" />
          <span className="hidden md:inline">New Submission</span>
        </Button>
        
        <div className="flex items-center gap-1">
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('all')}
          >
            All
          </Button>
          <Button
            variant={activeTab === 'mine' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('mine')}
          >
            Mine
          </Button>
          <Button
            variant={activeTab === 'drafts' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('drafts')}
          >
            Drafts
          </Button>
          <Button
            variant={activeTab === 'submitted' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('submitted')}
          >
            Submitted
          </Button>
        </div>
      </div>

      {/* Sheet for selecting template or creating new */}
      <Sheet open={sheetMode === 'select-template'} onOpenChange={(open) => !open && setSheetMode(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Select a Template</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <Button 
              onClick={() => setSheetMode('create-template')} 
              variant="outline" 
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Template
            </Button>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Or select an existing template:</p>
              {templates.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No templates available. Create one to get started.
                </p>
              ) : (
                templates.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setSheetMode('create-submission');
                    }}
                  >
                    {template.name}
                  </Button>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

        <div className="border rounded-lg overflow-x-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead>Form Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissionsLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : submissions.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No submissions found</TableCell></TableRow>
                ) : (
                  submissions.map((submission) => (
                    <TableRow key={submission.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedSubmission(submission); setSheetMode("view"); }}>
                      <TableCell className="font-medium">{submission.form_templates?.name || "Unknown Form"}</TableCell>
                      <TableCell><Badge variant={getStatusColor(submission.status)}>{submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell">{format(new Date(submission.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 md:gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedSubmission(submission); setSheetMode("view"); }}><Eye className="h-4 w-4" /></Button>
                          {canDeleteSubmission(submission) && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedSubmission(submission); setSelectedTemplate(templates.find(t => t.id === submission.form_template_id)); setSheetMode("edit-submission"); }}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSubmissionToDelete(submission.id); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        </div>

      {/* Sheet for creating/editing submission */}
      <Sheet open={sheetMode === 'create-submission' || sheetMode === 'edit-submission'} onOpenChange={(open) => {
        if (!open) {
          setSheetMode(null);
          setSelectedSubmission(null);
          setSelectedTemplate(null);
        }
      }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-4 sm:p-6">
          <SheetHeader>
            <SheetTitle>
              {sheetMode === 'edit-submission' ? 'Edit Submission' : 'New Submission'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {selectedTemplate && (
              <FormRenderer
                template={selectedTemplate}
                submission={selectedSubmission}
                onSuccess={() => {
                  setSheetMode(null);
                  setSelectedSubmission(null);
                  setSelectedTemplate(null);
                }}
                onCancel={() => {
                  setSheetMode(null);
                  setSelectedSubmission(null);
                  setSelectedTemplate(null);
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet for creating template */}
      <Sheet open={sheetMode === 'create-template'} onOpenChange={(open) => {
        if (!open) {
          setSheetMode(null);
        }
      }}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto p-4 sm:p-6">
          <SheetHeader>
            <SheetTitle>Create New Template</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <TemplateForm
              orgId={orgId}
              onSuccess={() => {
                setSheetMode(null);
              }}
              onCancel={() => {
                setSheetMode(null);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet for viewing submission */}
      <Sheet open={sheetMode === "view"} onOpenChange={(open) => !open && setSheetMode(null)}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto p-4 sm:p-6">
          <SheetHeader><SheetTitle>View Submission</SheetTitle></SheetHeader>
          <div className="mt-6">{selectedSubmission && <FormSubmissionViewer submission={selectedSubmission} onEdit={canDeleteSubmission(selectedSubmission) ? () => { setSelectedTemplate(templates.find(t => t.id === selectedSubmission.form_template_id)); setSheetMode("edit-submission"); } : undefined} onDelete={canDeleteSubmission(selectedSubmission) ? () => { setSubmissionToDelete(selectedSubmission.id); setDeleteDialogOpen(true); } : undefined} />}</div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the submission.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (submissionToDelete) { await deleteMutation.mutateAsync(submissionToDelete); setDeleteDialogOpen(false); if (sheetMode === "view") setSheetMode(null); }}}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
