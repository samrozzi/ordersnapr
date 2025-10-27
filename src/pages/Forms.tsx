import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JobAudit from "./JobAudit";
import RideAlong from "./RideAlong";

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
          <RideAlong />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Forms;
