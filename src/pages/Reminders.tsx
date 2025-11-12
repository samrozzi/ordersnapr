import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  User as UserIcon,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveOrg } from "@/hooks/use-active-org";
import {
  useReminders,
  useCreateReminder,
  useUpdateReminder,
  useDeleteReminder,
  useOrgMembers,
  Reminder,
  CreateReminderData,
  UpdateReminderData,
} from "@/hooks/use-reminders";
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { PullToRefresh } from "@/components/PullToRefresh";

const Reminders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeOrgId } = useActiveOrg();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    due_time: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    assigned_to: "",
  });

  const { data: reminders = [], isLoading, refetch } = useReminders(user?.id || null);
  const { data: orgMembers = [] } = useOrgMembers(activeOrgId);
  const createReminder = useCreateReminder();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      due_date: "",
      due_time: "",
      priority: "medium",
      assigned_to: "",
    });
    setEditingReminder(null);
  };

  // Handle create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      return;
    }

    const reminderData: CreateReminderData = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      due_date: formData.due_date || undefined,
      due_time: formData.due_time || undefined,
      priority: formData.priority,
      assigned_to: formData.assigned_to || undefined,
    };

    if (editingReminder) {
      await updateReminder.mutateAsync({
        id: editingReminder.id,
        updates: reminderData as UpdateReminderData,
      });
    } else {
      await createReminder.mutateAsync(reminderData);
    }

    setIsCreateDialogOpen(false);
    resetForm();
  };

  // Handle status toggle
  const handleToggleStatus = async (reminder: Reminder) => {
    const newStatus = reminder.status === "completed" ? "pending" : "completed";
    await updateReminder.mutateAsync({
      id: reminder.id,
      updates: { status: newStatus },
    });
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this reminder?")) {
      await deleteReminder.mutateAsync(id);
    }
  };

  // Handle edit
  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      description: reminder.description || "",
      due_date: reminder.due_date || "",
      due_time: reminder.due_time || "",
      priority: reminder.priority,
      assigned_to: reminder.assigned_to || "",
    });
    setIsCreateDialogOpen(true);
  };

  // Filter reminders
  const filteredReminders = reminders.filter((reminder) => {
    // Status filter
    if (filterStatus !== "all" && reminder.status !== filterStatus) {
      return false;
    }

    // Priority filter
    if (filterPriority !== "all" && reminder.priority !== filterPriority) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        reminder.title.toLowerCase().includes(query) ||
        reminder.description?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Group reminders by status
  const pendingReminders = filteredReminders.filter(
    (r) => r.status === "pending" || r.status === "in_progress"
  );
  const completedReminders = filteredReminders.filter((r) => r.status === "completed");
  const overdueReminders = pendingReminders.filter(
    (r) => r.due_date && isPast(parseISO(r.due_date)) && !isToday(parseISO(r.due_date))
  );
  const todayReminders = pendingReminders.filter(
    (r) => r.due_date && isToday(parseISO(r.due_date))
  );
  const upcomingReminders = pendingReminders.filter(
    (r) => r.due_date && !isPast(parseISO(r.due_date)) && !isToday(parseISO(r.due_date))
  );

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>;
      case "high":
        return <Badge className="bg-orange-500">High</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium</Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  // Format due date
  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isPast(date)) return `Overdue: ${format(date, "MMM dd")}`;
    return format(date, "MMM dd");
  };

  // Render reminder card
  const renderReminderCard = (reminder: Reminder) => (
    <Card key={reminder.id} className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="mt-1"
              onClick={() => handleToggleStatus(reminder)}
            >
              {reminder.status === "completed" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
            <div className="flex-1 space-y-2">
              <div>
                <h3
                  className={`font-semibold ${
                    reminder.status === "completed" ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {reminder.title}
                </h3>
                {reminder.description && (
                  <p className="text-sm text-muted-foreground mt-1">{reminder.description}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {getPriorityBadge(reminder.priority)}

                {reminder.due_date && (
                  <Badge
                    variant={
                      reminder.status === "completed"
                        ? "outline"
                        : isPast(parseISO(reminder.due_date)) && !isToday(parseISO(reminder.due_date))
                        ? "destructive"
                        : "outline"
                    }
                    className="gap-1"
                  >
                    <CalendarIcon className="h-3 w-3" />
                    {formatDueDate(reminder.due_date)}
                    {reminder.due_time && ` at ${reminder.due_time}`}
                  </Badge>
                )}

                {reminder.assigned_to && (
                  <Badge variant="secondary" className="gap-1">
                    <UserIcon className="h-3 w-3" />
                    {reminder.assignee?.full_name || reminder.assignee?.email || "Assigned"}
                  </Badge>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Created by {reminder.creator?.full_name || reminder.creator?.email || "Unknown"} •{" "}
                {format(parseISO(reminder.created_at), "MMM dd, yyyy")}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleEdit(reminder)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleToggleStatus(reminder)}
                className={reminder.status === "completed" ? "" : "text-green-600"}
              >
                {reminder.status === "completed" ? "Mark as Pending" : "Mark as Completed"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(reminder.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading reminders...</div>
      </div>
    );
  }

  return (
    <>
      <PullToRefresh onRefresh={refetch} />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reminders & Tasks</h1>
            <p className="text-muted-foreground">
              Manage your daily tasks and reminders
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Reminder
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search reminders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reminders Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">
              Active ({pendingReminders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedReminders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6 mt-6">
            {/* Overdue */}
            {overdueReminders.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Overdue ({overdueReminders.length})
                </h2>
                {overdueReminders.map(renderReminderCard)}
              </div>
            )}

            {/* Today */}
            {todayReminders.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Today ({todayReminders.length})</h2>
                {todayReminders.map(renderReminderCard)}
              </div>
            )}

            {/* Upcoming */}
            {upcomingReminders.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Upcoming ({upcomingReminders.length})</h2>
                {upcomingReminders.map(renderReminderCard)}
              </div>
            )}

            {/* No reminders */}
            {pendingReminders.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">
                    You don't have any active reminders
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-6">
            {completedReminders.length > 0 ? (
              completedReminders.map(renderReminderCard)
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No completed reminders</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setIsCreateDialogOpen(open);
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingReminder ? "Edit Reminder" : "Create New Reminder"}
              </DialogTitle>
              <DialogDescription>
                {editingReminder ? "Update your reminder details" : "Add a new task or reminder"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="What needs to be done?"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add more details..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_time">Due Time</Label>
                  <Input
                    id="due_time"
                    type="time"
                    value={formData.due_time}
                    onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {orgMembers.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="assigned_to">Assign To</Label>
                    <Select
                      value={formData.assigned_to}
                      onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select person..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {orgMembers.map((member: any) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name || member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingReminder ? "Update" : "Create"} Reminder
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Reminders;
