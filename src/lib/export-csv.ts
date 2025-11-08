/**
 * Export utilities for converting data to CSV/Excel formats
 */

export interface ExportColumn<T> {
  key: keyof T | string;
  label: string;
  format?: (value: any, row: T) => string;
}

/**
 * Convert data to CSV format
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string = "export.csv"
) {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  // Create CSV header
  const header = columns.map((col) => `"${col.label}"`).join(",");

  // Create CSV rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let value: any;

        // Handle nested keys like "creator.full_name"
        if (typeof col.key === "string" && col.key.includes(".")) {
          const keys = col.key.split(".");
          value = keys.reduce((obj, key) => obj?.[key], row);
        } else {
          value = row[col.key as keyof T];
        }

        // Apply custom formatter if provided
        if (col.format) {
          value = col.format(value, row);
        }

        // Handle null/undefined
        if (value === null || value === undefined) {
          return '""';
        }

        // Handle dates
        if (value instanceof Date) {
          value = value.toISOString();
        }

        // Handle objects/arrays
        if (typeof value === "object") {
          value = JSON.stringify(value);
        }

        // Escape quotes and wrap in quotes
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(",");
  });

  // Combine header and rows
  const csv = [header, ...rows].join("\n");

  // Create blob and download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return csv;
}

/**
 * Export to Excel-compatible CSV (with BOM for UTF-8)
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string = "export.csv"
) {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  // Create CSV with BOM for Excel UTF-8 support
  const csv = exportToCSV(data, columns, filename);
  const BOM = "\uFEFF";

  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format date for export
 */
export function formatDateForExport(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString() + " " + d.toLocaleTimeString();
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "";
  return `$${amount.toFixed(2)}`;
}

/**
 * Format boolean for export
 */
export function formatBooleanForExport(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value ? "Yes" : "No";
}

/**
 * Flatten nested object for export
 */
export function flattenObject(obj: any, prefix: string = ""): Record<string, any> {
  const flattened: Record<string, any> = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  });

  return flattened;
}
