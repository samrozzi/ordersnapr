import { useState } from "react";
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

const formSchema = z.object({
  property_name: z.string().min(1, "Property name is required"),
  address: z.string().optional(),
  contact: z.string().optional(),
  access_information: z.string().optional(),
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
    access_information: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

export function PropertyForm({ onSuccess, property }: PropertyFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    property?.latitude && property?.longitude
      ? { lat: property.latitude, lng: property.longitude }
      : null
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      property_name: property?.property_name || "",
      address: property?.address || "",
      contact: property?.contact || "",
      access_information: property?.access_information || "",
      latitude: property?.latitude?.toString() || "",
      longitude: property?.longitude?.toString() || "",
    },
  });

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

      const latitude = data.latitude ? parseFloat(data.latitude) : null;
      const longitude = data.longitude ? parseFloat(data.longitude) : null;

      const propertyData = {
        property_name: data.property_name,
        address: data.address || null,
        contact: data.contact || null,
        access_information: data.access_information || null,
        latitude: latitude,
        longitude: longitude,
        user_id: user.id,
      };

      if (property) {
        const { error } = await supabase
          .from("properties")
          .update(propertyData)
          .eq("id", property.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Property updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("properties")
          .insert([propertyData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Property created successfully",
        });
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : property ? "Update Property" : "Create Property"}
        </Button>
      </form>
    </Form>
  );
}
