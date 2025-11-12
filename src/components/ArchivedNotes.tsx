import { Note } from "@/hooks/use-notes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface ArchivedNotesProps {
  archivedNotes: Note[];
  hasPremiumAccess: boolean;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

export function ArchivedNotes({ 
  archivedNotes, 
  hasPremiumAccess, 
  onRestore, 
  onPermanentDelete 
}: ArchivedNotesProps) {
  const getExpirationInfo = (note: Note) => {
    if (hasPremiumAccess) return null;
    
    if (!note.archived_at) return null;
    
    const archivedDate = new Date(note.archived_at);
    const expirationDate = new Date(archivedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    return daysLeft > 0 ? `Deletes in ${daysLeft} days` : "Expired";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Archived Notes</h2>
        {!hasPremiumAccess && (
          <Badge variant="secondary">Free tier: 30-day retention</Badge>
        )}
      </div>

      {archivedNotes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No archived notes
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {archivedNotes.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{note.title || "Untitled"}</h3>
                    <p className="text-sm text-muted-foreground">
                      Archived {note.archived_at && formatDistanceToNow(new Date(note.archived_at), { addSuffix: true })}
                    </p>
                    {!hasPremiumAccess && (
                      <p className="text-xs text-amber-600 mt-1">
                        {getExpirationInfo(note)}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRestore(note.id)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Permanently delete this note? This cannot be undone.")) {
                          onPermanentDelete(note.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
