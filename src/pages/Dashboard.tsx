import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardGrid } from "@/components/DashboardGrid";
import { AddWidgetDialog } from "@/components/AddWidgetDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Edit, Save, Shield, Home, Calendar as CalendarIcon, User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ordersnaprLogo from "@/assets/ordersnapr-horizontal.png";
import WorkOrders from "./WorkOrders";
import PropertyInfo from "./PropertyInfo";
import Forms from "./Forms";

interface Widget {
  id: string;
  type: "calendar-small" | "calendar-medium" | "calendar-large" | "weather";
  position: number;
  settings: any;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
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
        .in("role", ["admin"]);

      setIsAdmin(!!rolesData?.some(r => r.role === "admin"));

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
                {isAdmin && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate("/admin")}
                        aria-label="Admin"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                      >
                        <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Admin</TooltipContent>
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
