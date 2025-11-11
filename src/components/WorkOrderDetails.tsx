import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Calendar, FileText, MapPin, Package, Phone, User, Hash, AlertCircle, X, ChevronLeft, ChevronRight, Clock, MessageSquare, Share2, Edit, KeyRound, Mail, CheckCircle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FavoriteButton } from "@/components/FavoriteButton";
import { CustomFieldDisplay } from "@/components/custom-fields/CustomFieldDisplay";

interface WorkOrder {
  id: string;
  bpc: string | null;
  ban: string | null;
  package: string | null;
  job_id: string | null;
  customer_name: string;
  contact_info: string | null;
  address: string | null;
  notes: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  completion_notes: string | null;
  created_at: string;
  updated_at?: string;
  photos: string[] | null;
  access_required: boolean | null;
  access_notes: string | null;
  user_id: string;
  completed_by: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  changes: any;
  user_name?: string;
  user_email?: string;
}

interface WorkOrderDetailsProps {
  workOrder: WorkOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (workOrder: WorkOrder) => void;
  onUpdate?: () => void;
}

export function WorkOrderDetails({ workOrder, open, onOpenChange, onEdit, onUpdate }: WorkOrderDetailsProps) {
  const { toast } = useToast();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);

  const validPhotos = workOrder?.photos?.filter(Boolean) || [];
  const selectedPhoto = selectedPhotoIndex !== null ? validPhotos[selectedPhotoIndex] : null;

  useEffect(() => {
    if (workOrder?.user_id) {
      fetchCreatorInfo(workOrder.user_id);
      fetchAuditLogs(workOrder.id);
    }

    // Fetch org ID
    async function fetchOrgId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("active_org_id")
        .eq("id", user.id)
        .single();

      setOrgId(profile?.active_org_id || null);
    }
    fetchOrgId();
  }, [workOrder?.id, workOrder?.user_id]);

  const fetchCreatorInfo = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();
    if (data) setCreatorProfile(data);
  };

  const fetchAuditLogs = async (entityId: string) => {
    const { data } = await supabase
      .from("audit_logs" as any)
      .select("id, action, created_at, changes, user_id")
      .eq("entity_id", entityId)
      .eq("entity_type", "work_orders")
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (data) {
      // Fetch user profiles separately
      const userIds = [...new Set((data as any[]).map((log: any) => log.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, { name: p.full_name, email: p.email }]) || []);
      
      setAuditLogs((data as any[]).map((log: any) => {
        const profile = profileMap.get(log.user_id);
        return {
          id: log.id,
          action: log.action,
          created_at: log.created_at,
          changes: log.changes,
          user_name: profile?.name || null,
          user_email: profile?.email || "Unknown"
        };
      }));
    }
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (selectedPhotoIndex === null) return;
    
    if (direction === 'prev') {
      setSelectedPhotoIndex(selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : validPhotos.length - 1);
    } else {
      setSelectedPhotoIndex(selectedPhotoIndex < validPhotos.length - 1 ? selectedPhotoIndex + 1 : 0);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex === null) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigatePhoto('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigatePhoto('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex, validPhotos.length]);

  const shareViaSMS = () => {
    const dateTime = workOrder.scheduled_date 
      ? `${format(parseISO(workOrder.scheduled_date), "MMM dd, yyyy")}${workOrder.scheduled_time ? (() => {
          const [hours, minutes] = workOrder.scheduled_time.split(':');
          const hour = parseInt(hours);
          const period = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          return ` at ${displayHour}:${minutes} ${period}`;
        })() : ''}`
      : 'Not scheduled';

    const accessInfo = workOrder.access_required 
      ? `Yes - ${workOrder.access_notes || 'Details not provided'}`
      : 'No';

    const message = `APPOINTMENT DETAILS

DATE & TIME
${dateTime}

CUSTOMER
${workOrder.customer_name}

BAN
${workOrder.ban || 'N/A'}

CONTACT
${workOrder.contact_info || 'N/A'}

ADDRESS
${workOrder.address || 'N/A'}

ACCESS REQUIREMENTS
${accessInfo}${workOrder.notes ? `

NOTES
${workOrder.notes}` : ''}`;

    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  };

  const shareViaEmail = () => {
    const dateTime = workOrder.scheduled_date 
      ? `${format(parseISO(workOrder.scheduled_date), "MMM dd, yyyy")}${workOrder.scheduled_time ? (() => {
          const [hours, minutes] = workOrder.scheduled_time.split(':');
          const hour = parseInt(hours);
          const period = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          return ` at ${displayHour}:${minutes} ${period}`;
        })() : ''}`
      : 'Not scheduled';

    const accessInfo = workOrder.access_required 
      ? `Yes - ${workOrder.access_notes || 'Details not provided'}`
      : 'No';

    const message = `APPOINTMENT DETAILS

DATE & TIME
${dateTime}

CUSTOMER
${workOrder.customer_name}

BAN
${workOrder.ban || 'N/A'}

CONTACT
${workOrder.contact_info || 'N/A'}

ADDRESS
${workOrder.address || 'N/A'}

ACCESS REQUIREMENTS
${accessInfo}${workOrder.notes ? `

NOTES
${workOrder.notes}` : ''}`;

    const subject = `Work Order Details - ${workOrder.customer_name}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoUrl;
  };

  const handleComplete = async () => {
    if (!workOrder) return;
    
    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from("work_orders")
        .update({
          status: "completed",
          completion_notes: completionNotes,
          completed_at: new Date().toISOString(),
        })
        .eq("id", workOrder.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Work order marked as completed",
      });

      setShowCompleteDialog(false);
      setCompletionNotes("");
      onOpenChange(false);
      onUpdate?.();
    } catch (error: any) {
      console.error("Error completing work order:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete work order",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  if (!workOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" hideClose>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Work Order Details</DialogTitle>
            <div className="flex items-center gap-2">
              <FavoriteButton entityType="work_order" entityId={workOrder.id} />
              <DialogClose asChild>
                <Button variant="ghost" size="icon" aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              variant="default"
              size="default"
              onClick={shareViaSMS}
              className="gap-2 flex-1"
            >
              <MessageSquare className="h-4 w-4" />
              Share via Text
            </Button>
            <Button
              variant="default"
              size="default"
              onClick={shareViaEmail}
              className="gap-2 flex-1"
            >
              <Mail className="h-4 w-4" />
              Share via Email
            </Button>
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  onEdit(workOrder);
                  onOpenChange(false);
                }}
                className="gap-2 flex-1"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            {workOrder.status !== "completed" && (
              <Button
                variant="default"
                size="default"
                onClick={() => setShowCompleteDialog(true)}
                className="gap-2 flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                Mark Complete
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="max-h-[calc(90vh-10rem)] pr-4">
          <div className="space-y-6 pb-6">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge
                className={
                  workOrder.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : workOrder.status === "scheduled"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
                }
              >
                {workOrder.status}
              </Badge>
            </div>

            {/* Customer Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Customer Information</h3>
              
              <div className="grid gap-3">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Customer Name</p>
                    <p className="font-medium">{workOrder.customer_name}</p>
                  </div>
                </div>

                {workOrder.contact_info && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Contact</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{workOrder.contact_info}</p>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            asChild
                          >
                            <a href={`tel:${workOrder.contact_info}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            asChild
                          >
                            <a href={`sms:${workOrder.contact_info}`}>
                              <MessageSquare className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {workOrder.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <Button
                        variant="link"
                        className="h-auto p-0 font-medium text-left"
                        asChild
                      >
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(workOrder.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {workOrder.address}
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Job Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Job Details</h3>
              
              <div className="grid gap-3">
                {workOrder.bpc && (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">BPC</p>
                      <p className="font-medium">{workOrder.bpc}</p>
                    </div>
                  </div>
                )}

                {workOrder.ban && (
                  <div className="flex items-start gap-3">
                    <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">BAN</p>
                      <p className="font-medium">{workOrder.ban}</p>
                    </div>
                  </div>
                )}

                {workOrder.package && (
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Package</p>
                      <p className="font-medium">{workOrder.package}</p>
                    </div>
                  </div>
                )}

                {workOrder.job_id && (
                  <div className="flex items-start gap-3">
                    <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Job ID</p>
                      <p className="font-medium">{workOrder.job_id}</p>
                    </div>
                  </div>
                )}

                {workOrder.scheduled_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Scheduled Date</p>
                      <p className="font-medium">
                        {format(parseISO(workOrder.scheduled_date), "MMM dd, yyyy")}
                        {workOrder.scheduled_time && (() => {
                          const [hours, minutes] = workOrder.scheduled_time.split(':');
                          const hour = parseInt(hours);
                          const period = hour >= 12 ? 'PM' : 'AM';
                          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                          return ` at ${displayHour}:${minutes} ${period}`;
                        })()}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {format(new Date(workOrder.created_at), "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Access Requirements */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-2">Access Requirements</h3>
              <div className="flex items-start gap-3">
                <KeyRound className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{workOrder.access_required ? 'Yes' : 'No'}</p>
                  {workOrder.access_required && workOrder.access_notes && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{workOrder.access_notes}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {workOrder.notes && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Notes</h3>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap">{workOrder.notes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Completion Notes */}
            {workOrder.completion_notes && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Completion Notes</h3>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap">{workOrder.completion_notes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Fields */}
            {orgId && workOrder.id && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Additional Information</h3>
                <CustomFieldDisplay
                  entityType="work_orders"
                  entityId={workOrder.id}
                  orgId={orgId}
                  layout="grid"
                />
              </div>
            )}

            {/* Metadata Section */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold text-lg border-b pb-2">Information</h3>
              <div className="grid gap-3 text-sm">
                {creatorProfile && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Created by</p>
                      <p className="font-medium">{creatorProfile.full_name || creatorProfile.email || "Unknown"}</p>
                    </div>
                  </div>
                )}
                {workOrder.updated_at && workOrder.updated_at !== workOrder.created_at && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Last edited</p>
                      <p className="font-medium">
                        {format(new Date(workOrder.updated_at), "MMM dd, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Changelog Section */}
            {auditLogs.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Recent Changes</h3>
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 text-sm">
                      <History className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{log.action.charAt(0).toUpperCase() + log.action.slice(1)}</p>
                        <p className="text-muted-foreground">
                          by {log.user_name || log.user_email} on {format(new Date(log.created_at), "MMM dd, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photos */}
            {validPhotos.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Photos</h3>
                <div className="grid grid-cols-2 gap-4">
                  {validPhotos.map((photoUrl, index) => (
                    <div 
                      key={index} 
                      className="rounded-lg overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedPhotoIndex(index)}
                    >
                      <AspectRatio ratio={16/9}>
                        <img
                          src={photoUrl}
                          alt={`Work order photo ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </AspectRatio>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Photo Viewer Dialog */}
      <Dialog open={selectedPhotoIndex !== null} onOpenChange={() => setSelectedPhotoIndex(null)}>
        <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-50 rounded-full bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedPhotoIndex(null)}
          >
            <X className="h-4 w-4" />
          </Button>
          
          {validPhotos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-background/80 backdrop-blur-sm"
                onClick={() => navigatePhoto('prev')}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-background/80 backdrop-blur-sm"
                onClick={() => navigatePhoto('next')}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
          
          {selectedPhoto && (
            <div className="relative flex items-center justify-center bg-black/5">
              <img
                src={selectedPhoto}
                alt={`Work order photo ${(selectedPhotoIndex || 0) + 1}`}
                className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                {(selectedPhotoIndex || 0) + 1} / {validPhotos.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Work Order</AlertDialogTitle>
            <AlertDialogDescription>
              Add any completion notes for this work order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="completion-notes">Completion Notes (Optional)</Label>
            <Textarea
              id="completion-notes"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Enter completion notes..."
              className="mt-2"
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={isCompleting}>
              {isCompleting ? "Completing..." : "Complete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}