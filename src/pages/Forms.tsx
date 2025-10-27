import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JobAudit from "./JobAudit";

const RideAlong = lazy(() => import("./RideAlong"));

const Forms = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Forms</h2>
      
      <Tabs defaultValue="job-audit" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="job-audit">Job Audit</TabsTrigger>
          <TabsTrigger value="ride-along">Ride Along</TabsTrigger>
        </TabsList>

        <TabsContent value="job-audit">
          <JobAudit />
        </TabsContent>

        <TabsContent value="ride-along">
          <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
            <RideAlong />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Forms;
