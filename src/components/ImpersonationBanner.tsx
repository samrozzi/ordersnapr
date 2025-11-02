import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X } from "lucide-react";

interface Organization {
  id: string;
  name: string;
}

export const ImpersonationBanner = () => {
  const [impersonatedOrg, setImpersonatedOrg] = useState<Organization | null>(null);

  useEffect(() => {
    const impersonatedOrgId = sessionStorage.getItem("impersonated_org_id");
    if (impersonatedOrgId) {
      fetchOrgName(impersonatedOrgId);
    }
  }, []);

  const fetchOrgName = async (orgId: string) => {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", orgId)
      .single();

    if (!error && data) {
      setImpersonatedOrg(data);
    }
  };

  const handleExit = () => {
    sessionStorage.removeItem("impersonated_org_id");
    setImpersonatedOrg(null);
    window.location.reload();
  };

  if (!impersonatedOrg) return null;

  return (
    <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950 mb-4">
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Impersonating:</span>
          <span>{impersonatedOrg.name}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          className="hover:bg-amber-100 dark:hover:bg-amber-900"
        >
          <X className="h-4 w-4 mr-1" />
          Exit Impersonation
        </Button>
      </AlertDescription>
    </Alert>
  );
};
