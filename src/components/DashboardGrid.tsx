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
  layouts: Layouts;
  onLayoutsChange: (layouts: Layouts, widgets: Widget[]) => void;
  onRemoveWidget: (id: string) => void;
  onBreakpointChange?: (bp: 'lg' | 'md' | 'sm' | 'xs') => void;
}

const breakpoints = { lg: 1280, md: 1024, sm: 640, xs: 0 };
const cols = { lg: 4, md: 3, sm: 2, xs: 1 };

// Grid constants
const ROW_H = 8;
const GUTTER_Y = 16;

// Helper: convert pixel min height to grid units
const hUnits = (px: number) => Math.ceil((px + GUTTER_Y) / (ROW_H + GUTTER_Y));

// Global minimums
const MIN_CARD_W = 1;
const MIN_CARD_H = hUnits(160);

const getDefaultSize = (type: Widget["type"]): { w: number; h: number; minW: number; minH: number } => {
  switch (type) {
    case "calendar-small":
      return { w: 1, h: 22, minW: 1, minH: hUnits(180) };
    case "calendar-medium":
      return { w: 2, h: 35, minW: 1, minH: hUnits(240) };
    case "calendar-large":
      return { w: 2, h: 47, minW: 1, minH: hUnits(300) };
    case "weather":
      return { w: 1, h: 24, minW: 1, minH: hUnits(200) };
    case "favorites":
      return { w: 1, h: 22, minW: 1, minH: hUnits(180) };
    case "upcoming-work-orders":
      return { w: 2, h: 35, minW: 1, minH: hUnits(200) };
    default:
      return { w: 1, h: 22, minW: MIN_CARD_W, minH: MIN_CARD_H };
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
    <Card className="relative h-full flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg group">
      <header className="widget-drag-handle sticky top-0 z-10 flex items-center justify-between px-3 py-2 bg-card/95 backdrop-blur-sm border-b shrink-0">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {isEditMode && (
            <div className="shrink-0 cursor-move">
              <div className="w-4 h-1 bg-muted-foreground/30 rounded-full mb-0.5" />
              <div className="w-4 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
          )}
          <h3 className="text-sm font-medium truncate">
            {widget.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </h3>
        </div>
        {isEditMode && (
          <div className="widget-actions shrink-0" style={{ position: 'relative', zIndex: 20 }}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="widget-remove h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
              data-rgl-no-drag="true"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRemove();
              }}
              aria-label="Remove widget"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </header>
      <CardContent className="p-4 flex-1 overflow-auto min-h-[120px]">
        {renderWidget()}
      </CardContent>
    </Card>
  );
};

export const DashboardGrid = ({
  widgets,
  isEditMode,
  layouts,
  onLayoutsChange,
  onRemoveWidget,
  onBreakpointChange,
}: DashboardGridProps) => {
  const handleLayoutChange = (_: Layout[], allLayouts: Layouts) => {
    if (!isEditMode) return;

    // Normalize: ensure no item is below its minimum size before saving
    Object.values(allLayouts).forEach((layoutArr) => {
      layoutArr?.forEach((item) => {
        const widget = widgets.find(w => w.id === item.i);
        if (widget) {
          const defaultSize = getDefaultSize(widget.type);
          const minW = item.minW ?? defaultSize.minW ?? MIN_CARD_W;
          const minH = item.minH ?? defaultSize.minH ?? MIN_CARD_H;
          
          if (item.w < minW) item.w = minW;
          if (item.h < minH) item.h = minH;
        }
      });
    });

    // Update widgets with normalized layout info
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
        rowHeight={ROW_H}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={true}
        isBounded={true}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        draggableHandle=".widget-drag-handle"
        draggableCancel=".widget-actions, .widget-remove, button, [data-rgl-no-drag]"
        onLayoutChange={handleLayoutChange}
        onBreakpointChange={(bp) => onBreakpointChange?.(bp as 'lg' | 'md' | 'sm' | 'xs')}
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
