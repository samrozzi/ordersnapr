import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { FeatureModule } from "@/hooks/use-features";

const ALL_MODULES: FeatureModule[] = [
  "work_orders",
  "calendar",
  "properties",
  "forms",
  "reports",
  "appointments",
  "invoicing",
  "customers",
  "inventory",
  "customer_portal",
  "pos",
  "files",
];

const MODULE_LABELS: Record<FeatureModule, string> = {
  work_orders: "Work Orders",
  calendar: "Calendar",
  properties: "Properties",
  forms: "Forms",
  reports: "Reports",
  appointments: "Appointments",
  invoicing: "Invoicing",
  customers: "Customers",
  inventory: "Inventory",
  customer_portal: "Customer Portal",
  pos: "Point of Sale",
  files: "Files",
};

interface OrganizationManagementProps {
  orgId: string;
  onClose: () => void;
}

export function OrganizationManagement({ orgId, onClose }: OrganizationManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orgName, setOrgName] = useState("");
  const [orgIndustry, setOrgIndustry] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<FeatureModule[]>([]);

  const { data: org } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: features } = useQuery({
    queryKey: ["org-features", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_features")
        .select("*")
        .eq("org_id", orgId);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (org) {
      setOrgName(org.name || "");
      setOrgIndustry(org.industry || "");
    }
  }, [org]);

  useEffect(() => {
    if (features) {
      const enabled = features
        .filter((f) => f.enabled)
        .map((f) => f.module as FeatureModule);
      setSelectedFeatures(enabled);
    }
  }, [features]);

  const updateOrgMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("organizations")
        .update({ name: orgName, industry: orgIndustry })
        .eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Organization updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveFeaturesMutation = useMutation({
    mutationFn: async (features: FeatureModule[]) => {
      const upserts = ALL_MODULES.map((module) => ({
        org_id: orgId,
        module,
        enabled: features.includes(module),
        config: {},
      }));

      const { error } = await supabase
        .from("org_features")
        .upsert(upserts, { onConflict: 'org_id,module' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Features updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["org-features", orgId] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update features",
        description: error.message,
        variant: "destructive",
      });
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

  const handleSave = async () => {
    await updateOrgMutation.mutateAsync();
    await saveFeaturesMutation.mutateAsync(selectedFeatures);
    onClose();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Organization Details */}
        <div className="space-y-4">
          <h3 className="font-semibold">Organization Details</h3>
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-industry">Industry</Label>
            <Input
              id="org-industry"
              value={orgIndustry}
              onChange={(e) => setOrgIndustry(e.target.value)}
            />
          </div>
        </div>

        {/* Feature Access */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              Feature Access ({selectedFeatures.length} of {ALL_MODULES.length} enabled)
            </h3>
            <Button onClick={handleEnableAll} variant="outline" size="sm">
              Enable All Features
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {ALL_MODULES.map((module) => (
              <div
                key={module}
                className="flex items-center justify-between space-x-2 rounded-lg border p-3"
              >
                <Label htmlFor={`feature-${module}`} className="cursor-pointer">
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
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateOrgMutation.isPending || saveFeaturesMutation.isPending}
          >
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
