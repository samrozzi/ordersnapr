import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Settings, Trash2, Plus, ChevronDown, ChevronRight, Edit2, Copy, Eye, EyeOff } from "lucide-react";
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
}

export function FormCanvas({
  sections,
  onSectionsChange,
  onFieldClick,
  onAddSection,
}: FormCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? (over.id as string) : null);
  };

  // Helper to create a new field from a palette field type
  const createFieldFromType = (fieldType: FieldType): Field => {
    const fieldDef = fieldTypes.find(ft => ft.type === fieldType);
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const label = fieldDef?.label || "New Field";
    
    const isChoice = fieldType === "select" || fieldType === "radio" || fieldType === "checklist";
    const isFile = fieldType === "file";

    return {
      id: `field-${timestamp}-${randomId}`,
      key: label.toLowerCase().replace(/\s+/g, '_'),
      type: fieldType,
      label: label,
      placeholder: "",
      required: false,
      options: isChoice ? ["Option 1"] : undefined,
      responseOptions: fieldType === "checklist" ? ["OK", "DEV", "N/A"] : undefined,
      maxFiles: isFile ? 10 : undefined,
      accept: isFile ? ["image/*"] : undefined,
    };
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    
    if (!over || active.id === over.id) return;

    const activeFieldId = active.id as string;
    const overFieldId = over.id as string;
    
    // Check if dragging from palette (field type string) vs existing field (UUID)
    const isDraggingFromPalette = !fieldToSectionMap.has(activeFieldId);
    
    const activeSectionId = fieldToSectionMap.get(activeFieldId);
    const overSectionId = fieldToSectionMap.get(overFieldId);
    
    // Check if dropping into a repeating group drop zone
    const isDropZone = overFieldId.endsWith('-drop-zone');
    const targetRepeatingGroupId = isDropZone ? overFieldId.replace('-drop-zone', '') : overFieldId;
    const effectiveOverSectionId = overSectionId ?? fieldToSectionMap.get(targetRepeatingGroupId);
    
    // Handle dropping from palette into table cell
    if (isDraggingFromPalette && overFieldId.includes("-cell-")) {
      const overData = over.data?.current as any;
      if (overData?.type === 'table-cell') {
        const tableFieldId = overData.tableFieldId;
        const cellKey = overData.cellKey;
        const fieldType = activeFieldId as FieldType;
        
        // Only allow simple field types in table cells
        const allowedTypes: FieldType[] = ['text', 'number', 'date', 'time', 'select', 'checkbox', 'radio'];
        if (!allowedTypes.includes(fieldType)) {
          return;
        }

        const tableSectionId = fieldToSectionMap.get(tableFieldId);
        if (!tableSectionId) return;

        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const fieldDef = fieldTypes.find(ft => ft.type === fieldType);
        const label = fieldDef?.label || "Field";

        onSectionsChange(
          sections.map((section) => {
            if (section.id !== tableSectionId) return section;

            return {
              ...section,
              fields: section.fields.map((field) => {
                if (field.id === tableFieldId && field.type === "table_layout") {
                  const newField: Field = {
                    id: `field-${timestamp}-${randomId}`,
                    key: `${field.key}_row${cellKey.split('-')[0]}_col${cellKey.split('-')[1]}_${label.toLowerCase().replace(/\s+/g, '_')}`,
                    type: fieldType,
                    label: label,
                    placeholder: "",
                    required: false,
                  };

                  const updatedCells = {
                    ...(field.tableCells || {}),
                    [cellKey]: {
                      ...(field.tableCells?.[cellKey] || {}),
                      field: newField,
                    },
                  };

                  return {
                    ...field,
                    tableCells: updatedCells,
                  };
                }
                return field;
              }),
            };
          })
        );
        return;
      }
    }
    
    // Handle dropping from palette into repeating group drop zone
    if (isDraggingFromPalette && isDropZone && targetRepeatingGroupId) {
      const targetSectionId = fieldToSectionMap.get(targetRepeatingGroupId);
      if (!targetSectionId) return;
      
      // Prevent nested repeating groups
      if (activeFieldId === "repeating_group") return;
      
      const newField = createFieldFromType(activeFieldId as FieldType);
      
      onSectionsChange(
        sections.map((section) => {
          if (section.id !== effectiveOverSectionId) return section;
          
          return {
            ...section,
            fields: section.fields.map(f => {
              if (f.id === targetRepeatingGroupId) {
                return {
                  ...f,
                  fields: [...(f.fields || []), newField]
                };
              }
              return f;
            })
          };
        })
      );
      return;
    }
    
    // For existing field movements, require section IDs
    if (!isDraggingFromPalette && (!activeSectionId || !effectiveOverSectionId)) return;
    
    const activeParentId = fieldToParentMap.get(activeFieldId);
    const overParentId = fieldToParentMap.get(overFieldId);
    const overField = findFieldById(targetRepeatingGroupId);
    
    // Prevent dropping repeating group into another repeating group
    const activeField = findFieldById(activeFieldId);
    if (activeField?.type === "repeating_group" && (overParentId || isDropZone)) {
      return; // Can't nest repeating groups
    }

    // Scenario: Dropping INTO a repeating group container (either on the container or its drop zone)
    if (overField?.type === "repeating_group" && !overParentId) {
      onSectionsChange(
        sections.map((section) => {
          if (section.id !== effectiveOverSectionId) return section;

          // Remove from source
          const removeFromFields = (fields: Field[]): Field[] => {
            return fields.filter(f => {
              if (f.id === activeFieldId) return false;
              if (f.fields) {
                f.fields = removeFromFields(f.fields);
              }
              return true;
            });
          };

          const cleanedFields = removeFromFields([...section.fields]);

          // Add to target repeating group
          return {
            ...section,
            fields: cleanedFields.map(f => {
              if (f.id === targetRepeatingGroupId && activeField) {
                return {
                  ...f,
                  fields: [...(f.fields || []), { ...activeField, id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }]
                };
              }
              return f;
            })
          };
        })
      );
      return;
    }

    // Scenario: Moving within the same repeating group
    if (activeParentId && overParentId && activeParentId === overParentId) {
      onSectionsChange(
        sections.map((section) => {
          if (section.id !== activeSectionId) return section;

          return {
            ...section,
            fields: section.fields.map(f => {
              if (f.id !== activeParentId || !f.fields) return f;

              const oldIndex = f.fields.findIndex(sf => sf.id === activeFieldId);
              const newIndex = f.fields.findIndex(sf => sf.id === overFieldId);

              return {
                ...f,
                fields: arrayMove(f.fields, oldIndex, newIndex),
              };
            })
          };
        })
      );
      return;
    }

    // Scenario: Moving from repeating group to section or vice versa
    if (activeParentId || overParentId) {
      onSectionsChange(
        sections.map((section) => {
          if (section.id !== activeSectionId && section.id !== effectiveOverSectionId) return section;

          let updatedFields = [...section.fields];

          // Remove from source
          if (activeParentId && section.id === activeSectionId) {
            updatedFields = updatedFields.map(f => {
              if (f.id === activeParentId && f.fields) {
                return { ...f, fields: f.fields.filter(sf => sf.id !== activeFieldId) };
              }
              return f;
            });
          } else if (!activeParentId && section.id === activeSectionId) {
            updatedFields = updatedFields.filter(f => f.id !== activeFieldId);
          }

          // Add to target
          if (overParentId && section.id === effectiveOverSectionId && activeField) {
            updatedFields = updatedFields.map(f => {
              if (f.id === overParentId && f.fields) {
                const overIndex = f.fields.findIndex(sf => sf.id === overFieldId);
                const newFields = [...f.fields];
                newFields.splice(overIndex, 0, activeField);
                return { ...f, fields: newFields };
              }
              return f;
            });
          } else if (!overParentId && section.id === effectiveOverSectionId && activeField) {
            const overIndex = updatedFields.findIndex(f => f.id === overFieldId);
            updatedFields.splice(overIndex, 0, activeField);
          }

          return { ...section, fields: updatedFields };
        })
      );
      return;
    }

    // Regular section-level movement (existing logic)
    if (activeSectionId === overSectionId) {
      onSectionsChange(
        sections.map((section) => {
          if (section.id !== activeSectionId) return section;

          const oldIndex = section.fields.findIndex((f) => f.id === activeFieldId);
          const newIndex = section.fields.findIndex((f) => f.id === overFieldId);

          return {
            ...section,
            fields: arrayMove(section.fields, oldIndex, newIndex),
          };
        })
      );
    } else {
      const activeSection = sections.find(s => s.id === activeSectionId);
      const overSection = sections.find(s => s.id === overSectionId);
      
      if (!activeSection || !overSection) return;
      
      const activeField = activeSection.fields.find(f => f.id === activeFieldId);
      if (!activeField) return;
      
      const overIndex = overSection.fields.findIndex(f => f.id === overFieldId);
      
      onSectionsChange(
        sections.map((section) => {
          if (section.id === activeSectionId) {
            return {
              ...section,
              fields: section.fields.filter(f => f.id !== activeFieldId),
            };
          } else if (section.id === overSectionId) {
            const newFields = [...section.fields];
            newFields.splice(overIndex, 0, activeField);
            return {
              ...section,
              fields: newFields,
            };
          }
          return section;
        })
      );
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-xl bg-muted/20">
        <p className="text-muted-foreground mb-4 text-center max-w-md">
          Drag a field type here or click + Add Section to start building your form
        </p>
        <Button onClick={onAddSection} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>
    );
  }

  // Get all field IDs for DndContext (including nested and drop zones)
  const allFieldIds: string[] = [];
  sections.forEach(section => {
    section.fields.forEach(field => {
      allFieldIds.push(field.id);
      if (field.type === "repeating_group") {
        allFieldIds.push(`${field.id}-drop-zone`); // Add drop zone ID
      }
      if (field.fields) {
        field.fields.forEach(subField => allFieldIds.push(subField.id));
      }
    });
  });
  
  const activeField = activeId ? findFieldById(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-6">
        {sections.map((section) => (
          <Card 
            key={section.id} 
            className={cn(
              "overflow-hidden transition-all",
              overId && fieldToSectionMap.get(overId) === section.id && "ring-2 ring-primary"
            )}
          >
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
                        />
                      ) : field.type === "table_layout" ? (
                        <TableLayoutFieldCard
                          key={field.id}
                          field={field}
                          sectionId={section.id}
                          onFieldClick={onFieldClick}
                          onCopy={handleCopyField}
                          onRemove={handleRemoveField}
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

        <Button onClick={onAddSection} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>

      <DragOverlay>
        {activeField ? (
          <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-primary bg-card shadow-lg opacity-90">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              {(() => {
                const fieldDef = fieldTypes.find((ft) => ft.type === activeField.type);
                const Icon = fieldDef?.icon || Edit2;
                return <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />;
              })()}
            </div>
            <div className="font-medium text-sm">{activeField.label}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function RepeatingGroupFieldCard({
  field,
  sectionId,
  onFieldClick,
  onCopy,
  onRemove,
}: {
  field: Field;
  sectionId: string;
  onFieldClick: (sectionId: string, fieldId: string, parentFieldId?: string) => void;
  onCopy: (sectionId: string, fieldId: string, parentFieldId?: string) => void;
  onRemove: (sectionId: string, fieldId: string, parentFieldId?: string) => void;
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
      {isExpanded && <DropZoneForRepeatingGroup field={field} sectionId={sectionId} onFieldClick={onFieldClick} onCopy={onCopy} onRemove={onRemove} />}
    </div>
  );
}

function DropZoneForRepeatingGroup({ field, sectionId, onFieldClick, onCopy, onRemove }: {
  field: Field;
  sectionId: string;
  onFieldClick: (sectionId: string, fieldId: string, parentFieldId?: string) => void;
  onCopy: (sectionId: string, fieldId: string, parentFieldId?: string) => void;
  onRemove: (sectionId: string, fieldId: string, parentFieldId?: string) => void;
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
          {field.fields.map((subField) => (
            <SortableFieldCard
              key={subField.id}
              field={subField}
              onFieldClick={() => onFieldClick(sectionId, subField.id, field.id)}
              onCopy={() => onCopy(sectionId, subField.id, field.id)}
              onRemove={() => onRemove(sectionId, subField.id, field.id)}
              isNested
            />
          ))}
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

function TableLayoutFieldCard({
  field,
  sectionId,
  onFieldClick,
  onCopy,
  onRemove,
}: {
  field: Field;
  sectionId: string;
  onFieldClick: (sectionId: string, fieldId: string) => void;
  onCopy: (sectionId: string, fieldId: string) => void;
  onRemove: (sectionId: string, fieldId: string) => void;
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
        isDragging && "shadow-lg"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-accent/30">
        <button
          type="button"
          className="cursor-move touch-none p-1 hover:bg-accent rounded"
          {...attributes}
          {...listeners}
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
      <div className="p-4 bg-muted/10">
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
                      <td
                        key={colIndex}
                        className={cn(
                          "p-2 min-w-[100px]",
                          borderStyle === 'all' && "border border-border"
                        )}
                      >
                        {cellField ? (
                          <div className="flex items-center gap-2">
                            {(() => {
                              const cellFieldDef = fieldTypes.find(ft => ft.type === cellField.type);
                              const CellIcon = cellFieldDef?.icon || Edit2;
                              return <CellIcon className="h-3 w-3 text-primary flex-shrink-0" />;
                            })()}
                            <span className="text-xs font-medium truncate">{cellField.label}</span>
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground text-xs">
                            Empty
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
    </div>
  );
}
