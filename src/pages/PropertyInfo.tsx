import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyTable } from "@/components/PropertyTable";
import { Plus, MapPin, MapPinOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const PropertyInfo = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

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

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("property_name", { ascending: true });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
      toast({
        title: "Error",
        description: "Failed to load properties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchProperties();
    }
  }, [session]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Property Information</h2>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => userLocation ? setUserLocation(null) : handleGetUserLocation()}
          disabled={isGettingLocation}
        >
          {userLocation ? (
            <>
              <MapPinOff className="h-4 w-4 mr-2" />
              Clear Location
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              {isGettingLocation ? "Getting Location..." : "Sort by Distance"}
            </>
          )}
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Property
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Property</DialogTitle>
            </DialogHeader>
            <PropertyForm
              onSuccess={() => {
                setIsDialogOpen(false);
                fetchProperties();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {userLocation && (
        <div className="text-sm text-muted-foreground">
          Sorting by distance from: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
        </div>
      )}

      <PropertyTable 
        properties={properties} 
        onUpdate={fetchProperties}
        userLocation={userLocation}
      />
    </div>
  );
};

export default PropertyInfo;
