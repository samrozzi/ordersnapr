import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardGrid } from "@/components/DashboardGrid";
import { AddWidgetDialog } from "@/components/AddWidgetDialog";
import { Button } from "@/components/ui/button";
import { Edit, Save } from "lucide-react";

interface Widget {
  id: string;
  type: "calendar-small" | "calendar-medium" | "calendar-large" | "weather";
  position: number;
  settings: any;
}

const Dashboard = () => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch widgets
      const { data: widgetsData, error: widgetsError } = await supabase
        .from("dashboard_widgets")
        .select("*")
        .eq("user_id", user.id)
        .order("position");

      if (widgetsError) throw widgetsError;

      // If no widgets, create defaults
      if (!widgetsData || widgetsData.length === 0) {
        await createDefaultWidgets(user.id);
        return fetchDashboardData();
      }

      setWidgets(widgetsData.map(w => ({
        id: w.id,
        type: w.widget_type as Widget["type"],
        position: w.position,
        settings: w.settings,
      })) as Widget[]);

      // Fetch work orders for calendar widgets
      const { data: ordersData, error: ordersError } = await supabase
        .from("work_orders")
        .select("*")
        .not("scheduled_date", "is", null)
        .in("status", ["pending", "scheduled"])
        .order("scheduled_date");

      if (ordersError) throw ordersError;
      setWorkOrders(ordersData || []);
    } catch (error: any) {
      console.error("Error fetching dashboard:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultWidgets = async (userId: string) => {
    const defaultWidgets = [
      { widget_type: "calendar-medium", position: 0 },
      { widget_type: "weather", position: 1 },
    ];

    for (const widget of defaultWidgets) {
      await supabase.from("dashboard_widgets").insert({
        user_id: userId,
        widget_type: widget.widget_type,
        position: widget.position,
        settings: {},
      });
    }
  };

  const handleAddWidget = async (type: Widget["type"]) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const newPosition = widgets.length;

      const { data, error } = await supabase
        .from("dashboard_widgets")
        .insert({
          user_id: user.id,
          widget_type: type,
          position: newPosition,
          settings: {},
        })
        .select()
        .single();

      if (error) throw error;

      setWidgets([...widgets, {
        id: data.id,
        type: data.widget_type as Widget["type"],
        position: data.position,
        settings: data.settings,
      }]);

      toast({
        title: "Widget added",
        description: "Your new widget has been added to the dashboard",
      });
    } catch (error: any) {
      console.error("Error adding widget:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveWidget = async (id: string) => {
    try {
      const { error } = await supabase.from("dashboard_widgets").delete().eq("id", id);

      if (error) throw error;

      setWidgets(widgets.filter((w) => w.id !== id));

      toast({
        title: "Widget removed",
        description: "The widget has been removed from your dashboard",
      });
    } catch (error: any) {
      console.error("Error removing widget:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleWidgetsChange = async (newWidgets: Widget[]) => {
    setWidgets(newWidgets);

    // Save positions to database
    try {
      for (const widget of newWidgets) {
        await supabase
          .from("dashboard_widgets")
          .update({ position: widget.position })
          .eq("id", widget.id);
      }
    } catch (error: any) {
      console.error("Error updating widget positions:", error);
      toast({
        title: "Error",
        description: "Failed to save widget positions",
        variant: "destructive",
      });
    }
  };

  const handleSaveLayout = () => {
    setIsEditMode(false);
    toast({
      title: "Layout saved",
      description: "Your dashboard layout has been saved",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Customize your workspace</p>
        </div>
        <div className="flex gap-2">
          <AddWidgetDialog onAddWidget={handleAddWidget} />
          {!isEditMode ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Layout
            </Button>
          ) : (
            <Button size="sm" onClick={handleSaveLayout}>
              <Save className="h-4 w-4 mr-2" />
              Save Layout
            </Button>
          )}
        </div>
      </div>

      {/* Dashboard Grid */}
      {widgets.length > 0 ? (
        <DashboardGrid
          widgets={widgets}
          workOrders={workOrders}
          isEditMode={isEditMode}
          onWidgetsChange={handleWidgetsChange}
          onRemoveWidget={handleRemoveWidget}
        />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No widgets yet. Add your first widget to get started!</p>
          <AddWidgetDialog onAddWidget={handleAddWidget} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
