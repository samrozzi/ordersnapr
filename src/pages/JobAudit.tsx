import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const JobAudit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [formData, setFormData] = useState({
    technicianName: "",
    ban: "",
    serviceDate: "",
    address: "",
    observations: "",
    reportBy: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerateReport = () => {
    toast({
      title: "Report Generation",
      description: "PDF report generation feature coming soon!",
    });
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Quality Inspection</h1>
          <p className="text-muted-foreground">Complete the inspection form and generate your report</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Job Quality Inspection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="technicianName">Technician Name</Label>
                <Input
                  id="technicianName"
                  placeholder="Enter technician name"
                  value={formData.technicianName}
                  onChange={(e) => handleInputChange("technicianName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ban">BAN</Label>
                <Input
                  id="ban"
                  placeholder="Enter BAN"
                  value={formData.ban}
                  onChange={(e) => handleInputChange("ban", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceDate">Service Date</Label>
                <Input
                  id="serviceDate"
                  type="date"
                  value={formData.serviceDate}
                  onChange={(e) => handleInputChange("serviceDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter service address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observations & Notes</Label>
              <Textarea
                id="observations"
                placeholder="Enter your observations about the job..."
                value={formData.observations}
                onChange={(e) => handleInputChange("observations", e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportBy">Report by</Label>
              <Select value={formData.reportBy} onValueChange={(value) => handleInputChange("reportBy", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select inspector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inspector1">Inspector 1</SelectItem>
                  <SelectItem value="inspector2">Inspector 2</SelectItem>
                  <SelectItem value="inspector3">Inspector 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Photos</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Add Photos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Accordion type="single" collapsible className="space-y-4 mb-6">
          <AccordionItem value="administrative" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold">Administrative/Testing</span>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <p className="text-muted-foreground">Administrative and testing checklist items will go here.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="customer" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold">Customer Experience</span>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <p className="text-muted-foreground">Customer experience checklist items will go here.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="main-focus" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold">MAIN FOCUS/BSW AUDIT - Drop</span>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <p className="text-muted-foreground">Main focus and BSW audit checklist items will go here.</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-center">
          <Button onClick={handleGenerateReport} size="lg" className="w-full md:w-auto">
            Generate PDF Report
          </Button>
        </div>
      </main>
    </div>
  );
};

export default JobAudit;
