import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    const result = cn('px-4 py-2', 'bg-blue-500');
    expect(result).toBe('px-4 py-2 bg-blue-500');
  });

  it('should handle conditional class names', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class active-class');
  });

  it('should handle false conditional class names', () => {
    const isActive = false;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class');
  });

  it('should merge conflicting Tailwind classes correctly', () => {
    // twMerge should keep the last conflicting class
    const result = cn('px-4', 'px-8');
    expect(result).toBe('px-8');
  });

  it('should handle array inputs', () => {
    const result = cn(['flex', 'items-center'], 'justify-between');
    expect(result).toBe('flex items-center justify-between');
  });

  it('should handle object inputs with conditional classes', () => {
    const result = cn({
      'bg-blue-500': true,
      'text-white': true,
      'hover:bg-blue-600': false,
    });
    expect(result).toBe('bg-blue-500 text-white');
  });

  it('should handle undefined and null values', () => {
    const result = cn('base-class', undefined, null, 'other-class');
    expect(result).toBe('base-class other-class');
  });

  it('should handle empty inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should deduplicate identical classes', () => {
    const result = cn('flex flex items-center');
    expect(result).toBe('flex items-center');
  });

  it('should handle complex Tailwind modifiers', () => {
    const result = cn(
      'hover:bg-blue-500',
      'dark:bg-gray-800',
      'md:px-8',
      'lg:py-4'
    );
    expect(result).toContain('hover:bg-blue-500');
    expect(result).toContain('dark:bg-gray-800');
    expect(result).toContain('md:px-8');
    expect(result).toContain('lg:py-4');
  });
});
