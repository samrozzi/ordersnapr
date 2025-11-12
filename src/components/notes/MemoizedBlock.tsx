import { memo } from "react";
import { NoteBlock } from "@/hooks/use-notes";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface MemoizedBlockProps {
  block: NoteBlock;
  index: number;
  isActive: boolean;
  isDragging?: boolean;
  onFocus: () => void;
  onDelete: () => void;
  onAddBelow: () => void;
  dragHandleProps?: any;
  children: React.ReactNode;
}

export const MemoizedBlock = memo(function MemoizedBlock({
  block,
  index,
  isActive,
  isDragging,
  onFocus,
  onDelete,
  onAddBelow,
  dragHandleProps,
  children
}: MemoizedBlockProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`group relative ${isDragging ? "opacity-50" : ""} ${isActive ? "ring-2 ring-primary/20 rounded-lg" : ""}`}
      onClick={onFocus}
    >
      <div className="flex items-start gap-2 hover:bg-accent/5 rounded-lg transition-colors duration-150">
        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className="flex-shrink-0 pt-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Block Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>

        {/* Block Actions */}
        <div className="flex-shrink-0 flex items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.block.id === nextProps.block.id &&
    JSON.stringify(prevProps.block.content) === JSON.stringify(nextProps.block.content) &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.index === nextProps.index
  );
});
