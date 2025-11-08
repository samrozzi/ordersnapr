import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WorkOrder {
  id: string;
  customer_name: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  bpc: string | null;
  ban: string | null;
  package: string | null;
  job_id: string | null;
  address: string | null;
  contact_info: string | null;
  notes: string | null;
  access_required: boolean | null;
  access_notes: string | null;
  user_id: string;
  organization_id: string;
  created_at: string;
  updated_at?: string;
  completed_at: string | null;
  completed_by: string | null;
  completion_notes: string | null;
  photos: string[] | null;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  all_day: boolean;
  created_by: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarItem {
  id: string;
  title: string;
  date: string;
  time: string | null;
  type: 'work_order' | 'calendar_event';
  all_day?: boolean;
  data: WorkOrder | CalendarEvent;
}

export function useOrgCalendarData(startDate?: Date, endDate?: Date) {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch user's organization_id and user_id
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setUserId(user.id);

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setOrgId(profile?.organization_id || null);
      } catch (error: any) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUser();
  }, []);

  // Fetch and subscribe to data when user is available
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Build work orders query - handle both org and free users
        let workOrdersQuery = supabase
          .from("work_orders")
          .select("*");

        if (orgId) {
          workOrdersQuery = workOrdersQuery.eq("organization_id", orgId);
        } else {
          // Free tier user - get their personal work orders
          workOrdersQuery = workOrdersQuery.eq("user_id", userId).is("organization_id", null);
        }

        if (startDate) {
          workOrdersQuery = workOrdersQuery.gte("scheduled_date", startDate.toISOString().split('T')[0]);
        }
        if (endDate) {
          workOrdersQuery = workOrdersQuery.lte("scheduled_date", endDate.toISOString().split('T')[0]);
        }

        const { data: woData, error: woError } = await workOrdersQuery.order("scheduled_date");

        if (woError) throw woError;

        // Build calendar events query - handle both org and free users
        let eventsQuery = supabase
          .from("calendar_events")
          .select("*");

        if (orgId) {
          eventsQuery = eventsQuery.eq("organization_id", orgId);
        } else {
          // Free tier user - get their personal events
          eventsQuery = eventsQuery.eq("created_by", userId).is("organization_id", null);
        }

        if (startDate) {
          eventsQuery = eventsQuery.gte("event_date", startDate.toISOString().split('T')[0]);
        }
        if (endDate) {
          eventsQuery = eventsQuery.lte("event_date", endDate.toISOString().split('T')[0]);
        }

        const { data: eventsData, error: eventsError } = await eventsQuery.order("event_date");

        if (eventsError) throw eventsError;

        setWorkOrders((woData as WorkOrder[]) || []);
        setCalendarEvents((eventsData as CalendarEvent[]) || []);
      } catch (error: any) {
        console.error("Error fetching calendar data:", error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time changes for work orders
    const workOrdersFilter = orgId 
      ? `organization_id=eq.${orgId}`
      : `user_id=eq.${userId}`;
      
    const workOrdersChannel = supabase
      .channel(`work_orders-${orgId || userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_orders',
          filter: workOrdersFilter
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Subscribe to real-time changes for calendar events
    const eventsFilter = orgId
      ? `organization_id=eq.${orgId}`
      : `created_by=eq.${userId}`;
      
    const eventsChannel = supabase
      .channel(`calendar_events-${orgId || userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: eventsFilter
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(workOrdersChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [orgId, userId, startDate, endDate, toast]);

  // Transform data into unified CalendarItem format
  useEffect(() => {
    const transformedItems: CalendarItem[] = [
      ...workOrders
        .filter(wo => wo.scheduled_date)
        .map(wo => ({
          id: wo.id,
          title: wo.customer_name,
          date: wo.scheduled_date!,
          time: wo.scheduled_time,
          type: 'work_order' as const,
          data: wo,
        })),
      ...calendarEvents.map(event => ({
        id: event.id,
        title: event.title,
        date: event.event_date,
        time: event.event_time,
        type: 'calendar_event' as const,
        all_day: event.all_day,
        data: event,
      })),
    ];

    setItems(transformedItems);
  }, [workOrders, calendarEvents]);

  const refetch = async () => {
    if (!userId) return;
    setLoading(true);
    // Trigger re-fetch by updating a dependency
    setUserId(userId);
  };

  return {
    items,
    workOrders,
    calendarEvents,
    loading,
    refetch,
    orgId,
  };
}
