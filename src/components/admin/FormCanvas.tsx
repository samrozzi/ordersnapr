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

  // Create a flat map of all fields with their section IDs
  const fieldToSectionMap = new Map<string, string>();
  sections.forEach(section => {
    section.fields.forEach(field => {
      fieldToSectionMap.set(field.id, section.id);
    });
  });

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

  const handleRemoveField = (sectionId: string, fieldId: string) => {
    onSectionsChange(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
          : s
      )
    );
  };

  const handleCopyField = (sectionId: string, fieldId: string) => {
    onSectionsChange(
      sections.map((s) => {
        if (s.id !== sectionId) return s;
        
        const fieldIndex = s.fields.findIndex((f) => f.id === fieldId);
        if (fieldIndex === -1) return s;
        
        const originalField = s.fields[fieldIndex];
        const copiedField: Field = {
          ...originalField,
          id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          label: `${originalField.label} (Copy)`,
          key: `${originalField.key}_copy_${Date.now()}`,
        };
        
        const newFields = [...s.fields];
        newFields.splice(fieldIndex + 1, 0, copiedField);
        
        return { ...s, fields: newFields };
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    
    if (!over || active.id === over.id) return;

    const activeFieldId = active.id as string;
    const overFieldId = over.id as string;
    
    const activeSectionId = fieldToSectionMap.get(activeFieldId);
    const overSectionId = fieldToSectionMap.get(overFieldId);
    
    if (!activeSectionId || !overSectionId) return;

    // Moving within the same section
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
      // Moving between sections
      const activeSection = sections.find(s => s.id === activeSectionId);
      const overSection = sections.find(s => s.id === overSectionId);
      
      if (!activeSection || !overSection) return;
      
      const activeField = activeSection.fields.find(f => f.id === activeFieldId);
      if (!activeField) return;
      
      const overIndex = overSection.fields.findIndex(f => f.id === overFieldId);
      
      onSectionsChange(
        sections.map((section) => {
          if (section.id === activeSectionId) {
            // Remove from source section
            return {
              ...section,
              fields: section.fields.filter(f => f.id !== activeFieldId),
            };
          } else if (section.id === overSectionId) {
            // Add to target section
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

  // Get all field IDs for DndContext
  const allFieldIds = sections.flatMap(section => section.fields.map(f => f.id));
  
  const activeField = activeId 
    ? sections.flatMap(s => s.fields).find(f => f.id === activeId)
    : null;

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
                    section.fields.map((field) => (
                      <SortableFieldCard
                        key={field.id}
                        field={field}
                        onFieldClick={() => onFieldClick(section.id, field.id)}
                        onCopy={() => handleCopyField(section.id, field.id)}
                        onRemove={() => handleRemoveField(section.id, field.id)}
                      />
                    ))
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

function SortableFieldCard({
  field,
  onFieldClick,
  onCopy,
  onRemove,
}: {
  field: Field;
  onFieldClick: () => void;
  onCopy: () => void;
  onRemove: () => void;
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
        isDragging && "shadow-lg"
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
