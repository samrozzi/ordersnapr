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
    const fetchFavorites = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: favorites } = await supabase
        .from("user_favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("display_order", { ascending: false })
        .limit(6);

      const enriched = await Promise.all(
        (favorites || []).map(async (fav) => {
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

    fetchFavorites();
  }, []);

  const handleClick = (item: FavoriteItem) => {
    // Navigate to profile favorites tab
    navigate("/profile?tab=favorites");
  };

  return (
    <div className="h-full flex flex-col">
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p className="text-xs">Loading...</p>
        </div>
      ) : enrichedFavorites.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <Star className="h-12 w-12 text-muted-foreground opacity-50 mb-3" />
          <p className="text-sm text-muted-foreground">No favorites yet</p>
        </div>
      ) : (
        <>
          <div className="flex-1 grid grid-cols-2 gap-2 min-h-0 overflow-y-auto">
            {enrichedFavorites.map((item) => (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className="text-left p-2.5 rounded-lg bg-card hover:bg-accent/50 transition-colors border border-border h-fit"
              >
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-1">
                    <p className="font-medium text-xs truncate flex-1">{item.title}</p>
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                  </div>
                  <p className="text-[10px] text-muted-foreground capitalize truncate">
                    {item.entity_type.replace("_", " ")}
                  </p>
                  {item.date && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => navigate("/profile?tab=favorites")}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors text-center w-full"
          >
            View all favorites →
          </button>
        </>
      )}
    </div>
  );
};
