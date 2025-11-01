import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardGrid, Widget } from "@/components/DashboardGrid";
import { AddWidgetDialog } from "@/components/AddWidgetDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Edit, Save, Shield, Home, Calendar as CalendarIcon, User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ordersnaprLogo from "@/assets/ordersnapr-horizontal.png";
import WorkOrders from "./WorkOrders";
import PropertyInfo from "./PropertyInfo";
import Forms from "./Forms";
import { Layouts } from "react-grid-layout";

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
  const [layouts, setLayouts] = useState<Layouts>({ lg: [], md: [], sm: [], xs: [] });
  const [currentBp, setCurrentBp] = useState<'lg' | 'md' | 'sm' | 'xs'>('lg');
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

      // Check admin status and org logo
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "org_admin"]);

      setIsAdmin(!!rolesData?.some(r => r.role === "admin"));
      setIsOrgAdmin(!!rolesData?.some(r => r.role === "org_admin"));

      // Fetch organization logo
      const { data: profileData } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profileData?.organization_id) {
        const { data: orgSettings } = await supabase
          .from("organization_settings")
          .select("logo_url")
          .eq("organization_id", profileData.organization_id)
          .maybeSingle();

        if (orgSettings?.logo_url) {
          setOrgLogoUrl(orgSettings.logo_url);
        }
      }

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

      const mappedWidgets = widgetsData.map(w => {
        const settings = (w.settings as any) || {};
        return {
          id: w.id,
          type: w.widget_type as Widget["type"],
          position: w.position,
          settings: settings,
          layout: settings.layout || undefined,
        };
      }) as Widget[];
      
      setWidgets(mappedWidgets);
      
      // Build initial layouts from saved data
      const initialLayouts: Layouts = { lg: [], md: [], sm: [], xs: [] };
      
      mappedWidgets.forEach((widget, index) => {
        const settings = widget.settings || {};
        const savedLayouts = settings.layouts as Layouts | undefined;
        
        // Helper to get default size
        const getDefaultSize = (type: Widget["type"]) => {
          switch (type) {
            case "calendar-small": return { w: 1, h: 22, minW: 1, minH: 23 };
            case "calendar-medium": return { w: 2, h: 35, minW: 1, minH: 30 };
            case "calendar-large": return { w: 2, h: 47, minW: 1, minH: 38 };
            case "weather": return { w: 1, h: 24, minW: 1, minH: 25 };
            case "favorites": return { w: 1, h: 22, minW: 1, minH: 23 };
            case "upcoming-work-orders": return { w: 2, h: 35, minW: 1, minH: 25 };
            default: return { w: 1, h: 22, minW: 1, minH: 20 };
          }
        };
        
        const defaultSize = getDefaultSize(widget.type);
        
        // lg layout
        if (savedLayouts?.lg) {
          const savedLg = savedLayouts.lg.find(l => l.i === widget.id);
          if (savedLg) {
            initialLayouts.lg!.push(savedLg);
          } else if (settings.layout) {
            initialLayouts.lg!.push({ ...settings.layout, i: widget.id });
          } else {
            initialLayouts.lg!.push({
              i: widget.id,
              x: index % 4,
              y: Math.floor(index / 4) * defaultSize.h,
              w: defaultSize.w,
              h: defaultSize.h,
              minW: defaultSize.minW,
              minH: defaultSize.minH,
            });
          }
        } else if (settings.layout) {
          initialLayouts.lg!.push({ ...settings.layout, i: widget.id });
        } else {
          initialLayouts.lg!.push({
            i: widget.id,
            x: index % 4,
            y: Math.floor(index / 4) * defaultSize.h,
            w: defaultSize.w,
            h: defaultSize.h,
            minW: defaultSize.minW,
            minH: defaultSize.minH,
          });
        }
        
        // md layout
        if (savedLayouts?.md) {
          const savedMd = savedLayouts.md.find(l => l.i === widget.id);
          if (savedMd) {
            initialLayouts.md!.push(savedMd);
          } else {
            const lgItem = initialLayouts.lg!.find(l => l.i === widget.id)!;
            const mdW = Math.min(Math.max(Math.ceil(lgItem.w * 3 / 4), defaultSize.minW), 3);
            initialLayouts.md!.push({
              i: widget.id,
              x: Math.min(lgItem.x, 2),
              y: lgItem.y,
              w: mdW,
              h: lgItem.h,
              minW: defaultSize.minW,
              minH: defaultSize.minH,
            });
          }
        } else {
          const lgItem = initialLayouts.lg!.find(l => l.i === widget.id)!;
          const mdW = Math.min(Math.max(Math.ceil(lgItem.w * 3 / 4), defaultSize.minW), 3);
          initialLayouts.md!.push({
            i: widget.id,
            x: index % 3,
            y: Math.floor(index / 3) * lgItem.h,
            w: mdW,
            h: lgItem.h,
            minW: defaultSize.minW,
            minH: defaultSize.minH,
          });
        }
        
        // sm layout
        if (savedLayouts?.sm) {
          const savedSm = savedLayouts.sm.find(l => l.i === widget.id);
          if (savedSm) {
            initialLayouts.sm!.push(savedSm);
          } else {
            const lgItem = initialLayouts.lg!.find(l => l.i === widget.id)!;
            const smW = Math.min(Math.max(Math.ceil(lgItem.w / 2), defaultSize.minW), 2);
            initialLayouts.sm!.push({
              i: widget.id,
              x: Math.min(lgItem.x, 1),
              y: lgItem.y,
              w: smW,
              h: lgItem.h,
              minW: defaultSize.minW,
              minH: defaultSize.minH,
            });
          }
        } else {
          const lgItem = initialLayouts.lg!.find(l => l.i === widget.id)!;
          const smW = Math.min(Math.max(Math.ceil(lgItem.w / 2), defaultSize.minW), 2);
          initialLayouts.sm!.push({
            i: widget.id,
            x: index % 2,
            y: Math.floor(index / 2) * lgItem.h,
            w: smW,
            h: lgItem.h,
            minW: defaultSize.minW,
            minH: defaultSize.minH,
          });
        }
        
        // xs layout
        if (savedLayouts?.xs) {
          const savedXs = savedLayouts.xs.find(l => l.i === widget.id);
          if (savedXs) {
            initialLayouts.xs!.push(savedXs);
          } else {
            const lgItem = initialLayouts.lg!.find(l => l.i === widget.id)!;
            initialLayouts.xs!.push({
              i: widget.id,
              x: 0,
              y: index * lgItem.h,
              w: 1,
              h: lgItem.h,
              minW: 1,
              minH: defaultSize.minH,
            });
          }
        } else {
          const lgItem = initialLayouts.lg!.find(l => l.i === widget.id)!;
          initialLayouts.xs!.push({
            i: widget.id,
            x: 0,
            y: index * lgItem.h,
            w: 1,
            h: lgItem.h,
            minW: 1,
            minH: defaultSize.minH,
          });
        }
      });
      
      setLayouts(initialLayouts);

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

      const settings = (data.settings as any) || {};
      setWidgets([...widgets, {
        id: data.id,
        type: data.widget_type as Widget["type"],
        position: data.position,
        settings: settings,
        layout: settings.layout || undefined,
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

  const handleLayoutsChange = async (newLayouts: Layouts, updatedWidgets: Widget[]) => {
    setLayouts(newLayouts);
    
    // Calculate visual positions from active breakpoint (fallback to lg)
    const baseLayout = (newLayouts[currentBp] && newLayouts[currentBp]!.length > 0)
      ? newLayouts[currentBp]!
      : (newLayouts.lg || newLayouts.md || newLayouts.sm || newLayouts.xs || []);
    
    const sortedLayout = [...baseLayout].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
    
    const positions: Record<string, number> = {};
    sortedLayout.forEach((item, index) => {
      positions[item.i] = index;
    });
    
    // Update widgets with new positions and layouts
    const widgetsWithPositions = updatedWidgets.map(widget => {
      const lgLayoutItem = newLayouts.lg?.find(l => l.i === widget.id);
      const baseLayoutItem = baseLayout.find(l => l.i === widget.id);
      
      return {
        ...widget,
        position: positions[widget.id] ?? widget.position,
        layout: lgLayoutItem || baseLayoutItem,
      };
    });
    
    setWidgets(widgetsWithPositions);

    // Save to database
    try {
      for (const widget of widgetsWithPositions) {
        await supabase
          .from("dashboard_widgets")
          .update({
            position: widget.position,
            settings: {
              ...widget.settings,
              layout: widget.layout,
              layouts: newLayouts,
            },
          })
          .eq("id", widget.id);
      }
    } catch (error: any) {
      console.error("Error updating widget layout:", error);
      toast({
        title: "Error",
        description: "Failed to save widget layout",
        variant: "destructive",
      });
    }
  };

  const handleSaveLayout = async () => {
    try {
      // Trigger final save of current widget state with full layouts
      for (const widget of widgets) {
        await supabase
          .from("dashboard_widgets")
          .update({
            position: widget.position,
            settings: {
              ...widget.settings,
              layout: widget.layout,
              layouts: layouts,
            },
          })
          .eq("id", widget.id);
      }
      
      setIsEditMode(false);
      toast({
        title: "Layout saved",
        description: "Your dashboard layout has been saved",
      });
    } catch (error: any) {
      console.error("Error saving layout:", error);
      toast({
        title: "Error",
        description: "Failed to save layout",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
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
          layouts={layouts}
          onLayoutsChange={handleLayoutsChange}
          onRemoveWidget={handleRemoveWidget}
          onBreakpointChange={setCurrentBp}
        />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground mb-4">No widgets yet. Add your first widget to get started!</p>
                <AddWidgetDialog onAddWidget={handleAddWidget} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="work-orders">
            <WorkOrders />
          </TabsContent>

          <TabsContent value="property-info">
            <PropertyInfo />
          </TabsContent>

          <TabsContent value="forms">
            <Forms />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
