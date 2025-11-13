import { Star } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, memo } from "react";
import { useWorkOrderDialog } from "@/contexts/WorkOrderDialogContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FormRenderer } from "@/components/forms/FormRenderer";

interface FavoriteItem {
  id: string;
  entity_type: string;
  entity_id: string;
  title?: string;
  date?: string;
}

export const FavoritesWidget = memo(() => {
  const [enrichedFavorites, setEnrichedFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [selectedFormTemplate, setSelectedFormTemplate] = useState<any>(null);
  const navigate = useNavigate();
  const { openWorkOrderDialog } = useWorkOrderDialog();

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: favorites } = await supabase
          .from("user_favorites")
          .select("*")
          .eq("user_id", user.id)
          .order("display_order", { ascending: false })
          .limit(6);

        if (!favorites || favorites.length === 0) {
          setEnrichedFavorites([]);
          return;
        }

        // Batch fetch all entities by type for better performance
        const workOrderIds = favorites.filter(f => f.entity_type === "work_order").map(f => f.entity_id);
        const calendarEventIds = favorites.filter(f => f.entity_type === "calendar_event").map(f => f.entity_id);
        const propertyIds = favorites.filter(f => f.entity_type === "property").map(f => f.entity_id);
        const formDraftIds = favorites.filter(f => f.entity_type === "form_draft").map(f => f.entity_id);
        const formTemplateIds = favorites.filter(f => f.entity_type === "form_template").map(f => f.entity_id);
        const noteIds = favorites.filter(f => f.entity_type === "note").map(f => f.entity_id);

        const [workOrders, calendarEvents, properties, formDrafts, formTemplates, notes] = await Promise.all([
          workOrderIds.length > 0 
            ? supabase.from("work_orders").select("id, customer_name, scheduled_date").in("id", workOrderIds)
            : Promise.resolve({ data: [] }),
          calendarEventIds.length > 0
            ? supabase.from("calendar_events").select("id, title, event_date").in("id", calendarEventIds)
            : Promise.resolve({ data: [] }),
          propertyIds.length > 0
            ? supabase.from("properties").select("id, property_name").in("id", propertyIds)
            : Promise.resolve({ data: [] }),
          formDraftIds.length > 0
            ? supabase.from("form_drafts").select("id, draft_name, form_type").in("id", formDraftIds)
            : Promise.resolve({ data: [] }),
          formTemplateIds.length > 0
            ? supabase.from("form_templates").select("id, name").in("id", formTemplateIds)
            : Promise.resolve({ data: [] }),
          noteIds.length > 0
            ? supabase.from("notes").select("id, title, updated_at").in("id", noteIds)
            : Promise.resolve({ data: [] }),
        ]);

        // Map entities to lookup
        const woMap = new Map((workOrders.data || []).map(w => [w.id, w]));
        const evMap = new Map((calendarEvents.data || []).map(e => [e.id, e]));
        const propMap = new Map((properties.data || []).map(p => [p.id, p]));
        const draftMap = new Map((formDrafts.data || []).map(d => [d.id, d]));
        const templateMap = new Map((formTemplates.data || []).map(t => [t.id, t]));
        const noteMap = new Map((notes.data || []).map(n => [n.id, n]));

        const enriched = favorites
          .map(fav => {
            let title: string | null = null;
            let date = "";

            if (fav.entity_type === "work_order") {
              const wo = woMap.get(fav.entity_id);
              if (wo) {
                title = wo.customer_name;
                date = wo.scheduled_date || "";
              }
            } else if (fav.entity_type === "calendar_event") {
              const ev = evMap.get(fav.entity_id);
              if (ev) {
                title = ev.title;
                date = ev.event_date;
              }
            } else if (fav.entity_type === "property") {
              const prop = propMap.get(fav.entity_id);
              if (prop) title = prop.property_name;
            } else if (fav.entity_type === "form_draft") {
              const draft = draftMap.get(fav.entity_id);
              if (draft) title = draft.draft_name || draft.form_type;
            } else if (fav.entity_type === "form_template") {
              const t = templateMap.get(fav.entity_id);
              if (t) title = t.name;
            } else if (fav.entity_type === "note") {
              const n = noteMap.get(fav.entity_id);
              if (n) {
                title = n.title;
                date = n.updated_at || "";
              }
            }

            // Filter out deleted entities
            if (!title) return null;

            return {
              id: fav.id,
              entity_type: fav.entity_type,
              entity_id: fav.entity_id,
              title,
              date,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        setEnrichedFavorites(enriched);
      } catch (error) {
        console.error("Error fetching favorites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  const handleClick = async (item: FavoriteItem) => {
    // Open dialog for work orders, navigate for other types
    switch (item.entity_type) {
      case "work_order":
        openWorkOrderDialog(item.entity_id);
        break;
      case "calendar_event":
        navigate(`/calendar?event=${item.entity_id}`);
        break;
      case "property":
        navigate(`/property-info?property=${item.entity_id}`);
        break;
      case "form_draft":
        navigate(`/forms?draft=${item.entity_id}`);
        break;
      case "form_template":
        // Fetch template and open in drawer
        try {
          const { data: template } = await supabase
            .from("form_templates")
            .select("*")
            .eq("id", item.entity_id)
            .single();
          
          if (template) {
            setSelectedFormTemplate(template);
            setFormSheetOpen(true);
          }
        } catch (error) {
          console.error("Error fetching template:", error);
          navigate(`/forms?template=${item.entity_id}`);
        }
        break;
      case "note":
        navigate(`/notes?id=${item.entity_id}`);
        break;
      default:
        navigate("/profile?tab=favorites");
    }
  };

  return (
    <>
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

    <Sheet open={formSheetOpen} onOpenChange={setFormSheetOpen}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{selectedFormTemplate?.name || "Form"}</SheetTitle>
        </SheetHeader>
        {selectedFormTemplate && (
          <div className="mt-6">
            <FormRenderer
              template={selectedFormTemplate}
              onSuccess={() => setFormSheetOpen(false)}
              onCancel={() => setFormSheetOpen(false)}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
    </>
  );
});
