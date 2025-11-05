import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import ordersnaprLogo from "@/assets/ordersnapr-stacked.png";
import ordersnaprLogoDark from "@/assets/ordersnapr-stacked-dark.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("Password reset email sent! Check your inbox.");
      setResetEmail("");
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={ordersnaprLogo} alt="ordersnapr" className="w-64 mx-auto mb-2 block dark:hidden" />
          <img src={ordersnaprLogoDark} alt="ordersnapr" className="w-64 mx-auto mb-2 hidden dark:block" />
          <p className="text-muted-foreground">Sign in to manage orders</p>
        </div>
        <div className="bg-card p-8 rounded-lg shadow-lg border">
          {showForgotPassword ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">Reset Password</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="your@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Back to Sign In
                </Button>
              </form>
            </div>
          ) : (
            <>
              <SupabaseAuth
                supabaseClient={supabase}
                appearance={{ 
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: 'hsl(var(--primary))',
                        brandAccent: 'hsl(var(--primary))',
                        brandButtonText: 'hsl(var(--primary-foreground))',
                        defaultButtonBackground: 'hsl(var(--primary))',
                        defaultButtonBackgroundHover: 'hsl(var(--primary))',
                        defaultButtonBorder: 'hsl(var(--primary))',
                        defaultButtonText: 'hsl(var(--primary-foreground))',
                        inputBackground: 'hsl(var(--background))',
                        inputText: 'hsl(var(--foreground))',
                        inputBorder: 'hsl(var(--border))',
                        inputPlaceholder: 'hsl(var(--muted-foreground))',
                      }
                    }
                  },
                  className: {
                    button: 'text-primary-foreground',
                    input: 'bg-background text-foreground',
                  }
                }}
                providers={[]}
                redirectTo={window.location.origin}
              />
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot your password?
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
