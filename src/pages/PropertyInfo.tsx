import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PropertyForm } from "@/components/PropertyForm";
import { FreeTierGuard } from "@/components/FreeTierGuard";
import { PropertyTable } from "@/components/PropertyTable";
import { Plus, MapPin, MapPinOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FreeTierUsageBanner } from "@/components/FreeTierUsageBanner";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's active org context
      const { data: profile } = await supabase
        .from("profiles")
        .select("active_org_id")
        .eq("id", user.id)
        .single();

      const currentActiveOrgId = profile?.active_org_id || null;
      setActiveOrgId(currentActiveOrgId);

      console.log('Fetching properties:', {
        activeOrgId: currentActiveOrgId,
        isPersonal: currentActiveOrgId === null
      });

      // Build query with org filtering
      let query = supabase.from("properties").select("*");

      if (currentActiveOrgId === null) {
        // Personal workspace: user's own properties with no organization
        query = query.eq("user_id", user.id).is("organization_id", null);
      } else {
        // Organization workspace: all properties for that org
        query = query.eq("organization_id", currentActiveOrgId);
      }

      const { data, error } = await query.order("property_name", { ascending: true });

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
  }, [session, activeOrgId]);

  // Handle opening property from URL parameter (e.g., from favorites)
  useEffect(() => {
    const propertyId = searchParams.get('property');
    if (propertyId && properties.length > 0) {
      // For properties, we could scroll to it or highlight it
      // For now, just clear the parameter to acknowledge it was handled
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
      
      <FreeTierUsageBanner only={["properties"]} />

      <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-6">
        <FreeTierGuard resource="properties" onAllowed={() => setIsDialogOpen(true)}>
          {({ onClick, disabled }) => (
            <>
              <Button size="sm" className="md:h-10" onClick={onClick} disabled={disabled || loading}>
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
