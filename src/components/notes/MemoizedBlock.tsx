import { memo } from "react";
import { NoteBlock } from "@/hooks/use-notes";
import { GripVertical, Plus, Trash2, MoreVertical, Heading1, Type, List, Table, Calendar, Clock, Image, Minus, Copy, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface MemoizedBlockProps {
  block: NoteBlock;
  index: number;
  isActive: boolean;
  isDragging?: boolean;
  isLocked?: boolean;
  onFocus: () => void;
  onDelete: () => void;
  onAddBelow: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onConvertType?: (blockType: string) => void;
  onCopyLink?: () => void;
  dragHandleProps?: any;
  children: React.ReactNode;
}

const getBlockTypeIcon = (blockType: string) => {
  switch (blockType) {
    case "heading":
      return <Heading1 className="h-3 w-3 text-muted-foreground" />;
    case "paragraph":
      return <Type className="h-3 w-3 text-muted-foreground" />;
    case "checklist":
      return <List className="h-3 w-3 text-muted-foreground" />;
    case "table":
      return <Table className="h-3 w-3 text-muted-foreground" />;
    case "date":
      return <Calendar className="h-3 w-3 text-muted-foreground" />;
    case "time":
      return <Clock className="h-3 w-3 text-muted-foreground" />;
    case "image":
    case "imageUpload":
      return <Image className="h-3 w-3 text-muted-foreground" />;
    case "divider":
      return <Minus className="h-3 w-3 text-muted-foreground" />;
    default:
      return <Type className="h-3 w-3 text-muted-foreground" />;
  }
};

export const MemoizedBlock = memo(function MemoizedBlock({
  block,
  index,
  isActive,
  isDragging,
  isLocked,
  onFocus,
  onDelete,
  onAddBelow,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onConvertType,
  onCopyLink,
  dragHandleProps,
  children
}: MemoizedBlockProps) {
  return (
    <div
      className={`group relative transition-all duration-200 ease-out ${
        isDragging ? "opacity-50" : "opacity-100"
      } ${
        isActive ? "ring-2 ring-primary/20 rounded-lg" : ""
      }`}
      onClick={onFocus}
      style={{
        animation: isDragging ? "none" : "fadeIn 0.2s ease-out"
      }}
    >
      <div className="flex items-start gap-2 hover:bg-accent/5 rounded-lg transition-colors duration-150">
        {/* Drag Handle with Block Type Icon */}
        {!isLocked && (
          <div className="flex-shrink-0 pt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              {getBlockTypeIcon(block.type)}
            </div>
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Block Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>

        {/* Block Actions */}
        {!isLocked && (
          <div className="flex-shrink-0 flex items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Convert to...
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onConvertType?.("heading")}>
                    <Heading1 className="h-4 w-4 mr-2" />
                    Heading
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onConvertType?.("paragraph")}>
                    <Type className="h-4 w-4 mr-2" />
                    Text
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onConvertType?.("checklist")}>
                    <List className="h-4 w-4 mr-2" />
                    Checklist
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onConvertType?.("table")}>
                    <Table className="h-4 w-4 mr-2" />
                    Table
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {onDuplicate && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onMoveUp && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveUp(); }}>
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Move Up
                </DropdownMenuItem>
              )}
              {onMoveDown && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveDown(); }}>
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Move Down
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onCopyLink && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyLink(); }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onAddBelow();
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.block.id === nextProps.block.id &&
    JSON.stringify(prevProps.block.content) === JSON.stringify(nextProps.block.content) &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.index === nextProps.index &&
    prevProps.isLocked === nextProps.isLocked
  );
});
