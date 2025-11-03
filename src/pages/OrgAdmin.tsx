import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, ArrowLeft, Users, Palette, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  organization_id: string | null;
}

interface EmailChangeRequest {
  id: string;
  user_id: string;
  current_email: string;
  requested_email: string;
  status: string;
  requested_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

interface OrganizationSettings {
  id: string;
  organization_id: string;
  custom_theme_color: string | null;
  logo_url: string | null;
}

const OrgAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [emailChangeRequests, setEmailChangeRequests] = useState<EmailChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [customColor, setCustomColor] = useState<string>("#3b82f6");
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

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

  const checkOrgAdminRole = async () => {
    if (!session?.user) return;

    try {
      // Check if user has org_admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "org_admin")
        .maybeSingle();

      if (roleError) throw roleError;

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You don't have organization admin privileges",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Get user's organization
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id, organizations(name)")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profileData?.organization_id) {
        toast({
          title: "Error",
          description: "You are not assigned to an organization",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setOrganizationId(profileData.organization_id);
      setOrgName((profileData.organizations as any)?.name || "");
      setIsOrgAdmin(true);
    } catch (error) {
      console.error("Error checking org admin role:", error);
      navigate("/");
    }
  };

  const fetchMembers = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast({
        title: "Error",
        description: "Failed to load members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailChangeRequests = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from("email_change_requests")
        .select(`
          *,
          profiles!email_change_requests_user_id_fkey (
            full_name,
            email
          )
        `)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      
      // Filter to only show requests from users in this org
      const orgMemberIds = members.map(m => m.id);
      const filteredRequests = (data || []).filter(req => orgMemberIds.includes(req.user_id));
      
      setEmailChangeRequests(filteredRequests as any);
    } catch (error) {
      console.error("Error fetching email change requests:", error);
    }
  };

  const fetchOrgSettings = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setOrgSettings(data);
        if (data.custom_theme_color) {
          setCustomColor(data.custom_theme_color);
        }
        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      }
    } catch (error) {
      console.error("Error fetching org settings:", error);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile || !organizationId) return;

    setIsUploadingLogo(true);
    try {
      // Upload to storage
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${organizationId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(filePath, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(filePath);

      // Update organization settings
      if (orgSettings) {
        const { error } = await supabase
          .from("organization_settings")
          .update({ logo_url: publicUrl })
          .eq("id", orgSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("organization_settings")
          .insert({
            organization_id: organizationId,
            logo_url: publicUrl
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });

      fetchOrgSettings();
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  useEffect(() => {
    if (session) {
      checkOrgAdminRole();
    }
  }, [session]);

  useEffect(() => {
    if (isOrgAdmin && organizationId) {
      fetchMembers();
      fetchOrgSettings();
    }
  }, [isOrgAdmin, organizationId]);

  useEffect(() => {
    if (members.length > 0) {
      fetchEmailChangeRequests();
    }
  }, [members]);

  const handleApproval = async (userId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ approval_status: status })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      });

      fetchMembers();
    } catch (error) {
      console.error("Error updating approval status:", error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ organization_id: null })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member removed from organization",
      });

      fetchMembers();
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const handleEmailChangeApproval = async (requestId: string, userId: string, newEmail: string, approve: boolean) => {
    try {
      if (approve) {
        // Update user's email in auth system
        const { error: authError } = await supabase.auth.admin.updateUserById(
          userId,
          { email: newEmail }
        );

        if (authError) throw authError;
      }

      // Update request status
      const { error } = await supabase
        .from("email_change_requests")
        .update({
          status: approve ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: session?.user?.id
        })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Email change ${approve ? 'approved' : 'rejected'}`,
      });

      fetchEmailChangeRequests();
      fetchMembers();
    } catch (error: any) {
      console.error("Error processing email change:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process email change request",
        variant: "destructive",
      });
    }
  };

  const handleSaveTheme = async () => {
    if (!organizationId) return;

    try {
      // Validate hex color
      if (!/^#[0-9A-F]{6}$/i.test(customColor)) {
        toast({
          title: "Invalid Color",
          description: "Please enter a valid hex color (e.g., #3b82f6)",
          variant: "destructive",
        });
        return;
      }

      if (orgSettings) {
        // Update existing settings
        const { error } = await supabase
          .from("organization_settings")
          .update({ custom_theme_color: customColor })
          .eq("id", orgSettings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from("organization_settings")
          .insert({
            organization_id: organizationId,
            custom_theme_color: customColor
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Theme saved successfully. Members will see the new theme on their next login.",
      });

      fetchOrgSettings();
    } catch (error: any) {
      console.error("Error saving theme:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save theme",
        variant: "destructive",
      });
    }
  };

  if (loading || !isOrgAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const pendingMembers = members.filter(m => m.approval_status === 'pending');
  const approvedMembers = members.filter(m => m.approval_status === 'approved');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Organization Admin</h1>
          <p className="text-muted-foreground mt-1">{orgName}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Theme
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          {pendingMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Approvals ({pendingMembers.length})</CardTitle>
                <CardDescription>Members waiting for approval</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto pr-12">
                  <Table className="min-w-max">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Actions</TableHead>
                        <TableHead className="w-8 sm:w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>{member.email || '-'}</TableCell>
                          <TableCell>{member.full_name || '-'}</TableCell>
                          <TableCell>
                            {new Date(member.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproval(member.id, 'approved')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleApproval(member.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="w-8 sm:w-12"></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {emailChangeRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Email Change Requests ({emailChangeRequests.length})</CardTitle>
                <CardDescription>Pending email change requests from members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto pr-12">
                  <Table className="min-w-max">
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Current Email</TableHead>
                        <TableHead>Requested Email</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Actions</TableHead>
                        <TableHead className="w-8 sm:w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailChangeRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            {request.profiles?.full_name || request.profiles?.email || 'Unknown'}
                          </TableCell>
                          <TableCell>{request.current_email}</TableCell>
                          <TableCell>{request.requested_email}</TableCell>
                          <TableCell>
                            {new Date(request.requested_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEmailChangeApproval(
                                  request.id,
                                  request.user_id,
                                  request.requested_email,
                                  true
                                )}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleEmailChangeApproval(
                                  request.id,
                                  request.user_id,
                                  request.requested_email,
                                  false
                                )}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="w-8 sm:w-12"></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Active Members ({approvedMembers.length})</CardTitle>
              <CardDescription>Approved members in your organization</CardDescription>
            </CardHeader>
            <CardContent>
              {approvedMembers.length === 0 ? (
                <p className="text-muted-foreground">No active members</p>
              ) : (
                <div className="rounded-md border overflow-x-auto pr-12">
                  <Table className="min-w-max">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                        <TableHead className="w-8 sm:w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>{member.email || '-'}</TableCell>
                          <TableCell>{member.full_name || '-'}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">
                              Approved
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove {member.email} from your organization. 
                                    They will lose access to organization resources.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveMember(member.id)}
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                          <TableCell className="w-8 sm:w-12"></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Logo</CardTitle>
              <CardDescription>
                Upload your organization's logo to display in the header
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo-upload">Logo Image</Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                <p className="text-sm text-muted-foreground">
                  Recommended: PNG or SVG format, transparent background, max 2MB
                </p>
              </div>

              {logoPreview && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <Label className="mb-2 block">Preview</Label>
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="h-16 object-contain"
                  />
                </div>
              )}

              <Button 
                onClick={handleUploadLogo} 
                disabled={!logoFile || isUploadingLogo}
                size="lg"
              >
                {isUploadingLogo ? "Uploading..." : "Upload Logo"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization Theme</CardTitle>
              <CardDescription>
                Customize the appearance of the application for all members of your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-color">Custom Primary Color</Label>
                  <div className="flex gap-4 items-center">
                    <Input
                      id="custom-color"
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      placeholder="#3b82f6"
                      className="font-mono"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select a color that represents your organization. This will be applied as the primary theme color.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="border rounded-lg p-6 space-y-4">
                    <div className="flex gap-3">
                      <Button style={{ backgroundColor: customColor, borderColor: customColor }}>
                        Primary Button
                      </Button>
                      <Button variant="outline" style={{ borderColor: customColor, color: customColor }}>
                        Outline Button
                      </Button>
                    </div>
                    <Card style={{ borderColor: customColor }}>
                      <CardHeader>
                        <CardTitle style={{ color: customColor }}>Sample Card</CardTitle>
                        <CardDescription>This is how cards will look with your theme</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">Content goes here...</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Button onClick={handleSaveTheme} size="lg">
                  Save Theme
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrgAdmin;
