import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, Pin, Palette, Image as ImageIcon, Save, X, Upload, Link as LinkIcon } from "lucide-react";
import { useNotes, type Note, type NoteBlock, type LinkedEntity } from "@/hooks/use-notes";
import { RichBlockEditor } from "@/components/RichBlockEditor";
import { EntityLinkSelector } from "@/components/EntityLinkSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NoteCustomizerProps {
  note: Note;
  onClose: () => void;
  onBackToView: () => void;
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

export function NoteCustomizer({ note, onClose, onBackToView }: NoteCustomizerProps) {
  const { updateNote, toggleFavorite, togglePin, linkEntity, unlinkEntity, fetchLinkedEntity } = useNotes();
  const [title, setTitle] = useState(note.title);
  const [blocks, setBlocks] = useState<NoteBlock[]>(
    note.content.blocks.length > 0
      ? note.content.blocks
      : [{ id: `block-${Date.now()}`, type: 'paragraph', content: '' }]
  );
  const [backgroundColor, setBackgroundColor] = useState(note.background_color || null);
  const [bannerImage, setBannerImage] = useState(note.banner_image || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [linkedEntity, setLinkedEntity] = useState<LinkedEntity | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch linked entity on mount
  useEffect(() => {
    const loadLinkedEntity = async () => {
      const entity = await fetchLinkedEntity(note);
      setLinkedEntity(entity);
    };
    loadLinkedEntity();
  }, [note.linked_entity_id, note.linked_entity_type]);

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

      toast.success("Note customization saved");
      onBackToView();
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('note-banners')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('note-banners')
        .getPublicUrl(fileName);

      setBannerImage(publicUrl);
      toast.success("Banner image uploaded");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleFavorite = async () => {
    await toggleFavorite(note.id);
  };

  const handleTogglePin = async () => {
    await togglePin(note.id);
  };

  const handleLinkEntity = async (entityType: 'customer' | 'work_order' | 'invoice', entityId: string) => {
    try {
      await linkEntity({ noteId: note.id, entityType, entityId });
      const entity = await fetchLinkedEntity({ ...note, linked_entity_type: entityType, linked_entity_id: entityId });
      setLinkedEntity(entity);
      toast.success("Entity linked to note");
    } catch (error) {
      console.error("Error linking entity:", error);
    }
  };

  const handleUnlinkEntity = async () => {
    try {
      await unlinkEntity(note.id);
      setLinkedEntity(null);
    } catch (error) {
      console.error("Error unlinking entity:", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 sm:p-4 border-b gap-2">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={handleToggleFavorite}>
            <Star className={`h-4 w-4 ${note.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>

          <Button variant="ghost" size="sm" onClick={handleTogglePin}>
            <Pin className={`h-4 w-4 ${note.is_pinned ? 'fill-primary text-primary' : ''}`} />
          </Button>

          <Select value={backgroundColor || 'default'} onValueChange={(val) => setBackgroundColor(val === 'default' ? null : val)}>
            <SelectTrigger className="w-[120px] sm:w-[140px] h-9">
              <Palette className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Color</span>
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

          <EntityLinkSelector
            currentEntity={linkedEntity}
            noteOrgId={note.org_id}
            onLink={handleLinkEntity}
            onUnlink={handleUnlinkEntity}
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onBackToView} className="flex-1 sm:flex-none">
            <X className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Cancel</span>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none">
            <Save className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save & Close'}</span>
            <span className="sm:hidden">{isSaving ? 'Saving...' : 'Save'}</span>
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div 
        className="flex-1 overflow-y-auto p-4 sm:p-6" 
        style={{ 
          backgroundColor: backgroundColor || undefined,
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          overscrollBehavior: 'contain'
        }}
      >
        {/* Banner Image */}
        <div className="space-y-2 mb-6">
          <Label>Banner Image</Label>
          <div className="flex gap-2">
            <Input
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              placeholder="Enter image URL or upload..."
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          {bannerImage && (
            <div className="relative">
              <div
                className="w-full h-48 bg-cover bg-center rounded-lg border"
                style={{ backgroundImage: `url(${bannerImage})` }}
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setBannerImage('')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Title */}
        <div className="mb-6">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="text-2xl font-bold"
          />
        </div>

        {/* Content - Rich Block Editor */}
        <div className="mb-6">
          <Label className="mb-4 block">Content Blocks</Label>
          <RichBlockEditor blocks={blocks} onChange={setBlocks} />
        </div>

        {/* Info */}
        <div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
          <p>Created: {new Date(note.created_at).toLocaleString()}</p>
          <p>Last updated: {new Date(note.updated_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
