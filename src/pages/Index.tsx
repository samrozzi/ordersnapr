import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Shield, RefreshCw } from "lucide-react";
import { useSessionTimeout } from "@/hooks/use-session-timeout";
import Dashboard from "./Dashboard";
import Forms from "./Forms";
import PropertyInfo from "./PropertyInfo";
import ordersnaprLogo from "@/assets/ordersnapr-horizontal.png";
import { DebugConsole } from "@/components/DebugConsole";

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Enforce 6-hour session timeout
  useSessionTimeout(session);

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
    // Prevent multiple simultaneous sign-out attempts
    if ((window as any)._signingOut) {
      return;
    }
    (window as any)._signingOut = true;

    try {
      console.log('🚪 Signing out...');
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all local storage (critical for PWA)
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear local state
      setSession(null);
      setIsAdmin(false);
      setApprovalStatus(null);
      
      console.log('✅ Sign out complete, redirecting...');
      
      // Force hard navigation to auth page (clears SPA history and PWA cache)
      window.location.replace('/auth');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      // Even if signOut fails, clear everything and redirect
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/auth');
    } finally {
      (window as any)._signingOut = false;
    }
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
        <div className="container mx-auto px-4 py-4">
          <img src={ordersnaprLogo} alt="ordersnapr" className="h-16 mb-4" />
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate("/profile")}>
              Profile
            </Button>
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="work-orders" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
            <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
            <TabsTrigger value="property-info">Property Info</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
          </TabsList>

          <TabsContent value="work-orders">
            <Dashboard />
          </TabsContent>

          <TabsContent value="property-info">
            <PropertyInfo />
          </TabsContent>

          <TabsContent value="forms">
            <Forms />
          </TabsContent>
        </Tabs>
      </main>
      
      <DebugConsole />
    </div>
  );
};

export default Index;
