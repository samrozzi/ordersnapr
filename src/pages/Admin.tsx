import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Shield, ArrowLeft, Building2, Users, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  organization_id: string | null;
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
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
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

      fetchUsers();
    } catch (error) {
      console.error("Error updating approval status:", error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleOrganizationAssignment = async (userId: string, organizationId: string | null) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ organization_id: organizationId === "none" ? null : organizationId })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Organization assignment updated",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error updating organization:", error);
      toast({
        title: "Error",
        description: "Failed to update organization",
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
    if (!confirm("Are you sure you want to delete this organization? Users will be unassigned.")) {
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

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const pendingUsers = users.filter(u => u.approval_status === 'pending');
  const approvedUsers = users.filter(u => u.approval_status === 'approved');
  const rejectedUsers = users.filter(u => u.approval_status === 'rejected');

  const getUserOrgName = (orgId: string | null) => {
    if (!orgId) return "None";
    const org = organizations.find(o => o.id === orgId);
    return org?.name || "Unknown";
  };

  const getOrgMemberCount = (orgId: string) => {
    return users.filter(u => u.organization_id === orgId).length;
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
        </TabsList>

        <TabsContent value="users" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals ({pendingUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingUsers.length === 0 ? (
              <p className="text-muted-foreground">No pending approvals</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Registration Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email || '-'}</TableCell>
                        <TableCell>{user.full_name || '-'}</TableCell>
                        <TableCell>
                          <Select
                            value={user.organization_id || "none"}
                            onValueChange={(value) => handleOrganizationAssignment(user.id, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {organizations.map(org => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproval(user.id, 'approved')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApproval(user.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approved Users ({approvedUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {approvedUsers.length === 0 ? (
              <p className="text-muted-foreground">No approved users</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email || '-'}</TableCell>
                        <TableCell>{user.full_name || '-'}</TableCell>
                        <TableCell>
                          <Select
                            value={user.organization_id || "none"}
                            onValueChange={(value) => handleOrganizationAssignment(user.id, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {organizations.map(org => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            Approved
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproval(user.id, 'rejected')}
                          >
                            Revoke Access
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

        {rejectedUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Rejected Users ({rejectedUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email || '-'}</TableCell>
                        <TableCell>{user.full_name || '-'}</TableCell>
                        <TableCell>
                          <Select
                            value={user.organization_id || "none"}
                            onValueChange={(value) => handleOrganizationAssignment(user.id, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {organizations.map(org => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">Rejected</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproval(user.id, 'approved')}
                          >
                            Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
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
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization Name</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
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

          <Card>
            <CardHeader>
              <CardTitle>Organization Members</CardTitle>
            </CardHeader>
            <CardContent>
              {organizations.length === 0 ? (
                <p className="text-muted-foreground">Create an organization first</p>
              ) : (
                <div className="space-y-6">
                  {organizations.map((org) => {
                    const orgMembers = users.filter(u => u.organization_id === org.id);
                    if (orgMembers.length === 0) return null;
                    
                    return (
                      <div key={org.id} className="space-y-2">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          {org.name}
                        </h3>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {orgMembers.map((user) => (
                                <TableRow key={user.id}>
                                  <TableCell>{user.email || '-'}</TableCell>
                                  <TableCell>{user.full_name || '-'}</TableCell>
                                  <TableCell>
                                    <Badge
                                      className={
                                        user.approval_status === 'approved'
                                          ? 'bg-green-100 text-green-800'
                                          : user.approval_status === 'rejected'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }
                                    >
                                      {user.approval_status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;