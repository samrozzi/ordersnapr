import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Pin, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotes, type Note } from "@/hooks/use-notes";
import { format } from "date-fns";

interface NoteCardProps {
  note: Note;
  onClick: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const { toggleFavorite, togglePin, archiveNote } = useNotes();

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite(note.id);
  };

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePin(note.id);
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Archive "${note.title}"?`)) {
      await archiveNote(note.id);
    }
  };

  // Get preview text from blocks
  const getPreviewText = (): string => {
    if (!note.content.blocks || note.content.blocks.length === 0) {
      return "Empty note";
    }

    const firstTextBlock = note.content.blocks.find(
      block => block.type === 'paragraph' || block.type === 'heading'
    );

    if (firstTextBlock && firstTextBlock.content) {
      // Strip HTML tags to get plain text
      const plainText = firstTextBlock.content.replace(/<[^>]*>/g, '');
      return plainText.slice(0, 150) + (plainText.length > 150 ? '...' : '');
    }

    return "No content";
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow relative"
      style={{ backgroundColor: note.background_color || undefined }}
      onClick={onClick}
    >
      {note.banner_image && (
        <div className="relative h-24 bg-muted rounded-t-lg overflow-hidden">
          <img
            src={note.banner_image}
            alt={`${note.title} banner`}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            width={1200}
            height={240}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{note.title}</h3>
            <p className="text-xs text-muted-foreground">
              {format(new Date(note.updated_at), "MMM d, yyyy")}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleToggleFavorite}
            >
              <Star
                className={`h-4 w-4 ${note.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
              />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleTogglePin}
            >
              <Pin
                className={`h-4 w-4 ${note.is_pinned ? 'fill-primary text-primary' : ''}`}
              />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onClick}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleFavorite}>
                  {note.is_favorite ? 'Remove from' : 'Add to'} Favorites
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleTogglePin}>
                  {note.is_pinned ? 'Unpin from' : 'Pin to'} Sidebar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleArchive} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {getPreviewText()}
        </p>

        {(note.is_pinned || note.is_favorite) && (
          <div className="flex gap-1 mt-3">
            {note.is_pinned && (
              <Badge variant="secondary" className="text-xs">
                <Pin className="h-3 w-3 mr-1" />
                Pinned
              </Badge>
            )}
            {note.is_favorite && (
              <Badge variant="secondary" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Favorite
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
