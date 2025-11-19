import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PropertyForm } from "@/components/PropertyForm";
import { FreeTierGuard } from "@/components/FreeTierGuard";
import { PropertyTable } from "@/components/PropertyTable";
import { Plus, MapPin, MapPinOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FreeTierUsageBanner } from "@/components/FreeTierUsageBanner";
import { ExportButton } from "@/components/ExportButton";
import { ExportColumn, formatDateForExport } from "@/lib/export-csv";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useProperties } from "@/hooks/use-properties";

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
}

const PropertyInfo = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { properties, isLoading, refetch } = useProperties();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Export columns configuration
  const exportColumns: ExportColumn<Property>[] = [
    { key: "property_name", label: "Property Name" },
    { key: "address", label: "Address" },
    { key: "contact", label: "Contact" },
    { key: "hours", label: "Hours" },
    { key: "access_information", label: "Access Information" },
    {
      key: "latitude",
      label: "Latitude",
    },
    {
      key: "longitude",
      label: "Longitude",
    },
    {
      key: "created_at",
      label: "Created",
      format: (value) => formatDateForExport(value),
    },
  ];

  // Handle opening property from URL parameter (e.g., from favorites)
  useEffect(() => {
    const propertyId = searchParams.get('property');
    if (propertyId && properties.length > 0) {
      setSearchParams({});
      toast({
        title: "Property",
        description: "Viewing property from favorites",
      });
    }
  }, [searchParams, properties, setSearchParams, toast]);

  const handleGetUserLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsGettingLocation(false);
        toast({
          title: "Success",
          description: "Your location has been captured. Properties are now sorted by distance.",
        });
      },
      (error) => {
        setIsGettingLocation(false);
        toast({
          title: "Error",
          description: "Unable to get your location. Please enable location services.",
          variant: "destructive",
        });
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <PullToRefresh onRefresh={async () => { await refetch(); }} />
      <div className="space-y-4 md:space-y-6">
        <h1 className="text-xl md:text-2xl font-semibold">Property Information</h1>
      
      <FreeTierUsageBanner only={["properties"]} />

      <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-6">
        <ExportButton
          data={properties}
          columns={exportColumns}
          filename="properties"
          variant="outline"
          size="sm"
          disabled={properties.length === 0}
        />
        <FreeTierGuard resource="properties" onAllowed={() => setIsDialogOpen(true)}>
          {({ onClick, disabled }) => (
            <>
              <Button size="sm" className="md:h-10" onClick={onClick} disabled={disabled || isLoading}>
                <Plus className="md:mr-2 h-4 w-4" />
                <span className="hidden md:inline">New Property</span>
              </Button>
            </>
          )}
        </FreeTierGuard>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Property</DialogTitle>
            </DialogHeader>
            <PropertyForm
              onSuccess={() => {
                setIsDialogOpen(false);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
        <Button
          variant="outline"
          size="sm"
          onClick={() => userLocation ? setUserLocation(null) : handleGetUserLocation()}
          disabled={isGettingLocation}
          className="md:h-10"
        >
          {userLocation ? (
            <>
              <MapPinOff className="md:mr-2 h-4 w-4" />
              <span className="hidden md:inline">Clear Location</span>
            </>
          ) : (
            <>
              <MapPin className="md:mr-2 h-4 w-4" />
              <span className="hidden md:inline">{isGettingLocation ? "Getting Location..." : "Sort by Distance"}</span>
            </>
          )}
        </Button>
      </div>

      {userLocation && (
        <div className="text-sm text-muted-foreground">
          Sorting by distance from: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
        </div>
      )}

      <PropertyTable
        properties={properties}
        onUpdate={() => refetch()}
        userLocation={userLocation}
      />
      </div>
    </>
  );
};

export default PropertyInfo;
