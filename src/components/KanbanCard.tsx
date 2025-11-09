import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Pin, GripVertical } from "lucide-react";
import type { Note } from "@/hooks/use-notes";
import { format } from "date-fns";

interface KanbanCardProps {
  note: Note;
  onClick: () => void;
  isDragging?: boolean;
}

export function KanbanCard({ note, onClick, isDragging = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
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
      return firstTextBlock.content.slice(0, 100) + (firstTextBlock.content.length > 100 ? '...' : '');
    }

    return "No content";
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`cursor-pointer hover:shadow-md transition-shadow ${isDragging ? 'shadow-lg' : ''}`}
        style={{ backgroundColor: note.background_color || undefined }}
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start gap-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing mt-1"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{note.title}</h4>
              <p className="text-xs text-muted-foreground">
                {format(new Date(note.updated_at), "MMM d")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {note.is_favorite && (
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              )}
              {note.is_pinned && (
                <Pin className="h-3 w-3 fill-primary text-primary" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {getPreviewText()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
