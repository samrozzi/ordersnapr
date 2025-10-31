import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BaseWidget } from "./widgets/BaseWidget";
import { CalendarWidgetSmall } from "./widgets/CalendarWidgetSmall";
import { CalendarWidgetMedium } from "./widgets/CalendarWidgetMedium";
import { CalendarWidgetLarge } from "./widgets/CalendarWidgetLarge";
import { WeatherWidget } from "./widgets/WeatherWidget";
import { cn } from "@/lib/utils";

interface Widget {
  id: string;
  type: "calendar-small" | "calendar-medium" | "calendar-large" | "weather";
  position: number;
}

interface DashboardGridProps {
  widgets: Widget[];
  workOrders: any[];
  isEditMode: boolean;
  onWidgetsChange: (widgets: Widget[]) => void;
  onRemoveWidget: (id: string) => void;
}

const SortableWidget = ({
  widget,
  workOrders,
  isEditMode,
  onRemove,
}: {
  widget: Widget;
  workOrders: any[];
  isEditMode: boolean;
  onRemove: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    disabled: !isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getWidgetSize = (type: string) => {
    if (type === "calendar-small") return "small";
    if (type === "calendar-medium") return "medium";
    if (type === "calendar-large") return "large";
    if (type === "weather") return "small";
    return "small";
  };

  const renderWidget = () => {
    switch (widget.type) {
      case "calendar-small":
        return <CalendarWidgetSmall workOrders={workOrders} />;
      case "calendar-medium":
        return <CalendarWidgetMedium workOrders={workOrders} />;
      case "calendar-large":
        return <CalendarWidgetLarge workOrders={workOrders} />;
      case "weather":
        return <WeatherWidget />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        touchAction: isEditMode ? 'none' : 'auto',
      }}
      {...attributes}
      {...listeners}
      className={cn("group", isEditMode && "cursor-move touch-none")}
    >
      <BaseWidget
        size={getWidgetSize(widget.type)}
        isEditMode={isEditMode}
        onRemove={onRemove}
      >
        {renderWidget()}
      </BaseWidget>
    </div>
  );
};

export const DashboardGrid = ({
  widgets,
  workOrders,
  isEditMode,
  onWidgetsChange,
  onRemoveWidget,
}: DashboardGridProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);

      const reorderedWidgets = arrayMove(widgets, oldIndex, newIndex).map((w, i) => ({
        ...w,
        position: i,
      }));

      onWidgetsChange(reorderedWidgets);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={widgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
          {widgets.map((widget) => (
            <SortableWidget
              key={widget.id}
              widget={widget}
              workOrders={workOrders}
              isEditMode={isEditMode}
              onRemove={() => onRemoveWidget(widget.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
