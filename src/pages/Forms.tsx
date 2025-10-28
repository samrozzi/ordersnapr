import { lazy, Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import JobAudit from "./JobAudit";
import { DraftsTable } from "@/components/DraftsTable";
import { toast } from "sonner";

const RideAlong = lazy(() => import("./RideAlong"));

const Forms = () => {
  const [activeTab, setActiveTab] = useState("job-audit");
  const [draftToLoad, setDraftToLoad] = useState<{
    formType: string;
    data: any;
    id: string;
  } | null>(null);

  const handleLoadDraft = (formType: string, draftData: any, draftId: string) => {
    setDraftToLoad({
      formType,
      data: draftData,
      id: draftId
    });
    setActiveTab(formType);
    toast.success("Loading draft...");
  };

  const handleDraftLoaded = () => {
    setDraftToLoad(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Forms</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="job-audit">Job Audit</TabsTrigger>
          <TabsTrigger value="ride-along">Ride Along</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
        </TabsList>

        <TabsContent value="job-audit">
          <JobAudit 
            draftToLoad={draftToLoad?.formType === 'job-audit' ? draftToLoad.data : null}
            onDraftLoaded={handleDraftLoaded}
          />
        </TabsContent>

        <TabsContent value="ride-along">
          <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
            <RideAlong 
              draftToLoad={draftToLoad?.formType === 'ride-along' ? draftToLoad.data : null}
              onDraftLoaded={handleDraftLoaded}
            />
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
