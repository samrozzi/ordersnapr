import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PropertyForm } from "@/components/PropertyForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Pencil, Trash2, ArrowUpDown, MapPin, Phone, MessageSquare, Share2 } from "lucide-react";

interface Property {
  id: string;
  property_name: string;
  address: string | null;
  contact: string | null;
  access_information: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
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

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
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

  const exportPropertyToText = (property: Property) => {
    const message = `PROPERTY DETAILS

PROPERTY NAME
${property.property_name}

ADDRESS
${property.address || 'N/A'}

CONTACT
${property.contact || 'N/A'}

ACCESS INFORMATION
${property.access_information || 'N/A'}${property.latitude && property.longitude ? `

LOCATION
${property.latitude.toFixed(6)}, ${property.longitude.toFixed(6)}` : ''}${userLocation && property.latitude && property.longitude ? `

DISTANCE
${getDistance(property)} km from your location` : ''}`;

    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
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
              <TableHead>Contact</TableHead>
              {userLocation && (
                <TableHead>
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
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingProperty(property)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{property.property_name}</TableCell>
                  <TableCell>{property.address || "-"}</TableCell>
                  <TableCell>
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
                    <TableCell>
                      {getDistance(property) ? `${getDistance(property)} km` : "-"}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingProperty(property)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingProperty(property)}
                      >
                        <Trash2 className="h-4 w-4" />
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
      <Dialog open={!!viewingProperty} onOpenChange={() => setViewingProperty(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Property Details</DialogTitle>
          </DialogHeader>
          {viewingProperty && (
            <div className="space-y-4">
              <Button
                variant="default"
                size="default"
                onClick={() => exportPropertyToText(viewingProperty)}
                className="w-full gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Text Details
              </Button>

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
              {viewingProperty.access_information && (
                <div>
                  <h3 className="font-semibold">Access Information</h3>
                  <p className="whitespace-pre-wrap">{viewingProperty.access_information}</p>
                </div>
              )}
              {viewingProperty.latitude && viewingProperty.longitude && (
                <div>
                  <h3 className="font-semibold">Location</h3>
                  <p>
                    {viewingProperty.latitude.toFixed(6)}, {viewingProperty.longitude.toFixed(6)}
                  </p>
                  {userLocation && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Distance: {getDistance(viewingProperty)} km from your location
                    </p>
                  )}
                </div>
              )}
            </div>
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
