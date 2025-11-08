import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useFeatureContext } from "@/contexts/FeatureContext";
import { useUserPreferences, useUpdateUserPreferences } from "@/hooks/use-user-preferences";
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

  const [quickAddEnabled, setQuickAddEnabled] = useState(true);
  const [selectedItems, setSelectedItems] = useState<FeatureModule[]>([]);

  // Initialize state from preferences
  useEffect(() => {
    if (preferences) {
      setQuickAddEnabled(preferences.quick_add_enabled);
      setSelectedItems(preferences.quick_add_items || []);
    } else {
      // Default: all enabled features
      const enabledFeatures = features
        .filter(f => f.enabled)
        .map(f => f.module as FeatureModule);
      setSelectedItems(enabledFeatures);
    }
  }, [preferences, features]);

  const handleToggleItem = (feature: FeatureModule) => {
    setSelectedItems(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      await updatePreferences.mutateAsync({
        userId: user.id,
        quickAddEnabled,
        quickAddItems: selectedItems,
      });

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

  const enabledFeatures = features.filter(f => f.enabled);

  if (isLoading) {
    return <div>Loading preferences...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customize Quick Add Button</CardTitle>
        <CardDescription>
          Control which items appear in the Quick Add floating button
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

            <div className="space-y-2">
              {enabledFeatures.map(feature => {
                const featureModule = feature.module as FeatureModule;
                const config = getFeatureConfig(featureModule);
                const Icon = FEATURE_ICONS[featureModule] || Plus;
                const label = config?.display_name || feature.module;

                return (
                  <div
                    key={feature.id}
                    className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent transition-colors"
                  >
                    <Switch
                      id={`feature-${feature.id}`}
                      checked={selectedItems.includes(featureModule)}
                      onCheckedChange={() => handleToggleItem(featureModule)}
                    />
                    <Label
                      htmlFor={`feature-${feature.id}`}
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Label>
                  </div>
                );
              })}
            </div>

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
