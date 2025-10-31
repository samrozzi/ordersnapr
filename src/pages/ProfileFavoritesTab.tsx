import { useFavorites } from "@/hooks/use-favorites";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Star, GripVertical } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SortableFavoriteItemProps {
  fav: any;
  isTopSix: boolean;
  onRemove: (id: string) => void;
}

const SortableFavoriteItem = ({ fav, isTopSix, onRemove }: SortableFavoriteItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fav.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        isDragging && "opacity-50 z-50",
        isTopSix && "bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button
            className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{fav.title}</h3>
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
                onClick={() => onRemove(fav.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ProfileFavoritesTab = () => {
  const { favorites, removeFavorite, loading, refetch } = useFavorites();
  const [enrichedFavorites, setEnrichedFavorites] = useState<any[]>([]);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = enrichedFavorites.findIndex((fav) => fav.id === active.id);
    const newIndex = enrichedFavorites.findIndex((fav) => fav.id === over.id);

    const newOrder = arrayMove(enrichedFavorites, oldIndex, newIndex);
    setEnrichedFavorites(newOrder);

    // Update display_order in database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update each favorite's display_order based on new position
      const updates = newOrder.map((fav, index) => 
        supabase
          .from("user_favorites")
          .update({ display_order: newOrder.length - index })
          .eq("id", fav.id)
          .eq("user_id", user.id)
      );

      await Promise.all(updates);
      toast.success("Favorites reordered");
      refetch();
    } catch (error) {
      console.error("Error updating favorite order:", error);
      toast.error("Failed to reorder favorites");
    }
  };

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
    <div className="space-y-4">
      {enrichedFavorites.length > 6 && (
        <p className="text-sm text-muted-foreground">
          Top 6 favorites are shown in your dashboard widget. Drag to reorder.
        </p>
      )}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={enrichedFavorites.map(f => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-3">
            {enrichedFavorites.map((fav, index) => (
              <SortableFavoriteItem
                key={fav.id}
                fav={fav}
                isTopSix={index < 6}
                onRemove={removeFavorite}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
