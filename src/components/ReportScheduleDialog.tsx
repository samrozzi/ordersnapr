/**
 * Report Schedule Dialog
 * Create and manage automated report schedules
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Mail, FileDown } from 'lucide-react';
import type { ReportSchedule, SavedReport, ScheduleFrequency, ScheduleFormat } from '@/lib/report-builder-types';

interface ReportScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: SavedReport | null;
  onSave: (schedule: Partial<ReportSchedule>) => Promise<void>;
  initialSchedule?: Partial<ReportSchedule>;
}

export function ReportScheduleDialog({
  open,
  onOpenChange,
  report,
  onSave,
  initialSchedule,
}: ReportScheduleDialogProps) {
  const [schedule, setSchedule] = useState<Partial<ReportSchedule>>({
    name: initialSchedule?.name || '',
    frequency: initialSchedule?.frequency || 'daily',
    time: initialSchedule?.time || '09:00',
    format: initialSchedule?.format || 'pdf',
    recipients: initialSchedule?.recipients || [],
    is_active: initialSchedule?.is_active ?? true,
    day_of_week: initialSchedule?.day_of_week,
    day_of_month: initialSchedule?.day_of_month,
  });

  const [recipientInput, setRecipientInput] = useState('');

  const handleAddRecipient = () => {
    if (recipientInput && isValidEmail(recipientInput)) {
      setSchedule({
        ...schedule,
        recipients: [...(schedule.recipients || []), recipientInput],
      });
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setSchedule({
      ...schedule,
      recipients: schedule.recipients?.filter((r) => r !== email),
    });
  };

  const handleSave = async () => {
    if (!report) return;

    const scheduleData: Partial<ReportSchedule> = {
      ...schedule,
      report_id: report.id,
      name: schedule.name || `${report.name} - Scheduled`,
    };

    await onSave(scheduleData);
    onOpenChange(false);
  };

  const isValid = () => {
    return (
      schedule.name &&
      schedule.frequency &&
      schedule.time &&
      schedule.format &&
      schedule.recipients &&
      schedule.recipients.length > 0 &&
      (schedule.frequency !== 'weekly' || schedule.day_of_week !== undefined) &&
      (schedule.frequency !== 'monthly' || schedule.day_of_month !== undefined)
    );
  };

  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Report</DialogTitle>
          <DialogDescription>
            Configure automated delivery for "{report.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Schedule Name */}
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Schedule Name</Label>
            <Input
              id="schedule-name"
              value={schedule.name}
              onChange={(e) => setSchedule({ ...schedule, name: e.target.value })}
              placeholder="Weekly Sales Report"
            />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              value={schedule.frequency}
              onValueChange={(value) =>
                setSchedule({
                  ...schedule,
                  frequency: value as ScheduleFrequency,
                  day_of_week: value === 'weekly' ? 1 : undefined,
                  day_of_month: value === 'monthly' ? 1 : undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Day Selection for Weekly */}
          {schedule.frequency === 'weekly' && (
            <div className="space-y-2">
              <Label htmlFor="day-of-week">Day of Week</Label>
              <Select
                value={schedule.day_of_week?.toString()}
                onValueChange={(value) =>
                  setSchedule({ ...schedule, day_of_week: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Day Selection for Monthly */}
          {schedule.frequency === 'monthly' && (
            <div className="space-y-2">
              <Label htmlFor="day-of-month">Day of Month</Label>
              <Select
                value={schedule.day_of_month?.toString()}
                onValueChange={(value) =>
                  setSchedule({ ...schedule, day_of_month: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Time */}
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={schedule.time}
              onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
            />
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label htmlFor="format">Export Format</Label>
            <Select
              value={schedule.format}
              onValueChange={(value) => setSchedule({ ...schedule, format: value as ScheduleFormat })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recipients */}
          <div className="space-y-2">
            <Label htmlFor="recipients">Email Recipients</Label>
            <div className="flex gap-2">
              <Input
                id="recipients"
                type="email"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRecipient();
                  }
                }}
                placeholder="email@example.com"
              />
              <Button type="button" onClick={handleAddRecipient}>
                Add
              </Button>
            </div>

            {schedule.recipients && schedule.recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {schedule.recipients.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(email)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is-active">Active</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable this schedule
              </p>
            </div>
            <Switch
              id="is-active"
              checked={schedule.is_active}
              onCheckedChange={(checked) => setSchedule({ ...schedule, is_active: checked })}
            />
          </div>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schedule Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {schedule.frequency === 'daily' && 'Every day'}
                  {schedule.frequency === 'weekly' &&
                    `Every ${getDayName(schedule.day_of_week || 1)}`}
                  {schedule.frequency === 'monthly' &&
                    `Every month on day ${schedule.day_of_month || 1}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>at {schedule.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileDown className="h-4 w-4 text-muted-foreground" />
                <span>{schedule.format?.toUpperCase()} format</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{schedule.recipients?.length || 0} recipient(s)</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid()}>
            Save Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getDayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] || '';
}
