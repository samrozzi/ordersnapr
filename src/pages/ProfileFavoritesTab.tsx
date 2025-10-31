import { useFavorites } from "@/hooks/use-favorites";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const ProfileFavoritesTab = () => {
  const { favorites, removeFavorite, loading } = useFavorites();
  const [enrichedFavorites, setEnrichedFavorites] = useState<any[]>([]);

  useEffect(() => {
    const enrichFavorites = async () => {
      const enriched = await Promise.all(
        favorites.map(async (fav) => {
          let title = "Unknown";
          let subtitle = "";

          try {
            if (fav.entity_type === "work_order") {
              const { data } = await supabase
                .from("work_orders")
                .select("customer_name, address")
                .eq("id", fav.entity_id)
                .single();
              if (data) {
                title = data.customer_name;
                subtitle = data.address || "";
              }
            } else if (fav.entity_type === "calendar_event") {
              const { data } = await supabase
                .from("calendar_events")
                .select("title, event_date")
                .eq("id", fav.entity_id)
                .single();
              if (data) {
                title = data.title;
                subtitle = new Date(data.event_date).toLocaleDateString();
              }
            }
          } catch (error) {
            console.error("Error enriching favorite:", error);
          }

          return { ...fav, title, subtitle };
        })
      );

      setEnrichedFavorites(enriched);
    };

    if (favorites.length > 0) {
      enrichFavorites();
    } else {
      setEnrichedFavorites([]);
    }
  }, [favorites]);

  if (loading) {
    return <div className="text-center py-8">Loading favorites...</div>;
  }

  if (enrichedFavorites.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No favorites yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Star items throughout the app to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {enrichedFavorites.map((fav) => (
        <Card key={fav.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold">{fav.title}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {fav.entity_type.replace("_", " ")}
                </p>
                {fav.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{fav.subtitle}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFavorite(fav.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
