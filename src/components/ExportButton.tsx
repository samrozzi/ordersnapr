import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { exportToCSV, exportToExcel, ExportColumn } from "@/lib/export-csv";
import { toast } from "sonner";

interface ExportButtonProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
}

export function ExportButton<T extends Record<string, any>>({
  data,
  columns,
  filename = "export",
  variant = "outline",
  size = "default",
  disabled = false,
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "csv" | "excel") => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    setIsExporting(true);

    try {
      const timestamp = new Date().toISOString().split("T")[0];
      const fullFilename = `${filename}_${timestamp}.csv`;

      if (format === "excel") {
        exportToExcel(data, columns, fullFilename);
        toast.success(`Exported ${data.length} rows to Excel`);
      } else {
        exportToCSV(data, columns, fullFilename);
        toast.success(`Exported ${data.length} rows to CSV`);
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled || isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileText className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
