/**
 * Saved Reports Manager
 * View, manage, and execute saved custom reports
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Star,
  MoreVertical,
  Play,
  Edit,
  Trash2,
  Calendar,
  Copy,
  StarOff,
} from 'lucide-react';
import { useSavedReports } from '@/hooks/use-report-builder';
import type { SavedReport } from '@/lib/report-builder-types';
import { formatDistanceToNow } from 'date-fns';

interface SavedReportsManagerProps {
  onRunReport: (report: SavedReport) => void;
  onEditReport: (report: SavedReport) => void;
  onScheduleReport?: (report: SavedReport) => void;
}

export function SavedReportsManager({
  onRunReport,
  onEditReport,
  onScheduleReport,
}: SavedReportsManagerProps) {
  const { savedReports, isLoading, deleteReport, toggleFavorite } = useSavedReports();
  const [deleteConfirm, setDeleteConfirm] = useState<SavedReport | null>(null);

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteReport(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleToggleFavorite = async (report: SavedReport) => {
    await toggleFavorite({ id: report.id, isFavorite: !report.is_favorite });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3 mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (savedReports.length === 0) {
    return (
      <Card>
        <CardContent className="py-20 text-center">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">No saved reports yet</p>
            <p className="text-sm mt-2">
              Create custom reports with the Report Builder to save them here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Separate favorites from regular reports
  const favoriteReports = savedReports.filter((r) => r.is_favorite);
  const regularReports = savedReports.filter((r) => !r.is_favorite);

  return (
    <>
      <div className="space-y-6">
        {/* Favorite Reports */}
        {favoriteReports.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <h3 className="text-lg font-semibold">Favorite Reports</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {favoriteReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onRun={() => onRunReport(report)}
                  onEdit={() => onEditReport(report)}
                  onDelete={() => setDeleteConfirm(report)}
                  onToggleFavorite={() => handleToggleFavorite(report)}
                  onSchedule={onScheduleReport ? () => onScheduleReport(report) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Reports */}
        <div className="space-y-4">
          {favoriteReports.length > 0 && (
            <h3 className="text-lg font-semibold">All Reports</h3>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {regularReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onRun={() => onRunReport(report)}
                onEdit={() => onEditReport(report)}
                onDelete={() => setDeleteConfirm(report)}
                onToggleFavorite={() => handleToggleFavorite(report)}
                onSchedule={onScheduleReport ? () => onScheduleReport(report) : undefined}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be
              undone.
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
// Report Card Component
// ============================================================================

interface ReportCardProps {
  report: SavedReport;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onSchedule?: () => void;
}

function ReportCard({
  report,
  onRun,
  onEdit,
  onDelete,
  onToggleFavorite,
  onSchedule,
}: ReportCardProps) {
  const config = report.configuration;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base truncate">{report.name}</CardTitle>
              {report.is_favorite && (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
              )}
            </div>
            {report.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {report.description}
              </CardDescription>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRun}>
                <Play className="h-4 w-4 mr-2" />
                Run Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleFavorite}>
                {report.is_favorite ? (
                  <>
                    <StarOff className="h-4 w-4 mr-2" />
                    Remove from Favorites
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    Add to Favorites
                  </>
                )}
              </DropdownMenuItem>
              {onSchedule && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onSchedule}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule
                  </DropdownMenuItem>
                </>
              )}
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
        {/* Report Metadata */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{formatEntityName(config.entity)}</Badge>
          <Badge variant="secondary">{config.chartType}</Badge>
          {config.filters && config.filters.length > 0 && (
            <Badge variant="outline">{config.filters.length} filter(s)</Badge>
          )}
        </div>

        {/* Statistics */}
        <div className="text-xs text-muted-foreground space-y-1">
          {report.run_count > 0 && <p>Run {report.run_count} time(s)</p>}
          {report.last_run_at && (
            <p>Last run {formatDistanceToNow(new Date(report.last_run_at), { addSuffix: true })}</p>
          )}
          <p>
            Updated {formatDistanceToNow(new Date(report.updated_at), { addSuffix: true })}
          </p>
        </div>

        {/* Action Button */}
        <Button onClick={onRun} size="sm" className="w-full mt-2">
          <Play className="h-4 w-4 mr-2" />
          Run Report
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatEntityName(entity: string): string {
  return entity
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
