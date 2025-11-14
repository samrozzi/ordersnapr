import { ClipboardList, FileText, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveOrg } from "@/hooks/use-active-org";

interface QuickStatsWidgetProps {
  size: "S" | "M";
}

export const QuickStatsWidget = ({ size }: QuickStatsWidgetProps) => {
  const navigate = useNavigate();
  const { activeOrgId } = useActiveOrg();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ["quick-stats", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return null;
      
      const [workOrdersRes, invoicesRes, customersRes] = await Promise.all([
        supabase
          .from("work_orders")
          .select("id, status", { count: "exact", head: false })
          .eq("organization_id", activeOrgId)
          .in("status", ["pending", "in_progress"]),
        supabase
          .from("invoices")
          .select("id, status", { count: "exact", head: false })
          .eq("org_id", activeOrgId)
          .eq("status", "sent"),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("org_id", activeOrgId),
      ]);
      
      return {
        activeWorkOrders: workOrdersRes.data?.length || 0,
        pendingInvoices: invoicesRes.data?.length || 0,
        totalCustomers: customersRes.count || 0,
      };
    },
    enabled: !!activeOrgId,
  });

  const statCards = [
    {
      icon: ClipboardList,
      label: "Active Jobs",
      value: stats?.activeWorkOrders || 0,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      onClick: () => navigate("/work-orders"),
    },
    {
      icon: FileText,
      label: "Pending Invoices",
      value: stats?.pendingInvoices || 0,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      onClick: () => navigate("/invoices"),
    },
    {
      icon: Users,
      label: "Customers",
      value: stats?.totalCustomers || 0,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      onClick: () => navigate("/customers"),
    },
  ];

  const displayStats = size === "S" ? statCards.slice(0, 2) : statCards;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Quick Stats</h3>
      </div>

      {/* Stats Grid */}
      <div className={`flex-1 grid gap-2 ${size === "S" ? "grid-cols-1" : "grid-cols-2"}`}>
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center h-full text-muted-foreground">
            <p className="text-xs">Loading...</p>
          </div>
        ) : (
          displayStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <button
                key={stat.label}
                onClick={stat.onClick}
                className="flex flex-col justify-between bg-card/50 hover:bg-accent/20 rounded-lg p-3 transition-colors text-left group"
              >
                <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center mb-2`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold mb-1">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
