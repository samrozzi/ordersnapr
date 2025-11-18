import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin } from "lucide-react";
import { CustomFieldRenderer } from "@/components/custom-fields/CustomFieldRenderer";
import type { CustomFieldValues } from "@/types/custom-fields";

const formSchema = z.object({
  property_name: z.string().min(1, "Property name is required").max(100, "Property name must be less than 100 characters"),
  address: z.string().max(500, "Address must be less than 500 characters").optional(),
  contact: z.string().max(100, "Contact must be less than 100 characters").optional(),
  hours: z.string().max(200, "Hours must be less than 200 characters").optional(),
  access_information: z.string().max(1000, "Access information must be less than 1000 characters").optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PropertyFormProps {
  onSuccess: () => void;
  property?: {
    id: string;
    property_name: string;
    address: string | null;
    contact: string | null;
    hours: string | null;
    access_information: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

export function PropertyForm({ onSuccess, property }: PropertyFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    property?.latitude && property?.longitude
      ? { lat: property.latitude, lng: property.longitude }
      : null
  );
  const [orgId, setOrgId] = useState<string | undefined>();
  const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValues>({});

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      property_name: property?.property_name || "",
      address: property?.address || "",
      contact: property?.contact || "",
      hours: property?.hours || "",
      access_information: property?.access_information || "",
      latitude: property?.latitude?.toString() || "",
      longitude: property?.longitude?.toString() || "",
    },
  });

  // Load org ID and existing custom field values
  useEffect(() => {
    const loadOrgAndCustomFields = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("active_org_id")
        .eq("id", user.id)
        .single();

      if (profile?.active_org_id) {
        setOrgId(profile.active_org_id);

        // Load existing custom field values if editing
        if (property?.id) {
          const { data: values } = await supabase
            .from("custom_field_values")
            .select(`
              value,
              custom_fields!inner(field_key)
            `)
            .eq("entity_type", "properties")
            .eq("entity_id", property.id);

          if (values) {
            const valueMap: CustomFieldValues = {};
            values.forEach((v: any) => {
              valueMap[v.custom_fields.field_key] = v.value;
            });
            setCustomFieldValues(valueMap);
          }
        }
      }
    };

    loadOrgAndCustomFields();
  }, [property?.id]);

  const handleGetLocation = () => {
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
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });
        form.setValue("latitude", lat.toString());
        form.setValue("longitude", lng.toString());
        setIsGettingLocation(false);
        toast({
          title: "Success",
          description: "Location captured successfully",
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

  const handleGeocodeAddress = async () => {
    const address = form.getValues("address");
    if (!address) {
      toast({
        title: "Error",
        description: "Please enter an address first",
        variant: "destructive",
      });
      return;
    }

    setIsGeocoding(true);
    try {
      // Using Nominatim (OpenStreetMap) for free geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'WorkOrderApp/1.0'
          }
        }
      );
      
      if (!response.ok) throw new Error("Failed to geocode address");
      
      const data = await response.json();
      
      if (data.length === 0) {
        toast({
          title: "No Results",
          description: "Could not find coordinates for this address",
          variant: "destructive",
        });
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      
      setLocation({ lat, lng });
      form.setValue("latitude", lat.toString());
      form.setValue("longitude", lng.toString());
      
      toast({
        title: "Success",
        description: "Coordinates retrieved from address",
      });
    } catch (error) {
      console.error("Geocoding error:", error);
      toast({
        title: "Error",
        description: "Failed to get coordinates. Please try entering them manually.",
        variant: "destructive",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to manage properties",
          variant: "destructive",
        });
        return;
      }

      // Get user's profile to determine active org context
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, active_org_id, approval_status")
        .eq("id", user.id)
        .single();

      const currentActiveOrgId = profile?.active_org_id || null;

      // Defensive check for free tier limits (only for new properties)
      if (!property) {
        const effectiveOrgId = profile?.active_org_id || profile?.organization_id;
        const isApproved = profile?.approval_status === "approved" && !!effectiveOrgId;

        // If personal workspace (no org), enforce limits
        if (!effectiveOrgId || !isApproved) {
          const { count } = await supabase
            .from("properties")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .is("organization_id", null);

          if (count && count >= 2) {
            toast({
              title: "Limit Reached",
              description: "Free tier allows up to 2 properties. Please upgrade.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
        }
      }

      const latitude = data.latitude ? parseFloat(data.latitude) : null;
      const longitude = data.longitude ? parseFloat(data.longitude) : null;

      const propertyData = {
        property_name: data.property_name,
        address: data.address || null,
        contact: data.contact || null,
        hours: data.hours || null,
        access_information: data.access_information || null,
        latitude: latitude,
        longitude: longitude,
        user_id: user.id,
        organization_id: currentActiveOrgId,
      };

      let propertyId: string;

      if (property) {
        const { error } = await supabase
          .from("properties")
          .update(propertyData)
          .eq("id", property.id);

        if (error) throw error;

        propertyId = property.id;

        toast({
          title: "Success",
          description: "Property updated successfully",
        });
      } else {
        const { data: newProperty, error } = await supabase
          .from("properties")
          .insert([propertyData])
          .select()
          .single();

        if (error) throw error;

        propertyId = newProperty!.id;

        toast({
          title: "Success",
          description: "Property created successfully",
        });
      }

      // Save custom field values if any
      if (orgId && Object.keys(customFieldValues).length > 0) {
        const { data: fields } = await supabase
          .from("custom_fields")
          .select("*")
          .eq("org_id", orgId)
          .eq("entity_type", "properties")
          .eq("is_active", true);

        if (fields && fields.length > 0) {
          const valuesToUpsert = Object.entries(customFieldValues)
            .map(([fieldKey, value]) => {
              const field = fields.find(f => f.field_key === fieldKey);
              if (!field) return null;

              return {
                custom_field_id: field.id,
                entity_type: "properties" as const,
                entity_id: propertyId,
                value,
              };
            })
            .filter(Boolean);

          if (valuesToUpsert.length > 0) {
            await supabase
              .from("custom_field_values")
              .upsert(valuesToUpsert, {
                onConflict: "custom_field_id,entity_id",
              });
          }
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="property_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter property name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Enter address" rows={2} />
              </FormControl>
              <FormMessage />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeocodeAddress}
                disabled={isGeocoding}
                className="mt-2 w-full"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {isGeocoding ? "Getting Coordinates..." : "Get Coordinates from Address"}
              </Button>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter contact information" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hours</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Mon-Fri 9am-5pm, Sat 10am-2pm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="access_information"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Access Information</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Enter access information" rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleGetLocation}
            disabled={isGettingLocation}
            className="w-full"
          >
            <MapPin className="h-4 w-4 mr-2" />
            {isGettingLocation ? "Getting Location..." : "Capture Current Location"}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter latitude" type="number" step="any" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter longitude" type="number" step="any" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Custom Fields */}
        {orgId && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold">Additional Information</h3>
            <CustomFieldRenderer
              entityType="properties"
              orgId={orgId}
              values={customFieldValues}
              onChange={(fieldKey, value) => {
                setCustomFieldValues(prev => ({ ...prev, [fieldKey]: value }));
              }}
            />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : property ? "Update Property" : "Create Property"}
        </Button>
      </form>
    </Form>
  );
}
