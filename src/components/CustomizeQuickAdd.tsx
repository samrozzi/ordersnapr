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
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Plus,
  Info,
} from "lucide-react";

// Feature icons mapping
const FEATURE_ICONS: Record<FeatureModule, typeof Plus> = {
  work_orders: Briefcase,
  properties: Home,
  forms: FileText,
  calendar: Calendar,
  appointments: Users,
  inventory: Package,
  invoicing: DollarSign,
  reports: BarChart3,
  files: FolderOpen,
  customer_portal: Users,
  pos: ShoppingCart,
};

export function CustomizeQuickAdd() {
  const { user } = useAuth();
  const { features, getFeatureConfig } = useFeatureContext();
  const { data: preferences, isLoading } = useUserPreferences(user?.id || null);
  const updatePreferences = useUpdateUserPreferences();
  const { toast } = useToast();
  const { hasPremiumAccess } = usePremiumAccess();

  const [quickAddEnabled, setQuickAddEnabled] = useState(true);
  const [selectedItems, setSelectedItems] = useState<FeatureModule[]>([]);
  const [userFeatureModules, setUserFeatureModules] = useState<FeatureModule[]>([]);
  const initializedRef = useRef(false);

  // Get user's enabled features (from org or localStorage)
  useEffect(() => {
    if (!user) return;

    // If user has org features, use those
    if (features && features.length > 0) {
      const enabledFeatures = features
        .filter(f => f.enabled)
        .map(f => f.module as FeatureModule);
      setUserFeatureModules(enabledFeatures);
    } else {
      // Free tier user - check localStorage
      const userFeaturesJson = localStorage.getItem(`user_features_${user.id}`);
      if (userFeaturesJson) {
        try {
          const userFeatures: string[] = JSON.parse(userFeaturesJson);
          setUserFeatureModules(userFeatures as FeatureModule[]);
        } catch (e) {
          console.error("Error parsing user features:", e);
        }
      }
    }
  }, [user, features]);

  // Initialize state from preferences - only once
  useEffect(() => {
    // Only initialize if we haven't already and we have the necessary data
    if (initializedRef.current || !userFeatureModules.length) return;

    if (preferences) {
      setQuickAddEnabled(preferences.quick_add_enabled);
      setSelectedItems(preferences.quick_add_items || []);
      initializedRef.current = true;
    } else if (userFeatureModules.length > 0) {
      // Default: all enabled features (up to 2 for free tier)
      const defaultItems = hasPremiumAccess()
        ? userFeatureModules
        : userFeatureModules.slice(0, 2);
      setSelectedItems(defaultItems);
      initializedRef.current = true;
    }
  }, [preferences, userFeatureModules, hasPremiumAccess]);

  const handleToggleItem = (feature: FeatureModule) => {
    setSelectedItems(prev => {
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

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      await updatePreferences.mutateAsync({
        userId: user.id,
        quickAddEnabled,
        quickAddItems: selectedItems,
      });

      // Reset initialized flag so that any server changes get picked up
      initializedRef.current = false;

      toast({
        title: "Success",
        description: "Quick Add preferences saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading preferences...</div>;
  }

  const isPremium = hasPremiumAccess();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customize Quick Add Button</CardTitle>
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
              Choose which features appear in the Quick Add menu
            </p>

            {userFeatureModules.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No features available</AlertTitle>
                <AlertDescription>
                  You haven't selected any features yet. Go to Profile → Preferences to select which pages you want to use.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {userFeatureModules.map(featureModule => {
                  const config = getFeatureConfig(featureModule);
                  const Icon = FEATURE_ICONS[featureModule] || Plus;
                  const label = config?.display_name || featureModule.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                  return (
                    <div
                      key={featureModule}
                      className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent transition-colors"
                    >
                      <Switch
                        id={`feature-${featureModule}`}
                        checked={selectedItems.includes(featureModule)}
                        onCheckedChange={() => handleToggleItem(featureModule)}
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

            {selectedItems.length === 0 && quickAddEnabled && (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Warning: You must select at least one item, or the Quick Add button will not appear.
              </p>
            )}
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={updatePreferences.isPending}
          className="w-full"
        >
          {updatePreferences.isPending ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
