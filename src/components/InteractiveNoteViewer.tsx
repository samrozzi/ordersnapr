import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Pin, Settings, Check, Link as LinkIcon, MoreHorizontal, X } from "lucide-react";
import { useNotes, type Note, type NoteBlock } from "@/hooks/use-notes";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditorFocusProvider } from "@/contexts/EditorFocusContext";
import { SharedFormattingToolbar } from "@/components/SharedFormattingToolbar";

interface InteractiveNoteViewerProps {
  note: Note;
  onClose: () => void;
  onCustomize: () => void;
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function InteractiveNoteViewer({ note, onClose, onCustomize }: InteractiveNoteViewerProps) {
  const { updateNote, toggleFavorite, togglePin, fetchLinkedEntity, preferences, updatePreferences } = useNotes();
  const [title, setTitle] = useState(note.title);
  const [blocks, setBlocks] = useState<NoteBlock[]>(note.content.blocks);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date>(new Date(note.updated_at));
  const [linkedEntityName, setLinkedEntityName] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [checklistStrikethrough, setChecklistStrikethrough] = useState(preferences?.checklist_strikethrough ?? true);
  const [checklistMoveCompleted, setChecklistMoveCompleted] = useState(preferences?.checklist_move_completed ?? true);
  const [isPinned, setIsPinned] = useState(note.is_pinned);
  const [isFavorite, setIsFavorite] = useState(note.is_favorite);

  // Clean up checklist items - remove empty or placeholder text, but keep at least one empty item per checklist
  const cleanChecklistItems = (blocks: NoteBlock[]): NoteBlock[] => {
    return blocks.filter(block => {
      // Keep non-checklist blocks as-is
      if (block.type !== 'checklist' || !block.items) {
        return true;
      }
      
      // For checklist blocks, filter out empty/placeholder items
      const validItems = block.items.filter(item => 
        item.text.trim() !== '' && 
        item.text !== 'List item... (press Enter for new item)'
      );
      
      // If there are valid items, keep them
      if (validItems.length > 0) {
        block.items = validItems;
        return true;
      }
      
      // If no valid items but the checklist has at least one item, keep one empty placeholder
      if (block.items.length > 0) {
        block.items = [{ id: `item-${Date.now()}`, checked: false, text: '' }];
        return true;
      }
      
      // If checklist was created but has no items at all, remove it
      return false;
    }).map(block => {
      // Return a new object to avoid mutations
      if (block.type === 'checklist' && block.items) {
        return { ...block };
      }
      return block;
    });
  };

  // Note: We don't clean blocks on mount to preserve empty checklist items for editing

  // Load linked entity name
  useEffect(() => {
    const loadEntity = async () => {
      const entity = await fetchLinkedEntity(note);
      if (entity) setLinkedEntityName(entity.name);
    };
    loadEntity();
  }, [note.linked_entity_id]);

  // Debounced auto-save
  const debouncedSave = useMemo(
    () =>
      debounce(async (newTitle: string, newBlocks: NoteBlock[]) => {
        setIsSaving(true);
        try {
          await updateNote({
            id: note.id,
            updates: {
              title: newTitle,
              content: { blocks: cleanChecklistItems(newBlocks) },
            },
          });
          setLastSaved(new Date());
        } catch (error) {
          console.error("Auto-save failed:", error);
          toast.error("Failed to save changes");
        } finally {
          setIsSaving(false);
        }
      }, 1500),
    [note.id]
  );

  // Trigger auto-save on changes
  useEffect(() => {
    if (title !== note.title || JSON.stringify(blocks) !== JSON.stringify(note.content.blocks)) {
      debouncedSave(title, blocks);
    }
  }, [title, blocks]);

  const handleToggleFavorite = async () => {
    setIsFavorite(!isFavorite);
    await toggleFavorite(note.id);
  };

  const handleTogglePin = async () => {
    setIsPinned(!isPinned);
    await togglePin(note.id);
  };

  const updateBlock = (id: string, updates: Partial<NoteBlock>) => {
    const updatedBlocks = blocks.map(block => (block.id === id ? { ...block, ...updates } : block));
    
    // If updating a checklist and move completed is enabled, sort items
    if (updates.items && checklistMoveCompleted) {
      const block = updatedBlocks.find(b => b.id === id);
      if (block && block.items) {
        const unchecked = block.items.filter(item => !item.checked);
        const checked = block.items.filter(item => item.checked);
        block.items = [...unchecked, ...checked];
      }
    }
    
    setBlocks(updatedBlocks);
  };

  const handleToggleStrikethrough = async (enabled: boolean) => {
    setChecklistStrikethrough(enabled);
    await updatePreferences({ checklist_strikethrough: enabled });
  };

  const handleToggleMoveCompleted = async (enabled: boolean) => {
    setChecklistMoveCompleted(enabled);
    await updatePreferences({ checklist_move_completed: enabled });
  };

  const handleChecklistKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    blockId: string,
    itemIndex: number,
    itemText: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const block = blocks.find(b => b.id === blockId);
      if (!block || !block.items) return;

      const newItem = { id: `item-${Date.now()}`, checked: false, text: '' };
      const newItems = [...block.items];
      newItems.splice(itemIndex + 1, 0, newItem);
      updateBlock(blockId, { items: newItems });

      // Focus the new item after render
      setTimeout(() => {
        const newInput = document.querySelector(`textarea[data-item-id="${newItem.id}"]`) as HTMLTextAreaElement;
        if (newInput) newInput.focus();
      }, 0);
    } else if (e.key === 'Backspace' && itemText === '') {
      e.preventDefault();
      const block = blocks.find(b => b.id === blockId);
      if (!block || !block.items || block.items.length <= 1) return;

      const newItems = block.items.filter((_, i) => i !== itemIndex);
      updateBlock(blockId, { items: newItems });

      // Focus previous item
      if (itemIndex > 0) {
        setTimeout(() => {
          const inputs = document.querySelectorAll(`[data-block-id="${blockId}"] textarea`);
          const prevInput = inputs[itemIndex - 1] as HTMLTextAreaElement;
          if (prevInput) prevInput.focus();
        }, 0);
      }
    }
  };

  const renderBlock = (block: NoteBlock) => {
    switch (block.type) {
      case 'heading':
        const HeadingTag = `h${block.level || 1}` as 'h1' | 'h2' | 'h3';
        const headingClass = block.level === 1 ? 'text-3xl' : block.level === 2 ? 'text-2xl' : 'text-xl';
        
        return editingBlockId === block.id ? (
          <RichTextEditor
            content={block.content || ''}
            onChange={(content) => updateBlock(block.id, { content })}
            placeholder="Heading"
            variant="heading"
            className="w-full"
          />
        ) : (
          <HeadingTag
            className={`font-bold ${headingClass} cursor-text hover:bg-accent/10 rounded px-2 py-1 -mx-2`}
            onClick={() => setEditingBlockId(block.id)}
          >
            {block.content || 'Click to edit heading...'}
          </HeadingTag>
        );

      case 'paragraph':
        return editingBlockId === block.id ? (
          <RichTextEditor
            content={block.content || ''}
            onChange={(content) => updateBlock(block.id, { content })}
            placeholder="Write something..."
            className="w-full"
          />
        ) : (
          <div
            className="cursor-text hover:bg-accent/10 rounded px-2 py-2 -mx-2 min-h-[2em] prose prose-sm max-w-none"
            onClick={() => setEditingBlockId(block.id)}
            dangerouslySetInnerHTML={{ __html: block.content || '<p class="text-muted-foreground">Click to start writing...</p>' }}
          />
        );

      case 'checklist':
        return (
          <div className="space-y-1 transition-all duration-500" data-block-id={block.id}>
            {block.items?.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[auto_1fr] gap-2 items-start transition-all duration-500 ease-in-out">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(checked) => {
                    const newItems = [...(block.items || [])];
                    newItems[index] = { ...item, checked: checked as boolean };
                    updateBlock(block.id, { items: newItems });
                    
                    if (checked && checklistMoveCompleted) {
                      setTimeout(() => {
                        const newItemsSorted = [...newItems];
                        const [completedItem] = newItemsSorted.splice(index, 1);
                        newItemsSorted.push(completedItem);
                        updateBlock(block.id, { items: newItemsSorted });
                      }, 800);
                    }
                  }}
                  className="mt-3"
                />
                <div 
                  className={cn(
                    "w-full relative",
                    item.checked && checklistStrikethrough && 'opacity-60'
                  )}
                  onKeyDown={(e) => {
                    // Handle backspace/delete on empty items
                    if ((e.key === 'Backspace' || e.key === 'Delete')) {
                      const textContent = item.text.replace(/<[^>]*>/g, '').trim();
                      if (textContent === '') {
                        e.preventDefault();
                        const newItems = [...(block.items || [])];
                        if (newItems.length > 1) {
                          newItems.splice(index, 1);
                          updateBlock(block.id, { items: newItems });
                          
                          // Focus previous item after deletion
                          if (index > 0) {
                            setTimeout(() => {
                              const inputs = document.querySelectorAll(`[data-block-id="${block.id}"] .ProseMirror`);
                              const prevInput = inputs[index - 1] as HTMLElement;
                              if (prevInput) prevInput.focus();
                            }, 0);
                          }
                        }
                      }
                    }
                    
                    // Handle Enter to create new checkbox (like iOS Notes)
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      
                      const newItems = [...(block.items || [])];
                      const newItem = { id: `item-${Date.now()}`, checked: false, text: '' };
                      newItems.splice(index + 1, 0, newItem);
                      updateBlock(block.id, { items: newItems });
                      
                      // Focus the new item
                      setTimeout(() => {
                        const newInput = document.querySelector(`[data-item-id="${newItem.id}"] .ProseMirror`) as HTMLElement;
                        if (newInput) newInput.focus();
                      }, 0);
                    }
                  }}
                >
                  <div 
                    className={cn(item.checked && checklistStrikethrough && 'line-through')}
                    data-item-id={item.id}
                  >
                    <RichTextEditor
                      content={item.text || ''}
                      onChange={(content) => {
                        const newItems = [...(block.items || [])];
                        // Remove item if text becomes empty (excluding HTML tags)
                        const textContent = content.replace(/<[^>]*>/g, '').trim();
                        if (textContent === '' && newItems.length > 1) {
                          // Remove this item if there are other items
                          newItems.splice(index, 1);
                        } else {
                          newItems[index] = { ...item, text: content };
                        }
                        updateBlock(block.id, { items: newItems });
                      }}
                      placeholder="List item..."
                      className="w-full"
                      variant="paragraph"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'table':
        return (
          <div className="overflow-x-auto">
            <table className="border-collapse border w-full">
              <tbody>
                {block.rows?.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell: any, cellIndex: number) => (
                      <td key={cellIndex} className="border p-2">
                        <Input
                          value={cell.content || ''}
                          onChange={(e) => {
                            const newRows = [...(block.rows || [])];
                            newRows[rowIndex][cellIndex] = { content: e.target.value };
                            updateBlock(block.id, { rows: newRows });
                          }}
                          className="border-none shadow-none focus-visible:ring-1"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            {block.url && (
              <div className="border rounded-lg overflow-hidden">
                <img src={block.url} alt={block.caption || 'Image'} className="w-full" />
              </div>
            )}
            {block.caption && (
              <p className="text-sm text-muted-foreground text-center">{block.caption}</p>
            )}
          </div>
        );

      case 'divider':
        return (
          <div className="flex items-center justify-center py-4">
            <div className="border-t w-full"></div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <EditorFocusProvider>
      <div className="flex flex-col h-[90vh] max-h-screen pb-16">
        {/* Header Toolbar */}
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="mr-1">
            <X className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleToggleFavorite}>
            <Star className={`h-4 w-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleTogglePin}>
            <Pin className={`h-4 w-4 ${isPinned ? 'fill-primary text-primary' : ''}`} />
          </Button>
          {linkedEntityName && (
            <Badge variant="outline" className="gap-1">
              <LinkIcon className="h-3 w-3" />
              {linkedEntityName}
            </Badge>
          )}
          <div className="text-xs text-muted-foreground ml-2">
            {isSaving ? (
              <span className="flex items-center gap-1">Saving...</span>
            ) : (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-3 space-y-3">
                <div className="text-sm font-medium">Checklist Options</div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="strikethrough" className="text-sm cursor-pointer">
                    Strike through completed
                  </Label>
                  <Switch
                    id="strikethrough"
                    checked={checklistStrikethrough}
                    onCheckedChange={handleToggleStrikethrough}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="move-completed" className="text-sm cursor-pointer">
                    Move completed to bottom
                  </Label>
                  <Switch
                    id="move-completed"
                    checked={checklistMoveCompleted}
                    onCheckedChange={handleToggleMoveCompleted}
                  />
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onCustomize}>
                <Settings className="h-4 w-4 mr-2" />
                Customize Note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Note Content */}
      <div
        className="flex-1 overflow-y-auto p-6"
        style={{ backgroundColor: note.background_color || undefined }}
      >
        {/* Banner */}
        {note.banner_image && (
          <div
            className="w-full h-56 bg-cover bg-center rounded-lg mb-6"
            style={{ backgroundImage: `url(${note.banner_image})` }}
          />
        )}

        {/* Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="text-3xl font-bold border-none shadow-none focus-visible:ring-0 px-0 mb-6"
        />

        {/* Blocks */}
        <div className="space-y-6">
          {blocks.map((block) => (
            <div key={block.id}>{renderBlock(block)}</div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-4 border-t text-xs text-muted-foreground">
          <p>Created: {new Date(note.created_at).toLocaleString()}</p>
          <p>Last updated: {lastSaved.toLocaleString()}</p>
        </div>
      </div>

      <SharedFormattingToolbar />
    </div>
    </EditorFocusProvider>
  );
}
