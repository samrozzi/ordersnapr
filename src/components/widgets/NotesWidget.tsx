import { useState, useEffect } from "react";
import { Settings, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { useDebounce } from "use-debounce";
import { cn } from "@/lib/utils";

interface NotesWidgetProps {
  widgetId: string;
  size: "S" | "M" | "L";
  settings?: {
    noteId?: string;
    bgColor?: string;
    stickyContent?: string;
  };
}

const BG_COLORS = [
  { name: "Yellow", value: "#FFEB3B" },
  { name: "Blue", value: "#81D4FA" },
  { name: "Pink", value: "#F48FB1" },
  { name: "Green", value: "#A5D6A7" },
  { name: "Orange", value: "#FFB74D" },
  { name: "Purple", value: "#CE93D8" },
];

export const NotesWidget = ({ widgetId, size, settings }: NotesWidgetProps) => {
  const { user } = useAuth();
  const { favorites } = useFavorites("note");
  const [selectedNoteId, setSelectedNoteId] = useState(settings?.noteId || null);
  const [bgColor, setBgColor] = useState(settings?.bgColor || "#FFEB3B");
  const [stickyContent, setStickyContent] = useState(settings?.stickyContent || "");
  const [noteData, setNoteData] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [debouncedContent] = useDebounce(stickyContent, 1000);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [isLoadingTitles, setIsLoadingTitles] = useState(false);

  const textColor = getContrastColor(bgColor);

  // Sync state with settings prop (handles persistence)
  useEffect(() => {
    setSelectedNoteId(settings?.noteId ?? null);
    setBgColor(settings?.bgColor ?? "#FFEB3B");
    setStickyContent(settings?.stickyContent ?? "");
  }, [settings?.noteId, settings?.bgColor, settings?.stickyContent]);

  useEffect(() => {
    if (selectedNoteId) {
      fetchNote(selectedNoteId);
    }
  }, [selectedNoteId]);

  useEffect(() => {
    // Fetch note titles for all favorites
    const fetchNoteTitles = async () => {
      if (favorites.length === 0) return;
      
      setIsLoadingTitles(true);
      const noteIds = favorites.map(fav => fav.entity_id);
      const { data } = await supabase
        .from("notes")
        .select("id, title")
        .in("id", noteIds);
      
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(note => {
          map[note.id] = note.title;
        });
        setNotesMap(map);
      }
      setIsLoadingTitles(false);
    };
    
    fetchNoteTitles();
  }, [favorites]);

  useEffect(() => {
    if (debouncedContent !== (settings?.stickyContent || "")) {
      saveSettingsWithParams(selectedNoteId, bgColor, debouncedContent);
    }
  }, [debouncedContent]);

  const fetchNote = async (noteId: string) => {
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, content")
      .eq("id", noteId)
      .single();

    if (!error && data) {
      setNoteData(data);
    }
  };

  const saveSettingsWithParams = async (noteId: string | null, color: string, content: string) => {
    if (!user) return;

    await supabase
      .from("dashboard_widgets")
      .update({
        settings: {
          noteId,
          bgColor: color,
          stickyContent: content,
        },
      })
      .eq("id", widgetId);
  };

  const handleNoteSelect = (noteId: string) => {
    const newNoteId = noteId === "none" ? null : noteId;
    setSelectedNoteId(newNoteId);
    saveSettingsWithParams(newNoteId, bgColor, stickyContent);
    if (newNoteId) {
      fetchNote(newNoteId);
    } else {
      setNoteData(null);
    }
  };

  const handleColorChange = (color: string) => {
    setBgColor(color);
    saveSettingsWithParams(selectedNoteId, color, stickyContent);
  };

  const getPreviewText = () => {
    if (!noteData?.content) return "";
    const blocks = noteData.content.blocks || [];
    let text = "";
    for (const block of blocks) {
      if (block.type === "paragraph" && block.data?.text) {
        text += block.data.text + " ";
      }
      if (text.length > 200) break;
    }
    return text.trim();
  };

  const maxLines = size === "S" ? 2 : size === "M" ? 5 : 10;

  return (
    <div
      className="h-full relative rounded-lg shadow-lg transition-all duration-200"
      style={{ backgroundColor: bgColor }}
    >
      <div className="absolute top-2 right-2 z-10">
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full opacity-70 hover:opacity-100"
              style={{ color: textColor }}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Note Widget Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Favorite Note</Label>
                <Select value={selectedNoteId || "none"} onValueChange={handleNoteSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="None (Sticky Note Mode)" />
                  </SelectTrigger>
                  <SelectContent className="z-[60] bg-popover shadow-md">
                    <SelectItem value="none">None (Sticky Note Mode)</SelectItem>
                    {isLoadingTitles ? (
                      <SelectItem value="loading" disabled>Loading titles...</SelectItem>
                    ) : favorites.length === 0 ? (
                      <SelectItem value="no-favorites" disabled>No favorite notes</SelectItem>
                    ) : (
                      favorites.map((fav) => (
                        <SelectItem key={fav.entity_id} value={fav.entity_id}>
                          {notesMap[fav.entity_id] || "Untitled Note"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Background Color</Label>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {BG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={cn(
                        "h-10 w-10 rounded-full border-2 transition-all",
                        bgColor === color.value ? "border-foreground scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color.value }}
                      onClick={() => handleColorChange(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-4 h-full flex flex-col" style={{ color: textColor }}>
        {selectedNoteId && noteData ? (
          <>
            <h3 className="font-semibold text-lg mb-2 line-clamp-1">{noteData.title}</h3>
            <p className={cn("text-sm opacity-80 overflow-hidden", `line-clamp-${maxLines}`)}>
              {getPreviewText()}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="h-5 w-5" />
              <span className="font-semibold">Quick Note</span>
            </div>
            <Textarea
              value={stickyContent}
              onChange={(e) => setStickyContent(e.target.value)}
              placeholder="Jot down quick notes..."
              className="flex-1 resize-none border-none focus-visible:ring-0 text-sm"
              style={{
                backgroundColor: "transparent",
                color: textColor,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
