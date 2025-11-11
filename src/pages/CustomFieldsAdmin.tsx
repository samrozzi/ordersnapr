/**
 * CustomFieldsAdmin - Admin page for managing custom field definitions
 * Allows org admins to create, edit, delete, and reorder custom fields
 */

import { useState } from 'react';
import { useActiveOrg } from '@/hooks/use-active-org';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { EntityType } from '@/types/custom-fields';
import { CustomFieldList } from '@/components/custom-fields/admin/CustomFieldList';
import { CustomFieldDialog } from '@/components/custom-fields/admin/CustomFieldDialog';
import { useCustomFields } from '@/hooks/use-custom-fields';

const ENTITY_TYPES: { value: EntityType; label: string; description: string }[] = [
  {
    value: 'work_orders',
    label: 'Work Orders',
    description: 'Custom fields for work orders and jobs',
  },
  {
    value: 'customers',
    label: 'Customers',
    description: 'Custom fields for customer records',
  },
  {
    value: 'properties',
    label: 'Properties',
    description: 'Custom fields for property information',
  },
  {
    value: 'invoices',
    label: 'Invoices',
    description: 'Custom fields for invoices and billing',
  },
];

export function CustomFieldsAdmin() {
  const { activeOrgId } = useActiveOrg();
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>('work_orders');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const { fields, isLoading } = useCustomFields({
    entityType: selectedEntityType,
    orgId: activeOrgId || undefined,
  });

  const handleCreateField = () => {
    setEditingFieldId(null);
    setIsDialogOpen(true);
  };

  const handleEditField = (fieldId: string) => {
    setEditingFieldId(fieldId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFieldId(null);
  };

  const currentEntityType = ENTITY_TYPES.find((et) => et.value === selectedEntityType);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Fields</h1>
          <p className="text-muted-foreground mt-1">
            Configure custom fields for your organization's data
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custom Field Definitions</CardTitle>
          <CardDescription>
            Create and manage custom fields for different entity types. Fields can be added to forms
            and will be displayed in detail views.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedEntityType} onValueChange={(v) => setSelectedEntityType(v as EntityType)}>
            <TabsList className="grid w-full grid-cols-4">
              {ENTITY_TYPES.map((entityType) => (
                <TabsTrigger key={entityType.value} value={entityType.value}>
                  {entityType.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {ENTITY_TYPES.map((entityType) => (
              <TabsContent key={entityType.value} value={entityType.value} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{entityType.label}</h3>
                    <p className="text-sm text-muted-foreground">{entityType.description}</p>
                  </div>
                  <Button onClick={handleCreateField}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>

                <CustomFieldList
                  entityType={entityType.value}
                  orgId={activeOrgId || undefined}
                  fields={fields}
                  isLoading={isLoading}
                  onEditField={handleEditField}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <CustomFieldDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        entityType={selectedEntityType}
        orgId={activeOrgId || undefined}
        fieldId={editingFieldId}
        onClose={handleCloseDialog}
      />
    </div>
  );
}
