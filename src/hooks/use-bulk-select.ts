import { useState, useCallback } from "react";

/**
 * Hook for managing bulk selection in lists
 */
export function useBulkSelect<T extends { id: string }>(items: T[] = []) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleItem = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((item) => item.id)));
    }
  }, [items, selected.size]);

  const selectAll = useCallback(() => {
    setSelected(new Set(items.map((item) => item.id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selected.has(id),
    [selected]
  );

  const isAllSelected = items.length > 0 && selected.size === items.length;
  const isSomeSelected = selected.size > 0 && selected.size < items.length;

  return {
    selected,
    selectedCount: selected.size,
    selectedIds: Array.from(selected),
    toggleItem,
    toggleAll,
    selectAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isSomeSelected,
  };
}
