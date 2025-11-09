import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Settings } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { OrgFeature, FeatureModule } from "@/hooks/use-features";
import { WorkOrdersConfigForm } from "./WorkOrdersConfigForm";

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

export const FeaturesManagementTab = () => {
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [configEdits, setConfigEdits] = useState<Record<string, string>>({});
  const [editingOrgName, setEditingOrgName] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: organizations, isLoading: orgsLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, industry")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: features, isLoading: featuresLoading } = useQuery({
    queryKey: ["org-features", selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      const { data, error } = await supabase
        .from("org_features")
        .select("*")
        .eq("org_id", selectedOrgId);
      if (error) throw error;
      return data as OrgFeature[];
    },
    enabled: !!selectedOrgId,
  });

  const toggleFeatureMutation = useMutation({
    mutationFn: async ({ module, enabled }: { module: string; enabled: boolean }) => {
      if (!selectedOrgId) throw new Error("No organization selected");

      const { error } = await supabase
        .from("org_features")
        .upsert(
          {
            org_id: selectedOrgId,
            module,
            enabled,
            config: {},
          },
          { onConflict: 'org_id,module' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-features", selectedOrgId] });
      toast.success("Feature updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? "Failed to update feature");
      console.error(error);
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ module, config }: { module: string; config: any }) => {
      if (!selectedOrgId) throw new Error("No organization selected");

      const { error } = await supabase
        .from("org_features")
        .upsert(
          {
            org_id: selectedOrgId,
            module,
            enabled: true,
            config,
          },
          { onConflict: 'org_id,module' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-features", selectedOrgId] });
      setConfigEdits({});
      toast.success("Configuration saved");
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? "Failed to save configuration");
    },
  });

  const enableAllFeaturesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrgId) throw new Error("No organization selected");

      const promises = ALL_MODULES.map((module) =>
        supabase.from("org_features").upsert(
          {
            org_id: selectedOrgId,
            module,
            enabled: true,
            config: {},
          },
          { onConflict: 'org_id,module' }
        )
      );

      const results = await Promise.all(promises);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) throw new Error("Failed to enable some features");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-features", selectedOrgId] });
      toast.success("All features enabled successfully");
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? "Failed to enable all features");
    },
  });

  const updateOrgNameMutation = useMutation({
    mutationFn: async ({ orgId, name }: { orgId: string; name: string }) => {
      const { error } = await supabase
        .from("organizations")
        .update({ name })
        .eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization name updated");
      setEditingOrgName("");
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? "Failed to update organization name");
    },
  });

  const handleToggle = (module: string, enabled: boolean) => {
    toggleFeatureMutation.mutate({ module, enabled });
  };

  const handleSaveConfig = (module: string) => {
    try {
      const config = JSON.parse(configEdits[module] || "{}");
      updateConfigMutation.mutate({ module, config });
    } catch (e) {
      toast.error("Invalid JSON configuration");
    }
  };

  if (orgsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Feature Management</CardTitle>
          <CardDescription>
            Enable or disable modules for each organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Select Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an organization..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} {org.industry && `(${org.industry})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedOrgId && (
              <>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Label className="text-base">Organization Name:</Label>
                    {editingOrgName ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingOrgName}
                          onChange={(e) => setEditingOrgName(e.target.value)}
                          className="w-64"
                        />
                        <Button
                          size="sm"
                          onClick={() =>
                            updateOrgNameMutation.mutate({
                              orgId: selectedOrgId,
                              name: editingOrgName,
                            })
                          }
                          disabled={updateOrgNameMutation.isPending}
                        >
                          {updateOrgNameMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingOrgName("")}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium">
                          {organizations?.find((o) => o.id === selectedOrgId)?.name}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setEditingOrgName(
                              organizations?.find((o) => o.id === selectedOrgId)?.name || ""
                            )
                          }
                        >
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    onClick={() => enableAllFeaturesMutation.mutate()}
                    disabled={enableAllFeaturesMutation.isPending}
                  >
                    {enableAllFeaturesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Enable All Features
                  </Button>
                </div>

                <div className="space-y-3 mt-6">
                  {featuresLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                  ALL_MODULES.map((module) => {
                    const feature = features?.find((f) => f.module === module);
                    const isEnabled = feature?.enabled || false;
                    const currentConfig = JSON.stringify(feature?.config || {}, null, 2);

                    return (
                      <Card key={module}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => handleToggle(module, checked)}
                              />
                              <div>
                                <Label className="text-base font-medium">
                                  {MODULE_LABELS[module]}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  {module.replace(/_/g, " ")}
                                </p>
                              </div>
                            </div>
                            {isEnabled && (
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Settings className="h-4 w-4 mr-2" />
                                    Configure
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-4">
                                  <div className="space-y-2">
                                    {module === 'work_orders' ? (
                                      <WorkOrdersConfigForm
                                        config={feature?.config || {}}
                                        onSave={(config) => updateConfigMutation.mutate({ module, config })}
                                      />
                                    ) : (
                                      <>
                                        <Label>Configuration (JSON)</Label>
                                        <Textarea
                                          value={configEdits[module] ?? currentConfig}
                                          onChange={(e) =>
                                            setConfigEdits((prev) => ({
                                              ...prev,
                                              [module]: e.target.value,
                                            }))
                                          }
                                          className="font-mono text-sm"
                                          rows={6}
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => handleSaveConfig(module)}
                                        >
                                          Save Config
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
