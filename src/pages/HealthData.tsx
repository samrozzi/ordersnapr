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
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setOrgId(data.organization_id);
      return data;
    },
    enabled: !!user,
  });

  // Fetch health imports
  const { data: imports, refetch: refetchImports } = useQuery({
    queryKey: ["health-imports", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("health_imports")
        .select("*")
        .eq("org_id", orgId)
        .order("import_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const handleImportComplete = async (importData: any) => {
    if (!user || !orgId) return;

    try {
      // Save import metadata to database
      const { data: importRecord, error: importError } = await supabase
        .from("health_imports")
        .insert({
          org_id: orgId,
          user_id: user.id,
          file_name: importData.fileName,
          file_path: importData.filePath,
          file_size_mb: (importData.data.length * 0.001).toFixed(2), // Rough estimate
          record_count: importData.recordCount,
          filter_date: importData.filterDate,
          status: "completed",
        })
        .select()
        .single();

      if (importError) throw importError;

      // Save health records in batches (to avoid payload limits)
      const batchSize = 1000;
      const records = importData.data.map((record: any) => ({
        import_id: importRecord.id,
        org_id: orgId,
        record_type: record.type,
        value: record.value,
        unit: record.unit,
        record_date: record.date,
        source_name: record.sourceName,
        device: record.device,
      }));

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error: recordsError } = await supabase
          .from("health_records")
          .insert(batch);

        if (recordsError) {
          console.error("Error saving batch:", recordsError);
          throw recordsError;
        }

        toast.info(`Saved ${Math.min(i + batchSize, records.length)} of ${records.length} records...`);
      }

      toast.success("Health data imported and saved successfully!");
      refetchImports();
    } catch (error: any) {
      console.error("Error saving import:", error);
      toast.error("Failed to save import: " + error.message);
    }
  };

  const handleDeleteImport = async (importId: string) => {
    if (!confirm("Are you sure you want to delete this import? All associated health records will be deleted.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("health_imports")
        .delete()
        .eq("id", importId);

      if (error) throw error;

      toast.success("Import deleted successfully");
      refetchImports();
    } catch (error: any) {
      console.error("Error deleting import:", error);
      toast.error("Failed to delete import: " + error.message);
    }
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
