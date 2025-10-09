import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Shield } from "lucide-react";
import Dashboard from "./Dashboard";
import JobAudit from "./JobAudit";

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const checkApprovalStatus = async () => {
    if (!session?.user) return;

    try {
      // Check approval status
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("approval_status")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;

      setApprovalStatus(profileData?.approval_status || null);

      // Check if user is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!roleData);

      // Redirect to pending approval page if not approved and not admin
      if (profileData?.approval_status !== 'approved' && !roleData) {
        navigate("/pending-approval");
      }
    } catch (error) {
      console.error("Error checking approval status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      checkApprovalStatus();
    }
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Work Management System</h1>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="work-orders" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
            <TabsTrigger value="job-audit">Job Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="work-orders">
            <Dashboard />
          </TabsContent>

          <TabsContent value="job-audit">
            <JobAudit />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
