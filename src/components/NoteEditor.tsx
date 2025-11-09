import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Pin, Palette, Image as ImageIcon, Save, X } from "lucide-react";
import { useNotes, type Note, type NoteBlock } from "@/hooks/use-notes";
import { RichBlockEditor } from "@/components/RichBlockEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NoteEditorProps {
  note: Note;
  onClose: () => void;
}

const BACKGROUND_COLORS = [
  { name: "Default", value: null },
  { name: "Warm Beige", value: "#fef3c7" },
  { name: "Soft Pink", value: "#fce7f3" },
  { name: "Light Blue", value: "#dbeafe" },
  { name: "Mint Green", value: "#d1fae5" },
  { name: "Lavender", value: "#e0e7ff" },
  { name: "Peach", value: "#fed7aa" },
];

export function NoteEditor({ note, onClose }: NoteEditorProps) {
  const { updateNote, toggleFavorite, togglePin } = useNotes();
  const [title, setTitle] = useState(note.title);
  const [blocks, setBlocks] = useState<NoteBlock[]>(
    note.content.blocks.length > 0
      ? note.content.blocks
      : [{ id: `block-${Date.now()}`, type: 'paragraph', content: '' }]
  );
  const [backgroundColor, setBackgroundColor] = useState(note.background_color || null);
  const [bannerImage, setBannerImage] = useState(note.banner_image || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateNote({
        id: note.id,
        updates: {
          title,
          content: { blocks },
          background_color: backgroundColor,
          banner_image: bannerImage || null,
        },
      });

      onClose();
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFavorite = async () => {
    await toggleFavorite(note.id);
  };

  const handleTogglePin = async () => {
    await togglePin(note.id);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleFavorite}
          >
            <Star className={`h-4 w-4 ${note.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleTogglePin}
          >
            <Pin className={`h-4 w-4 ${note.is_pinned ? 'fill-primary text-primary' : ''}`} />
          </Button>

          <Select value={backgroundColor || 'default'} onValueChange={(val) => setBackgroundColor(val === 'default' ? null : val)}>
            <SelectTrigger className="w-[140px]">
              <Palette className="h-4 w-4 mr-2" />
              <span className="text-sm">Background</span>
            </SelectTrigger>
            <SelectContent>
              {BACKGROUND_COLORS.map(color => (
                <SelectItem key={color.value || 'default'} value={color.value || 'default'}>
                  <div className="flex items-center gap-2">
                    {color.value && (
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: color.value }}
                      />
                    )}
                    {color.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: backgroundColor || undefined }}>
        {/* Banner Image */}
        <div className="space-y-2 mb-6">
          <Label htmlFor="banner-image">Banner Image URL (optional)</Label>
          <div className="flex gap-2">
            <Input
              id="banner-image"
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          {bannerImage && (
            <div
              className="w-full h-32 bg-cover bg-center rounded-lg border"
              style={{ backgroundImage: `url(${bannerImage})` }}
            />
          )}
        </div>

        {/* Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 mb-4"
        />

        {/* Content - Rich Block Editor */}
        <div className="my-6">
          <RichBlockEditor blocks={blocks} onChange={setBlocks} />
        </div>

        {/* Info */}
        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
          <p>Created: {new Date(note.created_at).toLocaleString()}</p>
          <p>Last updated: {new Date(note.updated_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
