import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Table2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Field, TableCell } from "./FormCanvas";
import { fieldTypes, type FieldType } from "./FieldPalette";

interface TableFieldEditorProps {
  field: Field;
  onFieldUpdate: (field: Field) => void;
}

export function TableFieldEditor({ field, onFieldUpdate }: TableFieldEditorProps) {
  const rows = field.tableRows || 2;
  const columns = field.tableColumns || 2;
  const tableCells = field.tableCells || {};
  const borderStyle = field.borderStyle || 'all';
  
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  const handleRowsChange = (newRows: number) => {
    const safeRows = Math.max(1, Math.min(10, newRows));
    onFieldUpdate({
      ...field,
      tableRows: safeRows,
    });
  };

  const handleColumnsChange = (newColumns: number) => {
    const safeColumns = Math.max(1, Math.min(6, newColumns));
    onFieldUpdate({
      ...field,
      tableColumns: safeColumns,
    });
  };

  const handleBorderStyleChange = (style: 'all' | 'outer' | 'none' | 'custom') => {
    onFieldUpdate({
      ...field,
      borderStyle: style,
      showBorders: style !== 'none',
    });
  };

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    setSelectedCell(cellKey);
  };

  const handleAddFieldToCell = (cellKey: string, fieldType: FieldType) => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const fieldDef = fieldTypes.find(ft => ft.type === fieldType);
    const label = fieldDef?.label || "Field";

    const newField: Field = {
      id: `field-${timestamp}-${randomId}`,
      key: label.toLowerCase().replace(/\s+/g, '_'),
      type: fieldType,
      label: label,
      placeholder: "",
      required: false,
    };

    const updatedCells = {
      ...tableCells,
      [cellKey]: {
        ...tableCells[cellKey],
        field: newField,
      },
    };

    onFieldUpdate({
      ...field,
      tableCells: updatedCells,
    });
    
    setSelectedCell(null);
  };

  const handleRemoveFieldFromCell = (cellKey: string) => {
    const updatedCells = {
      ...tableCells,
      [cellKey]: {
        ...tableCells[cellKey],
        field: undefined,
      },
    };

    onFieldUpdate({
      ...field,
      tableCells: updatedCells,
    });
  };

  const handleFieldLabelChange = (cellKey: string, newLabel: string) => {
    const cell = tableCells[cellKey];
    if (!cell?.field) return;

    const updatedField = {
      ...cell.field,
      label: newLabel,
      key: newLabel.toLowerCase().replace(/\s+/g, '_'),
    };

    const updatedCells = {
      ...tableCells,
      [cellKey]: {
        ...cell,
        field: updatedField,
      },
    };

    onFieldUpdate({
      ...field,
      tableCells: updatedCells,
    });
  };

  const simpleFieldTypes: FieldType[] = ['text', 'number', 'date', 'time', 'select'];

  return (
    <div className="space-y-4">
      {/* Dimensions */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="table-rows">Rows</Label>
          <Input
            id="table-rows"
            type="number"
            value={rows}
            onChange={(e) => handleRowsChange(parseInt(e.target.value) || 2)}
            min="1"
            max="10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="table-columns">Columns</Label>
          <Input
            id="table-columns"
            type="number"
            value={columns}
            onChange={(e) => handleColumnsChange(parseInt(e.target.value) || 2)}
            min="1"
            max="6"
          />
        </div>
      </div>

      {/* Border Style */}
      <div className="space-y-2">
        <Label htmlFor="border-style">Border Style</Label>
        <Select value={borderStyle} onValueChange={handleBorderStyleChange}>
          <SelectTrigger id="border-style">
            <SelectValue placeholder="Select border style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Borders</SelectItem>
            <SelectItem value="outer">Outer Only</SelectItem>
            <SelectItem value="none">No Borders</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table Preview */}
      <div className="space-y-2">
        <Label>Table Preview</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Click a cell to add a field
        </p>
        <div className="border rounded-lg p-4 bg-muted/20 overflow-x-auto">
          <table className={cn(
            "w-full border-collapse",
            borderStyle === 'all' && "border border-border",
            borderStyle === 'outer' && "border-2 border-border"
          )}>
            <tbody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: columns }).map((_, colIndex) => {
                    const cellKey = `${rowIndex}-${colIndex}`;
                    const cell = tableCells[cellKey];
                    const hasField = !!cell?.field;

                    return (
                      <td
                        key={colIndex}
                        className={cn(
                          "p-3 min-w-[120px] transition-colors",
                          borderStyle === 'all' && "border border-border",
                          selectedCell === cellKey && "bg-primary/10 ring-2 ring-primary",
                          !hasField && "cursor-pointer hover:bg-accent"
                        )}
                        onClick={() => !hasField && handleCellClick(rowIndex, colIndex)}
                      >
                        {hasField ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {(() => {
                                  const fieldDef = fieldTypes.find(ft => ft.type === cell.field?.type);
                                  const Icon = fieldDef?.icon || Table2;
                                  return (
                                    <div className="flex-shrink-0">
                                      <Icon className="h-3 w-3 text-primary" />
                                    </div>
                                  );
                                })()}
                                <Input
                                  value={cell.field?.label || ""}
                                  onChange={(e) => handleFieldLabelChange(cellKey, e.target.value)}
                                  className="h-7 text-xs"
                                  placeholder="Field label"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFieldFromCell(cellKey);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {fieldTypes.find(ft => ft.type === cell.field?.type)?.label}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-xs text-muted-foreground py-2">
                            Click to add field
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field Type Selector (shown when a cell is selected) */}
      {selectedCell && (
        <Card className="p-4 bg-primary/5 border-primary/30">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Field Type</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCell(null)}
              >
                Cancel
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {simpleFieldTypes.map((fieldType) => {
                const fieldDef = fieldTypes.find(ft => ft.type === fieldType);
                const Icon = fieldDef?.icon || Table2;
                
                return (
                  <Button
                    key={fieldType}
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 h-auto py-3 justify-start"
                    onClick={() => handleAddFieldToCell(selectedCell, fieldType)}
                  >
                    <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm">{fieldDef?.label}</span>
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Only simple field types are supported in table cells
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
