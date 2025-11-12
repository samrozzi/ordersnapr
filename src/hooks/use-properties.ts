import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActiveOrg } from "@/hooks/use-active-org";

interface Property {
  id: string;
  property_name: string;
  address: string | null;
  contact: string | null;
  access_information: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  user_id: string;
  organization_id: string | null;
}

export function useProperties() {
  const { toast } = useToast();
  const { activeOrgId } = useActiveOrg();
  const queryClient = useQueryClient();

  const { data: properties = [], isLoading, error, refetch } = useQuery({
    queryKey: ["properties", activeOrgId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let query = supabase.from("properties").select("*");

      if (activeOrgId === null) {
        // Personal workspace: user's own properties with no organization
        query = query.eq("user_id", user.id).is("organization_id", null);
      } else {
        // Organization workspace: all properties for that org
        query = query.eq("organization_id", activeOrgId);
      }

      const { data, error } = await query.order("property_name", { ascending: true });

      if (error) throw error;
      return data as Property[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const createProperty = useMutation({
    mutationFn: async (propertyData: Partial<Property>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const insertData: any = {
        ...propertyData,
        user_id: user.id,
        organization_id: activeOrgId,
      };

      const { data, error } = await supabase
        .from("properties")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties", activeOrgId] });
      toast({
        title: "Success",
        description: "Property created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create property",
        variant: "destructive",
      });
    },
  });

  const updateProperty = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Property> & { id: string }) => {
      const { data, error } = await supabase
        .from("properties")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties", activeOrgId] });
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive",
      });
    },
  });

  const deleteProperty = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties", activeOrgId] });
      toast({
        title: "Success",
        description: "Property deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete property",
        variant: "destructive",
      });
    },
  });

  return {
    properties,
    isLoading,
    error,
    refetch,
    createProperty: createProperty.mutate,
    updateProperty: updateProperty.mutate,
    deleteProperty: deleteProperty.mutate,
  };
}
