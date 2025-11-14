import { StickyNote, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotes } from "@/hooks/use-notes";
import { formatDistanceToNow } from "date-fns";

interface RecentNotesWidgetProps {
  size: "M" | "L";
}

export const RecentNotesWidget = ({ size }: RecentNotesWidgetProps) => {
  const navigate = useNavigate();
  const { notes, isLoading } = useNotes();
  
  const maxItems = size === "M" ? 5 : 8;
  const recentNotes = notes
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, maxItems);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Recent Notes</h3>
        </div>
        <button
          onClick={() => navigate("/notes")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </button>
      </div>

      {/* Notes List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-xs">Loading...</p>
          </div>
        ) : recentNotes.length > 0 ? (
          recentNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => navigate(`/notes/${note.id}`)}
              className="w-full flex items-center gap-3 text-left bg-card/50 hover:bg-accent/20 rounded-lg p-2.5 transition-colors group"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                {note.icon || "📝"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {note.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <StickyNote className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs">No notes yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
