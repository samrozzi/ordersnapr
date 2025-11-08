import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useFeatureContext } from "@/contexts/FeatureContext";
import { useUserPreferences, useUpdateUserPreferences } from "@/hooks/use-user-preferences";
import { usePremiumAccess } from "@/hooks/use-premium-access";
import { FeatureModule } from "@/hooks/use-features";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { PricingModal } from "@/components/PricingModal";
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
  Info,
  Plus,
  Sparkles,
  Sidebar as SidebarIcon,
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

export function UnifiedPreferences() {
  const { user } = useAuth();
  const { features, getFeatureConfig } = useFeatureContext();
  const { data: preferences, isLoading } = useUserPreferences(user?.id || null);
  const updatePreferences = useUpdateUserPreferences();
  const { toast } = useToast();
  const { hasPremiumAccess } = usePremiumAccess();
  
  // Sidebar preferences state
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [sidebarHasChanges, setSidebarHasChanges] = useState(false);
  
  // Quick Add preferences state
  const [quickAddEnabled, setQuickAddEnabled] = useState(true);
  const [selectedQuickAddItems, setSelectedQuickAddItems] = useState<FeatureModule[]>([]);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const initializedRef = useRef(false);

  // Load sidebar preferences from localStorage
  useEffect(() => {
    if (user) {
      const savedFeatures = localStorage.getItem(`user_features_${user.id}`);
      if (savedFeatures) {
        try {
          setEnabledFeatures(JSON.parse(savedFeatures));
        } catch (e) {
          console.error("Error parsing user features:", e);
          // On error, set free tier defaults
          const defaults = AVAILABLE_FEATURES.filter((f) => f.free).map((f) => f.id);
          setEnabledFeatures(defaults);
        }
      } else {
        // No saved preferences - initialize with free tier defaults
        const defaults = AVAILABLE_FEATURES.filter((f) => f.free).map((f) => f.id);
        setEnabledFeatures(defaults);
      }
    }
  }, [user]);

  // Get user's enabled features for Quick Add (from org or localStorage)
  const userFeatureModules = enabledFeatures as FeatureModule[];

  // Initialize Quick Add preferences
  useEffect(() => {
    if (isLoading || !user) return;
    if (initializedRef.current) return;

    if (preferences) {
      // Hydrate from existing preferences
      setQuickAddEnabled(preferences.quick_add_enabled ?? false);
      setSelectedQuickAddItems(preferences.quick_add_items as FeatureModule[] || []);
      initializedRef.current = true;
    } else if (userFeatureModules.length > 0) {
      // First time: seed defaults
      const defaults = hasPremiumAccess() 
        ? userFeatureModules.slice(0, 4) 
        : userFeatureModules.slice(0, 2);
      setQuickAddEnabled(false);
      setSelectedQuickAddItems(defaults);
      initializedRef.current = true;
    }
  }, [preferences, isLoading, user, hasPremiumAccess, userFeatureModules]);

  const toggleSidebarFeature = (featureId: string) => {
    setEnabledFeatures((prev) => {
      const updated = prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId];
      setSidebarHasChanges(true);
      return updated;
    });
  };

  const handleSaveSidebar = () => {
    if (user) {
      localStorage.setItem(`user_features_${user.id}`, JSON.stringify(enabledFeatures));
      toast({
        title: "Sidebar Preferences Saved",
        description: "Please refresh the page or navigate to another page to see your changes.",
        duration: 5000,
      });
      setSidebarHasChanges(false);
    }
  };

  const handleResetSidebar = () => {
    // Reset to free tier defaults
    const defaults = AVAILABLE_FEATURES.filter((f) => f.free).map((f) => f.id);
    setEnabledFeatures(defaults);
    setSidebarHasChanges(true);
  };

  const handleToggleQuickAddItem = (feature: FeatureModule) => {
    setSelectedQuickAddItems(prev => {
      if (prev.includes(feature)) {
        // Removing item
        return prev.filter(f => f !== feature);
      } else {
        // Adding item - check free tier limit
        if (!hasPremiumAccess() && prev.length >= 2) {
          toast({
            title: "Free Tier Limit",
            description: "Free accounts can only have 2 Quick Add items. Upgrade for unlimited access!",
            variant: "default",
          });
          return prev;
        }
        return [...prev, feature];
      }
    });
  };

  const handleSaveQuickAdd = async () => {
    if (!user) return;

    try {
      await updatePreferences.mutateAsync({
        userId: user.id,
        quickAddEnabled,
        quickAddItems: selectedQuickAddItems,
      });
      toast({
        title: "Quick Add Preferences Saved",
        description: "Your Quick Add button has been updated",
      });
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save Quick Add preferences",
        variant: "destructive",
      });
    }
  };

  const isPremium = hasPremiumAccess();

  return (
    <div className="space-y-6">
      {/* Sidebar Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SidebarIcon className="h-5 w-5" />
            Sidebar Navigation
          </CardTitle>
          <CardDescription>
            Choose which pages appear in your sidebar navigation. {!isPremium && (
              <span className="text-orange-600 dark:text-orange-400 font-medium block mt-1">
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
              const isFeaturePremium = !feature.free;
              const hasAccess = hasPremiumAccess();

              return (
                <Card
                  key={feature.id}
                  className={`p-4 ${isEnabled ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label className="font-semibold cursor-pointer break-words">
                            {feature.name}
                          </Label>
                          {isFeaturePremium && (
                            <Badge variant={hasAccess ? "default" : "secondary"} className="gap-1 flex-shrink-0">
                              <Crown className="h-3 w-3" />
                              Premium
                            </Badge>
                          )}
                          {!isFeaturePremium && (
                            <Badge variant="outline" className="flex-shrink-0">Free</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 break-words">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleSidebarFeature(feature.id)}
                      className="flex-shrink-0"
                    />
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleResetSidebar} disabled={!sidebarHasChanges}>
              Reset to Defaults
            </Button>
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground py-2">
                {enabledFeatures.length} {enabledFeatures.length === 1 ? "page" : "pages"} enabled
              </span>
              <Button onClick={handleSaveSidebar} disabled={!sidebarHasChanges}>
                Save Sidebar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Button Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Add Button
          </CardTitle>
          <CardDescription>
            Control which items appear in the Quick Add floating button
            {!isPremium && (
              <span className="text-orange-600 dark:text-orange-400 block mt-1">
                (Free tier: Maximum 2 items)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Quick Add */}
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="flex-1">
              <Label htmlFor="quick-add-enabled" className="text-base font-medium">
                Show Quick Add Button
              </Label>
              <p className="text-sm text-muted-foreground">
                Display the floating "+" button in the bottom-right corner
              </p>
            </div>
            <Switch
              id="quick-add-enabled"
              checked={quickAddEnabled}
              onCheckedChange={setQuickAddEnabled}
            />
          </div>

          {/* Feature Selection */}
          {quickAddEnabled && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Select Items to Show</Label>
              <p className="text-sm text-muted-foreground">
                Choose which features appear in the Quick Add menu (based on your sidebar selection)
              </p>

              {userFeatureModules.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>No features enabled</AlertTitle>
                  <AlertDescription>
                    Enable features in the Sidebar Navigation section above to add them to Quick Add.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {userFeatureModules.map(featureModule => {
                    const config = getFeatureConfig(featureModule);
                    const featureData = AVAILABLE_FEATURES.find(f => f.id === featureModule);
                    const Icon = featureData?.icon || Plus;
                    const label = config?.display_name || featureData?.name || featureModule.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                    return (
                      <div
                        key={featureModule}
                        className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent transition-colors"
                      >
                        <Switch
                          id={`feature-${featureModule}`}
                          checked={selectedQuickAddItems.includes(featureModule)}
                          onCheckedChange={() => handleToggleQuickAddItem(featureModule)}
                        />
                        <Label
                          htmlFor={`feature-${featureModule}`}
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedQuickAddItems.length === 0 && quickAddEnabled && (
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Warning: You must select at least one item, or the Quick Add button will not appear.
                </p>
              )}
            </div>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSaveQuickAdd}
            disabled={updatePreferences.isPending}
            className="w-full"
          >
            {updatePreferences.isPending ? "Saving..." : "Save Quick Add"}
          </Button>
        </CardContent>
      </Card>

      {/* Upgrade Prompt */}
      {!isPremium && (
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
            <Button onClick={() => setShowPricingModal(true)}>
              View Upgrade Options
            </Button>
          </CardContent>
        </Card>
      )}

      <PricingModal open={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </div>
  );
}
