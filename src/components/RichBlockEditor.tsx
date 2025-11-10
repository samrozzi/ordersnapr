import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Plus,
  Type,
  Heading1,
  Heading2,
  Heading3,
  ListChecks,
  Table,
  Image as ImageIcon,
  Minus,
  GripVertical,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NoteBlock } from "@/hooks/use-notes";

interface RichBlockEditorProps {
  blocks: NoteBlock[];
  onChange: (blocks: NoteBlock[]) => void;
}

export function RichBlockEditor({ blocks, onChange }: RichBlockEditorProps) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

  const addBlock = (type: NoteBlock['type'], afterId?: string) => {
    const newBlock: NoteBlock = {
      id: `block-${Date.now()}`,
      type,
      content: type === 'paragraph' || type === 'heading' ? '' : undefined,
      level: type === 'heading' ? 1 : undefined,
      items: type === 'checklist' ? [{ id: `item-${Date.now()}`, checked: false, text: '' }] : undefined,
      rows: type === 'table' ? [[{ content: '' }, { content: '' }]] : undefined,
    };

    if (afterId) {
      const index = blocks.findIndex(b => b.id === afterId);
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      onChange(newBlocks);
    } else {
      onChange([...blocks, newBlock]);
    }
  };

  const updateBlock = (id: string, updates: Partial<NoteBlock>) => {
    onChange(blocks.map(block =>
      block.id === id ? { ...block, ...updates } : block
    ));
  };

  const deleteBlock = (id: string) => {
    if (blocks.length > 1) {
      onChange(blocks.filter(block => block.id !== id));
    }
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if (
      (direction === 'up' && index > 0) ||
      (direction === 'down' && index < blocks.length - 1)
    ) {
      const newBlocks = [...blocks];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
      onChange(newBlocks);
    }
  };

  const renderBlock = (block: NoteBlock) => {
    switch (block.type) {
      case 'heading':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={block.level || 1}
                onChange={(e) => updateBlock(block.id, { level: parseInt(e.target.value) })}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value={1}>H1</option>
                <option value={2}>H2</option>
                <option value={3}>H3</option>
              </select>
            </div>
            <RichTextEditor
              content={block.content || ''}
              onChange={(content) => updateBlock(block.id, { content })}
              placeholder="Heading..."
              variant="heading"
              className="w-full"
              showPersistentToolbar={true}
            />
          </div>
        );

      case 'paragraph':
        return (
          <RichTextEditor
            content={block.content || ''}
            onChange={(content) => updateBlock(block.id, { content })}
            placeholder="Start writing..."
            className="w-full"
            showPersistentToolbar={true}
          />
        );

      case 'checklist':
        return (
          <div className="space-y-2">
            {block.items?.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[auto_1fr_auto] gap-2 items-start">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(checked) => {
                    const newItems = [...(block.items || [])];
                    newItems[index] = { ...item, checked: checked as boolean };
                    updateBlock(block.id, { items: newItems });
                  }}
                  className="mt-3"
                />
                <div className={cn("w-full", item.checked && 'opacity-60')}>
                  <RichTextEditor
                    content={item.text || ''}
                    onChange={(content) => {
                      const newItems = [...(block.items || [])];
                      newItems[index] = { ...item, text: content };
                      updateBlock(block.id, { items: newItems });
                    }}
                    placeholder="List item..."
                    className="w-full"
                    showPersistentToolbar={true}
                    variant="paragraph"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newItems = (block.items || []).filter((_, i) => i !== index);
                    if (newItems.length > 0) {
                      updateBlock(block.id, { items: newItems });
                    }
                  }}
                  className="mt-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newItems = [
                  ...(block.items || []),
                  { id: `item-${Date.now()}`, checked: false, text: '' }
                ];
                updateBlock(block.id, { items: newItems });
              }}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        );

      case 'table':
        return (
          <div className="space-y-2">
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
                            placeholder="Cell..."
                            className="border-none"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const colCount = block.rows?.[0]?.length || 2;
                  const newRow = Array(colCount).fill({ content: '' });
                  updateBlock(block.id, { rows: [...(block.rows || []), newRow] });
                }}
              >
                Add Row
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newRows = (block.rows || []).map(row => [...row, { content: '' }]);
                  updateBlock(block.id, { rows: newRows });
                }}
              >
                Add Column
              </Button>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            <Input
              value={block.url || ''}
              onChange={(e) => updateBlock(block.id, { url: e.target.value })}
              placeholder="Image URL..."
            />
            {block.url && (
              <div className="border rounded-lg overflow-hidden">
                <img src={block.url} alt={block.caption || 'Image'} className="w-full" />
              </div>
            )}
            <Input
              value={block.caption || ''}
              onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
              placeholder="Caption (optional)..."
              className="text-sm"
            />
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

  if (blocks.length === 0) {
    return (
      <div className="space-y-4">
        <Button onClick={() => addBlock('paragraph')}>
          <Plus className="h-4 w-4 mr-2" />
          Add First Block
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <div key={block.id} className="group relative border rounded-lg p-4">
          {/* Block Controls */}
          <div className="absolute -left-3 top-4 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 cursor-grab"
            >
              <GripVertical className="h-4 w-4" />
            </Button>
          </div>

          <div className="absolute -right-3 top-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => deleteBlock(block.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Block Content */}
          {renderBlock(block)}

          {/* Add Block Button */}
          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Block Below
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => addBlock('paragraph', block.id)}>
                  <Type className="h-4 w-4 mr-2" />
                  Paragraph
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addBlock('heading', block.id)}>
                  <Heading1 className="h-4 w-4 mr-2" />
                  Heading
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addBlock('checklist', block.id)}>
                  <ListChecks className="h-4 w-4 mr-2" />
                  Checklist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addBlock('table', block.id)}>
                  <Table className="h-4 w-4 mr-2" />
                  Table
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addBlock('image', block.id)}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Image
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addBlock('divider', block.id)}>
                  <Minus className="h-4 w-4 mr-2" />
                  Divider
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}

      {/* Add Block at End */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Block
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => addBlock('paragraph')}>
            <Type className="h-4 w-4 mr-2" />
            Paragraph
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addBlock('heading')}>
            <Heading1 className="h-4 w-4 mr-2" />
            Heading
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addBlock('checklist')}>
            <ListChecks className="h-4 w-4 mr-2" />
            Checklist
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addBlock('table')}>
            <Table className="h-4 w-4 mr-2" />
            Table
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addBlock('image')}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Image
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addBlock('divider')}>
            <Minus className="h-4 w-4 mr-2" />
            Divider
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
