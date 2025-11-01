import { Responsive, WidthProvider, Layouts, Layout } from "react-grid-layout";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarWidgetSmall } from "./widgets/CalendarWidgetSmall";
import { CalendarWidgetMedium } from "./widgets/CalendarWidgetMedium";
import { CalendarWidgetLarge } from "./widgets/CalendarWidgetLarge";
import { WeatherWidget } from "./widgets/WeatherWidget";
import { FavoritesWidget } from "./widgets/FavoritesWidget";
import { UpcomingWorkOrdersWidget } from "./widgets/UpcomingWorkOrdersWidget";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

export interface Widget {
  id: string;
  type: "calendar-small" | "calendar-medium" | "calendar-large" | "weather" | "favorites" | "upcoming-work-orders";
  position: number;
  settings: any;
  layout?: Layout;
}

interface DashboardGridProps {
  widgets: Widget[];
  isEditMode: boolean;
  onLayoutsChange: (layouts: Layouts, widgets: Widget[]) => void;
  onRemoveWidget: (id: string) => void;
}

const breakpoints = { lg: 1280, md: 1024, sm: 640, xs: 0 };
const cols = { lg: 4, md: 3, sm: 2, xs: 1 };

const getDefaultSize = (type: Widget["type"]): { w: number; h: number } => {
  switch (type) {
    case "calendar-small":
      return { w: 1, h: 22 };
    case "calendar-medium":
      return { w: 2, h: 35 };
    case "calendar-large":
      return { w: 2, h: 47 };
    case "weather":
      return { w: 1, h: 22 };
    case "favorites":
      return { w: 1, h: 22 };
    case "upcoming-work-orders":
      return { w: 2, h: 35 };
    default:
      return { w: 1, h: 22 };
  }
};

const WidgetCard = ({
  widget,
  isEditMode,
  onRemove,
}: {
  widget: Widget;
  isEditMode: boolean;
  onRemove: () => void;
}) => {
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
    <Card className="relative h-full overflow-hidden transition-all duration-200 hover:shadow-lg group">
      {isEditMode && (
        <div className="widget-drag-handle absolute top-0 left-0 right-0 h-8 cursor-move bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="w-8 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
      )}
      {isEditMode && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 z-20 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <CardContent className="p-4 h-full overflow-auto">
        {renderWidget()}
      </CardContent>
    </Card>
  );
};

export const DashboardGrid = ({
  widgets,
  isEditMode,
  onLayoutsChange,
  onRemoveWidget,
}: DashboardGridProps) => {
  // Build layouts from widgets
  const buildLayouts = (): Layouts => {
    const lgLayout: Layout[] = [];
    
    widgets.forEach((widget, index) => {
      const defaultSize = getDefaultSize(widget.type);
      const existingLayout = widget.layout;
      
      if (existingLayout) {
        lgLayout.push({
          i: widget.id,
          x: existingLayout.x ?? (index % 4),
          y: existingLayout.y ?? Math.floor(index / 4) * defaultSize.h,
          w: existingLayout.w ?? defaultSize.w,
          h: existingLayout.h ?? defaultSize.h,
        });
      } else {
        lgLayout.push({
          i: widget.id,
          x: index % 4,
          y: Math.floor(index / 4) * defaultSize.h,
          w: defaultSize.w,
          h: defaultSize.h,
        });
      }
    });

    return { lg: lgLayout };
  };

  const layouts = buildLayouts();

  const handleLayoutChange = (_: Layout[], allLayouts: Layouts) => {
    if (!isEditMode) return;

    // Update widgets with new layout info
    const updatedWidgets = widgets.map((widget) => {
      const lgLayout = allLayouts.lg?.find((l) => l.i === widget.id);
      if (lgLayout) {
        return {
          ...widget,
          layout: lgLayout,
        };
      }
      return widget;
    });

    onLayoutsChange(allLayouts, updatedWidgets);
  };

  return (
    <div className="w-full">
      <ResponsiveGridLayout
        className="ordersnapr-dashboard"
        breakpoints={breakpoints}
        cols={cols}
        layouts={layouts}
        rowHeight={8}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
        isBounded={true}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        draggableHandle=".widget-drag-handle"
        onLayoutChange={handleLayoutChange}
      >
        {widgets.map((widget) => (
          <div key={widget.id}>
            <WidgetCard
              widget={widget}
              isEditMode={isEditMode}
              onRemove={() => onRemoveWidget(widget.id)}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};
