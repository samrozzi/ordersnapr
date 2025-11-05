import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppleHealthImport } from "@/components/AppleHealthImport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Download, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

export default function HealthData() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);

  // Fetch user's org
  useQuery({
    queryKey: ["user-org", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setOrgId(data.organization_id);
      return data;
    },
    enabled: !!user,
  });

  // Health data is not used in this app - return empty array
  const imports: any[] = [];
  const refetchImports = () => {};

  const handleImportComplete = async (importData: any) => {
    toast.info("Health data import feature is not enabled for this organization");
  };

  const handleDeleteImport = async (importId: string) => {
    toast.info("Health data management is not enabled for this organization");
  };

  if (!orgId) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Apple Health Data</h1>
          <p className="text-muted-foreground mt-1">
            Import and manage your Apple Health data exports
          </p>
        </div>
        <AppleHealthImport orgId={orgId} onImportComplete={handleImportComplete} />
      </div>

      {/* Imports List */}
      <div className="grid gap-4">
        {imports && imports.length > 0 ? (
          imports.map((importRecord) => (
            <Card key={importRecord.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {importRecord.file_name}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Imported on {format(new Date(importRecord.import_date), "MMM dd, yyyy 'at' h:mm a")}
                    </CardDescription>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteImport(importRecord.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Records</p>
                    <p className="font-medium">
                      {importRecord.record_count.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">File Size</p>
                    <p className="font-medium">{importRecord.file_size_mb} MB</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Filter Date</p>
                    <p className="font-medium">
                      {importRecord.filter_date
                        ? format(new Date(importRecord.filter_date), "MMM dd, yyyy")
                        : "None"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{importRecord.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No health data imported yet</h3>
              <p className="text-muted-foreground mb-4">
                Click the "Import Apple Health Data" button to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
