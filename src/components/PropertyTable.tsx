import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PropertyForm } from "@/components/PropertyForm";
import { FavoriteButton } from "@/components/FavoriteButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Pencil, Trash2, ArrowUpDown, MapPin, Phone, MessageSquare, Mail, User, Clock, History } from "lucide-react";

interface Property {
  id: string;
  property_name: string;
  address: string | null;
  contact: string | null;
  hours: string | null;
  access_information: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at?: string;
  user_id?: string;
}

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  changes: any;
  user_email?: string;
}

interface PropertyTableProps {
  properties: Property[];
  onUpdate: () => void;
  userLocation?: { lat: number; lng: number } | null;
}

type SortField = "property_name" | "address" | "distance";
type SortDirection = "asc" | "desc";

export function PropertyTable({ properties, onUpdate, userLocation }: PropertyTableProps) {
  const { toast } = useToast();
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const [sortField, setSortField] = useState<SortField>("property_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [mapError, setMapError] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (viewingProperty?.user_id) {
      fetchCreatorInfo(viewingProperty.user_id);
      fetchAuditLogs(viewingProperty.id);
    }
  }, [viewingProperty?.id, viewingProperty?.user_id]);

  const fetchCreatorInfo = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();
    if (data) setCreatorProfile(data);
  };

  const fetchAuditLogs = async (entityId: string) => {
    const { data } = await supabase
      .from("audit_logs" as any)
      .select("id, action, created_at, changes, user_id")
      .eq("entity_id", entityId)
      .eq("entity_type", "properties")
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (data) {
      // Fetch user emails separately
      const userIds = [...new Set((data as any[]).map((log: any) => log.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
      
      setAuditLogs((data as any[]).map((log: any) => ({
        id: log.id,
        action: log.action,
        created_at: log.created_at,
        changes: log.changes,
        user_email: profileMap.get(log.user_id) || "Unknown"
      })));
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Auto-sort by distance when location is set
  useEffect(() => {
    if (userLocation && sortField !== "distance") {
      setSortField("distance");
      setSortDirection("asc");
    }
  }, [userLocation]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const sortedProperties = [...properties].sort((a, b) => {
    if (sortField === "distance" && userLocation) {
      const distA = a.latitude && a.longitude 
        ? calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude)
        : Infinity;
      const distB = b.latitude && b.longitude
        ? calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
        : Infinity;
      return sortDirection === "asc" ? distA - distB : distB - distA;
    }

    const aValue = a[sortField as keyof Property] || "";
    const bValue = b[sortField as keyof Property] || "";
    
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleDelete = async () => {
    if (!deletingProperty) return;

    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", deletingProperty.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property deleted successfully",
      });

      onUpdate();
    } catch (error: any) {
      console.error("Error deleting property:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete property",
        variant: "destructive",
      });
    } finally {
      setDeletingProperty(null);
    }
  };

  const getDistance = (property: Property) => {
    if (!userLocation || !property.latitude || !property.longitude) return null;
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      property.latitude,
      property.longitude
    );
    return distance.toFixed(2);
  };

  const sharePropertyViaSMS = (property: Property) => {
    const message = `PROPERTY DETAILS

PROPERTY NAME
${property.property_name}

ADDRESS
${property.address || 'N/A'}

CONTACT
${property.contact || 'N/A'}${property.hours ? `

HOURS
${property.hours}` : ''}

ACCESS INFORMATION
${property.access_information || 'N/A'}${property.latitude && property.longitude ? `

LOCATION
${property.latitude.toFixed(6)}, ${property.longitude.toFixed(6)}` : ''}${userLocation && property.latitude && property.longitude ? `

DISTANCE
${getDistance(property)} miles from your location` : ''}`;

    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  };

  const sharePropertyViaEmail = (property: Property) => {
    const message = `PROPERTY DETAILS

PROPERTY NAME
${property.property_name}

ADDRESS
${property.address || 'N/A'}

CONTACT
${property.contact || 'N/A'}${property.hours ? `

HOURS
${property.hours}` : ''}

ACCESS INFORMATION
${property.access_information || 'N/A'}${property.latitude && property.longitude ? `

LOCATION
${property.latitude.toFixed(6)}, ${property.longitude.toFixed(6)}` : ''}${userLocation && property.latitude && property.longitude ? `

DISTANCE
${getDistance(property)} miles from your location` : ''}`;

    const subject = `Property Details - ${property.property_name}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <>
      <div className="rounded-md border overflow-x-auto touch-pan-x">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 sm:w-12"></TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("property_name")}
                  className="h-8 p-0 hover:bg-transparent"
                >
                  Property Name {getSortIcon("property_name")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("address")}
                  className="h-8 p-0 hover:bg-transparent"
                >
                  Address {getSortIcon("address")}
                </Button>
              </TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              {userLocation && (
                <TableHead className="hidden lg:table-cell">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("distance")}
                    className="h-8 p-0 hover:bg-transparent"
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    Distance {getSortIcon("distance")}
                  </Button>
                </TableHead>
              )}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProperties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={userLocation ? 6 : 5} className="text-center text-muted-foreground">
                  No properties found
                </TableCell>
              </TableRow>
            ) : (
              sortedProperties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="px-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingProperty(property)}
                      className="h-7 w-7 p-0"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{property.property_name}</TableCell>
                  <TableCell>{property.address || "-"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {property.contact ? (
                      <div className="flex items-center gap-1">
                        <span className="mr-1">{property.contact}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          asChild
                        >
                          <a href={`tel:${property.contact}`}>
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          asChild
                        >
                          <a href={`sms:${property.contact}`}>
                            <MessageSquare className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                    ) : "-"}
                  </TableCell>
                  {userLocation && (
                    <TableCell className="hidden lg:table-cell">
                      {getDistance(property) ? `${getDistance(property)} mi` : "-"}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 md:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingProperty(property)}
                        className="h-8"
                      >
                        <Pencil className="h-4 w-4 md:mr-1" />
                        <span className="hidden md:inline">Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingProperty(property)}
                        className="h-8"
                      >
                        <Trash2 className="h-4 w-4 md:mr-1" />
                        <span className="hidden md:inline">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewingProperty} onOpenChange={() => {
        setViewingProperty(null);
        setMapError(false);
        setCreatorProfile(null);
        setAuditLogs([]);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Property Details</DialogTitle>
              {viewingProperty && <FavoriteButton entityType="property" entityId={viewingProperty.id} />}
            </div>
          </DialogHeader>
          {viewingProperty && (
            <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
              <div className="space-y-4 pb-4">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="default"
                    onClick={() => sharePropertyViaSMS(viewingProperty)}
                    className="gap-2 flex-1"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Share via Text
                  </Button>
                  <Button
                    variant="default"
                    size="default"
                    onClick={() => sharePropertyViaEmail(viewingProperty)}
                    className="gap-2 flex-1"
                  >
                    <Mail className="h-4 w-4" />
                    Share via Email
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    setEditingProperty(viewingProperty);
                    setViewingProperty(null);
                  }}
                  className="gap-2 w-full"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </div>

              <div>
                <h3 className="font-semibold">Property Name</h3>
                <p>{viewingProperty.property_name}</p>
              </div>
              {viewingProperty.address && (
                <div>
                  <h3 className="font-semibold">Address</h3>
                  <Button
                    variant="link"
                    className="h-auto p-0 font-normal text-left"
                    asChild
                  >
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewingProperty.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {viewingProperty.address}
                    </a>
                  </Button>
                </div>
              )}
              {viewingProperty.contact && (
                <div>
                  <h3 className="font-semibold">Contact</h3>
                  <div className="flex items-center gap-2">
                    <p>{viewingProperty.contact}</p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        asChild
                      >
                        <a href={`tel:${viewingProperty.contact}`}>
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        asChild
                      >
                        <a href={`sms:${viewingProperty.contact}`}>
                          <MessageSquare className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {viewingProperty.hours && (
                <div>
                  <h3 className="font-semibold">Hours</h3>
                  <p>{viewingProperty.hours}</p>
                </div>
              )}
              {viewingProperty.access_information && (
                <div>
                  <h3 className="font-semibold">Access Information</h3>
                  <p className="whitespace-pre-wrap">{viewingProperty.access_information}</p>
                </div>
              )}
              {viewingProperty.latitude && viewingProperty.longitude && (
                <div>
                  <h3 className="font-semibold mb-2">Location</h3>
                  {!mapError ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${viewingProperty.latitude},${viewingProperty.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mb-2 rounded-lg overflow-hidden border hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <img
                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${viewingProperty.latitude},${viewingProperty.longitude}&zoom=14&size=600x300&markers=color:red%7C${viewingProperty.latitude},${viewingProperty.longitude}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8`}
                        alt="Property location map"
                        className="w-full h-auto"
                        onError={() => setMapError(true)}
                      />
                    </a>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full mb-2"
                      asChild
                    >
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${viewingProperty.latitude},${viewingProperty.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <MapPin className="h-4 w-4" />
                        Open in Maps
                      </a>
                    </Button>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {viewingProperty.latitude.toFixed(6)}, {viewingProperty.longitude.toFixed(6)}
                  </p>
                  {userLocation && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Distance: {getDistance(viewingProperty)} miles from your location
                    </p>
                  )}
                  {!mapError && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Click map to open in your default map app
                    </p>
                  )}
                </div>
              )}

              {/* Metadata Section */}
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-semibold text-lg border-b pb-2">Information</h3>
                <div className="grid gap-3 text-sm">
                  {creatorProfile && (
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground">Created by</p>
                        <p className="font-medium">{creatorProfile.full_name || creatorProfile.email || "Unknown"}</p>
                      </div>
                    </div>
                  )}
                  {viewingProperty.updated_at && viewingProperty.updated_at !== viewingProperty.created_at && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground">Last edited</p>
                        <p className="font-medium">
                          {format(new Date(viewingProperty.updated_at), "MMM dd, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Changelog Section */}
              {auditLogs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg border-b pb-2">Recent Changes</h3>
                  <div className="space-y-3">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 text-sm">
                        <History className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{log.action.charAt(0).toUpperCase() + log.action.slice(1)}</p>
                          <p className="text-muted-foreground">
                            by {log.user_email} on {format(new Date(log.created_at), "MMM dd, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingProperty} onOpenChange={() => setEditingProperty(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
          </DialogHeader>
          {editingProperty && (
            <PropertyForm
              property={editingProperty}
              onSuccess={() => {
                setEditingProperty(null);
                onUpdate();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!deletingProperty} onOpenChange={() => setDeletingProperty(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the property "{deletingProperty?.property_name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
