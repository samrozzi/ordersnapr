import { lazy, Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JobAudit from "./JobAudit";
import { DraftsTable } from "@/components/DraftsTable";
import { toast } from "sonner";

const RideAlong = lazy(() => import("./RideAlong"));

const Forms = () => {
  const [activeTab, setActiveTab] = useState("job-audit");

  const handleLoadDraft = (formType: string, draftData: any, draftId: string) => {
    setActiveTab(formType);
    toast.success("Switching to form to load draft...");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Forms</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="job-audit">Job Audit</TabsTrigger>
          <TabsTrigger value="ride-along">Ride Along</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
        </TabsList>

        <TabsContent value="job-audit">
          <JobAudit />
        </TabsContent>

        <TabsContent value="ride-along">
          <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
            <RideAlong />
          </Suspense>
        </TabsContent>

        <TabsContent value="drafts">
          <DraftsTable onLoadDraft={handleLoadDraft} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Forms;
