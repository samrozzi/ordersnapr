import { useMemo, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { COLS, GAP, ROW_HEIGHT, getPreset, getAllowedSizes, type WidgetSize } from "@/lib/widget-presets";
import { packLayout, type ItemWithSpan } from "@/lib/grid-packer";
import { CalendarWidgetSmall } from "./widgets/CalendarWidgetSmall";
import { CalendarWidgetMedium } from "./widgets/CalendarWidgetMedium";
import { CalendarWidgetLarge } from "./widgets/CalendarWidgetLarge";
import { WeatherWidget } from "./widgets/WeatherWidget";
import { FavoritesWidget } from "./widgets/FavoritesWidget";
import { UpcomingWorkOrdersWidget } from "./widgets/UpcomingWorkOrdersWidget";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface Widget {
  id: string;
  type: "calendar-small" | "calendar-medium" | "calendar-large" | "weather" | "favorites" | "upcoming-work-orders";
  size: WidgetSize;
  x: number;
  y: number;
  position: number;
}

interface DashboardGridProps {
  widgets: Widget[];
  isEditMode: boolean;
  onSizeChange: (id: string, size: WidgetSize) => void;
  onRemoveWidget: (id: string) => void;
  onWidgetsReorder: (widgets: Widget[]) => void;
}

export const DashboardGrid = ({
  widgets,
  isEditMode,
  onSizeChange,
  onRemoveWidget,
  onWidgetsReorder,
}: DashboardGridProps) => {
  const bp = useBreakpoint();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Map widgets to items with spans
  const itemsWithSpans: ItemWithSpan[] = useMemo(() => {
    return widgets.map(w => {
      const preset = getPreset(w.size, bp);
      return {
        id: w.id,
        size: w.size,
        x: w.x ?? 0,
        y: w.y ?? 0,
        cols: preset.cols,
        rows: preset.rows,
      };
    });
  }, [widgets, bp]);

  // Auto-pack to prevent overlaps
  const packed = useMemo(() => {
    return packLayout(itemsWithSpans, COLS[bp]);
  }, [itemsWithSpans, bp]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(widgets, oldIndex, newIndex);
        onWidgetsReorder(reordered);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={widgets.map(w => w.id)}
        strategy={verticalListSortingStrategy}
        disabled={!isEditMode}
      >
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: `repeat(${COLS[bp]}, minmax(0, 1fr))`,
            gap: GAP,
            position: "relative",
          }}
        >
          {packed.map((item) => {
            const widget = widgets.find(w => w.id === item.id);
            if (!widget) return null;

            return (
              <SortableWidgetItem
                key={item.id}
                widget={widget}
                item={item}
                isEditMode={isEditMode}
                onSizeChange={onSizeChange}
                onRemove={() => onRemoveWidget(item.id)}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
};

const SortableWidgetItem = ({
  widget,
  item,
  isEditMode,
  onSizeChange,
  onRemove,
}: {
  widget: Widget;
  item: ItemWithSpan;
  isEditMode: boolean;
  onSizeChange: (id: string, size: WidgetSize) => void;
  onRemove: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !isEditMode });

  const style = {
    gridColumn: `span ${item.cols}`,
    gridRow: `span ${item.rows}`,
    minHeight: item.rows * ROW_HEIGHT + (item.rows - 1) * GAP,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isEditMode ? 'move' : 'default',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="widget-grid-item"
      {...attributes}
    >
      <WidgetCard
        widget={widget}
        isEditMode={isEditMode}
        onSizeChange={onSizeChange}
        onRemove={onRemove}
        dragHandleProps={isEditMode ? listeners : undefined}
      />
    </div>
  );
};

const WidgetCard = memo(({
  widget,
  isEditMode,
  onSizeChange,
  onRemove,
  dragHandleProps,
}: {
  widget: Widget;
  isEditMode: boolean;
  onSizeChange: (id: string, size: WidgetSize) => void;
  onRemove: () => void;
  dragHandleProps?: any;
}) => {
  const allowedSizes = getAllowedSizes(widget.type);
  const sizes: WidgetSize[] = ["S", "M", "L"];

  const renderWidget = () => {
    switch (widget.type) {
      case "calendar-small":
        return <CalendarWidgetSmall />;
      case "calendar-medium":
        return <CalendarWidgetMedium />;
      case "calendar-large":
        return <CalendarWidgetLarge />;
      case "weather":
        return <WeatherWidget />;
      case "favorites":
        return <FavoritesWidget />;
      case "upcoming-work-orders":
        return <UpcomingWorkOrdersWidget />;
      default:
        return null;
    }
  };

  return (
    <Card className="relative h-full flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg">
      <header className="flex items-center justify-between px-3 py-2 bg-card/95 backdrop-blur-sm border-b shrink-0">
        <div className="flex items-center gap-2">
          {isEditMode && dragHandleProps && (
            <button
              {...dragHandleProps}
              className="cursor-move touch-none p-1 hover:bg-accent rounded"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <h3 className="text-sm font-medium truncate">
            {widget.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </h3>
        </div>
        
        {isEditMode && (
          <div className="flex items-center gap-2">
            {/* Size chips */}
            <div className="flex gap-1">
              {sizes.map(s => {
                const disabled = !allowedSizes.includes(s);
                const active = widget.size === s;
                return (
                  <button
                    key={s}
                    disabled={disabled}
                    onClick={() => onSizeChange(widget.id, s)}
                    className={`
                      px-2 py-1 rounded text-xs border transition-all
                      ${disabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-80 cursor-pointer"}
                      ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}
                    `}
                    aria-pressed={active}
                    aria-label={`Resize to ${s}`}
                    title={disabled ? `${s} size not available` : `Resize to ${s}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            
            {/* Remove button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label="Remove widget"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </header>
      <CardContent className="p-4 flex-1 overflow-auto">
        {renderWidget()}
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.widget.id === nextProps.widget.id &&
    prevProps.widget.size === nextProps.widget.size &&
    prevProps.widget.type === nextProps.widget.type &&
    prevProps.isEditMode === nextProps.isEditMode
  );
});
