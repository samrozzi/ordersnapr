/**
 * useCustomFields Hook
 *
 * Manages custom field definitions for an organization and entity type.
 * Handles CRUD operations for field definitions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CustomField, EntityType, FieldType, FieldConfig } from '@/types/custom-fields';

interface UseCustomFieldsOptions {
  entityType: EntityType;
  orgId?: string;
}

export function useCustomFields({ entityType, orgId }: UseCustomFieldsOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch custom fields for entity type
  const {
    data: fields = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['custom-fields', orgId, entityType],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('org_id', orgId)
        .eq('entity_type', entityType)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as CustomField[];
    },
    enabled: !!orgId,
  });

  // Create field mutation
  const createFieldMutation = useMutation({
    mutationFn: async (field: Omit<CustomField, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error} = await supabase
        .from('custom_fields')
        .insert([{
          org_id: field.org_id,
          entity_type: field.entity_type,
          field_name: field.field_name,
          field_key: field.field_key,
          field_type: field.field_type,
          field_config: JSON.parse(JSON.stringify(field.field_config || {})),
          display_order: field.display_order,
          is_required: field.is_required,
          is_active: field.is_active,
          created_by: field.created_by,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as CustomField;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', orgId, entityType] });
      toast({
        title: 'Success',
        description: 'Custom field created successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Create field error:', error);
      toast({
        title: 'Error',
        description: `Failed to create custom field: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update field mutation
  const updateFieldMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CustomField> }) => {
      const cleanUpdates: any = { ...updates };
      if (cleanUpdates.field_config) {
        cleanUpdates.field_config = JSON.parse(JSON.stringify(cleanUpdates.field_config));
      }
      
      const { data, error } = await supabase
        .from('custom_fields')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CustomField;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', orgId, entityType] });
      toast({
        title: 'Success',
        description: 'Custom field updated successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Update field error:', error);
      toast({
        title: 'Error',
        description: `Failed to update custom field: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete field mutation
  const deleteFieldMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', orgId, entityType] });
      toast({
        title: 'Success',
        description: 'Custom field deleted successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Delete field error:', error);
      toast({
        title: 'Error',
        description: `Failed to delete custom field: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Reorder fields mutation
  const reorderFieldsMutation = useMutation({
    mutationFn: async (fieldIds: string[]) => {
      // Update display_order for each field
      const updates = fieldIds.map((id, index) => ({
        id,
        display_order: index,
      }));

      const promises = updates.map(({ id, display_order }) =>
        supabase
          .from('custom_fields')
          .update({ display_order })
          .eq('id', id)
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', orgId, entityType] });
    },
    onError: (error: Error) => {
      console.error('Reorder fields error:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder fields',
        variant: 'destructive',
      });
    },
  });

  // Toggle field active state
  const toggleFieldMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('custom_fields')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', orgId, entityType] });
    },
    onError: (error: Error) => {
      console.error('Toggle field error:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle field status',
        variant: 'destructive',
      });
    },
  });

  return {
    fields,
    isLoading,
    error,
    createField: createFieldMutation.mutate,
    updateField: updateFieldMutation.mutate,
    deleteField: deleteFieldMutation.mutate,
    reorderFields: reorderFieldsMutation.mutate,
    toggleField: toggleFieldMutation.mutate,
    isCreating: createFieldMutation.isPending,
    isUpdating: updateFieldMutation.isPending,
    isDeleting: deleteFieldMutation.isPending,
  };
}
