import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { EditorFocusProvider } from "@/contexts/EditorFocusContext";
import { SharedFormattingToolbar } from "@/components/SharedFormattingToolbar";
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
  Calendar,
  Clock,
  Upload,
  Palette,
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
    const currentDate = new Date();
    const newBlock: NoteBlock = {
      id: `block-${Date.now()}`,
      type,
      content: type === 'paragraph' || type === 'heading' ? '' : undefined,
      level: type === 'heading' ? 1 : undefined,
      items: type === 'checklist' ? [{ id: `item-${Date.now()}`, checked: false, text: '' }] : undefined,
      rows: type === 'table' ? [[{ content: '' }, { content: '' }]] : undefined,
      date: type === 'date' ? currentDate.toISOString().split('T')[0] : undefined,
      time: type === 'time' ? currentDate.toTimeString().split(' ')[0].slice(0, 5) : undefined,
      url: type === 'imageUpload' ? '' : undefined,
      tableStyles: type === 'table' ? { backgroundColor: '', borderStyle: 'solid', borderColor: '#e5e7eb' } : undefined,
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
            <div className="flex gap-2 mb-2 flex-wrap">
              <Input
                type="color"
                value={block.tableStyles?.backgroundColor || '#ffffff'}
                onChange={(e) => updateBlock(block.id, { 
                  tableStyles: { ...block.tableStyles, backgroundColor: e.target.value }
                })}
                className="w-20 h-8"
                title="Background Color"
              />
              <select
                value={block.tableStyles?.borderStyle || 'solid'}
                onChange={(e) => updateBlock(block.id, { 
                  tableStyles: { ...block.tableStyles, borderStyle: e.target.value as any }
                })}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="solid">Solid Border</option>
                <option value="dashed">Dashed Border</option>
                <option value="dotted">Dotted Border</option>
                <option value="none">No Border</option>
              </select>
              <Input
                type="color"
                value={block.tableStyles?.borderColor || '#e5e7eb'}
                onChange={(e) => updateBlock(block.id, { 
                  tableStyles: { ...block.tableStyles, borderColor: e.target.value }
                })}
                className="w-20 h-8"
                title="Border Color"
              />
            </div>
            <div className="overflow-x-auto">
              <table 
                className="border-collapse w-full"
                style={{
                  backgroundColor: block.tableStyles?.backgroundColor,
                  borderStyle: block.tableStyles?.borderStyle,
                  borderWidth: block.tableStyles?.borderStyle === 'none' ? 0 : '1px',
                  borderColor: block.tableStyles?.borderColor,
                  backgroundImage: block.tableStyles?.backgroundImage ? `url(${block.tableStyles.backgroundImage})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <tbody>
                  {block.rows?.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell: any, cellIndex: number) => (
                        <td 
                          key={cellIndex} 
                          className="border p-2 relative"
                          style={{
                            borderStyle: block.tableStyles?.borderStyle,
                            borderColor: block.tableStyles?.borderColor,
                          }}
                        >
                          <Input
                            value={cell.content || ''}
                            onChange={(e) => {
                              const newRows = [...(block.rows || [])];
                              newRows[rowIndex][cellIndex] = { content: e.target.value };
                              updateBlock(block.id, { rows: newRows });
                            }}
                            placeholder="Cell..."
                            className="border-none bg-transparent"
                          />
                        </td>
                      ))}
                      <td className="p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if ((block.rows || []).length > 1) {
                              const newRows = (block.rows || []).filter((_, i) => i !== rowIndex);
                              updateBlock(block.id, { rows: newRows });
                            }
                          }}
                          className="h-6 w-6 p-0"
                          title="Delete Row"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    {block.rows?.[0]?.map((_: any, cellIndex: number) => (
                      <td key={cellIndex} className="p-1 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if ((block.rows?.[0]?.length || 0) > 1) {
                              const newRows = (block.rows || []).map(row => 
                                row.filter((_: any, i: number) => i !== cellIndex)
                              );
                              updateBlock(block.id, { rows: newRows });
                            }
                          }}
                          className="h-6 w-6 p-0"
                          title="Delete Column"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    ))}
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 flex-wrap">
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
              <Input
                type="url"
                placeholder="Background image URL..."
                value={block.tableStyles?.backgroundImage || ''}
                onChange={(e) => updateBlock(block.id, { 
                  tableStyles: { ...block.tableStyles, backgroundImage: e.target.value }
                })}
                className="flex-1 min-w-[200px]"
              />
            </div>
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date</Label>
            <Input
              type="date"
              value={block.date || ''}
              onChange={(e) => updateBlock(block.id, { date: e.target.value })}
              className="w-full"
            />
          </div>
        );

      case 'time':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Time</Label>
            <Input
              type="time"
              value={block.time || ''}
              onChange={(e) => updateBlock(block.id, { time: e.target.value })}
              className="w-full"
            />
          </div>
        );

      case 'imageUpload':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Image Upload</Label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // For now, create object URL. In production, upload to storage
                    const url = URL.createObjectURL(file);
                    updateBlock(block.id, { url });
                  }
                }}
                className="flex-1"
              />
            </div>
            {block.url && (
              <div className="border rounded-lg overflow-hidden">
                <img src={block.url} alt="Uploaded" className="w-full" />
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
    <EditorFocusProvider>
      <div className="space-y-4 pb-16">
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
                <DropdownMenuItem onClick={() => addBlock('imageUpload', block.id)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Image Upload
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addBlock('date', block.id)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Date
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addBlock('time', block.id)}>
                  <Clock className="h-4 w-4 mr-2" />
                  Time
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
          <DropdownMenuItem onClick={() => addBlock('imageUpload')}>
            <Upload className="h-4 w-4 mr-2" />
            Image Upload
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addBlock('date')}>
            <Calendar className="h-4 w-4 mr-2" />
            Date
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addBlock('time')}>
            <Clock className="h-4 w-4 mr-2" />
            Time
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addBlock('divider')}>
            <Minus className="h-4 w-4 mr-2" />
            Divider
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SharedFormattingToolbar />
    </div>
    </EditorFocusProvider>
  );
}
