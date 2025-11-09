import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { FeatureModule } from "@/hooks/use-features";

const ALL_MODULES: FeatureModule[] = [
  "work_orders",
  "calendar",
  "properties",
  "forms",
  "reports",
  "appointments",
  "invoicing",
  "inventory",
  "customer_portal",
  "pos",
  "files",
  "customers",
];

const MODULE_LABELS: Record<FeatureModule, string> = {
  work_orders: "Work Orders",
  calendar: "Calendar",
  properties: "Properties",
  forms: "Forms",
  reports: "Reports",
  appointments: "Appointments",
  invoicing: "Invoicing",
  inventory: "Inventory",
  customer_portal: "Customer Portal",
  pos: "Point of Sale",
  files: "Files",
  customers: "Customers",
};

interface UserFeaturesManagementProps {
  userId: string;
  onClose: () => void;
}

export const UserFeaturesManagement = ({ userId, onClose }: UserFeaturesManagementProps) => {
  const queryClient = useQueryClient();
  
  // Get current user features from localStorage
  const getUserFeatures = (): FeatureModule[] => {
    try {
      const stored = localStorage.getItem(`user_features_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const [selectedFeatures, setSelectedFeatures] = useState<FeatureModule[]>(getUserFeatures());

  const saveFeaturesMutation = useMutation({
    mutationFn: async (features: FeatureModule[]) => {
      // Save to localStorage for the user
      localStorage.setItem(`user_features_${userId}`, JSON.stringify(features));
      return features;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences", userId] });
      toast.success("User features updated successfully");
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? "Failed to update user features");
    },
  });

  const handleToggleFeature = (module: FeatureModule) => {
    setSelectedFeatures((prev) =>
      prev.includes(module)
        ? prev.filter((f) => f !== module)
        : [...prev, module]
    );
  };

  const handleEnableAll = () => {
    setSelectedFeatures([...ALL_MODULES]);
  };

  const handleSave = () => {
    saveFeaturesMutation.mutate(selectedFeatures);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Feature Access</CardTitle>
        <CardDescription>
          Choose which features this user can access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-sm text-muted-foreground">
            {selectedFeatures.length} of {ALL_MODULES.length} features enabled
          </Label>
          <Button variant="outline" size="sm" onClick={handleEnableAll}>
            Enable All
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {ALL_MODULES.map((module) => (
            <div
              key={module}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <Label className="cursor-pointer flex-1" htmlFor={`feature-${module}`}>
                {MODULE_LABELS[module]}
              </Label>
              <Switch
                id={`feature-${module}`}
                checked={selectedFeatures.includes(module)}
                onCheckedChange={() => handleToggleFeature(module)}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveFeaturesMutation.isPending}
          >
            {saveFeaturesMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
