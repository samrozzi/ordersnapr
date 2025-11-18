import { describe, it, expect } from 'vitest';
import { hexToHSL, hexToRGB, getMutedColorRGB, getMutedColorHex } from './color-utils';

describe('color-utils', () => {
  describe('hexToHSL', () => {
    it('should convert blue hex to HSL', () => {
      const result = hexToHSL('#3b82f6');
      expect(result).toBe('217 91% 60%');
    });

    it('should handle hex without # prefix', () => {
      const result = hexToHSL('3b82f6');
      expect(result).toBe('217 91% 60%');
    });

    it('should convert red hex to HSL', () => {
      const result = hexToHSL('#ff0000');
      expect(result).toBe('0 100% 50%');
    });

    it('should convert green hex to HSL', () => {
      const result = hexToHSL('#00ff00');
      expect(result).toBe('120 100% 50%');
    });

    it('should convert black to HSL', () => {
      const result = hexToHSL('#000000');
      expect(result).toBe('0 0% 0%');
    });

    it('should convert white to HSL', () => {
      const result = hexToHSL('#ffffff');
      expect(result).toBe('0 0% 100%');
    });

    it('should convert gray to HSL', () => {
      const result = hexToHSL('#808080');
      expect(result).toBe('0 0% 50%');
    });
  });

  describe('hexToRGB', () => {
    it('should convert blue hex to RGB', () => {
      const result = hexToRGB('#3b82f6');
      expect(result).toEqual([59, 130, 246]);
    });

    it('should handle hex without # prefix', () => {
      const result = hexToRGB('3b82f6');
      expect(result).toEqual([59, 130, 246]);
    });

    it('should convert red hex to RGB', () => {
      const result = hexToRGB('#ff0000');
      expect(result).toEqual([255, 0, 0]);
    });

    it('should convert green hex to RGB', () => {
      const result = hexToRGB('#00ff00');
      expect(result).toEqual([0, 255, 0]);
    });

    it('should convert black to RGB', () => {
      const result = hexToRGB('#000000');
      expect(result).toEqual([0, 0, 0]);
    });

    it('should convert white to RGB', () => {
      const result = hexToRGB('#ffffff');
      expect(result).toEqual([255, 255, 255]);
    });
  });

  describe('getMutedColorRGB', () => {
    it('should create muted version of blue with default opacity', () => {
      const result = getMutedColorRGB('#3b82f6');
      // With 5% opacity blended with white, should be very light blue
      expect(result[0]).toBeGreaterThan(240); // R should be close to 255
      expect(result[1]).toBeGreaterThan(240); // G should be close to 255
      expect(result[2]).toBeGreaterThan(240); // B should be close to 255
    });

    it('should create muted version with custom opacity', () => {
      const result = getMutedColorRGB('#ff0000', 0.5);
      // With 50% opacity blended with white
      expect(result).toEqual([255, 128, 128]);
    });

    it('should handle black color', () => {
      const result = getMutedColorRGB('#000000', 0.1);
      // 10% black blended with white
      expect(result).toEqual([230, 230, 230]);
    });

    it('should handle white color', () => {
      const result = getMutedColorRGB('#ffffff', 0.5);
      // White blended with white is still white
      expect(result).toEqual([255, 255, 255]);
    });
  });

  describe('getMutedColorHex', () => {
    it('should return muted color as uppercase hex without #', () => {
      const result = getMutedColorHex('#ff0000', 0.5);
      expect(result).toBe('FF8080');
      expect(result).not.toContain('#');
    });

    it('should create very light blue with default opacity', () => {
      const result = getMutedColorHex('#3b82f6');
      // Should be very light (close to white)
      expect(result.length).toBe(6);
      expect(result).toMatch(/^[0-9A-F]{6}$/);
    });

    it('should create muted black', () => {
      const result = getMutedColorHex('#000000', 0.1);
      expect(result).toBe('E6E6E6');
    });

    it('should pad single digit hex values with 0', () => {
      const result = getMutedColorHex('#010101', 0.1);
      expect(result.length).toBe(6);
      expect(result).toMatch(/^[0-9A-F]{6}$/);
    });
  });
});
