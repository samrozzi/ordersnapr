import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Briefcase,
  FileText,
  Calendar,
  Home,
  DollarSign,
  User,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "work_order" | "form_submission" | "calendar_event" | "property" | "invoice";
  action: "created" | "updated" | "completed" | "submitted";
  title: string;
  user_name: string;
  user_initials: string;
  created_at: string;
  entity_id: string;
}

const iconMap = {
  work_order: Briefcase,
  form_submission: FileText,
  calendar_event: Calendar,
  property: Home,
  invoice: DollarSign,
};

const actionLabels = {
  created: "created",
  updated: "updated",
  completed: "completed",
  submitted: "submitted",
};

export function ActivityFeed({ limit = 10 }: { limit?: number }) {
  const { user } = useAuth();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activity-feed", user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's org_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return [];

      const activities: ActivityItem[] = [];

      // Fetch recent work orders
      const { data: workOrders } = await supabase
        .from("work_orders")
        .select(`
          id,
          title,
          status,
          created_at,
          updated_at,
          creator:profiles!work_orders_user_id_fkey(full_name, email)
        `)
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (workOrders) {
        workOrders.forEach((wo: any) => {
          const name = wo.creator?.full_name || wo.creator?.email || "Unknown";
          const initials = name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          activities.push({
            id: `wo-${wo.id}`,
            type: "work_order",
            action: wo.status === "completed" ? "completed" : "created",
            title: wo.title || "Untitled Work Order",
            user_name: name,
            user_initials: initials,
            created_at: wo.created_at,
            entity_id: wo.id,
          });
        });
      }

      // Fetch recent form submissions
      const { data: formSubmissions } = await supabase
        .from("form_submissions")
        .select(`
          id,
          status,
          created_at,
          form_templates(name),
          creator:profiles!form_submissions_user_id_fkey(full_name, email)
        `)
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (formSubmissions) {
        formSubmissions.forEach((fs: any) => {
          const name = fs.creator?.full_name || fs.creator?.email || "Unknown";
          const initials = name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          activities.push({
            id: `fs-${fs.id}`,
            type: "form_submission",
            action: "submitted",
            title: fs.form_templates?.name || "Form",
            user_name: name,
            user_initials: initials,
            created_at: fs.created_at,
            entity_id: fs.id,
          });
        });
      }

      // Fetch recent calendar events
      const { data: events } = await supabase
        .from("calendar_events")
        .select(`
          id,
          title,
          event_type,
          created_at,
          creator:profiles!calendar_events_user_id_fkey(full_name, email)
        `)
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (events) {
        events.forEach((event: any) => {
          const name = event.creator?.full_name || event.creator?.email || "Unknown";
          const initials = name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          activities.push({
            id: `event-${event.id}`,
            type: "calendar_event",
            action: "created",
            title: event.title || "Event",
            user_name: name,
            user_initials: initials,
            created_at: event.created_at,
            entity_id: event.id,
          });
        });
      }

      // Sort by created_at
      activities.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return activities.slice(0, limit);
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = iconMap[activity.type];
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 group hover:bg-accent/50 p-2 rounded-lg transition-colors"
                  >
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarFallback className="text-xs">
                        {activity.user_initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <p className="text-sm">
                          <span className="font-medium">{activity.user_name}</span>{" "}
                          {actionLabels[activity.action]}{" "}
                          <span className="font-medium">{activity.title}</span>
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
