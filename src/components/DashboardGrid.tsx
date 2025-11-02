import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
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
}

export const DashboardGrid = ({
  widgets,
  isEditMode,
  onSizeChange,
  onRemoveWidget,
}: DashboardGridProps) => {
  const bp = useBreakpoint();

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

  return (
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
          <div
            key={item.id}
            className="widget-grid-item"
            style={{
              gridColumn: `span ${item.cols}`,
              gridRow: `span ${item.rows}`,
              minHeight: item.rows * ROW_HEIGHT + (item.rows - 1) * GAP,
              transition: "all 120ms ease-out",
            }}
          >
            <WidgetCard
              widget={widget}
              isEditMode={isEditMode}
              onSizeChange={onSizeChange}
              onRemove={() => onRemoveWidget(item.id)}
            />
          </div>
        );
      })}
    </div>
  );
};

const WidgetCard = ({
  widget,
  isEditMode,
  onSizeChange,
  onRemove,
}: {
  widget: Widget;
  isEditMode: boolean;
  onSizeChange: (id: string, size: WidgetSize) => void;
  onRemove: () => void;
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
        <h3 className="text-sm font-medium truncate">
          {widget.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </h3>
        
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
};
