import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { useFormTemplates } from "@/hooks/use-form-templates";
import { useFormSubmissions, useDeleteSubmission, FormSubmission } from "@/hooks/use-form-submissions";
import { TemplateSelector } from "@/components/forms/TemplateSelector";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { FormSubmissionViewer } from "@/components/forms/FormSubmissionViewer";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Forms() {
  const [activeTab, setActiveTab] = useState("all");
  const [sheetMode, setSheetMode] = useState<"select" | "create" | "view" | "edit" | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
        if (profile) setOrgId(profile.organization_id);
      }
    };
    fetchUser();
  }, []);

  const { data: templates = [] } = useFormTemplates(orgId);
  const submissionFilter = activeTab === "mine" ? { createdBy: userId || "" } : activeTab === "drafts" ? { status: "draft" } : activeTab === "submitted" ? { status: "submitted" } : undefined;
  const { data: submissions = [], isLoading: submissionsLoading } = useFormSubmissions(orgId, submissionFilter);
  const deleteMutation = useDeleteSubmission();

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setSheetMode("create");
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Forms</h1>
          <p className="text-muted-foreground">Create and manage form submissions</p>
        </div>
        <Button onClick={() => setSheetMode("select")}>
          <Plus className="h-4 w-4 mr-2" />
          New Submission
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="mine">Mine</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
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
                      <TableCell>{format(new Date(submission.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedSubmission(submission); setSheetMode("view"); }}><Eye className="h-4 w-4" /></Button>
                          {submission.status === "draft" && submission.created_by === userId && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => { setSelectedSubmission(submission); setSelectedTemplate(templates.find(t => t.id === submission.form_template_id)); setSheetMode("edit"); }}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { setSubmissionToDelete(submission.id); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
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
        </TabsContent>
      </Tabs>

      <Sheet open={sheetMode === "select"} onOpenChange={(open) => !open && setSheetMode(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>Select a Form Template</SheetTitle></SheetHeader>
          <div className="mt-6"><TemplateSelector templates={templates} onSelect={handleTemplateSelect} /></div>
        </SheetContent>
      </Sheet>

      <Sheet open={sheetMode === "create" || sheetMode === "edit"} onOpenChange={(open) => !open && setSheetMode(null)}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader><SheetTitle>{sheetMode === "edit" ? "Edit Submission" : "New Submission"}</SheetTitle></SheetHeader>
          <div className="mt-6">{selectedTemplate && <FormRenderer template={selectedTemplate} submission={sheetMode === "edit" ? selectedSubmission || undefined : undefined} onSuccess={() => setSheetMode(null)} onCancel={() => setSheetMode(null)} />}</div>
        </SheetContent>
      </Sheet>

      <Sheet open={sheetMode === "view"} onOpenChange={(open) => !open && setSheetMode(null)}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader><SheetTitle>View Submission</SheetTitle></SheetHeader>
          <div className="mt-6">{selectedSubmission && <FormSubmissionViewer submission={selectedSubmission} onEdit={selectedSubmission.status === "draft" && selectedSubmission.created_by === userId ? () => { setSelectedTemplate(templates.find(t => t.id === selectedSubmission.form_template_id)); setSheetMode("edit"); } : undefined} onDelete={selectedSubmission.status === "draft" && selectedSubmission.created_by === userId ? () => { setSubmissionToDelete(selectedSubmission.id); setDeleteDialogOpen(true); } : undefined} />}</div>
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
