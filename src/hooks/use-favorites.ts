import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type EntityType = "work_order" | "calendar_event" | "property" | "form_draft" | "form_template" | "note";

interface Favorite {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  created_at: string;
}

export const useFavorites = (entityType?: EntityType, entityId?: string) => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("user_favorites")
        .select("*")
        .eq("user_id", user.id);

      if (entityType && entityId) {
        query = query.eq("entity_type", entityType).eq("entity_id", entityId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setFavorites((data as Favorite[]) || []);
      
      if (entityType && entityId) {
        setIsFavorited(data && data.length > 0);
      }
    } catch (error: any) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [entityType, entityId]);

  const toggleFavorite = async () => {
    if (!entityType || !entityId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isFavorited) {
        // Remove favorite
        const { error } = await supabase
          .from("user_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("entity_type", entityType)
          .eq("entity_id", entityId);

        if (error) throw error;

        setIsFavorited(false);
        toast({
          title: "Removed from favorites",
          description: "Item removed from your favorites",
        });
      } else {
        // Add favorite
        const { error } = await supabase
          .from("user_favorites")
          .insert({
            user_id: user.id,
            entity_type: entityType,
            entity_id: entityId,
          });

        if (error) throw error;

        setIsFavorited(true);
        toast({
          title: "Added to favorites",
          description: "Item added to your favorites",
        });
      }

      fetchFavorites();
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;

      toast({
        title: "Removed from favorites",
        description: "Item removed from your favorites",
      });

      fetchFavorites();
    } catch (error: any) {
      console.error("Error removing favorite:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    favorites,
    isFavorited,
    loading,
    toggleFavorite,
    removeFavorite,
    refetch: fetchFavorites,
  };
};
