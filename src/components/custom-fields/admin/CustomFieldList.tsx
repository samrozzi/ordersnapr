/**
 * CustomFieldList - List view of custom fields with actions
 * Supports reordering, editing, deleting, and toggling active status
 */

import { useState } from 'react';
import { CustomField, EntityType } from '@/types/custom-fields';
import { useCustomFields } from '@/hooks/use-custom-fields';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface CustomFieldListProps {
  entityType: EntityType;
  orgId?: string;
  fields: CustomField[];
  isLoading: boolean;
  onEditField: (fieldId: string) => void;
}

export function CustomFieldList({
  entityType,
  orgId,
  fields,
  isLoading,
  onEditField,
}: CustomFieldListProps) {
  const { deleteField, toggleField, reorderFields } = useCustomFields({ entityType, orgId });
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);
  const [orderedFields, setOrderedFields] = useState<CustomField[]>(fields);

  // Update orderedFields when fields change
  useState(() => {
    setOrderedFields(fields);
  });

  const handleDelete = () => {
    if (deleteFieldId) {
      deleteField(deleteFieldId);
      setDeleteFieldId(null);
    }
  };

  const handleToggle = (fieldId: string, isActive: boolean) => {
    toggleField({ id: fieldId, is_active: isActive });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(orderedFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOrderedFields(items);

    // Pass array of field IDs in order
    reorderFields(items.map(f => f.id));
  };

  const getFieldTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      text: 'Text',
      number: 'Number',
      date: 'Date',
      datetime: 'Date & Time',
      dropdown: 'Dropdown',
      checkbox: 'Checkbox',
      textarea: 'Text Area',
      file: 'File',
      email: 'Email',
      phone: 'Phone',
      url: 'URL',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orderedFields.length === 0) {
    return (
      <div className="text-center p-8 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">
          No custom fields defined yet. Click "Add Field" to create your first custom field.
        </p>
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="custom-fields">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Field Name</TableHead>
                    <TableHead>Field Key</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderedFields.map((field, index) => (
                    <Draggable key={field.id} draggableId={field.id} index={index}>
                      {(provided, snapshot) => (
                        <TableRow
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={snapshot.isDragging ? 'bg-muted' : ''}
                        >
                          <TableCell {...provided.dragHandleProps}>
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          </TableCell>
                          <TableCell className="font-medium">{field.field_name}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {field.field_key}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getFieldTypeLabel(field.field_type)}</Badge>
                          </TableCell>
                          <TableCell>
                            {field.is_required ? (
                              <Badge variant="secondary">Required</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Optional</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={field.is_active}
                              onCheckedChange={(checked) => handleToggle(field.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditField(field.id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteFieldId(field.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </TableBody>
              </Table>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <AlertDialog open={!!deleteFieldId} onOpenChange={() => setDeleteFieldId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Field?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this custom field and all associated data. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
