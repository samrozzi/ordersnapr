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
      console.log('Fetching properties...');
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("property_name", { ascending: true });

      if (error) {
        console.error('Properties query error:', error);
        throw error;
      }
      
      console.log('Properties fetched:', data?.length || 0, 'records');
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
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-semibold">Property Information</h1>
      
      <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="md:h-10">
              <Plus className="md:mr-2 h-4 w-4" />
              <span className="hidden md:inline">New Property</span>
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
        onUpdate={fetchProperties}
        userLocation={userLocation}
      />
    </div>
  );
};

export default PropertyInfo;
