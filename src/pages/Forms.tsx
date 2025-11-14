import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Eye, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Filter, Check, Pin } from "lucide-react";
import { useFormTemplates } from "@/hooks/use-form-templates";
import { useFormSubmissions, useDeleteSubmission, FormSubmission } from "@/hooks/use-form-submissions";
import { useToggleFormPin } from "@/hooks/use-form-submissions-pin";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { FormSubmissionViewer } from "@/components/forms/FormSubmissionViewer";
import { TemplateForm } from "@/components/admin/TemplateForm";
import { TemplateManager } from "@/components/admin/TemplateManager";
import { TemplateSelector } from "@/components/forms/TemplateSelector";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { FreeTierGuard } from "@/components/FreeTierGuard";
import { FreeTierUsageBanner } from "@/components/FreeTierUsageBanner";

export default function Forms() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const breakpoint = useBreakpoint();
  const isMobileOrTablet = breakpoint === "mobile" || breakpoint === "tablet";
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("formsActiveTab") || "all";
  });
  const [sheetMode, setSheetMode] = useState<"select-template" | "create-submission" | "create-template" | "view" | "edit-submission" | "edit-template" | null>(null);
  const [isFreeUser, setIsFreeUser] = useState(false);
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
  const [formTypeFilter, setFormTypeFilter] = useState<string>(() => {
    return localStorage.getItem("formsTypeFilter") || "";
  });

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem("formsActiveTab", activeTab);
  }, [activeTab]);

  // Persist form type filter to localStorage
  useEffect(() => {
    localStorage.setItem("formsTypeFilter", formTypeFilter);
  }, [formTypeFilter]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase.from("profiles").select("active_org_id, is_org_admin, is_super_admin").eq("id", user.id).single();
        if (profile) {
          const userOrgId = profile.active_org_id || null;
          setOrgId(userOrgId);
          setIsOrgAdmin(profile.is_org_admin || false);
          setIsSuperAdmin(profile.is_super_admin || false);
          setIsFreeUser(userOrgId === null);
        }
      }
    };
    fetchUser();
  }, []);

  // Pass orgId even if null (for free users) - the hooks will handle it
  const { data: templates = [] } = useFormTemplates(orgId);
  const submissionFilter = activeTab === "mine" ? { createdBy: userId || "" } : activeTab === "drafts" ? { status: "draft" } : activeTab === "submitted" ? { status: "submitted" } : activeTab === "logged" ? { status: "logged" } : undefined;
  const { data: submissions = [], isLoading: submissionsLoading } = useFormSubmissions(orgId, submissionFilter);
  const deleteMutation = useDeleteSubmission();
  const toggleFormPin = useToggleFormPin();

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
      case "logged": return "outline";
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

  // Get unique form types from submissions
  const availableFormTypes = Array.from(
    new Set(submissions.map(s => s.form_templates?.name).filter(Boolean))
  ).sort();

  const filteredSubmissions = submissions.filter((submission) => {
    // Form type filter
    if (formTypeFilter && submission.form_templates?.name !== formTypeFilter) {
      return false;
    }

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
        const statusOrder = { draft: 0, submitted: 1, approved: 2, rejected: 3, logged: 4 };
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
      className="h-8 px-2 -ml-2 font-semibold text-xs md:text-sm"
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
        <h1 className="text-lg md:text-xl lg:text-2xl font-semibold">Forms</h1>
      </div>

      <FreeTierUsageBanner only={["forms"]} />

        <div className="space-y-3 md:space-y-0 mb-4 md:mb-6">
        {/* Row 1: New Submission + Tab Navigation */}
        <div className="flex items-center gap-3 md:gap-2">
          <Button 
            onClick={() => setSheetMode('select-template')} 
            disabled={submissionsLoading} 
            size="sm" 
            className="md:h-10 text-xs md:text-sm flex-shrink-0"
          >
            <Plus className="md:mr-2 h-4 w-4" />
            <span className="hidden md:inline">New Submission</span>
          </Button>
          
          {isMobileOrTablet ? (
            <Carousel
              opts={{
                align: "start",
                loop: false,
                dragFree: true,
                containScroll: "trimSnaps"
              }}
              className="flex-1 max-w-full"
            >
              <CarouselContent className="-ml-2">
                <CarouselItem className="basis-auto pl-2">
                  <Button
                    variant={activeTab === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('all')}
                    className="text-xs md:text-sm"
                  >
                    All
                  </Button>
                </CarouselItem>
                <CarouselItem className="basis-auto pl-2">
                  <Button
                    variant={activeTab === 'mine' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('mine')}
                    className="text-xs md:text-sm"
                  >
                    Mine
                  </Button>
                </CarouselItem>
                <CarouselItem className="basis-auto pl-2">
                  <Button
                    variant={activeTab === 'drafts' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('drafts')}
                    className="text-xs md:text-sm"
                  >
                    Drafts
                  </Button>
                </CarouselItem>
                <CarouselItem className="basis-auto pl-2">
                  <Button
                    variant={activeTab === 'submitted' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('submitted')}
                    className="text-xs md:text-sm"
                  >
                    Submitted
                  </Button>
                </CarouselItem>
                <CarouselItem className="basis-auto pl-2">
                  <Button
                    variant={activeTab === 'logged' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('logged')}
                    className="text-xs md:text-sm"
                  >
                    Logged
                  </Button>
                </CarouselItem>
                <CarouselItem className="basis-auto pl-2">
                  <Button
                    variant={activeTab === 'templates' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('templates')}
                    className="text-xs md:text-sm"
                  >
                    Templates
                  </Button>
                </CarouselItem>
              </CarouselContent>
            </Carousel>
          ) : (
            <div className="flex items-center gap-2 md:gap-1 overflow-x-auto scrollbar-hide">
              <Button
                variant={activeTab === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('all')}
                className="text-sm whitespace-nowrap flex-shrink-0"
              >
                All
              </Button>
              <Button
                variant={activeTab === 'mine' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('mine')}
                className="text-sm whitespace-nowrap flex-shrink-0"
              >
                Mine
              </Button>
              <Button
                variant={activeTab === 'drafts' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('drafts')}
                className="text-sm whitespace-nowrap flex-shrink-0"
              >
                Drafts
              </Button>
              <Button
                variant={activeTab === 'submitted' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('submitted')}
                className="text-sm whitespace-nowrap flex-shrink-0"
              >
                Submitted
              </Button>
              <Button
                variant={activeTab === 'logged' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('logged')}
                className="text-sm whitespace-nowrap flex-shrink-0"
              >
                Logged
              </Button>
              <Button
                variant={activeTab === 'templates' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('templates')}
                className="text-sm whitespace-nowrap flex-shrink-0"
              >
                Templates
              </Button>
            </div>
          )}

          {/* Desktop Filter Button (inline with tabs) */}
          {activeTab !== 'templates' && (
            <div className="hidden md:flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="default" className="gap-2 h-10 px-4 min-w-[100px] text-sm md:text-base">
                    <Filter className="h-4 w-4" />
                    Filters
                    {(dateFilter || timeFilter || formTypeFilter) && <span className="text-xs">({[dateFilter, timeFilter, formTypeFilter].filter(Boolean).length})</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-background z-50 pointer-events-auto shadow-lg border border-border">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm md:text-base">Filter Submissions</h4>
                    
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-medium">Form Type</label>
                      <select
                        className="w-full h-12 min-h-[48px] rounded-md border border-input bg-background px-4 py-3 text-base shadow-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring touch-manipulation cursor-pointer relative z-20 pointer-events-auto active:scale-[0.98]"
                        value={formTypeFilter}
                        onChange={(e) => setFormTypeFilter(e.target.value)}
                      >
                        <option value="">All Forms</option>
                        {availableFormTypes.map((formType) => (
                          <option key={formType} value={formType}>
                            {formType}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-medium">Date</label>
                      <Input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        placeholder="Filter by date"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-medium">Time</label>
                      <Input
                        type="time"
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        placeholder="Filter by time"
                      />
                    </div>
                    {(dateFilter || timeFilter || formTypeFilter) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setDateFilter("");
                          setTimeFilter("");
                          setFormTypeFilter("");
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Row 2 (mobile/tablet only): Filter Button - Full width and clearly visible */}
        {activeTab !== 'templates' && (
          <div className="md:hidden">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="lg" className="w-full gap-2 h-14 px-6 text-lg font-medium min-h-[56px] touch-manipulation active:scale-95 transition-transform">
                  <Filter className="h-5 w-5" />
                  Filters
                  {(dateFilter || timeFilter || formTypeFilter) && <span className="text-sm ml-1">({[dateFilter, timeFilter, formTypeFilter].filter(Boolean).length})</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-background z-50 pointer-events-auto shadow-lg border border-border">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm md:text-base">Filter Submissions</h4>
                  
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium">Form Type</label>
                    <select
                      className="w-full h-12 min-h-[48px] rounded-md border border-input bg-background px-4 py-3 text-base shadow-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring touch-manipulation cursor-pointer relative z-20 pointer-events-auto active:scale-[0.98]"
                      value={formTypeFilter}
                      onChange={(e) => setFormTypeFilter(e.target.value)}
                    >
                      <option value="">All Forms</option>
                      {availableFormTypes.map((formType) => (
                        <option key={formType} value={formType}>
                          {formType}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      placeholder="Filter by date"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium">Time</label>
                    <Input
                      type="time"
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value)}
                      placeholder="Filter by time"
                    />
                  </div>
                  {(dateFilter || timeFilter || formTypeFilter) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setDateFilter("");
                        setTimeFilter("");
                        setFormTypeFilter("");
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Sheet for selecting template or creating new */}
      <Sheet open={sheetMode === 'select-template'} onOpenChange={(open) => !open && setSheetMode(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Select a Template</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <FreeTierGuard resource="forms" onAllowed={() => setSheetMode('create-template')}>
              {({ onClick, disabled }) => (
                <Button 
                  onClick={onClick}
                  disabled={disabled}
                  variant="outline" 
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Template
                </Button>
              )}
            </FreeTierGuard>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Or select an existing template:</p>
              <TemplateSelector
                templates={templates}
                onSelect={(template) => {
                  setSelectedTemplate(template);
                  setSheetMode('create-submission');
                }}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {activeTab === 'templates' ? (
        <TemplateManager orgId={orgId} />
      ) : (
        <div className="w-full max-w-full border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]"><SortButton field="name" label="Form Name" /></TableHead>
                  <TableHead className="hidden sm:table-cell min-w-[100px]"><SortButton field="creator" label="Created By" /></TableHead>
                  <TableHead className="min-w-[80px]"><SortButton field="status" label="Status" /></TableHead>
                  <TableHead className="hidden md:table-cell min-w-[140px]"><SortButton field="date" label="Date & Time" /></TableHead>
                  <TableHead className="text-right min-w-[100px]">Actions</TableHead>
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
                      <TableCell className="font-medium text-xs md:text-sm max-w-[150px] truncate">{submission.form_templates?.name || "Unknown Form"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs md:text-sm max-w-[120px] truncate">{submission.creator_profile?.full_name || submission.creator_profile?.email || "Unknown"}</TableCell>
                      <TableCell><Badge variant={getStatusColor(submission.status)} className="text-xs whitespace-nowrap">{submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-xs md:text-sm whitespace-nowrap">{format(new Date(submission.created_at), "MMM d, yyyy h:mm a")}</TableCell>
                       <TableCell className="text-right">
                        <div className="flex gap-1 md:gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => toggleFormPin.mutate({ id: submission.id, isPinned: submission.is_pinned || false })}
                            title={submission.is_pinned ? "Unpin from dashboard" : "Pin to dashboard"}
                          >
                            <Pin className={`h-4 w-4 ${submission.is_pinned ? 'fill-current' : ''}`} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedSubmission(submission); setSheetMode("view"); }}><Eye className="h-4 w-4" /></Button>
                          {submission.status === 'submitted' && (
                            <Button
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" 
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from('form_submissions')
                                    .update({ status: 'logged', updated_at: new Date().toISOString() })
                                    .eq('id', submission.id);
                                  if (error) throw error;
                                  toast.success("Form marked as logged");
                                  queryClient.invalidateQueries({ queryKey: ["form-submissions"] });
                                } catch (error: any) {
                                  console.error("Failed to update status:", error);
                                  toast.error(error.message || "Failed to update status");
                                }
                              }}
                              title="Mark as Logged"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteSubmission(submission) && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex" onClick={() => { setSelectedSubmission(submission); setSelectedTemplate(templates.find(t => t.id === submission.form_template_id)); setSheetMode("edit-submission"); }}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={async (e) => { 
                                e.stopPropagation();
                                try {
                                  await deleteMutation.mutateAsync(submission.id);
                                  toast.success("Form deleted successfully");
                                } catch (error: any) {
                                  console.error("Delete error:", error);
                                  toast.error(error.message || "Failed to delete form. Please check your permissions.");
                                }
                              }}><Trash2 className="h-4 w-4" /></Button>
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
            <AlertDialogAction onClick={async () => { 
              if (submissionToDelete) { 
                try {
                  await deleteMutation.mutateAsync(submissionToDelete);
                  toast.success("Form submission deleted");
                } catch (error: any) {
                  console.error("Delete error:", error);
                  toast.error(error.message || "Failed to delete submission. Check permissions.");
                }
                setDeleteDialogOpen(false); 
                if (sheetMode === "view") setSheetMode(null); 
              }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
