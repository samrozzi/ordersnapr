import { useState, useCallback, useRef, useEffect } from "react";
import { produce } from "immer";
import { useDebounce } from "use-debounce";
import { NoteBlock, Note } from "@/hooks/use-notes";
import { useNotes } from "@/hooks/use-notes";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, DragStartEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { X, Star, Pin, Eye, Edit3, Sparkles, MoreVertical, Plus, Calendar, Clock, Image as ImageIcon, Palette, Smile, Link as LinkIcon, Download, Copy, Upload, Lock, Type, Maximize2, Archive, Info, Table, Minus, FileText, Link2, Unlink, Menu, ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MemoizedBlock } from "./MemoizedBlock";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { EditorFocusProvider } from "@/contexts/EditorFocusContext";
import { SharedFormattingToolbar } from "@/components/SharedFormattingToolbar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { BannerImageCropper } from "@/components/BannerImageCropper";
import { format } from "date-fns";
import { uploadNoteImage } from "@/lib/note-image-upload";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { useIsMobile } from "@/hooks/use-mobile";

interface OptimizedNoteEditorProps {
  note: Note;
  onClose: () => void;
  onCustomize?: () => void;
}

function SortableBlock({ 
  block, 
  index, 
  isActive, 
  isLocked,
  onFocus, 
  onDelete, 
  onAddBelow,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onConvertType,
  onCopyLink,
  children 
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <MemoizedBlock
        block={block}
        index={index}
        isActive={isActive}
        isDragging={isDragging}
        isLocked={isLocked}
        onFocus={onFocus}
        onDelete={onDelete}
        onAddBelow={onAddBelow}
        onDuplicate={onDuplicate}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onConvertType={onConvertType}
        onCopyLink={onCopyLink}
        dragHandleProps={{ ...attributes, ...listeners }}
      >
        {children}
      </MemoizedBlock>
    </div>
  );
}

export function OptimizedNoteEditor({ note, onClose, onCustomize }: OptimizedNoteEditorProps) {
  const { updateNote, toggleFavorite, togglePin } = useNotes();
  const queryClient = useQueryClient();
  const keyboardHeight = useKeyboardHeight();
  const isMobile = useIsMobile();
  const [title, setTitle] = useState(note.title);
  const [blocks, setBlocks] = useState<NoteBlock[]>(note.content?.blocks || []);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [slashMenuState, setSlashMenuState] = useState<{
    visible: boolean;
    position: { top: number; left: number };
    searchQuery: string;
    blockId: string | null;
  }>({
    visible: false,
    position: { top: 0, left: 0 },
    searchQuery: '',
    blockId: null,
  });

  // Banner feature state
  const [bannerDialog, setBannerDialog] = useState({
    open: false,
    imageUrl: note.banner_image || ""
  });
  const [bannerCropperOpen, setBannerCropperOpen] = useState(false);
  const [bannerPosition, setBannerPosition] = useState(
    (note.content as any)?.bannerPosition || { x: 50, y: 50, scale: 1 }
  );

  // Background color picker state
  const [backgroundColorOpen, setBackgroundColorOpen] = useState(false);

  // Icon picker state
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  // Page preferences state
  const [fontStyle, setFontStyle] = useState<'default' | 'serif' | 'mono'>('default');
  const [smallText, setSmallText] = useState(false);
  const [fullWidth, setFullWidth] = useState(false);
  const [locked, setLocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Local state for immediate UI updates
  const [localBannerImage, setLocalBannerImage] = useState(note.banner_image);
  const [localBackgroundColor, setLocalBackgroundColor] = useState(note.background_color);
  const [localIcon, setLocalIcon] = useState((note as any).icon);

  // Background colors
  const BACKGROUND_COLORS = [
    { name: "Default", value: null, class: "bg-background" },
    { name: "Gray", value: "#f3f4f6", class: "bg-gray-100" },
    { name: "Brown", value: "#fef3c7", class: "bg-amber-100" },
    { name: "Orange", value: "#fed7aa", class: "bg-orange-200" },
    { name: "Yellow", value: "#fef08a", class: "bg-yellow-200" },
    { name: "Green", value: "#d9f99d", class: "bg-lime-200" },
    { name: "Blue", value: "#bfdbfe", class: "bg-blue-200" },
    { name: "Purple", value: "#e9d5ff", class: "bg-purple-200" },
    { name: "Pink", value: "#fbcfe8", class: "bg-pink-200" },
    { name: "Red", value: "#fecaca", class: "bg-red-200" },
  ];

  // Common emojis
  const COMMON_EMOJIS = [
    "📝", "📋", "📌", "📍", "📎", "✅", "❌", "⭐", "🔥", "💡",
    "🎯", "🚀", "💼", "📊", "📈", "📉", "💰", "🏠", "🔧", "⚙️",
    "📅", "⏰", "🔔", "📧", "📞", "💬", "👤", "👥", "🏆", "🎨",
    "📚", "🎓", "🌟", "💪", "🎉", "🎁", "🏃", "💻", "🖥️", "📱"
  ];

  // Debounced auto-save
  const [debouncedTitle] = useDebounce(title, 500);
  const [debouncedBlocks] = useDebounce(blocks, 500);

  useEffect(() => {
    const saveChanges = async () => {
      if (debouncedTitle === note.title && JSON.stringify(debouncedBlocks) === JSON.stringify(note.content?.blocks)) {
        return;
      }

      setIsSaving(true);
      try {
        await updateNote({
          id: note.id,
          updates: {
            title: debouncedTitle,
            content: { blocks: debouncedBlocks },
            updated_at: new Date().toISOString()
          }
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error("Auto-save error:", error);
      } finally {
        setIsSaving(false);
      }
    };

    saveChanges();
  }, [debouncedTitle, debouncedBlocks]);

  // Load preferences from note content
  useEffect(() => {
    const prefs = (note.content as any)?.preferences;
    if (prefs) {
      setFontStyle(prefs.fontStyle || 'default');
      setSmallText(prefs.smallText || false);
      setFullWidth(prefs.fullWidth || false);
      setLocked(prefs.locked || false);
    }
  }, [note.id]);

  // Sync local state when note prop changes
  useEffect(() => {
    setLocalBannerImage(note.banner_image);
    setLocalBackgroundColor(note.background_color);
    setLocalIcon((note as any).icon);
  }, [note.banner_image, note.background_color, (note as any).icon]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const updateBlock = useCallback((blockId: string, updates: Partial<NoteBlock>) => {
    setBlocks(produce(draft => {
      const index = draft.findIndex(b => b.id === blockId);
      if (index !== -1) {
        Object.assign(draft[index], updates);
      }
    }));
  }, []);

  const deleteBlock = useCallback((blockId: string) => {
    setBlocks(produce(draft => {
      const index = draft.findIndex(b => b.id === blockId);
      if (index !== -1) {
        draft.splice(index, 1);
      }
    }));
  }, []);

  const addBlockBelow = useCallback((afterBlockId: string, blockType: string = "paragraph") => {
    setBlocks(produce(draft => {
      const index = draft.findIndex(b => b.id === afterBlockId);
      const newBlock: any = {
        id: crypto.randomUUID(),
        type: blockType as any,
        content: blockType === "checklist" ? { items: [{ id: crypto.randomUUID(), text: "", checked: false }] } : ""
      };
      draft.splice(index + 1, 0, newBlock);
    }));
  }, []);

  const addBlockAbove = useCallback((beforeBlockId: string, blockType: string = "paragraph") => {
    setBlocks(produce(draft => {
      const index = draft.findIndex(b => b.id === beforeBlockId);
      const newBlock: any = {
        id: crypto.randomUUID(),
        type: blockType as any,
        content: blockType === "checklist" ? { items: [{ id: crypto.randomUUID(), text: "", checked: false }] } : ""
      };
      draft.splice(index, 0, newBlock);
    }));
  }, []);

  const duplicateBlock = useCallback(() => {
    if (!activeBlockId) return;
    setBlocks(produce(draft => {
      const index = draft.findIndex(b => b.id === activeBlockId);
      if (index !== -1) {
        const duplicated = { ...draft[index], id: crypto.randomUUID() };
        draft.splice(index + 1, 0, duplicated);
      }
    }));
  }, [activeBlockId]);

  const moveBlockUp = useCallback(() => {
    if (!activeBlockId) return;
    setBlocks(produce(draft => {
      const index = draft.findIndex(b => b.id === activeBlockId);
      if (index > 0) {
        [draft[index - 1], draft[index]] = [draft[index], draft[index - 1]];
      }
    }));
  }, [activeBlockId]);

  const moveBlockDown = useCallback(() => {
    if (!activeBlockId) return;
    setBlocks(produce(draft => {
      const index = draft.findIndex(b => b.id === activeBlockId);
      if (index < draft.length - 1) {
        [draft[index], draft[index + 1]] = [draft[index + 1], draft[index]];
      }
    }));
  }, [activeBlockId]);

  // Preference update handler
  const updatePreferences = useCallback((updates: Partial<{
    fontStyle: 'default' | 'serif' | 'mono';
    smallText: boolean;
    fullWidth: boolean;
    locked: boolean;
  }>) => {
    const currentPrefs = (note.content as any)?.preferences || {};
    const newPrefs = { ...currentPrefs, ...updates };
    
    updateNote({
      id: note.id,
      updates: {
        content: {
          ...note.content,
          blocks: debouncedBlocks,
          preferences: newPrefs
        } as any
      }
    });
  }, [note, debouncedBlocks, updateNote]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      
      // Allow Cmd/Ctrl+P to toggle lock from anywhere
      if (isMod && e.key === "p") {
        e.preventDefault();
        const newValue = !locked;
        setLocked(newValue);
        updatePreferences({ locked: newValue });
        toast.success(newValue ? "Page locked" : "Page unlocked");
        return;
      }
      
      // Block all other shortcuts when locked
      if (locked) return;
      
      if (!activeBlockId) return;
      
      if (isMod && e.key === "Enter") {
        e.preventDefault();
        addBlockBelow(activeBlockId);
      } else if (isMod && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        addBlockAbove(activeBlockId);
      } else if (isMod && e.key === "d") {
        e.preventDefault();
        duplicateBlock();
      } else if (isMod && e.shiftKey && e.key === "Backspace") {
        e.preventDefault();
        deleteBlock(activeBlockId);
      } else if (isMod && e.shiftKey && e.key === "ArrowUp") {
        e.preventDefault();
        moveBlockUp();
      } else if (isMod && e.shiftKey && e.key === "ArrowDown") {
        e.preventDefault();
        moveBlockDown();
      } else if (isMod && e.key === "ArrowUp") {
        // Navigate to previous block
        e.preventDefault();
        const currentIndex = blocks.findIndex(b => b.id === activeBlockId);
        if (currentIndex > 0) {
          const prevBlockId = blocks[currentIndex - 1].id;
          setActiveBlockId(prevBlockId);
          // Scroll into view
          setTimeout(() => {
            const element = document.querySelector(`[data-block-id="${prevBlockId}"]`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 0);
        }
      } else if (isMod && e.key === "ArrowDown") {
        // Navigate to next block
        e.preventDefault();
        const currentIndex = blocks.findIndex(b => b.id === activeBlockId);
        if (currentIndex < blocks.length - 1) {
          const nextBlockId = blocks[currentIndex + 1].id;
          setActiveBlockId(nextBlockId);
          // Scroll into view
          setTimeout(() => {
            const element = document.querySelector(`[data-block-id="${nextBlockId}"]`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 0);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeBlockId, addBlockBelow, addBlockAbove, duplicateBlock, moveBlockUp, moveBlockDown, locked, blocks, updatePreferences]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveBlockId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setBlocks(produce(draft => {
      const oldIndex = draft.findIndex(b => b.id === active.id);
      const newIndex = draft.findIndex(b => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const [moved] = draft.splice(oldIndex, 1);
        draft.splice(newIndex, 0, moved);
      }
    }));
  };

  const handleSlashDetected = useCallback((blockId: string, position: { top: number; left: number }, searchQuery: string) => {
    if (locked) return;
    setSlashMenuState({
      visible: true,
      position,
      searchQuery,
      blockId,
    });
  }, [locked]);

  const handleSlashCancelled = useCallback(() => {
    setSlashMenuState(prev => ({ ...prev, visible: false }));
  }, []);

  const handleSlashCommand = useCallback((blockType: string) => {
    if (!slashMenuState.blockId) return;

    setBlocks(produce(draft => {
      const index = draft.findIndex(b => b.id === slashMenuState.blockId);
      if (index !== -1) {
        const block: any = draft[index];
        
        // Extract content before "/" and check if line is empty
        let textBeforeSlash = "";
        if (typeof block.content === "string") {
          const slashIndex = block.content.lastIndexOf('/');
          if (slashIndex >= 0) {
            textBeforeSlash = block.content.slice(0, slashIndex).trim();
          } else {
            textBeforeSlash = block.content.trim();
          }
        }
        
        // Remove HTML tags to check if truly empty
        const cleanText = textBeforeSlash.replace(/<[^>]*>/g, '').trim();
        const isEmptyLine = cleanText === "";

        if (isEmptyLine) {
          // Empty line: Convert current block to new type
          block.type = blockType as any;
          if (blockType === "checklist") {
            block.content = { items: [{ id: crypto.randomUUID(), text: "", checked: false }] };
          } else if (blockType === "table") {
            block.content = {
              rows: 2,
              cols: 2,
              cells: Array(4).fill(""),
              headerRow: true
            };
          } else if (blockType === "date") {
            block.content = { date: new Date().toISOString() };
          } else if (blockType === "time") {
            block.content = { time: new Date().toTimeString().slice(0, 5) };
          } else if (blockType === "imageUpload") {
            block.content = { url: "", alt: "" };
          } else if (blockType === "divider") {
            block.content = {};
          } else {
            block.content = "";
          }
        } else {
          // Has content before slash: Keep current block and insert new one below
          block.content = textBeforeSlash;
          
          const newBlock: any = {
            id: crypto.randomUUID(),
            type: blockType as any,
            content: blockType === "checklist" 
              ? { items: [{ id: crypto.randomUUID(), text: "", checked: false }] }
              : blockType === "table"
              ? { rows: 2, cols: 2, cells: Array(4).fill(""), headerRow: true }
              : blockType === "date"
              ? { date: new Date().toISOString() }
              : blockType === "time"
              ? { time: new Date().toTimeString().slice(0, 5) }
              : blockType === "imageUpload"
              ? { url: "", alt: "" }
              : blockType === "divider"
              ? {}
              : ""
          };
          
          draft.splice(index + 1, 0, newBlock);
          
          // Set active to new block
          setTimeout(() => setActiveBlockId(newBlock.id), 0);
        }
      }
    }));

    // Close slash menu
    setSlashMenuState({ visible: false, position: { top: 0, left: 0 }, searchQuery: '', blockId: null });
  }, [slashMenuState]);

  const handleToggleFavorite = () => {
    toggleFavorite(note.id);
  };

  const handleTogglePin = () => {
    togglePin(note.id);
  };

  // Banner handlers
  const handleAddBanner = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const url = await uploadNoteImage(file, note.user_id);
          if (url) {
            setBannerDialog({ open: true, imageUrl: url });
            setBannerCropperOpen(true);
          }
        } catch (error) {
          toast.error("Failed to upload banner image");
        }
      }
    };
    input.click();
  };

  const handleSaveBanner = (position: { x: number; y: number; scale: number }) => {
    setBannerPosition(position);
    setLocalBannerImage(bannerDialog.imageUrl);
    updateNote({
      id: note.id,
      updates: { 
        banner_image: bannerDialog.imageUrl,
        content: {
          ...note.content,
          blocks: debouncedBlocks,
          bannerPosition: position
        } as any
      }
    });
    setBannerCropperOpen(false);
    toast.success("Banner added!");
  };

  const handleRemoveBanner = () => {
    setLocalBannerImage(null);
    updateNote({
      id: note.id,
      updates: { banner_image: null }
    });
    setBannerDialog({ open: false, imageUrl: "" });
    toast.success("Banner removed!");
  };

  // Background color handler
  const handleBackgroundColorChange = (color: string | null) => {
    setLocalBackgroundColor(color);
    updateNote({
      id: note.id,
      updates: { background_color: color }
    });
    setBackgroundColorOpen(false);
    toast.success("Background updated!");
  };

  // Icon handler
  const handleIconChange = (icon: string | null) => {
    setLocalIcon(icon);
    updateNote({
      id: note.id,
      updates: { icon } as any
    });
    setIconPickerOpen(false);
    toast.success(icon ? "Icon added!" : "Icon removed!");
  };

  const handleFontStyleChange = (style: 'default' | 'serif' | 'mono') => {
    setFontStyle(style);
    updatePreferences({ fontStyle: style });
    toast.success(`Font changed to ${style}`);
  };

  const handleToggleLock = useCallback(() => {
    const newValue = !locked;
    setLocked(newValue);
    updatePreferences({ locked: newValue });
    toast.success(newValue ? "Page locked" : "Page unlocked");
  }, [locked, updatePreferences]);

  const handleDuplicate = async () => {
    try {
      const duplicatedNote = {
        user_id: note.user_id,
        org_id: note.org_id,
        title: `${note.title} (Copy)`,
        content: note.content as any,
        background_color: note.background_color,
        banner_image: note.banner_image,
        icon: (note as any).icon,
        is_favorite: false,
        is_pinned: false,
        view_mode: note.view_mode
      };
      
      const { error } = await supabase
        .from('notes')
        .insert([duplicatedNote]);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["notes", note.user_id, note.org_id] });
      toast.success("Note duplicated!");
    } catch (error) {
      console.error("Duplicate error:", error);
      toast.error("Failed to duplicate note");
    }
  };

  const handleArchive = async () => {
    if (!confirm("Archive this note?")) return;
    
    try {
      const { error } = await supabase
        .from('notes')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', note.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["notes", note.user_id, note.org_id] });
      queryClient.invalidateQueries({ queryKey: ["archived-notes", note.user_id, note.org_id] });
      toast.success("Note archived");
      onClose();
    } catch (error) {
      console.error("Archive error:", error);
      toast.error("Failed to archive note");
    }
  };

  const handleToggleSmallText = () => {
    const newValue = !smallText;
    setSmallText(newValue);
    updatePreferences({ smallText: newValue });
  };

  const handleToggleFullWidth = () => {
    const newValue = !fullWidth;
    setFullWidth(newValue);
    updatePreferences({ fullWidth: newValue });
  };

  const renderBlock = (block: NoteBlock, index: number) => {
    const isActive = block.id === activeBlockId;

    switch (block.type) {
      case "heading":
        if (locked) {
          return (
            <div className="text-2xl font-bold" dangerouslySetInnerHTML={{ __html: typeof block.content === "string" ? block.content : "" }} />
          );
        }
        return (
          <div className="space-y-2">
            <RichTextEditor
              content={typeof block.content === "string" ? block.content : ""}
              onChange={(html) => updateBlock(block.id, { content: html })}
              placeholder="Heading..."
              className="text-2xl font-bold"
              variant="heading"
              autoFocus={block.id === activeBlockId}
              onFocus={() => setActiveBlockId(block.id)}
              onSlashDetected={(position, searchQuery) => handleSlashDetected(block.id, position, searchQuery)}
              onSlashCancelled={handleSlashCancelled}
            />
          </div>
        );

      case "paragraph":
        if (locked) {
          return (
            <div dangerouslySetInnerHTML={{ __html: typeof block.content === "string" ? block.content : "" }} />
          );
        }
        return (
          <RichTextEditor
            content={typeof block.content === "string" ? block.content : ""}
            onChange={(html) => updateBlock(block.id, { content: html })}
            placeholder="Type '/' for commands"
            autoFocus={block.id === activeBlockId}
            onFocus={() => setActiveBlockId(block.id)}
            onSlashDetected={(position, searchQuery) => handleSlashDetected(block.id, position, searchQuery)}
            onSlashCancelled={handleSlashCancelled}
          />
        );

      case "checklist":
        const blockContent = block.content ?? {};
        const checklistContent = (typeof blockContent === "object" && "items" in blockContent)
          ? (blockContent as { items: any[] })
          : { items: [] };

        return (
          <div className="space-y-2">
            {checklistContent.items?.map((item: any, idx: number) => (
              <div key={item.id} className="flex items-start gap-2">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(checked) => {
                    const newItems = [...checklistContent.items];
                    newItems[idx] = { ...item, checked: !!checked };
                    const updatedBlock: any = { content: { ...checklistContent, items: newItems } };
                    updateBlock(block.id, updatedBlock);
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  {locked ? (
                    <div dangerouslySetInnerHTML={{ __html: item.text }} />
                  ) : (
                    <RichTextEditor
                      content={item.text}
                      onChange={(html) => {
                        const newItems = [...checklistContent.items];
                        newItems[idx] = { ...item, text: html };
                        const updatedBlock: any = { content: { ...checklistContent, items: newItems } };
                        updateBlock(block.id, updatedBlock);
                      }}
                      placeholder="List item..."
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case "date":
        const dateContent = block.content ?? {};
        const dateValue = (typeof dateContent === "object" && "date" in dateContent)
          ? (dateContent as { date: string }).date
          : new Date().toISOString();

        return (
          <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg border border-border">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateValue.split('T')[0]}
              onChange={(e) => {
                const updatedBlock: any = { content: { date: new Date(e.target.value).toISOString() } };
                updateBlock(block.id, updatedBlock);
              }}
              disabled={locked}
              className="border-none shadow-none focus-visible:ring-0 bg-transparent"
            />
          </div>
        );

      case "time":
        const timeContent = block.content ?? {};
        const timeValue = (typeof timeContent === "object" && "time" in timeContent)
          ? (timeContent as { time: string }).time
          : new Date().toTimeString().slice(0, 5);

        return (
          <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg border border-border">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={timeValue}
              onChange={(e) => {
                const updatedBlock: any = { content: { time: e.target.value } };
                updateBlock(block.id, updatedBlock);
              }}
              disabled={locked}
              className="border-none shadow-none focus-visible:ring-0 bg-transparent"
            />
          </div>
        );

      case "table":
        const tableContent = block.content ?? {};
        const tableData = (typeof tableContent === "object" && "cells" in tableContent)
          ? (tableContent as { rows: number; cols: number; cells: string[]; headerRow?: boolean })
          : { rows: 2, cols: 2, cells: Array(4).fill(""), headerRow: true };

        return (
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border rounded-lg">
                <tbody>
                  {Array.from({ length: tableData.rows }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: tableData.cols }).map((_, colIndex) => {
                        const cellIndex = rowIndex * tableData.cols + colIndex;
                        const isHeader = rowIndex === 0 && tableData.headerRow;
                        
                        return isHeader ? (
                           <th key={colIndex} className="border border-border p-2 bg-accent/20 font-semibold text-left">
                            <Input
                              value={tableData.cells[cellIndex] || ""}
                              onChange={(e) => {
                                const newCells = [...tableData.cells];
                                newCells[cellIndex] = e.target.value;
                                const updatedBlock: any = { content: { ...tableData, cells: newCells } };
                                updateBlock(block.id, updatedBlock);
                              }}
                              placeholder={`Header ${colIndex + 1}`}
                              disabled={locked}
                              className="border-none shadow-none focus-visible:ring-0 bg-transparent font-semibold"
                            />
                          </th>
                        ) : (
                          <td key={colIndex} className="border border-border p-2">
                            <Input
                              value={tableData.cells[cellIndex] || ""}
                              onChange={(e) => {
                                const newCells = [...tableData.cells];
                                newCells[cellIndex] = e.target.value;
                                const updatedBlock: any = { content: { ...tableData, cells: newCells } };
                                updateBlock(block.id, updatedBlock);
                              }}
                              placeholder="Cell"
                              disabled={locked}
                              className="border-none shadow-none focus-visible:ring-0 bg-transparent"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!locked && (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    const newCells = [...tableData.cells, ...Array(tableData.cols).fill("")];
                    const updatedBlock: any = { 
                      content: { ...tableData, rows: tableData.rows + 1, cells: newCells } 
                    };
                    updateBlock(block.id, updatedBlock);
                  }}
                >
                  Add Row
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    const newCells = [];
                    for (let i = 0; i < tableData.rows; i++) {
                      newCells.push(
                        ...tableData.cells.slice(i * tableData.cols, (i + 1) * tableData.cols),
                        ""
                      );
                    }
                    const updatedBlock: any = { 
                      content: { ...tableData, cols: tableData.cols + 1, cells: newCells } 
                    };
                    updateBlock(block.id, updatedBlock);
                  }}
                >
                  Add Column
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    if (tableData.rows <= 1) {
                      toast.error("Table must have at least 1 row");
                      return;
                    }
                    const newCells = tableData.cells.slice(0, -tableData.cols);
                    const updatedBlock: any = { 
                      content: { ...tableData, rows: tableData.rows - 1, cells: newCells } 
                    };
                    updateBlock(block.id, updatedBlock);
                  }}
                  disabled={tableData.rows <= 1}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Row
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    if (tableData.cols <= 1) {
                      toast.error("Table must have at least 1 column");
                      return;
                    }
                    const newCells = [];
                    for (let i = 0; i < tableData.rows; i++) {
                      const rowStart = i * tableData.cols;
                      const rowEnd = rowStart + tableData.cols - 1;
                      newCells.push(...tableData.cells.slice(rowStart, rowEnd));
                    }
                    const updatedBlock: any = { 
                      content: { ...tableData, cols: tableData.cols - 1, cells: newCells } 
                    };
                    updateBlock(block.id, updatedBlock);
                  }}
                  disabled={tableData.cols <= 1}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Column
                </Button>
              </div>
            )}
          </div>
        );

      case "divider":
        return <Separator className="my-4" />;

      case "imageUpload":
        return (
          <div className="space-y-2">
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const url = await uploadNoteImage(file, note.user_id);
                  if (url) {
                    const updatedBlock: any = { type: "image", content: { url, caption: "" } };
                    updateBlock(block.id, updatedBlock);
                  }
                }
              }}
              disabled={locked}
            />
          </div>
        );

      case "image":
        const imgBlockContent = block.content ?? {};
        const imageContent = (typeof imgBlockContent === "object" && "url" in imgBlockContent)
          ? (imgBlockContent as { url: string; caption?: string })
          : { url: "", caption: "" };

        return (
          <div className="space-y-2">
            {imageContent.url && (
              <img src={imageContent.url} alt="Note image" className="max-w-full rounded-lg" />
            )}
            <Input
              value={imageContent.caption || ""}
              onChange={(e) => {
                const updatedBlock: any = { content: { ...imageContent, caption: e.target.value } };
                updateBlock(block.id, updatedBlock);
              }}
              placeholder="Add a caption..."
              disabled={locked}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <EditorFocusProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleFavorite}
                className={note.is_favorite ? "text-yellow-500" : ""}
              >
                <Star className={`h-4 w-4 ${note.is_favorite ? "fill-current" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleTogglePin}
                className={note.is_pinned ? "text-primary" : ""}
              >
                <Pin className={`h-4 w-4 ${note.is_pinned ? "fill-current" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleLock}
                className={locked ? "text-primary" : ""}
              >
                <Lock className={`h-4 w-4 ${locked ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="text-xs text-muted-foreground">Saving...</span>
            )}
            {lastSaved && !isSaving && (
              <span className="text-xs text-muted-foreground">
                Saved {format(lastSaved, "h:mm a")}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 max-h-[500px] overflow-y-auto">
                {/* Search */}
                <div className="p-2 border-b sticky top-0 bg-background z-10">
                  <Input 
                    placeholder="Search actions..." 
                    className="h-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Font Styles */}
                <div className="flex gap-2 p-2 border-b">
                  <Button 
                    variant={fontStyle === 'default' ? "default" : "outline"} 
                    size="sm" 
                    className="flex-1 text-xs"
                    onClick={() => handleFontStyleChange('default')}
                  >
                    <Type className="h-3 w-3 mr-1" />
                    Default
                  </Button>
                  <Button 
                    variant={fontStyle === 'serif' ? "default" : "outline"} 
                    size="sm" 
                    className="flex-1 text-xs"
                    onClick={() => handleFontStyleChange('serif')}
                  >
                    <Type className="h-3 w-3 mr-1" />
                    Serif
                  </Button>
                  <Button 
                    variant={fontStyle === 'mono' ? "default" : "outline"} 
                    size="sm" 
                    className="flex-1 text-xs"
                    onClick={() => handleFontStyleChange('mono')}
                  >
                    <Type className="h-3 w-3 mr-1" />
                    Mono
                  </Button>
                </div>

                {/* Customization */}
                <div className="py-1">
                  <DropdownMenuItem onClick={handleAddBanner}>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Add Banner
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setIconPickerOpen(true)}>
                    <Smile className="h-4 w-4 mr-2" />
                    {(note as any).icon ? "Change Icon" : "Add Icon"}
                  </DropdownMenuItem>
                </div>

                {/* Background Color Submenu */}
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.preventDefault();
                    setBackgroundColorOpen(!backgroundColorOpen);
                  }}
                  className="flex justify-between"
                >
                  <div className="flex items-center">
                    <Palette className="h-4 w-4 mr-2" />
                    Change Background
                  </div>
                  <span className="text-xs">›</span>
                </DropdownMenuItem>
                
                {backgroundColorOpen && (
                  <div className="grid grid-cols-5 gap-2 p-3 border-t border-b">
                    {BACKGROUND_COLORS.map(color => (
                      <button
                        key={color.name}
                        onClick={() => handleBackgroundColorChange(color.value)}
                        className="w-10 h-10 rounded-md border-2 hover:border-primary transition-colors flex items-center justify-center"
                        style={{ backgroundColor: color.value || 'transparent' }}
                        title={color.name}
                      >
                        {!color.value && <X className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                )}

                <DropdownMenuSeparator />

                {/* Actions */}
                <div className="py-1">
                  <DropdownMenuItem onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied!");
                  }}>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Copy Link
                    <span className="ml-auto text-xs text-muted-foreground">⌘⇧L</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                    <span className="ml-auto text-xs text-muted-foreground">⌘D</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => toast.info("Link to entity coming soon!")}>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link to Entity
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />

                {/* Toggles */}
                <div className="py-1">
                  <div 
                    className="flex items-center justify-between px-2 py-2 hover:bg-accent cursor-pointer rounded-sm"
                    onClick={handleToggleSmallText}
                  >
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      <span className="text-sm">Small text</span>
                    </div>
                    <Switch checked={smallText} onCheckedChange={handleToggleSmallText} />
                  </div>

                  <div 
                    className="flex items-center justify-between px-2 py-2 hover:bg-accent cursor-pointer rounded-sm"
                    onClick={handleToggleFullWidth}
                  >
                    <div className="flex items-center gap-2">
                      <Maximize2 className="h-4 w-4" />
                      <span className="text-sm">Full width</span>
                    </div>
                    <Switch checked={fullWidth} onCheckedChange={handleToggleFullWidth} />
                  </div>

                  <div 
                    className="flex items-center justify-between px-2 py-2 hover:bg-accent cursor-pointer rounded-sm"
                    onClick={handleToggleLock}
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span className="text-sm">Lock page</span>
                    </div>
                    <Switch checked={locked} onCheckedChange={handleToggleLock} />
                  </div>
                </div>

                <DropdownMenuSeparator />

                {/* Import/Export */}
                <div className="py-1">
                  <DropdownMenuItem onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'application/json';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const text = await file.text();
                        const imported = JSON.parse(text);
                        setTitle(imported.title || note.title);
                        setBlocks(imported.content?.blocks || []);
                        toast.success("Note imported!");
                      }
                    };
                    input.click();
                  }}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => {
                    const dataStr = JSON.stringify({ title: note.title, content: note.content }, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${note.title || 'note'}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                    toast.success("Note exported!");
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />

                {/* Delete */}
          <DropdownMenuItem 
            onClick={handleArchive}
            className="text-destructive focus:text-destructive"
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div 
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden p-8 transition-colors duration-200",
            fontStyle === 'serif' && "font-serif",
            fontStyle === 'mono' && "font-mono",
            smallText && "text-sm"
          )}
        style={{ 
          maxHeight: 'calc(100vh - 200px)',
          backgroundColor: localBackgroundColor || 'transparent'
        }}
        >
          <div className={cn(
            "mx-auto space-y-4",
            fullWidth
              ? "max-w-full -mx-6 md:-mx-8"
              : "max-w-4xl"
          )}>
            {/* Banner and Icon Container */}
            <div className="relative">
              {/* Banner Image */}
              {localBannerImage && (
                <div className="relative -mt-8 -mx-8 mb-6 h-64 overflow-hidden group">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${localBannerImage})`,
                      backgroundSize: `${bannerPosition.scale * 100}%`,
                      backgroundPosition: `${bannerPosition.x}% ${bannerPosition.y}%`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20" />
                  <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setBannerCropperOpen(true)}
                    >
                      Reposition
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveBanner}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}

              {/* Icon with Notion-style overlay */}
              {localIcon && (
                <button
                  onClick={() => setIconPickerOpen(true)}
                  className={cn(
                    "text-5xl hover:scale-110 transition-transform cursor-pointer",
                    localBannerImage 
                      ? "absolute bottom-0 left-8 transform translate-y-1/2 bg-background rounded-lg p-2 shadow-lg" 
                      : "block mb-4"
                  )}
                  title="Change icon"
                >
                  {localIcon}
                </button>
              )}
            </div>

            {/* Title */}
            <div className={cn("space-y-4", localBannerImage && localIcon && "mt-8")}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled"
                className="text-3xl font-bold border-none shadow-none focus-visible:ring-0 px-0"
                readOnly={locked}
              />
            </div>

            {/* Blocks */}
            <DndContext
              sensors={locked ? [] : sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {blocks.map((block, index) => (
                    <div key={block.id} data-block-id={block.id}>
                      <SortableBlock
                        block={block}
                        index={index}
                        isActive={block.id === activeBlockId}
                        isLocked={locked}
                        onFocus={() => setActiveBlockId(block.id)}
                        onDelete={() => deleteBlock(block.id)}
                        onAddBelow={() => addBlockBelow(block.id)}
                        onDuplicate={() => {
                          const blockIndex = blocks.findIndex(b => b.id === block.id);
                          if (blockIndex !== -1) {
                            const duplicated = { ...blocks[blockIndex], id: crypto.randomUUID() };
                            setBlocks(produce(draft => {
                              draft.splice(blockIndex + 1, 0, duplicated);
                            }));
                          }
                        }}
                        onMoveUp={() => {
                          const blockIndex = blocks.findIndex(b => b.id === block.id);
                          if (blockIndex > 0) {
                            setBlocks(produce(draft => {
                              [draft[blockIndex - 1], draft[blockIndex]] = [draft[blockIndex], draft[blockIndex - 1]];
                            }));
                          }
                        }}
                        onMoveDown={() => {
                          const blockIndex = blocks.findIndex(b => b.id === block.id);
                          if (blockIndex < blocks.length - 1) {
                            setBlocks(produce(draft => {
                              [draft[blockIndex], draft[blockIndex + 1]] = [draft[blockIndex + 1], draft[blockIndex]];
                            }));
                          }
                        }}
                        onConvertType={(newType: string) => {
                          const updatedBlock: any = { 
                            type: newType as any,
                            content: newType === "checklist" 
                              ? { items: [{ id: crypto.randomUUID(), text: "", checked: false }] }
                              : newType === "table"
                              ? { rows: 2, cols: 2, cells: Array(4).fill(""), headerRow: true }
                              : ""
                          };
                          updateBlock(block.id, updatedBlock);
                        }}
                        onCopyLink={() => {
                          navigator.clipboard.writeText(`#block-${block.id}`);
                          toast.success("Block link copied!");
                        }}
                      >
                        {renderBlock(block, index)}
                      </SortableBlock>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add Block Button */}
            {!locked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newBlock: any = {
                    id: crypto.randomUUID(),
                    type: "paragraph",
                    content: ""
                  };
                  setBlocks([...blocks, newBlock]);
                }}
                className="w-full justify-start text-muted-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add a block
              </Button>
            )}
          </div>
        </div>

        {/* Slash Command Menu */}
        {slashMenuState.visible && (
          <SlashCommandMenu
            onSelect={handleSlashCommand}
            onClose={handleSlashCancelled}
            searchQuery={slashMenuState.searchQuery}
            position={slashMenuState.position}
          />
        )}


        {/* Icon Picker Dialog */}
        <Dialog open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Choose an Icon</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-10 gap-2 p-4 max-h-96 overflow-y-auto">
              {COMMON_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    handleIconChange(emoji);
                    setIconPickerOpen(false);
                  }}
                  className="text-3xl hover:scale-125 transition-transform p-2 rounded hover:bg-accent"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  handleIconChange(null);
                  setIconPickerOpen(false);
                }}
              >
                Remove Icon
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Banner Cropper Dialog */}
        {bannerCropperOpen && (
          <BannerImageCropper
            imageUrl={bannerDialog.imageUrl}
            open={bannerCropperOpen}
            onClose={() => setBannerCropperOpen(false)}
            onSave={handleSaveBanner}
            initialPosition={bannerPosition}
          />
        )}
      </div>
    </EditorFocusProvider>
  );
}
