import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePremiumAccess } from "@/hooks/use-premium-access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase,
  Home,
  FileText,
  Calendar,
  Users,
  Package,
  DollarSign,
  FolderOpen,
  ShoppingCart,
  BarChart3,
  Crown,
} from "lucide-react";

const AVAILABLE_FEATURES = [
  {
    id: "work_orders",
    name: "Work Orders",
    description: "Manage jobs, tasks, and service requests",
    icon: Briefcase,
    free: true,
  },
  {
    id: "properties",
    name: "Properties",
    description: "Track properties and locations",
    icon: Home,
    free: true,
  },
  {
    id: "forms",
    name: "Forms",
    description: "Create custom forms and templates",
    icon: FileText,
    free: true,
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Schedule and view events",
    icon: Calendar,
    free: true,
  },
  {
    id: "invoicing",
    name: "Invoicing",
    description: "Create and manage invoices",
    icon: DollarSign,
    free: false,
  },
  {
    id: "customers",
    name: "Customers",
    description: "Manage customer relationships",
    icon: Users,
    free: false,
  },
  {
    id: "inventory",
    name: "Inventory",
    description: "Track parts and materials",
    icon: Package,
    free: false,
  },
  {
    id: "reports",
    name: "Reports",
    description: "Analytics and insights",
    icon: BarChart3,
    free: false,
  },
  {
    id: "files",
    name: "Files",
    description: "Document management",
    icon: FolderOpen,
    free: false,
  },
  {
    id: "pos",
    name: "Point of Sale",
    description: "In-person sales and transactions",
    icon: ShoppingCart,
    free: false,
  },
];

export function PersonalSettings() {
  const { user } = useAuth();
  const { hasPremiumAccess } = usePremiumAccess();
  const { toast } = useToast();
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load user's enabled features from localStorage
    if (user) {
      const savedFeatures = localStorage.getItem(`user_features_${user.id}`);
      if (savedFeatures) {
        try {
          setEnabledFeatures(JSON.parse(savedFeatures));
        } catch (e) {
          console.error("Error parsing user features:", e);
        }
      }
    }
  }, [user]);

  const toggleFeature = (featureId: string) => {
    setEnabledFeatures((prev) => {
      const updated = prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId];
      setHasChanges(true);
      return updated;
    });
  };

  const handleSave = () => {
    if (user) {
      localStorage.setItem(`user_features_${user.id}`, JSON.stringify(enabledFeatures));
      toast({
        title: "Settings Saved",
        description: "Your sidebar preferences have been updated. Refresh the page to see changes.",
      });
      setHasChanges(false);

      // Trigger a page reload to refresh sidebar
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleReset = () => {
    // Reset to free tier defaults
    const defaults = AVAILABLE_FEATURES.filter((f) => f.free).map((f) => f.id);
    setEnabledFeatures(defaults);
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sidebar Customization</CardTitle>
          <CardDescription>
            Choose which pages appear in your sidebar navigation. {!hasPremiumAccess() && (
              <span className="text-orange-600 dark:text-orange-400 font-medium">
                Premium features will be locked until you upgrade your account or join/create an organization.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_FEATURES.map((feature) => {
              const Icon = feature.icon;
              const isEnabled = enabledFeatures.includes(feature.id);
              const isPremium = !feature.free;
              const hasAccess = hasPremiumAccess();

              return (
                <Card
                  key={feature.id}
                  className={`p-4 ${isEnabled ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                          isEnabled
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Label className="font-semibold cursor-pointer">
                            {feature.name}
                          </Label>
                          {isPremium && (
                            <Badge variant={hasAccess ? "default" : "secondary"} className="gap-1">
                              <Crown className="h-3 w-3" />
                              Premium
                            </Badge>
                          )}
                          {!isPremium && (
                            <Badge variant="outline">Free</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleFeature(feature.id)}
                    />
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
              Reset to Defaults
            </Button>
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground py-2">
                {enabledFeatures.length} {enabledFeatures.length === 1 ? "page" : "pages"} enabled
              </span>
              <Button onClick={handleSave} disabled={!hasChanges}>
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasPremiumAccess() && (
        <Card className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              Unlock Premium Features
            </CardTitle>
            <CardDescription>
              You're currently on a free account with limited access. Premium features in your sidebar
              will be locked until you upgrade your account or join/create an organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Free tier includes: Work Orders (3), Properties (2), Forms (2), Calendar (5 events)
            </p>
            <Button>
              Upgrade
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
