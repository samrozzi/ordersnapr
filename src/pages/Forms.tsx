import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JobAudit from "./JobAudit";

const Forms = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Forms</h2>
      
      <Tabs defaultValue="job-audit" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-1">
          <TabsTrigger value="job-audit">Job Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="job-audit">
          <JobAudit />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Forms;
