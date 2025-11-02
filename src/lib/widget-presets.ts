export type WidgetSize = "S" | "M" | "L";
export type Breakpoint = "desktop" | "tablet" | "mobile";
export type Preset = { cols: number; rows: number };

export const PRESETS: Record<Breakpoint, Record<WidgetSize, Preset>> = {
  desktop: {
    S: { cols: 3, rows: 2 },
    M: { cols: 6, rows: 2 },
    L: { cols: 6, rows: 4 },
  },
  tablet: {
    S: { cols: 2, rows: 2 },
    M: { cols: 4, rows: 2 },
    L: { cols: 4, rows: 4 },
  },
  mobile: {
    S: { cols: 1, rows: 2 },
    M: { cols: 1, rows: 3 },
    L: { cols: 1, rows: 4 },
  },
};

export const COLS = { desktop: 12, tablet: 8, mobile: 1 } as const;
export const GAP = 8; // px
export const ROW_HEIGHT = 80; // px

export const WIDGET_ALLOWED: Record<string, WidgetSize[]> = {
  "weather": ["S", "M", "L"],
  "calendar-small": ["S"],
  "calendar-medium": ["M"],
  "calendar-large": ["L"],
  "favorites": ["S", "M"],
  "upcoming-work-orders": ["M", "L"],
};

export function getPreset(size: WidgetSize, bp: Breakpoint): Preset {
  return PRESETS[bp][size];
}

export function getAllowedSizes(widgetType: string): WidgetSize[] {
  return WIDGET_ALLOWED[widgetType] || ["S", "M", "L"];
}
