import { Star } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface FavoriteItem {
  id: string;
  entity_type: string;
  entity_id: string;
  title?: string;
  date?: string;
}

export const FavoritesWidget = () => {
  const { favorites, loading } = useFavorites();
  const [enrichedFavorites, setEnrichedFavorites] = useState<FavoriteItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const enrichFavorites = async () => {
      const enriched = await Promise.all(
        favorites.slice(0, 5).map(async (fav) => {
          let title = "Unknown";
          let date = "";

          try {
            if (fav.entity_type === "work_order") {
              const { data } = await supabase
                .from("work_orders")
                .select("customer_name, scheduled_date")
                .eq("id", fav.entity_id)
                .single();
              if (data) {
                title = data.customer_name;
                date = data.scheduled_date || "";
              }
            } else if (fav.entity_type === "calendar_event") {
              const { data } = await supabase
                .from("calendar_events")
                .select("title, event_date")
                .eq("id", fav.entity_id)
                .single();
              if (data) {
                title = data.title;
                date = data.event_date;
              }
            } else if (fav.entity_type === "property") {
              const { data } = await supabase
                .from("properties")
                .select("property_name")
                .eq("id", fav.entity_id)
                .single();
              if (data) {
                title = data.property_name;
              }
            } else if (fav.entity_type === "form_draft") {
              const { data } = await supabase
                .from("form_drafts")
                .select("draft_name, form_type")
                .eq("id", fav.entity_id)
                .single();
              if (data) {
                title = data.draft_name || data.form_type;
              }
            }
          } catch (error) {
            console.error("Error enriching favorite:", error);
          }

          return {
            id: fav.id,
            entity_type: fav.entity_type,
            entity_id: fav.entity_id,
            title,
            date,
          };
        })
      );

      setEnrichedFavorites(enriched);
    };

    if (favorites.length > 0) {
      enrichFavorites();
    }
  }, [favorites]);

  const handleClick = (item: FavoriteItem) => {
    // Navigate to profile favorites tab
    navigate("/profile?tab=favorites");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
        <h3 className="font-semibold">Favorites</h3>
      </div>

      <div className="flex-1 space-y-2 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-xs">Loading...</p>
          </div>
        ) : enrichedFavorites.length > 0 ? (
          enrichedFavorites.map((item) => (
            <div
              key={item.id}
              onClick={() => handleClick(item)}
              className="flex items-center gap-2 text-xs bg-card/50 rounded p-2 hover:bg-accent/20 transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.title}</div>
                <div className="text-muted-foreground capitalize">
                  {item.entity_type.replace("_", " ")}
                  {item.date && ` • ${new Date(item.date).toLocaleDateString()}`}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Star className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs text-center">No favorites yet</p>
            <p className="text-xs text-center mt-1">Star items to see them here</p>
          </div>
        )}
      </div>

      {enrichedFavorites.length > 0 && (
        <div className="mt-2 pt-2 border-t">
          <button
            onClick={() => navigate("/profile?tab=favorites")}
            className="text-xs text-primary hover:underline w-full text-center"
          >
            View all favorites
          </button>
        </div>
      )}
    </div>
  );
};
