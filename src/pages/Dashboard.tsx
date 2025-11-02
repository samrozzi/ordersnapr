import { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardGrid, Widget } from "@/components/DashboardGrid";
import { AddWidgetDialog } from "@/components/AddWidgetDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Edit, Save, Shield, Home, Calendar as CalendarIcon, User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import ordersnaprLogo from "@/assets/ordersnapr-horizontal.png";
import type { WidgetSize } from "@/lib/widget-presets";
import { getPreset } from "@/lib/widget-presets";

// Lazy load tab components
const WorkOrders = lazy(() => import("./WorkOrders"));
const PropertyInfo = lazy(() => import("./PropertyInfo"));
const Forms = lazy(() => import("./Forms"));

const Dashboard = () => {
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch all data in parallel for faster initial load
      const [rolesResult, profileResult, widgetsResult] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "org_admin"]),
        supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single(),
        supabase
          .from("dashboard_widgets")
          .select("*")
          .eq("user_id", user.id)
          .order("position"),
      ]);

      // Set admin roles
      setIsAdmin(!!rolesResult.data?.some(r => r.role === "admin"));
      setIsOrgAdmin(!!rolesResult.data?.some(r => r.role === "org_admin"));

      // Fetch org logo if needed
      if (profileResult.data?.organization_id) {
        const { data: orgSettings } = await supabase
          .from("organization_settings")
          .select("logo_url")
          .eq("organization_id", profileResult.data.organization_id)
          .maybeSingle();

        if (orgSettings?.logo_url) {
          setOrgLogoUrl(orgSettings.logo_url);
        }
      }

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
        return "M";
      };

      const { data, error } = await supabase
        .from("dashboard_widgets")
        .insert({
          user_id: user.id,
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

  const handleSaveLayout = () => {
    setIsEditMode(false);
    toast({
      title: "Layout saved",
      description: "Your dashboard layout has been saved",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
            <Skeleton className="h-12 sm:h-16 w-32 mb-3" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-md" />
              <Skeleton className="h-8 w-64 sm:h-10 sm:w-80 rounded-md" />
            </div>
          </div>
        </header>
        <div className="container mx-auto p-4 sm:p-6">
          <div className="grid grid-cols-12 gap-2">
            <Skeleton className="col-span-6 h-40" />
            <Skeleton className="col-span-3 h-40" />
            <Skeleton className="col-span-3 h-40" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b overflow-x-hidden">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <button 
              onClick={() => navigate("/")}
              className="relative cursor-pointer hover:opacity-80 transition-opacity shrink-0"
              aria-label="Go to home page"
            >
              <img src={ordersnaprLogo} alt="ordersnapr" className="h-12 sm:h-16 relative z-10" />
            </button>
            {orgLogoUrl && (
              <button
                onClick={() => navigate("/")}
                className="cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                aria-label="Go to home page"
              >
                <img 
                  src={orgLogoUrl} 
                  alt="Organization logo" 
                  className="h-auto max-h-12 sm:max-h-16 max-w-[120px] sm:max-w-[200px] object-contain"
                />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 sm:gap-4 overflow-x-auto">
            <TooltipProvider>
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={activeTab === "dashboard" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setActiveTab("dashboard")}
                      aria-label="Dashboard"
                      className="h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <Home className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Dashboard</TooltipContent>
                </Tooltip>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-8 sm:h-10">
                  <TabsList className="h-8 sm:h-10">
                    <TabsTrigger value="work-orders" className="text-xs sm:text-sm px-2 sm:px-3">Work Orders</TabsTrigger>
                    <TabsTrigger value="property-info" className="text-xs sm:text-sm px-2 sm:px-3">Property Info</TabsTrigger>
                    <TabsTrigger value="forms" className="text-xs sm:text-sm px-2 sm:px-3">Forms</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {(isAdmin || isOrgAdmin) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(isAdmin ? "/admin" : "/org-admin")}
                        aria-label={isAdmin ? "Admin" : "Org Admin"}
                        className="h-8 w-8 sm:h-10 sm:w-10"
                      >
                        <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isAdmin ? "Admin" : "Org Admin"}</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => navigate("/calendar")}
                      aria-label="Calendar"
                      className="h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Calendar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => navigate("/profile")}
                      aria-label="Profile"
                      className="h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Profile</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 sm:p-6 max-w-7xl overflow-x-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="dashboard">
            {/* Header */}
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

            {/* Dashboard Grid */}
            {widgets.length > 0 ? (
        <DashboardGrid 
          widgets={widgets}
          isEditMode={isEditMode}
          onSizeChange={handleSizeChange}
          onRemoveWidget={handleRemoveWidget}
        />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground mb-4">No widgets yet. Add your first widget to get started!</p>
                <AddWidgetDialog onAddWidget={handleAddWidget} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="work-orders">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <WorkOrders />
            </Suspense>
          </TabsContent>

          <TabsContent value="property-info">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <PropertyInfo />
            </Suspense>
          </TabsContent>

          <TabsContent value="forms">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <Forms />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
