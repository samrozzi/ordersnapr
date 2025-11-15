import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardGrid, Widget } from "@/components/DashboardGrid";
import { AddWidgetDialog } from "@/components/AddWidgetDialog";
import { Button } from "@/components/ui/button";
import { Edit, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { WidgetSize } from "@/lib/widget-presets";
import { getPreset } from "@/lib/widget-presets";
import { useActiveOrg } from "@/hooks/use-active-org";

const Dashboard = () => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { activeOrgId } = useActiveOrg();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [activeOrgId]);

  const fetchDashboardData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch all data in parallel for faster initial load
      const [widgetsResult] = await Promise.all([
        supabase
          .from("dashboard_widgets")
          .select("*")
          .eq("user_id", user.id)
          .eq("org_id", activeOrgId)
          .order("position"),
      ]);

      // Handle widgets
      if (widgetsResult.error) throw widgetsResult.error;

      // If no widgets, create defaults
      if (!widgetsResult.data || widgetsResult.data.length === 0) {
        await createDefaultWidgets(user.id);
        return fetchDashboardData();
      }

      // Migration helper: convert old arbitrary sizes to S/M/L presets
      const legacyToPreset = (widthCols: number, heightRows: number): WidgetSize => {
        const candidates: WidgetSize[] = ["S", "M", "L"];
        let best: WidgetSize = "M";
        let bestDiff = Infinity;
        
        for (const s of candidates) {
          const p = getPreset(s, "desktop");
          const diff = Math.abs(p.cols - widthCols) + Math.abs(p.rows - heightRows);
          if (diff < bestDiff) {
            best = s;
            bestDiff = diff;
          }
        }
        
        return best;
      };

      const mappedWidgets: Widget[] = widgetsResult.data.map((w, index) => {
        const layoutData = (w.layout_data as any) || {};
        
        // If no size field, migrate from old settings
        let size: WidgetSize = (w.size as WidgetSize) || "M";
        if (!w.size) {
          const settings = (w.settings as any) || {};
          const lgLayout = settings?.layouts?.lg?.[0];
          if (lgLayout?.w && lgLayout?.h) {
            size = legacyToPreset(lgLayout.w, lgLayout.h);
          }
        }

        return {
          id: w.id,
          type: w.widget_type as Widget["type"],
          size,
          x: layoutData.x ?? 0,
          y: layoutData.y ?? 0,
          position: w.position ?? index,
          settings: (w.settings as any) || {},
        };
      });
      
      setWidgets(mappedWidgets);
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
      { widget_type: "calendar-medium", position: 0, size: "M" as WidgetSize },
      { widget_type: "weather", position: 1, size: "S" as WidgetSize },
    ];

    for (const widget of defaultWidgets) {
      await supabase.from("dashboard_widgets").insert({
        user_id: userId,
        org_id: activeOrgId,
        widget_type: widget.widget_type,
        position: widget.position,
        size: widget.size,
        layout_data: { x: 0, y: 0 },
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

      // Determine default size for widget type
      const getDefaultSize = (t: Widget["type"]): WidgetSize => {
        if (t === "calendar-small") return "S";
        if (t === "calendar-large") return "L";
        if (t === "pinned-forms") return "M";
        if (t === "recent-notes") return "M";
        if (t === "quick-stats") return "S";
        return "M";
      };

      const { data, error } = await supabase
        .from("dashboard_widgets")
        .insert({
          user_id: user.id,
          org_id: activeOrgId,
          widget_type: type,
          position: newPosition,
          size: getDefaultSize(type),
          layout_data: { x: 0, y: 0 },
        })
        .select()
        .single();

      if (error) throw error;

      setWidgets([...widgets, {
        id: data.id,
        type: data.widget_type as Widget["type"],
        size: (data.size as WidgetSize) || "M",
        x: 0,
        y: 0,
        position: data.position,
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

  // Debounced save function
  const debouncedSave = useCallback(
    (widgetsToSave: Widget[]) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          // Batch update all widgets in parallel
          await Promise.all(
            widgetsToSave.map(widget =>
              supabase
                .from("dashboard_widgets")
                .update({
                  size: widget.size,
                  layout_data: { x: widget.x, y: widget.y },
                  position: widget.position,
                })
                .eq("id", widget.id)
            )
          );
        } catch (error: any) {
          console.error("Error auto-saving widgets:", error);
        }
      }, 1000); // Increased from 400ms to reduce database writes
    },
    []
  );

  // Auto-save when widgets change
  useEffect(() => {
    if (widgets.length > 0 && !loading) {
      debouncedSave(widgets);
    }
  }, [widgets, debouncedSave, loading]);

  const handleSizeChange = (id: string, size: WidgetSize) => {
    setWidgets(prev => prev.map(w => 
      w.id === id ? { ...w, size } : w
    ));
  };

  const handleWidgetsReorder = (reorderedWidgets: Widget[]) => {
    setWidgets(reorderedWidgets.map((w, idx) => ({ ...w, position: idx })));
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
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-12 gap-4">
          <Skeleton className="col-span-6 h-40" />
          <Skeleton className="col-span-3 h-40" />
          <Skeleton className="col-span-3 h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Customize your workspace</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <AddWidgetDialog onAddWidget={handleAddWidget} />
          {!isEditMode ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
              <Edit className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Edit Layout</span>
              <span className="sm:hidden">Edit</span>
            </Button>
          ) : (
            <Button size="sm" onClick={handleSaveLayout}>
              <Save className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Save Layout</span>
              <span className="sm:hidden">Save</span>
            </Button>
          )}
        </div>
      </div>

      {widgets.length > 0 ? (
        <DashboardGrid 
          widgets={widgets}
          isEditMode={isEditMode}
          onSizeChange={handleSizeChange}
          onRemoveWidget={handleRemoveWidget}
          onWidgetsReorder={handleWidgetsReorder}
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
