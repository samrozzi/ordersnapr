/**
 * Form Renderer Helper Functions
 * Extracted from FormRenderer.tsx to improve maintainability
 */

/**
 * Normalize label for matching
 * Converts labels to lowercase and replaces non-alphanumeric characters with underscores
 */
export const normalizeLabel = (label: string): string => {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
};

/**
 * Find table cell fields by label
 * Maps common field variations to standard keys
 */
export const findTableCellsByLabel = (tableField: any) => {
  const cells: Record<string, any> = {};
  if (!tableField.tableCells) return cells;

  Object.entries(tableField.tableCells).forEach(([cellKey, cell]: [string, any]) => {
    if (cell.field?.label) {
      const normalized = normalizeLabel(cell.field.label);
      // Map common variations
      if (normalized.includes('name') || normalized === 'tech_name') {
        cells.name = { cellKey, field: cell.field };
      } else if (normalized.includes('id') || normalized === 'tech_id') {
        cells.id = { cellKey, field: cell.field };
      } else if (normalized.includes('type') || normalized === 'tech_type') {
        cells.type = { cellKey, field: cell.field };
      } else if (normalized.includes('tn') || normalized.includes('phone') || normalized.includes('tel')) {
        cells.tn = { cellKey, field: cell.field };
      }
    }
  });

  return cells;
};

/**
 * Initialize checklist with N/A defaults
 * Creates a Record with indices mapped to "N/A" values
 */
export const getDefaultChecklistValue = (items: string[]) => {
  const defaultValue: Record<number, string> = {};
  items.forEach((_, index) => {
    defaultValue[index] = "N/A";
  });
  return defaultValue;
};

/**
 * Extract technician names from work order data
 * Handles various data formats and field naming conventions
 */
export const extractTechnicianNames = (workOrderData: any): string[] => {
  const names: string[] = [];

  // Handle different possible data structures
  if (workOrderData?.technicians) {
    if (Array.isArray(workOrderData.technicians)) {
      names.push(...workOrderData.technicians.map((t: any) => t.name || t));
    }
  }

  if (workOrderData?.techs) {
    if (Array.isArray(workOrderData.techs)) {
      names.push(...workOrderData.techs.map((t: any) => t.name || t));
    }
  }

  return [...new Set(names)]; // Remove duplicates
};
