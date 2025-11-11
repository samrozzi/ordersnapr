/**
 * Report Schedules Manager
 * View and manage automated report schedules
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  Clock,
  Mail,
  FileDown,
  MoreVertical,
  Edit,
  Trash2,
  PlayCircle,
  PauseCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useReportSchedules } from '@/hooks/use-report-builder';
import type { ReportSchedule } from '@/lib/report-builder-types';
import { formatDistanceToNow } from 'date-fns';

interface ReportSchedulesManagerProps {
  onEdit?: (schedule: ReportSchedule) => void;
}

export function ReportSchedulesManager({ onEdit }: ReportSchedulesManagerProps) {
  const { schedules, isLoading, updateSchedule, deleteSchedule } = useReportSchedules();
  const [deleteConfirm, setDeleteConfirm] = useState<ReportSchedule | null>(null);

  const handleToggleActive = async (schedule: ReportSchedule) => {
    await updateSchedule({
      id: schedule.id,
      updates: { is_active: !schedule.is_active },
    });
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteSchedule(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="py-6">
              <Skeleton className="h-6 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="py-20 text-center">
          <div className="text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">No scheduled reports yet</p>
            <p className="text-sm mt-2">
              Schedule reports to be automatically generated and delivered via email
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {schedules.map((schedule) => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            onToggleActive={() => handleToggleActive(schedule)}
            onEdit={onEdit ? () => onEdit(schedule) : undefined}
            onDelete={() => setDeleteConfirm(schedule)}
          />
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the schedule "{deleteConfirm?.name}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Schedule Card Component
// ============================================================================

interface ScheduleCardProps {
  schedule: ReportSchedule;
  onToggleActive: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}

function ScheduleCard({ schedule, onToggleActive, onEdit, onDelete }: ScheduleCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base truncate">{schedule.name}</CardTitle>
              <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                {schedule.is_active ? 'Active' : 'Paused'}
              </Badge>
            </div>
            <CardDescription className="mt-1">
              {(schedule as any).saved_reports?.name || 'Report'}
            </CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onToggleActive}>
                {schedule.is_active ? (
                  <>
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatFrequency(schedule)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{schedule.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileDown className="h-4 w-4 text-muted-foreground" />
            <span>{schedule.format.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{schedule.recipients.length} recipient(s)</span>
          </div>
        </div>

        {schedule.next_run_at && (
          <div className="text-xs text-muted-foreground">
            Next run: {formatDistanceToNow(new Date(schedule.next_run_at), { addSuffix: true })}
          </div>
        )}

        {schedule.last_run_at && (
          <div className="text-xs text-muted-foreground">
            Last run: {formatDistanceToNow(new Date(schedule.last_run_at), { addSuffix: true })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatFrequency(schedule: ReportSchedule): string {
  switch (schedule.frequency) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Weekly on ${days[schedule.day_of_week || 0]}`;
    case 'monthly':
      return `Monthly on day ${schedule.day_of_month}`;
    default:
      return schedule.frequency;
  }
}
