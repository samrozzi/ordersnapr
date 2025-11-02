import type { WidgetSize } from "./widget-presets";

export type LayoutItem = { id: string; size: WidgetSize; x: number; y: number };
export type ItemWithSpan = LayoutItem & { cols: number; rows: number };

export function packLayout(
  items: ItemWithSpan[],
  totalCols: number
): ItemWithSpan[] {
  type Cell = 0 | 1;
  const grid: Cell[][] = [];
  
  const occupy = (x: number, y: number, w: number, h: number) => {
    for (let r = 0; r < h; r++) {
      const row = y + r;
      grid[row] ??= Array(totalCols).fill(0);
      for (let c = 0; c < w; c++) grid[row][x + c] = 1;
    }
  };
  
  const canPlace = (x: number, y: number, w: number, h: number): boolean => {
    for (let r = 0; r < h; r++) {
      const row = y + r;
      grid[row] ??= Array(totalCols).fill(0);
      for (let c = 0; c < w; c++) {
        if (x + c >= totalCols) return false;
        if (grid[row][x + c] === 1) return false;
      }
    }
    return true;
  };

  const placed: ItemWithSpan[] = [];
  
  for (const item of items) {
    // Try to keep existing x,y position first
    if (item.x != null && item.y != null && canPlace(item.x, item.y, item.cols, item.rows)) {
      occupy(item.x, item.y, item.cols, item.rows);
      placed.push(item);
      continue;
    }
    
    // Otherwise scan rows to find first available position
    let placedFlag = false;
    let y = 0;
    while (!placedFlag) {
      for (let x = 0; x <= totalCols - item.cols; x++) {
        if (canPlace(x, y, item.cols, item.rows)) {
          occupy(x, y, item.cols, item.rows);
          placed.push({ ...item, x, y });
          placedFlag = true;
          break;
        }
      }
      if (!placedFlag) y++;
      if (y > 1000) throw new Error("Grid packer exceeded maximum iterations");
    }
  }
  
  // Sort by y then x for stable visual order
  placed.sort((a, b) => (a.y - b.y) || (a.x - b.x));
  return placed;
}
