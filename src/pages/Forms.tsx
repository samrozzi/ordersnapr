import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Eye, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Filter } from "lucide-react";
import { useFormTemplates } from "@/hooks/use-form-templates";
import { useFormSubmissions, useDeleteSubmission, FormSubmission } from "@/hooks/use-form-submissions";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { FormSubmissionViewer } from "@/components/forms/FormSubmissionViewer";
import { TemplateForm } from "@/components/admin/TemplateForm";
import { TemplateManager } from "@/components/admin/TemplateManager";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function Forms() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");
  const [sheetMode, setSheetMode] = useState<"select-template" | "create-submission" | "create-template" | "view" | "edit-submission" | "edit-template" | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'creator' | 'status' | 'date'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dateFilter, setDateFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase.from("profiles").select("organization_id, is_org_admin, is_super_admin").eq("id", user.id).single();
        if (profile) {
          setOrgId(profile.organization_id);
          setIsOrgAdmin(profile.is_org_admin || false);
          setIsSuperAdmin(profile.is_super_admin || false);
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

  // Handle opening template directly from URL parameter (for favorited templates)
  useEffect(() => {
    const templateId = searchParams.get('template');
    if (templateId && templates.length > 0) {
      const templateToOpen = templates.find(t => t.id === templateId);
      if (templateToOpen) {
        setSelectedTemplate(templateToOpen);
        setSheetMode('create-submission');
        // Clear the URL parameter
        setSearchParams({});
      }
    }
  }, [searchParams, templates, setSearchParams]);

  const canDeleteSubmission = (submission: FormSubmission) => {
    return submission.created_by === userId || isOrgAdmin;
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

  const handleSort = (field: 'name' | 'creator' | 'status' | 'date') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    // Date filter
    if (dateFilter) {
      const submissionDate = format(new Date(submission.created_at), "yyyy-MM-dd");
      if (submissionDate !== dateFilter) return false;
    }
    
    // Time filter (HH:mm format)
    if (timeFilter) {
      const submissionTime = format(new Date(submission.created_at), "HH:mm");
      if (!submissionTime.startsWith(timeFilter)) return false;
    }
    
    return true;
  });

  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        comparison = (a.form_templates?.name || '').localeCompare(b.form_templates?.name || '');
        break;
      case 'creator':
        const aName = a.creator_profile?.full_name || a.creator_profile?.email || '';
        const bName = b.creator_profile?.full_name || b.creator_profile?.email || '';
        comparison = aName.localeCompare(bName);
        break;
      case 'status':
        const statusOrder = { draft: 0, submitted: 1, approved: 2, rejected: 3 };
        comparison = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        break;
      case 'date':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortButton = ({ field, label }: { field: typeof sortField, label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-semibold"
      onClick={() => handleSort(field)}
    >
      {label}
      {sortField === field ? (
        sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
      )}
    </Button>
  );

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
          <Button
            variant={activeTab === 'templates' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('templates')}
          >
            Templates
          </Button>
        </div>

        {activeTab !== 'templates' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {(dateFilter || timeFilter) && <span className="text-xs">({[dateFilter, timeFilter].filter(Boolean).length})</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Filter Submissions</h4>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    placeholder="Filter by date"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time</label>
                  <Input
                    type="time"
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    placeholder="Filter by time"
                  />
                </div>
                {(dateFilter || timeFilter) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setDateFilter("");
                      setTimeFilter("");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
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
                  <div key={template.id} className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 justify-start"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setSheetMode('create-submission');
                      }}
                    >
                      {template.name}
                    </Button>
                    <FavoriteButton
                      entityType="form_template"
                      entityId={template.id}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {activeTab === 'templates' ? (
        <TemplateManager orgId={orgId} />
      ) : (
        <div className="w-full border rounded-lg overflow-x-auto touch-pan-x">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead><SortButton field="name" label="Form Name" /></TableHead>
                <TableHead><SortButton field="creator" label="Created By" /></TableHead>
                <TableHead><SortButton field="status" label="Status" /></TableHead>
                <TableHead><SortButton field="date" label="Date & Time" /></TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
              <TableBody>
                {submissionsLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : sortedSubmissions.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No submissions found</TableCell></TableRow>
                ) : (
                  sortedSubmissions.map((submission) => (
                    <TableRow key={submission.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedSubmission(submission); setSheetMode("view"); }}>
                      <TableCell className="font-medium">{submission.form_templates?.name || "Unknown Form"}</TableCell>
                      <TableCell>{submission.creator_profile?.full_name || submission.creator_profile?.email || "Unknown"}</TableCell>
                      <TableCell><Badge variant={getStatusColor(submission.status)}>{submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}</Badge></TableCell>
                      <TableCell>{format(new Date(submission.created_at), "MMM d, yyyy h:mm a")}</TableCell>
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
      )}

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
          {selectedTemplate && (isOrgAdmin || isSuperAdmin) && (
            <div className="border-b pb-4 mb-4 mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSheetMode('edit-template');
                }}
                className="w-full"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Template Structure
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Changes will update the template for all users in your organization
              </p>
            </div>
          )}
          <div className="mt-6">
            {selectedTemplate && (
              <ErrorBoundary>
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
              </ErrorBoundary>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet for creating/editing template */}
      <Sheet open={sheetMode === 'create-template' || sheetMode === 'edit-template'} onOpenChange={(open) => {
        if (!open) {
          setSheetMode(null);
          setSelectedTemplate(null);
        }
      }}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto p-4 sm:p-6">
          <SheetHeader>
            <SheetTitle>
              {sheetMode === 'edit-template' ? 'Edit Template Structure' : 'Create New Template'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <TemplateForm
              template={sheetMode === 'edit-template' ? selectedTemplate : undefined}
              orgId={orgId}
              onSuccess={() => {
                setSheetMode(null);
                setSelectedTemplate(null);
              }}
              onCancel={() => {
                setSheetMode(null);
                setSelectedTemplate(null);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet for viewing submission */}
      <Sheet open={sheetMode === "view"} onOpenChange={(open) => !open && setSheetMode(null)}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto p-4 sm:p-6">
          <SheetHeader><SheetTitle>View Submission</SheetTitle></SheetHeader>
          <div className="mt-6">
            {selectedSubmission && (
              <ErrorBoundary>
                <FormSubmissionViewer 
                  submission={selectedSubmission} 
                  onEdit={canDeleteSubmission(selectedSubmission) ? () => { setSelectedTemplate(templates.find(t => t.id === selectedSubmission.form_template_id)); setSheetMode("edit-submission"); } : undefined} 
                  onDelete={canDeleteSubmission(selectedSubmission) ? () => { setSubmissionToDelete(selectedSubmission.id); setDeleteDialogOpen(true); } : undefined} 
                />
              </ErrorBoundary>
            )}
          </div>
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
