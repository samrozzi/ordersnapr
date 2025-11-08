import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useFreeTierLimits } from "@/hooks/use-free-tier-limits";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Lock,
  CheckCircle2,
  Clock,
  Zap,
  Shield,
  Users,
  BarChart3,
  ArrowRight
} from "lucide-react";

export default function FreeTierWorkspace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { usage, limits, loading: limitsLoading } = useFreeTierLimits();
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) return;

      // Check approval status
      const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status")
        .eq("id", user.id)
        .single();

      setApprovalStatus(profile?.approval_status || null);

      // Check if admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      const adminStatus = !!roles;
      setIsAdmin(adminStatus);

      // If approved or admin, redirect to main dashboard
      if (profile?.approval_status === "approved" || adminStatus) {
        navigate("/dashboard");
      }
    };

    checkStatus();
  }, [user, navigate]);

  const freeTierFeatures = [
    {
      icon: Sparkles,
      title: "Explore the Platform",
      description: "Browse around and see what OrderSnapr can do",
      available: true,
    },
    {
      icon: Zap,
      title: "View Sample Data",
      description: "Check out example work orders, properties, and more",
      available: true,
    },
    {
      icon: Shield,
      title: "Customize Branding",
      description: "Set your colors and logo (saved for when you're approved)",
      available: true,
    },
    {
      icon: Lock,
      title: "Create & Manage Work Orders",
      description: "Full access after admin approval",
      available: false,
    },
    {
      icon: Lock,
      title: "Team Collaboration",
      description: "Full access after admin approval",
      available: false,
    },
    {
      icon: Lock,
      title: "Advanced Features",
      description: "Invoicing, inventory, reports & more",
      available: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold">Welcome to OrderSnapr!</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your account is pending approval. While you wait, explore what we have to offer!
          </p>
        </div>

        {/* Status Alert */}
        <Alert className="border-primary/50 bg-primary/5">
          <Clock className="h-4 w-4 text-primary" />
          <AlertDescription className="text-base">
            <strong>Account Status:</strong> {approvalStatus === "pending" ? "Pending Admin Approval" : "Waiting for Approval"}
            <br />
            <span className="text-sm text-muted-foreground">
              You'll receive an email notification when your account is approved. In the meantime, explore the platform below!
            </span>
          </AlertDescription>
        </Alert>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {freeTierFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className={!feature.available ? "opacity-60" : ""}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        feature.available
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    {feature.available && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Free Tier Usage */}
        {!limitsLoading && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle>Your Free Tier Usage</CardTitle>
              <CardDescription>
                See what you can create with your free account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Work Orders</span>
                    <span className="text-muted-foreground">{usage.work_orders} / {limits.work_orders}</span>
                  </div>
                  <Progress value={(usage.work_orders / limits.work_orders) * 100} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Properties</span>
                    <span className="text-muted-foreground">{usage.properties} / {limits.properties}</span>
                  </div>
                  <Progress value={(usage.properties / limits.properties) * 100} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Forms</span>
                    <span className="text-muted-foreground">{usage.forms} / {limits.forms}</span>
                  </div>
                  <Progress value={(usage.forms / limits.forms) * 100} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Calendar Events</span>
                    <span className="text-muted-foreground">{usage.calendar_events} / {limits.calendar_events}</span>
                  </div>
                  <Progress value={(usage.calendar_events / limits.calendar_events) * 100} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA Section */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">Ready to Get Started?</CardTitle>
            <CardDescription className="text-base">
              Once your account is approved, you'll unlock all features and be able to:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Create and manage unlimited work orders</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Track properties and customers</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Collaborate with your team</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Generate invoices and reports</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Access from any device, anywhere</span>
              </li>
            </ul>

            <div className="pt-4 space-y-3">
              <Button 
                onClick={() => {
                  const pricingCard = document.querySelector('[data-pricing]');
                  pricingCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }} 
                size="lg" 
                className="w-full"
              >
                <ArrowRight className="mr-2 h-5 w-5" />
                View Upgrade Options
              </Button>
              <div className="flex gap-4">
                <Button onClick={() => navigate("/profile")} variant="outline" className="flex-1">
                  Edit Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Tiers Teaser */}
        <Card data-pricing>
          <CardHeader>
            <CardTitle>Upgrade When You're Ready</CardTitle>
            <CardDescription>
              After approval, choose the plan that fits your needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-semibold">Starter</h3>
                <p className="text-2xl font-bold">$29<span className="text-sm font-normal text-muted-foreground">/user/mo</span></p>
                <p className="text-sm text-muted-foreground">Perfect for small teams</p>
              </div>
              <div className="p-4 border-2 border-primary rounded-lg space-y-2 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                  Popular
                </div>
                <h3 className="font-semibold">Professional</h3>
                <p className="text-2xl font-bold">$59<span className="text-sm font-normal text-muted-foreground">/user/mo</span></p>
                <p className="text-sm text-muted-foreground">Most popular choice</p>
              </div>
              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-semibold">Enterprise</h3>
                <p className="text-2xl font-bold">Custom</p>
                <p className="text-sm text-muted-foreground">For larger organizations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
