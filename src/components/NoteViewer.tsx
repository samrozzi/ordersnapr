import { Star, Pin, Pencil, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Note } from "@/hooks/use-notes";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NoteViewerProps {
  note: Note;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onTogglePin: () => void;
}

export function NoteViewer({ note, onEdit, onToggleFavorite, onTogglePin }: NoteViewerProps) {
  const [linkedEntity, setLinkedEntity] = useState<{
    type: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    async function fetchLinkedEntity() {
      if (!note.linked_entity_id || !note.linked_entity_type) {
        setLinkedEntity(null);
        return;
      }

      try {
        // Map singular to plural table names
        let tableName: string = note.linked_entity_type;
        if (note.linked_entity_type === 'customer') tableName = 'customers';
        if (note.linked_entity_type === 'invoice') tableName = 'invoices';
        if (note.linked_entity_type === 'work_order') tableName = 'work_orders';

        const { data, error } = await supabase
          .from(tableName as any)
          .select("*")
          .eq("id", note.linked_entity_id)
          .single();

        if (error) throw error;

        if (data) {
          let label = "";
          if (tableName === "work_orders") {
            label = `Work Order: ${(data as any).customer_name}`;
          } else if (tableName === "customers") {
            label = `Customer: ${(data as any).name}`;
          } else if (tableName === "invoices") {
            label = `Invoice: ${(data as any).number}`;
          }
          setLinkedEntity({ type: note.linked_entity_type, label });
        }
      } catch (error) {
        console.error("Error fetching linked entity:", error);
      }
    }

    fetchLinkedEntity();
  }, [note.linked_entity_id, note.linked_entity_type]);

  const renderBlock = (block: any) => {
    switch (block.type) {
      case "heading":
        return (
          <h1 key={block.id} className="text-2xl font-bold mb-4">
            {block.content}
          </h1>
        );
      case "paragraph":
        return (
          <p key={block.id} className="mb-3 whitespace-pre-wrap">
            {block.content || "\u00A0"}
          </p>
        );
      case "checklist":
        return (
          <div key={block.id} className="mb-4">
            {block.items?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-start gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={item.checked}
                  readOnly
                  className="mt-1"
                />
                <span className={item.checked ? "line-through text-muted-foreground" : ""}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 pb-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFavorite}
          >
            <Star
              className={`h-4 w-4 ${note.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
            />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePin}
          >
            <Pin
              className={`h-4 w-4 ${note.is_pinned ? 'fill-primary text-primary' : ''}`}
            />
          </Button>

          {linkedEntity && (
            <Badge variant="outline" className="gap-1">
              <LinkIcon className="h-3 w-3" />
              {linkedEntity.label}
            </Badge>
          )}
        </div>

        <Button onClick={onEdit} size="sm">
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Note Content */}
      <div className="flex-1 overflow-y-auto pt-4">
        {note.banner_image && (
          <div
            className="h-48 bg-cover bg-center rounded-lg mb-4"
            style={{ backgroundImage: `url(${note.banner_image})` }}
          />
        )}

        <h2 className="text-3xl font-bold mb-6">{note.title}</h2>

        <div
          className="rounded-lg p-4 mb-6"
          style={{
            backgroundColor: note.background_color || undefined,
          }}
        >
          {note.content.blocks?.map(renderBlock)}
        </div>

        {/* Timestamps */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
          <div>Created: {format(new Date(note.created_at), "PPpp")}</div>
          <div>Last updated: {format(new Date(note.updated_at), "PPpp")}</div>
        </div>
      </div>
    </div>
  );
}
