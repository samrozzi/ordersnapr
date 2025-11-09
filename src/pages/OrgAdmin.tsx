import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Palette, Trash2, Plus, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAddOrgMembership, useRemoveOrgMembership, useUpdateOrgMembershipRole } from "@/hooks/use-org-memberships";

interface OrgWithMembers {
  id: string;
  name: string;
  members: Array<{
    id: string;
    user_id: string;
    role: string;
    profiles: {
      email: string | null;
      full_name: string | null;
    };
  }>;
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
  const [adminOrgs, setAdminOrgs] = useState<OrgWithMembers[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<OrgWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [customColor, setCustomColor] = useState<string>("#3b82f6");
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [addingMemberEmail, setAddingMemberEmail] = useState("");
  const [addingMemberRole, setAddingMemberRole] = useState("staff");
  const [isAddingMember, setIsAddingMember] = useState(false);

  const addMembership = useAddOrgMembership();
  const removeMembership = useRemoveOrgMembership();
  const updateRole = useUpdateOrgMembershipRole();

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

  const fetchAdminOrgs = async () => {
    if (!session?.user) return;

    try {
      // Get organizations where user is admin
      const { data: membershipsData, error: membershipsError } = await supabase
        .from("org_memberships")
        .select(`
          org_id,
          role,
          organization:organizations(id, name)
        `)
        .eq("user_id", session.user.id)
        .eq("role", "admin");

      if (membershipsError) throw membershipsError;

      if (!membershipsData || membershipsData.length === 0) {
        toast({
          title: "No Admin Access",
          description: "You don't have admin access to any organizations",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Fetch members for each org
      const orgsWithMembers = await Promise.all(
        membershipsData.map(async (membership: any) => {
          const org = membership.organization;
          
          const { data: membersData, error: membersError } = await supabase
            .from("org_memberships")
            .select(`
              id,
              user_id,
              role,
              profiles(email, full_name)
            `)
            .eq("org_id", org.id);

          if (membersError) throw membersError;

          return {
            id: org.id,
            name: org.name,
            members: membersData || []
          };
        })
      );

      setAdminOrgs(orgsWithMembers);
      if (orgsWithMembers.length > 0) {
        setSelectedOrg(orgsWithMembers[0]);
        fetchOrgSettings(orgsWithMembers[0].id);
      }
      setIsOrgAdmin(true);
    } catch (error) {
      console.error("Error fetching admin orgs:", error);
      toast({
        title: "Error",
        description: "Failed to load organization data",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgSettings = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", orgId)
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
    if (!logoFile || !selectedOrg) return;

    setIsUploadingLogo(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${selectedOrg.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(filePath, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(filePath);

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
            organization_id: selectedOrg.id,
            logo_url: publicUrl
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });

      fetchOrgSettings(selectedOrg.id);
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
      fetchAdminOrgs();
    }
  }, [session]);

  const handleAddMember = async () => {
    if (!addingMemberEmail.trim() || !selectedOrg) return;

    try {
      // Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", addingMemberEmail.trim())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profiles) {
        toast({
          title: "User Not Found",
          description: "No user exists with that email. Ask them to sign up first.",
          variant: "destructive",
        });
        return;
      }

      await addMembership.mutateAsync({
        userId: profiles.id,
        orgId: selectedOrg.id,
        role: addingMemberRole
      });

      toast({
        title: "Success",
        description: "Member added to organization",
      });

      setAddingMemberEmail("");
      setIsAddingMember(false);
      fetchAdminOrgs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add member. They may already be a member.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    try {
      await removeMembership.mutateAsync(membershipId);
      toast({
        title: "Success",
        description: "Member removed from organization",
      });
      fetchAdminOrgs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (membershipId: string, newRole: string) => {
    try {
      await updateRole.mutateAsync({ membershipId, role: newRole });
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      fetchAdminOrgs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const handleSaveTheme = async () => {
    if (!selectedOrg) return;

    try {
      if (!/^#[0-9A-F]{6}$/i.test(customColor)) {
        toast({
          title: "Invalid Color",
          description: "Please enter a valid hex color (e.g., #3b82f6)",
          variant: "destructive",
        });
        return;
      }

      if (orgSettings) {
        const { error } = await supabase
          .from("organization_settings")
          .update({ custom_theme_color: customColor })
          .eq("id", orgSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("organization_settings")
          .insert({
            organization_id: selectedOrg.id,
            custom_theme_color: customColor
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Theme saved successfully",
      });

      fetchOrgSettings(selectedOrg.id);
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Organization Admin</h1>
          {adminOrgs.length > 1 && (
            <Select
              value={selectedOrg?.id}
              onValueChange={(orgId) => {
                const org = adminOrgs.find(o => o.id === orgId);
                if (org) {
                  setSelectedOrg(org);
                  fetchOrgSettings(org.id);
                }
              }}
            >
              <SelectTrigger className="w-[250px] mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {adminOrgs.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {adminOrgs.length === 1 && (
            <p className="text-muted-foreground mt-1">{selectedOrg?.name}</p>
          )}
        </div>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {!selectedOrg ? (
        <Card>
          <CardContent className="p-8">
            <p className="text-muted-foreground text-center">Select an organization to manage</p>
          </CardContent>
        </Card>
      ) : (
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Organization Members ({selectedOrg.members.length})</CardTitle>
                  <CardDescription>Manage members and their roles</CardDescription>
                </div>
                <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Member to {selectedOrg.name}</DialogTitle>
                      <DialogDescription>
                        Enter the email of an existing user to add them to your organization
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="member-email">Email Address</Label>
                        <Input
                          id="member-email"
                          type="email"
                          value={addingMemberEmail}
                          onChange={(e) => setAddingMemberEmail(e.target.value)}
                          placeholder="user@example.com"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Role</Label>
                        <Select value={addingMemberRole} onValueChange={setAddingMemberRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingMember(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddMember}>
                        <Mail className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {selectedOrg.members.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No members yet. Add your first member above.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto touch-pan-x">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Email</TableHead>
                          <TableHead className="min-w-[150px]">Name</TableHead>
                          <TableHead className="min-w-[120px]">Role</TableHead>
                          <TableHead className="w-[150px] pr-4">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrg.members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>{member.profiles?.email || '-'}</TableCell>
                            <TableCell>{member.profiles?.full_name || '-'}</TableCell>
                            <TableCell>
                              <Select
                                value={member.role}
                                onValueChange={(newRole) => handleUpdateRole(member.id, newRole)}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="staff">Staff</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                </SelectContent>
                              </Select>
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
                                      This will remove {member.profiles?.email} from {selectedOrg.name}. 
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
                  Customize the appearance for all members of your organization
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
                  </div>

                  <Button onClick={handleSaveTheme} size="lg">
                    Save Theme
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default OrgAdmin;
