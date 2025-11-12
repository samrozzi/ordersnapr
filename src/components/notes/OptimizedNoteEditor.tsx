import { useState, useCallback, useRef, useEffect } from "react";
import { produce } from "immer";
import { useDebounce } from "use-debounce";
import { NoteBlock, Note } from "@/hooks/use-notes";
import { useNotes } from "@/hooks/use-notes";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, DragStartEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { X, Star, Pin, Eye, Edit3, Sparkles, MoreVertical, Plus } from "lucide-react";
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
import { format } from "date-fns";
import { uploadNoteImage } from "@/lib/note-image-upload";

interface OptimizedNoteEditorProps {
  note: Note;
  onClose: () => void;
  onCustomize?: () => void;
}

function SortableBlock({ 
  block, 
  index, 
  isActive, 
  onFocus, 
  onDelete, 
  onAddBelow,
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
        onFocus={onFocus}
        onDelete={onDelete}
        onAddBelow={onAddBelow}
        dragHandleProps={{ ...attributes, ...listeners }}
      >
        {children}
      </MemoizedBlock>
    </div>
  );
}

export function OptimizedNoteEditor({ note, onClose, onCustomize }: OptimizedNoteEditorProps) {
  const { updateNote, toggleFavorite, togglePin } = useNotes();
  const [title, setTitle] = useState(note.title);
  const [blocks, setBlocks] = useState<NoteBlock[]>(note.content?.blocks || []);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeBlockId) return;
      
      // Check for mod key (Cmd on Mac, Ctrl on Windows)
      const isMod = e.metaKey || e.ctrlKey;
      
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
      } else if (isMod && e.key === "p") {
        e.preventDefault();
        setPresentationMode(!presentationMode);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeBlockId, addBlockBelow, addBlockAbove, duplicateBlock, moveBlockUp, moveBlockDown, presentationMode]);

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
    setSlashMenuState({
      visible: true,
      position,
      searchQuery,
      blockId,
    });
  }, []);

  const handleSlashCancelled = useCallback(() => {
    setSlashMenuState(prev => ({ ...prev, visible: false }));
  }, []);

  const handleSlashCommand = useCallback((blockType: string) => {
    if (!slashMenuState.blockId) return;

    setBlocks(produce(draft => {
      const index = draft.findIndex(b => b.id === slashMenuState.blockId);
      if (index !== -1) {
        const block: any = draft[index];
        
        // Remove the "/" and search text from content
        if (typeof block.content === "string") {
          const slashIndex = block.content.lastIndexOf('/');
          if (slashIndex >= 0) {
            block.content = block.content.slice(0, slashIndex);
          }
        }

        // Convert block to new type
        block.type = blockType as any;
        if (blockType === "checklist") {
          block.content = { items: [{ id: crypto.randomUUID(), text: "", checked: false }] };
        } else if (blockType === "table") {
          block.content = {
            rows: 2,
            cols: 2,
            cells: Array(4).fill(""),
            headerRow: true,
            bordered: true
          };
        } else if (blockType === "imageUpload") {
          block.content = { url: "", alt: "" };
        } else if (blockType === "date") {
          block.content = { date: new Date().toISOString() };
        } else if (blockType === "time") {
          block.content = { time: new Date().toTimeString().slice(0, 5) };
        } else if (blockType === "divider") {
          block.content = {};
        } else if (blockType === "heading") {
          block.content = block.content || "";
        } else {
          block.content = block.content || "";
        }
      }
    }));

    // Close slash menu and keep focus on the block
    setSlashMenuState({ visible: false, position: { top: 0, left: 0 }, searchQuery: '', blockId: null });
    setActiveBlockId(slashMenuState.blockId);
  }, [slashMenuState]);

  const handleToggleFavorite = () => {
    toggleFavorite(note.id);
  };

  const handleTogglePin = () => {
    togglePin(note.id);
  };

  const renderBlock = (block: NoteBlock, index: number) => {
    const isActive = block.id === activeBlockId;

    switch (block.type) {
      case "heading":
        if (presentationMode) {
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
        if (presentationMode) {
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
                    if (presentationMode) return;
                    const newItems = [...checklistContent.items];
                    newItems[idx] = { ...item, checked: !!checked };
                    const updatedBlock: any = { content: { ...checklistContent, items: newItems } };
                    updateBlock(block.id, updatedBlock);
                  }}
                  disabled={presentationMode}
                  className="mt-1"
                />
                <div className="flex-1">
                  {presentationMode ? (
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
              disabled={presentationMode}
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
              disabled={presentationMode}
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
                onClick={() => setPresentationMode(!presentationMode)}
                className={presentationMode ? "text-primary" : ""}
              >
                <Eye className="h-4 w-4" />
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
            {onCustomize && (
              <Button variant="outline" size="sm" onClick={onCustomize}>
                <Edit3 className="h-3 w-3 mr-2" />
                Customize
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Title */}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="text-3xl font-bold border-none shadow-none focus-visible:ring-0 px-0"
              disabled={presentationMode}
            />

            {/* Blocks */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {blocks.map((block, index) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      index={index}
                      isActive={block.id === activeBlockId}
                      onFocus={() => setActiveBlockId(block.id)}
                      onDelete={() => deleteBlock(block.id)}
                      onAddBelow={() => addBlockBelow(block.id)}
                    >
                      {renderBlock(block, index)}
                    </SortableBlock>
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add Block Button */}
            {!presentationMode && (
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

        {/* Formatting Toolbar */}
        {!presentationMode && <SharedFormattingToolbar />}
      </div>
    </EditorFocusProvider>
  );
}
