import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Plus, GripVertical } from "lucide-react";
import { FieldPalette, type FieldType, fieldTypes } from "./FieldPalette";
import { FormCanvas, type Section, type Field } from "./FormCanvas";
import { FieldPropertiesPanel } from "./FieldPropertiesPanel";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { CellFieldPickerDialog } from "./CellFieldPickerDialog";
import { toast } from "sonner";

interface TemplateBuilderV2Props {
  schema: any;
  onSchemaChange: (schema: any) => void;
}

export function TemplateBuilderV2({ schema, onSchemaChange }: TemplateBuilderV2Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [requireSignature, setRequireSignature] = useState(false);
  const [useOrgTheme, setUseOrgTheme] = useState(false);
  const [alternatingBackground, setAlternatingBackground] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedField, setSelectedField] = useState<{
    sectionId: string;
    fieldId: string;
    parentFieldId?: string;
  } | null>(null);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  
  // Cell picker dialog state
  const [cellPickerOpen, setCellPickerOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    tableFieldId: string;
    cellKey: string;
  } | null>(null);
  
  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 15 },
    }),
    useSensor(KeyboardSensor)
  );

  const generateKey = useCallback((label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  }, []);

  // Load initial schema
  useEffect(() => {
    if (schema?.sections) {
      const loadedSections: Section[] = schema.sections.map((s: any) => ({
        id: s.id || crypto.randomUUID(),
        title: s.title || "Untitled Section",
        collapsed: false,
        hideTitle: s.hideTitle ?? false,
        fields: (s.fields || []).map((f: any) => ({
          id: f.id || crypto.randomUUID(),
          key: f.key || generateKey(f.label || "untitled_field"),
          type: f.type === 'job_lookup' ? 'text' : (f.type || "text"),
          label: f.label || "Untitled Field",
          placeholder: f.placeholder,
          required: f.required || false,
          options: f.options || f.items,
          items: f.items,
          responseOptions: f.responseOptions || (f.type === "checklist" ? ["OK", "DEV", "N/A"] : undefined),
          maxLength: f.maxLength,
          min: f.min,
          max: f.max,
          accept: f.accept,
          maxFiles: f.maxFiles,
          allowCaptions: f.allowCaptions,
          default: f.default,
          hideLabel: f.hideLabel ?? false,
          boldText: f.boldText ?? false,
          underlineText: f.underlineText ?? false,
          fontSize: f.fontSize,
          fields: (f.fields || []).map((sf: any) => ({
            id: sf.id || crypto.randomUUID(),
            key: sf.key || generateKey(sf.label || "untitled_field"),
            type: sf.type || "text",
            label: sf.label || "Untitled Field",
            placeholder: sf.placeholder,
            required: sf.required || false,
            options: sf.options,
            maxLength: sf.maxLength,
            min: sf.min,
            max: sf.max,
            hideLabel: sf.hideLabel ?? false,
            boldText: sf.boldText ?? false,
            underlineText: sf.underlineText ?? false,
            fontSize: sf.fontSize,
          })),
          minInstances: f.minInstances,
          maxInstances: f.maxInstances,
        })),
      }));
      setSections(loadedSections);
    }

    if (schema?.requireSignature || schema?.require_signature) {
      setRequireSignature(true);
    }
    
    if (schema?.useOrgTheme || schema?.use_org_theme) {
      setUseOrgTheme(true);
    }
    if (schema?.alternatingBackground || schema?.alternating_background) {
      setAlternatingBackground(true);
    }
  }, [schema, generateKey]);

  // Update parent schema when sections change
  useEffect(() => {
    if (sections.length === 0 && !requireSignature) return; // Don't update on initial empty state
    
    const newSchema = {
      sections: sections.map((s) => ({
        id: s.id,
        title: s.title,
        hideTitle: s.hideTitle,
        fields: s.fields.map((f) => ({
          id: f.id,
          key: f.key,
          type: f.type,
          label: f.label,
          placeholder: f.placeholder,
          required: f.required,
          options: f.options,
          items: f.items, // Preserve items for backwards compatibility
          responseOptions: f.responseOptions, // Save response options
          maxLength: f.maxLength,
          min: f.min,
          max: f.max,
          accept: f.accept,
          maxFiles: f.maxFiles,
          allowCaptions: f.allowCaptions,
          default: f.default,
          hideLabel: f.hideLabel ?? false, // Default to false if missing
          boldText: f.boldText ?? false,
          underlineText: f.underlineText ?? false,
          fontSize: f.fontSize,
          fields: f.fields ? f.fields.map((sf: any) => ({
            id: sf.id || crypto.randomUUID(),
            key: sf.key || generateKey(sf.label || "untitled_field"),
            type: sf.type || "text",
            label: sf.label || "Untitled Field",
            placeholder: sf.placeholder,
            required: sf.required || false,
            options: sf.options,
            maxLength: sf.maxLength,
            min: sf.min,
            max: sf.max,
            hideLabel: sf.hideLabel ?? false,
            boldText: sf.boldText ?? false,
            underlineText: sf.underlineText ?? false,
            fontSize: sf.fontSize,
          })) : undefined,
          minInstances: (f as any).minInstances,
          maxInstances: (f as any).maxInstances,
        })),
      })),
      require_signature: requireSignature, // Use snake_case for consistency
      requireSignature, // Keep both for backwards compatibility
      use_org_theme: useOrgTheme, // Use snake_case for consistency
      useOrgTheme, // Keep both for backwards compatibility
      alternating_background: alternatingBackground, // Global alternating background toggle
      alternatingBackground, // Backwards compatibility
    };
    onSchemaChange(newSchema);
  }, [sections, requireSignature, useOrgTheme, alternatingBackground, onSchemaChange, generateKey]);

  const handleAddSection = () => {
    const newSection: Section = {
      id: crypto.randomUUID(),
      title: "New Section",
      fields: [],
      collapsed: false,
      hideTitle: false,
    };
    setSections([...sections, newSection]);
  };

  const handleFieldSelect = (type: FieldType) => {
    if (sections.length === 0) {
      // Auto-create first section
      const newSection: Section = {
        id: crypto.randomUUID(),
        title: "Section 1",
        fields: [],
        collapsed: false,
        hideTitle: false,
      };
      setSections([newSection]);
      setTargetSectionId(newSection.id);
    }

    // Determine which section to add the field to
    const targetId = targetSectionId || sections[sections.length - 1]?.id;
    if (!targetId) return;

    const label = `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`;
    const newField: Field = {
      id: crypto.randomUUID(),
      key: generateKey(label),
      type,
      label,
      placeholder: "",
      required: false,
      options: type === "select" || type === "radio" || type === "checklist" ? ["Option 1"] : undefined,
      responseOptions: type === "checklist" ? ["OK", "DEV", "N/A"] : undefined, // Default response options for checklist
      maxFiles: type === "file" ? 10 : undefined, // Default max files for file uploads
      accept: type === "file" ? ["image/*"] : undefined, // Default to images for file uploads
    };

    setSections((prev) =>
      prev.map((section) =>
        section.id === targetId
          ? { ...section, fields: [...section.fields, newField] }
          : section
      )
    );

    toast.success("Field added");
  };

  const handleFieldClick = (sectionId: string, fieldId: string, parentFieldId?: string) => {
    setSelectedField({ sectionId, fieldId, parentFieldId });
    setPropertiesPanelOpen(true);
  };

  const handleFieldUpdate = (updatedField: Field) => {
    if (!selectedField) return;

    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== selectedField.sectionId) return section;

        if (selectedField.parentFieldId) {
          // Update nested field
          return {
            ...section,
            fields: section.fields.map((f) =>
              f.id === selectedField.parentFieldId && f.fields
                ? {
                    ...f,
                    fields: f.fields.map((sf) =>
                      sf.id === selectedField.fieldId ? updatedField : sf
                    ),
                  }
                : f
            ),
          };
        } else {
          // Update top-level field
          return {
            ...section,
            fields: section.fields.map((f) =>
              f.id === selectedField.fieldId ? updatedField : f
            ),
          };
        }
      })
    );

    toast.success("Field updated");
  };

  const currentField = selectedField
    ? (() => {
        const section = sections.find((s) => s.id === selectedField.sectionId);
        if (!section) return null;

        if (selectedField.parentFieldId) {
          const parentField = section.fields.find((f) => f.id === selectedField.parentFieldId);
          return parentField?.fields?.find((sf) => sf.id === selectedField.fieldId) || null;
        } else {
          return section.fields.find((f) => f.id === selectedField.fieldId) || null;
        }
      })()
    : null;

  // Create field maps for drag operations
  const fieldToSectionMap = new Map<string, string>();
  const fieldToParentMap = new Map<string, string>();
  
  sections.forEach(section => {
    section.fields.forEach(field => {
      fieldToSectionMap.set(field.id, section.id);
      if (field.fields) {
        field.fields.forEach(subField => {
          fieldToSectionMap.set(subField.id, section.id);
          fieldToParentMap.set(subField.id, field.id);
        });
      }
    });
  });

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    console.log('[DND] start', {
      activeId: event.active.id,
      activeData: event.active.data?.current,
    });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event;
    setOverId(over ? (over.id as string) : null);
    console.log('[DND] over', {
      activeId: active.id,
      overId: over?.id,
      overData: over?.data?.current,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    console.log('[DND] end', {
      activeId: active.id,
      activeData: active.data?.current,
      overId: over?.id,
      overData: over?.data?.current,
    });
    
    if (!over || active.id === over.id) return;

    const activeFieldId = active.id as string;
    const overFieldId = over.id as string;
    
    const isDraggingFromPalette = !fieldToSectionMap.has(activeFieldId);
    const activeSectionId = fieldToSectionMap.get(activeFieldId);
    const overSectionId = fieldToSectionMap.get(overFieldId);
    
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
        
        const allowedTypes: FieldType[] = ['text', 'number', 'date', 'time', 'select', 'checkbox', 'radio'];
        if (!allowedTypes.includes(fieldType)) {
          toast.error("Only simple fields can be placed in table cells");
          return;
        }

        const tableSectionId = fieldToSectionMap.get(tableFieldId);
        if (!tableSectionId) return;

        // Find the table field to check if cell is occupied
        let tableField: Field | null = null;
        for (const section of sections) {
          const found = section.fields.find(f => f.id === tableFieldId);
          if (found) {
            tableField = found;
            break;
          }
        }

        // Check if cell is already occupied
        if (tableField?.tableCells?.[cellKey]?.field) {
          toast.error("Cell is already occupied");
          return;
        }

        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const fieldDef = fieldTypes.find(ft => ft.type === fieldType);
        const label = fieldDef?.label || "Field";

        console.log('Dropping palette item into table cell:', { tableFieldId, cellKey, fieldType, label });

        setSections(
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
                      field: newField,
                    },
                  };

                  console.log('Updated table cells:', updatedCells);

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
        toast.success(`${label} added to table cell`);
        return;
      }
    }

    // Handle dragging existing field into table cell
    if (!isDraggingFromPalette && overFieldId.includes("-cell-")) {
      const overData = over.data?.current as any;
      if (overData?.type === 'table-cell') {
        const tableFieldId = overData.tableFieldId;
        const cellKey = overData.cellKey;
        
        const activeField = findFieldById(activeFieldId);
        if (!activeField) return;
        
        const allowedTypes: FieldType[] = ['text', 'number', 'date', 'time', 'select', 'checkbox', 'radio'];
        if (!allowedTypes.includes(activeField.type)) {
          return;
        }

        const tableSectionId = fieldToSectionMap.get(tableFieldId);
        if (!tableSectionId) return;

        const activeSectionId = fieldToSectionMap.get(activeFieldId);
        if (!activeSectionId) return;

        const activeParentId = fieldToParentMap.get(activeFieldId);

        setSections(
          sections.map((section) => {
            let updatedFields = [...section.fields];

            // Remove from source location
            if (section.id === activeSectionId) {
              if (activeParentId) {
                updatedFields = updatedFields.map(f => {
                  if (f.id === activeParentId && f.fields) {
                    return { ...f, fields: f.fields.filter(sf => sf.id !== activeFieldId) };
                  }
                  return f;
                });
              } else {
                updatedFields = updatedFields.filter(f => f.id !== activeFieldId);
              }
            }

            // Add to table cell
            if (section.id === tableSectionId) {
              updatedFields = updatedFields.map((field) => {
                if (field.id === tableFieldId && field.type === "table_layout") {
                  const movedField: Field = {
                    ...activeField,
                    id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    key: `${field.key}_row${cellKey.split('-')[0]}_col${cellKey.split('-')[1]}_${activeField.label.toLowerCase().replace(/\s+/g, '_')}`,
                  };

                  const updatedCells = {
                    ...(field.tableCells || {}),
                    [cellKey]: {
                      ...(field.tableCells?.[cellKey] || {}),
                      field: movedField,
                    },
                  };

                  return {
                    ...field,
                    tableCells: updatedCells,
                  };
                }
                return field;
              });
            }

            return { ...section, fields: updatedFields };
          })
        );
        return;
      }
    }
    
    // Handle dropping from palette into repeating group
    if (isDraggingFromPalette && isDropZone && targetRepeatingGroupId) {
      const targetSectionId = fieldToSectionMap.get(targetRepeatingGroupId);
      if (!targetSectionId) return;
      
      if (activeFieldId === "repeating_group") return;
      
      const newField = createFieldFromType(activeFieldId as FieldType);
      
      setSections(
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
    
    if (!isDraggingFromPalette && (!activeSectionId || !effectiveOverSectionId)) return;
    
    const activeParentId = fieldToParentMap.get(activeFieldId);
    const overParentId = fieldToParentMap.get(overFieldId);
    const overField = findFieldById(targetRepeatingGroupId);
    
    const activeField = findFieldById(activeFieldId);
    if (activeField?.type === "repeating_group" && (overParentId || isDropZone)) {
      return;
    }

    if (overField?.type === "repeating_group" && !overParentId) {
      setSections(
        sections.map((section) => {
          if (section.id !== effectiveOverSectionId) return section;

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

    if (activeParentId && overParentId && activeParentId === overParentId) {
      setSections(
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

    if (activeParentId || overParentId) {
      setSections(
        sections.map((section) => {
          if (section.id !== activeSectionId && section.id !== effectiveOverSectionId) return section;

          let updatedFields = [...section.fields];

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

    if (activeSectionId === overSectionId) {
      setSections(
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
      
      setSections(
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

  const handleTableCellClick = (tableFieldId: string, cellKey: string) => {
    setSelectedCell({ tableFieldId, cellKey });
    setCellPickerOpen(true);
  };

  const handleCellFieldSelect = (fieldType: FieldType) => {
    if (!selectedCell) return;

    const { tableFieldId, cellKey } = selectedCell;
    
    console.log('[CELL PICKER] Selecting field:', { tableFieldId, cellKey, fieldType });
    
    // Find the section containing the table
    const tableSectionId = fieldToSectionMap.get(tableFieldId);
    console.log('[CELL PICKER] Table section ID:', tableSectionId);
    
    if (!tableSectionId) {
      console.error('[CELL PICKER] Could not find section for table:', tableFieldId);
      toast.error("Could not find table section");
      return;
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const fieldDef = fieldTypes.find(ft => ft.type === fieldType);
    const label = fieldDef?.label || "Field";

    console.log('[CELL PICKER] Creating new field:', { label, fieldType });

    const newSections = sections.map((section) => {
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
                field: newField,
              },
            };

            console.log('[CELL PICKER] Updated cells:', updatedCells);

            return {
              ...field,
              tableCells: updatedCells,
            };
          }
          return field;
        }),
      };
    });

    console.log('[CELL PICKER] Setting new sections');
    setSections(newSections);
    
    toast.success(`${label} added to table cell`);
    setSelectedCell(null);
  };

  const activeField = activeId ? findFieldById(activeId) : null;
  const activeFieldType = activeId && !activeField ? (activeId as FieldType) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="signature"
              checked={requireSignature}
              onCheckedChange={setRequireSignature}
            />
            <Label htmlFor="signature" className="text-sm">
              Require Signature
            </Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="orgTheme"
              checked={useOrgTheme}
              onCheckedChange={setUseOrgTheme}
            />
            <Label htmlFor="orgTheme" className="text-sm">
              Use Organization Color Theme
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="alternatingBackground"
              checked={alternatingBackground}
              onCheckedChange={setAlternatingBackground}
            />
            <Label htmlFor="alternatingBackground" className="text-sm">
              Alternating Background (PDF/DOCX)
            </Label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? "Builder" : "Preview"}
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      {!previewMode ? (
        <div className="grid grid-cols-12 gap-4">
          {/* Left: Field Palette */}
          <div className="col-span-12 md:col-span-3 lg:col-span-2 space-y-4">
            {sections.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Add Field To:</Label>
                <Select
                  value={targetSectionId || sections[sections.length - 1]?.id || ""}
                  onValueChange={setTargetSectionId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <FieldPalette onFieldSelect={handleFieldSelect} />
          </div>

          {/* Center: Canvas */}
          <div className="col-span-12 md:col-span-9 lg:col-span-10">
            <FormCanvas
              sections={sections}
              onSectionsChange={setSections}
              onFieldClick={handleFieldClick}
              onAddSection={handleAddSection}
              isAnyFieldDragging={!!activeId}
              onTableCellClick={handleTableCellClick}
            />
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border bg-card p-6">
            <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground text-center">
                Preview Mode - Form submission is disabled
              </p>
            </div>
            <FormRenderer
              template={{
                id: "preview",
                org_id: null,
                is_global: false,
                name: "Form Preview",
                slug: "preview",
                category: null,
                is_active: true,
                version: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: null,
                scope: 'user',
                schema: {
                  sections: sections.map((s) => ({
                    id: s.id,
                    title: s.title,
                    hideTitle: s.hideTitle,
                    fields: s.fields.map((f) => ({
                      id: f.id,
                      key: f.key,
                      type: f.type,
                      label: f.label,
                      placeholder: f.placeholder,
                      required: f.required,
                      options: f.options,
                      items: f.items,
                      responseOptions: f.responseOptions,
                      maxLength: f.maxLength,
                      min: f.min,
                      max: f.max,
                      accept: f.accept,
                      maxFiles: f.maxFiles,
                      allowCaptions: f.allowCaptions,
                      default: f.default,
                      hideLabel: f.hideLabel,
                      boldText: f.boldText,
                      underlineText: f.underlineText,
                      fields: f.fields?.map((sf) => ({
                        id: sf.id,
                        key: sf.key,
                        type: sf.type,
                        label: sf.label,
                        placeholder: sf.placeholder,
                        required: sf.required,
                        options: sf.options,
                        maxLength: sf.maxLength,
                        min: sf.min,
                        max: sf.max,
                        hideLabel: sf.hideLabel,
                        boldText: sf.boldText,
                        underlineText: sf.underlineText,
                      })),
                      minInstances: (f as any).minInstances,
                      maxInstances: (f as any).maxInstances,
                    })),
                  })),
                  require_signature: requireSignature,
                },
              }}
              previewMode={true}
              onSuccess={() => {}}
              onCancel={() => setPreviewMode(false)}
            />
          </div>
        </div>
      )}

        {/* Field Properties Panel */}
        <FieldPropertiesPanel
          open={propertiesPanelOpen}
          field={currentField}
          onOpenChange={setPropertiesPanelOpen}
          onFieldUpdate={handleFieldUpdate}
        />

        {/* Cell Field Picker Dialog */}
        <CellFieldPickerDialog
          open={cellPickerOpen}
          onOpenChange={setCellPickerOpen}
          onFieldSelect={handleCellFieldSelect}
        />
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId ? (
          <div className="p-3 rounded-lg border bg-card shadow-lg opacity-80">
            {activeField ? (
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{activeField.label}</span>
              </div>
            ) : activeFieldType ? (
              <div className="flex items-center gap-2">
                {(() => {
                  const fieldDef = fieldTypes.find(ft => ft.type === activeFieldType);
                  const Icon = fieldDef?.icon;
                  return Icon ? <Icon className="h-4 w-4 text-primary" /> : null;
                })()}
                <span className="text-sm font-medium">
                  {fieldTypes.find(ft => ft.type === activeFieldType)?.label}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
