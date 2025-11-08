import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Zap, ClipboardList, Building, FileText, Calendar } from "lucide-react";
import { PricingModal } from "@/components/PricingModal";
import { useState } from "react";

export default function FreeTierDashboard() {
  const { user } = useAuth();
  const [showPricing, setShowPricing] = useState(false);

  // Count work orders
  const { data: workOrdersCount = 0 } = useQuery({
    queryKey: ["work-orders-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("work_orders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("organization_id", null);
      return count || 0;
    },
    enabled: !!user,
  });

  // Count properties
  const { data: propertiesCount = 0 } = useQuery({
    queryKey: ["properties-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  // Count form templates
  const { data: formsCount = 0 } = useQuery({
    queryKey: ["form-templates-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("form_templates")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .is("org_id", null)
        .eq("scope", "user");
      return count || 0;
    },
    enabled: !!user,
  });

  // Count calendar events
  const { data: eventsCount = 0 } = useQuery({
    queryKey: ["calendar-events-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("calendar_events")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .is("organization_id", null);
      return count || 0;
    },
    enabled: !!user,
  });

  const limits = {
    workOrders: 3,
    properties: 2,
    forms: 2,
    calendarEvents: 10,
  };

  const usageItems = [
    {
      label: "Work Orders",
      count: workOrdersCount,
      limit: limits.workOrders,
      icon: ClipboardList,
      color: "text-blue-500",
    },
    {
      label: "Properties",
      count: propertiesCount,
      limit: limits.properties,
      icon: Building,
      color: "text-green-500",
    },
    {
      label: "Form Templates",
      count: formsCount,
      limit: limits.forms,
      icon: FileText,
      color: "text-purple-500",
    },
    {
      label: "Calendar Events",
      count: eventsCount,
      limit: limits.calendarEvents,
      icon: Calendar,
      color: "text-orange-500",
    },
  ];

  return (
    <>
      <div className="container mx-auto p-6 max-w-5xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Free Tier Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your usage and upgrade to unlock unlimited resources
          </p>
        </div>

        {/* Upgrade CTA */}
        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle>Upgrade to Premium</CardTitle>
                <CardDescription className="mt-2">
                  Get unlimited work orders, properties, forms, and access to advanced features like invoicing, inventory, and reports
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowPricing(true)} size="lg" className="w-full sm:w-auto">
              View Pricing Plans
            </Button>
          </CardContent>
        </Card>

        {/* Usage Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          {usageItems.map((item) => {
            const Icon = item.icon;
            const percentage = (item.count / item.limit) * 100;
            const isNearLimit = percentage >= 80;
            const atLimit = item.count >= item.limit;

            return (
              <Card key={item.label}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${item.color}`} />
                      <CardTitle className="text-lg">{item.label}</CardTitle>
                    </div>
                    <span className={`text-sm font-semibold ${atLimit ? "text-destructive" : isNearLimit ? "text-amber-500" : "text-muted-foreground"}`}>
                      {item.count} / {item.limit}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress 
                    value={percentage} 
                    className={`h-2 ${atLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-amber-500" : ""}`}
                  />
                  {atLimit && (
                    <p className="text-xs text-destructive mt-2">
                      Limit reached. Upgrade to create more.
                    </p>
                  )}
                  {isNearLimit && !atLimit && (
                    <p className="text-xs text-amber-600 mt-2">
                      Approaching limit. Consider upgrading.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features Info */}
        <Card>
          <CardHeader>
            <CardTitle>Premium Features</CardTitle>
            <CardDescription>
              Unlock these powerful features with a premium plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Unlimited Work Orders & Properties
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Invoicing & Payment Tracking
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Inventory Management
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Advanced Reports & Analytics
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Customer Portal Access
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Point of Sale (POS) System
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                File Management & Storage
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Organization Management
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <PricingModal open={showPricing} onClose={() => setShowPricing(false)} />
    </>
  );
}
