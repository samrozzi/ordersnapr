/**
 * Convert hex color to HSL format for CSS variables
 * @param hex - Hex color string (e.g., "#3b82f6")
 * @returns HSL string (e.g., "217 91% 60%")
 */
export function hexToHSL(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Convert to degrees and percentages
  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  // Return in the format expected by CSS variables (no commas, no units except %)
  return `${hDeg} ${sPercent}% ${lPercent}%`;
}

/**
 * Convert hex color to RGB array for PDF/canvas
 * @param hex - Hex color string (e.g., "#3b82f6")
 * @returns RGB array (e.g., [59, 130, 246])
 */
export function hexToRGB(hex: string): [number, number, number] {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return [r, g, b];
}

/**
 * Get muted version of a color by blending with white
 * @param hex - Hex color string (e.g., "#3b82f6")
 * @param opacity - Opacity value from 0 to 1 (default 0.05 for 5% opacity)
 * @returns RGB array for the muted color
 */
export function getMutedColorRGB(hex: string, opacity: number = 0.05): [number, number, number] {
  const [r, g, b] = hexToRGB(hex);
  
  // Blend with white (255, 255, 255)
  const mutedR = Math.round(r * opacity + 255 * (1 - opacity));
  const mutedG = Math.round(g * opacity + 255 * (1 - opacity));
  const mutedB = Math.round(b * opacity + 255 * (1 - opacity));
  
  return [mutedR, mutedG, mutedB];
}

/**
 * Get muted version of a color as hex string for DOCX
 * @param hex - Hex color string (e.g., "#3b82f6")
 * @param opacity - Opacity value from 0 to 1 (default 0.05 for 5% opacity)
 * @returns Hex string without # (e.g., "F2F7FC")
 */
export function getMutedColorHex(hex: string, opacity: number = 0.05): string {
  const [r, g, b] = getMutedColorRGB(hex, opacity);
  
  // Convert to hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `${toHex(r)}${toHex(g)}${toHex(b)}`;
}
