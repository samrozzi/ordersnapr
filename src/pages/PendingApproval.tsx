import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";

const PendingApproval = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setEmail(session?.user?.email || "");
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setEmail(session?.user?.email || "");
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex flex-col items-center gap-4">
            <Clock className="h-16 w-16 text-yellow-500" />
            <CardTitle className="text-2xl text-center">
              Account Pending Approval
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Thank you for registering! Your account is currently pending approval
              from an administrator.
            </p>
            <p className="text-sm text-muted-foreground">
              Registered email: <span className="font-semibold">{email}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              You will be able to access the application once your account has been
              approved. Please check back later or contact your administrator.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;