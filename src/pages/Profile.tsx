import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, History, FileText, Home, Sun, Moon, Monitor, LogOut, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ProfileFavoritesTab } from "./ProfileFavoritesTab";
import { UnifiedPreferences } from "@/components/UnifiedPreferences";
import { useUserPreferences, useUpdateUserPreferences } from "@/hooks/use-user-preferences";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  changes: any;
  user_id: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

interface WorkOrder {
  id: string;
  customer_name: string;
  status: string;
  created_at: string;
  scheduled_date: string | null;
  user_id: string;
  completed_by: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

interface Property {
  id: string;
  property_name: string;
  address: string | null;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [approvalStatus, setApprovalStatus] = useState<string>("");
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [currentFullName, setCurrentFullName] = useState("");

  const { data: userPreferences } = useUserPreferences(userId || null);
  const updatePreferences = useUpdateUserPreferences();

  useEffect(() => {
    fetchUserData();
  }, []);

  // Restore theme from database on mount
  useEffect(() => {
    if (userPreferences?.theme && userPreferences.theme !== theme) {
      setTheme(userPreferences.theme);
    }
  }, [userPreferences, setTheme]);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      setCurrentEmail(user.email || "");
      fetchProfile(user.id);
      fetchAuditLogs(user.id);
      fetchWorkOrders();
      fetchProperties();
    }
  };

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select(`
        approval_status,
        organization_id,
        full_name,
        organizations!organization_id (
          id,
          name
        )
      `)
      .eq("id", uid)
      .maybeSingle();
    
    if (data) {
      setApprovalStatus(data.approval_status || '');
      setCurrentFullName(data.full_name || '');
      setFullName(data.full_name || '');
      if (data.organizations) {
        setOrganization(data.organizations as Organization);
      }
    }
  };

  const fetchAuditLogs = async (uid: string) => {
    const { data } = await supabase
      .from("audit_logs" as any)
      .select(`
        id, action, entity_type, entity_id, created_at, changes, user_id,
        profiles:user_id(full_name, email)
      `)
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);
    
    if (data) setAuditLogs(data as unknown as AuditLog[]);
  };

  const fetchWorkOrders = async () => {
    // RLS policies will automatically filter to show user's own + organization work orders
    const { data } = await supabase
      .from("work_orders")
      .select(`
        id, customer_name, status, created_at, scheduled_date, user_id, completed_by,
        profiles:user_id(full_name, email)
      `)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (data) setWorkOrders(data as any);
  };

  const fetchProperties = async () => {
    // RLS policies will automatically filter to show user's own + organization properties
    const { data } = await supabase
      .from("properties")
      .select("id, property_name, address, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (data) setProperties(data);
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter a new email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      
      if (error) throw error;

      toast({
        title: "Success",
        description: "Check your new email for a confirmation link",
      });
      setEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      toast({
        title: "Error",
        description: "Password must contain at least one uppercase letter",
        variant: "destructive",
      });
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      toast({
        title: "Error",
        description: "Password must contain at least one lowercase letter",
        variant: "destructive",
      });
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      toast({
        title: "Error",
        description: "Password must contain at least one number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleUpdateFullName = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", userId);
      
      if (error) throw error;

      setCurrentFullName(fullName.trim());
      toast({
        title: "Success",
        description: "Display name updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update display name",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForceSessionRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Force refreshing session...');
      
      // Try to refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ Session refresh failed:', error);
        throw error;
      }
      
      console.log('✅ Session refreshed successfully');
      
      // Re-fetch all data
      await fetchUserData();
      
      toast({
        title: "Success",
        description: "Session refreshed successfully. Try viewing work orders now.",
      });
    } catch (error: any) {
      console.error('❌ Force refresh error:', error);
      toast({
        title: "Session Refresh Failed",
        description: "Signing out and redirecting to login...",
        variant: "destructive",
      });
      
      // If refresh fails, force sign out and reload
      setTimeout(async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('/auth');
      }, 1500);
    } finally {
      setRefreshing(false);
    }
  };

  const getEntityName = (log: AuditLog) => {
    if (log.entity_type === "work_orders") {
      return log.changes?.new?.customer_name || log.changes?.customer_name || "Work Order";
    }
    if (log.entity_type === "properties") {
      return log.changes?.new?.property_name || log.changes?.property_name || "Property";
    }
    return "Item";
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold">Profile Settings</h1>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid grid-cols-5 w-full h-auto p-1">
            <TabsTrigger value="settings" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Set</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="text-xs sm:text-sm px-2 py-2">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Preferences</span>
              <span className="sm:hidden">Pref</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Activity</span>
              <span className="sm:hidden">Act</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Favorites</span>
              <span className="sm:hidden">Fav</span>
            </TabsTrigger>
            <TabsTrigger value="changelog" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Changelog</span>
              <span className="sm:hidden">Log</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Your current account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input value={currentEmail} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input value={userId.substring(0, 8) + '...'} disabled className="bg-muted font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label>Approval Status</Label>
                  <Input value={approvalStatus || 'Unknown'} disabled className="bg-muted" />
                </div>
                {organization && (
                  <>
                    <div className="space-y-2">
                      <Label>Organization</Label>
                      <Input value={organization.name} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>Organization ID</Label>
                      <Input value={organization.id.substring(0, 8) + '...'} disabled className="bg-muted font-mono text-xs" />
                    </div>
                  </>
                )}
                {!organization && (
                  <p className="text-sm text-muted-foreground">
                    You are not assigned to any organization. Contact an admin to be added to an organization.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Display Name</CardTitle>
                <CardDescription>
                  This name will be shown throughout the app instead of your email
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateFullName} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      disabled={loading}
                    />
                    {currentFullName && (
                      <p className="text-xs text-muted-foreground">
                        Current: {currentFullName}
                      </p>
                    )}
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Updating..." : "Update Display Name"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Update Email</CardTitle>
                <CardDescription>
                  Change your account email address. You'll need to verify your new email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateEmail} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">New Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter new email"
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Updating..." : "Update Email"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Update Password</CardTitle>
                <CardDescription>
                  Change your account password. Must be at least 8 characters with uppercase, lowercase, and numbers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Management</CardTitle>
                <CardDescription>
                  Force refresh your authentication session if you're having issues accessing data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleForceSessionRefresh} 
                  disabled={refreshing}
                  variant="outline"
                >
                  {refreshing ? "Refreshing..." : "Force Session Refresh"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Use this if you're logged in but can't see work orders or other data. This will renew your authentication token.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>
                  Select your preferred theme for the application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={theme}
                  onValueChange={async (value) => {
                    if (!userId) return;

                    setTheme(value);
                    // Save to localStorage for immediate effect
                    localStorage.setItem('ordersnapr-theme', value);

                    // Save to database for persistence across logout/login
                    try {
                      await updatePreferences.mutateAsync({
                        userId,
                        theme: value,
                      });
                      toast({
                        title: "Theme Updated",
                        description: `Theme set to ${value} and saved to your account`,
                      });
                    } catch (error) {
                      console.error("Failed to save theme:", error);
                      toast({
                        title: "Theme Set",
                        description: `Theme set to ${value} (will reset on logout)`,
                        variant: "default",
                      });
                    }
                  }}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Sun className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Light</p>
                        <p className="text-sm text-muted-foreground">Always use light theme</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Moon className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Dark</p>
                        <p className="text-sm text-muted-foreground">Always use dark theme</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors">
                    <RadioGroupItem value="system" id="system" />
                    <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Monitor className="h-5 w-5" />
                      <div>
                        <p className="font-medium">System</p>
                        <p className="text-sm text-muted-foreground">Use system theme preference</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
                <CardDescription>
                  Sign out of your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleSignOut} 
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This will log you out and clear your local session data.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <UnifiedPreferences />
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  My Work Orders
                </CardTitle>
                <CardDescription>
                  Recent work orders you've created
                </CardDescription>
              </CardHeader>
              <CardContent>
                {workOrders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No work orders yet</p>
                ) : (
                  <div className="space-y-3">
                    {workOrders.map((order) => (
                      <div key={order.id} className="flex items-start justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Status: {order.status} • Created by {order.profiles?.full_name || order.profiles?.email || 'Unknown'} • {format(new Date(order.created_at), "MMM dd, yyyy")}
                          </p>
                          {order.status === 'completed' && order.completed_by && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Completed by user {order.completed_by.substring(0, 8)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  My Properties
                </CardTitle>
                <CardDescription>
                  Recent properties you've added
                </CardDescription>
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No properties yet</p>
                ) : (
                  <div className="space-y-3">
                    {properties.map((property) => (
                      <div key={property.id} className="flex items-start justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{property.property_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {property.address || "No address"} • Created {format(new Date(property.created_at), "MMM dd, yyyy")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Favorites</CardTitle>
                <CardDescription>Items you've starred for quick access</CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileFavoritesTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="changelog">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Activity Changelog
                </CardTitle>
                <CardDescription>
                  Your recent changes and actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No activity yet</p>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <History className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">
                            {log.action.charAt(0).toUpperCase() + log.action.slice(1)} {log.entity_type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getEntityName(log)} • By {log.profiles?.full_name || log.profiles?.email || 'Unknown'} • {format(new Date(log.created_at), "MMM dd, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
