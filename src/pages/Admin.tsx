import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft, Building2, Users, Plus, Trash2, Crown, Settings, Layers, Search, Filter, Edit, ArrowUpDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeaturesManagementTab } from "@/components/admin/FeaturesManagementTab";
import { IndustryTemplatesTab } from "@/components/admin/IndustryTemplatesTab";
import { TemplateManager } from "@/components/admin/TemplateManager";
import { Navigate } from "react-router-dom";
import { usePremiumAccess } from "@/hooks/use-premium-access";
import { useUserOrgMemberships, useAddOrgMembership, useRemoveOrgMembership, useUpdateOrgMembershipRole } from "@/hooks/use-org-memberships";

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  is_super_admin: boolean;
  memberships?: Array<{
    id: string;
    org_id: string;
    role: string;
    organization: { id: string; name: string; };
  }>;
}

interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [managingUserId, setManagingUserId] = useState<string | null>(null);
  const [addingOrgRole, setAddingOrgRole] = useState<string>("staff");
  const { hasPremiumAccess } = usePremiumAccess();
  
  // User management enhancements
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOrg, setFilterOrg] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "email" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ email: "", full_name: "" });

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

  const checkAdminRole = async () => {
    if (!session?.user) return;

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin role:", error);
      navigate("/");
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at, is_super_admin")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all memberships for all users
      const { data: membershipsData, error: membershipsError } = await supabase
        .from("org_memberships")
        .select(`
          id,
          user_id,
          org_id,
          role,
          organization:organizations(id, name)
        `);

      if (membershipsError) throw membershipsError;

      // Map memberships to users
      const usersWithMemberships = (profilesData || []).map(user => ({
        ...user,
        memberships: (membershipsData || []).filter(m => m.user_id === user.id) as any
      }));

      setUsers(usersWithMemberships);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      toast({
        title: "Error",
        description: "Failed to load organizations",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (session) {
      checkAdminRole();
    }
  }, [session]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchOrganizations();
    }
  }, [isAdmin]);

  useEffect(() => {
    const fetchCurrentUserOrg = async () => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("active_org_id")
        .eq("id", session.user.id)
        .single();
      if (data) setCurrentOrgId(data.active_org_id);
    };
    fetchCurrentUserOrg();
  }, [session]);

  const handleToggleSuperAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_super_admin: !currentStatus })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Super Admin status ${!currentStatus ? 'granted' : 'revoked'}`,
      });

      fetchUsers();
    } catch (error) {
      console.error("Error toggling super admin:", error);
      toast({
        title: "Error",
        description: "Failed to update super admin status",
        variant: "destructive",
      });
    }
  };

  const handleAddToOrg = async (userId: string, orgId: string, role: string) => {
    try {
      await addMembership.mutateAsync({ userId, orgId, role });
      toast({
        title: "Success",
        description: "User added to organization",
      });
      fetchUsers();
      setManagingUserId(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add user to organization",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFromOrg = async (membershipId: string) => {
    try {
      await removeMembership.mutateAsync(membershipId);
      toast({
        title: "Success",
        description: "User removed from organization",
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user from organization",
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
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      toast({
        title: "Error",
        description: "Organization name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("organizations")
        .insert({ name: newOrgName.trim() });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Organization created successfully",
      });

      setNewOrgName("");
      setIsCreatingOrg(false);
      fetchOrganizations();
    } catch (error: any) {
      console.error("Error creating organization:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create organization",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrganization = async (orgId: string) => {
    if (!confirm("Are you sure you want to delete this organization? All memberships will be removed.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", orgId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Organization deleted successfully",
      });

      fetchOrganizations();
      fetchUsers();
    } catch (error) {
      console.error("Error deleting organization:", error);
      toast({
        title: "Error",
        description: "Failed to delete organization",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({
      email: user.email || "",
      full_name: user.full_name || "",
    });
  };

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          email: editForm.email.trim(),
          full_name: editForm.full_name.trim(),
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User details updated successfully",
      });

      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user details",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    try {
      // Note: This deletes the profile. The actual auth.users entry requires admin API
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${userEmail} has been deleted`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  // Filtered and sorted users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.email?.toLowerCase().includes(query) ||
          user.full_name?.toLowerCase().includes(query)
      );
    }

    // Organization filter
    if (filterOrg !== "all") {
      if (filterOrg === "personal") {
        filtered = filtered.filter(
          (user) => !user.memberships || user.memberships.length === 0
        );
      } else {
        filtered = filtered.filter((user) =>
          user.memberships?.some((m) => m.org_id === filterOrg)
        );
      }
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = (a.full_name || "").localeCompare(b.full_name || "");
          break;
        case "email":
          comparison = (a.email || "").localeCompare(b.email || "");
          break;
        case "date":
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [users, searchQuery, filterOrg, sortBy, sortOrder]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Free tier users redirect to free tier dashboard
  if (!hasPremiumAccess() && !isAdmin) {
    return <Navigate to="/free-tier-dashboard" replace />;
  }

  // Premium users without admin access
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You need super admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const getOrgMemberCount = (orgId: string) => {
    return users.reduce((count, user) => {
      return count + (user.memberships?.filter(m => m.org_id === orgId).length || 0);
    }, 0);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8" />
          <h1 className="text-3xl font-bold">ordersnapr Admin</h1>
        </div>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Site
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="organizations" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="form-templates" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Form Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Users ({filteredAndSortedUsers.length} of {users.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterOrg} onValueChange={setFilterOrg}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    <SelectItem value="personal">Personal Workspace</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={`${sortBy}-${sortOrder}`}
                  onValueChange={(value) => {
                    const [newSortBy, newSortOrder] = value.split("-") as [
                      "name" | "email" | "date",
                      "asc" | "desc"
                    ];
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="name-asc">Name A-Z</SelectItem>
                    <SelectItem value="name-desc">Name Z-A</SelectItem>
                    <SelectItem value="email-asc">Email A-Z</SelectItem>
                    <SelectItem value="email-desc">Email Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* User List */}
              {filteredAndSortedUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No users found</p>
              ) : (
                <div className="space-y-4">
                  {filteredAndSortedUsers.map((user) => (
                    <Card key={user.id} className="p-4">
                      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold break-all">{user.email}</span>
                            {user.is_super_admin && (
                              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white flex-shrink-0">
                                <Crown className="h-3 w-3 mr-1" />
                                Super Admin
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground break-words">{user.full_name || 'No name'}</span>
                          <div className="text-xs text-muted-foreground mt-1">
                            Joined {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={user.is_super_admin ? "default" : "outline"}
                            onClick={() => handleToggleSuperAdmin(user.id, user.is_super_admin)}
                          >
                            <Crown className="h-4 w-4 mr-1" />
                            {user.is_super_admin ? "Revoke" : "Make Admin"}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {user.email}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id, user.email || "this user")}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Organizations:</span>
                          <Dialog open={managingUserId === user.id} onOpenChange={(open) => !open && setManagingUserId(null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setManagingUserId(user.id)}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add to Organization
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add to Organization</DialogTitle>
                                <DialogDescription>
                                  Select an organization and role for {user.email}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <Label>Organization</Label>
                                  <Select onValueChange={(orgId) => {
                                    handleAddToOrg(user.id, orgId, addingOrgRole);
                                  }}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select organization" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {organizations
                                        .filter(org => !user.memberships?.some(m => m.org_id === org.id))
                                        .map(org => (
                                          <SelectItem key={org.id} value={org.id}>
                                            {org.name}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-2">
                                  <Label>Role</Label>
                                  <Select value={addingOrgRole} onValueChange={setAddingOrgRole}>
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
                            </DialogContent>
                          </Dialog>
                        </div>

                        {user.memberships && user.memberships.length > 0 ? (
                          <div className="space-y-2">
                            {user.memberships.map((membership) => (
                              <div key={membership.id} className="flex items-center justify-between p-2 bg-muted rounded">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{membership.organization.name}</span>
                                  <Select
                                    value={membership.role}
                                    onValueChange={(newRole) => handleUpdateRole(membership.id, newRole)}
                                  >
                                    <SelectTrigger className="h-7 w-24">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="staff">Staff</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="manager">Manager</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveFromOrg(membership.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground pl-2">Personal Workspace only</p>
                        )}
                      </div>
                    </Card>
                ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit User Dialog */}
          <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User Details</DialogTitle>
                <DialogDescription>
                  Update user information. Note: Password changes require users to use the password reset flow.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveUserEdit}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Organizations ({organizations.length})</CardTitle>
              <Dialog open={isCreatingOrg} onOpenChange={setIsCreatingOrg}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Organization
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Organization</DialogTitle>
                    <DialogDescription>
                      Add a new organization to manage teams and data access.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="org-name">Organization Name</Label>
                      <Input
                        id="org-name"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        placeholder="Enter organization name"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreatingOrg(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateOrganization}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {organizations.length === 0 ? (
                <p className="text-muted-foreground">No organizations created yet</p>
              ) : (
                <div className="rounded-md border overflow-x-auto touch-pan-x">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[250px]">Organization Name</TableHead>
                        <TableHead className="min-w-[120px]">Members</TableHead>
                        <TableHead className="min-w-[140px]">Created</TableHead>
                        <TableHead className="w-[120px] pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {organizations.map((org) => (
                        <TableRow key={org.id}>
                          <TableCell className="font-medium">{org.name}</TableCell>
                          <TableCell>{getOrgMemberCount(org.id)} users</TableCell>
                          <TableCell>
                            {new Date(org.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteOrganization(org.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
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

        <TabsContent value="features">
          <FeaturesManagementTab />
        </TabsContent>

        <TabsContent value="templates">
          <IndustryTemplatesTab />
        </TabsContent>

        <TabsContent value="form-templates">
          <TemplateManager orgId={currentOrgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
