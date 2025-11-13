import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Settings, Trash2, Plus, ChevronDown, ChevronRight, Edit2, Copy, Eye, EyeOff, ArrowDown, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldType } from "./FieldPalette";
import { fieldTypes } from "./FieldPalette";

export interface Field {
  id: string;
  key: string; // Auto-generated from label, used in form data
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  hideLabel?: boolean; // Option to hide label in form display
  
  // Text formatting - Available for ALL field types
  boldText?: boolean; // Display text in bold
  underlineText?: boolean; // Display text with underline
  fontSize?: string; // Custom font size (e.g., "12pt", "14pt")
  
  // Text/Textarea specific
  maxLength?: number;
  default?: string;
  
  // Number specific
  min?: number;
  max?: number;
  
  // Select/Radio/Checklist specific
  options?: string[];
  items?: string[]; // For checklist backwards compatibility
  responseOptions?: string[]; // For checklist answer buttons (OK, DEV, N/A)
  
  // File upload specific
  accept?: string[];
  maxFiles?: number;
  allowCaptions?: boolean;
  
  // Repeating group specific
  fields?: Field[]; // Nested fields for repeating groups
  minInstances?: number;
  maxInstances?: number;
  
  // Table layout specific
  tableRows?: number;
  tableColumns?: number;
  tableCells?: Record<string, TableCell>; // Keyed by "row-col" (e.g., "0-1")
  showBorders?: boolean;
  borderStyle?: 'all' | 'outer' | 'none' | 'custom';
  customBorders?: Record<string, boolean>; // Cell-specific border visibility
}

export interface TableCell {
  field?: Field; // The form field in this cell
  colSpan?: number; // Allow merging cells horizontally
  rowSpan?: number; // Allow merging cells vertically
  isEmpty?: boolean; // Empty cells for layout
}

export interface Section {
  id: string;
  title: string;
  fields: Field[];
  collapsed: boolean;
  hideTitle?: boolean;
}

interface FormCanvasProps {
  sections: Section[];
  onSectionsChange: (sections: Section[]) => void;
  onFieldClick: (sectionId: string, fieldId: string) => void;
  onAddSection: () => void;
  isAnyFieldDragging?: boolean;
  onTableCellClick?: (tableFieldId: string, cellKey: string) => void;
  onCellFieldRemove?: (sectionId: string, cellFieldId: string, tableFieldId: string, cellKey: string) => void;
}

export function FormCanvas({
  sections,
  onSectionsChange,
  onFieldClick,
  onAddSection,
  isAnyFieldDragging = false,
  onTableCellClick,
  onCellFieldRemove,
}: FormCanvasProps) {
  // Create a flat map of all fields with their section IDs and parent field IDs
  const fieldToSectionMap = new Map<string, string>();
  const fieldToParentMap = new Map<string, string>(); // Maps sub-field ID to parent repeating group ID
  
  sections.forEach(section => {
    section.fields.forEach(field => {
      fieldToSectionMap.set(field.id, section.id);
      // Map nested fields
      if (field.fields) {
        field.fields.forEach(subField => {
          fieldToSectionMap.set(subField.id, section.id);
          fieldToParentMap.set(subField.id, field.id);
        });
      }
    });
  });

  // Helper to find a field by ID (including nested)
  const findFieldById = (fieldId: string): Field | null => {
    for (const section of sections) {
      for (const field of section.fields) {
        if (field.id === fieldId) return field;
        if (field.fields) {
          const subField = field.fields.find(f => f.id === fieldId);
          if (subField) return subField;
        }
      }
    }
    return null;
  };

  const handleRemoveField = (sectionId: string, fieldId: string, parentFieldId?: string) => {
    onSectionsChange(
      sections.map((s) => {
        if (s.id !== sectionId) return s;
        
        if (parentFieldId) {
          // Remove from parent's nested fields
          return {
            ...s,
            fields: s.fields.map(f =>
              f.id === parentFieldId && f.fields
                ? { ...f, fields: f.fields.filter(sf => sf.id !== fieldId) }
                : f
            )
          };
        } else {
          // Remove from section fields
          return { ...s, fields: s.fields.filter((f) => f.id !== fieldId) };
        }
      })
    );
  };

  const handleCopyField = (sectionId: string, fieldId: string, parentFieldId?: string) => {
    onSectionsChange(
      sections.map((s) => {
        if (s.id !== sectionId) return s;
        
        if (parentFieldId) {
          // Copy within parent's nested fields
          return {
            ...s,
            fields: s.fields.map(f => {
              if (f.id !== parentFieldId || !f.fields) return f;
              
              const fieldIndex = f.fields.findIndex(sf => sf.id === fieldId);
              if (fieldIndex === -1) return f;
              
              const originalField = f.fields[fieldIndex];
              const copiedField: Field = {
                ...originalField,
                id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                label: `${originalField.label} (Copy)`,
                key: `${originalField.key}_copy_${Date.now()}`,
              };
              
              const newFields = [...f.fields];
              newFields.splice(fieldIndex + 1, 0, copiedField);
              
              return { ...f, fields: newFields };
            })
          };
        } else {
          // Copy at section level
          const fieldIndex = s.fields.findIndex((f) => f.id === fieldId);
          if (fieldIndex === -1) return s;
          
          const originalField = s.fields[fieldIndex];
          const copiedField: Field = {
            ...originalField,
            id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            label: `${originalField.label} (Copy)`,
            key: `${originalField.key}_copy_${Date.now()}`,
            fields: originalField.fields ? originalField.fields.map(sf => ({
              ...sf,
              id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            })) : undefined,
          };
          
          const newFields = [...s.fields];
          newFields.splice(fieldIndex + 1, 0, copiedField);
          
          return { ...s, fields: newFields };
        }
      })
    );
  };

  const handleSectionTitleChange = (sectionId: string, title: string) => {
    onSectionsChange(
      sections.map((s) => (s.id === sectionId ? { ...s, title } : s))
    );
  };

  const handleToggleCollapse = (sectionId: string) => {
    onSectionsChange(
      sections.map((s) => (s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s))
    );
  };

  const handleToggleHideTitle = (sectionId: string) => {
    onSectionsChange(
      sections.map((s) => (s.id === sectionId ? { ...s, hideTitle: !s.hideTitle } : s))
    );
  };

  const handleRemoveSection = (sectionId: string) => {
    onSectionsChange(sections.filter((s) => s.id !== sectionId));
  };

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-xl bg-muted/20">
        <p className="text-muted-foreground mb-4 text-center max-w-md">
          Drag a field type here or click + Add Section to start building your form
        </p>
        <Button type="button" onClick={onAddSection} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <Card key={section.id} className="overflow-hidden transition-all">
          {/* Section Header */}
          <div className="bg-muted/50 border-b px-4 py-3 flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={() => handleToggleCollapse(section.id)}
              >
                {section.collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              
              <Input
                value={section.title}
                onChange={(e) => handleSectionTitleChange(section.id, e.target.value)}
                className="font-medium bg-transparent border-none h-7 px-2 flex-1"
                placeholder="Section Title"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={() => handleToggleHideTitle(section.id)}
                title={section.hideTitle ? "Show section title" : "Hide section title"}
              >
                {section.hideTitle ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemoveSection(section.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Section Content */}
            {!section.collapsed && (
              <div className="p-4 space-y-3">
                <SortableContext
                  items={section.fields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {section.fields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                      Drag fields here or add from the palette
                    </div>
                  ) : (
                    section.fields.map((field) =>
                      field.type === "repeating_group" ? (
                        <RepeatingGroupFieldCard
                          key={field.id}
                          field={field}
                          sectionId={section.id}
                          onFieldClick={onFieldClick}
                          onCopy={handleCopyField}
                          onRemove={handleRemoveField}
                          onTableCellClick={onTableCellClick}
                          onCellFieldRemove={onCellFieldRemove}
                        />
                      ) : field.type === "table_layout" ? (
                        <TableLayoutFieldCard
                          key={field.id}
                          field={field}
                          sectionId={section.id}
                          onFieldClick={onFieldClick}
                          onCopy={handleCopyField}
                          onRemove={handleRemoveField}
                          isAnyFieldDragging={isAnyFieldDragging}
                          onCellClick={onTableCellClick}
                          onCellFieldRemove={onCellFieldRemove}
                        />
                      ) : (
                        <SortableFieldCard
                          key={field.id}
                          field={field}
                          onFieldClick={() => onFieldClick(section.id, field.id)}
                          onCopy={() => handleCopyField(section.id, field.id)}
                          onRemove={() => handleRemoveField(section.id, field.id)}
                        />
                      )
                    )
                  )}
                </SortableContext>
              </div>
            )}
          </Card>
        ))}

        <Button type="button" onClick={onAddSection} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>
  );
}

function RepeatingGroupFieldCard({
  field,
  sectionId,
  onFieldClick,
  onCopy,
  onRemove,
  onTableCellClick,
  onCellFieldRemove,
}: {
  field: Field;
  sectionId: string;
  onFieldClick: (sectionId: string, fieldId: string, parentFieldId?: string) => void;
  onCopy: (sectionId: string, fieldId: string, parentFieldId?: string) => void;
  onRemove: (sectionId: string, fieldId: string, parentFieldId?: string) => void;
  onTableCellClick?: (tableFieldId: string, cellKey: string) => void;
  onCellFieldRemove?: (sectionId: string, cellFieldId: string, tableFieldId: string, cellKey: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldDef = fieldTypes.find((ft) => ft.type === field.type);
  const Icon = fieldDef?.icon || Edit2;
  const subFieldCount = field.fields?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border-2 border-primary/30 bg-card transition-all",
        isDragging && "shadow-lg"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-primary/5">
        <button
          type="button"
          className="cursor-move touch-none p-1 hover:bg-accent rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-foreground flex items-center gap-2">
            {field.label}
            {field.required && <span className="text-destructive text-xs">*</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {subFieldCount} sub-field{subFieldCount !== 1 ? 's' : ''} • Min: {(field as any).minInstances || 1} • Max: {(field as any).maxInstances || 20}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onFieldClick(sectionId, field.id)}
            title="Edit repeating group settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCopy(sectionId, field.id)}
            title="Duplicate repeating group"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => onRemove(sectionId, field.id)}
            title="Delete repeating group"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Nested Fields */}
      {isExpanded && <DropZoneForRepeatingGroup field={field} sectionId={sectionId} onFieldClick={onFieldClick} onCopy={onCopy} onRemove={onRemove} onTableCellClick={onTableCellClick} onCellFieldRemove={onCellFieldRemove} />}
    </div>
  );
}

function DropZoneForRepeatingGroup({ field, sectionId, onFieldClick, onCopy, onRemove, onTableCellClick, onCellFieldRemove }: {
  field: Field;
  sectionId: string;
  onFieldClick: (sectionId: string, fieldId: string, parentFieldId?: string) => void;
  onCopy: (sectionId: string, fieldId: string, parentFieldId?: string) => void;
  onRemove: (sectionId: string, fieldId: string, parentFieldId?: string) => void;
  onTableCellClick?: (tableFieldId: string, cellKey: string) => void;
  onCellFieldRemove?: (sectionId: string, cellFieldId: string, tableFieldId: string, cellKey: string) => void;
}) {
  const dropZoneId = `${field.id}-drop-zone`;
  const { setNodeRef, isOver } = useDroppable({ id: dropZoneId });

  return (
    <div className="p-4 pl-12 space-y-2 bg-muted/20 border-t">
      {field.fields && field.fields.length > 0 ? (
        <SortableContext
          items={field.fields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          {field.fields.map((subField) => {
            if (subField.type === 'table_layout') {
              return (
                <TableLayoutFieldCard
                  key={subField.id}
                  field={subField}
                  sectionId={sectionId}
                  onFieldClick={(secId, fieldId) => onFieldClick(secId, fieldId, field.id)}
                  onCopy={(secId, fieldId) => onCopy(secId, fieldId, field.id)}
                  onRemove={(secId, fieldId) => onRemove(secId, fieldId, field.id)}
                  onCellClick={onTableCellClick}
                  onCellFieldRemove={onCellFieldRemove}
                  isNested
                />
              );
            }
            return (
              <SortableFieldCard
                key={subField.id}
                field={subField}
                onFieldClick={() => onFieldClick(sectionId, subField.id, field.id)}
                onCopy={() => onCopy(sectionId, subField.id, field.id)}
                onRemove={() => onRemove(sectionId, subField.id, field.id)}
                isNested
              />
            );
          })}
        </SortableContext>
      ) : (
        <div
          ref={setNodeRef}
          className={cn(
            "text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg bg-background transition-all",
            isOver && "border-primary bg-primary/5 ring-2 ring-primary/20"
          )}
        >
          <p className="mb-2">Drag fields here to add sub-fields</p>
          <p className="text-xs">Sub-fields will repeat for each entry</p>
        </div>
      )}
    </div>
  );
}

function SortableFieldCard({
  field,
  onFieldClick,
  onCopy,
  onRemove,
  isNested = false,
}: {
  field: Field;
  onFieldClick: () => void;
  onCopy: () => void;
  onRemove: () => void;
  isNested?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldDef = fieldTypes.find((ft) => ft.type === field.type);
  const Icon = fieldDef?.icon || Edit2;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary transition-all",
        isDragging && "shadow-lg",
        isNested && "border-l-4 border-l-primary/50"
      )}
    >
      {/* Drag Handle */}
      <button
        type="button"
        className="cursor-move touch-none p-1 hover:bg-accent rounded"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Field Icon & Info */}
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-foreground flex items-center gap-2">
          {field.label}
          {field.required && <span className="text-destructive text-xs">*</span>}
          {field.hideLabel && <span className="text-xs text-muted-foreground">(Hidden Label)</span>}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {field.placeholder || `${fieldDef?.label} field`}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onFieldClick}
          title="Edit field settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onCopy}
          title="Duplicate field"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
          onClick={onRemove}
          title="Delete field"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Droppable cell component for table preview in FormCanvas
function DroppableCellPreview({
  tableFieldId,
  cellKey,
  cellField,
  borderStyle,
  isAnyFieldDragging,
  onCellClick,
  sectionId,
  onCellFieldClick,
  onCellFieldRemove,
  onCellFieldRename,
}: {
  tableFieldId: string;
  cellKey: string;
  cellField?: Field;
  borderStyle: string;
  isAnyFieldDragging?: boolean;
  onCellClick?: (tableFieldId: string, cellKey: string) => void;
  sectionId: string;
  onCellFieldClick: (sectionId: string, cellFieldId: string, parentTableId: string) => void;
  onCellFieldRemove: (sectionId: string, cellFieldId: string, parentTableId: string, cellKey: string) => void;
  onCellFieldRename?: (sectionId: string, cellFieldId: string, tableFieldId: string, cellKey: string, newLabel: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState('');
  
  const { isOver, setNodeRef } = useDroppable({
    id: `table-${tableFieldId}-cell-${cellKey}`,
    data: {
      type: 'table-cell',
      tableFieldId,
      cellKey,
    },
  });

  const handleStartEdit = () => {
    if (cellField) {
      setEditLabel(cellField.label);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (cellField && editLabel.trim() && editLabel !== cellField.label && onCellFieldRename) {
      onCellFieldRename(sectionId, cellField.id, tableFieldId, cellKey, editLabel.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <td
      ref={setNodeRef}
      onClick={() => !cellField && onCellClick?.(tableFieldId, cellKey)}
      className={cn(
        "relative z-10 p-3 md:p-4 min-w-[120px] md:min-w-[150px] min-h-[60px] transition-all duration-200 pointer-events-auto",
        borderStyle === 'all' && "border border-border",
        !cellField && "border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/70 hover:bg-primary/5",
        isOver && "bg-primary/20 border-primary border-2 scale-105 shadow-lg",
        isAnyFieldDragging && !cellField && "border-primary/50 bg-primary/5",
        cellField && "group/cell-field"
      )}
    >
      {cellField ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {(() => {
              const cellFieldDef = fieldTypes.find(ft => ft.type === cellField.type);
              const CellIcon = cellFieldDef?.icon || Edit2;
              return <CellIcon className="h-3 w-3 text-primary flex-shrink-0" />;
            })()}
            {isEditing ? (
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                className="h-6 text-xs px-1 py-0"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span 
                className="text-xs font-medium truncate cursor-pointer hover:text-primary"
                onDoubleClick={handleStartEdit}
                title="Double-click to edit"
              >
                {cellField.label}
              </span>
            )}
          </div>
          {/* Action buttons - shown on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover/cell-field:opacity-100 transition-opacity">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                handleStartEdit();
              }}
              title="Rename"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onCellFieldClick(sectionId, cellField.id, tableFieldId);
              }}
              title="Edit field settings"
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onCellFieldRemove(sectionId, cellField.id, tableFieldId, cellKey);
              }}
              title="Remove field"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className={cn(
          "flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs transition-all",
          isOver && "text-primary font-medium"
        )}>
          {isOver ? (
            <>
              <Plus className="h-4 w-4 animate-pulse" />
              <span>Drop here</span>
            </>
          ) : isAnyFieldDragging ? (
            <>
              <ArrowDown className="h-4 w-4" />
              <span>Drop field here</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span>Click to add</span>
            </>
          )}
        </div>
      )}
    </td>
  );
}

function TableLayoutFieldCard({
  field,
  sectionId,
  onFieldClick,
  onCopy,
  onRemove,
  isAnyFieldDragging,
  onCellClick,
  onCellFieldRemove,
  isNested = false,
}: {
  field: Field;
  sectionId: string;
  onFieldClick: (sectionId: string, fieldId: string) => void;
  onCopy: (sectionId: string, fieldId: string) => void;
  onRemove: (sectionId: string, fieldId: string) => void;
  isAnyFieldDragging?: boolean;
  onCellClick?: (tableFieldId: string, cellKey: string) => void;
  onCellFieldRemove?: (sectionId: string, cellFieldId: string, tableFieldId: string, cellKey: string) => void;
  isNested?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ 
      id: field.id,
      disabled: isAnyFieldDragging
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldDef = fieldTypes.find((ft) => ft.type === field.type);
  const Icon = fieldDef?.icon || Edit2;
  const rows = field.tableRows || 2;
  const columns = field.tableColumns || 2;
  const borderStyle = field.borderStyle || 'all';
  const tableCells = field.tableCells || {};
  
  const cellCount = Object.values(tableCells).filter(cell => cell.field).length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border-2 border-accent bg-card transition-all",
        isDragging && "shadow-lg",
        isNested && "border-l-4 border-l-primary/50"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-accent/30 pointer-events-auto relative z-20">
        <button
          type="button"
          className={cn(
            "cursor-move touch-none p-1 hover:bg-accent rounded",
            isAnyFieldDragging && "opacity-30 cursor-not-allowed"
          )}
          {...attributes}
          {...listeners}
          disabled={isAnyFieldDragging}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-foreground flex items-center gap-2">
            {field.label}
            {field.required && <span className="text-destructive text-xs">*</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {rows}×{columns} table • {cellCount} field{cellCount !== 1 ? 's' : ''} • {borderStyle} borders
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onFieldClick(sectionId, field.id)}
            title="Edit table layout"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCopy(sectionId, field.id)}
            title="Duplicate table"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => onRemove(sectionId, field.id)}
            title="Delete table"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table Preview */}
      <div className="p-4 bg-muted/10 relative z-0 pointer-events-auto">
        <div className="overflow-x-auto">
          <table className={cn(
            "w-full border-collapse text-xs",
            borderStyle === 'all' && "border border-border",
            borderStyle === 'outer' && "border-2 border-border"
          )}>
            <tbody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: columns }).map((_, colIndex) => {
                    const cellKey = `${rowIndex}-${colIndex}`;
                    const cell = tableCells[cellKey];
                    const cellField = cell?.field;

                    return (
                      <DroppableCellPreview
                        key={colIndex}
                        tableFieldId={field.id}
                        cellKey={cellKey}
                        cellField={cellField}
                        borderStyle={borderStyle}
                        isAnyFieldDragging={isAnyFieldDragging}
                        onCellClick={onCellClick}
                        sectionId={sectionId}
                        onCellFieldClick={onFieldClick}
                        onCellFieldRemove={(secId, cellFieldId, parentTableId, cellKey) => {
                          onCellFieldRemove?.(secId, cellFieldId, parentTableId, cellKey);
                        }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
