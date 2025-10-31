import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFavorites, EntityType } from "@/hooks/use-favorites";

interface FavoriteButtonProps {
  entityType: EntityType;
  entityId: string;
  className?: string;
}

export const FavoriteButton = ({ entityType, entityId, className }: FavoriteButtonProps) => {
  const { isFavorited, toggleFavorite, loading } = useFavorites(entityType, entityId);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite();
      }}
      disabled={loading}
      className={cn("h-8 w-8", className)}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={cn(
          "h-5 w-5 transition-colors",
          isFavorited ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
        )}
      />
    </Button>
  );
};
